const express = require('express');
const db = require('../database/init');
const { authenticate } = require('../middleware/auth');
const { handleProfileUpload } = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// GET /api/users/me - Get current user profile
router.get('/me', authenticate, (req, res) => {
    try {
        const user = db.prepare(`
      SELECT id, name, email, branch, year, bio, profile_photo, profile_completed, created_at
      FROM users WHERE id = ?
    `).get(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            branch: user.branch,
            year: user.year,
            bio: user.bio,
            profilePhoto: user.profile_photo,
            profileCompleted: !!user.profile_completed,
            createdAt: user.created_at
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// PUT /api/users/me - Update current user profile
router.put('/me', authenticate, (req, res) => {
    try {
        const { name, branch, year, bio } = req.body;

        // Validate name
        if (name !== undefined && (!name || name.trim().length === 0)) {
            return res.status(400).json({ error: 'Name cannot be empty' });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name.trim());
        }
        if (branch !== undefined) {
            updates.push('branch = ?');
            values.push(branch.trim());
        }
        if (year !== undefined) {
            updates.push('year = ?');
            values.push(year.trim());
        }
        if (bio !== undefined) {
            updates.push('bio = ?');
            values.push(bio.trim());
        }

        // Mark profile as completed if we have the essential fields
        const currentUser = db.prepare('SELECT name, branch, year FROM users WHERE id = ?').get(req.user.id);
        const finalName = name !== undefined ? name.trim() : currentUser.name;
        const finalBranch = branch !== undefined ? branch.trim() : currentUser.branch;
        const finalYear = year !== undefined ? year.trim() : currentUser.year;

        if (finalName && finalBranch && finalYear) {
            updates.push('profile_completed = 1');
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(req.user.id);

        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        // Fetch updated user
        const updatedUser = db.prepare(`
      SELECT id, name, email, branch, year, bio, profile_photo, profile_completed
      FROM users WHERE id = ?
    `).get(req.user.id);

        res.json({
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            branch: updatedUser.branch,
            year: updatedUser.year,
            bio: updatedUser.bio,
            profilePhoto: updatedUser.profile_photo,
            profileCompleted: !!updatedUser.profile_completed
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// POST /api/users/me/photo - Upload profile photo
router.post('/me/photo', authenticate, handleProfileUpload, (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Get old photo path to delete
        const oldUser = db.prepare('SELECT profile_photo FROM users WHERE id = ?').get(req.user.id);

        // Save new photo path
        const photoPath = `/uploads/profiles/${req.file.filename}`;
        db.prepare('UPDATE users SET profile_photo = ? WHERE id = ?').run(photoPath, req.user.id);

        // Delete old photo if exists
        if (oldUser.profile_photo) {
            const oldPath = path.join(__dirname, '..', oldUser.profile_photo);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        res.json({
            message: 'Profile photo updated',
            profilePhoto: photoPath
        });

    } catch (error) {
        console.error('Photo upload error:', error);
        res.status(500).json({ error: 'Failed to upload photo' });
    }
});

// GET /api/users/search - Search users
router.get('/search', authenticate, (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({ error: 'Search query must be at least 2 characters' });
        }

        const searchTerm = `%${q.trim()}%`;

        const users = db.prepare(`
      SELECT id, name, branch, year, bio, profile_photo
      FROM users 
      WHERE id != ? AND is_verified = 1 AND (name LIKE ? OR branch LIKE ?)
      LIMIT 20
    `).all(req.user.id, searchTerm, searchTerm);

        res.json(users.map(user => ({
            id: user.id,
            name: user.name,
            branch: user.branch,
            year: user.year,
            bio: user.bio,
            profilePhoto: user.profile_photo
        })));

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// GET /api/users/:id - Get another user's profile
router.get('/:id', authenticate, (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const user = db.prepare(`
      SELECT id, name, branch, year, bio, profile_photo, created_at
      FROM users WHERE id = ? AND is_verified = 1
    `).get(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get connection status between current user and this user
        let connectionStatus = null;
        let connectionId = null;

        const connection = db.prepare(`
      SELECT id, status, requester_id, receiver_id
      FROM connections 
      WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)
    `).get(req.user.id, userId, userId, req.user.id);

        if (connection) {
            connectionId = connection.id;
            if (connection.status === 'accepted') {
                connectionStatus = 'connected';
            } else if (connection.requester_id === req.user.id) {
                connectionStatus = 'pending_sent';
            } else {
                connectionStatus = 'pending_received';
            }
        }

        // Get post count
        const postCount = db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?').get(userId).count;

        // Get connection count
        const connectionCount = db.prepare(`
      SELECT COUNT(*) as count FROM connections 
      WHERE (requester_id = ? OR receiver_id = ?) AND status = 'accepted'
    `).get(userId, userId).count;

        res.json({
            id: user.id,
            name: user.name,
            branch: user.branch,
            year: user.year,
            bio: user.bio,
            profilePhoto: user.profile_photo,
            createdAt: user.created_at,
            connectionStatus,
            connectionId,
            postCount,
            connectionCount,
            isOwnProfile: userId === req.user.id
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user profile' });
    }
});

module.exports = router;
