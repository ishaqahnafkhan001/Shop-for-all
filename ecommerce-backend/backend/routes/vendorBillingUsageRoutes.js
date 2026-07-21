const express = require('express');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { getVendorBillingUsage } = require('../controllers/billingController');

const router = express.Router();
router.get('/usage', protect, authorize('VendorAdmin'), getVendorBillingUsage);

module.exports = router;
