const { sendMail } = require('../services/mail/mailService');

// Import your templates
const { customerMessageTemplate } = require('../services/mail/templates/customMessageTemplate');
// Assuming you have this template for orders, or you can just rely on the default baseTemplate in your service
// const { getOrderStatusMessage } = require('../services/mail/templates/orderTemplates');

// ============================================================================
// 1. Send Custom / Manual Email to Customer (Your existing code)
// ============================================================================
exports.sendEmailToCustomer = async (req, res) => {
    try {
        const { email, name, subject, message, shopName, orderDetails } = req.body;

        if (!email || !subject || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const senderName = shopName || 'Store Administration';

        const html = customerMessageTemplate({
            senderName,
            name: name || 'Customer',
            email,
            subject,
            message
        });

        await sendMail({
            type: 'admin', // Explicitly use the admin transporter
            to: email,
            subject,
            senderName,
            html
        });

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
