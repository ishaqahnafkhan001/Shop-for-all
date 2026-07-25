const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { PLAN_DEFINITIONS } = require('../config/subscriptionPlans');
const { getPlanFeatureValue } = require('../config/subscriptionFeatures');
const {
    applyBrandingToPublicTheme,
    buildBrandingUpdate,
    deriveBrandingFromShop,
    getStoredOrDerivedBranding,
    validateCustomUrl
} = require('../services/shops/storeBrandingService');

const backendRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(backendRoot, '../..');
const readBackend = file => fs.readFileSync(path.join(backendRoot, file), 'utf8');
const readRepository = file => fs.readFileSync(path.join(repositoryRoot, file), 'utf8');

test('Essential Store Branding is available to every plan without unlocking Store Builder', () => {
    for (const plan of Object.values(PLAN_DEFINITIONS)) {
        assert.equal(plan.features.basicStoreBranding, true);
    }
    assert.equal(getPlanFeatureValue(PLAN_DEFINITIONS.beginner, 'basicStoreBranding'), true);
    assert.equal(getPlanFeatureValue(PLAN_DEFINITIONS.beginner, 'storeBuilder'), false);
    assert.equal(getPlanFeatureValue(PLAN_DEFINITIONS.beginner, 'advancedStoreDesign'), false);
    assert.equal(getPlanFeatureValue(PLAN_DEFINITIONS.starter, 'advancedStoreDesign'), false);
    assert.equal(getPlanFeatureValue(PLAN_DEFINITIONS.growth, 'advancedStoreDesign'), true);
    assert.equal(getPlanFeatureValue(PLAN_DEFINITIONS.pro, 'advancedStoreDesign'), true);
});

test('legacy Shop and published-theme identity derives without mutating premium theme data', () => {
    const shop = {
        _id: '507f1f77bcf86cd799439011',
        shopName: 'Phone Gallery',
        theme: {
            logoUrl: 'https://res.cloudinary.com/demo/image/upload/logo.webp',
            faviconUrl: 'https://res.cloudinary.com/demo/image/upload/icon.webp',
            hero: {
                title: 'Premium phones',
                subtitle: 'Browse the latest devices',
                imageUrl: '',
                bannerSlides: [{
                    enabled: true,
                    desktopImage: 'https://res.cloudinary.com/demo/image/upload/hero.webp',
                    title: 'Premium phones',
                    subtitle: 'Browse the latest devices',
                    primaryCtaText: 'Shop phones',
                    primaryCtaLink: '#products'
                }]
            }
        }
    };
    const before = structuredClone(shop.theme);
    const derived = deriveBrandingFromShop(shop);

    assert.equal(derived.source, 'derived');
    assert.equal(derived.heroTitle, 'Premium phones');
    assert.equal(derived.heroCtaType, 'SHOP');
    assert.equal(derived.legacyLogoUrl, shop.theme.logoUrl);
    assert.equal(derived.legacyHeroImageUrl, shop.theme.hero.bannerSlides[0].desktopImage);
    assert.deepEqual(shop.theme, before);
});

test('explicit branding is never overwritten, while unremoved legacy assets remain compatible', () => {
    const branding = getStoredOrDerivedBranding({
        shopName: 'Phone Gallery',
        branding: {
            source: 'explicit',
            version: 3,
            heroTitle: 'My phone shop',
            heroSubtitle: 'Clear seller-written copy',
            heroCtaLabel: '',
            heroCtaType: 'NONE',
            logoRemoved: false,
            faviconRemoved: true,
            heroImageRemoved: true
        },
        theme: {
            logoUrl: 'https://res.cloudinary.com/demo/image/upload/legacy-logo.webp',
            faviconUrl: 'https://res.cloudinary.com/demo/image/upload/legacy-icon.webp',
            hero: {
                bannerSlides: [{
                    desktopImage: 'https://res.cloudinary.com/demo/image/upload/legacy-hero.webp',
                    title: 'Old premium title'
                }]
            }
        }
    });

    assert.equal(branding.heroTitle, 'My phone shop');
    assert.equal(branding.legacyLogoUrl, 'https://res.cloudinary.com/demo/image/upload/legacy-logo.webp');
    assert.equal(branding.legacyFaviconUrl, '');
    assert.equal(branding.legacyHeroImageUrl, '');
});

test('custom CTA validation accepts safe destinations and rejects scriptable or administrative URLs', () => {
    assert.equal(validateCustomUrl('/products'), '/products');
    assert.equal(validateCustomUrl('https://example.com/sale'), 'https://example.com/sale');
    assert.throws(() => validateCustomUrl('javascript:alert(1)'), error => error.code === 'INVALID_BRANDING_CTA');
    assert.throws(() => validateCustomUrl('data:text/html,test'), error => error.code === 'INVALID_BRANDING_CTA');
    assert.throws(() => validateCustomUrl('file:///tmp/test'), error => error.code === 'INVALID_BRANDING_CTA');
    assert.throws(() => validateCustomUrl('/dashboard/settings'), error => error.code === 'UNSAFE_BRANDING_CTA');
    assert.throws(() => validateCustomUrl('/api/admin'), error => error.code === 'UNSAFE_BRANDING_CTA');
});

test('branding update DTO rejects unknown fields before persistence', async () => {
    await assert.rejects(
        buildBrandingUpdate({
            shop: {
                _id: '507f1f77bcf86cd799439011',
                shopName: 'Phone Gallery',
                branding: { version: 1, source: 'explicit', heroTitle: 'Phone Gallery' }
            },
            payload: {
                expectedVersion: 1,
                heroTitle: 'Phone Gallery',
                theme: { colors: { accent: '#000000' } }
            }
        }),
        error => error.code === 'UNKNOWN_BRANDING_FIELDS'
    );
});

test('Beginner public theme receives one safe branding hero and no premium layout mutation', () => {
    const theme = {
        layout: { productColumnsDesktop: 3 },
        hero: {
            bannerSlides: [
                { title: 'Premium slide one' },
                { title: 'Premium slide two' }
            ]
        }
    };
    const publicTheme = applyBrandingToPublicTheme({
        theme,
        storeBuilderEnabled: false,
        branding: {
            logoUrl: 'https://res.cloudinary.com/demo/image/upload/logo.webp',
            faviconUrl: '',
            heroImageUrl: '',
            heroTitle: 'Phone Gallery',
            heroSubtitle: 'Browse our latest products',
            heroCta: { label: 'Shop now', type: 'SHOP', url: '#products' },
            heroHidden: false
        }
    });

    assert.equal(publicTheme.hero.height, 'Compact');
    assert.equal(publicTheme.hero.bannerSlides.length, 1);
    assert.equal(publicTheme.hero.bannerSlides[0].badgeText, '');
    assert.equal(publicTheme.hero.bannerSlides[0].secondaryCtaText, '');
    assert.equal(publicTheme.layout.productColumnsDesktop, 3);
});

test('dedicated branding APIs are tenant-authenticated, permission checked, and independently feature gated', () => {
    const routes = readBackend('routes/adminRoutes.js');
    const controller = readBackend('controllers/storeBrandingController.js');
    const upload = readBackend('config/cloudinary.js');

    assert.match(routes, /'\/store-branding'[\s\S]*requirePermission\('settings'\)[\s\S]*requireShopFeature\('basicStoreBranding'\)/);
    assert.match(routes, /store-branding\/\$\{target\}[\s\S]*uploadEssentialBrandingAsset/);
    assert.match(routes, /uploadEssentialBrandingAsset[\s\S]*BRANDING_ASSET_TOO_LARGE/);
    assert.match(controller, /BRANDING_VERSION_CONFLICT/);
    assert.match(controller, /versionFilter/);
    assert.match(controller, /BRANDING_ASSET_FIELDS/);
    assert.doesNotMatch(controller, /\{\s*\$set:\s*req\.body/);
    assert.match(upload, /essentialBrandingStorage/);
    assert.match(upload, /validateImageBuffer\(buffer,\s*file/);
    const essentialBlock = upload.slice(
        upload.indexOf('const essentialBrandingStorage'),
        upload.indexOf('const supportStorage')
    );
    assert.doesNotMatch(essentialBlock, /allowSvg:\s*true/);
});

test('live renderer hides empty heroes and never inserts generic promotional claims', () => {
    const renderer = readRepository('packages/storefront-renderer/reference/StorefrontHome.jsx');
    const core = readRepository('packages/storefront-renderer/reference/referenceCore.jsx');

    assert.match(renderer, /hero\.hidden/);
    assert.match(renderer, /min-h-\[210px\]/);
    assert.match(renderer, /activeHeroSlide\.badgeText &&/);
    assert.doesNotMatch(renderer, /Limited time offer/i);
    assert.doesNotMatch(renderer, /Discover Your Favorite Products/);
    assert.match(core, /slide\.primaryCtaText !== undefined/);
});

test('admin exposes a separate all-plan branding page without exposing Store Builder', () => {
    const app = readRepository('ecommerce-admin/src/App.jsx');
    const navigation = readRepository('ecommerce-admin/src/config/dashboardNavigation.jsx');
    const page = readRepository('ecommerce-admin/src/pages/dashboard/settings/StoreBranding.jsx');

    assert.match(app, /settings\/store-branding[\s\S]*withFeature\('basicStoreBranding'/);
    assert.match(navigation, /Store Branding[\s\S]*feature:\s*'basicStoreBranding'/);
    assert.match(page, /\/admin\/store-branding/);
    assert.match(page, /onUploadProgress/);
    assert.match(page, /beforeunload/);
    assert.match(page, /Your unsaved text has been kept/);
    assert.match(page, /Restore defaults/);
    assert.match(page, /aria-pressed/);
    assert.doesNotMatch(page, /image\/svg\+xml/);
});
