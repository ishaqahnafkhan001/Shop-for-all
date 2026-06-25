"use client";

import React, { useMemo, useState } from 'react';
import {
    AlertTriangle,
    Box,
    Calendar,
    CheckCircle,
    MapPin,
    Package,
    RefreshCcw,
    Search,
    ShieldCheck,
    Truck,
    X,
    XCircle
} from 'lucide-react';
import API from '@/api/api';
import { toast } from 'react-hot-toast';
import SafeProductImage from '@/components/storefront/SafeProductImage';

const cancellationReasons = [
    'Ordered by mistake',
    'Found better price',
    'Wrong item/quantity',
    'Delivery will take too long',
    'Other'
];

const returnReasons = [
    'Damaged product',
    'Wrong product delivered',
    'Product differs from description',
    'Missing item',
    'Quality issue',
    'Other'
];

const formatMoney = (value) => `৳ ${Number(value || 0).toLocaleString('en-BD')}`;
const shortOrderId = (value) => `#${String(value || '').slice(-8).toUpperCase()}`;
const getProductId = (item) => String(item?.productId?._id || item?.productId || '');
const getVariantId = (item) => String(item?.variantId || '');
const getItemKey = (item) => `${getProductId(item)}:${getVariantId(item)}`;

const StatusPill = ({ children, tone = 'slate' }) => {
    const tones = {
        slate: 'border-slate-200 bg-slate-50 text-slate-700',
        green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        amber: 'border-amber-200 bg-amber-50 text-amber-700',
        red: 'border-rose-200 bg-rose-50 text-rose-700',
        teal: 'border-teal-200 bg-teal-50 text-teal-700'
    };

    return (
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${tones[tone] || tones.slate}`}>
            {children}
        </span>
    );
};

const ModalShell = ({ title, children, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 px-3 py-4 backdrop-blur-sm sm:items-center">
        <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-black text-slate-950">{title}</h2>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Close modal"
                >
                    <X size={18} />
                </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto p-5">
                {children}
            </div>
        </div>
    </div>
);

export default function TrackOrderPage({ params }) {
    const { subdomain } = React.use(params);
    const [trackingId, setTrackingId] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [order, setOrder] = useState(null);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [returnOpen, setReturnOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState(cancellationReasons[0]);
    const [cancelNote, setCancelNote] = useState('');
    const [returnReason, setReturnReason] = useState(returnReasons[0]);
    const [returnDescription, setReturnDescription] = useState('');
    const [selectedReturnItems, setSelectedReturnItems] = useState([]);

    const steps = ['Pending', 'Processing', 'Shipped', 'Delivered'];
    const currentStepIndex = order ? steps.indexOf(order.status) : -1;
    const progressWidth = currentStepIndex === -1 ? '0%' : `${(currentStepIndex / (steps.length - 1)) * 100}%`;
    const address = order?.shippingAddress;

    const orderItems = useMemo(() => order?.items || [], [order]);
    const canRequestReturn = Boolean(order?.returnEligibility?.canRequestReturn);
    const returnStatusTone = order?.returnRequest?.status === 'Rejected'
        ? 'red'
        : order?.returnRequest?.status === 'Refunded'
            ? 'green'
            : 'amber';

    const fetchTrackedOrder = async ({ showSuccess = false } = {}) => {
        const cleanTrackingId = trackingId.trim();
        const cleanPhone = phone.trim();
        if (!cleanTrackingId) {
            toast.error('Please enter an Order ID');
            return null;
        }
        if (!cleanPhone) {
            toast.error('Please enter the delivery phone number');
            return null;
        }

        setLoading(true);
        try {
            const { data } = await API.get(`/storefront/${subdomain}/track-order/${cleanTrackingId}`, {
                params: { phone: cleanPhone }
            });
            setOrder(data);
            if (showSuccess) toast.success('Order found!');
            return data;
        } catch (error) {
            setOrder(null);
            toast.error(error.response?.data?.error || 'Order not found.');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const handleTrackOrder = async (event) => {
        event.preventDefault();
        await fetchTrackedOrder({ showSuccess: true });
    };

    const handleCancelOrder = async (event) => {
        event.preventDefault();
        if (!order?.canCancel) return;

        setActionLoading(true);
        try {
            const { data } = await API.post(`/storefront/${subdomain}/orders/${order._id}/cancel`, {
                phone: phone.trim(),
                reason: cancelReason,
                note: cancelNote
            });
            toast.success(data.message || 'Order cancelled successfully.');
            setCancelOpen(false);
            setCancelNote('');
            await fetchTrackedOrder();
        } catch (error) {
            toast.error(error.response?.data?.message || error.response?.data?.error || 'Could not cancel this order.');
        } finally {
            setActionLoading(false);
        }
    };

    const openReturnModal = () => {
        setSelectedReturnItems(orderItems.map(getItemKey));
        setReturnOpen(true);
    };

    const toggleReturnItem = (item) => {
        const key = getItemKey(item);
        setSelectedReturnItems(prev => (
            prev.includes(key) ? prev.filter(itemKey => itemKey !== key) : [...prev, key]
        ));
    };

    const handleSubmitReturn = async (event) => {
        event.preventDefault();
        if (!canRequestReturn) return;
        if (selectedReturnItems.length === 0) {
            toast.error('Select at least one item to return.');
            return;
        }

        const items = orderItems
            .filter(item => selectedReturnItems.includes(getItemKey(item)))
            .map(item => ({
                productId: getProductId(item),
                variantId: getVariantId(item),
                quantity: item.quantity
            }));

        setActionLoading(true);
        try {
            const { data } = await API.post(`/storefront/${subdomain}/orders/${order._id}/returns`, {
                phone: phone.trim(),
                reason: returnReason,
                description: returnDescription,
                items
            });
            toast.success(data.message || 'Return request submitted.');
            setReturnOpen(false);
            setReturnDescription('');
            await fetchTrackedOrder();
        } catch (error) {
            toast.error(error.response?.data?.message || error.response?.data?.error || 'Could not submit return request.');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="sf-page min-h-[70vh]">
            <div className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
                <div className="mb-8 text-center">
                    <p className="sf-kicker mb-2">Order tracking</p>
                    <h1 className="sf-heading mb-4 text-4xl">Track Your Order</h1>
                    <p className="mx-auto mb-7 max-w-lg text-sm leading-6 text-slate-500">
                        Enter the short Order ID from your confirmation screen and delivery phone number to view delivery, cancellation, and return support.
                    </p>

                    <form onSubmit={handleTrackOrder} className="mx-auto max-w-xl space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                <Search className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                value={trackingId}
                                onChange={(event) => setTrackingId(event.target.value)}
                                placeholder="Order ID, for example A1B2C3"
                                className="sf-field pl-12 font-mono"
                            />
                        </div>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            placeholder="Delivery phone number"
                            className="sf-field"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="sf-btn sf-btn-primary w-full disabled:opacity-50"
                        >
                            {loading ? 'Searching...' : 'Track'}
                        </button>
                    </form>
                </div>

                {order && (
                    <div className="space-y-5">
                        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
                            <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center">
                                <div>
                                    <p className="mb-1 text-sm font-black uppercase tracking-widest text-slate-400">Order ID</p>
                                    <p className="font-mono text-lg font-black text-[var(--sf-accent)]">{shortOrderId(order._id)}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                    <StatusPill tone={order.status === 'Cancelled' ? 'red' : order.status === 'Delivered' ? 'green' : 'teal'}>
                                        {order.status}
                                    </StatusPill>
                                    <StatusPill tone={order.paymentStatus === 'Paid' ? 'green' : 'amber'}>
                                        {order.paymentMethod || 'COD'} / {order.paymentStatus || 'Pending'}
                                    </StatusPill>
                                </div>
                                <div className="text-left sm:text-right">
                                    <p className="mb-1 text-sm font-black uppercase tracking-widest text-slate-400">Order Date</p>
                                    <p className="flex items-center gap-2 font-bold text-slate-950 sm:justify-end">
                                        <Calendar size={16} className="text-slate-400" />
                                        {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>

                            <div className="border-b border-slate-200 px-5 py-10 sm:px-8">
                                {order.status === 'Cancelled' ? (
                                    <div className="py-8 text-center">
                                        <XCircle size={64} className="mx-auto mb-4 text-red-500" />
                                        <h3 className="text-2xl font-black text-slate-950">Order Cancelled</h3>
                                        <p className="mt-2 text-slate-500">
                                            This order has been cancelled and will not be delivered.
                                        </p>
                                        {order.cancellation?.reason && (
                                            <p className="mt-3 text-sm font-semibold text-slate-600">
                                                Reason: {order.cancellation.reason}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="relative mx-auto max-w-2xl">
                                        <div className="absolute left-0 top-1/2 h-1.5 w-full -translate-y-1/2 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full bg-[var(--sf-accent)] transition-all duration-1000 ease-out"
                                                style={{ width: progressWidth }}
                                            />
                                        </div>

                                        <div className="relative z-10 flex items-center justify-between">
                                            {steps.map((step, index) => {
                                                const isCompleted = index <= currentStepIndex;
                                                const isCurrent = index === currentStepIndex;

                                                return (
                                                    <div key={step} className="flex flex-col items-center bg-white px-1 sm:px-2">
                                                        <div className={`flex h-11 w-11 items-center justify-center rounded-full border-4 border-white shadow-sm transition-all duration-500 sm:h-12 sm:w-12
                                                            ${isCompleted ? 'bg-[var(--sf-accent)] text-white shadow-[0_6px_16px_-8px_var(--sf-accent)]' : 'bg-slate-100 text-slate-400'}
                                                            ${isCurrent ? 'scale-110 ring-4 ring-[var(--sf-accent-ring)]' : ''}
                                                        `}>
                                                            {index === 0 && <Box size={20} />}
                                                            {index === 1 && <Package size={20} />}
                                                            {index === 2 && <Truck size={20} />}
                                                            {index === 3 && <CheckCircle size={20} />}
                                                        </div>
                                                        <p className={`mt-3 text-center text-xs font-black sm:text-sm ${isCompleted ? 'text-slate-950' : 'text-slate-400'}`}>
                                                            {step}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 sm:p-8">
                                <div>
                                    <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                                        <MapPin size={16} /> Delivery Information
                                    </h3>
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                        <p className="mb-1 font-black text-slate-950">{address?.fullName || order.customerName || 'Customer'}</p>
                                        <p className="leading-relaxed text-slate-600">
                                            {[address?.addressLine, address?.city].filter(Boolean).join(', ') || order.shippingZone}
                                        </p>
                                        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                                            <span className="text-sm text-slate-500">Zone</span>
                                            <span className="font-bold text-slate-950">{order.shippingZone}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                                        <Package size={16} /> Order Summary
                                    </h3>
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                        <div className="mb-4 space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600">Subtotal</span>
                                                <span className="font-bold text-slate-950">{formatMoney(order.subtotal || (order.totalAmount - order.shippingCost))}</span>
                                            </div>
                                            {Number(order.discount || 0) > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-600">Discount</span>
                                                    <span className="font-bold text-emerald-700">- {formatMoney(order.discount)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600">Shipping</span>
                                                <span className="font-bold text-slate-950">{formatMoney(order.shippingCost)}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                                            <span className="font-black text-slate-950">Total</span>
                                            <span className="text-xl font-black text-[var(--sf-accent)]">{formatMoney(order.totalAmount)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h2 className="text-lg font-black text-slate-950">Items in this order</h2>
                                        <p className="text-sm text-slate-500">Use these items if you need return/refund support after delivery.</p>
                                    </div>
                                    <StatusPill>{orderItems.length} item{orderItems.length === 1 ? '' : 's'}</StatusPill>
                                </div>
                                <div className="mt-4 space-y-3">
                                    {orderItems.map((item) => {
                                        const image = item.productId?.images?.[0];
                                        return (
                                            <div key={getItemKey(item)} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-white">
                                                    <SafeProductImage
                                                        src={image}
                                                        alt={item.title || 'Product image'}
                                                        width={64}
                                                        height={64}
                                                        sizes="64px"
                                                        className="h-full w-full object-cover"
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="line-clamp-2 font-black text-slate-950">{item.title}</p>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        Qty {item.quantity} · {item.sku || 'No SKU'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-slate-950">{formatMoney(item.total)}</p>
                                                    <p className="text-xs text-slate-500">{formatMoney(item.price)} each</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
                                            <XCircle size={22} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h2 className="font-black text-slate-950">Cancel order</h2>
                                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                                You can cancel only while the order is still pending.
                                            </p>
                                        </div>
                                    </div>
                                    {order.canCancel ? (
                                        <button
                                            type="button"
                                            onClick={() => setCancelOpen(true)}
                                            className="mt-4 w-full rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white hover:bg-rose-700"
                                        >
                                            Cancel Order
                                        </button>
                                    ) : (
                                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                                            {order.cancelUnavailableReason || 'Cancellation is not available for this order.'}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
                                            <RefreshCcw size={22} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h2 className="font-black text-slate-950">Return / refund</h2>
                                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                                Return support is available within 24 hours after delivery.
                                            </p>
                                        </div>
                                    </div>

                                    {order.returnRequest ? (
                                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-sm font-bold text-slate-600">Request status</span>
                                                <StatusPill tone={returnStatusTone}>{order.returnRequest.status}</StatusPill>
                                            </div>
                                            <p className="mt-3 text-sm text-slate-600">{order.returnRequest.reason}</p>
                                            <div className="mt-3 border-t border-slate-200 pt-3 text-sm text-slate-500">
                                                Refund: {order.returnRequest.refund?.status || 'Pending'} · {formatMoney(order.returnRequest.refund?.amount)}
                                            </div>
                                        </div>
                                    ) : canRequestReturn ? (
                                        <button
                                            type="button"
                                            onClick={openReturnModal}
                                            className="mt-4 w-full rounded-2xl bg-[var(--sf-accent)] px-4 py-3 text-sm font-black text-white hover:opacity-90"
                                        >
                                            Request Return/Refund
                                        </button>
                                    ) : (
                                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                                            {order.returnEligibility?.reason || 'Return is not available for this order yet.'}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[1.5rem] border border-teal-100 bg-teal-50 p-4 text-sm text-teal-900">
                                    <div className="flex gap-2 font-black">
                                        <ShieldCheck size={18} />
                                        Support note
                                    </div>
                                    <p className="mt-2 leading-6">
                                        Vendors can review cancellation and return requests from their order and return management dashboard.
                                    </p>
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </div>

            {cancelOpen && (
                <ModalShell title="Cancel this order?" onClose={() => setCancelOpen(false)}>
                    <form onSubmit={handleCancelOrder} className="space-y-4">
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                            <div className="mb-1 flex items-center gap-2 font-black">
                                <AlertTriangle size={18} />
                                Pending orders only
                            </div>
                            You can only cancel while the order is still pending. Once the vendor starts processing, cancellation is no longer available here.
                        </div>
                        <label className="block">
                            <span className="text-sm font-black text-slate-700">Reason</span>
                            <select
                                value={cancelReason}
                                onChange={(event) => setCancelReason(event.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[var(--sf-accent)] focus:ring-2 focus:ring-[var(--sf-accent-ring)]"
                            >
                                {cancellationReasons.map(reason => <option key={reason}>{reason}</option>)}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-sm font-black text-slate-700">Optional note</span>
                            <textarea
                                value={cancelNote}
                                onChange={(event) => setCancelNote(event.target.value)}
                                rows={3}
                                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[var(--sf-accent)] focus:ring-2 focus:ring-[var(--sf-accent-ring)]"
                                placeholder="Add anything the seller should know."
                            />
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setCancelOpen(false)}
                                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                            >
                                Keep order
                            </button>
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-60"
                            >
                                {actionLoading ? 'Cancelling...' : 'Confirm cancel'}
                            </button>
                        </div>
                    </form>
                </ModalShell>
            )}

            {returnOpen && (
                <ModalShell title="Request return/refund" onClose={() => setReturnOpen(false)}>
                    <form onSubmit={handleSubmitReturn} className="space-y-4">
                        <div>
                            <span className="text-sm font-black text-slate-700">Select item(s)</span>
                            <div className="mt-2 space-y-2">
                                {orderItems.map(item => (
                                    <label key={getItemKey(item)} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 text-sm hover:bg-slate-50">
                                        <input
                                            type="checkbox"
                                            checked={selectedReturnItems.includes(getItemKey(item))}
                                            onChange={() => toggleReturnItem(item)}
                                            className="h-4 w-4 rounded border-slate-300"
                                        />
                                        <span className="min-w-0 flex-1 font-semibold text-slate-800">{item.title}</span>
                                        <span className="text-xs text-slate-500">Qty {item.quantity}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <label className="block">
                            <span className="text-sm font-black text-slate-700">Reason</span>
                            <select
                                value={returnReason}
                                onChange={(event) => setReturnReason(event.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[var(--sf-accent)] focus:ring-2 focus:ring-[var(--sf-accent-ring)]"
                            >
                                {returnReasons.map(reason => <option key={reason}>{reason}</option>)}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-sm font-black text-slate-700">Details</span>
                            <textarea
                                value={returnDescription}
                                onChange={(event) => setReturnDescription(event.target.value)}
                                rows={4}
                                required
                                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[var(--sf-accent)] focus:ring-2 focus:ring-[var(--sf-accent-ring)]"
                                placeholder="Tell the seller what happened."
                            />
                        </label>
                        <p className="rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                            Image proof upload is not available on this tracking page yet. Add details here and the seller can follow up from return management.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setReturnOpen(false)}
                                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                            >
                                Not now
                            </button>
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="rounded-2xl bg-[var(--sf-accent)] px-4 py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-60"
                            >
                                {actionLoading ? 'Submitting...' : 'Submit request'}
                            </button>
                        </div>
                    </form>
                </ModalShell>
            )}
        </div>
    );
}
