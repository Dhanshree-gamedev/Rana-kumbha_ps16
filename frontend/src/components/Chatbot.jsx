import { useState, useRef, useEffect } from 'react';
import api from '../api/axios';

function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hi! 👋 I\'m your CampusConnect Assistant. How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');

        // Add user message to chat
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);

        try {
            // Build history for context (exclude system messages)
            const history = messages
                .filter(m => m.role !== 'system')
                .map(m => ({ role: m.role, content: m.content }));

            const response = await api.post('/chatbot', {
                message: userMessage,
                history: history
            });

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response.data.message
            }]);
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again! 🙁'
            }]);
        } finally {
            setLoading(false);
        }
    };

    const quickQuestions = [
        'How do I create a post?',
        'How to join a workshop?',
        'How do I connect with peers?'
    ];

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="chatbot-toggle"
                aria-label="Toggle AI Assistant"
            >
                {isOpen ? '✕' : '🤖'}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="chatbot-window">
                    {/* Header */}
                    <div className="chatbot-header">
                        <div className="chatbot-header-info">
                            <span className="chatbot-avatar">🤖</span>
                            <div>
                                <div className="chatbot-title">CampusConnect AI</div>
                                <div className="chatbot-subtitle">Always here to help!</div>
                            </div>
                        </div>
                        <button className="chatbot-close" onClick={() => setIsOpen(false)}>✕</button>
                    </div>

                    {/* Messages */}
                    <div className="chatbot-messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`chatbot-message ${msg.role}`}>
                                {msg.role === 'assistant' && (
                                    <span className="chatbot-msg-avatar">🤖</span>
                                )}
                                <div className="chatbot-msg-content">
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="chatbot-message assistant">
                                <span className="chatbot-msg-avatar">🤖</span>
                                <div className="chatbot-msg-content chatbot-typing">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Questions (shown when no user messages) */}
                    {messages.length === 1 && (
                        <div className="chatbot-quick">
                            {quickQuestions.map((q, i) => (
                                <button
                                    key={i}
                                    className="chatbot-quick-btn"
                                    onClick={() => {
                                        setInput(q);
                                    }}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="chatbot-input-form">
                        <input
                            type="text"
                            placeholder="Ask me anything..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading}
                            className="chatbot-input"
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="chatbot-send"
                        >
                            {loading ? '...' : '➤'}
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}

export default Chatbot;
