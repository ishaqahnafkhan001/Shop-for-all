const express = require('express');
const router = express.Router();

const {
    getSuperAdminBadgeApplications,
    getSuperAdminBadgeApplicationById,
    approveBadgeApplication,
    rejectBadgeApplication,
    revokeBadgeApplication,
    rerunBadgeAnalysis
} = require('../controllers/badgeController');

router.get('/', getSuperAdminBadgeApplications);
router.get('/:id', getSuperAdminBadgeApplicationById);
router.patch('/:id/approve', approveBadgeApplication);
router.patch('/:id/reject', rejectBadgeApplication);
router.patch('/:id/revoke', revokeBadgeApplication);
router.post('/:id/rerun-analysis', rerunBadgeAnalysis);

module.exports = router;
