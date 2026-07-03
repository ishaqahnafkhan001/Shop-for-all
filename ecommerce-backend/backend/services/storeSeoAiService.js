const { GoogleGenerativeAI } = require('@google/generative-ai');

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_TIMEOUT_MS = 15000;

const AI_NOT_CONFIGURED_MESSAGE =
    'AI SEO suggestions are not configured yet. Please add GEMINI_API_KEY on the backend server.';

const AI_PARSE_FALLBACK_MESSAGE =
    'AI returned an unreadable response, so a basic SEO suggestion was generated from your store data.';

const safeString = (value = '', max = 300) => String(value || '')
    .replace(/\0/g, '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/[<>{}`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const truncate = (value = '', max = 160) => safeString(value, max + 20).slice(0, max).trim();

const normalizeKeywords = (keywords = []) => {
    const source = Array.isArray(keywords) ? keywords : String(keywords || '').split(',');

    return [...new Set(source
        .map(keyword => safeString(keyword, 40).toLowerCase())
        .filter(Boolean))]
        .slice(0, 10);
};

const cleanRecommendations = (items = []) => (Array.isArray(items) ? items : [])
    .slice(0, 6)
    .map(item => ({
        type: safeString(item?.type || 'seo', 24) || 'seo',
        priority: ['high', 'medium', 'low'].includes(String(item?.priority || '').toLowerCase())
            ? String(item.priority).toLowerCase()
            : 'medium',
        message: safeString(item?.message || '', 180)
    }))
    .filter(item => item.message);

const removeUnsafeClaims = (value = '') => safeString(value, 300)
    .replace(/#\s*1/gi, '')
    .replace(/\bbest in bangladesh\b/gi, '')
    .replace(/\bguaranteed\b/gi, '')
    .replace(/\b100%\s*guaranteed\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

const buildFallbackSuggestion = (context = {}, extraRecommendation = null) => {
    const shopName = safeString(context.shopName || 'Your Store', 80);
    const heroTitle = safeString(context.heroTitle || '', 80);
    const keywords = normalizeKeywords(context.keywords || []);

    const fallbackTitle = truncate(
        `${shopName} - ${heroTitle || 'Online Store'}`,
        60
    );

    const fallbackDescription = truncate(
        `Shop trusted products from ${shopName}. Browse new arrivals, offers, and customer favorites online.`,
        155
    );

    const recommendations = [
        extraRecommendation,
        {
            type: 'description',
            priority: 'medium',
            message: 'Keep the homepage description specific, natural, and focused on what customers can buy from your store.'
        },
        {
            type: 'keywords',
            priority: 'low',
            message: 'Use product categories and common customer search terms naturally instead of keyword stuffing.'
        }
    ].filter(Boolean);

    return {
        title: fallbackTitle,
        description: fallbackDescription,
        keywords,
        recommendations: cleanRecommendations(recommendations)
    };
};

const cleanSeoSuggestion = (raw = {}, context = {}) => {
    const fallback = buildFallbackSuggestion(context);

    const title = removeUnsafeClaims(raw.title || fallback.title);
    const description = removeUnsafeClaims(raw.description || fallback.description);

    return {
        title: truncate(title || fallback.title, 70),
        description: truncate(description || fallback.description, 170),
        keywords: normalizeKeywords(raw.keywords || context.keywords),
        recommendations: cleanRecommendations(raw.recommendations || fallback.recommendations)
    };
};

const stripMarkdownCodeFence = (text = '') => String(text || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

const extractJsonObjectText = (text = '') => {
    const cleaned = stripMarkdownCodeFence(text);

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error('AI response did not contain a JSON object');
    }

    return cleaned.slice(firstBrace, lastBrace + 1);
};

const removeTrailingCommas = (jsonText = '') => jsonText.replace(/,\s*([}\]])/g, '$1');

const parseGeminiJson = (text = '') => {
    const jsonText = extractJsonObjectText(text);

    try {
        return JSON.parse(jsonText);
    } catch (firstError) {
        const repaired = removeTrailingCommas(jsonText);

        try {
            return JSON.parse(repaired);
        } catch (secondError) {
            const error = new Error(`AI response JSON parse failed: ${secondError.message}`);
            error.code = 'AI_RESPONSE_PARSE_FAILED';
            error.rawPreview = String(text || '').slice(0, 300);
            throw error;
        }
    }
};

const buildPrompt = ({ shop = {}, theme = {}, products = [] }) => {
    const hero = theme.hero || {};
    const seo = theme.seo || {};

    const navigationLabels = (theme.navigation || [])
        .map(item => safeString(item?.label, 40))
        .filter(Boolean)
        .slice(0, 8);

    const productSummary = products
        .slice(0, 20)
        .map(product => ({
            title: safeString(product.title, 80),
            category: safeString(product.category, 50),
            tags: normalizeKeywords(product.tags).slice(0, 5)
        }));

    return [
        'You are an ecommerce SEO assistant for small online stores.',
        '',
        'Return ONLY valid JSON.',
        'Do not include markdown.',
        'Do not include explanations.',
        'Do not wrap the JSON in ```json.',
        'All strings must be properly escaped.',
        '',
        'The JSON must match this exact schema:',
        '{',
        '  "title": "string",',
        '  "description": "string",',
        '  "keywords": ["string"],',
        '  "recommendations": [',
        '    {',
        '      "type": "string",',
        '      "priority": "high",',
        '      "message": "string"',
        '    }',
        '  ]',
        '}',
        '',
        'Rules:',
        '- Do not make unverifiable claims.',
        '- Do not say #1.',
        '- Do not say best in Bangladesh.',
        '- Avoid keyword stuffing.',
        '- Keep language natural.',
        '- Title target: 50-60 characters.',
        '- Description target: 140-160 characters.',
        '- Recommendations must be practical for a small ecommerce seller.',
        '',
        `Shop name: ${safeString(shop.shopName, 80)}`,
        `Store URL/subdomain: ${safeString(shop.subdomain, 80)}`,
        `Hero title: ${safeString(hero.title, 100)}`,
        `Hero subtitle: ${safeString(hero.subtitle, 180)}`,
        `Current SEO title: ${safeString(seo.title, 100)}`,
        `Current SEO description: ${safeString(seo.description, 180)}`,
        `Navigation labels: ${navigationLabels.join(', ') || 'none'}`,
        `Products: ${JSON.stringify(productSummary).slice(0, 1800)}`
    ].join('\n');
};

const callGemini = async (prompt) => {
    if (!process.env.GEMINI_API_KEY) {
        const error = new Error(AI_NOT_CONFIGURED_MESSAGE);
        error.code = 'AI_NOT_CONFIGURED';
        throw error;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
        generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 700,
            responseMimeType: 'application/json'
        }
    });

    const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

    const timeout = new Promise((_, reject) => {
        setTimeout(() => {
            const error = new Error('Gemini request timed out');
            error.code = 'AI_PROVIDER_TIMEOUT';
            reject(error);
        }, timeoutMs);
    });

    const result = await Promise.race([
        model.generateContent(prompt),
        timeout
    ]);

    return result.response.text();
};

const buildContext = ({ shop = {}, theme = {}, products = [] }) => ({
    shopName: shop?.shopName,
    heroTitle: theme?.hero?.title,
    keywords: products
        .flatMap(product => [
            product?.category,
            ...(Array.isArray(product?.tags) ? product.tags : [])
        ])
        .filter(Boolean)
});

const generateStoreSeoSuggestion = async ({ shop = {}, theme = {}, products = [] }) => {
    const context = buildContext({ shop, theme, products });
    const prompt = buildPrompt({ shop, theme, products });

    let text = '';

    try {
        text = await callGemini(prompt);
    } catch (error) {
        if (error.code === 'AI_NOT_CONFIGURED') {
            throw error;
        }

        const providerError = new Error('AI SEO suggestions could not be generated right now. Please try again later.');
        providerError.code = error.code || 'AI_PROVIDER_FAILED';
        providerError.cause = error;
        throw providerError;
    }

    try {
        const parsed = parseGeminiJson(text);
        return {
            ...cleanSeoSuggestion(parsed, context),
            fallback: false
        };
    } catch (error) {
        console.warn('Store SEO AI parse failed. Using fallback suggestion.', {
            error: error.message,
            code: error.code,
            rawPreview: error.rawPreview
        });

        return {
            ...buildFallbackSuggestion(context, {
                type: 'ai',
                priority: 'medium',
                message: AI_PARSE_FALLBACK_MESSAGE
            }),
            fallback: true,
            errorCode: 'AI_RESPONSE_PARSE_FAILED'
        };
    }
};

module.exports = {
    generateStoreSeoSuggestion,
    cleanSeoSuggestion,
    __test: {
        buildPrompt,
        parseGeminiJson,
        cleanSeoSuggestion,
        buildFallbackSuggestion,
        extractJsonObjectText
    }
};