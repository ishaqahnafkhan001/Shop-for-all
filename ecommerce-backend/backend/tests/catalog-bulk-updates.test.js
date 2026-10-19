const test = require('node:test');
const assert = require('node:assert/strict');
const { validateBulkUpdates, applyBulkProductUpdates } = require('../services/products/bulkProductUpdates');
const { buildProductListQuery, getSummaryProjection } = require('../services/products/productQueryService');

const makeProduct = () => ({
    category: 'Jewellery',
    status: 'Published',
    isActive: true,
    tags: ['classic', 'gift'],
    lowStockThreshold: 5,
    pricing: { sellingPrice: 1200, buyingPrice: 500, discount: 0 },
    variants: [
        {
            stock: 1,
            priceOverride: 1300,
            pricing: { price: 1300, compareAtPrice: 1500, costPrice: 600 },
            inventory: { lowStockThreshold: 2 }
        },
        {
            stock: 20,
            pricing: { price: 1500, compareAtPrice: 1700, costPrice: 700 },
            inventory: { lowStockThreshold: 3 }
        }
    ]
});

test('bulk detail and price updates preserve relative variant prices and update alert thresholds', () => {
    const product = makeProduct();
    const updates = validateBulkUpdates({
        category: 'Festival',
        tags: ['Featured', 'gift'],
        tagsMode: 'add',
        isActive: false,
        lowStockThreshold: 0,
        pricing: { discount: 10 },
        sellingPricePercent: 10,
        buyingPricePercent: 20
    });

    applyBulkProductUpdates(product, updates);

    assert.equal(product.category, 'Festival');
    assert.equal(product.isActive, false);
    assert.deepEqual(product.tags, ['classic', 'gift', 'featured']);
    assert.equal(product.lowStockThreshold, 0);
    assert.deepEqual(product.variants.map(variant => variant.inventory.lowStockThreshold), [0, 0]);
    assert.deepEqual(product.pricing, { sellingPrice: 1320, buyingPrice: 600, discount: 10 });
    assert.equal(product.variants[0].priceOverride, 1430);
    assert.equal(product.variants[0].pricing.price, 1430);
    assert.equal(product.variants[0].pricing.compareAtPrice, 1650);
    assert.equal(product.variants[0].pricing.costPrice, 720);
    assert.equal(product.variants[1].pricing.price, 1650);
    assert.equal(product.variants[1].pricing.costPrice, 840);
    assert.equal(product.variants[0].stock, 1);
});

test('tag remove and clear operate only on selected tags', () => {
    const product = makeProduct();
    applyBulkProductUpdates(product, validateBulkUpdates({ tags: ['gift'], tagsMode: 'remove' }));
    assert.deepEqual(product.tags, ['classic']);
    applyBulkProductUpdates(product, validateBulkUpdates({ tags: [], tagsMode: 'clear' }));
    assert.deepEqual(product.tags, []);
});

test('bulk validation rejects unsafe prices, alert levels, and unknown fields', () => {
    assert.throws(() => validateBulkUpdates({ sellingPricePercent: -100 }), /sellingPricePercent/);
    assert.throws(() => validateBulkUpdates({ lowStockThreshold: -1 }), /lowStockThreshold/);
    assert.throws(() => validateBulkUpdates({ pricing: { discount: 120 } }), /discount/);
    assert.throws(() => validateBulkUpdates({ arbitraryField: true }), /arbitraryField/);
    assert.throws(() => validateBulkUpdates({ stock: 10 }), /stock/);
    assert.throws(() => validateBulkUpdates({ tagsMode: 'clear' }), /Choose tags/);
});

test('admin low-stock filter and summary use the same variant-level expression', () => {
    const projection = getSummaryProjection(false);
    const query = buildProductListQuery({
        shopId: '507f1f77bcf86cd799439011',
        filters: { lowStock: 'true' },
        isStorefrontRequest: false
    });

    assert.deepEqual(query.$expr, { $gt: [projection.lowStockVariantCount, 0] });
    assert.equal(projection.lowStockVariantCount.$size.$filter.cond.$lte[1].$ifNull[1].$ifNull[1], 5);
});
