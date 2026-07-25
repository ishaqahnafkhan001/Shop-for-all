import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { RefreshCw, Search, ShieldAlert } from 'lucide-react';
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
const statuses = ['Open', 'Reviewing', 'Resolved', 'Dismissed'];

const SuperAdminRisk = () => {
    const { user } = useAuth();
    const canManage = hasPlatformPermission(user, 'risk.cases.manage');
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
        API.get('/super-admin/abuse-reports', {
            params: { ...debouncedFilters, limit: 20 },
            signal: controller.signal
        })
            .then(({ data }) => {
                setRows(data.data || []);
                setPagination(data.pagination || defaultPagination);
            })
            .catch(error => {
                if (error.code !== 'ERR_CANCELED') toast.error('Risk cases could not be loaded');
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [debouncedFilters, refreshVersion]);

    const persistStatus = async (report, status, actionReason = '') => {
        await API.patch(`/super-admin/abuse-reports/${report._id}/status`, {
            status,
            reason: actionReason,
            expectedVersion: report.version
        });
        toast.success(`Case marked ${status}`);
        setRefreshVersion(value => value + 1);
    };

    const changeStatus = (report, status) => {
        if (!canManage || status === report.status) return;
        if (!['Resolved', 'Dismissed'].includes(status)) {
            persistStatus(report, status).catch(error => {
                toast.error(error.response?.data?.error || 'Risk case could not be updated');
            });
            return;
        }
        setReason('');
        setPendingAction({ report, status });
    };

    const confirmAction = async () => {
        if (!pendingAction || !reason.trim()) return;
        setSaving(true);
        try {
            await persistStatus(pendingAction.report, pendingAction.status, reason.trim());
            setPendingAction(null);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Risk case could not be updated');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-950">Abuse & Risk</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Review reports in a dedicated queue. Reporter details stay hidden in list responses.
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
                title="Risk cases"
                icon={ShieldAlert}
                actions={(
                    <div className="grid gap-2 sm:grid-cols-[minmax(12rem,20rem)_11rem]">
                        <label className="relative block">
                            <span className="sr-only">Search risk cases</span>
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={filters.search}
                                onChange={event => setFilters(previous => ({
                                    ...previous,
                                    search: event.target.value,
                                    page: 1
                                }))}
                                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                placeholder="Shop, reason, or case text"
                            />
                        </label>
                        <select
                            aria-label="Risk case status"
                            value={filters.status}
                            onChange={event => setFilters(previous => ({
                                ...previous,
                                status: event.target.value,
                                page: 1
                            }))}
                            className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm"
                        >
                            <option value="all">All statuses</option>
                            {statuses.map(status => <option key={status}>{status}</option>)}
                        </select>
                    </div>
                )}
            >
                <div className="divide-y divide-slate-100">
                    {loading && rows.length === 0 ? (
                        <div className="px-5 py-10 text-center text-sm text-slate-500">Loading risk cases...</div>
                    ) : rows.length === 0 ? (
                        <EmptyState message="No risk cases match these filters." />
                    ) : rows.map(report => (
                        <article key={report._id} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_12rem]">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="font-black text-slate-950">{report.reason}</h2>
                                    <StatusBadge value={report.status} />
                                </div>
                                <p className="mt-1 text-sm text-slate-600">
                                    {report.shop?.shopName || 'Unknown shop'}
                                    {report.shop?.subdomain ? ` · ${report.shop.subdomain}` : ''}
                                </p>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">{report.details || 'No additional details.'}</p>
                                {report.internalNote && (
                                    <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                        Internal note: {report.internalNote}
                                    </p>
                                )}
                            </div>
                            <div>
                                {canManage ? (
                                    <select
                                        aria-label={`Status for ${report.reason}`}
                                        value={report.status}
                                        onChange={event => changeStatus(report, event.target.value)}
                                        className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold"
                                    >
                                        {statuses.map(status => <option key={status}>{status}</option>)}
                                    </select>
                                ) : <p className="text-xs text-slate-500">Read-only access</p>}
                                <p className="mt-2 text-xs text-slate-400">
                                    Updated {report.updatedAt ? new Date(report.updatedAt).toLocaleString() : '-'}
                                </p>
                            </div>
                        </article>
                    ))}
                </div>
                <PaginationControls
                    pagination={pagination}
                    onPageChange={page => setFilters(previous => ({ ...previous, page }))}
                />
            </SectionCard>

            <ReasonModal
                open={Boolean(pendingAction)}
                title={`${pendingAction?.status || 'Close'} risk case`}
                warning="Closing a risk case is a governance decision. Record the evidence or reason used."
                reason={reason}
                setReason={setReason}
                onCancel={() => setPendingAction(null)}
                onConfirm={confirmAction}
                confirmLabel={pendingAction?.status || 'Confirm'}
                loading={saving}
            />
        </div>
    );
};

export default SuperAdminRisk;
