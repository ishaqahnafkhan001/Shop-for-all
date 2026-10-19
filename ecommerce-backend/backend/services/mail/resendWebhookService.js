const crypto = require('crypto');
const CustomerEmailRecipient = require('../../models/CustomerEmailRecipient');
const CustomerEmailCampaign = require('../../models/CustomerEmailCampaign');
const EmailWebhookEvent = require('../../models/EmailWebhookEvent');
const RegistrationWelcomeDelivery = require('../../models/RegistrationWelcomeDelivery');
const User = require('../../models/User');
const { refreshCampaignCounts } = require('../customerEmailCampaignService');

const verifyResendWebhook = ({ body, id, timestamp, signature, secret = process.env.RESEND_WEBHOOK_SECRET }) => {
    if (!Buffer.isBuffer(body) || !id || !signature || !/^\d{10}$/.test(String(timestamp)) || !secret?.startsWith('whsec_')) {
        return false;
    }
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
    let key;
    try { key = Buffer.from(secret.slice(6), 'base64'); } catch { return false; }
    if (key.length < 16) return false;
    const expected = crypto.createHmac('sha256', key)
        .update(`${id}.${timestamp}.${body.toString('utf8')}`).digest();
    return String(signature).split(' ').some(item => {
        const [version, encoded] = item.split(',');
        if (version !== 'v1' || !encoded) return false;
        try {
            const received = Buffer.from(encoded, 'base64');
            return received.length === expected.length && crypto.timingSafeEqual(received, expected);
        } catch { return false; }
    });
};

const EVENT_STATUS = Object.freeze({
    'email.sent': 'accepted',
    'email.delivered': 'delivered',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
    'email.failed': 'failed',
    'email.suppressed': 'suppressed'
});

const processWelcomeEvent = async ({ eventId, event, status, emailId, shopId, deliveryId }) => {
    if (![shopId, deliveryId].every(value => /^[a-f\d]{24}$/i.test(value))) return { ignored: true };
    const scope = { _id: deliveryId, shopId, channel: 'email' };
    const delivery = await RegistrationWelcomeDelivery.findOne(scope).select('+recipient');
    const to = Array.isArray(event.data?.to) ? event.data.to : [];
    if (!delivery || !to.some(address => String(address).toLowerCase() === String(delivery.recipient).toLowerCase()) ||
        (delivery.providerMessageId && delivery.providerMessageId !== emailId)) return { ignored: true };
    try {
        await EmailWebhookEvent.create({
            providerEventId: eventId, providerMessageId: emailId, eventType: event.type,
            shopId, registrationDeliveryId: deliveryId
        });
    } catch (error) {
        if (error.code !== 11000) throw error;
        const existing = await EmailWebhookEvent.findOne({ providerEventId: eventId });
        if (existing?.processedAt) return { duplicate: true };
    }
    const permitted = status === 'accepted'
        ? ['queued', 'submitting', 'uncertain']
        : status === 'delivered'
            ? ['queued', 'submitting', 'accepted', 'uncertain', 'failed']
            : status === 'failed'
                ? ['queued', 'submitting', 'accepted', 'uncertain']
                : ['queued', 'submitting', 'accepted', 'delivered', 'uncertain', 'failed'];
    await RegistrationWelcomeDelivery.updateOne({
        ...scope, status: { $in: permitted },
        $or: [{ providerMessageId: '' }, { providerMessageId: emailId }]
    }, { $set: {
        status, providerMessageId: emailId,
        ...(status === 'accepted' ? { acceptedAt: new Date(event.created_at || Date.now()) } : {}),
        ...(status === 'delivered' ? { deliveredAt: new Date(event.created_at || Date.now()) } : {})
    }, $unset: { claimId: '' } });
    await EmailWebhookEvent.updateOne({ providerEventId: eventId }, { $set: { processedAt: new Date() } });
    return { processed: true };
};

const processResendEvent = async ({ eventId, event }) => {
    const status = EVENT_STATUS[event?.type];
    const emailId = String(event?.data?.email_id || '');
    const tags = event?.data?.tags || {};
    const shopId = String(tags.shop_id || '');
    const campaignId = String(tags.campaign_id || '');
    const recipientId = String(tags.recipient_id || '');
    const welcomeDeliveryId = String(tags.welcome_delivery_id || '');
    if (status && emailId && welcomeDeliveryId) {
        return processWelcomeEvent({ eventId, event, status, emailId, shopId, deliveryId: welcomeDeliveryId });
    }
    if (!status || !emailId || ![shopId, campaignId, recipientId].every(value => /^[a-f\d]{24}$/i.test(value))) {
        return { ignored: true };
    }
    const scope = { _id: recipientId, shopId, campaignId };
    const recipient = await CustomerEmailRecipient.findOne(scope);
    if (!recipient) return { ignored: true };
    const to = Array.isArray(event.data.to) ? event.data.to : [];
    if (!to.some(address => String(address).toLowerCase() === recipient.email) ||
        (recipient.providerMessageId && recipient.providerMessageId !== emailId)) {
        return { ignored: true };
    }
    try {
        await EmailWebhookEvent.create({
            providerEventId: eventId, providerMessageId: emailId, eventType: event.type,
            shopId, campaignId, recipientId
        });
    } catch (error) {
        if (error.code !== 11000) throw error;
        const existing = await EmailWebhookEvent.findOne({ providerEventId: eventId });
        if (existing?.processedAt) return { duplicate: true };
    }

    const stateFilter = status === 'accepted'
        ? { $in: ['queued', 'submitting', 'retryable', 'uncertain'] }
        : status === 'delivered'
            ? { $nin: ['bounced', 'complained', 'suppressed'] }
            : status === 'failed'
                ? { $nin: ['delivered', 'bounced', 'complained', 'suppressed'] }
                : { $nin: ['complained', 'suppressed'] };
    await CustomerEmailRecipient.updateOne(
        { ...scope, status: stateFilter, $or: [{ providerMessageId: '' }, { providerMessageId: emailId }] },
        { $set: {
            status, providerMessageId: emailId,
            ...(status === 'delivered' ? { deliveredAt: new Date(event.created_at || Date.now()) } : {}),
            ...(status === 'accepted' ? { acceptedAt: new Date(event.created_at || Date.now()) } : {})
        }, $unset: { claimId: '' } }
    );
    if (['bounced', 'complained', 'suppressed'].includes(status)) {
        await User.updateOne(
            { _id: recipient.customerId, shop_id: shopId, role: 'Customer', email: recipient.email },
            { $set: { 'marketingEmail.suppressedAt': new Date(), 'marketingEmail.suppressionReason': status } }
        );
    }
    const campaign = await CustomerEmailCampaign.findOne({ _id: campaignId, shopId });
    if (campaign) await refreshCampaignCounts(campaign);
    await EmailWebhookEvent.updateOne({ providerEventId: eventId }, { $set: { processedAt: new Date() } });
    return { processed: true };
};

module.exports = { verifyResendWebhook, processResendEvent };
