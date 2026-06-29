import {
    X, MapPin, User, Package, Calendar,
    CreditCard, FileText, Truck, Tag, Receipt, CheckCircle,
    Mail, Phone, Hash, ClipboardList, RotateCcw, AlertCircle
} from 'lucide-react';

const formatMoney = (value) => `৳ ${Number(value || 0).toLocaleString('en-BD')}`;
const formatDateTime = (value) => (
    value
        ? new Date(value).toLocaleString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
        : 'Not set'
);

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

const DetailRow = ({ label, value, mono = false }) => (
    <div className="flex items-start justify-between gap-4 text-sm">
        <span className="text-gray-500">{label}</span>
        <span className={`text-right font-bold text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>
            {value || 'N/A'}
        </span>
    </div>
);

const SectionCard = ({ icon: Icon, title, children, className = '' }) => (
    <div className={`bg-white p-5 rounded-xl border border-gray-100 shadow-sm ${className}`}>
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4 flex items-center">
            <Icon size={14} className="mr-2 text-indigo-500" /> {title}
        </h3>
        {children}
    </div>
);

const OrderDetailsModal = ({ order, onClose }) => {
    if (!order) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    const hasCourierDetails = Boolean(
        order.shipping?.courier ||
        order.shipping?.trackingId ||
        order.shipping?.shippedAt ||
        order.shipping?.deliveredAt ||
        order.isPathaoSynced ||
        order.pathaoSyncStatus ||
        order.pathaoLastError
    );
    const hasPromotion = Boolean(order.promotion?.code || Number(order.pricing?.discount || 0) > 0);
    const timeline = Array.isArray(order.timeline) ? order.timeline : [];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={handleBackdropClick}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">

                {/* --- HEADER --- */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                                Order #{String(order._id || '').slice(-8).toUpperCase()}
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
                            {formatDateTime(order.createdAt)}
                        </div>
                        <p className="mt-1 break-all font-mono text-xs font-semibold text-gray-400">Full ID: {order._id}</p>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

                        <SectionCard icon={User} title="Customer">
                            <div className="space-y-1">
                                <p className="font-bold text-gray-900">
                                    {order.customer?.fullName || 'Unknown Customer'}
                                </p>
                                <p className="flex items-center gap-1.5 text-sm text-gray-500">
                                    <Mail size={13} /> {order.customer?.email || 'No account email'}
                                </p>
                                <p className="flex items-center gap-1.5 text-sm text-gray-500">
                                    <Phone size={13} /> {order.shipping?.address?.phone || 'No phone'}
                                </p>
                            </div>
                        </SectionCard>

                        <SectionCard icon={MapPin} title="Delivery Address">
                            {order.shipping?.address ? (
                                <div className="text-sm text-gray-700 space-y-1.5">
                                    <p className="font-bold text-gray-900">{order.shipping.address.fullName}</p>
                                    <p>{order.shipping.address.phone}</p>
                                    <p>{order.shipping.address.addressLine}, {order.shipping.address.city}</p>
                                    <p className="pt-2 text-xs font-bold uppercase tracking-wide text-gray-400">Zone: {order.shipping.zone}</p>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic">No address provided.</p>
                            )}
                        </SectionCard>

                        <SectionCard icon={CreditCard} title="Payment">
                            <div className="space-y-2">
                                <DetailRow label="Method" value={order.payment?.method || 'N/A'} />
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Status</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getPaymentStatusColor(order.payment?.status)}`}>
                                        {order.payment?.status || 'Pending'}
                                    </span>
                                </div>
                                <DetailRow label="Paid at" value={formatDateTime(order.payment?.paidAt)} />
                                {order.payment?.transactionId && (
                                    <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-50 mt-2">
                                        <span className="text-gray-500 text-xs">Txn ID</span>
                                        <span className="font-mono text-xs text-gray-900">{order.payment.transactionId}</span>
                                    </div>
                                )}
                            </div>
                        </SectionCard>

                        <SectionCard icon={Hash} title="Order Meta">
                            <div className="space-y-2">
                                <DetailRow label="Source" value={order.source || 'direct'} />
                                <DetailRow label="Created" value={formatDateTime(order.createdAt)} />
                                <DetailRow label="Updated" value={formatDateTime(order.updatedAt)} />
                                <DetailRow label="Items" value={`${order.items?.length || 0}`} />
                            </div>
                        </SectionCard>
                    </div>

                    {hasCourierDetails && (
                        <SectionCard icon={Truck} title="Courier and Fulfillment">
                            <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                                <DetailRow label="Courier" value={order.shipping?.courier || (order.isPathaoSynced ? 'Pathao' : '')} />
                                <DetailRow label="Tracking ID" value={order.shipping?.trackingId} mono />
                                <DetailRow label="Pathao status" value={order.pathaoSyncStatus || (order.isPathaoSynced ? 'synced' : 'not_queued')} />
                                <DetailRow label="Consignment" value={order.pathaoConsignmentId} mono />
                                <DetailRow label="Shipped at" value={formatDateTime(order.shipping?.shippedAt)} />
                                <DetailRow label="Delivered at" value={formatDateTime(order.shipping?.deliveredAt)} />
                                {order.pathaoLastError && (
                                    <div className="md:col-span-2 xl:col-span-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
                                        Pathao error: {order.pathaoLastError}
                                    </div>
                                )}
                            </div>
                        </SectionCard>
                    )}

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
                                        <td className="px-5 py-4 text-sm font-medium text-gray-600 text-right">{formatMoney(item.price)}</td>
                                        <td className="px-5 py-4 text-sm font-black text-gray-900 text-right">{formatMoney(item.total)}</td>
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
                                    <span>{formatMoney(order.pricing?.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-500 font-medium">
                                    <span>Shipping ({order.shipping?.zone})</span>
                                    <span>{formatMoney(order.pricing?.shipping)}</span>
                                </div>
                                {order.pricing?.tax > 0 && (
                                    <div className="flex justify-between text-sm text-gray-500 font-medium">
                                        <span>Tax</span>
                                        <span>{formatMoney(order.pricing.tax)}</span>
                                    </div>
                                )}
                                {order.pricing?.discount > 0 && (
                                    <div className="flex justify-between text-sm font-bold text-red-500">
                                        <span>Discount</span>
                                        <span>- {formatMoney(order.pricing.discount)}</span>
                                    </div>
                                )}
                                {hasPromotion && (
                                    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-bold text-indigo-900">Promotion</span>
                                            <span className="font-mono text-xs font-black text-indigo-700">
                                                {order.promotion?.code || 'Discount applied'}
                                            </span>
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-indigo-700">
                                            <span>Type: {order.promotion?.type || 'N/A'}</span>
                                            <span>Free shipping: {order.promotion?.freeShipping ? 'Yes' : 'No'}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-lg font-black text-gray-900 pt-3 mt-3 border-t border-dashed border-gray-300">
                                    <span className="flex items-center"><Receipt size={18} className="mr-2 text-indigo-600"/> Total</span>
                                    <span className="text-indigo-600">{formatMoney(order.pricing?.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {order.cancellation?.cancelledAt && (
                        <SectionCard icon={AlertCircle} title="Cancellation">
                            <div className="grid gap-3 text-sm md:grid-cols-3">
                                <DetailRow label="Cancelled by" value={order.cancellation.cancelledBy} />
                                <DetailRow label="Cancelled at" value={formatDateTime(order.cancellation.cancelledAt)} />
                                <DetailRow label="Reason" value={order.cancellation.reason} />
                                {order.cancellation.note && (
                                    <div className="md:col-span-3 rounded-xl border border-yellow-100 bg-yellow-50 p-3 text-yellow-900">
                                        {order.cancellation.note}
                                    </div>
                                )}
                            </div>
                        </SectionCard>
                    )}

                    {timeline.length > 0 && (
                        <SectionCard icon={ClipboardList} title="Order Timeline">
                            <div className="space-y-3">
                                {timeline.map((event, index) => (
                                    <div key={`${event.type}-${event.createdAt}-${index}`} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                            <p className="text-sm font-black text-gray-900">{event.message || event.type}</p>
                                            <p className="text-xs font-semibold text-gray-400">{formatDateTime(event.createdAt)}</p>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                                            <span className="rounded bg-white px-2 py-1">Actor: {event.actorType || 'system'}</span>
                                            <span className="rounded bg-white px-2 py-1">Type: {event.type}</span>
                                            {event.reason && <span className="rounded bg-white px-2 py-1">Reason: {event.reason}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </SectionCard>
                    )}

                    {order.notes && (
                        <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100">
                            <h3 className="text-xs font-black text-yellow-800 uppercase tracking-wider mb-2 flex items-center">
                                <FileText size={14} className="mr-2" /> Order Notes
                            </h3>
                            <p className="text-sm text-yellow-900">{order.notes}</p>
                        </div>
                    )}

                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
                        <div className="flex items-center gap-2 font-black uppercase tracking-wider text-slate-400">
                            <RotateCcw size={14} /> Return/refund details
                        </div>
                        <p className="mt-2 leading-5">
                            If this order has a return request, manage the request from the Return Management page. This order view shows the original order snapshot and status timeline.
                        </p>
                    </div>

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
