import { useAuth } from '../../context/AuthContext.jsx';

import { aiSourceLabel } from '../../utils/aiSourceLabel.js';

export default function AiOperationStatus({ operation, onRetry, onUndo }) {
    const { user } = useAuth();
    const usage = user?.planAccess?.usage?.ai;
    return <div className="my-3 space-y-2 text-sm" aria-live="polite">
        {operation.access?.message && <p className="text-sm text-amber-800">{operation.access.message}</p>}
        {usage && <p className="text-xs text-slate-500">Shared weekly allowance: {usage.used || 0} used · {usage.pending || 0} pending · {usage.unlimited ? 'Unlimited' : `${usage.available ?? usage.remaining ?? 0} available`}</p>}
        {operation.meta && <p className="text-xs text-slate-600">{aiSourceLabel(operation.meta.source)}. Review before applying.</p>}
        {operation.error && <p className="rounded-lg bg-amber-50 p-3 text-amber-900">{operation.error}</p>}
        <div className="flex flex-wrap gap-3">
            {operation.loading && <button type="button" className="text-indigo-700 underline" onClick={operation.cancel}>Cancel generation</button>}
            {operation.state === 'retryable' && onRetry && <button type="button" className="text-indigo-700 underline" onClick={onRetry}>Retry same operation</button>}
            {onUndo && <button type="button" className="text-indigo-700 underline" onClick={onUndo}>Undo last AI apply</button>}
        </div>
    </div>;
}

export function AiFieldComparison({ current, proposed }) {
    return <details className="my-2 rounded-lg border border-slate-200 p-3 text-xs">
        <summary className="cursor-pointer font-semibold">Compare current and suggested content</summary>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div><strong>Current</strong><pre className="mt-1 whitespace-pre-wrap break-words font-sans">{JSON.stringify(current, null, 2)}</pre></div>
            <div><strong>Suggested</strong><pre className="mt-1 whitespace-pre-wrap break-words font-sans">{JSON.stringify(proposed, null, 2)}</pre></div>
        </div>
    </details>;
}
