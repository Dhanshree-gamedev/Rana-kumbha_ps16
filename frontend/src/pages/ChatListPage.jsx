import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function ChatListPage() {
    const navigate = useNavigate();

    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchThreads();
    }, []);

    const fetchThreads = async () => {
        setLoading(true);
        try {
            const response = await api.get('/messages');
            setThreads(response.data);
        } catch (err) {
            console.error('Fetch threads error:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const truncateMessage = (message, maxLength = 40) => {
        if (!message) return '';
        return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Messages</h1>
                <p className="page-subtitle">Chat with your connections</p>
            </div>

            {loading ? (
                <div className="flex-center" style={{ padding: '40px' }}>
                    <div className="spinner"></div>
                </div>
            ) : threads.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">💬</div>
                    <h3>No conversations yet</h3>
                    <p>Connect with classmates to start chatting!</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/connections')}
                        style={{ marginTop: 'var(--space-4)' }}
                    >
                        Find Connections
                    </button>
                </div>
            ) : (
                <div>
                    {threads.map(thread => (
                        <div
                            key={thread.user.id}
                            className={`chat-list-item ${thread.unreadCount > 0 ? 'unread' : ''}`}
                            onClick={() => navigate(`/chat/${thread.user.id}`)}
                        >
                            <div className="avatar">
                                {thread.user.profilePhoto ? (
                                    <img src={thread.user.profilePhoto} alt={thread.user.name} className="avatar" />
                                ) : (
                                    thread.user.name?.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="chat-list-info">
                                <div className="chat-list-name">{thread.user.name}</div>
                                <div className="chat-list-preview">
                                    {thread.lastMessage ? (
                                        <>
                                            {thread.lastMessage.isOwnMessage && 'You: '}
                                            {truncateMessage(thread.lastMessage.content)}
                                        </>
                                    ) : (
                                        <span style={{ fontStyle: 'italic', color: 'var(--gray-400)' }}>
                                            No messages yet
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                {thread.lastMessage && (
                                    <div className="chat-list-time">
                                        {formatTime(thread.lastMessage.createdAt)}
                                    </div>
                                )}
                                {thread.unreadCount > 0 && (
                                    <span className="badge badge-primary" style={{ marginTop: '4px' }}>
                                        {thread.unreadCount}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ChatListPage;
