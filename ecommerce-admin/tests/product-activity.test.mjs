import test from 'node:test';
import assert from 'node:assert/strict';
import { getProductActivityBreakdown, getProductActivityCounts, getProductActivityDescription, getProductActivityProgress, getProductActivityStatus, getProductActivityTitle, isVerifiedProductId } from '../src/utils/productActivity.js';

test('activity maps receipt-backed outcomes into four merchant-facing statuses', () => {
    for (const state of ['preparing', 'uploading', 'saving']) assert.deepEqual(getProductActivityStatus({ state }), { key: 'saving', label: 'Saving' });
    assert.deepEqual(getProductActivityStatus({ state: 'saved', productId: 'a'.repeat(24) }), { key: 'saved', label: 'Saved' });
    assert.deepEqual(getProductActivityStatus({ state: 'failed', editable: true }), { key: 'attention', label: 'Needs attention' });
    for (const record of [{ state: 'failed', editable: false }, { state: 'recovery' }, { state: 'saved', productId: 'invalid' }, null, {}]) assert.deepEqual(getProductActivityStatus(record), { key: 'check', label: 'Check status' });
});

test('activity separates unfinished and recently confirmed saves and produces accurate compact counts', () => {
    const counts = getProductActivityCounts([{ state: 'uploading' }, { state: 'failed', editable: true }, { state: 'failed', editable: true }, { state: 'recovery' }, { state: 'saved', productId: 'b'.repeat(24) }]);
    assert.deepEqual(counts, { saving: 1, saved: 1, attention: 2, check: 1, unfinished: 4 });
    assert.equal(getProductActivityBreakdown(counts), '2 need attention · 1 to check · 1 saving');
    assert.equal(getProductActivityBreakdown(getProductActivityCounts()), 'All caught up');
});

test('uncertain outcomes never read as confirmed failure or success', () => {
    assert.match(getProductActivityDescription({ state: 'recovery' }), /not confirmed the outcome/);
    assert.match(getProductActivityDescription({ state: 'recovery', receiptState: 'processing' }), /still processing/);
    assert.match(getProductActivityDescription({ state: 'saved', productId: 'invalid' }), /not confirmed/);
    assert.match(getProductActivityDescription({ state: 'failed', editable: true }), /correct the product/);
});

test('activity only displays measured and bounded upload progress', () => {
    assert.equal(getProductActivityProgress({ state: 'uploading', progress: 24.6 }), 25);
    for (const progress of [null, undefined, NaN, Infinity, -1, 101, '50']) assert.equal(getProductActivityProgress({ state: 'uploading', progress }), null);
    assert.equal(getProductActivityProgress({ state: 'saving', progress: 100 }), null);
    assert.equal(getProductActivityProgress({ state: 'preparing', progress: 5 }), null);
});

test('product links require verified identifiers and missing titles remain understandable', () => {
    assert.equal(isVerifiedProductId('0123456789abcdefABCDEF01'), true);
    for (const value of ['javascript:alert(1)', '../other-shop', '', 1, null]) assert.equal(isVerifiedProductId(value), false);
    assert.equal(getProductActivityTitle({ title: '  Cotton shirt  ' }), 'Cotton shirt');
    assert.equal(getProductActivityTitle({ title: { privateData: 'do not render' } }), 'Untitled product');
});
