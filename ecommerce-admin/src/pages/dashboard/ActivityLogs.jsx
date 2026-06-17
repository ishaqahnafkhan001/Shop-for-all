import { useCallback, useEffect, useState } from 'react';
import { History } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../api/api';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';

const ActivityLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ entityType: '', severity: '' });
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

    const fetchLogs = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const { data } = await API.get('/admin/audit-logs', {
                params: {
                    page,
                    limit: 25,
                    ...(filters.entityType ? { entityType: filters.entityType } : {}),
                    ...(filters.severity ? { severity: filters.severity } : {})
                }
            });
            setLogs(data.data || []);
            setPagination(data.pagination || { page, pages: 1, total: 0 });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to load activity logs');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        const timer = window.setTimeout(() => fetchLogs(1), 0);
        return () => window.clearTimeout(timer);
    }, [fetchLogs]);

    const columns = [
        {
            key: 'createdAt',
            label: 'Time',
            render: (row) => (
                <div>
                    <p className="text-sm font-semibold text-slate-900">{new Date(row.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleTimeString()}</p>
                </div>
            )
        },
        {
            key: 'actor',
            label: 'Actor',
            render: (row) => (
                <div>
                    <p className="font-medium text-slate-900">{row.actor?.name || row.actor?.role || 'System'}</p>
                    <p className="text-xs text-slate-500">{row.actor?.role}</p>
                </div>
            )
        },
        {
            key: 'action',
            label: 'Action',
            render: (row) => (
                <div>
                    <p className="font-semibold text-slate-900">{row.action}</p>
                    <p className="text-xs text-slate-500">{row.entityType} {row.entityLabel ? `· ${row.entityLabel}` : ''}</p>
                </div>
            )
        },
        {
            key: 'severity',
            label: 'Severity',
            render: (row) => (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold capitalize text-slate-700">
                    {row.severity}
                </span>
            )
        },
        {
            key: 'metadata',
            label: 'Details',
            render: (row) => (
                <span className="max-w-xs truncate text-xs text-slate-500">
                    {row.entityId ? String(row.entityId).slice(-6).toUpperCase() : 'No entity'}
                </span>
            )
        }
    ];

    return (
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <div>
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                    <History size={16} /> Activity logs
                </div>
                <h1 className="mt-2 text-2xl font-bold text-slate-950">Activity Logs</h1>
                <p className="mt-1 text-sm text-slate-500">A tenant-scoped audit trail for important admin actions.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-[180px_180px_auto]">
                    <select
                        value={filters.entityType}
                        onChange={(event) => setFilters(prev => ({ ...prev, entityType: event.target.value }))}
                        className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                        <option value="">All entities</option>
                        {['Product', 'Order', 'User', 'ReturnRequest'].map(item => <option key={item}>{item}</option>)}
                    </select>
                    <select
                        value={filters.severity}
                        onChange={(event) => setFilters(prev => ({ ...prev, severity: event.target.value }))}
                        className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                        <option value="">All severity</option>
                        {['info', 'warning', 'critical'].map(item => <option key={item}>{item}</option>)}
                    </select>
                    <Button variant="secondary" onClick={() => fetchLogs(1)}>Refresh</Button>
                </div>
            </div>

            {loading ? (
                <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-500">Loading activity...</div>
            ) : (
                <Table
                    columns={columns}
                    data={logs}
                    emptyTitle="No activity logs yet"
                    emptyDescription="Product, order, customer, return, and refund actions will appear here."
                />
            )}

            {pagination.pages > 1 && (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    <span>Page {pagination.page} of {pagination.pages} · {pagination.total} logs</span>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" disabled={pagination.page <= 1} onClick={() => fetchLogs(pagination.page - 1)}>Previous</Button>
                        <Button variant="secondary" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchLogs(pagination.page + 1)}>Next</Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivityLogs;
