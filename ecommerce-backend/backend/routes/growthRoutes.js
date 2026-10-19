const { blockVerificationSuspendedShop } = require('../middlewares/vendorVerificationGuard');
const { blockBillingSuspendedShop } = require('../middlewares/billingGate');
const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { requirePermission } = require('../middlewares/permission');
const { requireShopFeature } = require('../middlewares/featureGate');
const {
    getGrowthOverview,
    getGrowthProducts,
    getGrowthProductDetail,
    getGrowthSearch,
    getGrowthRecommendations,
    generateAdCopy
} = require('../controllers/growthController');

const growthAiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: process.env.NODE_ENV === 'production' ? 20 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: req => `${req.tenantId || 'unknown'}:${req.user?._id || req.user?.id || 'unknown'}`,
    message: {
        success: false,
        code: 'RATE_LIMITED',
        error: 'Too many Growth AI requests. Please try again later.'
    }
});

router.use(protect);
router.use(authorize('VendorAdmin', 'VendorStaff'));
router.use(requirePermission('growthCenter'));
router.use(requireShopFeature('growthCenter'));

const aiContent = require('../controllers/aiMerchantContentController');
router.get('/campaign-drafts', aiContent.campaignList);
router.post('/campaign-drafts', blockBillingSuspendedShop, blockVerificationSuspendedShop, aiContent.campaignSave);
router.put('/campaign-drafts/:id', blockBillingSuspendedShop, blockVerificationSuspendedShop, aiContent.campaignSave);
router.post('/campaign-drafts/:id/duplicate', blockBillingSuspendedShop, blockVerificationSuspendedShop, aiContent.campaignDuplicate);
router.delete('/campaign-drafts/:id', aiContent.campaignDelete);
router.get('/overview', getGrowthOverview);
router.get('/products', getGrowthProducts);
router.get('/products/:productId', getGrowthProductDetail);
router.get('/search', getGrowthSearch);
router.get('/recommendations', getGrowthRecommendations);
router.post('/generate-ad-copy', requireShopFeature('aiAdGenerator'), blockBillingSuspendedShop, blockVerificationSuspendedShop, growthAiLimiter, generateAdCopy);

module.exports = router;
