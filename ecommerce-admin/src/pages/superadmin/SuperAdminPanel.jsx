import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    AlertTriangle,
    Bell,
    Building2,
    CreditCard,
    RefreshCw,
    ShieldCheck,
    Store,
    WalletCards
} from 'lucide-react';
import API from '../../api/api';
import { useAuth } from '../../context/AuthContext.jsx';
import { hasPlatformPermission } from '../../utils/platformAccess.js';
import { EmptyState, SectionCard, StatusBadge } from './SuperAdminComponents.jsx';

const formatMoney = value => `৳${Number(value || 0).toLocaleString()}`;
const label = value => String(value || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());

const MetricCard = ({ label: cardLabel, value, help }) => (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">{cardLabel}</p>
        <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
        {help && <p className="mt-1 text-xs text-slate-400">{help}</p>}
    </article>
);

const SuperAdminPanel = () => {
    const { user } = useAuth();
    const [overview, setOverview] = useState({});
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshVersion, setRefreshVersion] = useState(0);

    const load = useCallback(() => {
        const controller = new AbortController();
        Promise.all([
            API.get('/super-admin/overview', { signal: controller.signal }),
            API.get('/super-admin/notifications', {
                params: { limit: 6 },
                signal: controller.signal
            })
        ])
            .then(([overviewResponse, notificationResponse]) => {
                setOverview(overviewResponse.data.data || {});
                setNotifications(notificationResponse.data.data || []);
                setUnreadCount(notificationResponse.data.unreadCount || 0);
            })
            .catch(error => {
                if (error.code !== 'ERR_CANCELED') toast.error('Platform overview could not be loaded');
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, []);

    useEffect(() => load(), [load, refreshVersion]);

    const workspaces = useMemo(() => ([
        {
            label: 'Shops',
            description: 'Vendor status and effective plan access',
            path: '/super-admin/shops',
            icon: Store,
            permission: 'platform.shops.read'
        },
        {
            label: 'Subscriptions',
            description: 'Lifecycle actions and trial monitoring',
            path: '/super-admin/subscriptions',
            icon: CreditCard,
            permission: 'billing.read'
        },
        {
            label: 'Payment reviews',
            description: 'Approve or reject submitted payments',
            path: '/super-admin/payments',
            icon: WalletCards,
            permission: 'billing.read'
        },
        {
            label: 'Verification',
            description: 'Identity and compliance review queue',
            path: '/super-admin/vendor-verifications',
            icon: ShieldCheck,
            permission: 'compliance.verification.read'
        },
        {
            label: 'Platform alerts',
            description: 'Jobs, reconciliation, billing, and risk',
            path: '/super-admin/alerts',
            icon: AlertTriangle,
            permission: 'platform.alerts.view'
        },
        {
            label: 'Reports',
            description: 'Bounded commercial and operational totals',
            path: '/super-admin/reports',
            icon: Building2,
            permission: 'platform.reports.view'
        }
    ].filter(item => hasPlatformPermission(user, item.permission))), [user]);

    const markAllRead = async () => {
        try {
            await API.patch('/super-admin/notifications/read-all');
            setNotifications(previous => previous.map(item => ({
                ...item,
                readAt: item.readAt || new Date().toISOString()
            })));
            setUnreadCount(0);
        } catch {
            toast.error('Notifications could not be updated');
        }
    };

    const priorityAlerts = overview.alerts || {};
    const alertRows = [
        ['Pending verification', priorityAlerts.pendingVerifications, '/super-admin/vendor-verifications'],
        ['Expired verification deadlines', priorityAlerts.expiredVerifications, '/super-admin/vendor-verifications'],
        ['Open risk reports', priorityAlerts.openAbuseReports, '/super-admin/risk'],
        ['Suspended shops', priorityAlerts.suspendedShops, '/super-admin/shops?status=Suspended'],
        ['Failed order payments', priorityAlerts.failedPayments, '/super-admin/payments'],
        ['Domains awaiting review', priorityAlerts.pendingDomains, '/super-admin/domains']
    ].filter(([, value]) => Number(value) > 0);

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-950">Platform Overview</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Platform health and urgent decisions only. Configuration now lives in dedicated workspaces.
                    </p>
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

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <MetricCard label="Total shops" value={overview.shops || 0} />
                <MetricCard label="Active shops" value={overview.activeShops || 0} />
                <MetricCard label="Order GMV" value={formatMoney(overview.grossMerchandiseValue)} help="Rolling 30 days" />
                <MetricCard label="Subscription revenue" value={formatMoney(overview.subscriptionRevenue)} help="Approved in rolling 30 days" />
            </div>

            {workspaces.length > 0 && (
                <section aria-labelledby="workspace-heading">
                    <h2 id="workspace-heading" className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">Workspaces</h2>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {workspaces.map(item => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className="group flex min-h-24 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
                                >
                                    <span className="rounded-lg bg-slate-100 p-2.5 text-slate-600 group-hover:bg-white group-hover:text-indigo-700">
                                        <Icon className="h-5 w-5" />
                                    </span>
                                    <span>
                                        <span className="block font-black text-slate-950">{item.label}</span>
                                        <span className="mt-0.5 block text-xs text-slate-500">{item.description}</span>
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}

            <div className="grid gap-6 xl:grid-cols-2">
                <SectionCard title="Priority alerts" icon={AlertTriangle}>
                    {alertRows.length === 0 ? (
                        <EmptyState message="No urgent platform alerts right now." />
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {alertRows.map(([alertLabel, value, path]) => (
                                <Link key={alertLabel} to={path} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50">
                                    <span className="text-sm font-semibold text-slate-700">{alertLabel}</span>
                                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-sm font-black text-amber-800">{value}</span>
                                </Link>
                            ))}
                        </div>
                    )}
                </SectionCard>

                <SectionCard
                    title={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
                    icon={Bell}
                    actions={unreadCount > 0 && (
                        <button type="button" onClick={markAllRead} className="min-h-10 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
                            Mark all read
                        </button>
                    )}
                >
                    <div className="divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                            <EmptyState message="No platform notifications." />
                        ) : notifications.map(item => (
                            <article key={item._id} className={`px-5 py-4 ${item.readAt ? '' : 'bg-indigo-50/40'}`}>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-bold text-slate-950">{item.title}</h3>
                                    <StatusBadge value={item.severity || 'info'} />
                                </div>
                                <p className="mt-1 text-sm text-slate-500">{item.message}</p>
                            </article>
                        ))}
                    </div>
                </SectionCard>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <SectionCard title="Subscriptions by plan" icon={CreditCard}>
                    <dl className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
                        {Object.entries(overview.subscriptionsByPlan || {}).map(([plan, count]) => (
                            <div key={plan} className="rounded-xl bg-slate-50 p-3">
                                <dt className="text-xs font-bold uppercase text-slate-500">{label(plan)}</dt>
                                <dd className="mt-1 text-xl font-black">{count}</dd>
                            </div>
                        ))}
                    </dl>
                </SectionCard>
                <SectionCard title="Recent governance activity" icon={ShieldCheck}>
                    <div className="divide-y divide-slate-100">
                        {(overview.recentAudit || []).length === 0 ? (
                            <EmptyState message="No governance activity recorded yet." />
                        ) : overview.recentAudit.map(event => (
                            <article key={event._id} className="px-5 py-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-bold text-slate-950">{event.message || label(event.action)}</h3>
                                    <StatusBadge value={event.severity || 'info'} />
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                    {event.actorName || event.actorRole || 'System'} · {event.createdAt ? new Date(event.createdAt).toLocaleString() : '-'}
                                </p>
                            </article>
                        ))}
                    </div>
                </SectionCard>
            </div>
        </div>
    );
};

export default SuperAdminPanel;
