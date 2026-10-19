const assert = require('node:assert/strict');
const test = require('node:test');
const Shop = require('../models/Shop');
const User = require('../models/User');
const { processMarketingConsentJob } = require('../services/marketing/marketingConsentJobService');

const job = {
    name: 'marketing.confirm_email',
    shop_id: '507f1f77bcf86cd799439011',
    payload: {
        customerId: '507f1f77bcf86cd799439012',
        orderId: '507f1f77bcf86cd799439013'
    }
};

test('consent email uses the tenant shop name and escapes it in HTML', async () => {
    const originalFindUser = User.findOne;
    const originalFindShop = Shop.findOne;
    const originalSecret = process.env.MARKETING_UNSUBSCRIBE_SECRET;
    const originalApiUrl = process.env.PUBLIC_API_URL;
    const queries = {};
    const sent = [];
    try {
        process.env.MARKETING_UNSUBSCRIBE_SECRET = 'test-secret-at-least-thirty-two-characters';
        process.env.PUBLIC_API_URL = 'https://api.example.test';
        User.findOne = query => {
            queries.user = query;
            return { select: () => ({ lean: async () => ({
                _id: job.payload.customerId, email: 'buyer@example.test',
                fullName: 'Buyer', marketingEmail: { pendingAt: new Date() }
            }) }) };
        };
        Shop.findOne = query => {
            queries.shop = query;
            return { select: () => ({ lean: async () => ({ shopName: 'ADI <Jewellery>\r\nShop' }) }) };
        };
        await processMarketingConsentJob(job, async message => { sent.push(message); });
    } finally {
        User.findOne = originalFindUser;
        Shop.findOne = originalFindShop;
        if (originalSecret === undefined) delete process.env.MARKETING_UNSUBSCRIBE_SECRET;
        else process.env.MARKETING_UNSUBSCRIBE_SECRET = originalSecret;
        if (originalApiUrl === undefined) delete process.env.PUBLIC_API_URL;
        else process.env.PUBLIC_API_URL = originalApiUrl;
    }
    assert.equal(queries.user.shop_id, job.shop_id);
    assert.equal(queries.shop._id, job.shop_id);
    assert.equal(queries.shop.isActive, true);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].senderName, 'ADI <Jewellery> Shop');
    assert.match(sent[0].subject, /ADI <Jewellery> Shop/);
    assert.match(sent[0].html, /ADI &lt;Jewellery&gt; Shop/);
    assert.doesNotMatch(sent[0].html, /ADI <Jewellery>/);
    assert.doesNotMatch(sent[0].senderName, /ScaleUp|\r|\n/);
    assert.match(sent[0].text, /https:\/\/api\.example\.test\/api\/public\/marketing\/confirm/);
});

test('consent email skips a missing or inactive tenant shop', async () => {
    const originalFindUser = User.findOne;
    const originalFindShop = Shop.findOne;
    let sent = false;
    try {
        User.findOne = () => ({ select: () => ({ lean: async () => ({
            _id: job.payload.customerId, email: 'buyer@example.test',
            marketingEmail: { pendingAt: new Date() }
        }) }) });
        Shop.findOne = () => ({ select: () => ({ lean: async () => null }) });
        await processMarketingConsentJob(job, async () => { sent = true; });
    } finally {
        User.findOne = originalFindUser;
        Shop.findOne = originalFindShop;
    }
    assert.equal(sent, false);
});
