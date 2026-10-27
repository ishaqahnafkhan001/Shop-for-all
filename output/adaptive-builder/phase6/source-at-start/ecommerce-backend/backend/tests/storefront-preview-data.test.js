const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const mongoose = require('mongoose');
const contract = require('@scaleup/storefront-theme');
const serializer = require('../services/publicProductSerializer');
const { buildPagination } = require('../utils/pagination');
const { buildPublicProductQuery } = require('../services/products/publicProductQueryService');
const load = (file, deps) => {
    const filename = path.resolve(__dirname, '..', file);
    const compiled = new Module(filename, module);
    compiled.require = id => deps[id] || {};
    compiled._compile(fs.readFileSync(filename, 'utf8'), filename);
    return compiled.exports;
};
const chain = value => ({ select() { return this; }, sort() { return this; }, limit() { return this; }, lean: async () => structuredClone(value) });
const tenant = '507f1f77bcf86cd799439011';
const firstId = '507f1f77bcf86cd799439021';
const selectedId = '507f1f77bcf86cd799439022';
const draftId = '507f1f77bcf86cd799439023';
const theme = { homepageSections: [{ id: 'selected', type: 'CollectionShowcase', settings: { productIds: [selectedId] } }] };
const access = { storeBuilderAccess: 'full', features: {} };

test('Builder bootstrap prepares public cards and draft-only selections with tenant-scoped queries and real public sanitization', async () => {
    const calls = [], saleCalls = [];
    const raw = [firstId, selectedId, draftId].map((_id, index) => ({ _id, title: `Product ${index}`, images: ['/visible.svg', '/restricted.svg'],
        pricing: { sellingPrice: 100, discount: 0, costPrice: 7 }, entitlementMedia: { restricted: true, visibleSources: ['/visible.svg'] },
        variants: [{ _id: `variant-${index}`, stock: 4, priceOverride: 0, attributes: [{ name: 'Size', value: 'Small' }], pricing: { price: 0, cost: 2 } }] }));
    const projected = raw.map(product => ({ _id: product._id, title: product.title, pricing: product.pricing, images: product.images.slice(0, 1), totalStock: 4 }));
    const deps = {
        mongoose, '@scaleup/storefront-theme': contract,
        '@scaleup/storefront-theme/storage': require('@scaleup/storefront-theme/storage'),
        './adaptivePersistencePolicy': { getAdaptiveAvailability: require('../services/storeBuilder/adaptivePersistencePolicy').getAdaptiveAvailability },
        '../../models/Shop': { findById: id => { assert.equal(id, tenant); return chain({ _id: tenant, shopName: 'Fixture', theme, themeRevision: 17 }); } },
        '../../models/StoreBuilderDraft': { findOne: query => { assert.equal(query.shop_id, tenant); return chain({ theme: { homepageSections: [{ id: 'draft-selected', type: 'FeaturedProducts', settings: { productIds: [draftId] } }] }, basedOnRevision: 17 }); } },
        '../../models/StoreBuilderRevision': { find: () => chain([]) },
        '../../models/Product': {
            find(query) {
                if (!query.status) {
                    assert.equal(query.shop_id, tenant); assert.equal(query.isDeleted, false);
                    assert.deepEqual(query._id.$in, [firstId]);
                    return chain([{ _id: firstId, title: 'Reviewed product' }]);
                }
                assert.equal(String(query.shop_id), tenant); assert.equal(query.status, 'Published'); assert.equal(query.isActive, true); assert.equal(query.isDeleted, false);
                calls.push(query);
                const result = chain(query._id ? raw.slice(1) : raw.slice(0, 1));
                result.select = fields => { assert.match(fields, /variants\.attributes/); assert.match(fields, /variants\.pricing\.price/); assert.doesNotMatch(fields, /costPrice/); return result; };
                result.sort = sort => { assert.deepEqual(sort, { createdAt: -1, _id: 1 }); return result; };
                result.limit = limit => { assert.equal(limit, 9); return result; };
                return result;
            },
            distinct: async () => [],
            async aggregate(pipeline) {
                assert.equal(String(pipeline[0].$match.shop_id), tenant);
                if (pipeline[1]?.$project) {
                    assert.deepEqual(pipeline[1].$project, serializer.PUBLIC_PRODUCT_CARD_PROJECT);
                    assert.deepEqual(pipeline[0].$match._id.$in.map(String), [firstId, selectedId, draftId]);
                    return structuredClone(projected);
                }
                if (pipeline[1]?.$group?.total) return [{ total: 12, published: 12 }];
                return [];
            },
        },
        '../../models/Category': { find: () => chain([]) },
        '../../models/Collection': { find: () => chain([]), aggregate: async () => [] },
        '../../models/Review': { find: () => chain([{ _id: 'review-fixture', product_id: firstId, name: 'Buyer', comment: 'Review', rating: 5 }]), getEligibilityQuery: () => ({ isVisible: true }) },
        '../shops/storeBrandingService': { resolveStoreBranding: async () => ({}) },
        './themeCompatibilityService': { preserveThemeExtensions: value => value },
        './themeAvailabilityService': require('../services/storeBuilder/themeAvailabilityService'),
        '../themeSectionService': { ensureThemeSectionArchitecture: async () => {} },
        '../policies/defaultPolicyTemplates': { fillMissingPolicyDefaults: policies => ({ policies }) },
        '../products/publicProductQueryService': { buildPublicProductQuery },
        '../billing/planAccessService': { getShopPlanAccess: async () => access },
        '../categories/categoryService': { mergeCategoryDetails: () => [], normalizeCategoryKey: value => value },
        '../publicProductSerializer': serializer,
        '../sales/scheduledSaleService': { applyScheduledSalesToProducts: async ({ shopId, products }) => { assert.equal(shopId, tenant); saleCalls.push(products); return products.map(product => ({ ...product, finalPrice: 0, scheduledSale: { discountValue: 100 } })); } },
        '../verification/publicTrustedBadgeService': { getPublicTrustedBadge: async shop => { assert.equal(shop._id, tenant); return { active: true }; } },
        '../verification/vendorVerificationStatusService': { buildPublicShopVerification: () => ({ isVerified: true }) },
        '../../utils/pagination': { buildPagination },
    };
    deps['../products/storefrontPreviewDataService'] = load('services/products/storefrontPreviewDataService.js', {
        '../../models/Product': deps['../../models/Product'],
        './publicProductQueryService': { buildPublicProductQuery },
        '../publicProductSerializer': serializer,
        '../sales/scheduledSaleService': deps['../sales/scheduledSaleService'],
    });
    const service = load('services/storeBuilder/storeBuilderService.js', deps);
    const result = await service.getStoreBuilderBootstrap({ shopId: tenant });
    assert.equal(result.adaptiveAvailability.available, false);
    assert.deepEqual(result.adaptiveAssets, []);
    assert.deepEqual(calls[1]._id.$in, [selectedId, draftId]);
    assert.equal(saleCalls.length, 2);
    assert.deepEqual(result.products.map(product => product._id), [firstId, selectedId, draftId]);
    assert.equal(result.products[0].variants[0].pricing.price, 0);
    assert.equal(result.products[0].pricing.costPrice, undefined);
    assert.equal(result.products[0].variants[0].pricing.cost, undefined);
    assert.deepEqual(result.products[0].images, ['/visible.svg']);
    assert.deepEqual(result.previewCatalog.products.map(product => product._id), [firstId]);
    assert.equal(result.previewCatalog.productsById[draftId].finalPrice, 0);
    assert.equal(result.previewCatalog.pagination.pages, 2);
    assert.equal(result.previewCatalog.pagination.total, 12);
    assert.equal(result.shop.trustedBadge.active, true);
    assert.equal(result.shop.shopVerification.isVerified, true);
    assert.equal(result.reviews[0].product.title, 'Reviewed product');
});

test('live bootstrap fetches Collection and CollectionShowcase selections outside the catalog page', async () => {
    const sections = ['FeaturedProducts', 'Collection', 'CollectionShowcase'].map((type, index) => ({ id: `section-${index}`, type, isEnabled: true, settings: { productIds: [selectedId] } }));
    let selectedQuery = null;
    const controller = load('controllers/storeController.js', {
        mongoose, joi: require('joi'),
        '../models/Shop': { findById: () => chain({ _id: tenant, theme: { homepageSections: sections } }) },
        '../models/Product': {
            aggregate: async pipeline => {
                if (pipeline[0].$match._id) { selectedQuery = pipeline[0].$match; return [{ _id: selectedId, title: 'Off-page selection', pricing: { sellingPrice: 0 } }]; }
                return [];
            }, countDocuments: async () => 0, distinct: async () => [],
        },
        '../models/Category': { find: () => chain([]) }, '../models/Collection': { find: () => chain([]) },
        '../services/cacheService': { get: async () => null, set: async () => {} },
        '../services/billing/planAccessService': { getShopPlanAccess: async () => access },
        '../services/storeBuilder/effectiveThemeService': { applyEffectiveStoreTheme: async () => {} },
        '../services/verification/publicTrustedBadgeService': { getPublicTrustedBadge: async () => null },
        '../services/verification/vendorVerificationStatusService': { buildPublicShopVerification: () => ({}) },
        '../services/shops/featureAccessService': { hasFeature: async () => false },
        '../services/sales/scheduledSaleService': { applyScheduledSalesToProducts: async ({ products }) => products },
        '../services/publicProductSerializer': serializer,
        '../services/categories/categoryService': { mergeCategoryDetails: () => [], normalizeCategoryKey: value => value },
        '../services/products/productQueryService': { normalizeSearchText: value => value || '' },
        '../utils/pagination': { buildPagination },
    });
    let status, body;
    const res = { status(value) { status = value; return this; }, json(value) { body = value; return this; } };
    await controller.getStorefrontBootstrap({ tenantId: tenant, query: {} }, res);
    assert.equal(status, 200, JSON.stringify(body));
    assert.equal(String(selectedQuery.shop_id), tenant);
    assert.equal(selectedQuery.isDeleted, false); assert.equal(selectedQuery.status, 'Published');
    for (const section of sections) assert.equal(body.data.sectionProducts[section.id][0]._id, selectedId);
});

test('private picker requests opt into public cards without altering ordinary Admin responses', async () => {
    const raw = [{ _id: firstId, title: 'Admin product', pricing: { sellingPrice: 100, costPrice: 10 } }];
    const calls = [];
    const controller = load('controllers/productController.js', {
        mongoose,
        '../models/Product': { aggregate: async pipeline => pipeline.some(stage => stage.$project) ? raw : [], countDocuments: async () => 1 },
        '../models/Category': { find: () => chain([]) },
        '../services/products/productQueryService': {
            getSummaryProjection: () => ({ title: 1 }), getProductSort: () => ({ createdAt: -1 }),
            buildProductListQuery: ({ shopId }) => ({ shop_id: shopId }), getCachedCategories: async () => [], addComputedProductFields: value => value,
        },
        '../services/categories/categoryService': { mergeCategoryDetails: () => [], normalizeCategoryKey: value => value },
        '../utils/pagination': { buildPagination },
        '../services/products/storefrontPreviewDataService': { getStorefrontPreviewCards: async args => { calls.push(args); return [{ _id: firstId, finalPrice: 0 }]; } },
    });
    for (const enabled of [false, true]) {
        let status, body;
        await controller.getShopProducts({ tenantId: tenant, user: { role: 'VendorAdmin' }, query: { limit: '10', ...(enabled ? { storefrontPreview: 'true' } : {}) } }, {
            status(value) { status = value; return this; }, json(value) { body = value; return this; },
        });
        assert.equal(status, 200, JSON.stringify(body));
        assert.equal(body.data[0].pricing.costPrice, 10, 'ordinary private response is unchanged');
        if (enabled) assert.deepEqual(body.previewProducts, [{ _id: firstId, finalPrice: 0 }]);
        else assert.equal(body.previewProducts, undefined);
    }
    assert.deepEqual(calls, [{ shopId: tenant, productIds: [firstId] }]);
});

test('shared trusted badge keeps verification, expiry, plan and subscription gates', async () => {
    let feature = true, subscription = true;
    const { getPublicTrustedBadge } = load('services/verification/publicTrustedBadgeService.js', {
        '../../models/Subscription': { findOne: query => { assert.deepEqual(query, { shopId: tenant, status: 'active' }); return chain(subscription ? { _id: 'subscription' } : null); } },
        '../shops/featureAccessService': { hasFeature: async (id, name) => { assert.equal(id, tenant); assert.equal(name, 'trustSystem'); return feature; } },
    });
    const shop = { _id: tenant, badgeStatus: 'active', isActive: true, approvalStatus: 'Approved', verification: { status: 'approved', phoneVerified: true } };
    assert.equal((await getPublicTrustedBadge(shop)).active, true);
    for (const patch of [{ badgeStatus: 'inactive' }, { isActive: false }, { approvalStatus: 'Suspended' }, { verification: { status: 'approved', phoneVerified: false } }, { badgeExpiresAt: '2000-01-01' }, { badgeRevokedAt: '2000-01-01' }]) assert.equal(await getPublicTrustedBadge({ ...shop, ...patch }), null);
    feature = false; assert.equal(await getPublicTrustedBadge(shop), null);
    feature = true; subscription = false; assert.equal(await getPublicTrustedBadge(shop), null);
});
