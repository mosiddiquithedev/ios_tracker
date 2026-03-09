export default function Pagination({ currentPage, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;

    // Build page numbers with ellipsis
    function getPageNumbers() {
        const pages = [];
        const maxVisible = 7;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
            return pages;
        }

        // Always show first and last page
        pages.push(1);

        if (currentPage > 3) pages.push('...');

        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        for (let i = start; i <= end; i++) pages.push(i);

        if (currentPage < totalPages - 2) pages.push('...');

        pages.push(totalPages);

        return pages;
    }

    const pageNumbers = getPageNumbers();

    return (
        <div className="pagination">
            <button
                className="page-btn page-nav-btn"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
            >
                ← Prev
            </button>

            {pageNumbers.map((p, idx) =>
                p === '...' ? (
                    <span key={`ellipsis-${idx}`} className="page-ellipsis">…</span>
                ) : (
                    <button
                        key={p}
                        className={`page-btn ${currentPage === p ? 'active' : ''}`}
                        onClick={() => onPageChange(p)}
                    >
                        {p}
                    </button>
                )
            )}

            <button
                className="page-btn page-nav-btn"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
            >
                Next →
            </button>
        </div>
    );
}
