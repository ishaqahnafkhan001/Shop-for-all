process.env.OPENAI_API_KEY = 'synthetic-test-key';
process.env.OPENAI_MODEL = 'gpt-synthetic-test';
process.env.AI_ACCOUNTING_VERSION = '2';
process.env.REDIS_URL = '';
const assert = require('node:assert/strict');
const test = require('node:test');
const { Responses } = require('openai/resources/responses/responses');
const { createLaunchSafetyContext, Shop, Product, Order, setShopPlan } = require('../helpers/launchSafetyHarness');
const Ledger = require('../../models/AiGenerationRequest');
const Revision = require('../../models/StoreBuilderRevision');
const { applySeoSuggestion, resolveHomepageSeo } = require('@scaleup/storefront-theme');

test('saved Product history and campaign drafts isolate tenants, compare versions, preserve manual edits and expire', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const vendor = ctx.vendorAClient(), foreign = ctx.vendorBClient();
    const shopId = ctx.data.shops.shopA._id, productId = String(ctx.data.products.productA.product._id);
    const History = require('../../models/AiContentHistory'), Draft = require('../../models/AiCampaignDraft');
    await Promise.all([History.createIndexes(), Draft.createIndexes()]);
    let calls = 0, requestedSchema, raw = { description: '<script>bad()</script>নীল সুতির পোশাক।', seoTitle: 'পোশাক', seoDescription: 'সুতির পোশাক দেখুন।', imageAlt: 'নীল পোশাক', buyingPrice: 1, stock: 900 };
    t.mock.method(Responses.prototype, 'create', async input => { requestedSchema = input.text.format.schema; calls++; return { status: 'completed', output_text: JSON.stringify(raw) }; });
    const requestId = crypto.randomUUID();
    const result = await vendor.unsafePost('/api/admin/products/ai/content-suggest', { entityId: productId, title: 'নীল পোশাক', requestedSections: ['description', 'seo', 'imageAlt'], requestId });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    const saved = await vendor.unsafePost('/api/admin/ai/history', { entityId: productId, operationId: requestId });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    const historyId = saved.body.data._id;
    assert.equal(saved.body.data.content.stock, undefined); assert.doesNotMatch(JSON.stringify(saved.body.data), /<script|bad\(\)|buyingPrice/);
    assert.equal((await vendor.unsafePost('/api/admin/ai/history', { entityId: productId, operationId: requestId })).body.data._id, historyId);
    assert.equal((await foreign.get(`/api/admin/ai/history?entityId=${productId}`)).status, 404);
    assert.equal((await foreign.get(`/api/admin/ai/history/${historyId}/review`)).status, 404);
    assert.equal((await foreign.unsafeDelete(`/api/admin/ai/history/${historyId}`)).status, 404);
    const staff = ctx.staffAClient();
    assert.equal((await staff.get(`/api/admin/ai/history/${historyId}/review`)).status, 200);
    await require('../../models/StaffPermission').updateOne({ membership_id: ctx.data.identities.staffA.membership._id }, { $set: { 'permissions.products': false } });
    assert.equal((await staff.get(`/api/admin/ai/history/${historyId}/review`)).status, 403);
    assert.equal((await staff.unsafeDelete(`/api/admin/ai/history/${historyId}`)).status, 403);
    let review = (await vendor.get(`/api/admin/ai/history/${historyId}/review`)).body.data;
    assert.equal(review.stale, false);
    await Product.updateOne({ _id: productId }, { $set: { title: 'Changed product' } });
    assert.equal((await vendor.unsafePost(`/api/admin/ai/history/${historyId}/apply`, { currentVersion: review.currentVersion, fields: ['description'] })).status, 409);
    review = (await vendor.get(`/api/admin/ai/history/${historyId}/review`)).body.data;
    assert.equal(review.stale, true);
    assert.equal((await vendor.unsafePost(`/api/admin/ai/history/${historyId}/apply`, { currentVersion: review.currentVersion, fields: ['stock'] })).status, 400);
    assert.equal((await vendor.unsafePost(`/api/admin/ai/history/${historyId}/apply`, { currentVersion: review.currentVersion, fields: ['description'] })).status, 200);
    assert.equal((await History.findById(historyId)).application.state, 'applied_to_form');
    const currentProduct = await Product.findById(productId);
    await require('../../services/ai/aiContentHistoryService').confirmProductSave(shopId, currentProduct, ctx.data.identities.vendorA.user._id);
    assert.equal((await History.findById(historyId)).application.state, 'applied_to_form');
    // On a replica set, exercise the actual domain transaction. Standalone accounting remains supported independently.
    if ((await require('mongoose').connection.db.admin().command({ hello: 1 })).setName) {
        const update = await vendor.unsafePatch(`/api/admin/products/${productId}`, { description: saved.body.data.content.description });
        assert.equal(update.status, 200, JSON.stringify(update.body));
        assert.equal((await History.findById(historyId)).application.state, 'saved');
    }
    for (let i = 0; i < 2; i++) assert.equal((await vendor.unsafePut(`/api/admin/ai/history/${historyId}/feedback`, { reason: 'useful' })).status, 200);
    assert.equal((await vendor.unsafePut(`/api/admin/ai/history/${historyId}/feedback`, { reason: 'private free text' })).status, 400);
    assert.equal(calls, 1);

    const detail = (await vendor.get(`/api/admin/growth/products/${productId}?range=7`)).body.data;
    raw = { primaryText: 'Review this cotton garment.', headline: 'Cotton garment', description: 'View the details.', callToAction: 'Shop Now' };
    const growthId = crypto.randomUUID();
    const generated = await vendor.unsafePost('/api/admin/growth/generate-ad-copy', { productId, range: 7, interval: detail.interval, requestId: growthId });
    assert.equal(generated.status, 200, JSON.stringify(generated.body));
    const input = { productId, name: 'Launch draft', operationId: growthId, appliedFields: ['primaryText', 'headline', 'description', 'callToAction'], content: Object.fromEntries(['primaryText', 'headline', 'description', 'callToAction'].map(key => [key, generated.body.data[key]])) };
    const campaign = await vendor.unsafePost('/api/admin/growth/campaign-drafts', input);
    assert.equal(campaign.status, 200, JSON.stringify(campaign.body));
    const id = campaign.body.data._id;
    assert.equal((await staff.get(`/api/admin/growth/campaign-drafts?productId=${productId}`)).status, 403);
    assert.equal((await staff.unsafePut(`/api/admin/growth/campaign-drafts/${id}`, { ...input, version: 1 })).status, 403);
    assert.equal(campaign.body.data.evidence.interval.from, detail.interval.from);
    assert.equal(campaign.body.data.provenance.fieldOrigins.headline.source, 'provider');
    const changed = await vendor.unsafePut(`/api/admin/growth/campaign-drafts/${id}`, { ...input, operationId: undefined, version: 1, content: { ...input.content, headline: 'Merchant edited headline' } });
    assert.equal(changed.status, 200, JSON.stringify(changed.body));
    assert.equal(changed.body.data.provenance.fieldOrigins.headline.source, 'manual');
    assert.equal((await vendor.unsafePut(`/api/admin/growth/campaign-drafts/${id}`, { ...input, version: 1 })).status, 409);
    assert.equal((await foreign.get(`/api/admin/growth/campaign-drafts?productId=${productId}`)).status, 404);
    assert.equal((await foreign.unsafePut(`/api/admin/growth/campaign-drafts/${id}`, { ...input, version: 2 })).status, 404);
    const duplicate = await vendor.unsafePost(`/api/admin/growth/campaign-drafts/${id}/duplicate`);
    assert.equal(duplicate.status, 200); assert.notEqual(duplicate.body.data._id, id);
    assert.equal(duplicate.body.data.content.headline, 'Merchant edited headline'); assert.equal(calls, 2);
    raw = { headline: 'A selected new headline' };
    const partial = await vendor.unsafePost('/api/admin/growth/generate-ad-copy', { productId, range: 7, interval: detail.interval, requestedFields: ['headline'] });
    assert.equal(partial.status, 200, JSON.stringify(partial.body)); assert.equal(partial.body.data.meta.source, 'provider');
    assert.equal(partial.body.data.primaryText, undefined); assert.deepEqual(requestedSchema.required, ['headline']);
    assert.equal((await Draft.findById(id)).content.headline, 'Merchant edited headline');
    const callsBefore = calls;
    assert.equal((await vendor.unsafePost('/api/admin/growth/generate-ad-copy', { productId, requestedFields: ['stock'] })).status, 400);
    assert.equal(calls, callsBefore);
    await Draft.updateOne({ _id: id }, { $set: { 'evidence.interval.to': new Date(Date.now() - 2 * 86400000) } });
    await Product.updateOne({ _id: productId }, { $set: { 'pricing.sellingPrice': 999 } });
    const listed = (await vendor.get(`/api/admin/growth/campaign-drafts?productId=${productId}`)).body.data.find(item => item._id === id);
    assert.equal(listed.evidenceStale, true); assert.equal(listed.productChanged, true);
    assert.equal(listed.currentProduct.sellingPrice, 999);
    await History.updateOne({ _id: historyId }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await vendor.get(`/api/admin/ai/history/${historyId}/review`)).status, 404);
    assert.equal((await vendor.unsafeDelete(`/api/admin/growth/campaign-drafts/${id}`)).status, 200);
    assert.equal((await Product.findById(productId)).pricing.sellingPrice, 999);
});

test('concurrent campaign creation cannot exceed the tenant storage limit on either Mongo topology', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const Draft = require('../../models/AiCampaignDraft');
    const { createBoundedContent } = require('../../services/ai/aiContentStorage');
    await Draft.createIndexes();
    const data = { shopId: ctx.data.shops.shopA._id, productId: ctx.data.products.productA.product._id, name: 'Bounded fixture', content: {}, evidence: {}, provenance: {}, expiresAt: new Date(Date.now() + 86400000) };
    const results = await Promise.allSettled(Array.from({ length: 56 }, () => createBoundedContent(Draft, data)));
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 50);
    assert.equal(await Draft.countDocuments({ shopId: data.shopId }), 50);
    assert.ok(results.filter(result => result.status === 'rejected').every(result => result.reason.code === 'AI_CONTENT_CAPACITY'));
    assert.equal(await Draft.countDocuments({ shopId: ctx.data.shops.shopB._id }), 0);
});

test('content index migration is additive, dry-run by default, idempotent and required for writes', async t => {
    await createLaunchSafetyContext(t);
    const Draft = require('../../models/AiCampaignDraft');
    const { migrate } = require('../../scripts/migrate-ai-content-indexes');
    const { requireContentIndexes } = require('../../services/ai/aiContentStorage');
    await Draft.createIndexes();
    await Draft.collection.dropIndex('shopId_1_slot_1');
    assert.equal((await migrate()).applied, false);
    await assert.rejects(requireContentIndexes(Draft), { code: 'AI_CONTENT_SETUP_REQUIRED' });
    assert.equal((await migrate({ apply: true })).applied, true);
    const first = await Draft.collection.indexes();
    await migrate({ apply: true });
    assert.deepEqual(await Draft.collection.indexes(), first);
    await requireContentIndexes(Draft);
});

test('HTTP preferences are tenant scoped, versioned, staff protected and survive reload without public projection', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const vendor = ctx.vendorAClient();
    const input = { version: 0, language: 'bn', tone: 'friendly', length: 'concise', terminology: ['সুতি'], avoidPhrases: ['সেরা'], brandDescription: 'বাংলার পোশাক।' };
    const saved = await vendor.unsafePut('/api/admin/ai/preferences', input);
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(saved.body.data.version, 1);
    assert.equal((await vendor.get('/api/admin/ai/preferences')).body.data.language, 'bn');
    assert.equal((await ctx.vendorBClient().get('/api/admin/ai/preferences')).body.data.language, 'auto');
    assert.equal((await vendor.unsafePut('/api/admin/ai/preferences', input)).status, 409);
    assert.equal((await ctx.staffAClient().unsafePut('/api/admin/ai/preferences', input)).status, 403);
    assert.equal((await vendor.unsafePut('/api/admin/ai/preferences', { ...input, version: 1, language: 'bad' })).status, 400);
    assert.equal((await Shop.findById(ctx.data.shops.shopA._id).lean()).aiPreferences, undefined);
    const created = await vendor.unsafePost('/api/admin/collections', { title: 'শাড়ি', slug: 'শাড়ি' });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.ok(created.body.data.slug);
    const edited = await vendor.unsafePatch(`/api/admin/collections/${created.body.data._id}`, { description: 'সুতির শাড়ি।' });
    assert.equal(edited.status, 200); assert.equal(edited.body.data.slug, created.body.data.slug);
});

test('HTTP CSRF, revoked session, billing suspension, pending capacity and exhausted allowance prevent provider work', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const vendor = ctx.vendorAClient(), shopId = ctx.data.shops.shopA._id;
    const Usage = require('../../models/PlanUsage');
    const { getUtcWeekWindow } = require('../../services/billing/planUsageService');
    let calls = 0;
    t.mock.method(Responses.prototype, 'create', () => { calls++; throw new Error('Must not reach provider'); });
    const routes = ['/api/admin/products/ai/content-suggest', '/api/admin/collections/ai/suggest', '/api/store-builder/admin/seo/ai-suggest', '/api/admin/growth/generate-ad-copy', '/api/admin/generate-description'];
    const body = () => ({ title: 'Shirt', productId: String(ctx.data.products.productA.product._id), requestedSections: ['description'], requestId: crypto.randomUUID() });
    for (const route of routes) assert.equal((await vendor.post(route, body())).status, 403, route);
    const { start, end } = getUtcWeekWindow();
    await Usage.create({ shopId, metric: 'aiProductCreations', periodStart: start, periodEnd: end, used: 0, reserved: 2, accountingVersion: 2,
        receipts: [1, 2].map(() => ({ owner: new (require('mongoose').Types.ObjectId)(), state: 'reserved', fence: 1, deadline: new Date(Date.now() + 60000) })) });
    for (const route of routes) { const response = await vendor.unsafePost(route, body()); assert.equal(response.status, 409, JSON.stringify(response.body)); assert.equal(response.body.code, 'AI_CAPACITY_PENDING'); }
    await setShopPlan({ shopId, plan: ctx.data.plans.growth });
    await Usage.updateOne({ shopId }, { $set: { used: 100000, reserved: 0, receipts: [] } });
    for (const route of routes) { const response = await vendor.unsafePost(route, body()); assert.equal(response.status, 403, JSON.stringify(response.body)); }
    await Shop.updateOne({ _id: shopId }, { $set: { isActive: false, approvalStatus: 'Suspended', suspensionReason: 'billing' } });
    for (const route of routes) assert.ok([401, 403].includes((await vendor.unsafePost(route, body())).status));
    await Shop.updateOne({ _id: shopId }, { $set: { isActive: true, approvalStatus: 'Approved', suspensionReason: '' } });
    await require('../../models/User').updateMany({ shop_id: shopId, role: 'VendorAdmin' }, { $inc: { sessionVersion: 1 } });
    for (const route of routes) assert.equal((await vendor.unsafePost(route, body())).status, 401);
    assert.equal(calls, 0);
});

test('HTTP SEO generation, Apply, draft reload and publication preserve provider and fallback origin in the shared resolver', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const { shopA, shopB } = ctx.data.shops;
    let output; let calls = 0;
    t.mock.method(Responses.prototype, 'create', async () => {
        calls++; return { status: 'completed', output_text: JSON.stringify(output) };
    });
    const vendor = ctx.vendorAClient();
    for (const origin of ['provider', 'deterministic_fallback']) {
        output = origin === 'provider' ? { alternatives: [1, 2, 3].map(i => ({ id: `option-${i}`,
            title: `${shopA.shopName} - Option ${i}`, description: `Browse ${shopA.shopName} products and collections ${i}.` })) } : {};
        const requestId = crypto.randomUUID();
        const generated = await vendor.unsafePost('/api/store-builder/admin/seo/ai-suggest', { requestId });
        assert.equal(generated.status, 200, JSON.stringify(generated.body));
        const result = generated.body.data;
        assert.equal(result.meta.source, origin);
        const applied = applySeoSuggestion({}, result, result.alternatives[0]);
        const before = await Shop.findById(shopA._id).lean();
        const saved = await vendor.unsafePut('/api/store-builder/admin/seo/draft', { seo: applied, basedOnRevision: before.themeRevision || 0 });
        assert.equal(saved.status, 200, JSON.stringify(saved.body));
        const reload = await vendor.get('/api/store-builder/admin/seo/bootstrap');
        assert.equal(reload.status, 200);
        assert.equal(reload.body.data.resolvedSeo.origin.title, origin);
        const published = await vendor.unsafePost('/api/store-builder/admin/seo/publish', { seo: reload.body.data.draft.seo, expectedRevision: before.themeRevision || 0 });
        assert.equal(published.status, 200, JSON.stringify(published.body));
        const shop = await Shop.findById(shopA._id).lean();
        assert.equal(resolveHomepageSeo({ seo: shop.theme.seo }).origin.title, origin);
        const revision = await Revision.findOne({ shop_id: shopA._id }).sort({ revision: -1 }).lean();
        assert.ok(revision);
        assert.equal(resolveHomepageSeo({ seo: revision.theme.seo }).origin.description, origin);
        const replay = await vendor.unsafePost('/api/store-builder/admin/seo/ai-suggest', { requestId });
        assert.equal(replay.body.replayed, true); assert.ok(replay.body.usage);
    }
    assert.equal(calls, 2);
    assert.equal(await Ledger.countDocuments({ shopId: shopB._id }), 0);
    assert.equal((await Shop.findById(shopB._id)).theme.seo.title || '', '');
});

test('HTTP AI authorization, tenant ownership, image safety and fixed Growth evidence boundaries', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const { shopA, shopB } = ctx.data.shops;
    const productA = ctx.data.products.productA.product;
    const productB = ctx.data.products.productB.product;
    const vendor = ctx.vendorAClient();
    const Collection = require('../../models/Collection');
    const AnalyticsEvent = require('../../models/AnalyticsEvent');
    let output = { description: 'A grounded product description.' }, calls = 0, parts;
    t.mock.method(Responses.prototype, 'create', async request => {
        calls++; parts = request.input[0].content;
        return { status: 'completed', output_text: JSON.stringify(output), usage: { input_tokens: 12, output_tokens: 8, total_tokens: 20 } };
    });
    const routes = ['/api/admin/products/ai/content-suggest', '/api/admin/collections/ai/suggest',
        '/api/store-builder/admin/seo/ai-suggest', '/api/admin/growth/generate-ad-copy', '/api/admin/generate-description'];
    for (const route of routes) {
        assert.equal((await ctx.client().unsafePost(route, {})).status, 401);
        assert.equal((await ctx.customerAClient().unsafePost(route, {})).status, 403);
    }
    assert.equal((await ctx.staffAClient().unsafePost('/api/store-builder/admin/seo/ai-suggest', {})).status, 403);
    assert.equal(calls, 0);
    for (const productIds of [[String(productB._id)], ['bad-id'], [String(productA._id), String(productB._id)]]) {
        assert.equal((await vendor.unsafePost('/api/admin/collections', { title: 'Invalid', productIds })).status, 400);
        assert.equal((await vendor.unsafePost('/api/admin/collections/ai/suggest', { title: 'Invalid', productIds })).status, 400);
    }
    assert.equal(await Collection.countDocuments({ shop_id: shopA._id }), 0);
    assert.equal(calls, 0);
    const collection = await vendor.unsafePost('/api/admin/collections', { title: 'Owned products', productIds: [String(productA._id)] });
    assert.equal(collection.status, 201, JSON.stringify(collection.body));
    assert.equal((await vendor.unsafePatch(`/api/admin/collections/${collection.body.data._id}`, { productIds: [String(productB._id)] })).status, 400);
    assert.deepEqual((await Collection.findById(collection.body.data._id)).productIds.map(String), [String(productA._id)]);

    const imageUrl = 'https://res.cloudinary.com/test/image/upload/foreign-product.png';
    await Product.updateOne({ _id: productB._id }, { $set: { images: [imageUrl] } });
    const imageRequest = { title: 'Public shirt', requestedSections: ['description'], imageUrl, requestId: crypto.randomUUID(),
        buyingPrice: 'PRIVATE_COST', comments: [{ title: 'Internal note', value: 'PRIVATE_NOTE' }] };
    const generated = await vendor.unsafePost(routes[0], imageRequest);
    assert.equal(generated.status, 200, JSON.stringify(generated.body));
    assert.equal(generated.body.usedImage, false);
    assert.equal(parts.length, 1);
    assert.doesNotMatch(parts[0].text, /PRIVATE_COST|PRIVATE_NOTE|foreign-product/);
    const row = await Ledger.findOne({ shopId: shopA._id, requestId: imageRequest.requestId }).lean();
    assert.match(row.contextHash, /^[a-f0-9]{64}$/);
    assert.equal(row.attempts.length, 1);
    assert.equal(row.attempts[0].outcome, 'response');
    assert.equal(row.attempts[0].totalTokens, 20);
    assert.equal(row.attempts[0].provider, 'openai');
    assert.equal(row.provenance.provider, 'openai');
    assert.equal(row.settlement, 'consumed');
    assert.equal((await vendor.unsafePost(routes[0], { ...imageRequest, title: 'Changed' })).body.code, 'AI_REQUEST_INPUT_CONFLICT');

    await Product.updateOne({ _id: productA._id }, { $set: { category: 'clothing', tags: ['clothing'] } });
    const detail = await vendor.get(`/api/admin/growth/products/${productA._id}?range=7`);
    assert.equal(detail.status, 200);
    const interval = detail.body.data.interval;
    const from = new Date(interval.from), to = new Date(interval.to);
    assert.equal(+from, +require('../../services/orders/reportingMetrics').reportInterval({ range: '7' }, to).from);
    await AnalyticsEvent.create([
        ...[0, 1, 2].map(i => ({ shop_id: shopA._id, eventType: 'search', sessionId: `safe-${i}`, metadata: { query: 'clothing' }, createdAt: new Date(+to - 1000) })),
        ...[0, 1, 2].map(i => ({ shop_id: shopA._id, eventType: 'search', sessionId: `unsafe-${i}`, metadata: { query: 'clothing secret@example.com 01711111111' }, createdAt: new Date(+to - 1000) })),
        { shop_id: shopA._id, eventType: 'product_view', sessionId: 'future', product_id: productA._id, createdAt: new Date(+to + 1000) }
    ]);
    output = { primaryText: 'Compare clothing details.', headline: 'Clothing selection', description: 'Review options before ordering.', callToAction: 'Shop Now', targetedAgeRange: '18-45' };
    const growth = await vendor.unsafePost(routes[3], { productId: String(productA._id), range: 7, interval, requestId: crypto.randomUUID() });
    assert.equal(growth.status, 200, JSON.stringify(growth.body));
    assert.equal(growth.body.data.meta.evidenceWindow.from, interval.from);
    assert.equal(growth.body.data.meta.source, 'mixed');
    assert.match(parts[0].text, /Clothing/);
    assert.doesNotMatch(parts[0].text, /secret@example|01711111111/);
    assert.equal(growth.body.data.meta.evidence.find(item => item.id === 'product.views').value, detail.body.data.metrics.views);
    const beforeDenied = calls;
    assert.equal((await vendor.unsafePost(routes[3], { productId: String(productB._id), range: 7, interval })).status, 404);
    assert.equal((await vendor.unsafePost(routes[3], { productId: String(productA._id), range: 90, interval })).status, 400);
    await setShopPlan({ shopId: shopA._id, plan: ctx.data.plans.beginner });
    for (const route of routes) assert.equal((await vendor.unsafePost(route, { title: 'Denied', productId: String(productA._id) })).status, 403);
    assert.equal(calls, beforeDenied);
    assert.equal(await Ledger.countDocuments({ shopId: shopB._id }), 0);
    assert.equal((await vendor.get('/api/super-admin/settings')).status, 403);
    const health = await require('../../services/ai/aiHealthService').getAiHealth();
    assert.equal(health.configured, true);
    assert.equal(health.attempts.response, 2);
    assert.ok(health.lastAcceptedGenerationAt);
    assert.equal(health.providerCost, null);
    assert.equal(JSON.stringify(health).includes('synthetic-test-key'), false);
});

test('legacy description route uses OpenAI, replays once and health excludes previous-provider activity', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const shopId = ctx.data.shops.shopA._id;
    const vendor = ctx.vendorAClient();
    const { getAiHealth } = require('../../services/ai/aiHealthService');
    await Ledger.create({ shopId, requestId: crypto.randomUUID(), feature: 'product.content', accountingVersion: 2,
        status: 'completed', source: 'provider', provenance: { model: 'gemini-legacy' }, accountingAcknowledgedAt: new Date(),
        attempts: [{ outcome: 'response', startedAt: new Date(), totalTokens: 999 }] });
    const before = await getAiHealth();
    assert.equal(before.provider, 'openai');
    assert.equal(before.state, 'no_recent_attempts');
    assert.equal(before.lastAcceptedGenerationAt, null);
    assert.equal(before.reportedTokens, 0);
    let calls = 0;
    t.mock.method(Responses.prototype, 'create', async input => {
        calls++;
        assert.equal(input.model, 'gpt-synthetic-test');
        assert.equal(input.store, false);
        assert.equal(input.text.format.strict, true);
        return { status: 'completed', output_text: '{"description":"A cotton shirt for everyday wear."}',
            usage: { input_tokens: 8, output_tokens: 4, total_tokens: 12 } };
    });
    const body = { title: 'Cotton shirt', requestId: crypto.randomUUID() };
    const response = await vendor.unsafePost('/api/admin/generate-description', body);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.meta.provider, 'openai');
    assert.equal(response.body.description, 'A cotton shirt for everyday wear.');
    const replay = await vendor.unsafePost('/api/admin/generate-description', body);
    assert.equal(replay.body.replayed, true);
    assert.equal(calls, 1);
    const row = await Ledger.findOne({ shopId, requestId: body.requestId }).lean();
    assert.equal(row.settlement, 'consumed');
    assert.equal(row.feature, 'legacy.product_description');
    assert.equal(row.provenance.provider, 'openai');
    const after = await getAiHealth();
    assert.equal(after.state, 'recent_responses_observed');
    assert.equal(after.attempts.response, 1);
    assert.equal(after.reportedTokens, 12);
    assert.ok(after.lastAcceptedGenerationAt);
});
