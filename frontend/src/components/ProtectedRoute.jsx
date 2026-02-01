import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, requireProfile = false }) {
    const { isAuthenticated, loading, needsProfileSetup } = useAuth();

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // If profile is required but not completed, redirect to profile setup
    if (requireProfile && needsProfileSetup) {
        return <Navigate to="/profile-setup" replace />;
    }

    return children;
}

export default ProtectedRoute;
