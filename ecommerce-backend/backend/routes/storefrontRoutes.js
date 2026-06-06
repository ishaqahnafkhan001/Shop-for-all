// storefrontRoutes.js

const express = require('express');
const router = express.Router();

// =========================
// Middlewares
// =========================
const { resolveTenant } = require('../middlewares/tenant');
const { protect } = require('../middlewares/auth');

// =========================
// Controllers
// =========================

// Store Controllers
const {
    getStoreInfo,
    getStorefrontBootstrap,
    getSingleProduct,
    getBatchProducts
} = require('../controllers/storeController');

// Product Controllers
const {
    getShopProducts
} = require('../controllers/productController');

// Order Controllers
const {
    getMyOrders,
    getOrderById,
    createOrder
} = require('../controllers/orderController');

// Review Controllers
const {
    getProductReviews,
    addProductReview
} = require('../controllers/reviewController');

// Public Controllers
const {
    trackPublicOrder
} = require('../controllers/publicController');

// ======================================================
// STORE INFO
// ======================================================

router.get(
    '/:subdomain/bootstrap',
    resolveTenant,
    getStorefrontBootstrap
);

router.get(
    '/:subdomain/info',
    resolveTenant,
    getStoreInfo
);

// ======================================================
// PRODUCT ROUTES
// ======================================================

router.get(
    '/:subdomain/products',
    resolveTenant,
    getShopProducts
);

router.get(
    '/:subdomain/products/batch',
    resolveTenant,
    getBatchProducts
);

router.get(
    '/:subdomain/products/:id',
    resolveTenant,
    getSingleProduct
);

// ======================================================
// REVIEW ROUTES
// ======================================================

router.get(
    '/:subdomain/products/:id/reviews',
    resolveTenant,
    getProductReviews
);

router.post(
    '/:subdomain/products/:id/reviews',
    resolveTenant,
    protect,
    addProductReview
);

// ======================================================
// ORDER ROUTES
// ======================================================

router.post(
    '/:subdomain/orders',
    resolveTenant,
    protect,
    createOrder
);

router.get(
    '/:subdomain/my-orders',
    resolveTenant,
    protect,
    getMyOrders
);

router.get(
    '/:subdomain/my-orders/:orderId',
    resolveTenant,
    protect,
    getOrderById
);

// ======================================================
// PUBLIC TRACKING
// ======================================================

router.get(
    '/:subdomain/track-order/:orderId',
    resolveTenant,
    trackPublicOrder
);

// =========================
// Export Router
// =========================
module.exports = router;
