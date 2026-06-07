"use client";
import React, { useState } from 'react';
import { Search, Package, Truck, CheckCircle, MapPin, Box, Calendar, XCircle } from 'lucide-react';
import API from '@/api/api';
import { toast } from 'react-hot-toast';

export default function TrackOrderPage({ params }) {
    const { subdomain } = React.use(params);
    const [trackingId, setTrackingId] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [order, setOrder] = useState(null);

    const handleTrackOrder = async (e) => {
        e.preventDefault();
        if (!trackingId.trim()) return toast.error("Please enter an Order ID");
        if (!phone.trim()) return toast.error("Please enter the delivery phone number");

        setLoading(true);
        try {
            const { data } = await API.get(`/storefront/${subdomain}/track-order/${trackingId.trim()}`, {
                params: { phone: phone.trim() }
            });
            setOrder(data);
            toast.success("Order found!");
        } catch (error) {
            setOrder(null);
            toast.error(error.response?.data?.error || "Order not found.");
        } finally {
            setLoading(false);
        }
    };

    // Visualization Logic
    const steps = ['Pending', 'Processing', 'Shipped', 'Delivered'];

    // Find how far along the order is (0 to 3)
    const currentStepIndex = order ? steps.indexOf(order.status) : -1;

    // Calculate the width of the colored progress line
    const progressWidth = currentStepIndex === -1 ? '0%' : `${(currentStepIndex / (steps.length - 1)) * 100}%`;

    return (
        <div className="sf-page min-h-[70vh]">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:py-12">

            {/* SEARCH SECTION */}
            <div className="mb-8 text-center">
                <p className="sf-kicker mb-2">Order tracking</p>
                <h1 className="sf-heading mb-4 text-4xl">Track Your Order</h1>
                <p className="mx-auto mb-7 max-w-lg text-sm leading-6 text-slate-500">
                    Enter the short Order ID from your confirmation screen and delivery phone number to get real-time delivery updates.
                </p>

                <form onSubmit={handleTrackOrder} className="mx-auto max-w-xl space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            value={trackingId}
                            onChange={(e) => setTrackingId(e.target.value)}
                            placeholder="Order ID, for example A1B2C3"
                            className="sf-field pl-12 font-mono"
                        />
                    </div>
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
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

            {/* RESULTS SECTION */}
            {order && (
                <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">

                    {/* Header Strip */}
                    <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center">
                        <div>
                            <p className="mb-1 text-sm font-black uppercase tracking-widest text-slate-400">Order ID</p>
                            <p className="font-mono text-lg font-black text-[var(--sf-accent)]">#{order._id.slice(-8).toUpperCase()}</p>
                        </div>
                        <div className="text-left sm:text-right">
                            <p className="mb-1 text-sm font-black uppercase tracking-widest text-slate-400">Order Date</p>
                            <p className="flex items-center gap-2 font-bold text-slate-950 sm:justify-end">
                                <Calendar size={16} className="text-slate-400"/>
                                {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    {/* PROGRESS TRACKER VISUALIZATION */}
                    <div className="border-b border-slate-200 px-5 py-10 sm:px-8">
                        {order.status === 'Cancelled' ? (
                            <div className="text-center py-8">
                                <XCircle size={64} className="mx-auto text-red-500 mb-4" />
                                <h3 className="text-2xl font-black text-slate-950">Order Cancelled</h3>
                                <p className="mt-2 text-slate-500">This order has been cancelled and will not be delivered.</p>
                            </div>
                        ) : (
                            <div className="relative max-w-2xl mx-auto">
                                {/* The Background Track Line */}
                                <div className="absolute left-0 top-1/2 h-1.5 w-full -translate-y-1/2 overflow-hidden rounded-full bg-slate-100">
                                    {/* The Animated Colored Line */}
                                    <div
                                        className="h-full bg-[var(--sf-accent)] transition-all duration-1000 ease-out"
                                        style={{ width: progressWidth }}
                                    ></div>
                                </div>

                                {/* The Step Nodes */}
                                <div className="relative flex justify-between items-center z-10">
                                    {steps.map((step, index) => {
                                        const isCompleted = index <= currentStepIndex;
                                        const isCurrent = index === currentStepIndex;

                                        return (
                                            <div key={step} className="flex flex-col items-center bg-white px-2">
                                                <div className={`flex h-12 w-12 items-center justify-center rounded-full border-4 border-white shadow-sm transition-all duration-500
                                                    ${isCompleted ? 'bg-[var(--sf-accent)] text-white shadow-[0_6px_16px_-8px_var(--sf-accent)]' : 'bg-slate-100 text-slate-400'}
                                                    ${isCurrent ? 'ring-4 ring-[var(--sf-accent-ring)] scale-110' : ''}
                                                `}>
                                                    {index === 0 && <Box size={20} />}
                                                    {index === 1 && <Package size={20} />}
                                                    {index === 2 && <Truck size={20} />}
                                                    {index === 3 && <CheckCircle size={20} />}
                                                </div>
                                                <p className={`mt-3 text-sm font-black ${isCompleted ? 'text-slate-950' : 'text-slate-400'}`}>
                                                    {step}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ORDER DETAILS GRID */}
                    <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 sm:p-8">
                        {/* Left: Shipping Info */}
                        <div>
                            <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                                <MapPin size={16} /> Delivery Information
                            </h3>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                <p className="mb-1 font-black text-slate-950">Shipping Address</p>
                                <p className="leading-relaxed text-slate-600">{order.shippingAddress}</p>
                                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                                    <span className="text-sm text-slate-500">Zone</span>
                                    <span className="font-bold text-slate-950">{order.shippingZone}</span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Payment Info */}
                        <div>
                            <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                                <Package size={16} /> Order Summary
                            </h3>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                <div className="space-y-3 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Items ({order.items.length})</span>
                                        <span className="font-bold text-slate-950">৳ {order.totalAmount - order.shippingCost}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Shipping</span>
                                        <span className="font-bold text-slate-950">৳ {order.shippingCost}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                                    <span className="font-black text-slate-950">Total Paid</span>
                                    <span className="text-xl font-black text-[var(--sf-accent)]">৳ {order.totalAmount}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
}
