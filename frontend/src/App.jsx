import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import FeedPage from './pages/FeedPage';
import CreatePostPage from './pages/CreatePostPage';
import PostDetailPage from './pages/PostDetailPage';
import ProfilePage from './pages/ProfilePage';
import ConnectionsPage from './pages/ConnectionsPage';
import ChatListPage from './pages/ChatListPage';
import ChatPage from './pages/ChatPage';
import WorkshopsPage from './pages/WorkshopsPage';
import WorkshopDetailPage from './pages/WorkshopDetailPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import BottomNav from './components/BottomNav';
import Navbar from './components/Navbar';
import Chatbot from './components/Chatbot';

function App() {
    const { loading, isAuthenticated, needsProfileSetup } = useAuth();

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
                <p className="text-muted">Loading...</p>
            </div>
        );
    }

    return (
        <div className="app-container">
            {isAuthenticated && !needsProfileSetup && <Navbar />}

            <Routes>
                {/* Public Routes */}
                <Route
                    path="/login"
                    element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
                />
                <Route
                    path="/signup"
                    element={isAuthenticated ? <Navigate to="/" replace /> : <SignupPage />}
                />
                <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

                {/* Profile Setup - Required after first login */}
                <Route
                    path="/profile-setup"
                    element={
                        <ProtectedRoute>
                            <ProfileSetupPage />
                        </ProtectedRoute>
                    }
                />

                {/* Protected Routes */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute requireProfile>
                            <FeedPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/create-post"
                    element={
                        <ProtectedRoute requireProfile>
                            <CreatePostPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/post/:id"
                    element={
                        <ProtectedRoute requireProfile>
                            <PostDetailPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/profile/:id"
                    element={
                        <ProtectedRoute requireProfile>
                            <ProfilePage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/connections"
                    element={
                        <ProtectedRoute requireProfile>
                            <ConnectionsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/messages"
                    element={
                        <ProtectedRoute requireProfile>
                            <ChatListPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/chat/:userId"
                    element={
                        <ProtectedRoute requireProfile>
                            <ChatPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/workshops"
                    element={
                        <ProtectedRoute requireProfile>
                            <WorkshopsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/workshop/:id"
                    element={
                        <ProtectedRoute requireProfile>
                            <WorkshopDetailPage />
                        </ProtectedRoute>
                    }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {isAuthenticated && !needsProfileSetup && <BottomNav />}
            {isAuthenticated && !needsProfileSetup && <Chatbot />}
        </div>
    );
}

export default App;
