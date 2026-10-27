'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { createLaunchSafetyContext, Shop, setShopPlan } = require('../helpers/launchSafetyHarness');
const { getDevelopmentPreviewAccess } = require('../../services/storeBuilder/developmentPreviewAccess');
const policy = require('../../services/storeBuilder/adaptivePersistencePolicy');
const service = require('../../services/storeBuilder/storeBuilderService');
const { fixture } = require('../fixtures/adaptive-builder/contract-fixtures.cjs');
const { normalizeStoredTheme } = require('@scaleup/storefront-theme/storage');
const { applyPageTemplateCommand } = require('@scaleup/storefront-theme/adaptive');
async function setup(t) {
    const oldEnv = { NODE_ENV: process.env.NODE_ENV, ADAPTIVE_BUILDER_DEV_SHOP_IDS: process.env.ADAPTIVE_BUILDER_DEV_SHOP_IDS };
    // Restore test mode before the harness's guarded cleanup runs (FIFO hooks).
    t.after(() => { for (const [key, value] of Object.entries(oldEnv)) if (value === undefined) delete process.env[key]; else process.env[key] = value; });
    const ctx = await createLaunchSafetyContext(t);
    process.env.NODE_ENV = 'development'; process.env.ADAPTIVE_BUILDER_DEV_SHOP_IDS = String(ctx.data.shops.shopA._id);
    return ctx;
}
const reqFor = ctx => ({ tenantId: ctx.data.shops.shopA._id, user: ctx.data.identities.vendorA.user.toObject(), socket: { remoteAddress: '127.0.0.1' } });
test('development preview requires real authenticated tenant/plan access and exposes no customer data or publication authority', async t => {
    const ctx = await setup(t), response = await ctx.vendorAClient().get('/api/store-builder/admin/development-preview');
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.match(response.headers.get('cache-control'), /no-store/);
    assert.deepEqual(response.body.grant, { scope: 'synthetic-local-only', shopId: String(ctx.data.shops.shopA._id), actorId: String(ctx.data.identities.vendorA.user._id), publication: false, uploads: false });
    assert.equal((await ctx.client().get('/api/store-builder/admin/development-preview')).status, 401);
    assert.equal((await ctx.vendorBClient().get('/api/store-builder/admin/development-preview')).status, 404);
    assert.equal((await ctx.customerAClient().get('/api/store-builder/admin/development-preview')).status, 403);
    assert.equal((await ctx.staffAClient().get('/api/store-builder/admin/development-preview')).status, 403);
    assert.equal(policy.getAdaptiveAvailability().available, false);
});
test('production/test environments, forwarded-loopback claims, absent allowlist and cross-tenant actors fail closed', async t => {
    const ctx = await setup(t), req = reqFor(ctx);
    for (const env of ['production', 'test']) {
        process.env.NODE_ENV = env; await assert.rejects(getDevelopmentPreviewAccess(req), { code: 'DEVELOPMENT_PREVIEW_UNAVAILABLE' });
    }
    process.env.NODE_ENV = 'development';
    await assert.rejects(getDevelopmentPreviewAccess({ ...req, socket: { remoteAddress: '203.0.113.9' }, headers: { 'x-forwarded-for': '127.0.0.1' } }), { code: 'DEVELOPMENT_PREVIEW_UNAVAILABLE' });
    await assert.rejects(getDevelopmentPreviewAccess({ ...req, user: ctx.data.identities.vendorB.user.toObject() }), { code: 'ADAPTIVE_TENANT_FORBIDDEN' });
    delete process.env.ADAPTIVE_BUILDER_DEV_SHOP_IDS;
    await assert.rejects(getDevelopmentPreviewAccess(req), { code: 'DEVELOPMENT_PREVIEW_UNAVAILABLE' });
});
test('inactive and limited plans cannot obtain a development grant', async t => {
    const ctx = await setup(t), shopId = ctx.data.shops.shopA._id;
    await setShopPlan({ shopId, plan: ctx.data.plans.beginner });
    await assert.rejects(getDevelopmentPreviewAccess(reqFor(ctx)), { code: 'DEVELOPMENT_PREVIEW_FORBIDDEN' });
    await setShopPlan({ shopId, plan: ctx.data.plans.pro, status: 'suspended' });
    await assert.rejects(getDevelopmentPreviewAccess(reqFor(ctx)), { code: 'DEVELOPMENT_PREVIEW_FORBIDDEN' });
    await setShopPlan({ shopId, plan: ctx.data.plans.pro });
    await Shop.updateOne({ _id: shopId }, { $set: { isActive: false } });
    await assert.rejects(getDevelopmentPreviewAccess(reqFor(ctx)), { code: 'DEVELOPMENT_PREVIEW_FORBIDDEN' });
});
test('whole-site draft CAS preserves multiple page graphs and rejects writes under actual closed adoption policy', async t => {
    const ctx = await setup(t), shopId = ctx.data.shops.shopA._id;
    let theme = normalizeStoredTheme({ version: 5, siteBuilder: fixture() });
    await Shop.updateOne({ _id: shopId }, { $set: { theme } }, { runValidators: true });
    for (const kind of ['product', 'category', 'cart', 'checkout', 'account', 'track', 'policy']) {
        const result = applyPageTemplateCommand(theme.siteBuilder, { kind: 'setStyle', templateId: `tpl_${kind}`, nodeId: `core_tpl_${kind}`, tier: 'tablet', property: 'fontSize', value: { unit: 'px', value: 20 } });
        assert.equal(result.valid, true, JSON.stringify(result.errors)); theme = { ...theme, siteBuilder: result.value };
    }
    const options = { shopId, req: reqFor(ctx), theme, basedOnRevision: 0, expectedDraftUpdatedAt: null };
    await assert.rejects(service.saveStoreBuilderDraft(options), { code: 'ADAPTIVE_ADOPTION_DISABLED' });
    // Established in-process test seam only; no HTTP/env rollout bypass.
    t.mock.method(policy, 'assertAdaptiveThemeMutation', async () => {});
    const saved = await service.saveStoreBuilderDraft(options); assert.deepEqual(saved.theme.siteBuilder, theme.siteBuilder);
    const writes = await Promise.allSettled([1, 2].map(() => service.saveStoreBuilderDraft({ ...options, expectedDraftUpdatedAt: saved.updatedAt.toISOString() })));
    assert.equal(writes.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(writes.find(result => result.status === 'rejected').reason.code, 'DRAFT_CONFLICT');
    const response = await ctx.vendorAClient().get('/api/store-builder/admin/bootstrap');
    assert.equal(response.status, 200); assert.deepEqual(response.body.bootstrap.draft.theme.siteBuilder, theme.siteBuilder);
    assert.equal(response.body.bootstrap.adaptiveAvailability.available, false);
});
