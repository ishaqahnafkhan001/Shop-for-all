const adminTransporter = require('../mail/transporters/adminTransporter');
const orderTransporter = require('../mail/transporters/orderTransporter');
const { baseTemplate } = require('../mail/templates/baseTemplate');

exports.sendMail = async ({
                              type = 'admin',
                              to,
                              subject,
                              senderName,
                              recipientName,
                              content,
                              html
                          }) => {
    try {
        const transporter = type === 'order' ? orderTransporter : adminTransporter;
        const fromEmail = type === 'order' ? process.env.ORDER_MAIL : process.env.ADMIN_EMAIL_USER;

        // FIX: Map the arguments to the keys baseTemplate actually uses
        const finalHtml = html || baseTemplate({
            senderName: senderName,
            title: subject,          // Passes the subject to the template title
            recipientName: recipientName,
            content: content,        // The template uses ${content}, so we pass content
            email: to
        });

        return await transporter.sendMail({
            from: `"${senderName}" <${fromEmail}>`,
            to,
            subject,
            html: finalHtml
        });
    } catch (error) {
        console.error(`[EmailService] Failed to send ${type} email to ${to}:`, error.message);
        throw error;
    }
};