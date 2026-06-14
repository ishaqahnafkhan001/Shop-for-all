export const THEME_SCHEMA_VERSION = 2;

export const FALLBACK_THEME = {
    version: THEME_SCHEMA_VERSION,
    logoUrl: '',
    fontFamily: 'Inter',
    productGridStyle: 'Comfortable',
    colors: {
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
    },
    header: {
        logoPosition: 'Left',
        menuStyle: 'Simple',
    },
    typography: {
        headingFont: 'Inter',
        bodyFont: 'Inter',
        baseSize: 16,
        headingWeight: '800',
    },
    hero: {
        title: '',
        subtitle: '',
        imageUrl: '',
        ctaLabel: 'Shop Now',
        ctaUrl: '/',
        overlayOpacity: 25,
        height: 'Medium',
    },
    layout: {
        maxWidth: 'Wide',
        containerWidth: 'Wide',
        sectionSpacing: 'Comfortable',
        contentSpacing: 'Comfortable',
        sectionWidth: 'Full Width',
        sectionPaddingTop: 40,
        sectionPaddingBottom: 40,
        sectionMarginTop: 0,
        sectionMarginBottom: 40,
        productColumnsDesktop: 3,
        productColumnsMobile: 2,
        productGap: 'Comfortable',
        cardAlignment: 'Left',
    },
    productCard: {
        style: 'Modern',
        imageFit: 'Contain',
        aspectRatio: 'Square',
        imageRadius: 'Rounded',
        hoverZoom: true,
        showCategory: true,
        showRating: true,
        showReviews: true,
        showStock: true,
        showSku: false,
        showDiscountBadge: true,
        showQuickBuy: true,
        showWishlist: true,
        borderRadius: 'Rounded',
        shadow: 'Soft',
        titleSize: 'Medium',
        titleWeight: '800',
        priceSize: 'Medium',
        priceColor: '#0f172a',
        buttonStyle: 'Solid',
        buttonShape: 'Rounded',
        buttonColor: '#0f766e',
    },
    checkoutBranding: {
        logoUrl: '',
        bannerText: '',
        buttonStyle: 'Rounded',
        trustMessage: 'Secure checkout',
    },
    mobile: {
        stickyCheckoutButton: true,
        compactHeader: true,
        showBottomNavigation: false,
    },
    paymentSettings: {
        additionalMethodsEnabled: false,
        providers: {
            stripe: false,
            sslcommerz: false,
            bkash: false,
            nagad: false,
            rocket: false,
            paypal: false,
        },
    },
    homepageSections: [
        {
            id: 'featured-products',
            type: 'FeaturedProducts',
            title: 'Featured Products',
            sortOrder: 0,
            isEnabled: true,
            settings: { source: { type: 'manual', productIds: [] }, productIds: [] },
            mobileSettings: { columns: 2, isVisible: true },
        },
    ],
    allProducts: {
        title: 'All Products',
        subtitle: "Browse this shop's latest catalog",
        isEnabled: true,
        desktopColumns: 3,
        tabletColumns: 2,
        mobileColumns: 2,
        spacing: 'Comfortable',
    },
    migrations: {
        bannerSectionsV1: false,
    },
    navigation: [
        { label: 'Shop', url: '/', sortOrder: 0, children: [], megaMenu: false },
        { label: 'Track Order', url: '/track', sortOrder: 1, children: [], megaMenu: false },
    ],
    footer: {
        text: '',
        links: [],
    },
    policies: {
        refund: '',
        shipping: '',
        privacy: '',
        terms: '',
    },
};

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
const LEGACY_DEFAULT_COLORS = {
    accent: '#4f46e5',
    accentHover: '#4338ca',
    accentSoft: '#c7d2fe',
    accentBg: '#eef2ff',
    accentStrong: '#3730a3',
    accentMuted: '#818cf8',
    accentLight: '#a5b4fc',
    accentRing: '#e0e7ff',
};

const mergeObject = (base, incoming) => ({
    ...base,
    ...(incoming || {}),
});

const normalizeHomepageSections = (sections = []) => sections
    .filter(section => {
        if (!section || section.type === 'Hero') return false;
        const settings = section.settings || {};
        const source = settings.source || section.source || {};
        const productIds = settings.productIds || source.productIds || [];
        return !(['FeaturedProducts', 'Collection'].includes(section.type) && !source.type && (!Array.isArray(productIds) || productIds.length === 0));
    })
    .map((section, index) => {
        const type = section.type === 'BannerGrid' ? 'Banner' : section.type;
        const settings = section.settings || {};
        const source = settings.source || section.source || {};
        const productIds = settings.productIds || source.productIds || [];

        return {
            ...section,
            id: section.id || section._id || `${type || 'section'}-${index}`,
            type,
            sortOrder: Number.isFinite(Number(section.sortOrder)) ? Number(section.sortOrder) : index,
            settings: type === 'FeaturedProducts'
                ? {
                    ...settings,
                    productIds,
                    source: { type: source.type || 'manual', productIds },
                }
                : settings,
            mobileSettings: section.mobileSettings || {},
            source: type === 'FeaturedProducts'
                ? { type: source.type || 'manual', productIds }
                : (section.source || {}),
        };
    })
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((section, index) => ({ ...section, sortOrder: index }));

const getLegacyAllProductsSection = (sections = []) => sections.find(section => {
    const settings = section?.settings || {};
    const source = settings.source || section?.source || {};
    const productIds = settings.productIds || source.productIds || [];
    return ['FeaturedProducts', 'Collection'].includes(section?.type) && !source.type && (!Array.isArray(productIds) || productIds.length === 0);
});

export const normalizeTheme = (theme = {}) => ({
    ...FALLBACK_THEME,
    ...theme,
    version: Number(theme.version) || THEME_SCHEMA_VERSION,
    colors: mergeObject(FALLBACK_THEME.colors, theme.colors || theme),
    header: mergeObject(FALLBACK_THEME.header, theme.header),
    typography: mergeObject(FALLBACK_THEME.typography, theme.typography),
    hero: mergeObject(FALLBACK_THEME.hero, theme.hero),
    layout: mergeObject(FALLBACK_THEME.layout, theme.layout),
    productCard: mergeObject(FALLBACK_THEME.productCard, theme.productCard),
    checkoutBranding: mergeObject(FALLBACK_THEME.checkoutBranding, theme.checkoutBranding),
    mobile: mergeObject(FALLBACK_THEME.mobile, theme.mobile),
    allProducts: mergeObject(
        FALLBACK_THEME.allProducts,
        {
            ...(getLegacyAllProductsSection(theme.homepageSections || [])?.title
                ? { title: getLegacyAllProductsSection(theme.homepageSections || []).title }
                : {}),
            ...(theme.allProducts || {})
        }
    ),
    migrations: mergeObject(FALLBACK_THEME.migrations, theme.migrations),
    paymentSettings: {
        ...FALLBACK_THEME.paymentSettings,
        ...(theme.paymentSettings || {}),
        providers: {
            ...FALLBACK_THEME.paymentSettings.providers,
            ...(theme.paymentSettings?.providers || {}),
        },
    },
    footer: mergeObject(FALLBACK_THEME.footer, theme.footer),
    policies: mergeObject(FALLBACK_THEME.policies, theme.policies),
    homepageSections: normalizeHomepageSections(Array.isArray(theme.homepageSections)
        ? theme.homepageSections
        : FALLBACK_THEME.homepageSections),
    navigation: Array.isArray(theme.navigation)
        ? theme.navigation
        : FALLBACK_THEME.navigation,
});

export const getThemeCssVars = (themeCandidate = {}) => {
    const theme = normalizeTheme(themeCandidate);
    const colors = theme.colors;
    const safeColors = Object.keys(FALLBACK_THEME.colors).reduce((acc, key) => {
        const color = HEX_COLOR_REGEX.test(colors[key]) ? colors[key] : FALLBACK_THEME.colors[key];
        acc[key] = color.toLowerCase() === LEGACY_DEFAULT_COLORS[key] ? FALLBACK_THEME.colors[key] : color;
        return acc;
    }, {});
    const baseSize = Math.min(Math.max(Number(theme.typography.baseSize) || 16, 12), 20);
    const buttonStyle = theme.checkoutBranding.buttonStyle;

    return {
        ...safeColors,
        fontFamily: theme.typography.bodyFont || theme.fontFamily || FALLBACK_THEME.fontFamily,
        headingFont: theme.typography.headingFont || theme.fontFamily || FALLBACK_THEME.fontFamily,
        baseSize,
        headingWeight: theme.typography.headingWeight || FALLBACK_THEME.typography.headingWeight,
        checkoutButtonRadius: buttonStyle === 'Pill' ? '999px' : buttonStyle === 'Solid' ? '10px' : '16px',
    };
};

export const getEnabledHomepageSections = (themeCandidate = {}) => {
    const theme = normalizeTheme(themeCandidate);
    return theme.homepageSections
        .filter(section => section?.isEnabled !== false)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
};

export const getSortedNavigation = (themeCandidate = {}) => {
    const theme = normalizeTheme(themeCandidate);
    return theme.navigation
        .filter(item => item?.label && item?.url)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
};
