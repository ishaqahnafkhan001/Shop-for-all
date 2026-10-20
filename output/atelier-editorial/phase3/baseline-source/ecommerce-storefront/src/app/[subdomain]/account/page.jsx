"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/api/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext'; // 🌟 Import Auth Context

import AuthView from '@/components/account/AuthView';
import VendorView from '@/components/account/VendorView';
import CustomerDashboard from '@/components/account/CustomerDashboard';
import PasswordResetFlow from '@/components/account/PasswordResetFlow';

export default function AccountPage({ params }) {
    const { subdomain } = React.use(params);
    const router = useRouter();

    // 🌟 Pull global state and functions from AuthContext
    const { user, loading: authLoading, login, logout, checkAuthStatus } = useAuth();

    const [isRegistering, setIsRegistering] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [authForm, setAuthForm] = useState({ fullName: '', email: '', password: '', otp: '' });
    const [otpSent, setOtpSent] = useState(false);
    const [otpTimer, setOtpTimer] = useState(0);
    const [otpLoading, setOtpLoading] = useState(false);

    const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '' });
    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);

    // Check for existing OTP timer on mount
    useEffect(() => {
        const expiry = localStorage.getItem('otp_expiry');
        if (expiry) {
            const remaining = Math.floor((parseInt(expiry) - Date.now()) / 1000);
            if (remaining > 0) {
                queueMicrotask(() => {
                    setOtpTimer(remaining);
                    setOtpSent(true);
                });
            } else {
                localStorage.removeItem('otp_expiry');
            }
        }
    }, []);

    // Timer countdown logic
    useEffect(() => {
        let interval;
        if (otpTimer > 0) {
            interval = setInterval(() => {
                setOtpTimer((prev) => {
                    if (prev <= 1) {
                        localStorage.removeItem('otp_expiry');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [otpTimer]);

    // Reset form when switching between Login & Register
    useEffect(() => {
        queueMicrotask(() => {
            setOtpSent(false);
            setAuthForm({ fullName: '', email: '', password: '', otp: '' });
        });
    }, [isRegistering]);

    // 🌟 Fetch orders automatically if the user is a logged-in customer
    useEffect(() => {
        const fetchOrders = async () => {
            if (user && user.role === 'Customer') {
                setOrdersLoading(true);
                try {
                    // No need for 'Authorization' header; HttpOnly cookie handles it automatically!
                    const { data } = await API.get(`/storefront/${subdomain}/my-orders`);
                    setOrders(data.data || []);
                } catch (error) {
                    console.error("Failed to fetch orders", error);
                } finally {
                    setOrdersLoading(false);
                }
            }
        };

        fetchOrders();
    }, [user, subdomain]);

    const handleSendOTP = async () => {
        if (!authForm.fullName || !authForm.email || !authForm.password) {
            return toast.error("Please fill in all details first");
        }

        if (otpTimer > 0) return;

        setOtpLoading(true);
        try {
            const { data } = await API.post('/auth/send-otp', { email: authForm.email });
            if (data.success) {
                setOtpSent(true);
                toast.success("Verification code sent to your email!");
                setOtpTimer(180);
                localStorage.setItem('otp_expiry', Date.now() + 180000);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to send OTP");
        } finally {
            setOtpLoading(false);
        }
    };

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isRegistering) {
                // 1. Register Flow
                const payload = { ...authForm, subdomain };
                await API.post('/auth/register-customer', payload);

                // Assuming your backend sets the HttpOnly cookie upon successful registration,
                // we tell the AuthContext to fetch the new user profile.
                await checkAuthStatus(subdomain);

                toast.success("Registration successful!");
                router.push('/');
            } else {
                // 2. Login Flow (Using Context)
                const result = await login(authForm.email, authForm.password, subdomain);
                if (result.success) {
                    toast.success("Welcome back!");
                } else {
                    toast.error(result.message);
                    return; // Stop execution on failure
                }
            }

            // Clean up timer on successful login/registration
            localStorage.removeItem('otp_expiry');
            setOtpTimer(0);
        } catch (error) {
            toast.error(error.response?.data?.error || error.response?.data?.message || "Authentication failed");
        }
    };

    const handleUserLogout = async () => {
        await logout(); // 🌟 Calls the context logout function
        setOrders([]);
        toast.success("Logged out successfully");
        router.push('/'); // Optional: Redirect to home after logout
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        toast.success("Password reset functionality would trigger here!");
        setPassForm({ oldPassword: '', newPassword: '' });
    };

    // 🌟 Use authLoading from context instead of local state
    if (authLoading || (user && user.role === 'Customer' && ordersLoading)) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-gray-200"></div>
                    <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-4 border-[var(--sf-accent)] border-t-transparent animate-spin"></div>
                </div>
            </div>
        );
    }

    if (!user) {
        if (isResettingPassword) {
            return (
                <PasswordResetFlow
                    subdomain={subdomain}
                    onBack={() => setIsResettingPassword(false)}
                    onComplete={() => {
                        setIsResettingPassword(false);
                        setIsRegistering(false);
                    }}
                />
            );
        }

        return (
            <AuthView
                isRegistering={isRegistering}
                setIsRegistering={setIsRegistering}
                onForgotPassword={() => {
                    setIsRegistering(false);
                    setIsResettingPassword(true);
                }}
                authForm={authForm}
                setAuthForm={setAuthForm}
                handleAuthSubmit={handleAuthSubmit}
                otpSent={otpSent}
                handleSendOTP={handleSendOTP}
                otpTimer={otpTimer}
                otpLoading={otpLoading}
            />
        );
    }

    if (user.role === 'VendorAdmin' || user.role === 'VendorStaff') {
        return <VendorView user={user} handleLogout={handleUserLogout} />;
    }

    return (
        <CustomerDashboard
            user={user}
            orders={orders}
            handleLogout={handleUserLogout}
            passForm={passForm}
            setPassForm={setPassForm}
            handlePasswordReset={handlePasswordReset}
        />
    );
}
