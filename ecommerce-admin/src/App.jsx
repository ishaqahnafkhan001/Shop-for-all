import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute'; // 🛡️ NEW: Import the wrapper
import RequireFeature from './components/RequireFeature.jsx';
import RequireStaffPermission from './components/RequireStaffPermission.jsx';
import RequirePlatformPermission from './components/RequirePlatformPermission.jsx';
import AdminRouteFallback from './components/ui/AdminRouteFallback.jsx';
import RouteErrorBoundary from './components/RouteErrorBoundary.jsx';
import {
    getPlatformHomePath,
    isPlatformRole,
    PLATFORM_ROLES
} from './utils/platformAccess';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Pages
const Login = lazy(() => import('./pages/Login'));
const Overview = lazy(() => import('./pages/dashboard/Overview'));
const ProductList = lazy(() => import('./pages/dashboard/products/ProductList'));
const AddProduct = lazy(() => import('./pages/dashboard/products/AddProduct'));
const OrderList = lazy(() => import('./pages/dashboard/orders/OrderList'));
const ShopSettings = lazy(() => import('./pages/dashboard/settings/ShopSettings'));
const StoreBranding = lazy(() => import('./pages/dashboard/settings/StoreBranding.jsx'));
const ShippingSettings = lazy(() => import('./pages/dashboard/ShippingSettings/ShippingSettings.jsx'));
const EditProduct = lazy(() => import('./pages/dashboard/products/EditProduct'));
const CustomerList = lazy(() => import("./pages/dashboard/customers/CustomerList.jsx"));
const StoreBuilder = lazy(() => import('./pages/dashboard/StoreBuilder.jsx'));
const HomepageSeo = lazy(() => import('./pages/dashboard/Seo/HomepageSeoPage.jsx'));
const CustomDomain = lazy(() => import('./pages/dashboard/CustomDomainPage.jsx'));
const Promotions = lazy(() => import('./pages/dashboard/Promotions.jsx'));
const PromotionalBanner = lazy(() => import('./pages/dashboard/Promotional Banner/promotionalBanner.jsx'));
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
const TrustedBadge = lazy(() => import('./pages/dashboard/TrustedBadge.jsx'));
const SupportCenter = lazy(() => import('./pages/dashboard/SupportCenter.jsx'));
const SupportInvite = lazy(() => import('./pages/SupportInvite.jsx'));
const SuperAdminPanel = lazy(() => import('./pages/superadmin/SuperAdminPanel.jsx'));
const VendorVerifications = lazy(() => import('./pages/superadmin/VendorVerifications.jsx'));
const ShopDetail = lazy(() => import('./pages/superadmin/ShopDetail.jsx'));
const PlatformAuditLogs = lazy(() => import('./pages/superadmin/PlatformAuditLogs.jsx'));
const SuperAdminBilling = lazy(() => import('./pages/superadmin/SuperAdminBilling.jsx'));
const SuperAdminBadges = lazy(() => import('./pages/superadmin/SuperAdminBadges.jsx'));
const SuperAdminPlans = lazy(() => import('./pages/superadmin/SuperAdminPlans.jsx'));
const SuperAdminAnnouncements = lazy(() => import('./pages/superadmin/SuperAdminAnnouncements.jsx'));
const SuperAdminDomains = lazy(() => import('./pages/superadmin/SuperAdminDomains.jsx'));
const SuperAdminShops = lazy(() => import('./pages/superadmin/SuperAdminShops.jsx'));
const SuperAdminRisk = lazy(() => import('./pages/superadmin/SuperAdminRisk.jsx'));
const SuperAdminOperations = lazy(() => import('./pages/superadmin/SuperAdminOperations.jsx'));
const SuperAdminPlatform = lazy(() => import('./pages/superadmin/SuperAdminPlatform.jsx'));

// Helper to determine where logged-in users should go if they hit /login or a 404
const getRedirectPath = (user) => {
    const role = user?.role;
    if (role === 'Customer') return '/store';
    if (isPlatformRole(role)) return getPlatformHomePath(user);
    if (['SupportAgent', 'SupportLead', 'TechnicalSupport'].includes(role)) return '/support';
    if (role === 'VendorStaff') return '/dashboard/products';
    return '/dashboard'; // VendorAdmin default
};

const PageFallback = () => (
    <AdminRouteFallback />
);

const withSuspense = (element) => (
    <RouteErrorBoundary>
        <Suspense fallback={<PageFallback />}>{element}</Suspense>
    </RouteErrorBoundary>
);

const withFeature = (feature, element) => (
    <RequireFeature feature={feature}>{element}</RequireFeature>
);

const withPermission = (permission, element) => (
    <RequireStaffPermission permission={permission}>{element}</RequireStaffPermission>
);

const withPlatformPermission = (permission, element) => (
    <RequirePlatformPermission permission={permission}>{element}</RequirePlatformPermission>
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
                    element={!user ? withSuspense(<Login />) : <Navigate to={getRedirectPath(user)} />}
                />
                <Route
                    path="/support-invite/:token"
                    element={withSuspense(<SupportInvite />)}
                />

                <Route element={<ProtectedRoute allowedRoles={PLATFORM_ROLES} />}>
                    <Route path="/super-admin" element={<DashboardLayout />}>
                        <Route index element={withSuspense(withPlatformPermission('platform.overview.read', <SuperAdminPanel />))} />
                        <Route path="support" element={withSuspense(withPlatformPermission('*', <SupportCenter />))} />
                        <Route path="shops" element={withSuspense(withPlatformPermission('platform.shops.read', <SuperAdminShops />))} />
                        <Route path="shops/:shopId" element={withSuspense(withPlatformPermission('platform.shops.read', <ShopDetail />))} />
                        <Route path="vendor-verifications" element={withSuspense(withPlatformPermission('compliance.verification.read', <VendorVerifications />))} />
                        <Route path="badges" element={withSuspense(withPlatformPermission('trust.badges.read', <SuperAdminBadges />))} />
                        <Route path="billing" element={withSuspense(withPlatformPermission('billing.read', <SuperAdminBilling />))} />
                        <Route path="subscriptions" element={<Navigate to="/super-admin/billing" replace />} />
                        <Route path="payments" element={<Navigate to="/super-admin/billing?tab=payment-verification" replace />} />
                        <Route path="invoices" element={<Navigate to="/super-admin/billing?tab=invoices" replace />} />
                        <Route path="plans" element={withSuspense(withPlatformPermission('billing.read', <SuperAdminPlans />))} />
                        <Route path="announcements" element={withSuspense(withPlatformPermission('platform.announcements.manage', <SuperAdminAnnouncements />))} />
                        <Route path="domains" element={withSuspense(withPlatformPermission('platform.domains.view', <SuperAdminDomains />))} />
                        <Route path="risk" element={withSuspense(withPlatformPermission('risk.cases.view', <SuperAdminRisk />))} />
                        <Route path="jobs" element={withSuspense(withPlatformPermission('workers.jobs.view', <SuperAdminOperations />))} />
                        <Route path="reconciliations" element={withSuspense(withPlatformPermission('platform.reconciliation.view', <SuperAdminOperations />))} />
                        <Route path="lifecycle" element={withSuspense(withPlatformPermission('platform.lifecycle.view', <SuperAdminOperations />))} />
                        <Route path="shipping" element={withSuspense(withPlatformPermission('platform.shipping.view', <SuperAdminOperations />))} />
                        <Route path="alerts" element={withSuspense(withPlatformPermission('platform.alerts.view', <SuperAdminOperations />))} />
                        <Route path="feature-flags" element={withSuspense(withPlatformPermission('platform.overview.read', <SuperAdminPlatform />))} />
                        <Route path="roles" element={withSuspense(withPlatformPermission('platform.roles.manage', <SuperAdminPlatform />))} />
                        <Route path="sessions" element={withSuspense(withPlatformPermission('platform.sessions.manage', <SuperAdminPlatform />))} />
                        <Route path="reports" element={withSuspense(withPlatformPermission('platform.reports.view', <SuperAdminPlatform />))} />
                        <Route path="settings" element={withSuspense(withPlatformPermission('platform.settings.manage', <SuperAdminPlatform />))} />
                        <Route path="audit-logs" element={withSuspense(withPlatformPermission('audit.logs.view', <PlatformAuditLogs />))} />
                    </Route>
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['SupportAgent', 'SupportLead', 'TechnicalSupport']} />}>
                    <Route path="/support" element={<DashboardLayout />}>
                        <Route index element={withSuspense(<SupportCenter />)} />
                        <Route path="tickets/:ticketNumber" element={withSuspense(<SupportCenter />)} />
                    </Route>
                </Route>

                {/* 🛡️ Protected Dashboard Wrapper (Allows both Admin & Staff) */}
                <Route element={<ProtectedRoute allowedRoles={['VendorAdmin', 'VendorStaff']} />}>
                    <Route path="/dashboard" element={<DashboardLayout />}>

                        <Route index element={withSuspense(withPermission('overview', <Overview />))} />

                        {/* 🔴 ADMIN ONLY ROUTES */}
                        <Route element={<ProtectedRoute allowedRoles={['VendorAdmin']} />}>
                            {/* Note: You might want to move 'settings' here too depending on your business logic */}
                            <Route path="staff" element={withSuspense(withFeature('staffAccounts', <StaffPermissions />))} />
                            <Route path="badges" element={withSuspense(withFeature('trustSystem', <TrustedBadge />))} />
                            <Route path="billing" element={withSuspense(<Billing />)} />
                            <Route path="verification" element={withSuspense(<Verification />)} />
                        </Route>

                        {/* 🟢 ADMIN & STAFF ROUTES */}
                        <Route path="products" element={withSuspense(withPermission('products', <ProductList />))} />
                        <Route path="products/add" element={withSuspense(withPermission('products', <AddProduct />))} />
                        <Route path="products/edit/:id" element={withSuspense(withPermission('products', <EditProduct />))} />
                        <Route path="catalog-tools" element={withSuspense(withPermission('catalogTools', withFeature('bulkProductTools', <CatalogTools />)))} />
                        <Route path="orders" element={withSuspense(withPermission('orders', <OrderList />))} />
                        <Route path="returns" element={withSuspense(withPermission('returns', <Returns />))} />
                        <Route path="notifications" element={withSuspense(withPermission('notifications', withFeature('notifications', <Notifications />)))} />
                        <Route path="promotions" element={withSuspense(withPermission('promotions', withFeature('coupons', <Promotions />)))} />
                        <Route path="banners" element={withSuspense(withPermission('bannersManage', withFeature('scheduledBanners', <PromotionalBanner />)))} />
                        <Route path="customers" element={withSuspense(withPermission('customers', withFeature('customerSection', <CustomerList />)))} />
                        <Route path="privacy-requests" element={withSuspense(withPermission('privacyRequests', withFeature('privacyRequests', <PrivacyRequests />)))} />
                        <Route path="growth" element={withSuspense(withPermission('growthCenter', withFeature('growthCenter', <GrowthCenter />)))} />
                        <Route path="analytics" element={withSuspense(withPermission('analytics', withFeature('analytics', <AdvancedAnalytics />)))} />
                        <Route path="store-builder" element={withSuspense(withPermission('storeBuilder', withFeature('storeBuilder', <StoreBuilder />)))} />
                        <Route path="seo" element={withSuspense(withPermission('storeBuilder', withFeature('storeBuilder', withFeature('homepageSeo', <HomepageSeo />))))} />
                        <Route path="domain" element={withSuspense(withPermission('storeBuilder', withFeature('storeBuilder', withFeature('customDomain', <CustomDomain />))))} />
                        <Route path="shipping" element={withSuspense(withPermission('shipping', <ShippingSettings />))} />
                        <Route path="settings/store-branding" element={withSuspense(withPermission('settings', withFeature('basicStoreBranding', <StoreBranding />)))} />
                        <Route path="settings" element={withSuspense(withPermission('settings', <ShopSettings />))} />
                        <Route path="activity-logs" element={withSuspense(withPermission('activityLogs', withFeature('activityLogs', <ActivityLogs />)))} />
                        <Route path="support" element={withSuspense(<SupportCenter />)} />
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
