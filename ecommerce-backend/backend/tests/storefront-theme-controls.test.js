const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const { getThemeCssVars, normalizeTheme } = require('@scaleup/storefront-theme');
const { getPrebuiltTheme } = require('@scaleup/storefront-theme/prebuilt');

const backendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(backendRoot, '../..');
const rendererRoot = path.join(repoRoot, 'packages/storefront-renderer');

const loadDesignTokens = () => import(pathToFileURL(path.join(rendererRoot, 'designTokens.js')).href);

const readRendererSource = () => fs.readdirSync(path.join(rendererRoot, 'reference'))
    .filter(fileName => /\.(?:js|jsx)$/.test(fileName))
    .map(fileName => fs.readFileSync(path.join(rendererRoot, 'reference', fileName), 'utf8'))
    .join('\n');

test('container width helpers activate supported values and preserve the legacy default', async () => {
    const { getContainerClass, resolveContainerWidth } = await loadDesignTokens();

    assert.equal(resolveContainerWidth({}), 'Wide');
    assert.match(getContainerClass({}), /max-w-screen-2xl/);
    assert.match(getContainerClass({ containerWidth: 'Narrow' }), /max-w-5xl/);
    assert.match(getContainerClass({ containerWidth: 'Standard' }), /max-w-7xl/);
    assert.match(getContainerClass({ containerWidth: 'Full Width' }), /max-w-none/);
    assert.match(getContainerClass({ containerWidth: 'invalid' }), /max-w-screen-2xl/);
    assert.equal(resolveContainerWidth({ maxWidth: 'Contained' }), 'Narrow');
});

test('section spacing, width, padding, and margin use allowlisted design tokens', async () => {
    const { getSectionLayout } = await loadDesignTokens();

    const legacy = getSectionLayout({});
    const compact = getSectionLayout({ sectionSpacing: 'Compact' });
    const spacious = getSectionLayout({ sectionSpacing: 'Spacious' });
    const custom = getSectionLayout({
        sectionWidth: 'Narrow',
        sectionPaddingTop: 24,
        sectionPaddingBottom: 64,
        sectionMarginTop: 12,
        sectionMarginBottom: 28,
    });

    assert.match(legacy.className, /mt-8 md:mt-12/);
    assert.deepEqual(legacy.style, {});
    assert.notEqual(compact.className, spacious.className);
    assert.match(compact.className, /mt-6 md:mt-8/);
    assert.match(spacious.className, /mt-10 md:mt-16/);
    assert.match(custom.className, /max-w-4xl/);
    assert.deepEqual(custom.style, {
        paddingTop: '24px',
        paddingBottom: '64px',
        marginTop: '12px',
        marginBottom: '28px',
    });
});

test('product column helpers respect section-specific settings and clamp unsafe values', async () => {
    const { resolveAllProductsLayout, resolveFeaturedProductColumns, resolveProductColumns } = await loadDesignTokens();

    assert.deepEqual(resolveFeaturedProductColumns(
        { desktopSettings: { columns: 5 }, mobileSettings: { columns: 1 } },
        { productColumnsDesktop: 3, productColumnsMobile: 2 }
    ), { desktop: 5, tablet: 3, mobile: 1 });
    assert.deepEqual(resolveProductColumns({ desktop: 1, tablet: 99, mobile: 8 }), {
        desktop: 2,
        tablet: 4,
        mobile: 2,
    });
    assert.deepEqual(resolveAllProductsLayout(
        { desktopColumns: 4, tabletColumns: 3, mobileColumns: 1, spacing: 'Spacious' },
        { productColumnsDesktop: 2, productColumnsMobile: 2, productGap: 'Compact' },
        'Comfortable'
    ), { desktop: 4, tablet: 3, mobile: 1, spacing: 'Spacious' });
    assert.equal(resolveAllProductsLayout({}, { productGap: 'Compact' }, 'Spacious').spacing, 'Compact');
});

test('typography and product-card style normalize through safe supported values', () => {
    const theme = normalizeTheme({
        typography: { headingFont: 'Georgia', bodyFont: 'Arial', baseSize: 18, headingWeight: '700' },
        productCard: { style: 'Minimal' },
    });
    const cssTheme = getThemeCssVars(theme);

    assert.deepEqual(theme.typography, {
        headingFont: 'Georgia',
        bodyFont: 'Arial',
        baseSize: 18,
        headingWeight: '700',
    });
    assert.equal(cssTheme.headingFont, 'Georgia');
    assert.equal(cssTheme.fontFamily, 'Arial');
    assert.equal(cssTheme.headingWeight, '700');
    assert.equal(theme.productCard.shadow, 'None');
    assert.equal(theme.productCard.buttonStyle, 'Outline');

    const explicit = normalizeTheme({ productCard: { style: 'Minimal', shadow: 'Elevated', buttonStyle: 'Solid' } });
    assert.equal(explicit.productCard.shadow, 'Elevated');
    assert.equal(explicit.productCard.buttonStyle, 'Solid');

    const invalid = normalizeTheme({ typography: { headingFont: 'url(unsafe)', bodyFont: 'Comic Sans', headingWeight: '999' } });
    assert.equal(invalid.typography.headingFont, 'Inter');
    assert.equal(invalid.typography.bodyFont, 'Inter');
    assert.equal(invalid.typography.headingWeight, '800');
});

test('hero overlay opacity is bounded and consumed by an isolated overlay layer', async () => {
    const { resolveHeroOverlayOpacity } = await loadDesignTokens();
    const homeSource = fs.readFileSync(path.join(rendererRoot, 'reference/StorefrontHero.jsx'), 'utf8');

    assert.equal(resolveHeroOverlayOpacity(-10), 0);
    assert.equal(resolveHeroOverlayOpacity(35), 35);
    assert.equal(resolveHeroOverlayOpacity(120), 80);
    assert.equal(resolveHeroOverlayOpacity('invalid'), 25);
    assert.match(homeSource, /backgroundColor: "var\(--sf-hero-overlay\)", opacity: heroOverlayOpacity/);
    assert.doesNotMatch(homeSource, /heroContentClass[^\n]*opacity/);
});

test('shared renderer consumes Phase 2 controls without preset-ID conditionals', () => {
    const source = readRendererSource();
    const allProductsSource = fs.readFileSync(path.join(rendererRoot, 'reference/StorefrontAllProducts.jsx'), 'utf8');
    const cardSource = fs.readFileSync(path.join(rendererRoot, 'reference/StorefrontProductCard.jsx'), 'utf8');
    const headerSource = fs.readFileSync(path.join(rendererRoot, 'reference/StorefrontHeader.jsx'), 'utf8');

    for (const presetId of ['modern-general', 'minimal-general', 'luxury-jewellery', 'modern-electronics']) {
        assert.equal(source.includes(presetId), false, `${presetId} must not control public rendering`);
    }
    assert.match(source, /--sf-heading-font/);
    assert.match(source, /headingStyle/);
    assert.match(allProductsSource, /resolveAllProductsLayout/);
    assert.match(allProductsSource, /productGridGapClasses\[resolvedLayout\.spacing\]/);
    assert.match(cardSource, /resolveCardAlignment/);
    assert.match(headerSource, /compactMobileHeader/);
});

test('four diagnostic themes retain distinct resolved non-color design controls', () => {
    const ids = ['modern-general', 'minimal-general', 'luxury-jewellery', 'modern-electronics'];
    const resolved = Object.fromEntries(ids.map((id) => {
        const preset = getPrebuiltTheme(id);
        return [id, normalizeTheme(preset.presentation)];
    }));

    assert.equal(resolved['modern-general'].layout.containerWidth, 'Wide');
    assert.equal(resolved['minimal-general'].layout.containerWidth, 'Standard');
    assert.equal(resolved['minimal-general'].layout.sectionSpacing, 'Spacious');
    assert.equal(resolved['luxury-jewellery'].layout.cardAlignment, 'Center');
    assert.equal(resolved['luxury-jewellery'].typography.headingFont, 'Georgia');
    assert.equal(resolved['luxury-jewellery'].hero.overlayOpacity, 18);
    assert.equal(resolved['modern-electronics'].layout.productGap, 'Compact');
    assert.equal(resolved['modern-electronics'].allProducts.desktopColumns, 4);
    assert.equal(resolved['modern-electronics'].typography.bodyFont, 'Roboto');
});
