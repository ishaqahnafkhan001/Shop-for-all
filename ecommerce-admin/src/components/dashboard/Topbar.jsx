import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import { Link } from 'react-router-dom';
import {
    Bell,
    Check,
    ChevronRight,
    ExternalLink,
    Loader2,
    LogOut,
    Menu,
    Store
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/api';
import { hasFeature } from '../../utils/featureAccess';

const NOTIFICATION_REFRESH_MS = 60_000;
const RECENT_NOTIFICATION_LIMIT = 5;

const getNotificationId = (notification) =>
    String(notification?._id || notification?.id || '');

const getDisplayName = (user) =>
    user?.fullName ||
    user?.name ||
    user?.displayName ||
    user?.email?.split('@')?.[0] ||
    'Account';

const getInitial = (user) =>
    getDisplayName(user).trim().charAt(0).toUpperCase() || 'A';

const getStoreName = (user, isVendorUser) => {
    if (isVendorUser) {
        return user?.shop?.name || user?.shop?.shopName || 'Store admin';
    }

    return 'Platform workspace';
};

const formatNotificationDate = (value) => {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
};

const buildLiveStoreUrl = (user) => {
    const subdomain = user?.shop?.subdomain || user?.subdomain || 'demo';

    let baseDomain = import.meta.env.VITE_API_DOMAIN || 'localhost:3000';
    baseDomain = String(baseDomain)
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/+$/, '');

    const protocol = baseDomain.includes('localhost') ? 'http://' : 'https://';

    return `${protocol}${subdomain}.${baseDomain}`;
};

const IconButton = ({
                        children,
                        className = '',
                        ...props
                    }) => (
    <button
        type="button"
        className={[
            'grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 outline-none',
            'transition duration-200 hover:bg-slate-100 hover:text-slate-800',
            'focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
            className
        ].join(' ')}
        {...props}
    >
        {children}
    </button>
);

const StoreIdentity = ({ user, isVendorUser }) => {
    const storeName = getStoreName(user, isVendorUser);

    return (
        <div className="hidden min-w-0 items-center gap-3 md:flex">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                <Store className="h-[18px] w-[18px]" aria-hidden="true" />
            </div>

            <div className="min-w-0">
                <p className="truncate text-sm font-black tracking-[-0.01em] text-slate-950">
                    {storeName}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                    {isVendorUser ? 'Store workspace' : 'Admin workspace'}
                </p>
            </div>
        </div>
    );
};

const LiveStoreButton = ({ href }) => (
    <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={[
            'group hidden min-h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2',
            'text-sm font-bold text-slate-700 shadow-sm outline-none transition duration-200',
            'hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700',
            'focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:inline-flex'
        ].join(' ')}
    >
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:bg-white group-hover:text-indigo-600">
            <Store className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span>Live store</span>
        <ExternalLink
            className="h-3.5 w-3.5 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-indigo-500"
            aria-hidden="true"
        />
    </a>
);

const NotificationItem = ({ notification, onMarkRead }) => {
    const notificationId = getNotificationId(notification);
    const unread = !notification.readAt;

    return (
        <article
            className={[
                'group relative px-4 py-3.5 transition sm:px-5',
                unread ? 'bg-indigo-50/45 hover:bg-indigo-50/70' : 'bg-white hover:bg-slate-50/80'
            ].join(' ')}
        >
            {unread && (
                <span
                    className="absolute left-1.5 top-5 h-1.5 w-1.5 rounded-full bg-indigo-500 sm:left-2"
                    aria-hidden="true"
                />
            )}

            <div className="flex items-start gap-3">
                <div
                    className={[
                        'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border',
                        unread
                            ? 'border-indigo-100 bg-white text-indigo-600 shadow-sm'
                            : 'border-slate-100 bg-slate-50 text-slate-400'
                    ].join(' ')}
                >
                    <Bell className="h-4 w-4" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p
                                className={[
                                    'truncate text-sm text-slate-950',
                                    unread ? 'font-black' : 'font-bold'
                                ].join(' ')}
                            >
                                {notification.title || 'Notification'}
                            </p>

                            {notification.message && (
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                    {notification.message}
                                </p>
                            )}
                        </div>

                        {unread && notificationId && (
                            <button
                                type="button"
                                onClick={() => onMarkRead(notificationId)}
                                className={[
                                    'shrink-0 rounded-lg px-2 py-1 text-[11px] font-extrabold text-indigo-700 outline-none transition',
                                    'hover:bg-white hover:shadow-sm',
                                    'focus-visible:ring-2 focus-visible:ring-indigo-500'
                                ].join(' ')}
                                aria-label={`Mark ${notification.title || 'notification'} as read`}
                            >
                                Read
                            </button>
                        )}
                    </div>

                    {notification.createdAt && (
                        <time
                            className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400"
                            dateTime={notification.createdAt}
                        >
                            {formatNotificationDate(notification.createdAt)}
                        </time>
                    )}
                </div>
            </div>
        </article>
    );
};

const NotificationPopover = ({
                                 open,
                                 loading,
                                 unreadCount,
                                 notifications,
                                 onMarkRead,
                                 onClose
                             }) => {
    if (!open) return null;

    return (
        <div
            id="topbar-notification-popover"
            className={[
                'absolute right-0 top-full z-50 mt-3 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden',
                'rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]'
            ].join(' ')}
            role="region"
            aria-label="Recent notifications"
        >
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-5">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-black tracking-[-0.01em] text-slate-950">
                            Notifications
                        </h2>

                        {unreadCount > 0 && (
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700">
                                {unreadCount} unread
                            </span>
                        )}
                    </div>

                    <p className="mt-1 text-xs text-slate-400">
                        Your latest store activity
                    </p>
                </div>

                <Link
                    to="/dashboard/notifications"
                    onClick={onClose}
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-extrabold text-indigo-600 outline-none transition hover:text-indigo-800 focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                    View all
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
            </div>

            <div className="max-h-[22rem] overflow-y-auto overscroll-contain">
                {loading ? (
                    <div className="flex min-h-36 flex-col items-center justify-center px-5 py-8 text-center">
                        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" aria-hidden="true" />
                        <p className="mt-3 text-sm font-bold text-slate-700">
                            Loading notifications
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            Checking your latest activity…
                        </p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex min-h-40 flex-col items-center justify-center px-6 py-8 text-center">
                        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                            <Bell className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <p className="mt-3 text-sm font-black text-slate-800">
                            You’re all caught up
                        </p>
                        <p className="mt-1 max-w-[15rem] text-xs leading-5 text-slate-400">
                            New store notifications will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {notifications.map((notification) => (
                            <NotificationItem
                                key={getNotificationId(notification) || notification.createdAt}
                                notification={notification}
                                onMarkRead={onMarkRead}
                            />
                        ))}
                    </div>
                )}
            </div>

            {notifications.length > 0 && !loading && (
                <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:px-5">
                    <p className="text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                        Showing the latest {Math.min(notifications.length, RECENT_NOTIFICATION_LIMIT)}
                    </p>
                </div>
            )}
        </div>
    );
};

const UserIdentity = ({ user }) => (
    <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 py-1.5 pl-1.5 pr-2.5 sm:pr-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-xs font-black uppercase text-white shadow-sm shadow-indigo-600/20">
            {getInitial(user)}
        </div>

        <div className="hidden min-w-0 sm:block">
            <p className="max-w-[9rem] truncate text-xs font-black leading-4 text-slate-800">
                {getDisplayName(user)}
            </p>
            <p className="max-w-[9rem] truncate text-[10px] font-semibold leading-4 text-slate-400">
                {user?.role || 'Admin'}
            </p>
        </div>
    </div>
);

const Topbar = ({ onOpenMenu }) => {
    const { user, logout } = useAuth();

    const [notificationOpen, setNotificationOpen] = useState(false);
    const [notificationLoading, setNotificationLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);

    const notificationRef = useRef(null);

    const isVendorUser = ['VendorAdmin', 'VendorStaff'].includes(user?.role);
    const notificationsAvailable =
        isVendorUser && hasFeature(user, 'notifications');

    const liveStoreUrl = useMemo(
        () => buildLiveStoreUrl(user),
        [user]
    );

    const loadUnreadCount = useCallback(async () => {
        if (!user || !notificationsAvailable) {
            setUnreadCount(0);
            return;
        }

        try {
            const { data } = await API.get(
                '/admin/notifications/unread-count'
            );
            setUnreadCount(Number(data.data?.count || 0));
        } catch {
            setUnreadCount(0);
        }
    }, [notificationsAvailable, user]);

    const loadRecentNotifications = useCallback(async () => {
        if (!user || !notificationsAvailable) {
            setNotifications([]);
            return;
        }

        setNotificationLoading(true);

        try {
            const { data } = await API.get('/admin/notifications', {
                params: { limit: RECENT_NOTIFICATION_LIMIT }
            });

            setNotifications(
                Array.isArray(data.data) ? data.data : []
            );
        } catch {
            setNotifications([]);
        } finally {
            setNotificationLoading(false);
        }
    }, [notificationsAvailable, user]);

    useEffect(() => {
        if (!notificationsAvailable) {
            setNotificationOpen(false);
            setNotifications([]);
            setUnreadCount(0);
            return undefined;
        }

        const scheduleAfterPaint = window.requestIdleCallback
            ? (callback) => window.requestIdleCallback(callback)
            : (callback) => window.setTimeout(callback, 800);

        const cancelAfterPaint = window.cancelIdleCallback
            ? (handle) => window.cancelIdleCallback(handle)
            : (handle) => window.clearTimeout(handle);

        const initialHandle = scheduleAfterPaint(loadUnreadCount);
        const intervalHandle = window.setInterval(
            loadUnreadCount,
            NOTIFICATION_REFRESH_MS
        );

        return () => {
            cancelAfterPaint(initialHandle);
            window.clearInterval(intervalHandle);
        };
    }, [loadUnreadCount, notificationsAvailable]);

    useEffect(() => {
        if (!notificationOpen) return undefined;

        const handlePointerDown = (event) => {
            if (
                notificationRef.current &&
                !notificationRef.current.contains(event.target)
            ) {
                setNotificationOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setNotificationOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [notificationOpen]);

    const toggleNotifications = async () => {
        const nextOpen = !notificationOpen;
        setNotificationOpen(nextOpen);

        if (nextOpen) {
            await loadRecentNotifications();
        }
    };

    const markRead = async (notificationId) => {
        if (!notificationId) return;

        const target = notifications.find(
            (item) => getNotificationId(item) === String(notificationId)
        );

        if (!target || target.readAt) return;

        try {
            await API.patch(
                `/admin/notifications/${encodeURIComponent(notificationId)}/read`
            );

            const readAt = new Date().toISOString();

            setNotifications((current) =>
                current.map((item) =>
                    getNotificationId(item) === String(notificationId)
                        ? { ...item, readAt }
                        : item
                )
            );

            setUnreadCount((current) => Math.max(0, current - 1));
        } catch {
            // The full notifications page can recover if this quick action fails.
        }
    };

    return (
        <header
            className={[
                'sticky top-0 z-30 flex h-[76px] items-center border-b border-slate-200/80',
                'bg-white/90 px-3 backdrop-blur-xl sm:px-5 lg:px-6'
            ].join(' ')}
        >
            <div className="flex w-full min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <IconButton
                        onClick={onOpenMenu}
                        className="-ml-1 md:hidden"
                        aria-label="Open navigation"
                    >
                        <Menu className="h-5 w-5" aria-hidden="true" />
                    </IconButton>

                    <div className="md:hidden">
                        <p className="text-sm font-black tracking-[-0.02em] text-slate-950">
                            Dashboard
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400">
                            {isVendorUser ? 'Store workspace' : 'Admin workspace'}
                        </p>
                    </div>

                    <StoreIdentity
                        user={user}
                        isVendorUser={isVendorUser}
                    />
                </div>

                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    {isVendorUser && (
                        <LiveStoreButton href={liveStoreUrl} />
                    )}

                    {isVendorUser && notificationsAvailable && (
                        <div className="hidden h-6 w-px bg-slate-200 sm:block" />
                    )}

                    {notificationsAvailable && (
                        <div
                            ref={notificationRef}
                            className="relative"
                        >
                            <IconButton
                                onClick={toggleNotifications}
                                className={
                                    notificationOpen
                                        ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-700'
                                        : ''
                                }
                                aria-label={
                                    unreadCount > 0
                                        ? `Notifications, ${unreadCount} unread`
                                        : 'Notifications'
                                }
                                aria-expanded={notificationOpen}
                                aria-haspopup="true"
                                aria-controls="topbar-notification-popover"
                            >
                                <Bell
                                    className="h-[19px] w-[19px]"
                                    aria-hidden="true"
                                />

                                {unreadCount > 0 && (
                                    <span
                                        className={[
                                            'absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full',
                                            'border-2 border-white bg-rose-500 px-1 text-[9px] font-black leading-none text-white'
                                        ].join(' ')}
                                    >
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </IconButton>

                            <NotificationPopover
                                open={notificationOpen}
                                loading={notificationLoading}
                                unreadCount={unreadCount}
                                notifications={notifications}
                                onMarkRead={markRead}
                                onClose={() => setNotificationOpen(false)}
                            />
                        </div>
                    )}

                    <UserIdentity user={user} />

                    <IconButton
                        onClick={logout}
                        className="text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Log out"
                        aria-label="Log out"
                    >
                        <LogOut className="h-[19px] w-[19px]" aria-hidden="true" />
                    </IconButton>
                </div>
            </div>
        </header>
    );
};

export default Topbar;
