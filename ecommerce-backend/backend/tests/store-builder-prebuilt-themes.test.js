const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const {
    PREBUILT_THEME_CATALOG_VERSION,
    PREBUILT_THEMES,
    getPrebuiltThemes,
    getPrebuiltTheme,
    resolvePrebuiltTheme,
    validatePrebuiltThemeRegistry
} = require('@scaleup/storefront-theme/prebuilt');
const { normalizeTheme, validateTheme } = require('@scaleup/storefront-theme');
const { assertStoreBuilderUpdateAllowed } = require('../services/billing/storeBuilderPlanService');

const APPLIED_AT = '2026-08-05T00:00:00.000Z';

const enabledSectionTypes = theme => theme.homepageSections
    .filter(section => section.isEnabled !== false)
    .map(section => section.type);

const blueprintTypes = preset => preset.homepageBlueprint.map(section => section.type);

const structuralSignature = preset => ({
    header: preset.presentation.header.variant,
    hero: preset.presentation.hero.variant,
    sections: preset.homepageBlueprint.map(section => `${section.type}:${section.presentationSettings.variant || 'default'}`),
    container: preset.presentation.layout.containerWidth,
    spacing: preset.presentation.layout.sectionSpacing,
    columns: preset.presentation.layout.productColumnsDesktop,
    grid: preset.presentation.productGridStyle,
    card: preset.presentation.productCard.style,
    imageRatio: preset.presentation.productCard.aspectRatio,
    headingFont: preset.presentation.typography.headingFont,
    bodyFont: preset.presentation.typography.bodyFont
});

const EXPECTED_STRUCTURAL_SIGNATURES = {
    'modern-general': ['standard', 'split', 'CategoryList:cards', 'FeaturedProducts:default', 'PromoBlock:strip', 'CollectionShowcase:grid', 'Reviews:cards', 'Newsletter:boxed'],
    'minimal-general': ['minimal', 'minimal', 'FeaturedProducts:default', 'CategoryList:cards', 'BrandStory:standard', 'Newsletter:minimal'],
    'modern-fashion': ['centered', 'fullBleed', 'CategoryList:imageGrid', 'FeaturedProducts:default', 'Banner:overlay', 'BrandStory:imageRight', 'CollectionShowcase:grid', 'Reviews:quote', 'Newsletter:fullWidth'],
    'editorial-fashion': ['minimal', 'editorial', 'BrandStory:editorial', 'CategoryList:editorial', 'CollectionShowcase:mosaic', 'FeaturedProducts:default', 'Reviews:minimal', 'Newsletter:minimal'],
    'luxury-jewellery': ['centered', 'centered', 'CollectionShowcase:spacious', 'CategoryList:imageGrid', 'FeaturedProducts:default', 'BrandStory:fullWidth', 'Reviews:quote', 'TrustBadges:default', 'Newsletter:boxed'],
    'minimal-jewellery': ['minimal', 'minimal', 'FeaturedProducts:default', 'CategoryList:circles', 'BrandStory:standard', 'Reviews:minimal'],
    'soft-beauty': ['centered', 'split', 'CategoryList:circles', 'FeaturedProducts:default', 'Banner:split', 'BrandStory:imageRight', 'Reviews:cards', 'FAQ:default', 'Newsletter:boxed'],
    'modern-electronics': ['standard', 'split', 'CategoryList:cards', 'FeaturedProducts:default', 'PromoBlock:strip', 'CollectionShowcase:grid', 'TrustBadges:default', 'FAQ:default'],
    'fresh-grocery': ['standard', 'centered', 'CategoryList:circles', 'FeaturedProducts:default', 'PromoBlock:split', 'CollectionShowcase:spacious', 'TrustBadges:default', 'Newsletter:fullWidth']
};

const buildMerchantTheme = () => normalizeTheme({
    logoUrl: 'https://cdn.example.com/logo.webp',
    faviconUrl: 'https://cdn.example.com/favicon.png',
    hero: {
        title: 'Merchant hero title',
        subtitle: 'Merchant hero subtitle',
        imageUrl: 'https://cdn.example.com/hero.webp',
        ctaLabel: 'Browse products',
        ctaUrl: '/products',
        overlayOpacity: 30,
        height: 'Medium',
        bannerSlides: [{
            id: 'merchant-slide',
            desktopImage: 'https://cdn.example.com/hero.webp',
            mobileImage: 'https://cdn.example.com/hero-mobile.webp',
            title: 'Merchant hero title',
            subtitle: 'Merchant hero subtitle',
            primaryCtaText: 'Browse products',
            primaryCtaLink: '/products',
            secondaryCtaText: 'Our story',
            secondaryCtaLink: '/pages/our-story'
        }]
    },
    navigation: [
        { label: 'Shop', url: '/products', sortOrder: 0 },
        { label: 'Our story', url: '/pages/our-story', sortOrder: 1 }
    ],
    footer: {
        text: 'Merchant footer copy',
        contactEmail: 'shop@example.com',
        instagramUrl: 'https://instagram.com/example',
        links: [{ label: 'Size guide', url: '/pages/size-guide' }]
    },
    policies: {
        refund: 'Merchant refund policy',
        shipping: 'Merchant shipping policy',
        privacy: 'Merchant privacy policy',
        terms: 'Merchant terms'
    },
    seo: {
        mode: 'manual',
        siteName: 'Merchant Store',
        title: 'Merchant Store Online',
        description: 'Merchant-owned homepage search description.',
        topics: ['merchant', 'catalogue']
    },
    paymentSettings: {
        additionalMethodsEnabled: true,
        providers: { bkash: true, nagad: true }
    },
    checkoutBranding: {
        logoUrl: 'https://cdn.example.com/checkout-logo.webp',
        bannerText: 'Merchant checkout message',
        buttonStyle: 'Pill',
        trustMessage: 'Merchant trust message'
    },
    allProducts: {
        title: 'Merchant catalogue',
        subtitle: 'Every merchant product',
        isEnabled: true,
        desktopColumns: 3
    },
    homepageSections: [
        {
            id: 'merchant-featured',
            type: 'FeaturedProducts',
            title: 'Merchant picks',
            isEnabled: true,
            settings: {
                productIds: ['product-1', 'product-2'],
                source: { type: 'manual', productIds: ['product-1', 'product-2'] }
            }
        },
        {
            id: 'merchant-story',
            type: 'BrandStory',
            title: 'Our real story',
            isEnabled: true,
            settings: { text: 'Merchant-authored story', imageUrl: 'https://cdn.example.com/story.webp' }
        },
        {
            id: 'merchant-faq',
            type: 'FAQ',
            title: 'Merchant questions',
            isEnabled: true,
            settings: { text: 'Merchant-authored FAQ' }
        }
    ]
});

const buildRepresentativeMerchantTheme = () => {
    const base = buildMerchantTheme();
    return normalizeTheme({
        ...base,
        homepageSections: [
            ...base.homepageSections,
            {
                id: 'merchant-reviews',
                type: 'Reviews',
                title: 'Customer notes',
                isEnabled: true,
                settings: { mode: 'text', reviewIds: [], text: 'Merchant-authored customer feedback.' }
            },
            {
                id: 'merchant-newsletter',
                type: 'Newsletter',
                title: 'Store updates',
                isEnabled: true,
                settings: { text: 'Merchant-authored store update copy.' }
            },
            {
                id: 'merchant-promo',
                type: 'PromoBlock',
                title: 'Featured collection',
                isEnabled: true,
                settings: { text: 'Merchant-authored collection announcement.' }
            },
            {
                id: 'merchant-banner',
                type: 'Banner',
                title: 'Merchant campaign',
                isEnabled: true,
                settings: {
                    desktopImage: 'https://cdn.example.com/campaign.webp',
                    mobileImage: 'https://cdn.example.com/campaign-mobile.webp',
                    title: 'Merchant-authored campaign',
                    subtitle: 'Merchant-authored campaign details',
                    buttonText: 'Browse campaign',
                    buttonLink: '/collections/campaign'
                }
            },
            {
                id: 'merchant-collection',
                type: 'CollectionShowcase',
                title: 'Merchant collection',
                isEnabled: true,
                settings: {
                    productIds: ['product-1', 'product-2', 'product-3'],
                    source: { type: 'manual', productIds: ['product-1', 'product-2', 'product-3'] }
                }
            },
            {
                id: 'merchant-trust',
                type: 'TrustBadges',
                title: 'Store assurances',
                isEnabled: true,
                settings: { text: 'Merchant-provided payment information' }
            },
            {
                id: 'merchant-extra',
                type: 'TextBlock',
                title: 'Care instructions',
                isEnabled: true,
                settings: { text: 'Merchant-authored care instructions.' }
            }
        ]
    });
};

const deterministicIds = () => {
    let index = 0;
    return type => `test-${String(type).toLowerCase()}-${index += 1}`;
};

test('prebuilt registry contains nine immutable, unique, valid production themes', () => {
    const validation = validatePrebuiltThemeRegistry();
    assert.equal(validation.valid, true, JSON.stringify(validation.errors));
    assert.equal(PREBUILT_THEMES.length, 9);
    assert.equal(PREBUILT_THEME_CATALOG_VERSION, 2);
    assert.deepEqual(PREBUILT_THEMES.map(theme => theme.version), Array(9).fill(2));
    assert.equal(getPrebuiltThemes().length, 9);
    assert.equal(new Set(PREBUILT_THEMES.map(theme => theme.id)).size, 9);
    assert.equal(Object.isFrozen(PREBUILT_THEMES), true);
    assert.equal(Object.isFrozen(PREBUILT_THEMES[0]), true);
    assert.equal(Object.isFrozen(PREBUILT_THEMES[0].presentation.colors), true);
    assert.deepEqual(PREBUILT_THEMES.map(theme => theme.name), [
        'Modern General',
        'Minimal General',
        'Modern Fashion',
        'Editorial Fashion',
        'Luxury Jewellery',
        'Minimal Jewellery',
        'Soft Beauty',
        'Modern Electronics',
        'Fresh Grocery'
    ]);
});

test('each v2 preset exposes the curated structural signature supported by the shared renderer', () => {
    for (const preset of PREBUILT_THEMES) {
        const signature = structuralSignature(preset);
        assert.deepEqual(
            [signature.header, signature.hero, ...signature.sections],
            EXPECTED_STRUCTURAL_SIGNATURES[preset.id],
            preset.id
        );
        assert.ok(['Minimal', 'Modern', 'Premium'].includes(signature.card), preset.id);
        assert.ok(['Compact', 'Comfortable', 'Spacious', 'Editorial'].includes(signature.grid), preset.id);
        assert.ok(Number.isInteger(signature.columns) && signature.columns >= 3 && signature.columns <= 4, preset.id);
    }
});

test('every preset resolves deterministically and validates through the shared contract', () => {
    const merchantTheme = buildMerchantTheme();
    const merchantBefore = JSON.stringify(merchantTheme);
    const registryBefore = JSON.stringify(PREBUILT_THEMES);
    for (const preset of PREBUILT_THEMES) {
        const first = resolvePrebuiltTheme({
            currentTheme: merchantTheme,
            presetId: preset.id,
            createSectionId: deterministicIds(),
            appliedAt: APPLIED_AT
        });
        const second = resolvePrebuiltTheme({
            currentTheme: merchantTheme,
            presetId: preset.id,
            createSectionId: deterministicIds(),
            appliedAt: APPLIED_AT
        });
        assert.deepEqual(first, second, `${preset.id} must resolve deterministically`);
        assert.equal(validateTheme(first).valid, true, preset.id);
        assert.deepEqual(normalizeTheme(first), first, `${preset.id} output must be normalized`);
        assert.deepEqual(first.preset, { id: preset.id, version: preset.version, appliedAt: APPLIED_AT });
        assert.equal(new Set(first.homepageSections.map(section => section.id)).size, first.homepageSections.length);
    }
    assert.equal(JSON.stringify(merchantTheme), merchantBefore, 'resolving themes must not mutate the merchant theme');
    assert.equal(JSON.stringify(PREBUILT_THEMES), registryBefore, 'resolving themes must not mutate the registry');
});

test('all full-plan presets follow their blueprints when safe merchant content is available', () => {
    const merchantTheme = buildRepresentativeMerchantTheme();
    for (const preset of PREBUILT_THEMES) {
        const resolved = resolvePrebuiltTheme({
            currentTheme: merchantTheme,
            presetId: preset.id,
            createSectionId: deterministicIds(),
            appliedAt: APPLIED_AT
        });
        const presetSectionTypes = blueprintTypes(preset);
        const unmatchedMerchantTypes = merchantTheme.homepageSections
            .filter(section => !presetSectionTypes.includes(section.type) && section.isEnabled !== false)
            .map(section => section.type);
        assert.deepEqual(
            enabledSectionTypes(resolved),
            [...presetSectionTypes, ...unmatchedMerchantTypes],
            `${preset.id} must use its blueprint before unmatched merchant sections`
        );
        assert.deepEqual(normalizeTheme(resolved), resolved, `${preset.id} must retain its enabled sequence after normalization`);
    }
});

test('the nine themes no longer collapse into two effective section structures', () => {
    const merchantTheme = buildRepresentativeMerchantTheme();
    const sequenceFor = presetId => enabledSectionTypes(resolvePrebuiltTheme({
        currentTheme: merchantTheme,
        presetId,
        createSectionId: deterministicIds(),
        appliedAt: APPLIED_AT
    })).join(' > ');

    assert.notEqual(sequenceFor('modern-general'), sequenceFor('minimal-general'));
    assert.notEqual(sequenceFor('modern-fashion'), sequenceFor('editorial-fashion'));
    assert.notEqual(sequenceFor('luxury-jewellery'), sequenceFor('minimal-jewellery'));
    assert.notEqual(sequenceFor('modern-electronics'), sequenceFor('fresh-grocery'));
    assert.notEqual(sequenceFor('modern-fashion'), sequenceFor('luxury-jewellery'));
    assert.ok(new Set(PREBUILT_THEMES.map(theme => sequenceFor(theme.id))).size > 2);
});

test('paired industries remain distinguishable without relying on color', () => {
    const signatureFor = presetId => {
        const signature = structuralSignature(getPrebuiltTheme(presetId));
        return JSON.stringify({
            header: signature.header,
            hero: signature.hero,
            sections: signature.sections,
            container: signature.container,
            spacing: signature.spacing,
            columns: signature.columns,
            grid: signature.grid,
            card: signature.card,
            imageRatio: signature.imageRatio,
            headingFont: signature.headingFont,
            bodyFont: signature.bodyFont
        });
    };

    for (const [left, right] of [
        ['modern-general', 'minimal-general'],
        ['modern-fashion', 'editorial-fashion'],
        ['luxury-jewellery', 'minimal-jewellery'],
        ['modern-electronics', 'fresh-grocery'],
        ['modern-fashion', 'luxury-jewellery']
    ]) {
        assert.notEqual(signatureFor(left), signatureFor(right), `${left} and ${right}`);
    }
});

test('applying a preset preserves merchant content and selected commerce data', () => {
    const merchantTheme = buildMerchantTheme();
    const resolved = resolvePrebuiltTheme({
        currentTheme: merchantTheme,
        presetId: 'luxury-jewellery',
        createSectionId: deterministicIds(),
        appliedAt: APPLIED_AT
    });

    assert.equal(resolved.logoUrl, merchantTheme.logoUrl);
    assert.equal(resolved.faviconUrl, merchantTheme.faviconUrl);
    assert.deepEqual(resolved.navigation, merchantTheme.navigation);
    assert.deepEqual(resolved.footer, merchantTheme.footer);
    assert.deepEqual(resolved.policies, merchantTheme.policies);
    assert.deepEqual(resolved.seo, merchantTheme.seo);
    assert.deepEqual(resolved.paymentSettings, merchantTheme.paymentSettings);
    assert.deepEqual(resolved.checkoutBranding, merchantTheme.checkoutBranding);
    assert.equal(resolved.hero.title, merchantTheme.hero.title);
    assert.equal(resolved.hero.subtitle, merchantTheme.hero.subtitle);
    assert.equal(resolved.hero.imageUrl, merchantTheme.hero.imageUrl);
    assert.deepEqual(resolved.hero.bannerSlides, merchantTheme.hero.bannerSlides);
    assert.equal(resolved.allProducts.title, 'Merchant catalogue');
    assert.equal(resolved.allProducts.subtitle, 'Every merchant product');

    const featured = resolved.homepageSections.find(section => section.id === 'merchant-featured');
    const story = resolved.homepageSections.find(section => section.id === 'merchant-story');
    const faq = resolved.homepageSections.find(section => section.id === 'merchant-faq');
    assert.deepEqual(featured.settings.productIds, ['product-1', 'product-2']);
    assert.deepEqual(featured.settings.source.productIds, ['product-1', 'product-2']);
    assert.equal(story.settings.text, 'Merchant-authored story');
    assert.equal(story.settings.imageUrl, 'https://cdn.example.com/story.webp');
    assert.equal(faq.settings.text, 'Merchant-authored FAQ');

    const generatedCategory = resolved.homepageSections.find(section => section.type === 'CategoryList');
    const generatedReviews = resolved.homepageSections.find(section => section.type === 'Reviews');
    const generatedTrust = resolved.homepageSections.find(section => section.type === 'TrustBadges');
    assert.equal(generatedCategory.isEnabled, true);
    assert.equal(generatedReviews.isEnabled, false);
    assert.equal(generatedTrust.isEnabled, false);
    assert.equal(generatedReviews.settings.text, '');
    assert.deepEqual(generatedReviews.settings.reviewIds, []);
    assert.equal(generatedTrust.settings.text, '');
});

test('missing merchant content never creates fake story, review, FAQ, promotion, trust, or newsletter copy', () => {
    const resolved = resolvePrebuiltTheme({
        currentTheme: normalizeTheme({ homepageSections: [] }),
        presetId: 'soft-beauty',
        createSectionId: deterministicIds(),
        appliedAt: APPLIED_AT
    });
    const byType = Object.fromEntries(resolved.homepageSections.map(section => [section.type, section]));

    assert.equal(byType.CategoryList.isEnabled, true);
    assert.equal(byType.FeaturedProducts.isEnabled, true);
    for (const type of ['BrandStory', 'Reviews', 'FAQ', 'Newsletter']) {
        assert.equal(byType[type].isEnabled, false, `${type} must stay disabled without merchant content`);
        assert.equal(byType[type].settings.text, '', `${type} must not receive fabricated copy`);
    }
});

test('preset-owned presentation wins while populated merchant content and unmatched sections survive', () => {
    const merchantTheme = buildRepresentativeMerchantTheme();
    const resolved = resolvePrebuiltTheme({
        currentTheme: merchantTheme,
        presetId: 'soft-beauty',
        createSectionId: deterministicIds(),
        appliedAt: APPLIED_AT
    });

    assert.equal(resolved.homepageSections[0].type, 'CategoryList');
    assert.equal(resolved.homepageSections[0].settings.columns, 4);
    assert.equal(resolved.homepageSections[0].settings.maxCategories, 8);
    assert.equal(resolved.homepageSections.find(section => section.id === 'merchant-story').settings.text, 'Merchant-authored story');
    assert.equal(resolved.homepageSections.find(section => section.id === 'merchant-faq').settings.text, 'Merchant-authored FAQ');
    assert.equal(resolved.homepageSections.find(section => section.id === 'merchant-reviews').settings.text, 'Merchant-authored customer feedback.');
    assert.equal(resolved.homepageSections.at(-1).id, 'merchant-extra');
    assert.equal(resolved.homepageSections.at(-1).isEnabled, true);
});

test('duplicate preset-controlled sections are retained but cannot alter the enabled blueprint sequence', () => {
    const merchantTheme = buildRepresentativeMerchantTheme();
    merchantTheme.homepageSections.splice(1, 0, {
        ...merchantTheme.homepageSections[0],
        id: 'merchant-featured-extra',
        title: 'Second merchant selection',
        settings: {
            productIds: ['product-3'],
            source: { type: 'manual', productIds: ['product-3'] }
        }
    });
    const resolved = resolvePrebuiltTheme({
        currentTheme: merchantTheme,
        presetId: 'modern-general',
        createSectionId: deterministicIds(),
        appliedAt: APPLIED_AT
    });
    const featuredSections = resolved.homepageSections.filter(section => section.type === 'FeaturedProducts');

    assert.equal(featuredSections.length, 2);
    assert.equal(featuredSections.filter(section => section.isEnabled !== false).length, 1);
    assert.deepEqual(featuredSections.find(section => section.id === 'merchant-featured-extra').settings.productIds, ['product-3']);
    assert.equal(featuredSections.find(section => section.id === 'merchant-featured-extra').isEnabled, false);
});

test('limited plan resolution preserves restricted layout and section fields accepted by backend policy', () => {
    const merchantTheme = buildMerchantTheme();
    for (const preset of PREBUILT_THEMES) {
        const resolved = resolvePrebuiltTheme({
            currentTheme: merchantTheme,
            presetId: preset.id,
            planAccess: { storeBuilderAccess: 'limited' },
            createSectionId: deterministicIds(),
            appliedAt: APPLIED_AT
        });
        assert.equal(resolved.header.variant, merchantTheme.header.variant);
        assert.equal(resolved.hero.variant, merchantTheme.hero.variant);
        assert.deepEqual(resolved.layout, merchantTheme.layout);
        assert.equal(resolved.productGridStyle, merchantTheme.productGridStyle);
        assert.deepEqual(resolved.homepageSections, merchantTheme.homepageSections);
        assert.deepEqual(resolved.migrations, merchantTheme.migrations);
        assert.doesNotThrow(() => assertStoreBuilderUpdateAllowed({
            currentTheme: merchantTheme,
            incomingTheme: resolved,
            planAccess: { storeBuilderAccess: 'limited' }
        }), preset.id);
    }
});

test('preset application refuses unavailable access and unknown presets without mutating the draft', () => {
    const merchantTheme = buildMerchantTheme();
    const before = JSON.stringify(merchantTheme);
    assert.throws(() => resolvePrebuiltTheme({
        currentTheme: merchantTheme,
        presetId: 'modern-general',
        planAccess: { storeBuilderAccess: 'none' }
    }), error => error.code === 'PREBUILT_THEME_NOT_AVAILABLE');
    assert.throws(() => assertStoreBuilderUpdateAllowed({
        currentTheme: merchantTheme,
        incomingTheme: { ...merchantTheme, colors: { accent: '#000000' } },
        planAccess: { storeBuilderAccess: 'none' }
    }), error => error.code === 'FEATURE_NOT_INCLUDED');
    assert.throws(() => resolvePrebuiltTheme({
        currentTheme: merchantTheme,
        presetId: 'unknown-theme'
    }), error => error.code === 'PREBUILT_THEME_NOT_FOUND');
    assert.equal(JSON.stringify(merchantTheme), before);
    assert.equal(getPrebuiltTheme('unknown-theme'), null);
});

test('prebuilt catalog has an isolated package export and is not imported by live storefront source', () => {
    const packageRoot = path.resolve(__dirname, '../../../packages/storefront-theme');
    const storefrontRoot = path.resolve(__dirname, '../../../ecommerce-storefront/src');
    const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
    assert.equal(packageJson.exports['./prebuilt'].require, './prebuilt.cjs');
    assert.equal(fs.readFileSync(path.join(packageRoot, 'index.cjs'), 'utf8').includes("require('./prebuilt.cjs')"), false);

    const sourceFiles = [];
    const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).forEach(entry => {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(absolute);
        else if (/\.(?:js|jsx|mjs|cjs)$/.test(entry.name)) sourceFiles.push(absolute);
    });
    walk(storefrontRoot);
    const importsCatalog = sourceFiles.some(file => fs.readFileSync(file, 'utf8').includes('@scaleup/storefront-theme/prebuilt'));
    assert.equal(importsCatalog, false);
});

test('every gallery thumbnail is local, lightweight, lazy loaded, and mapped to a catalog theme', () => {
    const repositoryRoot = path.resolve(__dirname, '../../..');
    const thumbnailRoot = path.join(repositoryRoot, 'ecommerce-admin/src/assets/theme-previews');
    const gallerySource = fs.readFileSync(path.join(repositoryRoot, 'ecommerce-admin/src/pages/dashboard/StoreBuilder/themes/ThemeGallery.jsx'), 'utf8');

    assert.match(gallerySource, /loading="lazy"/);
    assert.match(gallerySource, /decoding="async"/);
    for (const preset of PREBUILT_THEMES) {
        const file = path.join(thumbnailRoot, `${preset.thumbnailKey}.svg`);
        assert.equal(fs.existsSync(file), true, preset.id);
        assert.ok(fs.statSync(file).size < 25_000, `${preset.id} thumbnail must remain lightweight`);
        const thumbnail = fs.readFileSync(file, 'utf8');
        assert.match(thumbnail, /data-preset-version="2"/, preset.id);
        assert.match(thumbnail, new RegExp(`data-structure="[^"]*${preset.presentation.header.variant}[^"]*${preset.presentation.hero.variant}`), preset.id);
        assert.match(gallerySource, new RegExp(`['"]${preset.thumbnailKey}['"]`), preset.id);
    }
});

test('theme cards and full previews resolve the same merchant-owned hero banner', () => {
    const repositoryRoot = path.resolve(__dirname, '../../..');
    const gallerySource = fs.readFileSync(path.join(repositoryRoot, 'ecommerce-admin/src/pages/dashboard/StoreBuilder/themes/ThemeGallery.jsx'), 'utf8');
    const merchantTheme = buildMerchantTheme();

    for (const preset of PREBUILT_THEMES) {
        const resolved = resolvePrebuiltTheme({
            currentTheme: merchantTheme,
            presetId: preset.id,
            appliedAt: APPLIED_AT,
            createSectionId: deterministicIds()
        });
        assert.equal(resolved.hero.bannerSlides[0].desktopImage, 'https://cdn.example.com/hero.webp', preset.id);
        assert.equal(resolved.hero.bannerSlides[0].title, 'Merchant hero title', preset.id);
    }

    assert.match(gallerySource, /cardPreviewThemes\.get\(theme\.id\)/);
    assert.match(gallerySource, /buildPreviewTheme\(\{ currentTheme, presetId: theme\.id, planAccess \}\)/);
    assert.match(gallerySource, /getBuilderHeroSlides\(hero\)/);
    assert.match(gallerySource, /data-preview-banner-source="resolved-draft"/);
});
