const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const {
    getVendorBillingCurrent,
    getVendorInvoices,
    getVendorPayments,
    createVendorInvoice,
    submitVendorManualPayment
} = require('../controllers/billingController');

router.use(protect);
router.use(authorize('VendorAdmin', 'VendorStaff'));

router.get('/current', getVendorBillingCurrent);
router.get('/invoices', getVendorInvoices);
router.post('/invoices', createVendorInvoice);
router.get('/payments', getVendorPayments);
router.post('/payments/manual-submit', submitVendorManualPayment);
router.post('/invoices/:invoiceId/submit-payment', submitVendorManualPayment);

module.exports = router;
