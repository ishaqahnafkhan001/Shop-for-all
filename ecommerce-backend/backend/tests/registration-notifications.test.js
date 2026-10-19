const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'registration-notification-test-secret';
process.env.PLATFORM_ROOT_DOMAIN = 'scaleup.codes';
process.env.ADMIN_APP_URL = 'https://admin.scaleup.codes';

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const {
    buildRegistrationLinks,
    buildVendorWelcomeEmail,
    buildVendorWelcomeSms,
    buildSuperAdminRegistrationEmail,
    enqueueRegistrationNotifications,
    processRegistrationNotificationJob,
    processVendorWelcomeDelivery,
    VENDOR_WELCOME_EMAIL_JOB,
    VENDOR_WELCOME_SMS_JOB
} = require('../services/registrationNotificationService');
const RegistrationWelcomeDelivery = require('../models/RegistrationWelcomeDelivery');
const Job = require('../models/Job');
const Subscription = require('../models/Subscription');
const Shop = require('../models/Shop');
const ShopMembership = require('../models/ShopMembership');
const EmailWebhookEvent = require('../models/EmailWebhookEvent');
const { processResendEvent } = require('../services/mail/resendWebhookService');

const context = {
    account: {
        fullName: 'Ishaq <script>alert(1)</script>',
        email: 'owner@example.com',
        phone: '8801712345678'
    },
    shop: {
        _id: '507f1f77bcf86cd799439011',
        shopName: 'Demo & Shop',
        subdomain: 'demo-shop'
    },
    otpChannel: 'email',
    links: {
        storefrontUrl: 'https://demo-shop.scaleup.codes',
        adminUrl: 'https://admin.scaleup.codes/dashboard',
        superAdminUrl: 'https://admin.scaleup.codes/super-admin/shops/507f1f77bcf86cd799439011'
    }
};

test('registration links use the configured platform and admin domains', () => {
    assert.deepEqual(
        buildRegistrationLinks({ subdomain: 'Demo-Shop', shopId: context.shop._id }),
        context.links
    );
    assert.throws(() => buildRegistrationLinks({ subdomain: 'other.example', shopId: context.shop._id }), /Invalid shop subdomain/);
});

test('vendor registration email includes storefront and admin links without credentials', () => {
    const message = buildVendorWelcomeEmail(context);

    assert.match(message.subject, /Demo & Shop/);
    assert.match(message.text, /https:\/\/demo-shop\.scaleup\.codes/);
    assert.match(message.text, /https:\/\/admin\.scaleup\.codes\/dashboard/);
    assert.match(message.html, /Ishaq &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(message.subject, /Congratulations!/);
    assert.match(message.text, /products with images, prices, and stock quantities/);
    assert.match(message.text, /delivery charges/);
    assert.match(message.text, /support@scaleup\.codes/);
    assert.doesNotMatch(message.text, /password\s*[:=]|otp\s*[:=]|token\s*[:=]/i);
    assert.match(message.text, /Business verification is still required/);
    assert.doesNotMatch(buildVendorWelcomeEmail({ ...context, verificationPending: false }).text, /Business verification is still required/);
});

test('SMS registration welcome contains both required links', () => {
    const message = buildVendorWelcomeSms(context);

    assert.match(message, /Congratulations! Demo & Shop is set up/);
    assert.match(message, /https:\/\/demo-shop\.scaleup\.codes/);
    assert.match(message, /https:\/\/admin\.scaleup\.codes\/dashboard/);
    const long = buildVendorWelcomeSms({
        shop: { shopName: 'A very long registered shop name with several words' },
        links: { storefrontUrl: context.links.storefrontUrl, adminUrl: `${context.links.adminUrl}/${'x'.repeat(100)}` }
    });
    assert.match(long, /https:\/\/demo-shop\.scaleup\.codes/);
    assert.doesNotMatch(long, /Admin:/);
});

test('Super Admin registration email contains safe shop review details', () => {
    const message = buildSuperAdminRegistrationEmail(context);

    assert.match(message.subject, /New shop registered/);
    assert.match(message.text, /owner@example\.com/);
    assert.match(message.text, /super-admin\/shops\/507f1f77bcf86cd799439011/);
    assert.match(message.html, /Demo &amp; Shop/);
});

test('registration creates independent durable jobs before transaction commit', () => {
    const controller = read('controllers/authController.js');
    const service = read('services/registrationNotificationService.js');
    const worker = read('workers/index.js');
    const mailService = read('services/mail/mailService.js');
    const transporter = read('services/mail/transporters/confirmationTransporter.js');

    const registrationBlock = controller.slice(
        controller.indexOf('exports.registerVendor'),
        controller.indexOf('exports.registerCustomer')
    );
    const enqueueIndex = registrationBlock.indexOf('await enqueueRegistrationNotifications');
    const commitIndex = registrationBlock.indexOf('await session.commitTransaction');

    assert.ok(enqueueIndex > -1 && enqueueIndex < commitIndex);
    assert.match(service, /registration\.vendor_welcome/);
    assert.match(service, /registration\.super_admin_alert/);
    assert.match(service, /idempotencyKey: `registration\.vendor_welcome:\$\{shopId\}:\$\{channel\}`/);
    assert.match(service, /idempotencyKey: `registration\.super_admin_alert:\$\{shopId\}`/);
    assert.match(service, /process\.env\.SUPER_ADMIN_EMAIL \|\| process\.env\.PLATFORM_OWNER_EMAIL/);
    assert.doesNotMatch(service, /getSuperAdminEmail/);
    assert.match(worker, /REGISTRATION_NOTIFICATION_QUEUE/);
    assert.match(mailService, /type === 'confirmation'/);
    assert.match(transporter, /process\.env\.EMAIL_USER \|\| process\.env\.ADMIN_EMAIL_USER/);
    assert.match(transporter, /process\.env\.EMAIL_PASS \|\| process\.env\.ADMIN_EMAIL_PASS/);
});

test('registration enqueues independent email and SMS records in the existing transaction', async () => {
    const oldCreate = RegistrationWelcomeDelivery.create;
    const oldJobCreate = Job.create;
    const oldSubscriptionFind = Subscription.findOne;
    const records = [];
    const jobs = [];
    RegistrationWelcomeDelivery.create = async ([record]) => {
        records.push(record);
        return [{ ...record, _id: `delivery-${record.channel}` }];
    };
    Job.create = async ([job]) => { jobs.push(job); return [{ ...job, _id: `job-${jobs.length}` }]; };
    Subscription.findOne = () => ({ select: () => ({ lean: () => ({ session: async () => null }) }) });
    try {
        await enqueueRegistrationNotifications({
            shopId: context.shop._id, accountId: '507f1f77bcf86cd799439099',
            shop: context.shop, account: context.account, otpChannel: 'email', session: { test: true }
        });
        assert.equal(records.length, 2);
        assert.deepEqual(records.map(row => row.channel), ['email', 'sms']);
        assert.deepEqual(records.map(row => row.recipient), ['owner@example.com', '8801712345678']);
        assert.equal(records[0].context.storefrontUrl, context.links.storefrontUrl);
        assert.equal(records[0].context.adminUrl, context.links.adminUrl);
        assert.ok(jobs.some(job => job.name === VENDOR_WELCOME_EMAIL_JOB));
        assert.ok(jobs.some(job => job.name === VENDOR_WELCOME_SMS_JOB));
        assert.equal(new Set(jobs.map(job => job.idempotencyKey)).size, 3);
    } finally {
        RegistrationWelcomeDelivery.create = oldCreate;
        Job.create = oldJobCreate;
        Subscription.findOne = oldSubscriptionFind;
    }
});

test('already accepted welcome delivery is not resent by a retried job', async () => {
    const oldFind = RegistrationWelcomeDelivery.findOne;
    RegistrationWelcomeDelivery.findOne = () => ({ select: async () => ({ status: 'accepted' }) });
    try {
        await processRegistrationNotificationJob({
            name: VENDOR_WELCOME_EMAIL_JOB, shop_id: context.shop._id,
            payload: { deliveryId: '507f1f77bcf86cd799439012', accountId: '507f1f77bcf86cd799439099' }
        });
    } finally { RegistrationWelcomeDelivery.findOne = oldFind; }
});

test('welcome webhook is tenant scoped, deduplicated, and never downgrades delivered to accepted', async () => {
    const original = {
        find: RegistrationWelcomeDelivery.findOne,
        update: RegistrationWelcomeDelivery.updateOne,
        eventCreate: EmailWebhookEvent.create,
        eventFind: EmailWebhookEvent.findOne,
        eventUpdate: EmailWebhookEvent.updateOne
    };
    let eventRecord;
    let filter;
    RegistrationWelcomeDelivery.findOne = () => ({ select: async () => ({
        recipient: 'owner@example.com', providerMessageId: 'mail-id'
    }) });
    RegistrationWelcomeDelivery.updateOne = async (query) => { filter = query; return { modifiedCount: 1 }; };
    EmailWebhookEvent.create = async (record) => {
        if (eventRecord) { const error = new Error('duplicate'); error.code = 11000; throw error; }
        eventRecord = record;
    };
    EmailWebhookEvent.findOne = async () => ({ ...eventRecord, processedAt: new Date() });
    EmailWebhookEvent.updateOne = async () => {};
    const event = {
        type: 'email.sent', data: {
            email_id: 'mail-id', to: ['owner@example.com'], tags: {
                shop_id: '507f1f77bcf86cd799439011', welcome_delivery_id: '507f1f77bcf86cd799439012'
            }
        }
    };
    try {
        assert.deepEqual(await processResendEvent({ eventId: 'event-1', event }), { processed: true });
        assert.equal(filter.shopId, event.data.tags.shop_id);
        assert.equal(String(filter._id), event.data.tags.welcome_delivery_id);
        assert.ok(!filter.status.$in.includes('delivered'));
        assert.deepEqual(await processResendEvent({ eventId: 'event-1', event }), { duplicate: true });
    } finally {
        RegistrationWelcomeDelivery.findOne = original.find;
        RegistrationWelcomeDelivery.updateOne = original.update;
        EmailWebhookEvent.create = original.eventCreate;
        EmailWebhookEvent.findOne = original.eventFind;
        EmailWebhookEvent.updateOne = original.eventUpdate;
    }
});

test('welcome email and SMS have independent provider outcomes; SMS timeout is uncertain', async () => {
    const old = {
        deliveryFind: RegistrationWelcomeDelivery.findOne,
        claim: RegistrationWelcomeDelivery.findOneAndUpdate,
        update: RegistrationWelcomeDelivery.updateOne,
        shopFind: Shop.findById,
        membershipFind: ShopMembership.findOne,
        provider: process.env.EMAIL_PROVIDER,
        sender: process.env.EMAIL_USER
    };
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.EMAIL_USER = 'hello@scaleup.codes';
    let currentChannel = 'email';
    const outcomes = [];
    RegistrationWelcomeDelivery.findOne = () => ({ select: async () => ({
        status: 'queued', accountId: '507f1f77bcf86cd799439099',
        provider: currentChannel === 'email' ? 'resend' : 'sms',
        context: { shopName: 'Demo & Shop', ownerName: 'Ishaq',
            storefrontUrl: context.links.storefrontUrl, adminUrl: context.links.adminUrl,
            supportEmail: 'support@scaleup.codes', senderEmail: 'hello@scaleup.codes', verificationPending: true }
    }) });
    RegistrationWelcomeDelivery.findOneAndUpdate = () => ({ select: async () => ({
        _id: '507f1f77bcf86cd799439012', status: 'submitting', claimId: 'claim-1',
        recipient: currentChannel === 'email' ? 'owner@example.com' : '8801712345678',
        context: { shopName: 'Demo & Shop', ownerName: 'Ishaq',
            storefrontUrl: context.links.storefrontUrl, adminUrl: context.links.adminUrl,
            supportEmail: 'support@scaleup.codes', senderEmail: 'hello@scaleup.codes', verificationPending: true },
        idempotencyKey: 'registration/welcome/shop/account/email', firstSubmissionAt: new Date()
    }) });
    RegistrationWelcomeDelivery.updateOne = async (_filter, update) => { outcomes.push(update.$set.status); return { modifiedCount: 1 }; };
    Shop.findById = () => ({ select: () => ({ lean: async () => ({ isActive: true, approvalStatus: 'Approved' }) }) });
    ShopMembership.findOne = () => ({ select: () => ({ lean: async () => ({ _id: 'membership' }) }) });
    const job = channel => ({
        name: channel === 'email' ? VENDOR_WELCOME_EMAIL_JOB : VENDOR_WELCOME_SMS_JOB,
        shop_id: context.shop._id, attempts: 1, maxAttempts: 3,
        payload: { accountId: '507f1f77bcf86cd799439099', deliveryId: '507f1f77bcf86cd799439012' }
    });
    let emailCalls = 0;
    try {
        await processVendorWelcomeDelivery(job('email'), {
            sendEmail: async request => {
                emailCalls += 1;
                assert.equal(request.to, 'owner@example.com');
                assert.match(request.idempotencyKey, /registration\/welcome/);
                return { id: 'resend-message-id' };
            }
        });
        currentChannel = 'sms';
        await processVendorWelcomeDelivery(job('sms'), {
            sendText: async request => {
                assert.equal(request.mobile, '8801712345678');
                throw new Error('SMS provider request timed out');
            }
        });
        currentChannel = 'email';
        await processVendorWelcomeDelivery(job('email'), {
            sendEmail: async () => {
                const error = new Error('Provider rejected request');
                error.response = { status: 422 };
                throw error;
            }
        });
        assert.deepEqual(outcomes, ['accepted', 'uncertain', 'failed']);
        assert.equal(emailCalls, 1);
    } finally {
        RegistrationWelcomeDelivery.findOne = old.deliveryFind;
        RegistrationWelcomeDelivery.findOneAndUpdate = old.claim;
        RegistrationWelcomeDelivery.updateOne = old.update;
        Shop.findById = old.shopFind;
        ShopMembership.findOne = old.membershipFind;
        if (old.provider === undefined) delete process.env.EMAIL_PROVIDER;
        else process.env.EMAIL_PROVIDER = old.provider;
        if (old.sender === undefined) delete process.env.EMAIL_USER;
        else process.env.EMAIL_USER = old.sender;
    }
});

test('restart safely reuses a Resend idempotency key but never replays a stale SMS submission', async () => {
    const old = {
        find: RegistrationWelcomeDelivery.findOne,
        claim: RegistrationWelcomeDelivery.findOneAndUpdate,
        update: RegistrationWelcomeDelivery.updateOne,
        shop: Shop.findById,
        membership: ShopMembership.findOne,
        provider: process.env.EMAIL_PROVIDER,
        sender: process.env.EMAIL_USER
    };
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.EMAIL_USER = 'hello@scaleup.codes';
    const staleAt = new Date(Date.now() - 6 * 60 * 1000);
    const firstSubmissionAt = new Date(Date.now() - 10 * 60 * 1000);
    let channel = 'email';
    let claimCount = 0;
    let finalStatus;
    let submittedKey;
    const contextSnapshot = {
        shopName: 'Demo & Shop', ownerName: 'Ishaq', senderEmail: 'hello@scaleup.codes',
        storefrontUrl: context.links.storefrontUrl, adminUrl: context.links.adminUrl,
        supportEmail: 'support@scaleup.codes', verificationPending: true
    };
    RegistrationWelcomeDelivery.findOne = () => ({ select: async () => ({
        status: 'submitting', provider: channel === 'email' ? 'resend' : 'sms',
        accountId: '507f1f77bcf86cd799439099', claimedAt: staleAt,
        firstSubmissionAt, context: contextSnapshot
    }) });
    RegistrationWelcomeDelivery.findOneAndUpdate = () => ({ select: async () => {
        claimCount += 1;
        return {
            _id: '507f1f77bcf86cd799439012', claimId: 'claim',
            recipient: 'owner@example.com', firstSubmissionAt,
            idempotencyKey: 'registration/welcome/frozen-key', context: contextSnapshot
        };
    } });
    RegistrationWelcomeDelivery.updateOne = async (_query, change) => { finalStatus = change.$set.status; return { modifiedCount: 1 }; };
    Shop.findById = () => ({ select: () => ({ lean: async () => ({ isActive: true, approvalStatus: 'Approved' }) }) });
    ShopMembership.findOne = () => ({ select: () => ({ lean: async () => ({ _id: 'membership' }) }) });
    const job = name => ({ name, shop_id: context.shop._id, attempts: 2, maxAttempts: 3,
        payload: { accountId: '507f1f77bcf86cd799439099', deliveryId: '507f1f77bcf86cd799439012' } });
    try {
        await processVendorWelcomeDelivery(job(VENDOR_WELCOME_EMAIL_JOB), {
            sendEmail: async request => { submittedKey = request.idempotencyKey; return { id: 'mail-id' }; }
        });
        assert.equal(submittedKey, 'registration/welcome/frozen-key');
        assert.equal(finalStatus, 'accepted');
        channel = 'sms';
        await processVendorWelcomeDelivery(job(VENDOR_WELCOME_SMS_JOB), {
            sendText: async () => { throw new Error('SMS must not replay'); }
        });
        assert.equal(finalStatus, 'uncertain');
        assert.equal(claimCount, 1);
    } finally {
        RegistrationWelcomeDelivery.findOne = old.find;
        RegistrationWelcomeDelivery.findOneAndUpdate = old.claim;
        RegistrationWelcomeDelivery.updateOne = old.update;
        Shop.findById = old.shop;
        ShopMembership.findOne = old.membership;
        if (old.provider === undefined) delete process.env.EMAIL_PROVIDER;
        else process.env.EMAIL_PROVIDER = old.provider;
        if (old.sender === undefined) delete process.env.EMAIL_USER;
        else process.env.EMAIL_USER = old.sender;
    }
});
