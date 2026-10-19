import test from 'node:test';
import assert from 'node:assert/strict';
import { csvToProducts, MAX_CATALOG_IMPORT_ROWS } from '../src/utils/catalogCsv.js';

test('CSV import reads exported quoted commas, quotes, newlines and UTF-8 headers', () => {
    const text = '\uFEFFtitle,description,category\r\n"Shirt, blue","A ""soft"" shirt\nfor daily wear",Clothing\r\n';
    assert.deepEqual(csvToProducts(text), [{
        title: 'Shirt, blue',
        description: 'A "soft" shirt\nfor daily wear',
        category: 'Clothing'
    }]);
});

test('CSV import rejects malformed rows rather than silently shifting product fields', () => {
    assert.throws(() => csvToProducts('title,category\n"unfinished,Clothing'), /unfinished quoted value/);
    assert.throws(() => csvToProducts('title,category\nShirt'), /wrong number of columns/);
    assert.equal(MAX_CATALOG_IMPORT_ROWS, 200);
});
