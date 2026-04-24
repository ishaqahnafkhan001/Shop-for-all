const express = require('express');
const router = express.Router();

// Middleware
const { resolveTenant } = require('../middlewares/tenant');
const { protect } = require('../middlewares/auth'); // Customer Auth

// Controllers
const {
    getStoreInfo,
    getStoreProducts,
    getSingleProduct
} = require('../controllers/storeController');
const { createOrder } = require('../controllers/orderController');

/**
 * @route   GET /api/storefront/:subdomain/info
 */
router.get('/:subdomain/info', resolveTenant, getStoreInfo);

/**
 * @route   GET /api/storefront/:subdomain/products
 */
router.get('/:subdomain/products', resolveTenant, getStoreProducts);

/**
 * @route   GET /api/storefront/:subdomain/products/:id
 */
router.get('/:subdomain/products/:id', resolveTenant, getSingleProduct);

/**
 * @route   POST /api/storefront/:subdomain/orders
 * @desc    Place an order on a specific store
 * @access  Private (Customer must be logged in)
 */
router.post('/:subdomain/orders', resolveTenant, protect, createOrder);

module.exports = router;