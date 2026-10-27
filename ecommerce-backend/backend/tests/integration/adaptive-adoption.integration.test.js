'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createLaunchSafetyContext, Shop, setShopPlan } = require('../helpers/launchSafetyHarness');
const service = require('../../services/storeBuilder/storeBuilderService');
const { getShopPlanAccess } = require('../../services/billing/planAccessService');
const { getAdaptiveAvailability } = require('../../services/storeBuilder/adaptiveRolloutPolicy');

test('limited and full shops can adopt through existing draft/publication services without auto-publishing or bypassing tenant gates', async t => {
    const ctx = await createLaunchSafetyContext(t);
    for (const [key, value] of Object.entries({ ADAPTIVE_BUILDER_ROLLOUT: 'all', ADAPTIVE_BUILDER_APPROVAL: 'synthetic-adoption-test', ADAPTIVE_BUILDER_WRITES: 'on', ADAPTIVE_BUILDER_RENDERING: 'on' })) {
        const previous = process.env[key]; process.env[key] = value;
        t.after(() => previous === undefined ? delete process.env[key] : process.env[key] = previous);
    }
    const { createAdaptiveDraft } = await import('../../../../ecommerce-admin/src/pages/dashboard/StoreBuilder/adaptive/createAdaptiveDraft.js');
    for (const [shopKey, userKey, plan] of [['shopA', 'vendorA', ctx.data.plans.starter], ['shopB', 'vendorB', ctx.data.plans.pro]]) {
        const shopId = ctx.data.shops[shopKey]._id;
        if (plan) await setShopPlan({ shopId, plan });
        const req = { tenantId: shopId, user: ctx.data.identities[userKey].user.toObject() };
        const before = await Shop.findById(shopId).lean();
        const theme = createAdaptiveDraft(JSON.parse(JSON.stringify(before.theme)));
        assert.equal(getAdaptiveAvailability({ shopId, planAccess: await getShopPlanAccess(shopId) }).available, true);
        const draft = await service.saveStoreBuilderDraft({ shopId, req, theme, basedOnRevision: before.themeRevision || 0, expectedDraftUpdatedAt: null });
        assert.equal(draft.theme.version, 5);
        const unchanged = await Shop.findById(shopId).lean();
        assert.deepEqual(unchanged.theme, before.theme, 'draft creation must not change published theme');
        await assert.rejects(service.saveStoreBuilderDraft({ shopId, req, theme: { version: 4 }, basedOnRevision: before.themeRevision || 0, expectedDraftUpdatedAt: draft.updatedAt.toISOString() }), { code: 'THEME_CLIENT_UPGRADE_REQUIRED' });
        await assert.rejects(service.publishStoreBuilder({ shopId, req: { ...req, tenantId: 'a11111111111111111111111' }, theme, expectedRevision: before.themeRevision || 0 }), { code: 'ADAPTIVE_TENANT_FORBIDDEN' });
        await service.publishStoreBuilder({ shopId, req, theme, expectedRevision: before.themeRevision || 0 });
        assert.equal((await Shop.findById(shopId).lean()).theme.version, 5);
        process.env.ADAPTIVE_BUILDER_WRITES = 'off';
        await assert.rejects(service.saveStoreBuilderDraft({ shopId, req, theme, basedOnRevision: (before.themeRevision || 0) + 1, expectedDraftUpdatedAt: null }), { code: 'ADAPTIVE_READ_ONLY' });
        process.env.ADAPTIVE_BUILDER_WRITES = 'on';
    }
});
