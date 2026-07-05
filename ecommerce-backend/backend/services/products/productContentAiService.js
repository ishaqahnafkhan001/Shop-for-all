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

const sellingPointSchema = {
    type: SchemaType.OBJECT,
    required: ['point', 'reason'],
    properties: {
        point: stringSchema('Short specific benefit label, 1 to 5 words.'),
        reason: stringSchema('Evidence-based reason explaining customer value.'),
        visualEvidence: stringSchema('Visible detail or trusted product data that supports the point.'),
        confidence: stringSchema('low, medium, or high.')
    }
};

const PRODUCT_CONTENT_RESPONSE_SCHEMA = {
    type: SchemaType.OBJECT,
    required: [
        'seoTitle',
        'seoDescription',
        'description',
        'whyBuy',
        'specifications',
        'extraNotes',
        'imageAlt'
    ],
    properties: {
        seoTitle: stringSchema('SEO title around 50 to 70 characters.'),
        seoDescription: stringSchema('SEO description around 120 to 160 characters.'),
        description: stringSchema('Shopper-facing product description.'),
        whyBuy: {
            type: SchemaType.ARRAY,
            minItems: 3,
            maxItems: 5,
            items: sellingPointSchema
        },
        sellingPoints: {
            type: SchemaType.ARRAY,
            maxItems: 5,
            items: sellingPointSchema
        },
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
        imageAnalysis: {
            type: SchemaType.OBJECT,
            properties: {
                summary: stringSchema('Brief visual summary.'),
                productType: stringSchema('Probable visible product type.'),
                confidence: stringSchema('low, medium, or high.'),
                visibleAttributes: stringListSchema(6, 'Only details visible in the image.'),
                uncertainAttributes: stringListSchema(4, 'Details that cannot be confirmed from the image.')
            }
        },
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

const removeUnsafeClaims = (value = '', max = 300) => safeString(value, max + 80)
    .replace(/#\s*1/gi, '')
    .replace(/\bbest(?:\s+\w+){0,3}\s+in bangladesh\b/gi, '')
    .replace(/\bguaranteed\b/gi, '')
    .replace(/\b100%\s*guaranteed\b/gi, '')
    .replace(/\b(?:real|pure|authentic|certified)\s+(?:gold|silver|diamond|gemstone|leather)\b/gi, '')
    .replace(/\b(?:waterproof|hypoallergenic|medical grade|clinically proven|lifetime warranty)\b/gi, '')
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
            title: safeString(row?.title || row?.point || row?.label || row?.name, 60),
            value: safeString(row?.value || row?.reason || row?.text || row?.description, 160)
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

const GENERIC_SELLING_POINT_RE = /^(clear details|image confidence|choice options|customer choice|product quality|premium quality|best product|great product|good design|stylish product|perfect choice|must buy|value for money|amazing design|great value|high quality|easy to use|product benefit|benefit\s*\d*|simple choice|photo recommended)$/i;
const GENERIC_REASON_RE = /\b(helps customers understand|shown clearly before ordering|gives customers confidence|suitable for (?:customers|shoppers) looking for|matches customer needs|is a good option|is a great choice|helps shoppers decide|clear product details before ordering|understand what they are buying)\b/i;

const countWords = (value = '') => String(value || '').trim().split(/\s+/).filter(Boolean).length;

const normalizeConfidence = (value = '') => {
    const confidence = safeString(value, 20).toLowerCase();
    return ['low', 'medium', 'high'].includes(confidence) ? confidence : '';
};

const isWeakSellingPoint = ({ point = '', reason = '' } = {}) => {
    const normalizedPoint = safeString(point, 80).toLowerCase();
    const normalizedReason = safeString(reason, 260).toLowerCase();

    if (!point || !reason) return true;
    if (GENERIC_SELLING_POINT_RE.test(normalizedPoint)) return true;
    if (GENERIC_REASON_RE.test(normalizedReason)) return true;
    if (countWords(point) > 7) return true;
    if (countWords(reason) < 8) return true;
    if (reason.length < 45) return true;
    return false;
};

const normalizeSellingPointItem = (item = {}, index = 0) => {
    if (typeof item === 'string') {
        const reason = removeUnsafeClaims(item, 220);
        const point = safeString(reason, 60).split(/\s+/).slice(0, 4).join(' ');
        return !isWeakSellingPoint({ point, reason })
            ? { point, reason, visualEvidence: '', confidence: 'low' }
            : null;
    }

    const point = removeUnsafeClaims(
        item?.point || item?.title || item?.label || item?.name || '',
        60
    );
    const reason = removeUnsafeClaims(
        item?.reason || item?.value || item?.description || item?.text || '',
        220
    );
    const visualEvidence = removeUnsafeClaims(
        item?.visualEvidence || item?.evidence || item?.supportingEvidence || '',
        160
    );
    const confidence = normalizeConfidence(item?.confidence);

    if (isWeakSellingPoint({ point, reason })) return null;

    return { point, reason, visualEvidence, confidence };
};

const normalizeSellingPoints = (items = []) => {
    const source = Array.isArray(items) ? items : String(items || '').split('\n');
    const seen = new Set();

    return source
        .map(normalizeSellingPointItem)
        .filter(Boolean)
        .filter(item => {
            const key = `${item.point.toLowerCase()}|${item.reason.toLowerCase().slice(0, 80)}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 5);
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

const normalizeImageAnalysis = (analysis = {}) => {
    if (!analysis || typeof analysis !== 'object') {
        return {
            summary: '',
            productType: '',
            visibleAttributes: [],
            uncertainAttributes: [],
            confidence: ''
        };
    }

    const confidence = safeString(analysis.confidence, 20).toLowerCase();
    return {
        summary: removeUnsafeClaims(analysis.summary || analysis.description || '', 180),
        productType: removeUnsafeClaims(analysis.productType || analysis.type || '', 80),
        visibleAttributes: normalizeStringList(analysis.visibleAttributes || analysis.observed || [], 6, 90),
        uncertainAttributes: normalizeStringList(analysis.uncertainAttributes || analysis.uncertain || [], 4, 110),
        confidence: ['low', 'medium', 'high'].includes(confidence) ? confidence : ''
    };
};

const cleanProductContentSuggestion = (raw = {}) => ({
    seoTitle: removeUnsafeClaims(raw.seoTitle || raw.seo?.title || '', 70),
    seoDescription: removeUnsafeClaims(raw.seoDescription || raw.seo?.description || '', 170),
    description: removeUnsafeClaims(raw.description || '', 700),
    sellingPoints: normalizeSellingPoints(
        Array.isArray(raw.whyBuy) && raw.whyBuy.length ? raw.whyBuy : raw.sellingPoints
    ),
    specifications: normalizeSpecifications(raw.specifications),
    extraNotes: normalizeStringList(raw.extraNotes || raw.comments, 4, 120),
    imageAlt: removeUnsafeClaims(raw.imageAlt || raw.imageAltText || '', 130),
    imageAnalysis: normalizeImageAnalysis(raw.imageAnalysis),
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

const attributeValueSummary = (variants = []) => {
    const values = variants
        .flatMap(variant => variant.attributes || [])
        .map(attribute => attribute.value || attribute.name)
        .filter(Boolean);

    return [...new Set(values)].slice(0, 6).join(', ');
};

const contextText = (context = {}) => [
    context.title,
    context.category,
    ...(context.tags || []),
    ...(context.specifications || []).flatMap(item => [item.title, item.value]),
    ...(context.features || []).flatMap(item => [item.title, item.value])
].filter(Boolean).join(' ').toLowerCase();

const isJewelleryContext = (context = {}) => /jewel|jewell|bala|bracelet|bangle|ring|necklace|earring|hand harness|গহনা|বালা|হাতফুল|চুড়ি|চুড়ি/i.test(contextText(context));
const isClothingContext = (context = {}) => /cloth|dress|shirt|panjabi|saree|sari|kurti|fashion|wear|কাপড়|পাঞ্জাবি|শাড়ি/i.test(contextText(context));

const buildFallbackSellingPoints = (context = {}) => {
    const title = safeString(context.title, 80);
    const category = safeString(context.category, 60);
    const optionSummary = attributeSummary(context.variants);
    const optionValueSummary = attributeValueSummary(context.variants);
    const lowerOptions = `${optionSummary} ${optionValueSummary}`.toLowerCase();
    const points = [];

    if (optionSummary) {
        const finishLike = /color|colour|finish|tone|brass|nickel|gold|silver|black|white|red|blue|green/i.test(lowerOptions);
        const optionText = optionValueSummary || optionSummary;
        points.push({
            point: finishLike ? 'Finish choices' : 'Variant choices',
            reason: finishLike
                ? `Available ${optionText} options let shoppers choose the tone that best matches their outfit and style.`
                : `Available ${optionText} options help shoppers select the version that fits their preference before ordering.`,
            visualEvidence: 'Generated from the product variant options supplied by the seller.',
            confidence: 'high'
        });
    }

    if (isJewelleryContext(context)) {
        points.push(
            {
                point: 'Occasion styling',
                reason: `The ${category || 'jewellery'} category makes it useful for customers planning festive, cultural, or dressed-up looks.`,
                visualEvidence: 'Generated from the jewellery product title, category, or tags supplied by the seller.',
                confidence: 'medium'
            },
            {
                point: 'Outfit pairing',
                reason: `${title || 'This accessory'} can help shoppers add a decorative accent to traditional or occasion-focused outfits.`,
                visualEvidence: 'Generated from the product title and jewellery category context.',
                confidence: 'medium'
            }
        );
    } else if (isClothingContext(context)) {
        points.push(
            {
                point: 'Easy styling',
                reason: `${title || 'This item'} gives shoppers a clear clothing option they can coordinate with everyday or occasion outfits.`,
                visualEvidence: 'Generated from the clothing product title, category, or tags supplied by the seller.',
                confidence: 'medium'
            },
            {
                point: 'Wardrobe fit',
                reason: `The ${category || 'clothing'} category helps shoppers understand where this item fits in their wardrobe.`
            }
        );
    }

    (context.specifications || []).slice(0, 2).forEach(spec => {
        if (!spec.title || !spec.value) return;
        points.push({
            point: safeString(spec.title, 45),
            reason: `${spec.value} gives shoppers a concrete product detail they can compare before deciding to buy.`,
            visualEvidence: `Generated from the seller-provided specification: ${spec.title}.`,
            confidence: 'high'
        });
    });

    return normalizeSellingPoints(points);
};

const buildFallbackSuggestion = (context = {}, { usedImage = false } = {}) => {
    const title = safeString(context.title, 80) || 'Product';
    const category = safeString(context.category, 60);
    const tags = normalizeTags(context.tags).slice(0, 4);
    const optionSummary = attributeSummary(context.variants);
    const productType = category || tags[0] || 'Product';
    const sellingPoints = buildFallbackSellingPoints(context);

    if (!sellingPoints.length) {
        const error = new Error('Insufficient product context for useful AI fallback');
        error.code = 'INSUFFICIENT_PRODUCT_CONTEXT';
        throw error;
    }

    const seoTitle = truncate(
        `${title}${category ? ` - ${category}` : ' - Online Store'}`,
        70
    );
    const seoDescription = truncate(
        `Shop ${title}${category ? ` from ${category}` : ''}. Review product details, available options, and delivery information before ordering.`,
        170
    );
    const description = truncate(
        `${title} is a ${productType.toLowerCase()}${optionSummary ? ` with options such as ${optionSummary}` : ''}. Review the product details, compare the available choices, and select the version that fits your style before placing the order.`,
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
        whyBuy: sellingPoints,
        specifications: specifications.length ? specifications : [{ label: 'Product type', value: 'General product' }],
        extraNotes: [
            'Actual color may slightly vary due to lighting and screen settings.',
            'Please check the selected variant before placing the order.',
            'Contact the store if you need more product details.'
        ],
        imageAlt: usedImage
            ? `${title} ${productType} product image`
            : `${title} ${productType}`,
        imageAnalysis: {
            summary: usedImage
                ? 'The image was sent to AI, but no reliable visual analysis was returned. These suggestions use product text and seller-provided details.'
                : 'Suggestions use product text and seller-provided details.',
            productType,
            visibleAttributes: [],
            uncertainAttributes: ['Exact material, dimensions, and authenticity cannot be confirmed unless provided by the seller.'],
            confidence: 'low'
        },
        confidenceNotes: []
    });
};

const buildPrompt = (context = {}, imageAvailable = false, { strictRetry = false } = {}) => [
    'You are an ecommerce product content assistant for Bangladeshi small online sellers.',
    'Return ONLY valid JSON. Do not include markdown, comments, or explanations.',
    strictRetry
        ? 'This is a retry because the previous answer was too generic. Be stricter and return only evidence-backed benefits.'
        : '',
    '',
    'JSON schema:',
    '{',
    '  "seoTitle": "string",',
    '  "seoDescription": "string",',
    '  "description": "string",',
    '  "imageAnalysis": { "summary": "string", "productType": "string", "visibleAttributes": ["string"], "uncertainAttributes": ["string"], "confidence": "low|medium|high" },',
    '  "whyBuy": [{ "point": "string", "reason": "string", "visualEvidence": "string", "confidence": "low|medium|high" }],',
    '  "specifications": [{ "label": "string", "value": "string" }],',
    '  "extraNotes": ["string"],',
    '  "imageAlt": "string",',
    '  "confidenceNotes": ["string"]',
    '}',
    '',
    'Rules:',
    imageAvailable
        ? '- Treat the product image as a primary source. Carefully inspect visible product type, shape, design, pattern, color/finish, decorative elements, form factor, style, and use context.'
        : '- No image is provided. Do not describe visual features. Use only the trusted product text, variants, specifications, and existing seller content.',
    '- Combine image evidence with product title, category, tags, variants, specifications, and existing product description.',
    '- In imageAnalysis, separate observed image details from uncertain or unsupported details.',
    '- Do not claim uncertain materials, dimensions, brands, medical benefits, purity, waterproofing, warranty, certifications, authenticity, or guarantees.',
    '- Do not say #1, best in Bangladesh, guaranteed, or use keyword stuffing.',
    '- Preserve Bangla, English, or mixed tone based on the product title and existing content.',
    '- SEO title target: 50-70 characters.',
    '- SEO description target: 120-160 characters.',
    '- Description target: 60-110 words, concise and product-specific.',
    '- whyBuy: write 3-5 high-quality point/reason/visualEvidence/confidence objects.',
    '- Each point must be 1-5 words, maximum 60 characters, specific, and easy to scan.',
    '- Each reason must be 10-28 words, maximum 220 characters, evidence-based, customer-focused, and honest.',
    '- Each visualEvidence must state what was observed in the image or which trusted product data supports the claim.',
    '- Selling point pattern: point -> evidence from image/product data -> customer value.',
    '- Do not produce vague headings like "Clear details", "Image confidence", "Choice options", "Customer choice", "Product quality", "Premium quality", "Best product", "Great product", "Good design", "Stylish product", "Perfect choice", "Must buy", or "Value for money".',
    '- Do not write generic reasons like "helps customers understand", "shown clearly before ordering", "gives customers confidence", "suitable for shoppers looking for this product", "matches customer needs", "is a good option", or "helps shoppers decide".',
    '- For jewellery, focus on visible design, pattern, styling versatility, occasion suitability, and gifting only when reasonable. Do not invent metal, purity, stones, or weight.',
    '- For clothing, focus on visible cut, styling, color coordination, fit options, and occasion suitability. Do not invent fabric or durability unless supplied.',
    '- For electronics, focus on visible controls and documented features. Do not invent battery, chipset, waterproof rating, or benchmarks.',
    '- For beauty or healthcare products, do not generate medical or treatment claims.',
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

const maskImageHost = (imageUrl = '') => {
    try {
        return new URL(imageUrl).hostname;
    } catch {
        return '';
    }
};

const getTrustedImageHosts = () => new Set([
    'res.cloudinary.com',
    ...String(process.env.TRUSTED_PRODUCT_IMAGE_HOSTS || '')
        .split(',')
        .map(host => host.trim().toLowerCase())
        .filter(Boolean)
]);

const isTrustedImageUrl = (imageUrl = '') => {
    try {
        const parsed = new URL(imageUrl);
        if (parsed.protocol !== 'https:') return false;
        const hostname = parsed.hostname.toLowerCase();
        return getTrustedImageHosts().has(hostname) || hostname.endsWith('.cloudinary.com');
    } catch {
        return false;
    }
};

const fetchImageUrlPart = async (imageUrl = '') => {
    const raw = safeString(imageUrl, 1000);
    if (!isTrustedImageUrl(raw)) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(raw, {
            signal: controller.signal,
            redirect: 'error'
        });
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
    if (filePart) {
        return {
            part: filePart,
            usedImage: true,
            imageSource: 'local_file',
            mimeType: file.mimetype,
            imageSizeBytes: file.buffer.length
        };
    }

    const urlPart = await fetchImageUrlPart(imageUrl);
    if (urlPart) {
        return {
            part: urlPart,
            usedImage: true,
            imageSource: 'existing_product_image',
            mimeType: urlPart.inlineData.mimeType,
            imageSizeBytes: Buffer.byteLength(urlPart.inlineData.data || '', 'base64'),
            imageHost: maskImageHost(imageUrl)
        };
    }

    return {
        part: null,
        usedImage: false,
        imageSource: 'text_only',
        mimeType: '',
        imageSizeBytes: 0
    };
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
            maxOutputTokens: Number(process.env.GEMINI_PRODUCT_AI_MAX_OUTPUT_TOKENS || 2400),
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

const needsSellingPointQuality = (context = {}) => context.requestedSections?.includes('sellingPoints');

const hasUsefulSellingPoints = (suggestion = {}, context = {}) => {
    if (!needsSellingPointQuality(context)) return true;
    return Array.isArray(suggestion.sellingPoints) && suggestion.sellingPoints.length >= 2;
};

const parseAndCleanGeminiText = (text = '') => cleanProductContentSuggestion(parseGeminiJson(text));

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
    const imageInput = await buildImagePart({ file, imageUrl: body.imageUrl });
    const imagePart = imageInput.part;
    const usedImage = Boolean(imageInput.usedImage);
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

    let cleaned;
    let parseErrorCode = '';
    try {
        cleaned = parseAndCleanGeminiText(text);
    } catch (error) {
        parseErrorCode = error.code || 'AI_RESPONSE_PARSE_FAILED';
    }

    if (!cleaned || !hasUsefulSellingPoints(cleaned, context)) {
        try {
            const retryText = await callGemini({
                prompt: buildPrompt(context, usedImage, { strictRetry: true }),
                imagePart
            });
            const retryCleaned = parseAndCleanGeminiText(retryText);
            if (hasUsefulSellingPoints(retryCleaned, context)) {
                return {
                    usedImage,
                    imageSource: imageInput.imageSource,
                    imageDiagnostics: imageInput,
                    fallback: false,
                    data: retryCleaned
                };
            }
            cleaned = retryCleaned;
        } catch (error) {
            parseErrorCode = parseErrorCode || error.code || 'AI_RESPONSE_PARSE_FAILED';
        }
    }

    if (cleaned && hasUsefulSellingPoints(cleaned, context)) {
        return {
            usedImage,
            imageSource: imageInput.imageSource,
            imageDiagnostics: imageInput,
            fallback: false,
            data: cleaned
        };
    }

    try {
        return {
            usedImage,
            imageSource: imageInput.imageSource,
            imageDiagnostics: imageInput,
            fallback: true,
            errorCode: parseErrorCode || 'AI_WEAK_OUTPUT',
            data: buildFallbackSuggestion(context, { usedImage })
        };
    } catch (fallbackError) {
        const insufficient = new Error('Add a clearer product image or more product information to generate useful customer benefits.');
        insufficient.code = fallbackError.code || 'INSUFFICIENT_PRODUCT_CONTEXT';
        insufficient.causeCode = parseErrorCode || fallbackError.code;
        throw insufficient;
    }
};

module.exports = {
    generateProductContentSuggestion,
    cleanProductContentSuggestion,
    __test: {
        buildContext,
        buildPrompt,
        buildImagePart,
        isTrustedImageUrl,
        buildFallbackSuggestion,
        extractGeminiText,
        cleanProductContentSuggestion,
        parseGeminiJson,
        normalizeVariants
    }
};
