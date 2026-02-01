import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function PostCard({ post, onLike, onDelete }) {
    const navigate = useNavigate();
    const { user } = useAuth();

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    // Parse content for hashtags
    const renderContent = (content) => {
        if (!content) return null;

        const parts = content.split(/(#\w+)/g);
        return parts.map((part, index) => {
            if (part.startsWith('#')) {
                return (
                    <span
                        key={index}
                        className="hashtag"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/?hashtag=${part.substring(1)}`);
                        }}
                    >
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    const handleAuthorClick = (e) => {
        e.stopPropagation();
        navigate(`/profile/${post.userId}`);
    };

    const handlePostClick = () => {
        navigate(`/post/${post.id}`);
    };

    const handleLike = (e) => {
        e.stopPropagation();
        onLike?.(post.id, post.userLiked);
    };

    const handleShare = (e) => {
        e.stopPropagation();
        navigate(`/post/${post.id}?share=true`);
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this post?')) {
            onDelete?.(post.id);
        }
    };

    return (
        <article className="post-card fade-in" onClick={handlePostClick} style={{ cursor: 'pointer' }}>
            {/* Shared Post Indicator */}
            {post.originalPost && (
                <div style={{
                    fontSize: '0.8125rem',
                    color: 'var(--gray-500)',
                    marginBottom: 'var(--space-3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)'
                }}>
                    <span>🔄</span>
                    <span>{post.authorName} shared a post</span>
                </div>
            )}

            {/* Post Header */}
            <header className="post-header">
                <div className="avatar" onClick={handleAuthorClick}>
                    {post.authorPhoto ? (
                        <img src={post.authorPhoto} alt={post.authorName} className="avatar" />
                    ) : (
                        post.authorName?.charAt(0).toUpperCase()
                    )}
                </div>
                <div className="post-author-info">
                    <div className="post-author-name" onClick={handleAuthorClick}>
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

            {/* Post Content */}
            {post.content && (
                <div className="post-content">
                    {renderContent(post.content)}
                </div>
            )}

            {/* Post Media (Image or Video) */}
            {post.image && (
                post.mediaType === 'video' ? (
                    <video
                        src={post.image}
                        className="post-image"
                        style={{ cursor: 'pointer' }}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (e.target.paused) {
                                e.target.play();
                            } else {
                                e.target.pause();
                            }
                        }}
                        onMouseEnter={(e) => e.target.play()}
                        onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                    />
                ) : (
                    <img src={post.image} alt="Post" className="post-image" loading="lazy" />
                )
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
                        <span style={{ color: 'var(--gray-400)' }}>•</span>
                        <span style={{ color: 'var(--gray-400)' }}>{formatTime(post.originalPost.createdAt)}</span>
                    </div>
                    {post.originalPost.content && (
                        <p style={{ margin: 0, color: 'var(--gray-700)' }}>{post.originalPost.content}</p>
                    )}
                    {post.originalPost.image && (
                        post.originalPost.mediaType === 'video' ? (
                            <video
                                src={post.originalPost.image}
                                style={{
                                    width: '100%',
                                    borderRadius: 'var(--radius-md)',
                                    marginTop: 'var(--space-3)',
                                    maxHeight: '200px',
                                    objectFit: 'cover'
                                }}
                                muted
                                loop
                                playsInline
                                preload="metadata"
                            />
                        ) : (
                            <img
                                src={post.originalPost.image}
                                alt="Original post"
                                loading="lazy"
                                style={{
                                    width: '100%',
                                    borderRadius: 'var(--radius-md)',
                                    marginTop: 'var(--space-3)',
                                    maxHeight: '200px',
                                    objectFit: 'cover'
                                }}
                            />
                        )
                    )}
                </div>
            )}

            {/* Post Actions */}
            <div className="post-actions">
                <button
                    className={`post-action-btn ${post.userLiked ? 'liked' : ''}`}
                    onClick={handleLike}
                >
                    <span>{post.userLiked ? '❤️' : '🤍'}</span>
                    <span>{post.likeCount || 0}</span>
                </button>
                <button className="post-action-btn" onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.id}`); }}>
                    <span>💬</span>
                    <span>{post.commentCount || 0}</span>
                </button>
                <button className="post-action-btn" onClick={handleShare}>
                    <span>🔄</span>
                    <span>{post.shareCount || 0}</span>
                </button>
            </div>
        </article>
    );
}

export default PostCard;
