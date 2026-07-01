import { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { Package, Truck, CheckCircle, XCircle, Clock, Eye, Send, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../../api/api';
import Table from '../../../components/ui/Table';
import { AdminEmptyState, AdminLoadingState } from '../../../components/ui/AdminState.jsx';
import PaginationBar from '../../../components/ui/PaginationBar.jsx';
import { isAbortError, useAbortableRequest } from '../../../hooks/useAbortableRequest.js';

const OrderDetailsModal = lazy(() => import('../../../components/dashboard/OrderDetailsModal'));
const PathaoSyncModal = lazy(() => import('./PathaoSyncModal'));
const EmailNotificationModal = lazy(() => import('../../../components/order/EmailNotificationModal.jsx'));

const OrderList = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [courierSettings, setCourierSettings] = useState(null);
    const [retryingOrderId, setRetryingOrderId] = useState(null);
    const [statusUpdatingOrderId, setStatusUpdatingOrderId] = useState(null);
    const runAbortable = useAbortableRequest();
    const fetchIdRef = useRef(0);

    const [pathaoModalOpen, setPathaoModalOpen] = useState(false);
    const [orderToSync, setOrderToSync] = useState(null);

    // --- NEW STATES FOR EMAIL MODAL ---
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [pendingStatusUpdate, setPendingStatusUpdate] = useState({ order: null, newStatus: '' });

    const fetchOrders = useCallback(async (page = 1) => {
        const fetchId = fetchIdRef.current + 1;
        fetchIdRef.current = fetchId;
        setLoading(true);
        try {
            await runAbortable(async ({ signal, isLatest }) => {
            const { data } = await API.get('/admin/orders', {
                params: { page, limit: 25 },
                signal
            });
            if (!isLatest() || fetchId !== fetchIdRef.current) return;
            setOrders(data.data || []);
            setPagination(data.pagination || { page, pages: 1, total: data.data?.length || 0 });
            });
        } catch (error) {
            if (isAbortError(error)) return;
            toast.error("Failed to load orders");
        } finally {
            if (fetchId === fetchIdRef.current) setLoading(false);
        }
    }, [runAbortable]);

    useEffect(() => {
        const timer = setTimeout(fetchOrders, 0);
        return () => clearTimeout(timer);
    }, [fetchOrders]);

    useEffect(() => {
        API.get('/admin/shipping/couriers')
            .then(({ data }) => setCourierSettings(data.data || null))
            .catch(() => setCourierSettings(null));
    }, []);

    // Intercept the status change to show the modal
    const handleStatusChangeClick = (order, newStatus) => {
        if (newStatus === 'Confirmed' && !getCourierStatus(order).hasShipment) {
            setOrderToSync(order);
            setPathaoModalOpen(true);
            return;
        }

        if (newStatus === 'Confirmed') {
            updateStatusInDB(order._id, newStatus, { notifyCustomer: true });
            return;
        }

        // Open the email modal and save the pending update
        setPendingStatusUpdate({ order, newStatus });
        setEmailModalOpen(true);
    };

    // Process the decision from the Email Modal
    const handleEmailModalDecision = async (shouldSendEmail, emailData = null) => {
        const { order, newStatus } = pendingStatusUpdate;
        setEmailModalOpen(false); // Close modal immediately
        if (!order || !newStatus) return;

        updateStatusInDB(order._id, newStatus, {
            notifyCustomer: shouldSendEmail,
            emailSubject: emailData?.subject,
            emailMessage: emailData?.message
        });
    };

    const updateStatusInDB = async (orderId, newStatus, options = {}) => {
        try {
            setStatusUpdatingOrderId(orderId);
            setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
            const { data } = await API.patch(`/admin/orders/${orderId}/status`, {
                status: newStatus,
                ...options
            });
            if (data?.data) {
                setOrders(prev => prev.map(o => o._id === orderId ? data.data : o));
            }
            toast.success(`Order status updated to ${newStatus}`);
            if (data?.notification?.sent) {
                toast.success('Customer email sent');
            }
            return data?.data || true;
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update status");
            fetchOrders();
            return null;
        } finally {
            setStatusUpdatingOrderId(null);
        }
    };

    const handlePathaoSuccess = (updatedOrder) => {
        if (!updatedOrder?._id) {
            fetchOrders(pagination.page);
            return;
        }
        setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
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
                setOrders(prev => prev.map(o => o._id === data.data._id ? data.data : o));
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
            case 'Pending':    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Confirmed':  return 'bg-sky-100 text-sky-800 border-sky-200';
            case 'Processing': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Shipped':    return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'Delivered':  return 'bg-green-100 text-green-800 border-green-200';
            case 'Cancelled':  return 'bg-red-100 text-red-800 border-red-200';
            case 'Returned':   return 'bg-orange-100 text-orange-800 border-orange-200';
            default:           return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Pending':    return <Clock size={14} className="mr-1" />;
            case 'Processing': return <Package size={14} className="mr-1" />;
            case 'Shipped':    return <Truck size={14} className="mr-1" />;
            case 'Delivered':  return <CheckCircle size={14} className="mr-1" />;
            case 'Cancelled':
            case 'Returned':   return <XCircle size={14} className="mr-1" />;
            default:           return null;
        }
    };

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

    const getCourierStatusStyle = (status) => {
        switch (status) {
            case 'queued':  return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'syncing': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'synced':  return 'bg-green-50 text-green-700 border-green-200';
            case 'failed':  return 'bg-red-50 text-red-700 border-red-200';
            default:        return 'bg-gray-50 text-gray-600 border-gray-200';
        }
    };

    const getCourierStatusLabel = (status) => {
        switch (status) {
            case 'queued':  return 'Queued';
            case 'syncing': return 'Syncing';
            case 'synced':  return 'Synced';
            case 'failed':  return 'Failed';
            default:        return '';
        }
    };

    const renderCourierBadge = (order) => {
        const courierStatus = getCourierStatus(order);
        const label = getCourierStatusLabel(courierStatus.status);
        if (!label) return null;
        const providerLabel = courierStatus.provider === 'redx' ? 'RedX' : courierStatus.provider === 'pathao' ? 'Pathao' : 'Courier';

        return (
            <span
                title={courierStatus.error || `${providerLabel} ${label.toLowerCase()}`}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getCourierStatusStyle(courierStatus.status)}`}
            >
                {courierStatus.status === 'synced' ? <CheckCircle size={12} /> : null}
                {providerLabel} {label}
            </span>
        );
    };

    const columns = [
        {
            label: 'Order ID',
            key: '_id',
            render: (row) => (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-indigo-600">
                        #{row._id.slice(-6).toUpperCase()}
                    </span>
                    {renderCourierBadge(row)}
                </div>
            )
        },
        {
            label: 'Customer',
            key: 'customer',
            render: (row) => (
                <div>
                    <p className="text-sm font-medium text-gray-900">{row.customer?.fullName || 'Unknown User'}</p>
                    <p className="text-xs text-gray-500">{row.customer?.email}</p>
                </div>
            )
        },
        {
            label: 'Date',
            key: 'createdAt',
            render: (row) => (
                <span className="text-sm text-gray-600">
                    {new Date(row.createdAt).toLocaleDateString('en-GB')}
                </span>
            )
        },
        {
            label: 'Total',
            key: 'pricing',
            render: (row) => (
                <span className="font-bold text-gray-900">৳ {row.pricing?.total}</span>
            )
        },
        {
            label: 'Status',
            key: 'status',
            render: (row) => (
                <span className={`flex items-center w-fit px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(row.status)}`}>
                    {getStatusIcon(row.status)}
                    {row.status}
                </span>
            )
        },
    ];

    const renderActions = (row) => {
        const courierStatus = getCourierStatus(row);
        const courierQueued = courierStatus.status === 'queued';
        const courierSyncing = courierStatus.status === 'syncing';
        const courierFailed = courierStatus.status === 'failed';

        return (
            <div className="flex items-center justify-end space-x-3">

                {row.status === 'Confirmed' && !courierStatus.hasShipment && (
                    courierQueued ? (
                        <button
                            onClick={() => handleRetryCourierQueue(row)}
                            disabled={retryingOrderId === row._id || statusUpdatingOrderId === row._id}
                            className="flex items-center text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition px-2 py-1.5 rounded-md disabled:opacity-60"
                            title="Retry this queued courier job if it has been stuck."
                        >
                            <Clock size={14} className="mr-1.5" /> {retryingOrderId === row._id ? 'Retrying...' : 'Retry Queue'}
                        </button>
                    ) : courierSyncing ? (
                        <button
                            disabled
                            className="flex items-center text-xs font-bold text-amber-700 bg-amber-50 transition px-2 py-1.5 rounded-md opacity-80"
                            title="Courier sync is currently being processed."
                        >
                            <Clock size={14} className="mr-1.5" /> Courier {getCourierStatusLabel(courierStatus.status)}
                        </button>
                    ) : (
                        <button
                            onClick={() => { setOrderToSync(row); setPathaoModalOpen(true); }}
                            className="flex items-center text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition px-2 py-1.5 rounded-md"
                            title={courierFailed ? courierStatus.error || 'Retry courier sync' : 'Create a courier delivery for this confirmed order'}
                        >
                            <Send size={14} className="mr-1.5" /> {courierFailed ? 'Retry Courier' : 'Create Parcel'}
                        </button>
                    )
                )}

                <button
                    onClick={() => setSelectedOrder(row)}
                    className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 transition px-2 py-1.5 rounded-md hover:bg-indigo-50"
                    title="View customer, items, payment, and delivery details"
                    aria-label={`View order ${row._id.slice(-6).toUpperCase()}`}
                >
                    <Eye size={18} className="mr-1.5" /> View
                </button>

                {/* Changed onChange to trigger the modal instead of direct DB update */}
                <select
                    value={['Cancelled', 'Returned'].includes(row.status) ? row.status : row.status}
                    onChange={(e) => handleStatusChangeClick(row, e.target.value)}
                    disabled={['Cancelled', 'Returned', 'Delivered'].includes(row.status) || statusUpdatingOrderId === row._id}
                    title="Changing status can notify the customer and affect dashboard revenue"
                    className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white hover:bg-gray-50 cursor-pointer py-1.5 pl-3 pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Processing">Processing</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    {row.status === 'Cancelled' && <option value="Cancelled">Cancelled</option>}
                    {row.status === 'Returned'  && <option value="Returned">Returned</option>}
                </select>
            </div>
        );
    };

    const filteredOrders = orders.filter((order) =>
        order._id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 relative">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
                    <p className="mt-1 text-sm text-gray-500">Process orders from pending to delivered. Delivered orders count toward revenue.</p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by last 6 characters of order ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm outline-none transition"
                    />
                </div>
            </div>

            {loading ? (
                <AdminLoadingState
                    title="Loading orders"
                    description="We are checking customer orders, delivery status, courier sync, and payment totals."
                />
            ) : filteredOrders.length === 0 ? (
                <AdminEmptyState
                    icon={Package}
                    title={searchQuery ? 'No matching orders' : 'No orders yet'}
                    description={searchQuery ? 'Try the last 6 characters of an order ID or clear your search.' : 'Orders will appear here after customers buy from your storefront. Share your store link or create a promotion to bring shoppers in.'}
                />
            ) : (
                <>
                    <div className="hidden md:block">
                        <Table columns={columns} data={filteredOrders} actions={renderActions} />
                    </div>

                    <div className="md:hidden space-y-4">
                        {filteredOrders.map((order) => (
                                <div key={order._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-sm font-bold text-indigo-600">
                                                    #{order._id.slice(-6).toUpperCase()}
                                                </span>
                                                {renderCourierBadge(order)}
                                            </div>
                                            <p className="text-sm font-bold text-gray-900 mt-1">{order.customer?.fullName}</p>
                                            <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString('en-GB')}</p>
                                        </div>
                                        <span className={`flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusStyle(order.status)}`}>
                                            {getStatusIcon(order.status)}
                                            {order.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
                                            <p className="font-bold text-gray-900 text-lg">৳ {order.pricing?.total}</p>
                                        </div>
                                        <div className="flex flex-col items-end space-y-2">
                                            {renderActions(order)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </>
            )}

            {pagination.pages > 1 && (
                <PaginationBar
                    pagination={pagination}
                    label="orders"
                    onPrevious={() => fetchOrders(pagination.page - 1)}
                    onNext={() => fetchOrders(pagination.page + 1)}
                    className="border-gray-100"
                />
            )}

            {(selectedOrder || pathaoModalOpen || emailModalOpen) && (
                <Suspense fallback={null}>
                    {selectedOrder && (
                        <OrderDetailsModal
                            order={selectedOrder}
                            onClose={() => setSelectedOrder(null)}
                        />
                    )}
                    {pathaoModalOpen && (
                        <PathaoSyncModal
                            isOpen={pathaoModalOpen}
                            onClose={() => setPathaoModalOpen(false)}
                            order={orderToSync}
                            onSyncSuccess={handlePathaoSuccess}
                            onConfirmBeforeSync={() => updateStatusInDB(orderToSync._id, 'Confirmed', { notifyCustomer: true })}
                            courierSettings={courierSettings}
                            onJustConfirm={() => {
                                updateStatusInDB(orderToSync._id, 'Confirmed', { notifyCustomer: true });
                                setPathaoModalOpen(false);
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
        </div>
    );
};

export default OrderList;
