import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FileText, RefreshCw } from 'lucide-react';
import API from '../../api/api';

const statusOptions = ['requested', 'processing', 'completed', 'rejected'];

const PrivacyRequests = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ status: 'all', type: 'all' });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await API.get('/admin/privacy/data-requests', {
                params: {
                    status: filter.status,
                    type: filter.type
                }
            });
            setItems(data.data || []);
        } catch {
            toast.error('Failed to load privacy requests');
        } finally {
            setLoading(false);
        }
    }, [filter.status, filter.type]);

    useEffect(() => {
        const timer = window.setTimeout(load, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const updateStatus = async (id, status) => {
        try {
            await API.patch(`/admin/privacy/data-requests/${id}`, { status });
            toast.success('Privacy request updated');
            await load();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update request');
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">Privacy</p>
                    <h1 className="mt-1 text-2xl font-black text-slate-950">Data Requests</h1>
                    <p className="mt-1 text-sm text-slate-500">Track customer export and deletion requests for this shop.</p>
                </div>
                <button
                    type="button"
                    onClick={load}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </button>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                    <select
                        value={filter.status}
                        onChange={event => setFilter(prev => ({ ...prev, status: event.target.value }))}
                        className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    >
                        <option value="all">All statuses</option>
                        {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                    <select
                        value={filter.type}
                        onChange={event => setFilter(prev => ({ ...prev, type: event.target.value }))}
                        className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    >
                        <option value="all">All types</option>
                        <option value="export">Export</option>
                        <option value="delete">Delete</option>
                    </select>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                    <div className="flex items-center gap-2 font-black text-slate-950">
                        <FileText className="h-5 w-5 text-indigo-600" />
                        Requests
                    </div>
                </div>
                <div className="overflow-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Customer</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Requested</th>
                                <th className="px-4 py-3 text-right">Update</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Loading requests...</td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No privacy requests found.</td></tr>
                            ) : items.map(item => (
                                <tr key={item._id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-slate-950">{item.customer_id?.fullName || item.email || '-'}</p>
                                        <p className="text-xs text-slate-500">{item.customer_id?.email || item.email || item.phone || '-'}</p>
                                    </td>
                                    <td className="px-4 py-3 font-semibold capitalize text-slate-700">{item.type}</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize text-slate-700 ring-1 ring-slate-200">
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">{item.requestedAt ? new Date(item.requestedAt).toLocaleString() : '-'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <select
                                            value={item.status}
                                            onChange={event => updateStatus(item._id, event.target.value)}
                                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                        >
                                            {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default PrivacyRequests;
