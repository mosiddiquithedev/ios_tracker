export default function StatsBar({ stats, loading }) {
    const statItems = [
        { label: 'Total Apps', value: stats.total, icon: '📱' },
        { label: 'Today', value: stats.today, icon: '🆕' },
        { label: 'This Week', value: stats.week, icon: '📅' },
        { label: 'Categories', value: stats.categories, icon: '🏷️' },
    ];

    return (
        <div className="stats-bar">
            {statItems.map((item) => (
                <div className="stat-card" key={item.label}>
                    <div className="stat-label">{item.icon} {item.label}</div>
                    <div className="stat-value">
                        {loading ? '—' : (item.value ?? 0).toLocaleString()}
                    </div>
                </div>
            ))}
        </div>
    );
}
