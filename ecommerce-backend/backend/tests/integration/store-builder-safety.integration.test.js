const assert = require('node:assert/strict');
const test = require('node:test');

const {
    Shop,
    createLaunchSafetyContext
} = require('../helpers/launchSafetyHarness');

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

    const blockedByFeature = await vendorA.unsafePatch('/api/store-builder/admin', {
        customDomain: { domain: 'starter-domain.example.com' }
    });
    assert.equal(blockedByFeature.status, 403);
    assert.equal(blockedByFeature.body.code, 'FEATURE_NOT_AVAILABLE');

    await Shop.updateOne({ _id: shopA._id }, { $set: { 'plan.name': 'Growth' } });
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
    assert.match(platformDomain.body.error, /Platform domains/);

    const duplicateDomain = await vendorA.unsafePatch('/api/store-builder/admin', {
        customDomain: { domain: 'taken-domain.example.com' }
    });
    assert.equal(duplicateDomain.status, 400);
    assert.equal(duplicateDomain.body.error, 'This domain is already connected to another shop.');
});
