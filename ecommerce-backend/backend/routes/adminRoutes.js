const express = require('express');
const router = express.Router();

// =========================
// Middlewares
// =========================
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { requirePermission } = require('../middlewares/permission');
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

// =========================
// Upload Config
// =========================
const productMediaUpload = upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'videos', maxCount: 2 }
]);

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
    bulkImportProducts
);

router.patch(
    '/products/bulk',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('products'),
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
    productMediaUpload,
    createProduct
);

router.patch(
    '/products/:id',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('products'),
    productMediaUpload,
    updateProduct
);

router.delete(
    '/products/:id',
    protect,
    authorize('VendorAdmin'),
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
    updateOrderStatus
);

router.post(
    '/orders/:id/pathao',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
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
