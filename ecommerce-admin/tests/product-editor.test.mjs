import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { productImageLimit, mergeProductFiles, variantMetadataPayload, toPublishInstant, productCombinationCount, productVariantKey, productOptionCombinationCount, productImageSources } from '../src/utils/productEditor.js';

test('media queue appends batches, deduplicates files, and rejects invalid types/sizes/counts without losing input', () => {
    const a = new File(['a'], 'a.png', { type: 'image/png', lastModified: 1 });
    const b = new File(['b'], 'b.webp', { type: 'image/webp', lastModified: 2 });
    assert.deepEqual(mergeProductFiles([a], [a, b], { limit: 5 }), [a, b]);
    assert.throws(() => mergeProductFiles([a], [b], { limit: 1 }), /up to 1/);
    assert.throws(() => mergeProductFiles([a], [{ type: 'image/avif', size: 1 }], { limit: 5 }), /JPG/);
    assert.throws(() => mergeProductFiles([a], [{ type: 'image/png', size: 11 * 1024 * 1024 }], { limit: 5 }), /10 MiB/);
    assert.equal(productImageLimit(0), 0);
    assert.equal(productImageLimit(null), 15);
    assert.equal(productImageLimit(undefined), 5);
});

test('variant keys normalize aliases without rejecting values containing separators; add-option counts canonical dimensions', () => {
    const a = { attributes: [{ name: 'a', value: 'b|c:d' }] };
    const b = { attributes: [{ name: 'a', value: 'b' }, { name: 'c', value: 'd' }] };
    assert.notEqual(productVariantKey(a), productVariantKey(b));
    assert.equal(productVariantKey(b), productVariantKey({ attributes: [{ name: ' C ', value: ' D ' }, { name: 'A', value: 'B' }] }));
    const variants = [{ attributes: [{ name: 'color', value: 'Red' }, { name: 'size', value: 'S' }] }, { attributes: [{ name: 'color', value: ' red ' }, { name: 'size', value: 'L' }] }];
    assert.equal(productOptionCombinationCount(variants, ' COLOR '), 2);
    assert.equal(productOptionCombinationCount(variants, 'size'), 1);
    assert.equal(productOptionCombinationCount(variants, 'missing'), 0);
});

test('image usage includes unique variant sources and gallery references without counting upload selectors twice', () => {
    assert.deepEqual(productImageSources({ images: ['https://example.com/a.png', 'https://example.com/a.png?cache=1'], variants: [{ image: 'https://example.com/a.png#cover' }, { image: 'https://example.com/b.png' }, { image: 'product-image:0' }] }), ['https://example.com/a.png', 'https://example.com/b.png']);
});

test('metadata serializer never sends existing stock, reservations or server alert state', () => {
    const payload = variantMetadataPayload({ _id: 'v1', attributes: [], sku: '', stock: 12, inventory: { stock: 12, reservedStock: 3, lowStockAlertStatus: 'sent', lowStockThreshold: 0 }, pricing: { price: null } });
    assert.deepEqual(payload.inventory, { lowStockThreshold: 0 });
    assert.equal('stock' in payload, false);
    assert.equal(payload.pricing.price, null);
    assert.equal(variantMetadataPayload({ stock: 7 }).stock, 7);
});

test('changing a SKU does not resend stale pricing when the base price is edited together', () => {
    const baseline = { _id: 'v1', attributes: [], sku: '', priceOverride: 100, pricing: { price: 100, costPrice: 50 } };
    assert.deepEqual(variantMetadataPayload({ ...baseline, sku: 'NEW' }, baseline), { _id: 'v1', sku: 'NEW' });
    const clearing = variantMetadataPayload({ ...baseline, priceOverride: null, pricing: { ...baseline.pricing, price: null, compareAtPrice: null } }, baseline);
    assert.equal(clearing.priceOverride, null);
    assert.equal(clearing.pricing.price, null);
    assert.equal(clearing.pricing.compareAtPrice, null);
});

test('Add and Edit schedule helper converts local time to an explicit instant under UTC and Asia/Dhaka', () => {
    const moduleUrl = new URL('../src/utils/productEditor.js', import.meta.url).href;
    for (const [TZ, expected] of [['UTC', '2030-11-01T10:00:00.000Z'], ['Asia/Dhaka', '2030-11-01T04:00:00.000Z']]) {
        const actual = execFileSync(process.execPath, ['--input-type=module', '-e', `import {toPublishInstant} from ${JSON.stringify(moduleUrl)}; console.log(toPublishInstant('2030-11-01T10:00'));`], { env: { ...process.env, TZ }, encoding: 'utf8' }).trim();
        assert.equal(actual, expected);
    }
    assert.throws(() => toPublishInstant('2020-01-01T10:00'), /future/);
    assert.equal(productCombinationCount([{ options: Array(50) }, { options: Array(11) }]), 550);
});
