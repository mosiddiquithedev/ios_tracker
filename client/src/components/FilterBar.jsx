const FILTERS = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'week', label: 'This Week' },
    { key: 'year', label: 'This Year' },
];

export default function FilterBar({ activeFilter, onFilterChange, selectedCategory, onClearCategory }) {
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

            {selectedCategory && (
                <div className="active-category-pill">
                    <span>Category: {selectedCategory}</span>
                    <button className="clear-category-btn" onClick={onClearCategory} title="Clear filter">&times;</button>
                </div>
            )}
        </div>
    );
}
