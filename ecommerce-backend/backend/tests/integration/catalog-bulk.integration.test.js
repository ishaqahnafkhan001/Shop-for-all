const test = require('node:test');
const assert = require('node:assert/strict');
const { createLaunchSafetyContext, Product } = require('../helpers/launchSafetyHarness');

test('Catalog Tools bulk edit acknowledges committed changes and keeps foreign products untouched', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const ownId = String(ctx.data.products.productA.product._id);
    const foreignId = String(ctx.data.products.productB.product._id);
    const response = await ctx.vendorAClient().unsafePatch('/api/admin/products/bulk', {
        productIds: [ownId, foreignId],
        updates: { category: 'Updated category' }
    });

    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.count, 1);
    assert.equal((await Product.findById(ownId)).category, 'Updated category');
    assert.equal((await Product.findById(foreignId)).category, 'Shop B Category');

    const stockAttempt = await ctx.vendorAClient().unsafePatch('/api/admin/products/bulk', {
        productIds: [ownId],
        updates: { stock: 0 }
    });
    assert.equal(stockAttempt.status, 400);
    assert.equal((await Product.findById(ownId)).variants[0].stock, 20);
});

test('catalog low-stock summaries match Overview variants and bulk edits update variant alerts and prices', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const own = ctx.data.products.productA.product;
    const foreignId = String(ctx.data.products.productB.product._id);
    own.variants[0].stock = 1;
    own.variants[0].inventory.stock = 1;
    own.variants.push({
        sku: 'shop-a-second-sku',
        attributes: [{ name: 'Size', value: 'Large' }],
        stock: 20,
        pricing: { price: 1500, compareAtPrice: 1700, costPrice: 600 },
        inventory: { stock: 20, lowStockThreshold: 2 }
    });
    await own.save();

    const client = ctx.vendorAClient();
    const beforeList = await client.get('/api/admin/products?limit=100');
    assert.equal(beforeList.status, 200, JSON.stringify(beforeList.body));
    const beforeSummary = beforeList.body.data.find(item => String(item._id) === String(own._id));
    assert.equal(beforeSummary.totalStock, 21);
    assert.equal(beforeSummary.lowStockVariantCount, 1);

    const beforeOverview = await client.get('/api/admin/dashboard-overview');
    assert.equal(beforeOverview.status, 200, JSON.stringify(beforeOverview.body));
    assert.equal(beforeOverview.body.data.lowStock.filter(row => String(row.productId) === String(own._id)).length, 1);

    const response = await client.unsafePatch('/api/admin/products/bulk', {
        productIds: [String(own._id), foreignId],
        updates: {
            lowStockThreshold: 0,
            tags: ['featured'],
            tagsMode: 'add',
            sellingPricePercent: 10,
            buyingPricePercent: 20,
            pricing: { discount: 15 },
            isActive: false
        }
    });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.count, 1);

    const updated = await Product.findById(own._id);
    assert.equal(updated.lowStockThreshold, 0);
    assert.deepEqual(updated.variants.map(variant => variant.inventory.lowStockThreshold), [0, 0]);
    assert.equal(updated.pricing.sellingPrice, 1320);
    assert.equal(updated.pricing.buyingPrice, 600);
    assert.equal(updated.pricing.discount, 15);
    assert.equal(updated.variants[0].pricing.price, 1320);
    assert.equal(updated.variants[1].pricing.price, 1650);
    assert.equal(updated.variants[1].pricing.costPrice, 720);
    assert.equal(updated.tags.includes('featured'), true);
    assert.equal(updated.isActive, false);

    const afterList = await client.get('/api/admin/products?limit=100');
    const afterSummary = afterList.body.data.find(item => String(item._id) === String(own._id));
    assert.equal(afterSummary.lowStockVariantCount, 0);
    const afterOverview = await client.get('/api/admin/dashboard-overview');
    assert.equal(afterOverview.body.data.lowStock.some(row => String(row.productId) === String(own._id)), false);
    assert.equal((await Product.findById(foreignId)).pricing.sellingPrice, 2400);
});
