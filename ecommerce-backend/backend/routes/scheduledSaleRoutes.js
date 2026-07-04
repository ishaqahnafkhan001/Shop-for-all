const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { requirePermission } = require('../middlewares/permission');
const { requireShopFeature } = require('../middlewares/featureGate');
const { blockBillingSuspendedShop } = require('../middlewares/billingGate');
const { blockVerificationSuspendedShop } = require('../middlewares/vendorVerificationGuard');
const {
    listScheduledSales,
    listSaleCollections,
    createScheduledSale,
    updateScheduledSale,
    cancelScheduledSale
} = require('../controllers/scheduledSaleController');

router.use(
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('salesManage'),
    requireShopFeature('coupons')
);

router.get('/', listScheduledSales);

router.get('/collections', listSaleCollections);

router.post(
    '/',
    blockBillingSuspendedShop,
    blockVerificationSuspendedShop,
    createScheduledSale
);

router.patch(
    '/:id',
    blockBillingSuspendedShop,
    blockVerificationSuspendedShop,
    updateScheduledSale
);

router.delete(
    '/:id',
    blockBillingSuspendedShop,
    blockVerificationSuspendedShop,
    cancelScheduledSale
);

module.exports = router;
