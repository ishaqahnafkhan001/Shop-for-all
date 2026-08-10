const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const AiGenerationRequest = require('../models/AiGenerationRequest');
const Category = require('../models/Category');
const Review = require('../models/Review');
const { __test: aiPolicyTest } = require('../services/ai/aiGenerationPolicyService');
const { buildSeoContext } = require('../services/storeBuilder/storeBuilderSeoService');
const { resolveHomepageSeo } = require('@scaleup/storefront-theme');

const backendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(__dirname, '../../..');
const readBackend = file => fs.readFileSync(path.join(backendRoot, file), 'utf8');
const readRepo = file => fs.readFileSync(path.join(repoRoot, file), 'utf8');

test('all AI workflows publish stable prompt identities and versions', () => {
    const contracts = [
        ['services/products/productContentAiService.js', 'product.content'],
        ['services/collections/collectionAiService.js', 'catalog.collection'],
        ['services/adInsightAIService.js', 'growth.ad_planning'],
        ['services/storeSeoAiService.js', 'seo.homepage']
    ];

    for (const [file, promptId] of contracts) {
        const source = readBackend(file);
        assert.match(source, new RegExp(`PROMPT_ID = ['"]${promptId.replace('.', '\\.')}['"]`));
        assert.match(source, /PROMPT_VERSION = ['"]2\.0\.0['"]/);
        assert.match(source, /promptId:\s*PROMPT_ID/);
        assert.match(source, /promptVersion:\s*PROMPT_VERSION/);
    }
});

test('AI request records are tenant-feature idempotent and expire automatically', () => {
    const indexes = AiGenerationRequest.schema.indexes();
    const idempotencyIndex = indexes.find(([fields, options]) => (
        fields.shopId === 1 && fields.feature === 1 && fields.requestId === 1 && options.unique === true
    ));
    const ttlIndex = indexes.find(([fields, options]) => (
        fields.expiresAt === 1 && options.expireAfterSeconds === 0
    ));

    assert.ok(idempotencyIndex);
    assert.ok(ttlIndex);
    assert.equal(aiPolicyTest.cleanRequestId('product.content:shop-123:request-456'), 'product.content:shop-123:request-456');
    assert.equal(aiPolicyTest.cleanRequestId('short'), '');
    assert.equal(aiPolicyTest.duplicateState({ status: 'failed' }).code, 'AI_REQUEST_FAILED');
});

test('Homepage SEO preview resolves through the same shared theme resolver as live output', () => {
    const input = {
        shop: {
            shopName: 'Adi Jewellery',
            subdomain: 'adi',
            approvalStatus: 'Approved',
            isActive: true,
            customDomain: { domain: 'www.adijewellery.store', status: 'Verified' },
            theme: {
                logoUrl: 'https://cdn.example.com/logo.png',
                hero: { bannerSlides: [{ title: 'Jewellery for every day', subtitle: 'Browse the latest pieces.' }] },
                navigation: [{ label: 'Shop', url: '/products' }],
                footer: { contactEmail: 'hello@example.com' },
                commerce: { currency: 'BDT' }
            }
        },
        seo: {
            title: 'Adi Jewellery - Online Store',
            description: 'Shop jewellery from Adi Jewellery.',
            searchEngineVisibility: true,
            language: 'en-BD'
        },
        searchAliases: ['ADI Jewelry'],
        seoStats: { products: { total: 7 }, collections: { total: 2 }, imageAltCoverage: 80 },
        categories: ['Bala', 'Earrings']
    };

    const context = buildSeoContext(input);
    assert.deepEqual(resolveHomepageSeo(context.previewContext), context.resolvedSeo);
    assert.equal(context.previewContext.commerce.currency, 'BDT');
    assert.deepEqual(context.previewContext.catalogSummary.categories, [{ name: 'Bala' }, { name: 'Earrings' }]);
});

test('review eligibility preserves legacy reviews and excludes hidden or deleted reviews', () => {
    assert.deepEqual(Review.getEligibilityQuery(), {
        isDeleted: { $ne: true },
        isVisible: { $ne: false }
    });
    assert.equal(Review.schema.path('isVisible').defaultValue, true);
    assert.equal(Review.schema.path('isDeleted').defaultValue, false);
});

test('category SEO fields are optional and length bounded', () => {
    assert.equal(Category.schema.path('seo.title').options.maxlength, 70);
    assert.equal(Category.schema.path('seo.description').options.maxlength, 170);
    assert.equal(Category.schema.path('seo.title').defaultValue, '');
});

test('sitemap XML helpers escape unsafe values and emit valid index and URL roots', async () => {
    const moduleUrl = pathToFileURL(path.join(repoRoot, 'ecommerce-storefront/src/lib/sitemapXml.js')).href;
    const { buildSitemapIndexXml, buildUrlsetXml } = await import(moduleUrl);
    const unsafeUrl = 'https://shop.example/products/a&b<test>';

    const urlset = buildUrlsetXml([{ loc: unsafeUrl, lastmod: '2026-08-10T00:00:00.000Z' }]);
    const index = buildSitemapIndexXml([{ loc: 'https://shop.example/sitemaps/products-1.xml?x=1&y=2' }]);

    assert.match(urlset, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
    assert.match(urlset, /a&amp;b&lt;test&gt;/);
    assert.doesNotMatch(urlset, /a&b<test>/);
    assert.match(index, /<sitemapindex xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
    assert.match(index, /x=1&amp;y=2/);
});

test('storefront indexing and structured data share the centralized eligibility decision', () => {
    const indexability = readRepo('ecommerce-storefront/src/lib/indexability.js');
    const robots = readRepo('ecommerce-storefront/src/app/[subdomain]/robots.txt/route.js');
    const homepage = readRepo('ecommerce-storefront/src/app/[subdomain]/page.jsx');
    const product = readRepo('ecommerce-storefront/src/app/[subdomain]/products/[id]/page.jsx');
    const category = readRepo('ecommerce-storefront/src/app/[subdomain]/categories/[slug]/page.jsx');
    const collection = readRepo('ecommerce-storefront/src/app/[subdomain]/collections/[slug]/page.jsx');

    assert.match(indexability, /process\.env\.NODE_ENV === "production"/);
    assert.match(indexability, /sitemapEligible:\s*indexable/);
    assert.match(indexability, /structuredDataEligible:\s*indexable/);
    assert.match(robots, /resolveStorefrontIndexability/);
    for (const source of [homepage, product, category, collection]) {
        assert.match(source, /structuredDataEligible/);
    }
});

test('migration is dry-run first and does not infer unavailable slug history', () => {
    const migration = readBackend('scripts/migrate-seo-ai-hardening.js');
    assert.match(migration, /const apply = process\.argv\.includes\('--apply'\)/);
    assert.match(migration, /isVisible:\s*\{ \$exists:\s*false \}/);
    assert.match(migration, /isDeleted:\s*\{ \$exists:\s*false \}/);
    assert.match(migration, /Slug history is not inferred/);
    assert.doesNotMatch(migration, /deleteMany/);
});
