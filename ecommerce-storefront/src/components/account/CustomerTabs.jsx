"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
            <h2 className="mb-5 text-xl font-black text-slate-950">Order History</h2>

            {orders.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
                    <Package size={48} className="mx-auto mb-4 text-slate-300" />
	                    <p className="mb-4 text-slate-500">You haven&apos;t placed any orders yet.</p>
                    <Link href="/" className="font-black text-[var(--sf-accent)] underline transition-opacity hover:opacity-80">
                        Start Shopping
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => {
                        const isExpanded = expandedOrderId === order._id;

                        return (
                            <div key={order._id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-slate-300">

                                {/* Main Order Row (Clickable) */}
                                <div
                                    onClick={() => toggleOrderDetails(order._id)}
                                    className="group flex cursor-pointer flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
                                >
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <p className="font-black text-slate-950">Order #{order._id.slice(-6).toUpperCase()}</p>
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                                                {new Date(order.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500">
                                            {order.items[0]?.title || 'Product'}
                                            {order.items.length > 1 && <span className="font-medium italic"> + {order.items.length - 1} more item(s)</span>}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                                        <div className="text-left sm:text-right">
                                            <p className="mb-1 text-lg font-black text-slate-950">৳ {order.pricing?.total}</p>
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                                                order.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200/50' :
                                                    order.status === 'Shipped' ? 'bg-blue-50 text-blue-600 border border-blue-200/50' :
                                                        order.status === 'Delivered' ? 'bg-green-50 text-green-600 border border-green-200/50' :
                                                            'bg-gray-50 text-gray-600 border border-gray-200/50'
                                            }`}>
                                                {order.status}
                                            </span>
                                        </div>

                                        <button className="flex items-center gap-1 rounded-xl bg-[var(--sf-accent-bg)] px-4 py-2 text-sm font-black text-[var(--sf-accent)] transition-colors group-hover:bg-blue-100">
                                            {isExpanded ? 'Hide' : 'View'}
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Order Details */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-50/70 p-5">
                                        <h4 className="mb-4 text-xs font-black uppercase tracking-wider text-slate-400">Order Items</h4>
                                        <div className="space-y-4">
                                            {order.items.map((item, index) => {
                                                const productId = item.productId || item.product?._id || item.product || item._id;
                                                const productUrl = subdomain ? `/${subdomain}/products/${productId}` : `/products/${productId}`;

                                                return (
                                                    <div key={index} className="flex items-start justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                                        <div className="flex gap-4">
                                                            {/* Clickable Image */}
                                                            {item.imageUrl && (
                                                                <Link href={productUrl} className="shrink-0">
                                                                    <Image
                                                                        src={item.imageUrl}
                                                                        alt={item.title}
                                                                        width={64}
                                                                        height={64}
                                                                        className="h-16 w-16 rounded-xl border border-slate-200 object-cover transition-opacity hover:opacity-80"
                                                                    />
                                                                </Link>
                                                            )}
                                                            <div>
                                                                {/* Clickable Title */}
                                                                <Link href={productUrl} className="group/link flex items-center gap-1.5 w-fit">
                                                                    <p className="mb-1 font-black text-slate-950 transition-colors group-hover/link:text-[var(--sf-accent)]">
                                                                        {item.title}
                                                                    </p>
                                                                    <ExternalLink size={12} className="text-gray-300 opacity-0 group-hover/link:opacity-100 transition-opacity mb-1" />
                                                                </Link>

                                                                {/* Render Variants if they exist */}
                                                                {item.variant?.attributes && (
                                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                                        {item.variant.attributes.map((attr, idx) => (
                                                                            <span key={idx} className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                                                                {attr.name}: {attr.value}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                <p className="text-sm font-semibold text-slate-500">Qty: {item.quantity}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="font-black text-slate-950">৳ {item.price}</p>
                                                            {item.quantity > 1 && (
                                                                <p className="text-xs text-gray-400 mt-1">৳ {item.price * item.quantity} total</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Order Summary Footer */}
                                        <div className="mt-6 flex flex-col items-end border-t border-slate-200 pt-4 text-sm">
                                            <div className="mb-2 flex w-full justify-between text-slate-600 sm:w-64">
                                                <span>Subtotal</span>
                                                <span className="font-medium">৳ {order.pricing?.subtotal || order.pricing?.total}</span>
                                            </div>
                                            {order.pricing?.shipping > 0 && (
                                                <div className="flex justify-between w-full sm:w-64 mb-3 text-gray-600">
                                                    <span>Shipping</span>
                                                    <span className="font-medium">৳ {order.pricing.shipping}</span>
                                                </div>
                                            )}
                                            <div className="flex w-full justify-between text-lg font-black text-slate-950 sm:w-64">
                                                <span>Total</span>
                                                <span className="text-[var(--sf-accent)]">৳ {order.pricing?.total}</span>
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
            <h2 className="mb-5 text-xl font-black text-slate-950">Profile Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <label className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">Full Name</label>
                    <p className="text-lg font-bold text-slate-950">{user.fullName || 'Not provided'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <label className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">Email Address</label>
                    <p className="text-lg font-bold text-slate-950">{user.email}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">Account Role</label>
                    <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-sm">
                        {user.role}
                    </span>
                </div>
            </div>
        </div>
    );
}

// 🌟 UPDATED: SecurityTab now handles its own state and API requests
export function SecurityTab() {
    const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [loading, setLoading] = useState(false);

    const passwordChecks = {
        length: passForm.newPassword.length >= 8,
        lower: /[a-z]/.test(passForm.newPassword),
        upper: /[A-Z]/.test(passForm.newPassword),
        number: /\d/.test(passForm.newPassword),
        special: /[^A-Za-z0-9]/.test(passForm.newPassword)
    };
    const passwordScore = Object.values(passwordChecks).filter(Boolean).length;
    const passwordsMatch = passForm.newPassword && passForm.confirmPassword && passForm.newPassword === passForm.confirmPassword;

    const handlePasswordReset = async (e) => {
        e.preventDefault();

        if (passwordScore < 5) {
            return toast.error("Use at least 8 characters with uppercase, lowercase, number, and special character.");
        }

        if (!passwordsMatch) {
            return toast.error("Passwords do not match.");
        }

        setLoading(true);
        try {
            const { data } = await API.put('/auth/update-password', {
                currentPassword: passForm.currentPassword,
                newPassword: passForm.newPassword,
                confirmPassword: passForm.confirmPassword
            });

            toast.success(data.message || "Password updated successfully!");
            setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });

        } catch (error) {
            toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md">
            <h2 className="mb-5 flex items-center gap-2 text-xl font-black text-slate-950">
                <Lock size={20} className="text-slate-400" />
                Change Password
            </h2>
            <form onSubmit={handlePasswordReset} className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700">Current Password</label>
                    <input
                        required
                        type="password"
                        value={passForm.currentPassword}
                        onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                        className="sf-field"
                        placeholder="Enter current password"
                    />
                </div>
                <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700">New Password</label>
                    <input
                        required
                        type="password"
                        value={passForm.newPassword}
                        onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                        className="sf-field"
                        placeholder="Enter new password"
                    />
                    <div className="mt-3">
                        <div className="mb-2 grid grid-cols-5 gap-1">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <span key={index} className={`h-1.5 rounded-full ${index < passwordScore ? 'bg-[var(--sf-accent)]' : 'bg-slate-200'}`} />
                            ))}
                        </div>
                        <p className="text-xs leading-5 text-slate-500">
                            Use 8+ characters with uppercase, lowercase, number, and special character.
                        </p>
                    </div>
                </div>
                <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700">Confirm New Password</label>
                    <input
                        required
                        type="password"
                        value={passForm.confirmPassword}
                        onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                        className="sf-field"
                        placeholder="Repeat new password"
                    />
                    {passForm.confirmPassword && !passwordsMatch && (
                        <p className="mt-2 text-xs font-bold text-red-600">Passwords do not match.</p>
                    )}
                </div>
                <button
                    type="submit"
                    disabled={loading || passwordScore < 5 || !passwordsMatch}
                    className="sf-btn sf-btn-primary mt-2 w-full disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {loading ? 'Updating...' : 'Update Password'}
                </button>
            </form>
        </div>
    );
}
