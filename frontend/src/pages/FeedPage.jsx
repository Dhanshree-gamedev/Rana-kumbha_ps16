import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import PostCard from '../components/PostCard';

function FeedPage() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();

    const hashtag = searchParams.get('hashtag');

    useEffect(() => {
        fetchPosts();
    }, [hashtag]);

    const fetchPosts = async () => {
        setLoading(true);
        setError('');
        try {
            const params = hashtag ? { hashtag } : {};
            const response = await api.get('/posts', { params });
            setPosts(response.data);
        } catch (err) {
            setError('Failed to load posts. Please try again.');
            console.error('Fetch posts error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async (postId, isLiked) => {
        try {
            if (isLiked) {
                await api.delete(`/posts/${postId}/like`);
            } else {
                await api.post(`/posts/${postId}/like`);
            }

            // Update post in state
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

    const handleDelete = async (postId) => {
        try {
            await api.delete(`/posts/${postId}`);
            setPosts(prev => prev.filter(post => post.id !== postId));
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const clearHashtagFilter = () => {
        setSearchParams({});
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">
                    {hashtag ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span>#{hashtag}</span>
                            <button
                                onClick={clearHashtagFilter}
                                className="btn btn-ghost btn-sm"
                                title="Clear filter"
                            >
                                ✕
                            </button>
                        </span>
                    ) : (
                        'Home Feed'
                    )}
                </h1>
                {!hashtag && (
                    <p className="page-subtitle">See what's happening in your campus</p>
                )}
            </div>

            {loading && (
                <div className="flex-center" style={{ padding: '40px' }}>
                    <div className="spinner"></div>
                </div>
            )}

            {error && (
                <div className="alert alert-error">
                    <span>⚠️</span>
                    <span>{error}</span>
                </div>
            )}

            {!loading && !error && posts.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <h3>No posts yet</h3>
                    <p>
                        {hashtag
                            ? `No posts found with #${hashtag}`
                            : 'Be the first to share something with your campus!'}
                    </p>
                </div>
            )}

            {!loading && posts.map(post => (
                <PostCard
                    key={post.id}
                    post={post}
                    onLike={handleLike}
                    onDelete={handleDelete}
                />
            ))}
        </div>
    );
}

export default FeedPage;
