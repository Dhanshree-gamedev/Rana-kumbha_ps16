const express = require('express');
const db = require('../database/init');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/presence/heartbeat - Update user's online status
router.post('/heartbeat', authenticate, (req, res) => {
    try {
        db.prepare(`
            UPDATE users 
            SET is_online = 1, last_seen = datetime('now')
            WHERE id = ?
        `).run(req.user.id);

        res.json({ success: true, online: true });
    } catch (error) {
        console.error('Heartbeat error:', error);
        res.status(500).json({ error: 'Failed to update presence' });
    }
});

// POST /api/presence/offline - Mark user as offline
router.post('/offline', authenticate, (req, res) => {
    try {
        db.prepare(`
            UPDATE users 
            SET is_online = 0, last_seen = datetime('now')
            WHERE id = ?
        `).run(req.user.id);

        res.json({ success: true, online: false });
    } catch (error) {
        console.error('Offline error:', error);
        res.status(500).json({ error: 'Failed to update presence' });
    }
});

// GET /api/presence/:userId - Get user's presence status
router.get('/:userId', authenticate, (req, res) => {
    try {
        const userId = parseInt(req.params.userId);

        if (!userId) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const user = db.prepare(`
            SELECT id, is_online, last_seen
            FROM users
            WHERE id = ?
        `).get(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            userId: user.id,
            isOnline: user.is_online === 1,
            lastSeen: user.last_seen
        });
    } catch (error) {
        console.error('Get presence error:', error);
        res.status(500).json({ error: 'Failed to get presence' });
    }
});

// GET /api/presence/connections/status - Get presence of all connections
router.get('/connections/status', authenticate, (req, res) => {
    try {
        const connections = db.prepare(`
            SELECT 
                CASE 
                    WHEN c.requester_id = ? THEN c.receiver_id 
                    ELSE c.requester_id 
                END as user_id,
                u.is_online,
                u.last_seen
            FROM connections c
            JOIN users u ON u.id = CASE 
                WHEN c.requester_id = ? THEN c.receiver_id 
                ELSE c.requester_id 
            END
            WHERE (c.requester_id = ? OR c.receiver_id = ?)
            AND c.status = 'accepted'
        `).all(req.user.id, req.user.id, req.user.id, req.user.id);

        const presenceMap = {};
        connections.forEach(c => {
            presenceMap[c.user_id] = {
                isOnline: c.is_online === 1,
                lastSeen: c.last_seen
            };
        });

        res.json(presenceMap);
    } catch (error) {
        console.error('Get connections presence error:', error);
        res.status(500).json({ error: 'Failed to get presence' });
    }
});

module.exports = router;
