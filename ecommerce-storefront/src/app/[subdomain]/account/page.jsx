"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/api/api';
import { toast } from 'react-hot-toast';
import { Package, User, KeyRound, LogOut, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function AccountPage({ params }) {
    const { subdomain } = React.use(params);
    const router = useRouter();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRegistering, setIsRegistering] = useState(false);
    const [authForm, setAuthForm] = useState({ fullName: '', email: '', password: '' });
    const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '' });
    const [orders, setOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('orders');

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('shopforall_token');
            const savedUser = localStorage.getItem('shopforall_user');

            if (token && savedUser) {
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);
                if (parsedUser.role === 'Customer') {
                    fetchMyOrders(token);
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const fetchMyOrders = async (token) => {
        try {
            const { data } = await API.get('/public/my-orders', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(data);
        } catch (error) {
            console.error("Failed to fetch orders");
        }
    };

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        try {
            const endpoint = isRegistering ? '/auth/register-customer' : '/auth/login';

            let payload = isRegistering
                ? { ...authForm, subdomain }
                : { email: authForm.email, password: authForm.password };

            const { data } = await API.post(endpoint, payload);

            localStorage.setItem('shopforall_token', data.token);
            localStorage.setItem('shopforall_user', JSON.stringify(data.user));

            setUser(data.user);
            toast.success(`Welcome back!`);

            if (data.user.role === 'Customer') {
                router.push('/');
            }

        } catch (error) {
            toast.error(error.response?.data?.error || "Authentication failed");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('shopforall_token');
        localStorage.removeItem('shopforall_user');
        setUser(null);
        toast.success("Logged out successfully");
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        toast.success("Password reset functionality would trigger here!");
        setPassForm({ oldPassword: '', newPassword: '' });
    };

    if (loading) return <div className="min-h-[60vh] flex items-center justify-center">Loading...</div>;

    // ==========================================
    // VIEW 1: NOT LOGGED IN
    // ==========================================
    if (!user) {
        return (
            <div className="container mx-auto px-4 py-16 max-w-md">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {isRegistering ? 'Create Account' : 'Welcome Back'}
                    </h1>
                    <form onSubmit={handleAuthSubmit} className="space-y-4">
                        {isRegistering && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input required type="text" value={authForm.fullName} onChange={(e) => setAuthForm({...authForm, fullName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-900 outline-none" />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <input required type="email" value={authForm.email} onChange={(e) => setAuthForm({...authForm, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-900 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input required type="password" value={authForm.password} onChange={(e) => setAuthForm({...authForm, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-900 outline-none" />
                        </div>

                        <button type="submit" className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-colors mt-4">
                            {isRegistering ? 'Sign Up' : 'Sign In'}
                        </button>
                    </form>
                    <div className="mt-6 text-center">
                        <button onClick={() => setIsRegistering(!isRegistering)} className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                            {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // VIEW 2 & 3: LOGGED IN VIEWS
    // ==========================================
    const userRole = user?.role;

    // ADMIN/VENDOR VIEW
    if (userRole === 'VendorAdmin' || userRole === 'VendorStaff') {
        return (
            <div className="container mx-auto px-4 py-16 max-w-3xl">
                <div className="bg-gray-900 text-white p-10 rounded-[2rem] text-center relative overflow-hidden border border-gray-800 shadow-2xl">
                    <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                    <div className="relative z-10">
                        <ShieldCheck size={48} className="mx-auto mb-6 text-indigo-400" />
                        <h1 className="text-3xl font-bold mb-2">Management Portal</h1>
                        <p className="text-gray-400 mb-10 max-w-md mx-auto">
                            Hello, <span className="text-white font-semibold">{user.fullName}</span>.
                            You are logged in as <span className="text-indigo-400 font-medium">{userRole}</span>.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <a href="http://localhost:5173/login" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white text-gray-900 px-8 py-3.5 rounded-xl font-bold hover:bg-indigo-50 transition-all transform hover:scale-105">
                                Open Admin Panel <ArrowRight size={18} />
                            </a>
                            <button onClick={handleLogout} className="px-8 py-3.5 rounded-xl font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // CUSTOMER VIEW
    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl">
            <div className="flex justify-between items-end mb-10 border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
                    <p className="text-gray-500">Welcome back, {user.fullName || user.email}</p>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition font-medium text-sm">
                    <LogOut size={16} /> Sign Out
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-10">

                {/* LEFT SIDEBAR */}
                <div className="w-full md:w-64 flex-shrink-0 space-y-2">
                    <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'orders' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <Package size={20} /> Order History
                    </button>
                    <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'profile' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <User size={20} /> My Profile
                    </button>
                    <button onClick={() => setActiveTab('security')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'security' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <KeyRound size={20} /> Password Reset
                    </button>
                </div>

                {/* RIGHT CONTENT WRAPPER */}
                <div className="flex-1 bg-white border border-gray-100 rounded-3xl p-6 sm:p-10 shadow-sm">

                    {/* ORDERS TAB */}
                    {activeTab === 'orders' && (
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
                                        <div key={order._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-gray-200 rounded-2xl gap-4 hover:border-gray-300 transition-colors">
                                            <div>
                                                <p className="font-bold text-gray-900">Order #{order._id.slice(-6).toUpperCase()}</p>
                                                <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="font-bold text-gray-900">৳{order.totalAmount}</p>
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                                                        order.status === 'Pending' ? 'bg-yellow-50 text-yellow-600' :
                                                            order.status === 'Shipped' ? 'bg-blue-50 text-blue-600' :
                                                                'bg-green-50 text-green-600'
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
                    )}

                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
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
                    )}

                    {/* SECURITY TAB */}
                    {activeTab === 'security' && (
                        <div className="max-w-md">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Reset Password</h2>
                            <form onSubmit={handlePasswordReset} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                                    <input required type="password" value={passForm.oldPassword} onChange={(e) => setPassForm({...passForm, oldPassword: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-900 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                    <input required type="password" value={passForm.newPassword} onChange={(e) => setPassForm({...passForm, newPassword: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-900 outline-none" />
                                </div>
                                <button type="submit" className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors mt-2">
                                    Update Password
                                </button>
                            </form>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}