const test = require('node:test');
const assert = require('node:assert/strict');
const safeStorefrontLink = require('../utils/safeStorefrontLink');

test('accepts storefront paths, anchors, and HTTPS banner destinations', () => {
    assert.equal(safeStorefrontLink('/collections/eid-sale'), '/collections/eid-sale');
    assert.equal(safeStorefrontLink('#products'), '#products');
    assert.equal(safeStorefrontLink('https://example.com/sale'), 'https://example.com/sale');
});

test('rejects script schemes, ambiguous paths, and credential-bearing URLs', () => {
    for (const link of [
        'javascript:alert(1)',
        'java\nscript:alert(1)',
        'data:text/html,evil',
        '//evil.example/path',
        '/\\evil.example/path',
        'https://user:password@example.com/',
        'http://example.com/'
    ]) {
        assert.equal(safeStorefrontLink(link), '', link);
    }
});
