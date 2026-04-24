import { X, MapPin, User, Package, Calendar } from 'lucide-react';

const OrderDetailsModal = ({ order, onClose }) => {
    if (!order) return null;

    // Close modal if user clicks the black overlay background
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={handleBackdropClick}
        >
            {/* Modal Container */}
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">

                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Order #{order._id.slice(-6).toUpperCase()}
                        </h2>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Calendar size={14} className="mr-1" />
                            {new Date(order.createdAt).toLocaleString()}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Body (Scrollable) */}
                <div className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Customer Info */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                                <User size={16} className="mr-2 text-indigo-600" /> Customer Details
                            </h3>
                            <p className="font-medium text-gray-900">{order.customer?.fullName || 'Unknown Customer'}</p>
                            <p className="text-sm text-gray-500">{order.customer?.email}</p>
                        </div>

                        {/* Shipping Info */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                                <MapPin size={16} className="mr-2 text-indigo-600" /> Shipping Address
                            </h3>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {order.shippingAddress || 'No address provided.'}
                            </p>
                            <p className="text-sm font-medium text-gray-900 mt-2">
                                Zone: <span className="text-indigo-600">{order.shippingZone}</span>
                            </p>
                        </div>
                    </div>

                    {/* Order Items List */}
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                        <Package size={16} className="mr-2 text-indigo-600" /> Order Items
                    </h3>
                    <div className="border border-gray-100 rounded-xl overflow-hidden mb-6">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Qty</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Price</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                            {order.items.map((item, index) => (
                                <tr key={index}>
                                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                        {/* Assuming backend populates the product. Adjust if it's just an ID */}
                                        {item.product?.title || 'Product Unavailable'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500 text-center">x{item.quantity}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">৳ {item.price}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Cost Summary */}
                    <div className="space-y-2 border-t border-gray-100 pt-4">
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>Subtotal</span>
                            <span>৳ {order.totalAmount - order.shippingCost}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>Shipping</span>
                            <span>৳ {order.shippingCost}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-dashed border-gray-200">
                            <span>Total</span>
                            <span className="text-indigo-600">৳ {order.totalAmount}</span>
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailsModal;