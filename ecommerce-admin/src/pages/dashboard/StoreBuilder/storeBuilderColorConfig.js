import { isHexColor } from './storeBuilderThemeUtils.js';

export const colorPalettePresets = [
    {
        name: 'Emerald Fresh',
        swatches: ['#0f766e', '#ecfdf5', '#0f172a'],
        colors: {
            accent: '#0f766e',
            accentHover: '#115e59',
            accentSoft: '#99f6e4',
            accentBg: '#ecfdf5',
            accentStrong: '#042f2e',
            accentMuted: '#14b8a6',
            accentLight: '#5eead4',
            accentRing: '#ccfbf1',
            primaryButtonBg: '#0f766e',
            primaryButtonHoverBg: '#115e59',
            navbarHover: '#0f766e',
            cardHoverBorder: '#99f6e4'
        }
    },
    {
        name: 'Royal Blue',
        swatches: ['#2563eb', '#eff6ff', '#111827'],
        colors: { accent: '#2563eb', accentHover: '#1d4ed8', accentSoft: '#bfdbfe', accentBg: '#eff6ff', accentStrong: '#1e3a8a', accentMuted: '#60a5fa', accentLight: '#93c5fd', accentRing: '#dbeafe', primaryButtonBg: '#2563eb', primaryButtonHoverBg: '#1d4ed8', navbarHover: '#2563eb', cardHoverBorder: '#bfdbfe' }
    },
    {
        name: 'Purple Premium',
        swatches: ['#7c3aed', '#f5f3ff', '#111827'],
        colors: { accent: '#7c3aed', accentHover: '#6d28d9', accentSoft: '#ddd6fe', accentBg: '#f5f3ff', accentStrong: '#4c1d95', accentMuted: '#a78bfa', accentLight: '#c4b5fd', accentRing: '#ede9fe', primaryButtonBg: '#7c3aed', primaryButtonHoverBg: '#6d28d9', navbarHover: '#7c3aed', cardHoverBorder: '#ddd6fe' }
    },
    {
        name: 'Rose Boutique',
        swatches: ['#e11d48', '#fff1f2', '#111827'],
        colors: { accent: '#e11d48', accentHover: '#be123c', accentSoft: '#fecdd3', accentBg: '#fff1f2', accentStrong: '#881337', accentMuted: '#fb7185', accentLight: '#fda4af', accentRing: '#ffe4e6', primaryButtonBg: '#e11d48', primaryButtonHoverBg: '#be123c', navbarHover: '#e11d48', cardHoverBorder: '#fecdd3' }
    },
    {
        name: 'Amber Warm',
        swatches: ['#d97706', '#fffbeb', '#111827'],
        colors: { accent: '#d97706', accentHover: '#b45309', accentSoft: '#fde68a', accentBg: '#fffbeb', accentStrong: '#78350f', accentMuted: '#f59e0b', accentLight: '#fcd34d', accentRing: '#fef3c7', primaryButtonBg: '#d97706', primaryButtonHoverBg: '#b45309', navbarHover: '#d97706', cardHoverBorder: '#fde68a' }
    },
    {
        name: 'Slate Minimal',
        swatches: ['#334155', '#f8fafc', '#0f172a'],
        colors: { accent: '#334155', accentHover: '#1e293b', accentSoft: '#cbd5e1', accentBg: '#f8fafc', accentStrong: '#0f172a', accentMuted: '#64748b', accentLight: '#94a3b8', accentRing: '#e2e8f0', primaryButtonBg: '#0f172a', primaryButtonHoverBg: '#1e293b', navbarHover: '#334155', cardHoverBorder: '#cbd5e1' }
    },
    {
        name: 'Luxury Black',
        swatches: ['#020617', '#f8fafc', '#d4af37'],
        colors: { accent: '#020617', accentHover: '#111827', accentSoft: '#d4af37', accentBg: '#f8fafc', accentStrong: '#000000', accentMuted: '#475569', accentLight: '#94a3b8', accentRing: '#e2e8f0', primaryButtonBg: '#020617', primaryButtonHoverBg: '#111827', navbarHover: '#d4af37', cardHoverBorder: '#d4af37', priceColor: '#020617' }
    },
    {
        name: 'Clean White',
        swatches: ['#111827', '#ffffff', '#e5e7eb'],
        colors: { accent: '#111827', accentHover: '#030712', accentSoft: '#e5e7eb', accentBg: '#ffffff', accentStrong: '#030712', accentMuted: '#6b7280', accentLight: '#d1d5db', accentRing: '#f3f4f6', primaryButtonBg: '#111827', primaryButtonHoverBg: '#030712', navbarHover: '#111827', cardHoverBorder: '#e5e7eb', background: '#ffffff', foreground: '#111827' }
    },
    {
        name: 'Ocean Teal',
        swatches: ['#0e7490', '#ecfeff', '#083344'],
        colors: { accent: '#0e7490', accentHover: '#155e75', accentSoft: '#a5f3fc', accentBg: '#ecfeff', accentStrong: '#083344', accentMuted: '#06b6d4', accentLight: '#67e8f9', accentRing: '#cffafe', primaryButtonBg: '#0e7490', primaryButtonHoverBg: '#155e75', navbarHover: '#0e7490', cardHoverBorder: '#a5f3fc' }
    },
    {
        name: 'Chocolate Brown',
        swatches: ['#7c2d12', '#fff7ed', '#431407'],
        colors: { accent: '#7c2d12', accentHover: '#9a3412', accentSoft: '#fed7aa', accentBg: '#fff7ed', accentStrong: '#431407', accentMuted: '#c2410c', accentLight: '#fdba74', accentRing: '#ffedd5', primaryButtonBg: '#7c2d12', primaryButtonHoverBg: '#9a3412', navbarHover: '#7c2d12', cardHoverBorder: '#fed7aa' }
    },
    {
        name: 'Gold Luxury',
        swatches: ['#b45309', '#fffbeb', '#111827'],
        colors: { accent: '#b45309', accentHover: '#92400e', accentSoft: '#fde68a', accentBg: '#fffbeb', accentStrong: '#78350f', accentMuted: '#f59e0b', accentLight: '#fcd34d', accentRing: '#fef3c7', primaryButtonBg: '#111827', primaryButtonHoverBg: '#030712', navbarHover: '#b45309', cardHoverBorder: '#f59e0b', priceColor: '#b45309' }
    },
    {
        name: 'Soft Pink',
        swatches: ['#db2777', '#fdf2f8', '#831843'],
        colors: { accent: '#db2777', accentHover: '#be185d', accentSoft: '#fbcfe8', accentBg: '#fdf2f8', accentStrong: '#831843', accentMuted: '#f472b6', accentLight: '#f9a8d4', accentRing: '#fce7f3', primaryButtonBg: '#db2777', primaryButtonHoverBg: '#be185d', navbarHover: '#db2777', cardHoverBorder: '#fbcfe8' }
    },
    {
        name: 'Deep Navy',
        swatches: ['#1e3a8a', '#eff6ff', '#020617'],
        colors: { accent: '#1e3a8a', accentHover: '#1e40af', accentSoft: '#bfdbfe', accentBg: '#eff6ff', accentStrong: '#172554', accentMuted: '#3b82f6', accentLight: '#93c5fd', accentRing: '#dbeafe', primaryButtonBg: '#1e3a8a', primaryButtonHoverBg: '#1e40af', navbarHover: '#1e3a8a', cardHoverBorder: '#bfdbfe' }
    },
    {
        name: 'Red Sale',
        swatches: ['#dc2626', '#fef2f2', '#7f1d1d'],
        colors: { accent: '#dc2626', accentHover: '#b91c1c', accentSoft: '#fecaca', accentBg: '#fef2f2', accentStrong: '#7f1d1d', accentMuted: '#f87171', accentLight: '#fca5a5', accentRing: '#fee2e2', primaryButtonBg: '#dc2626', primaryButtonHoverBg: '#b91c1c', navbarHover: '#dc2626', cardHoverBorder: '#fecaca', saleBadgeBg: '#dc2626' }
    },
    {
        name: 'Green Organic',
        swatches: ['#15803d', '#f0fdf4', '#14532d'],
        colors: { accent: '#15803d', accentHover: '#166534', accentSoft: '#bbf7d0', accentBg: '#f0fdf4', accentStrong: '#14532d', accentMuted: '#22c55e', accentLight: '#86efac', accentRing: '#dcfce7', primaryButtonBg: '#15803d', primaryButtonHoverBg: '#166534', navbarHover: '#15803d', cardHoverBorder: '#bbf7d0' }
    },
    {
        name: 'Mono Gray',
        swatches: ['#404040', '#fafafa', '#171717'],
        colors: { accent: '#404040', accentHover: '#262626', accentSoft: '#d4d4d4', accentBg: '#fafafa', accentStrong: '#171717', accentMuted: '#737373', accentLight: '#a3a3a3', accentRing: '#e5e5e5', primaryButtonBg: '#171717', primaryButtonHoverBg: '#000000', navbarHover: '#404040', cardHoverBorder: '#d4d4d4', background: '#ffffff', foreground: '#171717' }
    }
];

const hexToRgb = (hex = '') => {
    if (!isHexColor(hex)) return null;
    let clean = hex.replace('#', '');
    if (clean.length === 3) clean = clean.split('').map(char => `${char}${char}`).join('');
    return {
        r: parseInt(clean.slice(0, 2), 16),
        g: parseInt(clean.slice(2, 4), 16),
        b: parseInt(clean.slice(4, 6), 16)
    };
};

const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;

const mixHex = (from, to, amount) => {
    const fromRgb = hexToRgb(from);
    const toRgb = hexToRgb(to);
    if (!fromRgb || !toRgb) return from;
    return rgbToHex({
        r: fromRgb.r + (toRgb.r - fromRgb.r) * amount,
        g: fromRgb.g + (toRgb.g - fromRgb.g) * amount,
        b: fromRgb.b + (toRgb.b - fromRgb.b) * amount
    });
};

export const buildBrandColorSet = (brandColor) => ({
    accent: brandColor,
    accentHover: mixHex(brandColor, '#000000', 0.18),
    accentSoft: mixHex(brandColor, '#ffffff', 0.68),
    accentBg: mixHex(brandColor, '#ffffff', 0.92),
    accentStrong: mixHex(brandColor, '#000000', 0.62),
    accentMuted: mixHex(brandColor, '#ffffff', 0.28),
    accentLight: mixHex(brandColor, '#ffffff', 0.45),
    accentRing: mixHex(brandColor, '#ffffff', 0.82),
    primaryButtonBg: brandColor,
    primaryButtonHoverBg: mixHex(brandColor, '#000000', 0.18),
    navbarHover: brandColor,
    cardHoverBorder: mixHex(brandColor, '#ffffff', 0.68),
    brand: {
        primary: brandColor,
        accent: brandColor,
        hover: mixHex(brandColor, '#000000', 0.18),
        soft: mixHex(brandColor, '#ffffff', 0.92),
        ring: mixHex(brandColor, '#ffffff', 0.82)
    },
    header: {
        hover: brandColor,
        cartBadgeBackground: brandColor
    },
    hero: {
        primaryButtonBackground: '#ffffff',
        primaryButtonText: mixHex(brandColor, '#000000', 0.74),
        secondaryButtonBackground: brandColor,
        secondaryButtonText: '#ffffff'
    },
    productCard: {
        price: mixHex(brandColor, '#000000', 0.58),
        saleBadgeBackground: mixHex(brandColor, '#000000', 0.08),
        ratingStar: '#f59e0b',
        wishlistActive: '#e11d48',
        addToCartBackground: brandColor,
        addToCartText: '#ffffff',
        buyNowBackground: mixHex(brandColor, '#000000', 0.65),
        buyNowText: '#ffffff',
        variantChipSelectedBackground: brandColor,
        variantChipSelectedText: '#ffffff'
    },
    allProducts: {
        paginationActiveBackground: brandColor,
        paginationActiveText: '#ffffff'
    },
    sections: {
        trustIcon: brandColor
    },
    footer: {
        linkHover: brandColor
    },
    checkout: {
        buttonBackground: mixHex(brandColor, '#000000', 0.65),
        buttonText: '#ffffff',
        accent: brandColor,
        inputFocus: brandColor,
        success: '#047857'
    }
});

export const mergeColorUpdates = (current = {}, updates = {}) => Object.entries(updates || {}).reduce((acc, [key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        acc[key] = mergeColorUpdates(acc[key] || {}, value);
    } else {
        acc[key] = value;
    }
    return acc;
}, { ...(current || {}) });

export const getColorPathValue = (colors = {}, path = '') => path.split('.').reduce((acc, key) => acc?.[key], colors);

export const setColorPathValue = (colors = {}, path = '', value) => {
    const [group, key] = path.split('.');
    if (!group || !key) return { ...(colors || {}), [path]: value };
    return {
        ...(colors || {}),
        [group]: {
            ...(colors?.[group] || {}),
            [key]: value
        }
    };
};

const flattenNestedColorFields = (groups = []) => groups.flatMap(group => group.fields.map(field => ({ ...field, groupId: group.id, groupTitle: group.title })));

export const contrastRatio = (foreground, background) => {
    const toLinear = (value) => {
        const channel = value / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (hex) => {
        const rgb = hexToRgb(hex);
        if (!rgb) return null;
        return (0.2126 * toLinear(rgb.r)) + (0.7152 * toLinear(rgb.g)) + (0.0722 * toLinear(rgb.b));
    };
    const fg = luminance(foreground);
    const bg = luminance(background);
    if (fg === null || bg === null) return null;
    const lighter = Math.max(fg, bg);
    const darker = Math.min(fg, bg);
    return (lighter + 0.05) / (darker + 0.05);
};

export const colorSectionGroups = [
    {
        id: 'brand',
        title: 'Brand Colors',
        description: 'Core colors used for links, highlights, focus rings, and trusted accents.',
        fields: [
            { path: 'brand.primary', label: 'Main brand color', help: 'Used for primary accents and key actions.' },
            { path: 'brand.secondary', label: 'Secondary brand color', help: 'A strong supporting color for contrast.' },
            { path: 'brand.accent', label: 'Accent color', help: 'Highlights links, chips, and small UI details.' },
            { path: 'brand.hover', label: 'Hover color', help: 'Used when customers hover over buttons or links.' },
            { path: 'brand.soft', label: 'Soft brand background', help: 'Light brand tint for cards and badges.' },
            { path: 'brand.ring', label: 'Focus ring color', help: 'Accessibility highlight for focused inputs.' }
        ]
    },
    {
        id: 'header',
        title: 'Header / Navbar',
        description: 'Controls the top navigation, search, icons, and cart badge.',
        fields: [
            { path: 'header.background', label: 'Header background' },
            { path: 'header.text', label: 'Header text', contrastWith: 'header.background' },
            { path: 'header.mutedText', label: 'Subtitle text', contrastWith: 'header.background' },
            { path: 'header.icon', label: 'Header icons', contrastWith: 'header.background' },
            { path: 'header.border', label: 'Header border' },
            { path: 'header.hover', label: 'Nav hover color' },
            { path: 'header.cartBadgeBackground', label: 'Cart badge background' },
            { path: 'header.cartBadgeText', label: 'Cart badge text', contrastWith: 'header.cartBadgeBackground' }
        ]
    },
    {
        id: 'hero',
        title: 'Hero / Banner',
        description: 'Controls hero text, fallback background, and call-to-action buttons.',
        fields: [
            { path: 'hero.background', label: 'Hero fallback background' },
            { path: 'hero.title', label: 'Hero title', contrastWith: 'hero.background' },
            { path: 'hero.subtitle', label: 'Hero subtitle', contrastWith: 'hero.background' },
            { path: 'hero.primaryButtonBackground', label: 'Primary button background' },
            { path: 'hero.primaryButtonText', label: 'Primary button text', contrastWith: 'hero.primaryButtonBackground' },
            { path: 'hero.secondaryButtonBackground', label: 'Secondary button background' },
            { path: 'hero.secondaryButtonText', label: 'Secondary button text', contrastWith: 'hero.secondaryButtonBackground' }
        ]
    },
    {
        id: 'productCard',
        title: 'Product Cards',
        description: 'Controls catalog card backgrounds, prices, badges, stock, and action buttons.',
        fields: [
            { path: 'productCard.background', label: 'Card background' },
            { path: 'productCard.border', label: 'Card border' },
            { path: 'productCard.title', label: 'Product title', contrastWith: 'productCard.background' },
            { path: 'productCard.category', label: 'Category text', contrastWith: 'productCard.background' },
            { path: 'productCard.price', label: 'Price color', contrastWith: 'productCard.background' },
            { path: 'productCard.compareAtPrice', label: 'Compare-at price' },
            { path: 'productCard.saleBadgeBackground', label: 'Sale badge background' },
            { path: 'productCard.saleBadgeText', label: 'Sale badge text', contrastWith: 'productCard.saleBadgeBackground' },
            { path: 'productCard.ratingStar', label: 'Rating stars' },
            { path: 'productCard.ratingText', label: 'Rating text' },
            { path: 'productCard.wishlistIcon', label: 'Wishlist icon' },
            { path: 'productCard.wishlistActive', label: 'Wishlist active' },
            { path: 'productCard.addToCartBackground', label: 'Add to Cart background' },
            { path: 'productCard.addToCartText', label: 'Add to Cart text', contrastWith: 'productCard.addToCartBackground' },
            { path: 'productCard.buyNowBackground', label: 'Buy Now background' },
            { path: 'productCard.buyNowText', label: 'Buy Now text', contrastWith: 'productCard.buyNowBackground' },
            { path: 'productCard.outOfStockBackground', label: 'Out-of-stock background' },
            { path: 'productCard.outOfStockText', label: 'Out-of-stock text', contrastWith: 'productCard.outOfStockBackground' },
            { path: 'productCard.variantChipBackground', label: 'Variant chip background' },
            { path: 'productCard.variantChipText', label: 'Variant chip text', contrastWith: 'productCard.variantChipBackground' },
            { path: 'productCard.variantChipSelectedBackground', label: 'Selected variant background' },
            { path: 'productCard.variantChipSelectedText', label: 'Selected variant text', contrastWith: 'productCard.variantChipSelectedBackground' }
        ]
    },
    {
        id: 'allProducts',
        title: 'All Products Section',
        description: 'Controls catalog section title, filters, dropdowns, and pagination.',
        fields: [
            { path: 'allProducts.background', label: 'Section background' },
            { path: 'allProducts.title', label: 'Section title', contrastWith: 'allProducts.background' },
            { path: 'allProducts.subtitle', label: 'Section subtitle', contrastWith: 'allProducts.background' },
            { path: 'allProducts.filterBackground', label: 'Filter background' },
            { path: 'allProducts.filterText', label: 'Filter text', contrastWith: 'allProducts.filterBackground' },
            { path: 'allProducts.dropdownBackground', label: 'Dropdown background' },
            { path: 'allProducts.paginationBackground', label: 'Pagination background' },
            { path: 'allProducts.paginationText', label: 'Pagination text', contrastWith: 'allProducts.paginationBackground' },
            { path: 'allProducts.paginationActiveBackground', label: 'Active page background' },
            { path: 'allProducts.paginationActiveText', label: 'Active page text', contrastWith: 'allProducts.paginationActiveBackground' }
        ]
    },
    {
        id: 'sections',
        title: 'Dynamic Sections',
        description: 'Controls banners, reviews, categories, FAQs, testimonials, and trust content.',
        fields: [
            { path: 'sections.background', label: 'Section background' },
            { path: 'sections.title', label: 'Section title', contrastWith: 'sections.background' },
            { path: 'sections.subtitle', label: 'Section subtitle', contrastWith: 'sections.background' },
            { path: 'sections.bannerOverlay', label: 'Banner overlay' },
            { path: 'sections.bannerText', label: 'Banner text', contrastWith: 'sections.bannerOverlay' },
            { path: 'sections.faqBackground', label: 'FAQ background' },
            { path: 'sections.faqText', label: 'FAQ text', contrastWith: 'sections.faqBackground' },
            { path: 'sections.testimonialBackground', label: 'Review background' },
            { path: 'sections.testimonialText', label: 'Review text', contrastWith: 'sections.testimonialBackground' },
            { path: 'sections.trustIcon', label: 'Trust icon' },
            { path: 'sections.trustText', label: 'Trust text' }
        ]
    },
    {
        id: 'footer',
        title: 'Footer',
        description: 'Controls footer brand text, policy links, borders, and powered-by text.',
        fields: [
            { path: 'footer.background', label: 'Footer background' },
            { path: 'footer.heading', label: 'Footer headings', contrastWith: 'footer.background' },
            { path: 'footer.text', label: 'Footer text', contrastWith: 'footer.background' },
            { path: 'footer.link', label: 'Footer links', contrastWith: 'footer.background' },
            { path: 'footer.linkHover', label: 'Footer link hover' },
            { path: 'footer.border', label: 'Footer border' },
            { path: 'footer.poweredBy', label: 'Powered-by text', contrastWith: 'footer.background' }
        ]
    },
    {
        id: 'checkout',
        title: 'Checkout / Cart',
        description: 'Controls cart, checkout cards, inputs, buttons, success, and error colors.',
        fields: [
            { path: 'checkout.background', label: 'Checkout background' },
            { path: 'checkout.cardBackground', label: 'Checkout card background' },
            { path: 'checkout.text', label: 'Checkout text', contrastWith: 'checkout.cardBackground' },
            { path: 'checkout.buttonBackground', label: 'Checkout button background' },
            { path: 'checkout.buttonText', label: 'Checkout button text', contrastWith: 'checkout.buttonBackground' },
            { path: 'checkout.accent', label: 'Checkout accent' },
            { path: 'checkout.inputBackground', label: 'Input background' },
            { path: 'checkout.inputBorder', label: 'Input border' },
            { path: 'checkout.inputFocus', label: 'Input focus' },
            { path: 'checkout.error', label: 'Error color' },
            { path: 'checkout.success', label: 'Success color' }
        ]
    }
];

export const nestedColorFields = flattenNestedColorFields(colorSectionGroups);
