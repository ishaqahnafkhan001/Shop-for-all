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

// --- PUBLIC ROUTES (Storefront) ---
// Uses resolveTenant because it reads the subdomain from the URL
router.get('/storefront/:subdomain/active', resolveTenant, getActiveBanners);



router.get('/', protect, getAllBanners);

router.post('/', protect, upload.array('images', 5), createBanner);

router.delete('/:id', protect, deleteBanner);

router.patch('/:id/toggle', protect, toggleBannerStatus);

module.exports = router;