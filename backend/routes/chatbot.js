const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// OpenRouter API configuration
const OPENROUTER_API_KEY = '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'z-ai/glm-4.5-air:free';

// System prompt for the campus assistant
const SYSTEM_PROMPT = `You are CampusConnect Assistant, a helpful AI assistant for a college social networking platform. You help students with:

1. **Platform Features**: Explaining how to use the feed, create posts, connect with peers, and join workshops
2. **Academic Support**: Providing study tips, explaining concepts, and helping with learning strategies
3. **Campus Life**: Answering questions about college life, clubs, and activities
4. **Technical Help**: Troubleshooting issues with the platform

Be friendly, concise, and helpful. Use emojis occasionally to be more engaging. Keep responses brief but informative.`;

// POST /api/chatbot - Send message to AI chatbot
router.post('/', authenticate, async (req, res) => {
    try {
        const { message, history = [] } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Build messages array with history
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history.slice(-10), // Keep last 10 messages for context
            { role: 'user', content: message.trim() }
        ];

        // Call OpenRouter API
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:5173',
                'X-Title': 'CampusConnect'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: messages,
                max_tokens: 500,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenRouter API error:', errorData);
            return res.status(500).json({ error: 'Failed to get AI response' });
        }

        const data = await response.json();
        const aiMessage = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

        res.json({
            message: aiMessage,
            model: MODEL
        });

    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({ error: 'Failed to process chat request' });
    }
});

module.exports = router;
