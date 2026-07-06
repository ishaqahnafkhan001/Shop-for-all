const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Account = require('../models/Account');
const User = require('../models/User');
const Shop = require('../models/Shop');
const SupportTicket = require('../models/SupportTicket');
const SupportMessage = require('../models/SupportMessage');
const SupportStaffProfile = require('../models/SupportStaffProfile');
const SupportStaffInvitation = require('../models/SupportStaffInvitation');
const SupportAssignmentHistory = require('../models/SupportAssignmentHistory');
const SupportKnownIssue = require('../models/SupportKnownIssue');
const { buildPagination } = require('../utils/pagination');
const {
    normalizePage,
    normalizeLimit,
    normalizeSearch,
    escapeRegex
} = require('../utils/listQuery');
const { logPlatformAudit } = require('../services/platformAuditLogService');
const {
    SUPPORT_CATEGORIES,
    SUPPORT_PRIORITIES,
    SUPPORT_STATUSES,
    SUPPORT_ROLES,
    SUPPORT_SKILLS,
    DEFAULT_SUPPORT_CONFIG
} = require('../services/support/supportConstants');
const {
    cleanText,
    normalizeEmail,
    normalizeCategory,
    normalizePriority,
    derivePriority,
    buildDiagnostics,
    getUploadedAttachments,
    hashOpaqueToken,
    createOpaqueToken,
    generateTicketNumber,
    buildInvitationUrl,
    getPublicTicketFields,
    asArray
} = require('../services/support/supportUtils');
const {
    autoAssignTicket,
    assignTicketToStaff,
    assignNextFromQueue,
    getStaffWorkload,
    countActiveTicketsForStaff
} = require('../services/support/supportAssignmentService');
const {
    notifyVendorTicketEvent,
    notifyStaffAssigned,
    queueSupportEmail
} = require('../services/support/supportNotificationService');
const { createPlatformNotification } = require('../services/platformNotificationService');

const SORT_MAP = Object.freeze({
    newest: { updatedAt: -1 },
    oldest: { createdAt: 1 },
    priority: { priority: 1, createdAt: 1 },
    status: { status: 1, updatedAt: -1 }
});

const getActorId = (req) => req.user?._id || req.user?.id || null;
const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const parseJsonField = (value, fallback = {}) => {
    if (!value) return fallback;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const getTicketQueryFromFilters = ({ req, shopScoped = false }) => {
    const query = { isDeleted: false };
    if (shopScoped) query.shop_id = req.tenantId || req.user?.shop_id || req.user?.shopId;

    const status = String(req.query.status || 'all');
    const category = String(req.query.category || 'all');
    const priority = String(req.query.priority || 'all');
    const assignedTo = String(req.query.assignedTo || 'all');
    const search = normalizeSearch(req.query.search, 80);

    if (SUPPORT_STATUSES.includes(status)) query.status = status;
    if (SUPPORT_CATEGORIES.includes(category)) query.category = category;
    if (SUPPORT_PRIORITIES.includes(priority)) query.priority = priority;
    if (!shopScoped && assignedTo !== 'all' && isObjectId(assignedTo)) query.assignedTo = assignedTo;

    if (search) {
        const regex = new RegExp(escapeRegex(search), 'i');
        query.$or = [
            { ticketNumber: regex },
            { subject: regex },
            { description: regex }
        ];
    }

    return query;
};

const canPlatformReadTicket = (req, ticket) => {
    if (['SuperAdmin', 'SupportLead', 'TechnicalSupport'].includes(req.user?.role)) return true;
    if (req.user?.role === 'SupportAgent') {
        return ticket.assignedTo && String(ticket.assignedTo._id || ticket.assignedTo) === String(getActorId(req));
    }
    return false;
};

const serializeMessage = (message) => ({
    _id: message._id,
    messageType: message.messageType,
    senderRole: message.senderRole,
    senderName: message.senderUserId?.fullName || '',
    body: message.body,
    attachments: message.attachments || [],
    isInternalNote: Boolean(message.isInternalNote),
    createdAt: message.createdAt,
    updatedAt: message.updatedAt
});

const getTicketWithAccess = async ({ ticketNumber, req, vendor = false }) => {
    const ticket = await SupportTicket.findOne({
        ticketNumber: String(ticketNumber || '').trim().toUpperCase(),
        isDeleted: false,
        ...(vendor ? { shop_id: req.tenantId || req.user?.shop_id || req.user?.shopId } : {})
    }).populate('assignedTo', 'fullName role email').populate('shop_id', 'shopName subdomain').lean();

    if (!ticket) return null;
    if (!vendor && !canPlatformReadTicket(req, ticket)) return null;
    return ticket;
};

const serializeTicket = (ticket, { vendor = false } = {}) => {
    const base = vendor ? getPublicTicketFields(ticket) : {
        ...ticket,
        shop: ticket.shop_id ? {
            _id: ticket.shop_id._id || ticket.shop_id,
            shopName: ticket.shop_id.shopName || '',
            subdomain: ticket.shop_id.subdomain || ''
        } : null
    };

    if (!vendor && ticket.assignedTo) {
        base.assignedTo = {
            _id: ticket.assignedTo._id || ticket.assignedTo,
            name: ticket.assignedTo.fullName || 'Support staff',
            role: ticket.assignedTo.role || ''
        };
    }

    return base;
};

exports.getVendorSupportOverview = async (req, res) => {
    const shopId = req.tenantId || req.user?.shop_id || req.user?.shopId;
    const [open, waitingForVendor, inProgress, resolvedRecently, knownIssues] = await Promise.all([
        SupportTicket.countDocuments({ shop_id: shopId, status: { $in: ['open', 'unassigned', 'assigned', 'reopened'] }, isDeleted: false }),
        SupportTicket.countDocuments({ shop_id: shopId, status: 'waiting_for_vendor', isDeleted: false }),
        SupportTicket.countDocuments({ shop_id: shopId, status: 'in_progress', isDeleted: false }),
        SupportTicket.countDocuments({ shop_id: shopId, status: 'resolved_pending_confirmation', isDeleted: false }),
        SupportKnownIssue.find({ publicToVendors: true, status: { $ne: 'resolved' } }).sort({ updatedAt: -1 }).limit(5).lean()
    ]);

    res.json({
        success: true,
        data: {
            counts: { open, waitingForVendor, inProgress, resolvedRecently },
            knownIssues
        }
    });
};

exports.createVendorTicket = async (req, res) => {
    const shopId = req.tenantId || req.user?.shop_id || req.user?.shopId;
    if (!shopId) return res.status(400).json({ success: false, error: 'Shop context is required.' });

    const subject = cleanText(req.body.subject, 160);
    const description = cleanText(req.body.description, 8000);
    if (!subject || subject.length < 5) return res.status(400).json({ success: false, error: 'Subject is required.' });
    if (!description || description.length < 20) return res.status(400).json({ success: false, error: 'Description must include enough detail.' });

    const category = normalizeCategory(req.body.category);
    const impact = parseJsonField(req.body.impact, req.body.impact || {});
    const diagnosticsInput = parseJsonField(req.body.diagnostics, req.body);
    const priority = derivePriority({
        requestedPriority: req.body.priority,
        category,
        impact
    });
    const ticketNumber = await generateTicketNumber();

    const ticket = await SupportTicket.create({
        ticketNumber,
        shop_id: shopId,
        createdByUserId: getActorId(req),
        category,
        subcategory: cleanText(req.body.subcategory, 120),
        subject,
        description,
        priority,
        prioritySource: priority === normalizePriority(req.body.priority) ? 'vendor_impact' : 'system',
        impactLevel: cleanText(req.body.impactLevel, 80),
        status: 'open',
        affectedRoute: cleanText(req.body.affectedRoute || req.body.route, 300),
        affectedEntityType: cleanText(req.body.affectedEntityType, 80),
        affectedEntityId: cleanText(req.body.affectedEntityId, 120),
        requestId: cleanText(req.body.requestId, 120),
        diagnostics: buildDiagnostics(diagnosticsInput)
    });

    const attachments = getUploadedAttachments(req);
    await SupportMessage.create({
        ticketId: ticket._id,
        senderUserId: getActorId(req),
        senderRole: req.user.role,
        messageType: 'vendor_message',
        body: description,
        attachments,
        isInternalNote: false
    });

    const assignment = DEFAULT_SUPPORT_CONFIG.autoAssignmentEnabled
        ? await autoAssignTicket(ticket, { assignedBy: null, reason: 'New vendor ticket' })
        : { assigned: false };

    await notifyVendorTicketEvent({
        ticket,
        title: 'Support ticket created',
        message: `Your ticket ${ticket.ticketNumber} was created and is ${assignment.assigned ? 'assigned to support' : 'waiting in the queue'}.`,
        eventName: 'created'
    });

    if (assignment.assigned && ticket.assignedTo) {
        await notifyStaffAssigned({ ticket, staffUserId: ticket.assignedTo });
    }

    if (ticket.priority === 'critical') {
        await createPlatformNotification({
            recipientType: 'SuperAdmin',
            type: 'support_critical_ticket',
            title: 'Critical support ticket created',
            message: `${ticket.ticketNumber}: ${ticket.subject}`,
            entityType: 'SupportTicket',
            entityId: ticket._id,
            shop_id: ticket.shop_id,
            severity: 'error',
            metadata: { ticketNumber: ticket.ticketNumber }
        });
    }

    res.status(201).json({
        success: true,
        data: serializeTicket(ticket, { vendor: true })
    });
};

exports.getVendorTickets = async (req, res) => {
    const page = normalizePage(req.query.page);
    const limit = normalizeLimit(req.query.limit, 25);
    const query = getTicketQueryFromFilters({ req, shopScoped: true });
    const [total, rows] = await Promise.all([
        SupportTicket.countDocuments(query),
        SupportTicket.find(query)
            .populate('assignedTo', 'fullName role')
            .sort(SORT_MAP[req.query.sort] || SORT_MAP.newest)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean()
    ]);

    res.json({
        success: true,
        data: rows.map(row => serializeTicket(row, { vendor: true })),
        pagination: buildPagination({ total, page, limit })
    });
};

exports.getVendorTicketByNumber = async (req, res) => {
    const ticket = await getTicketWithAccess({ ticketNumber: req.params.ticketNumber, req, vendor: true });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found.' });

    const messages = await SupportMessage.find({
        ticketId: ticket._id,
        isInternalNote: false
    }).populate('senderUserId', 'fullName role').sort({ createdAt: 1 }).lean();

    res.json({
        success: true,
        data: {
            ticket: serializeTicket(ticket, { vendor: true }),
            messages: messages.map(serializeMessage)
        }
    });
};

exports.addVendorTicketMessage = async (req, res) => {
    const ticket = await SupportTicket.findOne({
        ticketNumber: String(req.params.ticketNumber || '').trim().toUpperCase(),
        shop_id: req.tenantId || req.user?.shop_id || req.user?.shopId,
        isDeleted: false
    });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found.' });
    if (['closed', 'cancelled'].includes(ticket.status)) {
        return res.status(400).json({ success: false, error: 'Closed tickets cannot receive replies. Reopen the ticket first.' });
    }

    const body = cleanText(req.body.body || req.body.message, 10000);
    const attachments = getUploadedAttachments(req);
    if (!body && attachments.length === 0) return res.status(400).json({ success: false, error: 'Message or attachment is required.' });

    const message = await SupportMessage.create({
        ticketId: ticket._id,
        senderUserId: getActorId(req),
        senderRole: req.user.role,
        messageType: 'vendor_message',
        body,
        attachments,
        isInternalNote: false
    });

    ticket.lastVendorReplyAt = new Date();
    if (ticket.status === 'waiting_for_vendor') ticket.status = ticket.assignedTo ? 'assigned' : 'unassigned';
    await ticket.save();

    if (ticket.assignedTo) {
        await notifyStaffAssigned({ ticket, staffUserId: ticket.assignedTo });
    }

    res.status(201).json({ success: true, data: serializeMessage(message.toObject()) });
};

exports.confirmVendorResolution = async (req, res) => {
    const ticket = await SupportTicket.findOne({
        ticketNumber: String(req.params.ticketNumber || '').trim().toUpperCase(),
        shop_id: req.tenantId || req.user?.shop_id || req.user?.shopId,
        isDeleted: false
    });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found.' });
    if (ticket.status !== 'resolved_pending_confirmation') {
        return res.status(400).json({ success: false, error: 'Ticket is not awaiting confirmation.' });
    }

    ticket.status = 'closed';
    ticket.closedAt = new Date();
    ticket.closedBy = getActorId(req);
    await ticket.save();

    await SupportMessage.create({
        ticketId: ticket._id,
        senderUserId: getActorId(req),
        senderRole: req.user.role,
        messageType: 'system_event',
        body: 'Vendor confirmed the issue is resolved.'
    });

    res.json({ success: true, data: serializeTicket(ticket.toObject(), { vendor: true }) });
};

exports.reopenVendorTicket = async (req, res) => {
    const ticket = await SupportTicket.findOne({
        ticketNumber: String(req.params.ticketNumber || '').trim().toUpperCase(),
        shop_id: req.tenantId || req.user?.shop_id || req.user?.shopId,
        isDeleted: false
    });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found.' });
    if (!['resolved_pending_confirmation', 'closed'].includes(ticket.status)) {
        return res.status(400).json({ success: false, error: 'Only resolved or closed tickets can be reopened.' });
    }

    const reason = cleanText(req.body.reason || req.body.message, 2000);
    ticket.status = 'reopened';
    ticket.reopenedAt = new Date();
    ticket.reopenedBy = getActorId(req);
    ticket.reopenCount = Number(ticket.reopenCount || 0) + 1;
    await ticket.save();

    await SupportMessage.create({
        ticketId: ticket._id,
        senderUserId: getActorId(req),
        senderRole: req.user.role,
        messageType: 'vendor_message',
        body: reason || 'Vendor reopened the ticket.',
        isInternalNote: false
    });

    if (ticket.assignedTo) {
        try {
            await assignTicketToStaff({
                ticket,
                staffUserId: ticket.assignedTo,
                assignedBy: getActorId(req),
                assignmentType: 'reopen',
                reason: 'Vendor reopened ticket'
            });
        } catch {
            ticket.assignedTo = null;
            await autoAssignTicket(ticket, { assignedBy: getActorId(req), reason: 'Vendor reopened ticket' });
        }
    } else {
        await autoAssignTicket(ticket, { assignedBy: getActorId(req), reason: 'Vendor reopened ticket' });
    }

    res.json({ success: true, data: serializeTicket(ticket.toObject(), { vendor: true }) });
};

exports.getVendorKnownIssues = async (req, res) => {
    const category = normalizeCategory(req.query.category || '');
    const query = { publicToVendors: true };
    if (req.query.includeResolved !== 'true') query.status = { $ne: 'resolved' };
    if (category !== 'other' || req.query.category === 'other') query.affectedCategories = category;

    const rows = await SupportKnownIssue.find(query).sort({ updatedAt: -1 }).limit(25).lean();
    res.json({ success: true, data: rows });
};

exports.getPlatformSupportDashboard = async (req, res) => {
    const [open, unassigned, critical, waitingForVendor, waitingForEngineering, resolvedToday, staffProfiles] = await Promise.all([
        SupportTicket.countDocuments({ status: { $in: ['open', 'assigned', 'in_progress', 'reopened'] }, isDeleted: false }),
        SupportTicket.countDocuments({ status: 'unassigned', isDeleted: false }),
        SupportTicket.countDocuments({ priority: 'critical', status: { $nin: ['closed', 'cancelled'] }, isDeleted: false }),
        SupportTicket.countDocuments({ status: 'waiting_for_vendor', isDeleted: false }),
        SupportTicket.countDocuments({ status: 'waiting_for_engineering', isDeleted: false }),
        SupportTicket.countDocuments({ status: 'resolved_pending_confirmation', resolvedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, isDeleted: false }),
        SupportStaffProfile.find({ isActive: true }).populate('userId', 'fullName email role status').lean()
    ]);

    const staff = [];
    for (const profile of staffProfiles) {
        staff.push({
            _id: profile._id,
            userId: profile.userId?._id,
            name: profile.userId?.fullName || '',
            role: profile.supportRole,
            manualStatus: profile.manualStatus,
            skills: profile.skills || [],
            ...(await getStaffWorkload(profile))
        });
    }

    res.json({
        success: true,
        data: {
            counts: { open, unassigned, critical, waitingForVendor, waitingForEngineering, resolvedToday },
            staff
        }
    });
};

exports.getPlatformTickets = async (req, res) => {
    const page = normalizePage(req.query.page);
    const limit = normalizeLimit(req.query.limit, 25);
    const query = getTicketQueryFromFilters({ req, shopScoped: false });
    if (req.user.role === 'SupportAgent') query.assignedTo = getActorId(req);

    const [total, rows] = await Promise.all([
        SupportTicket.countDocuments(query),
        SupportTicket.find(query)
            .populate('shop_id', 'shopName subdomain')
            .populate('assignedTo', 'fullName role')
            .sort(SORT_MAP[req.query.sort] || SORT_MAP.newest)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean()
    ]);

    res.json({
        success: true,
        data: rows.map(row => serializeTicket(row)),
        pagination: buildPagination({ total, page, limit })
    });
};

exports.getPlatformTicketByNumber = async (req, res) => {
    const ticket = await getTicketWithAccess({ ticketNumber: req.params.ticketNumber, req, vendor: false });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found.' });

    const includeInternal = ['SuperAdmin', 'SupportLead', 'TechnicalSupport'].includes(req.user.role) ||
        String(ticket.assignedTo?._id || ticket.assignedTo || '') === String(getActorId(req));
    const messages = await SupportMessage.find({
        ticketId: ticket._id,
        ...(includeInternal ? {} : { isInternalNote: false })
    }).populate('senderUserId', 'fullName role').sort({ createdAt: 1 }).lean();
    const assignmentHistory = await SupportAssignmentHistory.find({ ticketId: ticket._id })
        .populate('fromStaffId', 'fullName role')
        .populate('toStaffId', 'fullName role')
        .populate('assignedBy', 'fullName role')
        .sort({ createdAt: -1 })
        .limit(25)
        .lean();

    res.json({
        success: true,
        data: {
            ticket: serializeTicket(ticket),
            messages: messages.map(serializeMessage),
            assignmentHistory
        }
    });
};

exports.addPlatformTicketMessage = async (req, res) => {
    const ticket = await SupportTicket.findOne({
        ticketNumber: String(req.params.ticketNumber || '').trim().toUpperCase(),
        isDeleted: false
    });
    if (!ticket || !canPlatformReadTicket(req, ticket)) {
        return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    const body = cleanText(req.body.body || req.body.message, 10000);
    const internal = req.body.internal === true || req.body.isInternalNote === true || req.path.includes('/internal-notes');
    const attachments = getUploadedAttachments(req);
    if (!body && attachments.length === 0) return res.status(400).json({ success: false, error: 'Message or attachment is required.' });
    if (internal && req.user.role === 'SupportAgent' && String(ticket.assignedTo || '') !== String(getActorId(req))) {
        return res.status(403).json({ success: false, error: 'Internal note access denied.' });
    }

    const message = await SupportMessage.create({
        ticketId: ticket._id,
        senderUserId: getActorId(req),
        senderRole: req.user.role,
        messageType: internal ? 'internal_note' : 'staff_message',
        body,
        attachments,
        isInternalNote: internal
    });

    ticket.lastStaffReplyAt = new Date();
    if (!internal && ['assigned', 'reopened'].includes(ticket.status)) ticket.status = 'in_progress';
    await ticket.save();

    if (!internal) {
        await notifyVendorTicketEvent({
            ticket,
            title: 'Support replied to your ticket',
            message: `Support replied to ${ticket.ticketNumber}.`,
            eventName: 'staff_reply'
        });
    } else {
        await logPlatformAudit({
            req,
            action: 'support.internal_note_created',
            entityType: 'SupportTicket',
            entityId: ticket._id,
            entityLabel: ticket.ticketNumber,
            shop_id: ticket.shop_id,
            message: `Internal note added to ${ticket.ticketNumber}`
        });
    }

    res.status(201).json({ success: true, data: serializeMessage(message.toObject()) });
};

exports.assignPlatformTicket = async (req, res) => {
    const ticket = await SupportTicket.findOne({
        ticketNumber: String(req.params.ticketNumber || '').trim().toUpperCase(),
        isDeleted: false
    });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found.' });

    const staffUserId = req.body.staffUserId || req.body.assignedTo;
    if (!isObjectId(staffUserId)) return res.status(400).json({ success: false, error: 'Valid staffUserId is required.' });

    await assignTicketToStaff({
        ticket,
        staffUserId,
        assignedBy: getActorId(req),
        assignmentType: ticket.assignedTo ? 'reassignment' : 'manual',
        reason: cleanText(req.body.reason, 1000),
        allowCapacityOverride: req.user.role === 'SuperAdmin' && req.body.overrideCapacity === true
    });
    await notifyStaffAssigned({ ticket, staffUserId });
    await logPlatformAudit({
        req,
        action: 'support.ticket_assigned',
        entityType: 'SupportTicket',
        entityId: ticket._id,
        entityLabel: ticket.ticketNumber,
        shop_id: ticket.shop_id,
        message: `${ticket.ticketNumber} assigned to support staff`,
        reason: cleanText(req.body.reason, 1000)
    });

    res.json({ success: true, data: serializeTicket(ticket.toObject()) });
};

exports.assignNextPlatformTicket = async (req, res) => {
    const result = await assignNextFromQueue();
    res.json({ success: true, data: result });
};

exports.updatePlatformTicketStatus = async (req, res) => {
    const ticket = await SupportTicket.findOne({
        ticketNumber: String(req.params.ticketNumber || '').trim().toUpperCase(),
        isDeleted: false
    });
    if (!ticket || !canPlatformReadTicket(req, ticket)) return res.status(404).json({ success: false, error: 'Ticket not found.' });

    const nextStatus = String(req.body.status || '').trim();
    if (!SUPPORT_STATUSES.includes(nextStatus)) return res.status(400).json({ success: false, error: 'Invalid status.' });

    const previousStatus = ticket.status;
    ticket.status = nextStatus;
    if (nextStatus === 'resolved_pending_confirmation') {
        ticket.resolvedAt = new Date();
        ticket.resolvedBy = getActorId(req);
        ticket.resolutionSummary = cleanText(req.body.resolutionSummary || req.body.reason, 3000);
    }
    if (nextStatus === 'closed') {
        ticket.closedAt = new Date();
        ticket.closedBy = getActorId(req);
    }
    await ticket.save();

    await SupportMessage.create({
        ticketId: ticket._id,
        senderUserId: getActorId(req),
        senderRole: req.user.role,
        messageType: nextStatus === 'resolved_pending_confirmation' ? 'resolution' : 'system_event',
        body: cleanText(req.body.resolutionSummary || req.body.reason || `Status changed to ${nextStatus}.`, 3000),
        isInternalNote: false
    });

    await logPlatformAudit({
        req,
        action: 'support.ticket_status_changed',
        entityType: 'SupportTicket',
        entityId: ticket._id,
        entityLabel: ticket.ticketNumber,
        shop_id: ticket.shop_id,
        message: `${ticket.ticketNumber} status changed from ${previousStatus} to ${nextStatus}`,
        reason: cleanText(req.body.reason || req.body.resolutionSummary, 1000),
        metadata: { previousStatus, nextStatus }
    });

    if (nextStatus === 'resolved_pending_confirmation') {
        await notifyVendorTicketEvent({
            ticket,
            title: 'Support ticket resolved',
            message: `${ticket.ticketNumber} was marked resolved. Please confirm if the issue is fixed.`,
            eventName: 'resolved'
        });
        await assignNextFromQueue();
    }

    res.json({ success: true, data: serializeTicket(ticket.toObject()) });
};

exports.resolvePlatformTicket = async (req, res) => {
    req.body.status = 'resolved_pending_confirmation';
    return exports.updatePlatformTicketStatus(req, res);
};

exports.closePlatformTicket = async (req, res) => {
    req.body.status = 'closed';
    return exports.updatePlatformTicketStatus(req, res);
};

exports.updatePlatformTicketPriority = async (req, res) => {
    const ticket = await SupportTicket.findOne({
        ticketNumber: String(req.params.ticketNumber || '').trim().toUpperCase(),
        isDeleted: false
    });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found.' });

    const priority = normalizePriority(req.body.priority);
    const previousPriority = ticket.priority;
    ticket.priority = priority;
    ticket.prioritySource = req.user.role === 'SuperAdmin' ? 'super_admin' : 'staff_override';
    await ticket.save();

    await logPlatformAudit({
        req,
        action: 'support.ticket_priority_changed',
        entityType: 'SupportTicket',
        entityId: ticket._id,
        entityLabel: ticket.ticketNumber,
        shop_id: ticket.shop_id,
        message: `${ticket.ticketNumber} priority changed from ${previousPriority} to ${priority}`,
        reason: cleanText(req.body.reason, 1000),
        metadata: { previousPriority, priority }
    });

    res.json({ success: true, data: serializeTicket(ticket.toObject()) });
};

exports.escalatePlatformTicket = async (req, res) => {
    const ticket = await SupportTicket.findOne({
        ticketNumber: String(req.params.ticketNumber || '').trim().toUpperCase(),
        isDeleted: false
    });
    if (!ticket || !canPlatformReadTicket(req, ticket)) return res.status(404).json({ success: false, error: 'Ticket not found.' });

    const level = ['support_lead', 'technical_support', 'super_admin', 'security_incident'].includes(req.body.level)
        ? req.body.level
        : 'support_lead';
    const reason = cleanText(req.body.reason, 1000);
    if (!reason) return res.status(400).json({ success: false, error: 'Escalation reason is required.' });

    ticket.escalationLevel = level;
    ticket.escalatedAt = new Date();
    ticket.escalatedBy = getActorId(req);
    ticket.escalationReason = reason;
    if (level === 'security_incident') ticket.priority = 'critical';
    await ticket.save();

    await createPlatformNotification({
        recipientType: 'SuperAdmin',
        type: 'support_ticket_escalated',
        title: 'Support ticket escalated',
        message: `${ticket.ticketNumber} escalated to ${level}.`,
        entityType: 'SupportTicket',
        entityId: ticket._id,
        shop_id: ticket.shop_id,
        severity: level === 'security_incident' ? 'error' : 'warning',
        metadata: { ticketNumber: ticket.ticketNumber, level }
    });

    await logPlatformAudit({
        req,
        action: 'support.ticket_escalated',
        entityType: 'SupportTicket',
        entityId: ticket._id,
        entityLabel: ticket.ticketNumber,
        shop_id: ticket.shop_id,
        message: `${ticket.ticketNumber} escalated to ${level}`,
        reason,
        severity: level === 'security_incident' ? 'critical' : 'warning'
    });

    res.json({ success: true, data: serializeTicket(ticket.toObject()) });
};

exports.getSupportStaff = async (req, res) => {
    const profiles = await SupportStaffProfile.find({})
        .populate('userId', 'fullName email role status')
        .sort({ updatedAt: -1 })
        .lean();

    const rows = [];
    for (const profile of profiles) {
        rows.push({
            _id: profile._id,
            userId: profile.userId?._id,
            fullName: profile.userId?.fullName || '',
            email: profile.userId?.email || '',
            accountStatus: profile.userId?.status || '',
            supportRole: profile.supportRole,
            skills: profile.skills || [],
            manualStatus: profile.manualStatus,
            maximumActiveTickets: profile.maximumActiveTickets,
            autoAssignmentEnabled: profile.autoAssignmentEnabled,
            isActive: profile.isActive,
            lastAssignedAt: profile.lastAssignedAt,
            ...(await getStaffWorkload(profile))
        });
    }

    res.json({ success: true, data: rows });
};

exports.createSupportStaffInvitation = async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const fullName = cleanText(req.body.fullName || req.body.name, 80);
    const supportRole = SUPPORT_ROLES.includes(req.body.supportRole) ? req.body.supportRole : 'SupportAgent';
    const skills = asArray(req.body.skills).filter(skill => SUPPORT_SKILLS.includes(skill));
    const maximumActiveTickets = Math.min(Math.max(Number(req.body.maximumActiveTickets || DEFAULT_SUPPORT_CONFIG.defaultMaxActiveTickets), 1), 50);

    if (!email || !fullName) return res.status(400).json({ success: false, error: 'Name and email are required.' });

    const existingAccount = await Account.findOne({ email }).lean();
    if (existingAccount) return res.status(409).json({ success: false, error: 'This email already has an account.' });

    const token = createOpaqueToken();
    const invitation = await SupportStaffInvitation.create({
        email,
        fullName,
        phone: cleanText(req.body.phone, 40),
        tokenHash: hashOpaqueToken(token),
        supportRole,
        skills: skills.length ? skills : ['general_support'],
        maximumActiveTickets,
        autoAssignmentEnabled: req.body.autoAssignmentEnabled !== false,
        workingHours: req.body.workingHours || {},
        invitedBy: getActorId(req),
        expiresAt: new Date(Date.now() + DEFAULT_SUPPORT_CONFIG.invitationTtlHours * 60 * 60 * 1000)
    });

    const url = buildInvitationUrl(token);
    await queueSupportEmail({
        name: 'support.invitation_email',
        idempotencyKey: `support.invite:${invitation._id}`,
        payload: {
            email,
            supportRole,
            url
        }
    });

    await logPlatformAudit({
        req,
        action: 'support.staff_invited',
        entityType: 'SupportStaffInvitation',
        entityId: invitation._id,
        entityLabel: email,
        message: `Support staff invitation created for ${email}`,
        metadata: { supportRole, skills: invitation.skills }
    });

    res.status(201).json({
        success: true,
        data: {
            _id: invitation._id,
            email: invitation.email,
            fullName: invitation.fullName,
            supportRole: invitation.supportRole,
            skills: invitation.skills,
            status: invitation.status,
            expiresAt: invitation.expiresAt
        }
    });
};

exports.getSupportInvitation = async (req, res) => {
    const tokenHash = hashOpaqueToken(req.params.token);
    const invitation = await SupportStaffInvitation.findOne({ tokenHash }).select('-tokenHash').lean();
    if (!invitation || invitation.status !== 'pending' || invitation.consumedAt || new Date(invitation.expiresAt).getTime() < Date.now()) {
        return res.status(404).json({ success: false, error: 'Invitation is invalid or expired.' });
    }

    res.json({
        success: true,
        data: {
            email: invitation.email,
            fullName: invitation.fullName,
            supportRole: invitation.supportRole,
            skills: invitation.skills,
            expiresAt: invitation.expiresAt
        }
    });
};

exports.acceptSupportInvitation = async (req, res) => {
    const tokenHash = hashOpaqueToken(req.params.token);
    const invitation = await SupportStaffInvitation.findOne({ tokenHash });
    if (!invitation || invitation.status !== 'pending' || invitation.consumedAt || new Date(invitation.expiresAt).getTime() < Date.now()) {
        return res.status(404).json({ success: false, error: 'Invitation is invalid or expired.' });
    }

    const password = String(req.body.password || '');
    if (password.length < 8) return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });

    const existingAccount = await Account.findOne({ email: invitation.email });
    if (existingAccount) return res.status(409).json({ success: false, error: 'This email already has an account.' });

    const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const account = await Account.create({
        email: invitation.email,
        fullName: invitation.fullName,
        phone: invitation.phone || '',
        passwordHash,
        status: 'Active',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        platformRole: invitation.supportRole
    });
    const user = await User.create({
        account_id: account._id,
        fullName: invitation.fullName,
        email: invitation.email,
        phone: invitation.phone || '',
        password: passwordHash,
        role: invitation.supportRole,
        status: 'Active',
        emailVerified: true,
        emailVerifiedAt: new Date()
    });

    const profile = await SupportStaffProfile.create({
        userId: user._id,
        account_id: account._id,
        supportRole: invitation.supportRole,
        skills: invitation.skills?.length ? invitation.skills : ['general_support'],
        maximumActiveTickets: invitation.maximumActiveTickets,
        autoAssignmentEnabled: invitation.autoAssignmentEnabled,
        workingHours: invitation.workingHours || {},
        createdBy: invitation.invitedBy
    });

    invitation.status = 'accepted';
    invitation.consumedAt = new Date();
    await invitation.save();

    res.status(201).json({
        success: true,
        data: {
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            profileId: profile._id
        }
    });
};

exports.updateSupportStaffProfile = async (req, res) => {
    const profile = await SupportStaffProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ success: false, error: 'Support staff not found.' });

    if (req.body.supportRole && SUPPORT_ROLES.includes(req.body.supportRole)) profile.supportRole = req.body.supportRole;
    if (Array.isArray(req.body.skills)) profile.skills = req.body.skills.filter(skill => SUPPORT_SKILLS.includes(skill));
    if (req.body.manualStatus) profile.manualStatus = req.body.manualStatus;
    if (req.body.maximumActiveTickets !== undefined) {
        profile.maximumActiveTickets = Math.min(Math.max(Number(req.body.maximumActiveTickets), 1), 50);
    }
    if (req.body.autoAssignmentEnabled !== undefined) profile.autoAssignmentEnabled = Boolean(req.body.autoAssignmentEnabled);
    if (req.body.isActive !== undefined) {
        profile.isActive = Boolean(req.body.isActive);
        profile.deactivatedAt = profile.isActive ? null : new Date();
        await User.updateOne({ _id: profile.userId }, { $set: { status: profile.isActive ? 'Active' : 'Suspended' } });
        await Account.updateOne({ _id: profile.account_id }, { $set: { status: profile.isActive ? 'Active' : 'Suspended' } });
    }
    await profile.save();

    await logPlatformAudit({
        req,
        action: 'support.staff_updated',
        entityType: 'SupportStaffProfile',
        entityId: profile._id,
        message: 'Support staff profile updated',
        metadata: { supportRole: profile.supportRole, skills: profile.skills, maximumActiveTickets: profile.maximumActiveTickets }
    });

    res.json({ success: true, data: profile });
};

exports.getKnownIssuesPlatform = async (req, res) => {
    const rows = await SupportKnownIssue.find({}).sort({ updatedAt: -1 }).limit(100).lean();
    res.json({ success: true, data: rows });
};

exports.createKnownIssuePlatform = async (req, res) => {
    const issue = await SupportKnownIssue.create({
        title: cleanText(req.body.title, 180),
        summary: cleanText(req.body.summary, 2000),
        affectedServices: asArray(req.body.affectedServices).map(item => cleanText(item, 80)).filter(Boolean),
        affectedCategories: asArray(req.body.affectedCategories).filter(item => SUPPORT_CATEGORIES.includes(item)),
        severity: normalizePriority(req.body.severity),
        status: ['investigating', 'identified', 'monitoring', 'resolved'].includes(req.body.status) ? req.body.status : 'investigating',
        publicToVendors: req.body.publicToVendors !== false,
        createdBy: getActorId(req)
    });

    await logPlatformAudit({
        req,
        action: 'support.known_issue_created',
        entityType: 'SupportKnownIssue',
        entityId: issue._id,
        entityLabel: issue.title,
        message: `Known issue created: ${issue.title}`
    });

    res.status(201).json({ success: true, data: issue });
};

exports.updateKnownIssuePlatform = async (req, res) => {
    const issue = await SupportKnownIssue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, error: 'Known issue not found.' });

    if (req.body.title !== undefined) issue.title = cleanText(req.body.title, 180);
    if (req.body.summary !== undefined) issue.summary = cleanText(req.body.summary, 2000);
    if (Array.isArray(req.body.affectedCategories)) issue.affectedCategories = req.body.affectedCategories.filter(item => SUPPORT_CATEGORIES.includes(item));
    if (req.body.severity) issue.severity = normalizePriority(req.body.severity);
    if (['investigating', 'identified', 'monitoring', 'resolved'].includes(req.body.status)) {
        issue.status = req.body.status;
        if (req.body.status === 'resolved') issue.resolvedAt = new Date();
    }
    if (req.body.publicToVendors !== undefined) issue.publicToVendors = Boolean(req.body.publicToVendors);
    if (req.body.updateBody) {
        issue.updates.push({
            body: cleanText(req.body.updateBody, 1000),
            createdBy: getActorId(req)
        });
    }
    await issue.save();

    res.json({ success: true, data: issue });
};
