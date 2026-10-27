'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Shop, createLaunchSafetyContext } = require('../helpers/launchSafetyHarness');
const Asset = require('../../models/StoreBuilderAsset');
const Draft = require('../../models/StoreBuilderDraft');
const service = require('../../services/storeBuilder/storeBuilderService');
const policy = require('../../services/storeBuilder/adaptivePersistencePolicy');
const { editorTheme } = require('../fixtures/adaptive-builder/editor-fixtures.cjs');
const { applyPageTemplateCommand } = require('@scaleup/storefront-theme/adaptive');

async function setup(t) {
    const ctx = await createLaunchSafetyContext(t);
    const shopId = ctx.data.shops.shopA._id;
    const theme = editorTheme();
    const own = await Asset.create({ shop_id: shopId, publicId: 'phase4-owned', url: 'https://res.cloudinary.com/test/image/upload/phase4-owned.png', status: 'active', width: 640, height: 480 });
    for (const tree of Object.values(theme.siteBuilder.templates)) for (const node of Object.values(tree.nodes)) if (node.type === 'content.image') node.content.assetId = String(own._id);
    await Shop.updateOne({ _id: shopId }, { $set: { theme } }, { runValidators: true });
    return { ...ctx, shopId, theme, own };
}

test('authenticated Builder bootstrap exposes only referenced tenant media and a closed adoption gate', async t => {
    const ctx = await setup(t);
    const foreign = await Asset.create({ shop_id: ctx.data.shops.shopB._id, publicId: 'phase4-foreign', url: 'https://res.cloudinary.com/test/image/upload/foreign.png', status: 'active' });
    const unused = await Asset.create({ shop_id: ctx.shopId, publicId: 'phase4-unused', url: 'https://res.cloudinary.com/test/image/upload/unused.png', status: 'active' });
    ctx.theme.siteBuilder.savedSections.foreign = { name: 'Foreign reference', pageKind: 'home', rootOrder: ['library_image'], nodes: { library_image: { type: 'content.image', content: { assetId: String(foreign._id), alt: 'Synthetic foreign reference' } } } };
    // A corrupt pre-existing draft may mention another tenant's asset. Reads
    // must never turn that reference into a URL; write validation rejects it.
    await Draft.create({ shop_id: ctx.shopId, theme: ctx.theme });
    const response = await ctx.vendorAClient().get('/api/store-builder/admin/bootstrap');
    assert.equal(response.status, 200, JSON.stringify(response.body));
    const data = response.body.bootstrap;
    assert.equal(data.adaptiveAvailability.available, false);
    assert.equal(data.adaptiveAvailability.reason, 'ADAPTIVE_ENTITLEMENT_NOT_APPROVED');
    assert.deepEqual(data.adaptiveAssets.map(asset => asset.assetId), [String(ctx.own._id)]);
    assert.equal(JSON.stringify(data.adaptiveAssets).includes(foreign.url), false);
    assert.equal(JSON.stringify(data.adaptiveAssets).includes(unused.url), false);
    assert.equal(data.adaptiveAssets[0].publicId, undefined);
    const other = await ctx.vendorBClient().get('/api/store-builder/admin/bootstrap');
    assert.equal(other.status, 200); assert.deepEqual(other.body.bootstrap.adaptiveAssets, []);
    assert.equal((await ctx.client().get('/api/store-builder/admin/bootstrap')).status, 401);
});

test('saved copies persist through the existing draft boundary, while actual production policy still rejects editing', async t => {
    const ctx = await setup(t);
    // Warm identity metadata before testing the isolated approval boundary.
    await ctx.vendorAClient().unsafePatch('/api/store-builder/admin', { theme: { version: 99 } });
    const req = { tenantId: ctx.shopId, user: ctx.data.identities.vendorA.user.toObject() };
    const copied = applyPageTemplateCommand(ctx.theme.siteBuilder, { kind: 'saveSection', templateId: 'tpl_home', nodeId: 'section_story', savedSectionId: 'saved_story', name: 'Story copy' });
    assert.equal(copied.valid, true, JSON.stringify(copied.errors));
    const theme = { ...ctx.theme, siteBuilder: copied.value };
    const options = { shopId: ctx.shopId, req, theme, basedOnRevision: 0, expectedDraftUpdatedAt: null };
    await assert.rejects(service.saveStoreBuilderDraft(options), { code: 'ADAPTIVE_ADOPTION_DISABLED' });
    // Existing test-only, in-process approval seam; never an HTTP or env bypass.
    t.mock.method(policy, 'assertAdaptiveThemeMutation', async () => {});
    const draft = await service.saveStoreBuilderDraft(options);
    assert.deepEqual(draft.theme.siteBuilder, theme.siteBuilder);
    const writes = await Promise.allSettled([1, 2].map(() => service.saveStoreBuilderDraft({ ...options, expectedDraftUpdatedAt: draft.updatedAt.toISOString() })));
    assert.equal(writes.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(writes.find(result => result.status === 'rejected').reason.code, 'DRAFT_CONFLICT');
    const stored = await Draft.findOne({ shop_id: ctx.shopId }).lean();
    assert.deepEqual(stored.theme.siteBuilder.savedSections, theme.siteBuilder.savedSections);
});
