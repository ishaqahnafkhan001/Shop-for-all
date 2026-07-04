const Banner = require('../models/Banner');
const Product = require('../models/Product');
const cache = require('../services/cacheService');

const invalidateStorefrontBannerCache = async (shopId) => {
    if (shopId) await cache.delPattern(`storefront:bootstrap:${shopId}:*`);
};

const getShopId = (req) => req.tenantId || req.user?.shopId || req.user?.shop_id;

const parseOptionalDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
};

const getActiveBannerQuery = (shopId, now = new Date()) => ({
    shop_id: shopId,
    isActive: true,
    $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] }
    ]
});

const isObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || ''));
const stripText = (value = '', max = 240) => String(value || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

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

    const launchAt = product?.publishAt || null;
    const isUpcoming = banner.type === 'scheduled_product' && !productPublished;

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

const validateScheduledProductBanner = async ({
    shopId,
    scheduledProduct,
    startsAt,
    endsAt,
    desktopImages,
    mobileImages,
    postLaunchBehavior
}) => {
    if (!isObjectId(scheduledProduct)) {
        throw new Error('Select a valid scheduled product.');
    }

    const product = await Product.findOne({
        _id: scheduledProduct,
        shop_id: shopId,
        isDeleted: false
    }).select('_id title slug status isActive publicationStatus publishAt').lean();

    if (!product) throw new Error('Scheduled product not found for this shop.');
    if (product.publicationStatus !== 'scheduled' || !product.publishAt) {
        throw new Error('Launch banners can only be linked to scheduled products.');
    }
    if (new Date(product.publishAt).getTime() <= Date.now()) {
        throw new Error('Launch banner product publish time must be in the future.');
    }
    if (!desktopImages.length) throw new Error('Desktop banner image is required.');
    if (!mobileImages.length) throw new Error('Mobile banner image is required for launch banners.');
    if (!startsAt || startsAt >= new Date(product.publishAt)) {
        throw new Error('Banner display start must be before the product publish time.');
    }
    if (postLaunchBehavior === 'keep_until_end' && (!endsAt || endsAt <= new Date(product.publishAt))) {
        throw new Error('Keep-until-end launch banners need an end time after publication.');
    }
    if (endsAt && endsAt <= startsAt) {
        throw new Error('Banner end time must be after start time.');
    }

    return product;
};

// @desc    Create new banner with multiple images (Admin Only)
exports.createBanner = async (req, res) => {
    try {
        const {
            title,
            subtitle,
            link,
            type = 'standard',
            scheduledProduct,
            countdownEnabled,
            postLaunchBehavior = 'convert_to_product',
            postLaunchCtaText
        } = req.body;

        // 🔹 1. Extract shop ID from the authenticated user
        // Adjust 'req.user.shopId' to whatever your auth middleware provides!
        const shop_id = getShopId(req);

        if (!shop_id) {
            return res.status(401).json({ success: false, message: "Unauthorized: Shop ID missing" });
        }

        const filesByField = req.files || {};
        const desktopImages = (filesByField.desktopImages || filesByField.images || []).map(file => file.path);
        const mobileImages = (filesByField.mobileImages || []).map(file => file.path);
        const startsAt = parseOptionalDate(req.body.startsAt);
        const endsAt = parseOptionalDate(req.body.endsAt);
        const bannerType = type === 'scheduled_product' ? 'scheduled_product' : 'standard';
        let launchProduct = null;

        // Check if files exist
        if (desktopImages.length === 0) {
            return res.status(400).json({ success: false, message: "No images uploaded" });
        }
        if (startsAt && endsAt && endsAt <= startsAt) {
            return res.status(400).json({ success: false, message: "Banner end time must be after start time" });
        }

        if (bannerType === 'scheduled_product') {
            try {
                launchProduct = await validateScheduledProductBanner({
                    shopId: shop_id,
                    scheduledProduct,
                    startsAt,
                    endsAt,
                    desktopImages,
                    mobileImages,
                    postLaunchBehavior
                });
            } catch (validationError) {
                return res.status(400).json({ success: false, message: validationError.message });
            }
        }

        const newBanner = await Banner.create({
            shop_id, // ✅ Save the banner to this specific shop
            title: stripText(title, 120),
            subtitle: stripText(subtitle, 240),
            type: bannerType,
            scheduledProduct: bannerType === 'scheduled_product' ? launchProduct._id : null,
            countdownEnabled: bannerType === 'scheduled_product' ? Boolean(countdownEnabled === true || countdownEnabled === 'true') : false,
            postLaunchBehavior: bannerType === 'scheduled_product' ? postLaunchBehavior : 'convert_to_product',
            postLaunchCtaText: stripText(postLaunchCtaText || 'View product', 60),
            link: bannerType === 'scheduled_product' ? buildProductUrl(launchProduct) : link,
            images: desktopImages,
            desktopImages,
            mobileImages,
            startsAt,
            endsAt,
            isActive: true
        });
        await invalidateStorefrontBannerCache(shop_id);

        res.status(201).json({
            success: true,
            message: "Banner uploaded successfully!",
            data: newBanner
        });
    } catch (error) {
        console.error("Banner Upload Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all banners (For Admin Panel Table)
exports.getAllBanners = async (req, res) => {
    try {
        // 🔹 2. Only fetch banners belonging to the logged-in admin's shop
        const shop_id = getShopId(req);

        const banners = await Banner.find({ shop_id })
            .populate('scheduledProduct', 'title slug status publicationStatus publishAt isActive isDeleted')
            .sort({ createdAt: -1 });
        res.status(200).json(banners);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get active banners (For Public Storefront)
// @desc    Get active banners (For Public Storefront)
exports.getActiveBanners = async (req, res) => {
    try {
        // 🔹 1. Read the ID securely attached by your resolveTenant middleware
        const shop_id = req.tenantId;

        if (!shop_id) {
            return res.status(400).json({
                success: false,
                message: "Tenant resolution failed. Shop ID missing."
            });
        }

        // 🔹 2. Fetch only ACTIVE banners belonging to THIS specific shop
        const banners = await Banner.find(getActiveBannerQuery(shop_id))
            .populate('scheduledProduct', 'title slug status publicationStatus publishAt isActive isDeleted')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json(banners.map(banner => normalizeBannerForPublic(banner)).filter(Boolean));
    } catch (error) {
        console.error("Fetch Active Banners Error:", error);
        res.status(500).json({ message: error.message });
    }
};
// @desc    Delete banner
exports.deleteBanner = async (req, res) => {
    try {
        // 🔹 4. Security Check: Find the banner by BOTH its ID and the Admin's Shop ID
        // This prevents Admin A from sending a DELETE request with Admin B's banner ID.
        const shop_id = getShopId(req);

        const banner = await Banner.findOneAndDelete({ _id: req.params.id, shop_id });

        if (!banner) {
            return res.status(404).json({ success: false, message: "Banner not found or unauthorized" });
        }

        await invalidateStorefrontBannerCache(shop_id);
        res.status(200).json({ success: true, message: "Banner removed successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Toggle banner visibility (Active/Inactive)
exports.toggleBannerStatus = async (req, res) => {
    try {
        // 🔹 5. Security Check: Only allow toggling if the banner belongs to the admin
        const shop_id = getShopId(req);

        const banner = await Banner.findOne({ _id: req.params.id, shop_id });

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "Banner not found or unauthorized"
            });
        }

        banner.isActive = !banner.isActive;
        await banner.save();
        await invalidateStorefrontBannerCache(shop_id);

        res.status(200).json({
            success: true,
            message: `Banner is now ${banner.isActive ? 'Active' : 'Inactive'}`,
            data: banner
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
