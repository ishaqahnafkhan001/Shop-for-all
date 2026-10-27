const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createLaunchSafetyContext, Product } = require('../helpers/launchSafetyHarness');

test('catalog import validates atomically, updates by owned ID, preserves variants and safely replays', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const client = ctx.vendorAClient();
    const own = ctx.data.products.productA.product;
    const foreign = ctx.data.products.productB.product;
    const before = await Product.findById(own._id).lean();
    const request = { mode: 'update', operationId: randomUUID(), products: [{ id: String(own._id), title: 'Updated CSV title', sellingPrice: '1500', lowStockThreshold: '0' }] };
    let result = await client.unsafePost('/api/admin/products/bulk-import', { ...request, dryRun: true });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal((await Product.findById(own._id)).title, before.title);
    result = await client.unsafePost('/api/admin/products/bulk-import', request);
    assert.equal(result.status, 200, JSON.stringify(result.body));
    const after = await Product.findById(own._id).lean();
    assert.equal(after.title, 'Updated CSV title');
    assert.equal(after.lowStockThreshold, 0);
    assert.deepEqual(after.variants, before.variants);
    result = await client.unsafePost('/api/admin/products/bulk-import', request);
    assert.equal(result.body.replayed, true);
    result = await client.unsafePost('/api/admin/products/bulk-import', { ...request, operationId: randomUUID(), products: [{ id: String(own._id), title: 'Must not save' }, { id: String(foreign._id), title: 'Foreign' }] });
    assert.equal(result.status, 400);
    assert.equal(result.body.errors[0].row, 3);
    assert.equal((await Product.findById(own._id)).title, 'Updated CSV title');
    const create = { mode: 'create', operationId: randomUUID(), products: [{ title: 'New CSV', sellingPrice: '100', buyingPrice: '50', stock: '2', lowStockThreshold: '0' }] };
    result = await client.unsafePost('/api/admin/products/bulk-import', create);
    assert.equal(result.status, 200, JSON.stringify(result.body));
    result = await client.unsafePost('/api/admin/products/bulk-import', create);
    assert.equal(result.body.replayed, true);
    assert.equal(await Product.countDocuments({ shop_id: own.shop_id, title: 'New CSV' }), 1);
});

test('catalog paginates and searches SKU; bulk preview has no writes and undo rejects intervening edits', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const client = ctx.vendorAClient();
    const own = ctx.data.products.productA.product;
    const before = await Product.findById(own._id).lean();
    const list = await client.get(`/api/admin/catalog/products?search=${encodeURIComponent(before.variants[0].sku)}`);
    assert.equal(list.status, 200, JSON.stringify(list.body));
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.summary.total, 1);
    const payload = { productIds: [String(own._id)], updates: { sellingPricePercent: 10 } };
    let result = await client.unsafePatch('/api/admin/products/bulk', { ...payload, dryRun: true });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.preview.length, 1);
    assert.equal((await Product.findById(own._id)).pricing.sellingPrice, before.pricing.sellingPrice);
    result = await client.unsafePatch('/api/admin/products/bulk', payload);
    assert.equal(result.status, 200, JSON.stringify(result.body));
    let history = await client.get('/api/admin/catalog/activity');
    result = await client.unsafePost(`/api/admin/catalog/activity/${history.body.data[0]._id}/undo`, {});
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal((await Product.findById(own._id)).pricing.sellingPrice, before.pricing.sellingPrice);
    await client.unsafePatch('/api/admin/products/bulk', payload);
    history = await client.get('/api/admin/catalog/activity');
    await Product.updateOne({ _id: own._id }, { $set: { title: 'Later edit' } });
    result = await client.unsafePost(`/api/admin/catalog/activity/${history.body.data[0]._id}/undo`, {});
    assert.equal(result.status, 409, JSON.stringify(result.body));
    assert.equal((await Product.findById(own._id)).title, 'Later edit');
});

test('catalog access is independent of product permission and failed collection writes roll back', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const StaffPermission = require('../../models/StaffPermission');
    const Collection = require('../../models/Collection');
    await StaffPermission.updateMany({ shop_id: ctx.data.shops.shopA._id }, { $set: { 'permissions.catalogTools': true, 'permissions.products': false } });
    const staff = ctx.staffAClient();
    assert.equal((await staff.get('/api/admin/catalog/products')).status, 200);
    assert.equal((await staff.get('/api/admin/products')).status, 403);
    const own = ctx.data.products.productA.product;
    const collection = await Collection.create({ shop_id: own.shop_id, title: 'Atomic collection', slug: 'atomic-collection', productIds: [own._id] });
    const original = Product.updateMany;
    Product.updateMany = () => { throw new Error('Simulated backlink failure'); };
    let result;
    try { result = await ctx.vendorAClient().unsafePatch(`/api/admin/collections/${collection._id}`, { title: 'Should roll back', productIds: [] }); }
    finally { Product.updateMany = original; }
    assert.equal(result.status, 400);
    const unchanged = await Collection.findById(collection._id);
    assert.equal(unchanged.title, 'Atomic collection');
    assert.equal(unchanged.productIds.length, 1);
});
