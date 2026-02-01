import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function ChatPage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    const [otherUser, setOtherUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    useEffect(() => {
        fetchConversation();
        // Poll for new messages every 5 seconds
        const interval = setInterval(fetchConversation, 5000);
        return () => clearInterval(interval);
    }, [userId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchConversation = async () => {
        try {
            const response = await api.get(`/messages/${userId}`);
            setOtherUser(response.data.user);
            setMessages(response.data.messages);
            setError('');

            // Mark messages as read
            if (response.data.messages.some(m => !m.isRead && !m.isOwnMessage)) {
                await api.put(`/messages/${userId}/read`);
            }
        } catch (err) {
            if (err.response?.data?.code === 'NOT_CONNECTED') {
                setError('You must be connected to message this user.');
            } else {
                setError('Failed to load conversation.');
            }
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        const messageContent = newMessage.trim();
        setNewMessage('');
        setSending(true);

        try {
            const response = await api.post(`/messages/${userId}`, { content: messageContent });
            setMessages(prev => [...prev, response.data]);
        } catch (err) {
            if (err.response?.data?.code === 'NOT_CONNECTED') {
                setError('You must be connected to message this user.');
            }
            // Restore the message if sending failed
            setNewMessage(messageContent);
        } finally {
            setSending(false);
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateDivider = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    };

    // Group messages by date
    const groupedMessages = messages.reduce((groups, message) => {
        const date = new Date(message.createdAt).toDateString();
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(message);
        return groups;
    }, {});

    if (loading) {
        return (
            <div className="page">
                <div className="flex-center" style={{ padding: '40px' }}>
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page">
                <div className="empty-state">
                    <div className="empty-state-icon">🔒</div>
                    <h3>Cannot access chat</h3>
                    <p>{error}</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/messages')}
                        style={{ marginTop: 'var(--space-4)' }}
                    >
                        Back to Messages
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-container">
            {/* Chat Header */}
            <div className="chat-header">
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => navigate('/messages')}
                >
                    ←
                </button>
                <div
                    className="avatar"
                    onClick={() => navigate(`/profile/${userId}`)}
                    style={{ cursor: 'pointer' }}
                >
                    {otherUser?.profilePhoto ? (
                        <img src={otherUser.profilePhoto} alt={otherUser.name} className="avatar" />
                    ) : (
                        otherUser?.name?.charAt(0).toUpperCase()
                    )}
                </div>
                <div
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => navigate(`/profile/${userId}`)}
                >
                    <div style={{ fontWeight: 600 }}>{otherUser?.name}</div>
                </div>
            </div>

            {/* Messages */}
            <div className="chat-messages" ref={messagesContainerRef}>
                {messages.length === 0 ? (
                    <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                        <p className="text-muted">No messages yet. Say hello! 👋</p>
                    </div>
                ) : (
                    Object.entries(groupedMessages).map(([date, dateMessages]) => (
                        <div key={date}>
                            {/* Date Divider */}
                            <div style={{
                                textAlign: 'center',
                                margin: 'var(--space-4) 0',
                                color: 'var(--gray-400)',
                                fontSize: '0.75rem'
                            }}>
                                {formatDateDivider(dateMessages[0].createdAt)}
                            </div>

                            {/* Messages for this date */}
                            {dateMessages.map((message, index) => (
                                <div
                                    key={message.id}
                                    className={`message-bubble ${message.isOwnMessage ? 'own' : 'other'}`}
                                >
                                    <div>{message.content}</div>
                                    <div className="message-time">
                                        {formatTime(message.createdAt)}
                                        {message.isOwnMessage && (
                                            <span className="message-read" style={{ marginLeft: '4px' }}>
                                                {message.isRead ? '✓✓' : '✓'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form className="chat-input-container" onSubmit={handleSend}>
                <input
                    type="text"
                    className="form-input chat-input"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    autoFocus
                />
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!newMessage.trim() || sending}
                >
                    {sending ? <span className="spinner spinner-sm"></span> : '→'}
                </button>
            </form>
        </div>
    );
}

export default ChatPage;
