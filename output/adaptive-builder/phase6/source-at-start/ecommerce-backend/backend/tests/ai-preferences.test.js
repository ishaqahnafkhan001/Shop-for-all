const test = require('node:test');
const assert = require('node:assert/strict');
const { effectivePreferences, normalizePreferences } = require('../services/ai/aiPreferencesService');
const { hashRequest } = require('../services/ai/aiOperationIdentity');
const { collectionSlug } = require('../utils/collectionSlug');
const features = [require('../services/products/productContentAiService'), require('../services/collections/collectionAiService'), require('../services/storeSeoAiService'), require('../services/adInsightAIService')];

test('preferences preserve Unicode, validate bounded business wording, and normalize explicit language overrides', () => {
    const value = normalizePreferences({ language: 'bn', terminology: ['সুতি', 'e\u0301', 'সুতি'], brandDescription: 'দোকানের পণ্য।' });
    assert.deepEqual(value.terminology, ['সুতি', 'é']);
    assert.equal(effectivePreferences({ ...value, version: 2 }, 'auto').language, 'bn');
    assert.equal(effectivePreferences(value, 'en-BD').language, 'en');
    for (const input of [{ language: 'invalid' }, { tone: 'evil' }, { terminology: Array(11).fill('x') }, { avoidPhrases: ['x'.repeat(61)] }, { brandDescription: {} }]) assert.throws(() => normalizePreferences(input));
    assert.match(collectionSlug('শাড়ি'), /^[a-z0-9-]+$/);
    assert.equal(collectionSlug('শাড়ি'), collectionSlug('শাড়ি'.normalize('NFD')));
    assert.equal(collectionSlug('existing-store-slug'), 'existing-store-slug');
});

test('semantic operation identity agrees for JSON multipart fields and rejects different image/entity/version/interval', () => {
    const body = { requestedSections: ['seo', 'description'], tags: ['blue', 'cotton'], title: 'é' };
    const hash = hashRequest({ body }, 'product.content');
    assert.equal(hash, hashRequest({ body: { title: ' e\u0301 ', requestedSections: '["description", "seo"]', tags: '["cotton", "blue"]' } }, 'product.content'));
    for (const extra of [{ entityId: 'one' }, { entityRevision: 2 }, { imageUrl: 'https://example.com/a' }, { interval: { from: 'x', to: 'y' } }]) assert.notEqual(hash, hashRequest({ body: { ...body, ...extra } }, 'product.content'));
    assert.notEqual(hashRequest({ body, file: { buffer: Buffer.from('a'), mimetype: 'image/png' } }, 'product.content'), hashRequest({ body, file: { buffer: Buffer.from('b'), mimetype: 'image/png' } }, 'product.content'));
});

test('all four generators use the same effective voice for English, Bangla, Banglish and mixed content', async () => {
    for (const language of ['en', 'bn', 'banglish', 'mixed']) {
        const preferences = effectivePreferences({ language, tone: 'friendly', terminology: ['সুতি'], version: 3 });
        const prompts = [];
        const providerOptions = { config: { apiKey: 'mock', model: 'gpt-test', operationTimeoutMs: 10000, attemptTimeoutMs: 10000, outputTokens: 2400 },
            clientFactory: () => ({ responses: { create: async input => {
                prompts.push(input.input[0].content[0].text);
                return { status: 'completed', output_text: JSON.stringify({ description: 'সুতির পোশাক।', name: 'পোশাক', seoTitle: 'পোশাক', seoDescription: 'সুতির পোশাক দেখুন।', slug: 'clothing', keywords: ['সুতি'],
                    alternatives: [1, 2, 3].map(i => ({ title: `দোকান ${i}`, description: 'সুতির পোশাক দেখুন।' })), primaryText: 'সুতির পোশাক দেখুন।', headline: 'পোশাক', callToAction: 'Shop Now' }) };
            } } }) };
        const operation = { preferences };
        const outputs = [
            await features[0].generateProductContentSuggestion({ body: { title: 'পোশাক', requestedSections: ['description'] }, operation, providerOptions }),
            await features[1].generateCollectionSuggestion({ title: 'পোশাক' }, { operation, providerOptions }),
            await features[2].generateStoreSeoSuggestion({ shop: { shopName: 'দোকান' }, operation, providerOptions }),
            await features[3].generateAdInsight({ product: { title: 'পোশাক' }, metrics: {}, operation, providerOptions })
        ];
        assert.equal(prompts.length, 4);
        for (const prompt of prompts) { assert.ok(prompt.includes(`"language":"${language}"`)); assert.ok(prompt.includes('সুতি')); }
        for (const output of outputs) { assert.equal(output.meta.preferenceVersion, 3); assert.equal(output.meta.language, language); assert.equal(output.meta.promptVersion, '4.0.0'); }
    }
});

test('selected Product SEO fields define provider schema and acceptance independently', async () => {
    let required;
    const result = await features[0].generateProductContentSuggestion({ body: { title: 'নীল পোশাক', requestedSections: ['seoDescription'] },
        providerOptions: { config: { apiKey: 'mock', model: 'gpt-test', operationTimeoutMs: 10000, attemptTimeoutMs: 10000, outputTokens: 2400 },
            clientFactory: () => ({ responses: { create: async input => { required = input.text.format.schema.required;
                return { status: 'completed', output_text: JSON.stringify({ seoDescription: 'সুতির পোশাক দেখুন।' }) }; } } }) } });
    assert.deepEqual(required, ['seoDescription', 'imageAnalysis', 'confidenceNotes']);
    assert.equal(result.fallback, false);
    assert.deepEqual(result.meta.requestedSections, ['seoDescription']);
    assert.equal(result.data.seoTitle, '');
});
