import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    AlertTriangle,
    Clock3,
    RefreshCw,
    RotateCcw,
    Search,
    ServerCog,
    Truck
} from 'lucide-react';
import API from '../../api/api';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { hasPlatformPermission } from '../../utils/platformAccess.js';
import {
    EmptyState,
    PaginationControls,
    ReasonModal,
    SectionCard,
    StatusBadge
} from './SuperAdminComponents.jsx';

const defaultPagination = { page: 1, limit: 20, total: 0, pages: 1 };
const workspaceConfig = {
    jobs: {
        title: 'Background Jobs',
        description: 'Inspect queue health and perform explicit, audited recovery actions.',
        endpoint: '/super-admin/jobs',
        icon: ServerCog
    },
    reconciliations: {
        title: 'Reconciliation',
        description: 'Monitor subscription plan reconciliation without running work inside the browser request.',
        endpoint: '/super-admin/reconciliations',
        icon: RotateCcw
    },
    lifecycle: {
        title: 'Lifecycle Monitor',
        description: 'Review subscription state distribution, upcoming boundaries, and distributed worker leases.',
        endpoint: '/super-admin/lifecycle',
        icon: Clock3
    },
    shipping: {
        title: 'Shipping Operations',
        description: 'Review tenant courier configuration status without exposing provider credentials.',
        endpoint: '/super-admin/shipping',
        icon: Truck
    },
    alerts: {
        title: 'Platform Alerts',
        description: 'A focused view of operational conditions that need platform attention.',
        endpoint: '/super-admin/alerts',
        icon: AlertTriangle
    }
};

const resolveMode = pathname => Object.keys(workspaceConfig)
    .find(key => pathname.endsWith(`/${key}`)) || 'jobs';

const formatDate = value => value ? new Date(value).toLocaleString() : '-';

const SuperAdminOperations = () => {
    const location = useLocation();
    const { user } = useAuth();
    const mode = resolveMode(location.pathname);
    const config = workspaceConfig[mode];
    const Icon = config.icon;
    const [data, setData] = useState([]);
    const [summary, setSummary] = useState(null);
    const [registry, setRegistry] = useState({});
    const [filters, setFilters] = useState({ page: 1, search: '', status: 'all', queue: 'all', provider: 'all' });
    const [pagination, setPagination] = useState(defaultPagination);
    const [loading, setLoading] = useState(true);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [pendingAction, setPendingAction] = useState(null);
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const debouncedFilters = useDebouncedValue(filters, 300);

    useEffect(() => {
        const controller = new AbortController();
        const listMode = ['jobs', 'reconciliations', 'shipping'].includes(mode);
        const params = listMode ? { ...debouncedFilters, limit: 20 } : undefined;
        API.get(config.endpoint, { params, signal: controller.signal })
            .then(({ data: response }) => {
                if (listMode) {
                    setData(response.data || []);
                    setPagination(response.pagination || defaultPagination);
                    setRegistry(response.registry || {});
                } else {
                    setSummary(response.data || {});
                }
            })
            .catch(error => {
                if (error.code !== 'ERR_CANCELED') toast.error(`${config.title} could not be loaded`);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [config.endpoint, config.title, debouncedFilters, mode, refreshVersion]);

    const statusOptions = useMemo(() => {
        if (mode === 'jobs') return registry.statuses || ['queued', 'running', 'completed', 'failed', 'dead', 'cancelled'];
        if (mode === 'reconciliations') return registry.statuses || ['pending', 'running', 'completed', 'failed', 'cancelled'];
        return [];
    }, [mode, registry.statuses]);

    const openAction = action => {
        setReason('');
        setPendingAction(action);
    };

    const confirmAction = async () => {
        if (!pendingAction || !reason.trim()) return;
        setSaving(true);
        try {
            await API.post(pendingAction.endpoint, {
                reason: reason.trim(),
                expectedVersion: pendingAction.version
            });
            toast.success(pendingAction.successMessage);
            setPendingAction(null);
            setRefreshVersion(value => value + 1);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Operation failed');
        } finally {
            setSaving(false);
        }
    };

    const renderFilters = () => {
        if (!['jobs', 'reconciliations', 'shipping'].includes(mode)) return null;
        return (
            <div className="grid gap-2 sm:grid-cols-[minmax(12rem,20rem)_11rem_11rem]">
                <label className="relative block">
                    <span className="sr-only">Search {config.title}</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        value={filters.search}
                        onChange={event => setFilters(previous => ({
                            ...previous,
                            search: event.target.value,
                            page: 1
                        }))}
                        className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm"
                        placeholder={`Search ${config.title.toLowerCase()}`}
                    />
                </label>
                {mode === 'shipping' ? (
                    <select
                        aria-label="Courier provider"
                        value={filters.provider}
                        onChange={event => setFilters(previous => ({
                            ...previous,
                            provider: event.target.value,
                            page: 1
                        }))}
                        className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm"
                    >
                        <option value="all">All couriers</option>
                        <option value="pathao">Pathao enabled</option>
                        <option value="redx">RedX enabled</option>
                    </select>
                ) : (
                    <select
                        aria-label="Status"
                        value={filters.status}
                        onChange={event => setFilters(previous => ({
                            ...previous,
                            status: event.target.value,
                            page: 1
                        }))}
                        className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm"
                    >
                        <option value="all">All statuses</option>
                        {statusOptions.map(status => <option key={status}>{status}</option>)}
                    </select>
                )}
                {mode === 'jobs' ? (
                    <select
                        aria-label="Queue"
                        value={filters.queue}
                        onChange={event => setFilters(previous => ({
                            ...previous,
                            queue: event.target.value,
                            page: 1
                        }))}
                        className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm"
                    >
                        <option value="all">All queues</option>
                        {(registry.queues || []).map(queue => <option key={queue}>{queue}</option>)}
                    </select>
                ) : <span />}
            </div>
        );
    };

    const renderJobs = () => (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                        <th className="px-4 py-3">Job</th>
                        <th className="px-4 py-3">Tenant</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Attempts</th>
                        <th className="px-4 py-3">Schedule / lock</th>
                        <th className="px-4 py-3">Last error</th>
                        <th className="px-4 py-3 text-right">Recovery</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.map(job => (
                        <tr key={job.id} className="align-top hover:bg-slate-50">
                            <td className="px-4 py-3">
                                <p className="font-bold text-slate-950">{job.name}</p>
                                <p className="text-xs text-slate-500">{job.queue}</p>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{job.shop?.shopName || 'Platform'}</td>
                            <td className="px-4 py-3"><StatusBadge value={job.status} /></td>
                            <td className="px-4 py-3">{job.attempts} / {job.maxAttempts}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">
                                <p>Run: {formatDate(job.runAt)}</p>
                                {job.lockedAt && <p>Locked: {formatDate(job.lockedAt)}</p>}
                            </td>
                            <td className="max-w-xs px-4 py-3 text-xs text-rose-600">{job.lastError || '-'}</td>
                            <td className="px-4 py-3">
                                <div className="flex justify-end gap-2">
                                    {['failed', 'dead', 'cancelled'].includes(job.status) &&
                                    hasPlatformPermission(user, 'workers.jobs.retry') && (
                                        <button
                                            type="button"
                                            onClick={() => openAction({
                                                endpoint: `/super-admin/jobs/${job.id}/retry`,
                                                version: job.version,
                                                title: 'Retry background job',
                                                warning: 'Retrying requeues this job. The worker will still recheck tenant entitlements before any external side effect.',
                                                label: 'Queue retry',
                                                successMessage: 'Job queued for retry'
                                            })}
                                            className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-bold"
                                        >
                                            Retry
                                        </button>
                                    )}
                                    {['queued', 'failed'].includes(job.status) &&
                                    hasPlatformPermission(user, 'workers.jobs.cancel') && (
                                        <button
                                            type="button"
                                            onClick={() => openAction({
                                                endpoint: `/super-admin/jobs/${job.id}/cancel`,
                                                version: job.version,
                                                title: 'Cancel background job',
                                                warning: 'Cancellation prevents future worker claims. Record why this operation is no longer valid.',
                                                label: 'Cancel job',
                                                successMessage: 'Job cancelled'
                                            })}
                                            className="min-h-10 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-700"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    {job.status === 'running' &&
                                    hasPlatformPermission(user, 'workers.locks.manage') && (
                                        <button
                                            type="button"
                                            onClick={() => openAction({
                                                endpoint: `/super-admin/jobs/${job.id}/release-lock`,
                                                version: job.version,
                                                title: 'Release stale job lock',
                                                warning: 'This works only after the configured stale-lock timeout. It does not interrupt a healthy active worker.',
                                                label: 'Release stale lock',
                                                successMessage: 'Stale lock released'
                                            })}
                                            className="min-h-10 rounded-lg border border-amber-200 px-3 text-xs font-bold text-amber-800"
                                        >
                                            Release
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderReconciliations = () => (
        <div className="divide-y divide-slate-100">
            {data.map(item => (
                <article key={item.subscriptionId} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-black text-slate-950">{item.shop?.shopName || 'Unknown shop'}</h2>
                            <StatusBadge value={item.status} />
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                            {item.type || 'plan change'} · {item.activePlanSlug || '-'} → {item.targetPlanSlug || '-'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Operation {item.operationId || '-'} · Attempt {item.attempts}/{item.maxAttempts}</p>
                        {item.lastError && <p className="mt-2 text-sm text-rose-600">{item.lastError}</p>}
                    </div>
                    <div className="space-y-2 text-xs text-slate-500">
                        <p>Scheduled: {formatDate(item.scheduledAt)}</p>
                        <p>Next retry: {formatDate(item.nextRetryAt)}</p>
                        {['failed', 'cancelled'].includes(item.status) &&
                        hasPlatformPermission(user, 'platform.reconciliation.retry') && (
                            <button
                                type="button"
                                onClick={() => openAction({
                                    endpoint: `/super-admin/reconciliations/${item.subscriptionId}/retry`,
                                    version: item.version,
                                    title: 'Retry reconciliation',
                                    warning: 'This queues reconciliation for the worker. It does not execute tenant mutations inside this request.',
                                    label: 'Queue retry',
                                    successMessage: 'Reconciliation queued'
                                })}
                                className="min-h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700"
                            >
                                Retry reconciliation
                            </button>
                        )}
                    </div>
                </article>
            ))}
        </div>
    );

    const renderShipping = () => (
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {data.map(shop => (
                <article key={shop.id} className="rounded-xl border border-slate-200 p-4">
                    <h2 className="font-black text-slate-950">{shop.shopName}</h2>
                    <p className="text-xs text-slate-500">{shop.subdomain}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-slate-50 p-3">
                            <p className="text-xs font-bold uppercase text-slate-500">Pathao</p>
                            <StatusBadge value={shop.pathao?.status} />
                            <p className="mt-2 text-xs text-slate-500">{shop.pathao?.storeName || 'No pickup store'}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                            <p className="text-xs font-bold uppercase text-slate-500">RedX</p>
                            <StatusBadge value={shop.redx?.status} />
                            <p className="mt-2 text-xs text-slate-500">{shop.redx?.pickupStoreName || 'No pickup store'}</p>
                        </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                        Default: {shop.defaultCourier || 'Not selected'} · credentials {shop.redx?.credentialsPresent || shop.pathao?.configured ? 'present' : 'not configured'}
                    </p>
                </article>
            ))}
        </div>
    );

    const renderLifecycle = () => (
        <div className="space-y-5 p-5">
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">Trials due soon</p><p className="mt-1 text-2xl font-black">{summary?.dueTrials || 0}</p></div>
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">Periods due soon</p><p className="mt-1 text-2xl font-black">{summary?.duePeriods || 0}</p></div>
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">Failed reconciliation</p><p className="mt-1 text-2xl font-black">{summary?.failedReconciliations || 0}</p></div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-slate-200 p-4">
                    <h2 className="font-black">Subscriptions by status</h2>
                    <dl className="mt-3 space-y-2">
                        {Object.entries(summary?.subscriptionsByStatus || {}).map(([status, count]) => (
                            <div key={status} className="flex items-center justify-between">
                                <dt><StatusBadge value={status} /></dt><dd className="font-black">{count}</dd>
                            </div>
                        ))}
                    </dl>
                </section>
                <section className="rounded-xl border border-slate-200 p-4">
                    <h2 className="font-black">Worker leases</h2>
                    <div className="mt-3 space-y-3">
                        {(summary?.workers || []).length === 0 ? <p className="text-sm text-slate-500">No lease records yet.</p> : summary.workers.map(worker => (
                            <div key={worker.id} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-3">
                                <div><p className="font-bold">{worker.key}</p><p className="text-xs text-slate-500">Last completed {formatDate(worker.lastCompletedAt)}</p></div>
                                <StatusBadge value={worker.status} />
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );

    const renderAlerts = () => {
        const counts = summary?.counts || {};
        return (
            <div className="p-5">
                <div className="mb-4 flex items-center gap-2">
                    <StatusBadge value={summary?.severity || 'healthy'} />
                    <p className="text-sm text-slate-500">Derived at {formatDate(summary?.serverNow)}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(counts).map(([key, value]) => (
                        <div key={key} className="rounded-xl border border-slate-200 p-4">
                            <p className="text-xs font-bold uppercase text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</p>
                            <p className="mt-1 text-2xl font-black">{value}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const listEmpty = ['jobs', 'reconciliations', 'shipping'].includes(mode) && data.length === 0;

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Icon className="h-6 w-6 text-indigo-600" />
                        <h1 className="text-2xl font-black text-slate-950">{config.title}</h1>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{config.description}</p>
                </div>
                <button
                    type="button"
                    onClick={() => setRefreshVersion(value => value + 1)}
                    disabled={loading}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 disabled:opacity-60"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </header>

            <SectionCard title={config.title} icon={Icon} actions={renderFilters()}>
                {loading && listEmpty ? (
                    <div className="px-5 py-12 text-center text-sm text-slate-500">Loading {config.title.toLowerCase()}...</div>
                ) : listEmpty ? (
                    <EmptyState message={`No ${config.title.toLowerCase()} match these filters.`} />
                ) : mode === 'jobs' ? renderJobs()
                    : mode === 'reconciliations' ? renderReconciliations()
                        : mode === 'shipping' ? renderShipping()
                            : mode === 'lifecycle' ? renderLifecycle()
                                : renderAlerts()}
                {['jobs', 'reconciliations', 'shipping'].includes(mode) && (
                    <PaginationControls
                        pagination={pagination}
                        onPageChange={page => setFilters(previous => ({ ...previous, page }))}
                    />
                )}
            </SectionCard>

            <ReasonModal
                open={Boolean(pendingAction)}
                title={pendingAction?.title}
                warning={pendingAction?.warning}
                reason={reason}
                setReason={setReason}
                onCancel={() => setPendingAction(null)}
                onConfirm={confirmAction}
                confirmLabel={pendingAction?.label}
                loading={saving}
            />
        </div>
    );
};

export default SuperAdminOperations;
