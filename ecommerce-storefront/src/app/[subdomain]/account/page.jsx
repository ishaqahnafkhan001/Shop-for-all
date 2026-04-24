"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/api/api';
import { toast } from 'react-hot-toast';

// IMPORT YOUR NEW COMPONENTS HERE
import AuthView from '@/components/account/AuthView';
import VendorView from '@/components/account/VendorView';
import CustomerDashboard from '@/components/account/CustomerDashboard';

export default function AccountPage({ params }) {
    const { subdomain } = React.use(params);
    const router = useRouter();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRegistering, setIsRegistering] = useState(false);
    const [authForm, setAuthForm] = useState({ fullName: '', email: '', password: '' });
    const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '' });
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('shopforall_token');
            const savedUser = localStorage.getItem('shopforall_user');

            if (token && savedUser) {
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);
                if (parsedUser.role === 'Customer') fetchMyOrders(token);
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

            if (data.user.role === 'Customer') router.push('/');
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

    // --- VIEW ROUTING ---
    if (!user) {
        return <AuthView
            isRegistering={isRegistering} setIsRegistering={setIsRegistering}
            authForm={authForm} setAuthForm={setAuthForm}
            handleAuthSubmit={handleAuthSubmit}
        />;
    }

    if (user.role === 'VendorAdmin' || user.role === 'VendorStaff') {
        return <VendorView user={user} handleLogout={handleLogout} />;
    }

    return <CustomerDashboard
        user={user}
        orders={orders}
        handleLogout={handleLogout}
        passForm={passForm}
        setPassForm={setPassForm}
        handlePasswordReset={handlePasswordReset}
    />;
}