const assert = require('node:assert/strict');
const test = require('node:test');

const {
    Product,
    Shop,
    createProduct,
    createLaunchSafetyContext,
    setShopPlan
} = require('../helpers/launchSafetyHarness');
const StoreBuilderAsset = require('../../models/StoreBuilderAsset');
const StoreBuilderDraft = require('../../models/StoreBuilderDraft');
const StoreBuilderRevision = require('../../models/StoreBuilderRevision');
const { cloudinary } = require('../../config/cloudinary');
const { cleanupExpiredStoreBuilderAssets } = require('../../services/storeBuilder/storeBuilderAssetService');
const { normalizeTheme } = require('@scaleup/storefront-theme');
const { resolvePrebuiltTheme } = require('@scaleup/storefront-theme/prebuilt');

test('vendor can load and save only their own Store Builder theme', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const { shopA, shopB } = ctx.data.shops;
    const vendorA = ctx.vendorAClient();

    const beforeShopB = await Shop.findById(shopB._id).lean();

    const load = await vendorA.get('/api/store-builder/admin');
    assert.equal(load.status, 200);
    assert.equal(String(load.body.data._id), String(shopA._id));
    assert.equal(load.body.data.subdomain, 'launchshopa');

    const save = await vendorA.unsafePatch('/api/store-builder/admin', {
        theme: {
            hero: {
                title: 'Updated Shop A Hero',
                ctaUrl: '/products'
            },
            policies: {
                privacy: 'Safe privacy policy'
            }
        }
    });

    assert.equal(save.status, 200);
    assert.equal(save.body.data.theme.hero.title, 'Updated Shop A Hero');

    const afterShopA = await Shop.findById(shopA._id).lean();
    const afterShopB = await Shop.findById(shopB._id).lean();

    assert.equal(afterShopA.theme.hero.title, 'Updated Shop A Hero');
    assert.deepEqual(afterShopB.theme.hero, beforeShopB.theme.hero);
});

test('Store Builder sanitizes scriptable URLs and script tags across theme content', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const vendorA = ctx.vendorAClient();

    const response = await vendorA.unsafePatch('/api/store-builder/admin', {
        theme: {
            navigation: [{
                label: 'Home <script>alert(1)</script>',
                url: 'javascript:alert(1)',
                children: [{
                    label: 'Child <script>alert(2)</script>',
                    url: 'data:text/html,<script>alert(2)</script>'
                }]
            }],
            hero: {
                title: '<script>alert(3)</script>Hero',
                subtitle: 'Clean subtitle',
                imageUrl: 'data:image/svg+xml,<svg onload=alert(1)>',
                ctaUrl: 'java\nscript:alert(4)'
            },
            footer: {
                facebookUrl: 'javascript:alert(11)',
                links: [{
                    label: 'Footer <script>alert(5)</script>',
                    url: 'vbscript:msgbox(1)'
                }]
            },
            policies: {
                privacy: '<script>alert(6)</script>Privacy text'
            },
            homepageSections: [{
                id: 'banner-safety',
                type: 'Banner',
                title: '<script>alert(7)</script>Banner',
                isEnabled: true,
                sortOrder: 1,
                settings: {
                    buttonLink: 'javascript:alert(8)',
                    desktopImage: 'data:text/html,<script>alert(9)</script>',
                    text: '<script>alert(10)</script>Promo'
                }
            }]
        }
    });

    assert.equal(response.status, 200);
    const { theme } = response.body.data;

    assert.equal(theme.navigation[0].url, '#');
    assert.equal(theme.navigation[0].children[0].url, '#');
    assert.equal(theme.hero.imageUrl, '#');
    assert.equal(theme.hero.ctaUrl, '#');
    assert.equal(theme.footer.facebookUrl, '#');
    assert.equal(theme.footer.links[0].url, '#');
    assert.equal(theme.homepageSections[0].settings.buttonLink, '#');
    assert.equal(theme.homepageSections[0].settings.desktopImage, '#');

    const serializedTheme = JSON.stringify(theme);
    assert.equal(serializedTheme.includes('<script'), false);
    assert.equal(serializedTheme.includes('javascript:'), false);
    assert.equal(serializedTheme.includes('vbscript:'), false);
    assert.equal(serializedTheme.includes('data:text/html'), false);
});

test('non-VendorAdmin roles cannot mutate Store Builder theme', async (t) => {
    const ctx = await createLaunchSafetyContext(t);

    const staffSave = await ctx.staffAClient().unsafePatch('/api/store-builder/admin', {
        theme: { hero: { title: 'Staff should not save' } }
    });
    assert.equal(staffSave.status, 403);

    const customerSave = await ctx.customerAClient().unsafePatch('/api/store-builder/admin', {
        theme: { hero: { title: 'Customer should not save' } }
    });
    assert.equal(customerSave.status, 403);
});

test('vendor custom domain save normalizes, validates, and resets verification state', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const { shopA } = ctx.data.shops;
    const vendorA = ctx.vendorAClient();

    await Shop.updateOne(
        { _id: shopA._id },
        {
            $set: {
                'plan.name': 'Growth',
                'customDomain.domain': 'old-domain.example.com',
                'customDomain.status': 'Verified',
                'customDomain.ownershipVerified': true,
                'customDomain.routingVerified': true,
                'customDomain.manuallyVerifiedRouting': false,
                'customDomain.verifiedAt': new Date()
            }
        }
    );

    const save = await vendorA.unsafePatch('/api/store-builder/admin', {
        theme: { hero: { title: 'Custom domain save' } },
        customDomain: { domain: 'https://New-Domain.example.com/products/a?x=1' }
    });

    assert.equal(save.status, 200);
    assert.equal(save.body.data.customDomain.domain, 'new-domain.example.com');
    assert.equal(save.body.data.customDomain.status, 'PendingVerification');
    assert.equal(save.body.data.customDomain.verifiedAt || null, null);

    const persisted = await Shop.findById(shopA._id).lean();
    assert.equal(persisted.customDomain.domain, 'new-domain.example.com');
    assert.equal(persisted.customDomain.status, 'PendingVerification');
});

test('custom domain save rejects platform, duplicate, and plan-disabled domains', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const { shopA, shopB } = ctx.data.shops;
    const vendorA = ctx.vendorAClient();

    await setShopPlan({ shopId: shopA._id, plan: ctx.data.plans.starter });
    const blockedByFeature = await vendorA.unsafePatch('/api/store-builder/admin', {
        customDomain: { domain: 'starter-domain.example.com' }
    });
    assert.equal(blockedByFeature.status, 403);
    assert.equal(blockedByFeature.body.code, 'FEATURE_NOT_INCLUDED');

    await setShopPlan({ shopId: shopA._id, plan: ctx.data.plans.growth });
    await Shop.updateOne(
        { _id: shopB._id },
        {
            $set: {
                'customDomain.domain': 'taken-domain.example.com',
                'customDomain.status': 'Verified',
                'customDomain.ownershipVerified': true,
                'customDomain.routingVerified': true,
                'customDomain.manuallyVerifiedRouting': false
            }
        }
    );

    const platformDomain = await vendorA.unsafePatch('/api/store-builder/admin', {
        customDomain: { domain: 'scaleup.codes' }
    });
    assert.equal(platformDomain.status, 400);
    assert.equal(platformDomain.body.code, 'PLATFORM_DOMAIN_NOT_ALLOWED');
    assert.equal(platformDomain.body.message, platformDomain.body.error);
    assert.match(platformDomain.body.error, /Platform domains/);

    const duplicateDomain = await vendorA.unsafePatch('/api/store-builder/admin', {
        customDomain: { domain: 'taken-domain.example.com' }
    });
    assert.equal(duplicateDomain.status, 400);
    assert.equal(duplicateDomain.body.code, 'DOMAIN_ALREADY_IN_USE');
    assert.equal(duplicateDomain.body.message, duplicateDomain.body.error);
    assert.equal(duplicateDomain.body.error, 'This domain is already connected to another shop.');
});

test('Store Builder publish round trip preserves contract fields and rejects stale revisions', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const { shopA } = ctx.data.shops;
    const vendorA = ctx.vendorAClient();
    await setShopPlan({ shopId: shopA._id, plan: ctx.data.plans.growth });

    const beforeLoad = await Shop.findById(shopA._id).select('theme updatedAt').lean();
    const bootstrap = await vendorA.get('/api/store-builder/admin/bootstrap');
    assert.equal(bootstrap.status, 200);
    assert.equal(bootstrap.body.data.publication.revision, 0);
    const afterLoad = await Shop.findById(shopA._id).select('theme updatedAt').lean();
    assert.deepEqual(afterLoad.theme, beforeLoad.theme, 'GET bootstrap must not migrate or persist theme data');
    assert.equal(afterLoad.updatedAt.getTime(), beforeLoad.updatedAt.getTime());

    const theme = {
        header: { variant: 'centered' },
        seo: {
            siteName: 'Launch Safety Store',
            title: 'Launch Safety Store Online',
            description: 'A complete Store Builder integration round trip.',
            keywords: ['launch', 'safety'],
            topics: ['launch', 'store safety'],
            socialTitle: 'Launch Safety Store',
            socialDescription: 'Share the public Launch Safety Store catalog.'
        },
        hero: {
            variant: 'editorial',
            title: 'Published hero',
            bannerSlides: [{
                id: 'published-slide',
                desktopImage: 'https://cdn.example.com/hero.webp',
                mobileImage: 'https://cdn.example.com/hero-mobile.webp',
                primaryCtaText: 'Shop now',
                primaryCtaLink: '/products',
                secondaryCtaText: 'Learn more',
                secondaryCtaLink: '/policies',
                desktopFocalPoint: { x: 25, y: 75 },
                mobileFocalPoint: { x: 55, y: 35 }
            }]
        },
        homepageSections: [
            { id: 'faq', type: 'FAQ', title: 'Questions', settings: { text: 'Q: Delivery?\nA: Fast.' }, desktopSettings: { isVisible: true }, mobileSettings: { isVisible: false } },
            { id: 'trust', type: 'TrustBadges', title: 'Trust', settings: { text: 'Secure checkout · Fast delivery' }, desktopSettings: { isVisible: false }, mobileSettings: { isVisible: true } },
            { id: 'story', type: 'BrandStory', title: 'Our story', settings: { variant: 'imageRight', text: 'Made with care.', imageUrl: 'https://cdn.example.com/story.webp', focalPoint: { x: 35, y: 65 } }, desktopSettings: { isVisible: true }, mobileSettings: { isVisible: true, focalPoint: { x: 45, y: 55 } } }
        ],
        footer: { text: 'Published footer' },
        checkoutBranding: { trustMessage: 'Secure checkout' }
    };

    const published = await vendorA.unsafePatch('/api/store-builder/admin', {
        theme,
        searchAliases: ['Launch Safety Stores'],
        expectedRevision: 0
    });
    assert.equal(published.status, 200);
    assert.equal(published.body.data.themeRevision, 1);
    assert.ok(published.body.data.lastPublishedAt);
    assert.equal(published.body.data.theme.seo.siteName, 'Launch Safety Store');
    assert.deepEqual(published.body.data.theme.seo.topics, ['launch', 'store safety']);
    assert.deepEqual(published.body.data.theme.seo.keywords, ['launch', 'store safety']);
    assert.deepEqual(published.body.data.searchAliases, ['Launch Safety Stores']);
    assert.deepEqual(published.body.data.theme.homepageSections.map(section => section.type), ['FAQ', 'TrustBadges', 'BrandStory']);
    assert.equal(published.body.data.theme.header.variant, 'centered');
    assert.equal(published.body.data.theme.hero.variant, 'editorial');
    assert.equal(published.body.data.theme.homepageSections[2].settings.variant, 'imageRight');
    assert.equal(published.body.data.theme.homepageSections[1].mobileSettings.isVisible, true);
    assert.deepEqual(published.body.data.theme.homepageSections[2].settings.focalPoint, { x: 35, y: 65 });

    const stale = await vendorA.unsafePatch('/api/store-builder/admin', {
        theme: { hero: { title: 'Stale overwrite' } },
        expectedRevision: 0
    });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.code, 'THEME_CONFLICT');
    assert.equal(stale.body.message, stale.body.error);
    assert.equal(stale.body.latestRevision, 1);

    const persisted = await Shop.findById(shopA._id).lean();
    assert.equal(persisted.theme.hero.title, 'Published hero');
    assert.equal(persisted.theme.header.variant, 'centered');
    assert.equal(persisted.theme.hero.variant, 'editorial');
    assert.equal(persisted.theme.homepageSections[2].settings.variant, 'imageRight');
    assert.equal(persisted.themeRevision, 1);
    assert.equal(await StoreBuilderRevision.countDocuments({ shop_id: shopA._id }), 1);
});

test('full-plan prebuilt blueprint and merchant content survive draft and publish round trips', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const { shopA } = ctx.data.shops;
    const vendorA = ctx.vendorAClient();
    await setShopPlan({ shopId: shopA._id, plan: ctx.data.plans.growth });

    let sectionIndex = 0;
    const resolvedTheme = resolvePrebuiltTheme({
        currentTheme: normalizeTheme({
            ...(shopA.theme || {}),
            homepageSections: [
                { id: 'merchant-story', type: 'BrandStory', title: 'Our real story', settings: { text: 'Merchant-authored story.' } },
                { id: 'merchant-featured', type: 'FeaturedProducts', title: 'Merchant picks', settings: { productIds: [], source: { type: 'manual', productIds: [] } } },
                { id: 'merchant-reviews', type: 'Reviews', title: 'Customer notes', settings: { text: 'Merchant-authored review copy.', reviewIds: [] } },
                { id: 'merchant-newsletter', type: 'Newsletter', title: 'Store updates', settings: { text: 'Merchant-authored update copy.' } }
            ]
        }),
        presetId: 'editorial-fashion',
        appliedAt: '2026-08-05T00:00:00.000Z',
        createSectionId: type => `roundtrip-${String(type).toLowerCase()}-${sectionIndex += 1}`
    });
    const expectedTypes = ['BrandStory', 'CategoryList', 'FeaturedProducts', 'Reviews', 'Newsletter'];
    assert.deepEqual(resolvedTheme.homepageSections.filter(section => section.isEnabled !== false).map(section => section.type), expectedTypes);

    const savedDraft = await vendorA.unsafePut('/api/store-builder/admin/draft', {
        basedOnRevision: 0,
        theme: resolvedTheme
    });
    assert.equal(savedDraft.status, 200, JSON.stringify(savedDraft.body));
    assert.deepEqual(savedDraft.body.data.theme.homepageSections.filter(section => section.isEnabled !== false).map(section => section.type), expectedTypes);
    assert.equal(savedDraft.body.data.theme.homepageSections[0].settings.text, 'Merchant-authored story.');

    const loadedDraft = await vendorA.get('/api/store-builder/admin/draft');
    assert.equal(loadedDraft.status, 200);
    assert.deepEqual(loadedDraft.body.data.theme.homepageSections.filter(section => section.isEnabled !== false).map(section => section.type), expectedTypes);

    const published = await vendorA.unsafePatch('/api/store-builder/admin', {
        expectedRevision: 0,
        theme: loadedDraft.body.data.theme
    });
    assert.equal(published.status, 200, JSON.stringify(published.body));
    assert.deepEqual(published.body.data.theme.homepageSections.filter(section => section.isEnabled !== false).map(section => section.type), expectedTypes);
    assert.equal(published.body.data.theme.homepageSections[0].settings.text, 'Merchant-authored story.');
    assert.deepEqual(published.body.data.theme.preset, {
        id: 'editorial-fashion',
        version: 2,
        appliedAt: '2026-08-05T00:00:00.000Z'
    });

    const persisted = await Shop.findById(shopA._id).lean();
    assert.deepEqual(persisted.theme.homepageSections.filter(section => section.isEnabled !== false).map(section => section.type), expectedTypes);
});

test('Store Builder bootstrap hydrates selected products beyond the first page and scopes SEO totals', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const { shopA } = ctx.data.shops;
    const vendorA = ctx.vendorAClient();
    await setShopPlan({ shopId: shopA._id, plan: ctx.data.plans.growth });

    const created = [];
    for (let index = 0; index < 12; index += 1) {
        created.push(await createProduct({
            shop: shopA,
            title: `Builder Product ${index + 1}`,
            slug: `builder-product-${index + 1}`,
            category: index % 2 ? 'Jewellery' : 'Accessories'
        }));
    }
    const selectedProduct = created[0].product;
    await Product.updateOne(
        { _id: selectedProduct._id },
        { $set: { imageAltText: 'Selected product image', 'seo.title': 'Selected SEO title', 'seo.description': 'Selected SEO description' } }
    );

    const publish = await vendorA.unsafePatch('/api/store-builder/admin', {
        expectedRevision: 0,
        theme: {
            homepageSections: [{
                id: 'selected-products',
                type: 'FeaturedProducts',
                title: 'Selected products',
                settings: { productIds: [selectedProduct._id], source: { type: 'manual', productIds: [selectedProduct._id] } }
            }]
        }
    });
    assert.equal(publish.status, 200);

    const bootstrap = await vendorA.get('/api/store-builder/admin/bootstrap');
    assert.equal(bootstrap.status, 200);
    const productIds = bootstrap.body.data.products.map(product => String(product._id));
    assert.ok(productIds.includes(String(selectedProduct._id)), 'selected product must be hydrated even when outside initial ten');
    assert.equal(bootstrap.body.data.seoStats.products.total, 13);
    assert.equal(bootstrap.body.data.seoStats.collections.total, 0);
    assert.equal(bootstrap.body.data.selectedProductIds, undefined, 'legacy data response should not duplicate bootstrap-only metadata');
    assert.deepEqual(bootstrap.body.bootstrap.selectedProductIds, [String(selectedProduct._id)]);
});

test('Store Builder drafts stay private, publish clears the draft, and restore creates a new revision', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const { shopA } = ctx.data.shops;
    const vendorA = ctx.vendorAClient();

    const draftSave = await vendorA.unsafePut('/api/store-builder/admin/draft', {
        basedOnRevision: 0,
        theme: {
            preset: { id: 'modern-general', version: 1, appliedAt: '2026-08-05T00:00:00.000Z' },
            hero: { title: 'Private draft hero' }
        }
    });
    assert.equal(draftSave.status, 200);
    assert.equal(draftSave.body.data.theme.hero.title, 'Private draft hero');
    const liveAfterDraft = await Shop.findById(shopA._id).lean();
    assert.equal(liveAfterDraft.theme.hero.title, 'Shop A Hero');
    assert.equal(liveAfterDraft.theme.preset || null, null, 'applying a preset to a draft must not change the published theme');

    const publishOne = await vendorA.unsafePatch('/api/store-builder/admin', {
        expectedRevision: 0,
        theme: draftSave.body.data.theme
    });
    assert.equal(publishOne.status, 200);
    assert.equal(await StoreBuilderDraft.countDocuments({ shop_id: shopA._id }), 0);

    const publishTwo = await vendorA.unsafePatch('/api/store-builder/admin', {
        expectedRevision: 1,
        theme: { hero: { title: 'Second published hero' } }
    });
    assert.equal(publishTwo.status, 200);
    const firstRevision = await StoreBuilderRevision.findOne({ shop_id: shopA._id, revision: 1 }).lean();
    assert.ok(firstRevision);

    const restore = await vendorA.unsafePost(`/api/store-builder/admin/revisions/${firstRevision._id}/restore`, {
        expectedRevision: 2
    });
    assert.equal(restore.status, 200, JSON.stringify(restore.body));
    assert.equal(restore.body.data.themeRevision, 3);
    assert.equal(restore.body.data.theme.hero.title, 'Private draft hero');
    assert.equal(restore.body.data.theme.preset.id, 'modern-general');
    assert.equal(restore.body.data.theme.preset.version, 1);
    const restoredRevision = await StoreBuilderRevision.findOne({ shop_id: shopA._id, revision: 3 }).lean();
    assert.equal(restoredRevision.source, 'restore');
    assert.equal(restoredRevision.restoredFromRevision, 1);
});

test('Store Builder draft autosave enforces the same limited-plan boundary as publish', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const { shopA } = ctx.data.shops;
    const vendorA = ctx.vendorAClient();
    await setShopPlan({ shopId: shopA._id, plan: ctx.data.plans.starter });

    const allowedDraft = await vendorA.unsafePut('/api/store-builder/admin/draft', {
        basedOnRevision: 0,
        theme: { typography: { headingFont: 'Arial', bodyFont: 'Inter', headingWeight: '700' } }
    });
    assert.equal(allowedDraft.status, 200);
    assert.equal(allowedDraft.body.data.theme.typography.headingFont, 'Arial');

    const blockedDraft = await vendorA.unsafePut('/api/store-builder/admin/draft', {
        basedOnRevision: 0,
        theme: { layout: { containerWidth: 'Full Width' } }
    });
    assert.equal(blockedDraft.status, 403);
    assert.equal(blockedDraft.body.code, 'STORE_BUILDER_CAPABILITY_REQUIRED');

    const blockedHeroVariant = await vendorA.unsafePut('/api/store-builder/admin/draft', {
        basedOnRevision: 0,
        theme: { hero: { variant: 'split' } }
    });
    assert.equal(blockedHeroVariant.status, 403);
    assert.equal(blockedHeroVariant.body.code, 'STORE_BUILDER_CAPABILITY_REQUIRED');
});

test('Store Builder asset ownership and lifecycle protect published media', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const { shopA, shopB } = ctx.data.shops;
    const vendorA = ctx.vendorAClient();
    const ownerId = ctx.data.identities.vendorA.user._id;
    const ownUrl = 'https://cdn.example.com/shop-a-draft.webp';
    const foreignUrl = 'https://cdn.example.com/shop-b-draft.webp';

    const ownAsset = await StoreBuilderAsset.create({
        shop_id: shopA._id,
        uploadedBy: ownerId,
        url: ownUrl,
        publicId: `store-builder/${shopA._id}/draft-own`,
        status: 'temporary',
        expiresAt: new Date(Date.now() + 60_000)
    });
    const foreignAsset = await StoreBuilderAsset.create({
        shop_id: shopB._id,
        url: foreignUrl,
        publicId: `store-builder/${shopB._id}/draft-foreign`,
        status: 'temporary',
        expiresAt: new Date(Date.now() + 60_000)
    });

    const draft = await vendorA.unsafePut('/api/store-builder/admin/draft', {
        basedOnRevision: 0,
        theme: { hero: { title: 'Draft media', imageUrl: ownUrl } }
    });
    assert.equal(draft.status, 200);
    assert.equal((await Shop.findById(shopA._id).lean()).theme.hero.imageUrl || '', '');
    assert.equal(String((await StoreBuilderAsset.findById(ownAsset._id).lean()).draftId), String(draft.body.data._id));

    const crossTenant = await vendorA.unsafePatch('/api/store-builder/admin', {
        expectedRevision: 0,
        theme: {
            seo: { socialImage: foreignUrl, socialImageAssetId: foreignAsset._id },
            hero: { imageUrl: foreignUrl }
        }
    });
    assert.equal(crossTenant.status, 403);
    assert.equal(crossTenant.body.code, 'SOCIAL_IMAGE_NOT_OWNED');
    assert.equal((await Shop.findById(shopA._id).lean()).theme.hero.imageUrl || '', '');

    const publish = await vendorA.unsafePatch('/api/store-builder/admin', {
        expectedRevision: 0,
        theme: {
            ...draft.body.data.theme,
            seo: {
                ...(draft.body.data.theme.seo || {}),
                socialImage: ownUrl,
                socialImageAssetId: ownAsset._id,
                socialImageAlt: 'Shop A social sharing image',
                socialImageWidth: 1200,
                socialImageHeight: 630,
                socialImageMimeType: 'image/webp'
            }
        }
    });
    assert.equal(publish.status, 200);
    assert.equal(String(publish.body.data.theme.seo.socialImageAssetId), String(ownAsset._id));
    assert.equal(publish.body.data.theme.seo.socialImageWidth, 1200);
    const promoted = await StoreBuilderAsset.findById(ownAsset._id).lean();
    assert.equal(promoted.status, 'active');
    assert.equal(promoted.expiresAt, null);
});

test('expired Store Builder asset cleanup deletes abandoned media but preserves published references', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const { shopA } = ctx.data.shops;
    const abandonedUrl = 'https://cdn.example.com/abandoned.webp';
    const publishedUrl = 'https://cdn.example.com/published.webp';
    const abandoned = await StoreBuilderAsset.create({
        shop_id: shopA._id,
        url: abandonedUrl,
        publicId: `store-builder/${shopA._id}/abandoned`,
        status: 'temporary',
        expiresAt: new Date(Date.now() - 60_000)
    });
    const published = await StoreBuilderAsset.create({
        shop_id: shopA._id,
        url: publishedUrl,
        publicId: `store-builder/${shopA._id}/published`,
        status: 'temporary',
        expiresAt: new Date(Date.now() - 60_000)
    });
    await Shop.updateOne({ _id: shopA._id }, { $set: { 'theme.logoUrl': publishedUrl } });

    const originalDestroy = cloudinary.uploader.destroy;
    const destroyed = [];
    cloudinary.uploader.destroy = async (publicId) => {
        destroyed.push(publicId);
        return { result: 'ok' };
    };
    t.after(() => {
        cloudinary.uploader.destroy = originalDestroy;
    });

    const result = await cleanupExpiredStoreBuilderAssets();
    assert.equal(result.deleted, 1);
    assert.equal(result.skipped, 1);
    assert.deepEqual(destroyed, [abandoned.publicId]);
    assert.equal((await StoreBuilderAsset.findById(abandoned._id).lean()).status, 'deleted');
    assert.equal((await StoreBuilderAsset.findById(published._id).lean()).status, 'active');
});
