"use client";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import API from '@/api/api';

// 1. Create the context
const AuthContext = createContext();

const getCurrentSubdomain = () => {
    if (typeof window === 'undefined') return '';

    const hostname = window.location.hostname.toLowerCase();
    const reservedHosts = ['localhost', '127.0.0.1', 'scaleup.codes', 'www.scaleup.codes', 'shop.scaleup.codes', 'admin.scaleup.codes'];

    if (hostname.includes('.localhost')) {
        const localSubdomain = hostname.split('.localhost')[0];
        return localSubdomain && localSubdomain !== 'localhost' ? localSubdomain : '';
    }

    if (hostname.endsWith('.scaleup.codes')) {
        const [subdomain] = hostname.split('.');
        return ['www', 'api', 'admin'].includes(subdomain) ? '' : subdomain;
    }

    return reservedHosts.includes(hostname) ? '' : hostname;
};

// 2. Create the Provider component
export const AuthProvider = ({ children }) => {
    const pathname = usePathname() || '';
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const authCheckedRef = useRef(false);

    // 🧠 Check if user is logged in on first load
    const checkAuthStatus = useCallback(async (subdomain) => {
        try {
            // The browser automatically attaches the HttpOnly cookie to this request
            const currentSubdomain = subdomain || getCurrentSubdomain();
            const { data } = await API.get('/auth/me', {
                params: currentSubdomain ? { subdomain: currentSubdomain } : {}
            });

            setUser(data.authenticated === false ? null : data.user);
        } catch (error) {
            // If 401 Unauthorized, it means no cookie or expired cookie
            setUser(null);
        } finally {
            setLoading(false); // Stop the loading spinner
        }
    }, []);

    useEffect(() => {
        const isAuthCriticalPath = pathname.includes('/account') || pathname.includes('/checkout');

        if (isAuthCriticalPath) {
            const timer = setTimeout(() => {
                authCheckedRef.current = true;
                checkAuthStatus();
            }, 0);
            return () => clearTimeout(timer);
        }

        if (authCheckedRef.current) return undefined;

        setLoading(false);
        const runDeferredCheck = () => {
            authCheckedRef.current = true;
            checkAuthStatus();
        };

        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            const idleId = window.requestIdleCallback(runDeferredCheck, { timeout: 2500 });
            return () => window.cancelIdleCallback(idleId);
        }

        const timer = setTimeout(runDeferredCheck, 1500);
        return () => clearTimeout(timer);
    }, [checkAuthStatus, pathname]);

    // 🔓 Login Function
    const login = async (email, password, subdomain) => {
        try {
            // The backend MUST respond by setting a Set-Cookie header with HttpOnly
            const { data } = await API.post('/auth/login', { email, password, subdomain });
            setUser(data.user);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Login failed'
            };
        }
    };

    // 🔒 Logout Function
    const logout = async () => {
        try {
            // The backend MUST respond by clearing the cookie
            await API.post('/auth/logout');
            setUser(null);
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    // Provide the state to the rest of the app
    return (
        <AuthContext.Provider value={{ user, loading, login, logout, checkAuthStatus }}>
            {children}
        </AuthContext.Provider>
    );
};

// 3. Custom hook for easy access
export const useAuth = () => {
    return useContext(AuthContext);
};
