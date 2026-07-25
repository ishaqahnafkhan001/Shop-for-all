const Product = require('../models/Product');
const Shop = require('../models/Shop');
const { createNotification } = require('./notificationService');
const { enqueueJob } = require('./jobQueueService');
const {
    getVendorAdminEmails,
    sendVendorNotificationEmail,
    buildVendorEventEmail
} = require('./vendorNotificationEmailService');
const logger = require('./logger');
const { hasFeature } = require('./shops/featureAccessService');

const LOW_STOCK_ALERT_QUEUE = 'inventory-alerts';
const LOW_STOCK_ALERT_JOB = 'inventory.low_stock_alert';
const DEFAULT_LOW_STOCK_THRESHOLD = 5;

const toNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const escapeHtml = (value = '') => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildVariantLabel = (variant = {}) => {
    const attributes = Array.isArray(variant.attributes) ? variant.attributes : [];
    const label = attributes
        .map(attribute => [attribute.name, attribute.value].filter(Boolean).join(': '))
        .filter(Boolean)
        .join(', ');

    return label || variant.sku || 'Default variant';
};

const getLowStockThreshold = (product = {}, variant = {}) => (
    toNumber(
        variant?.inventory?.lowStockThreshold,
        toNumber(product?.lowStockThreshold, DEFAULT_LOW_STOCK_THRESHOLD)
    )
);

const shouldQueueLowStockAlert = ({ product, variant, beforeStock, afterStock }) => {
    const threshold = getLowStockThreshold(product, variant);
    return {
        threshold,
        shouldAlert: toNumber(beforeStock) > threshold && toNumber(afterStock) <= threshold
    };
};

const resetLowStockAlertState = async ({ shopId, productId, variantId }) => Product.updateOne(
    {
        _id: productId,
        shop_id: shopId,
        isDeleted: false,
        'variants._id': variantId
    },
    {
        $set: {
            'variants.$.inventory.lowStockAlertActive': false,
            'variants.$.inventory.lowStockAlertStatus': 'not_triggered',
            'variants.$.inventory.lowStockAlertSentAt': null
        }
    }
);

const markLowStockAlertQueued = async ({ shopId, productId, variantId }) => Product.updateOne(
    {
        _id: productId,
        shop_id: shopId,
        isDeleted: false,
        variants: {
            $elemMatch: {
                _id: variantId,
                'inventory.lowStockAlertStatus': { $nin: ['queued', 'sent'] }
            }
        }
    },
    {
        $set: {
            'variants.$.inventory.lowStockAlertActive': true,
            'variants.$.inventory.lowStockAlertStatus': 'queued',
            'variants.$.inventory.lowStockAlertSentAt': null
        }
    }
);

const markLowStockAlertSent = async ({ shopId, productId, variantId }) => Product.updateOne(
    {
        _id: productId,
        shop_id: shopId,
        isDeleted: false,
        'variants._id': variantId
    },
    {
        $set: {
            'variants.$.inventory.lowStockAlertActive': true,
            'variants.$.inventory.lowStockAlertStatus': 'sent',
            'variants.$.inventory.lowStockAlertSentAt': new Date()
        }
    }
);

const markLowStockAlertFailed = async ({ shopId, productId, variantId }) => Product.updateOne(
    {
        _id: productId,
        shop_id: shopId,
        isDeleted: false,
        'variants._id': variantId
    },
    {
        $set: {
            'variants.$.inventory.lowStockAlertActive': true,
            'variants.$.inventory.lowStockAlertStatus': 'failed'
        }
    }
);

const enqueueLowStockAlertFromStockChange = async ({
    shopId,
    productId,
    variantId,
    beforeStock,
    afterStock,
    source = 'inventory',
    referenceId = null
}) => {
    try {
        if (!shopId || !productId || !variantId) return null;
        if (!(await hasFeature(shopId, 'lowStockAlerts'))) {
            return null;
        }

        const product = await Product.findOne({
            _id: productId,
            shop_id: shopId,
            isDeleted: false
        }).select('title slug lowStockThreshold variants').lean();

        if (!product) return null;
        const variant = (product.variants || []).find(item => String(item._id) === String(variantId));
        if (!variant) return null;

        const { threshold, shouldAlert } = shouldQueueLowStockAlert({
            product,
            variant,
            beforeStock,
            afterStock
        });

        if (toNumber(afterStock) > threshold) {
            await resetLowStockAlertState({ shopId, productId, variantId });
            return null;
        }

        if (!shouldAlert) return null;

        const currentStatus = variant?.inventory?.lowStockAlertStatus || (variant?.inventory?.lowStockAlertActive ? 'sent' : 'not_triggered');
        if (['queued', 'sent'].includes(currentStatus)) return null;

        const thresholdCrossingVersion = referenceId || `${toNumber(beforeStock)}:${toNumber(afterStock)}:${threshold}`;
        const idempotencyKey = [
            'low-stock',
            shopId,
            productId,
            variantId,
            thresholdCrossingVersion
        ].join(':');

        const job = await enqueueJob({
            queue: LOW_STOCK_ALERT_QUEUE,
            name: LOW_STOCK_ALERT_JOB,
            shop_id: shopId,
            payload: {
                productId,
                variantId,
                beforeStock: toNumber(beforeStock),
                afterStock: toNumber(afterStock),
                threshold,
                source,
                referenceId
            },
            idempotencyKey
        });

        if (!job?._id) return null;

        await markLowStockAlertQueued({ shopId, productId, variantId });
        return job;
    } catch (error) {
        logger.warn('low_stock_alert_enqueue_failed', {
            shopId,
            productId,
            variantId,
            source,
            error
        });
        return null;
    }
};

const enqueueLowStockAlertsForLogs = async (logs = []) => {
    const stockLogs = (logs || []).filter(log => log?.shop_id && log?.productId && log?.variantId);
    const results = [];

    for (const log of stockLogs) {
        results.push(await enqueueLowStockAlertFromStockChange({
            shopId: log.shop_id,
            productId: log.productId,
            variantId: log.variantId,
            beforeStock: log.beforeStock,
            afterStock: log.afterStock,
            source: log.type || 'inventory',
            referenceId: log.referenceId
        }));
    }

    return results.filter(Boolean);
};

const processLowStockAlertJob = async (job) => {
    if (job.name !== LOW_STOCK_ALERT_JOB) {
        throw new Error(`Unsupported inventory alert job: ${job.name}`);
    }

    const {
        productId,
        variantId,
        beforeStock,
        afterStock,
        threshold,
        source
    } = job.payload || {};

    if (!(await hasFeature(job.shop_id, 'lowStockAlerts'))) {
        await resetLowStockAlertState({
            shopId: job.shop_id,
            productId,
            variantId
        });
        logger.info('low_stock_alert_cancelled_plan_blocked', {
            jobId: job._id,
            shopId: job.shop_id,
            productId,
            variantId
        });
        return {
            cancelled: true,
            reason: 'Low-stock alerts are not included in the current plan.'
        };
    }

    const [shop, product] = await Promise.all([
        Shop.findById(job.shop_id).select('shopName name subdomain').lean(),
        Product.findOne({
            _id: productId,
            shop_id: job.shop_id,
            isDeleted: false
        }).select('title slug lowStockThreshold variants').lean()
    ]);

    if (!shop || !product) {
        logger.info('low_stock_alert_noop_missing_resource', {
            jobId: job._id,
            shopId: job.shop_id,
            productId
        });
        return null;
    }

    const variant = (product.variants || []).find(item => String(item._id) === String(variantId));
    if (!variant) {
        logger.info('low_stock_alert_noop_missing_variant', {
            jobId: job._id,
            productId,
            variantId
        });
        return null;
    }

    const effectiveThreshold = Number.isFinite(Number(threshold))
        ? Number(threshold)
        : getLowStockThreshold(product, variant);
    const currentStock = toNumber(variant.stock);

    if (currentStock > effectiveThreshold) {
        await resetLowStockAlertState({
            shopId: job.shop_id,
            productId,
            variantId
        });
        logger.info('low_stock_alert_noop_restocked', {
            jobId: job._id,
            productId,
            variantId,
            currentStock,
            threshold: effectiveThreshold
        });
        return null;
    }

    const shopName = shop.shopName || shop.name || 'Your store';
    const variantLabel = buildVariantLabel(variant);
    const sku = variant.sku || 'N/A';
    const productTitle = product.title || 'Product';
    const adminBaseUrl = String(process.env.ADMIN_APP_URL || process.env.ADMIN_URL || '').replace(/\/+$/, '');
    const actionUrl = adminBaseUrl ? `${adminBaseUrl}/dashboard/products/edit/${product._id}` : '';
    const title = `Low stock: ${productTitle}`;
    const message = `${productTitle} (${variantLabel}) has ${currentStock} left. Low-stock threshold is ${effectiveThreshold}.`;

    await createNotification({
        shop_id: job.shop_id,
        type: 'inventory',
        title,
        message,
        entityType: 'Product',
        entityId: product._id,
        severity: 'warning',
        metadata: {
            productId,
            variantId,
            beforeStock,
            afterStock,
            currentStock,
            threshold: effectiveThreshold,
            source
        }
    });

    let recipients = await getVendorAdminEmails(job.shop_id);
    if (recipients.length === 0) {
        const fallbackEmail = String(process.env.ADMIN_EMAIL_USER || '').trim();
        logger.warn('low_stock_alert_no_vendor_email', {
            jobId: job._id,
            shopId: job.shop_id,
            fallbackRecipientUsed: Boolean(fallbackEmail)
        });
        recipients = fallbackEmail ? [fallbackEmail] : [];
    }

    if (recipients.length === 0) {
        logger.warn('low_stock_alert_no_recipient', {
            jobId: job._id,
            shopId: job.shop_id
        });
        await markLowStockAlertFailed({
            shopId: job.shop_id,
            productId,
            variantId
        });
        return null;
    }

    const html = buildVendorEventEmail({
        title: escapeHtml(title),
        intro: escapeHtml(`A product variant in ${shopName} has reached its configured low-stock threshold.`),
        rows: [
            { label: 'Product', value: escapeHtml(productTitle) },
            { label: 'Variant', value: escapeHtml(variantLabel) },
            { label: 'SKU', value: escapeHtml(sku) },
            { label: 'Previous stock', value: toNumber(beforeStock) },
            { label: 'Current stock', value: currentStock },
            { label: 'Low-stock threshold', value: effectiveThreshold }
        ],
        actionLabel: 'Review product',
        actionUrl
    });

    await sendVendorNotificationEmail({
        to: recipients,
        subject: `Low stock warning: ${productTitle}`,
        senderName: 'ScaleUp Inventory',
        type: 'admin',
        html,
        text: `${message}\nSKU: ${sku}`
    });

    await markLowStockAlertSent({
        shopId: job.shop_id,
        productId,
        variantId
    });

    logger.info('low_stock_alert_sent', {
        jobId: job._id,
        shopId: job.shop_id,
        productId,
        variantId,
        recipientCount: recipients.length
    });

    return true;
};

module.exports = {
    LOW_STOCK_ALERT_QUEUE,
    LOW_STOCK_ALERT_JOB,
    DEFAULT_LOW_STOCK_THRESHOLD,
    buildVariantLabel,
    getLowStockThreshold,
    shouldQueueLowStockAlert,
    enqueueLowStockAlertFromStockChange,
    enqueueLowStockAlertsForLogs,
    processLowStockAlertJob,
    markLowStockAlertQueued,
    markLowStockAlertSent,
    markLowStockAlertFailed
};
