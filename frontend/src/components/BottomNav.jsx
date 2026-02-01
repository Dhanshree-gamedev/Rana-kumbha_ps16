import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../api/axios';

function BottomNav() {
    const [unreadCount, setUnreadCount] = useState(0);
    const [requestCount, setRequestCount] = useState(0);

    useEffect(() => {
        const fetchCounts = async () => {
            try {
                // Fetch unread message count
                const msgResponse = await api.get('/messages/unread/count');
                setUnreadCount(msgResponse.data.unreadCount || 0);

                // Fetch pending connection requests
                const reqResponse = await api.get('/connections/requests');
                setRequestCount(reqResponse.data.length || 0);
            } catch (error) {
                console.error('Failed to fetch counts:', error);
            }
        };

        fetchCounts();
        // Poll every 30 seconds
        const interval = setInterval(fetchCounts, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <nav className="bottom-nav">
            <div className="bottom-nav-content">
                <NavLink
                    to="/"
                    className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
                    end
                >
                    <span className="bottom-nav-icon">🏠</span>
                    <span className="bottom-nav-label">Home</span>
                </NavLink>

                <NavLink
                    to="/create-post"
                    className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
                >
                    <span className="bottom-nav-icon">➕</span>
                    <span className="bottom-nav-label">Post</span>
                </NavLink>

                <NavLink
                    to="/connections"
                    className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
                    style={{ position: 'relative' }}
                >
                    <span className="bottom-nav-icon">👥</span>
                    <span className="bottom-nav-label">Connect</span>
                    {requestCount > 0 && (
                        <span className="bottom-nav-badge">{requestCount > 9 ? '9+' : requestCount}</span>
                    )}
                </NavLink>

                <NavLink
                    to="/messages"
                    className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
                    style={{ position: 'relative' }}
                >
                    <span className="bottom-nav-icon">💬</span>
                    <span className="bottom-nav-label">Chat</span>
                    {unreadCount > 0 && (
                        <span className="bottom-nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                    )}
                </NavLink>
            </div>
        </nav>
    );
}

export default BottomNav;
