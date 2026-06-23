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
