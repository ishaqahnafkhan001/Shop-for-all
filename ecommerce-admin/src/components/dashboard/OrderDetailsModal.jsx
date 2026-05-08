import {
    X, MapPin, User, Package, Calendar,
    CreditCard, FileText, Truck, Tag, Receipt, CheckCircle
} from 'lucide-react';

const getOrderStatusColor = (status) => {
    switch (status) {
        case 'Delivered': return 'bg-green-100 text-green-700';
        case 'Shipped': return 'bg-purple-100 text-purple-700';
        case 'Processing':
        case 'Confirmed': return 'bg-blue-100 text-blue-700';
        case 'Cancelled':
        case 'Returned': return 'bg-red-100 text-red-700';
        default: return 'bg-yellow-100 text-yellow-700'; // Pending
    }
};

const getPaymentStatusColor = (status) => {
    switch (status) {
        case 'Paid': return 'text-green-600 bg-green-50';
        case 'Failed':
        case 'Refunded': return 'text-red-600 bg-red-50';
        default: return 'text-orange-600 bg-orange-50'; // Pending
    }
};

const OrderDetailsModal = ({ order, onClose }) => {
    if (!order) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">

                {/* --- HEADER --- */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                                Order #{order._id.slice(-6).toUpperCase()}
                                {/* Modal Header Green Checkmark */}
                                {order.isPathaoSynced && (
                                    <span title="Synced to Pathao" className="text-green-500 bg-green-50 rounded-full p-1">
                                        <CheckCircle size={22} />
                                    </span>
                                )}
                            </h2>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getOrderStatusColor(order.status)}`}>
                                {order.status}
                            </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500 font-medium">
                            <Calendar size={14} className="mr-1.5" />
                            {new Date(order.createdAt).toLocaleString(undefined, {
                                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* --- BODY --- */}
                <div className="p-6 overflow-y-auto space-y-6 bg-gray-50/50">

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* Customer Info */}
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                                <User size={14} className="mr-2 text-indigo-500" /> Customer
                            </h3>
                            <div className="space-y-1">
                                <p className="font-bold text-gray-900">
                                    {order.customer?.fullName || 'Unknown Customer'}
                                </p>
                                <p className="text-sm text-gray-500">{order.customer?.email}</p>
                            </div>
                        </div>

                        {/* Shipping Info */}
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                                <MapPin size={14} className="mr-2 text-indigo-500" /> Shipping
                            </h3>
                            {order.shipping?.address ? (
                                <div className="text-sm text-gray-700 space-y-1.5">
                                    <p className="font-bold text-gray-900">{order.shipping.address.fullName}</p>
                                    <p>{order.shipping.address.phone}</p>
                                    <p>{order.shipping.address.addressLine}, {order.shipping.address.city}</p>

                                    {/* Courier Details & Pathao Consignment ID */}
                                    {order.isPathaoSynced && order.pathaoConsignmentId && (
                                        <div className="mt-3 pt-3 border-t border-gray-50 space-y-2">
                                            <p className="text-xs flex items-center font-bold text-red-600">
                                                <Truck size={14} className="mr-1.5"/> Pathao Courier
                                            </p>
                                            <p className="text-xs font-mono text-gray-600 bg-gray-50 inline-block px-2.5 py-1.5 rounded border border-gray-200">
                                                ID: {order.pathaoConsignmentId}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic">No address provided.</p>
                            )}
                        </div>

                        {/* Payment Info */}
                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                                <CreditCard size={14} className="mr-2 text-indigo-500" /> Payment
                            </h3>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Method</span>
                                    <span className="font-bold text-gray-900">{order.payment?.method || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Status</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getPaymentStatusColor(order.payment?.status)}`}>
                                        {order.payment?.status || 'Pending'}
                                    </span>
                                </div>
                                {order.payment?.transactionId && (
                                    <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-50 mt-2">
                                        <span className="text-gray-500 text-xs">Txn ID</span>
                                        <span className="font-mono text-xs text-gray-900">{order.payment.transactionId}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Order Items & Financials Layout */}
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center">
                                <Package size={16} className="mr-2 text-indigo-600" /> Items in Order
                            </h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white border-b border-gray-100">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">Product</th>
                                    <th className="px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-wider text-center">Qty</th>
                                    <th className="px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-wider text-right">Unit Price</th>
                                    <th className="px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-wider text-right">Total</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                {order.items.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-5 py-4">
                                            <p className="text-sm font-bold text-gray-900">{item.title}</p>
                                            {item.attributes && item.attributes.length > 0 && (
                                                <div className="flex gap-2 mt-1">
                                                    {item.attributes.map((attr, i) => (
                                                        <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                                                                {attr.name}: {attr.value}
                                                            </span>
                                                    ))}
                                                </div>
                                            )}
                                            {item.sku && <p className="text-[10px] font-mono text-gray-400 mt-1.5 flex items-center"><Tag size={10} className="mr-1"/>{item.sku}</p>}
                                        </td>
                                        <td className="px-5 py-4 text-sm font-bold text-gray-700 text-center">x{item.quantity}</td>
                                        <td className="px-5 py-4 text-sm font-medium text-gray-600 text-right">৳ {item.price}</td>
                                        <td className="px-5 py-4 text-sm font-black text-gray-900 text-right">৳ {item.total}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Financial Summary */}
                        <div className="bg-gray-50 p-6 flex flex-col items-end border-t border-gray-100">
                            <div className="w-full max-w-sm space-y-2">
                                <div className="flex justify-between text-sm text-gray-500 font-medium">
                                    <span>Subtotal</span>
                                    <span>৳ {order.pricing?.subtotal}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-500 font-medium">
                                    <span>Shipping ({order.shipping?.zone})</span>
                                    <span>৳ {order.pricing?.shipping}</span>
                                </div>
                                {order.pricing?.tax > 0 && (
                                    <div className="flex justify-between text-sm text-gray-500 font-medium">
                                        <span>Tax</span>
                                        <span>৳ {order.pricing.tax}</span>
                                    </div>
                                )}
                                {order.pricing?.discount > 0 && (
                                    <div className="flex justify-between text-sm font-bold text-red-500">
                                        <span>Discount</span>
                                        <span>- ৳ {order.pricing.discount}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-lg font-black text-gray-900 pt-3 mt-3 border-t border-dashed border-gray-300">
                                    <span className="flex items-center"><Receipt size={18} className="mr-2 text-indigo-600"/> Total</span>
                                    <span className="text-indigo-600">৳ {order.pricing?.total}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {order.notes && (
                        <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100">
                            <h3 className="text-xs font-black text-yellow-800 uppercase tracking-wider mb-2 flex items-center">
                                <FileText size={14} className="mr-2" /> Order Notes
                            </h3>
                            <p className="text-sm text-yellow-900">{order.notes}</p>
                        </div>
                    )}

                </div>

                <div className="p-4 border-t border-gray-100 bg-white rounded-b-2xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition shadow-md shadow-gray-200"
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailsModal;