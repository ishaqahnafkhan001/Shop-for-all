import test from 'node:test';
import assert from 'node:assert/strict';
import { getAiAccess, aiErrorMessage } from '../src/utils/aiAccess.js';
import { scoreProductSeo, productContentIssues } from '../src/utils/seoHealth.js';
import { applyProductContentSuggestion } from '../src/utils/applyProductContentSuggestion.js';
import { applyCampaignSuggestion, currentCampaignProduct } from '../src/utils/applyCampaignSuggestion.js';
import { createAiPatch, undoAiPatch } from '../src/utils/aiOperationState.js';

test('selecting one SEO improvement preserves the other field and commerce data', () => {
    const before = { seo: { title: 'Keep this title', description: '' }, stock: 5, status: 'draft', pricing: { sellingPrice: 50 } };
    const suggestion = { seoTitle: 'Unrequested title', seoDescription: 'Selected improvement', stock: 100, status: 'published' };
    const after = applyProductContentSuggestion(before, suggestion, ['seoDescription']);
    assert.deepEqual(after, { ...before, seo: { ...before.seo, description: suggestion.seoDescription } });
    const patch = createAiPatch(before, after);
    assert.deepEqual(undoAiPatch(after, patch).value, before);
    assert.equal(undoAiPatch({ ...after, seo: { ...after.seo, description: 'Later manual edit' } }, patch).value.seo.description, 'Later manual edit');
});

test('campaign partial Apply enforces fields, tracks sources and keeps later edits on Undo', () => {
    const before = { content: { primaryText: 'Merchant caption', headline: 'Old', description: 'Keep', callToAction: 'Shop Now' } };
    const suggestion = { headline: 'New', primaryText: 'Unrequested', stock: 55,
        meta: { source: 'provider', requestedFields: ['headline'], operationId: 'test-operation', evidenceWindow: { to: '2026-10-10T00:00:00Z' } } };
    const { draft: after, fields } = applyCampaignSuggestion(before, suggestion, ['headline', 'primaryText', 'stock'], Date.parse('2026-10-12T00:00:00Z'));
    assert.deepEqual(fields, ['headline']);
    assert.deepEqual(after.content, { ...before.content, headline: 'New' });
    assert.equal(after.provenance.fieldOrigins.headline.source, 'provider');
    assert.equal(after.evidenceStale, true);
    const result = undoAiPatch({ ...after, content: { ...after.content, headline: 'Later edit' } }, createAiPatch(before, after));
    assert.equal(result.value.content.headline, 'Later edit');
    const loaded = { title: 'Updated product', sellingPrice: 75, version: '2026-10-12T00:00:00Z' };
    assert.deepEqual(currentCampaignProduct({ title: 'Earlier view', pricing: { sellingPrice: 50 }, updatedAt: '2026-10-10T00:00:00Z' }, loaded), loaded);
});

test('AI access distinguishes staff, plan, exhaustion and reserved allowance', () => {
    const user = { role: 'VendorAdmin', planAccess: { usage: { ai: { available: 3 } } } };
    assert.equal(getAiAccess(user, 'product.content').allowed, true);
    assert.equal(getAiAccess({ ...user, role: 'VendorStaff', permissions: { catalogTools: true } }, 'catalog.collection').reason, 'permission');
    assert.equal(getAiAccess({ ...user, effectiveFeatures: { aiProductCreation: false } }, 'product.content').reason, 'plan');
    assert.equal(getAiAccess({ ...user, planAccess: { usage: { ai: { available: 0, pending: 1 } } } }, 'product.content').reason, 'pending');
    assert.equal(getAiAccess({ ...user, planAccess: { usage: { ai: { available: 0, pending: 0 } } } }, 'product.content').reason, 'exhausted');
    assert.doesNotMatch(aiErrorMessage({ code: 'AI_NOT_CONFIGURED' }), /env|key/i);
});

test('content improvements project existing health, never generate commerce fields, and keep optional benefits unscored', () => {
    const product = { title: 'নীল শাড়ি', description: 'সুতির নীল শাড়ি। পরার আগে মাপ দেখুন।', seo: { title: 'নীল শাড়ি', description: 'শাড়ির বিস্তারিত দেখুন।' }, imageAltText: 'নীল শাড়ি', category: 'Clothing', stock: 3, pricing: { sellingPrice: 500 } };
    const health = scoreProductSeo({ product, hasImage: true });
    const issues = productContentIssues({ health, product });
    assert.deepEqual(issues.filter(issue => issue.aiSection).map(issue => issue.aiSection), ['sellingPoints']);
    assert.equal(issues.find(issue => issue.id === 'benefits').optional, true);
    const empty = { title: 'Shirt', pricing: {} };
    const missing = productContentIssues({ health: scoreProductSeo({ product: empty }), product: empty, readiness: [{ id: 'stock', done: false, label: 'Add stock' }] });
    assert.equal(missing.find(issue => issue.id === 'price').aiSection, undefined);
    assert.equal(missing.find(issue => issue.id === 'stock').aiSection, undefined);
    assert.ok(missing.some(issue => issue.aiSection === 'description'));
});
