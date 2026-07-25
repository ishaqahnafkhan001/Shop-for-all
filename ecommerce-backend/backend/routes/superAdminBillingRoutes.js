const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
    requirePlatformPermission,
    requireRecentAuthentication
} = require('../middlewares/platformAuthorization');

const {
    getSuperAdminBillingOverview,
    getSuperAdminSubscriptions,
    getSuperAdminInvoices,
    getSuperAdminPayments,
    getSuperAdminPaymentProof,
    updateSuperAdminSubscriptionStatus,
    executeSuperAdminSubscriptionAction,
    forceSuperAdminDowngrade,
    createSuperAdminInvoice,
    updateSuperAdminInvoice,
    verifySuperAdminPayment,
    rejectSuperAdminPayment,
    runSuperAdminBillingLifecycleCheck
} = require('../controllers/billingController');

const sensitiveBillingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 60 : 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many billing actions. Please try again later.' }
});

router.get('/overview', requirePlatformPermission('billing.read'), getSuperAdminBillingOverview);
router.get('/subscriptions', requirePlatformPermission('billing.read'), getSuperAdminSubscriptions);
router.get('/invoices', requirePlatformPermission('billing.read'), getSuperAdminInvoices);
router.get('/payments', requirePlatformPermission('billing.read'), getSuperAdminPayments);
router.get('/payments/:id/proof', sensitiveBillingLimiter, requirePlatformPermission('billing.payments.review'), requireRecentAuthentication, getSuperAdminPaymentProof);
router.patch('/subscriptions/:id/status', sensitiveBillingLimiter, requirePlatformPermission('billing.subscriptions.modify'), requireRecentAuthentication, updateSuperAdminSubscriptionStatus);
router.post('/subscriptions/:id/actions/extend', sensitiveBillingLimiter, requirePlatformPermission('billing.subscriptions.extend'), requireRecentAuthentication, executeSuperAdminSubscriptionAction);
router.post('/subscriptions/:id/actions/:action', sensitiveBillingLimiter, requirePlatformPermission('billing.subscriptions.modify'), requireRecentAuthentication, executeSuperAdminSubscriptionAction);
router.post('/subscriptions/:id/force-downgrade', sensitiveBillingLimiter, requirePlatformPermission('billing.subscriptions.modify'), requireRecentAuthentication, forceSuperAdminDowngrade);
router.post('/invoices', sensitiveBillingLimiter, requirePlatformPermission('billing.subscriptions.modify'), requireRecentAuthentication, createSuperAdminInvoice);
router.patch('/invoices/:id', sensitiveBillingLimiter, requirePlatformPermission('billing.subscriptions.modify'), requireRecentAuthentication, updateSuperAdminInvoice);
router.patch('/payments/:id/verify', sensitiveBillingLimiter, requirePlatformPermission('billing.payments.review'), requireRecentAuthentication, verifySuperAdminPayment);
router.patch('/payments/:id/reject', sensitiveBillingLimiter, requirePlatformPermission('billing.payments.review'), requireRecentAuthentication, rejectSuperAdminPayment);
router.post('/lifecycle/check', sensitiveBillingLimiter, requirePlatformPermission('billing.subscriptions.modify'), requireRecentAuthentication, runSuperAdminBillingLifecycleCheck);

module.exports = router;
