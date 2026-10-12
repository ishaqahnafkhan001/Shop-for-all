const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
    generateProductContentSuggestion,
    cleanProductContentSuggestion,
    __test
} = require('../services/products/productContentAiService');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readProject = (file) => fs.readFileSync(path.join(root, '../..', file), 'utf8');

test('product content AI route is protected and mounted before product id route', () => {
    const adminRoutes = read('routes/adminRoutes.js');
    const contentRouteIndex = adminRoutes.indexOf("'/products/ai/content-suggest'");
    const productIdRouteIndex = adminRoutes.indexOf("'/products/:id'");

    assert.ok(contentRouteIndex > -1);
    assert.ok(productIdRouteIndex > -1);
    assert.ok(contentRouteIndex < productIdRouteIndex);
    assert.match(adminRoutes, /'\/products\/ai\/content-suggest'[\s\S]*protect[\s\S]*authorize\('VendorAdmin', 'VendorStaff'\)[\s\S]*requirePermission\('products'\)[\s\S]*blockBillingSuspendedShop[\s\S]*blockVerificationSuspendedShop[\s\S]*productAiLimiter[\s\S]*productAiImageUpload[\s\S]*generateProductContent/);
    assert.match(adminRoutes, /multer\.memoryStorage\(\)/);
    assert.match(adminRoutes, /\.single\('image'\)/);
    assert.match(adminRoutes, /AI_IMAGE_UNSUPPORTED/);
    assert.match(adminRoutes, /AI_IMAGE_TOO_LARGE/);
});

test('product content AI missing OpenAI key is friendly and backend-only', async () => {
    await assert.rejects(generateProductContentSuggestion({ body: { title: 'Test Product' },
        providerOptions: { config: require('../config/ai').readAiConfig({}) } }), { code: 'AI_NOT_CONFIGURED' });

    const controller = read('controllers/productController.js');
    const adminAdd = readProject('ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx');
    const adminEdit = readProject('ecommerce-admin/src/pages/dashboard/products/EditProduct.jsx');

    assert.match(controller, /configured:\s*false/);
    assert.match(controller, /configured:\s*false/);
    assert.doesNotMatch(adminAdd + adminEdit, /OPENAI_API_KEY/);
});

test('product content AI uses bounded provider timeouts and safe failure codes', () => {
    const { readAiConfig } = require('../config/ai');
    assert.equal(readAiConfig({}).attemptTimeoutMs, 45000);
    assert.equal(readAiConfig({ OPENAI_TIMEOUT_MS: '2000' }).attemptTimeoutMs, 2000);
    assert.throws(() => readAiConfig({ OPENAI_TIMEOUT_MS: 'Infinity' }));

    assert.equal(__test.getProviderFailureCode({ code: 'AI_PROVIDER_TIMEOUT' }), 'AI_PROVIDER_TIMEOUT');
    assert.equal(__test.getProviderFailureCode({ status: 403 }), 'AI_PROVIDER_AUTH_FAILED');
    assert.equal(__test.getProviderFailureCode({ status: 404 }), 'AI_MODEL_NOT_FOUND');
    assert.equal(__test.getProviderFailureCode({ status: 429 }), 'AI_PROVIDER_RATE_LIMITED');
    assert.equal(__test.getProviderFailureCode({ status: 503 }), 'AI_PROVIDER_UNAVAILABLE');
});

test('product content AI builds text-only and image-aware prompts without private pricing', async () => {
    const context = __test.buildContext({
        title: 'গঙ্গা যমুনা বালা',
        category: 'Bala',
        tags: JSON.stringify(['bala', 'jewellery']),
        sellingPrice: '680',
        buyingPrice: '250',
        costPrice: '250',
        variants: JSON.stringify([
            {
                attributes: [{ name: 'color', value: 'Brass Gold' }],
                stock: 4,
                pricing: { price: 680, costPrice: 250 }
            }
        ])
    });

    const textPrompt = __test.buildPrompt(context, false);
    const imagePrompt = __test.buildPrompt(context, true);

    assert.match(textPrompt, /Image available: no/);
    assert.match(imagePrompt, /Image available: yes/);
    assert.match(textPrompt, /গঙ্গা যমুনা বালা/);
    assert.doesNotMatch(JSON.stringify(context), /250/);
    assert.doesNotMatch(JSON.stringify(context), /buyingPrice|costPrice|supplier/i);

    const imageInput = await __test.buildImagePart({
        file: {
            buffer: Buffer.from('fake-image'),
            mimetype: 'image/png'
        }
    });

    assert.equal(imageInput.usedImage, false);
    assert.equal(imageInput.imageSource, 'text_only');
    assert.equal(imageInput.part, null);
    assert.equal(__test.isTrustedImageUrl('https://res.cloudinary.com/demo/image/upload/product.jpg'), true);
    assert.equal(__test.isTrustedImageUrl('http://169.254.169.254/latest/meta-data'), false);
});

test('product content AI normalizes shapes and length limits', () => {
    const cleaned = cleanProductContentSuggestion({
        seoTitle: '<script>x()</script>#1 Best Product in Bangladesh With A Very Long Title That Should Be Trimmed Quickly',
        seoDescription: 'Guaranteed '.repeat(40),
        description: '<b>Nice product</b> '.repeat(80),
        whyBuy: [
            {
                point: 'Traditional design',
                reason: 'Engraved detailing gives the product a festive look for special outfits.',
                visualEvidence: 'The image shows decorative engraved patterns.',
                confidence: 'high'
            },
            {
                point: 'Traditional design',
                reason: 'Engraved detailing gives the product a festive look for special outfits.',
                visualEvidence: 'Duplicate should be removed.',
                confidence: 'high'
            },
            {
                point: 'Two finish choices',
                reason: 'Brass and nickel options let shoppers choose the finish that better matches their outfit and personal style.',
                visualEvidence: 'The variants include brass and nickel options.',
                confidence: 'high'
            },
            { point: 'Premium quality', reason: 'x'.repeat(260) },
            { point: 'Clear details', reason: 'This helps customers understand what they are buying before ordering.' }
        ],
        specifications: [
            { label: '<b>Product type</b>', value: 'Traditional hand jewellery' },
            { label: 'Material', value: 'Unknown unless seller confirms' }
        ],
        extraNotes: ['Actual color may vary slightly due to lighting.', 'x'.repeat(180)],
        imageAlt: '<img> traditional jewellery on red fabric '.repeat(10),
        confidenceNotes: ['Avoided material claims because seller did not provide material.']
    });

    assert.ok(cleaned.seoTitle.length <= 70);
    assert.ok(cleaned.seoDescription.length <= 170);
    assert.ok(cleaned.description.length <= 700);
    assert.ok(cleaned.sellingPoints.length <= 5);
    assert.equal(cleaned.sellingPoints.length, 2);
    assert.ok(cleaned.sellingPoints.every(item => item.point.length <= 50 && item.reason.length <= 220));
    assert.ok(cleaned.sellingPoints.every(item => item.visualEvidence && item.confidence));
    assert.doesNotMatch(cleaned.sellingPoints.map(item => item.point).join(' '), /Premium quality|Clear details|Image confidence|Choice options/i);
    assert.ok(cleaned.specifications.every(item => item.label.length <= 40 && item.value.length <= 100));
    assert.ok(cleaned.extraNotes.every(item => item.length <= 120));
    assert.ok(cleaned.imageAlt.length <= 130);
    assert.ok(cleaned.imageAnalysis);
    assert.doesNotMatch(JSON.stringify(cleaned), /<script|<b>|#1|Best Product in Bangladesh/i);
});

test('product content AI malformed JSON path falls back only to evidence-based content', () => {
    const controller = read('controllers/productController.js');
    const start = controller.indexOf('exports.generateProductContent');
    const end = controller.indexOf('/**', start + 1);
    const block = controller.slice(start, end);
    const fallback = __test.buildFallbackSuggestion({
        title: 'গঙ্গা যমুনা বালা',
        category: 'Bala',
        tags: ['jewellery'],
        variants: [{ attributes: [{ name: 'color', value: 'Gold' }] }]
    }, { usedImage: true, reason: 'parse' });

    assert.throws(() => __test.parseProviderJson('not json'), /JSON object/);
    assert.match(controller, /fallback:\s*Boolean\(suggestion\.fallback\)/);
    assert.match(controller, /imageSource:\s*suggestion\.imageSource/);
    assert.match(controller, /imageAnalysis:\s*suggestion\.data\?\.imageAnalysis/);
    assert.match(controller, /errorCode:\s*'AI_RESPONSE_PARSE_FAILED'/);
    assert.match(controller, /errorCode:\s*'AI_PROVIDER_FAILED'/);
    assert.doesNotMatch(block, /status\(500\)/);
    assert.ok(fallback.seoTitle);
    assert.ok(fallback.description);
    assert.ok(fallback.sellingPoints.length > 0);
    assert.ok(fallback.sellingPoints.every(point => point.point && point.reason && point.visualEvidence && point.confidence));
    assert.ok(fallback.sellingPoints.some(point => /Gold|Occasion|Outfit|Finish/i.test(`${point.point} ${point.reason}`)));
    assert.doesNotMatch(fallback.sellingPoints.map(point => `${point.point} ${point.reason}`).join(' '), /SEO friendly|product cards|shared links|improves trust|clear product content|Clear details|Image confidence|Choice options|helps customers understand|suitable for shoppers looking/i);
    assert.ok(fallback.specifications.length > 0);
    assert.deepEqual(fallback.confidenceNotes, []);
    assert.doesNotMatch(JSON.stringify(fallback), /unreadable response|safe basic suggestion/i);
});

test('product content AI wraps OpenAI provider failures as safe response codes', () => {
    const service = read('services/products/productContentAiService.js');
    const controller = read('controllers/productController.js');

    assert.match(service, /providerError\.code = 'AI_PROVIDER_FAILED'/);
    assert.match(service, /providerError\.causeCode/);
    assert.match(controller, /err\?\.code === 'AI_PROVIDER_FAILED'/);
    assert.match(controller, /Product content AI provider failure/);
    assert.match(controller, /message:\s*'AI product suggestions could not be generated right now\. Please try again later\.'/);
});

test('product content AI sends selected sections through OpenAI Responses strict JSON', async () => {
    let request, requestOptions;
    const result = await generateProductContentSuggestion({ body: { title: 'Blue shirt', requestedSections: ['description'] },
        providerOptions: { config: { apiKey: 'mock', model: 'gpt-4.1-mini', operationTimeoutMs: 1000, attemptTimeoutMs: 1000, outputTokens: 2400 },
            clientFactory: () => ({ responses: { create: async (body, extra) => {
                request = body; requestOptions = extra; return { status: 'completed', output_text: '{"description":"Blue shirt."}' };
            } } }) } });
    assert.equal(request.text.format.type, 'json_schema');
    assert.equal(request.text.format.strict, true);
    assert.ok(request.text.format.schema.properties.description);
    assert.equal(request.text.format.schema.properties.seoTitle, undefined);
    assert.equal(request.input[0].role, 'user');
    assert.ok(requestOptions.signal instanceof AbortSignal);
    assert.equal(requestOptions.maxRetries, 0);
    assert.equal(result.meta.provider, 'openai');
    assert.equal(result.fallback, false);
});

test('selective Product Apply maps public content without changing commerce or unselected fields', async () => {
    const { applyProductContentSuggestion } = await import('../../../ecommerce-admin/src/utils/applyProductContentSuggestion.js');
    const before = { title: 'Merchant title', pricing: { sellingPrice: 50 }, stock: 3, status: 'Draft', description: 'Original', seo: { title: 'Saved SEO' } };
    const suggestion = { description: 'Suggested', seoTitle: 'Other', pricing: { sellingPrice: 0 }, stock: 999, status: 'Published', specifications: [{ label: 'Material', value: 'Cotton' }] };
    const next = applyProductContentSuggestion(before, suggestion, ['description', 'specifications']);
    assert.equal(next.description, 'Suggested');
    assert.deepEqual(next.specifications, [{ title: 'Material', value: 'Cotton' }]);
    assert.deepEqual(next.pricing, before.pricing); assert.equal(next.stock, 3); assert.equal(next.status, 'Draft');
    assert.equal(next.title, 'Merchant title'); assert.equal(next.seo.title, 'Saved SEO'); assert.equal(before.description, 'Original');
});

test('selling point point-reason format remains compatible with legacy rows', async () => {
    const model = read('models/Product.js');
    const validation = read('validations/productValidation.js');
    const serializer = read('services/publicProductSerializer.js');
    const ui = await require('./helpers/aiPresentationHarness').loadAiPresentation();
    const html = ui.render(ui.ProductFeatures, { features: [{ point: 'Current point', reason: 'Current reason' }, { title: 'Legacy title', value: 'Legacy value' }, 'Text row'] });
    const adminRows = readProject('ecommerce-admin/src/utils/productContentRows.js');

    assert.match(model, /point:\s*\{\s*type:\s*String/);
    assert.match(model, /reason:\s*\{\s*type:\s*String/);
    assert.match(model, /normalizeContentRows\(this\.features,\s*\{\s*sellingPoints:\s*true\s*\}\)/);
    assert.match(validation, /point:\s*Joi\.string/);
    assert.match(validation, /reason:\s*Joi\.string/);
    assert.match(serializer, /sanitizePublicSellingPoints/);
    assert.match(serializer, /point:\s*'Product benefit'/);
    for (const text of ['Current point', 'Current reason', 'Legacy title', 'Legacy value', 'Text row']) assert.ok(html.includes(text));
    assert.match(adminRows, /normalizeSellingPointRows/);
    assert.match(adminRows, /MAX_SELLING_POINTS\s*=\s*6/);
});
