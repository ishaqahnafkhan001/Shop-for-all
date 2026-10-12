const assert = require('node:assert/strict');
const test = require('node:test');
const { readAiConfig } = require('../config/ai');
const { hashSnapshot, hashRequest } = require('../services/ai/aiOperationIdentity');
const Ledger = require('../models/AiGenerationRequest');

test('AI numeric configuration rejects malformed and unbounded values', () => {
    for (const value of ['NaN', 'Infinity', '-1', '1.5', 'abc', '999999999']) {
        assert.throws(() => readAiConfig({ AI_OPERATION_TIMEOUT_MS: value }), /Invalid AI_OPERATION_TIMEOUT_MS/);
    }
    assert.equal(readAiConfig({}).accountingVersion, 0);
    assert.equal(readAiConfig({ AI_ACCOUNTING_VERSION: '2' }).concurrency, 2);
});

test('OpenAI configuration never falls back to legacy Gemini credentials or models', () => {
    const config = readAiConfig({ GEMINI_API_KEY: 'legacy-test-key', GEMINI_MODEL: 'gemini-legacy' });
    assert.equal(config.provider, 'openai');
    assert.equal(config.model, 'gpt-6-luna');
    assert.equal(config.apiKey, '');
    assert.equal(readAiConfig({ OPENAI_API_KEY: ' openai-test-key ', OPENAI_MODEL: 'gpt-4.1' }).apiKey, 'openai-test-key');
    assert.throws(() => readAiConfig({ OPENAI_MODEL: 'gemini-legacy' }), /Invalid OPENAI_MODEL/);
});
test('canonical request identity ignores object order and request-ID aliases, preserves relevant differences and Unicode', () => {
    assert.equal(hashSnapshot({ b: 2, a: 'e\u0301' }), hashSnapshot({ a: 'é', b: 2 }));
    const first = hashRequest({ body: { title: 'শাড়ি', requestId: 'first' } }, 'product.content');
    assert.equal(first, hashRequest({ body: { requestId: 'second', title: 'শাড়ি' } }, 'product.content'));
    assert.notEqual(first, hashRequest({ body: { title: 'শাড়ি', language: 'bn' } }, 'product.content'));
    assert.notEqual(first, hashRequest({ body: { title: 'শাড়ি' } }, 'catalog.collection'));
});
test('new unresolved ledgers have no TTL and preserve unique tenant-feature operation key', () => {
    const row = new Ledger({ shopId: '507f1f77bcf86cd799439011', feature: 'product.content', requestId: 'request-123' });
    assert.equal(row.expiresAt, undefined);
    assert.ok(Ledger.schema.indexes().some(([keys, options]) => keys.shopId && keys.feature && keys.requestId && options.unique));
});
