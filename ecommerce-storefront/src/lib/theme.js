import { buildDefaultPolicies } from './defaultPolicies.js';

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
        brand: {
            primary: '#0f766e',
            secondary: '#0f172a',
            accent: '#0f766e',
            hover: '#115e59',
            soft: '#ecfdf5',
            ring: '#ccfbf1',
        },
        header: {
            background: '#ffffff',
            text: '#0f172a',
            mutedText: '#64748b',
            icon: '#0f172a',
            border: '#e2e8f0',
            hover: '#0f766e',
            cartBadgeBackground: '#0f766e',
            cartBadgeText: '#ffffff',
        },
        hero: {
            background: '#020617',
            title: '#ffffff',
            subtitle: '#e2e8f0',
            overlay: '#020617',
            primaryButtonBackground: '#ffffff',
            primaryButtonText: '#0f172a',
            secondaryButtonBackground: '#ffffff',
            secondaryButtonText: '#0f172a',
        },
        productCard: {
            background: '#ffffff',
            border: '#e2e8f0',
            shadow: '#e2e8f0',
            title: '#0f172a',
            category: '#64748b',
            price: '#0f172a',
            compareAtPrice: '#94a3b8',
            saleBadgeBackground: '#dc2626',
            saleBadgeText: '#ffffff',
            ratingStar: '#f59e0b',
            ratingText: '#94a3b8',
            wishlistIcon: '#64748b',
            wishlistActive: '#e11d48',
            addToCartBackground: '#0f766e',
            addToCartText: '#ffffff',
            buyNowBackground: '#0f172a',
            buyNowText: '#ffffff',
            outOfStockBackground: '#fff1f2',
            outOfStockText: '#e11d48',
            stockBackground: '#ecfdf5',
            stockText: '#047857',
            variantChipBackground: '#f8fafc',
            variantChipText: '#475569',
            variantChipSelectedBackground: '#0f766e',
            variantChipSelectedText: '#ffffff',
        },
        allProducts: {
            background: '#f8fafc',
            title: '#0f172a',
            subtitle: '#64748b',
            filterBackground: '#ffffff',
            filterText: '#475569',
            dropdownBackground: '#ffffff',
            paginationBackground: '#ffffff',
            paginationText: '#475569',
            paginationActiveBackground: '#0f766e',
            paginationActiveText: '#ffffff',
        },
        sections: {
            background: '#ffffff',
            title: '#0f172a',
            subtitle: '#64748b',
            bannerOverlay: '#020617',
            bannerText: '#ffffff',
            faqBackground: '#f8fafc',
            faqText: '#475569',
            testimonialBackground: '#f8fafc',
            testimonialText: '#475569',
            trustIcon: '#0f766e',
            trustText: '#475569',
        },
        footer: {
            background: '#ffffff',
            heading: '#0f172a',
            text: '#64748b',
            link: '#0f172a',
            linkHover: '#0f766e',
            border: '#e2e8f0',
            poweredBy: '#94a3b8',
        },
        checkout: {
            background: '#f8fafc',
            cardBackground: '#ffffff',
            text: '#0f172a',
            buttonBackground: '#0f172a',
            buttonText: '#ffffff',
            accent: '#0f766e',
            inputBackground: '#ffffff',
            inputBorder: '#cbd5e1',
            inputFocus: '#0f766e',
            error: '#dc2626',
            success: '#047857',
        },
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
        bannerSlides: [],
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
    seo: {
        siteName: '',
        title: '',
        description: '',
        keywords: [],
        socialImage: '',
        facebookUrl: '',
        searchEngineVisibility: true,
        googleSiteVerification: '',
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
        { label: 'Policies', url: '/policies', sortOrder: 1, children: [], megaMenu: false },
        { label: 'Track Order', url: '/track', sortOrder: 2, children: [], megaMenu: false },
    ],
    footer: {
        text: '',
        contactLabel: 'Contact store',
        contactEmail: '',
        facebookUrl: '',
        instagramUrl: '',
        twitterUrl: '',
        youtubeUrl: '',
        tiktokUrl: '',
        links: [],
    },
    policies: buildDefaultPolicies({ storeName: 'this store' }),
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

const isHexColor = (value) => HEX_COLOR_REGEX.test(String(value || ''));

const sanitizeFlatColors = (base = {}, incoming = {}) => Object.keys(base).reduce((acc, key) => {
    const value = incoming?.[key];
    acc[key] = isHexColor(value) ? value : base[key];
    return acc;
}, {});

const mergeColorGroup = (base = {}, incoming = {}) => Object.keys(base).reduce((acc, key) => {
    const value = incoming?.[key];
    acc[key] = isHexColor(value) ? value : base[key];
    return acc;
}, {});

const normalizeColors = (incoming = {}) => {
    const raw = incoming || {};
    const flat = sanitizeFlatColors(FALLBACK_THEME.colors, raw);

    return {
        ...flat,
        brand: mergeColorGroup(FALLBACK_THEME.colors.brand, {
            primary: raw.brand?.primary || raw.accent,
            secondary: raw.brand?.secondary || raw.foreground,
            accent: raw.brand?.accent || raw.accent,
            hover: raw.brand?.hover || raw.accentHover,
            soft: raw.brand?.soft || raw.accentBg,
            ring: raw.brand?.ring || raw.accentRing,
        }),
        header: mergeColorGroup(FALLBACK_THEME.colors.header, {
            ...(raw.header || {}),
            background: raw.header?.background || raw.navbarBackground || raw.headerBackground,
            text: raw.header?.text || raw.navbarText,
            icon: raw.header?.icon || raw.navbarText,
            hover: raw.header?.hover || raw.navbarHover || raw.accent,
            border: raw.header?.border || raw.cardBorder,
            cartBadgeBackground: raw.header?.cartBadgeBackground || raw.accent,
            cartBadgeText: raw.header?.cartBadgeText || raw.primaryButtonText,
        }),
        hero: mergeColorGroup(FALLBACK_THEME.colors.hero, raw.hero || {}),
        productCard: mergeColorGroup(FALLBACK_THEME.colors.productCard, {
            ...(raw.productCard || {}),
            background: raw.productCard?.background || raw.cardBackground,
            border: raw.productCard?.border || raw.cardBorder,
            price: raw.productCard?.price || raw.priceColor,
            saleBadgeBackground: raw.productCard?.saleBadgeBackground || raw.saleBadgeBg,
            saleBadgeText: raw.productCard?.saleBadgeText || raw.saleBadgeText,
            ratingStar: raw.productCard?.ratingStar || raw.ratingColor,
            addToCartBackground: raw.productCard?.addToCartBackground || raw.primaryButtonBg,
            addToCartText: raw.productCard?.addToCartText || raw.primaryButtonText,
        }),
        allProducts: mergeColorGroup(FALLBACK_THEME.colors.allProducts, raw.allProducts || {}),
        sections: mergeColorGroup(FALLBACK_THEME.colors.sections, raw.sections || {}),
        footer: mergeColorGroup(FALLBACK_THEME.colors.footer, {
            ...(raw.footer || {}),
            background: raw.footer?.background || raw.footerBackground,
            heading: raw.footer?.heading || raw.footerLink,
            text: raw.footer?.text || raw.footerText,
            link: raw.footer?.link || raw.footerLink,
            linkHover: raw.footer?.linkHover || raw.accent,
            border: raw.footer?.border || raw.cardBorder,
        }),
        checkout: mergeColorGroup(FALLBACK_THEME.colors.checkout, raw.checkout || {}),
    };
};

const normalizeThemeColors = (theme = {}) => {
    const colors = normalizeColors(theme.colors || theme);
    const productCardColors = { ...(colors.productCard || {}) };
    const savedProductCardColors = theme.colors?.productCard || {};

    if (!savedProductCardColors.price && isHexColor(theme.productCard?.priceColor)) {
        productCardColors.price = theme.productCard.priceColor;
    }

    if (!savedProductCardColors.addToCartBackground && isHexColor(theme.productCard?.buttonColor)) {
        productCardColors.addToCartBackground = theme.productCard.buttonColor;
    }

    return {
        ...colors,
        productCard: productCardColors
    };
};

const mergePolicies = (base = {}, incoming = {}) => Object.keys(base).reduce((acc, key) => {
    const value = incoming?.[key];
    acc[key] = typeof value === 'string' && value.trim() ? value : base[key];
    return acc;
}, {});

const ensurePolicyNavigationLink = (navigation = []) => {
    const links = Array.isArray(navigation) ? navigation : [];
    const hasPolicyLink = links.some(item => {
        const label = String(item?.label || '').toLowerCase();
        const url = String(item?.url || '').toLowerCase();
        return label.includes('polic') || url === '/policies' || url.startsWith('/policies/');
    });

    if (hasPolicyLink) return links;

    const maxSortOrder = links.reduce((max, item, index) => Math.max(max, Number(item?.sortOrder ?? index)), -1);
    return [
        ...links,
        {
            label: 'Policies',
            url: '/policies',
            sortOrder: maxSortOrder + 1,
            children: [],
            megaMenu: false,
        },
    ];
};

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
    colors: normalizeThemeColors(theme),
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
    policies: mergePolicies(FALLBACK_THEME.policies, theme.policies),
    seo: mergeObject(FALLBACK_THEME.seo, theme.seo),
    homepageSections: normalizeHomepageSections(Array.isArray(theme.homepageSections)
        ? theme.homepageSections
        : FALLBACK_THEME.homepageSections),
    navigation: ensurePolicyNavigationLink(Array.isArray(theme.navigation)
        ? theme.navigation
        : FALLBACK_THEME.navigation),
});

export const getThemeCssVars = (themeCandidate = {}) => {
    const theme = normalizeTheme(themeCandidate);
    const colors = theme.colors;
    const safeColors = Object.keys(FALLBACK_THEME.colors).reduce((acc, key) => {
        if (FALLBACK_THEME.colors[key] && typeof FALLBACK_THEME.colors[key] === 'object') return acc;
        const color = HEX_COLOR_REGEX.test(colors[key]) ? colors[key] : FALLBACK_THEME.colors[key];
        acc[key] = color.toLowerCase() === LEGACY_DEFAULT_COLORS[key] ? FALLBACK_THEME.colors[key] : color;
        return acc;
    }, {});
    const baseSize = Math.min(Math.max(Number(theme.typography.baseSize) || 16, 12), 20);
    const buttonStyle = theme.checkoutBranding.buttonStyle;

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
        .filter(item => item?.label && (item?.url || item?.children?.length))
        .map(item => ({
            ...item,
            url: item.url || '#',
            children: Array.isArray(item.children)
                ? item.children
                    .filter(child => child?.label && child?.url)
                    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                : []
        }))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
};
