const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

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

// Older themes and the advanced editor still expose flat color keys. Keep those
// keys for compatibility, but mirror edits into the nested groups consumed by
// the shared storefront renderer.
export const legacyColorPathMap = Object.freeze({
    accent: ['brand.primary', 'brand.accent'],
    accentHover: ['brand.hover'],
    accentSoft: ['brand.soft'],
    accentBg: ['brand.soft'],
    accentRing: ['brand.ring'],
    primaryButtonBg: ['productCard.addToCartBackground', 'checkout.buttonBackground'],
    primaryButtonText: ['productCard.addToCartText', 'checkout.buttonText'],
    navbarBackground: ['header.background'],
    navbarText: ['header.text', 'header.icon'],
    navbarHover: ['header.hover'],
    cardBackground: ['productCard.background'],
    cardBorder: ['productCard.border'],
    priceColor: ['productCard.price'],
    saleBadgeBg: ['productCard.saleBadgeBackground'],
    saleBadgeText: ['productCard.saleBadgeText'],
    ratingColor: ['productCard.ratingStar'],
    footerBackground: ['footer.background'],
    footerText: ['footer.text'],
    footerLink: ['footer.heading', 'footer.link']
});

export const applyCompatibleColorUpdates = (current = {}, updates = {}) => {
    let nextColors = mergeColorUpdates(current, updates);

    Object.entries(updates || {}).forEach(([key, value]) => {
        if (!HEX_COLOR_PATTERN.test(String(value || ''))) return;
        (legacyColorPathMap[key] || []).forEach((path) => {
            nextColors = setColorPathValue(nextColors, path, value);
        });
    });

    return nextColors;
};
