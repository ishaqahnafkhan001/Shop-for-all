const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { requirePermission } = require('../middlewares/permission');
const { requireShopFeature } = require('../middlewares/featureGate');
const { getAdvancedAnalytics } = require('../controllers/analyticsController');

router.get(
    '/',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('analytics'),
    requireShopFeature('analytics'),
    getAdvancedAnalytics
);

module.exports = router;
