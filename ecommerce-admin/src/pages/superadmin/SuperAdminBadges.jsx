import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Eye,
    RefreshCcw,
    Search,
    ShieldCheck,
    X
} from 'lucide-react';
import API from '../../api/api';
import { EmptyState, PaginationControls, ReasonModal, SectionCard, StatusBadge } from './SuperAdminComponents.jsx';

const statuses = [
    'all',
    'pending_analysis',
    'analyzing',
    'pending_super_admin_review',
    'approved',
    'rejected',
    'revoked'
];

const recommendations = ['all', 'approve', 'review', 'reject'];

const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const labelize = (value) => String(value || '-').replace(/_/g, ' ');

const scoreTone = (score) => {
    if (score >= 85) return 'text-emerald-700 bg-emerald-50 ring-emerald-100';
    if (score >= 70) return 'text-amber-700 bg-amber-50 ring-amber-100';
    return 'text-rose-700 bg-rose-50 ring-rose-100';
};

const Metric = ({ label, value }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-2 text-lg font-black text-slate-950">{value ?? '-'}</p>
    </div>
);

const FindingList = ({ title, items = [], tone = 'slate' }) => {
    const toneClass = tone === 'rose'
        ? 'border-rose-100 bg-rose-50 text-rose-900'
        : 'border-emerald-100 bg-emerald-50 text-emerald-900';

    return (
        <div className={`rounded-2xl border p-4 ${toneClass}`}>
            <p className="text-sm font-black">{title}</p>
            {items.length ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
                    {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                </ul>
            ) : (
                <p className="mt-3 text-sm leading-6 opacity-80">No findings recorded.</p>
            )}
        </div>
    );
};

const DetailModal = ({ application, onClose, onApprove, onReject, onRevoke, onRerun, actionLoading }) => {
    if (!application) return null;

    const snapshot = application.eligibilitySnapshot || {};
    const findings = application.analysisFindings || {};
    const shop = application.shop || {};

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-slate-50 shadow-2xl">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-black text-slate-950">{shop.shopName || 'Badge application'}</h2>
                            <StatusBadge value={application.status} />
                            {application.recommendation && <StatusBadge value={application.recommendation} />}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                            {shop.subdomain || 'No subdomain'} · requested {formatDate(application.createdAt)}
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close badge detail">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-6 p-5">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <Metric label="Plan" value={snapshot.plan || shop.plan?.name || '-'} />
                        <Metric label="Subscription" value={snapshot.subscriptionStatus || '-'} />
                        <Metric label="Verification" value={snapshot.verificationStatus || shop.verification?.status || '-'} />
                        <Metric label="Shop age" value={`${snapshot.shopAgeDays || 0} days`} />
                        <Metric label="Delivered orders" value={snapshot.completedSales || 0} />
                        <Metric label="Facebook link" value={snapshot.facebookLinkPresent ? 'Yes' : 'No'} />
                        <Metric label="Average rating" value={snapshot.averageRating || 0} />
                        <Metric label="Review count" value={snapshot.reviewCount || 0} />
                        <Metric label="Abuse reports" value={snapshot.unresolvedAbuseReports || 0} />
                        <Metric label="Refund rate" value={`${Math.round(Number(snapshot.refundRate || 0) * 100)}%`} />
                    </div>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
                            <div className="rounded-2xl bg-slate-950 p-5 text-white">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Analysis score</p>
                                <p className="mt-3 text-5xl font-black">{application.analysisScore ?? 0}</p>
                                <p className="mt-1 text-sm text-slate-300">out of 100</p>
                                {application.recommendation && (
                                    <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black capitalize ring-1 ${scoreTone(application.analysisScore || 0)}`}>
                                        {application.recommendation}
                                    </span>
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-950">Analysis summary</h3>
                                <p className="mt-2 text-sm leading-7 text-slate-600">
                                    {application.analysisSummary || 'Analysis has not completed yet.'}
                                </p>
                                {findings.vendorSummary && (
                                    <p className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm leading-6 text-indigo-900">
                                        Vendor summary: {findings.vendorSummary}
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <FindingList title="Positive findings" items={findings.positives || []} />
                        <FindingList title="Risk findings" items={findings.risks || []} tone="rose" />
                    </div>

                    {application.superAdminReason && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                            <p className="font-black">Super Admin reason</p>
                            <p className="mt-1">{application.superAdminReason}</p>
                        </div>
                    )}

                    <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                        <button
                            onClick={onRerun}
                            disabled={actionLoading}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            <RefreshCcw className="h-4 w-4" />
                            Rerun analysis
                        </button>
                        <button
                            onClick={onRevoke}
                            disabled={actionLoading}
                            className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        >
                            Revoke
                        </button>
                        <button
                            onClick={onReject}
                            disabled={actionLoading}
                            className="rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                        >
                            Reject
                        </button>
                        <button
                            onClick={onApprove}
                            disabled={actionLoading}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Approve badge
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SuperAdminBadges = () => {
    const [items, setItems] = useState([]);
    const [selected, setSelected] = useState(null);
    const [filters, setFilters] = useState({ page: 1, status: 'all', recommendation: 'all' });
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [reasonModal, setReasonModal] = useState(null);
    const [reason, setReason] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await API.get('/super-admin/badges', {
                params: {
                    page: filters.page,
                    limit: 20,
                    status: filters.status === 'all' ? undefined : filters.status,
                    recommendation: filters.recommendation === 'all' ? undefined : filters.recommendation
                }
            });
            setItems(data.data || []);
            setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to load badge applications');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        const timer = window.setTimeout(load, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const overview = useMemo(() => {
        return items.reduce((acc, item) => {
            acc.total += 1;
            if (item.status === 'pending_super_admin_review') acc.ready += 1;
            if (item.status === 'approved') acc.approved += 1;
            if (item.status === 'rejected') acc.rejected += 1;
            return acc;
        }, { total: 0, ready: 0, approved: 0, rejected: 0 });
    }, [items]);

    const openDetail = async (item) => {
        try {
            const { data } = await API.get(`/super-admin/badges/${item.id}`);
            setSelected(data.data || item);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to load badge detail');
        }
    };

    const runAction = async (request, successMessage) => {
        setActionLoading(true);
        try {
            await request();
            toast.success(successMessage);
            setSelected(null);
            setReasonModal(null);
            setReason('');
            await load();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    const approveSelected = () => {
        if (!selected) return;
        runAction(() => API.patch(`/super-admin/badges/${selected.id}/approve`, { reason: 'Approved after Super Admin review.' }), 'Badge approved');
    };

    const rerunSelected = () => {
        if (!selected) return;
        runAction(() => API.post(`/super-admin/badges/${selected.id}/rerun-analysis`), 'Badge analysis queued');
    };

    const openReasonAction = (type) => {
        const labels = {
            reject: {
                title: 'Reject badge request',
                warning: 'Rejection tells the vendor why the badge was not approved. A clear reason is required.',
                confirmLabel: 'Reject request'
            },
            revoke: {
                title: 'Revoke trusted badge',
                warning: 'Revocation removes the public badge from the storefront. A governance reason is required.',
                confirmLabel: 'Revoke badge'
            }
        };
        setReason('');
        setReasonModal({ type, ...labels[type] });
    };

    const confirmReasonAction = () => {
        if (!selected || !reasonModal || !reason.trim()) return;
        const type = reasonModal.type;
        runAction(
            () => API.patch(`/super-admin/badges/${selected.id}/${type}`, { reason: reason.trim() }),
            type === 'reject' ? 'Badge request rejected' : 'Badge revoked'
        );
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-950">Trusted Badges</h1>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                        Review store quality analysis before approving or revoking public trust badges. Paid plans never approve badges automatically.
                    </p>
                </div>
                <Link to="/super-admin" className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:text-indigo-900">
                    Back to overview <ArrowRight className="h-4 w-4" />
                </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Loaded applications" value={overview.total} />
                <Metric label="Ready for review" value={overview.ready} />
                <Metric label="Approved" value={overview.approved} />
                <Metric label="Rejected" value={overview.rejected} />
            </div>

            <SectionCard
                title="Badge application queue"
                icon={ShieldCheck}
                actions={(
                    <div className="grid gap-2 sm:grid-cols-2">
                        <label className="relative block">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <select
                                value={filters.status}
                                onChange={event => setFilters(prev => ({ ...prev, page: 1, status: event.target.value }))}
                                className="h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                            >
                                {statuses.map(status => <option key={status} value={status}>{labelize(status)}</option>)}
                            </select>
                        </label>
                        <select
                            value={filters.recommendation}
                            onChange={event => setFilters(prev => ({ ...prev, page: 1, recommendation: event.target.value }))}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        >
                            {recommendations.map(value => <option key={value} value={value}>{labelize(value)}</option>)}
                        </select>
                    </div>
                )}
            >
                {loading ? (
                    <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm font-semibold text-slate-500">
                        <RefreshCcw className="h-4 w-4 animate-spin" />
                        Loading badge applications...
                    </div>
                ) : items.length === 0 ? (
                    <EmptyState message="No badge applications match these filters." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-5 py-3 font-black">Shop</th>
                                    <th className="px-5 py-3 font-black">Status</th>
                                    <th className="px-5 py-3 font-black">Score</th>
                                    <th className="px-5 py-3 font-black">Recommendation</th>
                                    <th className="px-5 py-3 font-black">Signals</th>
                                    <th className="px-5 py-3 font-black text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {items.map(item => {
                                    const snapshot = item.eligibilitySnapshot || {};
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="px-5 py-4">
                                                <p className="font-black text-slate-950">{item.shop?.shopName || '-'}</p>
                                                <p className="mt-1 text-xs text-slate-500">{item.shop?.subdomain || '-'} · {item.owner?.email || 'No owner email'}</p>
                                            </td>
                                            <td className="px-5 py-4"><StatusBadge value={item.status} /></td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${scoreTone(item.analysisScore || 0)}`}>
                                                    {item.analysisScore ?? 0}/100
                                                </span>
                                            </td>
                                            <td className="px-5 py-4"><StatusBadge value={item.recommendation || 'review'} /></td>
                                            <td className="px-5 py-4 text-xs leading-5 text-slate-500">
                                                <p>{snapshot.completedSales || 0} delivered orders</p>
                                                <p>{snapshot.averageRating || 0} rating · {snapshot.reviewCount || 0} reviews</p>
                                                <p>{snapshot.facebookLinkPresent ? 'Facebook linked' : 'No Facebook link'}</p>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <button
                                                    onClick={() => openDetail(item)}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    Review
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                <PaginationControls
                    pagination={pagination}
                    onPageChange={page => setFilters(prev => ({ ...prev, page }))}
                />
            </SectionCard>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <p>
                        Approve badges only after reviewing the analysis. The public badge is hidden automatically if the shop is inactive,
                        suspended, unverified, revoked, or not on an active subscription.
                    </p>
                </div>
            </div>

            <DetailModal
                application={selected}
                onClose={() => setSelected(null)}
                onApprove={approveSelected}
                onReject={() => openReasonAction('reject')}
                onRevoke={() => openReasonAction('revoke')}
                onRerun={rerunSelected}
                actionLoading={actionLoading}
            />

            <ReasonModal
                open={Boolean(reasonModal)}
                title={reasonModal?.title}
                warning={reasonModal?.warning}
                reason={reason}
                setReason={setReason}
                onCancel={() => setReasonModal(null)}
                onConfirm={confirmReasonAction}
                confirmLabel={reasonModal?.confirmLabel}
                loading={actionLoading}
            />
        </div>
    );
};

export default SuperAdminBadges;
