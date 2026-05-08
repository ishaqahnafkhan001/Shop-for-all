"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/api/api';
import { toast } from 'react-hot-toast';

// IMPORT YOUR VIEW COMPONENTS
import AuthView from '@/components/account/AuthView';
import VendorView from '@/components/account/VendorView';
import CustomerDashboard from '@/components/account/CustomerDashboard';

export default function AccountPage({ params }) {
    // React.use() unwraps the params promise in Next.js 15+
    const { subdomain } = React.use(params);
    const router = useRouter();

    // --- STATE ---
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRegistering, setIsRegistering] = useState(false);
    const [authForm, setAuthForm] = useState({ fullName: '', email: '', password: '' });
    const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '' });
    const [orders, setOrders] = useState([]);

    // --- LIFECYCLE / SESSION CHECK ---
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('shopforall_token');
            const savedUser = localStorage.getItem('shopforall_user');

            if (token && savedUser) {
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);

                // If it's a customer, fetch their orders immediately
                if (parsedUser.role === 'Customer') {
                    try {
                        const { data } = await API.get(`/storefront/${subdomain}/my-orders`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        setOrders(data.data || []);
                        // setOrders(data);
                    } catch (error) {
                        console.error("Failed to fetch orders");
                    }
                }
            }
            setLoading(false);
        };

        checkAuth();
    }, [subdomain]); // Added subdomain to dependencies to satisfy the React linter

    // --- HANDLERS ---
    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        try {
            const endpoint = isRegistering ? '/auth/register-customer' : '/auth/login';
            let payload = isRegistering
                ? { ...authForm, subdomain }
                : { email: authForm.email, password: authForm.password };

            const { data } = await API.post(endpoint, payload);

            // Save session
            localStorage.setItem('shopforall_token', data.token);
            localStorage.setItem('shopforall_user', JSON.stringify(data.user));

            setUser(data.user);
            toast.success(`Welcome back!`);

            // Note: Removed the router.push('/') here so customers can see their account page immediately
            // If they are a vendor, you could optionally redirect them to the admin panel URL here
        } catch (error) {
            toast.error(error.response?.data?.error || "Authentication failed");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('shopforall_token');
        localStorage.removeItem('shopforall_user');
        setUser(null);
        setOrders([]); // Clear orders on logout
        toast.success("Logged out successfully");
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        // TODO: Wire up actual API call
        // const token = localStorage.getItem('shopforall_token');
        // await API.put('/auth/update-password', passForm, { headers: { Authorization: `Bearer ${token}` } });

        toast.success("Password reset functionality would trigger here!");
        setPassForm({ oldPassword: '', newPassword: '' });
    };

    // --- RENDER LOGIC ---
    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="h-8 w-32 bg-gray-200 rounded-lg"></div>
                    <div className="text-gray-400 font-medium">Loading your account...</div>
                </div>
            </div>
        );
    }

    // Traffic Control 1: User is NOT logged in
    if (!user) {
        return (
            <AuthView
                isRegistering={isRegistering}
                setIsRegistering={setIsRegistering}
                authForm={authForm}
                setAuthForm={setAuthForm}
                handleAuthSubmit={handleAuthSubmit}
            />
        );
    }

    // Traffic Control 2: User is a Vendor/Admin
    if (user.role === 'VendorAdmin' || user.role === 'VendorStaff') {
        return <VendorView user={user} handleLogout={handleLogout} />;
    }

    // Traffic Control 3: User is a Customer
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