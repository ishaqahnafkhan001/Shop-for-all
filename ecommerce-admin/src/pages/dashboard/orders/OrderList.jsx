import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
    CheckCircle,
    Clock,
    Eye,
    Package,
    Search,
    Send,
    Truck,
    X,
    XCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../../api/api';
import Table from '../../../components/ui/Table';
import { AdminEmptyState, AdminLoadingState } from '../../../components/ui/AdminState.jsx';
import PaginationBar from '../../../components/ui/PaginationBar.jsx';
import PageRefreshButton from '../../../components/ui/PageRefreshButton.jsx';
import { isAbortError, useAbortableRequest } from '../../../hooks/useAbortableRequest.js';
import useDebouncedValue from '../../../hooks/useDebouncedValue.js';

const OrderDetailsModal = lazy(() => import('../../../components/dashboard/OrderDetailsModal'));
const PathaoSyncModal = lazy(() => import('./PathaoSyncModal'));
const EmailNotificationModal = lazy(() => import('../../../components/order/EmailNotificationModal.jsx'));

const STATUS_OPTIONS = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];

const OrderList = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [courierSettings, setCourierSettings] = useState(null);
    const [retryingOrderId, setRetryingOrderId] = useState(null);
    const [statusUpdatingOrderId, setStatusUpdatingOrderId] = useState(null);
    const [pathaoModalOpen, setPathaoModalOpen] = useState(false);
    const [orderToSync, setOrderToSync] = useState(null);
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [pendingStatusUpdate, setPendingStatusUpdate] = useState({ order: null, newStatus: '' });

    const runAbortable = useAbortableRequest();
    const fetchIdRef = useRef(0);
    const debouncedSearchQuery = useDebouncedValue(searchQuery, 350);

    const fetchOrders = useCallback(async (page = 1) => {
        const fetchId = fetchIdRef.current + 1;
        fetchIdRef.current = fetchId;
        setLoading(true);

        try {
            await runAbortable(async ({ signal, isLatest }) => {
                const { data } = await API.get('/admin/orders', {
                    params: {
                        page,
                        limit: 25,
                        search: debouncedSearchQuery || undefined
                    },
                    signal
                });

                if (!isLatest() || fetchId !== fetchIdRef.current) return;

                setOrders(data.data || []);
                setPagination(data.pagination || {
                    page,
                    pages: 1,
                    total: data.data?.length || 0
                });
            });
        } catch (error) {
            if (isAbortError(error)) return;
            toast.error('Failed to load orders');
        } finally {
            if (fetchId === fetchIdRef.current) setLoading(false);
        }
    }, [debouncedSearchQuery, runAbortable]);

    useEffect(() => {
        const timer = setTimeout(() => fetchOrders(1), 0);
        return () => clearTimeout(timer);
    }, [fetchOrders]);

    useEffect(() => {
        API.get('/admin/shipping/couriers')
            .then(({ data }) => setCourierSettings(data.data || null))
            .catch(() => setCourierSettings(null));
    }, []);

    const getCourierStatus = (order) => {
        const shipment = order?.courierShipment || {};

        if (shipment.trackingId || shipment.status) {
            return {
                provider: shipment.provider || order.shippingProvider || 'courier',
                status: shipment.trackingId ? 'synced' : shipment.status,
                hasShipment: Boolean(shipment.trackingId),
                error: shipment.lastError || order.pathaoLastError || ''
            };
        }

        if (order?.isPathaoSynced) {
            return {
                provider: 'pathao',
                status: 'synced',
                hasShipment: true,
                error: ''
            };
        }

        return {
            provider: order?.shippingProvider || 'pathao',
            status: order?.pathaoSyncStatus || '',
            hasShipment: Boolean(order?.isPathaoSynced),
            error: order?.pathaoLastError || ''
        };
    };

    const updateStatusInDB = async (orderId, newStatus, options = {}) => {
        try {
            setStatusUpdatingOrderId(orderId);
            setOrders((previous) => previous.map((order) => (
                order._id === orderId ? { ...order, status: newStatus } : order
            )));

            const { data } = await API.patch(`/admin/orders/${orderId}/status`, {
                status: newStatus,
                ...options
            });

            if (data?.data) {
                setOrders((previous) => previous.map((order) => (
                    order._id === orderId ? data.data : order
                )));
            }

            toast.success(`Order status updated to ${newStatus}`);
            if (data?.notification?.sent) toast.success('Customer email accepted by provider');
            else if (options.notifyCustomer) toast.error('Order status changed, but the customer email was not accepted. Check your email settings.');

            return data?.data || true;
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update status');
            fetchOrders(pagination.page);
            return null;
        } finally {
            setStatusUpdatingOrderId(null);
        }
    };

    const handleStatusChangeClick = (order, newStatus) => {
        if (!newStatus || newStatus === order.status) return;

        if (newStatus === 'Confirmed' && !getCourierStatus(order).hasShipment) {
            setOrderToSync(order);
            setPathaoModalOpen(true);
            return;
        }

        if (newStatus === 'Confirmed') {
            updateStatusInDB(order._id, newStatus, { notifyCustomer: true });
            return;
        }

        setPendingStatusUpdate({ order, newStatus });
        setEmailModalOpen(true);
    };

    const handleEmailModalDecision = async (shouldSendEmail, emailData = null) => {
        const { order, newStatus } = pendingStatusUpdate;
        setEmailModalOpen(false);

        if (!order || !newStatus) return;

        await updateStatusInDB(order._id, newStatus, {
            notifyCustomer: shouldSendEmail,
            emailSubject: emailData?.subject,
            emailMessage: emailData?.message
        });
    };

    const handlePathaoSuccess = (updatedOrder) => {
        if (!updatedOrder?._id) {
            fetchOrders(pagination.page);
            return;
        }

        setOrders((previous) => previous.map((order) => (
            order._id === updatedOrder._id ? updatedOrder : order
        )));
    };

    const handleRetryCourierQueue = async (order) => {
        const courierStatus = getCourierStatus(order);
        setRetryingOrderId(order._id);

        try {
            const { data } = courierStatus.provider === 'redx'
                ? await API.post(`/admin/orders/${order._id}/courier`, {
                    provider: 'redx',
                    retry: true
                })
                : await API.post(`/admin/orders/${order._id}/pathao`, {
                    retry: true
                });

            toast.success(data.message || 'Courier retry queued');

            if (data.data?._id) {
                setOrders((previous) => previous.map((currentOrder) => (
                    currentOrder._id === data.data._id ? data.data : currentOrder
                )));
            } else {
                fetchOrders(pagination.page);
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to retry courier queue');
        } finally {
            setRetryingOrderId(null);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Pending': return 'border-amber-200 bg-amber-50 text-amber-700';
            case 'Confirmed': return 'border-sky-200 bg-sky-50 text-sky-700';
            case 'Processing': return 'border-blue-200 bg-blue-50 text-blue-700';
            case 'Shipped': return 'border-violet-200 bg-violet-50 text-violet-700';
            case 'Delivered': return 'border-emerald-200 bg-emerald-50 text-emerald-700';
            case 'Cancelled': return 'border-rose-200 bg-rose-50 text-rose-700';
            case 'Returned': return 'border-orange-200 bg-orange-50 text-orange-700';
            default: return 'border-slate-200 bg-slate-50 text-slate-700';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Pending': return <Clock size={13} aria-hidden="true" />;
            case 'Processing': return <Package size={13} aria-hidden="true" />;
            case 'Shipped': return <Truck size={13} aria-hidden="true" />;
            case 'Delivered': return <CheckCircle size={13} aria-hidden="true" />;
            case 'Cancelled':
            case 'Returned': return <XCircle size={13} aria-hidden="true" />;
            default: return null;
        }
    };

    const getCourierStatusStyle = (status) => {
        switch (status) {
            case 'queued': return 'border-amber-200 bg-amber-50 text-amber-700';
            case 'syncing': return 'border-blue-200 bg-blue-50 text-blue-700';
            case 'synced': return 'border-emerald-200 bg-emerald-50 text-emerald-700';
            case 'failed': return 'border-rose-200 bg-rose-50 text-rose-700';
            default: return 'border-slate-200 bg-slate-50 text-slate-600';
        }
    };

    const getCourierStatusLabel = (status) => {
        switch (status) {
            case 'queued': return 'Queued';
            case 'syncing': return 'Syncing';
            case 'synced': return 'Synced';
            case 'failed': return 'Failed';
            default: return '';
        }
    };

    const renderStatusBadge = (status) => (
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusStyle(status)}`}>
            {getStatusIcon(status)}
            {status}
        </span>
    );

    const renderCourierBadge = (order) => {
        const courierStatus = getCourierStatus(order);
        const label = getCourierStatusLabel(courierStatus.status);
        if (!label) return null;

        const providerLabel = courierStatus.provider === 'redx'
            ? 'RedX'
            : courierStatus.provider === 'pathao'
                ? 'Pathao'
                : 'Courier';

        return (
            <span
                title={courierStatus.error || `${providerLabel} ${label.toLowerCase()}`}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${getCourierStatusStyle(courierStatus.status)}`}
            >
                {courierStatus.status === 'synced' && <CheckCircle size={11} aria-hidden="true" />}
                {providerLabel} {label}
            </span>
        );
    };

    const openCourierModal = (order) => {
        setOrderToSync(order);
        setPathaoModalOpen(true);
    };

    const renderActions = (row, compact = false) => {
        const courierStatus = getCourierStatus(row);
        const courierQueued = courierStatus.status === 'queued';
        const courierSyncing = courierStatus.status === 'syncing';
        const courierFailed = courierStatus.status === 'failed';
        const busy = statusUpdatingOrderId === row._id;

        return (
            <div className={compact
                ? 'grid w-full grid-cols-2 gap-2'
                : 'flex min-w-max flex-wrap items-center justify-end gap-2'}
            >
                {row.status === 'Confirmed' && !courierStatus.hasShipment && (
                    courierQueued ? (
                        <button
                            type="button"
                            onClick={() => handleRetryCourierQueue(row)}
                            disabled={retryingOrderId === row._id || busy}
                            className={`${compact ? 'col-span-2' : ''} inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                            title="Retry this queued courier job"
                        >
                            <Clock size={14} aria-hidden="true" />
                            {retryingOrderId === row._id ? 'Retrying…' : 'Retry courier'}
                        </button>
                    ) : courierSyncing ? (
                        <button
                            type="button"
                            disabled
                            className={`${compact ? 'col-span-2' : ''} inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 opacity-80`}
                        >
                            <Clock size={14} className="animate-pulse" aria-hidden="true" />
                            Courier {getCourierStatusLabel(courierStatus.status)}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => openCourierModal(row)}
                            className={`${compact ? 'col-span-2' : ''} inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2`}
                            title={courierFailed ? courierStatus.error || 'Retry courier sync' : 'Create a courier delivery'}
                        >
                            <Send size={14} aria-hidden="true" />
                            {courierFailed ? 'Retry courier' : 'Create parcel'}
                        </button>
                    )
                )}

                <button
                    type="button"
                    onClick={() => setSelectedOrder(row)}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    title="View customer, items, payment, and delivery details"
                    aria-label={`View order ${row._id.slice(-6).toUpperCase()}`}
                >
                    <Eye size={15} aria-hidden="true" />
                    View
                </button>

                <label className={`${compact ? '' : 'min-w-[148px]'} relative`}>
                    <span className="sr-only">Update order status</span>
                    <select
                        value={row.status}
                        onChange={(event) => handleStatusChangeClick(row, event.target.value)}
                        disabled={['Cancelled', 'Returned', 'Delivered'].includes(row.status) || busy}
                        title="Changing status can notify the customer and affect dashboard revenue"
                        className="min-h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                    >
                        {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                        {row.status === 'Cancelled' && <option value="Cancelled">Cancelled</option>}
                        {row.status === 'Returned' && <option value="Returned">Returned</option>}
                    </select>
                </label>
            </div>
        );
    };

    const columns = [
        {
            label: 'Order',
            key: '_id',
            render: (row) => (
                <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold tracking-tight text-indigo-600">
                            #{row._id.slice(-6).toUpperCase()}
                        </span>
                        {renderCourierBadge(row)}
                    </div>
                    <p className="text-xs text-slate-400">{new Date(row.createdAt).toLocaleDateString('en-GB')}</p>
                </div>
            )
        },
        {
            label: 'Customer',
            key: 'customer',
            render: (row) => (
                <div className="max-w-[220px]">
                    <p className="truncate text-sm font-semibold text-slate-900">
                        {row.customer?.fullName || 'Unknown customer'}
                    </p>
                    <p className="truncate text-xs text-slate-500">{row.customer?.email || 'No email'}</p>
                </div>
            )
        },
        {
            label: 'Total',
            key: 'pricing',
            render: (row) => (
                <span className="whitespace-nowrap text-sm font-bold text-slate-900">
                    ৳ {Number(row.pricing?.total || 0).toLocaleString('en-BD')}
                </span>
            )
        },
        {
            label: 'Status',
            key: 'status',
            render: (row) => renderStatusBadge(row.status)
        }
    ];

    const hasSearch = Boolean(searchQuery.trim());

    return (
        <section className="relative mx-auto w-full max-w-[1600px] space-y-5 sm:space-y-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="flex flex-col gap-5 p-4 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 sm:h-12 sm:w-12">
                            <Package size={22} aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">Orders</h1>
                                {!loading && (
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                        {pagination.total || 0} total
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                                Review customers, update fulfillment, and create courier shipments from one workspace.
                            </p>
                        </div>
                    </div>

                    <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                        <div className="relative min-w-0 flex-1 sm:min-w-[280px] lg:w-[340px]">
                            <Search
                                size={17}
                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                                aria-hidden="true"
                            />
                            <input
                                type="search"
                                placeholder="Search order ID or customer"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                                aria-label="Search orders"
                            />
                            {hasSearch && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    aria-label="Clear order search"
                                >
                                    <X size={15} aria-hidden="true" />
                                </button>
                            )}
                        </div>

                        <PageRefreshButton
                            onClick={() => fetchOrders(pagination.page)}
                            loading={loading && orders.length > 0}
                            label="Refresh orders"
                            className="h-11 w-full rounded-xl sm:w-auto"
                        />
                    </div>
                </div>

                {loading && orders.length > 0 && (
                    <div className="flex items-center gap-2 border-t border-indigo-100 bg-indigo-50/70 px-4 py-2.5 text-xs font-medium text-indigo-700 sm:px-6">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
                        Refreshing order data…
                    </div>
                )}
            </div>

            {loading && orders.length === 0 ? (
                <AdminLoadingState
                    title="Loading orders"
                    description="We are checking customer orders, delivery status, courier sync, and payment totals."
                />
            ) : orders.length === 0 ? (
                <AdminEmptyState
                    icon={Package}
                    title={hasSearch ? 'No matching orders' : 'No orders yet'}
                    description={hasSearch
                        ? 'Try a customer name, email, or the last 6 characters of an order ID.'
                        : 'Orders will appear here after customers buy from your storefront.'}
                />
            ) : (
                <>
                    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                        <Table columns={columns} data={orders} actions={renderActions} />
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:hidden">
                        {orders.map((order) => (
                            <article
                                key={order._id}
                                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                            >
                                <div className="p-4 sm:p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-sm font-bold tracking-tight text-indigo-600">
                                                    #{order._id.slice(-6).toUpperCase()}
                                                </span>
                                                {renderCourierBadge(order)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-950">
                                                    {order.customer?.fullName || 'Unknown customer'}
                                                </p>
                                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                                    {order.customer?.email || 'No email address'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="shrink-0">{renderStatusBadge(order.status)}</div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Order date</p>
                                            <p className="mt-1 text-sm font-semibold text-slate-700">
                                                {new Date(order.createdAt).toLocaleDateString('en-GB')}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Total</p>
                                            <p className="mt-1 text-base font-bold text-slate-950">
                                                ৳ {Number(order.pricing?.total || 0).toLocaleString('en-BD')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 border-t border-slate-100 pt-4">
                                        {renderActions(order, true)}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </>
            )}

            {pagination.pages > 1 && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <PaginationBar
                        pagination={pagination}
                        label="orders"
                        onPrevious={() => fetchOrders(pagination.page - 1)}
                        onNext={() => fetchOrders(pagination.page + 1)}
                        className="border-slate-100"
                    />
                </div>
            )}

            {(selectedOrder || pathaoModalOpen || emailModalOpen) && (
                <Suspense fallback={null}>
                    {selectedOrder && (
                        <OrderDetailsModal
                            order={selectedOrder}
                            onClose={() => setSelectedOrder(null)}
                        />
                    )}

                    {pathaoModalOpen && orderToSync && (
                        <PathaoSyncModal
                            isOpen={pathaoModalOpen}
                            onClose={() => {
                                setPathaoModalOpen(false);
                                setOrderToSync(null);
                            }}
                            order={orderToSync}
                            onSyncSuccess={handlePathaoSuccess}
                            onConfirmBeforeSync={() => updateStatusInDB(orderToSync._id, 'Confirmed', { notifyCustomer: true })}
                            courierSettings={courierSettings}
                            onJustConfirm={async () => {
                                const confirmed = await updateStatusInDB(orderToSync._id, 'Confirmed', { notifyCustomer: true });
                                if (confirmed) {
                                    setPathaoModalOpen(false);
                                    setOrderToSync(null);
                                }
                            }}
                        />
                    )}

                    {emailModalOpen && (
                        <EmailNotificationModal
                            isOpen={emailModalOpen}
                            onClose={() => {
                                setEmailModalOpen(false);
                                setPendingStatusUpdate({ order: null, newStatus: '' });
                            }}
                            onConfirm={handleEmailModalDecision}
                            order={pendingStatusUpdate.order}
                            newStatus={pendingStatusUpdate.newStatus}
                        />
                    )}
                </Suspense>
            )}
        </section>
    );
};

export default OrderList;
