const express = require('express');
const router = express.Router();

// Middlewares
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');

// Controllers (We'll assume these functions exist in your controller files)
const {
    getShopProducts,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');

const { getShopOrders, updateOrderStatus, getDashboardStats } = require('../controllers/orderController');

const {getShopCustomers,
    getShopUsers,
    createShopUser,
    toggleCustomerStatus
} = require('../controllers/userController');

// --- PRODUCT MANAGEMENT ---

// GET /api/admin/products -> View all products for the logged-in shop
router.get(
    '/products',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    getShopProducts
);

// POST /api/admin/products -> Add a new product
router.post(
    '/products',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    createProduct
);

// PATCH /api/admin/products/:id -> Edit product details
router.patch(
    '/products/:id',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    updateProduct
);

// DELETE /api/admin/products/:id -> Delete a product
router.delete(
    '/products/:id',
    protect,
    authorize('VendorAdmin'), // Only Admin can delete, not Staff
    deleteProduct
);

// --- USER / STAFF MANAGEMENT ---

// GET /api/admin/users -> See all staff and customers of the shop
router.get(
    '/users',
    protect,
    authorize('VendorAdmin'),
    getShopUsers
);

// POST /api/admin/users -> Create a new staff member account
router.post(
    '/users',
    protect,
    authorize('VendorAdmin'),
    createShopUser
);


// Add this alongside your other protected admin routes
router.get('/dashboard-stats', protect, getDashboardStats);

router.get('/orders', protect, getShopOrders);
router.patch('/orders/:id/status', protect, updateOrderStatus);

router.patch('/customers/:id/status', protect, toggleCustomerStatus);

router.get('/customers', protect, getShopCustomers);
module.exports = router;