const Account = require('../models/Account');
const Shop = require('../models/Shop');
const { enqueueJob } = require('./jobQueueService');
const { sendMail } = require('./mail/mailService');
const { sendSms } = require('./sms/smsProviderService');
const { PLATFORM_ROOT_DOMAIN } = require('../utils/domainUtils');

const REGISTRATION_NOTIFICATION_QUEUE = 'registration';
const VENDOR_WELCOME_JOB = 'registration.vendor_welcome';
const SUPER_ADMIN_ALERT_JOB = 'registration.super_admin_alert';

const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const cleanBaseUrl = (value, fallback) => String(value || fallback || '')
    .trim()
    .replace(/\/+$/, '');

const getAdminBaseUrl = () => cleanBaseUrl(
    process.env.ADMIN_APP_URL || process.env.ADMIN_URL || process.env.CLIENT_URL,
    'http://localhost:5173'
);

const getRegistrationAlertRecipient = () => String(
    process.env.SUPER_ADMIN_EMAIL || process.env.PLATFORM_OWNER_EMAIL || ''
).trim();

const getPlatformHost = () => String(
    process.env.PLATFORM_ROOT_DOMAIN ||
    process.env.STOREFRONT_PLATFORM_DOMAIN ||
    PLATFORM_ROOT_DOMAIN ||
    'scaleup.codes'
)
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .split(/[/?#]/)[0]
    .replace(/^\.+|\.+$/g, '');

const buildRegistrationLinks = ({ subdomain, shopId = '' }) => {
    const platformHost = getPlatformHost();
    const protocol = platformHost.includes('localhost') ? 'http' : 'https';
    const adminBaseUrl = getAdminBaseUrl();

    return {
        storefrontUrl: `${protocol}://${String(subdomain || '').trim().toLowerCase()}.${platformHost}`,
        adminUrl: `${adminBaseUrl}/dashboard`,
        superAdminUrl: shopId
            ? `${adminBaseUrl}/super-admin/shops/${encodeURIComponent(String(shopId))}`
            : `${adminBaseUrl}/super-admin/shops`
    };
};

const emailFrame = ({ eyebrow, title, intro, rows, actionLabel, actionUrl, footer }) => `
    <!doctype html>
    <html>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
        <div style="max-width:640px;margin:0 auto;padding:32px 18px;">
            <div style="overflow:hidden;border:1px solid #e2e8f0;border-radius:18px;background:#ffffff;">
                <div style="padding:26px 28px;background:#020617;color:#ffffff;">
                    <div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#67e8f9;">${escapeHtml(eyebrow)}</div>
                    <h1 style="margin:10px 0 0;font-size:25px;line-height:1.3;">${escapeHtml(title)}</h1>
                </div>
                <div style="padding:28px;">
                    <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.7;">${escapeHtml(intro)}</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
                        ${rows.map(({ label, value }) => `
                            <tr>
                                <td style="padding:10px 0;color:#64748b;font-size:14px;vertical-align:top;">${escapeHtml(label)}</td>
                                <td style="padding:10px 0;color:#0f172a;font-size:14px;font-weight:700;text-align:right;word-break:break-word;">${escapeHtml(value)}</td>
                            </tr>
                        `).join('')}
                    </table>
                    <a href="${escapeHtml(actionUrl)}" style="display:inline-block;margin-top:4px;padding:13px 20px;border-radius:10px;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">${escapeHtml(actionLabel)}</a>
                    <p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.6;">${escapeHtml(footer)}</p>
                </div>
            </div>
        </div>
    </body>
    </html>
`;

const buildVendorWelcomeEmail = ({ account, shop, links }) => ({
    subject: `Your Scaleup store is ready - ${shop.shopName}`,
    text: [
        `Hello ${account.fullName},`,
        `Your Scaleup store ${shop.shopName} has been created successfully.`,
        `Store: ${links.storefrontUrl}`,
        `Admin panel: ${links.adminUrl}`,
        'Your 14-day Beginner trial is now active.'
    ].join('\n'),
    html: emailFrame({
        eyebrow: 'Welcome to Scaleup',
        title: 'Your online store is ready',
        intro: `Hello ${account.fullName}, your store has been created successfully. You can open the storefront now and use the admin panel to add products and manage orders.`,
        rows: [
            { label: 'Store', value: shop.shopName },
            { label: 'Store URL', value: links.storefrontUrl },
            { label: 'Admin panel', value: links.adminUrl },
            { label: 'Trial', value: '14-day Beginner trial' }
        ],
        actionLabel: 'Open admin panel',
        actionUrl: links.adminUrl,
        footer: 'Keep this email for quick access. Scaleup will never ask you to send your password or verification code by email.'
    })
});

const buildVendorWelcomeSms = ({ shop, links }) => (
    `Scaleup: ${shop.shopName} is ready. Store: ${links.storefrontUrl} Admin: ${links.adminUrl}`
);

const buildSuperAdminRegistrationEmail = ({ account, shop, links, otpChannel }) => ({
    subject: `New shop registered - ${shop.shopName}`,
    text: [
        `Shop: ${shop.shopName}`,
        `Subdomain: ${shop.subdomain}`,
        `Owner: ${account.fullName}`,
        `Owner email: ${account.email}`,
        `Owner phone: ${account.phone || 'Not provided'}`,
        `Registration channel: ${otpChannel}`,
        `Store: ${links.storefrontUrl}`,
        `Review: ${links.superAdminUrl}`
    ].join('\n'),
    html: emailFrame({
        eyebrow: 'Scaleup registration',
        title: 'A new shop has registered',
        intro: 'A new vendor completed registration and their Beginner trial has started.',
        rows: [
            { label: 'Shop', value: shop.shopName },
            { label: 'Subdomain', value: shop.subdomain },
            { label: 'Owner', value: account.fullName },
            { label: 'Email', value: account.email },
            { label: 'Phone', value: account.phone || 'Not provided' },
            { label: 'Verified through', value: otpChannel === 'sms' ? 'SMS' : 'Email' },
            { label: 'Store URL', value: links.storefrontUrl }
        ],
        actionLabel: 'Review shop',
        actionUrl: links.superAdminUrl,
        footer: 'Open the Super Admin shop page to review status, verification, subscription, and entitlement details.'
    })
});

const enqueueRegistrationNotifications = async ({ shopId, accountId, otpChannel, session = null }) => {
    const payload = {
        accountId: String(accountId),
        otpChannel: otpChannel === 'sms' ? 'sms' : 'email'
    };

    const vendorJob = await enqueueJob({
        queue: REGISTRATION_NOTIFICATION_QUEUE,
        name: VENDOR_WELCOME_JOB,
        shop_id: shopId,
        payload,
        idempotencyKey: `registration.vendor_welcome:${shopId}`,
        session
    });
    const superAdminJob = await enqueueJob({
        queue: REGISTRATION_NOTIFICATION_QUEUE,
        name: SUPER_ADMIN_ALERT_JOB,
        shop_id: shopId,
        payload,
        idempotencyKey: `registration.super_admin_alert:${shopId}`,
        session
    });

    return { vendorJob, superAdminJob };
};

const loadRegistrationContext = async (job) => {
    const [shop, account] = await Promise.all([
        Shop.findById(job.shop_id).select('shopName subdomain').lean(),
        Account.findById(job.payload?.accountId).select('fullName email phone').lean()
    ]);
    if (!shop) throw new Error('Registered shop was not found');
    if (!account) throw new Error('Registered owner account was not found');

    return {
        shop,
        account,
        otpChannel: job.payload?.otpChannel === 'sms' ? 'sms' : 'email',
        links: buildRegistrationLinks({ subdomain: shop.subdomain, shopId: shop._id })
    };
};

const processRegistrationNotificationJob = async (job) => {
    const context = await loadRegistrationContext(job);

    if (job.name === VENDOR_WELCOME_JOB) {
        if (context.otpChannel === 'sms') {
            return sendSms({
                mobile: context.account.phone,
                message: buildVendorWelcomeSms(context)
            });
        }

        const message = buildVendorWelcomeEmail(context);
        return sendMail({
            type: 'confirmation',
            to: context.account.email,
            senderName: 'Scaleup',
            ...message
        });
    }

    if (job.name === SUPER_ADMIN_ALERT_JOB) {
        const to = getRegistrationAlertRecipient();
        if (!to) throw new Error('SUPER_ADMIN_EMAIL is not configured');
        const message = buildSuperAdminRegistrationEmail(context);
        return sendMail({
            type: 'confirmation',
            to,
            senderName: 'Scaleup Registrations',
            ...message
        });
    }

    throw new Error(`Unsupported registration notification job: ${job.name}`);
};

module.exports = {
    REGISTRATION_NOTIFICATION_QUEUE,
    VENDOR_WELCOME_JOB,
    SUPER_ADMIN_ALERT_JOB,
    buildRegistrationLinks,
    buildVendorWelcomeEmail,
    buildVendorWelcomeSms,
    buildSuperAdminRegistrationEmail,
    enqueueRegistrationNotifications,
    processRegistrationNotificationJob
};
