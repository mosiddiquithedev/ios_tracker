function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function truncate(str, len = 150) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len).trim() + '…' : str;
}

function renderStars(rating) {
    if (!rating) return null;
    const full = Math.floor(rating);
    const half = rating - full >= 0.25 && rating - full < 0.75;
    const stars = [];
    for (let i = 0; i < 5; i++) {
        if (i < full) stars.push('★');
        else if (i === full && half) stars.push('½');
        else stars.push('☆');
    }
    return stars.join('');
}

export default function AppCard({ app, onCategoryClick }) {
    return (
        <div className="app-card">
            <div className="app-card-header">
                <img
                    className="app-icon"
                    src={app.icon || 'https://via.placeholder.com/64'}
                    alt={`${app.name} icon`}
                    loading="lazy"
                />
                <div className="app-info">
                    <h3 className="app-name" title={app.name}>{app.name}</h3>
                    <p className="app-developer" title={app.developer}>{app.developer || 'Unknown Developer'}</p>
                    <div className="app-badges">
                        {app.category && (
                            <span
                                className={`app-category-badge ${onCategoryClick ? 'clickable' : ''}`}
                                onClick={() => onCategoryClick && onCategoryClick(app.category)}
                            >
                                {app.category}
                            </span>
                        )}
                        {app.formatted_price != null && (
                            <span className={`price-badge ${app.price === 0 ? 'free' : 'paid'}`}>
                                {app.price === 0 ? 'Free' : app.formatted_price}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <p className="app-description">{truncate(app.description)}</p>

            <div className="app-meta">
                <div className="app-meta-item">
                    <span className="meta-label">Released</span>
                    <span className="meta-value">{formatDate(app.release_date)}</span>
                </div>
                <div className="app-meta-item">
                    <span className="meta-label">Updated</span>
                    <span className="meta-value">{formatDate(app.last_updated)}</span>
                </div>
                {app.average_user_rating != null && (
                    <div className="app-meta-item">
                        <span className="meta-label">Rating</span>
                        <span className="meta-value rating-value">
                            <span className="stars">{renderStars(app.average_user_rating)}</span>
                            <span className="rating-count">
                                {app.average_user_rating.toFixed(1)}
                                {app.user_rating_count != null && ` (${app.user_rating_count.toLocaleString()})`}
                            </span>
                        </span>
                    </div>
                )}
            </div>

            <div className="app-actions">
                <a
                    href={app.app_store_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-appstore"
                >
                    <span>🍎</span>
                    Open in App Store
                </a>
            </div>
        </div>
    );
}
