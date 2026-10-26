import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectRecovery, normalizeSubmission, RECOVERY_REVIEW_AGE_MS } from '../src/services/productSubmissionRecovery.js';

test('missing attachments are named and valid fields remain intact without mutating the source', () => {
    const video = new File(['video'], 'demo.mp4', { type: 'video/mp4' });
    const image = { name: 'lost-front.png', type: 'image/png', size: 100 }; // Both persisted media copies are missing their Blob.
    const record = { id: crypto.randomUUID(), createdAt: Date.now(), state: 'failed', fingerprint: 'a'.repeat(64), snapshot: { formData: { title: 'Preserved', description: 'All valid fields survive', pricing: { buyingPrice: '20', sellingPrice: '40', discount: 0 }, seo: { title: 'Search title' }, specifications: [{ title: 'Fabric', value: 'Cotton' }], comments: [{ title: 'Care', value: 'Hand wash' }], sellerFacts: { brand: 'Brand' }, status: 'Draft', publicationStatus: 'scheduled', publishAt: '2030-01-01T12:00', lowStockThreshold: 0 }, imageFiles: [null], videoFiles: [video], attributes: [{ name: 'color', options: ['Red'] }], variantDetails: { '["Red"]': { sku: 'RED', price: 120, taxable: false } }, stockOverrides: { '["Red"]': 5 }, defaultStock: 4 }, entries: [['images', image], ['videos', video]] };
    const result = inspectRecovery(record);
    assert.deepEqual(result.missingMedia, ['lost-front.png']);
    assert.equal(result.snapshot.videoFiles[0], video);
    assert.equal(result.snapshot.formData.pricing.sellingPrice, '40');
    assert.equal(result.snapshot.formData.sellerFacts.brand, 'Brand');
    assert.equal(result.snapshot.formData.specifications[0].value, 'Cotton');
    assert.equal(result.snapshot.formData.comments[0].value, 'Hand wash');
    assert.equal(result.snapshot.formData.publicationStatus, 'scheduled');
    assert.equal(result.snapshot.formData.lowStockThreshold, 0);
    assert.equal(result.snapshot.variantDetails['["Red"]'].taxable, false);
    assert.equal(result.validForm, true); assert.equal(result.validPayload, false);
    assert.equal(record.snapshot.imageFiles[0], null);
});

test('corrupt arrays, nested variant values and malformed timestamps are safe to present', () => {
    for (const snapshot of [null, { formData: [] }, { formData: { title: 'Safe' }, attributes: [{ name: {}, options: 12 }] }, { formData: { title: 'Safe' }, variantDetails: { x: { image: { bad: true } } } }]) {
        const record = { scope: 'actor:shop', id: crypto.randomUUID(), state: 'uploading', createdAt: 1n, browserLock: { owner: {}, until: 3n }, snapshot, entries: [null] };
        const normalized = normalizeSubmission(record, record.scope);
        assert.equal(normalized.createdAt, undefined);
        assert.equal(normalized.browserLock, undefined);
        assert.equal(normalized.state, 'recovery');
        const recovery = inspectRecovery(normalized);
        assert(Array.isArray(recovery.snapshot.imageFiles));
        assert(Array.isArray(recovery.snapshot.attributes));
        assert.equal(recovery.validForm, false);
        assert.equal(recovery.validPayload, false);
    }
});

test('thirty-day review hints preserve all original records and never imply expiration deletion', () => {
    const record = { state: 'failed', createdAt: Date.now() - RECOVERY_REVIEW_AGE_MS - 1, snapshot: { formData: { title: 'Still recoverable' } } };
    const recovered = inspectRecovery(record);
    assert.equal(recovered.expired, true);
    assert.equal(recovered.snapshot.formData.title, 'Still recoverable');
    assert(record.snapshot);
});

test('media can recover from preserved wire files, and missing gallery slots cannot point variants at unrelated images', () => {
    const front = new File(['front'], 'front.png', { type: 'image/png' });
    const back = new File(['back'], 'back.png', { type: 'image/png' });
    const recovered = inspectRecovery({ state: 'failed', fingerprint: 'a'.repeat(64), snapshot: { formData: { title: 'Media recovery' }, imageFiles: [null, back], coverImageIndex: 1, variantDetails: { Red: { image: 'product-image:1' } } }, entries: [['images', front], ['images', back]] });
    assert.deepEqual(recovered.missingMedia, []);
    assert.equal(recovered.snapshot.imageFiles[0], front);
    assert.equal(recovered.snapshot.coverImageIndex, 1);
    assert.equal(recovered.snapshot.variantDetails.Red.image, 'product-image:1');
    const record = { state: 'failed', snapshot: { formData: { title: 'Missing media' }, imageFiles: [{ name: 'lost.png' }, back], coverImageIndex: 1, variantDetails: { Red: { image: 'product-image:1', sku: 'RED' }, Blue: { image: 'product-image:0' } } }, entries: [] };
    const result = inspectRecovery(record);
    assert.deepEqual(result.missingMedia, ['lost.png']);
    assert.equal(result.snapshot.coverImageIndex, 0);
    assert.equal(result.snapshot.variantDetails.Red.image, 'product-image:0');
    assert.equal(result.snapshot.variantDetails.Red.sku, 'RED');
    assert.equal(result.snapshot.variantDetails.Blue.image, '');
    assert(result.issues.some(issue => issue.includes('Blue')));
    assert.equal(record.snapshot.variantDetails.Red.image, 'product-image:1');
});
