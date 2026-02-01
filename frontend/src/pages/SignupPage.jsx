import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function SignupPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const { signup } = useAuth();
    const navigate = useNavigate();

    const validateEmail = (email) => {
        // Check for common college email domains
        const collegeDomains = ['.edu', '.ac.in', '.ac.uk', '.edu.au', '.edu.in'];
        const domain = email.split('@')[1];
        if (!domain) return false;
        return collegeDomains.some(suffix => domain.endsWith(suffix));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validation
        if (!name.trim()) {
            setError('Please enter your name');
            return;
        }

        if (!validateEmail(email)) {
            setError('Please use a valid college email address (e.g., .edu, .ac.in)');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const response = await signup(name, email, password);
            setSuccess('Account created! Please check your email for the verification link.');

            // For development: show the verification token
            if (response.verificationToken) {
                setSuccess(
                    `Account created! For development, click below to verify:\n` +
                    `Your verification link: /verify-email/${response.verificationToken}`
                );
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container fade-in">
                <div className="auth-logo">
                    <h1>CampusConnect</h1>
                    <p>Join your college community</p>
                </div>

                <div className="auth-card">
                    <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>Create Account</h2>

                    {error && (
                        <div className="alert alert-error">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="alert alert-success">
                            <span>✅</span>
                            <div>
                                <p style={{ margin: 0 }}>{success.split('\n')[0]}</p>
                                {success.includes('/verify-email/') && (
                                    <Link
                                        to={success.split(': ')[1]}
                                        style={{ display: 'block', marginTop: '8px', fontWeight: 500 }}
                                    >
                                        Click here to verify your email →
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    {!success && (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">College Email</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="you@university.edu"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                <p className="form-hint">Must be a college email (.edu, .ac.in, etc.)</p>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="Min. 6 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Confirm Password</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="Repeat password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg btn-block"
                                disabled={loading}
                            >
                                {loading ? <span className="spinner spinner-sm"></span> : 'Create Account'}
                            </button>
                        </form>
                    )}
                </div>

                <div className="auth-footer">
                    Already have an account?{' '}
                    <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}

export default SignupPage;
