import { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import HomePage from './pages/HomePage';
import NewAppsPage from './pages/NewAppsPage';

export default function App() {
    const [hideReviewed, setHideReviewed] = useState(false);

    return (
        <div className="app-container">
            {/* Header */}
            <header className="app-header">
                <div className="header-content">
                    <div className="header-brand">
                        <div className="header-logo">📡</div>
                        <div>
                            <h1 className="header-title">App Radar</h1>
                            <p className="header-subtitle">iOS App Discovery Dashboard</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="header-nav">
                        <NavLink
                            to="/"
                            end
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        >
                            📱 Browse
                        </NavLink>
                        <NavLink
                            to="/new"
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        >
                            🆕 New Today
                        </NavLink>
                    </nav>
                </div>
            </header>

            <Routes>
                <Route path="/" element={<HomePage hideReviewed={hideReviewed} setHideReviewed={setHideReviewed} />} />
                <Route path="/new" element={<NewAppsPage hideReviewed={hideReviewed} setHideReviewed={setHideReviewed} />} />
            </Routes>
        </div>
    );
}
