const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { requirePermission } = require('../middlewares/permission');
const { resolveTenant } = require('../middlewares/tenant');
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
    getPromotions
);

router.post(
    '/admin',
    protect,
    authorize('VendorAdmin'),
    createPromotion
);

router.patch(
    '/admin/:id',
    protect,
    authorize('VendorAdmin'),
    updatePromotion
);

router.delete(
    '/admin/:id',
    protect,
    authorize('VendorAdmin'),
    deletePromotion
);

router.post(
    '/storefront/:subdomain/validate',
    resolveTenant,
    validatePromotion
);

module.exports = router;
