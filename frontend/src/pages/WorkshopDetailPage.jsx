import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

function WorkshopDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const messagesEndRef = useRef(null);
    const lastMessageIdRef = useRef(0);

    const [workshop, setWorkshop] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [joining, setJoining] = useState(false);

    // Live chat state
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);

    useEffect(() => {
        fetchWorkshop();
    }, [id]);

    // Poll for workshop updates and new messages when live
    useEffect(() => {
        if (!workshop) return;

        const interval = setInterval(() => {
            if (workshop.status === 'live') {
                fetchWorkshop();
                fetchMessages();
            }
        }, 3000); // Poll every 3 seconds for smoother chat

        return () => clearInterval(interval);
    }, [workshop?.status, id]);

    // Fetch messages when workshop goes live or user joins
    useEffect(() => {
        if (workshop?.status === 'live' && (workshop.userJoined || workshop.isInstructor)) {
            fetchMessages();
        }
    }, [workshop?.status, workshop?.userJoined, workshop?.isInstructor]);

    const fetchWorkshop = async () => {
        try {
            const response = await api.get(`/workshops/${id}`);
            setWorkshop(response.data);
        } catch (err) {
            setError('Workshop not found');
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async () => {
        try {
            const since = lastMessageIdRef.current > 0 ? `?since=${lastMessageIdRef.current}` : '';
            const response = await api.get(`/workshops/${id}/messages${since}`);

            if (response.data.length > 0) {
                if (lastMessageIdRef.current === 0) {
                    // First load - replace all
                    setChatMessages(response.data);
                } else {
                    // Append new messages
                    setChatMessages(prev => [...prev, ...response.data]);
                }
                // Update last message ID
                lastMessageIdRef.current = response.data[response.data.length - 1].id;

                // Scroll to bottom
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        } catch (err) {
            // Silently handle - user may not have access
        }
    };

    const handleJoin = async () => {
        setJoining(true);
        try {
            await api.post(`/workshops/${id}/join`);
            fetchWorkshop();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to join');
        } finally {
            setJoining(false);
        }
    };

    const handleLeave = async () => {
        try {
            await api.post(`/workshops/${id}/leave`);
            fetchWorkshop();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to leave');
        }
    };

    const handleStart = async () => {
        try {
            await api.post(`/workshops/${id}/start`);
            fetchWorkshop();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to start workshop');
        }
    };

    const handleEnd = async () => {
        if (!window.confirm('Are you sure you want to end this workshop? Badges will be awarded to attendees.')) {
            return;
        }
        try {
            await api.post(`/workshops/${id}/end`);
            fetchWorkshop();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to end workshop');
        }
    };

    // Send chat message to backend
    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || sendingMessage) return;

        setSendingMessage(true);
        try {
            const response = await api.post(`/workshops/${id}/messages`, {
                content: chatInput.trim()
            });

            // Add message to local state immediately for responsiveness
            setChatMessages(prev => [...prev, response.data]);
            lastMessageIdRef.current = response.data.id;
            setChatInput('');

            // Scroll to bottom
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send message');
        } finally {
            setSendingMessage(false);
        }
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="page flex-center" style={{ minHeight: '50vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (error && !workshop) {
        return (
            <div className="page">
                <div className="empty-state">
                    <div className="empty-state-icon">❌</div>
                    <h3>Workshop not found</h3>
                    <button className="btn btn-primary" onClick={() => navigate('/workshops')}>
                        Back to Workshops
                    </button>
                </div>
            </div>
        );
    }

    const isInstructor = workshop.isInstructor;
    const hasJoined = workshop.userJoined;
    const isLive = workshop.status === 'live';
    const isCompleted = workshop.status === 'completed';

    return (
        <div className="page">
            {/* Back Button */}
            <button
                className="btn btn-ghost"
                onClick={() => navigate('/workshops')}
                style={{ marginBottom: 'var(--space-3)' }}
            >
                ← Back to Workshops
            </button>

            {error && (
                <div className="alert alert-error" style={{ marginBottom: 'var(--space-3)' }}>
                    <span>⚠️</span>
                    <span>{error}</span>
                </div>
            )}

            {/* Workshop Header */}
            <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                    <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{workshop.title}</h1>
                    {isLive && (
                        <span className="badge" style={{ background: 'var(--error-500)', color: 'white', animation: 'pulse 2s infinite' }}>
                            🔴 LIVE
                        </span>
                    )}
                    {isCompleted && (
                        <span className="badge" style={{ background: 'var(--gray-400)', color: 'white' }}>
                            Completed
                        </span>
                    )}
                </div>

                {workshop.description && (
                    <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-4)' }}>
                        {workshop.description}
                    </p>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                    <div>
                        <div className="text-small text-muted">Instructor</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: '4px' }}>
                            <div className="avatar avatar-sm">
                                {workshop.instructor.photo ? (
                                    <img
                                        src={`http://localhost:3001${workshop.instructor.photo}`}
                                        alt={workshop.instructor.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : workshop.instructor.name?.charAt(0)}
                            </div>
                            <span>{workshop.instructor.name}</span>
                        </div>
                    </div>

                    <div>
                        <div className="text-small text-muted">Scheduled</div>
                        <div style={{ marginTop: '4px' }}>📅 {formatDateTime(workshop.scheduledAt)}</div>
                    </div>

                    <div>
                        <div className="text-small text-muted">Duration</div>
                        <div style={{ marginTop: '4px' }}>⏱️ {workshop.duration} minutes</div>
                    </div>

                    <div>
                        <div className="text-small text-muted">Participants</div>
                        <div style={{ marginTop: '4px' }}>👥 {workshop.participantCount} / {workshop.maxParticipants}</div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                    {isInstructor && !isLive && !isCompleted && (
                        <button className="btn btn-primary" onClick={handleStart}>
                            🚀 Start Workshop
                        </button>
                    )}

                    {isInstructor && isLive && (
                        <button className="btn btn-secondary" onClick={handleEnd}>
                            ⏹️ End Workshop
                        </button>
                    )}

                    {!isInstructor && !hasJoined && !isCompleted && (
                        <button
                            className="btn btn-primary"
                            onClick={handleJoin}
                            disabled={joining || workshop.participantCount >= workshop.maxParticipants}
                        >
                            {joining ? <span className="spinner spinner-sm"></span> : '✋ Join Workshop'}
                        </button>
                    )}

                    {!isInstructor && hasJoined && !isLive && !isCompleted && (
                        <button className="btn btn-secondary" onClick={handleLeave}>
                            Leave Workshop
                        </button>
                    )}

                    {hasJoined && !isCompleted && (
                        <span className="badge badge-primary">✓ You're registered</span>
                    )}
                </div>
            </div>

            {/* Live Session Room */}
            {isLive && (hasJoined || isInstructor) && (
                <div className="card">
                    <h3 style={{ marginBottom: 'var(--space-4)' }}>💬 Live Session Chat</h3>

                    {/* Chat Messages */}
                    <div style={{
                        height: '300px',
                        overflowY: 'auto',
                        background: 'var(--gray-50)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-3)',
                        marginBottom: 'var(--space-3)'
                    }}>
                        {chatMessages.length === 0 && (
                            <div className="text-muted text-center" style={{ paddingTop: '100px' }}>
                                Chat with other participants...
                            </div>
                        )}

                        {chatMessages.map(msg => (
                            <div key={msg.id} style={{
                                marginBottom: 'var(--space-2)',
                                padding: 'var(--space-2)',
                                background: msg.user?.id === user?.id ? 'var(--primary-100)' : 'white',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                                    <span style={{ fontWeight: 600, color: msg.user?.id === user?.id ? 'var(--primary-600)' : 'var(--gray-700)' }}>
                                        {msg.user?.name || 'Unknown'}
                                    </span>
                                    <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                                </div>
                                <div style={{ marginTop: '4px' }}>{msg.content}</div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input */}
                    <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Type a message..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            disabled={sendingMessage}
                            style={{ flex: 1 }}
                        />
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={sendingMessage || !chatInput.trim()}
                        >
                            {sendingMessage ? <span className="spinner spinner-sm"></span> : 'Send'}
                        </button>
                    </form>
                </div>
            )}

            {/* Participants List */}
            {workshop.participants?.length > 0 && (
                <div className="card" style={{ marginTop: 'var(--space-4)' }}>
                    <h3 style={{ marginBottom: 'var(--space-3)' }}>Participants ({workshop.participants.length})</h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                        gap: 'var(--space-3)'
                    }}>
                        {workshop.participants.map(p => (
                            <div key={p.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-2)',
                                padding: 'var(--space-2)',
                                background: 'var(--gray-50)',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                <div className="avatar avatar-sm" style={{
                                    width: '32px',
                                    height: '32px',
                                    minWidth: '32px',
                                    flexShrink: 0
                                }}>
                                    {p.photo ? (
                                        <img
                                            src={`http://localhost:3001${p.photo}`}
                                            alt={p.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                        />
                                    ) : p.name?.charAt(0)}
                                </div>
                                <span style={{
                                    fontSize: '0.875rem',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>{p.name}</span>
                                {p.attended && <span title="Attended" style={{ color: 'var(--success-500)' }}>✓</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Notice */}
            {isCompleted && (
                <div className="card" style={{ marginTop: 'var(--space-4)', background: 'var(--success-50)', borderColor: 'var(--success-200)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <span style={{ fontSize: '2rem' }}>🎉</span>
                        <div>
                            <h3 style={{ margin: 0 }}>Workshop Completed!</h3>
                            <p style={{ margin: 0, color: 'var(--gray-600)' }}>
                                All attendees have been awarded the Workshop Attendee badge.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WorkshopDetailPage;
