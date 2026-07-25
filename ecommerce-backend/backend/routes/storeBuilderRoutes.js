const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { resolveTenant } = require('../middlewares/tenant');
const { blockVerificationSuspendedShop } = require('../middlewares/vendorVerificationGuard');
const { requireShopFeature, requireShopFeatureWhenCustomDomainChanges } = require('../middlewares/featureGate');
const { requirePermission } = require('../middlewares/permission');
const { brandUpload, storeBuilderUpload } = require('../config/cloudinary');
const {
    getStoreBuilderSettings,
    updateStoreBuilderSettings,
    getStoreBuilderSeoBootstrap,
    saveStoreBuilderSeoDraft,
    deleteStoreBuilderSeoDraft,
    publishStoreBuilderSeo,
    suggestStoreSeo,
    getStoreBuilderReviews,
    getStoreBuilderDraft,
    saveStoreBuilderDraft,
    deleteStoreBuilderDraft,
    getStoreBuilderRevisions,
    getStoreBuilderRevision,
    restoreStoreBuilderRevision,
    deleteStoreBuilderAsset,
    uploadStoreBuilderLogo,
    uploadStoreBuilderImage,
    getPublicStorefrontSettings
} = require('../controllers/storeBuilderController');
const { checkVendorCustomDomainDns } = require('../controllers/customDomainController');

const storeBuilderWriteLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, code: 'RATE_LIMITED', error: 'Too many Store Builder changes. Please wait a moment.' }
});
const storeBuilderUploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 80,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, code: 'RATE_LIMITED', error: 'Too many Store Builder uploads. Please try again later.' }
});
const storeBuilderAiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 12,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, code: 'RATE_LIMITED', error: 'Too many SEO AI requests. Please try again later.' }
});

router.get(
    '/admin',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('storeBuilder'),
    requireShopFeature('storeBuilder'),
    getStoreBuilderSettings
);

router.get(
    '/admin/bootstrap',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('storeBuilder'),
    requireShopFeature('storeBuilder'),
    getStoreBuilderSettings
);

router.get(
    '/admin/seo/bootstrap',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('storeBuilder'),
    requireShopFeature('storeBuilder'),
    requireShopFeature('homepageSeo'),
    getStoreBuilderSeoBootstrap
);

router.put(
    '/admin/seo/draft',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('storeBuilder'),
    requireShopFeature('storeBuilder'),
    requireShopFeature('homepageSeo'),
    blockVerificationSuspendedShop,
    storeBuilderWriteLimiter,
    saveStoreBuilderSeoDraft
);

router.delete(
    '/admin/seo/draft',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('storeBuilder'),
    requireShopFeature('storeBuilder'),
    requireShopFeature('homepageSeo'),
    blockVerificationSuspendedShop,
    storeBuilderWriteLimiter,
    deleteStoreBuilderSeoDraft
);

router.post(
    '/admin/seo/publish',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('storeBuilder'),
    requireShopFeature('storeBuilder'),
    requireShopFeature('homepageSeo'),
    blockVerificationSuspendedShop,
    storeBuilderWriteLimiter,
    publishStoreBuilderSeo
);

router.post(
    '/admin/seo/ai-suggest',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('storeBuilder'),
    requireShopFeature('storeBuilder'),
    requireShopFeature('homepageSeo'),
    blockVerificationSuspendedShop,
    storeBuilderAiLimiter,
    suggestStoreSeo
);

router.patch(
    '/admin',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('storeBuilder'),
    requireShopFeature('storeBuilder'),
    requireShopFeatureWhenCustomDomainChanges('customDomain'),
    blockVerificationSuspendedShop,
    storeBuilderWriteLimiter,
    updateStoreBuilderSettings
);

router.get(
    '/admin/draft',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('storeBuilder'),
    requireShopFeature('storeBuilder'),
    getStoreBuilderDraft
);

router.put(
    '/admin/draft',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('storeBuilder'),
    requireShopFeature('storeBuilder'),
    blockVerificationSuspendedShop,
    storeBuilderWriteLimiter,
    saveStoreBuilderDraft
);

router.delete(
    '/admin/draft',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('storeBuilder'),
    requireShopFeature('storeBuilder'),
    blockVerificationSuspendedShop,
    deleteStoreBuilderDraft
);

router.get(
    '/admin/revisions',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('storeBuilder'),
    requireShopFeature('storeBuilder'),
    getStoreBuilderRevisions
);

router.get(
    '/admin/revisions/:id',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('storeBuilder'),
    requireShopFeature('storeBuilder'),
    getStoreBuilderRevision
);

router.post(
    '/admin/revisions/:id/restore',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('storeBuilder'),
    requireShopFeature('storeBuilder'),
    blockVerificationSuspendedShop,
    storeBuilderWriteLimiter,
    restoreStoreBuilderRevision
);

router.post(
    '/admin/custom-domain/check',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('storeBuilder'),
    requireShopFeature('storeBuilder'),
    requireShopFeature('customDomain'),
    blockVerificationSuspendedShop,
    storeBuilderWriteLimiter,
    checkVendorCustomDomainDns
);

router.get(
    '/admin/reviews',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('storeBuilder'),
    requireShopFeature('storeBuilder'),
    getStoreBuilderReviews
);

router.post(
    '/admin/logo',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('storeBuilder'),
    requireShopFeature('storeBuilder'),
    blockVerificationSuspendedShop,
    storeBuilderUploadLimiter,
    brandUpload.single('logo'),
    uploadStoreBuilderLogo
);

router.post(
    '/admin/image',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('storeBuilder'),
    requireShopFeature('storeBuilder'),
    blockVerificationSuspendedShop,
    storeBuilderUploadLimiter,
    storeBuilderUpload.single('image'),
    uploadStoreBuilderImage
);

router.delete(
    '/admin/assets/:id',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('storeBuilder'),
    requireShopFeature('storeBuilder'),
    blockVerificationSuspendedShop,
    deleteStoreBuilderAsset
);

router.get(
    '/storefront/:subdomain',
    resolveTenant,
    getPublicStorefrontSettings
);

module.exports = router;
