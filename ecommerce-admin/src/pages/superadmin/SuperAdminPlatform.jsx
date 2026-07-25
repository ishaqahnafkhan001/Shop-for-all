import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    BarChart3,
    CheckCircle2,
    Flag,
    KeyRound,
    RefreshCw,
    Search,
    Settings,
    Shield,
    XCircle
} from 'lucide-react';
import API from '../../api/api';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import {
    EmptyState,
    PaginationControls,
    ReasonModal,
    SectionCard,
    StatusBadge
} from './SuperAdminComponents.jsx';

const defaultPagination = { page: 1, limit: 20, total: 0, pages: 1 };
const modeFromPath = pathname => {
    if (pathname.endsWith('/roles')) return 'roles';
    if (pathname.endsWith('/sessions')) return 'sessions';
    if (pathname.endsWith('/reports')) return 'reports';
    if (pathname.endsWith('/settings')) return 'settings';
    return 'features';
};
const config = {
    features: {
        title: 'Feature Flags',
        description: 'Inspect the canonical feature registry and move to the appropriate plan or shop workspace to edit.',
        endpoint: '/super-admin/registry',
        icon: Flag
    },
    roles: {
        title: 'Roles & Permissions',
        description: 'Review the authoritative platform permission registry and role grants.',
        endpoint: '/super-admin/roles',
        icon: Shield
    },
    sessions: {
        title: 'Platform Sessions',
        description: 'Review platform identities and revoke all current JWT sessions for a selected operator.',
        endpoint: '/super-admin/sessions',
        icon: KeyRound
    },
    reports: {
        title: 'Platform Reports',
        description: 'Review bounded operational and subscription totals for a fixed reporting window.',
        endpoint: '/super-admin/reports',
        icon: BarChart3
    },
    settings: {
        title: 'Platform Settings',
        description: 'Check security and provider configuration readiness without exposing environment values.',
        endpoint: '/super-admin/settings',
        icon: Settings
    }
};

const label = value => String(value || '')
    .replace(/[._]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, character => character.toUpperCase());
const formatMoney = value => `৳${Number(value || 0).toLocaleString()}`;

const SuperAdminPlatform = () => {
    const location = useLocation();
    const mode = modeFromPath(location.pathname);
    const workspace = config[mode];
    const Icon = workspace.icon;
    const [data, setData] = useState(null);
    const [rows, setRows] = useState([]);
    const [pagination, setPagination] = useState(defaultPagination);
    const [filters, setFilters] = useState({ page: 1, search: '', role: 'all', status: 'all' });
    const [loading, setLoading] = useState(true);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [pendingUser, setPendingUser] = useState(null);
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const debouncedFilters = useDebouncedValue(filters, 300);

    useEffect(() => {
        const controller = new AbortController();
        const isList = mode === 'sessions';
        API.get(workspace.endpoint, {
            params: isList ? { ...debouncedFilters, limit: 20 } : (mode === 'reports' ? { days: 30 } : undefined),
            signal: controller.signal
        })
            .then(({ data: response }) => {
                if (isList) {
                    setRows(response.data || []);
                    setPagination(response.pagination || defaultPagination);
                } else {
                    setData(response.data || {});
                }
            })
            .catch(error => {
                if (error.code !== 'ERR_CANCELED') toast.error(`${workspace.title} could not be loaded`);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [debouncedFilters, mode, refreshVersion, workspace.endpoint, workspace.title]);

    const roles = useMemo(() => data?.roles || [], [data?.roles]);

    const revokeSessions = async () => {
        if (!pendingUser || !reason.trim()) return;
        setSaving(true);
        try {
            await API.post(`/super-admin/sessions/${pendingUser.id}/revoke`, { reason: reason.trim() });
            toast.success(`Sessions revoked for ${pendingUser.fullName || pendingUser.email}`);
            setPendingUser(null);
            setRefreshVersion(value => value + 1);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Sessions could not be revoked');
        } finally {
            setSaving(false);
        }
    };

    const renderFeatures = () => (
        <div className="space-y-5 p-5">
            <div className="flex flex-col gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="font-black text-indigo-950">Editing is intentionally separated</h2>
                    <p className="mt-1 text-sm text-indigo-800">
                        Plan capability changes belong in Vendor Plans. Per-shop overrides belong in the shop detail workspace.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link to="/super-admin/plans" className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white">Vendor Plans</Link>
                    <Link to="/super-admin/shops" className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700">Shops</Link>
                </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(data?.features || []).map(feature => (
                    <article key={feature.key} className="rounded-xl border border-slate-200 p-4">
                        <h3 className="font-black text-slate-950">{feature.label || label(feature.key)}</h3>
                        <p className="mt-1 text-xs text-slate-500">{feature.key}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                                {feature.category || 'Capability'}
                            </span>
                            {feature.editableCommercially === false && (
                                <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">Derived</span>
                            )}
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );

    const renderRoles = () => (
        <div className="grid gap-4 p-5 lg:grid-cols-2">
            {roles.map(role => (
                <article key={role.role} className="rounded-xl border border-slate-200 p-4">
                    <h2 className="font-black text-slate-950">{label(role.role)}</h2>
                    {role.permissions.includes('*') ? (
                        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">All platform permissions</p>
                    ) : (
                        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                            {role.permissions.map(permission => (
                                <li key={permission} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                    {permission}
                                </li>
                            ))}
                        </ul>
                    )}
                </article>
            ))}
        </div>
    );

    const renderSessions = () => (
        <>
            <div className="border-b border-slate-100 p-4">
                <div className="grid gap-2 sm:grid-cols-[minmax(12rem,20rem)_12rem_10rem]">
                    <label className="relative block">
                        <span className="sr-only">Search platform users</span>
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={filters.search}
                            onChange={event => setFilters(previous => ({ ...previous, search: event.target.value, page: 1 }))}
                            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm"
                            placeholder="Name or email"
                        />
                    </label>
                    <select value={filters.role} onChange={event => setFilters(previous => ({ ...previous, role: event.target.value, page: 1 }))} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm">
                        <option value="all">All roles</option>
                        {['SuperAdmin', 'BillingAdmin', 'ComplianceReviewer', 'TrustModerator', 'PlatformOps', 'SecurityAuditor', 'SupportAgent', 'SupportLead', 'TechnicalSupport'].map(role => <option key={role}>{role}</option>)}
                    </select>
                    <select value={filters.status} onChange={event => setFilters(previous => ({ ...previous, status: event.target.value, page: 1 }))} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm">
                        <option value="all">All status</option><option value="Active">Active</option><option value="Suspended">Suspended</option>
                    </select>
                </div>
            </div>
            <div className="divide-y divide-slate-100">
                {rows.length === 0 ? <EmptyState message="No platform users match these filters." /> : rows.map(user => (
                    <article key={user.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="font-black text-slate-950">{user.fullName}</h2>
                                <StatusBadge value={user.status} />
                            </div>
                            <p className="mt-1 text-sm text-slate-500">{user.email} · {label(user.role)}</p>
                            <p className="mt-1 text-xs text-slate-400">Session generation {user.sessionVersion}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setReason('');
                                setPendingUser(user);
                            }}
                            className="min-h-10 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-700"
                        >
                            Revoke sessions
                        </button>
                    </article>
                ))}
            </div>
            <PaginationControls pagination={pagination} onPageChange={page => setFilters(previous => ({ ...previous, page }))} />
        </>
    );

    const renderReports = () => (
        <div className="space-y-5 p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">New shops</p><p className="mt-1 text-2xl font-black">{data?.shopsCreated || 0}</p></div>
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">Orders</p><p className="mt-1 text-2xl font-black">{data?.orders || 0}</p></div>
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">Order GMV</p><p className="mt-1 text-2xl font-black">{formatMoney(data?.orderRevenue)}</p></div>
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">Subscription revenue</p><p className="mt-1 text-2xl font-black">{formatMoney(data?.approvedPayments?.amount)}</p></div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                {[
                    ['Subscriptions by plan', data?.subscriptionsByPlan],
                    ['Subscriptions by status', data?.subscriptionsByStatus]
                ].map(([title, values]) => (
                    <section key={title} className="rounded-xl border border-slate-200 p-4">
                        <h2 className="font-black">{title}</h2>
                        <dl className="mt-3 space-y-2">
                            {Object.entries(values || {}).map(([key, count]) => (
                                <div key={key} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                                    <dt>{label(key)}</dt><dd className="font-black">{count}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                ))}
            </div>
        </div>
    );

    const renderSettings = () => (
        <div className="grid gap-5 p-5 lg:grid-cols-2">
            {[
                ['Security', data?.security],
                ['Providers', data?.providers]
            ].map(([title, values]) => (
                <section key={title} className="rounded-xl border border-slate-200 p-4">
                    <h2 className="font-black">{title}</h2>
                    <div className="mt-3 space-y-2">
                        {Object.entries(values || {}).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                                <span className="text-sm text-slate-700">{label(key)}</span>
                                {typeof value === 'boolean' ? (
                                    value
                                        ? <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-label="Configured" />
                                        : <XCircle className="h-5 w-5 text-rose-600" aria-label="Not configured" />
                                ) : <span className="text-sm font-bold text-slate-900">{String(value)}</span>}
                            </div>
                        ))}
                    </div>
                </section>
            ))}
            <p className="lg:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                This page exposes configuration readiness only. Secret values are never returned to the browser.
            </p>
        </div>
    );

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Icon className="h-6 w-6 text-indigo-600" />
                        <h1 className="text-2xl font-black text-slate-950">{workspace.title}</h1>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{workspace.description}</p>
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
            <SectionCard title={workspace.title} icon={Icon}>
                {loading && !data && rows.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-slate-500">Loading {workspace.title.toLowerCase()}...</div>
                ) : mode === 'features' ? renderFeatures()
                    : mode === 'roles' ? renderRoles()
                        : mode === 'sessions' ? renderSessions()
                            : mode === 'reports' ? renderReports()
                                : renderSettings()}
            </SectionCard>
            <ReasonModal
                open={Boolean(pendingUser)}
                title="Revoke platform sessions"
                warning={`This invalidates all current tokens for ${pendingUser?.fullName || pendingUser?.email || 'this user'}.`}
                reason={reason}
                setReason={setReason}
                onCancel={() => setPendingUser(null)}
                onConfirm={revokeSessions}
                confirmLabel="Revoke sessions"
                loading={saving}
            />
        </div>
    );
};

export default SuperAdminPlatform;
