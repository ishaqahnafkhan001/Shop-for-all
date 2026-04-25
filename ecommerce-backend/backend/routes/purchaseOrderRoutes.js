const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');

const {
    createPO,
    receivePO,
    getPOs
} = require('../controllers/purchaseOrderController');

router.use(protect);
router.use(authorize('VendorAdmin', 'VendorStaff'));

router.post('/', createPO);
router.get('/', getPOs);
router.patch('/:id/receive', receivePO);

module.exports = router;