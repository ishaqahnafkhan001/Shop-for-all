const assert = require('node:assert/strict');
const test = require('node:test');

const {
    DEFAULT_PASSWORD,
    createLaunchSafetyContext
} = require('../helpers/launchSafetyHarness');

test('login sets a session cookie and logout clears it through CSRF-protected flow', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const client = ctx.client();

    const login = await client.post('/api/auth/login', {
        email: 'vendor-a@launch.test',
        password: DEFAULT_PASSWORD,
        subdomain: 'launchshopa'
    });

    assert.equal(login.status, 200);
    assert.ok(login.cookies.token);
    assert.match(login.setCookieHeader, /HttpOnly/i);

    const me = await client.get('/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.authenticated, true);
    assert.equal(me.body.user.role, 'VendorAdmin');

    const logoutWithoutCsrf = await client.post('/api/auth/logout', {});
    assert.equal(logoutWithoutCsrf.status, 403);

    const logout = await client.unsafePost('/api/auth/logout', {});
    assert.equal(logout.status, 200);
    assert.equal(logout.cookies.token || '', '');
});

test('protected and privileged APIs reject unauthenticated or wrong-role callers', async (t) => {
    const ctx = await createLaunchSafetyContext(t);

    const unauthenticatedAdmin = await ctx.client().get('/api/admin/products');
    assert.equal(unauthenticatedAdmin.status, 401);

    const missingCsrf = await ctx.vendorAClient().post('/api/admin/products', {
        title: 'Should Fail'
    });
    assert.equal(missingCsrf.status, 403);

    const customerAdmin = await ctx.customerAClient().get('/api/admin/orders');
    assert.equal(customerAdmin.status, 403);

    const vendorSuperAdmin = await ctx.vendorAClient().get('/api/super-admin/overview');
    assert.equal(vendorSuperAdmin.status, 403);

    const superAdminOverview = await ctx.superAdminClient().get('/api/super-admin/overview');
    assert.equal(superAdminOverview.status, 200);
});

test('public product and order APIs do not leak cost or private fields', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const { productA } = ctx.data.products;
    const { orderA } = ctx.data.orders;
    const client = ctx.client();

    const publicProduct = await client.get(`/api/storefront/launchshopa/products/${productA.product._id}`);
    assert.equal(publicProduct.status, 200);

    const publicProductText = JSON.stringify(publicProduct.body);
    assert.equal(publicProductText.includes('buyingPrice'), false);
    assert.equal(publicProductText.includes('costPrice'), false);
    assert.equal(publicProductText.includes('comments'), false);
    assert.equal(publicProductText.includes('"tax"'), false);

    const publicTracking = await client.get(`/api/storefront/launchshopa/track-order/${orderA._id}?phone=01700000000`);
    assert.equal(publicTracking.status, 200);

    const trackingText = JSON.stringify(publicTracking.body);
    assert.equal(trackingText.includes('buyingPrice'), false);
    assert.equal(trackingText.includes('costPrice'), false);
    assert.equal(trackingText.includes('adminNote'), false);
    assert.equal(trackingText.includes('pathao'), false);
    assert.equal(trackingText.includes('nid'), false);
});

test('NID verification document access is not public and list responses hide raw document URLs', async (t) => {
    const ctx = await createLaunchSafetyContext(t);

    const unauthenticatedDocument = await ctx.client().get('/api/super-admin/vendor-verifications/64b000000000000000000001/document/front');
    assert.equal(unauthenticatedDocument.status, 401);

    const customerDocument = await ctx.customerAClient().get('/api/super-admin/vendor-verifications/64b000000000000000000001/document/front');
    assert.equal(customerDocument.status, 403);

    const list = await ctx.superAdminClient().get('/api/super-admin/vendor-verifications');
    assert.equal(list.status, 200);

    const serialized = JSON.stringify(list.body);
    assert.equal(serialized.includes('nidFrontUrl'), false);
    assert.equal(serialized.includes('nidBackUrl'), false);
    assert.equal(serialized.includes('1234567890123'), false);
    assert.equal(serialized.includes('********'), true);
});
