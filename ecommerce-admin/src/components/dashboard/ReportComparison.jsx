export default function ReportComparison({ comparison }) {
    if (!comparison) return null;
    const format = date => new Date(date).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' });
    return <section className="report-panel">
        <h2 className="font-semibold">Compared with the previous period</h2>
        <p className="mt-1 text-xs text-slate-500">{format(comparison.from)} – {format(comparison.to)} (end excluded, Asia/Dhaka). Partial days use matching elapsed time.</p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            {Object.entries({ revenue: 'Net product sales', profit: 'Product gross profit', orders: 'Delivered orders' }).map(([key, label]) => {
                const change = comparison.changes[key];
                return <div key={key} className="rounded-xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">{label}</dt><dd className={`mt-2 text-lg font-semibold tracking-tight ${change.delta > 0 ? 'text-emerald-700' : change.delta < 0 ? 'text-rose-700' : 'text-slate-700'}`}>{change.delta == null ? 'Unavailable' : `${change.delta > 0 ? '+' : ''}${key === 'orders' ? '' : 'BDT '}${change.delta.toLocaleString()}${change.percent == null ? '' : ` (${change.percent > 0 ? '+' : ''}${change.percent}%)`}`}</dd></div>;
            })}
        </dl>
        {comparison.warnings.map(warning => <p key={warning} className="mt-2 text-xs text-amber-800">Previous period: {warning}</p>)}
    </section>;
}
