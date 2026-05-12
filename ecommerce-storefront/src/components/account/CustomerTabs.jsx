"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Package, ExternalLink, Lock } from 'lucide-react';
import API from '@/api/api'; // Added API import for password reset
import { toast } from 'react-hot-toast'; // Added toast for notifications

export function OrderHistoryTab({ orders, subdomain = "" }) {
    // State to track which order is currently expanded
    const [expandedOrderId, setExpandedOrderId] = useState(null);

    const toggleOrderDetails = (orderId) => {
        if (expandedOrderId === orderId) {
            setExpandedOrderId(null); // Close if already open
        } else {
            setExpandedOrderId(orderId); // Open clicked order
        }
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Order History</h2>

            {orders.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <Package size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
                    <Link href="/" className="text-[var(--sf-accent,blue-600)] font-bold underline hover:opacity-80 transition-opacity">
                        Start Shopping
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => {
                        const isExpanded = expandedOrderId === order._id;

                        return (
                            <div key={order._id} className="border border-gray-200 rounded-2xl bg-white overflow-hidden transition-all duration-200 hover:border-gray-300 shadow-sm">

                                {/* Main Order Row (Clickable) */}
                                <div
                                    onClick={() => toggleOrderDetails(order._id)}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-5 cursor-pointer gap-4 group"
                                >
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <p className="font-bold text-gray-900">Order #{order._id.slice(-6).toUpperCase()}</p>
                                            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
                                                {new Date(order.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            {order.items[0]?.title || 'Product'}
                                            {order.items.length > 1 && <span className="font-medium italic"> + {order.items.length - 1} more item(s)</span>}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                                        <div className="text-left sm:text-right">
                                            <p className="font-black text-gray-900 text-lg mb-1">৳ {order.pricing?.total}</p>
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                                                order.status === 'Pending' ? 'bg-yellow-50 text-yellow-600 border border-yellow-200/50' :
                                                    order.status === 'Shipped' ? 'bg-blue-50 text-blue-600 border border-blue-200/50' :
                                                        order.status === 'Delivered' ? 'bg-green-50 text-green-600 border border-green-200/50' :
                                                            'bg-gray-50 text-gray-600 border border-gray-200/50'
                                            }`}>
                                                {order.status}
                                            </span>
                                        </div>

                                        <button className="flex items-center gap-1 text-sm font-bold text-[var(--sf-accent,blue-600)] bg-blue-50 group-hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors">
                                            {isExpanded ? 'Hide' : 'View'}
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Order Details */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 bg-gray-50/50 p-5">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Order Items</h4>
                                        <div className="space-y-4">
                                            {order.items.map((item, index) => {
                                                const productId = item.productId || item.product?._id || item.product || item._id;
                                                const productUrl = subdomain ? `/${subdomain}/products/${productId}` : `/products/${productId}`;

                                                return (
                                                    <div key={index} className="flex justify-between items-start bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                                        <div className="flex gap-4">
                                                            {/* Clickable Image */}
                                                            {item.imageUrl && (
                                                                <Link href={productUrl} className="shrink-0">
                                                                    <img
                                                                        src={item.imageUrl}
                                                                        alt={item.title}
                                                                        className="w-16 h-16 object-cover rounded-lg border border-gray-100 hover:opacity-80 transition-opacity"
                                                                    />
                                                                </Link>
                                                            )}
                                                            <div>
                                                                {/* Clickable Title */}
                                                                <Link href={productUrl} className="group/link flex items-center gap-1.5 w-fit">
                                                                    <p className="font-bold text-gray-900 mb-1 group-hover/link:text-[var(--sf-accent,blue-600)] transition-colors">
                                                                        {item.title}
                                                                    </p>
                                                                    <ExternalLink size={12} className="text-gray-300 opacity-0 group-hover/link:opacity-100 transition-opacity mb-1" />
                                                                </Link>

                                                                {/* Render Variants if they exist */}
                                                                {item.variant?.attributes && (
                                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                                        {item.variant.attributes.map((attr, idx) => (
                                                                            <span key={idx} className="text-[10px] uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-semibold border border-gray-200">
                                                                                {attr.name}: {attr.value}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                <p className="text-sm text-gray-500 font-medium">Qty: {item.quantity}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="font-bold text-gray-900">৳ {item.price}</p>
                                                            {item.quantity > 1 && (
                                                                <p className="text-xs text-gray-400 mt-1">৳ {item.price * item.quantity} total</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Order Summary Footer */}
                                        <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col items-end text-sm">
                                            <div className="flex justify-between w-full sm:w-64 mb-2 text-gray-600">
                                                <span>Subtotal</span>
                                                <span className="font-medium">৳ {order.pricing?.subtotal || order.pricing?.total}</span>
                                            </div>
                                            {order.pricing?.shipping > 0 && (
                                                <div className="flex justify-between w-full sm:w-64 mb-3 text-gray-600">
                                                    <span>Shipping</span>
                                                    <span className="font-medium">৳ {order.pricing.shipping}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between w-full sm:w-64 text-gray-900 font-black text-lg">
                                                <span>Total</span>
                                                <span className="text-[var(--sf-accent,blue-600)]">৳ {order.pricing?.total}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export function ProfileTab({ user }) {
    return (
        <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 shadow-sm">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Full Name</label>
                    <p className="font-semibold text-gray-900 text-lg">{user.fullName || 'Not provided'}</p>
                </div>
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 shadow-sm">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Email Address</label>
                    <p className="font-semibold text-gray-900 text-lg">{user.email}</p>
                </div>
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 shadow-sm">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Account Role</label>
                    <span className="bg-gradient-to-r from-gray-800 to-gray-600 text-white text-xs font-bold px-3 py-1.5 rounded-md uppercase tracking-wider shadow-sm">
                        {user.role}
                    </span>
                </div>
            </div>
        </div>
    );
}

// 🌟 UPDATED: SecurityTab now handles its own state and API requests
export function SecurityTab() {
    const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '' });
    const [loading, setLoading] = useState(false);

    const handlePasswordReset = async (e) => {
        e.preventDefault();

        if (passForm.newPassword.length < 6) {
            return toast.error("New password must be at least 6 characters long");
        }

        setLoading(true);
        try {
            // Adjust this route to match your actual backend update-password endpoint
            const { data } = await API.put('/auth/update-password', {
                currentPassword: passForm.currentPassword,
                newPassword: passForm.newPassword
            });

            toast.success("Password updated successfully!");
            setPassForm({ currentPassword: '', newPassword: '' }); // Clear form

        } catch (error) {
            toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Lock size={20} className="text-gray-400" />
                Change Password
            </h2>
            <form onSubmit={handlePasswordReset} className="space-y-5 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Current Password</label>
                    <input
                        required
                        type="password"
                        value={passForm.currentPassword}
                        onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[var(--sf-accent,blue-600)] focus:border-transparent outline-none transition-all"
                        placeholder="Enter current password"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
                    <input
                        required
                        type="password"
                        value={passForm.newPassword}
                        onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[var(--sf-accent,blue-600)] focus:border-transparent outline-none transition-all"
                        placeholder="Enter new password"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gray-900 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-black transition-colors mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? 'Updating...' : 'Update Password'}
                </button>
            </form>
        </div>
    );
}