const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');

const Shop = require('../../models/Shop');
const Account = require('../../models/Account');
const ShopMembership = require('../../models/ShopMembership');
const Job = require('../../models/Job');
const RegistrationWelcomeDelivery = require('../../models/RegistrationWelcomeDelivery');
const EmailWebhookEvent = require('../../models/EmailWebhookEvent');
const { enqueueRegistrationNotifications, processVendorWelcomeDelivery,
    VENDOR_WELCOME_EMAIL_JOB, VENDOR_WELCOME_SMS_JOB } = require('../../services/registrationNotificationService');
const { claimNextJob, completeJob } = require('../../services/jobQueueService');
const { processResendEvent } = require('../../services/mail/resendWebhookService');

const uri = process.env.MONGO_URI_TEST;
const assertDisposable = () => assert.match(uri || '',
    /^mongodb:\/\/(?:127\.0\.0\.1|localhost):\d+\/welcome_audit_test_[a-zA-Z0-9_]+(?:\?|$)/,
    'Set MONGO_URI_TEST to a disposable loopback welcome_audit_test_* replica-set database.');

const ids = () => ({ shopId: new mongoose.Types.ObjectId(), accountId: new mongoose.Types.ObjectId() });
const registration = ({ shopId, accountId }) => ({
    shopId, accountId, otpChannel: 'email',
    shop: { _id: shopId, shopName: 'Audit Shop', subdomain: 'audit-shop', verification: { status: 'not_submitted' } },
    account: { _id: accountId, fullName: 'Audit Owner', email: 'audit-owner@example.test', phone: '01712345678' }
});
const delivery = ({ shopId, accountId, channel, status = 'queued', claimedAt = null }) => ({
    shopId, accountId, channel, status, claimedAt,
    provider: channel === 'email' ? 'resend' : 'sms',
    recipient: channel === 'email' ? 'audit-owner@example.test' : '01712345678',
    idempotencyKey: `registration/welcome/${shopId}/${accountId}/${channel}`,
    context: { shopName: 'Audit Shop', ownerName: 'Audit Owner',
        storefrontUrl: 'https://audit-shop.scaleup.codes', adminUrl: 'https://admin.scaleup.codes/dashboard',
        senderEmail: 'audit@example.test', supportEmail: 'support@example.test', verificationPending: true }
});

test.before(async () => {
    assertDisposable();
    process.env.PLATFORM_ROOT_DOMAIN = 'scaleup.codes';
    process.env.ADMIN_APP_URL = 'https://admin.scaleup.codes';
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.EMAIL_USER = 'audit@example.test';
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    assert.ok((await mongoose.connection.db.admin().command({ hello: 1 })).setName,
        'Welcome transaction tests require a MongoDB replica set.');
    await Promise.all([Job.init(), RegistrationWelcomeDelivery.init(), EmailWebhookEvent.init()]);
});
test.beforeEach(async () => {
    await Promise.all([Shop.deleteMany({}), Account.deleteMany({}), ShopMembership.deleteMany({}),
        Job.deleteMany({}), RegistrationWelcomeDelivery.deleteMany({}), EmailWebhookEvent.deleteMany({})]);
});
test.after(async () => {
    if (mongoose.connection.readyState) {
        assertDisposable();
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    }
});

test('aborting registration removes owner, shop, both deliveries and all jobs; commit exposes them together', async () => {
    const identity = ids();
    const seed = registration(identity);
    const write = async session => {
        await Shop.collection.insertOne({ _id: identity.shopId, shopName: seed.shop.shopName,
            subdomain: seed.shop.subdomain }, { session });
        await Account.collection.insertOne({ _id: identity.accountId, email: seed.account.email }, { session });
        await ShopMembership.collection.insertOne({ shop_id: identity.shopId,
            account_id: identity.accountId, role: 'VendorAdmin', status: 'Active' }, { session });
        await enqueueRegistrationNotifications({ ...seed, session });
    };
    const first = await mongoose.startSession();
    try {
        first.startTransaction();
        await write(first);
        assert.equal(await Job.countDocuments({}, { session: first }), 3);
        assert.equal(await Job.countDocuments({}), 0);
        await first.abortTransaction();
    } finally { await first.endSession(); }
    assert.equal(await Shop.countDocuments({ _id: identity.shopId }), 0);
    assert.equal(await Account.countDocuments({ _id: identity.accountId }), 0);
    assert.equal(await RegistrationWelcomeDelivery.countDocuments({}), 0);
    assert.equal(await Job.countDocuments({}), 0);

    const second = await mongoose.startSession();
    try {
        second.startTransaction();
        await write(second);
        await second.commitTransaction();
    } finally { await second.endSession(); }
    assert.equal(await Shop.countDocuments({ _id: identity.shopId }), 1);
    assert.equal(await Account.countDocuments({ _id: identity.accountId }), 1);
    assert.equal(await RegistrationWelcomeDelivery.countDocuments({}), 2);
    assert.equal(await Job.countDocuments({}), 3);
});

test('unique delivery and job indexes reject duplicate enrollment under concurrent writes', async () => {
    const identity = ids();
    const record = delivery({ ...identity, channel: 'email' });
    const results = await Promise.allSettled(Array.from({ length: 8 }, () =>
        RegistrationWelcomeDelivery.create(record)));
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.ok(results.filter(result => result.status === 'rejected').every(result => result.reason.code === 11000));
    assert.equal(await RegistrationWelcomeDelivery.countDocuments({}), 1);

    const jobs = await Promise.allSettled(Array.from({ length: 8 }, () => Job.create({
        queue: 'registration', name: VENDOR_WELCOME_EMAIL_JOB, shop_id: identity.shopId,
        idempotencyKey: `registration.vendor_welcome:${identity.shopId}:email`
    })));
    assert.equal(jobs.filter(result => result.status === 'fulfilled').length, 1);
    assert.ok(jobs.filter(result => result.status === 'rejected').every(result => result.reason.code === 11000));
    assert.equal(await Job.countDocuments({}), 1);
});

test('one worker owns an atomic claim; a stale lock is recovered without old-worker completion', async () => {
    await Job.create({ queue: 'registration', name: VENDOR_WELCOME_SMS_JOB, shop_id: ids().shopId });
    const claimed = await Promise.all(Array.from({ length: 12 }, () =>
        claimNextJob({ queues: ['registration'] })));
    const first = claimed.find(Boolean);
    assert.ok(first);
    assert.equal(claimed.filter(Boolean).length, 1);
    await Job.updateOne({ _id: first._id }, { $set: { lockedAt: new Date(Date.now() - 6 * 60 * 1000) } });
    const restarted = await claimNextJob({ queues: ['registration'] });
    assert.ok(restarted);
    assert.notEqual(restarted.lockId, first.lockId);
    assert.equal((await completeJob(first)).modifiedCount, 0);
    assert.equal((await completeJob(restarted)).modifiedCount, 1);
    assert.equal((await Job.findById(first._id)).status, 'completed');
});

test('accepted email is not submitted twice and stale ambiguous SMS is not replayed', async () => {
    const identity = ids();
    await Shop.collection.insertOne({ _id: identity.shopId, shopName: 'Audit Shop',
        subdomain: 'audit-shop', isActive: true, approvalStatus: 'Approved' });
    await ShopMembership.collection.insertOne({ shop_id: identity.shopId,
        account_id: identity.accountId, role: 'VendorAdmin', status: 'Active' });
    const email = await RegistrationWelcomeDelivery.create(delivery({ ...identity,
        channel: 'email', status: 'accepted' }));
    const sms = await RegistrationWelcomeDelivery.create(delivery({ ...identity,
        channel: 'sms', status: 'submitting', claimedAt: new Date(Date.now() - 6 * 60 * 1000) }));
    let sends = 0;
    const dependencies = { sendEmail: async () => { sends++; }, sendText: async () => { sends++; } };
    const job = (name, id) => ({ name, shop_id: identity.shopId,
        payload: { accountId: identity.accountId, deliveryId: id }, attempts: 2, maxAttempts: 3 });
    await processVendorWelcomeDelivery(job(VENDOR_WELCOME_EMAIL_JOB, email._id), dependencies);
    await processVendorWelcomeDelivery(job(VENDOR_WELCOME_EMAIL_JOB, email._id), dependencies);
    await processVendorWelcomeDelivery(job(VENDOR_WELCOME_SMS_JOB, sms._id), dependencies);
    assert.equal(sends, 0);
    assert.equal((await RegistrationWelcomeDelivery.findById(email._id)).status, 'accepted');
    assert.equal((await RegistrationWelcomeDelivery.findById(sms._id)).status, 'uncertain');
});

test('duplicate and out-of-order Resend events cannot downgrade a delivered welcome', async () => {
    const identity = ids();
    const row = await RegistrationWelcomeDelivery.create(delivery({ ...identity, channel: 'email' }));
    const event = type => ({ type, created_at: new Date().toISOString(), data: {
        email_id: 'audit-message-id', to: ['audit-owner@example.test'],
        tags: { shop_id: String(identity.shopId), welcome_delivery_id: String(row._id) }
    } });
    assert.deepEqual(await processResendEvent({ eventId: 'delivery-event', event: event('email.delivered') }),
        { processed: true });
    assert.deepEqual(await processResendEvent({ eventId: 'delivery-event', event: event('email.delivered') }),
        { duplicate: true });
    await processResendEvent({ eventId: 'late-sent-event', event: event('email.sent') });
    assert.equal((await RegistrationWelcomeDelivery.findById(row._id)).status, 'delivered');
    assert.equal(await EmailWebhookEvent.countDocuments({ shopId: identity.shopId }), 2);
});
