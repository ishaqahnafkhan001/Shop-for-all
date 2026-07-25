const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
    requirePlatformPermission,
    requireRecentAuthentication
} = require('../middlewares/platformAuthorization');

const {
    getSuperAdminBadgeApplications,
    getSuperAdminBadgeApplicationById,
    approveBadgeApplication,
    rejectBadgeApplication,
    revokeBadgeApplication,
    rerunBadgeAnalysis
} = require('../controllers/badgeController');

const badgeActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 60 : 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many badge review actions. Please try again later.' }
});

router.get('/', requirePlatformPermission('trust.badges.read'), getSuperAdminBadgeApplications);
router.get('/:id', requirePlatformPermission('trust.badges.read'), getSuperAdminBadgeApplicationById);
router.patch('/:id/approve', badgeActionLimiter, requirePlatformPermission('trust.badges.review'), requireRecentAuthentication, approveBadgeApplication);
router.patch('/:id/reject', badgeActionLimiter, requirePlatformPermission('trust.badges.review'), requireRecentAuthentication, rejectBadgeApplication);
router.patch('/:id/revoke', badgeActionLimiter, requirePlatformPermission('trust.badges.revoke'), requireRecentAuthentication, revokeBadgeApplication);
router.post('/:id/rerun-analysis', badgeActionLimiter, requirePlatformPermission('trust.badges.review'), rerunBadgeAnalysis);

module.exports = router;
