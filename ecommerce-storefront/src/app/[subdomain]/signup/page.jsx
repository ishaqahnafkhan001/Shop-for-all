"use client";
import React, { useState } from 'react';
import API from '@/api/api';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { UserPlus, Mail, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function SignUpPage({ params }) {
    const { subdomain } = React.use(params);

    // ✨ ADD THIS: Fetch the shop data to get the official shopName
    const { shop } = useShopData(subdomain);

    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            return toast.error("Passwords do not match");
        }

        setLoading(true);
        try {
            const payload = {
                fullName: formData.fullName,
                email: formData.email,
                password: formData.password,
                subdomain: subdomain, // Joi is now expecting this!
                role: 'Customer'
            };
            console.log(payload)

            // ✨ THE FIX: Change '/auth/register' to '/auth/register-customer'
            const { data } = await API.post('/auth/register-customer', payload);

            localStorage.setItem('shopforall_token', data.token);
            localStorage.setItem('shopforall_user', JSON.stringify(data.user));

            toast.success("Account created successfully!");
            router.push('/');}
        catch (error) {
            toast.error(error.response?.data?.error || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full">

                {/* 1. HEADER */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 text-white rounded-2xl mb-6 shadow-xl shadow-gray-900/20">
                        <UserPlus size={32} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Join {subdomain}</h1>
                    <p className="text-gray-500 mt-2">Create your account to track orders and checkout faster.</p>
                </div>

                {/* 2. CARD */}
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-2xl shadow-gray-200/20">
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Full Name */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    required
                                    type="text"
                                    placeholder="John Doe"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 focus:bg-white outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    required
                                    type="email"
                                    placeholder="name@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 focus:bg-white outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    required
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 focus:bg-white outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Confirm Password</label>
                            <div className="relative">
                                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    required
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 focus:bg-white outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* SUBMIT BUTTON */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all transform active:scale-[0.98] disabled:opacity-70 mt-4 shadow-xl shadow-gray-900/10"
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Create Account
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* FOOTER LINK */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-500">
                            Already have an account?{' '}
                            <Link href="/account" className="text-gray-900 font-bold hover:underline underline-offset-4">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>

                {/* SECURITY BADGE */}
                <p className="mt-8 text-center text-[10px] text-gray-400 uppercase tracking-[0.2em] font-medium">
                    Secure 256-bit SSL Encryption
                </p>
            </div>
        </div>
    );
}