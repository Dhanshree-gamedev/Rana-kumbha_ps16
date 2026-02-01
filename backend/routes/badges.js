const express = require('express');
const db = require('../database/init');
const { authenticate, authenticateWithProfile } = require('../middleware/auth');

const router = express.Router();

// GET /api/badges - List all available badges
router.get('/', authenticate, (req, res) => {
    try {
        const badges = db.prepare('SELECT id, name, description, icon FROM badges').all();
        res.json(badges);
    } catch (error) {
        console.error('Get badges error:', error);
        res.status(500).json({ error: 'Failed to get badges' });
    }
});

// GET /api/badges/user/:userId - Get badges for a specific user
router.get('/user/:userId', authenticate, (req, res) => {
    try {
        const userId = parseInt(req.params.userId);

        const badges = db.prepare(`
            SELECT 
                b.id, b.name, b.description, b.icon,
                ub.awarded_at, ub.workshop_id,
                w.title as workshop_title
            FROM user_badges ub
            JOIN badges b ON ub.badge_id = b.id
            LEFT JOIN workshops w ON ub.workshop_id = w.id
            WHERE ub.user_id = ?
            ORDER BY ub.awarded_at DESC
        `).all(userId);

        res.json(badges.map(b => ({
            id: b.id,
            name: b.name,
            description: b.description,
            icon: b.icon,
            awardedAt: b.awarded_at,
            workshopId: b.workshop_id,
            workshopTitle: b.workshop_title
        })));
    } catch (error) {
        console.error('Get user badges error:', error);
        res.status(500).json({ error: 'Failed to get user badges' });
    }
});

// GET /api/badges/my - Get current user's badges
router.get('/my', authenticate, (req, res) => {
    try {
        const badges = db.prepare(`
            SELECT 
                b.id, b.name, b.description, b.icon,
                ub.awarded_at, ub.workshop_id,
                w.title as workshop_title
            FROM user_badges ub
            JOIN badges b ON ub.badge_id = b.id
            LEFT JOIN workshops w ON ub.workshop_id = w.id
            WHERE ub.user_id = ?
            ORDER BY ub.awarded_at DESC
        `).all(req.user.id);

        res.json(badges.map(b => ({
            id: b.id,
            name: b.name,
            description: b.description,
            icon: b.icon,
            awardedAt: b.awarded_at,
            workshopId: b.workshop_id,
            workshopTitle: b.workshop_title
        })));
    } catch (error) {
        console.error('Get my badges error:', error);
        res.status(500).json({ error: 'Failed to get badges' });
    }
});

// POST /api/badges/award - Award a badge (admin/instructor only)
router.post('/award', authenticateWithProfile, (req, res) => {
    try {
        const { userId, badgeName, workshopId } = req.body;

        if (!userId || !badgeName) {
            return res.status(400).json({ error: 'User ID and badge name are required' });
        }

        const badge = db.prepare('SELECT id FROM badges WHERE name = ?').get(badgeName);
        if (!badge) {
            return res.status(404).json({ error: 'Badge not found' });
        }

        // Check if already awarded for this workshop
        const existing = db.prepare(`
            SELECT id FROM user_badges 
            WHERE user_id = ? AND badge_id = ? AND (workshop_id = ? OR (workshop_id IS NULL AND ? IS NULL))
        `).get(userId, badge.id, workshopId || null, workshopId || null);

        if (existing) {
            return res.status(400).json({ error: 'Badge already awarded' });
        }

        db.prepare(`
            INSERT INTO user_badges (user_id, badge_id, workshop_id)
            VALUES (?, ?, ?)
        `).run(userId, badge.id, workshopId || null);

        res.json({ success: true, message: 'Badge awarded successfully' });
    } catch (error) {
        console.error('Award badge error:', error);
        res.status(500).json({ error: 'Failed to award badge' });
    }
});

module.exports = router;
