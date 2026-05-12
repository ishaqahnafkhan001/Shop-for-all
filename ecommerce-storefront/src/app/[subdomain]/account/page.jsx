"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/api/api';
import { toast } from 'react-hot-toast';

import AuthView from '@/components/account/AuthView';
import VendorView from '@/components/account/VendorView';
import CustomerDashboard from '@/components/account/CustomerDashboard';

export default function AccountPage({ params }) {
    const { subdomain } = React.use(params);
    const router = useRouter();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRegistering, setIsRegistering] = useState(false);

    const [authForm, setAuthForm] = useState({ fullName: '', email: '', password: '', otp: '' });
    const [otpSent, setOtpSent] = useState(false);

    // NEW: Timer state (in seconds)
    const [otpTimer, setOtpTimer] = useState(0);

    const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '' });
    const [orders, setOrders] = useState([]);

    // Check for existing timer on mount so a page refresh doesn't bypass the lock
    useEffect(() => {
        const expiry = localStorage.getItem('otp_expiry');
        if (expiry) {
            const remaining = Math.floor((parseInt(expiry) - Date.now()) / 1000);
            if (remaining > 0) {
                setOtpTimer(remaining);
                setOtpSent(true); // If there's a timer, the OTP was already sent
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

    useEffect(() => {
        setOtpSent(false);
        setAuthForm({ fullName: '', email: '', password: '', otp: '' });
    }, [isRegistering]);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('shopforall_token');
            const savedUser = localStorage.getItem('shopforall_user');

            if (token && savedUser) {
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);

                if (parsedUser.role === 'Customer') {
                    try {
                        const { data } = await API.get(`/storefront/${subdomain}/my-orders`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        setOrders(data.data || []);
                    } catch (error) {
                        console.error("Failed to fetch orders");
                    }
                }
            }
            setLoading(false);
        };

        checkAuth();
    }, [subdomain]);

    const handleSendOTP = async () => {
        if (!authForm.fullName || !authForm.email || !authForm.password) {
            return toast.error("Please fill in all details first");
        }

        // Prevent sending if timer is active
        if (otpTimer > 0) return;

        try {
            const { data } = await API.post('/auth/send-otp', { email: authForm.email });
            if (data.success) {
                setOtpSent(true);
                toast.success("Verification code sent to your email!");

                // NEW: Start 3-minute (180s) timer and save to localStorage
                setOtpTimer(180);
                localStorage.setItem('otp_expiry', Date.now() + 180000);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to send OTP");
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

            localStorage.setItem('shopforall_token', data.token || data.user?.token);
            localStorage.setItem('shopforall_user', JSON.stringify(data.user));

            // Clean up timer on successful registration
            localStorage.removeItem('otp_expiry');
            setOtpTimer(0);

            setUser(data.user);
            toast.success(isRegistering ? "Registration successful!" : "Welcome back!");
        } catch (error) {
            toast.error(error.response?.data?.error || "Authentication failed");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('shopforall_token');
        localStorage.removeItem('shopforall_user');
        setUser(null);
        setOrders([]);
        toast.success("Logged out successfully");
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        toast.success("Password reset functionality would trigger here!");
        setPassForm({ oldPassword: '', newPassword: '' });
    };

    if (loading) {
        return <div className="min-h-[60vh] flex items-center justify-center">Loading...</div>;
    }

    if (!user) {
        return (
            <AuthView
                isRegistering={isRegistering}
                setIsRegistering={setIsRegistering}
                authForm={authForm}
                setAuthForm={setAuthForm}
                handleAuthSubmit={handleAuthSubmit}
                otpSent={otpSent}
                handleSendOTP={handleSendOTP}
                otpTimer={otpTimer} // Pass the timer down to the view
            />
        );
    }

    if (user.role === 'VendorAdmin' || user.role === 'VendorStaff') {
        return <VendorView user={user} handleLogout={handleLogout} />;
    }

    return (
        <CustomerDashboard
            user={user}
            orders={orders}
            handleLogout={handleLogout}
            passForm={passForm}
            setPassForm={setPassForm}
            handlePasswordReset={handlePasswordReset}
        />
    );
}