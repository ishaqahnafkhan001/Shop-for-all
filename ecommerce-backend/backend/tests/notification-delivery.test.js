const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { baseTemplate } = require('../services/mail/templates/baseTemplate');
const { productPromotionTemplate } = require('../services/mail/templates/productPromotionTemplate');
const { buildVendorEventEmail } = require('../services/vendorNotificationEmailService');
const { sendSms } = require('../services/sms/smsProviderService');
const { verifyResendWebhook } = require('../services/mail/resendWebhookService');
const { processResendEvent } = require('../services/mail/resendWebhookService');
const { createUnsubscribeToken, parseUnsubscribeToken, createConfirmToken, parseConfirmToken } = require('../services/marketing/marketingPreferenceService');
const { classifySendError, claimRecipient, refreshCampaignCounts } = require('../services/customerEmailCampaignService');
const CustomerEmailRecipient = require('../models/CustomerEmailRecipient');
const CustomerEmailCampaign = require('../models/CustomerEmailCampaign');
const EmailWebhookEvent = require('../models/EmailWebhookEvent');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { buildOtpKey, hashValue, createOtp, verifyOtp, markOtpDeliveryFailed } = require('../services/otpService');
const axios = require('axios');
const { sendResendMail } = require('../services/mail/providers/resendProvider');

test('removed arbitrary-recipient order mail route and escapes text templates', () => {
    const routes = fs.readFileSync(path.join(__dirname, '../routes/adminRoutes.js'), 'utf8');
    assert.doesNotMatch(routes, /['"]\/orders\/send-email['"]/);
    const payload = '<img src=x onerror=alert(1)>';
    assert.doesNotMatch(baseTemplate({ senderName: payload, recipientName: payload, content: payload, email: payload }), /<img/);
    assert.doesNotMatch(buildVendorEventEmail({ title: payload, intro: payload, rows: [{ label: payload, value: payload }], actionUrl: 'javascript:alert(1)' }), /<img|javascript:/);
    assert.doesNotMatch(productPromotionTemplate({
        storeName: 'Store', customerName: payload, subject: payload, message: payload,
        product: { title: payload, images: ['javascript:alert(1)'], pricing: { sellingPrice: 100 } },
        productUrl: 'javascript:alert(1)'
    }), /<img|javascript:/);
});

test('SMTP transports verify provider certificates', () => {
    for (const name of ['admin', 'confirmation', 'order', 'reset']) {
        const source = fs.readFileSync(path.join(__dirname, `../services/mail/transporters/${name}Transporter.js`), 'utf8');
        assert.match(source, /rejectUnauthorized:\s*true/);
        assert.doesNotMatch(source, /rejectUnauthorized:\s*false/);
    }
});

test('SMS rejects explicit provider failure inside HTTP 200 without retrying', async () => {
    const old = Object.fromEntries(['SMS_API_KEY', 'SMS_API_BASE_URL', 'SMS_MOCK_MODE', 'SMS_INCLUDE_SID'].map(key => [key, process.env[key]]));
    const oldFetch = global.fetch;
    let calls = 0;
    process.env.SMS_API_KEY = 'test-only';
    process.env.SMS_API_BASE_URL = 'https://sms.invalid';
    process.env.SMS_MOCK_MODE = 'false';
    process.env.SMS_INCLUDE_SID = 'false';
    global.fetch = async () => {
        calls += 1;
        return { ok: true, status: 200, text: async () => JSON.stringify({ success: false, status: 'failed' }) };
    };
    try {
        await assert.rejects(sendSms({ mobile: '01712345678', message: 'test' }), /SMS provider rejected/);
        assert.equal(calls, 1);
    } finally {
        global.fetch = oldFetch;
        for (const [key, value] of Object.entries(old)) {
            if (value === undefined) delete process.env[key]; else process.env[key] = value;
        }
    }
});

test('SMS mock mode cannot report success in production regardless of case', async () => {
    const previous = { nodeEnv: process.env.NODE_ENV, mockMode: process.env.SMS_MOCK_MODE };
    process.env.NODE_ENV = 'production';
    process.env.SMS_MOCK_MODE = 'TRUE';
    try {
        await assert.rejects(sendSms({ mobile: '01712345678', message: 'test only' }),
            /mock mode is unavailable in production/);
    } finally {
        if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previous.nodeEnv;
        if (previous.mockMode === undefined) delete process.env.SMS_MOCK_MODE;
        else process.env.SMS_MOCK_MODE = previous.mockMode;
    }
});

test('Resend webhook signature requires authentic body and fresh timestamp', () => {
    const secret = `whsec_${crypto.randomBytes(32).toString('base64')}`;
    const id = 'msg_test';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = Buffer.from('{"type":"email.delivered"}');
    const signature = `v1,${crypto.createHmac('sha256', Buffer.from(secret.slice(6), 'base64')).update(`${id}.${timestamp}.${body}`).digest('base64')}`;
    assert.equal(verifyResendWebhook({ body, id, timestamp, signature, secret }), true);
    assert.equal(verifyResendWebhook({ body: Buffer.from('{}'), id, timestamp, signature, secret }), false);
    assert.equal(verifyResendWebhook({ body, id, timestamp: String(Number(timestamp) - 1000), signature, secret }), false);
});

test('unsubscribe token is tenant bound and tamper evident', () => {
    const old = process.env.MARKETING_UNSUBSCRIBE_SECRET;
    process.env.MARKETING_UNSUBSCRIBE_SECRET = crypto.randomBytes(32).toString('hex');
    try {
        const token = createUnsubscribeToken({ shopId: '507f1f77bcf86cd799439011', customerId: '507f191e810c19729de860ea' });
        assert.equal(parseUnsubscribeToken(token).shopId, '507f1f77bcf86cd799439011');
        assert.equal(parseUnsubscribeToken(`${token}x`), null);
        const confirm = createConfirmToken({
            shopId: '507f1f77bcf86cd799439011', customerId: '507f191e810c19729de860ea',
            orderId: '507f1f77bcf86cd799439012', email: 'buyer@example.com'
        });
        assert.equal(parseConfirmToken(confirm).purpose, 'confirm');
        assert.equal(parseConfirmToken(`${confirm}x`), null);
    } finally {
        if (old === undefined) delete process.env.MARKETING_UNSUBSCRIBE_SECRET;
        else process.env.MARKETING_UNSUBSCRIBE_SECRET = old;
    }
});

test('Resend adapter forwards one stable idempotency key and recipient tags', async () => {
    const oldKey = process.env.RESEND_API_KEY;
    const oldPost = axios.post;
    process.env.RESEND_API_KEY = 'test-only';
    let request;
    axios.post = async (url, body, options) => { request = { url, body, options }; return { data: { id: 'email-1' } }; };
    try {
        const result = await sendResendMail({
            from: 'test@example.com', to: 'buyer@example.com', subject: 'Hello', html: '<p>Hello</p>',
            idempotencyKey: 'campaign/a/customer/b', tags: [{ name: 'shop_id', value: '507f1f77bcf86cd799439011' }]
        });
        assert.equal(result.id, 'email-1');
        assert.equal(request.options.headers['Idempotency-Key'], 'campaign/a/customer/b');
        assert.equal(request.body.tags[0].name, 'shop_id');
    } finally {
        axios.post = oldPost;
        if (oldKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = oldKey;
    }
});

test('verified bounce event updates only its tagged tenant recipient and is deduplicated', async () => {
    const originals = {
        findOne: CustomerEmailRecipient.findOne,
        recipientUpdate: CustomerEmailRecipient.updateOne,
        eventCreate: EmailWebhookEvent.create,
        eventFind: EmailWebhookEvent.findOne,
        eventUpdate: EmailWebhookEvent.updateOne,
        userUpdate: User.updateOne,
        campaignFind: CustomerEmailCampaign.findOne
    };
    const shopId = '507f1f77bcf86cd799439011';
    const campaignId = '507f1f77bcf86cd799439012';
    const recipientId = '507f1f77bcf86cd799439013';
    let eventRecord;
    let recipientFilter;
    let userFilter;
    CustomerEmailRecipient.findOne = async () => ({
        _id: recipientId, shopId, campaignId,
        customerId: '507f191e810c19729de860ea', email: 'buyer@example.com', providerMessageId: ''
    });
    CustomerEmailRecipient.updateOne = async (filter) => { recipientFilter = filter; return { modifiedCount: 1 }; };
    EmailWebhookEvent.create = async (record) => {
        if (eventRecord) { const error = new Error('duplicate'); error.code = 11000; throw error; }
        eventRecord = { ...record, processedAt: null };
    };
    EmailWebhookEvent.findOne = async () => eventRecord;
    EmailWebhookEvent.updateOne = async () => { eventRecord.processedAt = new Date(); };
    User.updateOne = async (filter) => { userFilter = filter; return { modifiedCount: 1 }; };
    CustomerEmailCampaign.findOne = async () => null;
    const payload = {
        type: 'email.bounced', created_at: new Date().toISOString(),
        data: { email_id: 'email-1', to: ['buyer@example.com'],
            tags: { shop_id: shopId, campaign_id: campaignId, recipient_id: recipientId } }
    };
    try {
        assert.deepEqual(await processResendEvent({ eventId: 'msg-1', event: payload }), { processed: true });
        assert.equal(recipientFilter.shopId, shopId);
        assert.equal(recipientFilter.campaignId, campaignId);
        assert.equal(userFilter.shop_id, shopId);
        assert.equal(userFilter.email, 'buyer@example.com');
        assert.deepEqual(await processResendEvent({ eventId: 'msg-1', event: payload }), { duplicate: true });
    } finally {
        CustomerEmailRecipient.findOne = originals.findOne;
        CustomerEmailRecipient.updateOne = originals.recipientUpdate;
        EmailWebhookEvent.create = originals.eventCreate;
        EmailWebhookEvent.findOne = originals.eventFind;
        EmailWebhookEvent.updateOne = originals.eventUpdate;
        User.updateOne = originals.userUpdate;
        CustomerEmailCampaign.findOne = originals.campaignFind;
    }
});

test('campaign recipient claim is atomic and scoped; SMTP uncertainty is never retried', async () => {
    const old = CustomerEmailRecipient.findOneAndUpdate;
    let query;
    CustomerEmailRecipient.findOneAndUpdate = async (filter) => { query = filter; return null; };
    try {
        await claimRecipient({
            _id: 'recipient', shopId: 'shop', campaignId: 'campaign', status: 'queued', attempts: 0
        }, new Date());
        assert.equal(query.shopId, 'shop');
        assert.equal(query.campaignId, 'campaign');
        assert.deepEqual(query.attempts, { $lt: 3 });
    } finally { CustomerEmailRecipient.findOneAndUpdate = old; }
    assert.equal(classifySendError(new Error('timeout'), { provider: 'smtp', claimedAt: new Date(), attempts: 1 }), 'uncertain');
    assert.equal(classifySendError({ response: { status: 400, data: { name: 'validation_error' } } }, { provider: 'resend', claimedAt: new Date(), attempts: 1 }), 'failed');
});

test('stale Resend submissions retain their first attempt and stop after the idempotency window', async () => {
    const oldFind = CustomerEmailRecipient.findOneAndUpdate;
    const oldUpdate = CustomerEmailRecipient.updateOne;
    const now = new Date();
    const recent = new Date(now.getTime() - 10 * 60 * 1000);
    const staleClaim = new Date(now.getTime() - 6 * 60 * 1000);
    let replacement;
    let finalStatus;
    CustomerEmailRecipient.findOneAndUpdate = async (_filter, update) => {
        replacement = update.$set;
        return { _id: 'recipient', shopId: 'shop', claimId: 'claim', provider: 'resend' };
    };
    CustomerEmailRecipient.updateOne = async (_filter, update) => { finalStatus = update.$set.status; };
    try {
        await claimRecipient({
            _id: 'recipient', shopId: 'shop', campaignId: 'campaign', status: 'submitting',
            provider: 'resend', attempts: 1, claimedAt: staleClaim, firstSubmissionAt: recent
        }, now);
        assert.equal(replacement.firstSubmissionAt, recent);
        assert.equal(finalStatus, undefined);
        await claimRecipient({
            _id: 'recipient', shopId: 'shop', campaignId: 'campaign', status: 'submitting',
            provider: 'resend', attempts: 1, claimedAt: staleClaim,
            firstSubmissionAt: new Date(now.getTime() - 24 * 60 * 60 * 1000)
        }, now);
        assert.equal(finalStatus, 'uncertain');
    } finally {
        CustomerEmailRecipient.findOneAndUpdate = oldFind;
        CustomerEmailRecipient.updateOne = oldUpdate;
    }
});

test('a submitting recipient keeps the campaign job pending after a worker restart', async () => {
    const oldAggregate = CustomerEmailRecipient.aggregate;
    const oldUpdate = CustomerEmailCampaign.updateOne;
    let status;
    CustomerEmailRecipient.aggregate = async () => [{ _id: 'submitting', count: 1 }];
    CustomerEmailCampaign.updateOne = async (_filter, update) => { status = update.$set.status; };
    try {
        const progress = await refreshCampaignCounts({ _id: 'campaign', shopId: 'shop' });
        assert.equal(progress.pending, 1);
        assert.equal(status, 'sending');
    } finally {
        CustomerEmailRecipient.aggregate = oldAggregate;
        CustomerEmailCampaign.updateOne = oldUpdate;
    }
});

test('failed OTP delivery invalidates only its issued hash and preserves a retry delay', async () => {
    const old = OTP.updateOne;
    let filter;
    let update;
    OTP.updateOne = async (query, change) => { filter = query; update = change; return { modifiedCount: 1 }; };
    try {
        const metadata = { shopId: '507f1f77bcf86cd799439011' };
        await markOtpDeliveryFailed({ identifier: '+8801712345678', channel: 'sms', purpose: 'customer_order_phone', metadata, otp: '123456' });
        const key = buildOtpKey({ identifier: '+8801712345678', channel: 'sms', purpose: 'customer_order_phone', metadata });
        assert.equal(filter.key, key);
        assert.equal(filter.otpHash, hashValue(key, '123456'));
        assert.notEqual(update.$set.otpHash, filter.otpHash);
        assert.ok(update.$set.resendAvailableAt.getTime() - Date.now() <= 10000);
    } finally { OTP.updateOne = old; }
});

test('OTP creation resolves a concurrent unique-key collision as cooldown', async () => {
    const oldUpdate = OTP.findOneAndUpdate;
    const oldFind = OTP.findOne;
    OTP.findOneAndUpdate = async () => { const error = new Error('duplicate'); error.code = 11000; throw error; };
    OTP.findOne = () => ({ session: async () => ({ resendAvailableAt: new Date(Date.now() + 40000) }) });
    try {
        const result = await createOtp({ identifier: '+8801712345678', channel: 'sms', purpose: 'vendor_registration_phone' });
        assert.equal(result.code, 'OTP_RESEND_COOLDOWN');
        assert.ok(result.retryAfterSeconds > 0);
    } finally { OTP.findOneAndUpdate = oldUpdate; OTP.findOne = oldFind; }
});

test('OTP consumption uses a conditional atomic write', async () => {
    const oldUpdate = OTP.findOneAndUpdate;
    const oldFind = OTP.findOne;
    const key = buildOtpKey({ identifier: 'buyer@example.com', purpose: 'vendor_registration_email', channel: 'email' });
    const record = {
        _id: 'otp-id', key, otpHash: hashValue(key, '123456'), metadata: {},
        attempts: 0, maxAttempts: 5, expiresAt: new Date(Date.now() + 60000),
        consumedAt: null, usedAt: null
    };
    OTP.findOne = () => ({ session: async () => record });
    let filter;
    OTP.findOneAndUpdate = async (query) => { filter = query; return { _id: record._id }; };
    try {
        const result = await verifyOtp({ identifier: 'buyer@example.com', purpose: 'vendor_registration_email', channel: 'email', otp: '123456', consume: true });
        assert.equal(result.success, true);
        assert.equal(filter.consumedAt, null);
        assert.equal(filter.usedAt, null);
        assert.deepEqual(filter.attempts, { $lt: 5 });
        OTP.findOneAndUpdate = async () => null;
        const replay = await verifyOtp({ identifier: 'buyer@example.com', purpose: 'vendor_registration_email', channel: 'email', otp: '123456', consume: true });
        assert.equal(replay.success, false);
    } finally { OTP.findOneAndUpdate = oldUpdate; OTP.findOne = oldFind; }
});
