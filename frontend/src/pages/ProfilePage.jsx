import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';

function ProfilePage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, refreshUser } = useAuth();

    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        branch: '',
        year: '',
        bio: ''
    });

    const isOwnProfile = currentUser && parseInt(id) === currentUser.id;

    useEffect(() => {
        fetchProfile();
        fetchPosts();
    }, [id]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/users/${id}`);
            setProfile(response.data);
            setEditForm({
                name: response.data.name || '',
                branch: response.data.branch || '',
                year: response.data.year || '',
                bio: response.data.bio || ''
            });
        } catch (err) {
            setError('User not found');
        } finally {
            setLoading(false);
        }
    };

    const fetchPosts = async () => {
        try {
            const response = await api.get(`/posts/user/${id}`);
            setPosts(response.data);
        } catch (err) {
            console.error('Fetch posts error:', err);
        }
    };

    const handleConnect = async () => {
        setActionLoading(true);
        try {
            await api.post(`/connections/${id}`);
            setProfile(prev => ({
                ...prev,
                connectionStatus: 'pending_sent'
            }));
        } catch (err) {
            console.error('Connect error:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleAccept = async () => {
        setActionLoading(true);
        try {
            await api.put(`/connections/${profile.connectionId}/accept`);
            setProfile(prev => ({
                ...prev,
                connectionStatus: 'connected'
            }));
        } catch (err) {
            console.error('Accept error:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveConnection = async () => {
        if (!window.confirm('Remove this connection?')) return;

        setActionLoading(true);
        try {
            await api.delete(`/connections/${profile.connectionId}`);
            setProfile(prev => ({
                ...prev,
                connectionStatus: null,
                connectionId: null
            }));
        } catch (err) {
            console.error('Remove error:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await api.put('/users/me', editForm);
            await refreshUser();
            setProfile(prev => ({
                ...prev,
                ...editForm
            }));
            setEditing(false);
        } catch (err) {
            console.error('Update error:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleLike = async (postId, isLiked) => {
        try {
            if (isLiked) {
                await api.delete(`/posts/${postId}/like`);
            } else {
                await api.post(`/posts/${postId}/like`);
            }

            setPosts(prev => prev.map(post => {
                if (post.id === postId) {
                    return {
                        ...post,
                        userLiked: !isLiked,
                        likeCount: isLiked ? post.likeCount - 1 : post.likeCount + 1
                    };
                }
                return post;
            }));
        } catch (err) {
            console.error('Like error:', err);
        }
    };

    const handleDeletePost = async (postId) => {
        try {
            await api.delete(`/posts/${postId}`);
            setPosts(prev => prev.filter(post => post.id !== postId));
            setProfile(prev => ({
                ...prev,
                postCount: prev.postCount - 1
            }));
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const renderConnectionButton = () => {
        if (isOwnProfile) return null;
        if (actionLoading) {
            return <button className="btn btn-primary" disabled><span className="spinner spinner-sm"></span></button>;
        }

        switch (profile?.connectionStatus) {
            case 'connected':
                return (
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate(`/chat/${id}`)}
                        >
                            💬 Message
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={handleRemoveConnection}
                        >
                            ✓ Connected
                        </button>
                    </div>
                );
            case 'pending_sent':
                return <button className="btn btn-secondary" disabled>Pending</button>;
            case 'pending_received':
                return (
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button className="btn btn-primary" onClick={handleAccept}>Accept</button>
                        <button className="btn btn-secondary" onClick={handleRemoveConnection}>Decline</button>
                    </div>
                );
            default:
                return <button className="btn btn-primary" onClick={handleConnect}>Connect</button>;
        }
    };

    if (loading) {
        return (
            <div className="page">
                <div className="flex-center" style={{ padding: '40px' }}>
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="page">
                <div className="empty-state">
                    <div className="empty-state-icon">👤</div>
                    <h3>User not found</h3>
                    <button className="btn btn-primary" onClick={() => navigate('/')}>
                        Back to Feed
                    </button>
                </div>
            </div>
        );
    }

    const years = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduate', 'PhD'];

    return (
        <div className="page">
            {/* Profile Header */}
            <div className="profile-header">
                <div className="avatar avatar-xl profile-avatar">
                    {profile.profilePhoto ? (
                        <img src={profile.profilePhoto} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    ) : (
                        profile.name?.charAt(0).toUpperCase()
                    )}
                </div>

                {editing ? (
                    <form onSubmit={handleSaveProfile}>
                        <input
                            type="text"
                            className="form-input"
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Your name"
                            style={{ marginBottom: 'var(--space-3)', textAlign: 'center' }}
                        />
                        <input
                            type="text"
                            className="form-input"
                            value={editForm.branch}
                            onChange={(e) => setEditForm(prev => ({ ...prev, branch: e.target.value }))}
                            placeholder="Branch/Major"
                            style={{ marginBottom: 'var(--space-3)' }}
                        />
                        <select
                            className="form-input"
                            value={editForm.year}
                            onChange={(e) => setEditForm(prev => ({ ...prev, year: e.target.value }))}
                            style={{ marginBottom: 'var(--space-3)' }}
                        >
                            <option value="">Select year</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <textarea
                            className="form-input form-textarea"
                            value={editForm.bio}
                            onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                            placeholder="Bio"
                            maxLength={200}
                            style={{ marginBottom: 'var(--space-3)' }}
                        />
                        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                                {actionLoading ? <span className="spinner spinner-sm"></span> : 'Save'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
                        <h2 className="profile-name">{profile.name}</h2>
                        <p className="profile-meta">
                            {profile.branch} • {profile.year}
                        </p>
                        {profile.bio && <p className="profile-bio">{profile.bio}</p>}

                        <div className="profile-stats">
                            <div className="profile-stat">
                                <div className="profile-stat-value">{profile.postCount || 0}</div>
                                <div className="profile-stat-label">Posts</div>
                            </div>
                            <div className="profile-stat">
                                <div className="profile-stat-value">{profile.connectionCount || 0}</div>
                                <div className="profile-stat-label">Connections</div>
                            </div>
                        </div>

                        <div style={{ marginTop: 'var(--space-4)' }}>
                            {isOwnProfile ? (
                                <button className="btn btn-secondary" onClick={() => setEditing(true)}>
                                    ✏️ Edit Profile
                                </button>
                            ) : (
                                renderConnectionButton()
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* User's Posts */}
            <div style={{ marginTop: 'var(--space-6)' }}>
                <h3 style={{ marginBottom: 'var(--space-4)' }}>Posts</h3>

                {posts.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📝</div>
                        <h3>No posts yet</h3>
                        {isOwnProfile && (
                            <button className="btn btn-primary" onClick={() => navigate('/create-post')}>
                                Create your first post
                            </button>
                        )}
                    </div>
                ) : (
                    posts.map(post => (
                        <PostCard
                            key={post.id}
                            post={post}
                            onLike={handleLike}
                            onDelete={handleDeletePost}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default ProfilePage;
