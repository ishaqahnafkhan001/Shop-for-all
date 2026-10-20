const test = require('node:test');
const assert = require('node:assert/strict');
const Product = require('../models/Product');
const { createProductSchema, updateProductSchema } = require('../validations/productValidation');
const { applyVariantOperations, assertVariantSet, buildSimpleVariant } = require('../services/products/productVariantService');
const { makeVariantKey, generateNewOptionCombos } = require('../helpers/variantMatrix');
const { getLowStockThreshold, shouldQueueLowStockAlert } = require('../services/inventoryLowStockAlertService');
const shopId = '507f1f77bcf86cd799439011';
const base = { title: 'Test product', description: 'A complete product description', images: ['https://example.com/test.png'], pricing: { buyingPrice: 1, sellingPrice: 2 } };
const row = (value, extra = {}) => ({ attributes: [{ name: 'color', value }], stock: 0, ...extra });
const apply = (product, value) => applyVariantOperations({ product, value });

test('F06 optional category normalizes whitespace, and rejects invalid types and excessive length', () => {
    for (const schema of [createProductSchema, updateProductSchema]) {
        for (const category of [undefined, '', '  ', ' Clothing ']) {
            const result = schema.validate({ ...(schema === createProductSchema ? base : {}), ...(category === undefined ? { title: base.title } : { category }) });
            assert.equal(result.error, undefined);
            if (category !== undefined) assert.equal(result.value.category, category.trim());
        }
        for (const category of [null, {}, [], 42, 'x'.repeat(101)]) assert(schema.validate({ ...(schema === createProductSchema ? base : {}), category }).error);
    }
});

test('F07 complete resulting set rejects canonical aliases and retains legitimate delimiter-bearing variants', () => {
    const attrs = [{ name: ' Color ', value: ' Red ' }, { name: 'Size', value: 'M' }];
    const alias = [{ name: ' size ', value: 'm' }, { name: 'color', value: 'red' }];
    assert.equal(makeVariantKey(attrs), makeVariantKey(alias));
    const product = new Product({ ...base, shop_id: shopId, variants: [{ attributes: attrs, stock: 8, inventory: { stock: 8, reservedStock: 2 } }] });
    assert.throws(() => apply(product, { variants: [{ attributes: alias, stock: 0 }] }), /Duplicate/);
    assertVariantSet([
        { attributes: [{ name: 'a', value: 'b|c:d' }] },
        { attributes: [{ name: 'a', value: 'b' }, { name: 'c', value: 'd' }] }
    ]);
    const direct = generateNewOptionCombos([row(' Red ')], ' COLOR ', ' red ');
    assert.match(direct.error, /already exists/);
    const mixed = generateNewOptionCombos([
        { attributes: [{ name: 'color', value: 'Red' }, { name: 'size', value: 'M' }] },
        { attributes: [{ name: 'color', value: ' red ' }, { name: 'size', value: 'L' }] }
    ], 'size', 'XL');
    assert.equal(mixed.error, null);
    assert.equal(mixed.newVariants.length, 1);
});

test('F08 runtime service checks projected add-option count before constructing new records', () => {
    const product = new Product({ ...base, shop_id: shopId, variants: Array.from({ length: 500 }, (_, i) => row(`c${i}`)) });
    const impossibleStock = { valueOf() { throw new Error('expanded before checking the limit'); } };
    assert.throws(() => apply(product, { addAttributeOption: { name: 'color', option: 'extra', defaultStock: impossibleStock } }), /500/);
});

test('F08 zero/one/500/501 flat and matrix boundaries, conflict rejection, and editing at cap', () => {
    for (const count of [0, 1, 500, 501]) {
        const variants = Array.from({ length: count }, (_, i) => row(`c${i}`));
        assert.equal(Boolean(createProductSchema.validate({ ...base, variants }).error), ![1, 500].includes(count));
        assert.equal(Boolean(updateProductSchema.validate({ variants }).error), count > 500);
    }
    for (const count of [1, 500, 501]) {
        const attributes = count === 1 ? [{ name: 'a', options: ['one'] }] : count === 500
            ? [{ name: 'a', options: Array.from({ length: 50 }, (_, i) => `a${i}`) }, { name: 'b', options: Array.from({ length: 10 }, (_, i) => `b${i}`) }]
            : [{ name: 'a', options: Array.from({ length: 3 }, (_, i) => `a${i}`) }, { name: 'b', options: Array.from({ length: 167 }, (_, i) => `b${i}`) }];
        assert.equal(Boolean(createProductSchema.validate({ ...base, variantMatrix: { attributes } }).error), count > 500);
    }
    const product = new Product({ ...base, shop_id: shopId, variants: Array.from({ length: 500 }, (_, i) => row(`c${i}`)) });
    const ids = product.variants.map(v => String(v._id));
    apply(product, { variants: [{ _id: ids[0], sku: 'AT-CAP' }] });
    assert.deepEqual(product.variants.map(v => String(v._id)), ids);
    assert.equal(product.variants[0].sku, 'AT-CAP');
    assert.throws(() => assertVariantSet([]), /1 to 500/);
    assert.throws(() => apply(product, { variants: [], removeVariants: [ids[0]] }), /Conflicting/);
    assert(createProductSchema.validate({ ...base, variantMatrix: { attributes: [{ name: 'a', options: [] }] } }).error);
    assert.throws(() => apply(product, { variantMatrix: { attributes: [{ name: 'color', options: Array.from({ length: 501 }, (_, i) => `c${i}`) }] } }), /500/);
});

test('F09 zero, omitted and undefined thresholds follow defaults while null is rejected by the API', () => {
    for (const threshold of [0, undefined]) {
        const result = createProductSchema.validate({ ...base, lowStockThreshold: threshold });
        assert.equal(result.error, undefined);
        assert.equal(result.value.lowStockThreshold, threshold ?? 5);
        assert.equal(buildSimpleVariant({ lowStockThreshold: threshold }).inventory.lowStockThreshold, threshold ?? 5);
    }
    assert(createProductSchema.validate({ ...base, lowStockThreshold: null }).error);
    assert(updateProductSchema.validate({ variants: [{ _id: shopId, inventory: { lowStockThreshold: null } }] }).error);
    assert.equal(getLowStockThreshold({ lowStockThreshold: 7 }, { inventory: { lowStockThreshold: 0 } }), 0);
    assert.equal(getLowStockThreshold({ lowStockThreshold: 0 }, {}), 0);
    assert.deepEqual(shouldQueueLowStockAlert({ product: { lowStockThreshold: 5 }, variant: { inventory: { lowStockThreshold: 0 } }, beforeStock: 2, afterStock: 1 }), { threshold: 0, shouldAlert: false });
    assert.equal(shouldQueueLowStockAlert({ product: {}, variant: { inventory: { lowStockThreshold: 0 } }, beforeStock: 1, afterStock: 0 }).shouldAlert, true);
});
