import { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../../api/api';
import Table from '../../../components/ui/Table';

const OrderList = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // 1. Fetch Orders from Backend
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const { data } = await API.get('/admin/orders');
                setOrders(data);
            } catch (err) {
                toast.error("Failed to load orders");
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    // 2. Inline Status Update Logic
    const handleStatusChange = async (orderId, newStatus) => {
        try {
            // Optimistically update the UI so it feels instant
            setOrders(orders.map(order =>
                order._id === orderId ? { ...order, status: newStatus } : order
            ));

            await API.patch(`/admin/orders/${orderId}/status`, { status: newStatus });
            toast.success(`Order marked as ${newStatus}`);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update status");
            // If it fails, refresh the page to get the true database state
            window.location.reload();
        }
    };

    // Helper function for beautiful status badges
    const getStatusStyle = (status) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Processing': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Shipped': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'Delivered': return 'bg-green-100 text-green-800 border-green-200';
            case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Pending': return <Clock size={14} className="mr-1" />;
            case 'Processing': return <Package size={14} className="mr-1" />;
            case 'Shipped': return <Truck size={14} className="mr-1" />;
            case 'Delivered': return <CheckCircle size={14} className="mr-1" />;
            case 'Cancelled': return <XCircle size={14} className="mr-1" />;
            default: return null;
        }
    };

    // --- Desktop Table Configuration ---
    const columns = [
        {
            label: 'Order ID',
            key: '_id',
            // Only show the last 6 characters of the MongoDB ID for a cleaner look
            render: (row) => <span className="font-mono text-sm font-semibold text-indigo-600">#{row._id.slice(-6).toUpperCase()}</span>
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
            render: (row) => <span className="text-sm text-gray-600">{new Date(row.createdAt).toLocaleDateString('en-GB')}</span>
        },
        {
            label: 'Total',
            key: 'totalAmount',
            render: (row) => <span className="font-bold text-gray-900">৳ {row.totalAmount}</span>
        },
        {
            label: 'Status',
            key: 'status',
            render: (row) => (
                <div className="flex items-center space-x-2">
                    <span className={`flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(row.status)}`}>
                        {getStatusIcon(row.status)}
                        {row.status}
                    </span>
                </div>
            )
        },
    ];

    // The magical inline dropdown!
    const renderActions = (row) => (
        <select
            value={row.status}
            onChange={(e) => handleStatusChange(row._id, e.target.value)}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white hover:bg-gray-50 cursor-pointer py-1.5 pl-3 pr-8"
        >
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
        </select>
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
                <p className="mt-1 text-sm text-gray-500">Track and fulfill your customer orders.</p>
            </div>

            {loading ? (
                <div className="py-10 text-center text-gray-500">Loading your orders...</div>
            ) : (
                <>
                    {/* DESKTOP VIEW */}
                    <div className="hidden md:block">
                        <Table columns={columns} data={orders} actions={renderActions} />
                    </div>

                    {/* MOBILE VIEW */}
                    <div className="md:hidden space-y-4">
                        {orders.length === 0 ? (
                            <div className="py-10 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
                                No orders yet. Time to do some marketing!
                            </div>
                        ) : (
                            orders.map((order) => (
                                <div key={order._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="font-mono text-sm font-bold text-indigo-600">#{order._id.slice(-6).toUpperCase()}</span>
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
                                            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Amount</p>
                                            <p className="font-bold text-gray-900 text-lg">৳ {order.totalAmount}</p>
                                        </div>
                                        {/* Mobile Action Dropdown */}
                                        <div className="flex flex-col items-end">
                                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Update Status</p>
                                            {renderActions(order)}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default OrderList;