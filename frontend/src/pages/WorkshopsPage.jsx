import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

function WorkshopsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [workshops, setWorkshops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [filter, setFilter] = useState('all'); // all, scheduled, live, completed

    // Create form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [duration, setDuration] = useState(60);
    const [maxParticipants, setMaxParticipants] = useState(50);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchWorkshops();
    }, [filter]);

    const fetchWorkshops = async () => {
        setLoading(true);
        try {
            const params = filter !== 'all' ? { status: filter } : {};
            const response = await api.get('/workshops', { params });
            setWorkshops(response.data);
        } catch (err) {
            console.error('Failed to fetch workshops:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');

        if (!title.trim() || !scheduledAt) {
            setError('Title and schedule are required');
            return;
        }

        setCreating(true);
        try {
            await api.post('/workshops', {
                title: title.trim(),
                description: description.trim(),
                scheduledAt,
                duration,
                maxParticipants
            });

            // Reset form and refresh list
            setTitle('');
            setDescription('');
            setScheduledAt('');
            setDuration(60);
            setMaxParticipants(50);
            setShowCreateForm(false);
            fetchWorkshops();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create workshop');
        } finally {
            setCreating(false);
        }
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'live':
                return <span className="badge" style={{ background: 'var(--success-500)', color: 'white' }}>🔴 Live</span>;
            case 'completed':
                return <span className="badge" style={{ background: 'var(--gray-400)', color: 'white' }}>Completed</span>;
            default:
                return <span className="badge badge-primary">Scheduled</span>;
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Workshops</h1>
                <p className="page-subtitle">Learn from seniors and share your knowledge</p>
            </div>

            {/* Filter Tabs */}
            <div className="tabs" style={{ marginBottom: 'var(--space-4)' }}>
                {['all', 'scheduled', 'live', 'completed'].map(f => (
                    <button
                        key={f}
                        className={`tab ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Create Workshop Button */}
            <button
                className="btn btn-primary"
                onClick={() => setShowCreateForm(!showCreateForm)}
                style={{ marginBottom: 'var(--space-4)', width: '100%' }}
            >
                {showCreateForm ? 'Cancel' : '+ Create Workshop'}
            </button>

            {/* Create Form */}
            {showCreateForm && (
                <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                    <h3 style={{ marginBottom: 'var(--space-4)' }}>Create New Workshop</h3>

                    {error && (
                        <div className="alert alert-error" style={{ marginBottom: 'var(--space-3)' }}>
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleCreate}>
                        <div className="form-group">
                            <label className="form-label">Title *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Workshop title"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                                className="form-input form-textarea"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What will participants learn?"
                                style={{ minHeight: '80px' }}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Schedule *</label>
                            <input
                                type="datetime-local"
                                className="form-input"
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                                required
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Duration (mins)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={duration}
                                    onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                                    min="15"
                                    max="300"
                                />
                            </div>

                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Max Participants</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={maxParticipants}
                                    onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 50)}
                                    min="5"
                                    max="500"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={creating}
                            style={{ width: '100%' }}
                        >
                            {creating ? <span className="spinner spinner-sm"></span> : 'Create Workshop'}
                        </button>
                    </form>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex-center" style={{ padding: '40px' }}>
                    <div className="spinner"></div>
                </div>
            )}

            {/* Workshops List */}
            {!loading && workshops.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">🎓</div>
                    <h3>No workshops found</h3>
                    <p>Be the first to create a workshop!</p>
                </div>
            )}

            {!loading && workshops.map(workshop => (
                <div
                    key={workshop.id}
                    className="card"
                    style={{ marginBottom: 'var(--space-3)', cursor: 'pointer' }}
                    onClick={() => navigate(`/workshop/${workshop.id}`)}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                        <h3 style={{ margin: 0 }}>{workshop.title}</h3>
                        {getStatusBadge(workshop.status)}
                    </div>

                    {workshop.description && (
                        <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-3)' }}>
                            {workshop.description.length > 100
                                ? workshop.description.slice(0, 100) + '...'
                                : workshop.description}
                        </p>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', fontSize: '0.875rem', color: 'var(--gray-500)' }}>
                        <span>👤 {workshop.instructor.name}</span>
                        <span>📅 {formatDateTime(workshop.scheduledAt)}</span>
                        <span>⏱️ {workshop.duration} mins</span>
                        <span>👥 {workshop.participantCount}/{workshop.maxParticipants}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default WorkshopsPage;
