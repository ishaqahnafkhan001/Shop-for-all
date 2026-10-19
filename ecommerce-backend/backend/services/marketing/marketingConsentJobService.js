const User = require('../../models/User');
const Shop = require('../../models/Shop');
const { sendMail } = require('../mail/mailService');
const { escapeHtml } = require('../mail/templates/escapeHtml');
const { createConfirmUrl } = require('./marketingPreferenceService');

const processMarketingConsentJob = async (job, send = sendMail) => {
    if (job.name !== 'marketing.confirm_email') throw new Error('Unsupported marketing consent job');
    const customer = await User.findOne({
        _id: job.payload?.customerId, shop_id: job.shop_id, role: 'Customer',
        'marketingEmail.pendingOrderId': job.payload?.orderId,
        'marketingEmail.pendingAt': { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        'marketingEmail.suppressedAt': null
    }).select('email fullName marketingEmail.pendingAt').lean();
    if (!customer) return;
    const shop = await Shop.findOne({ _id: job.shop_id, isActive: true }).select('shopName').lean();
    if (!shop?.shopName) return;
    const shopName = String(shop.shopName).replace(/\s+/g, ' ').trim();
    if (!shopName) return;
    const url = createConfirmUrl({
        shopId: job.shop_id, customerId: customer._id,
        orderId: job.payload.orderId, email: customer.email,
        expiresAt: new Date(customer.marketingEmail.pendingAt).getTime() + 7 * 24 * 60 * 60 * 1000
    });
    await send({
        type: 'admin', to: customer.email,
        subject: `Confirm your email subscription to ${shopName}`,
        senderName: shopName,
        text: `You requested offers from ${shopName} at checkout. Confirm your subscription within 7 days: ${url}`,
        html: `<div style="font:16px Arial,sans-serif;line-height:1.6"><h1>Confirm your subscription</h1><p>Hello ${escapeHtml(customer.fullName || 'there')},</p><p>You requested offers from ${escapeHtml(shopName)} at checkout. Confirm your email address to subscribe. This link expires in 7 days.</p><p><a href="${escapeHtml(url)}">Confirm subscription</a></p><p>If you did not request this, ignore this email.</p></div>`,
        idempotencyKey: `marketing-confirmation/${job.shop_id}/${job.payload.orderId}/${customer._id}`
    });
};

module.exports = { processMarketingConsentJob };
