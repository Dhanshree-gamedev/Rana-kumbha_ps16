import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function PostDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();

    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showShareModal, setShowShareModal] = useState(searchParams.get('share') === 'true');
    const [shareContent, setShareContent] = useState('');
    const [sharing, setSharing] = useState(false);

    useEffect(() => {
        fetchPost();
    }, [id]);

    const fetchPost = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/posts/${id}`);
            setPost(response.data);
        } catch (err) {
            setError('Post not found');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const handleLike = async () => {
        try {
            if (post.userLiked) {
                await api.delete(`/posts/${id}/like`);
            } else {
                await api.post(`/posts/${id}/like`);
            }
            setPost(prev => ({
                ...prev,
                userLiked: !prev.userLiked,
                likeCount: prev.userLiked ? prev.likeCount - 1 : prev.likeCount + 1
            }));
        } catch (err) {
            console.error('Like error:', err);
        }
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!comment.trim() || submitting) return;

        setSubmitting(true);
        try {
            const response = await api.post(`/posts/${id}/comments`, { content: comment.trim() });
            setPost(prev => ({
                ...prev,
                comments: [...prev.comments, response.data.comment],
                commentCount: response.data.commentCount
            }));
            setComment('');
        } catch (err) {
            console.error('Comment error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleShare = async () => {
        if (sharing) return;

        setSharing(true);
        try {
            await api.post(`/posts/${id}/share`, { content: shareContent.trim() });
            setShowShareModal(false);
            setShareContent('');
            // Update share count
            setPost(prev => ({
                ...prev,
                shareCount: prev.shareCount + 1
            }));
            navigate('/');
        } catch (err) {
            console.error('Share error:', err);
        } finally {
            setSharing(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this post?')) {
            try {
                await api.delete(`/posts/${id}`);
                navigate('/');
            } catch (err) {
                console.error('Delete error:', err);
            }
        }
    };

    // Render content with clickable hashtags
    const renderContent = (content) => {
        if (!content) return null;
        const parts = content.split(/(#\w+)/g);
        return parts.map((part, index) => {
            if (part.startsWith('#')) {
                return (
                    <span
                        key={index}
                        className="hashtag"
                        onClick={() => navigate(`/?hashtag=${part.substring(1)}`)}
                    >
                        {part}
                    </span>
                );
            }
            return part;
        });
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

    if (error || !post) {
        return (
            <div className="page">
                <div className="empty-state">
                    <div className="empty-state-icon">❌</div>
                    <h3>Post not found</h3>
                    <button className="btn btn-primary" onClick={() => navigate('/')}>
                        Back to Feed
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            {/* Back Button */}
            <button
                className="btn btn-ghost"
                onClick={() => navigate(-1)}
                style={{ marginBottom: 'var(--space-4)' }}
            >
                ← Back
            </button>

            {/* Post Card */}
            <article className="post-card">
                <header className="post-header">
                    <div
                        className="avatar"
                        onClick={() => navigate(`/profile/${post.userId}`)}
                        style={{ cursor: 'pointer' }}
                    >
                        {post.authorPhoto ? (
                            <img src={post.authorPhoto} alt={post.authorName} className="avatar" />
                        ) : (
                            post.authorName?.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="post-author-info">
                        <div
                            className="post-author-name"
                            onClick={() => navigate(`/profile/${post.userId}`)}
                        >
                            {post.authorName}
                        </div>
                        <div className="post-timestamp">{formatTime(post.createdAt)}</div>
                    </div>
                    {post.isOwnPost && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={handleDelete}
                            title="Delete post"
                        >
                            🗑️
                        </button>
                    )}
                </header>

                {post.content && (
                    <div className="post-content">
                        {renderContent(post.content)}
                    </div>
                )}

                {post.image && (
                    <img src={post.image} alt="Post" className="post-image" />
                )}

                {/* Original Post (if shared) */}
                {post.originalPost && (
                    <div className="shared-post">
                        <div className="shared-post-header">
                            <div className="avatar avatar-sm">
                                {post.originalPost.authorPhoto ? (
                                    <img src={post.originalPost.authorPhoto} alt={post.originalPost.authorName} className="avatar avatar-sm" />
                                ) : (
                                    post.originalPost.authorName?.charAt(0).toUpperCase()
                                )}
                            </div>
                            <span style={{ fontWeight: 500 }}>{post.originalPost.authorName}</span>
                        </div>
                        {post.originalPost.content && (
                            <p style={{ margin: 0, color: 'var(--gray-700)' }}>{post.originalPost.content}</p>
                        )}
                        {post.originalPost.image && (
                            <img
                                src={post.originalPost.image}
                                alt="Original post"
                                style={{
                                    width: '100%',
                                    borderRadius: 'var(--radius-md)',
                                    marginTop: 'var(--space-3)'
                                }}
                            />
                        )}
                    </div>
                )}

                <div className="post-actions">
                    <button
                        className={`post-action-btn ${post.userLiked ? 'liked' : ''}`}
                        onClick={handleLike}
                    >
                        <span>{post.userLiked ? '❤️' : '🤍'}</span>
                        <span>{post.likeCount || 0}</span>
                    </button>
                    <button className="post-action-btn">
                        <span>💬</span>
                        <span>{post.commentCount || 0}</span>
                    </button>
                    <button
                        className="post-action-btn"
                        onClick={() => setShowShareModal(true)}
                    >
                        <span>🔄</span>
                        <span>{post.shareCount || 0}</span>
                    </button>
                </div>
            </article>

            {/* Comments Section */}
            <section className="card" style={{ marginTop: 'var(--space-4)' }}>
                <h3 style={{ marginBottom: 'var(--space-4)' }}>
                    Comments ({post.comments?.length || 0})
                </h3>

                {/* Comment Form */}
                <form onSubmit={handleComment} className="comment-form">
                    <div className="avatar avatar-sm">
                        {user?.profilePhoto ? (
                            <img src={user.profilePhoto} alt={user.name} className="avatar avatar-sm" />
                        ) : (
                            user?.name?.charAt(0).toUpperCase()
                        )}
                    </div>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Write a comment..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={!comment.trim() || submitting}
                    >
                        {submitting ? <span className="spinner spinner-sm"></span> : 'Post'}
                    </button>
                </form>

                {/* Comments List */}
                <div style={{ marginTop: 'var(--space-4)' }}>
                    {(!post.comments || post.comments.length === 0) ? (
                        <p className="text-muted text-center">No comments yet. Be the first!</p>
                    ) : (
                        post.comments.map(c => (
                            <div key={c.id} className="comment-item">
                                <div
                                    className="avatar avatar-sm"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate(`/profile/${c.userId}`)}
                                >
                                    {c.authorPhoto ? (
                                        <img src={c.authorPhoto} alt={c.authorName} className="avatar avatar-sm" />
                                    ) : (
                                        c.authorName?.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="comment-content">
                                    <span
                                        className="comment-author"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => navigate(`/profile/${c.userId}`)}
                                    >
                                        {c.authorName}
                                    </span>
                                    <p className="comment-text">{c.content}</p>
                                    <span className="comment-time">{formatTime(c.createdAt)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Share Modal */}
            {showShareModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: 'var(--space-4)'
                    }}
                    onClick={() => setShowShareModal(false)}
                >
                    <div
                        className="card"
                        style={{ width: '100%', maxWidth: '400px' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ marginBottom: 'var(--space-4)' }}>Share Post</h3>
                        <textarea
                            className="form-input form-textarea"
                            placeholder="Add a comment to your share (optional)..."
                            value={shareContent}
                            onChange={(e) => setShareContent(e.target.value)}
                            style={{ marginBottom: 'var(--space-4)' }}
                        />
                        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowShareModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleShare}
                                disabled={sharing}
                                style={{ flex: 1 }}
                            >
                                {sharing ? <span className="spinner spinner-sm"></span> : 'Share'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PostDetailPage;
