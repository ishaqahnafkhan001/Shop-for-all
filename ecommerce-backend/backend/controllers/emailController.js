const { sendMail } = require('../services/mail/mailService');
const User = require('../models/User');
const Shop = require('../models/Shop');
const CustomerEmailCampaign = require('../models/CustomerEmailCampaign');
const CustomerEmailRecipient = require('../models/CustomerEmailRecipient');
const { createCampaignJob, customerQuery: marketingCustomerQuery } = require('../services/customerEmailCampaignService');
const { createUnsubscribeUrl } = require('../services/marketing/marketingPreferenceService');
const { escapeHtml } = require('../services/mail/templates/escapeHtml');
const mongoose = require('mongoose');
const { logAudit } = require('../services/auditLogService');

// Import your templates
const { customerMessageTemplate } = require('../services/mail/templates/customMessageTemplate');
// Assuming you have this template for orders, or you can just rely on the default baseTemplate in your service
// const { getOrderStatusMessage } = require('../services/mail/templates/orderTemplates');

// ============================================================================
// 1. Send Custom / Manual Email to Customer (Your existing code)
// ============================================================================
exports.sendEmailToCustomer = async (req, res) => {
    try {
        const { customerId, email, subject, message } = req.body;
        const cleanSubject = typeof subject === 'string' ? subject.trim() : '';
        const cleanMessage = typeof message === 'string' ? message.trim() : '';

        if ((!email && !customerId) || (email && typeof email !== 'string') ||
            !cleanSubject || !cleanMessage ||
            cleanSubject.length > 160 || cleanMessage.length > 5000 ||
            (customerId && !mongoose.isValidObjectId(customerId))) {
            return res.status(400).json({
                success: false,
                error: 'Select a customer and provide a subject (up to 160 characters) and message (up to 5000 characters).'
            });
        }

        const query = marketingCustomerQuery(req.tenantId);
        if (customerId) query._id = customerId;
        else query.email = String(email).trim().toLowerCase();

        const customer = await User.findOne(query).select('fullName email').lean();
        if (!customer) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found or access denied.'
            });
        }

        const shop = await Shop.findById(req.tenantId).select('shopName').lean();
        const senderName = shop?.shopName || 'Store Administration';

        const html = customerMessageTemplate({
            senderName,
            name: customer.fullName || 'Customer',
            email: customer.email,
            subject: cleanSubject,
            message: cleanMessage
        }).replace('</body>', `<p style="font:12px Arial,sans-serif;text-align:center"><a href="${escapeHtml(createUnsubscribeUrl({ shopId: req.tenantId, customerId: customer._id }))}">Unsubscribe from marketing emails</a></p></body>`);

        await sendMail({
            type: 'admin', // Explicitly use the admin transporter
            to: customer.email,
            subject: cleanSubject,
            senderName,
            html
        });

        await logAudit({
            req,
            shop_id: req.tenantId,
            action: 'customer.email_sent',
            entityType: 'User',
            entityId: customer._id,
            entityLabel: customer.fullName || 'Customer',
            after: { subject: cleanSubject }
        }).catch(() => {});

        return res.status(200).json({
            success: true,
            message: 'Email accepted by provider. Final delivery is not yet confirmed.'
        });

    } catch (error) {
        console.error('Customer Email Error:', { code: error?.code || error?.name || 'MAIL_ERROR' });
        return res.status(500).json({
            success: false,
            error: 'Failed to send email'
        });
    }
};

exports.listCustomerEmailCampaigns = async (req, res) => {
    try {
        const [campaigns, eligibleRecipientCount] = await Promise.all([
            CustomerEmailCampaign.find({ shopId: req.tenantId })
                .sort({ createdAt: -1 }).limit(30)
                .select('type subject recipientCount sentCount deliveredCount failedCount skippedCount uncertainCount status lastError createdAt updatedAt')
                .lean(),
            User.countDocuments(marketingCustomerQuery(req.tenantId))
        ]);
        return res.json({ success: true, data: campaigns, eligibleRecipientCount });
    } catch {
        return res.status(500).json({ success: false, error: 'Failed to load campaign history.' });
    }
};

exports.getCustomerEmailCampaignRecipients = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid campaign ID.' });
        const campaign = await CustomerEmailCampaign.findOne({ _id: req.params.id, shopId: req.tenantId }).select('_id').lean();
        if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found.' });
        const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page, 10) || 1));
        const limit = 50;
        const [rows, total] = await Promise.all([
            CustomerEmailRecipient.find({ campaignId: campaign._id, shopId: req.tenantId })
                .sort({ createdAt: 1 }).skip((page - 1) * limit).limit(limit)
                .select('email status attempts acceptedAt deliveredAt lastError').lean(),
            CustomerEmailRecipient.countDocuments({ campaignId: campaign._id, shopId: req.tenantId })
        ]);
        const maskEmail = value => String(value || '').replace(/^(.).+(@.*)$/, '$1***$2');
        return res.json({ success: true, data: rows.map(row => ({
            id: row._id, email: maskEmail(row.email), status: row.status,
            attempts: row.attempts, acceptedAt: row.acceptedAt, deliveredAt: row.deliveredAt,
            lastError: row.lastError
        })), page, pages: Math.ceil(total / limit), total });
    } catch {
        return res.status(500).json({ success: false, error: 'Failed to load delivery history.' });
    }
};

exports.setCustomerMarketingSuppression = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid customer ID.' });
        const action = String(req.body?.action || '');
        if (!['suppress', 'clear'].includes(action)) {
            return res.status(400).json({ success: false, error: 'Action must be suppress or clear.' });
        }
        const customer = await User.findOne({ _id: req.params.id, shop_id: req.tenantId, role: 'Customer' })
            .select('marketingEmail emailVerified').lean();
        if (!customer) return res.status(404).json({ success: false, error: 'Customer not found.' });
        if (action === 'clear' && (customer.marketingEmail?.suppressionReason !== 'manual' ||
            (!customer.emailVerified && !customer.marketingEmail?.consentedAt))) {
            return res.status(409).json({ success: false, error: 'Provider suppressions require support review; manual suppressions require a confirmed email.' });
        }
        if (action === 'suppress' && customer.marketingEmail?.suppressedAt &&
            customer.marketingEmail?.suppressionReason !== 'manual') {
            return res.status(409).json({ success: false, error: 'Provider suppression cannot be changed here.' });
        }
        const marketingEmail = action === 'suppress'
            ? { 'marketingEmail.suppressedAt': new Date(), 'marketingEmail.suppressionReason': 'manual' }
            : { 'marketingEmail.suppressedAt': null, 'marketingEmail.suppressionReason': '' };
        const result = await User.updateOne({
            _id: customer._id, shop_id: req.tenantId, role: 'Customer',
            ...(action === 'clear'
                ? { 'marketingEmail.suppressionReason': 'manual' }
                : { $or: [{ 'marketingEmail.suppressedAt': null }, { 'marketingEmail.suppressionReason': 'manual' }] })
        }, { $set: marketingEmail });
        if (!result.matchedCount) return res.status(409).json({ success: false, error: 'Suppression changed; refresh this customer.' });
        await logAudit({
            req, shop_id: req.tenantId, action: `customer.marketing_${action}`,
            entityType: 'User', entityId: customer._id,
            after: { suppressionReason: marketingEmail['marketingEmail.suppressionReason'] }
        }).catch(() => {});
        return res.json({ success: true, data: marketingEmail });
    } catch {
        return res.status(500).json({ success: false, error: 'Could not update marketing suppression.' });
    }
};

exports.createCustomerEmailCampaign = async (req, res) => {
    try {
        const { subject, message } = req.body;
        const { campaign, job } = await createCampaignJob({
            shopId: req.tenantId,
            sentBy: req.user._id,
            type: 'plain',
            subject,
            message
        });

        await logAudit({
            req,
            shop_id: req.tenantId,
            action: 'customer.email_campaign_queued',
            entityType: 'CustomerEmailCampaign',
            entityId: campaign._id,
            entityLabel: campaign.subject,
            after: {
                type: campaign.type,
                recipientCount: campaign.recipientCount,
                jobId: job?._id
            }
        }).catch(() => {});

        res.status(202).json({
            success: true,
            message: 'Customer email campaign queued.',
            data: {
                campaignId: campaign._id,
                jobId: job?._id,
                recipientCount: campaign.recipientCount,
                status: campaign.status
            }
        });
    } catch (error) {
        const status = error.statusCode || 500;
        res.status(status).json({
            success: false,
            error: status < 500 ? error.message : 'Failed to queue customer email campaign.'
        });
    }
};
exports.createProductEmailCampaign = async (req, res) => {
    try {
        const { subject, message, productId } = req.body;
        const { campaign, job } = await createCampaignJob({
            shopId: req.tenantId,
            sentBy: req.user._id,
            type: 'product',
            subject,
            message,
            productId
        });

        await logAudit({
            req,
            shop_id: req.tenantId,
            action: 'customer.product_email_campaign_queued',
            entityType: 'CustomerEmailCampaign',
            entityId: campaign._id,
            entityLabel: campaign.subject,
            after: {
                type: campaign.type,
                productId,
                recipientCount: campaign.recipientCount,
                jobId: job?._id
            }
        }).catch(() => {});

        res.status(202).json({
            success: true,
            message: 'Product email campaign queued.',
            data: {
                campaignId: campaign._id,
                jobId: job?._id,
                recipientCount: campaign.recipientCount,
                status: campaign.status
            }
        });
    } catch (error) {
        const status = error.statusCode || 500;
        res.status(status).json({
            success: false,
            error: status < 500 ? error.message : 'Failed to queue product email campaign.'
        });
    }
};
