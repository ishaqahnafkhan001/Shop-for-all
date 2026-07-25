const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const {
    requirePlatformPermission,
    requirePlatformRole,
    requireRecentAuthentication
} = require('../middlewares/platformAuthorization');
const {
    getPlatformOverview,
    getShops,
    getShopDetail,
    updateShopGovernance,
    updateShopStatus,
    updateShopPlan,
    updateShopFeatureFlags,
    getPlans,
    upsertPlan,
    getDomains,
    updateDomain,
    getFailedPayments,
    getAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    publishAnnouncement,
    unpublishAnnouncement,
    archiveAnnouncement,
    getAbuseReports,
    getAbuseReportById,
    updateAbuseReportStatus,
    updateAbuseReport,
    getPlatformAuditLogs
} = require('../controllers/superAdminController');
const {
    getVendorVerifications,
    getVendorVerificationById,
    getSuperAdminVendorVerificationDocument,
    approveVendorVerification,
    rejectVendorVerification
} = require('../controllers/vendorVerificationController');
const superAdminBillingRoutes = require('./superAdminBillingRoutes');
const superAdminBadgeRoutes = require('./superAdminBadgeRoutes');
const {
    getSuperAdminNotifications,
    markSuperAdminNotificationRead,
    markAllSuperAdminNotificationsRead
} = require('../controllers/platformNotificationController');
const { checkSuperAdminCustomDomainDns } = require('../controllers/customDomainController');
const {
    getSuperAdminSubscriptionTimeline,
    getSuperAdminSubscriptionAnalytics
} = require('../controllers/billingController');
const {
    cancelJob,
    getJobs,
    getLifecycleMonitor,
    getOperationalAlerts,
    getPlatformRegistry,
    getPlatformReports,
    getPlatformSessions,
    getPlatformSettings,
    getReconciliations,
    getShippingOperations,
    releaseJobLock,
    retryJob,
    retryReconciliation,
    revokePlatformSessions
} = require('../controllers/superAdminOperationsController');

router.use(protect);
router.use(requirePlatformRole);

router.get('/overview', requirePlatformPermission('platform.overview.read'), getPlatformOverview);
router.get('/subscription-timeline', requirePlatformPermission('billing.read'), getSuperAdminSubscriptionTimeline);
router.get('/subscription-analytics', requirePlatformPermission('billing.read'), getSuperAdminSubscriptionAnalytics);
router.get('/notifications', requirePlatformPermission('platform.overview.read'), getSuperAdminNotifications);
router.patch('/notifications/read-all', requirePlatformPermission('platform.overview.read'), markAllSuperAdminNotificationsRead);
router.patch('/notifications/:id/read', requirePlatformPermission('platform.overview.read'), markSuperAdminNotificationRead);
router.use('/billing', superAdminBillingRoutes);
router.use('/badges', superAdminBadgeRoutes);
router.get('/shops', requirePlatformPermission('platform.shops.read'), getShops);
router.get('/shops/:shopId', requirePlatformPermission('platform.shops.read'), getShopDetail);
router.patch('/shops/:shopId/status', requirePlatformPermission('platform.shops.suspend'), requireRecentAuthentication, updateShopStatus);
router.patch('/shops/:shopId/plan', requirePlatformPermission('billing.subscriptions.modify'), requireRecentAuthentication, updateShopPlan);
router.patch('/shops/:shopId/feature-flags', requirePlatformPermission('platform.shops.manage'), requireRecentAuthentication, updateShopFeatureFlags);
router.patch('/shops/:id', requirePlatformPermission('platform.shops.manage'), requireRecentAuthentication, updateShopGovernance);
router.get('/vendor-verifications', requirePlatformPermission('compliance.verification.read'), getVendorVerifications);
router.get('/vendor-verifications/:id/document/:type', requirePlatformPermission('compliance.documents.view'), requireRecentAuthentication, getSuperAdminVendorVerificationDocument);
router.get('/vendor-verifications/:id', requirePlatformPermission('compliance.verification.read'), getVendorVerificationById);
router.patch('/vendor-verifications/:id/approve', requirePlatformPermission('compliance.verification.review'), requireRecentAuthentication, approveVendorVerification);
router.patch('/vendor-verifications/:id/reject', requirePlatformPermission('compliance.verification.review'), requireRecentAuthentication, rejectVendorVerification);
router.get('/plans', requirePlatformPermission('billing.read'), getPlans);
router.post('/plans', requirePlatformPermission('billing.plans.manage'), requireRecentAuthentication, upsertPlan);
router.get('/domains', requirePlatformPermission('platform.domains.view'), getDomains);
router.post('/domains/:shopId/check-dns', requirePlatformPermission('platform.domains.manage'), requireRecentAuthentication, checkSuperAdminCustomDomainDns);
router.patch('/domains/:shopId', requirePlatformPermission('platform.domains.manage'), requireRecentAuthentication, updateDomain);
router.get('/failed-payments', requirePlatformPermission('billing.read'), getFailedPayments);
router.get('/announcements', requirePlatformPermission('platform.announcements.manage'), getAnnouncements);
router.post('/announcements', requirePlatformPermission('platform.announcements.manage'), requireRecentAuthentication, createAnnouncement);
router.patch('/announcements/:id/publish', requirePlatformPermission('platform.announcements.manage'), requireRecentAuthentication, publishAnnouncement);
router.patch('/announcements/:id/unpublish', requirePlatformPermission('platform.announcements.manage'), requireRecentAuthentication, unpublishAnnouncement);
router.patch('/announcements/:id', requirePlatformPermission('platform.announcements.manage'), requireRecentAuthentication, updateAnnouncement);
router.delete('/announcements/:id', requirePlatformPermission('platform.announcements.manage'), requireRecentAuthentication, archiveAnnouncement);
router.get('/abuse-reports', requirePlatformPermission('risk.cases.view'), getAbuseReports);
router.get('/abuse-reports/:id', requirePlatformPermission('risk.cases.view'), getAbuseReportById);
router.patch('/abuse-reports/:id/status', requirePlatformPermission('risk.cases.manage'), requireRecentAuthentication, updateAbuseReportStatus);
router.patch('/abuse-reports/:id', requirePlatformPermission('risk.cases.manage'), requireRecentAuthentication, updateAbuseReport);
router.get('/audit-logs', requirePlatformPermission('audit.logs.view'), getPlatformAuditLogs);
router.get('/jobs', requirePlatformPermission('workers.jobs.view'), getJobs);
router.post('/jobs/:id/retry', requirePlatformPermission('workers.jobs.retry'), requireRecentAuthentication, retryJob);
router.post('/jobs/:id/cancel', requirePlatformPermission('workers.jobs.cancel'), requireRecentAuthentication, cancelJob);
router.post('/jobs/:id/release-lock', requirePlatformPermission('workers.locks.manage'), requireRecentAuthentication, releaseJobLock);
router.get('/reconciliations', requirePlatformPermission('platform.reconciliation.view'), getReconciliations);
router.post('/reconciliations/:id/retry', requirePlatformPermission('platform.reconciliation.retry'), requireRecentAuthentication, retryReconciliation);
router.get('/lifecycle', requirePlatformPermission('platform.lifecycle.view'), getLifecycleMonitor);
router.get('/shipping', requirePlatformPermission('platform.shipping.view'), getShippingOperations);
router.get('/alerts', requirePlatformPermission('platform.alerts.view'), getOperationalAlerts);
router.get('/registry', requirePlatformPermission('platform.overview.read'), getPlatformRegistry);
router.get('/roles', requirePlatformPermission('platform.roles.manage'), getPlatformRegistry);
router.get('/sessions', requirePlatformPermission('platform.sessions.manage'), getPlatformSessions);
router.post('/sessions/:id/revoke', requirePlatformPermission('platform.sessions.manage'), requireRecentAuthentication, revokePlatformSessions);
router.get('/reports', requirePlatformPermission('platform.reports.view'), getPlatformReports);
router.get('/settings', requirePlatformPermission('platform.settings.manage'), getPlatformSettings);

module.exports = router;
