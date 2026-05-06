// The newly consolidated storefrontRoutes.js
const express = require('express');
const router = express.Router();

const { resolveTenant } = require('../middlewares/tenant');
const { protect } = require('../middlewares/auth');

const {
    getStoreInfo,
    getStoreProducts,
    getSingleProduct
} = require('../controllers/storeController');
const { createOrder } = require('../controllers/orderController');
// Import the missing features you need from the old public controller
const { getMyOrders, trackPublicOrder } = require('../controllers/publicController');
const { getShopProducts } = require('../controllers/productController');

router.get('/:subdomain/info', resolveTenant, getStoreInfo);
router.get('/:subdomain/products', resolveTenant, getShopProducts);
router.get('/:subdomain/products/:id', resolveTenant, getSingleProduct);
router.post('/:subdomain/orders', resolveTenant, protect, createOrder);

// Added from the old public routes
router.get('/:subdomain/track-order/:orderId', resolveTenant, trackPublicOrder);
router.get('/:subdomain/my-orders', resolveTenant, protect, getMyOrders);

module.exports = router;