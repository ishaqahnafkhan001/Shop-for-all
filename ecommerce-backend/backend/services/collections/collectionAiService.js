const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_TIMEOUT_MS = 15000;

const COLLECTION_AI_DISABLED_MESSAGE =
    'AI collection suggestions are not configured yet. Please add GEMINI_API_KEY on the backend server.';

const stringSchema = (description = '') => ({
    type: SchemaType.STRING,
    ...(description ? { description } : {})
});

const COLLECTION_AI_RESPONSE_SCHEMA = {
    type: SchemaType.OBJECT,
    required: ['name', 'description', 'seoTitle', 'seoDescription', 'slug', 'keywords', 'suggestedRules'],
    properties: {
        name: stringSchema('Collection name.'),
        description: stringSchema('Collection description.'),
        seoTitle: stringSchema('SEO title around 50 to 70 characters.'),
        seoDescription: stringSchema('SEO meta description around 120 to 160 characters.'),
        slug: stringSchema('Short URL slug using lowercase letters, numbers, and hyphens where possible.'),
        keywords: {
            type: SchemaType.ARRAY,
            maxItems: 10,
            items: stringSchema('Collection keyword.')
        },
        suggestedRules: {
            type: SchemaType.ARRAY,
            maxItems: 6,
            items: stringSchema('Simple product-selection rule suggestion.')
        }
    }
};

const safeString = (value = '', max = 300) => String(value || '')
    .replace(/\0/g, '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[`*_~#]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const removeUnsafeClaims = (value = '', max = 300) => safeString(value, max + 40)
    .replace(/#\s*1/gi, '')
    .replace(/\bbest(?:\s+\w+){0,3}\s+in bangladesh\b/gi, '')
    .replace(/\bguaranteed\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const slugify = (value = '') => {
    const ascii = String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);

    return ascii || encodeURIComponent(safeString(value, 80)).toLowerCase().replace(/%/g, '').slice(0, 80);
};

const normalizeList = (items = [], maxItems = 8, maxLength = 70) => {
    const source = Array.isArray(items) ? items : String(items || '').split(/[,\n]/);
    return [...new Set(source.map(item => removeUnsafeClaims(item, maxLength)).filter(Boolean))].slice(0, maxItems);
};

const normalizeSuggestion = (raw = {}, fallbackName = '') => {
    const name = removeUnsafeClaims(raw.name || raw.title || fallbackName, 100);
    const description = removeUnsafeClaims(raw.description, 1000);
    const seoTitle = removeUnsafeClaims(raw.seoTitle || raw.seo?.title || name, 70);
    const seoDescription = removeUnsafeClaims(raw.seoDescription || raw.seo?.description || description, 170);
    const slug = slugify(raw.slug || name);

    return {
        name,
        description,
        seoTitle,
        seoDescription,
        slug,
        keywords: normalizeList(raw.keywords, 10, 60),
        suggestedRules: normalizeList(raw.suggestedRules, 6, 120)
    };
};

const buildFallbackSuggestion = (context = {}) => {
    const productCategories = normalizeList(context.products?.map(product => product.category), 5, 60);
    const productTags = normalizeList(context.products?.flatMap(product => product.tags || []), 6, 50);
    const baseName = safeString(context.title, 80) ||
        productCategories[0] ||
        productTags[0] ||
        'Featured Collection';
    const productPhrase = context.products?.length
        ? `${context.products.length} selected product${context.products.length === 1 ? '' : 's'}`
        : 'selected products';

    return normalizeSuggestion({
        name: baseName,
        description: `Browse ${productPhrase} curated for this collection. Compare product details, prices, and available options before ordering from ${context.shopName || 'this store'}.`,
        seoTitle: `${baseName} Online | ${context.shopName || 'Store'}`,
        seoDescription: `Shop ${baseName} from ${context.shopName || 'this store'}. Discover selected products, clear details, and convenient checkout.`,
        slug: baseName,
        keywords: [...productCategories, ...productTags].slice(0, 8),
        suggestedRules: productCategories.length ? [`Include products in ${productCategories[0]}`] : []
    }, baseName);
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
        const error = new Error('AI response did not contain JSON');
        error.code = 'AI_RESPONSE_PARSE_FAILED';
        throw error;
    }
    return cleaned.slice(firstBrace, lastBrace + 1);
};

const parseJson = (text = '') => {
    const jsonText = extractJsonObjectText(text);
    try {
        return JSON.parse(jsonText);
    } catch (error) {
        const parseError = new Error(`AI JSON parse failed: ${error.message}`);
        parseError.code = 'AI_RESPONSE_PARSE_FAILED';
        throw parseError;
    }
};

const buildPrompt = (context = {}) => [
    'You are an ecommerce collection and SEO assistant for Bangladeshi online sellers.',
    'Return ONLY valid JSON. Do not include markdown.',
    '',
    'JSON schema:',
    '{"name":"string","description":"string","seoTitle":"string","seoDescription":"string","slug":"string","keywords":["string"],"suggestedRules":["string"]}',
    '',
    'Rules:',
    '- Do not claim #1, best in Bangladesh, guaranteed, medical benefits, or uncertain facts.',
    '- Keep the collection name seller-friendly and short.',
    '- SEO title target: 50-70 characters.',
    '- SEO description target: 120-160 characters.',
    '- Suggested rules must be simple, optional ideas only.',
    '- Preserve Bangla, English, or mixed tone based on store and product text.',
    '- Never include private customer data, supplier data, buying price, cost price, or internal admin notes.',
    '',
    `Safe collection context: ${JSON.stringify(context).slice(0, 5000)}`
].join('\n');

const callGemini = async (prompt) => {
    if (!process.env.GEMINI_API_KEY) {
        const error = new Error(COLLECTION_AI_DISABLED_MESSAGE);
        error.code = 'AI_NOT_CONFIGURED';
        throw error;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
        generationConfig: {
            temperature: 0.25,
            topP: 0.8,
            maxOutputTokens: 900,
            responseMimeType: 'application/json',
            responseSchema: COLLECTION_AI_RESPONSE_SCHEMA
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
        model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
        timeout
    ]);

    const text = result.response?.text?.() ||
        result.response?.candidates
            ?.flatMap(candidate => candidate?.content?.parts || [])
            ?.map(part => part?.text || '')
            ?.filter(Boolean)
            ?.join('\n')
            ?.trim() ||
        '';

    if (!text) {
        const error = new Error('Gemini response was empty');
        error.code = 'AI_RESPONSE_EMPTY';
        throw error;
    }

    return text;
};

const generateCollectionSuggestion = async (context = {}) => {
    const prompt = buildPrompt(context);
    let rawText = '';

    try {
        rawText = await callGemini(prompt);
    } catch (error) {
        if (error.code === 'AI_NOT_CONFIGURED') throw error;
        const providerError = new Error('AI collection suggestions could not be generated right now.');
        providerError.code = 'AI_PROVIDER_FAILED';
        providerError.causeCode = error.code || error.name || 'AI_PROVIDER_ERROR';
        throw providerError;
    }

    try {
        return {
            fallback: false,
            data: normalizeSuggestion(parseJson(rawText), context.title)
        };
    } catch (error) {
        return {
            fallback: true,
            errorCode: 'AI_RESPONSE_PARSE_FAILED',
            data: buildFallbackSuggestion(context)
        };
    }
};

module.exports = {
    generateCollectionSuggestion,
    normalizeSuggestion,
    buildFallbackSuggestion,
    __test: {
        buildPrompt,
        parseJson,
        normalizeSuggestion
    }
};
