const express = require('express');
const router = express.Router();

// Middleware
const { resolveTenant } = require('../middlewares/tenant');

// Controllers
const {
    getStoreInfo,
    getStoreProducts,
    getSingleProduct
} = require('../controllers/storeController');

/**
 * @route   GET /api/storefront/:subdomain/info
 * @desc    Get Shop Name, Logo, and Theme for the Next.js header
 * @access  Public
 */
router.get('/:subdomain/info', resolveTenant, getStoreInfo);

/**
 * @route   GET /api/storefront/:subdomain/products
 * @desc    Get all products belonging to this specific shop
 * @access  Public
 */
router.get('/:subdomain/products', resolveTenant, getStoreProducts);

/**
 * @route   GET /api/storefront/:subdomain/products/:id
 * @desc    Get details for a single product (used for SEO & Product Page)
 * @access  Public
 */
router.get('/:subdomain/products/:id', resolveTenant, getSingleProduct);

module.exports = router;