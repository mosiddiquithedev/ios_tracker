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

export default function AppCard({ app }) {
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
                    {app.category && (
                        <span className="app-category-badge">{app.category}</span>
                    )}
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
