const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
    getRuntimeStatus,
    applyScheduledSaleToProduct,
    buildPricingResult
} = require('../services/sales/scheduledSaleService');
const {
    shouldQueueLowStockAlert
} = require('../services/inventoryLowStockAlertService');
const {
    addComputedProductFields
} = require('../services/products/productQueryService');

const backendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(backendRoot, '../..');
const readBackend = (file) => fs.readFileSync(path.join(backendRoot, file), 'utf8');
const readRepo = (file) => fs.readFileSync(path.join(repoRoot, file), 'utf8');

test('scheduled sale runtime status follows date windows', () => {
    const now = new Date('2026-07-04T12:00:00.000Z');
    assert.equal(getRuntimeStatus({
        status: 'scheduled',
        startsAt: '2026-07-04T13:00:00.000Z',
        endsAt: '2026-07-04T14:00:00.000Z'
    }, now), 'scheduled');
    assert.equal(getRuntimeStatus({
        status: 'scheduled',
        startsAt: '2026-07-04T11:00:00.000Z',
        endsAt: '2026-07-04T14:00:00.000Z'
    }, now), 'active');
    assert.equal(getRuntimeStatus({
        status: 'scheduled',
        startsAt: '2026-07-04T12:00:00.000Z',
        endsAt: '2026-07-04T14:00:00.000Z'
    }, now), 'active');
    assert.equal(getRuntimeStatus({
        status: 'active',
        startsAt: '2026-07-04T10:00:00.000Z',
        endsAt: '2026-07-04T12:00:00.000Z'
    }, now), 'ended');
    assert.equal(getRuntimeStatus({
        status: 'cancelled',
        startsAt: '2026-07-04T10:00:00.000Z',
        endsAt: '2026-07-04T14:00:00.000Z'
    }, now), 'cancelled');
});

test('scheduled sale decorates public product pricing without changing base price', () => {
    const product = {
        _id: 'product-1',
        title: 'Sale Product',
        pricing: {
            sellingPrice: 1000,
            discount: 10
        }
    };
    const [sale] = [{
        _id: 'sale-1',
        name: 'Flash Sale',
        scope: 'all_products',
        discountType: 'percentage',
        discountValue: 20,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 3600000)
    }];

    const result = applyScheduledSaleToProduct(product, [sale]);

    assert.equal(result.pricing.sellingPrice, 1000);
    assert.equal(result.compareAtPrice, 900);
    assert.equal(result.finalPrice, 720);
    assert.equal(result.salePrice, 720);
    assert.equal(result.scheduledSale.name, 'Flash Sale');
});

test('scheduled sale product scope and overlap precedence are deterministic', () => {
    const product = {
        _id: 'product-selected',
        title: 'Scoped Product',
        pricing: {
            sellingPrice: 1000,
            discount: 0
        }
    };
    const otherProduct = {
        ...product,
        _id: 'product-other'
    };
    const sales = [
        {
            _id: 'sale-lower-discount',
            name: 'Lower Discount',
            scope: 'all_products',
            discountType: 'percentage',
            discountValue: 20,
            priority: 100,
            createdAt: new Date('2026-07-01T10:00:00.000Z'),
            startsAt: new Date('2026-07-04T10:00:00.000Z'),
            endsAt: new Date('2026-07-04T14:00:00.000Z')
        },
        {
            _id: 'sale-selected-best',
            name: 'Selected Best',
            scope: 'selected_products',
            productIds: ['product-selected'],
            discountType: 'fixed',
            discountValue: 250,
            priority: 1,
            createdAt: new Date('2026-07-02T10:00:00.000Z'),
            startsAt: new Date('2026-07-04T10:00:00.000Z'),
            endsAt: new Date('2026-07-04T14:00:00.000Z')
        },
        {
            _id: 'sale-selected-tie-later',
            name: 'Selected Tie Later',
            scope: 'selected_products',
            productIds: ['product-selected'],
            discountType: 'percentage',
            discountValue: 25,
            priority: 1,
            createdAt: new Date('2026-07-03T10:00:00.000Z'),
            startsAt: new Date('2026-07-04T10:00:00.000Z'),
            endsAt: new Date('2026-07-04T14:00:00.000Z')
        }
    ];

    const scoped = applyScheduledSaleToProduct(product, sales);
    assert.equal(scoped.finalPrice, 750);
    assert.equal(scoped.scheduledSale.name, 'Selected Best');

    const other = applyScheduledSaleToProduct(otherProduct, sales);
    assert.equal(other.finalPrice, 800);
    assert.equal(other.scheduledSale.name, 'Lower Discount');

    const pricing = buildPricingResult({ product, sales, quantity: 2 });
    assert.equal(pricing.basePrice, 1000);
    assert.equal(pricing.effectivePrice, 750);
    assert.equal(pricing.automaticDiscount, 250);
    assert.equal(String(pricing.scheduledSaleId), 'sale-selected-best');
    assert.equal(pricing.quantity, 2);
});

test('scheduled sale collection scope applies through product collection membership', () => {
    const product = {
        _id: 'product-in-collection',
        title: 'Collection Product',
        collections: ['collection-a'],
        pricing: {
            sellingPrice: 1000,
            discount: 0
        }
    };
    const productOutsideCollection = {
        ...product,
        _id: 'product-outside-collection',
        collections: ['collection-b']
    };
    const sales = [
        {
            _id: 'sale-collection',
            name: 'Collection Sale',
            scope: 'selected_collections',
            collectionIds: ['collection-a'],
            discountType: 'percentage',
            discountValue: 30,
            priority: 1,
            createdAt: new Date('2026-07-01T10:00:00.000Z'),
            startsAt: new Date('2026-07-04T10:00:00.000Z'),
            endsAt: new Date('2026-07-04T14:00:00.000Z')
        }
    ];

    const scoped = applyScheduledSaleToProduct(product, sales);
    assert.equal(scoped.finalPrice, 700);
    assert.equal(scoped.scheduledSale.scope, 'selected_collections');
    assert.equal(scoped.scheduledSale.collectionIds, undefined);

    const outside = applyScheduledSaleToProduct(productOutsideCollection, sales);
    assert.equal(outside.finalPrice, undefined);
    assert.equal(outside.scheduledSale, undefined);
});

test('cart estimate and category filters are URL-backed storefront-only polish', () => {
    const cartPage = readRepo('ecommerce-storefront/src/app/[subdomain]/cart/page.jsx');
    const cartConstants = readRepo('ecommerce-storefront/src/lib/cartConstants.js');
    const categoryPage = readRepo('ecommerce-storefront/src/app/[subdomain]/categories/[slug]/page.jsx');
    const categoryClient = readRepo('ecommerce-storefront/src/app/[subdomain]/categories/[slug]/CategoryPageClient.jsx');
    const productController = readBackend('controllers/productController.js');

    assert.match(cartConstants, /DEFAULT_CART_DELIVERY_ESTIMATE\s*=\s*80/);
    assert.match(cartPage, /DEFAULT_CART_DELIVERY_ESTIMATE/);
    assert.match(cartPage, /Estimated delivery/);
    assert.doesNotMatch(cartPage, /\?\s*60\s*:/);
    assert.match(categoryPage, /searchParams/);
    assert.match(categoryPage, /minPrice/);
    assert.match(categoryPage, /stock/);
    assert.match(categoryPage, /sale/);
    assert.match(categoryClient, /useSearchParams/);
    assert.match(categoryClient, /role="dialog"/);
    assert.match(categoryClient, /activeFilters/);
    assert.match(productController, /normalizedStockFilter/);
    assert.match(productController, /normalizedStockFilter\) \|\|/);
    assert.match(productController, /normalizedStockFilter === 'in' && stock <= 0/);
    assert.match(productController, /normalizedStockFilter === 'out' && stock > 0/);
});

test('computed product fields preserve already-decorated sale price', () => {
    const result = addComputedProductFields({
        pricing: { sellingPrice: 1000, discount: 0, salePrice: 700 },
        finalPrice: 700
    });

    assert.equal(result.finalPrice, 700);
});

test('low-stock alert trigger crosses threshold once and service has persisted latch/reset path', () => {
    const product = { lowStockThreshold: 5 };
    const variant = { inventory: { lowStockThreshold: 3 } };

    assert.equal(shouldQueueLowStockAlert({
        product,
        variant,
        beforeStock: 3,
        afterStock: 2
    }).shouldAlert, false);
    assert.equal(shouldQueueLowStockAlert({
        product,
        variant,
        beforeStock: 4,
        afterStock: 2
    }).shouldAlert, true);

    const service = readBackend('services/inventoryLowStockAlertService.js');
    assert.match(service, /lowStockAlertActive/);
    assert.match(service, /resetLowStockAlertState/);
    assert.match(service, /markLowStockAlertQueued/);
    assert.match(service, /markLowStockAlertSent/);
    assert.doesNotMatch(service, /filter\(log => Number\(log\.change \|\| 0\) < 0\)/);
});

test('phase 2 routes and models expose scheduled sales, banner windows, and granular permissions', () => {
    const app = readBackend('app.js');
    const saleRoutes = readBackend('routes/scheduledSaleRoutes.js');
    const saleModel = readBackend('models/ScheduledSale.js');
    const bannerModel = readBackend('models/Banner.js');
    const bannerController = readBackend('controllers/bannerController.js');
    const staffBackend = readBackend('services/staff/staffCapacityService.js');
    const staffAdmin = readRepo('ecommerce-admin/src/utils/staffPermissions.js');

    assert.match(app, /scheduledSaleRoutes/);
    assert.match(app, /\/api\/admin\/scheduled-sales/);
    assert.match(saleRoutes, /requirePermission\('salesManage'\)/);
    assert.match(saleModel, /startsAt/);
    assert.match(saleModel, /endsAt/);
    assert.match(saleModel, /popup/);
    assert.match(saleModel, /selected_collections/);
    assert.match(saleModel, /collectionIds/);
    assert.match(saleRoutes, /\/collections/);
    assert.match(bannerModel, /startsAt/);
    assert.match(bannerModel, /endsAt/);
    assert.match(bannerController, /getActiveBannerQuery/);
    assert.match(staffBackend, /collectionsAi/);
    assert.match(staffBackend, /productsSchedule/);
    assert.match(staffBackend, /salesManage/);
    assert.match(staffBackend, /bannersManage/);
    assert.match(staffAdmin, /Scheduled sales/);
    assert.match(staffAdmin, /Launch banners/);
});

test('storefront surfaces sale pricing and sale popups without private pricing fields', () => {
    const storeController = readBackend('controllers/storeController.js');
    const publicSerializer = readBackend('services/publicProductSerializer.js');
    const storefrontClient = readRepo('ecommerce-storefront/src/app/[subdomain]/StorefrontHomeClient.jsx');
    const shopData = readRepo('ecommerce-storefront/src/hooks/useShopData.js');

    assert.match(storeController, /applyScheduledSalesToProducts/);
    assert.match(storeController, /getActiveSalePopups/);
    assert.match(storeController, /serverNow/);
    assert.match(readBackend('controllers/collectionController.js'), /applyScheduledSalesToProducts/);
    assert.match(publicSerializer, /salePrice/);
    assert.match(publicSerializer, /compareAtPrice/);
    assert.match(publicSerializer, /scheduledSale/);
    assert.doesNotMatch(publicSerializer, /buyingPrice/);
    assert.doesNotMatch(publicSerializer, /collectionIds/);
    assert.match(shopData, /activeSalePopups/);
    assert.match(shopData, /serverNow/);
    assert.match(storefrontClient, /serverOffset/);
    assert.match(storefrontClient, /refreshBootstrap/);
    assert.match(storefrontClient, /sale-popup:\$\{subdomain\}/);
    assert.match(storefrontClient, /once_per_day/);
    assert.match(storefrontClient, /role="dialog"/);
    assert.match(storefrontClient, /salePopupClosedForPage/);
    assert.match(storefrontClient, /sm:right-5/);
    assert.match(storefrontClient, /afterHeroContent/);
});

test('admin schedule forms convert browser-local date times to explicit UTC values', () => {
    const promotionsPage = readRepo('ecommerce-admin/src/pages/dashboard/Promotions.jsx');
    const bannersPage = readRepo('ecommerce-admin/src/pages/dashboard/Promotional Banner/promotionalBanner.jsx');
    const dateTimeUtility = readRepo('ecommerce-admin/src/utils/dateTime.js');

    assert.match(dateTimeUtility, /new Date\(input\)/);
    assert.match(dateTimeUtility, /date\.toISOString\(\)/);
    assert.match(promotionsPage, /startsAt: localDateTimeToUtcIso\(form\.startsAt\)/);
    assert.match(promotionsPage, /endsAt: localDateTimeToUtcIso\(saleForm\.endsAt\)/);
    assert.match(promotionsPage, /displayStartsAt: localDateTimeToUtcIso/);
    assert.match(bannersPage, /formData\.append\('startsAt', localDateTimeToUtcIso\(startsAt\)\)/);
    assert.match(bannersPage, /formData\.append\('endsAt', localDateTimeToUtcIso\(endsAt\)\)/);
});
