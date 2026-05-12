"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '@/api/api';

// 1. Create the context
const AuthContext = createContext();

// 2. Create the Provider component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // 🧠 Check if user is logged in on first load
    const checkAuthStatus = async () => {
        try {
            // The browser automatically attaches the HttpOnly cookie to this request
            const { data } = await API.get('/auth/me');
            setUser(data.user); // Assuming backend returns { user: { _id, name, email } }
        } catch (error) {
            // If 401 Unauthorized, it means no cookie or expired cookie
            setUser(null);
        } finally {
            setLoading(false); // Stop the loading spinner
        }
    };

    useEffect(() => {
        checkAuthStatus();
    }, []);

    // 🔓 Login Function
    const login = async (email, password) => {
        try {
            // The backend MUST respond by setting a Set-Cookie header with HttpOnly
            const { data } = await API.post('/auth/login', { email, password });
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