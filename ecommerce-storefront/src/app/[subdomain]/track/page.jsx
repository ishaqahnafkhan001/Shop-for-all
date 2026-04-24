"use client";
import React, { useState } from 'react';
import { Search, Package, Truck, CheckCircle, MapPin, Box, Calendar, XCircle } from 'lucide-react';
import API from '@/api/api';
import { toast } from 'react-hot-toast';

export default function TrackOrderPage() {
    const [trackingId, setTrackingId] = useState('');
    const [loading, setLoading] = useState(false);
    const [order, setOrder] = useState(null);

    const handleTrackOrder = async (e) => {
        e.preventDefault();
        if (!trackingId.trim()) return toast.error("Please enter an Order ID");

        setLoading(true);
        try {
            const { data } = await API.get(`/public/track-order/${trackingId.trim()}`);
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
        <div className="container mx-auto px-4 py-16 max-w-4xl min-h-[70vh]">

            {/* SEARCH SECTION */}
            <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Track Your Order</h1>
                <p className="text-gray-500 mb-8 max-w-lg mx-auto">
                    Enter your Order ID below to get real-time updates on your package's location and delivery status.
                </p>

                <form onSubmit={handleTrackOrder} className="max-w-xl mx-auto relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={trackingId}
                        onChange={(e) => setTrackingId(e.target.value)}
                        placeholder="e.g. 69eb382c2f37b0acbf14832e"
                        className="w-full pl-12 pr-32 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none text-gray-900 font-mono shadow-sm"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="absolute right-2 top-2 bottom-2 bg-gray-900 text-white px-6 rounded-xl font-bold hover:bg-indigo-600 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Searching...' : 'Track'}
                    </button>
                </form>
            </div>

            {/* RESULTS SECTION */}
            {order && (
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Header Strip */}
                    <div className="bg-gray-50 px-8 py-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Order ID</p>
                            <p className="text-lg font-mono font-bold text-indigo-600">#{order._id.slice(-8).toUpperCase()}</p>
                        </div>
                        <div className="text-left sm:text-right">
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Order Date</p>
                            <p className="font-semibold text-gray-900 flex items-center sm:justify-end gap-2">
                                <Calendar size={16} className="text-gray-400"/>
                                {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    {/* PROGRESS TRACKER VISUALIZATION */}
                    <div className="px-8 py-12 border-b border-gray-100">
                        {order.status === 'Cancelled' ? (
                            <div className="text-center py-8">
                                <XCircle size={64} className="mx-auto text-red-500 mb-4" />
                                <h3 className="text-2xl font-bold text-gray-900">Order Cancelled</h3>
                                <p className="text-gray-500 mt-2">This order has been cancelled and will not be delivered.</p>
                            </div>
                        ) : (
                            <div className="relative max-w-2xl mx-auto">
                                {/* The Background Track Line */}
                                <div className="absolute top-1/2 left-0 w-full h-1.5 bg-gray-100 -translate-y-1/2 rounded-full overflow-hidden">
                                    {/* The Animated Colored Line */}
                                    <div
                                        className="h-full bg-indigo-600 transition-all duration-1000 ease-out"
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
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 shadow-sm border-4 border-white
                                                    ${isCompleted ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-gray-100 text-gray-400'}
                                                    ${isCurrent ? 'ring-4 ring-indigo-100 scale-110' : ''}
                                                `}>
                                                    {index === 0 && <Box size={20} />}
                                                    {index === 1 && <Package size={20} />}
                                                    {index === 2 && <Truck size={20} />}
                                                    {index === 3 && <CheckCircle size={20} />}
                                                </div>
                                                <p className={`mt-3 font-bold text-sm ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 p-8 gap-8">
                        {/* Left: Shipping Info */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <MapPin size={16} /> Delivery Information
                            </h3>
                            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                <p className="font-bold text-gray-900 mb-1">Shipping Address</p>
                                <p className="text-gray-600 leading-relaxed">{order.shippingAddress}</p>
                                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                                    <span className="text-gray-500 text-sm">Zone</span>
                                    <span className="font-semibold text-gray-900">{order.shippingZone}</span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Payment Info */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Package size={16} /> Order Summary
                            </h3>
                            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                <div className="space-y-3 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Items ({order.items.length})</span>
                                        <span className="font-semibold text-gray-900">৳ {order.totalAmount - order.shippingCost}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Shipping</span>
                                        <span className="font-semibold text-gray-900">৳ {order.shippingCost}</span>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                                    <span className="font-bold text-gray-900">Total Paid</span>
                                    <span className="text-xl font-extrabold text-indigo-600">৳ {order.totalAmount}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}