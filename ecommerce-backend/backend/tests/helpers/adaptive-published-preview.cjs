'use strict';
// Explicitly isolated synthetic storefront for real browser/hydration review.
// No worker or provider transport can start under the acceptance preload.
if (process.env.SFA_ACCEPTANCE_DATABASE !== 'adaptive_browser' || process.env.NODE_ENV !== 'test' || process.env.SFA_ISOLATED_ACCEPTANCE !== 'c085454b') throw Error('Use the adaptive_browser acceptance preload');
const path = require('node:path'), { spawn } = require('node:child_process');
const { createLaunchSafetyContext, Shop } = require('./launchSafetyHarness');
const { fixture } = require('../fixtures/adaptive-builder/contract-fixtures.cjs');
const { normalizeStoredTheme } = require('@scaleup/storefront-theme/storage');
const Collection = require('../../models/Collection');
const cleanups = [];
async function main() {
    const ctx = await createLaunchSafetyContext({ after: callback => cleanups.push(callback) });
    const shopId = ctx.data.shops.shopA._id, graph = fixture(), product = ctx.data.products.productA.product;
    Object.assign(process.env, { ADAPTIVE_BUILDER_ROLLOUT: 'pilot', ADAPTIVE_BUILDER_APPROVAL: 'synthetic-browser-only', ADAPTIVE_BUILDER_SHOP_IDS: String(shopId), ADAPTIVE_BUILDER_WRITES: 'on', ADAPTIVE_BUILDER_RENDERING: 'on' });
    graph.templates.tpl_home.nodes.products = { type: 'catalog.products', source: { kind: 'catalog', limit: 6 } };
    graph.templates.tpl_home.rootOrder.push('products');
    graph.templates.tpl_home.nodes.story_text.content.text = 'Synthetic release storefront — পরীক্ষামূলক দোকান';
    const theme = normalizeStoredTheme({ ...(await Shop.findById(shopId).lean()).theme, version: 5, siteBuilder: graph, migrations: { bannerSectionsV1: true } });
    const published = await ctx.vendorAClient().unsafePatch('/api/store-builder/admin', { theme, expectedRevision: 0 });
    if (published.status !== 200) throw Error('Synthetic publication failed: ' + published.body?.code);
    await Collection.create({ shop_id: shopId, title: 'Synthetic collection', slug: 'browser-fixture', productIds: [product._id] });
    const next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3018'], {
        cwd: path.resolve(__dirname, '../../../../ecommerce-storefront'), windowsHide: true, stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production', API_URL: `${ctx.baseUrl}/api`, NEXT_PUBLIC_USE_DIRECT_API: 'false', STOREFRONT_PROXY_SECRET: '', NEXT_TELEMETRY_DISABLED: '1' },
    });
    console.log(JSON.stringify({ synthetic: true, storefront: 'http://launchshopa.localhost:3018/', product: `/products/${product.slug || product._id}`, category: `/categories/${encodeURIComponent(product.category)}`, collection: '/collections/browser-fixture',
        note: 'Separate disposable DB; simulated providers; published only to this synthetic process. No production activation.' }));
    let closing = false;
    const close = async () => { if (closing) return; closing = true; next.kill('SIGTERM'); for (const cleanup of cleanups.reverse()) await cleanup(); process.exit(0); };
    for (const signal of ['SIGINT','SIGTERM']) process.on(signal, close);
    next.on('exit', () => { if (!closing) close(); });
}
main().catch(error => { console.error(error); process.exitCode = 1; });
