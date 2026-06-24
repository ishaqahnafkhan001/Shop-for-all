import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute'; // 🛡️ NEW: Import the wrapper
import RequireFeature from './components/RequireFeature.jsx';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Pages
const Login = lazy(() => import('./pages/Login'));
const Overview = lazy(() => import('./pages/dashboard/Overview'));
const ProductList = lazy(() => import('./pages/dashboard/products/ProductList'));
const AddProduct = lazy(() => import('./pages/dashboard/products/AddProduct'));
const OrderList = lazy(() => import('./pages/dashboard/orders/OrderList'));
const ShopSettings = lazy(() => import('./pages/dashboard/settings/ShopSettings'));
const ShippingSettings = lazy(() => import('./pages/dashboard/ShippingSettings/ShippingSettings.jsx'));
const EditProduct = lazy(() => import('./pages/dashboard/products/EditProduct'));
const CustomerList = lazy(() => import("./pages/dashboard/customers/CustomerList.jsx"));
const StoreBuilder = lazy(() => import('./pages/dashboard/StoreBuilder.jsx'));
const Promotions = lazy(() => import('./pages/dashboard/Promotions.jsx'));
const CatalogTools = lazy(() => import('./pages/dashboard/CatalogTools.jsx'));
const AdvancedAnalytics = lazy(() => import('./pages/dashboard/AdvancedAnalytics.jsx'));
const GrowthCenter = lazy(() => import('./pages/dashboard/GrowthCenter.jsx'));
const StaffPermissions = lazy(() => import('./pages/dashboard/StaffPermissions.jsx'));
const Returns = lazy(() => import('./pages/dashboard/Returns.jsx'));
const Notifications = lazy(() => import('./pages/dashboard/Notifications.jsx'));
const ActivityLogs = lazy(() => import('./pages/dashboard/ActivityLogs.jsx'));
const Verification = lazy(() => import('./pages/dashboard/Verification.jsx'));
const PrivacyRequests = lazy(() => import('./pages/dashboard/PrivacyRequests.jsx'));
const Billing = lazy(() => import('./pages/dashboard/Billing.jsx'));
const SuperAdminPanel = lazy(() => import('./pages/superadmin/SuperAdminPanel.jsx'));
const VendorVerifications = lazy(() => import('./pages/superadmin/VendorVerifications.jsx'));
const ShopDetail = lazy(() => import('./pages/superadmin/ShopDetail.jsx'));
const PlatformAuditLogs = lazy(() => import('./pages/superadmin/PlatformAuditLogs.jsx'));
const SuperAdminBilling = lazy(() => import('./pages/superadmin/SuperAdminBilling.jsx'));

// Helper to determine where logged-in users should go if they hit /login or a 404
const getRedirectPath = (role) => {
    if (role === 'Customer') return '/store';
    if (role === 'SuperAdmin') return '/super-admin';
    if (role === 'VendorStaff') return '/dashboard/products';
    return '/dashboard'; // VendorAdmin default
};

const PageFallback = () => (
    <div className="flex h-[50vh] items-center justify-center text-sm text-slate-500">
        Loading...
    </div>
);

const withSuspense = (element) => (
    <Suspense fallback={<PageFallback />}>{element}</Suspense>
);

const withFeature = (feature, element) => (
    <RequireFeature feature={feature}>{element}</RequireFeature>
);

function App() {
    const { user, loading } = useAuth();

    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

    return (
        <Router>
            <Toaster position="top-right" />
            <Routes>
                {/* Public / Auth Routes */}
                <Route
                    path="/login"
                    element={!user ? withSuspense(<Login />) : <Navigate to={getRedirectPath(user?.role)} />}
                />

                <Route element={<ProtectedRoute allowedRoles={['SuperAdmin']} />}>
                    <Route path="/super-admin" element={<DashboardLayout />}>
                        <Route index element={withSuspense(<SuperAdminPanel />)} />
                        <Route path="shops/:shopId" element={withSuspense(<ShopDetail />)} />
                        <Route path="vendor-verifications" element={withSuspense(<VendorVerifications />)} />
                        <Route path="billing" element={withSuspense(<SuperAdminBilling />)} />
                        <Route path="audit-logs" element={withSuspense(<PlatformAuditLogs />)} />
                    </Route>
                </Route>

                {/* 🛡️ Protected Dashboard Wrapper (Allows both Admin & Staff) */}
                <Route element={<ProtectedRoute allowedRoles={['VendorAdmin', 'VendorStaff']} />}>
                    <Route path="/dashboard" element={<DashboardLayout />}>

                        {/* 🔴 ADMIN ONLY ROUTES */}
                        <Route element={<ProtectedRoute allowedRoles={['VendorAdmin']} />}>
                            <Route index element={withSuspense(<Overview />)} />
                            {/* Note: You might want to move 'settings' here too depending on your business logic */}
                            <Route path="store-builder" element={withSuspense(withFeature('storeBuilder', <StoreBuilder />))} />
                            <Route path="staff" element={withSuspense(withFeature('staffAccounts', <StaffPermissions />))} />
                            <Route path="activity-logs" element={withSuspense(<ActivityLogs />)} />
                        </Route>

                        {/* 🟢 ADMIN & STAFF ROUTES */}
                        <Route path="products" element={withSuspense(<ProductList />)} />
                        <Route path="products/add" element={withSuspense(<AddProduct />)} />
                        <Route path="products/edit/:id" element={withSuspense(<EditProduct />)} />
                        <Route path="catalog-tools" element={withSuspense(withFeature('bulkProductTools', <CatalogTools />))} />
                        <Route path="orders" element={withSuspense(<OrderList />)} />
                        <Route path="returns" element={withSuspense(<Returns />)} />
                        <Route path="notifications" element={withSuspense(<Notifications />)} />
                        <Route path="verification" element={withSuspense(<Verification />)} />
                        <Route path="billing" element={withSuspense(<Billing />)} />
                        <Route path="promotions" element={withSuspense(withFeature('coupons', <Promotions />))} />
                        <Route path="banners" element={<Navigate to="/dashboard/store-builder" replace />} />
                        <Route path="customers" element={withSuspense(<CustomerList />)} />
                        <Route path="privacy-requests" element={withSuspense(<PrivacyRequests />)} />
                        <Route path="growth" element={withSuspense(withFeature('growthCenter', <GrowthCenter />))} />
                        <Route path="analytics" element={withSuspense(withFeature('analytics', <AdvancedAnalytics />))} />
                        <Route path="shipping" element={withSuspense(<ShippingSettings />)} />
                        <Route path="settings" element={withSuspense(<ShopSettings />)} />
                    </Route>
                </Route>

                {/* Fallback */}
                <Route
                    path="*"
                    element={!user ? <Navigate to="/login" /> : <Navigate to={getRedirectPath(user?.role)} />}
                />
            </Routes>
        </Router>
    );
}

export default App;
