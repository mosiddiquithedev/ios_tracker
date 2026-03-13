import { useState, useEffect } from 'react';
import { supabase, isConfigured } from '../supabaseClient';
import AppCard from '../components/AppCard';

export default function FavoritesPage({ favorites, toggleFavorite, isFavorite }) {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isConfigured || !supabase || favorites.size === 0) {
            setApps([]);
            return;
        }
        setLoading(true);
        supabase
            .from('apps')
            .select('*')
            .in('track_id', [...favorites])
            .then(({ data }) => {
                setApps(data || []);
                setLoading(false);
            });
    }, [favorites]);

    return (
        <div className="layout">
            <main className="main-content favorites-main">
                <div className="favorites-header">
                    <h2 className="favorites-title">Favorites</h2>
                    <span className="favorites-count">{favorites.size} app{favorites.size !== 1 ? 's' : ''}</span>
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="spinner" />
                        <p className="loading-text">Loading favorites...</p>
                    </div>
                ) : apps.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">⭐</div>
                        <h2 className="empty-title">No favorites yet</h2>
                        <p className="empty-description">
                            Tap the bookmark button on any app card to save it here.
                        </p>
                    </div>
                ) : (
                    <div className="app-grid">
                        {apps.map(app => (
                            <AppCard
                                key={app.track_id}
                                app={app}
                                isFavorited={isFavorite(app.track_id)}
                                onToggleFavorite={toggleFavorite}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
