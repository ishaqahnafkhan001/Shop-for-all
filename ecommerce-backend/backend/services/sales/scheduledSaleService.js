const mongoose = require('mongoose');

const ScheduledSale = require('../../models/ScheduledSale');
const Product = require('../../models/Product');
const Collection = require('../../models/Collection');
const cache = require('../cacheService');
const logger = require('../logger');

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

const stripText = (value = '', max = 240) => String(value || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const sanitizeUrl = (value = '') => {
    const url = String(value || '').trim();
    if (!url) return '';
    if (/^(javascript|data|vbscript):/i.test(url)) return '';
    if (url.startsWith('/') || url.startsWith('#')) return url.slice(0, 500);
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString().slice(0, 500) : '';
    } catch {
        return '';
    }
};

const toSafeDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
};

const toIdArray = (value = []) => {
    if (Array.isArray(value)) return value;
    return String(value || '').split(',');
};

const getRuntimeStatus = (sale, now = new Date()) => {
    if (!sale || sale.status === 'cancelled') return 'cancelled';
    if (sale.status === 'ended') return 'ended';
    const start = new Date(sale.startsAt).getTime();
    const end = new Date(sale.endsAt).getTime();
    const ts = now.getTime();
    if (ts < start) return 'scheduled';
    if (ts >= end) return 'ended';
    return 'active';
};

const invalidateSaleCache = async (shopId) => {
    if (!shopId) return;
    await Promise.all([
        cache.delPattern(`storefront:bootstrap:${shopId}:*`),
        cache.delPattern(`storefront:product:${shopId}:*`),
        cache.delPattern(`storefront:collections:${shopId}:*`)
    ]);
};

const normalizePayload = (payload = {}) => {
    const startsAt = new Date(payload.startsAt);
    const endsAt = new Date(payload.endsAt);
    if (!Number.isFinite(startsAt.getTime())) throw new Error('Sale start time is required');
    if (!Number.isFinite(endsAt.getTime())) throw new Error('Sale end time is required');
    if (endsAt <= startsAt) throw new Error('Sale end time must be after start time');

    const discountType = payload.discountType === 'fixed' ? 'fixed' : 'percentage';
    const discountValue = Math.max(0, Number(payload.discountValue) || 0);
    if (discountType === 'percentage' && discountValue > 100) {
        throw new Error('Percentage discount cannot exceed 100');
    }

    const validScopes = new Set(['all_products', 'selected_products', 'selected_collections']);
    const scope = validScopes.has(payload.scope) ? payload.scope : 'all_products';
    const productIds = scope === 'selected_products'
        ? [...new Set(toIdArray(payload.productIds).map(String).filter(isObjectId))]
        : [];
    const collectionIds = scope === 'selected_collections'
        ? [...new Set(toIdArray(payload.collectionIds).map(String).filter(isObjectId))]
        : [];
    if (scope === 'selected_products' && productIds.length === 0) {
        throw new Error('Select at least one product for this sale');
    }
    if (scope === 'selected_collections' && collectionIds.length === 0) {
        throw new Error('Select at least one collection for this sale');
    }

    return {
        name: stripText(payload.name, 120),
        description: stripText(payload.description, 500),
        scope,
        productIds,
        collectionIds,
        discountType,
        discountValue,
        priority: Math.max(0, Number(payload.priority) || 0),
        startsAt,
        endsAt,
        status: getRuntimeStatus({ status: payload.status || 'scheduled', startsAt, endsAt }),
        popup: {
            enabled: Boolean(payload.popup?.enabled),
            title: stripText(payload.popup?.title, 120),
            message: stripText(payload.popup?.message, 240),
            ctaLabel: stripText(payload.popup?.ctaLabel, 60),
            ctaUrl: sanitizeUrl(payload.popup?.ctaUrl),
            frequency: ['once_per_session', 'once_per_day', 'every_visit'].includes(payload.popup?.frequency)
                ? payload.popup.frequency
                : 'once_per_session',
            timing: ['active', 'upcoming', 'both'].includes(payload.popup?.timing)
                ? payload.popup.timing
                : 'active',
            displayStartsAt: toSafeDate(payload.popup?.displayStartsAt),
            desktopImage: sanitizeUrl(payload.popup?.desktopImage),
            mobileImage: sanitizeUrl(payload.popup?.mobileImage)
        }
    };
};

const assertProductsBelongToShop = async ({ shopId, productIds = [] }) => {
    if (!productIds.length) return;
    const count = await Product.countDocuments({
        _id: { $in: productIds },
        shop_id: shopId,
        isDeleted: false
    });
    if (count !== productIds.length) {
        throw new Error('One or more selected products do not belong to this shop');
    }
};

const assertCollectionsBelongToShop = async ({ shopId, collectionIds = [] }) => {
    if (!collectionIds.length) return;
    const count = await Collection.countDocuments({
        _id: { $in: collectionIds },
        shop_id: shopId,
        isActive: true
    });
    if (count !== collectionIds.length) {
        throw new Error('One or more selected collections do not belong to this shop');
    }
};

const listScheduledSales = async ({ shopId, page = 1, limit = 25, status }) => {
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageLimit = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
    const query = { shop_id: shopId };
    if (status && status !== 'all') query.status = status;

    const [sales, total] = await Promise.all([
        ScheduledSale.find(query).sort({ startsAt: -1 }).skip((currentPage - 1) * pageLimit).limit(pageLimit).lean(),
        ScheduledSale.countDocuments(query)
    ]);

    const collectionIds = [...new Set(sales
        .flatMap(sale => sale.collectionIds || [])
        .map(String)
        .filter(isObjectId))];
    const collections = collectionIds.length
        ? await Collection.find({ _id: { $in: collectionIds }, shop_id: shopId })
            .select('_id title slug isActive')
            .lean()
        : [];
    const collectionMap = new Map(collections.map(collection => [String(collection._id), collection]));
    const totalPages = Math.max(1, Math.ceil(total / pageLimit));
    return {
        sales: sales.map(sale => ({
            ...sale,
            selectedCollections: (sale.collectionIds || [])
                .map(id => collectionMap.get(String(id)))
                .filter(Boolean),
            runtimeStatus: getRuntimeStatus(sale),
            status: getRuntimeStatus(sale)
        })),
        pagination: {
            page: currentPage,
            limit: pageLimit,
            total,
            pages: totalPages,
            totalPages,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1
        }
    };
};

const listSaleCollections = async ({ shopId, search = '', limit = 50 } = {}) => {
    const query = {
        shop_id: shopId,
        isActive: true
    };
    const cleanSearch = stripText(search, 80);
    if (cleanSearch) {
        query.title = { $regex: cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }

    return Collection.find(query)
        .select('_id title slug image productIds isActive updatedAt')
        .sort({ title: 1, _id: 1 })
        .limit(Math.min(Math.max(Number(limit) || 50, 1), 100))
        .lean();
};

const createScheduledSale = async ({ shopId, userId, payload }) => {
    const clean = normalizePayload(payload);
    await assertProductsBelongToShop({ shopId, productIds: clean.productIds });
    await assertCollectionsBelongToShop({ shopId, collectionIds: clean.collectionIds });
    const sale = await ScheduledSale.create({
        ...clean,
        shop_id: shopId,
        createdBy: userId,
        updatedBy: userId
    });
    await invalidateSaleCache(shopId);
    return sale;
};

const updateScheduledSale = async ({ shopId, saleId, userId, payload }) => {
    const sale = await ScheduledSale.findOne({ _id: saleId, shop_id: shopId });
    if (!sale) return null;
    if (sale.status === 'cancelled') throw new Error('Cancelled sales cannot be edited');

    const clean = normalizePayload({ ...sale.toObject(), ...payload, popup: { ...(sale.popup || {}), ...(payload.popup || {}) } });
    await assertProductsBelongToShop({ shopId, productIds: clean.productIds });
    await assertCollectionsBelongToShop({ shopId, collectionIds: clean.collectionIds });
    Object.assign(sale, clean, { updatedBy: userId });
    await sale.save();
    await invalidateSaleCache(shopId);
    return sale;
};

const cancelScheduledSale = async ({ shopId, saleId, userId }) => {
    const sale = await ScheduledSale.findOneAndUpdate(
        { _id: saleId, shop_id: shopId, status: { $ne: 'cancelled' } },
        { $set: { status: 'cancelled', cancelledAt: new Date(), updatedBy: userId } },
        { new: true }
    );
    if (sale) await invalidateSaleCache(shopId);
    return sale;
};

const getActiveScheduledSales = async ({ shopId, productIds = [], now = new Date(), session } = {}) => {
    const query = {
        shop_id: shopId,
        status: { $in: ['scheduled', 'active'] },
        startsAt: { $lte: now },
        endsAt: { $gt: now },
        $or: [
            { scope: 'all_products' }
        ]
    };
    if (productIds.length) query.$or.push({ scope: 'selected_products', productIds: { $in: productIds } });
    if (productIds.length) query.$or.push({ scope: 'selected_collections' });

    const request = ScheduledSale.find(query).sort({ priority: -1, createdAt: 1, _id: 1 });
    if (session) request.session(session);
    return request.lean();
};

const getCollectionMembershipForProducts = async ({ shopId, productIds = [], session } = {}) => {
    const ids = productIds.map(String).filter(isObjectId);
    if (!ids.length) return new Map();

    const request = Collection.find({
        shop_id: shopId,
        isActive: true,
        productIds: { $in: ids }
    }).select('_id productIds').lean();
    if (session) request.session(session);

    const collections = await request;
    const membership = new Map();
    collections.forEach(collection => {
        const collectionId = String(collection._id);
        (collection.productIds || []).forEach(productId => {
            const key = String(productId);
            if (!ids.includes(key)) return;
            if (!membership.has(key)) membership.set(key, new Set());
            membership.get(key).add(collectionId);
        });
    });

    return membership;
};

const getBaseFinalPrice = (product = {}, variant = null) => {
    const variantPrice = variant?.pricing?.price ?? variant?.priceOverride;
    const sellingPrice = Number.isFinite(Number(variantPrice))
        ? Number(variantPrice)
        : Number(product.pricing?.sellingPrice ?? product.sellingPrice ?? 0);
    const discount = Number(product.pricing?.discount ?? product.discount ?? 0) || 0;
    return Math.max(0, Math.round(sellingPrice - ((sellingPrice * discount) / 100)));
};

const calculateSalePrice = ({ basePrice, sale }) => {
    const price = Number(basePrice) || 0;
    if (!sale || price <= 0) return price;
    if (sale.discountType === 'fixed') {
        return Math.max(0, Math.round(price - Number(sale.discountValue || 0)));
    }
    return Math.max(0, Math.round(price - ((price * Number(sale.discountValue || 0)) / 100)));
};

const calculateSaleDiscount = ({ basePrice, sale }) => {
    const price = Number(basePrice) || 0;
    const effectivePrice = calculateSalePrice({ basePrice: price, sale });
    return Math.max(0, price - effectivePrice);
};

const saleAppliesToProduct = (sale = {}, product = {}, collectionMembership = new Map()) => {
    const productId = product?._id;
    if (sale.scope === 'all_products') return true;
    if (sale.scope === 'selected_products') {
        return (sale.productIds || []).some(id => String(id) === String(productId));
    }
    if (sale.scope === 'selected_collections') {
        const directCollections = Array.isArray(product.collections)
            ? product.collections.map(String)
            : [];
        if ((sale.collectionIds || []).some(id => directCollections.includes(String(id)))) {
            return true;
        }
        const productCollectionIds = collectionMembership.get(String(productId));
        if (!productCollectionIds?.size) return false;
        return (sale.collectionIds || []).some(id => productCollectionIds.has(String(id)));
    }
    return false;
};

const compareSaleCandidates = (candidate, best) => {
    if (!best) return -1;
    if (candidate.discountAmount !== best.discountAmount) {
        return best.discountAmount - candidate.discountAmount;
    }
    if (candidate.priority !== best.priority) {
        return best.priority - candidate.priority;
    }
    const candidateCreated = new Date(candidate.sale.createdAt || 0).getTime();
    const bestCreated = new Date(best.sale.createdAt || 0).getTime();
    if (candidateCreated !== bestCreated) return candidateCreated - bestCreated;
    return String(candidate.sale._id || '').localeCompare(String(best.sale._id || ''));
};

const getBestSaleForProduct = ({ product, sales = [], variant = null, collectionMembership = new Map() }) => {
    const basePrice = getBaseFinalPrice(product, variant);
    let best = null;
    for (const sale of sales) {
        if (!saleAppliesToProduct(sale, product, collectionMembership)) continue;
        const salePrice = calculateSalePrice({ basePrice, sale });
        if (salePrice >= basePrice) continue;
        const candidate = {
            sale,
            salePrice,
            basePrice,
            discountAmount: calculateSaleDiscount({ basePrice, sale }),
            priority: Number(sale.priority || 0)
        };
        if (!best || compareSaleCandidates(candidate, best) < 0) {
            best = candidate;
        }
    }
    return best;
};

const buildPricingResult = ({ product, variant = null, sales = [], quantity = 1, now = new Date(), collectionMembership = new Map() }) => {
    const basePrice = getBaseFinalPrice(product, variant);
    const best = getBestSaleForProduct({ product, variant, sales, collectionMembership });
    const effectivePrice = best ? best.salePrice : basePrice;
    const discountAmount = Math.max(0, basePrice - effectivePrice);

    return {
        basePrice,
        effectivePrice,
        quantity: Math.max(1, Number(quantity) || 1),
        automaticDiscount: discountAmount,
        scheduledSaleId: best?.sale?._id || null,
        discountType: best?.sale?.discountType || null,
        discountValue: best?.sale?.discountValue ?? null,
        discountAmount,
        saleStartsAt: best?.sale?.startsAt || null,
        saleEndsAt: best?.sale?.endsAt || null,
        isOnSale: Boolean(best && discountAmount > 0),
        evaluatedAt: now
    };
};

const applyScheduledSaleToProduct = (product = {}, sales = [], collectionMembership = new Map()) => {
    const best = getBestSaleForProduct({ product, sales, collectionMembership });
    if (!best) return product;

    const saleSnapshot = {
        saleId: best.sale._id,
        name: best.sale.name,
        discountType: best.sale.discountType,
        discountValue: best.sale.discountValue,
        discountAmount: best.discountAmount,
        priority: Number(best.sale.priority || 0),
        scope: best.sale.scope || 'all_products',
        startsAt: best.sale.startsAt,
        endsAt: best.sale.endsAt
    };

    return {
        ...product,
        finalPrice: best.salePrice,
        salePrice: best.salePrice,
        compareAtPrice: best.basePrice,
        scheduledSale: saleSnapshot,
        pricing: {
            ...(product.pricing || {}),
            salePrice: best.salePrice,
            compareAtPrice: best.basePrice
        }
    };
};

const applyScheduledSalesToProducts = async ({ shopId, products = [], now = new Date() }) => {
    const ids = products.map(product => product?._id).filter(Boolean);
    if (!ids.length) return products;
    const [sales, collectionMembership] = await Promise.all([
        getActiveScheduledSales({ shopId, productIds: ids, now }),
        getCollectionMembershipForProducts({ shopId, productIds: ids })
    ]);
    if (!sales.length) return products;
    return products.map(product => applyScheduledSaleToProduct(product, sales, collectionMembership));
};

const getActiveSalePopups = async ({ shopId, now = new Date(), limit = 3 } = {}) => {
    const sales = await ScheduledSale.find({
        shop_id: shopId,
        status: { $in: ['scheduled', 'active'] },
        $or: [
            {
                startsAt: { $lte: now },
                endsAt: { $gt: now },
                $or: [
                    { 'popup.timing': { $in: ['active', 'both'] } },
                    { 'popup.timing': { $exists: false } }
                ]
            },
            {
                startsAt: { $gt: now },
                $or: [
                    { 'popup.displayStartsAt': null },
                    { 'popup.displayStartsAt': { $lte: now } }
                ],
                'popup.timing': { $in: ['upcoming', 'both'] }
            }
        ],
        'popup.enabled': true
    })
        .sort({ priority: -1, startsAt: 1, createdAt: 1 })
        .limit(Math.min(Math.max(Number(limit) || 3, 1), 6))
        .select('name discountType discountValue priority startsAt endsAt popup updatedAt')
        .lean();

    return sales.map(sale => ({
        saleId: sale._id,
        version: sale.updatedAt ? new Date(sale.updatedAt).getTime() : new Date(sale.startsAt).getTime(),
        name: sale.name,
        discountType: sale.discountType,
        discountValue: sale.discountValue,
        priority: sale.priority || 0,
        startsAt: sale.startsAt,
        endsAt: sale.endsAt,
        title: sale.popup?.title || sale.name,
        message: sale.popup?.message || '',
        ctaLabel: sale.popup?.ctaLabel || 'Shop sale',
        ctaUrl: sanitizeUrl(sale.popup?.ctaUrl) || '#products',
        frequency: sale.popup?.frequency || 'once_per_session',
        desktopImage: sanitizeUrl(sale.popup?.desktopImage),
        mobileImage: sanitizeUrl(sale.popup?.mobileImage)
    }));
};

const getScheduledSaleLinePrice = async ({ shopId, product, variant, session }) => {
    const [sales, collectionMembership] = await Promise.all([
        getActiveScheduledSales({
            shopId,
            productIds: [product._id],
            session
        }),
        getCollectionMembershipForProducts({
            shopId,
            productIds: [product._id],
            session
        })
    ]);
    const best = getBestSaleForProduct({ product, sales, variant, collectionMembership });
    return best ? {
        unitPrice: best.salePrice,
        compareAtPrice: best.basePrice,
        pricing: buildPricingResult({ product, variant, sales, collectionMembership }),
        scheduledSale: {
            saleId: best.sale._id,
            name: best.sale.name,
            discountType: best.sale.discountType,
            discountValue: best.sale.discountValue,
            discountAmount: best.discountAmount,
            priority: Number(best.sale.priority || 0),
            scope: best.sale.scope || 'all_products',
            startsAt: best.sale.startsAt,
            endsAt: best.sale.endsAt
        }
    } : null;
};

const processScheduledSaleStates = async ({ limit = 50 } = {}) => {
    const now = new Date();
    const workerId = `sale-worker:${process.pid}:${now.getTime()}`;
    const staleLockDate = new Date(Date.now() - 5 * 60 * 1000);
    const touched = [];
    const max = Math.min(Math.max(Number(limit) || 50, 1), 200);

    for (let index = 0; index < max; index += 1) {
        const sale = await ScheduledSale.findOneAndUpdate(
            {
                $and: [
                    { status: { $in: ['scheduled', 'active'] } },
                    {
                        $or: [
                            { status: 'scheduled', startsAt: { $lte: now } },
                            { endsAt: { $lte: now } }
                        ]
                    },
                    {
                        $or: [
                            { processingState: { $ne: 'processing' } },
                            { processingStartedAt: { $lte: staleLockDate } }
                        ]
                    }
                ]
            },
            {
                $set: {
                    processingState: 'processing',
                    processingStartedAt: now,
                    processingBy: workerId
                },
                $inc: { retryCount: 1 }
            },
            {
                new: true,
                sort: { endsAt: 1, startsAt: 1, createdAt: 1 }
            }
        );

        if (!sale) break;

        try {
            const nextStatus = sale.endsAt <= now ? 'ended' : 'active';
            await ScheduledSale.updateOne(
                { _id: sale._id, processingBy: workerId },
                {
                    $set: {
                        status: nextStatus,
                        processingState: 'completed',
                        processingCompletedAt: new Date(),
                        lastProcessingError: ''
                    }
                }
            );
            touched.push(String(sale.shop_id));
        } catch (error) {
            await ScheduledSale.updateOne(
                { _id: sale._id, processingBy: workerId },
                {
                    $set: {
                        processingState: 'failed',
                        lastProcessingError: String(error?.message || error || 'Sale transition failed').slice(0, 500)
                    }
                }
            );
            logger.warn('scheduled_sale_state_transition_failed', {
                saleId: sale._id,
                shopId: sale.shop_id,
                error
            });
        }
    }

    const affectedShopIds = [...new Set(touched)];
    for (const shopId of affectedShopIds) {
        await invalidateSaleCache(shopId);
    }

    if (affectedShopIds.length) {
        logger.info('scheduled_sale_states_processed', { shopCount: affectedShopIds.length });
    }

    return { touched: affectedShopIds };
};

module.exports = {
    getRuntimeStatus,
    listScheduledSales,
    listSaleCollections,
    createScheduledSale,
    updateScheduledSale,
    cancelScheduledSale,
    getActiveScheduledSales,
    buildPricingResult,
    getScheduledSaleLinePrice,
    getActiveSalePopups,
    applyScheduledSaleToProduct,
    applyScheduledSalesToProducts,
    processScheduledSaleStates
};
