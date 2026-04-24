import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/api'; // 👈 Using your new super-clean Axios instance

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Automatically check if the user has a valid HttpOnly cookie on page refresh
        const checkSession = async () => {
            try {
                // Notice how clean this is! No localhost URL, no withCredentials flag.
                // The API file handles all of that automatically.
                const res = await API.get('/auth/me');
                setUser(res.data.user);
            } catch (err) {
                setUser(null); // No valid session found
            } finally {
                setLoading(false); // Stop the loading spinner so the app can render
            }
        };
        checkSession();
    }, []);

    // A centralized logout function that you can trigger from any page
    const logout = async () => {
        try {
            await API.post('/auth/logout');
            setUser(null); // Wipe the user from React state
        } catch (err) {
            console.error("Logout failed", err);
        }
    };

    return (
        <AuthContext.Provider value={{ user, setUser, loading, logout }}>
            {/* We only render the app ONCE the session check is completely finished */}
            {!loading && children}
        </AuthContext.Provider>
    );
};

// Custom hook with a built-in safety net
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        console.error("useAuth must be used within an AuthProvider");
    }
    return context;
};