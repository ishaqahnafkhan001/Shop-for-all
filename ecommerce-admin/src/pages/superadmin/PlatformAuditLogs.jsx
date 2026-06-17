import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ClipboardList, Eye, Search, X } from 'lucide-react';
import API from '../../api/api';
import { EmptyState, PaginationControls, SectionCard, StatusBadge } from './SuperAdminComponents.jsx';

const PlatformAuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
    const [filters, setFilters] = useState({ page: 1, search: '', severity: 'all', entityType: 'all', action: '' });
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await API.get('/super-admin/audit-logs', {
                params: { ...filters, limit: 20, action: filters.action || undefined }
            });
            setLogs(data.data || []);
            setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
        } catch {
            toast.error('Failed to load platform audit logs');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        const timer = window.setTimeout(load, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <div>
                <h1 className="text-2xl font-black text-slate-950">Platform Audit Logs</h1>
                <p className="mt-1 text-sm text-slate-500">Super Admin governance history across shops, announcements, domains, verification, and abuse handling.</p>
            </div>

            <SectionCard
                title="Audit Events"
                icon={ClipboardList}
                actions={(
                    <div className="grid gap-2 md:grid-cols-[minmax(12rem,18rem)_9rem_10rem_12rem]">
                        <label className="relative block">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input value={filters.search} onChange={event => setFilters(prev => ({ ...prev, search: event.target.value, page: 1 }))} className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" placeholder="Search logs" />
                        </label>
                        <select value={filters.severity} onChange={event => setFilters(prev => ({ ...prev, severity: event.target.value, page: 1 }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                            <option value="all">Severity</option>
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="critical">Critical</option>
                        </select>
                        <select value={filters.entityType} onChange={event => setFilters(prev => ({ ...prev, entityType: event.target.value, page: 1 }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                            <option value="all">Entity</option>
                            <option value="Shop">Shop</option>
                            <option value="VendorVerification">Verification</option>
                            <option value="PlatformAnnouncement">Announcement</option>
                            <option value="AbuseReport">Abuse Report</option>
                            <option value="VendorPlan">Plan</option>
                        </select>
                        <input value={filters.action} onChange={event => setFilters(prev => ({ ...prev, action: event.target.value, page: 1 }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Action filter" />
                    </div>
                )}
            >
                <div className="overflow-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Actor</th>
                                <th className="px-4 py-3">Action</th>
                                <th className="px-4 py-3">Entity</th>
                                <th className="px-4 py-3">Shop</th>
                                <th className="px-4 py-3">Message</th>
                                <th className="px-4 py-3">Severity</th>
                                <th className="px-4 py-3 text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Loading audit logs...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={8}><EmptyState message="No audit logs found." /></td></tr>
                            ) : logs.map(log => (
                                <tr key={log._id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-slate-600">{new Date(log.createdAt).toLocaleString()}</td>
                                    <td className="px-4 py-3">
                                        <p className="font-semibold text-slate-950">{log.actorName || 'System'}</p>
                                        <p className="text-xs text-slate-500">{log.actorEmail || '-'}</p>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{log.action}</td>
                                    <td className="px-4 py-3 text-slate-600">{log.entityType}<br /><span className="text-xs text-slate-400">{log.entityLabel}</span></td>
                                    <td className="px-4 py-3 text-slate-600">{log.shop_id?.shopName || '-'}</td>
                                    <td className="px-4 py-3 text-slate-600">{log.message}{log.reason && <p className="mt-1 text-xs text-rose-600">Reason: {log.reason}</p>}</td>
                                    <td className="px-4 py-3"><StatusBadge value={log.severity} /></td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => setSelected(log)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
                                            <Eye className="h-3.5 w-3.5" />
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <PaginationControls pagination={pagination} onPageChange={page => setFilters(prev => ({ ...prev, page }))} />
            </SectionCard>

            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <div>
                                <h2 className="text-lg font-black text-slate-950">{selected.action}</h2>
                                <p className="text-sm text-slate-500">{new Date(selected.createdAt).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close audit detail">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4 p-5 text-sm">
                            <p><span className="font-bold text-slate-950">Actor:</span> {selected.actorName || 'System'} / {selected.actorEmail || '-'}</p>
                            <p><span className="font-bold text-slate-950">Entity:</span> {selected.entityType} / {selected.entityLabel || '-'}</p>
                            <p><span className="font-bold text-slate-950">Shop:</span> {selected.shop_id?.shopName || '-'}</p>
                            <p><span className="font-bold text-slate-950">Message:</span> {selected.message}</p>
                            {selected.reason && <p><span className="font-bold text-slate-950">Reason:</span> {selected.reason}</p>}
                            <div>
                                <p className="mb-2 font-bold text-slate-950">Metadata</p>
                                <pre className="overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(selected.metadata || {}, null, 2)}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlatformAuditLogs;
