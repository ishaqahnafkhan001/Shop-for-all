const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { requirePermission } = require('../middlewares/permission');
const { blockVerificationSuspendedShop } = require('../middlewares/vendorVerificationGuard');
const { requireShopFeature } = require('../middlewares/featureGate');
const {
    getCollections,
    createCollection,
    updateCollection,
    deleteCollection
} = require('../controllers/collectionController');

router.use(protect);
router.use(authorize('VendorAdmin', 'VendorStaff'));
router.use(requirePermission('products'));
router.use(requireShopFeature('bulkProductTools'));

router.get('/', getCollections);
router.post('/', authorize('VendorAdmin'), blockVerificationSuspendedShop, createCollection);
router.patch('/:id', authorize('VendorAdmin'), blockVerificationSuspendedShop, updateCollection);
router.delete('/:id', authorize('VendorAdmin'), blockVerificationSuspendedShop, deleteCollection);

module.exports = router;
