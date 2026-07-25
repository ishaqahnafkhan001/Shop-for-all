const Product = require('../../models/Product');
const Shop = require('../../models/Shop');
const { enqueueJob } = require('../jobQueueService');
const cache = require('../cacheService');
const logger = require('../logger');
const { hasFeature } = require('../shops/featureAccessService');
const { assertJobEntitlementStillValid } = require('../workers/jobEntitlementService');

const SCHEDULED_PRODUCT_QUEUE = 'scheduled-products';
const PUBLISH_PRODUCT_JOB = 'products.publish_scheduled';

const validateFuturePublishAt = (publishAt) => {
    const date = publishAt ? new Date(publishAt) : null;
    if (!date || Number.isNaN(date.getTime())) {
        const error = new Error('A valid future publish date is required for scheduled products.');
        error.statusCode = 400;
        throw error;
    }

    if (date.getTime() <= Date.now()) {
        const error = new Error('Scheduled publish date must be in the future.');
        error.statusCode = 400;
        throw error;
    }

    return date;
};

const normalizeProductPublicationFields = (value = {}) => {
    if (value.publicationStatus === 'scheduled') {
        const publishAt = validateFuturePublishAt(value.publishAt);
        value.publishAt = publishAt;
        value.status = 'Draft';
        return value;
    }

    if (value.status === 'Draft') {
        value.publicationStatus = 'draft';
        value.publishAt = null;
    } else if (value.status === 'Published' || value.publicationStatus === 'published') {
        value.publicationStatus = 'published';
        value.publishAt = null;
        value.publishedAt = value.publishedAt || new Date();
        value.status = 'Published';
    }

    return value;
};

const enqueueScheduledProductPublication = async ({ product, shopId }) => {
    if (!product || product.publicationStatus !== 'scheduled' || !product.publishAt) return null;
    const resolvedShopId = shopId || product.shop_id;
    if (!(await hasFeature(resolvedShopId, 'scheduledProductPublishing'))) return null;

    return enqueueJob({
        queue: SCHEDULED_PRODUCT_QUEUE,
        name: PUBLISH_PRODUCT_JOB,
        shop_id: resolvedShopId,
        runAt: product.publishAt,
        payload: {
            productId: product._id
        },
        idempotencyKey: `${PUBLISH_PRODUCT_JOB}:${product._id}:${new Date(product.publishAt).toISOString()}`
    });
};

const invalidateProductStorefrontCache = async (shopId) => {
    if (!shopId) return;
    await Promise.all([
        cache.delPattern(`storefront:bootstrap:${shopId}:*`),
        cache.delPattern(`storefront:product:${shopId}:*`),
        cache.delPattern(`storefront:collections:${shopId}:*`)
    ]);
};

const canPublishForShop = async (shopId) => {
    const shop = await Shop.findById(shopId).select('isActive approvalStatus status suspensionReason').lean();
    if (!shop) return false;
    if (shop.isActive === false) return false;
    if (shop.approvalStatus && shop.approvalStatus !== 'Approved') return false;
    if (String(shop.status || '').toLowerCase() === 'suspended') return false;
    return true;
};

const publishScheduledProduct = async ({ productId, shopId, source = 'worker', job = null }) => {
    if (!productId || !shopId) {
        throw new Error('Scheduled product publish requires productId and shopId');
    }

    if (!(await hasFeature(shopId, 'scheduledProductPublishing'))) {
        await Product.updateOne(
            { _id: productId, shop_id: shopId, publicationStatus: 'scheduled' },
            {
                $set: {
                    schedulePlanBlockedAt: new Date(),
                    schedulePlanBlockedReason: 'Scheduled publishing is not available on the current plan.'
                }
            }
        );
        logger.info('scheduled_product_noop_plan_blocked', { productId, shopId, source });
        return null;
    }

    const shopCanPublish = await canPublishForShop(shopId);
    if (!shopCanPublish) {
        logger.info('scheduled_product_noop_shop_blocked', { productId, shopId, source });
        return null;
    }

    if (job) {
        await assertJobEntitlementStillValid({
            job,
            feature: 'scheduledProductPublishing'
        });
    }
    const now = new Date();
    const product = await Product.findOneAndUpdate(
        {
            _id: productId,
            shop_id: shopId,
            isDeleted: false,
            publicationStatus: 'scheduled',
            publishAt: { $lte: now },
            schedulePlanBlockedAt: null
        },
        {
            $set: {
                publicationStatus: 'published',
                status: 'Published',
                isActive: true,
                publishedAt: now,
                publishAt: null
            }
        },
        { new: true }
    );

    if (!product) {
        logger.info('scheduled_product_noop', {
            productId,
            shopId,
            source
        });
        return null;
    }

    await invalidateProductStorefrontCache(product.shop_id);

    logger.info('scheduled_product_published', {
        productId: product._id,
        shopId: product.shop_id,
        source
    });

    return product;
};

const processScheduledProductJob = async (job) => {
    if (job.name !== PUBLISH_PRODUCT_JOB) {
        throw new Error(`Unsupported scheduled product job: ${job.name}`);
    }

    return publishScheduledProduct({
        productId: job.payload?.productId,
        shopId: job.shop_id,
        source: `job:${job._id}`,
        job
    });
};

const processOverdueScheduledProducts = async ({ limit = 25 } = {}) => {
    const now = new Date();
    const overdue = await Product.find({
        isDeleted: false,
        publicationStatus: 'scheduled',
        publishAt: { $lte: now }
    })
        .select('_id shop_id publishAt')
        .sort({ publishAt: 1 })
        .limit(Math.min(Math.max(Number(limit) || 25, 1), 100))
        .lean();

    let published = 0;
    for (const product of overdue) {
        try {
            const result = await publishScheduledProduct({
                productId: product._id,
                shopId: product.shop_id,
                source: 'overdue-scan'
            });
            if (result) published += 1;
        } catch (error) {
            logger.warn('scheduled_product_overdue_publish_failed', {
                productId: product._id,
                shopId: product.shop_id,
                error
            });
        }
    }

    return { scanned: overdue.length, published };
};

module.exports = {
    SCHEDULED_PRODUCT_QUEUE,
    PUBLISH_PRODUCT_JOB,
    validateFuturePublishAt,
    normalizeProductPublicationFields,
    enqueueScheduledProductPublication,
    invalidateProductStorefrontCache,
    publishScheduledProduct,
    processScheduledProductJob,
    processOverdueScheduledProducts
};
