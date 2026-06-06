/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                // The browser automatically sends the secure cookie here
                const res = await API.get('/auth/me');
                if (res.data.success) {
                    setUser(res.data.user);
                }
            } catch (err) {
                console.error("Session restoration failed:", err.response?.data?.error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        initializeAuth();
    }, []);

    const logout = async () => {
        try {
            await API.post('/auth/logout'); // Backend clears the cookie
        } catch (err) {
            console.error("Logout API call failed", err);
        } finally {
            setUser(null);
        }
    };
    

    return (
        <AuthContext.Provider value={{ user, setUser, loading, logout }}>
            {/* 🚀 Wait for initializeAuth to finish before showing the app */}
            {!loading ? children : (
                <div className="flex h-screen items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
                </div>
            )}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
