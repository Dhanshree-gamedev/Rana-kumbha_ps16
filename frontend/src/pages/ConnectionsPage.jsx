import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function ConnectionsPage() {
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('connections');
    const [connections, setConnections] = useState([]);
    const [requests, setRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [connectionsRes, requestsRes, sentRes] = await Promise.all([
                api.get('/connections'),
                api.get('/connections/requests'),
                api.get('/connections/sent')
            ]);
            setConnections(connectionsRes.data);
            setRequests(requestsRes.data);
            setSentRequests(sentRes.data);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (connectionId) => {
        setActionLoading(connectionId);
        try {
            await api.put(`/connections/${connectionId}/accept`);
            // Move from requests to connections
            const accepted = requests.find(r => r.id === connectionId);
            if (accepted) {
                setRequests(prev => prev.filter(r => r.id !== connectionId));
                setConnections(prev => [{ ...accepted, status: 'accepted' }, ...prev]);
            }
        } catch (err) {
            console.error('Accept error:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (connectionId) => {
        setActionLoading(connectionId);
        try {
            await api.delete(`/connections/${connectionId}`);
            setRequests(prev => prev.filter(r => r.id !== connectionId));
        } catch (err) {
            console.error('Reject error:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancel = async (connectionId) => {
        setActionLoading(connectionId);
        try {
            await api.delete(`/connections/${connectionId}`);
            setSentRequests(prev => prev.filter(r => r.id !== connectionId));
        } catch (err) {
            console.error('Cancel error:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemove = async (connectionId) => {
        if (!window.confirm('Remove this connection?')) return;

        setActionLoading(connectionId);
        try {
            await api.delete(`/connections/${connectionId}`);
            setConnections(prev => prev.filter(c => c.id !== connectionId));
        } catch (err) {
            console.error('Remove error:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const renderConnectionCard = (item, type) => (
        <div key={item.id} className="connection-card fade-in">
            <div
                className="avatar"
                onClick={() => navigate(`/profile/${item.user.id}`)}
                style={{ cursor: 'pointer' }}
            >
                {item.user.profilePhoto ? (
                    <img src={item.user.profilePhoto} alt={item.user.name} className="avatar" />
                ) : (
                    item.user.name?.charAt(0).toUpperCase()
                )}
            </div>
            <div
                className="connection-info"
                onClick={() => navigate(`/profile/${item.user.id}`)}
                style={{ cursor: 'pointer' }}
            >
                <div className="connection-name">{item.user.name}</div>
                <div className="connection-meta">
                    {item.user.branch} • {item.user.year}
                </div>
            </div>
            <div className="connection-actions">
                {actionLoading === item.id ? (
                    <span className="spinner spinner-sm"></span>
                ) : type === 'connection' ? (
                    <>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => navigate(`/chat/${item.user.id}`)}
                        >
                            💬
                        </button>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleRemove(item.id)}
                            title="Remove connection"
                        >
                            ✕
                        </button>
                    </>
                ) : type === 'request' ? (
                    <>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleAccept(item.id)}
                        >
                            Accept
                        </button>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleReject(item.id)}
                        >
                            ✕
                        </button>
                    </>
                ) : (
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleCancel(item.id)}
                    >
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Connections</h1>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'connections' ? 'active' : ''}`}
                    onClick={() => setActiveTab('connections')}
                >
                    Connected ({connections.length})
                </button>
                <button
                    className={`tab ${activeTab === 'requests' ? 'active' : ''}`}
                    onClick={() => setActiveTab('requests')}
                >
                    Requests ({requests.length})
                </button>
                <button
                    className={`tab ${activeTab === 'sent' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sent')}
                >
                    Sent ({sentRequests.length})
                </button>
            </div>

            {loading ? (
                <div className="flex-center" style={{ padding: '40px' }}>
                    <div className="spinner"></div>
                </div>
            ) : (
                <>
                    {/* Connections Tab */}
                    {activeTab === 'connections' && (
                        connections.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">👥</div>
                                <h3>No connections yet</h3>
                                <p>Start connecting with your classmates!</p>
                            </div>
                        ) : (
                            connections.map(c => renderConnectionCard(c, 'connection'))
                        )
                    )}

                    {/* Requests Tab */}
                    {activeTab === 'requests' && (
                        requests.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📭</div>
                                <h3>No pending requests</h3>
                                <p>When someone wants to connect with you, you'll see it here.</p>
                            </div>
                        ) : (
                            requests.map(r => renderConnectionCard(r, 'request'))
                        )
                    )}

                    {/* Sent Requests Tab */}
                    {activeTab === 'sent' && (
                        sentRequests.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📤</div>
                                <h3>No sent requests</h3>
                                <p>Visit profiles to send connection requests.</p>
                            </div>
                        ) : (
                            sentRequests.map(r => renderConnectionCard(r, 'sent'))
                        )
                    )}
                </>
            )}
        </div>
    );
}

export default ConnectionsPage;
