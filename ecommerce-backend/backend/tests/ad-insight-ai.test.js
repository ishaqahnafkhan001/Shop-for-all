const assert = require('node:assert/strict');
const test = require('node:test');

const {
    detectProductCategory,
    buildFallbackAdInsight,
    cleanAdInsightResponse,
    __test
} = require('../services/adInsightAIService');

const defaultMetrics = {
    label: 'not_enough_data',
    views: 0,
    addToCarts: 0,
    checkouts: 0,
    orders: 0
};

const insightFor = (product) => buildFallbackAdInsight({
    product,
    metrics: defaultMetrics,
    cityHistory: [],
    language: 'en',
    campaignType: 'sales'
});

test('Samsung S23 gets smartphone targeting instead of fashion targeting', () => {
    const product = {
        title: 'Samsung S23',
        category: 'Phone',
        brand: 'Samsung',
        tags: ['android', '5g', 'smartphone'],
        description: 'Premium Samsung Galaxy Android smartphone with great camera and performance.',
        pricing: { sellingPrice: 34300 }
    };

    assert.equal(detectProductCategory(product).type, 'smartphone/mobile phone');

    const insight = insightFor(product);
    const interests = insight.suggestedInterests.map(item => item.toLowerCase());

    assert.match(insight.targetedCustomer, /smartphone|android|samsung/i);
    assert.ok(interests.includes('samsung'));
    assert.ok(interests.includes('android phones'));
    assert.ok(interests.includes('smartphones'));
    assert.ok(interests.includes('5g phones'));
    assert.ok(interests.includes('mobile photography'));
    assert.ok(interests.includes('mobile gaming'));
    assert.doesNotMatch(interests.join('|'), /men fashion|casual wear|eid shopping|lifestyle products/);
});

test('Casual Sneakers for Men gets footwear/fashion targeting only', () => {
    const product = {
        title: 'Casual Sneakers for Men',
        category: 'Footwear',
        tags: ['sneakers', 'men shoes', 'casual shoes'],
        description: 'Comfortable casual sneakers for men.',
        pricing: { sellingPrice: 1850 }
    };

    assert.equal(detectProductCategory(product).type, 'shoes/footwear');

    const insight = insightFor(product);
    const interests = insight.suggestedInterests.join('|').toLowerCase();

    assert.match(insight.targetedCustomer, /footwear|shoes|style/i);
    assert.match(interests, /footwear|sneakers|casual shoes/);
    assert.doesNotMatch(interests, /android phones|mobile gaming/);
});

test('Bluetooth Headphones gets audio/electronics targeting', () => {
    const product = {
        title: 'Bluetooth Headphones',
        category: 'Electronics',
        tags: ['wireless audio', 'music', 'bluetooth'],
        description: 'Wireless headphones for music, calls, and gaming.'
    };

    assert.equal(detectProductCategory(product).type, 'headphones/audio');

    const insight = insightFor(product);
    const interests = insight.suggestedInterests.join('|').toLowerCase();

    assert.match(interests, /bluetooth headphones/);
    assert.match(interests, /wireless audio/);
    assert.match(interests, /music/);
    assert.match(interests, /tech gadgets|audio gadgets/);
});

test('Face Wash gets beauty/skincare targeting', () => {
    const product = {
        title: 'Hydrating Face Wash',
        category: 'Beauty',
        tags: ['face wash', 'skincare', 'personal care'],
        description: 'Gentle cleanser for daily face care.'
    };

    assert.equal(detectProductCategory(product).type, 'beauty/skincare');

    const insight = insightFor(product);
    const interests = insight.suggestedInterests.join('|').toLowerCase();

    assert.match(interests, /skincare/);
    assert.match(interests, /beauty products/);
    assert.match(interests, /face care/);
});

test('Baby Diapers gets parents and baby care targeting', () => {
    const product = {
        title: 'Baby Diapers',
        category: 'Baby Care',
        tags: ['diapers', 'baby', 'parenting'],
        description: 'Soft baby diapers for daily comfort.'
    };

    assert.equal(detectProductCategory(product).type, 'baby/kids');

    const insight = insightFor(product);
    const interests = insight.suggestedInterests.join('|').toLowerCase();

    assert.match(insight.targetedCustomer, /parents|family/i);
    assert.match(interests, /baby care/);
    assert.match(interests, /parenting/);
    assert.match(interests, /diapers/);
});

test('unknown generic product stays conservative without irrelevant niche targeting', () => {
    const product = {
        title: 'Premium Utility Item',
        category: 'General',
        tags: ['useful'],
        description: 'A trusted item for everyday shopping.'
    };

    assert.equal(detectProductCategory(product).type, 'general/unknown');

    const insight = insightFor(product);
    const interests = insight.suggestedInterests.join('|').toLowerCase();

    assert.match(insight.targetedCustomer, /online shoppers|trusted products/i);
    assert.match(interests, /online shopping|cash on delivery|e-commerce/);
    assert.doesNotMatch(interests, /android phones|mobile gaming|men fashion|skincare/);
});

test('Gemini output cleanup removes irrelevant electronics interests and normalizes shape', () => {
    const product = {
        title: 'Samsung S23',
        category: 'Phone',
        tags: ['Samsung', 'Android']
    };

    const cleaned = cleanAdInsightResponse({
        primaryText: '  Great phone for daily use.  ',
        headline: 'Samsung S23',
        description: 'Premium Android phone.',
        callToAction: 'buy now',
        targetedCustomer: 'Phone buyers',
        targetedAgeRange: '18-45',
        suggestedInterests: ['Men Fashion', 'Samsung', 'samsung', 'Android Phones', 'Casual Wear'],
        suggestedLocationFocus: ['Dhaka', 'dhaka', 'Chattogram'],
        adAngle: 'Phone upgrade',
        audienceReason: 'Matches Android users.',
        improvementSuggestions: ['Add warranty info.', 'Add warranty info.']
    }, { product, metrics: defaultMetrics, cityHistory: ['Dhaka'] });

    const interests = cleaned.suggestedInterests.join('|').toLowerCase();

    assert.equal(cleaned.callToAction, 'Shop Now');
    assert.doesNotMatch(interests, /men fashion|casual wear/);
    assert.equal(cleaned.suggestedInterests.filter(item => item === 'Samsung').length, 1);
    assert.deepEqual(cleaned.suggestedLocationFocus, ['Dhaka', 'Chattogram']);
});

test('Gemini prompt contains privacy guardrails and safe context only', () => {
    const product = {
        title: 'Samsung S23',
        category: 'Phone',
        tags: ['android'],
        description: 'Premium phone'
    };
    const productContext = __test.sanitizeProductContext(product);
    const metrics = __test.sanitizeMetricsContext(defaultMetrics);
    const prompt = __test.buildGeminiPrompt({
        productContext,
        shopContext: __test.sanitizeShopContext({ shopName: 'Demo Shop', subdomain: 'demo' }),
        detectedCategory: 'smartphone/mobile phone',
        metrics,
        cityHistory: ['Dhaka'],
        searchTerms: ['samsung phone'],
        language: 'en',
        campaignType: 'sales'
    });

    assert.match(prompt, /You are generating Facebook\/Instagram-style ad planning suggestions/);
    assert.match(prompt, /Return only valid JSON/);
    assert.match(prompt, /private social media data/);
    const contextJson = prompt.slice(prompt.indexOf('Safe context:') + 'Safe context:'.length).trim();
    const context = JSON.parse(contextJson);

    assert.deepEqual(Object.keys(context).sort(), [
        'aggregatedCityHistory',
        'campaignType',
        'growthCenterLabel',
        'language',
        'performanceSummary',
        'product',
        'relevantSearchTerms',
        'shop'
    ].sort());
    assert.doesNotMatch(contextJson, /phoneNumber|customerEmail|orderId|nid/i);
});
