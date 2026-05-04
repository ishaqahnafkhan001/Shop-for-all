const express = require('express');
const router = express.Router();

// Middlewares
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');

// Controllers
const {
    getShopProducts,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');

const {
    getShopOrders,
    updateOrderStatus,
    getDashboardStats,
    getRevenueAnalytics
} = require('../controllers/orderController');

const {
    getShopCustomers,
    getShopUsers,
    createShopUser,
    toggleCustomerStatus
} = require('../controllers/userController');


// --- PRODUCT MANAGEMENT ---

router.get(
    '/products',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    getShopProducts
);

router.post(
    '/products',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    createProduct
);

router.patch(
    '/products/:id',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    updateProduct
);

router.delete(
    '/products/:id',
    protect,
    authorize('VendorAdmin'), // Only Admin can delete, not Staff
    deleteProduct
);


// --- USER / STAFF MANAGEMENT ---

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


// --- ORDER MANAGEMENT ---

// FIX: All three order routes were missing authorize() — any authenticated
// user (including Customers) could read or mutate orders for any shop
router.get(
    '/orders',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    getShopOrders
);

router.patch(
    '/orders/:id/status',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    updateOrderStatus
);


// --- CUSTOMER MANAGEMENT ---

// FIX: Both customer routes were missing authorize()
router.get(
    '/customers',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    getShopCustomers
);

router.patch(
    '/customers/:id/status',
    protect,
    authorize('VendorAdmin'), // Status toggle is a destructive action — Admin only
    toggleCustomerStatus
);


// --- DASHBOARD / ANALYTICS ---

// FIX: dashboard-stats was missing authorize()
router.get(
    '/dashboard-stats',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    getDashboardStats
);


module.exports = router;