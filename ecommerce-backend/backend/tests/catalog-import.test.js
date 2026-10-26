const test = require('node:test');
const assert = require('node:assert/strict');
const { prepareImportRow, applyImportRow } = require('../services/products/catalogImport');

test('import validates numbers, headers, identity and statuses without coercing malformed values', () => {
    for (const value of ['NaN', '-1', 'Infinity', '10 dollars']) assert.throws(() => prepareImportRow({ title: 'Product', sellingPrice: value }, 'create'), /Invalid sellingPrice/);
    assert.throws(() => prepareImportRow({ title: 'Product', typo: 'x' }, 'create'), /Unknown column/);
    assert.throws(() => prepareImportRow({ title: 'Product', id: 'a'.repeat(24) }, 'create'), /Update existing/);
    assert.throws(() => prepareImportRow({ id: 'invalid' }, 'update'), /valid product id/);
    assert.throws(() => prepareImportRow({ title: 'Product', status: 'Live' }, 'create'), /Status/);
    assert.equal(prepareImportRow({ title: 'Product', lowStockThreshold: 0 }, 'create').lowStockThreshold, 0);
    assert.equal(prepareImportRow({ title: 'Product', lowStockThreshold: '' }, 'create').lowStockThreshold, undefined);
});

test('summary updates preserve variant inventory and reject silent price corrections', () => {
    const product = { slug: 'shirt', pricing: { buyingPrice: 50, sellingPrice: 100 }, variants: [{ stock: 9, sku: 'shirt-blue' }], images: ['existing.png'], seo: {}, description: 'Original' };
    const row = prepareImportRow({ id: 'a'.repeat(24), title: 'New name', totalStock: '999', sellingPrice: '120' }, 'update');
    applyImportRow(product, row, 'update');
    assert.equal(product.variants[0].stock, 9);
    assert.equal(product.description, 'Original');
    assert.deepEqual(product.images, ['existing.png']);
    assert.equal(product.pricing.sellingPrice, 120);
    assert.throws(() => applyImportRow(product, { sellingPrice: 10 }, 'update'), /below buying cost/);
});
