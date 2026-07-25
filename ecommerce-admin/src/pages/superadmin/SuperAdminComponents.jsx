import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

const statusTone = {
    Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    Active: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    Verified: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    Pending: 'bg-amber-50 text-amber-700 ring-amber-100',
    PendingVerification: 'bg-amber-50 text-amber-700 ring-amber-100',
    OwnershipVerified: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
    RoutingPending: 'bg-amber-50 text-amber-700 ring-amber-100',
    Reviewing: 'bg-amber-50 text-amber-700 ring-amber-100',
    Suspended: 'bg-rose-50 text-rose-700 ring-rose-100',
    Failed: 'bg-rose-50 text-rose-700 ring-rose-100',
    Open: 'bg-rose-50 text-rose-700 ring-rose-100',
    Resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    Dismissed: 'bg-slate-100 text-slate-600 ring-slate-200',
    Critical: 'bg-rose-50 text-rose-700 ring-rose-100',
    Warning: 'bg-amber-50 text-amber-700 ring-amber-100',
    Info: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    critical: 'bg-rose-50 text-rose-700 ring-rose-100',
    warning: 'bg-amber-50 text-amber-700 ring-amber-100',
    info: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    paid: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    healthy: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    trialing: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    running: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
    queued: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    idle: 'bg-slate-100 text-slate-600 ring-slate-200',
    pending: 'bg-amber-50 text-amber-700 ring-amber-100',
    pending_approval: 'bg-amber-50 text-amber-700 ring-amber-100',
    submitted: 'bg-amber-50 text-amber-700 ring-amber-100',
    pending_analysis: 'bg-amber-50 text-amber-700 ring-amber-100',
    analyzing: 'bg-amber-50 text-amber-700 ring-amber-100',
    analysis_completed: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    pending_super_admin_review: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    grace: 'bg-amber-50 text-amber-700 ring-amber-100',
    past_due: 'bg-rose-50 text-rose-700 ring-rose-100',
    rejected: 'bg-rose-50 text-rose-700 ring-rose-100',
    failed: 'bg-rose-50 text-rose-700 ring-rose-100',
    dead: 'bg-rose-100 text-rose-800 ring-rose-200',
    cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
    revoked: 'bg-rose-50 text-rose-700 ring-rose-100',
    approve: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    review: 'bg-amber-50 text-amber-700 ring-amber-100',
    reject: 'bg-rose-50 text-rose-700 ring-rose-100',
    suspended: 'bg-rose-50 text-rose-700 ring-rose-100',
    not_submitted: 'bg-slate-100 text-slate-600 ring-slate-200'
};

export const StatusBadge = ({ value }) => (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusTone[value] || statusTone.not_submitted}`}>
        {String(value || '-').replace(/_/g, ' ')}
    </span>
);

export const SectionCard = ({ title, icon: Icon, children, actions }) => (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 font-black text-slate-950">
                {Icon && <Icon className="h-5 w-5 text-indigo-600" />}
                {title}
            </div>
            {actions}
        </div>
        {children}
    </section>
);

export const PaginationControls = ({ pagination, onPageChange }) => {
    const pages = pagination?.totalPages || pagination?.pages || 1;
    const total = pagination?.totalItems ?? pagination?.total ?? 0;
    if (!pagination || pages <= 1) return null;

    return (
        <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
                Page {pagination.page} of {pages} · {total} total
            </span>
            <div className="flex gap-2">
                <button
                    onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
                    disabled={pagination.page <= 1}
                    className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Previous
                </button>
                <button
                    onClick={() => onPageChange(Math.min(pages, pagination.page + 1))}
                    disabled={pagination.page >= pages}
                    className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export const EmptyState = ({ message = 'No records found.' }) => (
    <div className="px-4 py-10 text-center text-sm text-slate-500">{message}</div>
);

export const ReasonModal = ({ open, title, warning, reason, setReason, onCancel, onConfirm, confirmLabel = 'Confirm', loading = false }) => {
    const titleId = useId();
    const descriptionId = useId();
    const textareaRef = useRef(null);
    const dialogRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const previousFocus = document.activeElement;
        window.setTimeout(() => textareaRef.current?.focus(), 0);
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !loading) onCancel();
            if (event.key !== 'Tab') return;
            const focusable = [...(dialogRef.current?.querySelectorAll(
                'button:not([disabled]), textarea:not([disabled])'
            ) || [])];
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            previousFocus?.focus?.();
        };
    }, [loading, onCancel, open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <h2 id={titleId} className="text-lg font-black text-slate-950">{title}</h2>
                    <button onClick={onCancel} disabled={loading} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close modal">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="space-y-4 p-5">
                    <p id={descriptionId} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                        {warning}
                    </p>
                    <label className="block">
                        <span className="text-sm font-bold text-slate-950">Reason</span>
                        <textarea
                            ref={textareaRef}
                            value={reason}
                            onChange={event => setReason(event.target.value)}
                            rows={4}
                            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                            placeholder="Explain why this action is needed."
                        />
                    </label>
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-4">
                    <button onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading || !reason.trim()}
                        className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        {loading ? 'Working...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
