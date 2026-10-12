// Read-only preset analysis; writes an audit artifact, never store data.
const fs = require('node:fs');
const path = require('node:path');
const { PREBUILT_THEMES, resolvePrebuiltTheme } = require('../../packages/storefront-theme/prebuilt.cjs');
const { contrastRatio } = require('../../packages/storefront-theme/index.cjs');
const themes = PREBUILT_THEMES.map(preset => {
    const theme = resolvePrebuiltTheme({ presetId: preset.id });
    const c = theme.colors;
    const pairs = {
        body: [c.brand.secondary, c.background], header: [c.header.text, c.header.background],
        productTitle: [c.productCard.title, c.productCard.background], productCategory: [c.productCard.category, c.productCard.background],
        addButton: [c.productCard.addToCartText, c.productCard.addToCartBackground],
        saleBadge: [c.productCard.saleBadgeText, c.productCard.saleBadgeBackground],
        checkoutText: [c.checkout.text, c.checkout.cardBackground], checkoutButton: [c.checkout.buttonText, c.checkout.buttonBackground],
        footerText: [c.footer.text, c.footer.background], sectionTitle: [c.sections.title, c.sections.background],
        variantText: [c.productCard.variantChipText, c.productCard.variantChipBackground],
        selectedVariant: [c.productCard.variantChipSelectedText, c.productCard.variantChipSelectedBackground],
        heroButton: [c.hero.primaryButtonText, c.hero.primaryButtonBackground],
    };
    const contrast = Object.fromEntries(Object.entries(pairs).map(([key, [foreground, background]]) => [key, { foreground, background, ratio: Number(contrastRatio(foreground, background).toFixed(2)) }]));
    return { id: preset.id, name: preset.name, version: preset.version, composition: theme.layout.homepageComposition,
        header: theme.header.variant, hero: theme.hero.variant, headingFont: theme.typography.headingFont,
        cardStyle: theme.productCard.style, buttonStyle: theme.productCard.buttonStyle, contrast,
        below45: Object.entries(contrast).filter(([,value]) => value.ratio < 4.5).map(([key]) => key) };
});
fs.writeFileSync(path.join(__dirname, 'phase10-preset-analysis.json'), JSON.stringify({ note: 'Resolved token pairs, not computed pixels or a full accessibility audit. Outline/ghost buttons use different effective backgrounds. Threshold matches the existing Builder contrast checks.', themes }, null, 2));
console.log(JSON.stringify(themes.map(({ name, below45, contrast }) => ({ name, below45, ratios: Object.fromEntries(below45.map(key => [key, contrast[key].ratio])) })), null, 2));
