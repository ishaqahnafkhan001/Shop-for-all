'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeTheme } = require('@scaleup/storefront-theme');
const { validateStoredTheme } = require('@scaleup/storefront-theme/storage');
const { PAGE_KINDS } = require('@scaleup/storefront-theme/adaptive');

test('merchant adaptive starter preserves legacy data, assigns all pages and remains immutable and idempotent', async () => {
    const { createAdaptiveDraft } = await import('../../../ecommerce-admin/src/pages/dashboard/StoreBuilder/adaptive/createAdaptiveDraft.js');
    const original = normalizeTheme({ hero: { title: 'Merchant title' }, footer: { text: 'Merchant footer' } });
    const before = JSON.stringify(original);
    const draft = createAdaptiveDraft(original);
    assert.equal(JSON.stringify(original), before);
    assert.equal(draft.version, 5);
    assert.equal(validateStoredTheme(draft).valid, true);
    for (const [key, value] of Object.entries(original)) if (key !== 'version') assert.deepEqual(draft[key], value, key);
    for (const kind of PAGE_KINDS) {
        const id = (['header', 'footer'].includes(kind) ? draft.siteBuilder.globals : draft.siteBuilder.defaultTemplates)[kind];
        assert.equal(draft.siteBuilder.templates[id].pageKind, kind);
        if (kind !== 'home') assert.equal(Object.values(draft.siteBuilder.templates[id].nodes).filter(node => node.type === `${kind}.core`).length, 1);
    }
    assert.deepEqual(createAdaptiveDraft(draft), draft);
    assert.throws(() => createAdaptiveDraft({ version: 5 }), /requires/);
    assert.throws(() => createAdaptiveDraft({ version: 99 }), /Update/);
});
