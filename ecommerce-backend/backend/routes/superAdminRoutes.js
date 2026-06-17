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
    approveVendorVerification,
    rejectVendorVerification
} = require('../controllers/vendorVerificationController');

router.use(protect);
router.use(authorize('SuperAdmin'));

router.get('/overview', getPlatformOverview);
router.get('/shops', getShops);
router.get('/shops/:shopId', getShopDetail);
router.patch('/shops/:shopId/status', updateShopStatus);
router.patch('/shops/:shopId/plan', updateShopPlan);
router.patch('/shops/:shopId/feature-flags', updateShopFeatureFlags);
router.patch('/shops/:id', updateShopGovernance);
router.get('/vendor-verifications', getVendorVerifications);
router.get('/vendor-verifications/:id', getVendorVerificationById);
router.patch('/vendor-verifications/:id/approve', approveVendorVerification);
router.patch('/vendor-verifications/:id/reject', rejectVendorVerification);
router.get('/plans', getPlans);
router.post('/plans', upsertPlan);
router.get('/domains', getDomains);
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
