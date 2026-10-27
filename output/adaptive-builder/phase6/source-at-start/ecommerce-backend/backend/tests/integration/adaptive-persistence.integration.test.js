'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { execFile, execFileSync } = require('node:child_process');
const Module = require('node:module');
const path = require('node:path');
const { Shop, createLaunchSafetyContext, setShopPlan } = require('../helpers/launchSafetyHarness');
const Draft = require('../../models/StoreBuilderDraft');
const Revision = require('../../models/StoreBuilderRevision');
const Asset = require('../../models/StoreBuilderAsset');
const Audit = require('../../models/AuditLog');
const { cloudinary } = require('../../config/cloudinary');
const service = require('../../services/storeBuilder/storeBuilderService');
const seo = require('../../services/storeBuilder/storeBuilderSeoService');
const media = require('../../services/storeBuilder/storeBuilderAssetService');
const policy = require('../../services/storeBuilder/adaptivePersistencePolicy');
const { normalizeStoredTheme } = require('@scaleup/storefront-theme/storage');
const { fixture, sizedFixture } = require('../fixtures/adaptive-builder/contract-fixtures.cjs');

async function setup(t, { published = false, graph = fixture() } = {}) {
    const ctx = await createLaunchSafetyContext(t);
    // The existing verification middleware synchronizes synthetic registration
    // metadata on first write. Establish that state before the immutable snapshot.
    const warm = await ctx.vendorAClient().unsafePatch('/api/store-builder/admin', { theme: { version: 99 } });
    assert.ok(warm.status >= 400);
    const shopId = ctx.data.shops.shopA._id;
    const req = { tenantId: shopId, user: ctx.data.identities.vendorA.user.toObject() };
    let theme = normalizeStoredTheme({ version: 5, siteBuilder: graph, migrations: { bannerSectionsV1: true } });
    if (published) {
        await Shop.updateOne({ _id: shopId }, { $set: { theme } }, { runValidators: true });
        theme = JSON.parse(JSON.stringify((await Shop.findById(shopId).lean()).theme));
    }
    return { ...ctx, shopId, req, theme };
}
function allowInternal(t) {
    // In-memory method mock in this isolated process, never an HTTP bypass or flag.
    t.mock.method(policy, 'assertAdaptiveThemeMutation', async () => {});
}
const publish = (ctx, extra = {}) => service.publishStoreBuilder({ shopId: ctx.shopId, req: ctx.req, theme: ctx.theme,
    expectedRevision: 0, audit: { action: 'adaptive.test.publish' }, ...extra });
const addImage = (theme, assetId, saved = false) => {
    const node = { type: 'content.image', content: { assetId: String(assetId), alt: 'Synthetic image' } };
    if (saved) theme.siteBuilder.savedSections.library = { name: 'Synthetic library', pageKind: 'home', rootOrder: ['library_image'], nodes: { library_image: node } };
    else {
        const home = theme.siteBuilder.templates.tpl_home;
        home.nodes.image_test = node; home.nodes.section_story.slots.body.push('image_test');
    }
};
const createAsset = (shopId, suffix, state = {}) => Asset.create({ shop_id: shopId, publicId: `adaptive-test-${suffix}`,
    url: `https://res.cloudinary.com/test/image/upload/${suffix}.png`, status: 'temporary', expiresAt: new Date(0), ...state });
const snapshot = async ctx => JSON.stringify({ shop: await Shop.findById(ctx.shopId).select('+adaptiveWriteLock').lean(),
    draft: await Draft.findOne({ shop_id: ctx.shopId }).lean(), revisions: await Revision.find({ shop_id: ctx.shopId }).lean(),
    assets: await Asset.find({ shop_id: ctx.shopId }).lean(), audits: await Audit.find({ shop_id: ctx.shopId }).lean() });
const sameSnapshot = (actual, expected) => assert.deepEqual(JSON.parse(actual), JSON.parse(expected));

for (const count of [14, 80, 200]) test(`real Mongoose preserves an exact ${count}-node v5 graph in Shop, draft and revision`, async t => {
    const ctx = await setup(t, { graph: sizedFixture(count) });
    const before = structuredClone(ctx.theme.siteBuilder);
    await Shop.updateOne({ _id: ctx.shopId }, { $set: { theme: ctx.theme } }, { runValidators: true });
    const document = await Shop.findById(ctx.shopId);
    await document.save();
    const draft = await Draft.create({ shop_id: ctx.shopId, theme: ctx.theme });
    const revision = await Revision.create({ shop_id: ctx.shopId, revision: 1, theme: ctx.theme });
    for (const theme of [document.toObject().theme, (await Shop.findById(ctx.shopId).lean()).theme,
        (await Draft.findById(draft._id).lean()).theme, (await Revision.findById(revision._id).lean()).theme]) {
        assert.deepEqual(theme.siteBuilder, before);
        assert.equal(theme.extensions?.unknown?.siteBuilder, undefined);
    }
});
test('model and API fences reject old clients, omissions, malformed graphs and future versions without data loss', async t => {
    const ctx = await setup(t, { published: true });
    const before = await snapshot(ctx);
    for (const theme of [{ version: 4 }, { version: 5 }, { version: 6 }, { version: 5, siteBuilder: {} }]) {
        await assert.rejects(Shop.updateOne({ _id: ctx.shopId }, { $set: { theme } }, { runValidators: true }));
        const response = await ctx.vendorAClient().unsafePatch('/api/store-builder/admin', { theme, expectedRevision: 0 });
        assert.ok(response.status >= 400, JSON.stringify(response.body));
        sameSnapshot(await snapshot(ctx), before);
    }
    const oldDocument = await Shop.findById(ctx.shopId); oldDocument.theme = { version: 4 };
    await assert.rejects(oldDocument.save(), { code: 'THEME_CLIENT_UPGRADE_REQUIRED' });
    await assert.rejects(Shop.updateOne({ _id: ctx.shopId }, { $unset: { 'theme.siteBuilder': 1 } }));
    sameSnapshot(await snapshot(ctx), before);
});
test('real routes, restoration and direct services cannot adopt even with submitted plan or rollout flags', async t => {
    const ctx = await setup(t);
    const before = await snapshot(ctx);
    const options = { shopId: ctx.shopId, req: ctx.req, theme: ctx.theme, basedOnRevision: 0,
        expectedDraftUpdatedAt: null, planAccess: { storeBuilderAccess: 'full' }, rollout: true };
    await assert.rejects(service.saveStoreBuilderDraft(options), { code: 'ADAPTIVE_ADOPTION_DISABLED' });
    await assert.rejects(publish(ctx), { code: 'ADAPTIVE_ADOPTION_DISABLED' });
    const response = await ctx.vendorAClient().unsafePatch('/api/store-builder/admin', { theme: ctx.theme, expectedRevision: 0, plan: 'pro', rollout: true });
    assert.equal(response.body.code, 'ADAPTIVE_ADOPTION_DISABLED');
    const revision = await Revision.create({ shop_id: ctx.shopId, revision: 1, theme: ctx.theme });
    await assert.rejects(service.restoreStoreBuilderRevision({ shopId: ctx.shopId, revisionId: revision._id, expectedRevision: 0, req: ctx.req }), { code: 'ADAPTIVE_ADOPTION_DISABLED' });
    await Revision.deleteOne({ _id: revision._id });
    sameSnapshot(await snapshot(ctx), before);
});
test('adaptive direct-service tenant, staff, identity and trusted plan checks fail closed', async t => {
    const ctx = await setup(t);
    for (const req of [undefined, { ...ctx.req, tenantId: ctx.data.shops.shopB._id },
        { ...ctx.req, user: ctx.data.identities.vendorB.user.toObject() }, { ...ctx.req, user: ctx.data.identities.staffA.user.toObject() }]) {
        await assert.rejects(publish(ctx, { req }), /authenticated store|cannot edit|permission/i);
    }
    await setShopPlan({ shopId: ctx.shopId, plan: ctx.data.plans.starter });
    await assert.rejects(service.saveStoreBuilderDraft({ shopId: ctx.shopId, req: ctx.req, theme: ctx.theme,
        basedOnRevision: 0, expectedDraftUpdatedAt: null, planAccess: { storeBuilderAccess: 'full' } }), { code: 'ADAPTIVE_PLAN_REQUIRED' });
});
test('old clients cannot replace a v5 draft on a v4 shop; concurrent CAS admits one writer', async t => {
    const ctx = await setup(t); allowInternal(t);
    const draft = await service.saveStoreBuilderDraft({ ...ctx, theme: ctx.theme, basedOnRevision: 0, expectedDraftUpdatedAt: null });
    const before = await snapshot(ctx);
    await assert.rejects(service.saveStoreBuilderDraft({ ...ctx, theme: { version: 4 }, basedOnRevision: 0 }), { code: 'THEME_CLIENT_UPGRADE_REQUIRED' });
    sameSnapshot(await snapshot(ctx), before);
    const options = { ...ctx, theme: ctx.theme, basedOnRevision: 0, expectedDraftUpdatedAt: draft.updatedAt.toISOString() };
    const results = await Promise.allSettled([service.saveStoreBuilderDraft(options), service.saveStoreBuilderDraft(options)]);
    assert.equal(results.filter(item => item.status === 'fulfilled').length, 1, JSON.stringify(results.map(item => item.reason?.message)));
    assert.equal(results.find(item => item.status === 'rejected').reason.code, 'DRAFT_CONFLICT');
});
test('nested and saved asset/product references enforce tenant ownership and reject unavailable media', async t => {
    const ctx = await setup(t);
    const foreign = await createAsset(ctx.data.shops.shopB._id, 'foreign'); addImage(ctx.theme, foreign._id, true);
    await assert.rejects(media.assertThemeAssetOwnership({ shopId: ctx.shopId, theme: ctx.theme }), { code: 'ASSET_NOT_OWNED' });
    delete ctx.theme.siteBuilder.savedSections.library;
    addImage(ctx.theme, new mongoose.Types.ObjectId());
    await assert.rejects(media.assertThemeAssetOwnership({ shopId: ctx.shopId, theme: ctx.theme }), { code: 'ASSET_NOT_OWNED' });
    delete ctx.theme.siteBuilder.templates.tpl_home.nodes.image_test;
    ctx.theme.siteBuilder.templates.tpl_home.nodes.section_story.slots.body.pop();
    const home = ctx.theme.siteBuilder.templates.tpl_home;
    home.nodes.products = { type: 'catalog.products', source: { kind: 'manualProducts', productIds: [String(ctx.data.products.productB.product._id)] } }; home.rootOrder.push('products');
    await assert.rejects(media.assertThemeAssetOwnership({ shopId: ctx.shopId, theme: ctx.theme }), { code: 'PRODUCT_NOT_OWNED' });
});
test('SEO draft/publication preserve v5 graph; reads and public settings expose no editor library', async t => {
    const ctx = await setup(t, { published: true });
    const graph = structuredClone(ctx.theme.siteBuilder);
    const saved = await seo.saveStoreBuilderSeoDraft({ ...ctx, seo: { title: 'Isolated SEO title' }, basedOnRevision: 0 });
    assert.equal(saved.seo.title, 'Isolated SEO title');
    assert.deepEqual((await Draft.findOne({ shop_id: ctx.shopId }).lean()).theme.siteBuilder, graph);
    const result = await seo.publishStoreBuilderSeo({ ...ctx, seo: { title: 'Published SEO title' }, expectedRevision: 0 });
    assert.equal(result.themeRevision, 1);
    assert.deepEqual((await Shop.findById(ctx.shopId).lean()).theme.siteBuilder, graph);
    assert.deepEqual((await Revision.findOne({ shop_id: ctx.shopId, revision: 1 }).lean()).theme.siteBuilder, graph);
    const response = await ctx.client().get('/api/store-builder/storefront/launchshopa');
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.data.theme.siteBuilder, undefined);
    const bootstrap = await ctx.vendorAClient().get('/api/store-builder/admin/bootstrap');
    assert.equal(bootstrap.status, 200); assert.deepEqual(bootstrap.body.data.theme.siteBuilder, graph);
});
test('v5 requires transaction topology and leaves the draft unchanged when unavailable', async t => {
    const ctx = await setup(t); allowInternal(t);
    await Draft.create({ shop_id: ctx.shopId, theme: ctx.theme });
    const before = await snapshot(ctx);
    const admin = mongoose.connection.db.admin();
    t.mock.method(mongoose.connection.db, 'admin', () => ({ command: async () => ({ isWritablePrimary: true, maxWireVersion: 21, logicalSessionTimeoutMinutes: 30 }) }));
    assert.ok(admin);
    await assert.rejects(publish(ctx), { code: 'ADAPTIVE_TRANSACTIONS_REQUIRED' });
    sameSnapshot(await snapshot(ctx), before);
});

function inject(t, target, method, when) {
    const original = target[method];
    t.mock.method(target, method, function (...args) {
        if (when === 'before') throw new Error(`injected ${method} ${when}`);
        const result = original.apply(this, args);
        if (result?.exec) {
            const execute = result.exec;
            result.exec = async function (...values) { await execute.apply(this, values); throw new Error(`injected ${method} ${when}`); };
            return result;
        }
        return Promise.resolve(result).then(() => { throw new Error(`injected ${method} ${when}`); });
    });
}
for (const [target, method, label] of [[Shop, 'findOneAndUpdate', 'published snapshot'], [Revision, 'create', 'revision'],
    [Audit.prototype, 'save', 'audit'], [Asset, 'updateMany', 'media'], [Draft, 'deleteOne', 'draft cleanup']]) {
    for (const when of ['before', 'after']) test(`transaction rollback ${when} ${label} preserves all records; retry works`, async t => {
        const ctx = await setup(t); allowInternal(t);
        const asset = await createAsset(ctx.shopId, `rollback-${method}-${when}`); addImage(ctx.theme, asset._id);
        await Draft.create({ shop_id: ctx.shopId, theme: ctx.theme });
        const before = await snapshot(ctx);
        inject(t, target, method, when);
        await assert.rejects(publish(ctx), /injected/);
        t.mock.restoreAll();
        sameSnapshot(await snapshot(ctx), before);
        allowInternal(t);
        assert.equal((await publish(ctx)).themeRevision, 1);
        assert.equal((await Asset.findById(asset._id)).status, 'active');
    });
}
test('concurrent v5 publish and process reconnect preserve exactly one committed revision', async t => {
    const ctx = await setup(t); allowInternal(t);
    const results = await Promise.allSettled([publish(ctx), publish(ctx)]);
    assert.equal(results.filter(item => item.status === 'fulfilled').length, 1);
    assert.equal(results.find(item => item.status === 'rejected').reason.code, 'THEME_CONFLICT');
    await mongoose.disconnect(); await mongoose.connect(process.env.MONGO_URI_TEST);
    assert.equal((await Shop.findById(ctx.shopId)).themeRevision, 1);
    assert.equal(await Revision.countDocuments({ shop_id: ctx.shopId }), 1);
    await assert.rejects(publish(ctx), { code: 'THEME_CONFLICT' });
});
test('retained revisions pin legacy and adaptive media beyond grace; pruning releases only unreferenced images', async t => {
    const ctx = await setup(t); allowInternal(t);
    const nested = await createAsset(ctx.shopId, 'nested'); addImage(ctx.theme, nested._id);
    const saved = await createAsset(ctx.shopId, 'saved'); addImage(ctx.theme, saved._id, true);
    const legacy = await createAsset(ctx.shopId, 'legacy'); ctx.theme.logoUrl = legacy.url;
    await publish(ctx);
    const revision = await Revision.findOne({ shop_id: ctx.shopId, revision: 1 }).lean();
    assert.equal(revision.assetIds.length, 3);
    const next = structuredClone(ctx.theme);
    next.logoUrl = ''; delete next.siteBuilder.savedSections.library;
    delete next.siteBuilder.templates.tpl_home.nodes.image_test; next.siteBuilder.templates.tpl_home.nodes.section_story.slots.body.pop();
    await publish(ctx, { theme: next, expectedRevision: 1 });
    await Asset.updateMany({ shop_id: ctx.shopId }, { $set: { cleanupAfter: new Date(0) } });
    const destroy = t.mock.method(cloudinary.uploader, 'destroy', async () => ({ result: 'ok' }));
    assert.equal((await media.cleanupExpiredStoreBuilderAssets()).deleted, 0);
    assert.equal(destroy.mock.callCount(), 0);
    // Simulate an old revision lacking metadata: typed snapshot fallback still pins.
    await Revision.updateOne({ _id: revision._id }, { $unset: { assetIds: 1 } });
    assert.equal((await media.cleanupExpiredStoreBuilderAssets()).deleted, 0);
    const restored = await service.restoreStoreBuilderRevision({ ...ctx, revisionId: revision._id, expectedRevision: 2 });
    assert.equal(restored.themeRevision, 3);
    assert.equal((await Asset.findById(nested._id)).status, 'active');
    await publish(ctx, { theme: next, expectedRevision: 3 });
    await Revision.deleteMany({ shop_id: ctx.shopId, revision: { $in: [1, 3] } });
    await Asset.updateMany({ shop_id: ctx.shopId, status: 'retired' }, { $set: { cleanupAfter: new Date(0) } });
    assert.equal((await media.cleanupExpiredStoreBuilderAssets()).deleted, 3);
    assert.equal(destroy.mock.callCount(), 3);
});
test('draft media is retained, referenced deletion refused, abandoned media cleanup is idempotent', async t => {
    const ctx = await setup(t); allowInternal(t);
    const asset = await createAsset(ctx.shopId, 'draft-image'); addImage(ctx.theme, asset._id, true);
    await service.saveStoreBuilderDraft({ ...ctx, basedOnRevision: 0, expectedDraftUpdatedAt: null });
    const destroy = t.mock.method(cloudinary.uploader, 'destroy', async () => ({ result: 'ok' }));
    assert.equal((await media.cleanupExpiredStoreBuilderAssets()).deleted, 0);
    await assert.rejects(media.deleteTemporaryAsset({ shopId: ctx.shopId, assetId: asset._id }), { code: 'ASSET_REFERENCED' });
    await Draft.deleteOne({ shop_id: ctx.shopId });
    await Asset.updateOne({ _id: asset._id, shop_id: ctx.shopId }, { $set: { expiresAt: new Date(0) } });
    assert.equal((await media.cleanupExpiredStoreBuilderAssets()).deleted, 1);
    assert.equal((await media.cleanupExpiredStoreBuilderAssets()).deleted, 0);
    assert.equal(destroy.mock.callCount(), 1);
});
test('abrupt process exit during a real transaction leaves no partial publication; restart can retry', async t => {
    const ctx = await setup(t); allowInternal(t);
    await Draft.create({ shop_id: ctx.shopId, theme: ctx.theme });
    const before = await snapshot(ctx);
    const child = await new Promise(resolve => execFile(process.execPath, ['--require', './tests/helpers/isolatedAcceptance.cjs',
        './tests/helpers/adaptive-transaction-crash.cjs', String(ctx.shopId)], { cwd: path.resolve(__dirname, '../..'), timeout: 20000 },
    (error, stdout, stderr) => resolve({ error, stdout, stderr })));
    assert.equal(child.error?.code, 17, child.stderr);
    assert.match(child.stdout, /CRASH_AFTER_AUDIT/);
    sameSnapshot(await snapshot(ctx), before);
    assert.equal((await publish(ctx)).themeRevision, 1);
    assert.equal(await Revision.countDocuments({ shop_id: ctx.shopId }), 1);
});
test('media cleanup claims prevent publication of deleting assets and recover expired claims after restart', async t => {
    const ctx = await setup(t); allowInternal(t);
    const asset = await createAsset(ctx.shopId, 'claim', { status: 'deleting', cleanupFromStatus: 'temporary', cleanupClaimedAt: new Date(0) });
    addImage(ctx.theme, asset._id);
    await assert.rejects(publish(ctx), { code: 'ASSET_NOT_OWNED' });
    assert.equal((await Shop.findById(ctx.shopId)).themeRevision, 0);
    const destroy = t.mock.method(cloudinary.uploader, 'destroy', async () => ({ result: 'ok' }));
    assert.equal((await media.cleanupExpiredStoreBuilderAssets()).deleted, 1);
    assert.equal((await Asset.findById(asset._id)).status, 'deleted');
    assert.equal(destroy.mock.callCount(), 1);
});
test('future projection is tenant-scoped, strips unused library assets and preserves globals without private data', async t => {
    const ctx = await setup(t); allowInternal(t);
    const image = await createAsset(ctx.shopId, 'public'); addImage(ctx.theme, image._id);
    const saved = await createAsset(ctx.shopId, 'private-library'); addImage(ctx.theme, saved._id, true);
    await publish(ctx);
    const { getAdaptivePublicProjection } = require('../../services/storeBuilder/effectiveThemeService');
    const value = await getAdaptivePublicProjection({ shopId: ctx.shopId });
    assert.equal(value.siteBuilder.savedSections, undefined);
    assert.equal(value.siteBuilder.globals.header, 'tpl_header');
    assert.deepEqual(value.assets.map(asset => asset.id), [String(image._id)]);
    assert.equal(JSON.stringify(value).includes('publicId'), false);
    assert.equal(await getAdaptivePublicProjection({ shopId: ctx.data.shops.shopB._id }), null);
});
test('cache invalidation failure after v5 SEO commit returns success and recovery warning', async t => {
    const ctx = await setup(t, { published: true });
    const cache = require('../../services/cacheService');
    t.mock.method(cache, 'delPattern', async () => { throw new Error('mock cache unavailable'); });
    const result = await ctx.vendorAClient().unsafePost('/api/store-builder/admin/seo/publish', {
        seo: { title: 'Committed with cache outage' }, expectedRevision: 0,
    });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.ok(result.body.data.warnings.includes('CACHE_INVALIDATION_PENDING'));
    assert.equal((await Shop.findById(ctx.shopId)).themeRevision, 1);
    assert.equal(await Revision.countDocuments({ shop_id: ctx.shopId }), 1);
});
test('retention pruning runs after commit; failure retains media and is reported without undoing publication', async t => {
    const ctx = await setup(t); allowInternal(t);
    for (let revision = 1; revision <= 20; revision++) await Revision.create({ shop_id: ctx.shopId, revision, theme: { version: 4 } });
    await Shop.updateOne({ _id: ctx.shopId }, { $set: { themeRevision: 20 } });
    const remove = Revision.deleteMany;
    t.mock.method(Revision, 'deleteMany', () => { throw new Error('mock retention outage'); });
    const result = await publish(ctx, { expectedRevision: 20 });
    assert.ok(result.warnings.includes('REVISION_RETENTION_PENDING'));
    assert.equal((await Shop.findById(ctx.shopId)).themeRevision, 21);
    assert.equal(await Revision.countDocuments({ shop_id: ctx.shopId }), 21);
    Revision.deleteMany = remove;
    await publish(ctx, { expectedRevision: 21 });
    assert.equal(await Revision.countDocuments({ shop_id: ctx.shopId }), 20);
});
test('an old query or document save cannot win the v4-read/v5-commit race', async t => {
    const ctx = await setup(t);
    const originalUpdate = Shop.collection.updateOne.bind(Shop.collection);
    const queryUpdate = Shop.collection.findOneAndUpdate.bind(Shop.collection);
    t.mock.method(Shop.collection, 'findOneAndUpdate', async (...args) => {
        // Fixture-only concurrent commit after Mongoose has prepared its filter.
        await originalUpdate({ _id: ctx.shopId }, { $set: { theme: ctx.theme } });
        return queryUpdate(...args);
    });
    const result = await Shop.findOneAndUpdate({ _id: ctx.shopId }, { $set: { theme: { version: 4 } } }, { returnDocument: 'after' });
    assert.equal(result, null);
    assert.deepEqual((await Shop.findById(ctx.shopId).lean()).theme.siteBuilder, ctx.theme.siteBuilder);
    t.mock.restoreAll();
    // Reset only this disposable fixture to test the document-save race separately.
    await originalUpdate({ _id: ctx.shopId }, { $set: { theme: { version: 4 } } });
    const old = await Shop.findById(ctx.shopId);
    old.theme = { version: 4, hero: { title: 'Old editor snapshot' } };
    t.mock.method(Shop.collection, 'updateOne', async (...args) => {
        await originalUpdate({ _id: ctx.shopId }, { $set: { theme: ctx.theme } });
        return originalUpdate(...args);
    });
    await assert.rejects(old.save(), { name: 'VersionError' });
    assert.deepEqual((await Shop.findById(ctx.shopId).lean()).theme.siteBuilder, ctx.theme.siteBuilder);
});
test('old draft upsert cannot overwrite a v5 draft inserted after its read', async t => {
    const ctx = await setup(t);
    const original = Draft.collection.findOneAndUpdate.bind(Draft.collection);
    t.mock.method(Draft.collection, 'findOneAndUpdate', async (...args) => {
        await Draft.collection.insertOne({ shop_id: ctx.shopId, theme: ctx.theme, basedOnRevision: 0, updatedAt: new Date() });
        return original(...args);
    });
    await assert.rejects(Draft.findOneAndUpdate({ shop_id: ctx.shopId }, { $set: { theme: { version: 4 } } }, { upsert: true }), { code: 11000 });
    assert.deepEqual((await Draft.findOne({ shop_id: ctx.shopId }).lean()).theme.siteBuilder, ctx.theme.siteBuilder);
});
test('all ten v4 themes round-trip identically to the original Git Shop schema in real MongoDB', async t => {
    const ctx = await setup(t);
    const filename = path.resolve(__dirname, '../../models/Shop.js');
    const root = path.resolve(__dirname, '../../../..');
    const source = execFileSync('C:/Program Files/Git/cmd/git.exe', ['show', '54a04b6d34939dab3b9cc6f0139a753116edbd32:ecommerce-backend/backend/models/Shop.js'], { cwd: root }).toString();
    const compiled = new Module(filename, module);
    compiled.filename = filename; compiled.paths = module.paths;
    compiled._compile(source.replace("mongoose.model('Shop', shopSchema)", "mongoose.models.AdaptivePhase2V4Baseline || mongoose.model('AdaptivePhase2V4Baseline', shopSchema, 'adaptive_phase2_v4_baselines')"), filename);
    const Original = compiled.exports;
    const frozen = require('../fixtures/atelier-legacy/contracts.json').concat(require('../fixtures/adaptive-builder/baseline-manifest.json').capture.atelierSnapshot);
    for (let index = 0; index < frozen.length; index++) {
        const theme = structuredClone(frozen[index].rawPublishedSnapshot);
        theme.homepageSections = theme.homepageSections.map(section => ({ ...section, _id: new mongoose.Types.ObjectId() }));
        const original = await Original.create({ shopName: `Baseline ${index}`, subdomain: `p2baseline${index}`, theme });
        const actual = await Shop.create({ shopName: `Current ${index}`, subdomain: `p2current${index}`, theme });
        const previous = (await Original.findById(original._id).lean()).theme;
        const current = (await Shop.findById(actual._id).lean()).theme;
        assert.deepEqual(current, previous, frozen[index].id);
        assert.equal(current.version, 4);
        assert.equal(current.siteBuilder, undefined);
    }
    assert.ok(ctx.shopId);
});
test('SEO discard preserves unrelated adaptive draft nodes and updates retained media references atomically', async t => {
    const ctx = await setup(t, { published: true });
    const draftTheme = structuredClone(ctx.theme);
    const image = await createAsset(ctx.shopId, 'unrelated-draft-image'); addImage(draftTheme, image._id, true);
    draftTheme.seo.title = 'Discard this SEO change';
    await Draft.create({ shop_id: ctx.shopId, theme: draftTheme, assetIds: [image._id], basedOnRevision: 0 });
    const before = structuredClone(draftTheme.siteBuilder);
    const result = await seo.deleteStoreBuilderSeoDraft(ctx);
    assert.equal(result.rebased, true);
    const draft = await Draft.findOne({ shop_id: ctx.shopId }).lean();
    assert.deepEqual(draft.theme.siteBuilder, before);
    assert.equal(draft.theme.seo.title, ctx.theme.seo.title);
    assert.deepEqual(draft.assetIds.map(String), [String(image._id)]);
    assert.equal((await Shop.findById(ctx.shopId)).themeRevision, 0);
});
test('media cleanup uses a reference revision even when concurrent updates share a timestamp', async t => {
    const ctx = await setup(t);
    const asset = await createAsset(ctx.shopId, 'same-timestamp');
    const original = Asset.findOneAndUpdate;
    let changed = false;
    t.mock.method(Asset, 'findOneAndUpdate', async function (...args) {
        if (!changed && String(args[0]._id) === String(asset._id)) {
            changed = true;
            await Asset.updateOne({ _id: asset._id, shop_id: ctx.shopId }, { $inc: { referenceRevision: 1 } }, { timestamps: false });
        }
        return original.apply(this, args);
    });
    const destroy = t.mock.method(cloudinary.uploader, 'destroy', async () => ({ result: 'ok' }));
    assert.equal((await media.cleanupExpiredStoreBuilderAssets()).deleted, 0);
    assert.equal(destroy.mock.callCount(), 0);
    assert.equal((await media.cleanupExpiredStoreBuilderAssets()).deleted, 1);
    assert.equal(destroy.mock.callCount(), 1);
});
test('custom storage cannot bypass graph validation by disabling Mongoose validators', async t => {
    const ctx = await setup(t);
    const invalid = structuredClone(ctx.theme);
    delete invalid.siteBuilder.templates.tpl_checkout.nodes.core_tpl_checkout;
    await assert.rejects(Shop.updateOne({ _id: ctx.shopId }, { $set: { theme: invalid } }, { runValidators: false }));
    await assert.rejects(Draft.findOneAndUpdate({ shop_id: ctx.shopId }, { $set: { theme: invalid } }, { upsert: true, runValidators: false }));
    await assert.rejects(new Revision({ shop_id: ctx.shopId, revision: 1, theme: invalid }).save({ validateBeforeSave: false }));
    const document = await Shop.findById(ctx.shopId); document.theme = invalid;
    await assert.rejects(document.save({ validateBeforeSave: false }));
    assert.equal(await Revision.countDocuments({ shop_id: ctx.shopId }), 0);
    assert.equal(await Draft.countDocuments({ shop_id: ctx.shopId }), 0);
    assert.equal((await Shop.findById(ctx.shopId)).theme.version, 4);
});
test('v4 publication and SEO cannot clean up an unpublished v5 draft', async t => {
    const ctx = await setup(t);
    await Draft.create({ shop_id: ctx.shopId, theme: ctx.theme, basedOnRevision: 0 });
    const before = await Draft.findOne({ shop_id: ctx.shopId }).lean();
    const legacy = JSON.parse(JSON.stringify((await Shop.findById(ctx.shopId).lean()).theme));
    assert.equal((await publish(ctx, { theme: legacy })).themeRevision, 1);
    await seo.publishStoreBuilderSeo({ ...ctx, seo: { title: 'Legacy SEO only' }, expectedRevision: 1 });
    const after = await Draft.findOne({ shop_id: ctx.shopId }).lean();
    assert.deepEqual(after, before);
    await assert.rejects(seo.deleteStoreBuilderSeoDraft(ctx), { code: 'ADAPTIVE_READ_ONLY' });
    const response = await ctx.vendorAClient().unsafeDelete('/api/store-builder/admin/draft', { expectedDraftUpdatedAt: after.updatedAt.toISOString() });
    assert.equal(response.body.code, 'ADAPTIVE_READ_ONLY');
    assert.deepEqual(await Draft.findOne({ shop_id: ctx.shopId }).lean(), before);
});
