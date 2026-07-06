const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { supportUpload } = require('../config/cloudinary');
const {
    getVendorSupportOverview,
    createVendorTicket,
    getVendorTickets,
    getVendorTicketByNumber,
    addVendorTicketMessage,
    confirmVendorResolution,
    reopenVendorTicket,
    getVendorKnownIssues
} = require('../controllers/supportController');

const router = express.Router();

const supportWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 30 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many support requests. Please try again later.' }
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
router.use(authorize('VendorAdmin', 'VendorStaff'));

router.get('/overview', getVendorSupportOverview);
router.get('/known-issues', getVendorKnownIssues);
router.get('/announcements', getVendorKnownIssues);
router.get('/tickets', getVendorTickets);
router.post('/tickets', supportWriteLimiter, uploadAttachments, createVendorTicket);
router.get('/tickets/:ticketNumber', getVendorTicketByNumber);
router.post('/tickets/:ticketNumber/messages', supportWriteLimiter, uploadAttachments, addVendorTicketMessage);
router.post('/tickets/:ticketNumber/confirm-resolution', supportWriteLimiter, confirmVendorResolution);
router.post('/tickets/:ticketNumber/reopen', supportWriteLimiter, reopenVendorTicket);

module.exports = router;
