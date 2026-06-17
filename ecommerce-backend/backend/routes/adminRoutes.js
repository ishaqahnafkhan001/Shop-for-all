const express = require('express');
const router = express.Router();

// =========================
// Middlewares
// =========================
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { requirePermission } = require('../middlewares/permission');
const { blockVerificationSuspendedShop } = require('../middlewares/vendorVerificationGuard');
const { upload } = require('../config/cloudinary');

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
    updateShopUserPermissions
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
    submitVendorVerification
} = require('../controllers/vendorVerificationController');

// =========================
// Upload Config
// =========================
const productMediaUpload = upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'videos', maxCount: 2 }
]);
const vendorNidUpload = upload.fields([
    { name: 'nidFront', maxCount: 1 },
    { name: 'nidBack', maxCount: 1 }
]);

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
    createReturn
);

router.patch(
    '/returns/:id/status',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
    updateReturnStatus
);

router.patch(
    '/returns/:id/refund',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
    updateReturnRefund
);

router.patch(
    '/returns/:id',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
    updateReturn
);

router.delete(
    '/returns',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
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
    exportProductsCsv
);

router.post(
    '/products/bulk-import',
    protect,
    authorize('VendorAdmin'),
    blockVerificationSuspendedShop,
    bulkImportProducts
);

router.patch(
    '/products/bulk',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('products'),
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
    blockVerificationSuspendedShop,
    productMediaUpload,
    createProduct
);

router.patch(
    '/products/:id',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('products'),
    blockVerificationSuspendedShop,
    productMediaUpload,
    updateProduct
);

router.delete(
    '/products/:id',
    protect,
    authorize('VendorAdmin'),
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
    blockVerificationSuspendedShop,
    updateOrderStatus
);

router.post(
    '/orders/:id/pathao',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
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
    '/users',
    protect,
    authorize('VendorAdmin'),
    getShopUsers
);

router.post(
    '/users',
    protect,
    authorize('VendorAdmin'),
    createShopUser
);

router.patch(
    '/users/:id/permissions',
    protect,
    authorize('VendorAdmin'),
    updateShopUserPermissions
);

// ======================================================
// DASHBOARD / ANALYTICS
// ======================================================

router.get(
    '/dashboard-overview',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('analytics'),
    getDashboardOverview
);

router.get(
    '/dashboard-stats',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('analytics'),
    getDashboardStats
);

// =========================
// Export Router
// =========================
module.exports = router;
