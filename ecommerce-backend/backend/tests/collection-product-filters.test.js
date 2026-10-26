const test = require('node:test');
const assert = require('node:assert/strict');
const { filterCollectionProducts } = require('../services/collections/collectionProductFilters');
const items = [
    { _id: 'a', pricing: { sellingPrice: 1000, discount: 50 }, totalStock: 0, averageRating: 4 },
    { _id: 'b', pricing: { sellingPrice: 800 }, finalPrice: 200, compareAtPrice: 800, totalStock: 3, averageRating: 5 },
    { _id: 'c', pricing: { sellingPrice: 300 }, totalStock: 5, averageRating: 2 },
    { _id: 'd', pricing: { sellingPrice: 0 }, totalStock: 2, averageRating: 0 }
];
test('collection filters combine effective prices, discounts, availability and rating', () => {
    assert.deepEqual(filterCollectionProducts(items, { minPrice: '100', maxPrice: '600', stock: 'in', sale: 'true', rating: '4' }).map(item => item._id), ['b']);
    assert.deepEqual(filterCollectionProducts(items, { stock: 'out' }).map(item => item._id), ['a']);
    assert.deepEqual(filterCollectionProducts(items, { maxPrice: '0' }).map(item => item._id), ['d']);
    assert.deepEqual(filterCollectionProducts(items, { minPrice: '900' }), []);
});
test('collection price ordering uses scheduled and ordinary discounts without mutating input', () => {
    assert.deepEqual(filterCollectionProducts(items, { sort: 'price_asc' }).map(item => item._id), ['d', 'b', 'c', 'a']);
    assert.deepEqual(filterCollectionProducts(items, { sort: 'price_desc', sale: 'true' }).map(item => item._id), ['a', 'b']);
    assert.deepEqual(items.map(item => item._id), ['a', 'b', 'c', 'd']);
});
