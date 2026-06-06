const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { resolveTenant } = require('../middlewares/tenant');
const { upload } = require('../config/cloudinary');
const {
    getStoreBuilderSettings,
    updateStoreBuilderSettings,
    uploadStoreBuilderLogo,
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

router.post(
    '/admin/logo',
    protect,
    authorize('VendorAdmin'),
    upload.single('logo'),
    uploadStoreBuilderLogo
);

router.get(
    '/storefront/:subdomain',
    resolveTenant,
    getPublicStorefrontSettings
);

module.exports = router;
