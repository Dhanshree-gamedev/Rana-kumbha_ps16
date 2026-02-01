import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function CreatePostPage() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [content, setContent] = useState('');
    const [media, setMedia] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [mediaType, setMediaType] = useState(null); // 'image' or 'video'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const VALID_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
    const VALID_VIDEO_TYPES = ['video/mp4', 'video/webm'];
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

    const handleMediaChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const isImage = VALID_IMAGE_TYPES.includes(file.type);
        const isVideo = VALID_VIDEO_TYPES.includes(file.type);

        if (!isImage && !isVideo) {
            setError('Please select a valid file (JPG, PNG, MP4, or WEBM)');
            return;
        }

        // Validate file size
        if (isImage && file.size > MAX_IMAGE_SIZE) {
            setError('Image must be less than 5MB');
            return;
        }
        if (isVideo && file.size > MAX_VIDEO_SIZE) {
            setError('Video must be less than 50MB');
            return;
        }

        setMedia(file);
        setMediaPreview(URL.createObjectURL(file));
        setMediaType(isVideo ? 'video' : 'image');
        setError('');
    };

    const removeMedia = () => {
        setMedia(null);
        setMediaPreview(null);
        setMediaType(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!content.trim()) {
            setError('Please write something for your post');
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('content', content.trim());
            if (media) {
                formData.append('media', media);
            }

            await api.post('/posts', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create post. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Extract hashtags for preview
    const extractHashtags = (text) => {
        const matches = text.match(/#\w+/g);
        return matches ? [...new Set(matches)] : [];
    };

    const hashtags = extractHashtags(content);

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Create Post</h1>
                <p className="page-subtitle">Share something with your campus</p>
            </div>

            {error && (
                <div className="alert alert-error">
                    <span>⚠️</span>
                    <span>{error}</span>
                </div>
            )}

            <div className="card">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <textarea
                            className="form-input form-textarea"
                            placeholder="What's on your mind? Use #hashtags to categorize your post..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            style={{ minHeight: '150px' }}
                            autoFocus
                        />
                    </div>

                    {/* Hashtag Preview */}
                    {hashtags.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <p className="text-small text-muted" style={{ marginBottom: 'var(--space-2)' }}>
                                Hashtags detected:
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                                {hashtags.map((tag, i) => (
                                    <span key={i} className="badge badge-primary">{tag}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Media Preview */}
                    {mediaPreview && (
                        <div style={{ position: 'relative', marginBottom: 'var(--space-4)' }}>
                            {mediaType === 'video' ? (
                                <video
                                    src={mediaPreview}
                                    style={{
                                        width: '100%',
                                        borderRadius: 'var(--radius-lg)',
                                        maxHeight: '300px',
                                        objectFit: 'cover'
                                    }}
                                    controls
                                    muted
                                />
                            ) : (
                                <img
                                    src={mediaPreview}
                                    alt="Preview"
                                    style={{
                                        width: '100%',
                                        borderRadius: 'var(--radius-lg)',
                                        maxHeight: '300px',
                                        objectFit: 'cover'
                                    }}
                                />
                            )}
                            <button
                                type="button"
                                onClick={removeMedia}
                                style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    background: 'rgba(0,0,0,0.6)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    cursor: 'pointer',
                                    fontSize: '1rem'
                                }}
                            >
                                ✕
                            </button>
                            {mediaType === 'video' && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '8px',
                                    left: '8px',
                                    background: 'rgba(0,0,0,0.6)',
                                    color: 'white',
                                    padding: '4px 8px',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.75rem'
                                }}>
                                    🎥 Video
                                </div>
                            )}
                        </div>
                    )}

                    {/* Media Upload */}
                    {!mediaPreview && (
                        <div
                            className="image-upload"
                            onClick={() => fileInputRef.current?.click()}
                            style={{ marginBottom: 'var(--space-4)' }}
                        >
                            <div className="image-upload-placeholder">
                                <span style={{ fontSize: '2rem', marginBottom: '8px', display: 'block' }}>📷</span>
                                <span>Add an image or video (optional)</span>
                                <p className="text-small text-muted" style={{ marginTop: '4px' }}>
                                    Images: JPG, PNG up to 5MB • Videos: MP4, WEBM up to 50MB
                                </p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,video/mp4,video/webm"
                                onChange={handleMediaChange}
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => navigate(-1)}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || !content.trim()}
                            style={{ flex: 1 }}
                        >
                            {loading ? <span className="spinner spinner-sm"></span> : 'Post'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreatePostPage;
