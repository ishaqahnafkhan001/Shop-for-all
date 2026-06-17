import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { BadgeCheck, Clock, Eye, Search, ShieldAlert, X } from 'lucide-react';
import API from '../../api/api';
import { PaginationControls } from './SuperAdminComponents.jsx';

const statusTone = {
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    pending: 'bg-amber-50 text-amber-700 ring-amber-100',
    rejected: 'bg-rose-50 text-rose-700 ring-rose-100',
    suspended: 'bg-rose-50 text-rose-700 ring-rose-100',
    not_submitted: 'bg-slate-100 text-slate-600 ring-slate-200'
};

const StatusPill = ({ status }) => (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusTone[status] || statusTone.not_submitted}`}>
        {String(status || 'not_submitted').replace(/_/g, ' ')}
    </span>
);

const ImagePreview = ({ label, url }) => (
    <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
        {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <img src={url} alt={label} className="h-56 w-full object-cover" />
            </a>
        ) : (
            <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400">No image</div>
        )}
    </div>
);

const DetailModal = ({ item, onClose, onApprove, onReject, rejectReason, setRejectReason, actionLoading }) => {
    if (!item) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                    <div>
                        <h2 className="text-lg font-black text-slate-950">{item.shop?.shopName || 'Vendor verification'}</h2>
                        <p className="text-sm text-slate-500">{item.shop?.subdomain || 'No subdomain'}</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close verification detail">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-6 p-5">
                    <div className="grid gap-4 sm:grid-cols-4">
                        <div className="rounded-xl bg-slate-50 p-4">
                            <p className="text-xs font-bold uppercase text-slate-400">Status</p>
                            <div className="mt-2"><StatusPill status={item.status} /></div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4">
                            <p className="text-xs font-bold uppercase text-slate-400">Deadline</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">{item.verificationDeadline ? new Date(item.verificationDeadline).toLocaleDateString() : '-'}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4">
                            <p className="text-xs font-bold uppercase text-slate-400">Owner</p>
                            <p className="mt-2 truncate text-sm font-semibold text-slate-900">{item.owner?.email || '-'}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4">
                            <p className="text-xs font-bold uppercase text-slate-400">Submitted</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">{item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : '-'}</p>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 p-4">
                            <p className="text-xs font-bold uppercase text-slate-400">NID Name</p>
                            <p className="mt-2 font-semibold text-slate-950">{item.nidName || '-'}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-4">
                            <p className="text-xs font-bold uppercase text-slate-400">NID Number</p>
                            <p className="mt-2 font-semibold text-slate-950">{item.nidNumber || '-'}</p>
                        </div>
                    </div>

                    {item.rejectionReason && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                            <p className="font-bold">Previous rejection reason</p>
                            <p className="mt-1">{item.rejectionReason}</p>
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        <ImagePreview label="NID front" url={item.nidFrontUrl} />
                        <ImagePreview label="NID back" url={item.nidBackUrl} />
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <label className="text-sm font-bold text-slate-950" htmlFor="rejectionReason">Reject reason</label>
                        <textarea
                            id="rejectionReason"
                            value={rejectReason}
                            onChange={event => setRejectReason(event.target.value)}
                            rows={3}
                            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                            placeholder="Explain what the vendor must fix before resubmitting."
                        />
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                        <button
                            onClick={onReject}
                            disabled={actionLoading}
                            className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                        >
                            Reject
                        </button>
                        <button
                            onClick={onApprove}
                            disabled={actionLoading}
                            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                            Approve verification
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const VendorVerifications = () => {
    const [items, setItems] = useState([]);
    const [filters, setFilters] = useState({ page: 1, status: 'all', search: '', expired: false, suspended: false, deadlineSoon: false });
    const [selected, setSelected] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [summary, setSummary] = useState({});
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await API.get('/super-admin/vendor-verifications', {
                params: {
                    page: filters.page,
                    limit: 10,
                    status: filters.status,
                    search: filters.search || undefined,
                    expired: filters.expired ? 'true' : undefined,
                    suspended: filters.suspended ? 'true' : undefined,
                    deadlineSoon: filters.deadlineSoon ? 'true' : undefined
                }
            });
            setItems(data.data || []);
            setSummary(data.summary || {});
            setPagination(data.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
        } catch {
            toast.error('Failed to load vendor verifications');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        const timer = window.setTimeout(load, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const openDetail = async (item) => {
        setRejectReason('');
        try {
            const { data } = await API.get(`/super-admin/vendor-verifications/${item._id}`);
            setSelected(data.data || item);
        } catch {
            toast.error('Failed to load verification detail');
        }
    };

    const approveSelected = async () => {
        if (!selected) return;
        setActionLoading(true);
        try {
            await API.patch(`/super-admin/vendor-verifications/${selected._id}/approve`);
            toast.success('Verification approved');
            setSelected(null);
            await load();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to approve verification');
        } finally {
            setActionLoading(false);
        }
    };

    const rejectSelected = async () => {
        if (!selected) return;
        if (!rejectReason.trim()) {
            toast.error('Rejection reason is required');
            return;
        }
        setActionLoading(true);
        try {
            await API.patch(`/super-admin/vendor-verifications/${selected._id}/reject`, { rejectionReason: rejectReason.trim() });
            toast.success('Verification rejected');
            setSelected(null);
            await load();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to reject verification');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <div>
                <h1 className="text-2xl font-black text-slate-950">Vendor Verifications</h1>
                <p className="mt-1 text-sm text-slate-500">Review vendor NID submissions, approve verified stores, and reject unclear documents with a required reason.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
                {[
                    ['Pending', summary.pending],
                    ['Approved', summary.approved],
                    ['Rejected', summary.rejected],
                    ['Suspended', summary.suspendedByVerification],
                    ['Expired', summary.expiredDeadline],
                    ['Due in 3 days', summary.deadlineSoon]
                ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
                        <p className="mt-2 text-2xl font-black text-slate-950">{value || 0}</p>
                    </div>
                ))}
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-center">
                    <label className="relative block">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={filters.search}
                            onChange={event => setFilters(prev => ({ ...prev, search: event.target.value, page: 1 }))}
                            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                            placeholder="Search shop, owner, NID"
                        />
                    </label>
                    <select
                        value={filters.status}
                        onChange={event => setFilters(prev => ({ ...prev, status: event.target.value, page: 1 }))}
                        className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    >
                        <option value="all">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="suspended">Suspended</option>
                        <option value="not_submitted">Not submitted</option>
                    </select>
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700">
                        <input type="checkbox" checked={filters.expired} onChange={event => setFilters(prev => ({ ...prev, expired: event.target.checked, page: 1 }))} />
                        Expired
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700">
                        <input type="checkbox" checked={filters.suspended} onChange={event => setFilters(prev => ({ ...prev, suspended: event.target.checked, page: 1 }))} />
                        Suspended
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700">
                        <input type="checkbox" checked={filters.deadlineSoon} onChange={event => setFilters(prev => ({ ...prev, deadlineSoon: event.target.checked, page: 1 }))} />
                        <Clock className="h-4 w-4" />
                        Due soon
                    </label>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                    <div className="flex items-center gap-2 font-black text-slate-950">
                        <ShieldAlert className="h-5 w-5 text-indigo-600" />
                        NID submissions
                    </div>
                </div>
                <div className="overflow-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Shop</th>
                                <th className="px-4 py-3">Owner</th>
                                <th className="px-4 py-3">NID name</th>
                                <th className="px-4 py-3">Deadline</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Loading verifications...</td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No verification records found.</td></tr>
                            ) : items.map(item => (
                                <tr key={item._id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-slate-950">{item.shop?.shopName || '-'}</p>
                                        <p className="text-xs text-slate-500">{item.shop?.subdomain || '-'}</p>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{item.owner?.email || '-'}</td>
                                    <td className="px-4 py-3 text-slate-600">{item.nidName || '-'}</td>
                                    <td className="px-4 py-3 text-slate-600">{item.verificationDeadline ? new Date(item.verificationDeadline).toLocaleDateString() : '-'}</td>
                                    <td className="px-4 py-3"><StatusPill status={item.status} /></td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => openDetail(item)}
                                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                                        >
                                            <Eye className="h-4 w-4" />
                                            Review
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <PaginationControls pagination={pagination} onPageChange={page => setFilters(prev => ({ ...prev, page }))} />
            </section>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
                <div className="flex gap-2">
                    <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>Approval reactivates only stores suspended by verification. Manual Super Admin suspensions remain protected.</p>
                </div>
            </div>

            <DetailModal
                item={selected}
                onClose={() => setSelected(null)}
                onApprove={approveSelected}
                onReject={rejectSelected}
                rejectReason={rejectReason}
                setRejectReason={setRejectReason}
                actionLoading={actionLoading}
            />
        </div>
    );
};

export default VendorVerifications;
