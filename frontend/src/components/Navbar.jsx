import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="navbar-content">
                <Link to="/" className="navbar-brand">
                    CampusConnect
                </Link>
                <div className="navbar-actions">
                    {user && (
                        <>
                            <Link to={`/profile/${user.id}`} className="btn btn-ghost btn-sm">
                                <span className="avatar avatar-sm">
                                    {user.profilePhoto ? (
                                        <img src={user.profilePhoto} alt={user.name} className="avatar avatar-sm" />
                                    ) : (
                                        user.name?.charAt(0).toUpperCase()
                                    )}
                                </span>
                            </Link>
                            <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                                Logout
                            </button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
