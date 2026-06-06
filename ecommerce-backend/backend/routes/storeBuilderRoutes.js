const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { resolveTenant } = require('../middlewares/tenant');
const {
    getStoreBuilderSettings,
    updateStoreBuilderSettings,
    getPublicStorefrontSettings
} = require('../controllers/storeBuilderController');

router.get(
    '/admin',
    protect,
    authorize('VendorAdmin'),
    getStoreBuilderSettings
);

router.patch(
    '/admin',
    protect,
    authorize('VendorAdmin'),
    updateStoreBuilderSettings
);

router.get(
    '/storefront/:subdomain',
    resolveTenant,
    getPublicStorefrontSettings
);

module.exports = router;
