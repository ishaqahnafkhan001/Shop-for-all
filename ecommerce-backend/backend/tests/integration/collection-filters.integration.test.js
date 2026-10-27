const test = require('node:test');
const assert = require('node:assert/strict');
const { createLaunchSafetyContext, Product } = require('../helpers/launchSafetyHarness');
const Collection = require('../../models/Collection');

test('public collection filters precede pagination and exclude nonmembers, hidden and foreign products', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const shop = ctx.data.shops.shopA;
    const collection = await Collection.create({ shop_id: shop._id, title: 'Filter collection', slug: 'filter-collection' });
    const make = (title, price, stock, rating, discount = 0, extra = {}) => Product.create({ shop_id: shop._id, title, slug: title, description: title, status: 'Published', isActive: true, collections: [collection._id], pricing: { buyingPrice: 0, sellingPrice: price, discount }, averageRating: rating, variants: [{ attributes: [{ name: 'default', value: 'default' }], stock }], ...extra });
    const cheap = await make('cheap', 100, 10, 2);
    const sale = await make('sale', 1000, 0, 4, 50);
    await make('expensive', 1000, 5, 5);
    await make('hidden', 50, 5, 5, 0, { status: 'Draft', isActive: false });
    await make('nonmember', 50, 5, 5, 0, { collections: [] });
    await make('foreign', 50, 5, 5, 0, { shop_id: ctx.data.shops.shopB._id });
    const url = `${ctx.baseUrl}/api/storefront/${shop.subdomain}/collections/filter-collection`;
    const query = async params => { const result = await fetch(`${url}?${new URLSearchParams(params)}`); const body = await result.json(); assert.equal(result.status, 200, JSON.stringify(body)); return body.data; };
    let result = await query({ maxPrice: '600', sort: 'price_asc', limit: '1', page: '2' });
    assert.equal(result.pagination.totalItems ?? result.pagination.total, 2);
    assert.equal(result.products[0]._id, String(sale._id));
    result = await query({ stock: 'in', maxPrice: '600' });
    assert.deepEqual(result.products.map(p => p._id), [String(cheap._id)]);
    result = await query({ stock: 'out', sale: 'true', rating: '4' });
    assert.deepEqual(result.products.map(p => p._id), [String(sale._id)]);
    result = await query({ minPrice: '2000' });
    assert.equal(result.products.length, 0);
    assert.equal(result.pagination.totalItems ?? result.pagination.total, 0);
});
