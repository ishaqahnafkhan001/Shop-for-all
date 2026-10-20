const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Product = require('../models/Product');
const { createProductSchema, updateProductSchema } = require('../validations/productValidation');
const service = require('../services/products/productVariantService');
const media = require('../services/products/productMediaService');
const { normalizeProductPublicationFields } = require('../services/products/scheduledProductService');

const shop = '507f1f77bcf86cd799439011';
const image = 'https://example.com/a.webp';
const base = { shop_id: shop, title: 'Cotton shirt', description: 'A comfortable cotton shirt.', images: [image], pricing: { buyingPrice: 50, sellingPrice: 100, discount: 0 } };
const { shop_id: unusedShop, ...createBase } = base;
const make = (variants, extra = {}) => new Product({ ...base, variants, ...extra });
const apply = (product, value) => service.applyVariantOperations({ product, value, ...service.snapshotVariantStock(product) });
const row = (value, extra = {}) => ({ attributes: [{ name: 'color', value }], stock: 12, ...extra });

test('existing variant metadata validates without stock, including simple variants', () => {
    const product = make([service.buildSimpleVariant({ stock: 12, pricing: base.pricing })]);
    const patch = { variants: [{ _id: String(product.variants[0]._id), attributes: [], sku: '', pricing: { price: 120 } }] };
    assert.equal(updateProductSchema.validate(patch).error, undefined);
});

test('new variants still require stock; existing inventory and reservations cannot be assigned', () => {
    assert(updateProductSchema.validate({ variants: [{ attributes: [{ name: 'color', value: 'red' }] }] }).error);
    assert(updateProductSchema.validate({ variants: [{ _id: shop, inventory: { reservedStock: 0 } }] }).error);
    assert(updateProductSchema.validate({ variants: [{ _id: shop, stock: 0 }] }).error);
    assert(updateProductSchema.validate({ variants: [{ _id: shop, inventory: { stock: 0 } }] }).error);
});

test('metadata-only patch preserves stock, reservations, alert state and variant identity', () => {
    const product = make([row('red', { inventory: { stock: 12, reservedStock: 3, lowStockAlertStatus: 'sent' }, barcode: 'old', weight: 2 })]);
    const variant = product.variants[0];
    const beforeId = String(variant._id);
    apply(product, { variants: [{ _id: beforeId, sku: 'NEW', inventory: { lowStockThreshold: 0 } }] });
    assert.equal(product.variants[0].stock, 12);
    assert.equal(product.variants[0].inventory.stock, 12);
    assert.equal(product.variants[0].inventory.reservedStock, 3);
    assert.equal(product.variants[0].inventory.lowStockAlertStatus, 'sent');
    assert.equal(product.variants[0].barcode, 'old');
    assert.equal(product.variants[0].weight, 2);
    assert.equal(String(product.variants[0]._id), beforeId);
    assert.equal(product.variants[0].inventory.lowStockThreshold, 0);
});

test('matrix regeneration cannot reset existing stock or reservations', () => {
    const product = make([row('red', { inventory: { stock: 12, reservedStock: 3 } })]);
    const beforeId = String(product.variants[0]._id);
    assert.throws(() => apply(product, { variantMatrix: { attributes: [{ name: 'color', options: ['red', 'blue'] }], defaultStock: 2, overrides: { red: { stock: 0, inventory: { stock: 0, reservedStock: 0 } } } } }), /inventory|stock|reserv/i);
    apply(product, { variantMatrix: { attributes: [{ name: 'color', options: ['red', 'blue'] }], defaultStock: 2 } });
    assert.equal(product.variants[0].stock, 12);
    assert.equal(product.variants[0].inventory.reservedStock, 3);
    assert.equal(String(product.variants[0]._id), beforeId);
    assert.equal(product.variants[1].stock, 2);
});

test('new simple products inherit base price/cost rather than pinning copied overrides', () => {
    const variant = service.buildSimpleVariant({ stock: 12, pricing: base.pricing, lowStockThreshold: 0 });
    assert.equal(variant.pricing?.price, undefined);
    assert.equal(variant.pricing?.costPrice, undefined);
    assert.equal(variant.inventory.lowStockThreshold, 0);
});

test('legacy simple copied prices follow explicit base edits; custom overrides stay intact', () => {
    for (const [price, cost, expectedPrice, expectedCost] of [[100, 50, 150, 70], [120, 40, 120, 40]]) {
        const product = make([{ attributes: [], stock: 12, pricing: { price, costPrice: cost }, priceOverride: price }]);
        service.updateProductPricing(product, { sellingPrice: 150, buyingPrice: 70 });
        assert.equal(product.variants[0].pricing.price, expectedPrice);
        assert.equal(product.variants[0].priceOverride, expectedPrice);
        assert.equal(product.variants[0].pricing.costPrice, expectedCost);
    }
});

test('options reconcile on add and removal without losing labels, swatches or IDs', () => {
    const product = make([row('red', { stock: 0 })], { options: [{ name: 'color', values: [{ value: 'red', label: 'Ruby', swatch: '#ff0000' }] }] });
    const beforeId = String(product.variants[0]._id);
    apply(product, { addAttributeOption: { name: 'color', option: 'blue', defaultStock: 2 } });
    assert.deepEqual(product.options[0].values.map(item => item.value), ['red', 'blue']);
    assert.equal(product.options[0].values[0].label, 'Ruby');
    assert.equal(product.options[0].values[0].swatch, '#ff0000');
    assert.equal(String(product.variants[0]._id), beforeId);
    apply(product, { removeVariants: [beforeId] });
    assert.deepEqual(product.options[0].values.map(item => item.value), ['blue']);
});

test('final product rejects duplicate combinations including case aliases', () => {
    const product = make([row('Red')]);
    assert.throws(() => apply(product, { variants: [row('red')] }), /duplicate/i);
});

test('conflicting variant operations fail validation', () => {
    assert(updateProductSchema.validate({ removeVariants: [shop], addAttributeOption: { name: 'color', option: 'blue' } }).error);
});

test('partial metadata batches and clearing nullable price fields validate', () => {
    assert.equal(updateProductSchema.validate({ variants: [
        { _id: shop, sku: 'ONE' }, { _id: '507f1f77bcf86cd799439012', sku: 'TWO', priceOverride: null, pricing: { price: null, compareAtPrice: null } }
    ] }).error, undefined);
});

test('delimiter-bearing option values cannot alias existing IDs, inventory or reservations', () => {
    const product = make([{ attributes: [{ name: 'color', value: 'red|size:m' }, { name: 'size', value: 'l' }], stock: 12, inventory: { stock: 12, reservedStock: 3 } }]);
    const id = String(product.variants[0]._id);
    apply(product, { variantMatrix: { attributes: [{ name: 'color', options: ['red', 'red|size:m'] }, { name: 'size', options: ['m|size:l', 'l'] }], defaultStock: 0, overrides: { '["red","m|size:l"]': { stock: 100 } } } });
    assert.equal(product.variants.filter(v => String(v._id) === id).length, 1);
    assert.equal(product.variants.id(id).stock, 12);
    assert.equal(product.variants.id(id).inventory.reservedStock, 3);
});

test('flat and matrix paths support the established 500-variant ceiling', () => {
    const variants = Array.from({ length: 210 }, (_, i) => row(`c${i}`));
    assert.equal(createProductSchema.validate({ ...createBase, variants }).error, undefined);
    const product = make(Array.from({ length: 500 }, (_, i) => row(`c${i}`)));
    assert.throws(() => apply(product, { addAttributeOption: { name: 'color', option: 'extra', defaultStock: 0 } }), /500|limit/i);
});

test('optional category can be blank on create or cleared on update', () => {
    assert.equal(createProductSchema.validate({ ...createBase, category: '', simpleStock: 0 }).error, undefined);
    assert.equal(updateProductSchema.validate({ category: '' }).error, undefined);
});

test('explicit cover index wins over the previous cover for retained and uploaded images', () => {
    const source = fs.readFileSync(require.resolve('../controllers/productController'), 'utf8');
    const resolver = media.resolveCoverMediaId || vm.runInNewContext(`${source.slice(source.indexOf('const resolveCoverMediaId ='), source.indexOf('const coverMediaBelongsToProduct ='))}\nresolveCoverMediaId;`);
    assert.equal(resolver({ images: [image, 'https://example.com/b.webp'], requestedCover: image, coverImageIndex: 1 }), 'https://example.com/b.webp');
    assert.equal(resolver({ images: [image], requestedCover: image }), image);
});

test('publication scheduling rejects timezone-free or past instants and clears archive intent', () => {
    assert(updateProductSchema.validate({ publicationStatus: 'scheduled', publishAt: '2030-11-01T10:00' }).error);
    assert.throws(() => normalizeProductPublicationFields({ publicationStatus: 'scheduled', publishAt: '2020-01-01T10:00:00Z' }), /future/i);
    const archived = { status: 'Archived' };
    normalizeProductPublicationFields(archived);
    assert.equal(archived.publicationStatus, 'draft');
    assert.equal(archived.publishAt, null);
    assert(updateProductSchema.validate({ publishedAt: '2030-11-01T04:00:00Z' }).error);
    const publishedAt = new Date('2025-01-01T00:00:00Z');
    const edit = { status: 'Published' };
    normalizeProductPublicationFields(edit, { publishedAt });
    assert.equal(edit.publishedAt, publishedAt);
});

test('fractional stored prices display the same rounded amount as checkout without rewriting storage', async () => {
    const { normalizeProduct, getProductPresentation } = await import('../../../packages/storefront-renderer/normalizeProduct.js');
    const { buildOrderLineItem } = require('../services/orders/orderPricingService');
    const product = make([{ attributes: [], stock: 1 }], { pricing: { buyingPrice: 50.25, sellingPrice: 100.5, discount: 0 } });
    const presentation = getProductPresentation(normalizeProduct(product.toObject()));
    const line = buildOrderLineItem({ product, variant: product.variants[0], item: { quantity: 1 } });
    assert.equal(product.pricing.sellingPrice, 100.5);
    assert.equal(product.finalPrice, line.orderItem.price);
    assert.equal(presentation.displayFinalPrice, line.orderItem.price);
});

test('stocked removals require inventory permission, reserved removals fail, and authorized removals are logged', () => {
    const product = make([row('red'), row('blue')]);
    const snapshot = service.snapshotVariantStock(product);
    const id = String(product.variants[0]._id);
    assert.throws(() => service.applyVariantOperations({ product, value: { removeVariants: [id] }, ...snapshot }), /inventoryManage/);
    product.variants[0].inventory.reservedStock = 2;
    assert.throws(() => service.applyVariantOperations({ product, value: { removeVariants: [id] }, ...snapshot, canRemoveStock: true }), /reserved/);
    product.variants[0].inventory.reservedStock = 0;
    service.applyVariantOperations({ product, value: { removeVariants: [id] }, ...snapshot, canRemoveStock: true });
    const logs = service.buildStockAdjustmentLogs({ product, ...snapshot, shopId: shop, userId: shop });
    assert.equal(logs[0].variantId, id);
    assert.equal(logs[0].change, -12);
});
