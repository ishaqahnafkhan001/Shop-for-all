const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('vendor onboarding route is protected and admin-only', () => {
    const routes = read('routes/adminRoutes.js');

    assert.match(routes, /getVendorOnboarding/);
    assert.match(routes, /router\.get\(\s*'\/onboarding'[\s\S]*protect[\s\S]*authorize\('VendorAdmin'\)[\s\S]*getVendorOnboarding/);
});

test('vendor onboarding controller returns tenant-scoped setup signals only', () => {
    const controller = read('controllers/onboardingController.js');

    assert.match(controller, /Shop\.findById\(shopId\)/);
    assert.match(controller, /Product\.countDocuments\(\{\s*shop_id:\s*shopId/);
    assert.match(controller, /Promotion\.countDocuments\(\{\s*shop_id:\s*shopId/);
    assert.match(controller, /AnalyticsEvent\.exists\(\{\s*shop_id:\s*shopId/);
    assert.match(controller, /signals:\s*\{/);
    assert.match(controller, /profileComplete/);
    assert.match(controller, /storefrontPublished/);
    assert.doesNotMatch(controller, /req\.body/);
    assert.doesNotMatch(controller, /customer|phone|address|nidNumber/i);
});
