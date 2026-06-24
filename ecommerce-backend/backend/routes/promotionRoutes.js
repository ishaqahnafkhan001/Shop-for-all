const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { requirePermission } = require('../middlewares/permission');
const { resolveTenant } = require('../middlewares/tenant');
const { blockVerificationSuspendedShop } = require('../middlewares/vendorVerificationGuard');
const { requireShopFeature } = require('../middlewares/featureGate');
const {
    getPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion,
    validatePromotion
} = require('../controllers/promotionController');

router.get(
    '/admin',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('promotions'),
    requireShopFeature('coupons'),
    getPromotions
);

router.post(
    '/admin',
    protect,
    authorize('VendorAdmin'),
    requireShopFeature('coupons'),
    blockVerificationSuspendedShop,
    createPromotion
);

router.patch(
    '/admin/:id',
    protect,
    authorize('VendorAdmin'),
    requireShopFeature('coupons'),
    blockVerificationSuspendedShop,
    updatePromotion
);

router.delete(
    '/admin/:id',
    protect,
    authorize('VendorAdmin'),
    requireShopFeature('coupons'),
    blockVerificationSuspendedShop,
    deletePromotion
);

router.post(
    '/storefront/:subdomain/validate',
    resolveTenant,
    validatePromotion
);

module.exports = router;
