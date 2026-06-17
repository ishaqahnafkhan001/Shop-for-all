const User = require('../models/User');
const { sendMail } = require('./mail/mailService');

const getVendorAdminEmails = async (shop_id) => {
    if (!shop_id) return [];

    const users = await User.find({
        shop_id,
        role: 'VendorAdmin',
        status: 'Active',
        email: { $exists: true, $ne: '' }
    }).select('email').lean();

    return [...new Set(users.map(user => user.email).filter(Boolean))];
};

const sendVendorNotificationEmail = async ({ to, subject, html, text, senderName = 'ScaleUp Orders' }) => {
    const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
    if (recipients.length === 0) return null;

    return sendMail({
        type: 'order',
        to: recipients,
        subject,
        senderName,
        html,
        text
    });
};

const sendVendorNotificationEmailSafe = (payload) => {
    setImmediate(async () => {
        try {
            await sendVendorNotificationEmail(payload);
        } catch (err) {
            console.error('[VendorNotificationEmail] Failed:', err.message);
        }
    });
};

const buildVendorEventEmail = ({ title, intro, rows = [], actionLabel, actionUrl }) => {
    const rowHtml = rows
        .filter(row => row.label && row.value !== undefined && row.value !== null && row.value !== '')
        .map(row => `
            <tr>
                <td style="padding:8px 0;color:#64748b;font-size:14px;">${row.label}</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:700;text-align:right;">${row.value}</td>
            </tr>
        `).join('');

    return `
        <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
            <div style="max-width:640px;margin:0 auto;padding:32px 18px;">
                <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
                    <div style="padding:26px 28px;background:#020617;color:#ffffff;">
                        <div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#67e8f9;">ScaleUp</div>
                        <h1 style="margin:10px 0 0;font-size:24px;line-height:1.25;">${title}</h1>
                    </div>
                    <div style="padding:28px;">
                        <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.65;">${intro}</p>
                        <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:18px 0;">
                            ${rowHtml}
                        </table>
                        ${actionUrl ? `
                            <p style="margin:24px 0 0;">
                                <a href="${actionUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:700;font-size:14px;">${actionLabel || 'Open admin'}</a>
                            </p>
                        ` : ''}
                        <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.5;">This message was sent to vendor administrators only. If mail delivery fails, the platform action still completes.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
};

module.exports = {
    getVendorAdminEmails,
    sendVendorNotificationEmail,
    sendVendorNotificationEmailSafe,
    buildVendorEventEmail
};
