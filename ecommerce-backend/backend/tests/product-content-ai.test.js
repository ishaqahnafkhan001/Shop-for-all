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

test('product content AI missing Gemini key is friendly and backend-only', async () => {
    const oldKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    await assert.rejects(
        generateProductContentSuggestion({ body: { title: 'Test Product' } }),
        /AI product suggestions are not configured/
    );

    if (oldKey) process.env.GEMINI_API_KEY = oldKey;

    const controller = read('controllers/productController.js');
    const adminAdd = readProject('ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx');
    const adminEdit = readProject('ecommerce-admin/src/pages/dashboard/products/EditProduct.jsx');

    assert.match(controller, /configured:\s*false/);
    assert.match(controller, /configured:\s*false/);
    assert.doesNotMatch(adminAdd + adminEdit, /GEMINI_API_KEY/);
});

test('product content AI uses bounded provider timeouts and safe failure codes', () => {
    const oldTimeout = process.env.GEMINI_TIMEOUT_MS;

    try {
        delete process.env.GEMINI_TIMEOUT_MS;
        assert.equal(__test.getGeminiTimeoutMs({ hasImage: false }), 30000);
        assert.equal(__test.getGeminiTimeoutMs({ hasImage: true }), 45000);

        process.env.GEMINI_TIMEOUT_MS = '2000';
        assert.equal(__test.getGeminiTimeoutMs({ hasImage: false }), 15000);
        assert.equal(__test.getGeminiTimeoutMs({ hasImage: true }), 30000);

        process.env.GEMINI_TIMEOUT_MS = '120000';
        assert.equal(__test.getGeminiTimeoutMs({ hasImage: true }), 60000);
    } finally {
        if (oldTimeout === undefined) delete process.env.GEMINI_TIMEOUT_MS;
        else process.env.GEMINI_TIMEOUT_MS = oldTimeout;
    }

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

    assert.equal(imageInput.usedImage, true);
    assert.equal(imageInput.imageSource, 'local_file');
    assert.equal(imageInput.part.inlineData.mimeType, 'image/png');
    assert.equal(imageInput.part.inlineData.data, Buffer.from('fake-image').toString('base64'));
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

    assert.throws(() => __test.parseGeminiJson('not json'), /JSON object/);
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

test('product content AI wraps Gemini provider failures as safe response codes', () => {
    const service = read('services/products/productContentAiService.js');
    const controller = read('controllers/productController.js');

    assert.match(service, /providerError\.code = 'AI_PROVIDER_FAILED'/);
    assert.match(service, /providerError\.causeCode/);
    assert.match(controller, /err\?\.code === 'AI_PROVIDER_FAILED'/);
    assert.match(controller, /Product content AI provider failure/);
    assert.match(controller, /message:\s*'AI product suggestions could not be generated right now\. Please try again later\.'/);
});

test('product content AI asks Gemini for schema-bound JSON and extracts candidate text defensively', () => {
    const service = read('services/products/productContentAiService.js');

    assert.match(service, /SchemaType/);
    assert.match(service, /responseSchema:\s*PRODUCT_CONTENT_RESPONSE_SCHEMA/);
    assert.match(service, /"whyBuy": \[\{ "point": "string", "reason": "string", "visualEvidence": "string", "confidence": "low\|medium\|high" \}\]/);
    assert.match(service, /imageAnalysis/);
    assert.match(service, /strictRetry/);
    assert.match(service, /INSUFFICIENT_PRODUCT_CONTEXT/);
    assert.match(service, /contents:\s*\[\{\s*role:\s*'user',\s*parts\s*\}\]/);
    assert.match(service, /extractGeminiText/);

    assert.equal(
        __test.extractGeminiText({
            response: {
                text: () => '{"seoTitle":"Direct"}'
            }
        }),
        '{"seoTitle":"Direct"}'
    );

    assert.equal(
        __test.extractGeminiText({
            response: {
                text: () => '',
                candidates: [
                    { content: { parts: [{ text: '{"seoTitle":"Candidate"}' }] } }
                ]
            }
        }),
        '{"seoTitle":"Candidate"}'
    );
});

test('admin product AI preview flow maps suggestions without silent overwrite', () => {
    const assistant = readProject('ecommerce-admin/src/components/products/ProductAiAssistant.jsx');
    const addProduct = readProject('ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx');
    const editProduct = readProject('ecommerce-admin/src/pages/dashboard/products/EditProduct.jsx');

    assert.match(assistant, /\/admin\/products\/ai\/content-suggest/);
    assert.match(assistant, /showAiFailureToast/);
    assert.match(assistant, /AI_PROVIDER_FAILED/);
    assert.match(assistant, /AI_RESPONSE_PARSE_FAILED/);
    assert.match(assistant, /configured === false/);
    assert.match(assistant, /response\.data\.fallback/);
    assert.match(assistant, /Basic suggestions are ready to review/);
    assert.match(assistant, /Apply all suggestions/);
    assert.match(assistant, /Replace \$\{label\}/);
    assert.match(assistant, /Append \$\{label\}/);
    assert.match(assistant, /visualEvidence/);
    assert.match(assistant, /Confidence:/);
    assert.match(assistant, /generatedRows = pointsToRows\(suggestion\.sellingPoints/);
    assert.match(assistant, /Image analysis/);
    assert.match(assistant, /imageSource/);
    assert.match(assistant, /Why customers should buy this/);
    assert.match(assistant, /Suggest buyer benefits/);
    assert.match(assistant, /next\.specifications = normalizeKeyValueRows\(normalizeSpecs\(suggestion\.specifications\)\)/);
    assert.match(assistant, /next\.comments = notesToRows\(suggestion\.extraNotes\)/);
    assert.match(assistant, /data\.append\('image', firstImage\)/);
    assert.match(assistant, /data\.append\('imageUrl', firstImage\.trim\(\)\)/);
    assert.match(addProduct, /getFirstImage=\{\(\) => imageFiles\[coverImageIndex\]/);
    assert.match(addProduct, /Why customers should buy this/);
    assert.match(addProduct, /Why it matters/);
    assert.match(editProduct, /getFirstImage=\{getFirstAiImage\}/);
    assert.match(editProduct, /newImageFiles\[coverImageIndex - formData\.images\.length\]/);
    assert.match(editProduct, /Why customers should buy this/);
    assert.match(editProduct, /Why it matters/);
});

test('selling point point-reason format remains compatible with legacy rows', () => {
    const model = read('models/Product.js');
    const validation = read('validations/productValidation.js');
    const serializer = read('services/publicProductSerializer.js');
    const storefrontExtras = readProject('ecommerce-storefront/src/components/product/ProductExtras.jsx');
    const adminRows = readProject('ecommerce-admin/src/utils/productContentRows.js');

    assert.match(model, /point:\s*\{\s*type:\s*String/);
    assert.match(model, /reason:\s*\{\s*type:\s*String/);
    assert.match(model, /normalizeContentRows\(this\.features,\s*\{\s*sellingPoints:\s*true\s*\}\)/);
    assert.match(validation, /point:\s*Joi\.string/);
    assert.match(validation, /reason:\s*Joi\.string/);
    assert.match(serializer, /sanitizePublicSellingPoints/);
    assert.match(serializer, /point:\s*'Product benefit'/);
    assert.match(storefrontExtras, /feature\?\.point \|\| feature\?\.title/);
    assert.match(storefrontExtras, /feature\?\.reason \|\| feature\?\.value/);
    assert.match(adminRows, /normalizeSellingPointRows/);
    assert.match(adminRows, /MAX_SELLING_POINTS\s*=\s*6/);
});
