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
    const accessService = read('services/orders/orderAccessService.js');
    const routes = read('routes/storefrontRoutes.js');

    assert.match(block, /shop_id:\s*shopId/);
    assert.match(block, /requireOrderAccess\(req,\s*\{/);
    assert.match(block, /ORDER_ACCESS_ACTIONS\.track/);
    assert.match(accessService, /normalizeBDPhone\(savedPhone\)/);
    assert.match(accessService, /normalizeBDPhone\(submittedPhone\)/);
    assert.doesNotMatch(accessService, /endsWith/);
    assert.match(routes, /access\/send-otp/);
    assert.match(routes, /access\/verify-otp/);
    assert.match(block, /\.select\('items pricing promotion payment shipping status cancellation timeline createdAt updatedAt'\)/);
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
    assert.match(controller, /ORDER_ACCESS_ACTIONS\.cancel/);
    assert.match(controller, /ORDER_ACCESS_ACTIONS\.return/);
    assert.match(controller, /getAccessTokenErrorResponse/);
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

    assert.match(productSerializer, /clean\.comments = sanitizePublicKeyValueItems\(clean\.comments\)/);
    assert.match(productSerializer, /delete clean\.inventory/);
    assert.match(productSerializer, /delete clean\.tax/);
    assert.doesNotMatch(productSerializer, /buyingPrice/);
    assert.match(orderSerializer, /delete clean\.buyingPrice/);
    assert.match(storeController, /sanitizePublicProduct\(pricedProduct\)/);
    assert.match(storeController, /sanitizePublicProducts\(pricedProducts\)/);
    assert.match(publicController, /sanitizeOrderForCustomer\(newOrder\)/);
    assert.match(publicController, /delete clean\.buyingPrice/);
    assert.match(orderController, /sanitizeOrdersForCustomer\(orders\)/);
    assert.match(orderController, /sanitizeOrderForCustomer\(order\)/);
});

test('store builder theme save sanitizes scriptable URLs', () => {
    const service = read('services/storeBuilder/storeBuilderService.js');
    const contract = readProject('packages/storefront-theme/index.cjs');

    assert.match(service, /sanitizeThemePayload/);
    assert.match(service, /validateTheme/);
    assert.match(service, /const sanitizedTheme = sanitizeThemePayload\(toJsonSafeTheme\(theme\)\)/);
    assert.match(service, /validateTheme\(sanitizedTheme\)/);
    assert.match(service, /normalizeTheme\(sanitizedTheme\)/);
    assert.match(contract, /UNSAFE_URL_PATTERN/);
    assert.match(contract, /HEX_COLOR_REGEX/);
    assert.match(contract, /sanitizeColorObject/);
    assert.match(contract, /javascript\|vbscript\|data/);
});

test('purchase order receiving is tenant scoped', () => {
    const controller = read('controllers/purchaseOrderController.js');
    const routes = read('routes/purchaseOrderRoutes.js');

    assert.match(controller, /Supplier\.exists\(\{[\s\S]*shop_id:\s*shopId/);
    assert.match(controller, /Product\.exists\(\{[\s\S]*shop_id:\s*shopId[\s\S]*'variants\._id'/);
    assert.match(controller, /PurchaseOrder\.findOne\(\{[\s\S]*_id:\s*req\.params\.id[\s\S]*shop_id:\s*shopId/);
    assert.match(controller, /Product\.findOne\(\{[\s\S]*_id:\s*item\.productId[\s\S]*shop_id:\s*shopId/);
    assert.match(routes, /requirePermission\('purchaseOrdersRead'\)/);
    assert.match(routes, /requirePermission\('purchaseOrdersManage'\)/);
    assert.match(routes, /requirePermission\('purchaseOrdersReceive'\)/);
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
    const storeBuilderRoutes = read('routes/storeBuilderRoutes.js');

    assert.match(source, /fileSize:\s*10\s*\*\s*1024\s*\*\s*1024/);
    assert.match(source, /allowedMimeTypes/);
    assert.doesNotMatch(source.match(/const allowedMimeTypes[\s\S]*?\]\);/)?.[0] || '', /image\/svg\+xml/);
    assert.match(source, /const allowedBrandMimeTypes[\s\S]*image\/svg\+xml/);
    assert.match(source, /const brandUpload = multer/);
    assert.match(source, /fileFilter/);
    assert.match(storeBuilderRoutes, /brandUpload\.single\('logo'\)/);
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

test('growth center routes are tenant protected with growth permission', () => {
    const app = read('app.js');
    const routes = read('routes/growthRoutes.js');
    const controller = read('controllers/growthController.js');

    assert.match(app, /app\.use\('\/api\/admin\/growth',\s*growthRoutes\)/);
    assert.match(routes, /router\.use\(protect\)/);
    assert.match(routes, /router\.use\(authorize\('VendorAdmin', 'VendorStaff'\)\)/);
    assert.match(routes, /router\.use\(requirePermission\('growthCenter'\)\)/);
    assert.match(routes, /router\.use\(requireShopFeature\('growthCenter'\)\)/);
    assert.match(routes, /router\.post\('\/generate-ad-copy',\s*requireShopFeature\('aiAdGenerator'\),\s*generateAdCopy\)/);
    assert.match(routes, /router\.get\('\/overview',\s*getGrowthOverview\)/);
    assert.match(controller, /shop_id:\s*asObjectId\(req\.tenantId\)/);
    assert.match(controller, /Product\.findOne\(\{[\s\S]*shop_id:\s*req\.tenantId/);
});

test('growth center revenue metrics use delivered order revenue only', () => {
    const controller = read('controllers/growthController.js');
    const growthCenter = readProject('ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx');

    assert.match(controller, /const deliveredRevenueDateExpression/);
    assert.match(controller, /status:\s*'Delivered'/);
    assert.match(controller, /deliveredRevenueMetrics/);
    assert.match(controller, /returnedRevenueMetrics/);
    assert.match(controller, /const netDeliveredRevenue = Math\.max\(0,\s*Number\(revenue\.deliveredRevenue \|\| 0\) - Number\(returned\.returnedRevenue \|\| 0\)\)/);
    assert.match(controller, /revenue:\s*netDeliveredRevenue/);
    assert.match(controller, /grossDeliveredRevenue:\s*revenue\.deliveredRevenue \|\| 0/);
    assert.match(controller, /returnedRevenue:\s*returned\.returnedRevenue \|\| 0/);
    assert.match(controller, /eventType:\s*'delivered_revenue'/);
    assert.doesNotMatch(controller, /revenue:\s*\{\s*\$sum:\s*\{\s*\$cond:\s*\[\{\s*\$eq:\s*\['\$eventType', eventTypes\.orders\]/);
    assert.match(growthCenter, /Delivered Revenue/);
    assert.match(growthCenter, /Only delivered product revenue is counted/);
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
    const navigationRegistry = readProject('ecommerce-admin/src/config/dashboardNavigation.jsx');
    const requireFeature = readProject('ecommerce-admin/src/components/RequireFeature.jsx');
    const growthCenter = readProject('ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx');
    const authController = read('controllers/authController.js');

    assert.match(featureService, /computeEffectiveFeatures/);
    assert.match(featureService, /shopOverride !== false/);
    assert.match(featureService, /planAllows === true/);
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
    assert.match(navigationRegistry, /feature:\s*'analytics'/);
    assert.match(sidebar, /LockKeyhole/);
    assert.match(requireFeature, /This feature is not enabled for your store/);
    assert.match(growthCenter, /hasFeature\(user,\s*'aiAdGenerator'\)/);
    assert.match(growthCenter, /disabled=\{!canUseAdGenerator\}/);
    assert.match(authController, /getShopPlanAccess/);
    assert.match(authController, /effectiveFeatures/);
});

test('catalog collection AI is tenant-protected and preview-applied in admin UI', () => {
    const collectionRoutes = read('routes/collectionRoutes.js');
    const collectionController = read('controllers/collectionController.js');
    const collectionAiService = read('services/collections/collectionAiService.js');
    const catalogTools = readProject('ecommerce-admin/src/pages/dashboard/CatalogTools.jsx');

    assert.match(collectionRoutes, /router\.use\(protect\)/);
    assert.match(collectionRoutes, /router\.use\(authorize\('VendorAdmin', 'VendorStaff'\)\)/);
    assert.match(collectionRoutes, /router\.use\(requirePermission\('catalogTools'\)\)/);
    assert.match(collectionRoutes, /router\.post\('\/ai\/suggest'[\s\S]*collectionAiLimiter[\s\S]*suggestCollectionAi\)/);
    assert.match(collectionController, /Product\.find\(\{[\s\S]*shop_id:\s*req\.tenantId/);
    assert.doesNotMatch(collectionController, /shop_id:\s*req\.body/);
    assert.match(collectionAiService, /GEMINI_API_KEY/);
    assert.match(collectionAiService, /responseMimeType:\s*'application\/json'/);
    assert.match(collectionAiService, /Never include private customer data/);
    assert.match(catalogTools, /\/admin\/collections\/ai\/suggest/);
    assert.match(catalogTools, /Generate with AI/);
    assert.match(catalogTools, /Apply all/);
    assert.match(catalogTools, /Suggestion applied\. Review before saving/);
});

test('scheduled product launch uses persisted jobs and hides products until publication', () => {
    const productModel = read('models/Product.js');
    const productValidation = read('validations/productValidation.js');
    const productController = read('controllers/productController.js');
    const scheduledService = read('services/products/scheduledProductService.js');
    const worker = read('workers/index.js');
    const addProduct = readProject('ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx');
    const editProduct = readProject('ecommerce-admin/src/pages/dashboard/products/EditProduct.jsx');

    assert.match(productModel, /publicationStatus/);
    assert.match(productModel, /publishAt/);
    assert.match(productModel, /publishedAt/);
    assert.match(productModel, /productSchema\.index\(\{ shop_id:\s*1,\s*publicationStatus:\s*1,\s*publishAt:\s*1 \}\)/);
    assert.match(productModel, /this\.publicationStatus === 'scheduled'[\s\S]*this\.status = 'Draft'[\s\S]*this\.isActive = false/);
    assert.match(productValidation, /publicationStatus:\s*Joi\.string\(\)\.valid\('draft', 'scheduled', 'published'\)/);
    assert.match(productValidation, /publishAt:\s*Joi\.date\(\)\.iso\(\)/);
    assert.match(productController, /normalizeProductPublicationFields\(value\)/);
    assert.match(productController, /enqueueScheduledProductPublication/);
    assert.match(scheduledService, /queue:\s*SCHEDULED_PRODUCT_QUEUE/);
    assert.match(scheduledService, /publicationStatus:\s*'scheduled'/);
    assert.match(scheduledService, /publishAt:\s*\{\s*\$lte:\s*now\s*\}/);
    assert.match(worker, /\[SCHEDULED_PRODUCT_QUEUE\]: processScheduledProductJob/);
    assert.match(addProduct, /Scheduled/);
    assert.match(addProduct, /publicationStatus/);
    assert.match(addProduct, /Publish date and time/);
    assert.match(editProduct, /Scheduled/);
    assert.match(editProduct, /publicationStatus/);
});

test('low stock warnings are queued, tenant-scoped, and sent only on threshold crossing', () => {
    const service = read('services/inventoryLowStockAlertService.js');
    const productModel = read('models/Product.js');
    const notificationModel = read('models/Notification.js');
    const worker = read('workers/index.js');
    const productController = read('controllers/productController.js');
    const inventoryController = read('controllers/inventory.js');
    const orderController = read('controllers/orderController.js');
    const publicController = read('controllers/publicController.js');

    assert.match(productModel, /lowStockThreshold/);
    assert.match(productModel, /lowStockAlertStatus/);
    assert.match(service, /LOW_STOCK_ALERT_QUEUE/);
    assert.match(service, /LOW_STOCK_ALERT_JOB/);
    assert.match(service, /markLowStockAlertQueued/);
    assert.match(service, /markLowStockAlertSent/);
    assert.match(service, /markLowStockAlertFailed/);
    assert.match(service, /await enqueueJob\(\{[\s\S]*idempotencyKey/);
    assert.match(service, /await markLowStockAlertQueued/);
    assert.match(service, /variant\?\.inventory\?\.lowStockThreshold/);
    assert.match(service, /toNumber\(beforeStock\) > threshold && toNumber\(afterStock\) <= threshold/);
    assert.match(service, /Product\.findOne\(\{[\s\S]*shop_id:\s*shopId/);
    assert.match(service, /createNotification\(\{[\s\S]*type:\s*'inventory'/);
    assert.match(service, /getVendorAdminEmails/);
    assert.match(service, /sendVendorNotificationEmail/);
    assert.match(service, /ADMIN_EMAIL_USER/);
    assert.match(service, /fallbackRecipientUsed/);
    assert.match(service, /low_stock_alert_sent/);
    assert.match(notificationModel, /'inventory'/);
    assert.match(worker, /\[LOW_STOCK_ALERT_QUEUE\]: processLowStockAlertJob/);
    assert.match(worker, /markLowStockAlertFailed/);
    assert.match(productController, /enqueueLowStockAlertsForLogs\(logsToInsert\)/);
    assert.match(productController, /enqueueLowStockAlertsForLogs\(lowStockLogs\)/);
    assert.match(inventoryController, /enqueueLowStockAlertFromStockChange/);
    assert.match(orderController, /enqueueLowStockAlertsForLogs\(logsWithRef\)/);
    assert.match(publicController, /enqueueLowStockAlertsForLogs\(logsWithRef\)/);
});

test('promotion scheduling is enforced by backend checkout evaluation and exposed in admin UI', () => {
    const promotionModel = read('models/Promotion.js');
    const promotionService = read('services/promotionService.js');
    const promotionController = read('controllers/promotionController.js');
    const promotionsPage = readProject('ecommerce-admin/src/pages/dashboard/Promotions.jsx');

    assert.match(promotionModel, /startsAt/);
    assert.match(promotionModel, /expiresAt/);
    assert.match(promotionModel, /Promotion expiry date must be after start date/);
    assert.match(promotionService, /promotion\.startsAt && new Date\(promotion\.startsAt\) > now/);
    assert.match(promotionService, /Coupon has not started yet/);
    assert.match(promotionService, /promotion\.expiresAt && new Date\(promotion\.expiresAt\) < now/);
    assert.match(promotionController, /shop_id:\s*req\.tenantId/);
    assert.match(promotionsPage, /startsAt/);
    assert.match(promotionsPage, /Scheduled/);
    assert.match(promotionsPage, /checkout will not apply them before the start time/i);
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
    assert.match(superAdminRoutes, /router\.use\(requirePlatformRole\)/);
    assert.match(superAdminRoutes, /'\/vendor-verifications'[\s\S]*requirePlatformPermission\('compliance\.verification\.read'\)[\s\S]*getVendorVerifications/);
    assert.match(superAdminRoutes, /'\/vendor-verifications\/:id\/document\/:type'[\s\S]*requirePlatformPermission\('compliance\.documents\.view'\)[\s\S]*requireRecentAuthentication[\s\S]*getSuperAdminVendorVerificationDocument/);
    assert.match(superAdminRoutes, /'\/vendor-verifications\/:id\/approve'[\s\S]*requirePlatformPermission\('compliance\.verification\.review'\)[\s\S]*requireRecentAuthentication[\s\S]*approveVendorVerification/);
    assert.match(superAdminRoutes, /'\/vendor-verifications\/:id\/reject'[\s\S]*requirePlatformPermission\('compliance\.verification\.review'\)[\s\S]*requireRecentAuthentication[\s\S]*rejectVendorVerification/);
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
    assert.match(storeBuilderRoutes, /'\/admin'[\s\S]*authorize\('VendorAdmin', 'VendorStaff'\)[\s\S]*requirePermission\('storeBuilder'\)[\s\S]*blockVerificationSuspendedShop[\s\S]*updateStoreBuilderSettings/);
    assert.match(storeBuilderRoutes, /'\/admin\/logo'[\s\S]*blockVerificationSuspendedShop[\s\S]*brandUpload\.single\('logo'\)/);
});

test('store builder SEO AI route is protected and backend-only', () => {
    const storeBuilderRoutes = read('routes/storeBuilderRoutes.js');
    const storeBuilderController = read('controllers/storeBuilderController.js');
    const seoAiService = read('services/storeSeoAiService.js');
    const storeBuilderPage = readProject('ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx');

    assert.match(storeBuilderRoutes, /'\/admin\/seo\/ai-suggest'[\s\S]*authorize\('VendorAdmin', 'VendorStaff'\)[\s\S]*requirePermission\('storeBuilder'\)[\s\S]*requireShopFeature\('storeBuilder'\)[\s\S]*blockVerificationSuspendedShop[\s\S]*suggestStoreSeo/);
    assert.match(storeBuilderController, /Product\.find\(buildPublicProductQuery\(req\.tenantId\)\)/);
    assert.match(storeBuilderController, /Collection\.find\(\{ shop_id:\s*req\.tenantId, isActive:\s*true \}\)/);
    assert.match(storeBuilderController, /generateStoreSeoSuggestion/);
    assert.match(seoAiService, /process\.env\.GEMINI_API_KEY/);
    assert.match(seoAiService, /AI_NOT_CONFIGURED/);
    assert.match(seoAiService, /Please add GEMINI_API_KEY on the backend server/);
    assert.match(seoAiService, /responseMimeType:\s*'application\/json'/);
    assert.doesNotMatch(storeBuilderPage, /GEMINI_API_KEY/);
});

test('public tenant resolution checks verification before exposing storefront', () => {
    const tenant = read('middlewares/tenant.js');

    assert.match(tenant, /ensureShopVerificationStatus/);
    assert.match(tenant, /code:\s*'STORE_UNAVAILABLE'/);
    assert.match(tenant, /This store is temporarily unavailable/);
    assert.doesNotMatch(tenant, /subdomain:\s*subdomain,\s*isActive:\s*true/);
});

test('super admin hardening routes use scoped platform permissions and recent auth', () => {
    const routes = read('routes/superAdminRoutes.js');

    assert.match(routes, /router\.use\(protect\)/);
    assert.match(routes, /router\.use\(requirePlatformRole\)/);
    assert.match(routes, /'\/shops\/:shopId'[\s\S]*platform\.shops\.read[\s\S]*getShopDetail/);
    assert.match(routes, /'\/shops\/:shopId\/status'[\s\S]*platform\.shops\.suspend[\s\S]*requireRecentAuthentication[\s\S]*updateShopStatus/);
    assert.match(routes, /'\/shops\/:shopId\/plan'[\s\S]*billing\.subscriptions\.modify[\s\S]*requireRecentAuthentication[\s\S]*updateShopPlan/);
    assert.match(routes, /'\/shops\/:shopId\/feature-flags'[\s\S]*platform\.shops\.manage[\s\S]*requireRecentAuthentication[\s\S]*updateShopFeatureFlags/);
    assert.match(routes, /'\/audit-logs'[\s\S]*audit\.logs\.view[\s\S]*getPlatformAuditLogs/);
    assert.match(routes, /'\/domains\/:shopId'[\s\S]*platform\.domains\.manage[\s\S]*requireRecentAuthentication[\s\S]*updateDomain/);
    assert.match(routes, /'\/abuse-reports\/:id\/status'[\s\S]*risk\.cases\.manage[\s\S]*requireRecentAuthentication[\s\S]*updateAbuseReportStatus/);
});

test('super admin frontend routes and navigation honor scoped platform permissions', () => {
    const app = readProject('ecommerce-admin/src/App.jsx');
    const sidebar = readProject('ecommerce-admin/src/components/dashboard/Sidebar.jsx');
    const navigationRegistry = readProject('ecommerce-admin/src/config/dashboardNavigation.jsx');
    const panel = readProject('ecommerce-admin/src/pages/superadmin/SuperAdminPanel.jsx');
    const detail = readProject('ecommerce-admin/src/pages/superadmin/ShopDetail.jsx');
    const verification = readProject('ecommerce-admin/src/pages/superadmin/VendorVerifications.jsx');
    const auditLogs = readProject('ecommerce-admin/src/pages/superadmin/PlatformAuditLogs.jsx');

    assert.match(app, /<ProtectedRoute allowedRoles=\{PLATFORM_ROLES\}/);
    assert.match(app, /withPlatformPermission\('billing\.read'/);
    assert.match(app, /withPlatformPermission\('compliance\.verification\.read'/);
    assert.match(app, /path="\/super-admin"/);
    assert.match(app, /path="vendor-verifications"/);
    assert.match(app, /path="audit-logs"/);
    assert.match(sidebar, /isPlatformRole\(user\?\.role\)/);
    assert.match(sidebar, /hasPlatformPermission\(user,\s*item\.permission\)/);
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
    assert.match(controller, /A reason is required for a forced plan change/);
    assert.match(controller, /INVALID_FEATURE_OVERRIDE/);
    assert.match(controller, /status === 'Failed' && requireReason/);
    assert.match(controller, /status === 'Failed' && requireReason/);
    assert.match(controller, /\['Resolved', 'Dismissed'\]\.includes\(status\) && requireReason/);
    assert.match(vendorVerification, /Rejection reason is required/);
    assert.match(vendorVerification, /runCriticalGovernanceAction/);
    assert.match(vendorVerification, /createAuditIntent/);
    assert.match(verificationService, /if \(isVerificationSuspension\(shop\)\) \{[\s\S]*shop\.approvalStatus = 'Approved'[\s\S]*shop\.isActive = true[\s\S]*shop\.suspensionReason = ''[\s\S]*\}/);
    assert.match(verificationService, /shop\.suspensionReason !== VERIFICATION_SUSPENSION_REASON/);
});

test('super admin sensitive actions create platform audit entries', () => {
    const controller = read('controllers/superAdminController.js');
    const vendorVerification = read('controllers/vendorVerificationController.js');

    assert.match(controller, /action:\s*status === 'Suspended' \? 'shop\.suspended'/);
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
    assert.match(routes, /'\/announcements\/:id\/publish'[\s\S]*platform\.announcements\.manage[\s\S]*publishAnnouncement/);
    assert.match(routes, /'\/announcements\/:id\/unpublish'[\s\S]*platform\.announcements\.manage[\s\S]*unpublishAnnouncement/);
    assert.match(routes, /'\/announcements\/:id'[\s\S]*platform\.announcements\.manage[\s\S]*archiveAnnouncement/);
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
    assert.match(jobModel, /JOB_STATUSES\s*=\s*\['queued', 'running', 'completed', 'failed', 'dead', 'cancelled'\]/);
    assert.match(jobModel, /status:[\s\S]*enum:\s*JOB_STATUSES/);
    assert.match(queue, /findOneAndUpdate/);
    assert.match(queue, /failJob/);
    assert.match(queue, /requeueJobs/);
    assert.match(worker, /claimNextJob/);
    assert.match(worker, /processCourierJob/);
    assert.match(worker, /courier:\s*processCourierJob/);
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

test('vendor admin pagination responses keep compatibility metadata', () => {
    const pagination = read('utils/pagination.js');
    const productController = read('controllers/productController.js');
    const customerController = read('controllers/userController.js');
    const returnController = read('controllers/returnController.js');
    const notificationController = read('controllers/notificationController.js');
    const adminProductList = readProject('ecommerce-admin/src/pages/dashboard/products/ProductList.jsx');
    const adminCustomerList = readProject('ecommerce-admin/src/pages/dashboard/customers/CustomerList.jsx');
    const adminReturns = readProject('ecommerce-admin/src/pages/dashboard/Returns.jsx');
    const adminNotifications = readProject('ecommerce-admin/src/pages/dashboard/Notifications.jsx');

    assert.match(pagination, /pages/);
    assert.match(pagination, /totalItems/);
    assert.match(pagination, /totalPages/);
    assert.match(pagination, /hasNextPage/);
    assert.match(pagination, /hasPrevPage/);
    assert.match(productController, /pagination:\s*buildPagination/);
    assert.match(customerController, /hasPaginationParams/);
    assert.match(customerController, /return res\.status\(200\)\.json\(customers\)/);
    assert.match(customerController, /pagination:\s*buildPagination/);
    assert.match(returnController, /pagination:\s*buildPagination/);
    assert.match(notificationController, /pagination:\s*buildPagination/);
    assert.match(adminProductList, /PaginationBar/);
    assert.match(adminCustomerList, /PaginationBar/);
    assert.match(adminReturns, /PaginationBar/);
    assert.match(adminNotifications, /PaginationBar/);
});

test('storefront pagination keeps page sizes, metadata, and controls consistent', () => {
    const productController = read('controllers/productController.js');
    const storeController = read('controllers/storeController.js');
    const collectionController = read('controllers/collectionController.js');
    const shopDataHook = readProject('ecommerce-storefront/src/hooks/useShopData.js');
    const homeClient = readProject('ecommerce-storefront/src/app/[subdomain]/StorefrontHomeClient.jsx');
    const allProducts = readProject('packages/storefront-renderer/reference/StorefrontAllProducts.jsx');
    const collectionPage = readProject('ecommerce-storefront/src/app/[subdomain]/collections/[slug]/page.jsx');
    const collectionClient = readProject('ecommerce-storefront/src/app/[subdomain]/collections/[slug]/CollectionPageClient.jsx');

    assert.match(productController, /normalizeStorefrontPageLimit/);
    assert.match(productController, /isStorefrontRequest[\s\S]*normalizeStorefrontPageLimit\(req\.query\.limit,\s*9\)/);
    assert.match(storeController, /pagination:\s*buildPagination\(\{[\s\S]*limit/);
    assert.match(collectionController, /pagination:\s*buildPagination\(\{\s*total,\s*page,\s*limit\s*\}\)/);
    assert.match(shopDataHook, /\.\.\.\(search && \{ search \}\)/);
    assert.match(homeClient, /debouncedCatalogSearch/);
    assert.match(allProducts, /pagination\?\.totalPages \?\? pagination\?\.pages/);
    assert.match(allProducts, /getVisiblePageNumbers\(currentPage,\s*totalPages\)/);
    assert.match(allProducts, /aria-label="Product pagination"/);
    assert.doesNotMatch(allProducts, /mt-8 hidden items-center justify-center/);
    assert.match(collectionPage, /resolvedSearchParams/);
    assert.match(collectionPage, /pagination=\{data\.pagination\}/);
    assert.match(collectionClient, /aria-label="Collection pagination"/);
});

test('stock mutations use explicit semantics, idempotency, and inventory movement logs', () => {
    const inventoryController = read('controllers/inventory.js');
    const inventoryLog = read('models/InventoryLog.js');
    const inventoryMutation = read('models/InventoryMutation.js');
    const editProduct = readProject('ecommerce-admin/src/pages/dashboard/products/EditProduct.jsx');
    const catalogTools = readProject('ecommerce-admin/src/pages/dashboard/CatalogTools.jsx');

    assert.match(inventoryController, /mode = 'adjust'/);
    assert.match(inventoryController, /normalizedMode === 'set'/);
    assert.match(inventoryController, /expectedCurrentStock is required when setting stock/);
    assert.match(inventoryController, /\$inc:\s*\{[\s\S]*variants\.\$\.stock/);
    assert.match(inventoryController, /\$set:\s*\{[\s\S]*variants\.\$\.stock/);
    assert.match(inventoryController, /InventoryMutation\.findOne\(\{[\s\S]*idempotencyKey/);
    assert.match(inventoryController, /InventoryMutation\.create/);
    assert.match(inventoryController, /IDEMPOTENCY_IN_PROGRESS/);
    assert.match(inventoryController, /IDEMPOTENCY_FAILED/);
    assert.match(inventoryController, /InventoryLog\.create\(logPayload\)/);
    assert.match(inventoryLog, /idempotencyKey/);
    assert.match(inventoryLog, /partialFilterExpression/);
    assert.match(inventoryMutation, /idempotencyKey/);
    assert.match(inventoryMutation, /completed/);
    assert.match(editProduct, /\/admin\/inventory\/stock/);
    assert.match(editProduct, /mode:\s*'adjust'/);
    assert.match(editProduct, /delete inventory\.stock/);
    assert.match(catalogTools, /Stock changes are handled from Inventory/);
    assert.doesNotMatch(catalogTools, /updates\.stock/);
});

test('return proof upload is required for new admin and tracked returns', () => {
    const model = read('models/ReturnRequest.js');
    const service = read('services/returns/returnProofService.js');
    const adminRoutes = read('routes/adminRoutes.js');
    const storefrontRoutes = read('routes/storefrontRoutes.js');
    const returnController = read('controllers/returnController.js');
    const publicController = read('controllers/publicController.js');
    const adminReturns = readProject('ecommerce-admin/src/pages/dashboard/Returns.jsx');
    const trackPage = readProject('ecommerce-storefront/src/app/[subdomain]/track/page.jsx');

    assert.match(model, /proofFileSchema/);
    assert.match(model, /proofSchema/);
    assert.match(model, /proof:\s*\{/);
    assert.match(service, /At least one proof image is required/);
    assert.match(service, /You can upload up to 3 proof images/);
    assert.match(adminRoutes, /returnProofUpload = upload\.fields/);
    assert.match(adminRoutes, /name:\s*'proofImages',\s*maxCount:\s*3/);
    assert.match(adminRoutes, /name:\s*'proofVideo',\s*maxCount:\s*1/);
    assert.match(adminRoutes, /returnProofUpload[\s\S]*createReturn/);
    assert.match(storefrontRoutes, /returnProofUpload[\s\S]*createTrackedReturnRequest/);
    assert.match(returnController, /buildProofFromFiles\(req\.files \|\| \{\}\)/);
    assert.match(publicController, /buildProofFromFiles\(req\.files \|\| \{\}\)/);
    assert.match(publicController, /proof:\s*\{/);
    assert.match(adminReturns, /proofImages/);
    assert.match(adminReturns, /multipart\/form-data/);
    assert.match(trackPage, /returnProofImages/);
    assert.match(trackPage, /multipart\/form-data/);
});

test('customer email campaigns are tenant-scoped, queued, and product-safe', () => {
    const adminRoutes = read('routes/adminRoutes.js');
    const controller = read('controllers/emailController.js');
    const model = read('models/CustomerEmailCampaign.js');
    const service = read('services/customerEmailCampaignService.js');
    const worker = read('workers/index.js');
    const template = read('services/mail/templates/productPromotionTemplate.js');
    const customers = readProject('ecommerce-admin/src/pages/dashboard/customers/CustomerList.jsx');
    const modal = readProject('ecommerce-admin/src/pages/dashboard/customers/CustomerCampaignModal.jsx');

    assert.match(adminRoutes, /'\/customers\/send-email'[\s\S]*requirePermission\('customers'\)[\s\S]*sendEmailToCustomer/);
    assert.match(adminRoutes, /'\/customers\/email-campaigns'[\s\S]*requirePermission\('customers'\)[\s\S]*createCustomerEmailCampaign/);
    assert.match(adminRoutes, /'\/customers\/product-email-campaigns'[\s\S]*requirePermission\('customers'\)[\s\S]*createProductEmailCampaign/);
    assert.match(controller, /shop_id:\s*req\.tenantId/);
    assert.match(controller, /createCampaignJob/);
    assert.match(model, /CustomerEmailCampaign/);
    assert.match(service, /queue:\s*'customer-email'/);
    assert.match(service, /sanitizePublicProduct\(product\)/);
    assert.match(service, /status:\s*'Published'/);
    assert.match(worker, /'customer-email': processCustomerEmailCampaignJob/);
    assert.match(template, /escapeHtml/);
    assert.doesNotMatch(template, /buyingPrice|costPrice|supplier|adminNote|internal/);
    assert.match(customers, /CustomerCampaignModal/);
    assert.match(modal, /\/admin\/customers\/email-campaigns/);
    assert.match(modal, /\/admin\/customers\/product-email-campaigns/);
});

test('staff permissions expose operational sections only and hide owner-only sections', () => {
    const capacity = read('services/staff/staffCapacityService.js');
    const staffModel = read('models/StaffPermission.js');
    const userModel = read('models/User.js');
    const permissionMiddleware = read('middlewares/permission.js');
    const adminRoutes = read('routes/adminRoutes.js');
    const collectionRoutes = read('routes/collectionRoutes.js');
    const storeBuilderRoutes = read('routes/storeBuilderRoutes.js');
    const growthRoutes = read('routes/growthRoutes.js');
    const inventoryRoutes = read('routes/inventory.js');
    const billingRoutes = read('routes/billingRoutes.js');
    const uiPermissions = readProject('ecommerce-admin/src/utils/staffPermissions.js');
    const staffPage = readProject('ecommerce-admin/src/pages/dashboard/StaffPermissions.jsx');
    const sidebar = readProject('ecommerce-admin/src/components/dashboard/Sidebar.jsx');
    const navigationRegistry = readProject('ecommerce-admin/src/config/dashboardNavigation.jsx');
    const app = readProject('ecommerce-admin/src/App.jsx');

    assert.match(capacity, /overview/);
    assert.match(capacity, /catalogTools/);
    assert.match(capacity, /privacyRequests/);
    assert.match(capacity, /growthCenter/);
    assert.match(capacity, /activityLogs/);
    assert.match(capacity, /inventoryRead/);
    assert.match(capacity, /inventoryManage/);
    assert.match(capacity, /purchaseOrdersReceive/);
    assert.doesNotMatch(capacity, /'staff'/);
    assert.doesNotMatch(staffModel, /staff:\s*\{/);
    assert.doesNotMatch(userModel, /staff:\s*\{/);
    assert.match(permissionMiddleware, /permissions\?\.\[permissionName\]/);
    assert.match(adminRoutes, /requirePermission\('returns'\)/);
    assert.match(adminRoutes, /requirePermission\('notifications'\)/);
    assert.match(adminRoutes, /requirePermission\('privacyRequests'\)/);
    assert.match(adminRoutes, /requirePermission\('activityLogs'\)/);
    assert.match(collectionRoutes, /requirePermission\('catalogTools'\)/);
    assert.match(storeBuilderRoutes, /requirePermission\('storeBuilder'\)/);
    assert.match(growthRoutes, /requirePermission\('growthCenter'\)/);
    assert.match(inventoryRoutes, /requirePermission\('inventoryRead'\)/);
    assert.match(inventoryRoutes, /requirePermission\('inventoryManage'\)/);
    assert.match(inventoryRoutes, /requirePermission\('analytics'\)/);
    assert.match(billingRoutes, /authorize\('VendorAdmin'\)/);
    assert.doesNotMatch(billingRoutes, /VendorStaff/);
    assert.match(uiPermissions, /STAFF_OPERATIONAL_PERMISSIONS/);
    assert.doesNotMatch(uiPermissions, /'staff'/);
    assert.match(staffPage, /STAFF_OPERATIONAL_PERMISSIONS/);
    assert.match(navigationRegistry, /hasStaffPermission/);
    assert.match(navigationRegistry, /ownerOnly:\s*true/);
    assert.match(sidebar, /filterVendorNavigation/);
    assert.match(app, /RequireStaffPermission/);
    assert.match(app, /withPermission\('storeBuilder'/);
    assert.match(app, /allowedRoles=\{\['VendorAdmin'\]\}/);
});

test('confirmed order status email is sent through status update endpoint once', () => {
    const validation = read('validations/orderValidation.js');
    const controller = read('controllers/orderController.js');
    const emailService = read('services/orders/orderEmailService.js');
    const pathaoSyncJobService = read('services/pathaoSyncJobService.js');
    const orderList = readProject('ecommerce-admin/src/pages/dashboard/orders/OrderList.jsx');
    const pathaoModal = readProject('ecommerce-admin/src/pages/dashboard/orders/PathaoSyncModal.jsx');

    assert.match(validation, /notifyCustomer/);
    assert.match(validation, /emailSubject/);
    assert.match(validation, /emailMessage/);
    assert.match(controller, /statusChanged && notifyCustomer/);
    assert.match(controller, /notifyCustomerOrderStatus/);
    assert.match(controller, /customerNotified/);
    assert.match(controller, /Pathao sync is already queued[\s\S]*data:\s*order/);
    assert.match(controller, /wantsRetry/);
    assert.match(controller, /requeueJobs\(\{[\s\S]*name:\s*'pathao\.sync_order'/);
    assert.match(emailService, /Your order has been confirmed/);
    assert.match(emailService, /sendMail/);
    assert.match(orderList, /notifyCustomer:\s*true/);
    assert.match(orderList, /!updatedOrder\?\._id/);
    assert.match(orderList, /getCourierStatus/);
    assert.match(orderList, /Retry Courier/);
    assert.match(orderList, /handleRetryCourierQueue/);
    assert.match(orderList, /Retry Queue/);
    assert.match(orderList, /emailSubject:\s*emailData\?\.subject/);
    assert.doesNotMatch(orderList, /\/admin\/orders\/send-email/);
    assert.match(pathaoSyncJobService, /toLocalBDPhone/);
    assert.match(pathaoSyncJobService, /recipient_phone:\s*normalizePathaoPhone/);
    assert.match(pathaoModal, /onConfirmBeforeSync/);
    assert.match(pathaoModal, /onSyncSuccess\(data\.data \|\| null\)/);
    assert.match(pathaoModal, /Courier order will be created after processing/);
});

test('redx courier integration is provider-based, masked, queued, and phone safe', () => {
    const shopModel = read('models/Shop.js');
    const orderModel = read('models/Order.js');
    const adminRoutes = read('routes/adminRoutes.js');
    const courierController = read('controllers/courierController.js');
    const courierConfig = read('services/courierConfigService.js');
    const courierJob = read('services/courierJobService.js');
    const redxService = read('services/redx/redxService.js');
    const orderQuery = read('services/orders/orderQueryService.js');
    const shippingSettings = readProject('ecommerce-admin/src/pages/dashboard/ShippingSettings/ShippingSettings.jsx');
    const pathaoModal = readProject('ecommerce-admin/src/pages/dashboard/orders/PathaoSyncModal.jsx');
    const orderDetails = readProject('ecommerce-admin/src/components/dashboard/OrderDetailsModal.jsx');

    assert.match(shopModel, /couriers:[\s\S]*redx:[\s\S]*tokenEncrypted/);
    assert.match(shopModel, /defaultCourier/);
    assert.match(orderModel, /courierShipmentSchema/);
    assert.match(orderModel, /shippingProvider/);
    assert.match(adminRoutes, /\/shipping\/couriers\/redx\/configure/);
    assert.match(adminRoutes, /\/shipping\/couriers\/redx\/areas\/search/);
    assert.match(adminRoutes, /\/shipping\/couriers\/redx\/pickup-store/);
    assert.match(adminRoutes, /\/orders\/:id\/courier/);
    assert.match(adminRoutes, /requirePermission\('shipping'\)/);
    assert.match(adminRoutes, /requirePermission\('orders'\)/);
    assert.match(courierController, /Order\.findOne\(\{\s*_id:\s*id,\s*shop_id:\s*req\.tenantId/);
    assert.match(courierController, /enqueueJob\(\{[\s\S]*name:\s*'courier\.create_parcel'/);
    assert.match(courierController, /retry:\s*Joi\.boolean/);
    assert.match(courierController, /requeueJobs\(\{[\s\S]*name:\s*'courier\.create_parcel'/);
    assert.match(courierConfig, /encryptSecret/);
    assert.match(courierConfig, /maskedToken/);
    assert.match(courierJob, /processRedxCreateParcelJob/);
    assert.match(courierJob, /createRedxParcel/);
    assert.match(redxService, /API-ACCESS-TOKEN/);
    assert.match(redxService, /Bearer \$\{getRedxToken\(shop\)\}/);
    assert.match(redxService, /getApiBaseUrl/);
    assert.match(redxService, /withoutVersion = withProtocol\.replace/);
    assert.match(redxService, /API_VERSION = '\/v1\.0\.0-beta'/);
    assert.match(redxService, /getRedxAreas/);
    assert.match(redxService, /createRedxPickupStore/);
    assert.match(redxService, /\/pickup\/store/);
    assert.match(redxService, /\/areas/);
    assert.match(redxService, /toLocalBDPhone/);
    assert.match(redxService, /deliveryAreaId/);
    assert.match(orderQuery, /courierShipment/);
    assert.match(shippingSettings, /RedX Courier/);
    assert.match(shippingSettings, /maskedToken/);
    assert.match(shippingSettings, /Create RedX Pickup Store/);
    assert.match(shippingSettings, /\/admin\/shipping\/couriers\/redx\/areas\/search/);
    assert.match(pathaoModal, /provider === 'redx'/);
    assert.match(pathaoModal, /deliveryAreaId/);
    assert.match(pathaoModal, /handleSearchRedxAreas/);
    assert.match(orderDetails, /Track RedX parcel/);
});

test('storefront conversion UX keeps recommendations tenant-scoped and checkout OTP backend-backed', () => {
    const storefrontRoutes = read('routes/storefrontRoutes.js');
    const storeController = read('controllers/storeController.js');
    const productCard = readProject('packages/storefront-renderer/reference/StorefrontProductCard.jsx');
    const productActions = readProject('ecommerce-storefront/src/hooks/useStorefrontProductActions.js');
    const cartPage = readProject('ecommerce-storefront/src/app/[subdomain]/cart/page.jsx');
    const checkoutPage = readProject('ecommerce-storefront/src/app/[subdomain]/checkout/page.jsx');
    const checkoutSections = readProject('ecommerce-storefront/src/app/[subdomain]/checkout/components/CheckoutSections.jsx');
    const checkoutTotals = readProject('ecommerce-storefront/src/app/[subdomain]/checkout/hooks/useCheckoutTotals.js');
    const productDetails = readProject('ecommerce-storefront/src/components/product/ProductDetails.jsx');
    const productInfo = readProject('ecommerce-storefront/src/components/product/ProductInfo.jsx');
    const productExtras = readProject('ecommerce-storefront/src/components/product/ProductExtras.jsx');
    const themeProvider = readProject('ecommerce-storefront/src/components/storefront/StorefrontThemeProvider.jsx');
    const footer = readProject('packages/storefront-renderer/reference/StorefrontFooter.jsx');
    const storefrontCss = readProject('ecommerce-storefront/src/app/globals.css');

    assert.match(storefrontRoutes, /'\/:subdomain\/recommendations\/cart'[\s\S]*resolveTenant[\s\S]*getCartRecommendations/);
    assert.match(storeController, /exports\.getCartRecommendations/);
    assert.match(storeController, /shop_id:\s*shopObjectId/);
    assert.match(storeController, /status:\s*'Published'/);
    assert.match(storeController, /\$nin:\s*cartObjectIds/);
    assert.match(storeController, /sanitizePublicProducts\(pricedRecommendations\)/);

    assert.match(productCard, /onProductBuyNow/);
    assert.match(productCard, /onWishlistToggle/);
    assert.match(productCard, /aria-pressed=\{wishlisted\}/);
    assert.doesNotMatch(productCard, /No reviews yet/);
    assert.match(productCard, /reviewCount > 0/);
    assert.match(productActions, /`wishlist:\$\{subdomain \|\| "store"\}`/);
    assert.match(productActions, /router\.push\("\/checkout"\)/);
    assert.match(productActions, /\/storefront\/\$\{subdomain\}\/products\/\$\{productKey\}/);
    assert.match(productActions, /StorefrontVariantPickerModal/);

    assert.match(cartPage, /\/storefront\/\$\{subdomain\}\/recommendations\/cart/);
    assert.match(cartPage, /You may also like/);
    assert.match(cartPage, /productActions\.buyNow/);
    assert.match(cartPage, /sf-mobile-action-page/);
    assert.match(cartPage, /sf-mobile-action-bar/);
    assert.match(productDetails, /sf-mobile-action-page/);
    assert.match(productDetails, /sf-mobile-action-bar/);
    assert.match(productInfo, /line-clamp-4/);
    assert.match(productInfo, /Show more/);
    assert.match(productInfo, /Show less/);
    assert.match(productExtras, /useState\('details'\)/);
    assert.match(productExtras, /role="tablist"/);
    assert.match(productExtras, /Highlights/);
    assert.match(productExtras, /Buying guide/);
    assert.match(productDetails, /ProductInformationTabs/);
    assert.ok(
        productDetails.indexOf('<RelatedProducts') < productDetails.indexOf('<ReviewSection'),
        'related products should render above customer reviews'
    );
    assert.doesNotMatch(productDetails, /<ProductFeatures/);
    assert.doesNotMatch(productDetails, /<ProductSpecifications/);
    assert.doesNotMatch(productDetails, /<ExpertNotes/);
    assert.match(themeProvider, /'--sf-mobile-nav-offset': mobileNavOffset/);
    assert.match(footer, /height:\s*"var\(--sf-mobile-nav-offset/);
    assert.match(storefrontCss, /\.sf-mobile-action-bar\s*\{[\s\S]*bottom:\s*var\(--sf-mobile-nav-offset/);

    assert.match(checkoutPage, /CheckoutOtpModal/);
    assert.match(checkoutPage, /setOtpModalOpen\(true\)/);
    assert.match(checkoutPage, /executePlaceOrder\(\{\s*verificationToken:\s*token\s*\}\)/);
    assert.match(checkoutPage, /<\/CheckoutPageShell>\s*<CheckoutOtpModal/);
    assert.match(checkoutPage, /phoneVerificationToken,\n\s*idempotencyKey:\s*getCheckoutIdempotencyKey\(\),/);
    assert.doesNotMatch(checkoutPage, /Please verify your phone number before placing the order/);
    assert.match(checkoutSections, /<form onSubmit=\{handleSubmit\}/);
    assert.match(checkoutSections, /event\.preventDefault\(\);[\s\S]*event\.stopPropagation\(\);[\s\S]*onVerifyCode\(\)/);
    assert.match(checkoutSections, /enterKeyHint="done"/);
    assert.match(checkoutSections, /autoComplete="one-time-code"/);
    assert.match(checkoutSections, /sf-mobile-action-page/);
    assert.match(checkoutSections, /sf-mobile-action-bar/);
    assert.match(checkoutSections, /<select[\s\S]*name="city"/);
    assert.match(checkoutSections, /<option value="Inside Dhaka">Inside Dhaka<\/option>/);
    assert.match(checkoutSections, /<option value="Outside Dhaka">Outside Dhaka<\/option>/);
    assert.doesNotMatch(checkoutSections, /disabled=\{loading \|\| !policyAccepted \|\| !phoneVerified\}/);
    assert.match(checkoutTotals, /selectedZone === "Inside Dhaka"/);
    assert.match(checkoutTotals, /selectedZone === "Outside Dhaka"/);
});
