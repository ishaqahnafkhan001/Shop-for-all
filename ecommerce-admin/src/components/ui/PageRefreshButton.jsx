import { RefreshCw } from 'lucide-react';

const PageRefreshButton = ({
    onRefresh,
    onClick,
    loading = false,
    label = 'Refresh',
    className = ''
}) => (
    <button
        type="button"
        onClick={onRefresh || onClick}
        disabled={loading}
        aria-label={label}
        title={label}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
    </button>
);

export default PageRefreshButton;
