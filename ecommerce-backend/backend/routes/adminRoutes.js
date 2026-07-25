const express = require('express');
const router = express.Router();
const multer = require('multer');
const rateLimit = require('express-rate-limit');

// =========================
// Middlewares
// =========================
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { requirePermission } = require('../middlewares/permission');
const { blockVerificationSuspendedShop } = require('../middlewares/vendorVerificationGuard');
const { requireShopFeature } = require('../middlewares/featureGate');
const {
    blockBillingSuspendedShop,
    requireProductLimit,
    requireStaffLimit
} = require('../middlewares/billingGate');
const { cloudinary, upload, nidUpload, brandUpload } = require('../config/cloudinary');
const { getShopPlanAccess, buildLimitError } = require('../services/billing/planAccessService');
const { SUBSCRIPTION_EVENTS, emitSubscriptionEvent } = require('../services/billing/subscriptionEvents');
const Product = require('../models/Product');
const {
    reserveQuota,
    releaseQuotaSafely
} = require('../services/billing/planQuotaReservationService');
const { getUniqueProductImageSources } = require('../services/products/productMediaService');

// =========================
// Controllers
// =========================

// Product Controllers
const {
    getShopProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getSingleProduct,
    generateDescription,
    generateProductContent,
    exportProductsCsv,
    bulkUpdateProducts,
    bulkImportProducts
} = require('../controllers/productController');

// Order Controllers
const {
    getShopOrders,
    updateOrderStatus,
    getDashboardStats,
    getDashboardOverview,
    syncOrderToPathao
} = require('../controllers/orderController');

// User / Customer Controllers
const {
    getShopCustomers,
    getShopUsers,
    createShopUser,
    toggleCustomerStatus,
    updateShopUserPermissions,
    updateShopUser,
    removeShopStaff,
    getStaffSummary
} = require('../controllers/userController');

// Store / Pathao Controllers
const {
    setupVendorPathaoStore,
    getCities,
    getZones,
    getAreas,
    linkExistingPathaoAccount
} = require('../controllers/storeController');
const {
    configureRedxCourier,
    createCourierShipment,
    createRedxPickupStoreAndConfigure,
    disconnectRedxCourier,
    getCourierSettings,
    getCourierShipmentInfo,
    getRedxPickupStoreList,
    searchRedxAreas,
    setDefaultCourier,
    trackCourierShipment
} = require('../controllers/courierController');

// Email Controllers
const {
    sendEmailToCustomer,
    sendOrderStatusEmail,
    createCustomerEmailCampaign,
    createProductEmailCampaign
} = require('../controllers/emailController');

// Returns / Activity / Notifications
const {
    getReturns,
    getReturnById,
    createReturn,
    updateReturnStatus,
    updateReturnRefund,
    updateReturn,
    deleteReturns
} = require('../controllers/returnController');
const { getAuditLogs } = require('../controllers/auditLogController');
const {
    getNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification
} = require('../controllers/notificationController');
const {
    getVendorVerificationStatus,
    submitVendorVerification,
    getVendorVerificationDocument,
    sendVendorPhoneOtp,
    verifyVendorPhoneOtp
} = require('../controllers/vendorVerificationController');
const { otpRateLimiter } = require('../middlewares/otpRateLimiter');
const {
    getAdminDataRequests,
    updateAdminDataRequest
} = require('../controllers/privacyController');
const {
    getVendorOnboarding
} = require('../controllers/onboardingController');
const {
    getBasicStoreSettings,
    updateBasicStoreSettings,
    uploadBasicStoreBrandAsset
} = require('../controllers/basicStoreSettingsController');
const {
    getVendorAnnouncements
} = require('../controllers/platformAnnouncementController');

// =========================
// Upload Config
// =========================
const productMediaUploadMiddleware = upload.fields([
    { name: 'images', maxCount: 15 },
    { name: 'videos', maxCount: 2 }
]);
const getUploadedProductMedia = (req) => Object.values(req.files || {}).flat().filter(Boolean);
const cleanupUploadedProductMedia = async (req) => {
    const uploaded = getUploadedProductMedia(req);
    await Promise.all(uploaded.map(file => {
        const publicId = file.public_id || file.filename;
        if (!publicId) return null;
        return cloudinary.uploader.destroy(publicId, {
            resource_type: file.resource_type || (file.mimetype?.startsWith('video/') ? 'video' : 'image')
        }).catch(() => null);
    }));
};
const registerFailedUploadCleanup = (req, res) => {
    if (req.productUploadCleanupRegistered) return;
    req.productUploadCleanupRegistered = true;
    res.once('finish', () => {
        if (res.statusCode >= 400) cleanupUploadedProductMedia(req).catch(() => {});
    });
};
const productMediaUpload = (req, res, next) => {
    productMediaUploadMiddleware(req, res, async (err) => {
        if (!err) {
            registerFailedUploadCleanup(req, res);
            return next();
        }
        const planLimit = err.code === 'PLAN_IMAGE_LIMIT';
        if (planLimit && req.planAccess) {
            const limit = req.planAccess.limits.imagesPerProduct;
            const payload = await buildLimitError(req.planAccess, 'imagesPerProduct', req.planImageUploadCount, limit);
            await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.QUOTA_REACHED, {
                req,
                shopId: req.tenantId,
                subscriptionId: req.planAccess.subscription?._id,
                planKey: req.planAccess.planKey,
                affectedResources: ['images'],
                metadata: { resource: 'images', usage: payload.usage, notifyVendor: false }
            });
            return res.status(403).json(payload);
        }
        return res.status(planLimit ? 403 : 400).json({
            success: false,
            code: planLimit ? 'PLAN_LIMIT_REACHED' : 'INVALID_PRODUCT_MEDIA',
            ...(planLimit && { limitKey: 'imagesPerProduct' }),
            error: err.message || 'Invalid product media.'
        });
    });
};
const parseMultipartArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string' || !value.trim()) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};
const reserveProductImageCapacity = async (req, res, next) => {
    try {
        const uploadedImages = req.files?.images || [];
        if (!uploadedImages.length || !req.params.id) return next();
        const context = req.planAccess || await getShopPlanAccess(req.tenantId);
        req.planAccess = context;
        const limit = context.limits.imagesPerProduct;
        if (limit === null) return next();

        const product = await Product.findOne({
            _id: req.params.id,
            shop_id: req.tenantId,
            isDeleted: false
        }).select('images coverMediaId variants.image').lean();
        if (!product) return next();

        const currentImages = (product.images || []).map(String).filter(Boolean);
        const requestedExisting = req.body.existingImages === undefined
            ? currentImages
            : parseMultipartArray(req.body.existingImages)
                .map(String)
                .filter(image => currentImages.includes(image));
        const removed = new Set(parseMultipartArray(req.body.removedImages).map(String));
        const keptImages = requestedExisting.filter(image => !removed.has(image));
        const baseProduct = {
            images: keptImages,
            coverMediaId: removed.has(String(product.coverMediaId || '')) ? '' : product.coverMediaId,
            variants: (product.variants || []).filter(variant => !removed.has(String(variant.image || '')))
        };
        const baseUsage = getUniqueProductImageSources(baseProduct).length;
        const uploadedSources = getUniqueProductImageSources({
            images: uploadedImages.map(file => file.path)
        });
        const requested = uploadedSources.length;

        let reservation;
        try {
            reservation = await reserveQuota({
                shopId: req.tenantId,
                resource: `images:${req.params.id}`,
                requested,
                limit,
                getCommittedUsage: async () => baseUsage
            });
        } catch (error) {
            if (error.code !== 'PLAN_LIMIT_REACHED') throw error;
            await cleanupUploadedProductMedia(req);
            const payload = await buildLimitError(context, 'imagesPerProduct', baseUsage, limit);
            await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.QUOTA_REACHED, {
                req,
                shopId: req.tenantId,
                subscriptionId: context.subscription?._id,
                planKey: context.planKey,
                affectedResources: ['images'],
                metadata: { resource: 'images', usage: payload.usage, notifyVendor: false }
            });
            return res.status(403).json(payload);
        }

        req.planImageQuotaReservation = reservation;
        res.once('finish', () => releaseQuotaSafely(reservation));
        res.once('close', () => releaseQuotaSafely(reservation));
        return next();
    } catch (error) {
        await cleanupUploadedProductMedia(req);
        return res.status(500).json({
            success: false,
            code: 'IMAGE_QUOTA_CHECK_FAILED',
            error: 'Unable to verify product image capacity.'
        });
    }
};
const attachPlanAccess = async (req, res, next) => {
    try {
        req.planAccess = req.planAccess || await getShopPlanAccess(req.tenantId);
        next();
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            code: error.code || 'PLAN_ACCESS_FAILED',
            error: error.statusCode ? error.message : 'Unable to verify plan access.'
        });
    }
};
const productAiImageUploadMiddleware = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    },
    fileFilter: (req, file, cb) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            return cb(new Error('Unsupported image type'));
        }

        cb(null, true);
    }
}).single('image');
const productAiImageUpload = (req, res, next) => {
    productAiImageUploadMiddleware(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                configured: true,
                errorCode: err.code === 'LIMIT_FILE_SIZE' ? 'AI_IMAGE_TOO_LARGE' : 'AI_IMAGE_UNSUPPORTED',
                message: err.message || 'Invalid product image.'
            });
        }

        next();
    });
};
const productAiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 30 : 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many AI suggestion requests. Please try again later.'
    }
});
const returnProofUpload = upload.fields([
    { name: 'proofImages', maxCount: 3 },
    { name: 'proofVideo', maxCount: 1 }
]);
const vendorNidUpload = nidUpload.fields([
    { name: 'nidFront', maxCount: 1 },
    { name: 'nidBack', maxCount: 1 }
]);

// ======================================================
// VENDOR ONBOARDING
// ======================================================

router.get(
    '/onboarding',
    protect,
    authorize('VendorAdmin'),
    getVendorOnboarding
);

router.get(
    '/announcements',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    getVendorAnnouncements
);

router.get(
    '/basic-store-settings',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('settings'),
    getBasicStoreSettings
);

router.patch(
    '/basic-store-settings',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('settings'),
    updateBasicStoreSettings
);

router.post(
    '/basic-store-settings/brand-asset',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('settings'),
    brandUpload.single('asset'),
    uploadBasicStoreBrandAsset
);

// ======================================================
// VENDOR VERIFICATION
// ======================================================

router.get(
    '/vendor-verification/status',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    getVendorVerificationStatus
);

router.post(
    '/vendor-verification/submit',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('settings'),
    vendorNidUpload,
    submitVendorVerification
);

router.get(
    '/vendor-verification/document/:type',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('settings'),
    getVendorVerificationDocument
);

router.post(
    '/vendor-verification/phone/send-otp',
    protect,
    authorize('VendorAdmin'),
    otpRateLimiter,
    sendVendorPhoneOtp
);

router.post(
    '/vendor-verification/phone/verify-otp',
    protect,
    authorize('VendorAdmin'),
    otpRateLimiter,
    verifyVendorPhoneOtp
);

router.get(
    '/privacy/data-requests',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('privacyRequests'),
    requireShopFeature('privacyRequests'),
    getAdminDataRequests
);

router.patch(
    '/privacy/data-requests/:id',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('privacyRequests'),
    requireShopFeature('privacyRequests'),
    updateAdminDataRequest
);

// ======================================================
// EMAIL ROUTES
// ======================================================

router.post(
    '/customers/send-email',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('customers'),
    requireShopFeature('customerSection'),
    sendEmailToCustomer
);

router.post(
    '/customers/email-campaigns',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('customers'),
    requireShopFeature('customerSection'),
    requireShopFeature('emailCampaigns'),
    createCustomerEmailCampaign
);

router.post(
    '/customers/product-email-campaigns',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('customers'),
    requireShopFeature('customerSection'),
    requireShopFeature('emailCampaigns'),
    createProductEmailCampaign
);

router.post(
    '/orders/send-email',
    protect,
    authorize('VendorAdmin', 'SuperAdmin'),
    sendOrderStatusEmail
);

// ======================================================
// NOTIFICATIONS
// ======================================================

router.get(
    '/notifications',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('notifications'),
    requireShopFeature('notifications'),
    getNotifications
);

router.get(
    '/notifications/unread-count',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('notifications'),
    requireShopFeature('notifications'),
    getUnreadCount
);

router.patch(
    '/notifications/read-all',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('notifications'),
    requireShopFeature('notifications'),
    markAllNotificationsRead
);

router.patch(
    '/notifications/:id/read',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('notifications'),
    requireShopFeature('notifications'),
    markNotificationRead
);

router.delete(
    '/notifications/:id',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('notifications'),
    requireShopFeature('notifications'),
    deleteNotification
);

// ======================================================
// RETURNS / REFUNDS
// ======================================================

router.get(
    '/returns',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('returns'),
    getReturns
);

router.get(
    '/returns/:id',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('returns'),
    getReturnById
);

router.post(
    '/returns',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('returns'),
    blockBillingSuspendedShop,
    returnProofUpload,
    createReturn
);

router.patch(
    '/returns/:id/status',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('returns'),
    blockBillingSuspendedShop,
    updateReturnStatus
);

router.patch(
    '/returns/:id/refund',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('returns'),
    blockBillingSuspendedShop,
    updateReturnRefund
);

router.patch(
    '/returns/:id',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('returns'),
    blockBillingSuspendedShop,
    updateReturn
);

router.delete(
    '/returns',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('returns'),
    blockBillingSuspendedShop,
    deleteReturns
);

// ======================================================
// ACTIVITY LOGS
// ======================================================

router.get(
    '/audit-logs',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('activityLogs'),
    requireShopFeature('activityLogs'),
    getAuditLogs
);

// ======================================================
// PATHAO / STORE SETTINGS
// ======================================================

router.post(
    '/settings/pathao-link',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('shipping'),
    linkExistingPathaoAccount
);

router.post(
    '/settings/pathao-store',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('shipping'),
    setupVendorPathaoStore
);

router.get(
    '/shipping/couriers',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('shipping'),
    getCourierSettings
);

router.post(
    '/shipping/couriers/redx/configure',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('shipping'),
    blockBillingSuspendedShop,
    blockVerificationSuspendedShop,
    configureRedxCourier
);

router.patch(
    '/shipping/couriers/redx',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('shipping'),
    blockBillingSuspendedShop,
    blockVerificationSuspendedShop,
    configureRedxCourier
);

router.post(
    '/shipping/couriers/redx/areas/search',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('shipping'),
    searchRedxAreas
);

router.get(
    '/shipping/couriers/redx/pickup-stores',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('shipping'),
    getRedxPickupStoreList
);

router.post(
    '/shipping/couriers/redx/pickup-store',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('shipping'),
    blockBillingSuspendedShop,
    blockVerificationSuspendedShop,
    createRedxPickupStoreAndConfigure
);

router.delete(
    '/shipping/couriers/redx',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('shipping'),
    blockBillingSuspendedShop,
    blockVerificationSuspendedShop,
    disconnectRedxCourier
);

router.post(
    '/shipping/couriers/default',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('shipping'),
    blockBillingSuspendedShop,
    setDefaultCourier
);

// Location APIs
router.get(
    '/pathao/cities',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('shipping'),
    getCities
);

router.get(
    '/pathao/cities/:cityId/zones',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('shipping'),
    getZones
);

router.get(
    '/pathao/zones/:zoneId/areas',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('shipping'),
    getAreas
);

// ======================================================
// AI / UTILITIES
// ======================================================

router.post(
    '/generate-description',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('products'),
    requireShopFeature('aiProductCreation'),
    blockBillingSuspendedShop,
    blockVerificationSuspendedShop,
    generateDescription
);

router.post(
    '/products/ai/content-suggest',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('products'),
    requireShopFeature('aiProductCreation'),
    blockBillingSuspendedShop,
    blockVerificationSuspendedShop,
    productAiLimiter,
    productAiImageUpload,
    generateProductContent
);

// ======================================================
// PRODUCT MANAGEMENT
// ======================================================

router.get(
    '/products',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('products'),
    getShopProducts
);

router.get(
    '/products/export.csv',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('catalogTools'),
    requireShopFeature('bulkProductTools'),
    exportProductsCsv
);

router.post(
    '/products/bulk-import',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('catalogTools'),
    requireShopFeature('bulkProductTools'),
    blockBillingSuspendedShop,
    requireProductLimit((req) => Array.isArray(req.body?.products) ? Math.min(req.body.products.length, 200) : 1),
    blockVerificationSuspendedShop,
    bulkImportProducts
);

router.patch(
    '/products/bulk',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('catalogTools'),
    requireShopFeature('bulkProductTools'),
    blockBillingSuspendedShop,
    blockVerificationSuspendedShop,
    bulkUpdateProducts
);

router.get(
    '/products/:id',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('products'),
    getSingleProduct
);

router.post(
    '/products',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('products'),
    blockBillingSuspendedShop,
    requireProductLimit(),
    blockVerificationSuspendedShop,
    productMediaUpload,
    createProduct
);

router.patch(
    '/products/:id',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('products'),
    blockBillingSuspendedShop,
    blockVerificationSuspendedShop,
    attachPlanAccess,
    productMediaUpload,
    reserveProductImageCapacity,
    updateProduct
);

router.delete(
    '/products/:id',
    protect,
    authorize('VendorAdmin'),
    blockBillingSuspendedShop,
    blockVerificationSuspendedShop,
    deleteProduct
);

// ======================================================
// ORDER MANAGEMENT
// ======================================================

router.get(
    '/orders',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
    getShopOrders
);

router.patch(
    '/orders/:id/status',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
    blockBillingSuspendedShop,
    blockVerificationSuspendedShop,
    updateOrderStatus
);

router.post(
    '/orders/:id/pathao',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
    blockBillingSuspendedShop,
    blockVerificationSuspendedShop,
    syncOrderToPathao
);

router.post(
    '/orders/:id/courier',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
    blockBillingSuspendedShop,
    blockVerificationSuspendedShop,
    createCourierShipment
);

router.get(
    '/orders/:id/courier/track',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
    trackCourierShipment
);

router.get(
    '/orders/:id/courier/info',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('orders'),
    getCourierShipmentInfo
);

// ======================================================
// CUSTOMER MANAGEMENT
// ======================================================

router.get(
    '/customers',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('customers'),
    requireShopFeature('customerSection'),
    getShopCustomers
);

router.patch(
    '/customers/:id/status',
    protect,
    authorize('VendorAdmin'),
    requireShopFeature('customerSection'),
    toggleCustomerStatus
);

// ======================================================
// USER / STAFF MANAGEMENT
// ======================================================

router.get(
    '/staff/summary',
    protect,
    authorize('VendorAdmin'),
    getStaffSummary
);

router.get(
    '/users',
    protect,
    authorize('VendorAdmin'),
    requireShopFeature('staffAccounts'),
    getShopUsers
);

router.post(
    '/users',
    protect,
    authorize('VendorAdmin'),
    requireShopFeature('staffAccounts'),
    requireStaffLimit,
    createShopUser
);

router.patch(
    '/users/:id/permissions',
    protect,
    authorize('VendorAdmin'),
    requireShopFeature('staffAccounts'),
    updateShopUserPermissions
);

router.patch(
    '/users/:id',
    protect,
    authorize('VendorAdmin'),
    requireShopFeature('staffAccounts'),
    updateShopUser
);

router.delete(
    '/users/:id',
    protect,
    authorize('VendorAdmin'),
    requireShopFeature('staffAccounts'),
    removeShopStaff
);

// ======================================================
// DASHBOARD / ANALYTICS
// ======================================================

router.get(
    '/dashboard-overview',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('overview'),
    getDashboardOverview
);

router.get(
    '/dashboard-stats',
    protect,
    authorize('VendorAdmin', 'VendorStaff'),
    requirePermission('analytics'),
    requireShopFeature('analytics'),
    getDashboardStats
);

// =========================
// Export Router
// =========================
module.exports = router;
