import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Menu, ExternalLink, Store, Bell } from 'lucide-react';
import API from '../../api/api';

const Topbar = ({ onOpenMenu }) => {
    const { user, logout } = useAuth();
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);

    const subdomain = user?.shop?.subdomain || user?.subdomain || 'demo';

    let baseDomain = import.meta.env.VITE_API_DOMAIN || 'localhost:3000';
    baseDomain = baseDomain.replace(/^https?:\/\//, '');

    const protocol = baseDomain.includes('localhost') ? 'http://' : 'https://';
    const liveStoreUrl = `${protocol}${subdomain}.${baseDomain}`;

    const loadUnreadCount = useCallback(async () => {
        if (!user || user.role === 'SuperAdmin') return;
        try {
            const { data } = await API.get('/admin/notifications/unread-count');
            setUnreadCount(data.data?.count || 0);
        } catch {
            setUnreadCount(0);
        }
    }, [user]);

    const loadRecentNotifications = async () => {
        if (!user || user.role === 'SuperAdmin') return;
        try {
            const { data } = await API.get('/admin/notifications', { params: { limit: 5 } });
            setNotifications(data.data || []);
        } catch {
            setNotifications([]);
        }
    };

    useEffect(() => {
        const initialTimer = window.setTimeout(loadUnreadCount, 0);
        const timer = window.setInterval(loadUnreadCount, 60000);
        return () => {
            window.clearTimeout(initialTimer);
            window.clearInterval(timer);
        };
    }, [loadUnreadCount]);

    const toggleNotifications = async () => {
        const nextOpen = !notificationOpen;
        setNotificationOpen(nextOpen);
        if (nextOpen) await loadRecentNotifications();
    };

    const markRead = async (notificationId) => {
        try {
            await API.patch(`/admin/notifications/${notificationId}/read`);
            setNotifications(prev => prev.map(item => item._id === notificationId ? { ...item, readAt: new Date().toISOString() } : item));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch {
            // The full notification page can recover if a quick action fails.
        }
    };

    return (
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 shadow-sm backdrop-blur sm:px-6">
            <button
                onClick={onOpenMenu}
                className="rounded-lg p-2 -ml-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 md:hidden"
                aria-label="Open navigation"
            >
                <Menu className="h-6 w-6" />
            </button>

            <div className="hidden items-center gap-2 text-sm font-semibold text-slate-600 md:flex">
                <Store className="h-4 w-4 text-indigo-600" />
                <span>{user?.shop?.name || user?.shop?.shopName || 'Store admin'}</span>
            </div>

            <div className="flex items-center gap-3">

                {user?.role !== 'SuperAdmin' && (
                    <>
                        <a
                            href={liveStoreUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-indigo-700 sm:flex"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Live Store
                        </a>

                        <div className="hidden h-6 w-px bg-slate-200 sm:block"></div>
                    </>
                )}

                {user?.role !== 'SuperAdmin' && (
                    <div className="relative">
                        <button
                            onClick={toggleNotifications}
                            className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            aria-label="Open notifications"
                            aria-expanded={notificationOpen}
                        >
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {notificationOpen && (
                            <div className="absolute right-0 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-bold text-slate-950">Notifications</p>
                                        <p className="text-xs text-slate-500">{unreadCount} unread</p>
                                    </div>
                                    <Link
                                        to="/dashboard/notifications"
                                        onClick={() => setNotificationOpen(false)}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                    >
                                        View all
                                    </Link>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</div>
                                    ) : (
                                        notifications.map(item => (
                                            <div key={item._id} className={`border-b border-slate-100 px-4 py-3 last:border-0 ${item.readAt ? 'bg-white' : 'bg-indigo-50/50'}`}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-slate-950">{item.title}</p>
                                                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.message}</p>
                                                    </div>
                                                    {!item.readAt && (
                                                        <button
                                                            onClick={() => markRead(item._id)}
                                                            className="shrink-0 rounded-md px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-white"
                                                        >
                                                            Read
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="mt-2 text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold uppercase text-white shadow-sm">
                        {user?.fullName?.charAt(0) || 'V'}
                    </div>
                    <div className="hidden sm:flex flex-col">
                        <span className="mb-1 text-sm font-semibold leading-none text-slate-800">
                            {user?.fullName || 'Vendor Admin'}
                        </span>
                        <span className="text-xs leading-none text-slate-500">
                            {user?.role || 'Admin'}
                        </span>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    title="Log out"
                    aria-label="Log out"
                >
                    <LogOut className="h-5 w-5" />
                </button>
            </div>
        </header>
    );
};

export default Topbar;
