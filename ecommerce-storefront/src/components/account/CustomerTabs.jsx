import React from 'react';
import Link from 'next/link';

export function OrderHistoryTab({ orders }) {
    return (
        <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Order History</h2>
            {orders.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl">
                    <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
                    <Link href="/" className="text-gray-900 font-bold underline">Start Shopping</Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => (
                        <div key={order._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-gray-200 rounded-2xl gap-4 hover:border-gray-300 transition-colors bg-white">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <p className="font-bold text-gray-900">Order #{order._id.slice(-6).toUpperCase()}</p>
                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                {/* Show the first item they bought, and note if there are more */}
                                <p className="text-sm text-gray-500">
                                    {order.items[0]?.title}
                                    {order.items.length > 1 && <span className="italic"> + {order.items.length - 1} more item(s)</span>}
                                </p>
                            </div>

                            <div className="flex items-center gap-6 sm:justify-end">
                                <div className="text-right">
                                    {/* Updated to use your exact JSON structure: order.pricing.total */}
                                    <p className="font-bold text-gray-900 text-lg mb-1">৳{order.pricing.total}</p>

                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                                        order.status === 'Pending' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                                            order.status === 'Shipped' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                order.status === 'Delivered' ? 'bg-green-50 text-green-600 border border-green-100' :
                                                    'bg-gray-50 text-gray-600'
                                    }`}>
                                        {order.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
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
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Full Name</label>
                    <p className="font-semibold text-gray-900">{user.fullName || 'Not provided'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Email Address</label>
                    <p className="font-semibold text-gray-900">{user.email}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Account Role</label>
                    <span className="bg-gray-200 text-gray-800 text-xs font-bold px-3 py-1 rounded-full uppercase">{user.role}</span>
                </div>
            </div>
        </div>
    );
}

export function SecurityTab({ passForm, setPassForm, handlePasswordReset }) {
    return (
        <div className="max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Reset Password</h2>
            <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <input required type="password" value={passForm.oldPassword} onChange={(e) => setPassForm({ ...passForm, oldPassword: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-900 outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input required type="password" value={passForm.newPassword} onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-900 outline-none" />
                </div>
                <button type="submit" className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors mt-2">
                    Update Password
                </button>
            </form>
        </div>
    );
}