import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

function ProfileSetupPage() {
    const { user, updateUser, refreshUser } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState(user?.name || '');
    const [branch, setBranch] = useState(user?.branch || '');
    const [year, setYear] = useState(user?.year || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(user?.profilePhoto || null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const fileInputRef = useRef(null);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!validTypes.includes(file.type)) {
            setError('Please select a valid image file (JPG, JPEG, or PNG)');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be less than 5MB');
            return;
        }

        setPhoto(file);
        setPhotoPreview(URL.createObjectURL(file));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!name.trim()) {
            setError('Please enter your name');
            return;
        }
        if (!branch.trim()) {
            setError('Please enter your branch/major');
            return;
        }
        if (!year.trim()) {
            setError('Please select your year');
            return;
        }

        setLoading(true);

        try {
            // Update profile info
            await api.put('/users/me', {
                name: name.trim(),
                branch: branch.trim(),
                year: year.trim(),
                bio: bio.trim()
            });

            // Upload photo if selected
            if (photo) {
                const formData = new FormData();
                formData.append('photo', photo);
                await api.post('/users/me/photo', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            // Refresh user data
            await refreshUser();

            // Navigate to feed
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const years = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduate', 'PhD'];

    return (
        <div className="auth-page">
            <div className="auth-container fade-in" style={{ maxWidth: '480px' }}>
                <div className="auth-logo">
                    <h1>CampusConnect</h1>
                    <p>Complete your profile to get started</p>
                </div>

                <div className="auth-card">
                    <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>Profile Setup</h2>

                    {error && (
                        <div className="alert alert-error">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Profile Photo */}
                        <div className="form-group" style={{ textAlign: 'center' }}>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{ cursor: 'pointer', display: 'inline-block' }}
                            >
                                {photoPreview ? (
                                    <img
                                        src={photoPreview}
                                        alt="Profile preview"
                                        className="avatar avatar-xl"
                                        style={{ objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div className="avatar avatar-xl" style={{
                                        border: '3px dashed var(--gray-300)',
                                        background: 'var(--gray-50)'
                                    }}>
                                        📷
                                    </div>
                                )}
                                <p className="text-small text-muted" style={{ marginTop: '8px' }}>
                                    Click to upload photo
                                </p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png"
                                onChange={handlePhotoChange}
                                style={{ display: 'none' }}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Full Name *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Your full name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Branch / Major *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g., Computer Science"
                                value={branch}
                                onChange={(e) => setBranch(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Year *</label>
                            <select
                                className="form-input"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                required
                            >
                                <option value="">Select your year</option>
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Bio</label>
                            <textarea
                                className="form-input form-textarea"
                                placeholder="Tell us a bit about yourself..."
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                maxLength={200}
                            />
                            <p className="form-hint">{bio.length}/200 characters</p>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg btn-block"
                            disabled={loading}
                        >
                            {loading ? <span className="spinner spinner-sm"></span> : 'Complete Setup'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ProfileSetupPage;
