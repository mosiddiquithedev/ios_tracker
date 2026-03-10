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

export default function HomePage() {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(isConfigured);
    const [filter, setFilter] = useState('week');
    const [selectedCategory, setSelectedCategory] = useState(null);
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
            const { count: total } = await supabase
                .from('apps')
                .select('*', { count: 'exact', head: true });

            const todayRange = getDateRange('today');
            const { count: today } = await supabase
                .from('apps')
                .select('*', { count: 'exact', head: true })
                .gte('release_date', todayRange.from)
                .lt('release_date', todayRange.to);

            const weekRange = getDateRange('week');
            const { count: week } = await supabase
                .from('apps')
                .select('*', { count: 'exact', head: true })
                .gte('release_date', weekRange.from)
                .lt('release_date', weekRange.to);

            const { data: catData } = await supabase
                .from('apps')
                .select('category')
                .not('category', 'is', null);

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
    }, []);

    const fetchApps = useCallback(async () => {
        if (!isConfigured || !supabase) return;
        setLoading(true);
        try {
            const range = getDateRange(filter);
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            let query = supabase
                .from('apps')
                .select('*', { count: 'exact' })
                .gte('release_date', range.from)
                .lt('release_date', range.to)
                .order('release_date', { ascending: false })
                .range(from, to);

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
    }, [filter, page, selectedCategory]);

    useEffect(() => { fetchStats(); }, [fetchStats]);
    useEffect(() => { fetchApps(); }, [filter, page, selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleFilterChange = (newFilter) => {
        setFilter(newFilter);
        setPage(1);
    };

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
                />

                {!loading && (
                    <div className="results-info">
                        <span className="results-count">
                            Showing <strong>{apps.length}</strong> of <strong>{totalCount.toLocaleString()}</strong> apps
                        </span>
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
