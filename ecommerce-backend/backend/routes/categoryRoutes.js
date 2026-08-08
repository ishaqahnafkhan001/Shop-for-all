const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { requirePermission } = require('../middlewares/permission');
const { requireShopFeature } = require('../middlewares/featureGate');
const { blockVerificationSuspendedShop } = require('../middlewares/vendorVerificationGuard');
const { catalogImageUpload } = require('../config/cloudinary');
const {
    getCategories,
    getCategoryProductImages,
    saveCategoryCover,
    removeCategoryCover
} = require('../controllers/categoryController');

router.use(protect);
router.use(authorize('VendorAdmin', 'VendorStaff'));
router.use(requirePermission('catalogTools'));
router.use(requireShopFeature('bulkProductTools'));

router.get('/', getCategories);
router.get('/images', getCategoryProductImages);
router.post('/cover', blockVerificationSuspendedShop, catalogImageUpload.single('coverImage'), saveCategoryCover);
router.delete('/:id/cover', blockVerificationSuspendedShop, removeCategoryCover);

module.exports = router;
