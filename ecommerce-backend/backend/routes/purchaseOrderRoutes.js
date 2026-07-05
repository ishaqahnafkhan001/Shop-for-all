const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { requirePermission } = require('../middlewares/permission');

const {
    createPO,
    receivePO,
    getPOs
} = require('../controllers/purchaseOrderController');

router.use(protect);
router.use(authorize('VendorAdmin', 'VendorStaff'));

router.post('/', requirePermission('purchaseOrdersManage'), createPO);
router.get('/', requirePermission('purchaseOrdersRead'), getPOs);
router.patch('/:id/receive', requirePermission('purchaseOrdersReceive'), receivePO);

module.exports = router;
