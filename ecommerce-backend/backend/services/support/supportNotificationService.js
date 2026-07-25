const { enqueueJob } = require('../jobQueueService');
const { createNotification } = require('../notificationService');
const { createPlatformNotification } = require('../platformNotificationService');
const { getVendorAdminEmails } = require('../vendorNotificationEmailService');
const { sendMail } = require('../mail/mailService');
const User = require('../../models/User');
const SupportTicket = require('../../models/SupportTicket');
const { assertJobEntitlementStillValid } = require('../workers/jobEntitlementService');

const getAdminUrl = (path = '') => {
    const base = process.env.ADMIN_APP_URL || process.env.ADMIN_URL || process.env.CLIENT_URL || 'http://localhost:5173';
    return `${String(base).replace(/\/$/, '')}${path}`;
};

const queueSupportEmail = async ({ name, payload, idempotencyKey, shop_id = null }) => (
    enqueueJob({
        queue: 'support',
        name,
        payload,
        shop_id,
        idempotencyKey,
        maxAttempts: 5
    })
);

const notifyVendorTicketEvent = async ({ ticket, title, message, eventName }) => {
    await createNotification({
        shop_id: ticket.shop_id,
        type: 'system',
        title,
        message,
        entityType: 'SupportTicket',
        entityId: ticket._id,
        severity: ticket.priority === 'critical' ? 'critical' : 'info',
        metadata: { ticketNumber: ticket.ticketNumber }
    });

    await queueSupportEmail({
        name: 'support.vendor_email',
        shop_id: ticket.shop_id,
        idempotencyKey: `support.vendor:${eventName}:${ticket._id}:${ticket.updatedAt?.getTime?.() || Date.now()}`,
        payload: {
            ticketId: ticket._id,
            subject: `${title} - ${ticket.ticketNumber}`,
            message,
            ticketNumber: ticket.ticketNumber,
            url: getAdminUrl(`/dashboard/support?ticket=${encodeURIComponent(ticket.ticketNumber)}`)
        }
    });
};

const notifyStaffAssigned = async ({ ticket, staffUserId }) => {
    await createPlatformNotification({
        recipientType: 'User',
        recipientId: staffUserId,
        type: 'support_ticket_assigned',
        title: 'Support ticket assigned',
        message: `${ticket.ticketNumber}: ${ticket.subject}`,
        entityType: 'SupportTicket',
        entityId: ticket._id,
        shop_id: ticket.shop_id,
        severity: ticket.priority === 'critical' ? 'error' : 'info',
        metadata: { ticketNumber: ticket.ticketNumber }
    });

    await queueSupportEmail({
        name: 'support.staff_email',
        idempotencyKey: `support.staff.assigned:${ticket._id}:${staffUserId}:${ticket.assignedAt?.getTime?.() || Date.now()}`,
        payload: {
            userId: staffUserId,
            subject: `Ticket assigned: ${ticket.ticketNumber}`,
            message: `${ticket.subject}\n\nPriority: ${ticket.priority}`,
            url: getAdminUrl(`/support/tickets/${encodeURIComponent(ticket.ticketNumber)}`)
        }
    });
};

const processSupportJob = async (job) => {
    if (job.name === 'support.vendor_email') {
        const ticket = await SupportTicket.findById(job.payload?.ticketId).select('shop_id ticketNumber').lean();
        if (!ticket) throw new Error('Support ticket not found for vendor email');
        const recipients = await getVendorAdminEmails(ticket.shop_id);
        if (recipients.length === 0) return;
        await assertJobEntitlementStillValid({
            job,
            allowInactive: true,
            expectedEntitlementVersion: null
        });
        await sendMail({
            type: 'admin',
            to: recipients,
            senderName: 'ScaleUp Support',
            subject: job.payload?.subject || `Support update ${ticket.ticketNumber}`,
            text: `${job.payload?.message || 'Your support ticket was updated.'}\n\n${job.payload?.url || ''}`,
            html: `
                <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;">
                    <h2>${job.payload?.subject || 'Support update'}</h2>
                    <p>${job.payload?.message || 'Your support ticket was updated.'}</p>
                    <p><a href="${job.payload?.url || '#'}">Open ticket</a></p>
                </div>
            `
        });
        return;
    }

    if (job.name === 'support.staff_email') {
        const user = await User.findById(job.payload?.userId).select('email fullName status').lean();
        if (!user || user.status !== 'Active' || !user.email) return;
        await assertJobEntitlementStillValid({
            job,
            allowInactive: true,
            expectedEntitlementVersion: null
        });
        await sendMail({
            type: 'admin',
            to: user.email,
            senderName: 'ScaleUp Support',
            subject: job.payload?.subject || 'Support ticket update',
            text: `${job.payload?.message || 'A support ticket needs your attention.'}\n\n${job.payload?.url || ''}`,
            html: `
                <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;">
                    <h2>${job.payload?.subject || 'Support ticket update'}</h2>
                    <p>${String(job.payload?.message || '').replace(/\n/g, '<br>')}</p>
                    <p><a href="${job.payload?.url || '#'}">Open support workspace</a></p>
                </div>
            `
        });
        return;
    }

    if (job.name === 'support.invitation_email') {
        await assertJobEntitlementStillValid({
            job,
            allowInactive: true,
            expectedEntitlementVersion: null
        });
        await sendMail({
            type: 'admin',
            to: job.payload?.email,
            senderName: 'ScaleUp Support',
            subject: 'You are invited to join ScaleUp Support',
            text: `Open this one-time invitation link to activate your support account:\n${job.payload?.url}`,
            html: `
                <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;">
                    <h2>ScaleUp Support invitation</h2>
                    <p>You have been invited as ${job.payload?.supportRole || 'support staff'}.</p>
                    <p><a href="${job.payload?.url}">Activate support account</a></p>
                    <p>This one-time link expires soon.</p>
                </div>
            `
        });
        return;
    }

    throw new Error(`Unsupported support job: ${job.name}`);
};

module.exports = {
    getAdminUrl,
    queueSupportEmail,
    notifyVendorTicketEvent,
    notifyStaffAssigned,
    processSupportJob
};
