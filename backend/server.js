const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize database (creates tables if they don't exist)
const db = require('./database/init');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const connectionRoutes = require('./routes/connections');
const messageRoutes = require('./routes/messages');
const presenceRoutes = require('./routes/presence');
const workshopRoutes = require('./routes/workshops');
const badgeRoutes = require('./routes/badges');
const chatbotRoutes = require('./routes/chatbot');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/presence', presenceRoutes);
app.use('/api/workshops', workshopRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/chatbot', chatbotRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server after database is ready
async function startServer() {
    await db.waitForDb();

    app.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════════════════════╗
║     College Social Network - Backend Server            ║
╠════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}              ║
║  API Base URL:      http://localhost:${PORT}/api          ║
║  Uploads served at: http://localhost:${PORT}/uploads      ║
╚════════════════════════════════════════════════════════╝
    `);
    });
}

startServer().catch(console.error);

module.exports = app;
