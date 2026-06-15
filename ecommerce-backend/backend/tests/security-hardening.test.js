const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('public product lookup is tenant scoped and storefront safe', () => {
    const source = read('controllers/publicController.js');
    const start = source.indexOf('exports.getPublicProduct');
    const end = source.indexOf('exports.trackPublicOrder');
    const block = source.slice(start, end);

    assert.match(block, /shop_id:\s*shop\._id/);
    assert.match(block, /isDeleted:\s*false/);
    assert.match(block, /isActive:\s*true/);
    assert.match(block, /status:\s*'Published'/);
    assert.doesNotMatch(block, /Product\.findById\(req\.params\.id\)/);
});

test('public order tracking requires tenant and phone verification', () => {
    const source = read('controllers/publicController.js');
    const start = source.indexOf('exports.trackPublicOrder');
    const block = source.slice(start);

    assert.match(block, /shop_id:\s*shopId/);
    assert.match(block, /phonesMatch\(order\.shipping\?\.address\?\.phone,\s*phone\)/);
    assert.match(block, /Phone number is required/);
    assert.match(block, /\.select\('items pricing shipping status createdAt'\)/);
});

test('security middleware and rate limits are mounted', () => {
    const source = read('app.js');

    assert.match(source, /app\.use\(helmet\(\)\)/);
    assert.match(source, /sanitizeRequest/);
    assert.match(source, /app\.use\(generalLimiter\)/);
    assert.match(source, /app\.use\('\/api\/auth',\s*authLimiter,\s*authRoutes\)/);
    assert.match(source, /app\.use\('\/api\/public',\s*publicWriteLimiter,\s*publicRoutes\)/);
    assert.match(source, /app\.use\('\/api\/analytics',\s*publicWriteLimiter,\s*analyticsEventRoutes\)/);
});

test('admin AI and banner routes require RBAC permissions', () => {
    const adminRoutes = read('routes/adminRoutes.js');
    const bannerRoutes = read('routes/bannerRoutes.js');

    assert.match(adminRoutes, /'\/generate-description'[\s\S]*protect[\s\S]*authorize\('VendorAdmin', 'VendorStaff'\)[\s\S]*requirePermission\('products'\)/);
    assert.match(bannerRoutes, /router\.use\(protect\)/);
    assert.match(bannerRoutes, /router\.use\(authorize\('VendorAdmin', 'VendorStaff'\)\)/);
    assert.match(bannerRoutes, /router\.use\(requirePermission\('storeBuilder'\)\)/);
});

test('upload pipeline enforces type and size limits', () => {
    const source = read('config/cloudinary.js');

    assert.match(source, /fileSize:\s*10\s*\*\s*1024\s*\*\s*1024/);
    assert.match(source, /allowedMimeTypes/);
    assert.match(source, /fileFilter/);
});

test('analytics event endpoint resolves tenant and validates event types', () => {
    const route = read('routes/analyticsEventRoutes.js');
    const controller = read('controllers/analyticsEventController.js');
    const model = read('models/AnalyticsEvent.js');

    assert.match(route, /router\.post\('\/event',\s*trackAnalyticsEvent\)/);
    assert.match(controller, /getSubdomainFromRequest/);
    assert.match(controller, /Shop\.findOne\(\{[\s\S]*subdomain[\s\S]*isActive:\s*true/);
    assert.match(controller, /AnalyticsEvent\.EVENT_TYPES\.includes\(eventType\)/);
    assert.doesNotMatch(controller, /shop_id:\s*req\.body/);
    assert.match(model, /shop_id[\s\S]*required:\s*true/);
    assert.match(model, /analyticsEventSchema\.index\(\{ shop_id:\s*1,\s*eventType:\s*1,\s*createdAt:\s*-1 \}\)/);
});

test('growth center routes are tenant protected with analytics permission', () => {
    const app = read('app.js');
    const routes = read('routes/growthRoutes.js');
    const controller = read('controllers/growthController.js');

    assert.match(app, /app\.use\('\/api\/admin\/growth',\s*growthRoutes\)/);
    assert.match(routes, /router\.use\(protect\)/);
    assert.match(routes, /router\.use\(authorize\('VendorAdmin', 'VendorStaff'\)\)/);
    assert.match(routes, /router\.use\(requirePermission\('analytics'\)\)/);
    assert.match(routes, /router\.get\('\/overview',\s*getGrowthOverview\)/);
    assert.match(routes, /router\.post\('\/generate-ad-copy',\s*generateAdCopy\)/);
    assert.match(controller, /shop_id:\s*asObjectId\(req\.tenantId\)/);
    assert.match(controller, /Product\.findOne\(\{[\s\S]*shop_id:\s*req\.tenantId/);
});
