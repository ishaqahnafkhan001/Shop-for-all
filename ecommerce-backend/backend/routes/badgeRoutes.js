const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const {
    getVendorBadgeStatus,
    requestVendorBadge,
    getVendorBadgeApplications
} = require('../controllers/badgeController');

router.use(protect);
router.use(authorize('VendorAdmin', 'VendorStaff'));

router.get('/status', getVendorBadgeStatus);
router.post('/request', authorize('VendorAdmin'), requestVendorBadge);
router.get('/applications', getVendorBadgeApplications);

module.exports = router;
