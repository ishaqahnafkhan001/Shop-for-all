import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../api/api';
import Button from '../../components/ui/Button';
import PaginationBar from '../../components/ui/PaginationBar.jsx';
import { AdminEmptyState, AdminLoadingState } from '../../components/ui/AdminState.jsx';
import { isAbortError, useAbortableRequest } from '../../hooks/useAbortableRequest.js';

const typeStyles = {
    order: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    customer: 'bg-blue-50 text-blue-700 border-blue-100',
    return: 'bg-amber-50 text-amber-700 border-amber-100',
    refund: 'bg-teal-50 text-teal-700 border-teal-100',
    system: 'bg-slate-50 text-slate-700 border-slate-100'
};

const Notifications = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const runAbortable = useAbortableRequest();
    const fetchIdRef = useRef(0);

    const fetchNotifications = useCallback(async (page = 1) => {
        const fetchId = fetchIdRef.current + 1;
        fetchIdRef.current = fetchId;
        setLoading(true);
        try {
            await runAbortable(async ({ signal, isLatest }) => {
            const { data } = await API.get('/admin/notifications', { params: { page, limit: 25 }, signal });
            if (!isLatest() || fetchId !== fetchIdRef.current) return;
            setItems(data.data || []);
            setPagination(data.pagination || { page, pages: 1, total: 0 });
            });
        } catch (err) {
            if (isAbortError(err)) return;
            toast.error(err.response?.data?.error || 'Failed to load notifications');
        } finally {
            if (fetchId === fetchIdRef.current) setLoading(false);
        }
    }, [runAbortable]);

    useEffect(() => {
        const timer = window.setTimeout(() => fetchNotifications(1), 0);
        return () => window.clearTimeout(timer);
    }, [fetchNotifications]);

    const markRead = async (id) => {
        try {
            await API.patch(`/admin/notifications/${id}/read`);
            setItems(prev => prev.map(item => item._id === id ? { ...item, readAt: new Date().toISOString() } : item));
        } catch {
            toast.error('Failed to mark notification as read');
        }
    };

    const markAllRead = async () => {
        try {
            await API.patch('/admin/notifications/read-all');
            setItems(prev => prev.map(item => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
            toast.success('All notifications marked as read');
        } catch {
            toast.error('Failed to update notifications');
        }
    };

    const remove = async (id) => {
        try {
            await API.delete(`/admin/notifications/${id}`);
            setItems(prev => prev.filter(item => item._id !== id));
        } catch {
            toast.error('Failed to delete notification');
        }
    };

    return (
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-indigo-700">
                        <Bell size={16} /> Notification center
                    </div>
                    <h1 className="mt-2 text-2xl font-bold text-slate-950">Notifications</h1>
                    <p className="mt-1 text-sm text-slate-500">Important shop events, order alerts, customer registrations, and returns appear here.</p>
                </div>
                <Button variant="secondary" onClick={markAllRead}>
                    <CheckCheck size={16} /> Mark all read
                </Button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <AdminLoadingState
                        title="Loading notifications"
                        description="We are checking recent order, customer, return, and system updates."
                        className="rounded-none border-0 shadow-none"
                    />
                ) : items.length === 0 ? (
                    <AdminEmptyState
                        icon={Bell}
                        title="No notifications yet"
                        description="New orders, customers, returns, and refund updates will appear here."
                        className="rounded-none border-0 shadow-none"
                    />
                ) : (
                    <div className="divide-y divide-slate-100">
                        {items.map(item => (
                            <div key={item._id} className={`flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between ${item.readAt ? 'bg-white' : 'bg-indigo-50/40'}`}>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${typeStyles[item.type] || typeStyles.system}`}>
                                            {item.type}
                                        </span>
                                        {!item.readAt && <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white">New</span>}
                                        <span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
                                    </div>
                                    <h2 className="mt-2 text-base font-bold text-slate-950">{item.title}</h2>
                                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.message}</p>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                    {!item.readAt && (
                                        <Button size="sm" variant="secondary" onClick={() => markRead(item._id)}>Mark read</Button>
                                    )}
                                    <button
                                        onClick={() => remove(item._id)}
                                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                        aria-label="Delete notification"
                                    >
                                        <Trash2 size={17} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {(pagination.totalPages || pagination.pages || 1) > 1 && (
                <PaginationBar
                    pagination={pagination}
                    label="notifications"
                    onPrevious={() => fetchNotifications(pagination.page - 1)}
                    onNext={() => fetchNotifications(pagination.page + 1)}
                />
            )}
        </div>
    );
};

export default Notifications;
