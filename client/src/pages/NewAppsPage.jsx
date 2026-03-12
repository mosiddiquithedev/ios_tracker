import { useState, useEffect, useCallback } from 'react';
import { supabase, isConfigured } from '../supabaseClient';
import AppCard from '../components/AppCard';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 50;

function getTodayRange() {
    const now = new Date();
    // Start of today in local time, converted to ISO
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // End = start of tomorrow (same day)
    const startOfTomorrow = new Date(startOfToday.getTime() + 86400000);
    return { from: startOfToday.toISOString(), to: startOfTomorrow.toISOString() };
}

function getLast24hRange() {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 86400000);
    return { from: twentyFourHoursAgo.toISOString(), to: now.toISOString() };
}

function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
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

const PLATFORMS = [
    { key: 'all', label: 'All' },
    { key: 'ios', label: '📱 iOS' },
    { key: 'macos', label: '🖥️ macOS' },
];

function applyPlatformFilter(query, platform) {
    if (platform === 'ios') return query.eq('macos_app', false);
    if (platform === 'macos') return query.eq('macos_app', true);
    return query;
}

export default function NewAppsPage({ hideReviewed, setHideReviewed }) {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(isConfigured);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [platform, setPlatform] = useState('all');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [allCategories, setAllCategories] = useState([]);
    const [sortOrder, setSortOrder] = useState('date_desc');

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    const range = getTodayRange();

    const fetchCategories = useCallback(async () => {
        if (!isConfigured || !supabase) return;
        try {
            const { data } = await applyPlatformFilter(
                supabase.from('apps').select('category')
                    .gte('first_seen', range.from)
                    .lt('first_seen', range.to)
                    .not('category', 'is', null),
                platform
            );

            const unique = [...new Set(data?.map(r => r.category) || [])].sort();
            setAllCategories(unique);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    }, [platform]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchApps = useCallback(async () => {
        if (!isConfigured || !supabase) return;
        setLoading(true);
        try {
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            let query = applyPlatformFilter(
                supabase.from('apps').select('*', { count: 'exact' })
                    .gte('first_seen', range.from)
                    .lt('first_seen', range.to),
                platform
            );

            if (hideReviewed) {
                // If showing ONLY reviewed apps, we want apps where rating > 0 and count > 0
                query = query.gt('average_user_rating', 0).gt('user_rating_count', 0);
            }

            if (sortOrder === 'date_desc') {
                query = query.order('first_seen', { ascending: false });
            } else if (sortOrder === 'date_asc') {
                query = query.order('first_seen', { ascending: true });
            } else if (sortOrder === 'reviews_desc') {
                query = query.order('user_rating_count', { ascending: false, nullsFirst: false });
            }

            query = query.range(from, to);

            if (selectedCategory) {
                query = query.eq('category', selectedCategory);
            }

            const { data, count, error } = await query;

            if (error) {
                console.error('Query error:', error);
                setApps([]);
                setTotalCount(0);
            } else {
                setApps(data || []);
                setTotalCount(count || 0);
            }
        } catch (err) {
            console.error('Failed to fetch apps:', err);
            setApps([]);
            setTotalCount(0);
        }
        setLoading(false);
    }, [page, selectedCategory, sortOrder, hideReviewed, platform]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchCategories(); }, [fetchCategories]);
    useEffect(() => { fetchApps(); }, [page, selectedCategory, sortOrder, hideReviewed, platform]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <h2 className="sidebar-title">Categories</h2>
                <ul className="category-list">
                    <li
                        className={`category-item ${selectedCategory === null ? 'active' : ''}`}
                        onClick={() => { setSelectedCategory(null); setPage(1); }}
                    >
                        All Categories
                    </li>
                    {allCategories.map(cat => (
                        <li
                            key={cat}
                            className={`category-item ${selectedCategory === cat ? 'active' : ''}`}
                            onClick={() => { setSelectedCategory(cat); setPage(1); }}
                        >
                            {cat}
                        </li>
                    ))}
                </ul>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {/* Page Header */}
                <div className="new-page-header">
                    <div className="new-page-title-row">
                        <span className="new-page-badge">🆕 New Today</span>
                        <h2 className="new-page-title">Apps Discovered Today</h2>
                    </div>
                    <p className="new-page-subtitle">
                        Apps crawled into the database since <strong>midnight today</strong>, regardless of their original release date.
                    </p>
                </div>

                {!isConfigured && (
                    <div style={{
                        background: '#fef9e7',
                        border: '1px solid #f0d96a',
                        borderRadius: '12px',
                        padding: '16px 24px',
                        marginBottom: '28px',
                        color: '#7c6a1a',
                        fontSize: '14px',
                        lineHeight: '1.6',
                    }}>
                        <strong>⚠️ Supabase not configured.</strong> Create a <code>client/.env</code> file with your <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart the dev server.
                    </div>
                )}

                {/* Platform toggle */}
                <div className="filter-bar" style={{ marginBottom: '16px' }}>
                    <div className="filter-group">
                        {PLATFORMS.map((p) => (
                            <button
                                key={p.key}
                                className={`filter-btn ${platform === p.key ? 'active' : ''}`}
                                onClick={() => { setPlatform(p.key); setPage(1); }}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Category pill */}
                {selectedCategory && (
                    <div className="active-category-pill" style={{ marginBottom: '16px' }}>
                        <span>Category: {selectedCategory}</span>
                        <button
                            className="clear-category-btn"
                            onClick={() => { setSelectedCategory(null); setPage(1); }}
                            title="Clear filter"
                        >
                            &times;
                        </button>
                    </div>
                )}

                {!loading && (
                    <div className="results-info">
                        <span className="results-count">
                            Showing <strong>{apps.length}</strong> of <strong>{totalCount.toLocaleString()}</strong> newly crawled apps
                        </span>

                        <div className="sort-controls">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary)', cursor: 'pointer', marginRight: '16px' }}>
                                <input
                                    type="checkbox"
                                    checked={hideReviewed}
                                    onChange={(e) => setHideReviewed(e.target.checked)}
                                    style={{ accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                                />
                                Show apps with reviews only
                            </label>

                            <label htmlFor="sortOrder">Sort by: </label>
                            <select
                                id="sortOrder"
                                value={sortOrder}
                                onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}
                                className="sort-select"
                            >
                                <option value="date_desc">Newest First (Crawled)</option>
                                <option value="date_asc">Oldest First (Crawled)</option>
                                <option value="reviews_desc">Most Reviews</option>
                            </select>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="loading-container">
                        <div className="spinner" />
                        <p className="loading-text">Loading crawled apps...</p>
                    </div>
                ) : apps.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🔍</div>
                        <h2 className="empty-title">No apps crawled yet today</h2>
                        <p className="empty-description">
                            {!isConfigured
                                ? 'Connect your Supabase project and run the crawler to start discovering apps.'
                                : selectedCategory
                                    ? `No apps found in "${selectedCategory}" crawled today.`
                                    : 'The crawler has not run yet today, or no new apps were found. Check back after the next crawl.'}
                        </p>
                    </div>
                ) : (
                    <div className="app-grid">
                        {apps.map((app) => (
                            <NewAppCard
                                key={app.track_id}
                                app={app}
                                onCategoryClick={(cat) => { setSelectedCategory(cat); setPage(1); }}
                                formatDateTime={formatDateTime}
                            />
                        ))}
                    </div>
                )}

                {!loading && totalPages > 1 && (
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                    />
                )}
            </main>
        </div>
    );
}

/* Extended AppCard that shows when the app was scraped */
function NewAppCard({ app, onCategoryClick, formatDateTime }) {
    function truncate(str, len = 150) {
        if (!str) return '';
        return str.length > len ? str.slice(0, len).trim() + '…' : str;
    }
    function formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

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
                    <span className="meta-label scraped-label">⚡ Crawled</span>
                    <span className="meta-value scraped-value">{formatDateTime(app.first_seen)}</span>
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
