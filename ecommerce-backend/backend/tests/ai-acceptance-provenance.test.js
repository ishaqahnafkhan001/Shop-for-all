const test = require('node:test');
const assert = require('node:assert/strict');
const product = require('../services/products/productContentAiService');
const collection = require('../services/collections/collectionAiService');
const seo = require('../services/storeSeoAiService');
const growth = require('../services/adInsightAIService');
const theme = require('@scaleup/storefront-theme');
const options = (output, timeout = 10000) => ({ config: { apiKey: 'mock', model: 'mock-model', operationTimeoutMs: timeout, attemptTimeoutMs: timeout, outputTokens: 2400 },
    clientFactory: () => ({ responses: { create: async () => ({ status: 'completed', output_text: JSON.stringify(output) }) } }) });

test('empty Product output is never chargeable; every requested section is checked', async () => {
    for (const section of ['description', 'seo', 'sellingPoints', 'specifications', 'extraNotes', 'imageAlt']) {
        const result = await product.generateProductContentSuggestion({ body: { title: 'Blue shirt', category: 'clothing', requestedSections: [section] }, providerOptions: options({}) });
        assert.equal(result.meta.source, 'deterministic_fallback', section);
    }
    assert.throws(() => product.__test.parseAndCleanProviderText('{"description":{}}'), { code: 'AI_RESPONSE_PARSE_FAILED' });
    assert.equal(product.__test.hasUsefulSellingPoints({ description: 'নীল শাড়ি।' }, { requestedSections: ['description'] }), true);
    assert.equal(product.__test.hasUsefulSellingPoints({ description: 'নীল শাড়ি।' }, { requestedSections: ['description', 'seo'] }), false);
});

test('concise Bangla is accepted and quality repair shares the remaining deadline', async () => {
    const result = await product.generateProductContentSuggestion({ body: { title: 'শাড়ি', requestedSections: ['description'] }, providerOptions: options({ description: 'নীল শাড়ি।' }) });
    assert.equal(result.meta.source, 'provider'); assert.equal(result.meta.attemptCount, 1);
    const fallback = await product.generateProductContentSuggestion({ body: { title: 'Shirt', category: 'clothing', requestedSections: ['description'] }, providerOptions: options({}, 1000) });
    assert.equal(fallback.meta.source, 'deterministic_fallback'); assert.equal(fallback.meta.attemptCount, 1);
    const cleaned = product.cleanProductContentSuggestion({ whyBuy: [{ point: 'নীল রং', reason: 'নীল পোশাকের সঙ্গে মানায়।' }] });
    assert.equal(cleaned.sellingPoints.length, 1);
});

test('partial Collection and three blank SEO alternatives are deterministic fallback', async () => {
    for (const raw of [{}, { name: 'Summer' }, null, [], { description: 123 }]) {
        const result = await collection.generateCollectionSuggestion({ title: 'Summer' }, { providerOptions: options(raw) });
        assert.equal(result.meta.source, 'deterministic_fallback');
    }
    for (const raw of [{ alternatives: [{}, {}, {}] }, null, { alternatives: [null, null, null] }]) {
        const result = await seo.generateStoreSeoSuggestion({ shop: { shopName: 'ঢাকা দোকান' }, providerOptions: options(raw) });
        assert.equal(result.meta.source, 'deterministic_fallback'); assert.equal(result.alternatives.length, 3);
    }
});

test('Growth missing copy falls back; synthesized advice is mixed and CTA is validated', async () => {
    const input = { product: { title: 'Blue shirt', category: 'clothing' }, shop: {}, metrics: {} };
    const fallback = await growth.generateAdInsight({ ...input, providerOptions: options({}) });
    assert.equal(fallback.meta.source, 'deterministic_fallback');
    const raw = { primaryText: 'Explore Blue shirt.', headline: 'Blue shirt', description: 'See the shirt details.', callToAction: 'Shop Now' };
    const result = await growth.generateAdInsight({ ...input, providerOptions: options(raw) });
    assert.equal(result.meta.source, 'mixed'); assert.equal(result.meta.fieldOrigins.primaryText, 'provider');
    assert.equal(growth.__test.acceptAdCopy({ ...raw, callToAction: 'Pay instantly' }), false);
});

test('SEO Apply-normalize-revision-publish-resolver keeps precise origin and selective manual edits', () => {
    for (const source of ['provider', 'deterministic_fallback', 'mixed']) {
        const option = { id: 'one', title: 'ঢাকা দোকান', description: 'দোকানের পণ্য দেখুন।' };
        const result = { alternatives: [option], meta: { source, operationId: 'operation-123', promptVersion: '2.0.0' } };
        let saved = theme.applySeoSuggestion({}, result, option);
        // Same normalizer used at domain draft/publish boundaries; serialization models stored Mixed revisions.
        saved = JSON.parse(JSON.stringify(theme.sanitizeThemePayload({ seo: saved }))).seo;
        const resolved = theme.resolveHomepageSeo({ seo: saved, shopIdentity: { shopName: 'ঢাকা দোকান' } });
        assert.equal(resolved.origin.title, source); assert.equal(resolved.origin.description, source);
        saved = theme.editSeoField(saved, 'title', 'Merchant title');
        saved = theme.sanitizeThemePayload({ seo: saved }).seo;
        const edited = theme.resolveHomepageSeo({ seo: saved });
        assert.equal(edited.origin.title, 'manual'); assert.equal(edited.origin.description, source);
    }
});

test('historical SEO matches remain unknown and direct field edits cannot retain provider attribution', () => {
    const option = { id: 'old', title: 'Old title', description: 'Old text' };
    const old = { ...option, aiSuggestion: { alternatives: [option], acceptedFields: ['title'], acceptedOptionId: 'old', acceptedAt: '2026-01-01' } };
    assert.equal(theme.resolveHomepageSeo({ seo: old }).origin.title, 'unknown_legacy');
    const applied = theme.applySeoSuggestion({}, { alternatives: [option], meta: { source: 'provider' } }, option);
    const edited = theme.sanitizeThemePayload({ seo: { ...applied, title: 'Different title' } }).seo;
    assert.equal(theme.resolveHomepageSeo({ seo: edited }).origin.title, 'manual');
});
