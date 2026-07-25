import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    AlertTriangle,
    Banknote,
    CalendarClock,
    CheckCircle2,
    CreditCard,
    FileText,
    History,
    Loader2,
    RefreshCcw,
    Search,
    ShieldAlert,
    Store,
    TrendingUp,
    X
} from 'lucide-react';
import API from '../../api/api';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import { EmptyState, PaginationControls, SectionCard } from './SuperAdminComponents.jsx';

const tabs = [
    'Subscriptions',
    'Invoices',
    'Payment Verification',
    'Trial Monitor',
    'Revenue by Plan',
    'Subscription Timeline'
];
const tabKey = (tab) => tab.toLowerCase().replace(/\s+/g, '-');
const tabFromKey = (value) => tabs.find(tab => tabKey(tab) === value) || 'Subscriptions';
const positivePage = (value) => Math.max(1, Number(value) || 1);

const money = (value) => `৳${Number(value || 0).toLocaleString()}`;

const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const daysLeft = (value) => {
    if (!value) return null;
    return Math.ceil((new Date(value).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
};

const statusTone = {
    trialing: 'bg-sky-50 text-sky-700 ring-sky-100',
    pending_approval: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    grace: 'bg-amber-50 text-amber-700 ring-amber-100',
    past_due: 'bg-amber-50 text-amber-700 ring-amber-100',
    suspended: 'bg-rose-50 text-rose-700 ring-rose-100',
    cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
    unpaid: 'bg-slate-100 text-slate-600 ring-slate-200',
    submitted: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    paid: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    rejected: 'bg-rose-50 text-rose-700 ring-rose-100',
    pending: 'bg-amber-50 text-amber-700 ring-amber-100',
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    verified: 'bg-emerald-50 text-emerald-700 ring-emerald-100'
};

const StatusBadge = ({ value }) => (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${statusTone[value] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
        {String(value || '-').replace(/_/g, ' ')}
    </span>
);

const ActionModal = ({
    action,
    reason,
    setReason,
    note,
    setNote,
    extensionDays,
    setExtensionDays,
    onClose,
    onConfirm,
    loading
}) => {
    const titleId = useId();
    const descriptionId = useId();
    const dialogRef = useRef(null);
    const initialFocusRef = useRef(null);

    useEffect(() => {
        if (!action) return undefined;
        const previousFocus = document.activeElement;
        window.setTimeout(() => initialFocusRef.current?.focus(), 0);
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !loading) onClose();
            if (event.key !== 'Tab') return;
            const focusable = [...(dialogRef.current?.querySelectorAll(
                'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled])'
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
    }, [action, loading, onClose]);

    if (!action) return null;
    const requiresReason = action.requiresReason;

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
                    <h2 id={titleId} className="text-lg font-black text-slate-950">{action.title}</h2>
                    <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close modal">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="space-y-4 p-5">
                    <p id={descriptionId} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                        {action.warning}
                    </p>
                    {requiresReason && (
                        <label className="block">
                            <span className="text-sm font-bold text-slate-950">Reason</span>
                            <textarea
                                ref={initialFocusRef}
                                value={reason}
                                onChange={event => setReason(event.target.value)}
                                rows={4}
                                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                placeholder="Explain why this action is needed."
                            />
                        </label>
                    )}
                    {action.allowNote && (
                        <label className="block">
                            <span className="text-sm font-bold text-slate-950">Admin note</span>
                            <textarea
                                ref={requiresReason ? undefined : initialFocusRef}
                                value={note}
                                onChange={event => setNote(event.target.value)}
                                rows={3}
                                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                placeholder="Optional internal note."
                            />
                        </label>
                    )}
                    {action.requiresDays && (
                        <label className="block">
                            <span className="text-sm font-bold text-slate-950">Extension days</span>
                            <input
                                ref={action.requiresReason || action.allowNote ? undefined : initialFocusRef}
                                type="number"
                                min="1"
                                max="365"
                                step="1"
                                value={extensionDays}
                                onChange={event => setExtensionDays(event.target.value)}
                                className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                            />
                        </label>
                    )}
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-4">
                    <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={
                            loading ||
                            (requiresReason && !reason.trim()) ||
                            (action.requiresDays && (!Number.isInteger(Number(extensionDays)) || Number(extensionDays) < 1 || Number(extensionDays) > 365))
                        }
                        className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        {loading ? 'Working...' : action.confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SuperAdminBilling = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = tabFromKey(searchParams.get('tab'));
    const initialPage = positivePage(searchParams.get('page'));
    const [overview, setOverview] = useState({});
    const [subscriptions, setSubscriptions] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [payments, setPayments] = useState([]);
    const [timeline, setTimeline] = useState([]);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [action, setAction] = useState(null);
    const [reason, setReason] = useState('');
    const [note, setNote] = useState('');
    const [extensionDays, setExtensionDays] = useState('30');
    const [filters, setFilters] = useState({
        search: searchParams.get('search') || '',
        status: searchParams.get('status') || ''
    });
    const debouncedSearch = useDebouncedValue(filters.search, 300);
    const [pagination, setPagination] = useState({
        subscriptions: { page: ['Subscriptions', 'Trial Monitor'].includes(initialTab) ? initialPage : 1, limit: 20, total: 0, pages: 1 },
        invoices: { page: initialTab === 'Invoices' ? initialPage : 1, limit: 20, total: 0, pages: 1 },
        payments: { page: initialTab === 'Payment Verification' ? initialPage : 1, limit: 20, total: 0, pages: 1 }
    });

    const currentPageKey = ['Subscriptions', 'Trial Monitor'].includes(activeTab)
        ? 'subscriptions'
        : (activeTab === 'Invoices' ? 'invoices' : (activeTab === 'Payment Verification' ? 'payments' : null));

    const updateLocation = useCallback((updates = {}, { replace = true } = {}) => {
        setSearchParams(current => {
            const next = new URLSearchParams(current);
            Object.entries(updates).forEach(([key, value]) => {
                if (value === undefined || value === null || value === '' || value === 1) next.delete(key);
                else next.set(key, String(value));
            });
            return next.toString() === current.toString() ? current : next;
        }, { replace });
    }, [setSearchParams]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            const nextTab = tabFromKey(searchParams.get('tab'));
            const nextSearch = searchParams.get('search') || '';
            const nextStatus = searchParams.get('status') || '';
            const nextPage = positivePage(searchParams.get('page'));
            setActiveTab(previous => previous === nextTab ? previous : nextTab);
            setFilters(previous => (
                previous.search === nextSearch && previous.status === nextStatus
                    ? previous
                    : { search: nextSearch, status: nextStatus }
            ));
            const key = ['Subscriptions', 'Trial Monitor'].includes(nextTab)
                ? 'subscriptions'
                : (nextTab === 'Invoices' ? 'invoices' : (nextTab === 'Payment Verification' ? 'payments' : null));
            if (key) {
                setPagination(previous => previous[key].page === nextPage
                    ? previous
                    : { ...previous, [key]: { ...previous[key], page: nextPage } });
            }
        }, 0);
        return () => window.clearTimeout(timer);
    }, [searchParams]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            updateLocation({
                tab: tabKey(activeTab) === tabKey('Subscriptions') ? '' : tabKey(activeTab),
                search: debouncedSearch,
                status: filters.status,
                page: currentPageKey ? pagination[currentPageKey].page : ''
            });
        }, 0);
        return () => window.clearTimeout(timer);
    }, [
        activeTab,
        currentPageKey,
        debouncedSearch,
        filters.status,
        pagination,
        updateLocation
    ]);

    const loadOverview = useCallback(async (signal) => {
        try {
            const response = await API.get('/super-admin/billing/overview', { signal });
            setOverview(response.data.data || {});
        } catch (err) {
            if (err.code !== 'ERR_CANCELED') toast.error(err.response?.data?.error || 'Failed to load billing summary');
        }
    }, []);

    const loadActiveTab = useCallback(async (signal) => {
        setLoading(true);
        try {
            if (['Subscriptions', 'Trial Monitor'].includes(activeTab)) {
                const response = await API.get('/super-admin/billing/subscriptions', {
                    params: {
                        page: pagination.subscriptions.page,
                        limit: 20,
                        status: activeTab === 'Trial Monitor' ? 'trialing' : (filters.status || undefined)
                    },
                    signal
                });
                setSubscriptions(response.data.data || []);
                setPagination(prev => ({
                    ...prev,
                    subscriptions: response.data.pagination || prev.subscriptions
                }));
            } else if (activeTab === 'Invoices') {
                const response = await API.get('/super-admin/billing/invoices', {
                    params: {
                        page: pagination.invoices.page,
                        limit: 20,
                        search: debouncedSearch || undefined
                    },
                    signal
                });
                setInvoices(response.data.data || []);
                setPagination(prev => ({
                    ...prev,
                    invoices: response.data.pagination || prev.invoices
                }));
            } else if (activeTab === 'Payment Verification') {
                const response = await API.get('/super-admin/billing/payments', {
                    params: {
                        page: pagination.payments.page,
                        limit: 20,
                        status: 'pending',
                        search: debouncedSearch || undefined
                    },
                    signal
                });
                setPayments(response.data.data || []);
                setPagination(prev => ({
                    ...prev,
                    payments: response.data.pagination || prev.payments
                }));
            } else if (activeTab === 'Subscription Timeline') {
                const response = await API.get('/super-admin/subscription-timeline', { params: { limit: 50 }, signal });
                setTimeline(response.data.data || []);
            }
        } catch (err) {
            if (err.code !== 'ERR_CANCELED') toast.error(err.response?.data?.error || `Failed to load ${activeTab.toLowerCase()}`);
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [
        activeTab,
        debouncedSearch,
        filters.status,
        pagination.invoices.page,
        pagination.payments.page,
        pagination.subscriptions.page
    ]);

    const load = useCallback(async () => {
        await Promise.all([loadOverview(), loadActiveTab()]);
    }, [loadActiveTab, loadOverview]);

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => loadOverview(controller.signal), 0);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [loadOverview]);

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => loadActiveTab(controller.signal), 0);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [loadActiveTab]);

    const summary = overview.summary || {};

    const overviewCards = [
        { label: 'Active subscriptions', value: summary.activeSubscriptions || 0, icon: CheckCircle2, tone: 'emerald' },
        { label: 'Trialing shops', value: summary.trialingShops || 0, icon: CalendarClock, tone: 'sky' },
        { label: 'Pending approval', value: summary.pendingApprovalSubscriptions || 0, icon: CreditCard, tone: 'indigo' },
        { label: 'Trials ending soon', value: summary.trialsEndingSoon || 0, icon: AlertTriangle, tone: 'amber' },
        { label: 'Past due shops', value: summary.pastDueShops || 0, icon: ShieldAlert, tone: 'amber' },
        { label: 'Pending payments', value: summary.pendingManualPayments || 0, icon: CreditCard, tone: 'indigo' },
        { label: 'Billing suspended', value: summary.suspendedForBilling || 0, icon: AlertTriangle, tone: 'rose' },
        { label: 'Net payments collected', value: money(summary.netCollected ?? summary.revenueThisMonth ?? 0), icon: Banknote, tone: 'emerald' },
        { label: 'Paid invoices this month', value: summary.paidInvoicesThisMonth || 0, icon: FileText, tone: 'slate' }
    ];

    const trialRows = useMemo(() => {
        return subscriptions
            .filter(item => item.status === 'trialing')
            .sort((a, b) => new Date(a.trialEndsAt || 0) - new Date(b.trialEndsAt || 0));
    }, [subscriptions]);

    const openAction = (config) => {
        setReason('');
        setNote('');
        setExtensionDays('30');
        setAction(config);
    };

    const closeAction = () => {
        setAction(null);
        setReason('');
        setNote('');
        setExtensionDays('30');
    };

    const confirmAction = async () => {
        if (!action) return;
        setActionLoading(true);
        try {
            await action.onConfirm({
                reason: reason.trim(),
                note: note.trim(),
                days: Number(extensionDays)
            });
            toast.success(action.successMessage || 'Action completed');
            closeAction();
            await load();
        } catch (err) {
            toast.error(err.response?.data?.error || action.errorMessage || 'Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    const updateSubscriptionStatus = (subscription, status) => {
        const actionByStatus = {
            active: 'reactivate',
            suspended: 'suspend',
            cancelled: 'cancel'
        };
        const actionName = actionByStatus[status];
        const labels = {
            active: 'Reactivate subscription',
            suspended: 'Suspend for billing',
            cancelled: 'Cancel subscription'
        };
        openAction({
            title: labels[status] || 'Update subscription',
            warning: status === 'active'
                ? 'This will reactivate billing if the shop is only billing-suspended. Manual or NID suspensions remain protected.'
                : `This will mark the subscription ${status}.`,
            confirmLabel: labels[status] || 'Update',
            requiresReason: ['suspended', 'cancelled'].includes(status),
            allowNote: status === 'active',
            successMessage: 'Subscription updated',
            onConfirm: ({ reason: actionReason }) => API.post(`/super-admin/billing/subscriptions/${subscription.id}/actions/${actionName}`, {
                reason: actionReason,
                expectedVersion: subscription.version
            })
        });
    };

    const extendSubscription = (subscription) => {
        openAction({
            title: 'Extend subscription period',
            warning: 'This is a manual billing exception. It changes the paid-period end date and is recorded in the durable audit timeline.',
            confirmLabel: 'Extend period',
            requiresReason: true,
            requiresDays: true,
            successMessage: 'Subscription period extended',
            onConfirm: ({ reason: actionReason, days }) => API.post(
                `/super-admin/billing/subscriptions/${subscription.id}/actions/extend`,
                {
                    reason: actionReason,
                    days,
                    expectedVersion: subscription.version
                }
            )
        });
    };

    const verifyPayment = (payment) => {
        openAction({
            title: 'Verify payment',
            warning: 'Confirm the transaction details before marking this payment verified. This activates the subscription.',
            confirmLabel: 'Verify payment',
            allowNote: true,
            successMessage: 'Payment verified',
            onConfirm: ({ note: adminNote }) => API.patch(`/super-admin/billing/payments/${payment.id}/verify`, { adminNote })
        });
    };

    const rejectPayment = (payment) => {
        openAction({
            title: 'Reject payment',
            warning: 'Rejecting payment tells the vendor to submit corrected details. A reason is required.',
            confirmLabel: 'Reject payment',
            requiresReason: true,
            allowNote: true,
            successMessage: 'Payment rejected',
            onConfirm: ({ reason: rejectionReason, note: adminNote }) => API.patch(`/super-admin/billing/payments/${payment.id}/reject`, {
                rejectionReason,
                adminNote
            })
        });
    };

    const openPaymentProof = async (payment) => {
        const proofWindow = window.open('about:blank', '_blank');
        if (proofWindow) {
            proofWindow.opener = null;
            proofWindow.document.title = 'Loading payment proof...';
        }
        try {
            const response = await API.get(`/super-admin/billing/payments/${payment.id}/proof`, {
                params: { reason: 'Manual payment verification' }
            });
            const url = response.data?.data?.url;
            if (!url) throw new Error('Payment proof is unavailable');
            if (!proofWindow) {
                toast.error('Allow popups for this dashboard to open payment proof.');
                return;
            }
            proofWindow.location.replace(url);
        } catch (err) {
            proofWindow?.close();
            toast.error(err.response?.data?.error || err.message || 'Failed to open payment proof');
        }
    };

    const runLifecycle = async () => {
        try {
            await API.post('/super-admin/billing/lifecycle/check');
            toast.success('Billing lifecycle check completed');
            await load();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lifecycle check failed');
        }
    };

    const setPage = (key, page) => {
        setPagination(prev => ({
            ...prev,
            [key]: { ...prev[key], page }
        }));
        updateLocation({ page }, { replace: false });
    };

    const hasHydratedContent = Boolean(
        overview.summary ||
        subscriptions.length ||
        invoices.length ||
        payments.length ||
        timeline.length
    );

    if (loading && !hasHydratedContent) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                        Loading billing dashboard...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 pb-12 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Platform Billing</p>
                    <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Billing dashboard</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                        Monitor trials, invoices, manual payments, and subscription health across vendor shops.
                    </p>
                </div>
                <button
                    onClick={runLifecycle}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    <RefreshCcw className="h-4 w-4" />
                    Run lifecycle check
                </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {overviewCards.map(card => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{card.label}</p>
                                    <p className="mt-2 text-2xl font-black text-slate-950">{card.value}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <Icon className="h-5 w-5 text-indigo-600" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <div className="flex overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                const key = ['Subscriptions', 'Trial Monitor'].includes(tab)
                                    ? 'subscriptions'
                                    : (tab === 'Invoices' ? 'invoices' : (tab === 'Payment Verification' ? 'payments' : null));
                                updateLocation({
                                    tab: tabKey(tab) === tabKey('Subscriptions') ? '' : tabKey(tab),
                                    page: key ? pagination[key].page : ''
                                }, { replace: false });
                            }}
                            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition ${activeTab === tab ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <label className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={filters.search}
                            onChange={event => {
                                setFilters(prev => ({ ...prev, search: event.target.value }));
                                if (currentPageKey) setPage(currentPageKey, 1);
                            }}
                            placeholder="Search invoice or transaction"
                            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 sm:w-72"
                        />
                    </label>
                    <select
                        value={filters.status}
                        onChange={event => {
                            setFilters(prev => ({ ...prev, status: event.target.value }));
                            if (currentPageKey) setPage(currentPageKey, 1);
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    >
                        <option value="">All subscription statuses</option>
                        <option value="trialing">Trialing</option>
                        <option value="pending_approval">Pending approval</option>
                        <option value="active">Active</option>
                        <option value="past_due">Past due</option>
                        <option value="grace">Grace</option>
                        <option value="suspended">Suspended</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            {loading && (
                <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    Updating {activeTab.toLowerCase()}...
                </div>
            )}

            {activeTab === 'Subscriptions' && (
                <SectionCard title="Subscriptions" icon={Store}>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1120px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-5 py-3">Shop</th>
                                    <th className="px-5 py-3">Owner</th>
                                    <th className="px-5 py-3">Plan</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Cycle</th>
                                    <th className="px-5 py-3">Trial ends</th>
                                    <th className="px-5 py-3">Period ends</th>
                                    <th className="px-5 py-3">Grace ends</th>
                                    <th className="px-5 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {subscriptions.length === 0 ? (
                                    <tr><td colSpan={9}><EmptyState message="No subscriptions found." /></td></tr>
                                ) : subscriptions.map(item => (
                                    <tr key={item.id}>
                                        <td className="px-5 py-4">
                                            <p className="font-bold text-slate-950">{item.shop?.shopName || '-'}</p>
                                            <p className="text-xs text-slate-500">{item.shop?.subdomain || '-'}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="font-semibold text-slate-700">{item.owner?.fullName || '-'}</p>
                                            <p className="text-xs text-slate-500">{item.owner?.email || '-'}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="font-bold text-slate-800">{item.billingDisplay?.displayPlan || item.displayPlan || item.plan?.name || 'Trial'}</p>
                                            {item.billingDisplay?.intendedPlanName && item.status === 'trialing' && (
                                                <p className="text-xs text-slate-500">Intended: {item.billingDisplay.intendedPlanName}</p>
                                            )}
                                            {item.billingDisplay?.pendingPlanName && (
                                                <p className="text-xs text-indigo-600">Pending: {item.billingDisplay.pendingPlanName}</p>
                                            )}
                                        </td>
                                        <td className="px-5 py-4"><StatusBadge value={item.status} /></td>
                                        <td className="px-5 py-4 capitalize">{item.billingCycle}</td>
                                        <td className="px-5 py-4">{formatDate(item.trialEndsAt)}</td>
                                        <td className="px-5 py-4">{formatDate(item.currentPeriodEnd)}</td>
                                        <td className="px-5 py-4">{formatDate(item.graceEndsAt)}</td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {item.shop?._id && (
                                                    <Link to={`/super-admin/shops/${item.shop._id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                                                        View shop
                                                    </Link>
                                                )}
                                                {item.allowedActions?.includes('reactivate') && (
                                                    <button onClick={() => updateSubscriptionStatus(item, 'active')} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
                                                        Reactivate
                                                    </button>
                                                )}
                                                {item.allowedActions?.includes('suspend') && (
                                                    <button onClick={() => updateSubscriptionStatus(item, 'suspended')} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100">
                                                        Suspend
                                                    </button>
                                                )}
                                                {item.allowedActions?.includes('cancel') && (
                                                    <button onClick={() => updateSubscriptionStatus(item, 'cancelled')} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200">
                                                        Cancel
                                                    </button>
                                                )}
                                                {item.allowedActions?.includes('extend') && (
                                                    <button onClick={() => extendSubscription(item)} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100">
                                                        Extend
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls pagination={pagination.subscriptions} onPageChange={page => setPage('subscriptions', page)} />
                </SectionCard>
            )}

            {activeTab === 'Invoices' && (
                <SectionCard title="Invoices" icon={FileText}>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[920px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-5 py-3">Invoice</th>
                                    <th className="px-5 py-3">Shop</th>
                                    <th className="px-5 py-3">Plan</th>
                                    <th className="px-5 py-3">Amount</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Due</th>
                                    <th className="px-5 py-3">Payment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoices.length === 0 ? (
                                    <tr><td colSpan={7}><EmptyState message="No invoices found." /></td></tr>
                                ) : invoices.map(invoice => (
                                    <tr key={invoice.id}>
                                        <td className="px-5 py-4 font-bold text-slate-950">{invoice.invoiceNumber}</td>
                                        <td className="px-5 py-4">{invoice.shop?.shopName || '-'}</td>
                                        <td className="px-5 py-4">{invoice.plan?.name || invoice.planName || '-'}</td>
                                        <td className="px-5 py-4">{money(invoice.amount)}</td>
                                        <td className="px-5 py-4"><StatusBadge value={invoice.status} /></td>
                                        <td className="px-5 py-4">{formatDate(invoice.dueDate)}</td>
                                        <td className="px-5 py-4">
                                            {invoice.submittedPayment ? <StatusBadge value={invoice.submittedPayment.status} /> : <span className="text-slate-400">No submission</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls pagination={pagination.invoices} onPageChange={page => setPage('invoices', page)} />
                </SectionCard>
            )}

            {activeTab === 'Payment Verification' && (
                <SectionCard title="Payment Verification" icon={CreditCard}>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1080px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-5 py-3">Shop</th>
                                    <th className="px-5 py-3">Invoice</th>
                                    <th className="px-5 py-3">Plan</th>
                                    <th className="px-5 py-3">Provider</th>
                                    <th className="px-5 py-3">Amount</th>
                                    <th className="px-5 py-3">Transaction</th>
                                    <th className="px-5 py-3">Sender</th>
                                    <th className="px-5 py-3">Submitted</th>
                                    <th className="px-5 py-3">Proof</th>
                                    <th className="px-5 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {payments.length === 0 ? (
                                    <tr><td colSpan={10}><EmptyState message="No pending manual payments." /></td></tr>
                                ) : payments.map(payment => (
                                    <tr key={payment.id}>
                                        <td className="px-5 py-4">
                                            <p className="font-bold text-slate-950">{payment.shop?.shopName || '-'}</p>
                                            <p className="text-xs text-slate-500">{payment.shop?.subdomain || '-'}</p>
                                        </td>
                                        <td className="px-5 py-4">{payment.invoice?.invoiceNumber || '-'}</td>
                                        <td className="px-5 py-4">{payment.invoice?.planId?.name || payment.invoice?.planName || payment.planName || '-'}</td>
                                        <td className="px-5 py-4">{String(payment.provider || '').replace('manual_', '')}</td>
                                        <td className="px-5 py-4">{money(payment.amount)}</td>
                                        <td className="px-5 py-4 font-mono text-xs">{payment.transactionId || '-'}</td>
                                        <td className="px-5 py-4">{payment.senderNumber || '-'}</td>
                                        <td className="px-5 py-4">{formatDate(payment.createdAt)}</td>
                                        <td className="px-5 py-4">
                                            {payment.proofAvailable ? (
                                                <button type="button" onClick={() => openPaymentProof(payment)} className="font-bold text-indigo-600 hover:text-indigo-700">
                                                    Open proof
                                                </button>
                                            ) : '-'}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => verifyPayment(payment)} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
                                                    Verify
                                                </button>
                                                <button onClick={() => rejectPayment(payment)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100">
                                                    Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls pagination={pagination.payments} onPageChange={page => setPage('payments', page)} />
                </SectionCard>
            )}

            {activeTab === 'Trial Monitor' && (
                <SectionCard title="Trial Monitor" icon={CalendarClock}>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[960px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-5 py-3">Shop</th>
                                    <th className="px-5 py-3">Owner</th>
                                    <th className="px-5 py-3">Trial started</th>
                                    <th className="px-5 py-3">Trial ends</th>
                                    <th className="px-5 py-3">Days left</th>
                                    <th className="px-5 py-3">Products</th>
                                    <th className="px-5 py-3">Orders</th>
                                    <th className="px-5 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {trialRows.length === 0 ? (
                                    <tr><td colSpan={8}><EmptyState message="No active trials in this page." /></td></tr>
                                ) : trialRows.map(item => (
                                    <tr key={item.id}>
                                        <td className="px-5 py-4">
                                            <p className="font-bold text-slate-950">{item.shop?.shopName || '-'}</p>
                                            <p className="text-xs text-slate-500">{item.shop?.subdomain || '-'}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="font-semibold">{item.owner?.fullName || '-'}</p>
                                            <p className="text-xs text-slate-500">{item.owner?.email || '-'}</p>
                                        </td>
                                        <td className="px-5 py-4">{formatDate(item.trialStartedAt)}</td>
                                        <td className="px-5 py-4">{formatDate(item.trialEndsAt)}</td>
                                        <td className="px-5 py-4">
                                            <span className={daysLeft(item.trialEndsAt) <= 3 ? 'font-black text-amber-700' : 'font-bold text-slate-700'}>
                                                {daysLeft(item.trialEndsAt)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">{item.metrics?.products || 0}</td>
                                        <td className="px-5 py-4">{item.metrics?.orders || 0}</td>
                                        <td className="px-5 py-4">
                                            {item.shop?._id && (
                                                <Link to={`/super-admin/shops/${item.shop._id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                                                    View shop
                                                </Link>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            )}

            {activeTab === 'Revenue by Plan' && (
                <SectionCard title="Revenue by Plan" icon={TrendingUp}>
                    <div className="grid gap-4 p-5 md:grid-cols-3">
                        {(overview.revenueByPlan || []).length === 0 ? (
                            <div className="md:col-span-3"><EmptyState message="No paid invoice revenue this month yet." /></div>
                        ) : overview.revenueByPlan.map(item => (
                            <div key={`${item._id?.plan}-${item._id?.cycle}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{item._id?.plan || 'Unknown'} · {item._id?.cycle || 'monthly'}</p>
                                <p className="mt-2 text-2xl font-black text-slate-950">{money(item.amount)}</p>
                                <p className="mt-1 text-sm text-slate-500">{item.count} paid invoice{item.count === 1 ? '' : 's'}</p>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {activeTab === 'Subscription Timeline' && (
                <SectionCard title="Subscription Timeline" icon={History}>
                    <div className="divide-y divide-slate-100">
                        {timeline.length === 0 ? (
                            <EmptyState message="No subscription events have been recorded yet." />
                        ) : timeline.map(item => (
                            <div key={item._id} className="grid gap-3 p-5 md:grid-cols-[1fr_0.8fr_0.8fr_auto] md:items-center">
                                <div>
                                    <p className="font-black text-slate-950">{String(item.eventType || '').replace(/([a-z])([A-Z])/g, '$1 $2')}</p>
                                    <p className="mt-1 text-xs text-slate-500">Correlation: {item.correlationId || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-slate-400">Shop</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-700">{String(item.shopId || '-')}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-slate-400">Actor</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-700">{item.actor?.role || 'System'}</p>
                                </div>
                                <time className="text-xs font-semibold text-slate-400" dateTime={item.occurredAt}>{formatDate(item.occurredAt)}</time>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            <ActionModal
                action={action}
                reason={reason}
                setReason={setReason}
                note={note}
                setNote={setNote}
                extensionDays={extensionDays}
                setExtensionDays={setExtensionDays}
                onClose={closeAction}
                onConfirm={confirmAction}
                loading={actionLoading}
            />
        </div>
    );
};

export default SuperAdminBilling;
