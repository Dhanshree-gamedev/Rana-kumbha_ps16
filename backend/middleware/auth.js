const jwt = require('jsonwebtoken');
const db = require('../database/init');

const JWT_SECRET = process.env.JWT_SECRET || 'college-social-secret-key-2024';

// Authentication middleware - verifies JWT token
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Fetch user from database to ensure they still exist and are verified
        const user = db.prepare('SELECT id, name, email, is_verified, profile_completed FROM users WHERE id = ?').get(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        if (!user.is_verified) {
            return res.status(403).json({ error: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Authentication that also requires profile completion
function authenticateWithProfile(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Fetch FRESH user from database on every request
        const user = db.prepare('SELECT id, name, email, is_verified, profile_completed FROM users WHERE id = ?').get(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        if (!user.is_verified) {
            return res.status(403).json({ error: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' });
        }

        // Check profile completion
        if (!user.profile_completed) {
            return res.status(403).json({
                error: 'Please complete your profile first',
                code: 'PROFILE_NOT_COMPLETED'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Optional authentication - doesn't fail if no token, but sets user if valid
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = db.prepare('SELECT id, name, email, is_verified, profile_completed FROM users WHERE id = ?').get(decoded.userId);
        req.user = user || null;
    } catch (error) {
        req.user = null;
    }

    next();
}

// Generate JWT token
function generateToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = {
    authenticate,
    authenticateWithProfile,
    optionalAuth,
    generateToken,
    JWT_SECRET
};
