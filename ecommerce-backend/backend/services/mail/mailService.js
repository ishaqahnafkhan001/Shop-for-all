const { baseTemplate } = require('../mail/templates/baseTemplate');
const { isResendEnabled, sendResendMail } = require('../mail/providers/resendProvider');

const escapeFromName = (value = '') => String(value).replace(/"/g, "'");

const getFromEmail = (type) => {
    if (type === 'reset') {
        return process.env.RESET_EMAIL || process.env.RESEND_FROM || process.env.ADMIN_EMAIL_USER || process.env.EMAIL_USER;
    }

    if (type === 'order') {
        return process.env.ORDER_MAIL || process.env.RESEND_FROM || process.env.ADMIN_EMAIL_USER || process.env.EMAIL_USER;
    }

    return process.env.ADMIN_EMAIL_USER || process.env.RESEND_FROM || process.env.EMAIL_USER || process.env.ORDER_MAIL;
};

const formatFrom = (senderName, fromEmail) => {
    if (!fromEmail) {
        throw new Error('Sender email is not configured');
    }

    return senderName ? `"${escapeFromName(senderName)}" <${fromEmail}>` : fromEmail;
};

const getSmtpTransporter = (type) => {
    if (type === 'reset') {
        return require('../mail/transporters/resetTransporter');
    }

    if (type === 'order') {
        return require('../mail/transporters/orderTransporter');
    }

    return require('../mail/transporters/adminTransporter');
};

exports.sendMail = async ({
                              type = 'admin',
                              to,
                              subject,
                              senderName,
                              recipientName,
                              content,
                              html,
                              text,
                              replyTo
                          }) => {
    try {
        const fromEmail = getFromEmail(type);
        const from = formatFrom(senderName, fromEmail);

        // FIX: Map the arguments to the keys baseTemplate actually uses
        const finalHtml = html || baseTemplate({
            senderName: senderName,
            title: subject,          // Passes the subject to the template title
            recipientName: recipientName,
            content: content,        // The template uses ${content}, so we pass content
            email: to
        });

        if (isResendEnabled()) {
            return await sendResendMail({
                from,
                to,
                subject,
                html: finalHtml,
                text,
                replyTo
            });
        }

        const transporter = getSmtpTransporter(type);

        return await transporter.sendMail({
            from,
            to,
            subject,
            html: finalHtml,
            text,
            replyTo
        });
    } catch (error) {
        const provider = isResendEnabled() ? 'resend' : 'smtp';
        const response = error.response?.data ? ` Response: ${JSON.stringify(error.response.data)}` : '';
        console.error(`[EmailService] Failed to send ${type} email via ${provider} to ${to}: ${error.message}.${response}`);
        throw error;
    }
};
