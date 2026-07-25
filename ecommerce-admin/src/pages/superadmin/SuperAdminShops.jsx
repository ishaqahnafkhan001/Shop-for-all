import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Building2, ExternalLink, RefreshCw, Search } from 'lucide-react';
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
const planLabel = value => String(value || 'beginner')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());

const SuperAdminShops = () => {
    const { user } = useAuth();
    const canChangeStatus = hasPlatformPermission(user, 'platform.shops.suspend');
    const [rows, setRows] = useState([]);
    const [filters, setFilters] = useState({ page: 1, search: '', status: 'all' });
    const [pagination, setPagination] = useState(defaultPagination);
    const [loading, setLoading] = useState(true);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [pendingAction, setPendingAction] = useState(null);
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const debouncedFilters = useDebouncedValue(filters, 300);

    useEffect(() => {
        const controller = new AbortController();
        API.get('/super-admin/shops', {
            params: { ...debouncedFilters, limit: 20 },
            signal: controller.signal
        })
            .then(({ data }) => {
                setRows(data.data || []);
                setPagination(data.pagination || defaultPagination);
            })
            .catch(error => {
                if (error.code !== 'ERR_CANCELED') toast.error('Shops could not be loaded');
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [debouncedFilters, refreshVersion]);

    const updateStatus = async (shop, status, actionReason = '') => {
        await API.patch(`/super-admin/shops/${shop._id}/status`, {
            status,
            reason: actionReason
        });
        toast.success(`Shop marked ${status}`);
        setRefreshVersion(value => value + 1);
    };

    const requestStatus = (shop, status) => {
        if (!canChangeStatus || status === shop.approvalStatus) return;
        if (status !== 'Suspended') {
            updateStatus(shop, status).catch(error => {
                toast.error(error.response?.data?.error || 'Shop status could not be updated');
            });
            return;
        }
        setReason('');
        setPendingAction({ shop, status });
    };

    const confirmStatus = async () => {
        if (!pendingAction || !reason.trim()) return;
        setSaving(true);
        try {
            await updateStatus(pendingAction.shop, pendingAction.status, reason.trim());
            setPendingAction(null);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Shop status could not be updated');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-950">Shops</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Search vendor stores, review their effective subscription, and open a focused shop workspace.
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

            <SectionCard
                title="Vendor stores"
                icon={Building2}
                actions={(
                    <div className="grid gap-2 sm:grid-cols-[minmax(12rem,20rem)_11rem]">
                        <label className="relative block">
                            <span className="sr-only">Search shops</span>
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={filters.search}
                                onChange={event => setFilters(previous => ({
                                    ...previous,
                                    search: event.target.value,
                                    page: 1
                                }))}
                                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                placeholder="Name, subdomain, or owner"
                            />
                        </label>
                        <select
                            aria-label="Shop status"
                            value={filters.status}
                            onChange={event => setFilters(previous => ({
                                ...previous,
                                status: event.target.value,
                                page: 1
                            }))}
                            className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm"
                        >
                            <option value="all">All statuses</option>
                            <option value="Approved">Approved</option>
                            <option value="Pending">Pending</option>
                            <option value="Suspended">Suspended</option>
                        </select>
                    </div>
                )}
            >
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Shop</th>
                                <th className="px-4 py-3">Owner</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Subscription</th>
                                <th className="px-4 py-3">Trial</th>
                                <th className="px-4 py-3">Access summary</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && rows.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Loading shops...</td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={7}><EmptyState message="No shops match these filters." /></td></tr>
                            ) : rows.map(shop => {
                                const enabledCount = Object.values(shop.effectiveFeatures || {}).filter(Boolean).length;
                                const effectivePlan = shop.billing?.effectivePlan ||
                                    shop.subscription?.activePlanSlug ||
                                    'beginner';
                                return (
                                    <tr key={shop._id} className="align-top hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-slate-950">{shop.shopName}</p>
                                            <p className="text-xs text-slate-500">{shop.subdomain}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-slate-700">{shop.owner?.fullName || '-'}</p>
                                            <p className="text-xs text-slate-500">{shop.owner?.email || ''}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            {canChangeStatus ? (
                                                <select
                                                    value={shop.approvalStatus}
                                                    onChange={event => requestStatus(shop, event.target.value)}
                                                    aria-label={`Status for ${shop.shopName}`}
                                                    className="min-h-10 rounded-lg border border-slate-200 px-2"
                                                >
                                                    <option value="Pending">Pending</option>
                                                    <option value="Approved">Approved</option>
                                                    <option value="Suspended">Suspended</option>
                                                </select>
                                            ) : <StatusBadge value={shop.approvalStatus} />}
                                            {shop.suspensionReason && (
                                                <p className="mt-1 max-w-xs text-xs text-rose-600">{shop.suspensionReason}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-slate-900">{planLabel(effectivePlan)}</p>
                                            <StatusBadge value={shop.billing?.status || shop.subscription?.status || 'trialing'} />
                                            {shop.billing?.pendingPlan && (
                                                <p className="mt-1 text-xs text-indigo-600">Pending: {shop.billing.pendingPlan}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {shop.billing?.trialDaysLeft === null ||
                                            shop.billing?.trialDaysLeft === undefined
                                                ? '-'
                                                : `${Math.max(0, shop.billing.trialDaysLeft)} days`}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-slate-700">
                                                {enabledCount} optional {enabledCount === 1 ? 'capability' : 'capabilities'}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Resolved from the effective {planLabel(effectivePlan)} plan
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                to={`/super-admin/shops/${shop._id}`}
                                                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100"
                                            >
                                                Open <ExternalLink className="h-3.5 w-3.5" />
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <PaginationControls
                    pagination={pagination}
                    onPageChange={page => setFilters(previous => ({ ...previous, page }))}
                />
            </SectionCard>

            <ReasonModal
                open={Boolean(pendingAction)}
                title="Suspend shop"
                warning={`Suspending ${pendingAction?.shop?.shopName || 'this shop'} blocks its storefront. Record a clear governance reason.`}
                reason={reason}
                setReason={setReason}
                onCancel={() => setPendingAction(null)}
                onConfirm={confirmStatus}
                confirmLabel="Suspend shop"
                loading={saving}
            />
        </div>
    );
};

export default SuperAdminShops;
