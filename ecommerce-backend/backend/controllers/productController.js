const Product = require('../models/Product');
const Collection = require('../models/Collection');
const User = require('../models/User');
const StaffPermission = require('../models/StaffPermission');
const { createProductSchema, updateProductSchema } = require('../validations/productValidation');
const InventoryLog = require('../models/InventoryLog');
const mongoose = require('mongoose');
const { logAudit } = require('../services/auditLogService');
const { buildPagination } = require('../utils/pagination');
const {
    parseProductPayload,
    resolveVariantImageReferences,
    getUniqueProductImageSources
} = require('../services/products/productMediaService');
const {
    generateProductContentSuggestion
} = require('../services/products/productContentAiService');
const {
    slugify,
    getUniqueSlug,
    getCachedCategories,
    addComputedProductFields,
    buildProductListQuery,
    getProductSort,
    getSummaryProjection
} = require('../services/products/productQueryService');
const {
    normalizeIncomingVariant,
    buildSimpleVariant,
    snapshotVariantStock,
    applyVariantOperations,
    buildStockAdjustmentLogs,
    expandMatrix,
    normalizeProductOptions
} = require('../services/products/productVariantService');
const {
    normalizeProductPublicationFields,
    enqueueScheduledProductPublication
} = require('../services/products/scheduledProductService');
const {
    enqueueLowStockAlertsForLogs
} = require('../services/inventoryLowStockAlertService');
const { applyScheduledSalesToProducts } = require('../services/sales/scheduledSaleService');
const {
    getShopPlanAccess,
    buildFeatureError,
    buildLimitError
} = require('../services/billing/planAccessService');
const {
    reserveWeeklyAiUsage,
    completeWeeklyAiUsage,
    releaseWeeklyAiUsage,
    getWeeklyAiUsage
} = require('../services/billing/planUsageService');
const { SUBSCRIPTION_EVENTS, emitSubscriptionEvent } = require('../services/billing/subscriptionEvents');
const {
    reserveQuota,
    releaseQuotaSafely
} = require('../services/billing/planQuotaReservationService');

const { GoogleGenerativeAI } = require("@google/generative-ai");

const ALLOWED_PAGE_SIZES = [10, 20, 25, 50, 100];

const normalizePageLimit = (value, fallback = 25) => {
    const requested = parseInt(value, 10);
    if (!Number.isFinite(requested) || requested <= 0) return fallback;
    if (ALLOWED_PAGE_SIZES.includes(requested)) return requested;
    return requested > Math.max(...ALLOWED_PAGE_SIZES)
        ? Math.max(...ALLOWED_PAGE_SIZES)
        : fallback;
};

const normalizeStorefrontPageLimit = (value, fallback = 9) => {
    const requested = parseInt(value, 10);
    if (!Number.isFinite(requested) || requested <= 0) return fallback;
    return Math.min(requested, 48);
};


// ... [KEEP ALL YOUR EXISTING FUNCTIONS HERE: getShopProducts, getSingleProduct, createProduct, updateProduct, deleteProduct] ...

const resolveCoverMediaId = ({ images = [], videos = [], requestedCover = '', coverImageIndex }) => {
    const media = [...(images || []), ...(videos || [])].map(item => String(item || '').trim()).filter(Boolean);
    const requested = String(requestedCover || '').trim();
    if (requested && media.includes(requested)) return requested;

    const numericIndex = Number(coverImageIndex);
    if (Number.isInteger(numericIndex) && numericIndex >= 0 && numericIndex < (images || []).length) {
        return images[numericIndex];
    }

    return images?.[0] || videos?.[0] || '';
};

const coverMediaBelongsToProduct = ({ images = [], videos = [], coverMediaId = '' }) => {
    const cover = String(coverMediaId || '').trim();
    if (!cover) return true;
    return [...(images || []), ...(videos || [])].map(item => String(item || '').trim()).includes(cover);
};

const isSchedulingProductPublication = (payload = {}) => (
    payload.publicationStatus === 'scheduled' || Boolean(payload.publishAt)
);

const vendorStaffHasPermission = async (req, permissionName) => {
    if (req.user?.role !== 'VendorStaff') return true;

    if (req.user.membershipId || req.user.membership_id) {
        const staffPermission = await StaffPermission.findOne({
            membership_id: req.user.membershipId || req.user.membership_id,
            shop_id: req.tenantId
        }).select('permissions').lean();
        if (staffPermission?.permissions?.[permissionName]) return true;
    }

    const user = await User.findById(req.user._id).select('permissions').lean();
    return Boolean(user?.permissions?.[permissionName]);
};

const ensureProductSchedulePermission = async (req, payload = {}) => {
    if (!isSchedulingProductPublication(payload)) return true;
    return vendorStaffHasPermission(req, 'productsSchedule');
};

const getPlanContext = async (req) => req.planAccess || getShopPlanAccess(req.tenantId);

const assertProductImageLimit = async (req, productOrCount) => {
    const context = await getPlanContext(req);
    const limit = context.limits.imagesPerProduct;
    const imageCount = typeof productOrCount === 'number'
        ? productOrCount
        : getUniqueProductImageSources(productOrCount).length;
    if (limit !== null && Number(imageCount || 0) > Number(limit)) {
        const error = new Error('Product image limit reached');
        error.statusCode = 403;
        error.payload = await buildLimitError(context, 'imagesPerProduct', Number(imageCount || 0), limit);
        throw error;
    }
    return context;
};

const assertScheduledPublishingPlan = async (req, payload) => {
    if (!isSchedulingProductPublication(payload)) return null;
    const context = await getPlanContext(req);
    return context.features.scheduledProductPublishing
        ? null
        : await buildFeatureError(context, 'scheduledProductPublishing');
};

const sendAiLimitError = async (req, res, error) => {
    const context = await getPlanContext(req);
    const usage = error.usage || await getWeeklyAiUsage({
        shopId: req.tenantId,
        limit: context.limits.aiProductCreationsPerWeek
    });
    const payload = await buildLimitError(
        context,
        'aiProductCreationsPerWeek',
        usage,
        context.limits.aiProductCreationsPerWeek
    );
    await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.QUOTA_REACHED, {
        req,
        shopId: req.tenantId,
        subscriptionId: context.subscription?._id,
        planKey: context.planKey,
        affectedResources: ['aiGeneration'],
        metadata: { resource: 'aiGeneration', usage: payload.usage, notifyVendor: false }
    });
    return res.status(403).json(payload);
};

const emitAiUsageChanged = (req, context, usage) => emitSubscriptionEvent(
    SUBSCRIPTION_EVENTS.USAGE_CHANGED,
    {
        req,
        shopId: req.tenantId,
        subscriptionId: context.subscription?._id,
        planKey: context.planKey,
        affectedResources: ['aiGeneration'],
        metadata: { action: 'ai_generation', resource: 'aiGeneration', usage }
    }
);


/**
 * @desc    Generate Product Description via AI (Gemini)
 * @route   POST /api/admin/products/generate-description
 * @access  Private (Admin)
 */
exports.generateDescription = async (req, res) => {
    let usageReservation = null;
    try {
        const { title, category } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, error: "Product title is required." });
        }

        const context = await getPlanContext(req);
        usageReservation = await reserveWeeklyAiUsage({
            shopId: req.tenantId,
            limit: context.limits.aiProductCreationsPerWeek
        });

        // Initialize Gemini (Ensure GEMINI_API_KEY is in your .env file)
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        // Prompt Engineering
        const prompt = `
            Act as an expert e-commerce copywriter. Write a compelling, SEO-friendly product description for the following item:
            - Product Name: ${title}
            - Category: ${category || 'General'}
            
            Format the response in 2 short paragraphs. Focus on the benefits to the user. Keep it professional yet engaging. Do not use markdown symbols like ** or ##.
        `;

        const result = await model.generateContent(prompt);
        const description = result.response.text();

        await completeWeeklyAiUsage(usageReservation);
        usageReservation = null;
        const usage = await getWeeklyAiUsage({
            shopId: req.tenantId,
            limit: context.limits.aiProductCreationsPerWeek
        });
        await emitAiUsageChanged(req, context, usage);
        res.status(200).json({ success: true, description: description.trim(), usage });

    } catch (err) {
        await releaseWeeklyAiUsage(usageReservation);
        if (err?.code === 'PLAN_LIMIT_REACHED') return sendAiLimitError(req, res, err);
        console.error("AI Generation Error:", err);
        res.status(500).json({ success: false, error: "Failed to generate description. Please try again." });
    }
};

/**
 * @desc    Generate image-aware product content suggestions via AI
 * @route   POST /api/admin/products/ai/content-suggest
 * @access  Private (VendorAdmin/VendorStaff with products permission)
 */
exports.generateProductContent = async (req, res) => {
    let usageReservation = null;
    try {
        if (!req.body?.title?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Product title is required before generating AI suggestions.'
            });
        }

        const context = await getPlanContext(req);
        usageReservation = await reserveWeeklyAiUsage({
            shopId: req.tenantId,
            limit: context.limits.aiProductCreationsPerWeek
        });
        const suggestion = await generateProductContentSuggestion({
            body: req.body,
            file: req.file || null
        });
        const diagnostics = suggestion.imageDiagnostics || {};

        console.info('Product AI request', {
            requestId: req.id,
            shopId: req.tenantId,
            usedImage: Boolean(suggestion.usedImage),
            imageSource: suggestion.imageSource || 'text_only',
            mimeType: diagnostics.mimeType || undefined,
            imageSizeBytes: diagnostics.imageSizeBytes || undefined
        });

        await completeWeeklyAiUsage(usageReservation);
        usageReservation = null;
        const usage = await getWeeklyAiUsage({
            shopId: req.tenantId,
            limit: context.limits.aiProductCreationsPerWeek
        });
        await emitAiUsageChanged(req, context, usage);

        res.status(200).json({
            success: true,
            usedImage: suggestion.usedImage,
            imageSource: suggestion.imageSource || 'text_only',
            imageAnalysis: suggestion.data?.imageAnalysis || {},
            fallback: Boolean(suggestion.fallback),
            ...(suggestion.errorCode && { errorCode: suggestion.errorCode }),
            data: suggestion.data,
            usage
        });
    } catch (err) {
        await releaseWeeklyAiUsage(usageReservation);
        if (err?.code === 'PLAN_LIMIT_REACHED') return sendAiLimitError(req, res, err);
        if (err?.code === 'AI_NOT_CONFIGURED') {
            return res.status(503).json({
                success: false,
                configured: false,
                message: 'AI product suggestions are not configured yet. Please add GEMINI_API_KEY on the backend server.'
            });
        }

        if (err?.code === 'AI_RESPONSE_PARSE_FAILED') {
            return res.status(200).json({
                success: false,
                configured: true,
                message: 'AI product suggestions could not be generated right now. Please try again.',
                errorCode: 'AI_RESPONSE_PARSE_FAILED'
            });
        }

        if (err?.code === 'AI_PROVIDER_FAILED') {
            console.warn('Product content AI provider failure:', {
                requestId: req.id,
                causeCode: err.causeCode
            });

            return res.status(200).json({
                success: false,
                configured: true,
                message: 'AI product suggestions could not be generated right now. Please try again later.',
                errorCode: 'AI_PROVIDER_FAILED'
            });
        }

        if (err?.code === 'INSUFFICIENT_PRODUCT_CONTEXT') {
            return res.status(200).json({
                success: false,
                configured: true,
                message: 'Add a clearer product image or more product information to generate useful customer benefits.',
                errorCode: 'INSUFFICIENT_PRODUCT_CONTEXT'
            });
        }

        console.error('Product content AI suggestion error:', err.message);
        res.status(200).json({
            success: false,
            configured: true,
            message: 'AI product suggestions could not be generated right now. Please try again later.',
            errorCode: 'AI_PROVIDER_FAILED'
        });
    }
};

/**
 * @desc    Get all products for a shop (paginated + searchable)
 * @route   GET /api/admin/products
 * @access  Private (Admin)
 */
exports.getShopProducts = async (req, res) => {
    try {
        const shopId = req.tenantId;
        const shopObjectId = new mongoose.Types.ObjectId(shopId);
        const { sort } = req.query;

        const isStorefrontRequest = !req.user || req.user.role === 'Customer';
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = isStorefrontRequest
            ? normalizeStorefrontPageLimit(req.query.limit, 9)
            : normalizePageLimit(req.query.limit, 25);
        const query = buildProductListQuery({
            shopId,
            filters: req.query,
            isStorefrontRequest
        });
        const sortQuery = getProductSort(sort);

        const skip = (page - 1) * limit;
        const categoryQuery = {
            shop_id: shopObjectId,
            isDeleted: false,
            ...(isStorefrontRequest ? { isActive: true, status: 'Published' } : {})
        };

        const summaryProjection = getSummaryProjection(isStorefrontRequest);
        const normalizeSort = (value = '') => {
            if (value === 'price_asc') return 'priceAsc';
            if (value === 'price_desc') return 'priceDesc';
            if (value === 'rating_desc') return 'ratingDesc';
            if (value === 'rating_asc') return 'ratingAsc';
            return value;
        };
        const normalizedSort = normalizeSort(sort);
        const isTruthyFilter = (value) => value === true || String(value || '').toLowerCase() === 'true';
        const normalizedStockFilter = ['in', 'out'].includes(String(req.query.stock || ''))
            ? String(req.query.stock)
            : '';
        const wantsSaleFilter = isTruthyFilter(req.query.sale);
        const needsEffectivePostFilter = isStorefrontRequest && (
            wantsSaleFilter ||
            Boolean(normalizedStockFilter) ||
            Boolean(req.query.minPrice || req.query.maxPrice) ||
            normalizedSort === 'priceAsc' ||
            normalizedSort === 'priceDesc'
        );

        const [rawProducts, total, uniqueCategories] = await Promise.all([
            Product.aggregate(needsEffectivePostFilter
                ? [
                    { $match: query },
                    { $sort: sortQuery },
                    { $project: summaryProjection }
                ]
                : [
                    { $match: query },
                    { $sort: sortQuery },
                    { $skip: skip },
                    { $limit: limit },
                    { $project: summaryProjection }
                ]),
            needsEffectivePostFilter ? Promise.resolve(0) : Product.countDocuments(query),
            getCachedCategories(shopId, categoryQuery)
        ]);

        let pricedProducts = isStorefrontRequest
            ? await applyScheduledSalesToProducts({ shopId, products: rawProducts })
            : rawProducts;

        pricedProducts = pricedProducts.map(addComputedProductFields);
        let filteredProducts = pricedProducts;
        if (needsEffectivePostFilter) {
            const minPrice = Number(req.query.minPrice);
            const maxPrice = Number(req.query.maxPrice);
            filteredProducts = pricedProducts.filter(product => {
                const effectivePrice = Number(product.finalPrice ?? product.salePrice ?? product.pricing?.salePrice ?? product.pricing?.sellingPrice ?? 0);
                const compareAtPrice = Number(product.compareAtPrice ?? product.pricing?.compareAtPrice ?? 0);
                const stock = Number(product.totalStock ?? product.stock ?? 0);
                if (wantsSaleFilter && !product.scheduledSale && !(compareAtPrice > effectivePrice)) return false;
                if (normalizedStockFilter === 'in' && stock <= 0) return false;
                if (normalizedStockFilter === 'out' && stock > 0) return false;
                if (Number.isFinite(minPrice) && minPrice > 0 && effectivePrice < minPrice) return false;
                if (Number.isFinite(maxPrice) && maxPrice > 0 && effectivePrice > maxPrice) return false;
                return true;
            });
            if (normalizedSort === 'priceAsc' || normalizedSort === 'priceDesc') {
                filteredProducts.sort((a, b) => {
                    const priceA = Number(a.finalPrice ?? a.salePrice ?? a.pricing?.salePrice ?? a.pricing?.sellingPrice ?? 0);
                    const priceB = Number(b.finalPrice ?? b.salePrice ?? b.pricing?.salePrice ?? b.pricing?.sellingPrice ?? 0);
                    return normalizedSort === 'priceAsc'
                        ? priceA - priceB || String(a._id).localeCompare(String(b._id))
                        : priceB - priceA || String(a._id).localeCompare(String(b._id));
                });
            }
        }
        const effectiveTotal = needsEffectivePostFilter ? filteredProducts.length : total;
        const pagedProducts = needsEffectivePostFilter
            ? filteredProducts.slice(skip, skip + limit)
            : filteredProducts;

        res.status(200).json({
            success: true,
            data: pagedProducts,
            categories: uniqueCategories, // ✨ Send the categories back to the frontend
            pagination: buildPagination({ total: effectiveTotal, page, limit })
        });

    } catch (err) {
        console.error("Get products error:", err);
        res.status(500).json({ success: false, error: "Failed to fetch products" });
    }
};

/**
 * @desc    Get a single product by ID
 * @route   GET /api/admin/products/:id
 * @access  Private (Admin)
 */
exports.getSingleProduct = async (req, res) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            shop_id: req.tenantId,
            isDeleted: false
        });

        if (!product) {
            return res.status(404).json({ success: false, error: "Product not found" });
        }

        res.status(200).json({ success: true, data: product });

    } catch (err) {
        console.error("Get single product error:", err);
        res.status(500).json({ success: false, error: "Failed to fetch product" });
    }
};


/**
 * @desc    Create a new product
 * @route   POST /api/admin/products
 * @access  Private (Admin)
 */
exports.createProduct = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // ── 1. Extract Cloudinary media URLs ─────────────────────────────────
        let imageUrls = [];
        let videoUrls = [];

        if (req.files?.images) imageUrls = req.files.images.map(f => f.path);
        if (req.files?.videos) videoUrls = req.files.videos.map(f => f.path);

        // ── 2. Parse JSON fields from FormData ────────────────────────────────
        //    When sent as multipart/form-data, JSON objects arrive as strings.
        let parsedBody;
        try {
            parsedBody = parseProductPayload(req.body);
        } catch (parseError) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, error: parseError.message });
        }
        const coverImageIndexInput = parsedBody.coverImageIndex;
        delete parsedBody.coverImageIndex;
        if (parsedBody.coverMediaId && !coverMediaBelongsToProduct({
            images: imageUrls,
            videos: videoUrls,
            coverMediaId: parsedBody.coverMediaId
        })) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, error: 'Cover media must belong to this product.' });
        }

        // ── 3. Merge media into payload ───────────────────────────────────────
        const payload = {
            ...parsedBody,
            ...(imageUrls.length > 0 && { images: imageUrls }),
            ...(videoUrls.length > 0 && { videos: videoUrls }),
            coverMediaId: resolveCoverMediaId({
                images: imageUrls,
                videos: videoUrls,
                requestedCover: parsedBody.coverMediaId,
                coverImageIndex: coverImageIndexInput
            })
        };
        await assertProductImageLimit(req, imageUrls.length);
        resolveVariantImageReferences(payload, imageUrls);

        // ── 4. Validate ───────────────────────────────────────────────────────
        const { error, value } = createProductSchema.validate(payload, { abortEarly: true });
        if (error) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, error: error.details[0].message });
        }
        normalizeProductPublicationFields(value);
        const schedulePlanError = await assertScheduledPublishingPlan(req, value);
        if (schedulePlanError) {
            await session.abortTransaction();
            return res.status(403).json(schedulePlanError);
        }
        if (!(await ensureProductSchedulePermission(req, value))) {
            await session.abortTransaction();
            return res.status(403).json({ success: false, error: 'Missing staff permission: productsSchedule' });
        }

        // ── 5. Expand matrix → flat variants ──────────────────────────────────
        if (value.variantMatrix) {
            value.variants = expandMatrix(value.variantMatrix);
            value.options = value.options || normalizeProductOptions(value.variantMatrix.attributes);
            delete value.variantMatrix;
        } else if (value.variants) {
            value.variants = value.variants.map(normalizeIncomingVariant);
        } else {
            value.variants = [buildSimpleVariant({
                stock: value.simpleStock,
                pricing: value.pricing,
                lowStockThreshold: value.lowStockThreshold
            })];
        }
        await assertProductImageLimit(req, {
            images: value.images || imageUrls,
            coverMediaId: value.coverMediaId,
            variants: value.variants
        });

        value.slug = await getUniqueSlug({
            shopId: req.tenantId,
            requestedSlug: value.slug,
            title: value.title,
            session
        });

        delete value.simpleStock;

        // ── 6. Save ───────────────────────────────────────────────────────────
        const [product] = await Product.create([{
            ...value,
            shop_id: req.tenantId
        }], { session });

        const inventoryLogs = product.variants
            .filter(variant => Number(variant.stock || 0) !== 0)
            .map(variant => ({
                shop_id: req.tenantId,
                productId: product._id,
                variantId: variant._id,
                change: Number(variant.stock || 0),
                type: 'RESTOCK',
                referenceId: product._id,
                beforeStock: 0,
                afterStock: Number(variant.stock || 0),
                user: req.user._id,
                note: 'Initial product stock'
            }));

        if (inventoryLogs.length > 0) {
            await InventoryLog.insertMany(inventoryLogs, { session });
        }

        if (Array.isArray(value.collections) && value.collections.length > 0) {
            await Collection.updateMany(
                { _id: { $in: value.collections }, shop_id: req.tenantId },
                { $addToSet: { productIds: product._id } },
                { session }
            );
        }

        await session.commitTransaction();

        await enqueueScheduledProductPublication({
            product,
            shopId: req.tenantId
        });

        await logAudit({
            req,
            shop_id: req.tenantId,
            action: 'product.created',
            entityType: 'Product',
            entityId: product._id,
            entityLabel: product.title,
            after: {
                title: product.title,
                status: product.status,
                category: product.category,
                price: product.pricing?.sellingPrice
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data:    product
        });

    } catch (err) {
        await session.abortTransaction();
        if (err?.payload) return res.status(err.statusCode || 403).json(err.payload);
        console.error('Create product error:', err);
        const isDuplicateSlug = err.code === 11000 && err.keyPattern?.slug;

        return res.status(err.statusCode || (isDuplicateSlug ? 409 : 500)).json({
            success: false,
            error: isDuplicateSlug ? 'A product with this slug already exists. Try a different slug.' : (err.statusCode ? err.message : 'Failed to create product'),
            details: err.message
        });
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Update a product (safe partial update)
 * @route   PATCH /api/admin/products/:id
 * @access  Private (Admin)
 */
exports.updateProduct = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    let restoreQuotaReservation = null;

    try {
        const shopId = req.tenantId;
        const uploadedImageUrls = req.files?.images?.map(f => f.path).filter(Boolean) || [];
        const uploadedVideoUrls = req.files?.videos?.map(f => f.path).filter(Boolean) || [];
        let parsedBody;
        try {
            parsedBody = parseProductPayload(req.body);
        } catch (parseError) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, error: parseError.message });
        }

        const existingImagesInput = parsedBody.existingImages;
        const removedImagesInput = parsedBody.removedImages;
        const coverImageIndexInput = parsedBody.coverImageIndex;
        const hasImageUpdateIntent = existingImagesInput !== undefined || removedImagesInput !== undefined || uploadedImageUrls.length > 0;
        delete parsedBody.existingImages;
        delete parsedBody.removedImages;
        delete parsedBody.coverImageIndex;

        if (uploadedVideoUrls.length) parsedBody.videos = uploadedVideoUrls;

        // ── 1. Sanitize attributes in incoming flat variants ──────────────────
        if (parsedBody.variants) {
            parsedBody.variants = parsedBody.variants.map(v => ({
                ...v,
                attributes: (v.attributes || []).map(a => ({ name: a.name, value: a.value }))
            }));
        }

        // ── 2. Fetch product ──────────────────────────────────────────────────
        const product = await Product.findOne({
            _id:       req.params.id,
            shop_id:   shopId,
            isDeleted: false
        }).session(session);

        if (!product) throw new Error('Product not found');

        if (hasImageUpdateIntent) {
            const currentImages = Array.isArray(product.images) ? product.images.map(String).filter(Boolean) : [];
            const requestedExistingImages = Array.isArray(existingImagesInput)
                ? existingImagesInput.map(String).filter(Boolean)
                : currentImages;
            const removedImages = new Set(Array.isArray(removedImagesInput) ? removedImagesInput.map(String).filter(Boolean) : []);
            const keptExistingImages = requestedExistingImages
                .filter(imageUrl => currentImages.includes(imageUrl))
                .filter(imageUrl => !removedImages.has(imageUrl));
            const finalImages = [...new Set([...keptExistingImages, ...uploadedImageUrls])];
            await assertProductImageLimit(req, finalImages.length);

            parsedBody.images = finalImages;
            if (parsedBody.coverMediaId && !coverMediaBelongsToProduct({
                images: finalImages,
                videos: parsedBody.videos || product.videos || [],
                coverMediaId: parsedBody.coverMediaId
            })) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, error: 'Cover media must belong to this product.' });
            }
            parsedBody.coverMediaId = resolveCoverMediaId({
                images: finalImages,
                videos: parsedBody.videos || product.videos || [],
                requestedCover: parsedBody.coverMediaId || product.coverMediaId,
                coverImageIndex: coverImageIndexInput
            });
            resolveVariantImageReferences(parsedBody, finalImages);
        } else if (parsedBody.variants) {
            resolveVariantImageReferences(parsedBody, product.images || []);
        }

        if (!hasImageUpdateIntent && parsedBody.coverMediaId !== undefined) {
            if (!coverMediaBelongsToProduct({
                images: product.images || [],
                videos: parsedBody.videos || product.videos || [],
                coverMediaId: parsedBody.coverMediaId
            })) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, error: 'Cover media must belong to this product.' });
            }
            parsedBody.coverMediaId = resolveCoverMediaId({
                images: product.images || [],
                videos: parsedBody.videos || product.videos || [],
                requestedCover: parsedBody.coverMediaId,
                coverImageIndex: coverImageIndexInput
            });
        }

        // ── 3. Validate ───────────────────────────────────────────────────────
        const { error, value } = updateProductSchema.validate(parsedBody, { abortEarly: true });
        if (error) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, error: error.details[0].message });
        }
        normalizeProductPublicationFields(value);
        const schedulePlanError = await assertScheduledPublishingPlan(req, value);
        if (schedulePlanError) {
            await session.abortTransaction();
            return res.status(403).json(schedulePlanError);
        }
        if (!(await ensureProductSchedulePermission(req, value))) {
            await session.abortTransaction();
            return res.status(403).json({ success: false, error: 'Missing staff permission: productsSchedule' });
        }
        await assertProductImageLimit(req, {
            images: value.images || product.images || [],
            coverMediaId: value.coverMediaId ?? product.coverMediaId,
            variants: value.variants || product.variants || []
        });
        if (
            product.status === 'Archived' &&
            value.status !== undefined &&
            value.status !== 'Archived'
        ) {
            const context = await getPlanContext(req);
            const limit = context.limits.productCount;
            if (limit !== null) {
                try {
                    restoreQuotaReservation = await reserveQuota({
                        shopId,
                        resource: 'products',
                        requested: 1,
                        limit,
                        getCommittedUsage: () => Product.countDocuments({
                            shop_id: shopId,
                            isDeleted: { $ne: true },
                            status: { $ne: 'Archived' }
                        })
                    });
                } catch (quotaError) {
                    if (quotaError.code !== 'PLAN_LIMIT_REACHED') throw quotaError;
                    await session.abortTransaction();
                    return res.status(403).json(await buildLimitError(
                        context,
                        'productCount',
                        quotaError.usage,
                        limit
                    ));
                }
            }
        }

        const beforeAudit = {
            title: product.title,
            status: product.status,
            category: product.category,
            price: product.pricing?.sellingPrice,
            totalStock: product.variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0)
        };

        // ── 4. Snapshot current stock for inventory logging ───────────────────
        const { oldStockById, oldVariantByKey } = snapshotVariantStock(product);

        // ── 5. Update scalar fields ───────────────────────────────────────────
        const SCALAR = [
            'title',
            'slug',
            'description',
            'category',
            'tags',
            'collections',
            'imageAltText',
            'status',
            'publicationStatus',
            'publishAt',
            'publishedAt',
            'seo',
            'lowStockThreshold',
            'images',
            'coverMediaId',
            'videos',
            'options',
            'features',
            'specifications',
            'comments'
        ];
        for (const field of SCALAR) {
            if (value[field] !== undefined) product[field] = value[field];
        }
        if (
            product.planArchive?.active &&
            value.status !== undefined &&
            value.status !== 'Archived'
        ) {
            product.planArchive.active = false;
            product.planArchive.planKey = '';
            product.planArchive.archivedAt = null;
            product.planArchive.previousStatus = '';
            product.planArchive.previousIsActive = true;
            product.planArchive.reconciliationId = '';
        }
        if (value.publicationStatus !== undefined || value.publishAt !== undefined) {
            product.schedulePlanBlockedAt = null;
            product.schedulePlanBlockedReason = '';
            if (value.publicationStatus === 'scheduled') {
                product.planPausedPublication = {
                    active: false,
                    publishAt: null,
                    pausedAt: null,
                    planKey: ''
                };
            }
        }

        if (value.pricing) {
            product.pricing = { ...product.pricing.toObject(), ...value.pricing };
        }

        applyVariantOperations({ product, value, oldVariantByKey });

        // ── 7. Save ───────────────────────────────────────────────────────────
        await product.save({ session });

        // ── 8. Batch inventory logs (single insertMany, not N awaits) ─────────
        const logsToInsert = buildStockAdjustmentLogs({
            product,
            oldStockById,
            shopId,
            userId: req.user._id
        });

        if (logsToInsert.length > 0) {
            await InventoryLog.insertMany(logsToInsert, { session });
        }

        await session.commitTransaction();

        await enqueueLowStockAlertsForLogs(logsToInsert);

        await enqueueScheduledProductPublication({
            product,
            shopId
        });

        await logAudit({
            req,
            shop_id: shopId,
            action: 'product.updated',
            entityType: 'Product',
            entityId: product._id,
            entityLabel: product.title,
            before: beforeAudit,
            after: {
                title: product.title,
                status: product.status,
                category: product.category,
                price: product.pricing?.sellingPrice,
                totalStock: product.variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0)
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            data:    product
        });

    } catch (err) {
        await session.abortTransaction();
        if (err?.payload) return res.status(err.statusCode || 403).json(err.payload);
        console.error('Update product error:', err);
        return res.status(400).json({ success: false, error: err.message });
    } finally {
        releaseQuotaSafely(restoreQuotaReservation);
        session.endSession();
    }
};

/**
 * @desc    Soft delete a product
 * @route   DELETE /api/admin/products/:id
 * @access  Private (Admin)
 */
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findOneAndUpdate(
            {
                _id: req.params.id,
                shop_id: req.tenantId,
                isDeleted: false      // ✅ Prevents double-delete returning false success
            },
            { isDeleted: true },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ success: false, error: "Product not found or already deleted" });
        }

        await logAudit({
            req,
            shop_id: req.tenantId,
            action: 'product.deleted',
            entityType: 'Product',
            entityId: product._id,
            entityLabel: product.title,
            severity: 'warning',
            before: {
                title: product.title,
                status: product.status,
                category: product.category
            }
        });

        const context = await getPlanContext(req);
        await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.USAGE_CHANGED, {
            req,
            shopId: req.tenantId,
            subscriptionId: context.subscription?._id,
            planKey: context.planKey,
            affectedResources: ['products'],
            metadata: { action: 'product_deleted', resource: 'products' }
        });

        res.status(200).json({ success: true, message: "Product deleted successfully" });

    } catch (err) {
        console.error("Delete product error:", err);
        res.status(500).json({ success: false, error: "Failed to delete product" });
    }
};

exports.exportProductsCsv = async (req, res) => {
    try {
        const products = await Product.find({
            shop_id: req.tenantId,
            isDeleted: false
        }).sort({ createdAt: -1 });

        const headers = [
            'id',
            'title',
            'slug',
            'status',
            'category',
            'tags',
            'buyingPrice',
            'sellingPrice',
            'discount',
            'totalStock',
            'lowStockThreshold',
            'seoTitle',
            'seoDescription'
        ];

        const escapeCsv = (value) => {
            const raw = value === undefined || value === null ? '' : String(value);
            return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
        };

        const rows = products.map(product => [
            product._id,
            product.title,
            product.slug,
            product.status,
            product.category,
            (product.tags || []).join('|'),
            product.pricing?.buyingPrice,
            product.pricing?.sellingPrice,
            product.pricing?.discount,
            product.totalStock,
            product.lowStockThreshold,
            product.seo?.title,
            product.seo?.description
        ].map(escapeCsv).join(','));

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
        res.status(200).send([headers.join(','), ...rows].join('\n'));
    } catch (err) {
        console.error('Export products error:', err);
        res.status(500).json({ success: false, error: 'Failed to export products' });
    }
};

exports.bulkUpdateProducts = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { productIds, updates = {} } = req.body;
        const lowStockLogs = [];

        if (!Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ success: false, error: 'productIds are required' });
        }

        const products = await Product.find({
            _id: { $in: productIds },
            shop_id: req.tenantId,
            isDeleted: false
        }).session(session);

        const allowedStatus = ['Draft', 'Published', 'Archived'];

        for (const product of products) {
            if (updates.category !== undefined) product.category = updates.category;
            if (updates.tags !== undefined) product.tags = updates.tags;
            if (updates.status !== undefined && allowedStatus.includes(updates.status)) {
                product.status = updates.status;
            }
            if (updates.lowStockThreshold !== undefined) {
                product.lowStockThreshold = Number(updates.lowStockThreshold);
            }
            if (updates.seo) {
                product.seo = { ...(product.seo?.toObject?.() || product.seo || {}), ...updates.seo };
            }

            if (updates.pricing) {
                product.pricing = { ...product.pricing.toObject(), ...updates.pricing };
            }

            if (updates.stock !== undefined) {
                product.variants.forEach(variant => {
                    const beforeStock = Number(variant.stock || 0);
                    variant.stock = Number(updates.stock);
                    if (variant.inventory) variant.inventory.stock = variant.stock;
                    lowStockLogs.push({
                        shop_id: req.tenantId,
                        productId: product._id,
                        variantId: variant._id,
                        change: variant.stock - beforeStock,
                        type: 'MANUAL',
                        referenceId: product._id,
                        beforeStock,
                        afterStock: variant.stock,
                        user: req.user._id,
                        note: 'Bulk product stock update'
                    });
                });
            }

            await product.save({ session });
        }

        await session.commitTransaction();

        await enqueueLowStockAlertsForLogs(lowStockLogs);

        res.status(200).json({
            success: true,
            message: `${products.length} products updated`,
            count: products.length
        });
    } catch (err) {
        await session.abortTransaction();
        console.error('Bulk update products error:', err);
        res.status(400).json({ success: false, error: err.message || 'Bulk update failed' });
    } finally {
        session.endSession();
    }
};

exports.bulkImportProducts = async (req, res) => {
    try {
        const { products } = req.body;

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ success: false, error: 'products array is required' });
        }

        const docs = products.slice(0, 200).map(item => {
            const sellingPrice = Number(item.sellingPrice || item.pricing?.sellingPrice || 0);
            const buyingPrice = Number(item.buyingPrice || item.pricing?.buyingPrice || 0);
            const stock = Number(item.stock || item.totalStock || 0);

            return {
                shop_id: req.tenantId,
                title: item.title,
                slug: item.slug || slugify(item.title),
                description: item.description || 'Imported product. Please update the product description.',
                category: item.category || 'General',
                tags: Array.isArray(item.tags)
                    ? item.tags
                    : String(item.tags || '').split('|').map(tag => tag.trim()).filter(Boolean),
                status: item.status || 'Draft',
                images: item.image ? [item.image] : ['https://via.placeholder.com/400'],
                pricing: {
                    buyingPrice,
                    sellingPrice: Math.max(sellingPrice, buyingPrice),
                    discount: Number(item.discount || 0)
                },
                variants: [{
                    sku: item.sku || '',
                    attributes: [{ name: 'default', value: 'default' }],
                    stock,
                    isActive: true
                }],
                seo: {
                    title: item.seoTitle || '',
                    description: item.seoDescription || ''
                },
                lowStockThreshold: Number(item.lowStockThreshold || 5)
            };
        });

        const created = await Product.insertMany(docs, { ordered: false });

        res.status(201).json({
            success: true,
            message: `${created.length} products imported`,
            count: created.length
        });
    } catch (err) {
        console.error('Bulk import products error:', err);
        res.status(400).json({
            success: false,
            error: err.message || 'Bulk import failed'
        });
    }
};
