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

// --- PUBLIC ROUTES (Storefront) ---
// Uses resolveTenant because it reads the subdomain from the URL
router.get('/storefront/:subdomain/active', resolveTenant, getActiveBanners);



router.use(protect);
router.use(authorize('VendorAdmin', 'VendorStaff'));
router.use(requirePermission('storeBuilder'));

router.get('/', getAllBanners);

router.post('/', upload.array('images', 5), createBanner);

router.delete('/:id', authorize('VendorAdmin'), deleteBanner);

router.patch('/:id/toggle', toggleBannerStatus);

module.exports = router;
