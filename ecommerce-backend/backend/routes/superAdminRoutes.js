const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
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

router.use(protect);
router.use(authorize('SuperAdmin'));

router.get('/overview', getPlatformOverview);
router.get('/notifications', getSuperAdminNotifications);
router.patch('/notifications/read-all', markAllSuperAdminNotificationsRead);
router.patch('/notifications/:id/read', markSuperAdminNotificationRead);
router.use('/billing', superAdminBillingRoutes);
router.use('/badges', superAdminBadgeRoutes);
router.get('/shops', getShops);
router.get('/shops/:shopId', getShopDetail);
router.patch('/shops/:shopId/status', updateShopStatus);
router.patch('/shops/:shopId/plan', updateShopPlan);
router.patch('/shops/:shopId/feature-flags', updateShopFeatureFlags);
router.patch('/shops/:id', updateShopGovernance);
router.get('/vendor-verifications', getVendorVerifications);
router.get('/vendor-verifications/:id/document/:type', getSuperAdminVendorVerificationDocument);
router.get('/vendor-verifications/:id', getVendorVerificationById);
router.patch('/vendor-verifications/:id/approve', approveVendorVerification);
router.patch('/vendor-verifications/:id/reject', rejectVendorVerification);
router.get('/plans', getPlans);
router.post('/plans', upsertPlan);
router.get('/domains', getDomains);
router.post('/domains/:shopId/check-dns', checkSuperAdminCustomDomainDns);
router.patch('/domains/:shopId', updateDomain);
router.get('/failed-payments', getFailedPayments);
router.get('/announcements', getAnnouncements);
router.post('/announcements', createAnnouncement);
router.patch('/announcements/:id/publish', publishAnnouncement);
router.patch('/announcements/:id/unpublish', unpublishAnnouncement);
router.patch('/announcements/:id', updateAnnouncement);
router.delete('/announcements/:id', archiveAnnouncement);
router.get('/abuse-reports', getAbuseReports);
router.get('/abuse-reports/:id', getAbuseReportById);
router.patch('/abuse-reports/:id/status', updateAbuseReportStatus);
router.patch('/abuse-reports/:id', updateAbuseReport);
router.get('/audit-logs', getPlatformAuditLogs);

module.exports = router;
