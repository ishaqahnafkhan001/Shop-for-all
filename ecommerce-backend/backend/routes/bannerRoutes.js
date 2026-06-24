const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const {
    createBanner,
    getAllBanners,
    getActiveBanners,
    deleteBanner,
    toggleBannerStatus
} = require('../controllers/bannerController');

const { resolveTenant } = require('../middlewares/tenant');
const { protect } = require("../middlewares/auth");
const { authorize } = require('../middlewares/role');
const { requirePermission } = require('../middlewares/permission');
const { blockVerificationSuspendedShop } = require('../middlewares/vendorVerificationGuard');
const { requireShopFeature } = require('../middlewares/featureGate');

// --- PUBLIC ROUTES (Storefront) ---
// Uses resolveTenant because it reads the subdomain from the URL
router.get('/storefront/:subdomain/active', resolveTenant, getActiveBanners);



router.use(protect);
router.use(authorize('VendorAdmin', 'VendorStaff'));
router.use(requirePermission('storeBuilder'));
router.use(requireShopFeature('storeBuilder'));

router.get('/', getAllBanners);

router.post('/', blockVerificationSuspendedShop, upload.fields([
    { name: 'desktopImages', maxCount: 5 },
    { name: 'mobileImages', maxCount: 5 },
    { name: 'images', maxCount: 5 }
]), createBanner);

router.delete('/:id', authorize('VendorAdmin'), blockVerificationSuspendedShop, deleteBanner);

router.patch('/:id/toggle', blockVerificationSuspendedShop, toggleBannerStatus);

module.exports = router;
