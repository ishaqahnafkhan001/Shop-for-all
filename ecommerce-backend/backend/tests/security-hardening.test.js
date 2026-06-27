const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readProject = (file) => fs.readFileSync(path.join(root, '../..', file), 'utf8');

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
    assert.match(block, /\.select\('items pricing payment shipping status cancellation timeline createdAt updatedAt'\)/);
    assert.match(block, /returnEligibility/);
    assert.match(block, /returnRequest/);
});

test('public order tracking actions are tenant scoped and phone verified', () => {
    const controller = read('controllers/publicController.js');
    const storefrontRoutes = read('routes/storefrontRoutes.js');

    assert.match(storefrontRoutes, /'\/:subdomain\/orders\/:orderId\/cancel'[\s\S]*resolveTenant[\s\S]*cancelTrackedOrder/);
    assert.match(storefrontRoutes, /'\/:subdomain\/orders\/:orderId\/returns'[\s\S]*resolveTenant[\s\S]*createTrackedReturnRequest/);
    assert.match(controller, /exports\.cancelTrackedOrder/);
    assert.match(controller, /exports\.createTrackedReturnRequest/);
    assert.match(controller, /buildPublicOrderQuery\(orderLookup,\s*shopId\)/);
    assert.match(controller, /phonesMatch\(order\.shipping\?\.address\?\.phone,\s*phone\)/);
    assert.match(controller, /status:\s*'Pending'/);
    assert.match(controller, /code:\s*'ORDER_CANCEL_NOT_ALLOWED'/);
    assert.match(controller, /restoreCancelledOrderInventory/);
    assert.match(controller, /ReturnRequest\.create/);
    assert.match(controller, /code:\s*'RETURN_NOT_ALLOWED'/);
    assert.match(controller, /order\.status !== 'Delivered'/);
    assert.match(controller, /RETURN_WINDOW_HOURS\s*=\s*24/);
    assert.match(controller, /shipping\?\.deliveredAt/);
    assert.match(controller, /A return request is already submitted/);
});

test('customer-facing product and order responses hide vendor cost fields', () => {
    const productSerializer = read('services/publicProductSerializer.js');
    const orderSerializer = read('services/orderPrivacyService.js');
    const storeController = read('controllers/storeController.js');
    const publicController = read('controllers/publicController.js');
    const orderController = read('controllers/orderController.js');

    assert.match(productSerializer, /delete clean\.comments/);
    assert.match(productSerializer, /delete clean\.inventory/);
    assert.match(productSerializer, /delete clean\.tax/);
    assert.doesNotMatch(productSerializer, /buyingPrice/);
    assert.match(orderSerializer, /delete clean\.buyingPrice/);
    assert.match(storeController, /sanitizePublicProduct\(product\)/);
    assert.match(storeController, /sanitizePublicProducts\(products\)/);
    assert.match(publicController, /sanitizeOrderForCustomer\(newOrder\)/);
    assert.match(publicController, /delete clean\.buyingPrice/);
    assert.match(orderController, /sanitizeOrdersForCustomer\(orders\)/);
    assert.match(orderController, /sanitizeOrderForCustomer\(order\)/);
});

test('store builder theme save sanitizes scriptable URLs', () => {
    const controller = read('controllers/storeBuilderController.js');

    assert.match(controller, /sanitizeThemePayload/);
    assert.match(controller, /UNSAFE_URL_PATTERN/);
    assert.match(controller, /javascript\|data\|vbscript/);
    assert.match(controller, /cleanTheme = sanitizeThemePayload\(pickThemePayload\(theme\)\)/);
});

test('purchase order receiving is tenant scoped', () => {
    const controller = read('controllers/purchaseOrderController.js');

    assert.match(controller, /Supplier\.exists\(\{[\s\S]*shop_id:\s*shopId/);
    assert.match(controller, /Product\.exists\(\{[\s\S]*shop_id:\s*shopId[\s\S]*'variants\._id'/);
    assert.match(controller, /PurchaseOrder\.findOne\(\{[\s\S]*_id:\s*req\.params\.id[\s\S]*shop_id:\s*shopId/);
    assert.match(controller, /Product\.findOne\(\{[\s\S]*_id:\s*item\.productId[\s\S]*shop_id:\s*shopId/);
    assert.doesNotMatch(controller, /PurchaseOrder\.findById\(req\.params\.id\)/);
    assert.doesNotMatch(controller, /Product\.findById\(item\.productId\)/);
});

test('security middleware and rate limits are mounted', () => {
    const source = read('app.js');

    assert.match(source, /app\.use\(helmet\(\)\)/);
    assert.match(source, /sanitizeRequest/);
    assert.match(source, /app\.use\(generalLimiter\)/);
    assert.match(source, /app\.use\(csrfProtection\)/);
    assert.match(source, /app\.use\('\/api\/auth',\s*authLimiter,\s*authRoutes\)/);
    assert.match(source, /app\.use\('\/api\/public',\s*publicWriteLimiter,\s*publicRoutes\)/);
    assert.match(source, /app\.use\('\/api\/analytics',\s*publicWriteLimiter,\s*analyticsEventRoutes\)/);
});

test('csrf token route is mounted and unsafe clients attach csrf header', () => {
    const routes = read('routes/authRoutes.js');
    const adminApi = readProject('ecommerce-admin/src/api/api.js');
    const storefrontApi = readProject('ecommerce-storefront/src/api/api.js');

    assert.match(routes, /'\/csrf-token'[\s\S]*issueCsrfToken/);
    assert.match(adminApi, /x-csrf-token/);
    assert.match(adminApi, /\/auth\/csrf-token/);
    assert.match(storefrontApi, /x-csrf-token/);
    assert.match(storefrontApi, /\/auth\/csrf-token/);
});

test('public health endpoint is redacted for production safety', () => {
    const source = read('app.js');
    const start = source.indexOf("app.get('/api/health'");
    const end = source.indexOf('app.use(csrfProtection)');
    const block = source.slice(start, end);

    assert.match(block, /status:\s*'ok'/);
    assert.match(block, /timestamp/);
    assert.match(block, /uptime/);
    assert.doesNotMatch(block, /mail/);
    assert.doesNotMatch(block, /adminEmailUser|orderMail|resendFrom|hasResendApiKey|smtpFallbackConfigured/);
    assert.doesNotMatch(block, /process\.env\.(ADMIN_EMAIL_USER|ORDER_MAIL|RESEND_FROM|RESEND_API_KEY|EMAIL_PASS)/);
});

test('storefront next image config restricts remote optimization hosts', () => {
    const config = readProject('ecommerce-storefront/next.config.mjs');
    const helper = readProject('ecommerce-storefront/src/lib/imageDomains.js');

    assert.match(config, /hostname:\s*'res\.cloudinary\.com'/);
    assert.doesNotMatch(config, /hostname:\s*['"]\*\*['"]/);
    assert.match(helper, /res\.cloudinary\.com/);
    assert.match(helper, /shouldUseUnoptimizedImage/);
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
    assert.match(controller, /const shopQuery = subdomain\.includes\('\.'\)/);
    assert.match(controller, /buildVerifiedCustomDomainQuery\(subdomain\)/);
    assert.match(controller, /subdomain,\s*[\r\n\s]*isActive:\s*true/);
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
    assert.match(routes, /router\.use\(requireShopFeature\('growthCenter'\)\)/);
    assert.match(routes, /router\.post\('\/generate-ad-copy',\s*requireShopFeature\('aiAdGenerator'\),\s*generateAdCopy\)/);
    assert.match(routes, /router\.get\('\/overview',\s*getGrowthOverview\)/);
    assert.match(controller, /shop_id:\s*asObjectId\(req\.tenantId\)/);
    assert.match(controller, /Product\.findOne\(\{[\s\S]*shop_id:\s*req\.tenantId/);
});

test('shop feature flags are enforced on backend routes and vendor frontend routes', () => {
    const featureGate = read('middlewares/featureGate.js');
    const featureService = read('services/shops/featureAccessService.js');
    const analyticsRoutes = read('routes/analyticsRoutes.js');
    const growthRoutes = read('routes/growthRoutes.js');
    const storeBuilderRoutes = read('routes/storeBuilderRoutes.js');
    const promotionRoutes = read('routes/promotionRoutes.js');
    const adminRoutes = read('routes/adminRoutes.js');
    const collectionRoutes = read('routes/collectionRoutes.js');
    const bannerRoutes = read('routes/bannerRoutes.js');
    const app = readProject('ecommerce-admin/src/App.jsx');
    const sidebar = readProject('ecommerce-admin/src/components/dashboard/Sidebar.jsx');
    const requireFeature = readProject('ecommerce-admin/src/components/RequireFeature.jsx');
    const growthCenter = readProject('ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx');
    const authController = read('controllers/authController.js');

    assert.match(featureService, /computeEffectiveFeatures/);
    assert.match(featureService, /shopOverride !== false/);
    assert.match(featureService, /planAllows !== false/);
    assert.match(featureGate, /code:\s*'FEATURE_NOT_AVAILABLE'/);
    assert.match(featureGate, /feature/);
    assert.match(analyticsRoutes, /requireShopFeature\('analytics'\)/);
    assert.match(growthRoutes, /requireShopFeature\('growthCenter'\)/);
    assert.match(growthRoutes, /requireShopFeature\('aiAdGenerator'\)/);
    assert.match(storeBuilderRoutes, /requireShopFeature\('storeBuilder'\)/);
    assert.match(storeBuilderRoutes, /requireShopFeatureWhenCustomDomainChanges\('customDomain'\)/);
    assert.match(promotionRoutes, /requireShopFeature\('coupons'\)/);
    assert.match(adminRoutes, /requireShopFeature\('bulkProductTools'\)/);
    assert.match(adminRoutes, /requireShopFeature\('staffAccounts'\)/);
    assert.match(collectionRoutes, /requireShopFeature\('bulkProductTools'\)/);
    assert.match(bannerRoutes, /requireShopFeature\('storeBuilder'\)/);
    assert.match(app, /withFeature\('analytics',\s*<AdvancedAnalytics/);
    assert.match(app, /withFeature\('storeBuilder',\s*<StoreBuilder/);
    assert.match(app, /withFeature\('staffAccounts',\s*<StaffPermissions/);
    assert.match(app, /withFeature\('coupons',\s*<Promotions/);
    assert.match(app, /withFeature\('bulkProductTools',\s*<CatalogTools/);
    assert.match(app, /withFeature\('growthCenter',\s*<GrowthCenter/);
    assert.match(sidebar, /feature:\s*'analytics'/);
    assert.match(sidebar, /LockKeyhole/);
    assert.match(requireFeature, /This feature is not enabled for your store/);
    assert.match(growthCenter, /hasFeature\(user,\s*'aiAdGenerator'\)/);
    assert.match(growthCenter, /disabled=\{!canUseAdGenerator\}/);
    assert.match(authController, /getShopFeatureFlags/);
    assert.match(authController, /effectiveFeatures/);
});

test('vendor verification routes are protected and use NID upload middleware', () => {
    const adminRoutes = read('routes/adminRoutes.js');
    const superAdminRoutes = read('routes/superAdminRoutes.js');
    const service = read('services/vendorVerificationService.js');
    const privacyService = read('services/vendorVerificationPrivacyService.js');
    const cloudinary = read('config/cloudinary.js');

    assert.match(adminRoutes, /'\/vendor-verification\/status'[\s\S]*protect[\s\S]*authorize\('VendorAdmin', 'VendorStaff'\)[\s\S]*getVendorVerificationStatus/);
    assert.match(adminRoutes, /'\/vendor-verification\/submit'[\s\S]*protect[\s\S]*authorize\('VendorAdmin', 'VendorStaff'\)[\s\S]*requirePermission\('settings'\)[\s\S]*vendorNidUpload[\s\S]*submitVendorVerification/);
    assert.match(adminRoutes, /'\/vendor-verification\/document\/:type'[\s\S]*getVendorVerificationDocument/);
    assert.match(adminRoutes, /name:\s*'nidFront',\s*maxCount:\s*1/);
    assert.match(adminRoutes, /name:\s*'nidBack',\s*maxCount:\s*1/);
    assert.match(superAdminRoutes, /router\.use\(authorize\('SuperAdmin'\)\)/);
    assert.match(superAdminRoutes, /router\.get\('\/vendor-verifications',\s*getVendorVerifications\)/);
    assert.match(superAdminRoutes, /router\.get\('\/vendor-verifications\/:id\/document\/:type',\s*getSuperAdminVendorVerificationDocument\)/);
    assert.match(superAdminRoutes, /router\.patch\('\/vendor-verifications\/:id\/approve',\s*approveVendorVerification\)/);
    assert.match(superAdminRoutes, /router\.patch\('\/vendor-verifications\/:id\/reject',\s*rejectVendorVerification\)/);
    assert.match(service, /VERIFICATION_DEADLINE_DAYS\s*=\s*20/);
    assert.match(service, /REJECTED_NID_RETENTION_DAYS\s*=\s*180/);
    assert.match(service, /VERIFICATION_SUSPENSION_REASON/);
    assert.match(privacyService, /delete sanitized\.nidFrontUrl/);
    assert.match(privacyService, /maskNidNumber/);
    assert.match(privacyService, /createSignedNidUrl/);
    assert.match(cloudinary, /type:\s*'authenticated'/);
    assert.match(cloudinary, /vendor_verifications\/nid/);
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

test('super admin frontend routes and navigation are SuperAdmin-only', () => {
    const app = readProject('ecommerce-admin/src/App.jsx');
    const sidebar = readProject('ecommerce-admin/src/components/dashboard/Sidebar.jsx');
    const panel = readProject('ecommerce-admin/src/pages/superadmin/SuperAdminPanel.jsx');
    const detail = readProject('ecommerce-admin/src/pages/superadmin/ShopDetail.jsx');
    const verification = readProject('ecommerce-admin/src/pages/superadmin/VendorVerifications.jsx');
    const auditLogs = readProject('ecommerce-admin/src/pages/superadmin/PlatformAuditLogs.jsx');

    assert.match(app, /<ProtectedRoute allowedRoles=\{\['SuperAdmin'\]\}/);
    assert.match(app, /path="\/super-admin"/);
    assert.match(app, /path="vendor-verifications"/);
    assert.match(app, /path="audit-logs"/);
    assert.match(sidebar, /user\?\.role === 'SuperAdmin'/);
    assert.match(sidebar, /\/super-admin\/vendor-verifications/);
    assert.match(sidebar, /\/super-admin\/audit-logs/);
    assert.match(panel, /API\.get\('\/super-admin\/overview'/);
    assert.match(detail, /API\.get\(`\/super-admin\/shops\/\$\{shopId\}`\)/);
    assert.match(verification, /API\.get\('\/super-admin\/vendor-verifications'/);
    assert.match(verification, /\/super-admin\/vendor-verifications\/\$\{item\._id\}\/document\/\$\{type\}/);
    assert.match(auditLogs, /API\.get\('\/super-admin\/audit-logs'/);
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
    const verificationService = read('services/vendorVerificationService.js');

    assert.match(controller, /status === 'Suspended' && requireReason/);
    assert.match(controller, /Approve the vendor verification record to reactivate this verification-suspended shop/);
    assert.match(controller, /CRITICAL_FEATURE_FLAGS/);
    assert.match(controller, /req\.body\.isActive === false && requireReason/);
    assert.match(controller, /status === 'Failed' && requireReason/);
    assert.match(controller, /req\.body\.customDomain\?\.status === 'Failed' && requireReason/);
    assert.match(controller, /\['Resolved', 'Dismissed'\]\.includes\(status\) && requireReason/);
    assert.match(vendorVerification, /Rejection reason is required/);
    assert.match(vendorVerification, /logPlatformAudit/);
    assert.match(verificationService, /if \(isVerificationSuspension\(shop\)\) \{[\s\S]*shop\.approvalStatus = 'Approved'[\s\S]*shop\.isActive = true[\s\S]*shop\.suspensionReason = ''[\s\S]*\}/);
    assert.match(verificationService, /shop\.suspensionReason !== VERIFICATION_SUSPENSION_REASON/);
});

test('super admin sensitive actions create platform audit entries', () => {
    const controller = read('controllers/superAdminController.js');
    const vendorVerification = read('controllers/vendorVerificationController.js');

    assert.match(controller, /action:\s*status === 'Suspended' \? 'shop\.suspended'/);
    assert.match(controller, /action:\s*'shop\.governance_updated'/);
    assert.match(controller, /action:\s*'shop\.plan_changed'/);
    assert.match(controller, /action:\s*'shop\.feature_flags_changed'/);
    assert.match(controller, /action:\s*'plan\.upserted'/);
    assert.match(controller, /action:\s*'domain\.status_changed'/);
    assert.match(controller, /action:\s*'announcement\.created'/);
    assert.match(controller, /action:\s*'announcement\.published'/);
    assert.match(controller, /action:\s*'announcement\.unpublished'/);
    assert.match(controller, /action:\s*'announcement\.archived'/);
    assert.match(controller, /action:\s*'abuse_report\.status_changed'/);
    assert.match(vendorVerification, /action:\s*'vendor_verification\.document_viewed'/);
    assert.match(vendorVerification, /action:\s*'vendor_verification\.approved'/);
    assert.match(vendorVerification, /action:\s*'vendor_verification\.rejected'/);
});

test('super admin data models constrain governance values', () => {
    const announcement = read('models/PlatformAnnouncement.js');
    const plan = read('models/VendorPlan.js');
    const shop = read('models/Shop.js');

    assert.match(announcement, /enum:\s*\['All', 'VendorAdmin', 'VendorStaff'\]/);
    assert.match(announcement, /targetAudience/);
    assert.match(announcement, /enum:\s*\['all_vendors', 'all_shops', 'plan', 'shop'\]/);
    assert.match(announcement, /enum:\s*\['Info', 'Warning', 'Critical'\]/);
    assert.match(announcement, /targetPlan/);
    assert.match(announcement, /targetPlanId/);
    assert.match(announcement, /targetShopId/);
    assert.match(announcement, /startAt/);
    assert.match(announcement, /maxlength:\s*140/);
    assert.match(announcement, /maxlength:\s*1000/);
    assert.match(plan, /name:[\s\S]*required:\s*true[\s\S]*unique:\s*true/);
    assert.match(plan, /features:[\s\S]*storeBuilder[\s\S]*analytics[\s\S]*staffAccounts/);
    assert.match(shop, /customDomain:[\s\S]*status:[\s\S]*enum:\s*\['NotConfigured', 'PendingVerification', 'OwnershipVerified', 'RoutingPending', 'Verified', 'Failed'\]/);
    assert.match(shop, /customDomain:[\s\S]*ownershipVerified/);
    assert.match(shop, /customDomain:[\s\S]*routingVerified/);
    assert.match(shop, /customDomain:[\s\S]*manuallyVerifiedRouting/);
});

test('announcements use soft archive lifecycle', () => {
    const model = read('models/PlatformAnnouncement.js');
    const routes = read('routes/superAdminRoutes.js');
    const adminRoutes = read('routes/adminRoutes.js');
    const controller = read('controllers/superAdminController.js');
    const vendorController = read('controllers/platformAnnouncementController.js');

    assert.match(model, /isPublished/);
    assert.match(model, /archivedAt/);
    assert.match(routes, /router\.patch\('\/announcements\/:id\/publish',\s*publishAnnouncement\)/);
    assert.match(routes, /router\.patch\('\/announcements\/:id\/unpublish',\s*unpublishAnnouncement\)/);
    assert.match(routes, /router\.delete\('\/announcements\/:id',\s*archiveAnnouncement\)/);
    assert.match(adminRoutes, /router\.get\([\s\S]*'\/announcements'[\s\S]*getVendorAnnouncements[\s\S]*\)/);
    assert.match(controller, /normalizeAnnouncementPayload/);
    assert.match(controller, /payload\.targetAudience = 'shop'/);
    assert.match(controller, /payload\.targetAudience = 'plan'/);
    assert.match(vendorController, /targetPlan/);
    assert.match(vendorController, /targetPlanId/);
    assert.match(vendorController, /targetShopId/);
    assert.match(vendorController, /matchesAnnouncementTarget/);
    assert.match(vendorController, /serializeVendorAnnouncement/);
    assert.doesNotMatch(vendorController, /metadata/);
    assert.match(controller, /announcement\.archived/);
    assert.doesNotMatch(controller, /PlatformAnnouncement\.findByIdAndDelete/);
});

test('privacy consent, analytics retention, and data requests are wired', () => {
    const analyticsModel = read('models/AnalyticsEvent.js');
    const consentModel = read('models/ConsentLog.js');
    const dataRequestModel = read('models/DataRequest.js');
    const orderController = read('controllers/orderController.js');
    const publicController = read('controllers/publicController.js');
    const storefrontRoutes = read('routes/storefrontRoutes.js');
    const adminRoutes = read('routes/adminRoutes.js');
    const checkout = readProject('ecommerce-storefront/src/app/[subdomain]/checkout/page.jsx');
    const tracker = readProject('ecommerce-storefront/src/utils/analyticsTracker.js');

    assert.match(analyticsModel, /RAW_ANALYTICS_RETENTION_DAYS\s*=\s*180/);
    assert.match(analyticsModel, /expireAfterSeconds:\s*0/);
    assert.match(consentModel, /checkout_policy/);
    assert.match(dataRequestModel, /REQUEST_TYPES/);
    assert.match(orderController, /ConsentLog\.create/);
    assert.match(publicController, /Policy consent is required before checkout/);
    assert.match(storefrontRoutes, /'\/:subdomain\/privacy\/data-requests'[\s\S]*protect[\s\S]*createCustomerDataRequest/);
    assert.match(adminRoutes, /'\/privacy\/data-requests'[\s\S]*getAdminDataRequests/);
    assert.match(checkout, /policyAccepted/);
    assert.match(checkout, /checkoutPolicyAccepted:\s*true/);
    assert.match(tracker, /ANALYTICS_CONSENT_KEY/);
    assert.match(tracker, /canTrackAnalytics/);
});

test('request IDs, structured logging, and operations docs exist', () => {
    const app = read('app.js');
    const requestContext = read('middlewares/requestContext.js');
    const errorHandler = read('middlewares/error.js');
    const logger = read('services/logger.js');

    assert.match(app, /app\.use\(requestContext\)/);
    assert.match(requestContext, /x-request-id/);
    assert.match(requestContext, /crypto\.randomUUID/);
    assert.match(errorHandler, /logger\.error\('unhandled_error'/);
    assert.match(logger, /SENSITIVE_KEYS/);
    assert.match(logger, /\[REDACTED\]/);
    assert.ok(fs.existsSync(path.join(root, '../../docs/operations/production-checklist.md')));
    assert.ok(fs.existsSync(path.join(root, '../../docs/operations/backup-restore.md')));
    assert.ok(fs.existsSync(path.join(root, '../../docs/operations/incident-runbook.md')));
    assert.ok(fs.existsSync(path.join(root, '../../docs/operations/monitoring.md')));
});

test('mongo-backed queue, worker, and analytics rollups are available', () => {
    const packageJson = read('package.json');
    const jobModel = read('models/Job.js');
    const queue = read('services/jobQueueService.js');
    const worker = read('workers/index.js');
    const rollup = read('scripts/runAnalyticsRollup.js');
    const productMetric = read('models/ProductDailyMetric.js');
    const shopMetric = read('models/ShopDailyMetric.js');
    const shopNotifications = read('services/shopEventNotificationService.js');
    const orderController = read('controllers/orderController.js');

    assert.match(packageJson, /"worker":\s*"node workers\/index\.js"/);
    assert.match(packageJson, /"rollup:analytics":\s*"node scripts\/runAnalyticsRollup\.js"/);
    assert.match(jobModel, /JOB_STATUSES\s*=\s*\['queued', 'running', 'completed', 'failed', 'dead'\]/);
    assert.match(jobModel, /status:[\s\S]*enum:\s*JOB_STATUSES/);
    assert.match(queue, /findOneAndUpdate/);
    assert.match(queue, /failJob/);
    assert.match(worker, /claimNextJob/);
    assert.match(worker, /processPathaoSyncJob/);
    assert.match(rollup, /ProductDailyMetric\.updateOne/);
    assert.match(rollup, /ShopDailyMetric\.updateOne/);
    assert.match(productMetric, /conversionRate/);
    assert.match(shopMetric, /deliveredRevenue/);
    assert.match(shopNotifications, /enqueueJob/);
    assert.match(orderController, /Pathao sync queued/);
});

test('ci workflow and test docs exist', () => {
    assert.ok(fs.existsSync(path.join(root, '../../.github/workflows/ci.yml')));
    assert.ok(fs.existsSync(path.join(root, '../../docs/testing.md')));
    assert.ok(fs.existsSync(path.join(root, '.env.test.example')));
});
