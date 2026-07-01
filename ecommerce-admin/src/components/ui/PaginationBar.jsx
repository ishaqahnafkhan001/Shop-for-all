const PaginationBar = ({
    pagination = {},
    label = 'items',
    onPrevious,
    onNext,
    className = ''
}) => {
    const page = Number(pagination.page || 1);
    const total = Number(pagination.total || 0);
    const totalPages = Number(pagination.totalPages || pagination.pages || 1);
    const hasPrevPage = pagination.hasPrevPage ?? page > 1;
    const hasNextPage = pagination.hasNextPage ?? page < totalPages;

    if (totalPages <= 1) return null;

    return (
        <div className={`flex flex-col items-stretch gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between ${className}`}>
            <span className="text-center sm:text-left">
                Page {page} of {totalPages} · {total} {label}
            </span>
            <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                    type="button"
                    onClick={onPrevious}
                    disabled={!hasPrevPage}
                    className="min-h-11 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Previous
                </button>
                <button
                    type="button"
                    onClick={onNext}
                    disabled={!hasNextPage}
                    className="min-h-11 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default PaginationBar;
