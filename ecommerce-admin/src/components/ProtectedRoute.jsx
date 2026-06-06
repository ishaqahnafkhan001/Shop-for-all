import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // 🔴 EXACT FIX: If role is Customer, generate URL and redirect via window
    if (user.role === 'Customer') {
        const subdomain = user?.shop?.subdomain || user?.subdomain || 'demo';

        // Clean up the domain from env vars
        let baseDomain = import.meta.env.VITE_API_DOMAIN || '';
        baseDomain = baseDomain.replace(/^https?:\/\//, '');

        // Build the final store URL
        const protocol = baseDomain.includes('localhost') ? 'http://' : 'https://';
        const liveStoreUrl = `${protocol}${subdomain}.${baseDomain}`;

        // Redirect the browser entirely
        window.location.replace(liveStoreUrl);

        // Return null so React doesn't try to render anything while redirecting
        return null;
    }

    // 🟡 Check specific dashboard roles (Admin/Staff)
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        if (user.role === 'SuperAdmin') {
            return <Navigate to="/super-admin" replace />;
        }
        return <Navigate to="/dashboard/products" replace />;
    }

    // 🟢 Everything is good, render the page
    return <Outlet />;
};

export default ProtectedRoute;
