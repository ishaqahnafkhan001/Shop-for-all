const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { requirePermission } = require('../middlewares/permission');
const { blockVerificationSuspendedShop } = require('../middlewares/vendorVerificationGuard');
const { requireShopFeature } = require('../middlewares/featureGate');
const {
    getCollections,
    suggestCollectionAi,
    createCollection,
    updateCollection,
    deleteCollection
} = require('../controllers/collectionController');

const collectionAiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 30 : 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many AI suggestion requests. Please try again later.'
    }
});

router.use(protect);
router.use(authorize('VendorAdmin', 'VendorStaff'));
router.use(requirePermission('catalogTools'));
router.use(requireShopFeature('bulkProductTools'));

router.get('/', getCollections);
router.post('/ai/suggest', requirePermission('collectionsAi'), blockVerificationSuspendedShop, collectionAiLimiter, suggestCollectionAi);
router.post('/', blockVerificationSuspendedShop, createCollection);
router.patch('/:id', blockVerificationSuspendedShop, updateCollection);
router.delete('/:id', blockVerificationSuspendedShop, deleteCollection);

module.exports = router;
