const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
    FALLBACK_THEME,
    STRUCTURAL_VARIANTS,
    normalizeTheme,
    validateTheme
} = require('@scaleup/storefront-theme');
const { assertStoreBuilderUpdateAllowed } = require('../services/billing/storeBuilderPlanService');

const repoRoot = path.resolve(__dirname, '../../..');
const rendererRoot = path.join(repoRoot, 'packages/storefront-renderer/reference');
const adminConstantsPath = path.join(repoRoot, 'ecommerce-admin/src/pages/dashboard/StoreBuilder/storeBuilderConstants.jsx');
const read = fileName => fs.readFileSync(path.join(rendererRoot, fileName), 'utf8');

test('legacy themes receive current-equivalent structural defaults', () => {
    const theme = normalizeTheme({
        header: { menuStyle: 'Nested' },
        hero: { title: 'Legacy hero' },
        homepageSections: [
            { type: 'CategoryList', settings: {} },
            { type: 'BrandStory', settings: { text: 'Legacy story' } },
            { type: 'Reviews', settings: { text: 'Legacy review' } },
            { type: 'Newsletter', settings: { text: 'Legacy newsletter' } }
        ]
    });

    assert.equal(theme.header.variant, 'standard');
    assert.equal(theme.hero.variant, 'fullBleed');
    assert.equal(theme.homepageSections.find(section => section.type === 'CategoryList').settings.variant, 'cards');
    assert.equal(theme.homepageSections.find(section => section.type === 'BrandStory').settings.variant, 'standard');
    assert.equal(theme.homepageSections.find(section => section.type === 'Reviews').settings.variant, 'cards');
    assert.equal(theme.homepageSections.find(section => section.type === 'Newsletter').settings.variant, 'boxed');
    assert.equal(FALLBACK_THEME.version, 4);
});

test('all supported structural variants survive normalization with merchant content', () => {
    for (const variant of STRUCTURAL_VARIANTS.header.values) {
        assert.equal(normalizeTheme({ header: { variant } }).header.variant, variant);
    }
    for (const variant of STRUCTURAL_VARIANTS.hero.values) {
        const theme = normalizeTheme({
            hero: {
                variant,
                title: 'Merchant title',
                bannerSlides: [
                    { id: 'one', title: 'First', desktopImage: 'https://cdn.example.com/one.webp' },
                    { id: 'two', title: 'Second', desktopImage: 'https://cdn.example.com/two.webp' }
                ]
            }
        });
        assert.equal(theme.hero.variant, variant);
        assert.equal(theme.hero.bannerSlides.length, 2);
        assert.equal(theme.hero.bannerSlides[1].title, 'Second');
    }
    for (const [type, contract] of Object.entries(STRUCTURAL_VARIANTS.sections)) {
        for (const variant of contract.values) {
            const section = normalizeTheme({ homepageSections: [{
                type,
                title: 'Merchant content',
                settings: { variant, text: 'Keep me', productIds: ['product-1'], source: { type: 'manual', productIds: ['product-1'] } },
                source: { type: 'manual', productIds: ['product-1'] }
            }] }).homepageSections[0];
            assert.equal(section.settings.variant, variant, `${type}:${variant}`);
            assert.equal(section.title, 'Merchant content');
            assert.equal(section.settings.text, 'Keep me');
        }
    }
});

test('unknown variants normalize safely and validation identifies direct invalid payloads', () => {
    const theme = normalizeTheme({
        header: { variant: 'preset-specific-header' },
        hero: { variant: 'unsafe-template' },
        homepageSections: [{ type: 'CategoryList', settings: { variant: 'unknown-categories' } }]
    });
    assert.equal(theme.header.variant, 'standard');
    assert.equal(theme.hero.variant, 'fullBleed');
    assert.equal(theme.homepageSections[0].settings.variant, 'cards');

    const validation = validateTheme({
        header: { variant: 'preset-specific-header' },
        hero: { variant: 'unsafe-template' },
        homepageSections: [{ type: 'CategoryList', settings: { variant: 'unknown-categories' } }]
    });
    assert.equal(validation.valid, false);
    assert.deepEqual(validation.errors.map(error => error.path), [
        'header.variant',
        'hero.variant',
        'homepageSections.0.settings.variant'
    ]);
});

test('limited Store Builder access cannot change structural variants directly', () => {
    const currentTheme = normalizeTheme({});
    assert.throws(() => assertStoreBuilderUpdateAllowed({
        currentTheme,
        incomingTheme: { ...currentTheme, hero: { ...currentTheme.hero, variant: 'split' } },
        planAccess: { storeBuilderAccess: 'limited' }
    }), error => error?.statusCode === 403 && error?.capability === 'advancedDesign');
    assert.throws(() => assertStoreBuilderUpdateAllowed({
        currentTheme,
        incomingTheme: { ...currentTheme, header: { ...currentTheme.header, variant: 'centered' } },
        planAccess: { storeBuilderAccess: 'limited' }
    }), error => error?.statusCode === 403 && error?.capability === 'advancedDesign');
    assert.doesNotThrow(() => assertStoreBuilderUpdateAllowed({
        currentTheme,
        incomingTheme: { ...currentTheme, hero: { ...currentTheme.hero, title: 'Allowed copy edit' } },
        planAccess: { storeBuilderAccess: 'limited' }
    }));
});

test('shared renderer consumes configuration variants without preset registry knowledge', () => {
    const source = [
        read('StorefrontHeader.jsx'),
        read('StorefrontHero.jsx'),
        read('StorefrontSectionRenderer.jsx'),
        read('StorefrontSectionVariants.jsx')
    ].join('\n');

    assert.match(source, /data-structural-variant/);
    assert.match(source, /data-section-variant/);
    assert.match(source, /variant === "centered"/);
    assert.match(source, /variant === "mosaic"/);
    assert.doesNotMatch(source, /@scaleup\/storefront-theme\/prebuilt/);
    assert.doesNotMatch(source, /theme\.preset/);
    for (const id of ['luxury-jewellery', 'minimal-general', 'modern-fashion']) {
        assert.equal(source.includes(id), false);
    }
});

test('Store Builder phone and tablet previews do not inherit outer desktop hero breakpoints', () => {
    const heroSource = read('StorefrontHero.jsx');
    const headerSource = read('StorefrontHeader.jsx');

    assert.match(heroSource, /forcedTabletPreview = previewDevice === "tablet"/);
    assert.match(heroSource, /forcedNarrowPreview = forcedMobilePreview \|\| forcedTabletPreview/);
    assert.match(heroSource, /model\.forcedMobilePreview/);
    assert.match(heroSource, /max-w-full break-words/);
    assert.match(headerSource, /bg-\[var\(--sf-header-background\)\]/);
    assert.match(headerSource, /text-\[var\(--sf-header-icon\)\]/);
});

test('Store Builder structural controls tolerate an older Vite-optimized theme contract', () => {
    const source = fs.readFileSync(adminConstantsPath, 'utf8');

    assert.match(source, /import themeContract, \{ SECTION_REGISTRY \}/);
    assert.match(source, /themeContract\?\.STRUCTURAL_VARIANTS \|\| FALLBACK_STRUCTURAL_VARIANTS/);
    assert.doesNotMatch(source, /import \{ SECTION_REGISTRY, STRUCTURAL_VARIANTS \}/);
});

test('representative stores can select different structures using configuration alone', () => {
    const editorialStore = normalizeTheme({
        header: { variant: 'centered' },
        hero: { variant: 'editorial' },
        homepageSections: [
            { type: 'CategoryList', settings: { variant: 'editorial' } },
            { type: 'BrandStory', settings: { variant: 'imageRight', imageUrl: 'https://cdn.example.com/story.webp' } }
        ]
    });
    const compactStore = normalizeTheme({
        header: { variant: 'minimal' },
        hero: { variant: 'minimal' },
        homepageSections: [
            { type: 'CategoryList', settings: { variant: 'circles' } },
            { type: 'BrandStory', settings: { variant: 'standard' } }
        ]
    });

    assert.notEqual(editorialStore.header.variant, compactStore.header.variant);
    assert.notEqual(editorialStore.hero.variant, compactStore.hero.variant);
    assert.notEqual(editorialStore.homepageSections[0].settings.variant, compactStore.homepageSections[0].settings.variant);
    assert.equal(editorialStore.homepageSections[1].settings.imageUrl, 'https://cdn.example.com/story.webp');
});
