const express = require('express');
const router = express.Router();

// =========================
// Middlewares
// =========================
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { requirePermission } = require('../middlewares/permission');
const { blockVerificationSuspendedShop } = require('../middlewares/vendorVerificationGuard');
const { requireShopFeature } = require('../middlewares/featureGate');
const {
    blockBillingSuspendedShop,
    requireProductLimit,
    requireStaffLimit
} = require('../middlewares/billingGate');
const { upload, nidUpload } = require('../config/cloudinary');

// =========================
// Controllers
// =========================

// Product Controllers
const {
    getShopProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getSingleProduct,
    generateDescription,
    exportProductsCsv,
    bulkUpdateProducts,
    bulkImportProducts
} = require('../controllers/productController');

// Order Controllers
const {
    getShopOrders,
    updateOrderStatus,
    getDashboardStats,
    getDashboardOverview,
    syncOrderToPathao
} = require('../controllers/orderController');

// User / Customer Controllers
const {
    getShopCustomers,
    getShopUsers,
    createShopUser,
    toggleCustomerStatus,
    updateShopUserPermissions,
    updateShopUser,
    removeShopStaff,
    getStaffSummary
} = require('../controllers/userController');

// Store / Pathao Controllers
const {
    setupVendorPathaoStore,
    getCities,
    getZones,
    getAreas,
    linkExistingPathaoAccount
} = require('../controllers/storeController');

// Email Controllers
const {
    sendEmailToCustomer,
    sendOrderStatusEmail
} = require('../controllers/emailController');

// Returns / Activity / Notifications
const {
    getReturns,
    getReturnById,
    createReturn,
    updateReturnStatus,
    updateReturnRefund,
    updateReturn,
    deleteReturns
} = require('../controllers/returnController');
const { getAuditLogs } = require('../controllers/auditLogController');
const {
    getNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification
} = require('../controllers/notificationController');
const {
    getVendorVerificationStatus,
    submitVendorVerification,
    getVendorVerificationDocument,
    sendVendorPhoneOtp,
    verifyVendorPhoneOtp
} = require('../controllers/vendorVerificationController');
const { otpRateLimiter } = require('../middlewares/otpRateLimiter');
const {
    getAdminDataRequests,
    updateAdminDataRequest
} = require('../controllers/privacyController');
const {
    getVendorOnboarding
} = require('../controllers/onboardingController');
const {
    getVendorAnnouncements
} = require('../controllers/platformAnnouncementController');

// =========================
// Upload Config
// =========================
const productMediaUpload = upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'videos', maxCount: 2 }
]);
const vendorNidUpload = nidUpload.fields([
    { name: 'nidFront', maxCount: 1 },
    { name: 'nidBack', maxCount: 1 }
]);

// ======================================================
// VENDOR ONBOARDING
// ======================================================

router.get(
    '/onboarding',
    protect,
    authorize('VendorAdmin'),
    getVendorOnboarding
);

router.get(
    '/announcements',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    getVendorAnnouncements
);

// ======================================================
// VENDOR VERIFICATION
// ======================================================

router.get(
    '/vendor-verification/status',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    getVendorVerificationStatus
);

router.post(
    '/vendor-verification/submit',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('settings'),
    vendorNidUpload,
    submitVendorVerification
);

router.get(
    '/vendor-verification/document/:type',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('settings'),
    getVendorVerificationDocument
);

router.post(
    '/vendor-verification/phone/send-otp',
    protect,
    authorize('VendorAdmin'),
    otpRateLimiter,
    sendVendorPhoneOtp
);

router.post(
    '/vendor-verification/phone/verify-otp',
    protect,
    authorize('VendorAdmin'),
    otpRateLimiter,
    verifyVendorPhoneOtp
);

router.get(
    '/privacy/data-requests',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('customers'),
    getAdminDataRequests
);

router.patch(
    '/privacy/data-requests/:id',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('customers'),
    updateAdminDataRequest
);

// ======================================================
// EMAIL ROUTES
// ======================================================

router.post(
    '/customers/send-email',
    protect,
    authorize('VendorAdmin'),
    sendEmailToCustomer
);

router.post(
    '/orders/send-email',
    protect,
    authorize('VendorAdmin', 'SuperAdmin'),
    sendOrderStatusEmail
);

// ======================================================
// NOTIFICATIONS
// ======================================================

router.get(
    '/notifications',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    getNotifications
);

router.get(
    '/notifications/unread-count',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    getUnreadCount
);

router.patch(
    '/notifications/read-all',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    markAllNotificationsRead
);

router.patch(
    '/notifications/:id/read',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    markNotificationRead
);

router.delete(
    '/notifications/:id',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    deleteNotification
);

// ======================================================
// RETURNS / REFUNDS
// ======================================================

router.get(
    '/returns',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
    getReturns
);

router.get(
    '/returns/:id',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
    getReturnById
);

router.post(
    '/returns',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
    blockBillingSuspendedShop,
    createReturn
);

router.patch(
    '/returns/:id/status',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
    blockBillingSuspendedShop,
    updateReturnStatus
);

router.patch(
    '/returns/:id/refund',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
    blockBillingSuspendedShop,
    updateReturnRefund
);

router.patch(
    '/returns/:id',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
    blockBillingSuspendedShop,
    updateReturn
);

router.delete(
    '/returns',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
    blockBillingSuspendedShop,
    deleteReturns
);

// ======================================================
// ACTIVITY LOGS
// ======================================================

router.get(
    '/audit-logs',
    protect,
    authorize('VendorAdmin'),
    getAuditLogs
);

// ======================================================
// PATHAO / STORE SETTINGS
// ======================================================

router.post(
    '/settings/pathao-link',
    protect,
    authorize('VendorAdmin'),
    linkExistingPathaoAccount
);

router.post(
    '/settings/pathao-store',
    protect,
    authorize('VendorAdmin'),
    setupVendorPathaoStore
);

// Location APIs
router.get(
    '/pathao/cities',
    protect,
    authorize('VendorAdmin'),
    getCities
);

router.get(
    '/pathao/cities/:cityId/zones',
    protect,
    authorize('VendorAdmin'),
    getZones
);

router.get(
    '/pathao/zones/:zoneId/areas',
    protect,
    authorize('VendorAdmin'),
    getAreas
);

// ======================================================
// AI / UTILITIES
// ======================================================

router.post(
    '/generate-description',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('products'),
    generateDescription
);

// ======================================================
// PRODUCT MANAGEMENT
// ======================================================

router.get(
    '/products',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('products'),
    getShopProducts
);

router.get(
    '/products/export.csv',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('products'),
    requireShopFeature('bulkProductTools'),
    exportProductsCsv
);

router.post(
    '/products/bulk-import',
    protect,
    authorize('VendorAdmin'),
    requireShopFeature('bulkProductTools'),
    blockBillingSuspendedShop,
    requireProductLimit((req) => Array.isArray(req.body?.products) ? Math.min(req.body.products.length, 200) : 1),
    blockVerificationSuspendedShop,
    bulkImportProducts
);

router.patch(
    '/products/bulk',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('products'),
    requireShopFeature('bulkProductTools'),
    blockBillingSuspendedShop,
    blockVerificationSuspendedShop,
    bulkUpdateProducts
);

router.get(
    '/products/:id',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('products'),
    getSingleProduct
);

router.post(
    '/products',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('products'),
    blockBillingSuspendedShop,
    requireProductLimit(),
    blockVerificationSuspendedShop,
    productMediaUpload,
    createProduct
);

router.patch(
    '/products/:id',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('products'),
    blockBillingSuspendedShop,
    blockVerificationSuspendedShop,
    productMediaUpload,
    updateProduct
);

router.delete(
    '/products/:id',
    protect,
    authorize('VendorAdmin'),
    blockBillingSuspendedShop,
    blockVerificationSuspendedShop,
    deleteProduct
);

// ======================================================
// ORDER MANAGEMENT
// ======================================================

router.get(
    '/orders',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
    getShopOrders
);

router.patch(
    '/orders/:id/status',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
    blockBillingSuspendedShop,
    blockVerificationSuspendedShop,
    updateOrderStatus
);

router.post(
    '/orders/:id/pathao',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
    blockBillingSuspendedShop,
    blockVerificationSuspendedShop,
    syncOrderToPathao
);

// ======================================================
// CUSTOMER MANAGEMENT
// ======================================================

router.get(
    '/customers',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('customers'),
    getShopCustomers
);

router.patch(
    '/customers/:id/status',
    protect,
    authorize('VendorAdmin'),
    toggleCustomerStatus
);

// ======================================================
// USER / STAFF MANAGEMENT
// ======================================================

router.get(
    '/staff/summary',
    protect,
    authorize('VendorAdmin'),
    getStaffSummary
);

router.get(
    '/users',
    protect,
    authorize('VendorAdmin'),
    requireShopFeature('staffAccounts'),
    getShopUsers
);

router.post(
    '/users',
    protect,
    authorize('VendorAdmin'),
    requireShopFeature('staffAccounts'),
    requireStaffLimit,
    createShopUser
);

router.patch(
    '/users/:id/permissions',
    protect,
    authorize('VendorAdmin'),
    requireShopFeature('staffAccounts'),
    updateShopUserPermissions
);

router.patch(
    '/users/:id',
    protect,
    authorize('VendorAdmin'),
    requireShopFeature('staffAccounts'),
    updateShopUser
);

router.delete(
    '/users/:id',
    protect,
    authorize('VendorAdmin'),
    requireShopFeature('staffAccounts'),
    removeShopStaff
);

// ======================================================
// DASHBOARD / ANALYTICS
// ======================================================

router.get(
    '/dashboard-overview',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('analytics'),
    requireShopFeature('analytics'),
    getDashboardOverview
);

router.get(
    '/dashboard-stats',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('analytics'),
    requireShopFeature('analytics'),
    getDashboardStats
);

// =========================
// Export Router
// =========================
module.exports = router;
