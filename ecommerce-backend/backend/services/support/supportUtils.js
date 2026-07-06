const crypto = require('crypto');
const SupportSequence = require('../../models/SupportSequence');
const {
    SUPPORT_CATEGORIES,
    SUPPORT_PRIORITIES
} = require('./supportConstants');

const stripHtml = (value = '') => String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const cleanText = (value = '', max = 1000) => stripHtml(value).slice(0, max);

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();

const asArray = (value) => Array.isArray(value) ? value : [];

const pickEnum = (value, allowed, fallback) => {
    const clean = String(value || '').trim();
    return allowed.includes(clean) ? clean : fallback;
};

const normalizeCategory = (value) => pickEnum(value, SUPPORT_CATEGORIES, 'other');
const normalizePriority = (value) => pickEnum(value, SUPPORT_PRIORITIES, 'normal');

const derivePriority = ({ requestedPriority, category, impact = {} }) => {
    const normalized = normalizePriority(requestedPriority);
    const highImpact = Boolean(
        impact.storefrontDown ||
        impact.checkoutBlocked ||
        impact.dataLeak ||
        impact.accountCompromise ||
        impact.orderInventoryCorruption
    );

    if (category === 'security' || impact.dataLeak || impact.accountCompromise) return 'critical';
    if (highImpact) return 'high';
    return normalized === 'critical' ? 'high' : normalized;
};

const buildDiagnostics = (input = {}) => {
    const diagnostics = {
        route: cleanText(input.route || input.currentRoute || '', 300),
        browser: cleanText(input.browser || '', 160),
        deviceType: cleanText(input.deviceType || '', 80),
        screen: cleanText(input.screen || input.screenSize || '', 80),
        buildVersion: cleanText(input.buildVersion || '', 120),
        timestamp: input.timestamp ? cleanText(input.timestamp, 80) : new Date().toISOString(),
        requestId: cleanText(input.requestId || '', 120),
        affectedEntityType: cleanText(input.affectedEntityType || '', 80),
        affectedEntityId: cleanText(input.affectedEntityId || '', 120)
    };

    Object.keys(diagnostics).forEach((key) => {
        if (!diagnostics[key]) delete diagnostics[key];
    });

    return diagnostics;
};

const toAttachmentMeta = (file = {}) => ({
    publicId: file.public_id || file.filename || '',
    url: file.secure_url || file.path || '',
    resourceType: String(file.mimetype || '').startsWith('video/') ? 'video' : (file.mimetype === 'application/pdf' ? 'raw' : 'image'),
    mimeType: file.mimetype || '',
    sizeBytes: Number(file.size || 0),
    originalFilename: cleanText(file.originalname || '', 180)
});

const getUploadedAttachments = (req) => {
    const files = Array.isArray(req.files)
        ? req.files
        : Object.values(req.files || {}).flat();

    return files.map(toAttachmentMeta).filter(item => item.url || item.publicId);
};

const hashOpaqueToken = (token) => crypto
    .createHash('sha256')
    .update(String(token || ''), 'utf8')
    .digest('hex');

const createOpaqueToken = () => crypto.randomBytes(32).toString('base64url');

const generateTicketNumber = async () => {
    const year = new Date().getUTCFullYear();
    const counter = await SupportSequence.findOneAndUpdate(
        { key: `support-ticket:${year}` },
        { $inc: { seq: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return `SUP-${year}-${String(counter.seq).padStart(6, '0')}`;
};

const buildInvitationUrl = (token) => {
    const base = process.env.ADMIN_APP_URL || process.env.ADMIN_URL || process.env.CLIENT_URL || 'http://localhost:5173';
    return `${String(base).replace(/\/$/, '')}/support-invite/${token}`;
};

const getPublicTicketFields = (ticket = {}) => ({
    _id: ticket._id,
    ticketNumber: ticket.ticketNumber,
    category: ticket.category,
    subcategory: ticket.subcategory,
    subject: ticket.subject,
    description: ticket.description,
    priority: ticket.priority,
    status: ticket.status,
    assignedTo: ticket.assignedTo ? {
        name: ticket.assignedTo.fullName || 'Support staff'
    } : null,
    lastVendorReplyAt: ticket.lastVendorReplyAt,
    lastStaffReplyAt: ticket.lastStaffReplyAt,
    resolvedAt: ticket.resolvedAt,
    resolutionSummary: ticket.resolutionSummary,
    closedAt: ticket.closedAt,
    reopenedAt: ticket.reopenedAt,
    reopenCount: ticket.reopenCount,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt
});

module.exports = {
    stripHtml,
    cleanText,
    normalizeEmail,
    asArray,
    normalizeCategory,
    normalizePriority,
    derivePriority,
    buildDiagnostics,
    getUploadedAttachments,
    hashOpaqueToken,
    createOpaqueToken,
    generateTicketNumber,
    buildInvitationUrl,
    getPublicTicketFields
};
