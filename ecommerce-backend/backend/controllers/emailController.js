const { sendMail } = require('../services/mail/mailService');
const User = require('../models/User');
const { createCampaignJob } = require('../services/customerEmailCampaignService');
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
        const { customerId, email, subject, message, shopName } = req.body;

        if ((!email && !customerId) || !subject || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const customerQuery = {
            shop_id: req.tenantId,
            role: 'Customer'
        };
        if (customerId) customerQuery._id = customerId;
        else customerQuery.email = String(email).trim().toLowerCase();

        const customer = await User.findOne(customerQuery).select('fullName email').lean();
        if (!customer) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found or access denied.'
            });
        }

        const senderName = shopName || 'Store Administration';

        const html = customerMessageTemplate({
            senderName,
            name: customer.fullName || 'Customer',
            email: customer.email,
            subject,
            message
        });

        await sendMail({
            type: 'admin', // Explicitly use the admin transporter
            to: customer.email,
            subject,
            senderName,
            html
        });

        await logAudit({
            req,
            shop_id: req.tenantId,
            action: 'customer.email_sent',
            entityType: 'User',
            entityId: customer._id,
            entityLabel: customer.fullName || customer.email,
            after: { subject }
        }).catch(() => {});

        return res.status(200).json({
            success: true,
            message: 'Email sent successfully'
        });

    } catch (error) {
        console.error('Customer Email Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to send email'
        });
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
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Failed to queue customer email campaign.'
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
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Failed to queue product email campaign.'
        });
    }
};

// ============================================================================
// 2. Send Order Status Email (Triggered from the Admin Order List Modal)
// ============================================================================
exports.sendOrderStatusEmail = async (req, res) => {
    try {
        const { email, name, subject, message, shopName, orderDetails } = req.body;
        if (!email || !subject || !message) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields"
            });
        }

        const senderName = shopName || "Store Administration";
        const content = orderDetails && !String(message).includes('Order details')
            ? `${message}\n\n${orderDetails}`
            : message;

        await sendMail({
            type: 'order',
            to: email,
            subject: subject,
            senderName: senderName,
            recipientName: name,    // This enters sendMail as recipientName
            content
        });

        return res.status(200).json({
            success: true,
            message: "Order notification sent successfully"
        });

    } catch (error) {
        console.error("Order Email Controller Error:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to send order notification email."
        });
    }
};
