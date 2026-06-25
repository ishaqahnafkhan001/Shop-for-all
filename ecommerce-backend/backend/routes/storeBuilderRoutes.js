const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { resolveTenant } = require('../middlewares/tenant');
const { blockVerificationSuspendedShop } = require('../middlewares/vendorVerificationGuard');
const { requireShopFeature, requireShopFeatureWhenCustomDomainChanges } = require('../middlewares/featureGate');
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
    requireShopFeature('storeBuilder'),
    getStoreBuilderSettings
);

router.patch(
    '/admin',
    protect,
    authorize('VendorAdmin'),
    requireShopFeature('storeBuilder'),
    requireShopFeatureWhenCustomDomainChanges('customDomain'),
    blockVerificationSuspendedShop,
    updateStoreBuilderSettings
);

router.get(
    '/admin/reviews',
    protect,
    authorize('VendorAdmin'),
    requireShopFeature('storeBuilder'),
    getStoreBuilderReviews
);

router.post(
    '/admin/logo',
    protect,
    authorize('VendorAdmin'),
    requireShopFeature('storeBuilder'),
    blockVerificationSuspendedShop,
    upload.single('logo'),
    uploadStoreBuilderLogo
);

router.post(
    '/admin/image',
    protect,
    authorize('VendorAdmin'),
    requireShopFeature('storeBuilder'),
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
