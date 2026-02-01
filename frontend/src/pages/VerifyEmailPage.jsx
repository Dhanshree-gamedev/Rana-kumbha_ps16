import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function VerifyEmailPage() {
    const { token } = useParams();
    const { verifyEmail } = useAuth();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setStatus('error');
                setMessage('Invalid verification link');
                return;
            }

            try {
                await verifyEmail(token);
                setStatus('success');
                setMessage('Your email has been verified successfully!');
            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.error || 'Verification failed. The link may be expired or invalid.');
            }
        };

        verify();
    }, [token, verifyEmail]);

    return (
        <div className="auth-page">
            <div className="auth-container fade-in">
                <div className="auth-logo">
                    <h1>CampusConnect</h1>
                </div>

                <div className="auth-card" style={{ textAlign: 'center' }}>
                    {status === 'verifying' && (
                        <>
                            <div className="spinner" style={{ margin: '0 auto 24px' }}></div>
                            <h2>Verifying your email...</h2>
                            <p className="text-muted" style={{ marginTop: '12px' }}>
                                Please wait while we verify your email address.
                            </p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                margin: '0 auto 24px',
                                background: 'var(--success-100)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2.5rem'
                            }}>
                                ✅
                            </div>
                            <h2 style={{ color: 'var(--success-500)' }}>Email Verified!</h2>
                            <p className="text-muted" style={{ marginTop: '12px', marginBottom: '24px' }}>
                                {message}
                            </p>
                            <Link to="/login" className="btn btn-primary btn-lg">
                                Continue to Login
                            </Link>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                margin: '0 auto 24px',
                                background: 'var(--error-100)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2.5rem'
                            }}>
                                ❌
                            </div>
                            <h2 style={{ color: 'var(--error-500)' }}>Verification Failed</h2>
                            <p className="text-muted" style={{ marginTop: '12px', marginBottom: '24px' }}>
                                {message}
                            </p>
                            <Link to="/signup" className="btn btn-secondary">
                                Back to Sign Up
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default VerifyEmailPage;
