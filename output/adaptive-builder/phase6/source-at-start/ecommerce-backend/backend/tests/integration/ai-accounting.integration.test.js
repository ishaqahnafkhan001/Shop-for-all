const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const Ledger = require('../../models/AiGenerationRequest');
const Usage = require('../../models/PlanUsage');
const policy = require('../../services/ai/aiGenerationPolicyService');
const recovery = require('../../services/ai/aiAccountingRecoveryService');
const quota = require('../../services/billing/planUsageService');
const { migrateAiAccounting } = require('../../scripts/migrate-ai-accounting');

const uri = process.env.MONGO_URI_TEST;
const assertDisposable = () => {
    assert.ok(/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/ai_accounting_test_[a-zA-Z0-9_]+(?:\?|$)/.test(uri || ''),
        'Set MONGO_URI_TEST to a disposable loopback ai_accounting_test_* database. No application .env is loaded.');
};
const request = (shopId = new mongoose.Types.ObjectId(), id = crypto.randomUUID(), limit = 10) => ({
    tenantId: shopId, user: { _id: new mongoose.Types.ObjectId() }, body: { title: 'নীল শাড়ি', requestId: id },
    planAccess: { limits: { aiProductCreationsPerWeek: limit } }
});
const begin = async req => {
    await require('../../models/Shop').collection.updateOne({ _id: req.tenantId }, { $setOnInsert: { shopName: 'Accounting fixture', subdomain: String(req.tenantId) } }, { upsert: true });
    return policy.beginAiGeneration({ req, feature: 'product.content' });
};
const complete = (req, state) => policy.completeAiGeneration({ req, state, result: { success: true, data: { description: 'নীল শাড়ি।' } }, meta: { source: 'provider' } });
const fail = (req, state) => policy.failAiGeneration({ req, state, error: { code: 'TEST_FAILURE' } });
const row = shopId => Usage.findOne({ shopId }).lean();
const ledger = state => Ledger.findById(state.recordId).lean();
const expire = async (state) => {
    await Ledger.updateOne({ _id: state.recordId }, { $set: { deadline: new Date(Date.now() - 1000) } });
};
const faultAfter = (t, model, method, predicate) => {
    const original = model[method].bind(model);
    let fired = false;
    return t.mock.method(model, method, function (...args) {
        const query = original(...args);
        const shouldFail = !fired && predicate(...args);
        if (!shouldFail) return query;
        fired = true;
        if (method === 'findOneAndUpdate') {
            const lean = query.lean.bind(query);
            query.lean = async () => { await lean(); throw new Error('Injected acknowledged-write response loss'); };
            return query;
        }
        return (async () => { await query; throw new Error('Injected acknowledged-write response loss'); })();
    });
};

test.before(async () => {
    assertDisposable();
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    await Promise.all([Ledger.init(), Usage.init()]);
});
test.beforeEach(async () => { await Promise.all([Ledger.deleteMany({}), Usage.deleteMany({})]); });
test.after(async () => { if (mongoose.connection.readyState) { assertDisposable(); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); } });

test('A/B concurrent settlement owns receipts and cannot release another request', async () => {
    const a = request(); const b = request(a.tenantId);
    const [sa, sb] = await Promise.all([begin(a), begin(b)]);
    await Promise.all([complete(a, sa), complete(a, sa), fail(b, sb), fail(b, sb)]);
    await fail(a, sa);
    assert.equal((await row(a.tenantId)).used, 1);
    assert.equal((await row(a.tenantId)).reserved, 0);
    assert.equal((await ledger(sa)).status, 'completed');
    assert.equal((await ledger(sb)).status, 'failed');
});

test('same ID replays fresh usage; changed input conflicts; tenant cannot replay or settle another tenant', async () => {
    const a = request(); const sa = await begin(a); await complete(a, sa);
    const b = request(a.tenantId); await begin(b);
    await assert.rejects(begin(a), error => {
        assert.equal(error.code, 'AI_REQUEST_REPLAY');
        assert.equal(policy.getReplayResponse(error).usage.pending, 1);
        return true;
    });
    await assert.rejects(begin({ ...a, body: { ...a.body, title: 'Changed' } }), { code: 'AI_REQUEST_INPUT_CONFLICT' });
    const foreign = request(undefined, a.body.requestId);
    const sf = await begin(foreign);
    await fail(foreign, sa);
    assert.equal((await ledger(sa)).status, 'completed');
    assert.equal((await ledger(sf)).status, 'in_progress');
    assert.equal((await row(foreign.tenantId)).used, 0);
});

test('finite allowance counts pending; unlimited still has concurrency limits', async () => {
    const a = request(undefined, undefined, 1); await begin(a);
    await assert.rejects(begin(request(a.tenantId, undefined, 1)), { code: 'PLAN_LIMIT_REACHED' });
    assert.equal((await quota.getWeeklyAiUsage({ shopId: a.tenantId, limit: 1 })).available, 0);
    const unlimited = request(undefined, undefined, null);
    await Promise.all([begin(unlimited), begin(request(unlimited.tenantId, undefined, null))]);
    await assert.rejects(begin(request(unlimited.tenantId, undefined, null)), { code: 'AI_CAPACITY_PENDING' });
});

test('crash after ledger creation keeps unresolved evidence, closes late admission and then assigns TTL', async t => {
    const a = request();
    const mock = t.mock.method(Usage, 'updateOne', () => { throw new Error('Database unavailable'); });
    await assert.rejects(begin(a)); mock.mock.restore();
    const record = await Ledger.findOne({ shopId: a.tenantId }).lean();
    assert.equal(record.expiresAt, undefined);
    await expire({ recordId: record._id });
    await recovery.reconcileStaleAiOperations();
    const final = await Ledger.findById(record._id).lean();
    assert.equal(final.status, 'failed'); assert.ok(final.expiresAt); assert.ok(final.accountingAcknowledgedAt);
    await assert.rejects(quota.reserveWeeklyAiUsage({ shopId: record.shopId, owner: record._id,
        periodStart: record.quotaPeriodStart, periodEnd: record.quotaPeriodEnd, deadline: final.deadline, limit: 10 }));
    assert.equal((await row(a.tenantId)).reserved, 0);
});

test('reserve response loss and ledger-running write loss both recover only their own reservation', async t => {
    for (const boundary of ['reserve', 'running']) {
        const a = request(); const b = request(a.tenantId); const sb = await begin(b);
        const mock = boundary === 'reserve'
            ? faultAfter(t, Usage, 'findOneAndUpdate', (_, update) => Boolean(update.$push?.receipts))
            : faultAfter(t, Ledger, 'updateOne', (_, update) => update.$set?.status === 'in_progress');
        await assert.rejects(begin(a)); mock.mock.restore();
        const record = await Ledger.findOne({ shopId: a.tenantId, requestId: a.body.requestId }).lean();
        await expire({ recordId: record._id });
        await Promise.all([recovery.reconcileStaleAiOperations(), recovery.reconcileStaleAiOperations()]);
        assert.equal((await row(a.tenantId)).reserved, 1);
        assert.equal((await ledger(sb)).status, 'in_progress');
        assert.equal((await Ledger.findById(record._id)).status, 'failed');
    }
});

test('every completion write boundary recovers the durable result without double consumption', async t => {
    const boundaries = ['outcome', 'settlement', 'acknowledgement', 'prune', 'ttl'];
    for (const boundary of boundaries) {
        const a = request(); const sa = await begin(a);
        let mock;
        if (boundary === 'outcome') mock = faultAfter(t, Ledger, 'updateOne', (_, update) => update.$set?.status === 'outcome_ready');
        if (boundary === 'settlement') mock = faultAfter(t, Usage, 'updateOne', (_, update) => update.$set?.['receipts.$.state'] === 'consumed');
        if (boundary === 'acknowledgement') mock = faultAfter(t, Ledger, 'findOneAndUpdate', (_, update) => Boolean(update.$set?.accountingAcknowledgedAt));
        if (['prune', 'ttl'].includes(boundary)) {
            await complete(a, sa); await expire(sa);
            mock = boundary === 'prune'
                ? faultAfter(t, Usage, 'updateOne', (_, update) => Boolean(update.$pull))
                : faultAfter(t, Ledger, 'findOneAndUpdate', (_, update) => Boolean(update.$set?.receiptPrunedAt));
            await recovery.reconcileStaleAiOperations();
        } else {
            await assert.rejects(complete(a, sa));
            // Controller catch cannot reverse a previously persisted successful outcome.
            await fail(a, sa);
        }
        mock.mock.restore(); await expire(sa);
        await Promise.all([recovery.reconcileStaleAiOperations(), recovery.reconcileStaleAiOperations()]);
        await recovery.reconcileStaleAiOperations();
        const final = await ledger(sa); const usage = await row(a.tenantId);
        assert.equal(final.status, 'completed', boundary); assert.ok(final.result, boundary);
        assert.ok(final.expiresAt, boundary); assert.ok(final.receiptPrunedAt, boundary);
        assert.equal(usage.used, 1, boundary); assert.equal(usage.reserved, 0, boundary);
        assert.equal(usage.receipts.length, 0, boundary);
    }
});

test('stale running operation is fenced; late result cannot replace unknown failure', async () => {
    const a = request(); const sa = await begin(a); await expire(sa);
    await Promise.all([recovery.reconcileStaleAiOperations(), recovery.reconcileStaleAiOperations()]);
    await assert.rejects(complete(a, sa), { code: 'AI_RESULT_NOT_ACCEPTED' });
    const final = await ledger(sa);
    assert.equal(final.providerOutcome, 'unknown'); assert.equal(final.fence, 2);
    assert.equal((await row(a.tenantId)).used, 0);
});

test('original week is immutable and settlement never debits a new week', async () => {
    const a = request(); const sa = await begin(a);
    const sb = await begin(request(a.tenantId));
    const original = await row(a.tenantId);
    const old = new Date(original.periodStart.getTime() - 7 * 86400000);
    const receipt = original.receipts.find(item => String(item.owner) === String(sa.recordId));
    await Usage.updateOne({ _id: original._id }, { $inc: { reserved: -1 }, $pull: { receipts: { owner: sa.recordId } } });
    await Usage.create({ shopId: a.tenantId, metric: quota.AI_METRIC, periodStart: old,
        periodEnd: original.periodStart, accountingVersion: 2, used: 0, reserved: 1, receipts: [receipt] });
    await Ledger.collection.updateOne({ _id: sa.recordId }, { $set: { quotaPeriodStart: old } });
    await assert.rejects(begin(request(a.tenantId)), { code: 'AI_CAPACITY_PENDING' });
    await complete(a, sa);
    assert.equal((await Usage.findOne({ shopId: a.tenantId, periodStart: old })).used, 1);
    const current = await quota.getWeeklyAiUsage({ shopId: a.tenantId, limit: 10 });
    assert.equal(current.used, 0); assert.equal(current.pending, 1);
    assert.equal((await ledger(sb)).status, 'in_progress');
});

test('settled receipt remains a tombstone until deadline; repeated admission cannot recreate it', async () => {
    const a = request(); const sa = await begin(a); await complete(a, sa);
    const record = await ledger(sa);
    assert.equal(record.expiresAt, undefined); assert.ok(record.accountingAcknowledgedAt);
    await assert.rejects(quota.reserveWeeklyAiUsage({ ...sa.reservation, periodEnd: record.quotaPeriodEnd,
        deadline: record.deadline, limit: 10 }));
    assert.equal((await row(a.tenantId)).reserved, 0);
    await expire(sa); await recovery.reconcileStaleAiOperations();
    assert.ok((await ledger(sa)).expiresAt);
});

test('migration is dry-run, preserves used, refuses ambiguous legacy, and is idempotent', async () => {
    const shopId = new mongoose.Types.ObjectId(); const { start, end } = quota.getUtcWeekWindow();
    await Usage.create({ shopId, metric: quota.AI_METRIC, periodStart: start, periodEnd: end, used: 4, reserved: 1 });
    assert.equal((await migrateAiAccounting()).blocked, true);
    await assert.rejects(migrateAiAccounting({ apply: true, writersQuiesced: true }));
    assert.equal((await row(shopId)).accountingVersion, undefined);
    await Usage.updateOne({ shopId }, { $set: { reserved: 0 } }); // Explicit fixture operator adjustment.
    await assert.rejects(migrateAiAccounting({ apply: true }));
    assert.equal((await migrateAiAccounting({ apply: true, writersQuiesced: true })).modified, 1);
    assert.equal((await migrateAiAccounting({ apply: true, writersQuiesced: true })).modified, 0);
    assert.equal((await row(shopId)).used, 4);
});
