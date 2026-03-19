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

export default function FilterBar({
    activeFilter, onFilterChange,
    selectedCategory, onClearCategory,
    platform, onPlatformChange,
    dateFilterType, onDateFilterTypeChange,
    startDate, onStartDateChange,
    endDate, onEndDateChange,
    onClearDateFilter,
}) {
    const hasCustomDates = startDate || endDate;

    return (
        <div className="filter-bar">
            <div className="filter-group">
                {FILTERS.map((f) => (
                    <button
                        key={f.key}
                        className={`filter-btn ${!hasCustomDates && activeFilter === f.key ? 'active' : ''}`}
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

            <div className="date-filter-row">
                <select
                    className="date-filter-type-select"
                    value={dateFilterType}
                    onChange={(e) => onDateFilterTypeChange(e.target.value)}
                >
                    <option value="release_date">Published Date</option>
                    <option value="first_seen">Crawled Date</option>
                </select>
                <input
                    type="date"
                    className={`date-input${startDate ? ' has-value' : ''}`}
                    value={startDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                    placeholder="Start date"
                    title="Start date"
                />
                <span className="date-filter-sep">to</span>
                <input
                    type="date"
                    className={`date-input${endDate ? ' has-value' : ''}`}
                    value={endDate}
                    onChange={(e) => onEndDateChange(e.target.value)}
                    placeholder="End date"
                    title="End date"
                />
                {hasCustomDates && (
                    <button className="clear-date-btn" onClick={onClearDateFilter} title="Clear date filter">
                        &times;
                    </button>
                )}
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
