const test = require('node:test');
const assert = require('node:assert/strict');
const { createLaunchSafetyContext, Product, InventoryLog } = require('../helpers/launchSafetyHarness');

test('stock changes require inventory permission, whole quantities, atomic audit, and replay the same request once', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const product = ctx.data.products.productA.product;
    const variant = product.variants[0];
    const body = { productId: String(product._id), variantId: String(variant._id), quantity: 3, idempotencyKey: 'stock-replay-test' };
    assert.equal((await ctx.staffAClient().unsafePatch('/api/admin/inventory/stock', body)).status, 403);
    const client = ctx.vendorAClient();
    assert.equal((await client.unsafePatch('/api/admin/inventory/stock', { ...body, quantity: 0.5 })).status, 400);
    assert.equal((await client.unsafePatch('/api/admin/inventory/stock', { ...body, mode: 'set', quantity: null })).status, 400);
    const initial = variant.stock;
    const first = await client.unsafePatch('/api/admin/inventory/stock', body);
    assert.equal(first.status, 200, JSON.stringify(first.body));
    const replay = await client.unsafePatch('/api/admin/inventory/stock', body);
    assert.equal(replay.status, 200);
    assert.equal((await Product.findById(product._id)).variants[0].stock, initial + 3);
    assert.equal(await InventoryLog.countDocuments({ productId: product._id, idempotencyKey: body.idempotencyKey }), 1);
    assert.equal((await client.unsafePatch('/api/admin/inventory/stock', { ...body, quantity: 7 })).status, 409);
    const originalCreate = InventoryLog.create;
    InventoryLog.create = async () => { throw new Error('Injected inventory log failure'); };
    let failed;
    try { failed = await client.unsafePatch('/api/admin/inventory/stock', { ...body, idempotencyKey: 'failure-case' }); }
    finally { InventoryLog.create = originalCreate; }
    assert.equal(failed.status, 500);
    assert.equal((await Product.findById(product._id)).variants[0].stock, initial + 3);
    assert.equal((await client.unsafePatch('/api/admin/inventory/stock', { ...body, idempotencyKey: 'failure-case' })).status, 200);
});
