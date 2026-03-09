const FILTERS = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'week', label: 'This Week' },
    { key: 'year', label: 'This Year' },
];

export default function FilterBar({ activeFilter, onFilterChange, searchQuery, onSearchChange }) {
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

            <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search apps by name..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
        </div>
    );
}
