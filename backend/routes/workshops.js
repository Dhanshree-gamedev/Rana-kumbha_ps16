const express = require('express');
const db = require('../database/init');
const { authenticate, authenticateWithProfile } = require('../middleware/auth');

const router = express.Router();

// GET /api/workshops - List all workshops
router.get('/', authenticate, (req, res) => {
    try {
        const { status } = req.query;

        let query = `
            SELECT 
                w.id, w.title, w.description, w.scheduled_at, w.duration, 
                w.max_participants, w.status, w.created_at,
                u.id as instructor_id, u.name as instructor_name, u.profile_photo as instructor_photo,
                (SELECT COUNT(*) FROM workshop_participants WHERE workshop_id = w.id) as participant_count
            FROM workshops w
            JOIN users u ON w.instructor_id = u.id
        `;

        let params = [];

        if (status) {
            query += ` WHERE w.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY w.scheduled_at ASC`;

        const workshops = db.prepare(query).all(...params);

        res.json(workshops.map(w => ({
            id: w.id,
            title: w.title,
            description: w.description,
            scheduledAt: w.scheduled_at,
            duration: w.duration,
            maxParticipants: w.max_participants,
            status: w.status,
            createdAt: w.created_at,
            instructor: {
                id: w.instructor_id,
                name: w.instructor_name,
                photo: w.instructor_photo
            },
            participantCount: w.participant_count
        })));
    } catch (error) {
        console.error('Get workshops error:', error);
        res.status(500).json({ error: 'Failed to get workshops' });
    }
});

// POST /api/workshops - Create a new workshop
router.post('/', authenticateWithProfile, (req, res) => {
    try {
        const { title, description, scheduledAt, duration, maxParticipants } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Workshop title is required' });
        }

        if (!scheduledAt) {
            return res.status(400).json({ error: 'Scheduled time is required' });
        }

        const result = db.prepare(`
            INSERT INTO workshops (title, description, instructor_id, scheduled_at, duration, max_participants)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            title.trim(),
            description?.trim() || null,
            req.user.id,
            scheduledAt,
            duration || 60,
            maxParticipants || 50
        );

        const workshop = db.prepare(`
            SELECT 
                w.*, u.name as instructor_name, u.profile_photo as instructor_photo
            FROM workshops w
            JOIN users u ON w.instructor_id = u.id
            WHERE w.id = ?
        `).get(result.lastInsertRowid);

        res.status(201).json({
            id: workshop.id,
            title: workshop.title,
            description: workshop.description,
            scheduledAt: workshop.scheduled_at,
            duration: workshop.duration,
            maxParticipants: workshop.max_participants,
            status: workshop.status,
            instructor: {
                id: workshop.instructor_id,
                name: workshop.instructor_name,
                photo: workshop.instructor_photo
            },
            participantCount: 0
        });
    } catch (error) {
        console.error('Create workshop error:', error);
        res.status(500).json({ error: 'Failed to create workshop' });
    }
});

// GET /api/workshops/:id - Get workshop details
router.get('/:id', authenticate, (req, res) => {
    try {
        const workshopId = parseInt(req.params.id);

        const workshop = db.prepare(`
            SELECT 
                w.*, u.name as instructor_name, u.profile_photo as instructor_photo,
                (SELECT COUNT(*) FROM workshop_participants WHERE workshop_id = w.id) as participant_count
            FROM workshops w
            JOIN users u ON w.instructor_id = u.id
            WHERE w.id = ?
        `).get(workshopId);

        if (!workshop) {
            return res.status(404).json({ error: 'Workshop not found' });
        }

        // Get participants
        const participants = db.prepare(`
            SELECT u.id, u.name, u.profile_photo, wp.joined_at, wp.attended
            FROM workshop_participants wp
            JOIN users u ON wp.user_id = u.id
            WHERE wp.workshop_id = ?
        `).all(workshopId);

        // Check if current user has joined
        const userJoined = participants.some(p => p.id === req.user.id);

        res.json({
            id: workshop.id,
            title: workshop.title,
            description: workshop.description,
            scheduledAt: workshop.scheduled_at,
            duration: workshop.duration,
            maxParticipants: workshop.max_participants,
            status: workshop.status,
            createdAt: workshop.created_at,
            instructor: {
                id: workshop.instructor_id,
                name: workshop.instructor_name,
                photo: workshop.instructor_photo
            },
            participantCount: workshop.participant_count,
            participants: participants.map(p => ({
                id: p.id,
                name: p.name,
                photo: p.profile_photo,
                joinedAt: p.joined_at,
                attended: p.attended === 1
            })),
            userJoined,
            isInstructor: workshop.instructor_id === req.user.id
        });
    } catch (error) {
        console.error('Get workshop error:', error);
        res.status(500).json({ error: 'Failed to get workshop' });
    }
});

// POST /api/workshops/:id/join - Join a workshop
router.post('/:id/join', authenticateWithProfile, (req, res) => {
    try {
        const workshopId = parseInt(req.params.id);

        const workshop = db.prepare('SELECT * FROM workshops WHERE id = ?').get(workshopId);

        if (!workshop) {
            return res.status(404).json({ error: 'Workshop not found' });
        }

        if (workshop.status === 'completed') {
            return res.status(400).json({ error: 'Workshop has already ended' });
        }

        // Check capacity
        const participantCount = db.prepare(
            'SELECT COUNT(*) as count FROM workshop_participants WHERE workshop_id = ?'
        ).get(workshopId).count;

        if (participantCount >= workshop.max_participants) {
            return res.status(400).json({ error: 'Workshop is full' });
        }

        // Check if already joined
        const existing = db.prepare(
            'SELECT id FROM workshop_participants WHERE workshop_id = ? AND user_id = ?'
        ).get(workshopId, req.user.id);

        if (existing) {
            return res.status(400).json({ error: 'Already joined this workshop' });
        }

        db.prepare(`
            INSERT INTO workshop_participants (workshop_id, user_id)
            VALUES (?, ?)
        `).run(workshopId, req.user.id);

        res.json({ success: true, message: 'Joined workshop successfully' });
    } catch (error) {
        console.error('Join workshop error:', error);
        res.status(500).json({ error: 'Failed to join workshop' });
    }
});

// POST /api/workshops/:id/leave - Leave a workshop
router.post('/:id/leave', authenticateWithProfile, (req, res) => {
    try {
        const workshopId = parseInt(req.params.id);

        const result = db.prepare(`
            DELETE FROM workshop_participants 
            WHERE workshop_id = ? AND user_id = ?
        `).run(workshopId, req.user.id);

        if (result.changes === 0) {
            return res.status(400).json({ error: 'Not a participant of this workshop' });
        }

        res.json({ success: true, message: 'Left workshop successfully' });
    } catch (error) {
        console.error('Leave workshop error:', error);
        res.status(500).json({ error: 'Failed to leave workshop' });
    }
});

// POST /api/workshops/:id/start - Start a workshop (instructor only)
router.post('/:id/start', authenticateWithProfile, (req, res) => {
    try {
        const workshopId = parseInt(req.params.id);

        const workshop = db.prepare('SELECT * FROM workshops WHERE id = ?').get(workshopId);

        if (!workshop) {
            return res.status(404).json({ error: 'Workshop not found' });
        }

        if (workshop.instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Only the instructor can start the workshop' });
        }

        if (workshop.status !== 'scheduled') {
            return res.status(400).json({ error: 'Workshop cannot be started' });
        }

        db.prepare("UPDATE workshops SET status = 'live' WHERE id = ?").run(workshopId);

        res.json({ success: true, message: 'Workshop started', status: 'live' });
    } catch (error) {
        console.error('Start workshop error:', error);
        res.status(500).json({ error: 'Failed to start workshop' });
    }
});

// POST /api/workshops/:id/end - End a workshop and award badges (instructor only)
router.post('/:id/end', authenticateWithProfile, (req, res) => {
    try {
        const workshopId = parseInt(req.params.id);

        const workshop = db.prepare('SELECT * FROM workshops WHERE id = ?').get(workshopId);

        if (!workshop) {
            return res.status(404).json({ error: 'Workshop not found' });
        }

        if (workshop.instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Only the instructor can end the workshop' });
        }

        if (workshop.status !== 'live') {
            return res.status(400).json({ error: 'Workshop is not currently live' });
        }

        // Mark workshop as completed
        db.prepare("UPDATE workshops SET status = 'completed' WHERE id = ?").run(workshopId);

        // Mark all current participants as attended
        db.prepare(`
            UPDATE workshop_participants 
            SET attended = 1 
            WHERE workshop_id = ?
        `).run(workshopId);

        // Award 'Workshop Attendee' badge to all attendees
        const attendeeBadge = db.prepare("SELECT id FROM badges WHERE name = 'Workshop Attendee'").get();

        if (attendeeBadge) {
            const participants = db.prepare(
                'SELECT user_id FROM workshop_participants WHERE workshop_id = ? AND attended = 1'
            ).all(workshopId);

            participants.forEach(p => {
                try {
                    db.prepare(`
                        INSERT OR IGNORE INTO user_badges (user_id, badge_id, workshop_id)
                        VALUES (?, ?, ?)
                    `).run(p.user_id, attendeeBadge.id, workshopId);
                } catch (e) {
                    // Ignore duplicate badge errors
                }
            });
        }

        res.json({
            success: true,
            message: 'Workshop ended and badges awarded',
            status: 'completed'
        });
    } catch (error) {
        console.error('End workshop error:', error);
        res.status(500).json({ error: 'Failed to end workshop' });
    }
});

// POST /api/workshops/:id/attend - Mark attendance (for session room)
router.post('/:id/attend', authenticateWithProfile, (req, res) => {
    try {
        const workshopId = parseInt(req.params.id);

        const workshop = db.prepare('SELECT * FROM workshops WHERE id = ?').get(workshopId);

        if (!workshop) {
            return res.status(404).json({ error: 'Workshop not found' });
        }

        if (workshop.status !== 'live') {
            return res.status(400).json({ error: 'Workshop is not currently live' });
        }

        // Mark as attended
        db.prepare(`
            UPDATE workshop_participants 
            SET attended = 1 
            WHERE workshop_id = ? AND user_id = ?
        `).run(workshopId, req.user.id);

        res.json({ success: true, message: 'Attendance marked' });
    } catch (error) {
        console.error('Attend workshop error:', error);
        res.status(500).json({ error: 'Failed to mark attendance' });
    }
});

module.exports = router;
