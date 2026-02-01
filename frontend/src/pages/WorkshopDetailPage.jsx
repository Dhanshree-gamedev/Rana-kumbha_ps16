import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

function WorkshopDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const messagesEndRef = useRef(null);

    const [workshop, setWorkshop] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [joining, setJoining] = useState(false);

    // Live chat simulation state
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');

    useEffect(() => {
        fetchWorkshop();
        // Poll for updates when live
        const interval = setInterval(() => {
            if (workshop?.status === 'live') {
                fetchWorkshop();
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [id]);

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

    const handleMarkAttendance = async () => {
        try {
            await api.post(`/workshops/${id}/attend`);
            setError('');
            fetchWorkshop();
        } catch (err) {
            // Silently handle
        }
    };

    // Simulate chat for live session
    const handleChatSubmit = (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        setChatMessages(prev => [...prev, {
            id: Date.now(),
            userId: user?.id,
            userName: user?.name,
            message: chatInput.trim(),
            time: new Date().toLocaleTimeString()
        }]);
        setChatInput('');

        // Mark attendance when chatting
        handleMarkAttendance();

        // Scroll to bottom
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
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
                                    <img src={workshop.instructor.photo} alt={workshop.instructor.name} />
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
                                background: msg.userId === user?.id ? 'var(--primary-light)' : 'white',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                                    <span style={{ fontWeight: 600 }}>{msg.userName}</span>
                                    <span>{msg.time}</span>
                                </div>
                                <div style={{ marginTop: '4px' }}>{msg.message}</div>
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
                            style={{ flex: 1 }}
                        />
                        <button type="submit" className="btn btn-primary">Send</button>
                    </form>
                </div>
            )}

            {/* Participants List */}
            {workshop.participants?.length > 0 && (
                <div className="card" style={{ marginTop: 'var(--space-4)' }}>
                    <h3 style={{ marginBottom: 'var(--space-3)' }}>Participants ({workshop.participants.length})</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                        {workshop.participants.map(p => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <div className="avatar avatar-sm">
                                    {p.photo ? <img src={p.photo} alt={p.name} /> : p.name?.charAt(0)}
                                </div>
                                <span>{p.name}</span>
                                {p.attended && <span title="Attended">✓</span>}
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
