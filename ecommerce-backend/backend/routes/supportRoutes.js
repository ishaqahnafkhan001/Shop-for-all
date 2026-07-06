const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middlewares/auth');
const {
    requirePlatformSupportRole,
    requireSupportPermission
} = require('../middlewares/supportAuth');
const { supportUpload } = require('../config/cloudinary');
const {
    getPlatformSupportDashboard,
    getPlatformTickets,
    getPlatformTicketByNumber,
    addPlatformTicketMessage,
    assignPlatformTicket,
    assignNextPlatformTicket,
    updatePlatformTicketStatus,
    updatePlatformTicketPriority,
    escalatePlatformTicket,
    resolvePlatformTicket,
    closePlatformTicket,
    getSupportStaff,
    createSupportStaffInvitation,
    updateSupportStaffProfile,
    getKnownIssuesPlatform,
    createKnownIssuePlatform,
    updateKnownIssuePlatform
} = require('../controllers/supportController');

const router = express.Router();

const supportActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 120 : 1200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many support actions. Please try again later.' }
});

const uploadAttachments = (req, res, next) => {
    supportUpload.array('attachments', 6)(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                error: err.message || 'Invalid support attachment.'
            });
        }
        next();
    });
};

router.use(protect);
router.use(requirePlatformSupportRole);

router.get('/dashboard', requireSupportPermission('support.tickets.readAssigned'), getPlatformSupportDashboard);
router.get('/tickets', requireSupportPermission('support.tickets.readAssigned'), getPlatformTickets);
router.get('/queue', requireSupportPermission('support.tickets.readAll'), getPlatformTickets);
router.post('/queue/assign-next', supportActionLimiter, requireSupportPermission('support.tickets.assign'), assignNextPlatformTicket);

router.get('/tickets/:ticketNumber', requireSupportPermission('support.tickets.readAssigned'), getPlatformTicketByNumber);
router.post('/tickets/:ticketNumber/messages', supportActionLimiter, uploadAttachments, requireSupportPermission('support.tickets.reply'), addPlatformTicketMessage);
router.post('/tickets/:ticketNumber/internal-notes', supportActionLimiter, uploadAttachments, requireSupportPermission('support.tickets.internalNote'), addPlatformTicketMessage);
router.patch('/tickets/:ticketNumber/status', supportActionLimiter, requireSupportPermission('support.tickets.changeStatus'), updatePlatformTicketStatus);
router.patch('/tickets/:ticketNumber/priority', supportActionLimiter, requireSupportPermission('support.tickets.changePriority'), updatePlatformTicketPriority);
router.post('/tickets/:ticketNumber/assign', supportActionLimiter, requireSupportPermission('support.tickets.assign'), assignPlatformTicket);
router.post('/tickets/:ticketNumber/reassign', supportActionLimiter, requireSupportPermission('support.tickets.reassign'), assignPlatformTicket);
router.post('/tickets/:ticketNumber/escalate', supportActionLimiter, requireSupportPermission('support.tickets.escalate'), escalatePlatformTicket);
router.post('/tickets/:ticketNumber/resolve', supportActionLimiter, requireSupportPermission('support.tickets.changeStatus'), resolvePlatformTicket);
router.post('/tickets/:ticketNumber/close', supportActionLimiter, requireSupportPermission('support.tickets.close'), closePlatformTicket);

router.get('/staff', requireSupportPermission('support.staff.read'), getSupportStaff);
router.post('/staff/invitations', supportActionLimiter, requireSupportPermission('support.staff.manage'), createSupportStaffInvitation);
router.patch('/staff/:id', supportActionLimiter, requireSupportPermission('support.staff.manageCapacity'), updateSupportStaffProfile);
router.patch('/staff/:id/availability', supportActionLimiter, requireSupportPermission('support.staff.manageAvailability'), updateSupportStaffProfile);
router.patch('/staff/:id/capacity', supportActionLimiter, requireSupportPermission('support.staff.manageCapacity'), updateSupportStaffProfile);

router.get('/known-issues', requireSupportPermission('support.knownIssues.read'), getKnownIssuesPlatform);
router.post('/known-issues', supportActionLimiter, requireSupportPermission('support.knownIssues.manage'), createKnownIssuePlatform);
router.patch('/known-issues/:id', supportActionLimiter, requireSupportPermission('support.knownIssues.manage'), updateKnownIssuePlatform);

module.exports = router;
