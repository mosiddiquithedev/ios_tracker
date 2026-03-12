const FILTERS = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'week', label: 'This Week' },
    { key: 'year', label: 'This Year' },
];

const PLATFORMS = [
    { key: 'all', label: 'All' },
    { key: 'ios', label: '📱 iOS' },
    { key: 'macos', label: '🖥️ macOS' },
];

export default function FilterBar({ activeFilter, onFilterChange, selectedCategory, onClearCategory, platform, onPlatformChange }) {
    return (
        <div className="filter-bar">
            <div className="filter-group">
                {FILTERS.map((f) => (
                    <button
                        key={f.key}
                        className={`filter-btn ${activeFilter === f.key ? 'active' : ''}`}
                        onClick={() => onFilterChange(f.key)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="filter-group">
                {PLATFORMS.map((p) => (
                    <button
                        key={p.key}
                        className={`filter-btn ${platform === p.key ? 'active' : ''}`}
                        onClick={() => onPlatformChange(p.key)}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {selectedCategory && (
                <div className="active-category-pill">
                    <span>Category: {selectedCategory}</span>
                    <button className="clear-category-btn" onClick={onClearCategory} title="Clear filter">&times;</button>
                </div>
            )}
        </div>
    );
}
