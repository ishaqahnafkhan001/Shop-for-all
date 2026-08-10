'use strict';

const homepageSeo = require('./homepage-seo.cjs');

const THEME_SCHEMA_VERSION = 4;

const structuralVariant = (defaultValue, values) => Object.freeze({
    default: defaultValue,
    values: Object.freeze(values),
});

const STRUCTURAL_VARIANTS = Object.freeze({
    header: structuralVariant('standard', ['standard', 'minimal', 'centered']),
    hero: structuralVariant('fullBleed', ['fullBleed', 'split', 'centered', 'editorial', 'minimal']),
    sections: Object.freeze({
        Banner: structuralVariant('overlay', ['overlay', 'split', 'minimal']),
        CategoryList: structuralVariant('cards', ['cards', 'imageGrid', 'circles', 'editorial']),
        BrandStory: structuralVariant('standard', ['standard', 'imageLeft', 'imageRight', 'fullWidth', 'editorial']),
        Collection: structuralVariant('grid', ['grid', 'spacious', 'mosaic']),
        CollectionShowcase: structuralVariant('grid', ['grid', 'spacious', 'mosaic']),
        Reviews: structuralVariant('cards', ['cards', 'quote', 'minimal']),
        Newsletter: structuralVariant('boxed', ['boxed', 'fullWidth', 'minimal']),
        PromoBlock: structuralVariant('boxed', ['boxed', 'strip', 'split']),
    }),
});

const normalizeStructuralVariant = (value, contract) => (
    contract?.values?.includes(value) ? value : contract?.default
);

const sectionDefinition = ({
    label,
    category,
    defaultSettings = {},
    renderer = 'generic',
    editorEnabled = true,
    productSource = false,
    supportsMedia = false,
    supportsFocalPoint = false,
    previewOnlyAction = false,
    migrationAliases = []
}) => Object.freeze({
    label,
    category,
    defaultSettings: Object.freeze(defaultSettings),
    renderer,
    editorEnabled,
    capability: 'advancedSections',
    supportsResponsiveVisibility: true,
    productSource,
    supportsMedia,
    supportsFocalPoint,
    previewOnlyAction,
    migrationAliases: Object.freeze(migrationAliases)
});

const SECTION_REGISTRY = Object.freeze({
    FeaturedProducts: sectionDefinition({
        label: 'Featured products', category: 'commerce', renderer: 'products', productSource: true,
        defaultSettings: { productIds: [], source: { type: 'manual', productIds: [] } }
    }),
    Collection: sectionDefinition({
        label: 'Collection', category: 'commerce', renderer: 'generic', productSource: true, editorEnabled: false,
        defaultSettings: { variant: 'grid', productIds: [], source: { type: 'manual', productIds: [] } }
    }),
    CategoryList: sectionDefinition({
        label: 'Category list', category: 'commerce', renderer: 'categories', defaultSettings: { variant: 'cards', maxCategories: 10, columns: 4 }
    }),
    Banner: sectionDefinition({
        label: 'Image banner', category: 'content', renderer: 'banner', supportsMedia: true, supportsFocalPoint: true,
        migrationAliases: ['BannerGrid'],
        defaultSettings: { variant: 'overlay', desktopImage: '', mobileImage: '', desktopImages: [], mobileImages: [], title: '', subtitle: '', buttonText: '', buttonLink: '/' }
    }),
    TextBlock: sectionDefinition({ label: 'Text block', category: 'content', renderer: 'generic', defaultSettings: { text: '' } }),
    Newsletter: sectionDefinition({ label: 'Newsletter', category: 'content', renderer: 'generic', previewOnlyAction: true, defaultSettings: { variant: 'boxed', text: '' } }),
    Reviews: sectionDefinition({ label: 'Reviews', category: 'content', renderer: 'reviews', defaultSettings: { variant: 'cards', mode: 'text', reviewIds: [], text: '' } }),
    FAQ: sectionDefinition({ label: 'FAQ', category: 'content', renderer: 'faq', defaultSettings: { text: '' } }),
    TrustBadges: sectionDefinition({ label: 'Trust badges', category: 'content', renderer: 'trustBadges', defaultSettings: { text: '' } }),
    BrandStory: sectionDefinition({
        label: 'Brand story', category: 'content', renderer: 'brandStory', supportsMedia: true, supportsFocalPoint: true, defaultSettings: { variant: 'standard', text: '', imageUrl: '' }
    }),
    PromoBlock: sectionDefinition({ label: 'Promotion block', category: 'content', renderer: 'generic', defaultSettings: { variant: 'boxed', text: '' } }),
    BrandShowcase: sectionDefinition({
        label: 'Brand showcase', category: 'content', renderer: 'generic', supportsMedia: true, editorEnabled: false, defaultSettings: { text: '', imageUrl: '' }
    }),
    CollectionShowcase: sectionDefinition({
        label: 'Collection showcase', category: 'commerce', renderer: 'generic', productSource: true, editorEnabled: false,
        defaultSettings: { variant: 'grid', productIds: [], source: { type: 'manual', productIds: [] } }
    }),
});

const SECTION_TYPES = Object.freeze(Object.keys(SECTION_REGISTRY));
const ALLOWED_THEME_KEYS = Object.freeze([
    'version',
    'preset',
    'logoUrl',
    'faviconUrl',
    'fontFamily',
    'productGridStyle',
    'colors',
    'header',
    'typography',
    'hero',
    'layout',
    'productCard',
    'checkoutBranding',
    'mobile',
    'paymentSettings',
    'seo',
    'homepageSections',
    'allProducts',
    'migrations',
    'navigation',
    'footer',
    'policies',
]);

const DEFAULT_COLORS = {
    accent: '#0f766e',
    accentHover: '#115e59',
    accentSoft: '#99f6e4',
    accentBg: '#ecfdf5',
    accentStrong: '#042f2e',
    accentMuted: '#14b8a6',
    accentLight: '#5eead4',
    accentRing: '#ccfbf1',
    background: '#ffffff',
    foreground: '#111827',
    headerBackground: '#ffffff',
    primaryButtonBg: '#0f766e',
    primaryButtonText: '#ffffff',
    primaryButtonHoverBg: '#115e59',
    secondaryButtonBg: '#ffffff',
    secondaryButtonText: '#0f172a',
    secondaryButtonHoverBg: '#f8fafc',
    navbarBackground: '#ffffff',
    navbarText: '#0f172a',
    navbarHover: '#0f766e',
    cardBackground: '#ffffff',
    cardBorder: '#e2e8f0',
    cardHoverBorder: '#99f6e4',
    priceColor: '#0f172a',
    saleBadgeBg: '#dc2626',
    saleBadgeText: '#ffffff',
    ratingColor: '#f59e0b',
    footerBackground: '#ffffff',
    footerText: '#64748b',
    footerLink: '#0f172a',
    brand: {
        primary: '#0f766e', secondary: '#0f172a', accent: '#0f766e', hover: '#115e59', soft: '#ecfdf5', ring: '#ccfbf1',
    },
    header: {
        background: '#ffffff', text: '#0f172a', mutedText: '#64748b', icon: '#0f172a', border: '#e2e8f0', hover: '#0f766e', cartBadgeBackground: '#0f766e', cartBadgeText: '#ffffff',
    },
    hero: {
        background: '#020617', title: '#ffffff', subtitle: '#e2e8f0', overlay: '#020617', primaryButtonBackground: '#ffffff', primaryButtonText: '#0f172a', secondaryButtonBackground: '#ffffff', secondaryButtonText: '#0f172a',
    },
    productCard: {
        background: '#ffffff', border: '#e2e8f0', shadow: '#e2e8f0', title: '#0f172a', category: '#64748b', price: '#0f172a', compareAtPrice: '#94a3b8', saleBadgeBackground: '#dc2626', saleBadgeText: '#ffffff', ratingStar: '#f59e0b', ratingText: '#94a3b8', wishlistIcon: '#64748b', wishlistActive: '#e11d48', addToCartBackground: '#0f766e', addToCartText: '#ffffff', buyNowBackground: '#0f172a', buyNowText: '#ffffff', outOfStockBackground: '#fff1f2', outOfStockText: '#e11d48', stockBackground: '#ecfdf5', stockText: '#047857', variantChipBackground: '#f8fafc', variantChipText: '#475569', variantChipSelectedBackground: '#0f766e', variantChipSelectedText: '#ffffff',
    },
    allProducts: {
        background: '#f8fafc', title: '#0f172a', subtitle: '#64748b', filterBackground: '#ffffff', filterText: '#475569', dropdownBackground: '#ffffff', paginationBackground: '#ffffff', paginationText: '#475569', paginationActiveBackground: '#0f766e', paginationActiveText: '#ffffff',
    },
    sections: {
        background: '#ffffff', title: '#0f172a', subtitle: '#64748b', bannerOverlay: '#020617', bannerText: '#ffffff', faqBackground: '#f8fafc', faqText: '#475569', testimonialBackground: '#f8fafc', testimonialText: '#475569', trustIcon: '#0f766e', trustText: '#475569',
    },
    footer: {
        background: '#ffffff', heading: '#0f172a', text: '#64748b', link: '#0f172a', linkHover: '#0f766e', border: '#e2e8f0', poweredBy: '#64748b',
    },
    checkout: {
        background: '#f8fafc', cardBackground: '#ffffff', text: '#0f172a', buttonBackground: '#0f172a', buttonText: '#ffffff', accent: '#0f766e', inputBackground: '#ffffff', inputBorder: '#cbd5e1', inputFocus: '#0f766e', error: '#dc2626', success: '#047857',
    },
};

const FALLBACK_THEME = Object.freeze({
    version: THEME_SCHEMA_VERSION,
    preset: null,
    logoUrl: '',
    faviconUrl: '',
    fontFamily: 'Inter',
    productGridStyle: 'Comfortable',
    colors: DEFAULT_COLORS,
    header: { variant: 'standard', logoPosition: 'Left', menuStyle: 'Simple' },
    typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: 16, headingWeight: '800' },
    hero: {
        variant: 'fullBleed', title: '', subtitle: '', imageUrl: '', ctaLabel: 'Shop Now', ctaUrl: '/', overlayOpacity: 25, height: 'Medium', bannerSlides: [],
    },
    layout: {
        maxWidth: 'Wide', containerWidth: 'Wide', sectionSpacing: 'Comfortable', contentSpacing: 'Comfortable', sectionWidth: 'Full Width', sectionPaddingTop: 40, sectionPaddingBottom: 40, sectionMarginTop: 0, sectionMarginBottom: 40, productColumnsDesktop: 3, productColumnsMobile: 2, productGap: 'Comfortable', cardAlignment: 'Left',
    },
    productCard: {
        style: 'Modern', imageFit: 'Contain', aspectRatio: 'Square', imageRadius: 'Rounded', hoverZoom: true, showCategory: true, showRating: true, showReviews: true, showStock: true, showSku: false, showDiscountBadge: true, showQuickBuy: true, showWishlist: true, borderRadius: 'Rounded', shadow: 'Soft', titleSize: 'Medium', titleWeight: '800', priceSize: 'Medium', priceColor: '#0f172a', buttonStyle: 'Solid', buttonShape: 'Rounded', buttonColor: '#0f766e',
    },
    checkoutBranding: { logoUrl: '', bannerText: '', buttonStyle: 'Rounded', trustMessage: 'Secure checkout' },
    mobile: { stickyCheckoutButton: true, compactHeader: true, showBottomNavigation: false },
    paymentSettings: {
        additionalMethodsEnabled: false,
        providers: { stripe: false, sslcommerz: false, bkash: false, nagad: false, rocket: false, paypal: false },
    },
    seo: {
        mode: 'auto',
        siteName: '',
        title: '',
        description: '',
        keywords: [],
        topics: [],
        socialTitle: '',
        socialDescription: '',
        socialImage: '',
        socialImageAssetId: null,
        socialImageAlt: '',
        socialImageWidth: null,
        socialImageHeight: null,
        socialImageMimeType: '',
        facebookUrl: '',
        searchEngineVisibility: true,
        googleSiteVerification: '',
        language: 'en-BD',
        spellingPreference: 'british',
        primaryCategory: '',
        aiSuggestion: {
            alternatives: [],
            generatedAt: null,
            generatedFromHash: '',
            inputSnapshot: null,
            acceptedOptionId: '',
            acceptedFields: [],
            acceptedAt: null,
        },
        autoUpdate: false,
    },
    homepageSections: [{
        id: 'featured-products', type: 'FeaturedProducts', title: 'Featured Products', sortOrder: 0, isEnabled: true,
        settings: { source: { type: 'manual', productIds: [] }, productIds: [] },
        desktopSettings: { isVisible: true },
        mobileSettings: { columns: 2, isVisible: true },
    }],
    allProducts: { title: 'All Products', subtitle: "Browse this shop's latest catalog", isEnabled: true, desktopColumns: 3, tabletColumns: 2, mobileColumns: 2, spacing: 'Comfortable' },
    migrations: { bannerSectionsV1: false },
    navigation: [
        { label: 'Shop', url: '/', sortOrder: 0, children: [], megaMenu: false },
        { label: 'Policies', url: '/policies', sortOrder: 1, children: [], megaMenu: false },
        { label: 'Track Order', url: '/track', sortOrder: 2, children: [], megaMenu: false },
    ],
    footer: { text: '', contactLabel: 'Contact store', contactEmail: '', facebookUrl: '', instagramUrl: '', twitterUrl: '', youtubeUrl: '', tiktokUrl: '', links: [] },
    policies: { refund: '', shipping: '', privacy: '', terms: '' },
});

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
const LEGACY_LOW_CONTRAST_FOOTER_TEXT = '#94a3b8';
const UNSAFE_URL_PATTERN = /^(?:javascript|vbscript|data):/i;
const URL_FIELD_PATTERN = /(?:url|href|link|image|images|logo|favicon)$/i;
const LEGACY_DEFAULT_COLORS = {
    accent: '#4f46e5', accentHover: '#4338ca', accentSoft: '#c7d2fe', accentBg: '#eef2ff', accentStrong: '#3730a3', accentMuted: '#818cf8', accentLight: '#a5b4fc', accentRing: '#e0e7ff',
};

const cloneTheme = (value) => JSON.parse(JSON.stringify(value || {}));
const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const mergeObject = (base, incoming) => ({ ...base, ...(isPlainObject(incoming) ? incoming : {}) });
const clamp = (value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(Math.max(number, min), max) : fallback;
};
const cleanText = (value = '', maxLength = 5000) => String(value || '')
    .replace(/\0/g, '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim()
    .slice(0, maxLength);

const isSafeThemeUrl = (value = '') => {
    const raw = String(value || '').trim();
    if (!raw) return true;
    const compact = raw.replace(/[\u0000-\u001F\u007F\s]+/g, '');
    if (UNSAFE_URL_PATTERN.test(compact) || raw.startsWith('//')) return false;
    return raw.startsWith('#') || raw.startsWith('/') || /^https?:\/\//i.test(raw) || /^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/i.test(raw) || /^tel:\+?[0-9().\-\s]{4,30}$/i.test(raw);
};

const sanitizeThemeUrl = (value = '') => {
    const raw = cleanText(value, 1000);
    return isSafeThemeUrl(raw) ? raw : '#';
};

const sanitizeThemeValue = (value, key = '', depth = 0) => {
    if (depth > 12) return undefined;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
    if (Array.isArray(value)) {
        return value.slice(0, 100).map(item => sanitizeThemeValue(item, key, depth + 1)).filter(item => item !== undefined);
    }
    if (isPlainObject(value)) {
        return Object.entries(value).slice(0, 200).reduce((acc, [childKey, childValue]) => {
            if (childKey.startsWith('$') || childKey.includes('.')) return acc;
            const sanitized = sanitizeThemeValue(childValue, childKey, depth + 1);
            if (sanitized !== undefined) acc[childKey] = sanitized;
            return acc;
        }, {});
    }
    if (typeof value === 'string') return URL_FIELD_PATTERN.test(key) ? sanitizeThemeUrl(value) : cleanText(value);
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'boolean' || value === null) return value;
    return undefined;
};

const sanitizeColorObject = (value = {}) => Object.entries(isPlainObject(value) ? value : {}).reduce((acc, [key, color]) => {
    if (isPlainObject(color)) {
        const nested = sanitizeColorObject(color);
        if (Object.keys(nested).length) acc[key] = nested;
    } else if (typeof color === 'string' && HEX_COLOR_REGEX.test(color.trim())) {
        acc[key] = color.trim();
    }
    return acc;
}, {});

const sanitizeThemePayload = (theme = {}) => {
    const picked = ALLOWED_THEME_KEYS.reduce((acc, key) => {
        if (theme?.[key] !== undefined) acc[key] = sanitizeThemeValue(theme[key], key);
        return acc;
    }, {});
    if (picked.colors) picked.colors = sanitizeColorObject(picked.colors);
    if (picked.preset) {
        const presetId = cleanText(picked.preset.id, 80)
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-')
            .replace(/^-+|-+$/g, '');
        const presetVersion = Number(picked.preset.version);
        const appliedAtValue = picked.preset.appliedAt ? cleanText(picked.preset.appliedAt, 40) : '';
        const appliedAtTimestamp = Date.parse(appliedAtValue);
        picked.preset = presetId && Number.isInteger(presetVersion) && presetVersion > 0
            ? {
                id: presetId,
                version: Math.min(presetVersion, 100000),
                appliedAt: Number.isFinite(appliedAtTimestamp) ? new Date(appliedAtTimestamp).toISOString() : null,
            }
            : null;
    }
    if (picked.seo) {
        picked.seo.mode = ['auto', 'manual'].includes(picked.seo.mode) ? picked.seo.mode : 'auto';
        picked.seo.siteName = cleanText(picked.seo.siteName, 80);
        picked.seo.title = cleanText(picked.seo.title, 70);
        picked.seo.description = cleanText(picked.seo.description, 170);
        const topics = Array.isArray(picked.seo.topics)
            ? picked.seo.topics
            : (Array.isArray(picked.seo.keywords) ? picked.seo.keywords : []);
        picked.seo.topics = [...new Set(topics.map(topic => cleanText(topic, 60)).filter(Boolean))].slice(0, 20);
        // Keep the legacy field synchronized for old admin/storefront clients.
        picked.seo.keywords = [...picked.seo.topics];
        picked.seo.socialTitle = cleanText(picked.seo.socialTitle, 70);
        picked.seo.socialDescription = cleanText(picked.seo.socialDescription, 170);
        picked.seo.socialImageAlt = cleanText(picked.seo.socialImageAlt, 160);
        picked.seo.socialImageWidth = Number(picked.seo.socialImageWidth) > 0 ? Number(picked.seo.socialImageWidth) : null;
        picked.seo.socialImageHeight = Number(picked.seo.socialImageHeight) > 0 ? Number(picked.seo.socialImageHeight) : null;
        picked.seo.socialImageMimeType = /^(?:image\/jpeg|image\/png|image\/webp|image\/gif)$/i.test(String(picked.seo.socialImageMimeType || ''))
            ? String(picked.seo.socialImageMimeType).toLowerCase()
            : '';
        picked.seo.language = /^(?:en|bn)(?:-BD)?$/i.test(String(picked.seo.language || '')) ? picked.seo.language : 'en-BD';
        picked.seo.spellingPreference = ['british', 'american'].includes(String(picked.seo.spellingPreference || '').toLowerCase())
            ? String(picked.seo.spellingPreference).toLowerCase()
            : 'british';
        picked.seo.primaryCategory = cleanText(picked.seo.primaryCategory, 80);
        const suggestion = isPlainObject(picked.seo.aiSuggestion) ? picked.seo.aiSuggestion : {};
        picked.seo.aiSuggestion = {
            alternatives: (Array.isArray(suggestion.alternatives) ? suggestion.alternatives : []).slice(0, 3).map((option, index) => ({
                id: cleanText(option?.id || `option-${index + 1}`, 40),
                title: cleanText(option?.title, 70),
                description: cleanText(option?.description, 170),
                explanation: cleanText(option?.explanation, 240),
                tone: cleanText(option?.tone, 40),
                topics: (Array.isArray(option?.topics) ? option.topics : []).map(topic => cleanText(topic, 60)).filter(Boolean).slice(0, 10),
                limitations: cleanText(option?.limitations, 180),
            })),
            generatedAt: suggestion.generatedAt ? cleanText(suggestion.generatedAt, 40) : null,
            generatedFromHash: cleanText(suggestion.generatedFromHash, 100),
            inputSnapshot: isPlainObject(suggestion.inputSnapshot) ? sanitizeThemeValue(suggestion.inputSnapshot, 'inputSnapshot') : null,
            acceptedOptionId: cleanText(suggestion.acceptedOptionId, 40),
            acceptedFields: (Array.isArray(suggestion.acceptedFields) ? suggestion.acceptedFields : []).filter(field => ['title', 'description'].includes(field)),
            acceptedAt: suggestion.acceptedAt ? cleanText(suggestion.acceptedAt, 40) : null,
        };
        picked.seo.autoUpdate = false;
        picked.seo.googleSiteVerification = cleanText(picked.seo.googleSiteVerification, 500)
            .replace(/^.*?content\s*=\s*["']([^"']+)["'].*$/i, '$1')
            .replace(/[<>"'`\s]/g, '')
            .slice(0, 200);
    }
    return picked;
};

const mergeColorGroup = (base = {}, incoming = {}) => Object.keys(base).reduce((acc, key) => {
    acc[key] = HEX_COLOR_REGEX.test(String(incoming?.[key] || '')) ? incoming[key] : base[key];
    return acc;
}, {});

const normalizeHexColor = (value = '') => {
    const color = String(value || '').trim().toLowerCase();
    if (!HEX_COLOR_REGEX.test(color)) return '';
    if (color.length === 4) return `#${color.slice(1).split('').map(channel => `${channel}${channel}`).join('')}`;
    return color;
};

const hexToRgb = (value = '') => {
    const color = normalizeHexColor(value);
    if (!color) return null;
    return {
        r: Number.parseInt(color.slice(1, 3), 16),
        g: Number.parseInt(color.slice(3, 5), 16),
        b: Number.parseInt(color.slice(5, 7), 16),
    };
};

const rgbToHex = ({ r, g, b }) => `#${[r, g, b]
    .map(channel => Math.min(255, Math.max(0, Math.round(channel))).toString(16).padStart(2, '0'))
    .join('')}`;

const relativeLuminance = (value = '') => {
    const rgb = hexToRgb(value);
    if (!rgb) return null;
    const linear = (channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
    };
    return (0.2126 * linear(rgb.r)) + (0.7152 * linear(rgb.g)) + (0.0722 * linear(rgb.b));
};

const contrastRatio = (foreground = '', background = '') => {
    const foregroundLuminance = relativeLuminance(foreground);
    const backgroundLuminance = relativeLuminance(background);
    if (foregroundLuminance === null || backgroundLuminance === null) return null;
    const lighter = Math.max(foregroundLuminance, backgroundLuminance);
    const darker = Math.min(foregroundLuminance, backgroundLuminance);
    return (lighter + 0.05) / (darker + 0.05);
};

const mixHexColors = (from = '', to = '', amount = 0) => {
    const fromRgb = hexToRgb(from);
    const toRgb = hexToRgb(to);
    if (!fromRgb || !toRgb) return '';
    const weight = Math.min(1, Math.max(0, Number(amount) || 0));
    return rgbToHex({
        r: fromRgb.r + ((toRgb.r - fromRgb.r) * weight),
        g: fromRgb.g + ((toRgb.g - fromRgb.g) * weight),
        b: fromRgb.b + ((toRgb.b - fromRgb.b) * weight),
    });
};

const suggestAccessibleForeground = (foreground = '', background = '', minimumRatio = 4.5) => {
    const normalizedForeground = normalizeHexColor(foreground);
    const normalizedBackground = normalizeHexColor(background);
    if (!normalizedForeground || !normalizedBackground) return '';
    if ((contrastRatio(normalizedForeground, normalizedBackground) || 0) >= minimumRatio) return normalizedForeground;

    const blackRatio = contrastRatio('#000000', normalizedBackground) || 0;
    const whiteRatio = contrastRatio('#ffffff', normalizedBackground) || 0;
    const target = blackRatio >= whiteRatio ? '#000000' : '#ffffff';
    for (let step = 1; step <= 20; step += 1) {
        const candidate = mixHexColors(normalizedForeground, target, step / 20);
        if ((contrastRatio(candidate, normalizedBackground) || 0) >= minimumRatio) return candidate;
    }
    return target;
};

const THEME_CONTRAST_PAIRS = Object.freeze([
    ['header.text', 'header.background', 'Header text'],
    ['header.mutedText', 'header.background', 'Header subtitle'],
    ['header.icon', 'header.background', 'Header icons'],
    ['header.cartBadgeText', 'header.cartBadgeBackground', 'Cart badge text'],
    ['hero.title', 'hero.background', 'Hero title'],
    ['hero.subtitle', 'hero.background', 'Hero subtitle'],
    ['hero.primaryButtonText', 'hero.primaryButtonBackground', 'Hero primary button'],
    ['hero.secondaryButtonText', 'hero.secondaryButtonBackground', 'Hero secondary button'],
    ['productCard.title', 'productCard.background', 'Product title'],
    ['productCard.category', 'productCard.background', 'Product category'],
    ['productCard.price', 'productCard.background', 'Product price'],
    ['productCard.saleBadgeText', 'productCard.saleBadgeBackground', 'Sale badge'],
    ['productCard.addToCartText', 'productCard.addToCartBackground', 'Add to Cart button'],
    ['productCard.buyNowText', 'productCard.buyNowBackground', 'Buy Now button'],
    ['allProducts.title', 'allProducts.background', 'Catalog title'],
    ['allProducts.subtitle', 'allProducts.background', 'Catalog subtitle'],
    ['sections.title', 'sections.background', 'Section title'],
    ['sections.subtitle', 'sections.background', 'Section subtitle'],
    ['footer.heading', 'footer.background', 'Footer headings'],
    ['footer.text', 'footer.background', 'Footer text'],
    ['footer.link', 'footer.background', 'Footer links'],
    ['footer.poweredBy', 'footer.background', 'Footer powered-by text'],
    ['checkout.text', 'checkout.cardBackground', 'Checkout text'],
    ['checkout.buttonText', 'checkout.buttonBackground', 'Checkout button'],
]);

const getPathValue = (value = {}, path = '') => String(path || '')
    .split('.')
    .filter(Boolean)
    .reduce((current, key) => current?.[key], value);

const evaluateThemeContrast = (themeCandidate = {}, minimumRatio = 4.5) => {
    const colors = normalizeTheme(themeCandidate).colors;
    return THEME_CONTRAST_PAIRS.map(([foregroundPath, backgroundPath, label]) => {
        const foreground = getPathValue(colors, foregroundPath);
        const background = getPathValue(colors, backgroundPath);
        const ratio = contrastRatio(foreground, background);
        return {
            label,
            foregroundPath,
            backgroundPath,
            foreground,
            background,
            ratio,
            minimumRatio,
            passes: ratio !== null && ratio >= minimumRatio,
            suggestedForeground: suggestAccessibleForeground(foreground, background, minimumRatio),
        };
    });
};

const normalizeThemeColors = (theme = {}) => {
    const raw = isPlainObject(theme.colors) ? theme.colors : {};
    const flat = Object.keys(DEFAULT_COLORS).reduce((acc, key) => {
        if (!isPlainObject(DEFAULT_COLORS[key])) {
            const value = raw[key];
            acc[key] = HEX_COLOR_REGEX.test(String(value || '')) ? value : DEFAULT_COLORS[key];
        }
        return acc;
    }, {});
    const colors = {
        ...flat,
        brand: mergeColorGroup(DEFAULT_COLORS.brand, {
            primary: raw.brand?.primary || raw.accent,
            secondary: raw.brand?.secondary || raw.foreground,
            accent: raw.brand?.accent || raw.accent,
            hover: raw.brand?.hover || raw.accentHover,
            soft: raw.brand?.soft || raw.accentBg,
            ring: raw.brand?.ring || raw.accentRing,
        }),
        header: mergeColorGroup(DEFAULT_COLORS.header, {
            ...(raw.header || {}),
            background: raw.header?.background || raw.navbarBackground || raw.headerBackground,
            text: raw.header?.text || raw.navbarText,
            icon: raw.header?.icon || raw.navbarText,
            hover: raw.header?.hover || raw.navbarHover || raw.accent,
            border: raw.header?.border || raw.cardBorder,
            cartBadgeBackground: raw.header?.cartBadgeBackground || raw.accent,
            cartBadgeText: raw.header?.cartBadgeText || raw.primaryButtonText,
        }),
        hero: mergeColorGroup(DEFAULT_COLORS.hero, raw.hero || {}),
        productCard: mergeColorGroup(DEFAULT_COLORS.productCard, {
            ...(raw.productCard || {}),
            background: raw.productCard?.background || raw.cardBackground,
            border: raw.productCard?.border || raw.cardBorder,
            price: raw.productCard?.price || raw.priceColor || theme.productCard?.priceColor,
            saleBadgeBackground: raw.productCard?.saleBadgeBackground || raw.saleBadgeBg,
            saleBadgeText: raw.productCard?.saleBadgeText || raw.saleBadgeText,
            ratingStar: raw.productCard?.ratingStar || raw.ratingColor,
            addToCartBackground: raw.productCard?.addToCartBackground || raw.primaryButtonBg || theme.productCard?.buttonColor,
            addToCartText: raw.productCard?.addToCartText || raw.primaryButtonText,
        }),
        allProducts: mergeColorGroup(DEFAULT_COLORS.allProducts, raw.allProducts || {}),
        sections: mergeColorGroup(DEFAULT_COLORS.sections, raw.sections || {}),
        footer: mergeColorGroup(DEFAULT_COLORS.footer, {
            ...(raw.footer || {}),
            background: raw.footer?.background || raw.footerBackground,
            heading: raw.footer?.heading || raw.footerLink,
            text: raw.footer?.text || raw.footerText,
            link: raw.footer?.link || raw.footerLink,
            linkHover: raw.footer?.linkHover || raw.accent,
            border: raw.footer?.border || raw.cardBorder,
        }),
        checkout: mergeColorGroup(DEFAULT_COLORS.checkout, raw.checkout || {}),
    };
    if (
        normalizeHexColor(raw.footer?.poweredBy) === LEGACY_LOW_CONTRAST_FOOTER_TEXT
        && (contrastRatio(colors.footer.poweredBy, colors.footer.background) || 0) < 4.5
    ) {
        colors.footer.poweredBy = DEFAULT_COLORS.footer.poweredBy;
    }
    Object.entries(LEGACY_DEFAULT_COLORS).forEach(([key, legacyValue]) => {
        if (String(colors[key]).toLowerCase() === legacyValue) colors[key] = DEFAULT_COLORS[key];
    });
    return colors;
};

const normalizeFocalPoint = (value = {}) => ({
    x: clamp(value?.x, 0, 100, 50),
    y: clamp(value?.y, 0, 100, 50),
});

const normalizeProductSource = (section = {}) => {
    const settings = isPlainObject(section.settings) ? section.settings : {};
    const source = isPlainObject(settings.source) ? settings.source : (isPlainObject(section.source) ? section.source : {});
    const productIds = Array.isArray(settings.productIds) ? settings.productIds : (Array.isArray(source.productIds) ? source.productIds : []);
    if (!['FeaturedProducts', 'Collection', 'CollectionShowcase'].includes(section.type)) return { settings, source: section.source || {} };
    const ids = [...new Set(productIds.map(String).filter(Boolean))].slice(0, 50);
    return {
        settings: { ...settings, productIds: ids, source: { type: source.type || 'manual', productIds: ids } },
        source: { type: source.type || 'manual', productIds: ids },
    };
};

const isLegacyAllProductsSection = (section = {}) => {
    if (!['FeaturedProducts', 'Collection'].includes(section.type)) return false;
    const settings = section.settings || {};
    const source = settings.source || section.source || {};
    const productIds = settings.productIds || source.productIds || [];
    return !source.type && (!Array.isArray(productIds) || productIds.length === 0);
};

const normalizeHomepageSections = (sections = []) => (Array.isArray(sections) ? sections : [])
    .filter(section => section && section.type !== 'Hero' && !isLegacyAllProductsSection(section))
    .map((rawSection, index) => {
        const type = rawSection.type === 'BannerGrid' ? 'Banner' : rawSection.type;
        if (!SECTION_REGISTRY[type]) return null;
        const { _id: databaseId, __v: databaseVersion, ...portableSection } = rawSection;
        void databaseVersion;
        const section = { ...portableSection, type };
        const productSource = normalizeProductSource(section);
        const settings = {
            ...cloneTheme(SECTION_REGISTRY[type].defaultSettings),
            ...productSource.settings,
            ...(STRUCTURAL_VARIANTS.sections[type]
                ? { variant: normalizeStructuralVariant(productSource.settings?.variant, STRUCTURAL_VARIANTS.sections[type]) }
                : {}),
            ...(SECTION_REGISTRY[type].supportsFocalPoint
                ? { focalPoint: normalizeFocalPoint(productSource.settings?.focalPoint) }
                : {}),
        };
        return {
            ...section,
            id: cleanText(section.id || (databaseId ? String(databaseId) : '') || `${type}-${index}`, 80),
            title: cleanText(section.title || SECTION_REGISTRY[type].label, 120),
            type,
            isEnabled: section.isEnabled !== false,
            sortOrder: Number.isFinite(Number(section.sortOrder)) ? Number(section.sortOrder) : index,
            settings,
            desktopSettings: {
                ...(isPlainObject(section.desktopSettings) ? section.desktopSettings : {}),
                isVisible: section.desktopSettings?.isVisible !== false,
            },
            mobileSettings: {
                ...(isPlainObject(section.mobileSettings) ? section.mobileSettings : {}),
                isVisible: section.mobileSettings?.isVisible !== false,
                ...(SECTION_REGISTRY[type].supportsFocalPoint
                    ? { focalPoint: normalizeFocalPoint(section.mobileSettings?.focalPoint) }
                    : {}),
            },
            source: productSource.source,
        };
    })
    .filter(Boolean)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 30)
    .map((section, index) => ({ ...section, sortOrder: index }));

const normalizeHeroSlide = (slide = {}, index = 0, hero = {}) => ({
    ...slide,
    id: cleanText(slide.id || `hero-slide-${index + 1}`, 80),
    enabled: slide.enabled !== false,
    desktopImage: sanitizeThemeUrl(slide.desktopImage || (index === 0 ? hero.imageUrl : '')),
    mobileImage: sanitizeThemeUrl(slide.mobileImage || ''),
    title: cleanText(slide.title || (index === 0 ? hero.title : ''), 140),
    subtitle: cleanText(slide.subtitle || (index === 0 ? hero.subtitle : ''), 280),
    badgeText: cleanText(slide.badgeText, 80),
    discountText: cleanText(slide.discountText, 80),
    primaryCtaText: cleanText(
        slide.primaryCtaText !== undefined ? slide.primaryCtaText : ((index === 0 ? hero.ctaLabel : '') || 'Shop Now'),
        80
    ),
    primaryCtaLink: sanitizeThemeUrl(
        slide.primaryCtaLink !== undefined ? slide.primaryCtaLink : ((index === 0 ? hero.ctaUrl : '') || '#products')
    ),
    secondaryCtaText: cleanText(
        slide.secondaryCtaText !== undefined ? slide.secondaryCtaText : 'Explore Collection',
        80
    ),
    secondaryCtaLink: sanitizeThemeUrl(
        slide.secondaryCtaLink !== undefined ? slide.secondaryCtaLink : '#products'
    ),
    desktopFocalPoint: normalizeFocalPoint(slide.desktopFocalPoint),
    mobileFocalPoint: normalizeFocalPoint(slide.mobileFocalPoint),
});

const ensurePolicyNavigationLink = (navigation = []) => {
    const links = Array.isArray(navigation) ? navigation : [];
    if (links.some(item => /polic/i.test(String(item?.label || '')) || /^\/policies(?:\/|$)/i.test(String(item?.url || '')))) return links;
    return [...links, { label: 'Policies', url: '/policies', sortOrder: links.length, children: [], megaMenu: false }];
};

const normalizeNavigation = (navigation = []) => ensurePolicyNavigationLink(Array.isArray(navigation) ? navigation : FALLBACK_THEME.navigation)
    .slice(0, 20)
    .map((item, index) => ({
        ...item,
        label: cleanText(item?.label, 80),
        url: sanitizeThemeUrl(item?.url || '#'),
        sortOrder: Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index,
        isExternal: item?.isExternal === true,
        megaMenu: item?.megaMenu === true,
        children: (Array.isArray(item?.children) ? item.children : []).slice(0, 20).map((child, childIndex) => ({
            ...child,
            label: cleanText(child?.label, 80),
            url: sanitizeThemeUrl(child?.url || '#'),
            sortOrder: Number.isFinite(Number(child?.sortOrder)) ? Number(child.sortOrder) : childIndex,
        })),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
const SUPPORTED_THEME_FONTS = new Set(['Inter', 'Arial', 'Georgia', 'Roboto']);
const SUPPORTED_HEADING_WEIGHTS = new Set(['600', '700', '800', '900']);
const PRODUCT_CARD_STYLE_DEFAULTS = Object.freeze({
    Minimal: { shadow: 'None', buttonStyle: 'Outline', titleWeight: '700' },
    Modern: {},
    Premium: { shadow: 'Elevated', titleWeight: '800' },
});

const normalizeLayout = (theme = {}) => {
    const raw = isPlainObject(theme.layout) ? theme.layout : {};
    const layout = mergeObject(FALLBACK_THEME.layout, raw);
    const legacyContainerWidth = { Contained: 'Narrow', Wide: 'Wide', Full: 'Full Width' }[raw.maxWidth];
    const containerWidth = ['Narrow', 'Standard', 'Wide', 'Full Width'].includes(raw.containerWidth)
        ? raw.containerWidth
        : (legacyContainerWidth || FALLBACK_THEME.layout.containerWidth);
    const sectionSpacing = ['Compact', 'Comfortable', 'Spacious'].includes(raw.sectionSpacing)
        ? raw.sectionSpacing
        : (['Compact', 'Comfortable', 'Spacious'].includes(raw.contentSpacing)
            ? raw.contentSpacing
            : FALLBACK_THEME.layout.sectionSpacing);
    const contentSpacing = ['Compact', 'Comfortable', 'Spacious'].includes(raw.contentSpacing)
        ? raw.contentSpacing
        : sectionSpacing;

    return {
        ...layout,
        containerWidth,
        maxWidth: containerWidth === 'Narrow' ? 'Contained' : containerWidth === 'Full Width' ? 'Full' : 'Wide',
        sectionSpacing,
        contentSpacing,
        sectionWidth: ['Narrow', 'Standard', 'Wide', 'Full Width'].includes(raw.sectionWidth)
            ? raw.sectionWidth
            : FALLBACK_THEME.layout.sectionWidth,
        sectionPaddingTop: clamp(raw.sectionPaddingTop, 0, 160, FALLBACK_THEME.layout.sectionPaddingTop),
        sectionPaddingBottom: clamp(raw.sectionPaddingBottom, 0, 160, FALLBACK_THEME.layout.sectionPaddingBottom),
        sectionMarginTop: clamp(raw.sectionMarginTop, 0, 160, FALLBACK_THEME.layout.sectionMarginTop),
        sectionMarginBottom: clamp(raw.sectionMarginBottom, 0, 160, FALLBACK_THEME.layout.sectionMarginBottom),
        productColumnsDesktop: Math.round(clamp(raw.productColumnsDesktop, 2, 5, FALLBACK_THEME.layout.productColumnsDesktop)),
        productColumnsMobile: Math.round(clamp(raw.productColumnsMobile, 1, 2, FALLBACK_THEME.layout.productColumnsMobile)),
        productGap: ['Compact', 'Comfortable', 'Spacious', 'Editorial'].includes(raw.productGap)
            ? raw.productGap
            : (['Compact', 'Comfortable', 'Spacious', 'Editorial'].includes(theme.productGridStyle)
                ? theme.productGridStyle
                : FALLBACK_THEME.layout.productGap),
        cardAlignment: ['Left', 'Center', 'Right'].includes(raw.cardAlignment)
            ? raw.cardAlignment
            : FALLBACK_THEME.layout.cardAlignment,
    };
};

const normalizeTypography = (theme = {}) => {
    const raw = isPlainObject(theme.typography) ? theme.typography : {};
    const legacyFont = SUPPORTED_THEME_FONTS.has(theme.fontFamily) ? theme.fontFamily : FALLBACK_THEME.fontFamily;
    return {
        headingFont: SUPPORTED_THEME_FONTS.has(raw.headingFont) ? raw.headingFont : legacyFont,
        bodyFont: SUPPORTED_THEME_FONTS.has(raw.bodyFont) ? raw.bodyFont : legacyFont,
        baseSize: clamp(raw.baseSize, 12, 20, FALLBACK_THEME.typography.baseSize),
        headingWeight: SUPPORTED_HEADING_WEIGHTS.has(String(raw.headingWeight))
            ? String(raw.headingWeight)
            : FALLBACK_THEME.typography.headingWeight,
    };
};

const normalizeProductCard = (theme = {}) => {
    const raw = isPlainObject(theme.productCard) ? theme.productCard : {};
    const style = Object.prototype.hasOwnProperty.call(PRODUCT_CARD_STYLE_DEFAULTS, raw.style)
        ? raw.style
        : FALLBACK_THEME.productCard.style;
    return mergeObject(FALLBACK_THEME.productCard, {
        ...PRODUCT_CARD_STYLE_DEFAULTS[style],
        ...raw,
        style,
    });
};

const normalizeAllProducts = ({ theme, layout, legacyAllProducts }) => {
    const raw = isPlainObject(theme.allProducts) ? theme.allProducts : {};
    const spacing = ['Compact', 'Comfortable', 'Spacious', 'Editorial'].includes(raw.spacing)
        ? raw.spacing
        : layout.productGap;
    return mergeObject(FALLBACK_THEME.allProducts, {
        ...(legacyAllProducts?.title ? { title: legacyAllProducts.title } : {}),
        ...raw,
        desktopColumns: Math.round(clamp(
            hasOwn(raw, 'desktopColumns') ? raw.desktopColumns : layout.productColumnsDesktop,
            2,
            5,
            FALLBACK_THEME.allProducts.desktopColumns
        )),
        tabletColumns: Math.round(clamp(raw.tabletColumns, 1, 4, FALLBACK_THEME.allProducts.tabletColumns)),
        mobileColumns: Math.round(clamp(
            hasOwn(raw, 'mobileColumns') ? raw.mobileColumns : layout.productColumnsMobile,
            1,
            2,
            FALLBACK_THEME.allProducts.mobileColumns
        )),
        spacing,
    });
};

const normalizeTheme = (candidate = {}) => {
    const theme = sanitizeThemePayload(isPlainObject(candidate) ? candidate : {});
    const legacyAllProducts = (Array.isArray(theme.homepageSections) ? theme.homepageSections : []).find(isLegacyAllProductsSection);
    const hero = mergeObject(FALLBACK_THEME.hero, theme.hero);
    hero.variant = normalizeStructuralVariant(theme.hero?.variant, STRUCTURAL_VARIANTS.hero);
    hero.overlayOpacity = clamp(theme.hero?.overlayOpacity, 0, 80, FALLBACK_THEME.hero.overlayOpacity);
    hero.height = ['Compact', 'Medium', 'Tall'].includes(theme.hero?.height)
        ? theme.hero.height
        : FALLBACK_THEME.hero.height;
    const rawSlides = Array.isArray(hero.bannerSlides) ? hero.bannerSlides : [];
    hero.bannerSlides = rawSlides.slice(0, 5).map((slide, index) => normalizeHeroSlide(slide, index, hero));
    if (!hero.bannerSlides.length && hero.imageUrl) hero.bannerSlides = [normalizeHeroSlide({}, 0, hero)];
    if (hero.bannerSlides[0]) {
        hero.imageUrl = hero.bannerSlides[0].desktopImage || hero.imageUrl || '';
        hero.ctaLabel = hero.bannerSlides[0].primaryCtaText || hero.ctaLabel || 'Shop Now';
        hero.ctaUrl = hero.bannerSlides[0].primaryCtaLink || hero.ctaUrl || '/';
    }
    const layout = normalizeLayout(theme);
    const typography = normalizeTypography(theme);

    return {
        ...cloneTheme(FALLBACK_THEME),
        ...theme,
        version: THEME_SCHEMA_VERSION,
        colors: normalizeThemeColors(theme),
        header: {
            ...FALLBACK_THEME.header,
            ...(theme.header || {}),
            variant: normalizeStructuralVariant(theme.header?.variant, STRUCTURAL_VARIANTS.header),
            logoPosition: 'Left',
        },
        typography,
        hero,
        layout,
        productCard: normalizeProductCard(theme),
        checkoutBranding: mergeObject(FALLBACK_THEME.checkoutBranding, theme.checkoutBranding),
        mobile: mergeObject(FALLBACK_THEME.mobile, theme.mobile),
        allProducts: normalizeAllProducts({ theme, layout, legacyAllProducts }),
        migrations: mergeObject(FALLBACK_THEME.migrations, theme.migrations),
        paymentSettings: {
            ...FALLBACK_THEME.paymentSettings,
            ...(theme.paymentSettings || {}),
            providers: { ...FALLBACK_THEME.paymentSettings.providers, ...(theme.paymentSettings?.providers || {}) },
        },
        seo: {
            ...FALLBACK_THEME.seo,
            ...(theme.seo || {}),
            topics: Array.isArray(theme.seo?.topics)
                ? theme.seo.topics
                : (Array.isArray(theme.seo?.keywords) ? theme.seo.keywords : []),
            keywords: Array.isArray(theme.seo?.topics)
                ? theme.seo.topics
                : (Array.isArray(theme.seo?.keywords) ? theme.seo.keywords : []),
            aiSuggestion: mergeObject(FALLBACK_THEME.seo.aiSuggestion, theme.seo?.aiSuggestion),
        },
        homepageSections: normalizeHomepageSections(Array.isArray(theme.homepageSections) ? theme.homepageSections : FALLBACK_THEME.homepageSections),
        navigation: normalizeNavigation(theme.navigation),
        footer: mergeObject(FALLBACK_THEME.footer, theme.footer),
        policies: mergeObject(FALLBACK_THEME.policies, theme.policies),
    };
};

const validateTheme = (candidate = {}) => {
    const errors = [];
    const validateVariant = (value, contract, path) => {
        if (value !== undefined && !contract.values.includes(value)) {
            errors.push({ path, code: 'UNSUPPORTED_VARIANT', message: `Unsupported structural variant: ${String(value || 'unknown')}.` });
        }
    };
    validateVariant(candidate?.header?.variant, STRUCTURAL_VARIANTS.header, 'header.variant');
    validateVariant(candidate?.hero?.variant, STRUCTURAL_VARIANTS.hero, 'hero.variant');
    if (candidate?.preset !== undefined && candidate.preset !== null) {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(candidate.preset?.id || ''))) {
            errors.push({ path: 'preset.id', code: 'INVALID_PRESET', message: 'Theme preset ID must be a lowercase slug.' });
        }
        if (!Number.isInteger(Number(candidate.preset?.version)) || Number(candidate.preset?.version) < 1) {
            errors.push({ path: 'preset.version', code: 'INVALID_PRESET', message: 'Theme preset version must be a positive integer.' });
        }
        if (candidate.preset?.appliedAt && Number.isNaN(Date.parse(candidate.preset.appliedAt))) {
            errors.push({ path: 'preset.appliedAt', code: 'INVALID_PRESET', message: 'Theme preset applied time must be a valid ISO date.' });
        }
    }
    const rawSections = Array.isArray(candidate?.homepageSections) ? candidate.homepageSections : [];
    rawSections.forEach((section, index) => {
        const type = section?.type === 'BannerGrid' ? 'Banner' : section?.type;
        if (!SECTION_REGISTRY[type]) {
            errors.push({ path: `homepageSections.${index}.type`, code: 'UNSUPPORTED_SECTION', message: `Unsupported homepage section: ${type || 'unknown'}.`, sectionIndex: index });
        } else if (STRUCTURAL_VARIANTS.sections[type]) {
            validateVariant(section?.settings?.variant, STRUCTURAL_VARIANTS.sections[type], `homepageSections.${index}.settings.variant`);
        }
    });
    const checkUrls = (value, path = '', depth = 0) => {
        if (depth > 12) return;
        if (Array.isArray(value)) return value.forEach((item, index) => checkUrls(item, `${path}.${index}`, depth + 1));
        if (isPlainObject(value)) return Object.entries(value).forEach(([key, child]) => {
            const childPath = path ? `${path}.${key}` : key;
            if (typeof child === 'string' && URL_FIELD_PATTERN.test(key) && !isSafeThemeUrl(child)) {
                errors.push({ path: childPath, code: 'UNSAFE_URL', message: 'Use a safe HTTPS, store-relative, email, phone, or anchor link.' });
            }
            checkUrls(child, childPath, depth + 1);
        });
    };
    checkUrls(candidate);
    if (candidate?.seo?.siteName && cleanText(candidate.seo.siteName, 1000).length > 80) errors.push({ path: 'seo.siteName', code: 'MAX_LENGTH', message: 'Google site name must be 80 characters or fewer.' });
    if (candidate?.seo?.title && cleanText(candidate.seo.title, 1000).length > 70) errors.push({ path: 'seo.title', code: 'MAX_LENGTH', message: 'Homepage SEO title must be 70 characters or fewer.' });
    if (candidate?.seo?.description && cleanText(candidate.seo.description, 1000).length > 170) errors.push({ path: 'seo.description', code: 'MAX_LENGTH', message: 'Homepage SEO description must be 170 characters or fewer.' });
    if (rawSections.length > 30) errors.push({ path: 'homepageSections', code: 'MAX_ITEMS', message: 'A storefront can contain up to 30 homepage sections.' });
    return { valid: errors.length === 0, errors };
};

const createDefaultSection = (type, overrides = {}) => {
    const definition = SECTION_REGISTRY[type];
    if (!definition) return null;
    return normalizeHomepageSections([{
        id: `${type}-section`,
        type,
        title: definition.label,
        isEnabled: true,
        sortOrder: 0,
        settings: cloneTheme(definition.defaultSettings),
        desktopSettings: { isVisible: true },
        mobileSettings: { isVisible: true },
        ...overrides
    }])[0] || null;
};

const getEnabledHomepageSections = (theme = {}) => normalizeTheme(theme).homepageSections
    .filter(section => section.isEnabled !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);

const getSortedNavigation = (theme = {}) => normalizeTheme(theme).navigation
    .filter(item => item.label && (item.url || item.children?.length));

const getThemeCssVars = (themeCandidate = {}) => {
    const theme = normalizeTheme(themeCandidate);
    const colors = theme.colors;
    const safeColors = Object.keys(FALLBACK_THEME.colors).reduce((acc, key) => {
        if (isPlainObject(FALLBACK_THEME.colors[key])) return acc;
        acc[key] = HEX_COLOR_REGEX.test(String(colors[key] || '')) ? colors[key] : FALLBACK_THEME.colors[key];
        return acc;
    }, {});
    const baseSize = clamp(theme.typography?.baseSize, 12, 20, 16);
    const buttonStyle = theme.checkoutBranding?.buttonStyle;
    return {
        ...safeColors,
        colorGroups: {
            brand: mergeColorGroup(FALLBACK_THEME.colors.brand, colors.brand),
            header: mergeColorGroup(FALLBACK_THEME.colors.header, colors.header),
            hero: mergeColorGroup(FALLBACK_THEME.colors.hero, colors.hero),
            productCard: mergeColorGroup(FALLBACK_THEME.colors.productCard, colors.productCard),
            allProducts: mergeColorGroup(FALLBACK_THEME.colors.allProducts, colors.allProducts),
            sections: mergeColorGroup(FALLBACK_THEME.colors.sections, colors.sections),
            footer: mergeColorGroup(FALLBACK_THEME.colors.footer, colors.footer),
            checkout: mergeColorGroup(FALLBACK_THEME.colors.checkout, colors.checkout),
        },
        fontFamily: theme.typography?.bodyFont || theme.fontFamily || FALLBACK_THEME.fontFamily,
        headingFont: theme.typography?.headingFont || theme.fontFamily || FALLBACK_THEME.fontFamily,
        baseSize,
        headingWeight: theme.typography?.headingWeight || FALLBACK_THEME.typography.headingWeight,
        checkoutButtonRadius: buttonStyle === 'Pill' ? '999px' : buttonStyle === 'Solid' ? '10px' : '16px',
    };
};

const getThemeCapabilityMetadata = (planAccess = {}) => {
    const full = planAccess.storeBuilderAccess === 'full';
    const capabilities = planAccess.storeBuilderCapabilities || {};
    const planName = planAccess.planName || planAccess.planKey || 'your current plan';
    return {
        access: full ? 'full' : 'limited',
        planName,
        sections: {
            enabled: full,
            label: full ? 'Available' : `Requires a plan with advanced homepage sections (current: ${planName})`,
        },
        advancedDesign: {
            enabled: full,
            label: full ? 'Available' : `Requires full Store Builder access (current: ${planName})`,
        },
        customDomain: {
            enabled: planAccess.features?.customDomain !== false,
            label: planAccess.features?.customDomain === false ? `Custom domains are not included in ${planName}` : 'Available',
        },
        scheduledBanners: {
            enabled: Boolean(capabilities.scheduledBanners),
            label: capabilities.scheduledBanners ? 'Available' : `Scheduled banners are not included in ${planName}`,
        },
    };
};

const extractThemeAssetUrls = (theme = {}) => {
    const urls = new Set();
    const walk = (value, key = '', depth = 0) => {
        if (depth > 12 || value === null || value === undefined) return;
        if (Array.isArray(value)) return value.forEach(item => walk(item, key, depth + 1));
        if (isPlainObject(value)) return Object.entries(value).forEach(([childKey, child]) => walk(child, childKey, depth + 1));
        if (typeof value === 'string' && URL_FIELD_PATTERN.test(key) && /^https?:\/\//i.test(value)) urls.add(value);
    };
    walk(theme);
    return [...urls];
};

const summarizeThemeChanges = (before = {}, after = {}) => {
    const previous = normalizeTheme(before);
    const next = normalizeTheme(after);
    const summaries = [];
    const changed = (key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key]);
    if (changed('header') || changed('logoUrl') || changed('navigation')) summaries.push({ area: 'Header', message: 'Store logo or navigation changed.' });
    if (changed('hero')) summaries.push({ area: 'Hero', message: 'Hero content, links, or media changed.' });
    if (changed('homepageSections')) summaries.push({ area: 'Homepage', message: 'Homepage sections changed or were reordered.' });
    if (changed('colors') || changed('typography') || changed('layout')) summaries.push({ area: 'Design', message: 'Store colors, typography, or layout changed.' });
    if (changed('preset')) summaries.push({ area: 'Theme', message: 'A prebuilt storefront theme was applied.' });
    if (changed('productCard') || changed('allProducts')) summaries.push({ area: 'Catalog', message: 'Product grid or card styling changed.' });
    if (changed('seo')) summaries.push({ area: 'SEO', message: 'Homepage search metadata changed.' });
    if (changed('footer')) summaries.push({ area: 'Footer', message: 'Footer content or links changed.' });
    if (changed('checkoutBranding') || changed('paymentSettings')) summaries.push({ area: 'Checkout', message: 'Checkout branding or payment display changed.' });
    if (changed('mobile')) summaries.push({ area: 'Mobile', message: 'Mobile storefront behavior changed.' });
    if (changed('policies')) summaries.push({ area: 'Policies', message: 'Store policy content changed.' });
    return summaries;
};

module.exports = {
    THEME_SCHEMA_VERSION,
    STRUCTURAL_VARIANTS,
    SECTION_REGISTRY,
    SECTION_TYPES,
    ALLOWED_THEME_KEYS,
    FALLBACK_THEME,
    cloneTheme,
    normalizeTheme,
    createDefaultSection,
    normalizeHomepageSections,
    normalizeThemeColors,
    sanitizeThemePayload,
    validateTheme,
    getEnabledHomepageSections,
    getSortedNavigation,
    getThemeCssVars,
    getThemeCapabilityMetadata,
    extractThemeAssetUrls,
    summarizeThemeChanges,
    isSafeThemeUrl,
    sanitizeThemeUrl,
    normalizeHexColor,
    relativeLuminance,
    contrastRatio,
    suggestAccessibleForeground,
    evaluateThemeContrast,
    ...homepageSeo,
};
