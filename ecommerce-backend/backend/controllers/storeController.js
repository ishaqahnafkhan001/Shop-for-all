const Shop = require('../models/Shop');
const Product = require('../models/Product');
const Banner = require('../models/Banner');
const Review = require('../models/Review');
const Collection = require('../models/Collection');
const Category = require('../models/Category');
const Subscription = require('../models/Subscription');
const mongoose = require('mongoose');
const cache = require('../services/cacheService');
const { ensureThemeSectionArchitecture } = require('../services/themeSectionService');
const { getPathaoCities, getPathaoZones, getPathaoAreas, getPathaoToken,createPathaoStore,getPathaoStores } = require('../services/pathaoService');
const { mirrorPathaoConfigOnShop } = require('../services/courierConfigService');
const {
    PUBLIC_PRODUCT_CARD_PROJECT,
    sanitizePublicProduct,
    sanitizePublicProducts
} = require('../services/publicProductSerializer');
const { fillMissingPolicyDefaults } = require('../services/policies/defaultPolicyTemplates');
const { buildPublicShopVerification } = require('../services/verification/vendorVerificationStatusService');
const {
    applyScheduledSalesToProducts,
    getActiveSalePopups
} = require('../services/sales/scheduledSaleService');
const { hasFeature } = require('../services/shops/featureAccessService');
const { getShopPlanAccess } = require('../services/billing/planAccessService');
const { getPublicThemeForPlan } = require('../services/billing/storeBuilderPlanService');
const {
    applyBrandingToPublicTheme,
    resolveStoreBranding
} = require('../services/shops/storeBrandingService');
const { buildPagination } = require('../utils/pagination');
const { mergeCategoryDetails } = require('../services/categories/categoryService');

const PUBLIC_SHOP_FIELDS = 'shopName subdomain searchAliases branding theme storewideDiscount customDomain.domain customDomain.status customDomain.ownershipVerified customDomain.routingVerified customDomain.manuallyVerifiedRouting customDomain.planInactive badgeStatus badgeType badgeApprovedAt badgeExpiresAt badgeRevokedAt verification.status verification.phoneVerified verification.phoneVerifiedAt verification.isVendorVerified verification.verifiedAt isActive approvalStatus plan updatedAt';
const BOOTSTRAP_CACHE_TTL_SECONDS = 60;

const getActiveBannerQuery = (shopId, now = new Date()) => ({
    shop_id: shopId,
    isActive: true,
    $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] }
    ]
});

const buildProductUrl = (product) => product ? `/products/${product.slug || product._id}` : '';

const normalizeBannerForPublic = (banner, now = new Date()) => {
    const product = banner.scheduledProduct || null;
    const productPublished = product
        ? product.isDeleted !== true && product.isActive === true && product.status === 'Published'
        : false;

    if (banner.type === 'scheduled_product') {
        if (!product) return null;
        if (productPublished && banner.postLaunchBehavior === 'hide_on_publish') return null;
        if (productPublished && banner.postLaunchBehavior === 'keep_until_end' && banner.endsAt && new Date(banner.endsAt) <= now) return null;
    }

    const isUpcoming = banner.type === 'scheduled_product' && !productPublished;
    const launchAt = product?.publishAt || null;

    return {
        _id: banner._id,
        type: banner.type || 'standard',
        title: banner.title,
        subtitle: banner.subtitle || '',
        images: banner.images || [],
        desktopImages: banner.desktopImages || banner.images || [],
        mobileImages: banner.mobileImages || [],
        link: isUpcoming ? '' : (banner.link || buildProductUrl(product)),
        startsAt: banner.startsAt,
        endsAt: banner.endsAt,
        countdownEnabled: Boolean(banner.countdownEnabled && isUpcoming && launchAt),
        launchAt,
        postLaunchBehavior: banner.postLaunchBehavior,
        postLaunchCtaText: banner.postLaunchCtaText || 'View product',
        scheduledProduct: product ? {
            _id: product._id,
            title: product.title,
            slug: product.slug,
            status: product.status,
            publicationStatus: product.publicationStatus,
            publishAt: product.publishAt,
            isPublic: productPublished
        } : null
    };
};

const applyDefaultPoliciesToShopPayload = (shop) => {
    if (!shop) return shop;
    const result = fillMissingPolicyDefaults(shop.theme?.policies || {}, { storeName: shop.shopName });
    shop.theme = {
        ...(shop.theme || {}),
        policies: result.policies
    };
    return shop;
};

const applyPublicPlanSettings = (shop, planAccess) => {
    if (!shop || !planAccess) return shop;
    shop.theme = getPublicThemeForPlan(shop.theme || {}, planAccess);
    if (!planAccess.features.coupons) shop.storewideDiscount = 0;
    return shop;
};

const applyEssentialBranding = async (shop, planAccess) => {
    if (!shop) return shop;
    const branding = await resolveStoreBranding(shop);
    shop.theme = applyBrandingToPublicTheme({
        theme: shop.theme || {},
        branding,
        storeBuilderEnabled: Boolean(planAccess?.features?.storeBuilder)
    });
    shop.branding = branding;
    return shop;
};

const attachPublicBranding = async (shop) => {
    if (!shop) return shop;
    shop.showPlatformBranding = !(await hasFeature(shop._id, 'platformBrandingRemoval'));
    delete shop.plan;
    return shop;
};

const getPublicTrustedBadge = async (shop) => {
    if (!shop || shop.badgeStatus !== 'active') return null;
    if (shop.isActive === false || shop.approvalStatus !== 'Approved') return null;
    if (shop.verification?.status !== 'approved' || !shop.verification?.phoneVerified) return null;
    if (shop.badgeExpiresAt && new Date(shop.badgeExpiresAt) <= new Date()) return null;
    if (shop.badgeRevokedAt) return null;
    if (!(await hasFeature(shop._id, 'trustSystem'))) return null;

    const subscription = await Subscription.findOne({ shopId: shop._id, status: 'active' })
        .select('_id status')
        .lean();
    if (!subscription) return null;

    return {
        active: true,
        type: shop.badgeType || 'trusted_seller',
        label: shop.badgeType === 'verified_seller' ? 'Verified Seller' : 'ScaleUp Trusted',
        tooltip: 'Verified by ScaleUp based on identity verification, sales history, store age, and customer review quality.',
        approvedAt: shop.badgeApprovedAt || null
    };
};

const getManualSectionProductIds = (sections = []) => {
    const idsBySection = {};
    sections.forEach(section => {
        if (section?.type !== 'FeaturedProducts' || section?.isEnabled === false) return;
        const source = section.settings?.source || section.source || {};
        const productIds = section.settings?.productIds || source.productIds || [];
        if ((source.type || 'manual') !== 'manual' || !Array.isArray(productIds) || productIds.length === 0) return;
        idsBySection[section.id || String(section._id)] = productIds.map(String).filter(id => /^[a-f\d]{24}$/i.test(id));
    });
    return idsBySection;
};

const getSelectedSectionReviewIds = (sections = []) => {
    const idsBySection = {};
    sections.forEach(section => {
        if (section?.type !== 'Reviews' || section?.isEnabled === false) return;
        const reviewIds = section.settings?.reviewIds || [];
        if (!Array.isArray(reviewIds) || reviewIds.length === 0) return;
        idsBySection[section.id || String(section._id)] = reviewIds.map(String).filter(id => /^[a-f\d]{24}$/i.test(id));
    });
    return idsBySection;
};


exports.getStoreInfo = async (req, res) => {
    try {
        const shop = await Shop.findById(req.tenantId)
            .select(PUBLIC_SHOP_FIELDS)
            .lean();

        if (!shop) {
            return res.status(404).json({ error: "Shop details not found." });
        }
        const planAccess = await getShopPlanAccess(shop._id);
        applyPublicPlanSettings(shop, planAccess);
        await applyEssentialBranding(shop, planAccess);
        applyDefaultPoliciesToShopPayload(shop);
        shop.trustedBadge = await getPublicTrustedBadge(shop);
        shop.shopVerification = buildPublicShopVerification(shop, {
            eligible: planAccess.features.publicVerifiedBadge
        });
        await attachPublicBranding(shop);
        delete shop.badgeStatus;
        delete shop.badgeType;
        delete shop.badgeApprovedAt;
        delete shop.badgeExpiresAt;
        delete shop.badgeRevokedAt;
        delete shop.verification;
        delete shop.isActive;
        delete shop.approvalStatus;

        res.status(200).json(shop);
    } catch (err) {
        res.status(500).json({ error: "Error fetching shop info." });
    }
};

exports.getStorefrontBootstrap = async (req, res) => {
    try {
        const shopId = req.tenantId;
        const {
            page = 1,
            sort,
            category,
            minPrice,
            maxPrice,
            minRating
        } = req.query;
        const currentPage = Math.max(parseInt(page, 10) || 1, 1);
        const limit = 9;
        const skip = (currentPage - 1) * limit;
        const shopObjectId = new mongoose.Types.ObjectId(shopId);
        const planAccess = await getShopPlanAccess(shopId);
        const cacheKey = `storefront:bootstrap:${shopId}:${JSON.stringify({
            plan: planAccess.planKey,
            page: currentPage,
            sort,
            category,
            minPrice,
            maxPrice,
            minRating
        })}`;

        const cached = await cache.get(cacheKey);
        if (cached) {
            return res.status(200).json({
                ...cached,
                data: {
                    ...(cached.data || {}),
                    serverNow: new Date().toISOString()
                }
            });
        }

        const query = {
            shop_id: shopObjectId,
            isDeleted: false,
            isActive: true,
            status: 'Published'
        };

        if (category && category !== 'All') query.category = category;
        if (minPrice || maxPrice) {
            query['pricing.sellingPrice'] = {};
            if (minPrice) query['pricing.sellingPrice'].$gte = Number(minPrice);
            if (maxPrice) query['pricing.sellingPrice'].$lte = Number(maxPrice);
        }
        if (minRating) query.averageRating = { $gte: Math.min(Math.max(Number(minRating) || 0, 0), 5) };

        let sortQuery = { createdAt: -1, _id: 1 };
        if (sort === 'priceAsc') sortQuery = { 'pricing.sellingPrice': 1, _id: 1 };
        else if (sort === 'priceDesc') sortQuery = { 'pricing.sellingPrice': -1, _id: 1 };
        else if (sort === 'ratingDesc') sortQuery = { averageRating: -1, numReviews: -1, _id: 1 };
        else if (sort === 'ratingAsc') sortQuery = { averageRating: 1, numReviews: 1, _id: 1 };
        else if (sort === 'nameAsc') sortQuery = { title: 1, _id: 1 };
        else if (sort === 'nameDesc') sortQuery = { title: -1, _id: 1 };

        const [shop, banners, products, totalProducts, categories, categoryMetadata, collections] = await Promise.all([
            Shop.findById(shopId).select(PUBLIC_SHOP_FIELDS).lean(),
            planAccess.features.scheduledBanners
                ? Banner.find(getActiveBannerQuery(shopId))
                    .populate('scheduledProduct', 'title slug status publicationStatus publishAt isActive isDeleted')
                    .sort({ createdAt: -1 })
                    .lean()
                : Promise.resolve([]),
            Product.aggregate([
                { $match: query },
                { $sort: sortQuery },
                { $skip: skip },
                { $limit: limit },
                { $project: PUBLIC_PRODUCT_CARD_PROJECT }
            ]),
            Product.countDocuments(query),
            Product.distinct('category', {
                shop_id: shopObjectId,
                isDeleted: false,
                isActive: true,
                status: 'Published'
            }),
            Category.find({ shop_id: shopId }).select('name coverImage updatedAt').lean(),
            Collection.find({ shop_id: shopId, isActive: true })
                .select('title slug updatedAt')
                .sort({ title: 1 })
                .limit(50)
                .lean()
        ]);

        if (!shop) {
            return res.status(404).json({ error: "Shop details not found." });
        }

        await ensureThemeSectionArchitecture(shop);
        applyPublicPlanSettings(shop, planAccess);
        await applyEssentialBranding(shop, planAccess);
        applyDefaultPoliciesToShopPayload(shop);
        shop.trustedBadge = await getPublicTrustedBadge(shop);
        shop.shopVerification = buildPublicShopVerification(shop, {
            eligible: planAccess.features.publicVerifiedBadge
        });
        await attachPublicBranding(shop);
        delete shop.badgeStatus;
        delete shop.badgeType;
        delete shop.badgeApprovedAt;
        delete shop.badgeExpiresAt;
        delete shop.badgeRevokedAt;
        delete shop.verification;
        delete shop.isActive;
        delete shop.approvalStatus;

        const pricedProducts = await applyScheduledSalesToProducts({ shopId, products });
        const manualIdsBySection = getManualSectionProductIds(shop.theme?.homepageSections || []);
        const allManualProductIds = [...new Set(Object.values(manualIdsBySection).flat())];
        const reviewIdsBySection = getSelectedSectionReviewIds(shop.theme?.homepageSections || []);
        const allReviewIds = [...new Set(Object.values(reviewIdsBySection).flat())];
        let sectionProducts = {};
        let sectionReviews = {};

        if (allManualProductIds.length > 0) {
            const manualProducts = await Product.aggregate([
                {
                    $match: {
                        _id: { $in: allManualProductIds.map(id => new mongoose.Types.ObjectId(id)) },
                        shop_id: shopObjectId,
                        isDeleted: false,
                        isActive: true,
                        status: 'Published'
                    }
                },
                { $project: PUBLIC_PRODUCT_CARD_PROJECT }
            ]);
            const pricedManualProducts = await applyScheduledSalesToProducts({ shopId, products: manualProducts });
            const productMap = new Map(pricedManualProducts.map(product => [String(product._id), product]));
            sectionProducts = Object.entries(manualIdsBySection).reduce((acc, [sectionId, productIds]) => {
                acc[sectionId] = productIds.map(id => productMap.get(String(id))).filter(Boolean);
                return acc;
            }, {});
        }

        if (allReviewIds.length > 0) {
            const reviews = await Review.find({
                _id: { $in: allReviewIds.map(id => new mongoose.Types.ObjectId(id)) },
                shop_id: shopObjectId,
                rating: 5
            }).select('_id product_id name rating comment createdAt').lean();
            const reviewProductIds = [...new Set(reviews.map(review => String(review.product_id)).filter(Boolean))];
            const reviewProducts = reviewProductIds.length
                ? await Product.find({
                    _id: { $in: reviewProductIds.map(id => new mongoose.Types.ObjectId(id)) },
                    shop_id: shopObjectId,
                    isDeleted: false
                }).select('title').lean()
                : [];
            const productMap = new Map(reviewProducts.map(product => [String(product._id), product]));
            const reviewMap = new Map(reviews.map(review => [
                String(review._id),
                {
                    ...review,
                    product: productMap.get(String(review.product_id)) || null
                }
            ]));
            sectionReviews = Object.entries(reviewIdsBySection).reduce((acc, [sectionId, reviewIds]) => {
                acc[sectionId] = reviewIds.map(id => reviewMap.get(String(id))).filter(Boolean);
                return acc;
            }, {});
        }

        const activeSalePopups = planAccess.features.scheduledSales
            ? await getActiveSalePopups({ shopId })
            : [];

        const response = {
            success: true,
            data: {
                shop,
                banners: banners.map(banner => normalizeBannerForPublic(banner)).filter(Boolean),
                activeSalePopups,
                sectionProducts,
                sectionReviews,
                products: pricedProducts,
                categories: categories.filter(Boolean),
                categoryDetails: mergeCategoryDetails({ names: categories, metadata: categoryMetadata }),
                collections,
                pagination: buildPagination({
                    total: totalProducts,
                    page: currentPage,
                    limit
                })
            }
        };

        await cache.set(cacheKey, response, BOOTSTRAP_CACHE_TTL_SECONDS);
        res.status(200).json({
            ...response,
            data: {
                ...response.data,
                serverNow: new Date().toISOString()
            }
        });
    } catch (err) {
        console.error("Storefront bootstrap error:", err);
        res.status(500).json({ error: "Error loading storefront data." });
    }
};


exports.getStoreProducts = async (req, res) => {
    try {
        const products = await Product.find({ shop_id: req.tenantId })
            .sort({ createdAt: -1 });
        const pricedProducts = await applyScheduledSalesToProducts({
            shopId: req.tenantId,
            products: products.map(product => product.toObject({ virtuals: true }))
        });

        res.status(200).json({
            count: pricedProducts.length,
            products: sanitizePublicProducts(pricedProducts)
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching products." });
    }
};

exports.getSingleProduct = async (req, res) => {
    try {
        const slugOrId = String(req.params.id || '').trim();
        const baseQuery = {
            shop_id: req.tenantId,
            isDeleted: false,
            isActive: true,
            status: 'Published'
        };

        let product = await Product.findOne({
            ...baseQuery,
            slug: slugOrId.toLowerCase()
        });

        if (!product && mongoose.Types.ObjectId.isValid(slugOrId)) {
            product = await Product.findOne({
                ...baseQuery,
                _id: slugOrId
            });
        }

        if (!product) {
            return res.status(404).json({ error: "Product not found." });
        }

        const [pricedProduct] = await applyScheduledSalesToProducts({
            shopId: req.tenantId,
            products: [product.toObject({ virtuals: true })]
        });
        res.status(200).json(sanitizePublicProduct(pricedProduct));
    } catch (err) {
        res.status(500).json({ error: "Error fetching product details." });
    }
};

exports.getBatchProducts = async (req, res) => {
    try {
        const ids = String(req.query.ids || '')
            .split(',')
            .map(id => id.trim())
            .filter(Boolean);

        if (ids.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        const products = await Product.find({
            _id: { $in: ids },
            shop_id: req.tenantId,
            isDeleted: false,
            isActive: true,
            status: 'Published'
        })
            .select('title slug category collections imageAltText coverMediaId images pricing variants averageRating numReviews entitlementMedia')
            .lean({ virtuals: true });

        const pricedProducts = await applyScheduledSalesToProducts({ shopId: req.tenantId, products });
        res.status(200).json({ success: true, data: sanitizePublicProducts(pricedProducts) });
    } catch (err) {
        res.status(500).json({ success: false, error: "Error fetching products." });
    }
};

exports.getCartRecommendations = async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 12);
        const shopObjectId = new mongoose.Types.ObjectId(req.tenantId);
        const cartIds = String(req.query.ids || '')
            .split(',')
            .map(id => id.trim())
            .filter(id => mongoose.Types.ObjectId.isValid(id))
            .slice(0, 40);
        const cartObjectIds = [...new Set(cartIds)].map(id => new mongoose.Types.ObjectId(id));

        const baseMatch = {
            shop_id: shopObjectId,
            isDeleted: false,
            isActive: true,
            status: 'Published',
            ...(cartObjectIds.length > 0 ? { _id: { $nin: cartObjectIds } } : {}),
            $expr: { $gt: [{ $sum: '$variants.stock' }, 0] }
        };

        const cartProducts = cartObjectIds.length
            ? await Product.find({
                _id: { $in: cartObjectIds },
                shop_id: shopObjectId,
                isDeleted: false
            }).select('category tags collections').lean()
            : [];

        const categories = [...new Set(cartProducts.map(product => product.category).filter(Boolean))];
        const tags = [...new Set(cartProducts.flatMap(product => product.tags || []).filter(Boolean))];
        const collections = [...new Set(cartProducts.flatMap(product => product.collections || []).map(String).filter(Boolean))];

        const priorityMatches = [];
        if (categories.length > 0) priorityMatches.push({ category: { $in: categories } });
        if (tags.length > 0) priorityMatches.push({ tags: { $in: tags } });
        if (collections.length > 0) {
            priorityMatches.push({
                collections: {
                    $in: collections.map(id => new mongoose.Types.ObjectId(id))
                }
            });
        }

        const projectStage = { $project: PUBLIC_PRODUCT_CARD_PROJECT };
        const sortStage = { $sort: { averageRating: -1, numReviews: -1, createdAt: -1, _id: 1 } };
        let recommendations = [];

        if (priorityMatches.length > 0) {
            recommendations = await Product.aggregate([
                { $match: { ...baseMatch, $or: priorityMatches } },
                sortStage,
                { $limit: limit },
                projectStage
            ]);
        }

        if (recommendations.length < limit) {
            const alreadyPickedIds = recommendations.map(product => product._id);
            const fallbackProducts = await Product.aggregate([
                {
                    $match: {
                        ...baseMatch,
                        ...(alreadyPickedIds.length > 0
                            ? {
                                _id: {
                                    $nin: [
                                        ...cartObjectIds,
                                        ...alreadyPickedIds
                                    ]
                                }
                            }
                            : {})
                    }
                },
                sortStage,
                { $limit: limit - recommendations.length },
                projectStage
            ]);
            recommendations = [...recommendations, ...fallbackProducts];
        }

        const pricedRecommendations = await applyScheduledSalesToProducts({
            shopId: req.tenantId,
            products: recommendations
        });

        res.status(200).json({
            success: true,
            data: sanitizePublicProducts(pricedRecommendations)
        });
    } catch (err) {
        console.error("Cart recommendations error:", err);
        res.status(500).json({ success: false, error: "Error loading recommendations." });
    }
};


exports.getCities = async (req, res) => {
    try {
        const token = await getPathaoToken();
        const cities = await getPathaoCities(token);
        res.status(200).json({ success: true, data: cities });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to load cities' });
    }
};

exports.getZones = async (req, res) => {
    try {
        const token = await getPathaoToken();
        const zones = await getPathaoZones(token, req.params.cityId);
        res.status(200).json({ success: true, data: zones });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to load zones' });
    }
};

exports.getAreas = async (req, res) => {
    try {
        const token = await getPathaoToken();
        const areas = await getPathaoAreas(token, req.params.zoneId);
        res.status(200).json({ success: true, data: areas });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to load areas' });
    }
};

const Joi = require('joi');


const pathaoSetupSchema = Joi.object({
    contact_name: Joi.string().min(3).max(50).required(),
    contact_number: Joi.string().length(11).required().messages({
        'string.length': 'Contact number must be exactly 11 digits'
    }),
    address: Joi.string().min(10).max(120).required(),
    city_id: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
    zone_id: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
    area_id: Joi.alternatives().try(Joi.number(), Joi.string()).required()
});

exports.setupVendorPathaoStore = async (req, res) => {
    try {
        const { error, value } = pathaoSetupSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ success: false, error: error.details[0].message });
        }

        const shopId = req.tenantId;

        const shop = await Shop.findById(shopId);
        if (!shop) {
            return res.status(404).json({ success: false, error: 'Shop not found' });
        }

        const token = await getPathaoToken();

        const storePayload = {
            name: shop.shopName.substring(0, 50),
            contact_name: value.contact_name,
            contact_number: value.contact_number,
            address: value.address,
            city_id: parseInt(value.city_id, 10),
            zone_id: parseInt(value.zone_id, 10),
            area_id: parseInt(value.area_id, 10)
        };

        await createPathaoStore(token, storePayload);

        const { data: storesResponse } = await getPathaoStores(token);
        const storesList = storesResponse?.data?.data || storesResponse?.data || [];

        const newStore = storesList.find(
            s => s.contact_number === storePayload.contact_number && s.store_name === storePayload.name
        );

        if (!newStore || !newStore.store_id) {
            return res.status(500).json({
                success: false,
                error: "Store was created in Pathao, but we couldn't retrieve the ID. Please contact support."
            });
        }

        shop.pathaoStoreId = newStore.store_id;
        mirrorPathaoConfigOnShop(shop, {
            storeId: newStore.store_id,
            storeName: newStore.store_name || newStore.name || ''
        });
        await shop.save();

        res.status(200).json({
            success: true,
            message: 'Pathao shipping location successfully linked to your shop!',
            data: {
                pathaoStoreId: shop.pathaoStoreId
            }
        });

    } catch (err) {
        console.error("Vendor Pathao Setup Error:", err);
        res.status(500).json({
            success: false,
            error: err.message || 'Failed to setup Pathao integration'
        });
    }
};

// Link Existing Pathao Account
exports.linkExistingPathaoAccount = async (req, res) => {
    try {
        const { client_id, client_secret, username, password, store_id, isLive } = req.body;
        const shopId = req.tenantId;

        // 1. Test the credentials by trying to get a token
        const customCreds = { client_id, client_secret, username, password, isLive };
        const token = await getPathaoToken(customCreds); // If this fails, it throws an error to the catch block

        // 2. If token works, save everything to the database
        const shop = await Shop.findById(shopId);
        shop.pathaoStoreId = parseInt(store_id, 10);
        shop.pathaoCredentials = customCreds;
        mirrorPathaoConfigOnShop(shop, {
            storeId: shop.pathaoStoreId,
            enabled: true,
            status: 'Active'
        });
        await shop.save();

        res.status(200).json({
            success: true,
            message: 'Successfully linked your existing Pathao account!',
            data: { pathaoStoreId: shop.pathaoStoreId }
        });

    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Invalid Pathao credentials.' });
    }
};
