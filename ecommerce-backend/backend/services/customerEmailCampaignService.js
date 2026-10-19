const crypto = require('crypto');
const User = require('../models/User');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const CustomerEmailCampaign = require('../models/CustomerEmailCampaign');
const CustomerEmailRecipient = require('../models/CustomerEmailRecipient');
const Job = require('../models/Job');
const { enqueueJob } = require('./jobQueueService');
const { sendMail, getFromEmail } = require('./mail/mailService');
const { isResendEnabled } = require('./mail/providers/resendProvider');
const { customerMessageTemplate } = require('./mail/templates/customMessageTemplate');
const { productPromotionTemplate } = require('./mail/templates/productPromotionTemplate');
const { escapeHtml } = require('./mail/templates/escapeHtml');
const { sanitizePublicProduct } = require('./publicProductSerializer');
const { hasFeature } = require('./shops/featureAccessService');
const { assertJobEntitlementStillValid } = require('./workers/jobEntitlementService');
const { createUnsubscribeUrl } = require('./marketing/marketingPreferenceService');

const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000; // Resend retains idempotency keys for 24 hours.
const MAX_ATTEMPTS = 3;
const cleanText = (value = '', max = 2000) => String(value || '').trim().slice(0, max);

const customerQuery = (shopId) => ({
    shop_id: shopId,
    role: 'Customer',
    status: { $ne: 'Suspended' },
    email: { $exists: true, $ne: '' },
    'marketingEmail.consentedAt': { $type: 'date' },
    'marketingEmail.unsubscribedAt': null,
    'marketingEmail.suppressedAt': null
});

const buildStoreBaseUrl = (shop = {}) => {
    const domain = shop.customDomain?.status === 'Verified' ? shop.customDomain?.domain : '';
    if (domain) return `https://${domain}`;
    const appDomain = String(process.env.STOREFRONT_DOMAIN || process.env.APP_DOMAIN || 'localhost:3000')
        .replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `${appDomain.includes('localhost') ? 'http' : 'https'}://${shop.subdomain}.${appDomain}`;
};

const createCampaignJob = async ({ shopId, sentBy, type, subject, message = '', productId = null }) => {
    const cleanSubject = cleanText(subject, 160);
    const cleanMessage = cleanText(message, 5000);
    if (!cleanSubject || (type === 'plain' && !cleanMessage)) {
        const error = new Error('Subject and message are required.');
        error.statusCode = 400;
        throw error;
    }
    const shop = await Shop.findById(shopId).select('shopName subdomain customDomain').lean();
    if (!shop) {
        const error = new Error('Shop not found.');
        error.statusCode = 404;
        throw error;
    }
    let product = null;
    if (type === 'product') {
        const source = await Product.findOne({
            _id: productId, shop_id: shopId, isDeleted: false, isActive: true, status: 'Published'
        }).lean();
        if (!source) {
            const error = new Error('Product not found.');
            error.statusCode = 404;
            throw error;
        }
        const publicProduct = sanitizePublicProduct(source);
        product = {
            _id: publicProduct._id, slug: publicProduct.slug, title: publicProduct.title,
            description: publicProduct.description, images: publicProduct.images, pricing: publicProduct.pricing
        };
    }

    const customers = await User.find(customerQuery(shopId)).select('fullName email').lean();
    if (customers.length === 0) {
        const error = new Error('No customers have opted in to marketing email for this store.');
        error.statusCode = 400;
        throw error;
    }
    try {
        createUnsubscribeUrl({ shopId, customerId: customers[0]._id });
        if (!getFromEmail('admin') || (isResendEnabled() && !process.env.RESEND_API_KEY) ||
            (!isResendEnabled() && (!process.env.ADMIN_EMAIL_USER || !process.env.ADMIN_EMAIL_PASS))) {
            throw new Error('Marketing email provider is incomplete');
        }
    } catch {
        const error = new Error('Marketing email configuration is incomplete. Contact your platform administrator.');
        error.statusCode = 503;
        throw error;
    }
    const campaign = await CustomerEmailCampaign.create({
        shopId, sentBy, type, subject: cleanSubject, message: cleanMessage,
        storeName: shop.shopName || 'Store', senderEmail: getFromEmail('admin'), storeBaseUrl: buildStoreBaseUrl(shop),
        productId: product?._id || null, productSnapshot: product,
        recipientCount: customers.length, recipientSnapshotReady: false, status: 'preparing'
    });
    try {
        for (let offset = 0; offset < customers.length; offset += 500) {
            await CustomerEmailRecipient.insertMany(customers.slice(offset, offset + 500).map(customer => ({
                shopId, campaignId: campaign._id, customerId: customer._id,
                email: customer.email.trim().toLowerCase(), customerName: customer.fullName,
                idempotencyKey: `campaign/${campaign._id}/customer/${customer._id}`,
                provider: isResendEnabled() ? 'resend' : 'smtp'
            })), { ordered: true });
        }
        campaign.recipientSnapshotReady = true;
        campaign.status = 'queued';
        await campaign.save();
        const job = await enqueueJob({
            queue: 'customer-email',
            name: type === 'product' ? 'customers.product_campaign' : 'customers.bulk_email',
            shop_id: shopId, payload: { campaignId: campaign._id },
            idempotencyKey: `customer_email:${campaign._id}`, maxAttempts: 10
        });
        return { campaign, job };
    } catch (error) {
        await CustomerEmailCampaign.updateOne({ _id: campaign._id, shopId },
            { $set: { status: 'failed', lastError: 'Could not prepare campaign recipients.' } });
        throw error;
    }
};

const buildRecipientHtml = (campaign, recipient) => {
    const html = campaign.type === 'product'
        ? productPromotionTemplate({
            storeName: campaign.storeName, customerName: recipient.customerName,
            subject: campaign.subject, message: campaign.message,
            product: campaign.productSnapshot,
            productUrl: `${campaign.storeBaseUrl}/products/${campaign.productSnapshot?.slug || campaign.productId}`
        })
        : customerMessageTemplate({
            senderName: campaign.storeName, name: recipient.customerName || 'Customer',
            email: recipient.email, subject: campaign.subject, message: campaign.message,
            year: campaign.createdAt.getUTCFullYear()
        });
    const unsubscribeUrl = createUnsubscribeUrl({ shopId: campaign.shopId, customerId: recipient.customerId });
    return html.replace('</body>', `<p style="font:12px Arial,sans-serif;text-align:center;color:#64748b">Marketing email from ${escapeHtml(campaign.storeName)}. <a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a></p></body>`);
};

const refreshCampaignCounts = async (campaign) => {
    const rows = await CustomerEmailRecipient.aggregate([
        { $match: { shopId: campaign.shopId, campaignId: campaign._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const count = Object.fromEntries(rows.map(row => [row._id, row.count]));
    const accepted = (count.accepted || 0) + (count.delivered || 0);
    const failed = (count.failed || 0) + (count.bounced || 0) + (count.complained || 0);
    const uncertain = count.uncertain || 0;
    const pending = (count.queued || 0) + (count.retryable || 0) + (count.submitting || 0);
    const status = pending ? 'sending'
        : uncertain ? 'needs_attention' : failed && !accepted ? 'failed' : 'completed';
    await CustomerEmailCampaign.updateOne(
        { _id: campaign._id, shopId: campaign.shopId, status: { $ne: 'cancelled' } },
        { $set: {
            sentCount: accepted, deliveredCount: count.delivered || 0,
            failedCount: failed, skippedCount: count.suppressed || 0,
            uncertainCount: uncertain, status,
            lastError: uncertain ? 'Some provider outcomes need reconciliation.'
                : failed ? `${failed} recipient emails failed.` : ''
        } }
    );
    return { pending, status };
};

const claimRecipient = async (row, now) => {
    const staleAt = new Date(now.getTime() - 5 * 60 * 1000);
    const claimable = row.status === 'queued' ||
        (row.status === 'retryable' && row.nextAttemptAt && row.nextAttemptAt <= now) ||
        (row.status === 'submitting' && row.claimedAt && row.claimedAt <= staleAt);
    if (!claimable) return null;
    const claimId = crypto.randomUUID();
    const recipient = await CustomerEmailRecipient.findOneAndUpdate(
        {
            _id: row._id, shopId: row.shopId, campaignId: row.campaignId,
            status: row.status, attempts: { $lt: MAX_ATTEMPTS },
            ...(row.status === 'retryable' ? { nextAttemptAt: { $lte: now } } : {}),
            ...(row.status === 'submitting' ? { claimedAt: { $lte: staleAt } } : {})
        },
        { $set: {
            status: 'submitting', claimId, claimedAt: now, nextAttemptAt: null,
            firstSubmissionAt: row.firstSubmissionAt || now
        }, $inc: { attempts: 1 } },
        { new: true }
    );
    if (!recipient) return null;
    if (row.status === 'submitting' && (row.provider !== 'resend' ||
        now.getTime() - new Date(row.firstSubmissionAt || row.claimedAt).getTime() >= RETRY_WINDOW_MS)) {
        await CustomerEmailRecipient.updateOne(
            { _id: recipient._id, shopId: recipient.shopId, claimId },
            { $set: { status: 'uncertain', lastError: 'Provider submission outcome requires reconciliation.' }, $unset: { claimId: '' } }
        );
        return null;
    }
    return recipient;
};

const classifySendError = (error, recipient) => {
    const status = Number(error?.response?.status || 0);
    const code = String(error?.response?.data?.name || error?.response?.data?.code || '');
    if (code === 'invalid_idempotent_request') return 'uncertain';
    if (recipient.provider === 'resend' && status >= 400 && status < 500 &&
        status !== 429 && code !== 'concurrent_idempotent_requests') return 'failed';
    if (recipient.provider === 'resend' &&
        Date.now() - new Date(recipient.firstSubmissionAt || recipient.claimedAt).getTime() < RETRY_WINDOW_MS &&
        recipient.attempts < MAX_ATTEMPTS) return 'retryable';
    return 'uncertain';
};

const processCustomerEmailCampaignJob = async (job) => {
    const campaign = await CustomerEmailCampaign.findOne({ _id: job.payload?.campaignId, shopId: job.shop_id });
    if (!campaign) throw new Error('Customer email campaign not found');
    if (!campaign.recipientSnapshotReady) {
        await CustomerEmailCampaign.updateOne({ _id: campaign._id, shopId: job.shop_id },
            { $set: { status: 'needs_attention', lastError: 'Legacy campaign has no consented recipient snapshot; create a new campaign.' } });
        return;
    }
    if (!(await hasFeature(job.shop_id, 'emailCampaigns'))) {
        await CustomerEmailCampaign.updateOne({ _id: campaign._id, shopId: job.shop_id },
            { $set: { status: 'cancelled', lastError: 'Customer email campaigns are not included in the current plan.' } });
        return { cancelled: true, reason: 'Customer email campaigns are not included in the current plan.' };
    }
    if (campaign.status === 'cancelled') return { cancelled: true, reason: 'Campaign cancelled.' };
    await CustomerEmailCampaign.updateOne(
        { _id: campaign._id, shopId: job.shop_id, status: 'queued' },
        { $set: { status: 'sending', lastError: '' } }
    );

    const rows = await CustomerEmailRecipient.find({
        shopId: job.shop_id, campaignId: campaign._id,
        status: { $in: ['queued', 'retryable', 'submitting'] }
    }).sort({ createdAt: 1 });
    await CustomerEmailRecipient.updateMany(
        {
            shopId: job.shop_id, campaignId: campaign._id, attempts: { $gte: MAX_ATTEMPTS },
            $or: [{ status: 'retryable' }, { status: 'submitting', claimedAt: { $lte: new Date(Date.now() - 5 * 60 * 1000) } }]
        },
        { $set: { status: 'uncertain', lastError: 'Automatic retry budget exhausted; review provider outcome.' } }
    );
    let processed = 0;
    for (const row of rows) {
        if (!(await hasFeature(job.shop_id, 'emailCampaigns'))) {
            await CustomerEmailCampaign.updateOne({ _id: campaign._id, shopId: job.shop_id },
                { $set: { status: 'cancelled', lastError: 'Campaign stopped because the email feature is unavailable.' } });
            return { cancelled: true, reason: 'Email campaign feature is unavailable.' };
        }
        await assertJobEntitlementStillValid({ job, feature: 'emailCampaigns' });
        const recipient = await claimRecipient(row, new Date());
        if (!recipient) continue;
        const scope = { _id: recipient._id, shopId: job.shop_id, campaignId: campaign._id, claimId: recipient.claimId };
        if (recipient.provider !== (isResendEnabled() ? 'resend' : 'smtp') ||
            campaign.senderEmail !== getFromEmail('admin')) {
            await CustomerEmailRecipient.updateOne(scope,
                { $set: { status: 'uncertain', lastError: 'Mail provider or sender changed after campaign was queued.' }, $unset: { claimId: '' } });
            processed += 1;
            if (processed % 10 === 0) await refreshCampaignCounts(campaign);
            continue;
        }
        const customer = await User.findOne({
            _id: recipient.customerId, ...customerQuery(job.shop_id), email: recipient.email
        }).select('_id').lean();
        if (!customer) {
            await CustomerEmailRecipient.updateOne(scope,
                { $set: { status: 'suppressed', lastError: 'Marketing consent absent or customer unavailable.' }, $unset: { claimId: '' } });
            processed += 1;
            if (processed % 10 === 0) await refreshCampaignCounts(campaign);
            continue;
        }
        try {
            const response = await sendMail({
                type: 'admin', to: recipient.email, subject: campaign.subject,
                senderName: campaign.storeName, html: buildRecipientHtml(campaign, recipient),
                idempotencyKey: recipient.provider === 'resend' ? recipient.idempotencyKey : undefined,
                tags: recipient.provider === 'resend' ? [
                    { name: 'shop_id', value: String(job.shop_id) },
                    { name: 'campaign_id', value: String(campaign._id) },
                    { name: 'recipient_id', value: String(recipient._id) }
                ] : undefined
            });
            const providerMessageId = recipient.provider === 'resend'
                ? String(response?.id || '') : String(response?.messageId || '');
            if (!providerMessageId) throw new Error('Provider response omitted message ID');
            await CustomerEmailRecipient.updateOne({ ...scope, status: 'submitting' }, {
                $set: { status: 'accepted', providerMessageId, acceptedAt: new Date(), lastError: '' },
                $unset: { claimId: '' }
            });
        } catch (error) {
            const status = classifySendError(error, recipient);
            await CustomerEmailRecipient.updateOne(scope, {
                $set: {
                    status,
                    nextAttemptAt: status === 'retryable' ? new Date(Date.now() + Math.min(60000, recipient.attempts * 15000)) : null,
                    lastError: status === 'uncertain' ? 'Provider outcome unknown; review before resending.' : 'Provider rejected or failed request.'
                },
                $unset: { claimId: '' }
            });
        }
        processed += 1;
        if (processed % 10 === 0) await refreshCampaignCounts(campaign);
    }
    const progress = await refreshCampaignCounts(campaign);
    if (progress.pending && Number(job.attempts || 0) < Number(job.maxAttempts || 10)) {
        throw new Error('Campaign has recipients awaiting a safe retry.');
    }
    if (progress.pending) {
        await CustomerEmailRecipient.updateMany(
            { shopId: job.shop_id, campaignId: campaign._id, status: { $in: ['queued', 'retryable', 'submitting'] } },
            { $set: { status: 'uncertain', lastError: 'Automatic retry budget exhausted; check provider outcome before resending.' }, $unset: { claimId: '' } }
        );
        await refreshCampaignCounts(campaign);
    }
};

const recoverStaleCampaignQueueing = async ({ limit = 20 } = {}) => {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    await CustomerEmailCampaign.updateMany(
        { status: { $in: ['preparing', 'queued'] }, recipientSnapshotReady: false, updatedAt: { $lte: cutoff } },
        { $set: { status: 'needs_attention', lastError: 'Recipient snapshot was interrupted; recreate this campaign.' } }
    );
    const campaigns = await CustomerEmailCampaign.find({
        status: { $in: ['queued', 'sending'] }, recipientSnapshotReady: true, updatedAt: { $lte: cutoff }
    }).sort({ createdAt: 1 }).limit(limit).select('_id shopId type').lean();
    for (const campaign of campaigns) {
        const idempotencyKey = `customer_email:${campaign._id}`;
        const existing = await Job.findOne({ idempotencyKey, shop_id: campaign.shopId }).select('status').lean();
        if (existing?.status === 'dead') {
            await CustomerEmailCampaign.updateOne({ _id: campaign._id, shopId: campaign.shopId },
                { $set: { status: 'needs_attention', lastError: 'Campaign worker exhausted retries.' } });
            continue;
        }
        if (existing?.status === 'completed') {
            const progress = await refreshCampaignCounts(campaign);
            if (progress.pending) await CustomerEmailCampaign.updateOne(
                { _id: campaign._id, shopId: campaign.shopId },
                { $set: { status: 'needs_attention', lastError: 'Worker finished with unresolved recipients.' } }
            );
            continue;
        }
        if (existing) continue;
        await enqueueJob({
            queue: 'customer-email',
            name: campaign.type === 'product' ? 'customers.product_campaign' : 'customers.bulk_email',
            shop_id: campaign.shopId,
            payload: { campaignId: campaign._id },
            idempotencyKey,
            maxAttempts: 10
        });
    }
    return { checked: campaigns.length };
};

module.exports = {
    buildStoreBaseUrl, createCampaignJob, processCustomerEmailCampaignJob,
    refreshCampaignCounts, customerQuery, claimRecipient, classifySendError,
    recoverStaleCampaignQueueing
};
