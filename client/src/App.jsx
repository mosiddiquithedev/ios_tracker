import { useState } from 'react';
import { Routes, Route, NavLink, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import NewAppsPage from './pages/NewAppsPage';
import FavoritesPage from './pages/FavoritesPage';
import { useFavorites } from './hooks/useFavorites';

export default function App() {
    const [hideReviewed, setHideReviewed] = useState(false);
    const { favorites, toggleFavorite, isFavorite } = useFavorites();

    return (
        <div className="app-container">
            {/* Header */}
            <header className="app-header">
                <div className="header-content">
                    <Link to="/" className="header-brand">
                        <div className="header-logo">📡</div>
                        <div>
                            <h1 className="header-title">App Radar</h1>
                            <p className="header-subtitle">iOS App Discovery Dashboard</p>
                        </div>
                    </Link>

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
                        <NavLink
                            to="/favorites"
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        >
                            ⭐ Favorites
                            {favorites.size > 0 && (
                                <span className="nav-badge">{favorites.size}</span>
                            )}
                        </NavLink>
                    </nav>
                </div>
            </header>

            <Routes>
                <Route path="/" element={
                    <HomePage
                        hideReviewed={hideReviewed}
                        setHideReviewed={setHideReviewed}
                        isFavorite={isFavorite}
                        toggleFavorite={toggleFavorite}
                    />}
                />
                <Route path="/new" element={
                    <NewAppsPage
                        hideReviewed={hideReviewed}
                        setHideReviewed={setHideReviewed}
                        isFavorite={isFavorite}
                        toggleFavorite={toggleFavorite}
                    />}
                />
                <Route path="/favorites" element={
                    <FavoritesPage
                        favorites={favorites}
                        toggleFavorite={toggleFavorite}
                        isFavorite={isFavorite}
                    />}
                />
            </Routes>
        </div>
    );
}
