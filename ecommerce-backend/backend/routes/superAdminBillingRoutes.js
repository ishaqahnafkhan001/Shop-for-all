const express = require('express');
const router = express.Router();

const {
    getSuperAdminBillingOverview,
    getSuperAdminSubscriptions,
    getSuperAdminInvoices,
    getSuperAdminPayments,
    updateSuperAdminSubscriptionStatus,
    createSuperAdminInvoice,
    updateSuperAdminInvoice,
    verifySuperAdminPayment,
    rejectSuperAdminPayment,
    runSuperAdminBillingLifecycleCheck
} = require('../controllers/billingController');

router.get('/overview', getSuperAdminBillingOverview);
router.get('/subscriptions', getSuperAdminSubscriptions);
router.get('/invoices', getSuperAdminInvoices);
router.get('/payments', getSuperAdminPayments);
router.patch('/subscriptions/:id/status', updateSuperAdminSubscriptionStatus);
router.post('/invoices', createSuperAdminInvoice);
router.patch('/invoices/:id', updateSuperAdminInvoice);
router.patch('/payments/:id/verify', verifySuperAdminPayment);
router.patch('/payments/:id/reject', rejectSuperAdminPayment);
router.post('/lifecycle/check', runSuperAdminBillingLifecycleCheck);

module.exports = router;
