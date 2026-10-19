const CustomerEmailRecipient = require('../../models/CustomerEmailRecipient');
const RegistrationWelcomeDelivery = require('../../models/RegistrationWelcomeDelivery');
const { isResendEnabled, retrieveResendMail } = require('./providers/resendProvider');
const { processResendEvent } = require('./resendWebhookService');

const RECONCILE_EVENTS = new Set(['sent', 'delivered', 'bounced', 'complained', 'failed', 'suppressed']);

const reconcileResendCampaignRecipients = async ({ limit = 20 } = {}) => {
    if (!isResendEnabled() || !process.env.RESEND_API_KEY) return { checked: 0 };
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const recipients = await CustomerEmailRecipient.find({
        provider: 'resend',
        status: { $in: ['accepted', 'uncertain'] },
        providerMessageId: { $ne: '' },
        $or: [{ lastReconciledAt: null }, { lastReconciledAt: { $lte: cutoff } }]
    }).sort({ lastReconciledAt: 1, createdAt: 1 }).limit(limit);
    let checked = 0;
    for (const recipient of recipients) {
        // Claim the polling slot before the HTTP request so concurrent workers
        // do not repeatedly query the same provider record.
        const claim = await CustomerEmailRecipient.updateOne(
            { _id: recipient._id, shopId: recipient.shopId, lastReconciledAt: recipient.lastReconciledAt },
            { $set: { lastReconciledAt: new Date() } }
        );
        if (!claim.modifiedCount) continue;
        try {
            const result = await retrieveResendMail(recipient.providerMessageId);
            const lastEvent = String(result?.last_event || '').toLowerCase();
            if (RECONCILE_EVENTS.has(lastEvent) && result.id === recipient.providerMessageId) {
                await processResendEvent({
                    eventId: `reconcile:${result.id}:${lastEvent}`,
                    event: {
                        type: `email.${lastEvent}`, created_at: new Date().toISOString(),
                        data: {
                            email_id: result.id, to: result.to,
                            tags: {
                                shop_id: String(recipient.shopId),
                                campaign_id: String(recipient.campaignId),
                                recipient_id: String(recipient._id)
                            }
                        }
                    }
                });
            }
            checked += 1;
        } catch {
            // Keep the current outcome and retry polling later; no resend occurs.
        }
    }
    return { checked };
};

const reconcileResendWelcomeDeliveries = async ({ limit = 20 } = {}) => {
    if (!isResendEnabled() || !process.env.RESEND_API_KEY) return { checked: 0 };
    const rows = await RegistrationWelcomeDelivery.find({
        channel: 'email', status: { $in: ['accepted', 'uncertain'] }, providerMessageId: { $ne: '' },
        $or: [{ lastReconciledAt: null }, { lastReconciledAt: { $lte: new Date(Date.now() - 15 * 60 * 1000) } }]
    }).sort({ lastReconciledAt: 1, createdAt: 1 }).limit(limit);
    let checked = 0;
    for (const row of rows) {
        const claim = await RegistrationWelcomeDelivery.updateOne(
            { _id: row._id, shopId: row.shopId, lastReconciledAt: row.lastReconciledAt },
            { $set: { lastReconciledAt: new Date() } }
        );
        if (!claim.modifiedCount) continue;
        try {
            const result = await retrieveResendMail(row.providerMessageId);
            const lastEvent = String(result?.last_event || '').toLowerCase();
            if (RECONCILE_EVENTS.has(lastEvent) && result.id === row.providerMessageId) {
                await processResendEvent({
                    eventId: `reconcile:welcome:${result.id}:${lastEvent}`,
                    event: {
                        type: `email.${lastEvent}`, created_at: new Date().toISOString(),
                        data: { email_id: result.id, to: result.to,
                            tags: { shop_id: String(row.shopId), welcome_delivery_id: String(row._id) } }
                    }
                });
            }
            checked += 1;
        } catch { /* Leave the outcome unchanged for the next polling cycle. */ }
    }
    return { checked };
};

module.exports = { reconcileResendCampaignRecipients, reconcileResendWelcomeDeliveries };
