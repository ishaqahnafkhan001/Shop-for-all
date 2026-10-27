'use strict';
const { renderDocument, pageData, tokens } = require('./render-fixtures.cjs');
const { createPageTemplate } = require('../../../../../packages/storefront-theme/adaptive.cjs');
const { normalizeStoredTheme } = require('../../../../../packages/storefront-theme/storage.cjs');
function editorTheme() {
    const graph = renderDocument();
    for (const region of ['header', 'footer']) {
        graph.globals[region] = `tpl_${region}`;
        graph.templates[`tpl_${region}`] = createPageTemplate(`tpl_${region}`, region);
    }
    return normalizeStoredTheme({ version: 5, siteBuilder: graph, migrations: { bannerSectionsV1: true } });
}
const shopId = 'd11111111111111111111111';
function editorBootstrap() {
    const product = pageData('home').sources.products.products[0];
    return { shop: { _id: shopId, shopName: 'Synthetic Studio', subdomain: 'synthetic-studio', theme: editorTheme(), themeRevision: 0,
        customDomain: {}, storewideDiscount: 0, searchAliases: [] },
        adaptiveAvailability: { available: true, reason: 'ISOLATED_TEST_FIXTURE_ONLY' },
        planAccess: { storeBuilderAccess: 'full', planKey: 'test', features: { storeBuilder: true } },
        products: [product], categories: ['Synthetic category'], categoryDetails: [], reviews: [], revisions: [], draft: null,
        previewCatalog: { products: [product], productsById: { [product._id]: product } },
        adaptiveAssets: [{ assetId: 'a11111111111111111111111', url: '/synthetic-ceramic.png', width: 640, height: 480, name: 'Synthetic ceramic image' }],
        publication: { revision: 0 }, themeAvailability: {} };
}
module.exports = { editorTheme, editorBootstrap, shopId, tokens };
