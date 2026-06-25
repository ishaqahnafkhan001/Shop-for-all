const { sendMail } = require('./mail/mailService');

const getSuperAdminEmail = () => (
    process.env.SUPER_ADMIN_EMAIL ||
    process.env.PLATFORM_OWNER_EMAIL ||
    process.env.ADMIN_EMAIL_USER ||
    process.env.EMAIL_USER ||
    ''
);

const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatRow = ({ label, value }) => {
    if (!label || value === undefined || value === null || value === '') return '';
    return `
        <tr>
            <td style="padding:8px 0;color:#64748b;font-size:14px;">${escapeHtml(label)}</td>
            <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:700;text-align:right;">${escapeHtml(value)}</td>
        </tr>
    `;
};

const sendSuperAdminPaymentSubmittedEmail = async ({
    shopName,
    ownerName,
    ownerEmail,
    planName,
    amount,
    provider,
    transactionId,
    submittedAt,
    adminPath = '/super-admin/billing'
}) => {
    const to = getSuperAdminEmail();
    if (!to) {
        console.warn('[SuperAdminEmail] SUPER_ADMIN_EMAIL is not configured; skipping payment submission email.');
        return null;
    }

    const rows = [
        { label: 'Shop', value: shopName },
        { label: 'Owner', value: [ownerName, ownerEmail].filter(Boolean).join(' / ') },
        { label: 'Selected plan', value: planName },
        { label: 'Amount', value: `৳${Number(amount || 0).toLocaleString()}` },
        { label: 'Payment method', value: provider },
        { label: 'Transaction ID', value: transactionId },
        { label: 'Submitted at', value: submittedAt ? new Date(submittedAt).toLocaleString() : new Date().toLocaleString() },
        { label: 'Review path', value: adminPath }
    ];

    return sendMail({
        type: 'admin',
        to,
        subject: `New subscription payment submitted - ${shopName || 'Vendor shop'}`,
        senderName: 'ScaleUp Billing',
        text: rows.map(row => `${row.label}: ${row.value}`).join('\n'),
        html: `
            <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
                <div style="max-width:640px;margin:0 auto;padding:32px 18px;">
                    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
                        <div style="padding:26px 28px;background:#020617;color:#ffffff;">
                            <div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#67e8f9;">ScaleUp Billing</div>
                            <h1 style="margin:10px 0 0;font-size:24px;line-height:1.25;">New subscription payment submitted</h1>
                        </div>
                        <div style="padding:28px;">
                            <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.65;">A vendor submitted manual payment proof and is waiting for Super Admin approval.</p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:18px 0;">
                                ${rows.map(formatRow).join('')}
                            </table>
                            <p style="margin:18px 0 0;color:#64748b;font-size:13px;">Open the Super Admin Billing page to verify or reject this payment. Payment screenshots are not attached to email.</p>
                        </div>
                    </div>
                </div>
            </div>
        `
    });
};

const sendSuperAdminPaymentSubmittedEmailSafe = (payload) => {
    setImmediate(async () => {
        try {
            await sendSuperAdminPaymentSubmittedEmail(payload);
        } catch (err) {
            console.warn('[SuperAdminEmail] Payment submission email failed:', err.message);
        }
    });
};

module.exports = {
    getSuperAdminEmail,
    sendSuperAdminPaymentSubmittedEmail,
    sendSuperAdminPaymentSubmittedEmailSafe
};
