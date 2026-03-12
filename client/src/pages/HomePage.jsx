import { useState, useEffect, useCallback } from 'react';
import { supabase, isConfigured } from '../supabaseClient';
import StatsBar from '../components/StatsBar';
import FilterBar from '../components/FilterBar';
import AppCard from '../components/AppCard';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 50;

function getDateRange(filter) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filter) {
        case 'today':
            return { from: today.toISOString(), to: new Date(today.getTime() + 86400000).toISOString() };
        case 'yesterday': {
            const yesterday = new Date(today.getTime() - 86400000);
            return { from: yesterday.toISOString(), to: today.toISOString() };
        }
        case 'week': {
            const weekAgo = new Date(today.getTime() - 7 * 86400000);
            return { from: weekAgo.toISOString(), to: new Date(today.getTime() + 86400000).toISOString() };
        }
        case 'year':
        default: {
            const yearStart = new Date(now.getFullYear(), 0, 1);
            return { from: yearStart.toISOString(), to: new Date(today.getTime() + 86400000).toISOString() };
        }
    }
}

function applyPlatformFilter(query, platform) {
    if (platform === 'ios') return query.eq('macos_app', false);
    if (platform === 'macos') return query.eq('macos_app', true);
    return query;
}

export default function HomePage({ hideReviewed, setHideReviewed }) {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(isConfigured);
    const [filter, setFilter] = useState('week');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [sortOrder, setSortOrder] = useState('date_desc');
    const [platform, setPlatform] = useState('all');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({ total: 0, today: 0, week: 0 });
    const [allCategories, setAllCategories] = useState([]);
    const [statsLoading, setStatsLoading] = useState(isConfigured);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    const fetchStats = useCallback(async () => {
        if (!isConfigured || !supabase) return;
        setStatsLoading(true);
        try {
            const { count: total } = await applyPlatformFilter(
                supabase.from('apps').select('*', { count: 'exact', head: true }),
                platform
            );

            const todayRange = getDateRange('today');
            const { count: today } = await applyPlatformFilter(
                supabase.from('apps').select('*', { count: 'exact', head: true })
                    .gte('release_date', todayRange.from)
                    .lt('release_date', todayRange.to),
                platform
            );

            const weekRange = getDateRange('week');
            const { count: week } = await applyPlatformFilter(
                supabase.from('apps').select('*', { count: 'exact', head: true })
                    .gte('release_date', weekRange.from)
                    .lt('release_date', weekRange.to),
                platform
            );

            const { data: catData } = await applyPlatformFilter(
                supabase.from('apps').select('category').not('category', 'is', null),
                platform
            );

            const uniqueCategories = [...new Set(catData?.map(r => r.category) || [])].sort();
            setAllCategories(uniqueCategories);

            setStats({
                total: total || 0,
                today: today || 0,
                week: week || 0,
            });
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
        setStatsLoading(false);
    }, [platform]);

    const fetchApps = useCallback(async () => {
        if (!isConfigured || !supabase) return;
        setLoading(true);
        try {
            const range = getDateRange(filter);
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            let query = applyPlatformFilter(
                supabase.from('apps').select('*', { count: 'exact' })
                    .gte('release_date', range.from)
                    .lt('release_date', range.to),
                platform
            );

            if (hideReviewed) {
                // If showing ONLY reviewed apps, we want apps where rating > 0 and count > 0
                query = query.gt('average_user_rating', 0).gt('user_rating_count', 0);
            }

            if (sortOrder === 'date_desc') {
                query = query.order('release_date', { ascending: false });
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
    }, [filter, page, selectedCategory, hideReviewed, sortOrder, platform]);

    useEffect(() => { fetchStats(); }, [fetchStats]);
    useEffect(() => { fetchApps(); }, [filter, page, selectedCategory, hideReviewed, sortOrder, platform]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleFilterChange = (newFilter) => {
        setFilter(newFilter);
        setPage(1);
    };

    const handlePlatformChange = (newPlatform) => {
        setPlatform(newPlatform);
        setPage(1);
    };

    return (
        <div className="layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <h2 className="sidebar-title" style={{ marginTop: '16px' }}>Categories</h2>
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
                        <strong>⚠️ Supabase not configured.</strong> Create a <code>client/.env</code> file with your <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart the dev server. See the README for setup instructions.
                    </div>
                )}

                <StatsBar stats={stats} loading={statsLoading} />

                <FilterBar
                    activeFilter={filter}
                    onFilterChange={handleFilterChange}
                    selectedCategory={selectedCategory}
                    onClearCategory={() => { setSelectedCategory(null); setPage(1); }}
                    platform={platform}
                    onPlatformChange={handlePlatformChange}
                />

                {!loading && (
                    <div className="results-info">
                        <span className="results-count">
                            Showing <strong>{apps.length}</strong> of <strong>{totalCount.toLocaleString()}</strong> apps
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
                                <option value="date_desc">Newest First</option>
                                <option value="reviews_desc">Most Reviews</option>
                            </select>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="loading-container">
                        <div className="spinner" />
                        <p className="loading-text">Loading apps...</p>
                    </div>
                ) : apps.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📱</div>
                        <h2 className="empty-title">No apps found</h2>
                        <p className="empty-description">
                            {!isConfigured
                                ? 'Connect your Supabase project and run the crawler to start discovering apps.'
                                : selectedCategory
                                    ? `No apps found in "${selectedCategory}" for this time period.`
                                    : 'No apps discovered for this time period. Try running the crawler or selecting a different filter.'}
                        </p>
                    </div>
                ) : (
                    <div className="app-grid">
                        {apps.map((app) => (
                            <AppCard
                                key={app.track_id}
                                app={app}
                                onCategoryClick={(cat) => { setSelectedCategory(cat); setPage(1); }}
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
