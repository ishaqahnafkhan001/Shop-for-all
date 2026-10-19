const crypto = require('crypto');
const Account = require('../models/Account');
const Shop = require('../models/Shop');
const ShopMembership = require('../models/ShopMembership');
const RegistrationWelcomeDelivery = require('../models/RegistrationWelcomeDelivery');
const { enqueueJob } = require('./jobQueueService');
const { sendMail, getFromEmail } = require('./mail/mailService');
const { isResendEnabled } = require('./mail/providers/resendProvider');
const { sendSms } = require('./sms/smsProviderService');
const { PLATFORM_ROOT_DOMAIN } = require('../utils/domainUtils');

const REGISTRATION_NOTIFICATION_QUEUE = 'registration';
const VENDOR_WELCOME_JOB = 'registration.vendor_welcome';
const VENDOR_WELCOME_EMAIL_JOB = 'registration.vendor_welcome_email';
const VENDOR_WELCOME_SMS_JOB = 'registration.vendor_welcome_sms';
const SUPER_ADMIN_ALERT_JOB = 'registration.super_admin_alert';

const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const cleanBaseUrl = (value, fallback) => {
    const candidate = String(value || fallback || '').trim();
    const url = new URL(candidate);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
        (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') ||
        (process.env.NODE_ENV === 'production' && (url.hostname === 'localhost' || url.hostname.endsWith('.localhost'))) ||
        !['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid admin URL configuration');
    return url.origin;
};

const getAdminBaseUrl = () => cleanBaseUrl(
    process.env.ADMIN_APP_URL || process.env.ADMIN_URL || process.env.CLIENT_URL,
    process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173'
);

const getRegistrationAlertRecipient = () => String(
    process.env.SUPER_ADMIN_EMAIL || process.env.PLATFORM_OWNER_EMAIL || ''
).trim();

const getPlatformHost = () => String(
    process.env.PLATFORM_ROOT_DOMAIN ||
    process.env.STOREFRONT_PLATFORM_DOMAIN ||
    (process.env.NODE_ENV === 'production' ? '' : PLATFORM_ROOT_DOMAIN)
)
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .split(/[/?#]/)[0]
    .replace(/^\.+|\.+$/g, '');

const buildRegistrationLinks = ({ subdomain, shopId = '' }) => {
    const platformHost = getPlatformHost();
    if (!/^[a-z0-9.-]+(?::\d{2,5})?$/i.test(platformHost) || platformHost.includes('..') ||
        (process.env.NODE_ENV === 'production' && (!platformHost.includes('.') || platformHost.includes(':')))) {
        throw new Error('Invalid storefront domain configuration');
    }
    const slug = String(subdomain || '').trim().toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) throw new Error('Invalid shop subdomain');
    const protocol = /^localhost(?::\d+)?$/.test(platformHost) && process.env.NODE_ENV !== 'production' ? 'http' : 'https';
    const adminBaseUrl = getAdminBaseUrl();

    return {
        storefrontUrl: `${protocol}://${slug}.${platformHost}`,
        adminUrl: `${adminBaseUrl}/dashboard`,
        superAdminUrl: shopId
            ? `${adminBaseUrl}/super-admin/shops/${encodeURIComponent(String(shopId))}`
            : `${adminBaseUrl}/super-admin/shops`
    };
};

const emailFrame = ({ eyebrow, title, intro, rows, actionLabel, actionUrl, footer, checklist = [], supportEmail = '' }) => `
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
                    ${checklist.length ? `<h2 style="font-size:18px;margin:22px 0 8px;">Getting started</h2><ol style="padding-left:22px;color:#334155;font-size:14px;line-height:1.8;">${checklist.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>` : ''}
                    <a href="${escapeHtml(actionUrl)}" style="display:inline-block;margin-top:4px;padding:13px 20px;border-radius:10px;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">${escapeHtml(actionLabel)}</a>
                    ${supportEmail ? `<p style="font-size:13px;line-height:1.6;color:#475569;">Need help? Email <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>.</p>` : ''}
                    <p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.6;">${escapeHtml(footer)}</p>
                </div>
            </div>
        </div>
    </body>
    </html>
`;

const getWelcomeChecklist = () => [
    'Sign in to the admin panel with the email and password you chose during registration.',
    'Review store settings and business information.',
    'Add or edit products with images, prices, and stock quantities.',
    'Configure delivery charges and available payment methods where supported.',
    'Preview your storefront and place a test order; manage orders and update their statuses in the admin panel.'
];

const buildVendorWelcomeEmail = ({ account, shop, links, verificationPending = true, supportEmail = process.env.SUPPORT_EMAIL || 'support@scaleup.codes' }) => ({
    subject: `Congratulations! Your online store is ready — ${String(shop.shopName || '').replace(/[\r\n]/g, ' ')}`,
    text: [
        `Hello ${account.fullName},`,
        `Congratulations on opening ${shop.shopName}! Your store account has been created.${verificationPending ? ' Business verification is still required before you can complete setup and sell.' : ''}`,
        `Store: ${links.storefrontUrl}`,
        `Admin panel: ${links.adminUrl}`,
        '', 'Getting started:',
        ...getWelcomeChecklist().map((step, index) => `${index + 1}. ${step}`),
        '', `Need help? ${supportEmail}`,
        'Keep your login credentials and verification codes private.'
    ].join('\n'),
    html: emailFrame({
        eyebrow: 'Welcome to Scaleup',
        title: `Congratulations on opening ${shop.shopName}!`,
        intro: `Hello ${account.fullName}, your store account has been created.${verificationPending ? ' Business verification is still required before you can complete setup and sell.' : ''}`,
        rows: [
            { label: 'Store', value: shop.shopName },
            { label: 'Store URL', value: links.storefrontUrl },
            { label: 'Admin panel', value: links.adminUrl }
        ],
        checklist: getWelcomeChecklist(),
        supportEmail,
        actionLabel: 'Open admin panel',
        actionUrl: links.adminUrl,
        footer: 'Keep this email for quick access. Scaleup will never ask you to send your password or verification code by email.'
    })
});

const buildVendorWelcomeSms = ({ shop, links }) => {
    const name = String(shop.shopName || 'your shop').replace(/[\r\n]/g, ' ');
    const base = `Congratulations! ${name} is set up on Scaleup. Store: ${links.storefrontUrl}`;
    const withAdmin = `${base} Admin: ${links.adminUrl}`;
    return withAdmin.length <= 160 ? withAdmin : base;
};

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

const enqueueRegistrationNotifications = async ({ shopId, accountId, otpChannel, shop, account, session = null }) => {
    const registeredShop = shop || await Shop.findById(shopId).session(session || null);
    const owner = account || await Account.findById(accountId).session(session || null);
    if (!registeredShop || !owner) throw new Error('Registration context is missing');
    let links = { storefrontUrl: '', adminUrl: '' };
    try { links = buildRegistrationLinks({ subdomain: registeredShop.subdomain, shopId }); }
    catch { /* Missing public URL configuration must not roll back a created shop. */ }
    const payload = {
        accountId: String(accountId),
        otpChannel: otpChannel === 'sms' ? 'sms' : 'email'
    };
    const context = {
        shopName: registeredShop.shopName,
        ownerName: owner.fullName,
        storefrontUrl: links.storefrontUrl,
        adminUrl: links.adminUrl,
        supportEmail: process.env.SUPPORT_EMAIL || 'support@scaleup.codes',
        senderEmail: getFromEmail('confirmation') || '',
        verificationPending: registeredShop.verification?.status !== 'approved'
    };
    const vendorJobs = {};
    for (const channel of ['email', 'sms']) {
        const recipient = channel === 'email' ? owner.email : owner.phone;
        const [delivery] = await RegistrationWelcomeDelivery.create([{
            shopId, accountId, channel, recipient: recipient || '', context,
            provider: channel === 'sms' ? 'sms' : isResendEnabled() ? 'resend' : 'smtp',
            idempotencyKey: `registration/welcome/${shopId}/${accountId}/${channel}`,
            status: recipient ? 'queued' : 'skipped',
            lastError: recipient ? '' : 'Owner contact is missing.'
        }], { session });
        if (!recipient) continue;
        vendorJobs[channel] = await enqueueJob({
            queue: REGISTRATION_NOTIFICATION_QUEUE,
            name: channel === 'email' ? VENDOR_WELCOME_EMAIL_JOB : VENDOR_WELCOME_SMS_JOB,
            shop_id: shopId, payload: { accountId: String(accountId), deliveryId: delivery._id },
            idempotencyKey: `registration.vendor_welcome:${shopId}:${channel}`,
            maxAttempts: 3, session
        });
    }
    const superAdminJob = await enqueueJob({
        queue: REGISTRATION_NOTIFICATION_QUEUE,
        name: SUPER_ADMIN_ALERT_JOB,
        shop_id: shopId,
        payload,
        idempotencyKey: `registration.super_admin_alert:${shopId}`,
        session
    });

    return { vendorJobs, superAdminJob };
};

const loadRegistrationContext = async (job) => {
    const [shop, account, membership] = await Promise.all([
        Shop.findById(job.shop_id).select('shopName subdomain').lean(),
        Account.findById(job.payload?.accountId).select('fullName email phone').lean(),
        ShopMembership.findOne({ shop_id: job.shop_id, account_id: job.payload?.accountId, role: 'VendorAdmin' }).select('_id').lean()
    ]);
    if (!shop) throw new Error('Registered shop was not found');
    if (!account || !membership) throw new Error('Registered owner membership was not found');

    return {
        shop,
        account,
        otpChannel: job.payload?.otpChannel === 'sms' ? 'sms' : 'email',
        links: buildRegistrationLinks({ subdomain: shop.subdomain, shopId: shop._id })
    };
};

const processRegistrationNotificationJob = async (job) => {
    if (job.name === VENDOR_WELCOME_JOB) {
        return { cancelled: true, reason: 'Legacy welcome job has no channel outcome; review before resending.' };
    }
    if ([VENDOR_WELCOME_EMAIL_JOB, VENDOR_WELCOME_SMS_JOB].includes(job.name)) {
        return processVendorWelcomeDelivery(job);
    }

    if (job.name === SUPER_ADMIN_ALERT_JOB) {
        const context = await loadRegistrationContext(job);
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

const processVendorWelcomeDelivery = async (job, { sendEmail = sendMail, sendText = sendSms } = {}) => {
    const channel = job.name === VENDOR_WELCOME_EMAIL_JOB ? 'email' : 'sms';
    const scope = { _id: job.payload?.deliveryId, shopId: job.shop_id, accountId: job.payload?.accountId, channel };
    const delivery = await RegistrationWelcomeDelivery.findOne(scope).select('+recipient');
    if (!delivery || ['accepted', 'delivered', 'failed', 'uncertain', 'skipped', 'mocked'].includes(delivery.status)) return;
    const [shop, membership] = await Promise.all([
        Shop.findById(job.shop_id).select('isActive approvalStatus').lean(),
        ShopMembership.findOne({ shop_id: job.shop_id, account_id: delivery.accountId, role: 'VendorAdmin', status: 'Active' }).select('_id').lean()
    ]);
    if (!shop || !membership || !shop.isActive || shop.approvalStatus === 'Suspended') {
        await RegistrationWelcomeDelivery.updateOne(scope, { $set: { status: 'skipped', lastError: 'Shop or owner is unavailable.' } });
        return;
    }
    if (!delivery.context?.storefrontUrl || !delivery.context?.adminUrl ||
        (channel === 'email' && !delivery.context?.senderEmail)) {
        await RegistrationWelcomeDelivery.updateOne(scope, { $set: { status: 'failed', lastError: 'Public links or sender are not configured.' } });
        return;
    }
    if (channel === 'email' && (delivery.provider !== (isResendEnabled() ? 'resend' : 'smtp') ||
        delivery.context.senderEmail !== getFromEmail('confirmation'))) {
        await RegistrationWelcomeDelivery.updateOne(scope, { $set: { status: 'uncertain', lastError: 'Mail provider or sender changed; review before sending.' } });
        return;
    }
    const now = new Date();
    const staleAt = new Date(now.getTime() - 5 * 60 * 1000);
    if (delivery.status === 'submitting' && delivery.claimedAt > staleAt) {
        await RegistrationWelcomeDelivery.updateOne({ ...scope, status: 'submitting' },
            { $set: { status: 'uncertain', lastError: 'An in-flight provider submission needs reconciliation.' } });
        return;
    }
    if (delivery.status === 'submitting' && (channel === 'sms' || !isResendEnabled() ||
        now.getTime() - new Date(delivery.firstSubmissionAt || delivery.claimedAt).getTime() >= 23 * 60 * 60 * 1000)) {
        await RegistrationWelcomeDelivery.updateOne({ ...scope, status: 'submitting' },
            { $set: { status: 'uncertain', lastError: 'Provider outcome is unknown; check provider history before resending.' } });
        return;
    }
    const claimId = crypto.randomUUID();
    const claimed = await RegistrationWelcomeDelivery.findOneAndUpdate({
        ...scope, status: delivery.status,
        ...(delivery.status === 'submitting' ? { claimedAt: { $lte: staleAt } } : {})
    }, { $set: { status: 'submitting', claimId, claimedAt: now, firstSubmissionAt: delivery.firstSubmissionAt || now },
        $inc: { attempts: 1 } }, { new: true }).select('+recipient');
    if (!claimed) return;
    const updateScope = { ...scope, claimId, status: 'submitting' };
    const context = {
        account: { fullName: claimed.context.ownerName },
        shop: { shopName: claimed.context.shopName },
        links: { storefrontUrl: claimed.context.storefrontUrl, adminUrl: claimed.context.adminUrl },
        supportEmail: claimed.context.supportEmail,
        verificationPending: claimed.context.verificationPending
    };
    try {
        let response;
        if (channel === 'email') {
            response = await sendEmail({
                type: 'confirmation', to: claimed.recipient, senderName: 'Scaleup',
                ...buildVendorWelcomeEmail(context),
                idempotencyKey: isResendEnabled() ? claimed.idempotencyKey : undefined,
                tags: isResendEnabled() ? [
                    { name: 'shop_id', value: String(job.shop_id) },
                    { name: 'welcome_delivery_id', value: String(claimed._id) }
                ] : undefined
            });
        } else {
            response = await sendText({ mobile: claimed.recipient, message: buildVendorWelcomeSms(context) });
        }
        const rawProviderId = response?.id || response?.messageId ||
            response?.providerResponse?.id || response?.providerResponse?.message_id;
        const providerMessageId = ['string', 'number'].includes(typeof rawProviderId)
            ? String(rawProviderId).slice(0, 160) : '';
        if (channel === 'email' && isResendEnabled() && !providerMessageId) {
            throw new Error('Provider response omitted message ID');
        }
        await RegistrationWelcomeDelivery.updateOne(updateScope, {
            $set: { status: response?.mocked ? 'mocked' : 'accepted', acceptedAt: response?.mocked ? null : new Date(), providerMessageId, lastError: '' },
            $unset: { claimId: '' }
        });
    } catch (error) {
        const httpStatus = Number(error?.response?.status || error?.details?.status || 0);
        const providerCode = String(error?.response?.data?.name || error?.response?.data?.code || '');
        const permanent = providerCode !== 'invalid_idempotent_request' &&
            (/not configured|invalid|rejected/i.test(error?.message || '') ||
            (httpStatus >= 400 && httpStatus < 500 && httpStatus !== 429 && providerCode !== 'concurrent_idempotent_requests'));
        const retryable = channel === 'email' && isResendEnabled() && !permanent &&
            providerCode !== 'invalid_idempotent_request' &&
            Number(job.attempts || 1) < Number(job.maxAttempts || 3) &&
            Date.now() - new Date(claimed.firstSubmissionAt).getTime() < 23 * 60 * 60 * 1000;
        await RegistrationWelcomeDelivery.updateOne(updateScope, {
            $set: {
                status: retryable ? 'queued' : permanent ? 'failed' : 'uncertain',
                lastError: permanent ? 'Provider rejected or configuration is unavailable.' : 'Provider outcome is unknown; review before resending.'
            }, $unset: { claimId: '' }
        });
        if (retryable) throw new Error('Welcome email submission needs a safe idempotent retry');
    }
};

module.exports = {
    REGISTRATION_NOTIFICATION_QUEUE,
    VENDOR_WELCOME_JOB,
    VENDOR_WELCOME_EMAIL_JOB,
    VENDOR_WELCOME_SMS_JOB,
    SUPER_ADMIN_ALERT_JOB,
    buildRegistrationLinks,
    buildVendorWelcomeEmail,
    buildVendorWelcomeSms,
    buildSuperAdminRegistrationEmail,
    enqueueRegistrationNotifications,
    processRegistrationNotificationJob,
    processVendorWelcomeDelivery
};
