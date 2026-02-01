const express = require('express');
const db = require('../database/init');
const { authenticate, authenticateWithProfile } = require('../middleware/auth');

const router = express.Router();

// Helper function to check if two users are connected with accepted status
function areUsersConnected(userId1, userId2) {
    const connection = db.prepare(`
    SELECT id FROM connections 
    WHERE ((requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?))
    AND status = 'accepted'
  `).get(userId1, userId2, userId2, userId1);

    return !!connection;
}

// GET /api/messages/unread/count - Get total unread message count
// NOTE: This route MUST be defined BEFORE /:userId to avoid route conflicts
router.get('/unread/count', authenticateWithProfile, (req, res) => {
    try {
        // Only count messages from connected users
        const result = db.prepare(`
      SELECT COUNT(*) as count
      FROM messages m
      WHERE m.receiver_id = ? 
        AND m.is_read = 0
        AND EXISTS (
          SELECT 1 FROM connections c 
          WHERE ((c.requester_id = m.sender_id AND c.receiver_id = ?) 
             OR (c.requester_id = ? AND c.receiver_id = m.sender_id))
          AND c.status = 'accepted'
        )
    `).get(req.user.id, req.user.id, req.user.id);

        res.json({ unreadCount: result.count });

    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

// GET /api/messages - Get list of chat threads (connected users with messages)
router.get('/', authenticateWithProfile, (req, res) => {
    try {
        // Get all connected users
        const connectedUsers = db.prepare(`
      SELECT 
        CASE 
          WHEN c.requester_id = ? THEN c.receiver_id
          ELSE c.requester_id
        END as user_id,
        u.name,
        u.profile_photo
      FROM connections c
      JOIN users u ON u.id = CASE 
        WHEN c.requester_id = ? THEN c.receiver_id
        ELSE c.requester_id
      END
      WHERE (c.requester_id = ? OR c.receiver_id = ?) AND c.status = 'accepted'
    `).all(req.user.id, req.user.id, req.user.id, req.user.id);

        // For each connected user, get the last message and unread count
        const threads = connectedUsers.map(connection => {
            // Get last message
            const lastMessage = db.prepare(`
        SELECT id, sender_id, content, is_read, created_at
        FROM messages
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY created_at DESC
        LIMIT 1
      `).get(req.user.id, connection.user_id, connection.user_id, req.user.id);

            // Count unread messages from this user
            const unreadCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM messages
        WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
      `).get(connection.user_id, req.user.id).count;

            return {
                user: {
                    id: connection.user_id,
                    name: connection.name,
                    profilePhoto: connection.profile_photo
                },
                lastMessage: lastMessage ? {
                    id: lastMessage.id,
                    content: lastMessage.content,
                    senderId: lastMessage.sender_id,
                    isRead: !!lastMessage.is_read,
                    createdAt: lastMessage.created_at,
                    isOwnMessage: lastMessage.sender_id === req.user.id
                } : null,
                unreadCount
            };
        });

        // Sort by last message time (most recent first), users with no messages at the end
        threads.sort((a, b) => {
            if (!a.lastMessage && !b.lastMessage) return 0;
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
        });

        res.json(threads);

    } catch (error) {
        console.error('Get message threads error:', error);
        res.status(500).json({ error: 'Failed to get messages' });
    }
});

// GET /api/messages/:userId - Get conversation with a specific user
router.get('/:userId', authenticateWithProfile, (req, res) => {
    try {
        const otherUserId = parseInt(req.params.userId);

        if (isNaN(otherUserId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // CRITICAL: Verify users are connected with accepted status
        if (!areUsersConnected(req.user.id, otherUserId)) {
            return res.status(403).json({
                error: 'You can only message connected users',
                code: 'NOT_CONNECTED'
            });
        }

        // Get the other user's info
        const otherUser = db.prepare(`
      SELECT id, name, profile_photo FROM users WHERE id = ?
    `).get(otherUserId);

        if (!otherUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get messages between these users
        const messages = db.prepare(`
      SELECT id, sender_id, receiver_id, content, is_read, created_at
      FROM messages
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at ASC
    `).all(req.user.id, otherUserId, otherUserId, req.user.id);

        res.json({
            user: {
                id: otherUser.id,
                name: otherUser.name,
                profilePhoto: otherUser.profile_photo
            },
            messages: messages.map(m => ({
                id: m.id,
                senderId: m.sender_id,
                receiverId: m.receiver_id,
                content: m.content,
                isRead: !!m.is_read,
                createdAt: m.created_at,
                isOwnMessage: m.sender_id === req.user.id
            }))
        });

    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ error: 'Failed to get conversation' });
    }
});

// POST /api/messages/:userId - Send a message to a user
router.post('/:userId', authenticateWithProfile, (req, res) => {
    try {
        const receiverId = parseInt(req.params.userId);
        const { content } = req.body;

        if (isNaN(receiverId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Can't message yourself
        if (receiverId === req.user.id) {
            return res.status(400).json({ error: 'You cannot message yourself' });
        }

        // CRITICAL: Verify users are connected with accepted status
        // This check MUST exist on EVERY message operation
        if (!areUsersConnected(req.user.id, receiverId)) {
            return res.status(403).json({
                error: 'You can only message connected users. Please connect first.',
                code: 'NOT_CONNECTED'
            });
        }

        // Insert message
        const result = db.prepare(`
      INSERT INTO messages (sender_id, receiver_id, content, is_read, created_at)
      VALUES (?, ?, ?, 0, datetime('now'))
    `).run(req.user.id, receiverId, content.trim());

        // Get the created message
        const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json({
            id: message.id,
            senderId: message.sender_id,
            receiverId: message.receiver_id,
            content: message.content,
            isRead: false,
            createdAt: message.created_at,
            isOwnMessage: true
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// PUT /api/messages/:userId/read - Mark messages from a user as read
router.put('/:userId/read', authenticateWithProfile, (req, res) => {
    try {
        const senderId = parseInt(req.params.userId);

        if (isNaN(senderId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // CRITICAL: Verify users are connected before allowing read receipt updates
        if (!areUsersConnected(req.user.id, senderId)) {
            return res.status(403).json({
                error: 'You can only access messages from connected users',
                code: 'NOT_CONNECTED'
            });
        }

        // Mark all messages from this sender to current user as read
        const result = db.prepare(`
      UPDATE messages 
      SET is_read = 1 
      WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
    `).run(senderId, req.user.id);

        res.json({
            message: 'Messages marked as read',
            updatedCount: result.changes
        });

    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
});

module.exports = router;
