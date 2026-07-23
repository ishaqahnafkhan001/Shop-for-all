const assert = require('node:assert/strict');
const test = require('node:test');

const Shop = require('../models/Shop');
const {
    SECTION_REGISTRY,
    SECTION_TYPES,
    THEME_SCHEMA_VERSION,
    createDefaultSection,
    getThemeCapabilityMetadata,
    normalizeTheme,
    sanitizeThemePayload,
    validateTheme
} = require('@scaleup/storefront-theme');

test('every registered Store Builder section has a complete, stable contract', () => {
    for (const type of SECTION_TYPES) {
        const definition = SECTION_REGISTRY[type];
        assert.ok(definition.label, `${type} needs a display label`);
        assert.ok(definition.category, `${type} needs a category`);
        assert.ok(definition.renderer, `${type} needs a renderer mapping`);
        assert.ok(definition.capability, `${type} needs capability metadata`);
        assert.equal(definition.supportsResponsiveVisibility, true);
        assert.ok(Array.isArray(definition.migrationAliases));

        const section = createDefaultSection(type, {
            id: `${type}-contract-test`,
            desktopSettings: { isVisible: false },
            mobileSettings: { isVisible: true, focalPoint: { x: 20, y: 80 } },
            settings: {
                ...definition.defaultSettings,
                ...(definition.supportsFocalPoint ? { focalPoint: { x: 35, y: 65 } } : {})
            }
        });
        const candidate = { homepageSections: [section] };
        assert.equal(validateTheme(candidate).valid, true, `${type} defaults should validate`);

        const normalized = normalizeTheme(candidate);
        assert.deepEqual(normalizeTheme(normalized), normalized, `${type} normalization should be idempotent`);
        assert.equal(normalized.homepageSections[0].type, type);
        assert.equal(normalized.homepageSections[0].desktopSettings.isVisible, false);
        assert.equal(normalized.homepageSections[0].mobileSettings.isVisible, true);
        if (definition.supportsFocalPoint) {
            assert.deepEqual(normalized.homepageSections[0].settings.focalPoint, { x: 35, y: 65 });
            assert.deepEqual(normalized.homepageSections[0].mobileSettings.focalPoint, { x: 20, y: 80 });
        }
    }
});

test('theme contract migrates legacy sections and rejects unsupported section types', () => {
    const legacy = normalizeTheme({
        version: 1,
        homepageSections: [{
            id: 'legacy-banner',
            type: 'BannerGrid',
            settings: { desktopImage: 'https://cdn.example.com/banner.webp' }
        }]
    });
    assert.equal(legacy.version, THEME_SCHEMA_VERSION);
    assert.equal(legacy.homepageSections[0].type, 'Banner');
    assert.equal(legacy.homepageSections[0].settings.desktopImage, 'https://cdn.example.com/banner.webp');

    const validation = validateTheme({ homepageSections: [{ type: 'ScriptSection' }] });
    assert.equal(validation.valid, false);
    assert.equal(validation.errors[0].code, 'UNSUPPORTED_SECTION');
});

test('theme sanitizer strips unsupported fields and neutralizes stored-content attacks', () => {
    const sanitized = sanitizeThemePayload({
        unknownRootField: 'must disappear',
        seo: {
            siteName: '<b>Safe Shop</b><script>alert(1)</script>',
            keywords: [' jewellery ', '<img src=x onerror=alert(1)>gold']
        },
        navigation: [{ label: '<b>Shop</b>', url: 'javascript:alert(1)' }],
        homepageSections: [{
            type: 'FAQ',
            title: '<script>alert(2)</script>FAQ',
            settings: { text: '<img src=x onerror=alert(3)>Safe answer' }
        }]
    });

    assert.equal(sanitized.unknownRootField, undefined);
    assert.equal(sanitized.seo.siteName, 'Safe Shop');
    assert.deepEqual(sanitized.seo.keywords, ['jewellery', 'gold']);
    assert.equal(sanitized.navigation[0].url, '#');
    assert.equal(JSON.stringify(sanitized).includes('<'), false);
});

test('representative theme survives Mongoose schema and shared normalization round trip', () => {
    const homepageSections = SECTION_TYPES.map((type, index) => createDefaultSection(type, {
        id: `${type}-${index}`,
        sortOrder: index,
        settings: {
            ...SECTION_REGISTRY[type].defaultSettings,
            text: `Content for ${type}`,
            ...(SECTION_REGISTRY[type].supportsMedia ? { imageUrl: `https://cdn.example.com/${type}.webp` } : {}),
            ...(SECTION_REGISTRY[type].supportsFocalPoint ? { focalPoint: { x: 30, y: 70 } } : {})
        },
        desktopSettings: { isVisible: index % 2 === 0 },
        mobileSettings: { isVisible: index % 2 !== 0, focalPoint: { x: 45, y: 55 } }
    }));
    const theme = normalizeTheme({
        seo: {
            siteName: 'Round Trip Shop',
            title: 'Round Trip Shop Online',
            description: 'A complete theme round-trip fixture for Store Builder.',
            keywords: ['round trip', 'store builder']
        },
        hero: {
            bannerSlides: [{
                id: 'hero-one',
                desktopImage: 'https://cdn.example.com/hero.webp',
                mobileImage: 'https://cdn.example.com/hero-mobile.webp',
                primaryCtaText: 'Shop now',
                primaryCtaLink: '/products',
                desktopFocalPoint: { x: 25, y: 75 },
                mobileFocalPoint: { x: 50, y: 30 }
            }]
        },
        homepageSections,
        navigation: [{ label: 'Shop', url: '/products', children: [] }],
        footer: { text: 'Round trip footer', facebookUrl: 'https://facebook.com/example' },
        checkoutBranding: { logoUrl: 'https://cdn.example.com/checkout.webp', trustMessage: 'Secure checkout' },
        productCard: { showRating: false, showWishlist: true }
    });

    const shop = new Shop({ shopName: 'Round Trip Shop', subdomain: 'round-trip-shop', theme });
    const validationError = shop.validateSync();
    assert.equal(validationError, undefined, validationError?.message);

    const persisted = shop.toObject().theme;
    const reloaded = normalizeTheme(persisted);
    assert.equal(reloaded.seo.siteName, 'Round Trip Shop');
    assert.deepEqual(reloaded.seo.keywords, ['round trip', 'store builder']);
    assert.deepEqual(reloaded.homepageSections.map(section => section.type), SECTION_TYPES);
    assert.equal(reloaded.hero.bannerSlides[0].mobileImage, 'https://cdn.example.com/hero-mobile.webp');
    assert.equal(reloaded.footer.text, 'Round trip footer');
    assert.equal(reloaded.checkoutBranding.trustMessage, 'Secure checkout');
    assert.equal(reloaded.productCard.showRating, false);
});

test('capability metadata is backend-driven and plan aware', () => {
    const limited = getThemeCapabilityMetadata({
        planName: 'Starter',
        storeBuilderAccess: 'limited',
        features: { customDomain: false },
        storeBuilderCapabilities: { scheduledBanners: false }
    });
    const full = getThemeCapabilityMetadata({
        planName: 'Growth',
        storeBuilderAccess: 'full',
        features: { customDomain: true },
        storeBuilderCapabilities: { scheduledBanners: true }
    });
    assert.equal(limited.sections.enabled, false);
    assert.match(limited.sections.label, /Starter/);
    assert.equal(limited.customDomain.enabled, false);
    assert.equal(full.sections.enabled, true);
    assert.equal(full.scheduledBanners.enabled, true);
});
