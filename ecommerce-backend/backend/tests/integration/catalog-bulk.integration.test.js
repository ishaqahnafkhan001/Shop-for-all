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
});
