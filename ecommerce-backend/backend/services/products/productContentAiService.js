const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_TIMEOUT_MS = 15000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const AI_NOT_CONFIGURED_MESSAGE =
    'AI product suggestions are not configured yet. Please add GEMINI_API_KEY on the backend server.';

const IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp'
]);

const stringSchema = (description = '') => ({
    type: SchemaType.STRING,
    ...(description ? { description } : {})
});

const stringListSchema = (maxItems, description = '') => ({
    type: SchemaType.ARRAY,
    maxItems,
    items: stringSchema(description)
});

const PRODUCT_CONTENT_RESPONSE_SCHEMA = {
    type: SchemaType.OBJECT,
    required: [
        'seoTitle',
        'seoDescription',
        'description',
        'sellingPoints',
        'specifications',
        'extraNotes',
        'imageAlt'
    ],
    properties: {
        seoTitle: stringSchema('SEO title around 50 to 70 characters.'),
        seoDescription: stringSchema('SEO description around 120 to 160 characters.'),
        description: stringSchema('Shopper-facing product description.'),
        sellingPoints: stringListSchema(6, 'Short shopper-facing selling point.'),
        specifications: {
            type: SchemaType.ARRAY,
            maxItems: 8,
            items: {
                type: SchemaType.OBJECT,
                required: ['label', 'value'],
                properties: {
                    label: stringSchema('Short specification label.'),
                    value: stringSchema('Safe specification value.')
                }
            }
        },
        extraNotes: stringListSchema(4, 'Practical shopper note.'),
        imageAlt: stringSchema('Concise product image alt text.'),
        confidenceNotes: stringListSchema(5, 'Short note about uncertainty or assumptions.')
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
    .replace(/\b100%\s*guaranteed\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const parseJsonField = (value, fallback) => {
    if (Array.isArray(value) || (value && typeof value === 'object')) return value;
    if (typeof value !== 'string' || !value.trim()) return fallback;

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const normalizeTags = (tags = []) => {
    const source = Array.isArray(tags)
        ? tags
        : String(tags || '').split(',');

    return [...new Set(source
        .map(tag => safeString(tag, 40).toLowerCase())
        .filter(Boolean))]
        .slice(0, 12);
};

const normalizeRequestedSections = (requestedSections = []) => {
    const allowed = new Set([
        'seo',
        'description',
        'sellingPoints',
        'specifications',
        'extraNotes',
        'imageAlt'
    ]);

    const requested = parseJsonField(requestedSections, requestedSections);
    const source = Array.isArray(requested) ? requested : String(requested || '').split(',');
    const cleaned = source
        .map(section => safeString(section, 30))
        .filter(section => allowed.has(section));

    return cleaned.length ? [...new Set(cleaned)] : [...allowed];
};

const normalizeVariants = (variants = []) => {
    const parsed = parseJsonField(variants, []);
    if (!Array.isArray(parsed)) return [];

    return parsed.slice(0, 20).map(variant => ({
        attributes: (Array.isArray(variant?.attributes) ? variant.attributes : [])
            .slice(0, 6)
            .map(attribute => ({
                name: safeString(attribute?.name, 30),
                value: safeString(attribute?.value, 60)
            }))
            .filter(attribute => attribute.name || attribute.value),
        stock: Number.isFinite(Number(variant?.stock ?? variant?.inventory?.stock))
            ? Math.max(Number(variant.stock ?? variant.inventory.stock), 0)
            : undefined,
        price: Number.isFinite(Number(variant?.priceOverride ?? variant?.pricing?.price))
            ? Math.max(Number(variant.priceOverride ?? variant.pricing.price), 0)
            : undefined
    })).filter(variant => variant.attributes.length || variant.stock !== undefined || variant.price !== undefined);
};

const normalizeExistingRows = (rows = []) => {
    const parsed = parseJsonField(rows, []);
    if (!Array.isArray(parsed)) return [];

    return parsed.slice(0, 12)
        .map(row => ({
            title: safeString(row?.title || row?.label || row?.name, 60),
            value: safeString(row?.value || row?.text || row?.description, 160)
        }))
        .filter(row => row.title || row.value);
};

const buildContext = (body = {}) => ({
    title: safeString(body.title, 120),
    category: safeString(body.category, 80),
    tags: normalizeTags(parseJsonField(body.tags, body.tags || [])),
    sellingPrice: Number.isFinite(Number(body.sellingPrice)) ? Number(body.sellingPrice) : undefined,
    existingDescription: safeString(body.existingDescription, 700),
    existingSeoTitle: safeString(body.existingSeoTitle, 90),
    existingSeoDescription: safeString(body.existingSeoDescription, 190),
    languageHint: ['auto', 'en', 'bn', 'mixed'].includes(String(body.languageHint || '').toLowerCase())
        ? String(body.languageHint).toLowerCase()
        : 'auto',
    requestedSections: normalizeRequestedSections(body.requestedSections),
    variants: normalizeVariants(body.variants),
    features: normalizeExistingRows(body.features),
    specifications: normalizeExistingRows(body.specifications),
    comments: normalizeExistingRows(body.comments)
});

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

const parseGeminiJson = (text = '') => {
    const jsonText = extractJsonObjectText(text);

    try {
        return JSON.parse(jsonText);
    } catch (error) {
        const repaired = jsonText.replace(/,\s*([}\]])/g, '$1');
        try {
            return JSON.parse(repaired);
        } catch (secondError) {
            const parseError = new Error(`AI response JSON parse failed: ${secondError.message}`);
            parseError.code = 'AI_RESPONSE_PARSE_FAILED';
            throw parseError;
        }
    }
};

const normalizeStringList = (items = [], maxItems = 6, maxLength = 90) => {
    const source = Array.isArray(items) ? items : String(items || '').split('\n');

    return [...new Set(source
        .map(item => removeUnsafeClaims(item, maxLength))
        .filter(Boolean))]
        .slice(0, maxItems);
};

const normalizeSpecifications = (items = []) => {
    const source = Array.isArray(items) ? items : [];

    return source.slice(0, 8)
        .map(item => ({
            label: safeString(item?.label || item?.title || item?.name, 40),
            value: removeUnsafeClaims(item?.value || item?.description || item?.text, 100)
        }))
        .filter(item => item.label && item.value);
};

const cleanProductContentSuggestion = (raw = {}) => ({
    seoTitle: removeUnsafeClaims(raw.seoTitle || raw.seo?.title || '', 70),
    seoDescription: removeUnsafeClaims(raw.seoDescription || raw.seo?.description || '', 170),
    description: removeUnsafeClaims(raw.description || '', 700),
    sellingPoints: normalizeStringList(raw.sellingPoints, 6, 90),
    specifications: normalizeSpecifications(raw.specifications),
    extraNotes: normalizeStringList(raw.extraNotes || raw.comments, 4, 120),
    imageAlt: removeUnsafeClaims(raw.imageAlt || raw.imageAltText || '', 130),
    confidenceNotes: normalizeStringList(raw.confidenceNotes, 5, 140)
});

const truncate = (value = '', max = 160) => safeString(value, max + 20).slice(0, max).trim();

const attributeSummary = (variants = []) => {
    const values = variants
        .flatMap(variant => variant.attributes || [])
        .map(attribute => [attribute.name, attribute.value].filter(Boolean).join(': '))
        .filter(Boolean);

    return [...new Set(values)].slice(0, 6).join(', ');
};

const buildFallbackSuggestion = (context = {}, { usedImage = false } = {}) => {
    const title = safeString(context.title, 80) || 'Product';
    const category = safeString(context.category, 60);
    const tags = normalizeTags(context.tags).slice(0, 4);
    const optionSummary = attributeSummary(context.variants);
    const productType = category || tags[0] || 'Product';

    const seoTitle = truncate(
        `${title}${category ? ` - ${category}` : ' - Online Store'}`,
        70
    );
    const seoDescription = truncate(
        `Shop ${title}${category ? ` from ${category}` : ''}. Review product details, available options, and delivery information before ordering.`,
        170
    );
    const description = truncate(
        `${title} is a ${productType.toLowerCase()} for customers looking for a clear, easy-to-order product. Review the available options${optionSummary ? ` such as ${optionSummary}` : ''}, check the product images, and choose the variant that matches your preference before placing the order.`,
        700
    );

    const specifications = [
        { label: 'Product type', value: productType },
        category ? { label: 'Category', value: category } : null,
        optionSummary ? { label: 'Available options', value: optionSummary } : null,
        tags.length ? { label: 'Tags', value: tags.join(', ') } : null
    ].filter(Boolean);

    return cleanProductContentSuggestion({
        seoTitle,
        seoDescription,
        description,
        sellingPoints: [
            `${productType} details are easy for shoppers to understand`,
            optionSummary ? 'Available options help customers choose the right variant' : 'Simple product information helps customers decide faster',
            'Clear product content improves search and storefront trust',
            'Suitable for product cards, product pages, and shared links'
        ],
        specifications: specifications.length ? specifications : [{ label: 'Product type', value: 'General product' }],
        extraNotes: [
            'Actual color may slightly vary due to lighting and screen settings.',
            'Please check the selected variant before placing the order.',
            'Contact the store if you need more product details.'
        ],
        imageAlt: usedImage
            ? `${title} ${productType} product image`
            : `${title} ${productType}`,
        confidenceNotes: []
    });
};

const buildPrompt = (context = {}, imageAvailable = false) => [
    'You are an ecommerce product content assistant for Bangladeshi small online sellers.',
    'Return ONLY valid JSON. Do not include markdown, comments, or explanations.',
    '',
    'JSON schema:',
    '{',
    '  "seoTitle": "string",',
    '  "seoDescription": "string",',
    '  "description": "string",',
    '  "sellingPoints": ["string"],',
    '  "specifications": [{ "label": "string", "value": "string" }],',
    '  "extraNotes": ["string"],',
    '  "imageAlt": "string",',
    '  "confidenceNotes": ["string"]',
    '}',
    '',
    'Rules:',
    '- Use the product image when provided, but do not claim uncertain materials, dimensions, brands, medical benefits, or guarantees.',
    '- Do not say #1, best in Bangladesh, guaranteed, or use keyword stuffing.',
    '- Preserve Bangla, English, or mixed tone based on the product title and existing content.',
    '- SEO title target: 50-70 characters.',
    '- SEO description target: 120-160 characters.',
    '- Description target: 60-110 words, concise and product-specific.',
    '- Selling points: 4-6 short shopper-facing points.',
    '- Specifications: 4-8 safe rows. Do not invent exact material, dimensions, or weight unless provided.',
    '- Extra notes: 2-4 practical shopper notes, not internal admin notes.',
    '- Image alt: concise product image description.',
    '- Never include buying price, cost price, supplier info, private customer data, or internal admin data.',
    '',
    `Image available: ${imageAvailable ? 'yes' : 'no'}`,
    `Safe product context: ${JSON.stringify(context).slice(0, 4200)}`
].join('\n');

const fileToGeminiPart = (file) => {
    if (!file?.buffer || !IMAGE_MIME_TYPES.has(file.mimetype)) return null;

    return {
        inlineData: {
            data: file.buffer.toString('base64'),
            mimeType: file.mimetype
        }
    };
};

const fetchImageUrlPart = async (imageUrl = '') => {
    const raw = safeString(imageUrl, 1000);
    if (!/^https?:\/\//i.test(raw)) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(raw, { signal: controller.signal });
        if (!response.ok) return null;

        const mimeType = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        const length = Number(response.headers.get('content-length') || 0);
        if (!IMAGE_MIME_TYPES.has(mimeType) || length > MAX_IMAGE_BYTES) return null;

        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > MAX_IMAGE_BYTES) return null;

        return {
            inlineData: {
                data: buffer.toString('base64'),
                mimeType
            }
        };
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
};

const buildImagePart = async ({ file, imageUrl }) => {
    const filePart = fileToGeminiPart(file);
    if (filePart) return filePart;

    return fetchImageUrlPart(imageUrl);
};

const callGemini = async ({ prompt, imagePart }) => {
    if (!process.env.GEMINI_API_KEY) {
        const error = new Error(AI_NOT_CONFIGURED_MESSAGE);
        error.code = 'AI_NOT_CONFIGURED';
        throw error;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
        generationConfig: {
            temperature: 0.25,
            topP: 0.8,
            maxOutputTokens: 1200,
            responseMimeType: 'application/json',
            responseSchema: PRODUCT_CONTENT_RESPONSE_SCHEMA
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

    const parts = imagePart ? [{ text: prompt }, imagePart] : [{ text: prompt }];
    const result = await Promise.race([
        model.generateContent({
            contents: [{ role: 'user', parts }]
        }),
        timeout
    ]);

    const text = extractGeminiText(result);
    if (!text) {
        const error = new Error('Gemini response was empty');
        error.code = 'AI_RESPONSE_EMPTY';
        throw error;
    }

    return text;
};

const extractGeminiText = (result = {}) => {
    try {
        const directText = result.response?.text?.();
        if (directText) return directText;
    } catch {
        // Fall through to candidate parts for blocked or malformed SDK responses.
    }

    const candidateText = result.response?.candidates
        ?.flatMap(candidate => candidate?.content?.parts || [])
        ?.map(part => part?.text || '')
        ?.filter(Boolean)
        ?.join('\n')
        ?.trim();

    return candidateText || '';
};

const generateProductContentSuggestion = async ({ body = {}, file = null } = {}) => {
    const context = buildContext(body);
    const imagePart = await buildImagePart({ file, imageUrl: body.imageUrl });
    const usedImage = Boolean(imagePart);
    const prompt = buildPrompt(context, usedImage);
    let text = '';

    try {
        text = await callGemini({ prompt, imagePart });
    } catch (error) {
        if (error.code === 'AI_NOT_CONFIGURED') {
            throw error;
        }

        const providerError = new Error('AI product suggestions could not be generated right now. Please try again later.');
        providerError.code = 'AI_PROVIDER_FAILED';
        providerError.causeCode = error.code || error.name || 'AI_PROVIDER_ERROR';
        throw providerError;
    }

    let parsed;
    try {
        parsed = parseGeminiJson(text);
    } catch (error) {
        console.warn('Product content AI parse failed. Using fallback suggestion.', {
            code: error.code || 'AI_RESPONSE_PARSE_FAILED'
        });

        return {
            usedImage,
            fallback: true,
            errorCode: 'AI_RESPONSE_PARSE_FAILED',
            data: buildFallbackSuggestion(context, { usedImage, reason: 'parse' })
        };
    }

    return {
        usedImage,
        fallback: false,
        data: cleanProductContentSuggestion(parsed)
    };
};

module.exports = {
    generateProductContentSuggestion,
    cleanProductContentSuggestion,
    __test: {
        buildContext,
        buildPrompt,
        buildImagePart,
        buildFallbackSuggestion,
        extractGeminiText,
        cleanProductContentSuggestion,
        parseGeminiJson,
        normalizeVariants
    }
};
