const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'mistralai/mistral-7b-instruct:free'; // Using a reliable free model

// System prompt for the campus assistant
const SYSTEM_PROMPT = `You are CampusConnect Assistant, a helpful AI assistant for a college social networking platform. You help students with:

1. **Platform Features**: Explaining how to use the feed, create posts, connect with peers, and join workshops
2. **Academic Support**: Providing study tips, explaining concepts, and helping with learning strategies
3. **Campus Life**: Answering questions about college life, clubs, and activities
4. **Technical Help**: Troubleshooting issues with the platform

Be friendly, concise, and helpful. Use emojis occasionally to be more engaging. Keep responses brief but informative.`;

// Simple fallback responses when API fails
const FALLBACK_RESPONSES = {
    'create': '📝 To create a post:\n1. Click the + button at the bottom\n2. Write your content\n3. Optionally add an image or video\n4. Click "Post" to share!\n\nYour posts will appear in the feed for all connected users to see.',
    'workshop': '🎓 To join a workshop:\n1. Go to Workshops from the bottom menu\n2. Browse available workshops\n3. Click on one to see details\n4. Click "Join Workshop"\n\nWhen the instructor starts it, you can chat with other participants!',
    'connect': '🤝 To connect with peers:\n1. Visit someone\'s profile\n2. Click "Connect"\n3. Wait for them to accept\n4. Once connected, you can message each other!',
    'message': '💬 To send messages:\n1. Go to Messages from the bottom menu\n2. Select a connected user\n3. Type your message and send!\n\nNote: You can only message users you\'re connected with.',
    'profile': '👤 To update your profile:\n1. Go to your profile page\n2. You can view your posts, connections, and badges\n3. Your profile photo and bio are set during profile setup',
    'default': 'Hi! 👋 I can help you with:\n\n• Creating posts 📝\n• Joining workshops 🎓\n• Connecting with peers 🤝\n• Sending messages 💬\n• Understanding features ❓\n\nWhat would you like to know about?'
};

function getFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('post') || lowerMessage.includes('create')) {
        return FALLBACK_RESPONSES['create'];
    }
    if (lowerMessage.includes('workshop') || lowerMessage.includes('join')) {
        return FALLBACK_RESPONSES['workshop'];
    }
    if (lowerMessage.includes('connect') || lowerMessage.includes('friend')) {
        return FALLBACK_RESPONSES['connect'];
    }
    if (lowerMessage.includes('message') || lowerMessage.includes('chat')) {
        return FALLBACK_RESPONSES['message'];
    }
    if (lowerMessage.includes('profile')) {
        return FALLBACK_RESPONSES['profile'];
    }

    return FALLBACK_RESPONSES['default'];
}

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

        try {
            // Try OpenRouter API using dynamic import for fetch
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

            if (response.ok) {
                const data = await response.json();
                const aiMessage = data.choices?.[0]?.message?.content;

                if (aiMessage) {
                    return res.json({
                        message: aiMessage,
                        model: MODEL
                    });
                }
            }

            // If API fails, use fallback
            console.log('OpenRouter API unavailable, using fallback responses');
        } catch (apiError) {
            console.error('OpenRouter API error:', apiError.message);
        }

        // Fallback: Use local responses
        const fallbackMessage = getFallbackResponse(message.trim());
        res.json({
            message: fallbackMessage,
            model: 'fallback'
        });

    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({ error: 'Failed to process chat request' });
    }
});

module.exports = router;
