const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const {
    getPlatformOverview,
    getShops,
    updateShopGovernance,
    getPlans,
    upsertPlan,
    getDomains,
    getFailedPayments,
    getAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    getAbuseReports,
    updateAbuseReport
} = require('../controllers/superAdminController');

router.use(protect);
router.use(authorize('SuperAdmin'));

router.get('/overview', getPlatformOverview);
router.get('/shops', getShops);
router.patch('/shops/:id', updateShopGovernance);
router.get('/plans', getPlans);
router.post('/plans', upsertPlan);
router.get('/domains', getDomains);
router.get('/failed-payments', getFailedPayments);
router.get('/announcements', getAnnouncements);
router.post('/announcements', createAnnouncement);
router.patch('/announcements/:id', updateAnnouncement);
router.get('/abuse-reports', getAbuseReports);
router.patch('/abuse-reports/:id', updateAbuseReport);

module.exports = router;
