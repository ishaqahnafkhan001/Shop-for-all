const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { requirePermission } = require('../middlewares/permission');
const {
    getCollections,
    createCollection,
    updateCollection,
    deleteCollection
} = require('../controllers/collectionController');

router.use(protect);
router.use(authorize('VendorAdmin', 'VendorStaff'));
router.use(requirePermission('products'));

router.get('/', getCollections);
router.post('/', authorize('VendorAdmin'), createCollection);
router.patch('/:id', authorize('VendorAdmin'), updateCollection);
router.delete('/:id', authorize('VendorAdmin'), deleteCollection);

module.exports = router;
