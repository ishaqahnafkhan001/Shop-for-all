'use strict';

const {
    FALLBACK_THEME,
    SECTION_REGISTRY,
    cloneTheme,
    createDefaultSection,
    normalizeTheme,
    validateTheme
} = require('./index.cjs');

const PREBUILT_THEME_CATALOG_VERSION = 2;
const SUPPORTED_INDUSTRIES = new Set(['General', 'Fashion', 'Jewellery', 'Beauty', 'Electronics', 'Grocery']);
const SUPPORTED_STYLES = new Set(['Modern', 'Minimal', 'Editorial', 'Luxury', 'Soft', 'Fresh']);
const SUPPORTED_FONTS = new Set(['Inter', 'Arial', 'Georgia', 'Roboto']);
const SUPPORTED_CARD_STYLES = new Set(['Minimal', 'Modern', 'Premium']);
const SUPPORTED_PRESENTATION_KEYS = new Set(['colors', 'typography', 'layout', 'productGridStyle', 'productCard', 'header', 'hero', 'mobile', 'allProducts']);
const HEX_COLOR = /^#(?:[0-9a-f]{3}){1,2}$/i;

const deepFreeze = (value) => {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
};

const palette = ({
    accent,
    accentHover,
    accentSoft,
    accentBg,
    accentStrong,
    accentMuted,
    accentLight,
    accentRing,
    background,
    foreground,
    surface,
    border,
    muted,
    dark,
    heroBackground = dark,
    heroTitle = '#ffffff',
    heroSubtitle = '#e2e8f0',
    footerBackground = dark,
    footerText = '#cbd5e1',
    footerHeading = '#ffffff',
    sale = '#dc2626',
    rating = '#f59e0b'
}) => ({
    accent,
    accentHover,
    accentSoft,
    accentBg,
    accentStrong,
    accentMuted,
    accentLight,
    accentRing,
    background,
    foreground,
    headerBackground: surface,
    primaryButtonBg: accent,
    primaryButtonText: '#ffffff',
    primaryButtonHoverBg: accentHover,
    secondaryButtonBg: surface,
    secondaryButtonText: foreground,
    secondaryButtonHoverBg: accentBg,
    navbarBackground: surface,
    navbarText: foreground,
    navbarHover: accent,
    cardBackground: surface,
    cardBorder: border,
    cardHoverBorder: accentSoft,
    priceColor: foreground,
    saleBadgeBg: sale,
    saleBadgeText: '#ffffff',
    ratingColor: rating,
    footerBackground,
    footerText,
    footerLink: footerHeading,
    brand: {
        primary: accent,
        secondary: dark,
        accent,
        hover: accentHover,
        soft: accentBg,
        ring: accentRing
    },
    header: {
        background: surface,
        text: foreground,
        mutedText: muted,
        icon: foreground,
        border,
        hover: accent,
        cartBadgeBackground: accent,
        cartBadgeText: '#ffffff'
    },
    hero: {
        background: heroBackground,
        title: heroTitle,
        subtitle: heroSubtitle,
        overlay: heroBackground,
        primaryButtonBackground: accent,
        primaryButtonText: '#ffffff',
        secondaryButtonBackground: surface,
        secondaryButtonText: foreground
    },
    productCard: {
        background: surface,
        border,
        shadow: border,
        title: foreground,
        category: muted,
        price: foreground,
        compareAtPrice: muted,
        saleBadgeBackground: sale,
        saleBadgeText: '#ffffff',
        ratingStar: rating,
        ratingText: muted,
        wishlistIcon: muted,
        wishlistActive: '#e11d48',
        addToCartBackground: accent,
        addToCartText: '#ffffff',
        buyNowBackground: dark,
        buyNowText: '#ffffff',
        outOfStockBackground: '#fff1f2',
        outOfStockText: '#be123c',
        stockBackground: accentBg,
        stockText: accentStrong,
        variantChipBackground: background,
        variantChipText: muted,
        variantChipSelectedBackground: accent,
        variantChipSelectedText: '#ffffff'
    },
    allProducts: {
        background,
        title: foreground,
        subtitle: muted,
        filterBackground: surface,
        filterText: muted,
        dropdownBackground: surface,
        paginationBackground: surface,
        paginationText: muted,
        paginationActiveBackground: accent,
        paginationActiveText: '#ffffff'
    },
    sections: {
        background: surface,
        title: foreground,
        subtitle: muted,
        bannerOverlay: heroBackground,
        bannerText: heroTitle,
        faqBackground: background,
        faqText: muted,
        testimonialBackground: background,
        testimonialText: muted,
        trustIcon: accent,
        trustText: muted
    },
    footer: {
        background: footerBackground,
        heading: footerHeading,
        text: footerText,
        link: footerHeading,
        linkHover: accentLight,
        border: accentStrong,
        poweredBy: footerText
    },
    checkout: {
        background,
        cardBackground: surface,
        text: foreground,
        buttonBackground: accent,
        buttonText: '#ffffff',
        accent,
        inputBackground: surface,
        inputBorder: border,
        inputFocus: accent,
        error: '#dc2626',
        success: '#047857'
    }
});

const layout = ({
    containerWidth = 'Wide',
    spacing = 'Comfortable',
    width = 'Full Width',
    desktopColumns = 3,
    mobileColumns = 2,
    gap = 'Comfortable',
    alignment = 'Left',
    padding = 40,
    margin = 40
} = {}) => ({
    maxWidth: containerWidth === 'Narrow' ? 'Contained' : containerWidth === 'Full Width' ? 'Full' : 'Wide',
    containerWidth,
    sectionSpacing: spacing,
    contentSpacing: spacing,
    sectionWidth: width,
    sectionPaddingTop: padding,
    sectionPaddingBottom: padding,
    sectionMarginTop: 0,
    sectionMarginBottom: margin,
    productColumnsDesktop: desktopColumns,
    productColumnsMobile: mobileColumns,
    productGap: gap,
    cardAlignment: alignment
});

const productCard = ({
    style = 'Modern',
    imageFit = 'Contain',
    aspectRatio = 'Square',
    imageRadius = 'Rounded',
    shadow = 'Soft',
    buttonShape = 'Rounded',
    titleSize = 'Medium',
    showCategory = true,
    showRating = true,
    showStock = true,
    showWishlist = true
} = {}) => ({
    style,
    imageFit,
    aspectRatio,
    imageRadius,
    hoverZoom: true,
    showCategory,
    showRating,
    showReviews: showRating,
    showStock,
    showSku: false,
    showDiscountBadge: true,
    showQuickBuy: true,
    showWishlist,
    borderRadius: imageRadius,
    shadow,
    titleSize,
    titleWeight: style === 'Premium' ? '800' : '700',
    priceSize: titleSize,
    buttonStyle: style === 'Minimal' ? 'Outline' : 'Solid',
    buttonShape
});

const blueprintItem = (type, {
    variant,
    presentationSettings = {},
    desktopColumns,
    mobileColumns
} = {}) => ({
    type,
    presentationSettings: {
        ...(type === 'CategoryList' ? { columns: 4, maxCategories: 8 } : {}),
        ...(variant ? { variant } : {}),
        ...presentationSettings
    },
    desktopSettings: {
        ...(type === 'FeaturedProducts' ? { columns: desktopColumns || 4 } : {})
    },
    mobileSettings: {
        ...(type === 'FeaturedProducts' ? { columns: mobileColumns || 2 } : {})
    }
});

const blueprint = (...items) => items.map(item => (
    typeof item === 'string'
        ? blueprintItem(item)
        : blueprintItem(item.type, item)
));

const defineTheme = (definition) => deepFreeze({
    catalogVersion: PREBUILT_THEME_CATALOG_VERSION,
    status: 'active',
    ...definition
});

const themes = [
    defineTheme({
        id: 'modern-general', version: 2, name: 'Modern General', industry: 'General', style: 'Modern', thumbnailKey: 'modern-general',
        description: 'A split campaign hero and balanced product rhythm for versatile everyday catalogues.',
        tags: ['split hero', 'balanced', 'versatile'],
        presentation: {
            colors: palette({ accent: '#0f766e', accentHover: '#115e59', accentSoft: '#99f6e4', accentBg: '#ecfdf5', accentStrong: '#064e3b', accentMuted: '#14b8a6', accentLight: '#5eead4', accentRing: '#ccfbf1', background: '#f8fafc', foreground: '#0f172a', surface: '#ffffff', border: '#e2e8f0', muted: '#64748b', dark: '#0f172a' }),
            typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: 16, headingWeight: '800' },
            layout: layout({ desktopColumns: 4 }), productGridStyle: 'Comfortable',
            productCard: productCard({ style: 'Modern' }),
            header: { variant: 'standard', menuStyle: 'Simple' }, hero: { variant: 'split', overlayOpacity: 12, height: 'Medium' },
            mobile: { stickyCheckoutButton: true, compactHeader: true, showBottomNavigation: true },
            allProducts: { desktopColumns: 4, tabletColumns: 3, mobileColumns: 2, spacing: 'Comfortable' }
        },
        homepageBlueprint: blueprint(
            { type: 'CategoryList', variant: 'cards' },
            'FeaturedProducts',
            { type: 'PromoBlock', variant: 'strip' },
            { type: 'CollectionShowcase', variant: 'grid' },
            { type: 'Reviews', variant: 'cards' },
            { type: 'Newsletter', variant: 'boxed' }
        )
    }),
    defineTheme({
        id: 'minimal-general', version: 2, name: 'Minimal General', industry: 'General', style: 'Minimal', thumbnailKey: 'minimal-general',
        description: 'A restrained header, minimal hero, and spacious three-column catalogue with quiet typography.',
        tags: ['minimal hero', 'neutral', 'spacious'],
        presentation: {
            colors: palette({ accent: '#111827', accentHover: '#000000', accentSoft: '#d1d5db', accentBg: '#f3f4f6', accentStrong: '#030712', accentMuted: '#4b5563', accentLight: '#9ca3af', accentRing: '#e5e7eb', background: '#ffffff', foreground: '#111827', surface: '#ffffff', border: '#e5e7eb', muted: '#6b7280', dark: '#111827', footerBackground: '#f9fafb', footerText: '#6b7280', footerHeading: '#111827' }),
            typography: { headingFont: 'Arial', bodyFont: 'Arial', baseSize: 16, headingWeight: '700' },
            layout: layout({ containerWidth: 'Standard', spacing: 'Spacious', desktopColumns: 3, gap: 'Spacious', padding: 56, margin: 56 }), productGridStyle: 'Spacious',
            productCard: productCard({ style: 'Minimal', imageRadius: 'Soft', shadow: 'None', showWishlist: false }),
            header: { variant: 'minimal', menuStyle: 'Simple' }, hero: { variant: 'minimal', overlayOpacity: 6, height: 'Compact' },
            mobile: { stickyCheckoutButton: true, compactHeader: true, showBottomNavigation: false },
            allProducts: { desktopColumns: 3, tabletColumns: 2, mobileColumns: 2, spacing: 'Spacious' }
        },
        homepageBlueprint: blueprint(
            { type: 'FeaturedProducts', desktopColumns: 3 },
            { type: 'CategoryList', variant: 'cards', presentationSettings: { columns: 3, maxCategories: 6 } },
            { type: 'BrandStory', variant: 'standard' },
            { type: 'Newsletter', variant: 'minimal' }
        )
    }),
    defineTheme({
        id: 'modern-fashion', version: 2, name: 'Modern Fashion', industry: 'Fashion', style: 'Modern', thumbnailKey: 'modern-fashion',
        description: 'A centered brand header, full-bleed campaign hero, portrait cards, and image-led collections.',
        tags: ['full-bleed', 'portrait', 'campaign'],
        presentation: {
            colors: palette({ accent: '#be123c', accentHover: '#9f1239', accentSoft: '#fecdd3', accentBg: '#fff1f2', accentStrong: '#881337', accentMuted: '#fb7185', accentLight: '#fda4af', accentRing: '#ffe4e6', background: '#fffafb', foreground: '#18181b', surface: '#ffffff', border: '#f1d7dd', muted: '#71717a', dark: '#18181b', heroBackground: '#3f0a1d' }),
            typography: { headingFont: 'Georgia', bodyFont: 'Inter', baseSize: 16, headingWeight: '800' },
            layout: layout({ containerWidth: 'Wide', spacing: 'Spacious', desktopColumns: 4, gap: 'Comfortable', padding: 48, margin: 48 }), productGridStyle: 'Editorial',
            productCard: productCard({ style: 'Premium', imageFit: 'Cover', aspectRatio: 'Portrait', imageRadius: 'Soft', shadow: 'Soft', buttonShape: 'Pill' }),
            header: { variant: 'centered', menuStyle: 'Nested' }, hero: { variant: 'fullBleed', overlayOpacity: 15, height: 'Tall' },
            mobile: { stickyCheckoutButton: true, compactHeader: true, showBottomNavigation: true },
            allProducts: { desktopColumns: 4, tabletColumns: 3, mobileColumns: 2, spacing: 'Comfortable' }
        },
        homepageBlueprint: blueprint(
            { type: 'CategoryList', variant: 'imageGrid' },
            'FeaturedProducts',
            { type: 'Banner', variant: 'overlay' },
            { type: 'BrandStory', variant: 'imageRight' },
            { type: 'CollectionShowcase', variant: 'grid' },
            { type: 'Reviews', variant: 'quote' },
            { type: 'Newsletter', variant: 'fullWidth' }
        )
    }),
    defineTheme({
        id: 'editorial-fashion', version: 2, name: 'Editorial Fashion', industry: 'Fashion', style: 'Editorial', thumbnailKey: 'editorial-fashion',
        description: 'An asymmetrical editorial composition with serif type, mosaic collections, and generous whitespace.',
        tags: ['editorial hero', 'mosaic', 'asymmetric'],
        presentation: {
            colors: palette({ accent: '#7f1d1d', accentHover: '#651515', accentSoft: '#e7c3b8', accentBg: '#fff7ed', accentStrong: '#450a0a', accentMuted: '#b45309', accentLight: '#fdba74', accentRing: '#ffedd5', background: '#fffdf8', foreground: '#241c18', surface: '#ffffff', border: '#e7e0d7', muted: '#786b61', dark: '#241c18', heroBackground: '#1c1917', footerBackground: '#1c1917' }),
            typography: { headingFont: 'Georgia', bodyFont: 'Georgia', baseSize: 17, headingWeight: '700' },
            layout: layout({ containerWidth: 'Full Width', spacing: 'Spacious', width: 'Full Width', desktopColumns: 3, gap: 'Editorial', alignment: 'Center', padding: 64, margin: 64 }), productGridStyle: 'Editorial',
            productCard: productCard({ style: 'Minimal', imageFit: 'Cover', aspectRatio: 'Portrait', imageRadius: 'Square', shadow: 'None', buttonShape: 'Square', showStock: false }),
            header: { variant: 'minimal', menuStyle: 'Mega' }, hero: { variant: 'editorial', overlayOpacity: 10, height: 'Tall' },
            mobile: { stickyCheckoutButton: true, compactHeader: false, showBottomNavigation: false },
            allProducts: { desktopColumns: 3, tabletColumns: 2, mobileColumns: 2, spacing: 'Spacious' }
        },
        homepageBlueprint: blueprint(
            { type: 'BrandStory', variant: 'editorial' },
            { type: 'CategoryList', variant: 'editorial', presentationSettings: { columns: 3, maxCategories: 6 } },
            { type: 'CollectionShowcase', variant: 'mosaic' },
            { type: 'FeaturedProducts', desktopColumns: 3 },
            { type: 'Reviews', variant: 'minimal' },
            { type: 'Newsletter', variant: 'minimal' }
        )
    }),
    defineTheme({
        id: 'luxury-jewellery', version: 2, name: 'Luxury Jewellery', industry: 'Jewellery', style: 'Luxury', thumbnailKey: 'luxury-jewellery',
        description: 'A centered luxury composition with restrained gold accents, curated collections, and spacious product cards.',
        tags: ['centered', 'curated', 'premium'],
        presentation: {
            colors: palette({ accent: '#b7791f', accentHover: '#8f5f17', accentSoft: '#f4d58d', accentBg: '#fff8e7', accentStrong: '#6b3f0b', accentMuted: '#d69e2e', accentLight: '#f6e05e', accentRing: '#fef3c7', background: '#0f0f12', foreground: '#f8fafc', surface: '#18181b', border: '#3f3f46', muted: '#a1a1aa', dark: '#09090b', heroBackground: '#09090b', footerBackground: '#09090b', footerText: '#a1a1aa', footerHeading: '#f8fafc', rating: '#f4d58d' }),
            typography: { headingFont: 'Georgia', bodyFont: 'Inter', baseSize: 16, headingWeight: '700' },
            layout: layout({ containerWidth: 'Narrow', spacing: 'Spacious', desktopColumns: 3, gap: 'Spacious', alignment: 'Center', padding: 64, margin: 64 }), productGridStyle: 'Spacious',
            productCard: productCard({ style: 'Premium', imageFit: 'Contain', aspectRatio: 'Square', imageRadius: 'Soft', shadow: 'Elevated', buttonShape: 'Pill', showStock: false }),
            header: { variant: 'centered', menuStyle: 'Simple' }, hero: { variant: 'centered', overlayOpacity: 18, height: 'Tall' },
            mobile: { stickyCheckoutButton: true, compactHeader: true, showBottomNavigation: true },
            allProducts: { desktopColumns: 3, tabletColumns: 2, mobileColumns: 2, spacing: 'Spacious' }
        },
        homepageBlueprint: blueprint(
            { type: 'CollectionShowcase', variant: 'spacious' },
            { type: 'CategoryList', variant: 'imageGrid', presentationSettings: { columns: 3, maxCategories: 6 } },
            { type: 'FeaturedProducts', desktopColumns: 3 },
            { type: 'BrandStory', variant: 'fullWidth' },
            { type: 'Reviews', variant: 'quote' },
            'TrustBadges',
            { type: 'Newsletter', variant: 'boxed' }
        )
    }),
    defineTheme({
        id: 'minimal-jewellery', version: 2, name: 'Minimal Jewellery', industry: 'Jewellery', style: 'Minimal', thumbnailKey: 'minimal-jewellery',
        description: 'A quiet gallery layout with a minimal hero, circular categories, and a focused three-column edit.',
        tags: ['minimal', 'gallery', 'focused'],
        presentation: {
            colors: palette({ accent: '#047857', accentHover: '#065f46', accentSoft: '#a7f3d0', accentBg: '#ecfdf5', accentStrong: '#064e3b', accentMuted: '#34d399', accentLight: '#6ee7b7', accentRing: '#d1fae5', background: '#fafafa', foreground: '#171717', surface: '#ffffff', border: '#e5e5e5', muted: '#737373', dark: '#171717', footerBackground: '#f5f5f5', footerText: '#737373', footerHeading: '#171717' }),
            typography: { headingFont: 'Georgia', bodyFont: 'Inter', baseSize: 16, headingWeight: '700' },
            layout: layout({ containerWidth: 'Narrow', spacing: 'Spacious', desktopColumns: 3, gap: 'Spacious', padding: 56, margin: 56 }), productGridStyle: 'Spacious',
            productCard: productCard({ style: 'Minimal', imageFit: 'Contain', imageRadius: 'Soft', shadow: 'None', showCategory: false, showStock: false }),
            header: { variant: 'minimal', menuStyle: 'Simple' }, hero: { variant: 'minimal', overlayOpacity: 5, height: 'Compact' },
            mobile: { stickyCheckoutButton: true, compactHeader: true, showBottomNavigation: false },
            allProducts: { desktopColumns: 3, tabletColumns: 2, mobileColumns: 2, spacing: 'Spacious' }
        },
        homepageBlueprint: blueprint(
            { type: 'FeaturedProducts', desktopColumns: 3 },
            { type: 'CategoryList', variant: 'circles', presentationSettings: { columns: 3, maxCategories: 6 } },
            { type: 'BrandStory', variant: 'standard' },
            { type: 'Reviews', variant: 'minimal' }
        )
    }),
    defineTheme({
        id: 'soft-beauty', version: 2, name: 'Soft Beauty', industry: 'Beauty', style: 'Soft', thumbnailKey: 'soft-beauty',
        description: 'A soft split hero, circular discovery, portrait products, and story-led beauty merchandising.',
        tags: ['soft', 'portrait', 'story-led'],
        presentation: {
            colors: palette({ accent: '#c0266d', accentHover: '#9d174d', accentSoft: '#fbcfe8', accentBg: '#fdf2f8', accentStrong: '#831843', accentMuted: '#f472b6', accentLight: '#f9a8d4', accentRing: '#fce7f3', background: '#fffafb', foreground: '#3f2733', surface: '#ffffff', border: '#f2dbe6', muted: '#8a6074', dark: '#3f2733', heroBackground: '#6b2748', footerBackground: '#3f2733', footerText: '#f3dce7', footerHeading: '#ffffff' }),
            typography: { headingFont: 'Georgia', bodyFont: 'Arial', baseSize: 16, headingWeight: '700' },
            layout: layout({ containerWidth: 'Standard', spacing: 'Spacious', desktopColumns: 3, gap: 'Comfortable', padding: 48, margin: 48 }), productGridStyle: 'Comfortable',
            productCard: productCard({ style: 'Modern', imageFit: 'Contain', aspectRatio: 'Portrait', imageRadius: 'Rounded', shadow: 'Soft', buttonShape: 'Pill' }),
            header: { variant: 'centered', menuStyle: 'Nested' }, hero: { variant: 'split', overlayOpacity: 8, height: 'Medium' },
            mobile: { stickyCheckoutButton: true, compactHeader: true, showBottomNavigation: true },
            allProducts: { desktopColumns: 3, tabletColumns: 2, mobileColumns: 2, spacing: 'Comfortable' }
        },
        homepageBlueprint: blueprint(
            { type: 'CategoryList', variant: 'circles', presentationSettings: { columns: 4, maxCategories: 8 } },
            { type: 'FeaturedProducts', desktopColumns: 3 },
            { type: 'Banner', variant: 'split' },
            { type: 'BrandStory', variant: 'imageRight' },
            { type: 'Reviews', variant: 'cards' },
            'FAQ',
            { type: 'Newsletter', variant: 'boxed' }
        )
    }),
    defineTheme({
        id: 'modern-electronics', version: 2, name: 'Modern Electronics', industry: 'Electronics', style: 'Modern', thumbnailKey: 'modern-electronics',
        description: 'A compact split hero and dense four-column catalogue built for quick technical comparison.',
        tags: ['split hero', 'technical', 'dense'],
        presentation: {
            colors: palette({ accent: '#2563eb', accentHover: '#1d4ed8', accentSoft: '#bfdbfe', accentBg: '#eff6ff', accentStrong: '#1e3a8a', accentMuted: '#60a5fa', accentLight: '#93c5fd', accentRing: '#dbeafe', background: '#f8fafc', foreground: '#0f172a', surface: '#ffffff', border: '#cbd5e1', muted: '#64748b', dark: '#0f172a', heroBackground: '#0f172a', footerBackground: '#0f172a' }),
            typography: { headingFont: 'Inter', bodyFont: 'Roboto', baseSize: 15, headingWeight: '800' },
            layout: layout({ containerWidth: 'Wide', spacing: 'Compact', desktopColumns: 4, gap: 'Compact', padding: 32, margin: 32 }), productGridStyle: 'Compact',
            productCard: productCard({ style: 'Modern', imageFit: 'Contain', imageRadius: 'Soft', shadow: 'Soft', buttonShape: 'Soft', titleSize: 'Small', showStock: true }),
            header: { variant: 'standard', menuStyle: 'Mega' }, hero: { variant: 'split', overlayOpacity: 12, height: 'Compact' },
            mobile: { stickyCheckoutButton: true, compactHeader: true, showBottomNavigation: true },
            allProducts: { desktopColumns: 4, tabletColumns: 3, mobileColumns: 2, spacing: 'Compact' }
        },
        homepageBlueprint: blueprint(
            { type: 'CategoryList', variant: 'cards' },
            'FeaturedProducts',
            { type: 'PromoBlock', variant: 'strip' },
            { type: 'CollectionShowcase', variant: 'grid' },
            'TrustBadges',
            'FAQ'
        )
    }),
    defineTheme({
        id: 'fresh-grocery', version: 2, name: 'Fresh Grocery', industry: 'Grocery', style: 'Fresh', thumbnailKey: 'fresh-grocery',
        description: 'A friendly centered hero, circular aisles, visible stock, and compact everyday shopping flow.',
        tags: ['centered hero', 'fresh', 'compact'],
        presentation: {
            colors: palette({ accent: '#15803d', accentHover: '#166534', accentSoft: '#bbf7d0', accentBg: '#f0fdf4', accentStrong: '#14532d', accentMuted: '#4ade80', accentLight: '#86efac', accentRing: '#dcfce7', background: '#f7fee7', foreground: '#1a2e1f', surface: '#ffffff', border: '#d9e8c6', muted: '#5f735f', dark: '#15351f', heroBackground: '#14532d', footerBackground: '#15351f', footerText: '#d8eadb', footerHeading: '#ffffff', sale: '#ea580c' }),
            typography: { headingFont: 'Arial', bodyFont: 'Inter', baseSize: 16, headingWeight: '800' },
            layout: layout({ containerWidth: 'Wide', spacing: 'Comfortable', desktopColumns: 4, gap: 'Compact', padding: 36, margin: 36 }), productGridStyle: 'Compact',
            productCard: productCard({ style: 'Modern', imageFit: 'Contain', imageRadius: 'Rounded', shadow: 'Soft', buttonShape: 'Pill', showRating: false, showStock: true }),
            header: { variant: 'standard', menuStyle: 'Nested' }, hero: { variant: 'centered', overlayOpacity: 7, height: 'Compact' },
            mobile: { stickyCheckoutButton: true, compactHeader: true, showBottomNavigation: true },
            allProducts: { desktopColumns: 4, tabletColumns: 3, mobileColumns: 2, spacing: 'Compact' }
        },
        homepageBlueprint: blueprint(
            { type: 'CategoryList', variant: 'circles' },
            'FeaturedProducts',
            { type: 'PromoBlock', variant: 'split' },
            { type: 'CollectionShowcase', variant: 'spacious' },
            'TrustBadges',
            { type: 'Newsletter', variant: 'fullWidth' }
        )
    })
];

const PREBUILT_THEMES = deepFreeze(themes);
const PREBUILT_THEME_BY_ID = new Map(PREBUILT_THEMES.map(theme => [theme.id, theme]));

const getPrebuiltThemes = ({ includeHidden = false } = {}) => PREBUILT_THEMES.filter(theme => includeHidden || theme.status === 'active');
const getPrebuiltTheme = (presetId) => PREBUILT_THEME_BY_ID.get(String(presetId || '').trim().toLowerCase()) || null;

const createUniqueSectionId = ({ preset, type, usedIds, createSectionId }) => {
    let attempt = 0;
    while (attempt < 100) {
        attempt += 1;
        const proposed = typeof createSectionId === 'function'
            ? createSectionId(type)
            : `${preset.id}-${String(type).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${attempt}`;
        const candidate = String(proposed || '').slice(0, 80);
        if (candidate && !usedIds.has(candidate)) {
            usedIds.add(candidate);
            return candidate;
        }
    }
    throw new Error('Unable to create a unique Store Builder section ID.');
};

const normalizeUniqueExistingSections = ({ sections, preset, createSectionId }) => {
    const usedIds = new Set();
    return sections.map(section => {
        const currentId = String(section?.id || '').slice(0, 80);
        if (currentId && !usedIds.has(currentId)) {
            usedIds.add(currentId);
            return section;
        }
        return {
            ...section,
            id: createUniqueSectionId({ preset, type: section.type || 'section', usedIds, createSectionId })
        };
    });
};

const AUTOMATICALLY_SAFE_SECTION_TYPES = new Set(['FeaturedProducts', 'CategoryList']);

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const hasItems = (value) => Array.isArray(value) && value.some(item => (
    typeof item === 'string' ? hasText(item) : Boolean(item && typeof item === 'object')
));

const hasCustomTitle = (section) => {
    const title = String(section?.title || '').trim();
    const defaultTitle = String(SECTION_REGISTRY[section?.type]?.label || '').trim();
    return Boolean(title) && title.toLowerCase() !== defaultTitle.toLowerCase();
};

const hasMerchantSectionContent = (section = {}) => {
    const settings = section.settings || {};
    switch (section.type) {
        case 'Reviews':
            return hasText(settings.text) || hasItems(settings.reviewIds);
        case 'FAQ':
        case 'TrustBadges':
        case 'BrandStory':
            return hasText(settings.text);
        case 'Newsletter':
        case 'PromoBlock':
        case 'TextBlock':
        case 'BrandShowcase':
            return hasText(settings.text) || hasCustomTitle(section);
        case 'Banner':
            return hasText(settings.desktopImage)
                || hasText(settings.mobileImage)
                || hasItems(settings.desktopImages)
                || hasItems(settings.mobileImages)
                || hasText(settings.title)
                || hasText(settings.subtitle)
                || hasCustomTitle(section);
        case 'Collection':
        case 'CollectionShowcase':
            return hasItems(settings.productIds) || hasItems(settings.source?.productIds);
        default:
            return false;
    }
};

const shouldEnableBlueprintSection = ({ section, blueprintItem }) => {
    if (blueprintItem?.isEnabled === false) return false;
    if (AUTOMATICALLY_SAFE_SECTION_TYPES.has(section.type)) return true;
    return hasMerchantSectionContent(section);
};

const buildHomepageSections = ({ currentTheme, preset, createSectionId }) => {
    const existing = normalizeUniqueExistingSections({
        sections: cloneTheme(currentTheme.homepageSections || []),
        preset,
        createSectionId
    });
    const usedIds = new Set(existing.map(section => String(section.id)));
    const consumed = new Set();
    const ordered = preset.homepageBlueprint.map(item => {
        const existingIndex = existing.findIndex((section, index) => !consumed.has(index) && section.type === item.type);
        if (existingIndex >= 0) {
            consumed.add(existingIndex);
            const section = existing[existingIndex];
            const resolvedSection = {
                ...section,
                settings: { ...(section.settings || {}), ...(item.presentationSettings || {}) },
                desktopSettings: { ...(section.desktopSettings || {}), ...(item.desktopSettings || {}) },
                mobileSettings: { ...(section.mobileSettings || {}), ...(item.mobileSettings || {}) }
            };
            return {
                ...resolvedSection,
                isEnabled: shouldEnableBlueprintSection({ section: resolvedSection, blueprintItem: item })
            };
        }

        const generated = createDefaultSection(item.type, {
            id: createUniqueSectionId({ preset, type: item.type, usedIds, createSectionId }),
            settings: {
                ...cloneTheme(SECTION_REGISTRY[item.type]?.defaultSettings || {}),
                ...(item.presentationSettings || {})
            },
            desktopSettings: { isVisible: true, ...(item.desktopSettings || {}) },
            mobileSettings: { isVisible: true, ...(item.mobileSettings || {}) }
        });
        return generated && {
            ...generated,
            isEnabled: shouldEnableBlueprintSection({ section: generated, blueprintItem: item })
        };
    }).filter(Boolean);

    const presetTypes = new Set(preset.homepageBlueprint.map(item => item.type));
    existing.forEach((section, index) => {
        if (consumed.has(index)) return;
        ordered.push(presetTypes.has(section.type)
            ? { ...section, isEnabled: false }
            : section);
    });

    return ordered.map((section, index) => ({ ...section, sortOrder: index }));
};

const applyPresentation = ({ currentTheme, preset, createSectionId, appliedAt }) => {
    const presentation = preset.presentation;
    const candidate = {
        ...cloneTheme(currentTheme),
        preset: { id: preset.id, version: preset.version, appliedAt },
        fontFamily: presentation.typography.bodyFont,
        productGridStyle: presentation.productGridStyle,
        colors: cloneTheme(presentation.colors),
        header: { ...(currentTheme.header || {}), ...presentation.header, logoPosition: 'Left' },
        typography: cloneTheme(presentation.typography),
        hero: { ...(currentTheme.hero || {}), ...presentation.hero },
        layout: cloneTheme(presentation.layout),
        productCard: cloneTheme(presentation.productCard),
        mobile: cloneTheme(presentation.mobile),
        allProducts: {
            ...(currentTheme.allProducts || {}),
            ...presentation.allProducts,
            title: currentTheme.allProducts?.title,
            subtitle: currentTheme.allProducts?.subtitle,
            isEnabled: currentTheme.allProducts?.isEnabled
        },
        homepageSections: buildHomepageSections({ currentTheme, preset, createSectionId }),
        // Merchant-owned content is always carried across unchanged.
        logoUrl: currentTheme.logoUrl,
        faviconUrl: currentTheme.faviconUrl,
        navigation: cloneTheme(currentTheme.navigation),
        footer: cloneTheme(currentTheme.footer),
        policies: cloneTheme(currentTheme.policies),
        seo: cloneTheme(currentTheme.seo),
        paymentSettings: cloneTheme(currentTheme.paymentSettings),
        checkoutBranding: cloneTheme(currentTheme.checkoutBranding),
        migrations: cloneTheme(currentTheme.migrations)
    };
    return normalizeTheme(candidate);
};

const applyLimitedPlanBoundary = ({ currentTheme, resolvedTheme }) => normalizeTheme({
    ...resolvedTheme,
    header: {
        ...(resolvedTheme.header || {}),
        variant: currentTheme.header?.variant
    },
    hero: {
        ...(resolvedTheme.hero || {}),
        variant: currentTheme.hero?.variant
    },
    productGridStyle: currentTheme.productGridStyle,
    layout: cloneTheme(currentTheme.layout),
    homepageSections: cloneTheme(currentTheme.homepageSections),
    migrations: cloneTheme(currentTheme.migrations)
});

const resolvePrebuiltTheme = ({
    currentTheme = FALLBACK_THEME,
    presetId,
    planAccess = { storeBuilderAccess: 'full' },
    createSectionId,
    appliedAt = new Date().toISOString()
} = {}) => {
    const preset = getPrebuiltTheme(presetId);
    if (!preset) {
        const error = new Error('Unknown prebuilt storefront theme.');
        error.code = 'PREBUILT_THEME_NOT_FOUND';
        throw error;
    }
    const access = planAccess?.storeBuilderAccess || 'full';
    if (access === 'none') {
        const error = new Error('Prebuilt storefront themes are not available on the current plan.');
        error.code = 'PREBUILT_THEME_NOT_AVAILABLE';
        throw error;
    }

    const normalizedCurrent = normalizeTheme(currentTheme);
    const resolved = applyPresentation({
        currentTheme: normalizedCurrent,
        preset,
        createSectionId,
        appliedAt: String(appliedAt || new Date().toISOString()).slice(0, 40)
    });
    const planSafeTheme = access === 'full'
        ? resolved
        : applyLimitedPlanBoundary({ currentTheme: normalizedCurrent, resolvedTheme: resolved });
    const validation = validateTheme(planSafeTheme);
    if (!validation.valid) {
        const error = new Error(validation.errors[0]?.message || 'The resolved storefront theme is invalid.');
        error.code = 'PREBUILT_THEME_INVALID';
        error.validation = validation.errors;
        throw error;
    }
    return planSafeTheme;
};

const validatePrebuiltThemeRegistry = () => {
    const errors = [];
    const ids = new Set();
    PREBUILT_THEMES.forEach((theme, index) => {
        const path = `themes.${index}`;
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(theme.id)) errors.push({ path: `${path}.id`, message: 'Theme ID must be a lowercase slug.' });
        if (ids.has(theme.id)) errors.push({ path: `${path}.id`, message: `Duplicate theme ID: ${theme.id}` });
        ids.add(theme.id);
        if (!theme.name || !theme.description || !theme.industry || !theme.style || !theme.thumbnailKey) errors.push({ path, message: 'Theme metadata is incomplete.' });
        if (!Number.isInteger(theme.version) || theme.version < 1) errors.push({ path: `${path}.version`, message: 'Theme version must be a positive integer.' });
        if (!['active', 'hidden', 'deprecated'].includes(theme.status)) errors.push({ path: `${path}.status`, message: 'Theme status is unsupported.' });
        if (!SUPPORTED_INDUSTRIES.has(theme.industry)) errors.push({ path: `${path}.industry`, message: `Unsupported theme industry: ${theme.industry}` });
        if (!SUPPORTED_STYLES.has(theme.style)) errors.push({ path: `${path}.style`, message: `Unsupported theme style: ${theme.style}` });
        if (!SUPPORTED_FONTS.has(theme.presentation.typography?.headingFont) || !SUPPORTED_FONTS.has(theme.presentation.typography?.bodyFont)) errors.push({ path: `${path}.presentation.typography`, message: 'Theme typography uses an unsupported font.' });
        if (!SUPPORTED_CARD_STYLES.has(theme.presentation.productCard?.style)) errors.push({ path: `${path}.presentation.productCard.style`, message: 'Theme product card style is unsupported.' });
        Object.keys(theme.presentation).forEach(key => {
            if (!SUPPORTED_PRESENTATION_KEYS.has(key)) errors.push({ path: `${path}.presentation.${key}`, message: `Unsupported presentation group: ${key}` });
        });
        const validateColors = (value, colorPath) => Object.entries(value || {}).forEach(([key, color]) => {
            const nextPath = `${colorPath}.${key}`;
            if (color && typeof color === 'object') validateColors(color, nextPath);
            else if (!HEX_COLOR.test(String(color || ''))) errors.push({ path: nextPath, message: 'Preset colors must use valid hex values.' });
        });
        validateColors(theme.presentation.colors, `${path}.presentation.colors`);
        if (!['Compact', 'Comfortable', 'Spacious', 'Editorial'].includes(theme.presentation.productGridStyle)) errors.push({ path: `${path}.presentation.productGridStyle`, message: 'Theme product grid style is unsupported.' });
        theme.homepageBlueprint.forEach((section, sectionIndex) => {
            if (!SECTION_REGISTRY[section.type]) errors.push({ path: `${path}.homepageBlueprint.${sectionIndex}`, message: `Unsupported section type: ${section.type}` });
        });
        try {
            const resolved = resolvePrebuiltTheme({
                currentTheme: FALLBACK_THEME,
                presetId: theme.id,
                appliedAt: '2026-01-01T00:00:00.000Z'
            });
            const validation = validateTheme(resolved);
            if (!validation.valid) validation.errors.forEach(error => errors.push({ path: `${path}.${error.path}`, message: error.message }));
        } catch (error) {
            errors.push({ path, message: error.message });
        }
    });
    if (PREBUILT_THEMES.length !== 9) errors.push({ path: 'themes', message: 'The production catalog must contain exactly nine themes.' });
    return { valid: errors.length === 0, errors };
};

module.exports = {
    PREBUILT_THEME_CATALOG_VERSION,
    PREBUILT_THEMES,
    getPrebuiltThemes,
    getPrebuiltTheme,
    resolvePrebuiltTheme,
    validatePrebuiltThemeRegistry
};
