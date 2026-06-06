export const FALLBACK_THEME = {
    logoUrl: '',
    fontFamily: 'Inter',
    productGridStyle: 'Comfortable',
    colors: {
        accent: '#4f46e5',
        accentHover: '#4338ca',
        accentSoft: '#c7d2fe',
        accentBg: '#eef2ff',
        accentStrong: '#3730a3',
        accentMuted: '#818cf8',
        accentLight: '#a5b4fc',
        accentRing: '#e0e7ff',
        background: '#ffffff',
        foreground: '#111827',
        headerBackground: '#ffffff',
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
        sectionSpacing: 'Comfortable',
        productColumnsDesktop: 3,
        productColumnsMobile: 2,
    },
    productCard: {
        imageFit: 'Contain',
        showCategory: true,
        showRating: true,
        showQuickBuy: true,
        borderRadius: 'Rounded',
        shadow: 'Soft',
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
    homepageSections: [
        { type: 'Hero', title: 'Featured offers', sortOrder: 0, isEnabled: true },
        { type: 'FeaturedProducts', title: 'Latest products', sortOrder: 1, isEnabled: true },
    ],
    navigation: [
        { label: 'Shop', url: '/', sortOrder: 0 },
        { label: 'Track Order', url: '/track', sortOrder: 1 },
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

const mergeObject = (base, incoming) => ({
    ...base,
    ...(incoming || {}),
});

export const normalizeTheme = (theme = {}) => ({
    ...FALLBACK_THEME,
    ...theme,
    colors: mergeObject(FALLBACK_THEME.colors, theme.colors || theme),
    typography: mergeObject(FALLBACK_THEME.typography, theme.typography),
    hero: mergeObject(FALLBACK_THEME.hero, theme.hero),
    layout: mergeObject(FALLBACK_THEME.layout, theme.layout),
    productCard: mergeObject(FALLBACK_THEME.productCard, theme.productCard),
    checkoutBranding: mergeObject(FALLBACK_THEME.checkoutBranding, theme.checkoutBranding),
    mobile: mergeObject(FALLBACK_THEME.mobile, theme.mobile),
    footer: mergeObject(FALLBACK_THEME.footer, theme.footer),
    policies: mergeObject(FALLBACK_THEME.policies, theme.policies),
    homepageSections: Array.isArray(theme.homepageSections)
        ? theme.homepageSections
        : FALLBACK_THEME.homepageSections,
    navigation: Array.isArray(theme.navigation)
        ? theme.navigation
        : FALLBACK_THEME.navigation,
});

export const getThemeCssVars = (themeCandidate = {}) => {
    const theme = normalizeTheme(themeCandidate);
    const colors = theme.colors;
    const safeColors = Object.keys(FALLBACK_THEME.colors).reduce((acc, key) => {
        acc[key] = HEX_COLOR_REGEX.test(colors[key]) ? colors[key] : FALLBACK_THEME.colors[key];
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
