const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const {
    getVendorBillingCurrent,
    getVendorBillingUsage,
    previewVendorDowngrade,
    scheduleVendorDowngrade,
    cancelVendorDowngrade,
    getVendorDowngradeStatus,
    getVendorConversionPrompt,
    dismissVendorConversionPrompt,
    createVendorUpgradeIntent,
    getVendorUpgradeIntent,
    getVendorSubscriptionTimeline,
    trackVendorUpgradeClicked,
    getVendorInvoices,
    getVendorPayments,
    createVendorInvoice,
    submitVendorManualPayment
} = require('../controllers/billingController');

router.use(protect);
router.use(authorize('VendorAdmin'));

router.get('/current', getVendorBillingCurrent);
router.get('/usage', getVendorBillingUsage);
router.post('/downgrade/preview', previewVendorDowngrade);
router.post('/downgrade/schedule', scheduleVendorDowngrade);
router.post('/downgrade/cancel', cancelVendorDowngrade);
router.get('/downgrade/status', getVendorDowngradeStatus);
router.get('/conversion/prompt', getVendorConversionPrompt);
router.post('/conversion/prompts/:category/dismiss', dismissVendorConversionPrompt);
router.post('/upgrade-intents', createVendorUpgradeIntent);
router.get('/upgrade-intents/:token', getVendorUpgradeIntent);
router.get('/timeline', getVendorSubscriptionTimeline);
router.post('/events/upgrade-clicked', trackVendorUpgradeClicked);
router.get('/invoices', getVendorInvoices);
router.post('/invoices', createVendorInvoice);
router.get('/payments', getVendorPayments);
router.post('/payments/manual-submit', submitVendorManualPayment);
router.post('/invoices/:invoiceId/submit-payment', submitVendorManualPayment);

module.exports = router;
