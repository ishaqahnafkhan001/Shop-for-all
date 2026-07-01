const TableSkeleton = ({ rows = 6, columns = 4, title = 'Loading data' }) => (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label={title}>
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
            <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="grid gap-4 px-5 py-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                    {Array.from({ length: columns }).map((__, colIndex) => (
                        <div
                            key={colIndex}
                            className={`h-4 animate-pulse rounded bg-slate-100 ${colIndex === 0 ? 'w-4/5' : 'w-3/5'}`}
                        />
                    ))}
                </div>
            ))}
        </div>
    </div>
);

export default TableSkeleton;
