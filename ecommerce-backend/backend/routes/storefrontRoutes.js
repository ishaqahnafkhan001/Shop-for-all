// storefrontRoutes.js

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// =========================
// Middlewares
// =========================
const { resolveTenant } = require('../middlewares/tenant');
const { protect } = require('../middlewares/auth');
const { otpRateLimiter } = require('../middlewares/otpRateLimiter');
const { upload } = require('../config/cloudinary');

// =========================
// Controllers
// =========================

// Store Controllers
const {
    getStoreInfo,
    getStorefrontBootstrap,
    getStorefrontSitemapData,
    getStorefrontSlugRedirect,
    getSingleProduct,
    getBatchProducts,
    getCartRecommendations
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
const {
    sendCheckoutOtp,
    verifyCheckoutOtp
} = require('../controllers/checkoutOtpController');

// Review Controllers
const {
    getProductReviews,
    addProductReview
} = require('../controllers/reviewController');

// Public Controllers
const {
    sendTrackedOrderAccessOtp,
    verifyTrackedOrderAccessOtp,
    trackPublicOrder,
    cancelTrackedOrder,
    createTrackedReturnRequest
} = require('../controllers/publicController');
const {
    createCustomerDataRequest
} = require('../controllers/privacyController');
const {
    getPublicCollections,
    getPublicCollectionBySlug
} = require('../controllers/collectionController');

const returnProofUpload = upload.fields([
    { name: 'proofImages', maxCount: 3 },
    { name: 'proofVideo', maxCount: 1 }
]);

const publicOrderLookupLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 30 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many order access attempts. Please try again later.' }
});

const publicOrderActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 20 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many order actions. Please try again later.' }
});

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

router.get(
    '/:subdomain/seo/sitemap',
    resolveTenant,
    getStorefrontSitemapData
);

router.get(
    '/:subdomain/seo/redirect/:type/:slug',
    resolveTenant,
    getStorefrontSlugRedirect
);

// ======================================================
// COLLECTION ROUTES
// ======================================================

router.get(
    '/:subdomain/collections',
    resolveTenant,
    getPublicCollections
);

router.get(
    '/:subdomain/collections/:slug',
    resolveTenant,
    getPublicCollectionBySlug
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
    '/:subdomain/recommendations/cart',
    resolveTenant,
    getCartRecommendations
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
    '/:subdomain/checkout/send-otp',
    resolveTenant,
    otpRateLimiter,
    sendCheckoutOtp
);

router.post(
    '/:subdomain/checkout/verify-otp',
    resolveTenant,
    otpRateLimiter,
    verifyCheckoutOtp
);

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
    publicOrderLookupLimiter,
    trackPublicOrder
);

router.post(
    '/:subdomain/orders/:orderId/access/send-otp',
    resolveTenant,
    publicOrderLookupLimiter,
    sendTrackedOrderAccessOtp
);

router.post(
    '/:subdomain/orders/:orderId/access/verify-otp',
    resolveTenant,
    publicOrderLookupLimiter,
    verifyTrackedOrderAccessOtp
);

router.post(
    '/:subdomain/orders/:orderId/cancel',
    resolveTenant,
    publicOrderActionLimiter,
    cancelTrackedOrder
);

router.post(
    '/:subdomain/orders/:orderId/returns',
    resolveTenant,
    publicOrderActionLimiter,
    returnProofUpload,
    createTrackedReturnRequest
);

router.post(
    '/:subdomain/privacy/data-requests',
    resolveTenant,
    protect,
    createCustomerDataRequest
);

// =========================
// Export Router
// =========================
module.exports = router;
