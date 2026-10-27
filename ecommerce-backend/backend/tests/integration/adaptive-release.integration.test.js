'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { spawn } = require('node:child_process');
const { createLaunchSafetyContext, Shop, setShopPlan } = require('../helpers/launchSafetyHarness');
const { fixture } = require('../fixtures/adaptive-builder/contract-fixtures.cjs');
const { normalizeStoredTheme } = require('@scaleup/storefront-theme/storage');
const { createPageTemplateDocument, getAdaptiveColorTokens } = require('@scaleup/storefront-theme/adaptive');
const Asset = require('../../models/StoreBuilderAsset');
const Revision = require('../../models/StoreBuilderRevision');
const Draft = require('../../models/StoreBuilderDraft');
const Collection = require('../../models/Collection');
const media = require('../../services/storeBuilder/storeBuilderAssetService');
const { loadAdaptiveRenderer } = require('../helpers/adaptive-renderer.cjs');
const root = path.resolve(__dirname, '../../../..');
const out = path.join(root, 'output/adaptive-builder/phase6');
const check = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body; };
// Node's fetch discards a custom Host header. Use HTTP directly so Next's real
// tenant proxy receives the same public host a browser would send.
const storefrontRequest = route => new Promise((resolve, reject) => {
    const request = require('node:http').get({ hostname: '127.0.0.1', port: 3018, path: route, headers: { Host: 'launchshopa.localhost:3018' } }, response => {
        let html = ''; response.setEncoding('utf8'); response.on('data', chunk => { html += chunk; });
        response.on('end', () => resolve({ status: response.statusCode, text: async () => html }));
    });
    request.on('error', reject); request.setTimeout(60000, () => request.destroy(new Error('Next SSR timeout')));
});

test('authorized disposable lifecycle uses actual HTTP publication, published projection, Next routes, kill switches and retained-media restoration', { timeout: 300000 }, async t => {
    assert.equal(process.env.SFA_ACCEPTANCE_DATABASE, 'adaptive_phase6', 'Use the second hardcoded disposable database');
    const keys = ['ADAPTIVE_BUILDER_ROLLOUT','ADAPTIVE_BUILDER_APPROVAL','ADAPTIVE_BUILDER_SHOP_IDS','ADAPTIVE_BUILDER_WRITES','ADAPTIVE_BUILDER_RENDERING'];
    const before = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    t.after(() => { for (const key of keys) before[key] === undefined ? delete process.env[key] : process.env[key] = before[key]; });
    const ctx = await createLaunchSafetyContext(t), shopId = ctx.data.shops.shopA._id, client = ctx.vendorAClient();
    for (const [model, fields] of [[Draft, ['shop_id']], [Revision, ['shop_id','revision']], [Asset, ['publicId']]]) {
        const indexes = await model.collection.indexes();
        assert.ok(indexes.some(index => index.unique && fields.length === Object.keys(index.key).length && fields.every(field => Object.hasOwn(index.key, field))), `${model.modelName}: required unique index exists in disposable MongoDB`);
    }
    const graph = fixture();
    let theme = normalizeStoredTheme({ ...(await Shop.findById(shopId).lean()).theme, version: 5, siteBuilder: graph, migrations: { bannerSectionsV1: true } });
    check(await client.unsafePut('/api/store-builder/admin/draft', { expectedShopId: String(shopId), theme, basedOnRevision: 0, expectedDraftUpdatedAt: null }), 403);
    Object.assign(process.env, { ADAPTIVE_BUILDER_ROLLOUT: 'pilot', ADAPTIVE_BUILDER_APPROVAL: 'synthetic-phase6-test', ADAPTIVE_BUILDER_SHOP_IDS: String(shopId), ADAPTIVE_BUILDER_WRITES: 'on', ADAPTIVE_BUILDER_RENDERING: 'on' });
    assert.equal(check(await client.get('/api/store-builder/admin/bootstrap')).bootstrap.adaptiveAvailability.available, true);
    const image = await Asset.create({ shop_id: shopId, publicId: 'phase6-public', url: 'https://res.cloudinary.com/test/image/upload/phase6.png', width: 400, height: 300, mimeType: 'image/png', status: 'temporary' });
    graph.templates.tpl_home.nodes.image = { type: 'content.image', content: { assetId: String(image._id), alt: 'Synthetic product image' } };
    graph.templates.tpl_home.nodes.section_story.slots.body.push('image');
    graph.templates.tpl_home.nodes.products = { type: 'catalog.products', source: { kind: 'manualProducts', productIds: [String(ctx.data.products.productA.product._id)] } };
    graph.templates.tpl_home.rootOrder.push('products');
    graph.savedSections.private_copy = { name: 'Private library sentinel', pageKind: 'home', rootOrder: ['private_text'], nodes: { private_text: { type: 'content.text', content: { text: 'PRIVATE_LIBRARY_SENTINEL' } } } };
    theme = normalizeStoredTheme({ ...theme, siteBuilder: graph });
    const empty = normalizeStoredTheme({ ...theme, siteBuilder: createPageTemplateDocument() });
    // Revision 1 retains the exact legacy presentation as a v5-compatible
    // recovery snapshot. No v4 writer is allowed to erase later v5 content.
    check(await client.unsafePatch('/api/store-builder/admin', { theme: empty, expectedRevision: 0 }));
    const recovery = await Revision.findOne({ shop_id: shopId, revision: 1 }).lean();
    const savePayload = { expectedShopId: String(shopId), theme, basedOnRevision: 1, expectedDraftUpdatedAt: null };
    check(await client.unsafePut('/api/store-builder/admin/draft', savePayload));
    const draft = check(await client.get('/api/store-builder/admin/draft')).data;
    assert.deepEqual(draft.theme.siteBuilder, theme.siteBuilder);
    check(await client.unsafeDelete('/api/store-builder/admin/draft'), 409);
    const csrf = check(await client.get('/api/auth/csrf-token')).csrfToken;
    check(await client.delete('/api/store-builder/admin/draft', { headers: { 'x-csrf-token': csrf }, body: { expectedShopId: String(shopId), expectedDraftUpdatedAt: draft.updatedAt } }));
    assert.equal(await Draft.countDocuments({ shop_id: shopId }), 0);
    check(await client.unsafePut('/api/store-builder/admin/draft', savePayload));
    const info = () => ctx.client().get('/api/storefront/launchshopa/info');
    assert.equal(check(await info()).adaptive?.siteBuilder.defaultTemplates.home, undefined, 'Draft is not published');
    check(await client.unsafePatch('/api/store-builder/admin', { theme, expectedRevision: 1 }));
    const published = check(await info());
    assert.equal(published.adaptive.revision, 2);
    assert.equal(published.theme.siteBuilder, undefined);
    assert.equal(published.adaptive.siteBuilder.savedSections, undefined);
    assert.equal(JSON.stringify(published).includes('PRIVATE_LIBRARY_SENTINEL'), false);
    assert.deepEqual(published.adaptive.sourcesByTemplate.tpl_home.products.products.map(item => item._id), [String(ctx.data.products.productA.product._id)]);
    assert.equal(published.adaptive.sourcesByTemplate.tpl_home.products.products[0].pricing.costPrice, undefined);
    assert.equal(check(await ctx.vendorBClient().get('/api/store-builder/admin/bootstrap')).bootstrap.adaptiveAvailability.available, false);
    check(await ctx.vendorBClient().unsafePut('/api/store-builder/admin/draft', { ...savePayload, basedOnRevision: 0, expectedShopId: String(ctx.data.shops.shopB._id), theme: empty }), 403);
    check(await ctx.staffAClient().unsafePatch('/api/store-builder/admin', { theme, expectedRevision: 2 }), 403);
    const foreign = structuredClone(theme); foreign.siteBuilder.templates.tpl_home.nodes.products.source.productIds = [String(ctx.data.products.productB.product._id)];
    assert.ok((await client.unsafePatch('/api/store-builder/admin', { theme: foreign, expectedRevision: 2 })).status >= 400);
    check(await client.unsafePatch('/api/store-builder/admin', { theme: { version: 4 }, expectedRevision: 2 }), 409);

    // Start the real Next application against this test's real HTTP backend.
    // This is SSR evidence only; it does not claim browser/hydration acceptance.
    const storefront = path.join(root, 'ecommerce-storefront');
    const log = fs.openSync(path.join(out, 'next-ssr-server.log'), 'w');
    const next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3018'], {
        cwd: storefront, windowsHide: true, stdio: ['ignore', log, log], env: { ...process.env, NODE_ENV: 'production', API_URL: `${ctx.baseUrl}/api`, NEXT_PUBLIC_API_URL: `${ctx.baseUrl}/api`, STOREFRONT_PROXY_SECRET: '', NEXT_TELEMETRY_DISABLED: '1' },
    });
    t.after(async () => { next.kill('SIGTERM'); await new Promise(resolve => { if(next.exitCode !== null) return resolve(); next.once('exit', resolve); setTimeout(resolve, 5000).unref(); }); fs.closeSync(log); });
    let ready = false;
    for(let attempt = 0; attempt < 80; attempt++) {
        if (next.exitCode !== null) throw Error('Next exited before readiness; inspect next-ssr-server.log');
        try { const response = await fetch('http://127.0.0.1:3018/robots.txt', { signal: AbortSignal.timeout(1000) }); if(response.ok) { ready = true; break; } } catch { /* bounded cold start */ }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.equal(ready, true, 'Next server ready');
    const collection = await Collection.create({ shop_id: shopId, title: 'Synthetic release collection', slug: 'release-fixture', productIds: [ctx.data.products.productA.product._id] });
    assert.ok(collection._id);
    const product = ctx.data.products.productA.product;
    const routes = [['home','/'], ['product',`/products/${product.slug || product._id}`], ['category',`/categories/${encodeURIComponent(product.category)}`],
        ['collection','/collections/release-fixture'], ['cart','/cart'], ['checkout','/checkout'], ['account','/account'], ['track','/track'], ['policiesIndex','/policies'], ['policy','/policies/shipping']];
    const evidence = [];
    const renderer = await loadAdaptiveRenderer();
    for (const [kind, route] of routes) {
        const started = performance.now();
        const response = await storefrontRequest(route);
        const html = await response.text(); fs.writeFileSync(path.join(out, `ssr-${kind}.html`), html);
        assert.equal(response.status, 200, `${kind}: ${html.slice(-1500)}`);
        assert.ok(html.includes(`data-ab-template="tpl_${kind}"`), `${kind}: actual Next route selects assigned template`);
        assert.ok(html.includes('data-ab-template="tpl_header"'), `${kind}: global header`);
        assert.ok(html.includes('data-ab-template="tpl_footer"'), `${kind}: global footer`);
        const plan = renderer.ui.resolveAdaptivePage({ siteBuilder: published.adaptive.siteBuilder, pageKind: kind, colorTokens: getAdaptiveColorTokens(published.theme) });
        assert.equal(plan.valid, true, JSON.stringify(plan.errors));
        const css = renderer.ui.compileAdaptiveStyles(plan.value, 'ab_1234').replaceAll('ab_1234', 'SCOPE');
        const scoped = html.match(new RegExp(`<div class="sf-adaptive" data-ab-scope="([^"]+)" data-ab-template="tpl_${kind}"><style>([\\s\\S]*?)</style>`));
        assert.ok(scoped, `${kind}: shared style output present`);
        assert.equal(scoped[2].replaceAll(scoped[1], 'SCOPE'), css, `${kind}: exact preview/live compiler parity`);
        evidence.push({ pageKind: kind, route, status: response.status, ssrMs: performance.now() - started, bytes: Buffer.byteLength(html), exactCssParity: true });
    }
    process.env.ADAPTIVE_BUILDER_WRITES = 'off';
    check(await client.unsafePatch('/api/store-builder/admin', { theme, expectedRevision: 2 }), 403);
    assert.ok(check(await info()).adaptive, 'Write kill preserves rendering');
    process.env.ADAPTIVE_BUILDER_RENDERING = 'off';
    assert.equal(check(await info()).adaptive, undefined);
    assert.equal(check(await ctx.client().get('/api/storefront/launchshopa/bootstrap')).data.shop.adaptive, undefined, 'Cache cannot defeat kill');
    let fallback = await (await storefrontRequest('/')).text();
    assert.equal(fallback.includes('data-ab-template='), false);
    assert.equal((await Shop.findById(shopId)).theme.version, 5);
    process.env.ADAPTIVE_BUILDER_WRITES = 'on'; process.env.ADAPTIVE_BUILDER_RENDERING = 'on';
    await setShopPlan({ shopId, plan: ctx.data.plans.beginner });
    assert.equal(check(await info()).adaptive, undefined, 'Downgrade falls back without conversion');
    check(await client.unsafePatch('/api/store-builder/admin', { theme, expectedRevision: 2 }), 403);
    await setShopPlan({ shopId, plan: ctx.data.plans.pro });
    assert.ok(check(await info()).adaptive, 'Re-enablement retains design');
    check(await client.unsafePost(`/api/store-builder/admin/revisions/${recovery._id}/restore`, { expectedRevision: 2 }));
    assert.equal((await Shop.findById(shopId)).theme.version, 5);
    assert.deepEqual(check(await info()).adaptive.siteBuilder.defaultTemplates, {});
    fallback = await (await storefrontRequest('/')).text();
    assert.equal(fallback.includes('data-ab-template='), false, 'Restored empty assignments use legacy routes');
    assert.equal((await media.cleanupExpiredStoreBuilderAssets()).deleted, 0, 'Retained revision pins media');
    assert.notEqual((await Asset.findById(image._id)).status, 'deleted');
    assert.equal(await Draft.countDocuments({ shop_id: shopId }), 0);
    fs.writeFileSync(path.join(out, 'actual-route-evidence.json'), JSON.stringify({ synthetic: true, browser: false, hydration: 'NOT RUN', routes: evidence, globalFamilies: ['header','footer'], restoredLegacyPresentation: true, mediaRetained: true }, null, 2));
});
