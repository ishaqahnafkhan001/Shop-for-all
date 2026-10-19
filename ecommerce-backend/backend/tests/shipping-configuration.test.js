const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const { encryptSecret } = require('../utils/secretCrypto');
const pathao = require('../services/pathaoService');
const redx = require('../services/redx/redxService');
const Shop = require('../models/Shop');
const { getCourierSummary } = require('../services/courierConfigService');

test('pending Pathao approval survives the shop model and appears in courier settings', () => {
    const requestedAt = new Date('2026-10-18T00:00:00.000Z');
    const shop = new Shop({
        shopName: 'Test shop',
        couriers: { pathao: { pendingStore: { name: 'Test shop-123456', address: 'Dhaka', requestedAt } } }
    });
    const summary = getCourierSummary(shop);
    assert.equal(summary.pathao.pendingApproval, true);
    assert.equal(summary.pathao.configured, false);
    assert.equal(summary.pathao.requestedAt.toISOString(), requestedAt.toISOString());
});

test('disabled couriers cannot remain the effective default', () => {
    const summary = getCourierSummary({
        couriers: {
            defaultCourier: 'redx',
            pathao: { storeId: 12, status: 'Active' },
            redx: { enabled: false, pickupStoreId: '42', tokenEncrypted: 'saved-token' }
        }
    });
    assert.equal(summary.redx.enabled, false);
    assert.equal(summary.defaultCourier, 'pathao');
});

test('Pathao store lookup uses the selected account environment', async () => {
    const originalGet = axios.get;
    const originalBase = process.env.PATHAO_BASE_URL;
    const urls = [];
    process.env.PATHAO_BASE_URL = 'https://sandbox.example.test';
    axios.get = async url => {
        urls.push(url);
        return { data: { data: { data: [] } } };
    };
    try {
        await pathao.getPathaoStores('test-token', true);
        await pathao.getPathaoStores('test-token', false);
        await pathao.getPathaoStores('test-token');
        assert.equal(urls[0], 'https://api-hermes.pathao.com/aladdin/api/v1/stores');
        assert.equal(urls[1], 'https://courier-api-sandbox.pathao.com/aladdin/api/v1/stores');
        assert.equal(urls[2], 'https://sandbox.example.test/aladdin/api/v1/stores');
    } finally {
        axios.get = originalGet;
        if (originalBase === undefined) delete process.env.PATHAO_BASE_URL;
        else process.env.PATHAO_BASE_URL = originalBase;
    }
});

test('Pathao shipment creation keeps sandbox merchant and platform URLs separate', async () => {
    const originalPost = axios.post;
    const originalBase = process.env.PATHAO_BASE_URL;
    const urls = [];
    process.env.PATHAO_BASE_URL = 'https://platform.example.test';
    axios.post = async url => {
        urls.push(url);
        return { data: { type: 'success' } };
    };
    try {
        await pathao.createPathaoOrder('test-token', {}, false);
        await pathao.createPathaoOrder('test-token', {}, null);
        assert.equal(urls[0], 'https://courier-api-sandbox.pathao.com/aladdin/api/v1/orders');
        assert.equal(urls[1], 'https://platform.example.test/aladdin/api/v1/orders');
    } finally {
        axios.post = originalPost;
        if (originalBase === undefined) delete process.env.PATHAO_BASE_URL;
        else process.env.PATHAO_BASE_URL = originalBase;
    }
});

test('Pathao authentication accepts encrypted saved credentials', async () => {
    const originalPost = axios.post;
    const originalSecret = process.env.COURIER_SECRET;
    process.env.COURIER_SECRET = 'shipping-test-secret';
    let request;
    axios.post = async (url, payload) => {
        request = { url, payload };
        return { data: { access_token: 'test-token' } };
    };
    try {
        const token = await pathao.getPathaoToken({
            client_id: 'client',
            client_secret: encryptSecret('client-secret'),
            username: 'merchant@example.test',
            password: encryptSecret(' merchant-password ', { trim: false }),
            isLive: true
        });
        assert.equal(token, 'test-token');
        assert.equal(request.url, 'https://api-hermes.pathao.com/aladdin/api/v1/issue-token');
        assert.equal(request.payload.client_secret, 'client-secret');
        assert.equal(request.payload.password, ' merchant-password ');
    } finally {
        axios.post = originalPost;
        if (originalSecret === undefined) delete process.env.COURIER_SECRET;
        else process.env.COURIER_SECRET = originalSecret;
    }
});

test('RedX pickup store verification sends a new token without saving it', async () => {
    const originalCreate = axios.create;
    const originalBase = process.env.REDX_BASE_URL;
    process.env.REDX_BASE_URL = 'https://redx.example.test';
    let request;
    axios.create = options => ({
        get: async path => {
            request = { options, path };
            return { data: { pickup_store: { id: 42, name: 'Verified pickup' } } };
        }
    });
    try {
        const result = await redx.getRedxPickupStoreInfo({ shop: {}, pickupStoreId: '42', token: 'new-token' });
        assert.equal(result.pickupStore.id, 42);
        assert.equal(request.path, '/pickup/store/info/42');
        assert.equal(request.options.headers['API-ACCESS-TOKEN'], 'Bearer new-token');
    } finally {
        axios.create = originalCreate;
        if (originalBase === undefined) delete process.env.REDX_BASE_URL;
        else process.env.REDX_BASE_URL = originalBase;
    }
});
