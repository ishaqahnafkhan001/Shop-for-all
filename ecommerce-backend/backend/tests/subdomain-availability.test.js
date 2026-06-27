const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const Shop = require('../models/Shop');
const {
    validateSubdomain,
    checkSubdomainAvailability
} = require('../services/subdomainAvailabilityService');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const projectRoot = path.resolve(__dirname, '../../..');
const readProject = (file) => fs.readFileSync(path.join(projectRoot, file), 'utf8');

test('subdomain validation normalizes and blocks invalid or reserved names', () => {
    assert.deepEqual(validateSubdomain('ADIJewellery').valid, true);
    assert.equal(validateSubdomain('ADIJewellery').normalizedSubdomain, 'adijewellery');
    assert.equal(validateSubdomain('adijewellery').valid, true);
    assert.equal(validateSubdomain('adi-jewellery').valid, true);

    assert.equal(validateSubdomain('ad').valid, false);
    assert.equal(validateSubdomain('a'.repeat(41)).valid, false);
    assert.equal(validateSubdomain('my store').valid, false);
    assert.equal(validateSubdomain('my_store').valid, false);
    assert.equal(validateSubdomain('my.store').valid, false);
    assert.equal(validateSubdomain('https://abc.com').valid, false);
    assert.equal(validateSubdomain('abc/path').valid, false);
    assert.equal(validateSubdomain('admin').code, 'RESERVED_SUBDOMAIN');
    assert.equal(validateSubdomain('scaleup-codes').code, 'RESERVED_SUBDOMAIN');
    assert.equal(validateSubdomain('adi--jewellery').valid, false);
});

test('subdomain availability returns available state and suggestions without exposing shops', async () => {
    const originalExists = Shop.exists;
    const taken = new Set(['adijewellery', 'adijewellerybd']);
    Shop.exists = async (query) => taken.has(query.subdomain) ? { _id: 'shop-id' } : null;

    try {
        const available = await checkSubdomainAvailability('newstore');
        assert.equal(available.success, true);
        assert.equal(available.available, true);
        assert.equal(available.normalizedSubdomain, 'newstore');
        assert.equal(available.message, 'This store URL is available.');

        const unavailable = await checkSubdomainAvailability('ADIJewellery');
        assert.equal(unavailable.success, true);
        assert.equal(unavailable.available, false);
        assert.equal(unavailable.normalizedSubdomain, 'adijewellery');
        assert.equal(unavailable.message, 'This store URL is already taken.');
        assert.ok(Array.isArray(unavailable.suggestions));
        assert.ok(unavailable.suggestions.length >= 1);
        assert.equal(unavailable.suggestions.includes('adijewellery'), false);
        assert.equal(unavailable.suggestions.includes('adijewellerybd'), false);
    } finally {
        Shop.exists = originalExists;
    }
});

test('auth routes and register controller enforce subdomain availability contract', () => {
    const routes = read('routes/authRoutes.js');
    const controller = read('controllers/authController.js');
    const validation = read('validations/shopValidation.js');
    const shop = read('models/Shop.js');

    assert.match(routes, /router\.get\(\s*'\/check-subdomain'/);
    assert.match(controller, /exports\.checkSubdomain/);
    assert.match(controller, /checkSubdomainAvailability\(req\.query\.subdomain\)/);
    assert.match(controller, /validateSubdomain\(subdomain\)/);
    assert.match(controller, /code:\s*'SUBDOMAIN_TAKEN'/);
    assert.match(validation, /max\(40\)/);
    assert.match(validation, /\[a-z0-9-\]/);
    assert.match(shop, /maxlength:\s*40/);
    assert.match(shop, /\[a-z0-9-\]/);
});

test('landing registration UI checks store URL before sending OTP', () => {
    const landing = readProject('ecommerce-storefront/src/app/LandingPageClient.jsx');

    assert.match(landing, /\/auth\/check-subdomain/);
    assert.match(landing, /state:\s*"checking"/);
    assert.match(landing, /lastCheckedSubdomain/);
    assert.match(landing, /canSendOtp/);
    assert.match(landing, /Please choose an available store URL before continuing/);
    assert.match(landing, /suggestions\.map/);
});
