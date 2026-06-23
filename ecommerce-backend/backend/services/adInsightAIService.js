const { GoogleGenerativeAI } = require('@google/generative-ai');

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_TIMEOUT_MS = 7000;
const DEFAULT_LOCATIONS = ['Bangladesh'];
const FALLBACK_MAJOR_CITIES = ['Dhaka', 'Chattogram', 'Gazipur', 'Narayanganj', 'Sylhet'];
const PRACTICAL_CTAS = new Set(['Shop Now', 'Order Now', 'Learn More', 'Send Message']);

const CATEGORY_DEFINITIONS = [
    {
        type: 'smartphone/mobile phone',
        keywords: [
            'smartphone', 'mobile phone', 'mobile', 'phone', 'android', 'iphone', 'samsung', 'galaxy',
            'galaxy s', 's23', 's24', 's25', '5g phone', '5g', 'oppo', 'vivo', 'xiaomi', 'realme',
            'oneplus', 'pixel', 'camera phone'
        ],
        targetedCustomer: 'Smartphone buyers, Android users, brand fans, students, professionals, mobile gamers, and mobile photography users looking for a reliable phone in Bangladesh.',
        targetedAgeRange: '18-45',
        interests: [
            'Samsung', 'Galaxy S Series', 'Android Phones', 'Smartphones', '5G Phones',
            'Mobile Photography', 'Mobile Gaming', 'Tech Gadgets', 'Mobile Accessories', 'Online Shopping'
        ],
        adAngle: 'Premium smartphone upgrade',
        audienceReason: 'This audience matches the product because it is a smartphone suited for performance, photography, gaming, and everyday professional use.',
        improvementSuggestions: [
            'Add real product photos from multiple angles before running ads.',
            'Mention warranty, condition, storage, and RAM clearly.',
            'Add delivery and Cash on Delivery details to improve trust.'
        ]
    },
    {
        type: 'headphones/audio',
        keywords: [
            'headphone', 'headphones', 'earphone', 'earphones', 'earbud', 'earbuds', 'airpods',
            'bluetooth audio', 'bluetooth headset', 'wireless audio', 'speaker', 'soundbar', 'audio',
            'noise cancellation', 'music'
        ],
        targetedCustomer: 'Music listeners, students, commuters, gamers, remote workers, and gadget buyers looking for wireless audio products.',
        targetedAgeRange: '16-40',
        interests: [
            'Bluetooth Headphones', 'Wireless Audio', 'Music', 'Audio Gadgets', 'Mobile Accessories',
            'Gaming Accessories', 'Tech Gadgets', 'Online Shopping'
        ],
        adAngle: 'Better sound for everyday use',
        audienceReason: 'This audience matches audio products because they value music, calls, gaming, portability, and useful tech accessories.',
        improvementSuggestions: [
            'Mention battery life, sound quality, and compatibility clearly.',
            'Show close-up photos of the product and case/accessories.',
            'Highlight warranty, delivery, and Cash on Delivery details.'
        ]
    },
    {
        type: 'laptop/computer',
        keywords: ['laptop', 'notebook', 'computer', 'desktop', 'pc', 'macbook', 'processor', 'ssd', 'ram', 'gaming laptop'],
        targetedCustomer: 'Students, professionals, freelancers, gamers, and office users comparing laptops or computer products.',
        targetedAgeRange: '18-45',
        interests: ['Laptops', 'Computers', 'PC Gaming', 'Freelancing', 'Office Technology', 'Tech Gadgets', 'Online Shopping'],
        adAngle: 'Performance and productivity upgrade',
        audienceReason: 'This audience matches computer products because they need reliable performance for study, work, gaming, or business.',
        improvementSuggestions: [
            'Mention processor, RAM, storage, display, and warranty clearly.',
            'Add real photos and condition details.',
            'Show delivery and support information prominently.'
        ]
    },
    {
        type: 'electronics/gadgets',
        keywords: [
            'electronics', 'gadget', 'charger', 'power bank', 'smartwatch', 'camera', 'router',
            'keyboard', 'mouse', 'monitor', 'adapter', 'cable', 'usb'
        ],
        targetedCustomer: 'Tech shoppers, gadget buyers, students, professionals, and people looking for useful everyday electronics.',
        targetedAgeRange: '18-45',
        interests: ['Electronics', 'Tech Gadgets', 'Mobile Accessories', 'Online Shopping', 'Gadget Deals', 'Digital Lifestyle'],
        adAngle: 'Useful everyday tech upgrade',
        audienceReason: 'This audience matches electronics because they are likely to compare features, price, reliability, and convenience.',
        improvementSuggestions: [
            'Explain the main product use case in the first line.',
            'Mention compatibility, warranty, and delivery clearly.',
            'Use a clean product image that shows size and included items.'
        ]
    },
    {
        type: 'shoes/footwear',
        keywords: ['shoe', 'shoes', 'sneaker', 'sneakers', 'footwear', 'sandal', 'loafer', 'boot', 'heel'],
        targetedCustomer: 'Footwear buyers, style-focused shoppers, students, office-goers, and casual wear customers looking for comfortable shoes.',
        targetedAgeRange: '16-45',
        interests: ['Footwear', 'Sneakers', 'Men Fashion', 'Casual Shoes', 'Streetwear', 'Online Shopping', 'Lifestyle Fashion'],
        adAngle: 'Comfortable style for daily wear',
        audienceReason: 'This audience matches footwear products because they care about comfort, style, daily use, and outfit matching.',
        improvementSuggestions: [
            'Show size chart and available colors clearly.',
            'Use lifestyle photos showing the shoes being worn.',
            'Mention delivery, exchange, and Cash on Delivery details.'
        ]
    },
    {
        type: 'fashion/clothing',
        keywords: [
            'fashion', 'clothing', 'shirt', 't-shirt', 'tee', 'panjabi', 'saree', 'dress', 'kurti',
            'hoodie', 'jacket', 'cotton', 'silk', 'men fashion', 'women fashion', 'eid'
        ],
        targetedCustomer: 'Fashion-conscious shoppers, casual wear buyers, style-focused customers, gift buyers, and seasonal shoppers.',
        targetedAgeRange: '18-45',
        interests: ['Men Fashion', 'Women Fashion', 'Casual Wear', 'Eid Shopping', 'Lifestyle Fashion', 'Online Shopping'],
        adAngle: 'Style, comfort, and occasion-ready value',
        audienceReason: 'This audience matches fashion products because they respond to styling, comfort, seasonality, and visual presentation.',
        improvementSuggestions: [
            'Add clear size, material, and fit information.',
            'Use model or lifestyle photos if possible.',
            'Mention exchange, delivery, and Cash on Delivery details.'
        ]
    },
    {
        type: 'beauty/skincare',
        keywords: [
            'beauty', 'skincare', 'skin care', 'face wash', 'cleanser', 'serum', 'cream', 'moisturizer',
            'sunscreen', 'makeup', 'cosmetic', 'grooming', 'personal care'
        ],
        targetedCustomer: 'Skincare buyers, beauty-conscious customers, grooming-focused shoppers, and self-care users looking for trusted personal care products.',
        targetedAgeRange: '16-45',
        interests: ['Skincare', 'Beauty Products', 'Face Care', 'Grooming', 'Personal Care', 'Online Shopping'],
        adAngle: 'Trusted self-care for daily routine',
        audienceReason: 'This audience matches beauty and skincare products because they care about routine, results, ingredients, and trust.',
        improvementSuggestions: [
            'Mention skin type, ingredients, and usage instructions clearly.',
            'Add before/after or texture photos only if truthful.',
            'Show authenticity, expiry, and delivery information.'
        ]
    },
    {
        type: 'baby/kids',
        keywords: ['baby', 'kids', 'kid', 'child', 'children', 'diaper', 'diapers', 'toy', 'toys', 'feeding', 'parenting'],
        targetedCustomer: 'Parents, guardians, and family shoppers buying safe, useful, and reliable baby or kids products.',
        targetedAgeRange: '24-45',
        interests: ['Baby Care', 'Parenting', 'Diapers', 'Kids Products', 'Family Shopping', 'Online Shopping'],
        adAngle: 'Safe and practical care for families',
        audienceReason: 'This audience matches baby and kids products because purchase decisions are driven by safety, trust, comfort, and convenience.',
        improvementSuggestions: [
            'Mention size, age range, safety, and material details.',
            'Show pack quantity or included items clearly.',
            'Highlight delivery, support, and Cash on Delivery details.'
        ]
    },
    {
        type: 'home/kitchen',
        keywords: ['home', 'kitchen', 'cookware', 'utensil', 'appliance', 'decor', 'storage', 'bottle', 'lamp', 'cleaning'],
        targetedCustomer: 'Home and kitchen shoppers looking for practical, attractive, and useful everyday products.',
        targetedAgeRange: '22-55',
        interests: ['Home Decor', 'Kitchen Products', 'Home Improvement', 'Lifestyle Shopping', 'Online Shopping'],
        adAngle: 'Practical home upgrade',
        audienceReason: 'This audience matches home and kitchen products because they care about usefulness, durability, design, and convenience.',
        improvementSuggestions: [
            'Show product dimensions, material, and use cases.',
            'Use clean photos in real home settings.',
            'Mention delivery and return details clearly.'
        ]
    },
    {
        type: 'furniture',
        keywords: ['furniture', 'chair', 'table', 'sofa', 'bed', 'cabinet', 'wardrobe', 'shelf', 'desk'],
        targetedCustomer: 'Homeowners, renters, office buyers, and people upgrading furniture for comfort and better space use.',
        targetedAgeRange: '24-55',
        interests: ['Furniture', 'Home Decor', 'Interior Design', 'Home Improvement', 'Office Setup', 'Online Shopping'],
        adAngle: 'Comfort and space upgrade',
        audienceReason: 'This audience matches furniture because they evaluate style, size, material, durability, and delivery convenience.',
        improvementSuggestions: [
            'Add dimensions, material, color, and assembly details.',
            'Show room-style photos for scale.',
            'Mention delivery area and support clearly.'
        ]
    },
    {
        type: 'sports/fitness',
        keywords: ['sports', 'fitness', 'gym', 'workout', 'exercise', 'yoga', 'running', 'football', 'cricket', 'dumbbell'],
        targetedCustomer: 'Fitness-focused shoppers, sports players, gym-goers, and people building healthier routines.',
        targetedAgeRange: '16-45',
        interests: ['Fitness', 'Sports', 'Gym', 'Workout Gear', 'Running', 'Healthy Lifestyle', 'Online Shopping'],
        adAngle: 'Performance and active lifestyle',
        audienceReason: 'This audience matches sports and fitness products because they respond to performance, durability, goals, and routine building.',
        improvementSuggestions: [
            'Show product use, size, and material details.',
            'Highlight durability and intended activity.',
            'Use action photos or simple demonstration visuals.'
        ]
    },
    {
        type: 'grocery/food',
        keywords: ['grocery', 'food', 'snack', 'rice', 'oil', 'spice', 'tea', 'coffee', 'organic', 'fruit', 'vegetable'],
        targetedCustomer: 'Household shoppers, grocery buyers, and people looking for convenient food and daily essentials.',
        targetedAgeRange: '22-55',
        interests: ['Grocery Shopping', 'Food Products', 'Daily Essentials', 'Home Shopping', 'Online Shopping'],
        adAngle: 'Daily essentials with easy ordering',
        audienceReason: 'This audience matches grocery products because they buy based on freshness, trust, price, and convenience.',
        improvementSuggestions: [
            'Mention quantity, expiry, origin, and storage information.',
            'Use clean product and package photos.',
            'Highlight fast delivery and reliable sourcing.'
        ]
    },
    {
        type: 'books/stationery',
        keywords: ['book', 'books', 'stationery', 'notebook', 'pen', 'pencil', 'school', 'study', 'office supplies'],
        targetedCustomer: 'Students, parents, teachers, office users, and readers looking for books or stationery products.',
        targetedAgeRange: '12-45',
        interests: ['Books', 'Stationery', 'Education', 'Study Supplies', 'Office Supplies', 'Online Shopping'],
        adAngle: 'Study and productivity essentials',
        audienceReason: 'This audience matches books and stationery because they buy around study, work, organization, and learning needs.',
        improvementSuggestions: [
            'Mention size, pages, edition, or included items clearly.',
            'Show readable product photos.',
            'Bundle related items if possible.'
        ]
    },
    {
        type: 'jewelry/accessories',
        keywords: ['jewelry', 'jewellery', 'necklace', 'ring', 'bracelet', 'earring', 'watch', 'wallet', 'bag', 'accessory', 'accessories'],
        targetedCustomer: 'Accessory shoppers, gift buyers, style-conscious customers, and people looking for small premium everyday items.',
        targetedAgeRange: '18-50',
        interests: ['Accessories', 'Jewelry', 'Gift Items', 'Lifestyle Fashion', 'Online Shopping'],
        adAngle: 'Giftable style and everyday premium feel',
        audienceReason: 'This audience matches accessories because they care about style, giftability, quality, and easy purchase decisions.',
        improvementSuggestions: [
            'Show close-up photos and scale clearly.',
            'Mention material, size, and packaging details.',
            'Highlight gift suitability and delivery options.'
        ]
    },
    {
        type: 'general/unknown',
        keywords: [],
        targetedCustomer: 'Online shoppers in Bangladesh who are interested in trusted products, clear pricing, easy ordering, and Cash on Delivery.',
        targetedAgeRange: '18-45',
        interests: ['Online Shopping', 'Cash on Delivery', 'E-commerce', 'Discount Offers', 'New Arrivals'],
        adAngle: 'Trust, value, and easy ordering',
        audienceReason: 'The product category is not specific enough, so the recommendation stays conservative and focuses on general e-commerce intent.',
        improvementSuggestions: [
            'Add a clearer category, tags, and short product benefits.',
            'Use real product photos and mention delivery details.',
            'Test with a small budget before scaling.'
        ]
    }
];

const IRRELEVANT_INTERESTS_BY_TYPE = {
    'smartphone/mobile phone': ['men fashion', 'women fashion', 'casual wear', 'eid shopping', 'lifestyle products', 'lifestyle fashion', 'footwear', 'sneakers', 'skincare', 'beauty products'],
    'electronics/gadgets': ['men fashion', 'women fashion', 'casual wear', 'eid shopping', 'lifestyle products', 'lifestyle fashion', 'skincare', 'beauty products'],
    'laptop/computer': ['men fashion', 'women fashion', 'casual wear', 'eid shopping', 'lifestyle products', 'lifestyle fashion', 'skincare', 'beauty products'],
    'headphones/audio': ['men fashion', 'women fashion', 'casual wear', 'eid shopping', 'lifestyle products', 'lifestyle fashion', 'skincare', 'beauty products'],
    'fashion/clothing': ['android phones', 'smartphones', '5g phones', 'mobile gaming', 'mobile photography', 'wireless audio', 'bluetooth headphones'],
    'shoes/footwear': ['android phones', 'smartphones', '5g phones', 'mobile gaming', 'mobile photography', 'wireless audio', 'bluetooth headphones'],
    'beauty/skincare': ['android phones', 'smartphones', '5g phones', 'mobile gaming', 'mobile photography', 'men fashion', 'casual wear', 'footwear'],
    'baby/kids': ['android phones', 'smartphones', '5g phones', 'mobile gaming', 'mobile photography', 'men fashion', 'casual wear']
};

const safeString = (value, max = 500) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);

const stripHtml = (value, max = 700) => safeString(String(value || '').replace(/<[^>]*>/g, ' '), max);

const normalizeWord = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const titleCase = (value) => safeString(value, 80)
    .split(/\s+/)
    .map(part => {
        if (/^(5g|4g|cod|ram|ssd|usb|pc)$/i.test(part)) return part.toUpperCase();
        if (/^iphone$/i.test(part)) return 'iPhone';
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');

const uniqueCaseInsensitive = (items, limit = 10) => {
    const seen = new Set();
    const result = [];

    for (const item of items || []) {
        const clean = safeString(item, 80);
        if (!clean) continue;
        const key = clean.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(clean);
        if (result.length >= limit) break;
    }

    return result;
};

const truncate = (value, max, fallback = '') => {
    const clean = safeString(value || fallback, max + 20);
    if (clean.length <= max) return clean;
    return `${clean.slice(0, max - 1).trim()}…`;
};

const compactKeyValues = (items) => (Array.isArray(items) ? items : [])
    .map(item => `${safeString(item?.title || item?.name, 80)}: ${safeString(item?.value, 160)}`.replace(/^:\s*/, ''))
    .filter(Boolean)
    .slice(0, 12);

const getProductSearchText = (product = {}) => {
    const optionValues = (Array.isArray(product.options) ? product.options : [])
        .flatMap(option => [
            option.name,
            ...(Array.isArray(option.values) ? option.values.map(value => value?.label || value?.value || value) : [])
        ]);
    const variantAttributes = (Array.isArray(product.variants) ? product.variants : [])
        .slice(0, 8)
        .flatMap(variant => Array.isArray(variant.attributes)
            ? variant.attributes.map(attribute => `${attribute.name} ${attribute.value}`)
            : []);

    return normalizeWord([
        product.title,
        product.category,
        product.brand,
        ...(Array.isArray(product.tags) ? product.tags : []),
        stripHtml(product.description, 1000),
        ...compactKeyValues(product.features),
        ...compactKeyValues(product.specifications),
        ...optionValues,
        ...variantAttributes
    ].filter(Boolean).join(' '));
};

const detectProductCategory = (product = {}) => {
    const haystack = getProductSearchText(product);
    let best = CATEGORY_DEFINITIONS[CATEGORY_DEFINITIONS.length - 1];
    let bestScore = 0;

    for (const definition of CATEGORY_DEFINITIONS) {
        if (definition.type === 'general/unknown') continue;

        let score = 0;
        for (const keyword of definition.keywords) {
            const cleanKeyword = normalizeWord(keyword);
            if (!cleanKeyword) continue;
            if (haystack.includes(cleanKeyword)) {
                score += cleanKeyword.includes(' ') ? 4 : 2;
            }
        }

        const category = normalizeWord(product.category);
        if (category && definition.keywords.some(keyword => category.includes(normalizeWord(keyword)))) {
            score += 4;
        }

        const title = normalizeWord(product.title);
        if (title && definition.keywords.some(keyword => title.includes(normalizeWord(keyword)))) {
            score += 3;
        }

        if (score > bestScore) {
            bestScore = score;
            best = definition;
        }
    }

    return best;
};

const getPriceContext = (product = {}) => {
    const pricing = product.pricing || {};
    const variantCompareAt = (Array.isArray(product.variants) ? product.variants : [])
        .map(variant => variant?.pricing?.compareAtPrice)
        .find(value => Number(value) > 0);
    const sellingPrice = pricing.sellingPrice ?? pricing.price ?? pricing.salePrice ?? null;
    const compareAtPrice = pricing.compareAtPrice ?? pricing.compareAt ?? variantCompareAt ?? null;

    return {
        price: Number(sellingPrice) > 0 ? Number(sellingPrice) : null,
        compareAtPrice: Number(compareAtPrice) > 0 ? Number(compareAtPrice) : null,
        discount: Number(pricing.discount) > 0 ? Number(pricing.discount) : null
    };
};

const sanitizeProductContext = (product = {}) => ({
    title: safeString(product.title, 140),
    category: safeString(product.category, 120),
    detectedCategory: detectProductCategory(product).type,
    brand: safeString(product.brand, 80),
    description: stripHtml(product.description, 700),
    tags: uniqueCaseInsensitive(product.tags, 12).map(tag => safeString(tag, 60)),
    attributes: [
        ...compactKeyValues(product.features),
        ...compactKeyValues(product.specifications),
        ...(Array.isArray(product.options) ? product.options : []).map(option => {
            const values = (Array.isArray(option.values) ? option.values : [])
                .map(value => value?.label || value?.value || value)
                .filter(Boolean)
                .join(', ');
            return `${safeString(option.name, 60)}: ${safeString(values, 180)}`;
        })
    ].filter(Boolean).slice(0, 16),
    ...getPriceContext(product)
});

const sanitizeMetricsContext = (metrics = {}) => ({
    label: metrics.label || metrics.recommendation?.label || 'not_enough_data',
    views: Number(metrics.views || 0),
    addToCarts: Number(metrics.addToCarts || 0),
    checkouts: Number(metrics.checkouts || 0),
    orders: Number(metrics.orders || 0),
    deliveredOrders: Number(metrics.deliveredOrders || 0),
    revenue: Number(metrics.revenue || 0),
    deliveredRevenue: Number(metrics.deliveredRevenue || 0),
    addToCartRate: Number(metrics.addToCartRate || 0),
    conversionRate: Number(metrics.conversionRate || 0),
    cartToOrderRate: Number(metrics.cartToOrderRate || 0)
});

const sanitizeShopContext = (shop = {}) => ({
    shopName: safeString(shop.shopName || shop.name, 100),
    subdomain: safeString(shop.subdomain, 80),
    businessType: safeString(shop.businessType, 100)
});

const normalizeLocations = (locations = []) => {
    const unique = uniqueCaseInsensitive(locations, 5);
    return unique.length ? unique : DEFAULT_LOCATIONS;
};

const getMetricStrategy = (label) => {
    const normalizedLabel = label === 'needs_data' ? 'not_enough_data' : label;
    const strategies = {
        winner: {
            adAngleSuffix: 'with proven customer interest',
            reasonSuffix: 'The product already shows engagement or orders, so it is safer to test with a focused buyer audience.',
            suggestions: ['Keep stock ready before increasing ad spend.', 'Use best-seller or popular product wording.', 'Send traffic directly to the product page.']
        },
        hidden_gem: {
            adAngleSuffix: 'that needs more reach',
            reasonSuffix: 'The product has limited traffic but promising buying intent when people see it.',
            suggestions: ['Run a small test campaign first.', 'Feature the product on the homepage.', 'Use clear product benefits in the first line.']
        },
        fix_before_ads: {
            adAngleSuffix: 'after improving product presentation',
            reasonSuffix: 'People view this product but do not add it to cart enough, so product-page clarity may be weak.',
            suggestions: ['Improve the first product image.', 'Make price, delivery, and return details clearer.', 'Add stronger benefit bullets.']
        },
        checkout_problem: {
            adAngleSuffix: 'after reducing checkout friction',
            reasonSuffix: 'Customers add this product to cart but do not finish orders, so checkout, delivery, or trust friction may exist.',
            suggestions: ['Review delivery charge and checkout fields.', 'Show COD, return, and support information clearly.', 'Check stock, coupon, and payment issues.']
        },
        low_interest: {
            adAngleSuffix: 'with a sharper offer',
            reasonSuffix: 'The product has not shown enough interest yet, so start with a small test and stronger creative.',
            suggestions: ['Improve title and thumbnail.', 'Test a discount or bundle angle.', 'Compare demand with similar products.']
        },
        not_enough_data: {
            adAngleSuffix: 'while collecting more signal',
            reasonSuffix: 'There is not enough activity yet to confidently judge this product, so the recommendation stays conservative.',
            suggestions: ['Share organically before paid ads.', 'Add it to featured products.', 'Wait for more views, carts, and orders.']
        }
    };

    return strategies[normalizedLabel] || strategies.not_enough_data;
};

const buildFallbackAdInsight = ({ product = {}, metrics = {}, cityHistory = [], language = 'en', campaignType = 'general' } = {}) => {
    const productContext = sanitizeProductContext(product);
    const detected = detectProductCategory(product);
    const metricContext = sanitizeMetricsContext(metrics);
    const metricStrategy = getMetricStrategy(metricContext.label);
    const locations = normalizeLocations(cityHistory);
    const priceText = productContext.price ? ` from BDT ${productContext.price}` : '';
    const campaign = safeString(campaignType, 60).replace(/_/g, ' ') || 'sales';
    const locationReason = cityHistory?.length
        ? `Top buyer locations are based on recent aggregate order city history: ${locations.join(', ')}.`
        : 'Location focus is broad because there is not enough aggregate buyer city history yet.';

    const englishCopy = {
        primaryText: `Upgrade your shopping choice with ${productContext.title || 'this product'}${priceText}. Order online with easy delivery and Cash on Delivery support in Bangladesh.`,
        headline: productContext.title || 'Shop This Product',
        description: `A strong fit for a ${campaign} campaign.`,
        callToAction: 'Shop Now'
    };

    const localizedCopy = {
        bn: {
            primaryText: `${productContext.title || 'Ei product'} ekhoni order korun${priceText ? `, price BDT ${productContext.price}` : ''}. Bangladesh jure easy delivery and Cash on Delivery available.`,
            headline: productContext.title || 'Order Now',
            description: 'Trusted product, easy ordering.',
            callToAction: 'Order Now'
        },
        banglish: {
            primaryText: `${productContext.title || 'Ei product'} niye nin ajkei. Easy delivery, Cash on Delivery support, stock limited.`,
            headline: `${productContext.title || 'Product'} - Order Now`,
            description: 'Fast delivery and easy ordering.',
            callToAction: 'Shop Now'
        }
    };

    return cleanAdInsightResponse({
        ...(localizedCopy[language] || englishCopy),
        targetedCustomer: detected.targetedCustomer,
        targetedAgeRange: detected.targetedAgeRange,
        suggestedInterests: detected.interests,
        suggestedLocationFocus: locations,
        adAngle: `${detected.adAngle} ${metricStrategy.adAngleSuffix}`.trim(),
        audienceReason: `${detected.audienceReason} ${metricStrategy.reasonSuffix} ${locationReason}`,
        improvementSuggestions: uniqueCaseInsensitive([
            ...detected.improvementSuggestions,
            ...metricStrategy.suggestions
        ], 5)
    }, { product, metrics, cityHistory });
};

const allowedCta = (value) => {
    const clean = titleCase(value);
    if (PRACTICAL_CTAS.has(clean)) return clean;
    const normalized = normalizeWord(value);
    if (normalized.includes('order')) return 'Order Now';
    if (normalized.includes('learn')) return 'Learn More';
    if (normalized.includes('message')) return 'Send Message';
    return 'Shop Now';
};

const removeIrrelevantInterests = (items, detectedType) => {
    const blocked = new Set((IRRELEVANT_INTERESTS_BY_TYPE[detectedType] || []).map(normalizeWord));
    return (items || []).filter(item => !blocked.has(normalizeWord(item)));
};

function cleanAdInsightResponse(raw = {}, { product = {}, metrics = {}, cityHistory = [] } = {}) {
    const detected = detectProductCategory(product);
    const fallback = detected;
    const metricStrategy = getMetricStrategy(metrics?.label || metrics?.recommendation?.label || 'not_enough_data');
    const locationSource = Array.isArray(raw.suggestedLocationFocus) ? raw.suggestedLocationFocus : cityHistory;
    const cleanedInterests = uniqueCaseInsensitive(
        removeIrrelevantInterests([
            ...(Array.isArray(raw.suggestedInterests) ? raw.suggestedInterests : []),
            ...fallback.interests
        ], detected.type).map(titleCase),
        12
    ).slice(0, 12);

    const locations = normalizeLocations(locationSource).slice(0, 5);
    const suggestions = uniqueCaseInsensitive(
        [
            ...(Array.isArray(raw.improvementSuggestions) ? raw.improvementSuggestions : []),
            ...fallback.improvementSuggestions,
            ...metricStrategy.suggestions
        ].map(item => truncate(item, 160)),
        5
    );

    return {
        primaryText: truncate(raw.primaryText, 260, buildFallbackAdInsightWithoutClean({ product }).primaryText),
        headline: truncate(raw.headline, 70, safeString(product.title, 70) || 'Shop Now'),
        description: truncate(raw.description, 110, 'Order online with easy delivery and trusted checkout.'),
        callToAction: allowedCta(raw.callToAction),
        targetedCustomer: truncate(raw.targetedCustomer, 260, fallback.targetedCustomer),
        targetedAgeRange: truncate(raw.targetedAgeRange, 20, fallback.targetedAgeRange),
        suggestedInterests: cleanedInterests.length ? cleanedInterests : fallback.interests.slice(0, 10),
        suggestedLocationFocus: locations,
        adAngle: truncate(raw.adAngle, 120, fallback.adAngle),
        audienceReason: truncate(raw.audienceReason, 360, fallback.audienceReason),
        improvementSuggestions: suggestions.length ? suggestions : fallback.improvementSuggestions.slice(0, 3)
    };
}

const buildFallbackAdInsightWithoutClean = ({ product = {} } = {}) => {
    const productContext = sanitizeProductContext(product);
    return {
        primaryText: `Discover ${productContext.title || 'this product'} today. Order online with easy delivery and Cash on Delivery support in Bangladesh.`
    };
};

const parseGeminiJson = (text) => {
    const clean = String(text || '')
        .replace(/^```(?:json)?/i, '')
        .replace(/```$/i, '')
        .trim();

    try {
        return JSON.parse(clean);
    } catch (_) {
        const firstBrace = clean.indexOf('{');
        const lastBrace = clean.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            return JSON.parse(clean.slice(firstBrace, lastBrace + 1));
        }
        throw new Error('Gemini returned invalid JSON');
    }
};

const buildGeminiPrompt = ({ productContext, shopContext, detectedCategory, metrics, cityHistory, searchTerms, language, campaignType }) => {
    const safePayload = {
        shop: shopContext,
        product: {
            title: productContext.title,
            category: productContext.category,
            detectedCategory,
            brand: productContext.brand,
            description: productContext.description,
            price: productContext.price,
            compareAtPrice: productContext.compareAtPrice,
            discount: productContext.discount,
            tags: productContext.tags,
            attributes: productContext.attributes
        },
        campaignType: safeString(campaignType, 80),
        language: safeString(language, 40),
        growthCenterLabel: metrics.label,
        performanceSummary: metrics,
        relevantSearchTerms: uniqueCaseInsensitive(searchTerms, 10),
        aggregatedCityHistory: uniqueCaseInsensitive(cityHistory, 5)
    };

    return [
        'You are generating Facebook/Instagram-style ad planning suggestions for a Bangladeshi e-commerce vendor. You are not publishing ads. You are not using private social media data. Use only the product and store data provided. Return only valid JSON. Do not include markdown.',
        '',
        'Privacy rules: do not infer or request customer names, phone numbers, emails, addresses, order IDs, NID/private documents, or private social media data. Use aggregate city names and aggregate search terms only.',
        '',
        'Category relevance rules: product-specific targeting is mandatory. Do not use fashion-related interests for electronics unless the product actually belongs to fashion/lifestyle. Do not use generic Men Fashion, Casual Wear, Eid Shopping, or Lifestyle Products as defaults for electronics.',
        '',
        'Return this exact JSON shape with concise strings and useful arrays:',
        '{"primaryText":"string","headline":"string","description":"string","callToAction":"string","targetedCustomer":"string","targetedAgeRange":"string","suggestedInterests":["string"],"suggestedLocationFocus":["string"],"adAngle":"string","audienceReason":"string","improvementSuggestions":["string"]}',
        '',
        `Safe context:\n${JSON.stringify(safePayload, null, 2)}`
    ].join('\n');
};

const callGemini = async (prompt) => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('Gemini API key is not configured');
    }

    const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
    const modelName = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
            temperature: 0.35,
            topP: 0.9,
            maxOutputTokens: 900,
            responseMimeType: 'application/json'
        }
    });

    const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Gemini request timed out')), timeoutMs);
    });

    const result = await Promise.race([model.generateContent(prompt), timeout]);
    return result.response.text();
};

const generateAdInsight = async ({
    product,
    shop,
    metrics,
    cityHistory = [],
    searchTerms = [],
    language = 'en',
    campaignType = 'general'
}) => {
    const productContext = sanitizeProductContext(product);
    const shopContext = sanitizeShopContext(shop);
    const detected = detectProductCategory(product);
    const metricsContext = sanitizeMetricsContext(metrics);

    try {
        const prompt = buildGeminiPrompt({
            productContext,
            shopContext,
            detectedCategory: detected.type,
            metrics: metricsContext,
            cityHistory,
            searchTerms,
            language,
            campaignType
        });
        const text = await callGemini(prompt);
        const parsed = parseGeminiJson(text);
        return cleanAdInsightResponse(parsed, { product, metrics: metricsContext, cityHistory });
    } catch (err) {
        console.warn('[GrowthAdAI] Using fallback ad insight:', err.message);
        return buildFallbackAdInsight({ product, metrics: metricsContext, cityHistory, language, campaignType });
    }
};

module.exports = {
    generateAdInsight,
    detectProductCategory,
    buildFallbackAdInsight,
    cleanAdInsightResponse,
    __test: {
        sanitizeProductContext,
        sanitizeShopContext,
        sanitizeMetricsContext,
        removeIrrelevantInterests,
        parseGeminiJson,
        buildGeminiPrompt
    }
};
