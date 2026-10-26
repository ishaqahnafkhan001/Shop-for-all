const test = require('node:test');
const assert = require('node:assert/strict');
const { createLaunchSafetyContext } = require('../helpers/launchSafetyHarness');
const Invoice = require('../../models/Invoice');
const Subscription = require('../../models/Subscription');
const Job = require('../../models/Job');
const Notification = require('../../models/Notification');
const { processBillingNotificationJob } = require('../../services/billing/billingNotificationService');
const Payment = require('../../models/PaymentTransaction');
const { verifyManualPayment, rejectManualPayment } = require('../../services/billing/paymentVerificationService');
async function setup(t) {
    const ctx = await createLaunchSafetyContext(t);
    await Promise.all([Payment.createIndexes(), Invoice.createIndexes(), Subscription.createIndexes()]);
    const client = ctx.vendorAClient();
    const create = (body = {}) => client.unsafePost('/api/admin/billing/invoices', { planName: 'Starter', billingCycle: 'monthly', ...body });
    const submit = (invoice, body = {}) => client.unsafePost(`/api/admin/billing/invoices/${invoice.id}/submit-payment`, { provider: 'manual_bkash', amount: invoice.amount, transactionId: `ref-${invoice.id}`, ...body });
    return { ctx, client, create, submit };
}
const success = result => { assert.equal(result.status, 201, JSON.stringify(result.body)); return result.body.data; };

test('concurrent invoice creation reuses the quote and payment submission commits once', async t => {
    const f = await setup(t);
    const invoices = await Promise.all([f.create(), f.create()]); invoices.forEach(success);
    const invoice = invoices[0].body.data;
    assert.equal(invoice.id, invoices[1].body.data.id);
    const attempts = await Promise.all([f.submit(invoice), f.submit(invoice)]); attempts.forEach(success);
    assert.equal(attempts[0].body.data.id, attempts[1].body.data.id);
    assert.equal(await Payment.countDocuments(), 1);
    assert.equal(await Job.countDocuments({ queue: 'billing-notifications' }), 3);
    const job = await Job.findOne({ queue: 'billing-notifications', name: 'vendor' }).select('+payload');
    await processBillingNotificationJob(job);
    await processBillingNotificationJob(job);
    assert.equal(await Notification.countDocuments({ entityId: attempts[0].body.data.id, title: 'Payment submitted' }), 1);
    assert.equal((await Invoice.findById(invoice.id)).status, 'submitted');
    assert.equal((await f.submit(invoice, { transactionId: 'another-reference' })).status, 400);
});

test('renewal applies after submission, carries paid days and approval retries do not extend twice', async t => {
    const f = await setup(t);
    const sub = await Subscription.findOne({ shopId: f.ctx.data.shops.shopA._id });
    const oldEnd = new Date(Date.now() + 11 * 86400000);
    sub.currentPeriodEnd = oldEnd; sub.activePlanSlug = 'starter'; sub.activePlanName = 'Starter'; sub.billingCycle = 'monthly'; await sub.save();
    const invoice = success(await f.create()); const payment = success(await f.submit(invoice));
    await verifyManualPayment({ paymentId: payment.id });
    const after = await Subscription.findById(sub._id);
    assert.equal(+after.currentPeriodEnd, +oldEnd + 30 * 86400000);
    assert.equal(String(after.lastPaidInvoiceId), invoice.id);
    assert.equal((await Invoice.findById(invoice.id)).status, 'paid');
    await f.create({ billingCycle: 'yearly' });
    await verifyManualPayment({ paymentId: payment.id });
    assert.equal(+(await Subscription.findById(sub._id)).currentPeriodEnd, +after.currentPeriodEnd);
});

test('pending and rejected annual payment preserve the active monthly cycle', async t => {
    const f = await setup(t);
    const invoice = success(await f.create({ billingCycle: 'yearly' }));
    const payment = success(await f.submit(invoice));
    let sub = await Subscription.findOne({ shopId: f.ctx.data.shops.shopA._id });
    assert.equal(sub.billingCycle, 'monthly'); assert.equal(sub.pendingBillingCycle, 'yearly');
    await rejectManualPayment({ paymentId: payment.id, rejectionReason: 'Transaction could not be found' });
    sub = await Subscription.findById(sub._id);
    assert.equal(sub.billingCycle, 'monthly'); assert.equal(sub.pendingBillingCycle, '');
    const history = await f.client.get('/api/admin/billing/payments');
    assert.equal(history.body.data[0].rejectionReason, 'Transaction could not be found');
    assert.equal(history.body.data[0].adminNote, undefined);
});

test('amount, state, ownership and reference validation prevent invalid submissions and approvals', async t => {
    const f = await setup(t); const invoice = success(await f.create());
    for (const amount of [0, 1, invoice.amount + 1, -1, 'NaN', 1.001, null, [invoice.amount], {}, true]) assert.equal((await f.submit(invoice, { amount })).status, 400);
    assert.equal((await f.submit(invoice, { transactionId: '' })).status, 400);
    assert.equal((await f.ctx.vendorBClient().unsafePost(`/api/admin/billing/invoices/${invoice.id}/submit-payment`, { provider: 'manual_bkash', amount: invoice.amount, transactionId: 'foreign' })).status, 400);
    for (const status of ['cancelled', 'expired', 'paid']) {
        await Invoice.updateOne({ _id: invoice.id }, { $set: { status } });
        assert.equal((await f.submit(invoice)).status, 400);
    }
    assert.equal(await Payment.countDocuments(), 0);
    await Invoice.updateOne({ _id: invoice.id }, { $set: { status: 'unpaid' } });
    const payment = success(await f.submit(invoice));
    await Payment.updateOne({ _id: payment.id }, { $set: { amount: 1 } });
    await assert.rejects(verifyManualPayment({ paymentId: payment.id }), /match/);
    assert.equal((await Invoice.findById(invoice.id)).status, 'submitted');
    assert.equal((await Payment.findById(payment.id)).status, 'pending');
});

test('submission rollback leaves no orphan payment and old payable invoices remain discoverable', async t => {
    const f = await setup(t); const invoice = success(await f.create());
    const original = Invoice.prototype.save;
    Invoice.prototype.save = async function(options) { if (this.status === 'submitted') throw new Error('Injected invoice failure'); return original.call(this, options); };
    try { assert.equal((await f.submit(invoice)).status, 400); } finally { Invoice.prototype.save = original; }
    assert.equal(await Payment.countDocuments(), 0);
    assert.equal((await Invoice.findById(invoice.id)).status, 'unpaid');
    assert.equal(await Job.countDocuments({ queue: 'billing-notifications' }), 0);
    const base = (await Invoice.findById(invoice.id)).toObject();
    await Invoice.insertMany(Array.from({ length: 25 }, (_, i) => ({ ...base, _id: undefined, invoiceNumber: `history-${i}`, status: 'paid', createdAt: new Date(Date.now() + i + 1) })));
    assert.equal((await f.client.get('/api/admin/billing/invoices?limit=20')).body.pagination.pages, 2);
    const payable = await f.client.get('/api/admin/billing/invoices?payable=true');
    assert.equal(payable.body.data.length, 1); assert.equal(payable.body.data[0].id, invoice.id);
});
