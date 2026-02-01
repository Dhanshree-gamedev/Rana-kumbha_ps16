const express = require('express');
const db = require('../database/init');
const { authenticate, authenticateWithProfile } = require('../middleware/auth');

const router = express.Router();

// GET /api/connections - Get all accepted connections
router.get('/', authenticate, (req, res) => {
    try {
        const connections = db.prepare(`
      SELECT 
        c.id,
        c.status,
        c.created_at,
        CASE 
          WHEN c.requester_id = ? THEN c.receiver_id
          ELSE c.requester_id
        END as user_id,
        u.name,
        u.branch,
        u.year,
        u.profile_photo
      FROM connections c
      JOIN users u ON u.id = CASE 
        WHEN c.requester_id = ? THEN c.receiver_id
        ELSE c.requester_id
      END
      WHERE (c.requester_id = ? OR c.receiver_id = ?) AND c.status = 'accepted'
      ORDER BY c.created_at DESC
    `).all(req.user.id, req.user.id, req.user.id, req.user.id);

        res.json(connections.map(c => ({
            id: c.id,
            status: c.status,
            createdAt: c.created_at,
            user: {
                id: c.user_id,
                name: c.name,
                branch: c.branch,
                year: c.year,
                profilePhoto: c.profile_photo
            }
        })));

    } catch (error) {
        console.error('Get connections error:', error);
        res.status(500).json({ error: 'Failed to get connections' });
    }
});

// GET /api/connections/requests - Get pending connection requests received
router.get('/requests', authenticate, (req, res) => {
    try {
        const requests = db.prepare(`
      SELECT 
        c.id,
        c.created_at,
        u.id as user_id,
        u.name,
        u.branch,
        u.year,
        u.profile_photo
      FROM connections c
      JOIN users u ON u.id = c.requester_id
      WHERE c.receiver_id = ? AND c.status = 'pending'
      ORDER BY c.created_at DESC
    `).all(req.user.id);

        res.json(requests.map(r => ({
            id: r.id,
            createdAt: r.created_at,
            user: {
                id: r.user_id,
                name: r.name,
                branch: r.branch,
                year: r.year,
                profilePhoto: r.profile_photo
            }
        })));

    } catch (error) {
        console.error('Get requests error:', error);
        res.status(500).json({ error: 'Failed to get connection requests' });
    }
});

// GET /api/connections/sent - Get pending connection requests sent
router.get('/sent', authenticate, (req, res) => {
    try {
        const sentRequests = db.prepare(`
      SELECT 
        c.id,
        c.created_at,
        u.id as user_id,
        u.name,
        u.branch,
        u.year,
        u.profile_photo
      FROM connections c
      JOIN users u ON u.id = c.receiver_id
      WHERE c.requester_id = ? AND c.status = 'pending'
      ORDER BY c.created_at DESC
    `).all(req.user.id);

        res.json(sentRequests.map(r => ({
            id: r.id,
            createdAt: r.created_at,
            user: {
                id: r.user_id,
                name: r.name,
                branch: r.branch,
                year: r.year,
                profilePhoto: r.profile_photo
            }
        })));

    } catch (error) {
        console.error('Get sent requests error:', error);
        res.status(500).json({ error: 'Failed to get sent requests' });
    }
});

// POST /api/connections/:userId - Send connection request
router.post('/:userId', authenticateWithProfile, (req, res) => {
    try {
        const receiverId = parseInt(req.params.userId);

        if (isNaN(receiverId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // Can't connect with yourself
        if (receiverId === req.user.id) {
            return res.status(400).json({ error: 'You cannot connect with yourself' });
        }

        // Check if receiver exists
        const receiver = db.prepare('SELECT id FROM users WHERE id = ? AND is_verified = 1').get(receiverId);
        if (!receiver) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if connection already exists (in either direction)
        const existingConnection = db.prepare(`
      SELECT id, status FROM connections 
      WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)
    `).get(req.user.id, receiverId, receiverId, req.user.id);

        if (existingConnection) {
            if (existingConnection.status === 'accepted') {
                return res.status(400).json({ error: 'Already connected with this user' });
            } else {
                return res.status(400).json({ error: 'Connection request already pending' });
            }
        }

        // Create connection request
        const result = db.prepare(`
      INSERT INTO connections (requester_id, receiver_id, status, created_at)
      VALUES (?, ?, 'pending', datetime('now'))
    `).run(req.user.id, receiverId);

        res.status(201).json({
            id: result.lastInsertRowid,
            status: 'pending',
            message: 'Connection request sent'
        });

    } catch (error) {
        console.error('Send connection request error:', error);
        res.status(500).json({ error: 'Failed to send connection request' });
    }
});

// PUT /api/connections/:id/accept - Accept connection request
router.put('/:id/accept', authenticateWithProfile, (req, res) => {
    try {
        const connectionId = parseInt(req.params.id);

        if (isNaN(connectionId)) {
            return res.status(400).json({ error: 'Invalid connection ID' });
        }

        // Get connection and verify it's a pending request to this user
        const connection = db.prepare(`
      SELECT id, requester_id, receiver_id, status 
      FROM connections WHERE id = ?
    `).get(connectionId);

        if (!connection) {
            return res.status(404).json({ error: 'Connection request not found' });
        }

        if (connection.receiver_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only accept requests sent to you' });
        }

        if (connection.status !== 'pending') {
            return res.status(400).json({ error: 'This request has already been processed' });
        }

        // Accept the connection
        db.prepare("UPDATE connections SET status = 'accepted' WHERE id = ?").run(connectionId);

        res.json({ message: 'Connection accepted', status: 'accepted' });

    } catch (error) {
        console.error('Accept connection error:', error);
        res.status(500).json({ error: 'Failed to accept connection' });
    }
});

// DELETE /api/connections/:id - Reject request or remove connection
router.delete('/:id', authenticateWithProfile, (req, res) => {
    try {
        const connectionId = parseInt(req.params.id);

        if (isNaN(connectionId)) {
            return res.status(400).json({ error: 'Invalid connection ID' });
        }

        // Get connection and verify user is part of it
        const connection = db.prepare(`
      SELECT id, requester_id, receiver_id, status 
      FROM connections WHERE id = ?
    `).get(connectionId);

        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }

        // User must be either requester or receiver
        if (connection.requester_id !== req.user.id && connection.receiver_id !== req.user.id) {
            return res.status(403).json({ error: 'You are not part of this connection' });
        }

        // Delete the connection
        db.prepare('DELETE FROM connections WHERE id = ?').run(connectionId);

        // Note: Messages between users will remain but chat access will be blocked

        res.json({ message: 'Connection removed' });

    } catch (error) {
        console.error('Delete connection error:', error);
        res.status(500).json({ error: 'Failed to remove connection' });
    }
});

// GET /api/connections/status/:userId - Get connection status with a specific user
router.get('/status/:userId', authenticate, (req, res) => {
    try {
        const userId = parseInt(req.params.userId);

        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        if (userId === req.user.id) {
            return res.json({ status: 'self', connectionId: null });
        }

        const connection = db.prepare(`
      SELECT id, status, requester_id, receiver_id
      FROM connections 
      WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)
    `).get(req.user.id, userId, userId, req.user.id);

        if (!connection) {
            return res.json({ status: 'none', connectionId: null });
        }

        let status;
        if (connection.status === 'accepted') {
            status = 'connected';
        } else if (connection.requester_id === req.user.id) {
            status = 'pending_sent';
        } else {
            status = 'pending_received';
        }

        res.json({ status, connectionId: connection.id });

    } catch (error) {
        console.error('Get connection status error:', error);
        res.status(500).json({ error: 'Failed to get connection status' });
    }
});

module.exports = router;
