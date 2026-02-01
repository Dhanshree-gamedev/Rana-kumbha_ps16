import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const user = await login(email, password);
            if (user.profileCompleted) {
                navigate('/');
            } else {
                navigate('/profile-setup');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Login failed. Please try again.';
            setError(errorMessage);

            // Check if email not verified
            if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
                setError('Please verify your email before logging in.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container fade-in">
                <div className="auth-logo">
                    <h1>CampusConnect</h1>
                    <p>Connect with your college community</p>
                </div>

                <div className="auth-card">
                    <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>Welcome back</h2>

                    {error && (
                        <div className="alert alert-error">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">College Email</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="you@university.edu"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg btn-block"
                            disabled={loading}
                        >
                            {loading ? <span className="spinner spinner-sm"></span> : 'Sign In'}
                        </button>
                    </form>
                </div>

                <div className="auth-footer">
                    Don't have an account?{' '}
                    <Link to="/signup">Sign up</Link>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
