import { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, XCircle, Clock, Eye, Send, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../../api/api';
import Table from '../../../components/ui/Table';
import OrderDetailsModal from '../../../components/dashboard/OrderDetailsModal';
import PathaoSyncModal from './PathaoSyncModal';
import EmailNotificationModal from '../../../components/order/EmailNotificationModal.jsx';
import {useAuth} from "../../../context/AuthContext.jsx"; // <-- Import the new modal

const OrderList = () => {
    const { user } = useAuth();
    // console.log(user.shopName)
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [pathaoModalOpen, setPathaoModalOpen] = useState(false);
    const [orderToSync, setOrderToSync] = useState(null);

    // --- NEW STATES FOR EMAIL MODAL ---
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [pendingStatusUpdate, setPendingStatusUpdate] = useState({ order: null, newStatus: '' });

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const { data } = await API.get('/admin/orders');
                setOrders(data.data);
            } catch (err) {
                toast.error("Failed to load orders");
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    // Intercept the status change to show the modal
    const handleStatusChangeClick = (order, newStatus) => {
        if (newStatus === 'Confirmed' && !order.isPathaoSynced) {
            setOrderToSync(order);
            setPathaoModalOpen(true);
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

        // 1. Send the email if the user clicked "Yes"
        if (shouldSendEmail && emailData) {
            try {
                // Ensure the route matches your backend (e.g., /admin/orders/send-email)
                await API.post('/admin/orders/send-email', {
                    email: order.customer?.email,
                    name: order.customer?.fullName,
                    subject: emailData.subject,
                    message: emailData.message,
                    shopName:  user.shopName// Replace dynamically if needed
                });
                toast.success("Email sent to customer");
            } catch (error) {
                toast.error(error.response?.data?.error || "Failed to send email");
                // We still proceed to update the status even if the email fails
            }
        }

        // 2. Update the status in the DB
        updateStatusInDB(order._id, newStatus);
    };

    const updateStatusInDB = async (orderId, newStatus) => {
        try {
            setOrders(orders.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
            await API.patch(`/admin/orders/${orderId}/status`, { status: newStatus });
            toast.success(`Order marked as ${newStatus}`);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update status");
            const { data } = await API.get('/admin/orders').catch(() => ({ data: { data: orders } }));
            setOrders(data.data);
        }
    };

    const handlePathaoSuccess = (updatedOrder) => {
        setOrders(orders.map(o => o._id === updatedOrder._id ? updatedOrder : o));
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

    const columns = [
        {
            label: 'Order ID',
            key: '_id',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-indigo-600">
                        #{row._id.slice(-6).toUpperCase()}
                    </span>
                    {row.isPathaoSynced && (
                        <span title="Synced to Pathao" className="text-green-500 bg-green-50 rounded-full p-0.5">
                            <CheckCircle size={16} />
                        </span>
                    )}
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

    const renderActions = (row) => (
        <div className="flex items-center justify-end space-x-3">

            {row.status === 'Confirmed' && !row.isPathaoSynced && (
                <button
                    onClick={() => { setOrderToSync(row); setPathaoModalOpen(true); }}
                    className="flex items-center text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition px-2 py-1.5 rounded-md"
                    title="Send to Pathao"
                >
                    <Send size={14} className="mr-1.5" /> Send to Pathao
                </button>
            )}

            <button
                onClick={() => setSelectedOrder(row)}
                className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 transition px-2 py-1.5 rounded-md hover:bg-indigo-50"
                title="View Details"
            >
                <Eye size={18} className="mr-1.5" /> View
            </button>

            {/* Changed onChange to trigger the modal instead of direct DB update */}
            <select
                value={['Cancelled', 'Returned'].includes(row.status) ? row.status : row.status}
                onChange={(e) => handleStatusChangeClick(row, e.target.value)}
                disabled={['Cancelled', 'Returned', 'Delivered'].includes(row.status)}
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

    const filteredOrders = orders.filter((order) =>
        order._id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 relative">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
                    <p className="mt-1 text-sm text-gray-500">Track and fulfill your customer orders.</p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by Order ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm outline-none transition"
                    />
                </div>
            </div>

            {loading ? (
                <div className="py-10 text-center text-gray-500">Loading your orders...</div>
            ) : (
                <>
                    <div className="hidden md:block">
                        <Table columns={columns} data={filteredOrders} actions={renderActions} />
                    </div>

                    <div className="md:hidden space-y-4">
                        {filteredOrders.length === 0 ? (
                            <div className="py-10 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
                                {searchQuery ? 'No orders match your search.' : 'No orders yet. Time to do some marketing!'}
                            </div>
                        ) : (
                            filteredOrders.map((order) => (
                                <div key={order._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm font-bold text-indigo-600">
                                                    #{order._id.slice(-6).toUpperCase()}
                                                </span>
                                                {order.isPathaoSynced && (
                                                    <span title="Synced to Pathao" className="text-green-500 bg-green-50 rounded-full p-0.5">
                                                        <CheckCircle size={16} />
                                                    </span>
                                                )}
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
                            ))
                        )}
                    </div>
                </>
            )}

            <OrderDetailsModal
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
            />

            <PathaoSyncModal
                isOpen={pathaoModalOpen}
                onClose={() => setPathaoModalOpen(false)}
                order={orderToSync}
                onSyncSuccess={handlePathaoSuccess}
                onJustConfirm={() => {
                    updateStatusInDB(orderToSync._id, 'Confirmed');
                    setPathaoModalOpen(false);
                }}
            />

            {/* --- NEW EMAIL NOTIFICATION MODAL --- */}
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
        </div>
    );
};

export default OrderList;