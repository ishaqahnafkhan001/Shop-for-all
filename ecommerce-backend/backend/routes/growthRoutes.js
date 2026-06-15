const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { requirePermission } = require('../middlewares/permission');
const {
    getGrowthOverview,
    getGrowthProducts,
    getGrowthProductDetail,
    getGrowthSearch,
    getGrowthRecommendations,
    generateAdCopy
} = require('../controllers/growthController');

router.use(protect);
router.use(authorize('VendorAdmin', 'VendorStaff'));
router.use(requirePermission('analytics'));

router.get('/overview', getGrowthOverview);
router.get('/products', getGrowthProducts);
router.get('/products/:productId', getGrowthProductDetail);
router.get('/search', getGrowthSearch);
router.get('/recommendations', getGrowthRecommendations);
router.post('/generate-ad-copy', generateAdCopy);

module.exports = router;
