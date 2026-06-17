const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { resolveTenant } = require('../middlewares/tenant');
const { blockVerificationSuspendedShop } = require('../middlewares/vendorVerificationGuard');
const { upload } = require('../config/cloudinary');
const {
    getStoreBuilderSettings,
    updateStoreBuilderSettings,
    getStoreBuilderReviews,
    uploadStoreBuilderLogo,
    uploadStoreBuilderImage,
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
    blockVerificationSuspendedShop,
    updateStoreBuilderSettings
);

router.get(
    '/admin/reviews',
    protect,
    authorize('VendorAdmin'),
    getStoreBuilderReviews
);

router.post(
    '/admin/logo',
    protect,
    authorize('VendorAdmin'),
    blockVerificationSuspendedShop,
    upload.single('logo'),
    uploadStoreBuilderLogo
);

router.post(
    '/admin/image',
    protect,
    authorize('VendorAdmin'),
    blockVerificationSuspendedShop,
    upload.single('image'),
    uploadStoreBuilderImage
);

router.get(
    '/storefront/:subdomain',
    resolveTenant,
    getPublicStorefrontSettings
);

module.exports = router;
