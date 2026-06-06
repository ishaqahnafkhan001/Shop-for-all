const Table = ({ columns, data, actions, emptyTitle = 'No records yet', emptyDescription = 'Items will appear here when they are available.' }) => {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="sticky top-0 z-10 bg-slate-50">
                <tr>
                    {columns.map((col) => (
                        <th
                            key={col.key}
                            scope="col"
                            className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
                        >
                            {col.label}
                        </th>
                    ))}
                    {actions && (
                        <th scope="col" className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                            Actions
                        </th>
                    )}
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                {data.length === 0 ? (
                    <tr>
                        <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-14 text-center">
                            <div className="mx-auto max-w-sm">
                                <p className="font-semibold text-slate-900">{emptyTitle}</p>
                                <p className="mt-1 text-sm text-slate-500">{emptyDescription}</p>
                            </div>
                        </td>
                    </tr>
                ) : (
                    data.map((row, rowIndex) => (
                        <tr key={row._id || rowIndex} className="transition-colors hover:bg-slate-50/80">
                            {columns.map((col) => (
                                <td key={col.key} className="whitespace-nowrap px-5 py-4 text-sm text-slate-800">
                                    {col.render ? col.render(row) : row[col.key]}
                                </td>
                            ))}
                            {actions && (
                                <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-medium">
                                    {actions(row)}
                                </td>
                            )}
                        </tr>
                    ))
                )}
                </tbody>
            </table>
            </div>
        </div>
    );
};

export default Table;
