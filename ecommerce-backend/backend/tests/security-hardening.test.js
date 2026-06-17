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

test('vendor verification routes are protected and use NID upload middleware', () => {
    const adminRoutes = read('routes/adminRoutes.js');
    const superAdminRoutes = read('routes/superAdminRoutes.js');
    const service = read('services/vendorVerificationService.js');

    assert.match(adminRoutes, /'\/vendor-verification\/status'[\s\S]*protect[\s\S]*authorize\('VendorAdmin', 'VendorStaff'\)[\s\S]*getVendorVerificationStatus/);
    assert.match(adminRoutes, /'\/vendor-verification\/submit'[\s\S]*protect[\s\S]*authorize\('VendorAdmin', 'VendorStaff'\)[\s\S]*requirePermission\('settings'\)[\s\S]*vendorNidUpload[\s\S]*submitVendorVerification/);
    assert.match(adminRoutes, /name:\s*'nidFront',\s*maxCount:\s*1/);
    assert.match(adminRoutes, /name:\s*'nidBack',\s*maxCount:\s*1/);
    assert.match(superAdminRoutes, /router\.use\(authorize\('SuperAdmin'\)\)/);
    assert.match(superAdminRoutes, /router\.get\('\/vendor-verifications',\s*getVendorVerifications\)/);
    assert.match(superAdminRoutes, /router\.patch\('\/vendor-verifications\/:id\/approve',\s*approveVendorVerification\)/);
    assert.match(superAdminRoutes, /router\.patch\('\/vendor-verifications\/:id\/reject',\s*rejectVendorVerification\)/);
    assert.match(service, /VERIFICATION_DEADLINE_DAYS\s*=\s*20/);
    assert.match(service, /VERIFICATION_SUSPENSION_REASON/);
});

test('verification suspension blocks high-impact vendor mutations only after auth', () => {
    const adminRoutes = read('routes/adminRoutes.js');
    const storeBuilderRoutes = read('routes/storeBuilderRoutes.js');
    const guard = read('middlewares/vendorVerificationGuard.js');

    assert.match(guard, /ensureShopVerificationStatus\(req\.tenantId/);
    assert.match(guard, /code:\s*'VERIFICATION_REQUIRED'/);
    assert.match(adminRoutes, /'\/products'[\s\S]*requirePermission\('products'\)[\s\S]*blockVerificationSuspendedShop[\s\S]*productMediaUpload[\s\S]*createProduct/);
    assert.match(adminRoutes, /'\/products\/:id'[\s\S]*requirePermission\('products'\)[\s\S]*blockVerificationSuspendedShop[\s\S]*productMediaUpload[\s\S]*updateProduct/);
    assert.match(adminRoutes, /'\/orders\/:id\/status'[\s\S]*requirePermission\('orders'\)[\s\S]*blockVerificationSuspendedShop[\s\S]*updateOrderStatus/);
    assert.match(storeBuilderRoutes, /'\/admin'[\s\S]*authorize\('VendorAdmin'\)[\s\S]*blockVerificationSuspendedShop[\s\S]*updateStoreBuilderSettings/);
    assert.match(storeBuilderRoutes, /'\/admin\/logo'[\s\S]*blockVerificationSuspendedShop[\s\S]*upload\.single\('logo'\)/);
});

test('public tenant resolution checks verification before exposing storefront', () => {
    const tenant = read('middlewares/tenant.js');

    assert.match(tenant, /ensureShopVerificationStatus/);
    assert.match(tenant, /code:\s*'STORE_UNAVAILABLE'/);
    assert.match(tenant, /This store is temporarily unavailable/);
    assert.doesNotMatch(tenant, /subdomain:\s*subdomain,\s*isActive:\s*true/);
});

test('super admin hardening routes remain SuperAdmin protected', () => {
    const routes = read('routes/superAdminRoutes.js');

    assert.match(routes, /router\.use\(protect\)/);
    assert.match(routes, /router\.use\(authorize\('SuperAdmin'\)\)/);
    assert.match(routes, /router\.get\('\/shops\/:shopId',\s*getShopDetail\)/);
    assert.match(routes, /router\.patch\('\/shops\/:shopId\/status',\s*updateShopStatus\)/);
    assert.match(routes, /router\.patch\('\/shops\/:shopId\/plan',\s*updateShopPlan\)/);
    assert.match(routes, /router\.patch\('\/shops\/:shopId\/feature-flags',\s*updateShopFeatureFlags\)/);
    assert.match(routes, /router\.get\('\/audit-logs',\s*getPlatformAuditLogs\)/);
    assert.match(routes, /router\.patch\('\/domains\/:shopId',\s*updateDomain\)/);
    assert.match(routes, /router\.patch\('\/abuse-reports\/:id\/status',\s*updateAbuseReportStatus\)/);
});

test('platform audit log is separate and non-blocking', () => {
    const model = read('models/PlatformAuditLog.js');
    const service = read('services/platformAuditLogService.js');

    assert.match(model, /mongoose\.model\('PlatformAuditLog'/);
    assert.match(model, /actor_id[\s\S]*refPath:\s*'actorModel'/);
    assert.match(model, /platformAuditLogSchema\.index\(\{ shop_id:\s*1,\s*createdAt:\s*-1 \}\)/);
    assert.match(service, /const logPlatformAudit = async/);
    assert.match(service, /catch \(err\)[\s\S]*console\.error\('\[PlatformAuditLog\]/);
    assert.match(service, /return null/);
});

test('super admin lists use pagination response shape', () => {
    const controller = read('controllers/superAdminController.js');
    const vendorVerification = read('controllers/vendorVerificationController.js');

    assert.match(controller, /paginationPayload/);
    assert.match(controller, /exports\.getShops[\s\S]*pagination:\s*paginationPayload/);
    assert.match(controller, /exports\.getAnnouncements[\s\S]*pagination:\s*paginationPayload/);
    assert.match(controller, /exports\.getDomains[\s\S]*pagination:\s*paginationPayload/);
    assert.match(controller, /exports\.getFailedPayments[\s\S]*pagination:\s*paginationPayload/);
    assert.match(controller, /exports\.getAbuseReports[\s\S]*pagination:\s*paginationPayload/);
    assert.match(vendorVerification, /exports\.getVendorVerifications[\s\S]*summary[\s\S]*pagination:\s*paginationPayload/);
});

test('dangerous super admin actions require reason and protect verification suspension', () => {
    const controller = read('controllers/superAdminController.js');
    const vendorVerification = read('controllers/vendorVerificationController.js');

    assert.match(controller, /status === 'Suspended' && requireReason/);
    assert.match(controller, /Approve the vendor verification record to reactivate this verification-suspended shop/);
    assert.match(controller, /CRITICAL_FEATURE_FLAGS/);
    assert.match(controller, /status === 'Failed' && requireReason/);
    assert.match(controller, /\['Resolved', 'Dismissed'\]\.includes\(status\) && requireReason/);
    assert.match(vendorVerification, /Rejection reason is required/);
    assert.match(vendorVerification, /logPlatformAudit/);
});

test('announcements use soft archive lifecycle', () => {
    const model = read('models/PlatformAnnouncement.js');
    const routes = read('routes/superAdminRoutes.js');
    const controller = read('controllers/superAdminController.js');

    assert.match(model, /isPublished/);
    assert.match(model, /archivedAt/);
    assert.match(routes, /router\.patch\('\/announcements\/:id\/publish',\s*publishAnnouncement\)/);
    assert.match(routes, /router\.patch\('\/announcements\/:id\/unpublish',\s*unpublishAnnouncement\)/);
    assert.match(routes, /router\.delete\('\/announcements\/:id',\s*archiveAnnouncement\)/);
    assert.match(controller, /announcement\.archived/);
    assert.doesNotMatch(controller, /PlatformAnnouncement\.findByIdAndDelete/);
});
