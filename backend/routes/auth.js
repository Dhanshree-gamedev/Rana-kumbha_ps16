const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/init');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// List of allowed college email domains
const ALLOWED_DOMAINS = [
    'edu',
    'edu.in',
    'ac.in',
    'ac.uk',
    'edu.au',
    'college.edu',
    'university.edu'
];

// Check if email domain is a valid college domain
function isCollegeEmail(email) {
    const domain = email.split('@')[1];
    if (!domain) return false;

    // Check if domain ends with any allowed suffix
    return ALLOWED_DOMAINS.some(allowed => {
        return domain.endsWith(`.${allowed}`) || domain === allowed;
    });
}

// POST /api/auth/signup - Register new user
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate college email domain
        if (!isCollegeEmail(email)) {
            return res.status(400).json({
                error: 'Only college/university email addresses are allowed. Email must end with .edu, .ac.in, etc.'
            });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if email already exists
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Generate verification token
        const verificationToken = uuidv4();

        // Insert user
        const result = db.prepare(`
      INSERT INTO users (name, email, password, verification_token, is_verified, created_at)
      VALUES (?, ?, ?, ?, 0, datetime('now'))
    `).run(name.trim(), email.toLowerCase(), hashedPassword, verificationToken);

        // In a real app, we would send an email here
        // For local development, we'll return the verification token
        console.log(`Verification link: http://localhost:5173/verify-email/${verificationToken}`);

        res.status(201).json({
            message: 'Account created. Please check your email to verify your account.',
            // For development only - remove in production
            verificationToken: verificationToken
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
});

// GET /api/auth/verify-email/:token - Verify email
router.get('/verify-email/:token', (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({ error: 'Verification token required' });
        }

        // Find user with this token
        const user = db.prepare('SELECT id, is_verified FROM users WHERE verification_token = ?').get(token);

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }

        if (user.is_verified) {
            return res.status(400).json({ error: 'Email already verified' });
        }

        // Update user as verified
        db.prepare('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?').run(user.id);

        res.json({ message: 'Email verified successfully. You can now log in.' });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// POST /api/auth/login - Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = db.prepare(`
      SELECT id, name, email, password, is_verified, profile_completed, profile_photo, branch, year, bio
      FROM users WHERE email = ?
    `).get(email.toLowerCase());

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check if verified
        if (!user.is_verified) {
            return res.status(403).json({
                error: 'Please verify your email before logging in',
                code: 'EMAIL_NOT_VERIFIED'
            });
        }

        // Generate token
        const token = generateToken(user.id);

        // Return user data (without password)
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                profilePhoto: user.profile_photo,
                branch: user.branch,
                year: user.year,
                bio: user.bio,
                profileCompleted: !!user.profile_completed
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// POST /api/auth/logout - Logout (client-side token removal)
router.post('/logout', (req, res) => {
    // JWT tokens are stateless, so logout is handled client-side
    // This endpoint is just for API completeness
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;
