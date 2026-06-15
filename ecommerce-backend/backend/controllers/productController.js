const Product = require('../models/Product');
const Collection = require('../models/Collection');
const { createProductSchema, updateProductSchema } = require('../validations/productValidation');
const InventoryLog = require('../models/InventoryLog');
const mongoose = require('mongoose');
const {
    expandMatrix,
    makeVariantKey,
    generateNewOptionCombos,
    normalizeProductOptions
} = require('../helpers/variantMatrix');

const slugify = (value = '') =>
    value
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);

const getUniqueSlug = async ({ shopId, requestedSlug, title, session }) => {
    const baseSlug = (slugify(requestedSlug || title) || `product-${Date.now()}`).slice(0, 80);
    let candidate = baseSlug;
    let suffix = 2;

    while (await Product.findOne({
        shop_id: shopId,
        slug: candidate,
        isDeleted: false
    }).select('_id').session(session || null)) {
        const suffixText = `-${suffix}`;
        candidate = `${baseSlug.slice(0, 80 - suffixText.length)}${suffixText}`;
        suffix += 1;
    }

    return candidate;
};

const productCategoryCache = new Map();
const CATEGORY_CACHE_TTL = 5 * 60 * 1000;

const getCachedCategories = async (shopId, categoryQuery) => {
    const key = `${shopId}:${JSON.stringify(categoryQuery)}`;
    const cached = productCategoryCache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }

    const value = await Product.distinct('category', categoryQuery);
    productCategoryCache.set(key, {
        value,
        expiresAt: Date.now() + CATEGORY_CACHE_TTL
    });

    return value;
};

const addComputedProductFields = (product) => {
    const sellingPrice = Number(product.pricing?.sellingPrice) || 0;
    const discount = Number(product.pricing?.discount) || 0;

    return {
        ...product,
        finalPrice: discount > 0
            ? Math.round(sellingPrice - ((sellingPrice * discount) / 100))
            : sellingPrice
    };
};

const parseProductPayload = (body) => {
    const parsedBody = { ...body };
    const jsonFields = [
        'pricing',
        'variants',
        'variantMatrix',
        'options',
        'features',
        'specifications',
        'comments',
        'collections',
        'seo',
        'addAttributeOption',
        'removeVariants'
    ];

    for (const field of jsonFields) {
        if (typeof parsedBody[field] === 'string') {
            try {
                parsedBody[field] = JSON.parse(parsedBody[field]);
            } catch {
                throw new Error(`Invalid JSON in field: "${field}"`);
            }
        }
    }

    if (typeof parsedBody.tags === 'string') {
        if (parsedBody.tags.trim().startsWith('[')) {
            parsedBody.tags = JSON.parse(parsedBody.tags);
        } else {
            parsedBody.tags = parsedBody.tags.split(',').map(tag => tag.trim()).filter(Boolean);
        }
    }

    return parsedBody;
};

const { GoogleGenerativeAI } = require("@google/generative-ai");

const normalizeIncomingVariant = (variant) => {
    const stock = Number(variant.inventory?.stock ?? variant.stock ?? 0);
    const status = variant.status || (variant.isActive === false ? 'draft' : 'active');

    return {
        ...variant,
        stock,
        inventory: {
            trackQuantity: true,
            allowOversell: false,
            reservedStock: 0,
            lowStockThreshold: 5,
            ...(variant.inventory || {}),
            stock
        },
        pricing: {
            ...(variant.priceOverride !== undefined ? { price: variant.priceOverride } : {}),
            ...(variant.pricing || {})
        },
        status,
        isActive: status === 'active' && variant.isActive !== false
    };
};

const buildSimpleVariant = ({ stock = 0, pricing = {}, lowStockThreshold = 5 }) => ({
    sku: '',
    attributes: [],
    stock: Number(stock) || 0,
    pricing: {
        price: pricing.sellingPrice,
        costPrice: pricing.buyingPrice
    },
    inventory: {
        stock: Number(stock) || 0,
        reservedStock: 0,
        lowStockThreshold: Number(lowStockThreshold) || 5,
        trackQuantity: true,
        allowOversell: false
    },
    status: 'active',
    tax: { taxable: true },
    isActive: true
});

const resolveImageReference = (value, imageUrls = []) => {
    const raw = String(value || '').trim();
    if (!raw.startsWith('product-image:')) return raw;

    const index = Number(raw.replace('product-image:', ''));
    return Number.isInteger(index) && imageUrls[index] ? imageUrls[index] : '';
};

const resolveVariantImageReferences = (payload, imageUrls = []) => {
    if (payload.variantMatrix?.overrides) {
        for (const override of Object.values(payload.variantMatrix.overrides)) {
            if (override?.image) override.image = resolveImageReference(override.image, imageUrls);
            if (override?.image === '') delete override.image;
        }
    }

    if (Array.isArray(payload.variants)) {
        payload.variants = payload.variants.map(variant => ({
            ...variant,
            image: variant.image ? resolveImageReference(variant.image, imageUrls) : variant.image
        }));
    }

    return payload;
};


// ... [KEEP ALL YOUR EXISTING FUNCTIONS HERE: getShopProducts, getSingleProduct, createProduct, updateProduct, deleteProduct] ...


/**
 * @desc    Generate Product Description via AI (Gemini)
 * @route   POST /api/admin/products/generate-description
 * @access  Private (Admin)
 */
exports.generateDescription = async (req, res) => {
    try {
        const { title, category } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, error: "Product title is required." });
        }

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

        res.status(200).json({ success: true, description: description.trim() });

    } catch (err) {
        console.error("AI Generation Error:", err);
        res.status(500).json({ success: false, error: "Failed to generate description. Please try again." });
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
        const {
            search,
            category,
            collection,
            tag,
            status,
            minPrice,
            maxPrice,
            sort,
            lowStock
        } = req.query;

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const isStorefrontRequest = !req.user || req.user.role === 'Customer';

        // Product query (filtered)
        const query = {
            shop_id: shopObjectId,
            isDeleted: false
        };

        if (isStorefrontRequest) {
            query.isActive = true;
            query.status = 'Published';
        } else if (status && status !== 'All') {
            query.status = status;
        }

        if (category && category !== 'All') query.category = category;
        if (collection) query.collections = collection;
        if (tag) query.tags = tag.toLowerCase();
        if (search) query.$text = { $search: search };
        if (minPrice || maxPrice) {
            query['pricing.sellingPrice'] = {};
            if (minPrice) query['pricing.sellingPrice'].$gte = Number(minPrice);
            if (maxPrice) query['pricing.sellingPrice'].$lte = Number(maxPrice);
        }
        if (lowStock === 'true') {
            query.$expr = {
                $lt: [
                    { $sum: '$variants.stock' },
                    '$lowStockThreshold'
                ]
            };
        }

        let sortQuery = { createdAt: -1, _id: 1 };
        if (sort === 'priceAsc') sortQuery = { 'pricing.sellingPrice': 1, _id: 1 };
        if (sort === 'priceDesc') sortQuery = { 'pricing.sellingPrice': -1, _id: 1 };
        if (sort === 'nameAsc') sortQuery = { title: 1, _id: 1 };
        if (sort === 'nameDesc') sortQuery = { title: -1, _id: 1 };
        if (sort === 'oldest') sortQuery = { createdAt: 1, _id: 1 };

        const skip = (page - 1) * limit;
        const categoryQuery = {
            shop_id: shopObjectId,
            isDeleted: false,
            ...(isStorefrontRequest ? { isActive: true, status: 'Published' } : {})
        };

        // ✨ THE FIX: Add Product.distinct to fetch all categories for this shop
        const summaryProjection = {
            title: 1,
            slug: 1,
            category: 1,
            tags: 1,
            collections: 1,
            images: { $slice: ['$images', 1] },
            status: 1,
            isActive: 1,
            pricing: 1,
            averageRating: 1,
            numReviews: 1,
            lowStockThreshold: 1,
            createdAt: 1,
            totalStock: { $sum: '$variants.stock' },
            variantCount: { $size: { $ifNull: ['$variants', []] } }
        };

        const [products, total, uniqueCategories] = await Promise.all([
            Product.aggregate([
                { $match: query },
                { $sort: sortQuery },
                { $skip: skip },
                { $limit: limit },
                { $project: summaryProjection }
            ]),
            Product.countDocuments(query),
            getCachedCategories(shopId, categoryQuery)
        ]);

        res.status(200).json({
            success: true,
            data: products.map(addComputedProductFields),
            categories: uniqueCategories, // ✨ Send the categories back to the frontend
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
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

        // ── 3. Merge media into payload ───────────────────────────────────────
        const payload = {
            ...parsedBody,
            ...(imageUrls.length > 0 && { images: imageUrls }),
            ...(videoUrls.length > 0 && { videos: videoUrls })
        };
        resolveVariantImageReferences(payload, imageUrls);

        // ── 4. Validate ───────────────────────────────────────────────────────
        const { error, value } = createProductSchema.validate(payload, { abortEarly: true });
        if (error) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, error: error.details[0].message });
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

        return res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data:    product
        });

    } catch (err) {
        await session.abortTransaction();
        console.error('Create product error:', err);
        const isDuplicateSlug = err.code === 11000 && err.keyPattern?.slug;

        return res.status(isDuplicateSlug ? 409 : 500).json({
            success: false,
            error: isDuplicateSlug ? 'A product with this slug already exists. Try a different slug.' : 'Failed to create product',
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

    try {
        const shopId = req.tenantId;
        let parsedBody;
        try {
            parsedBody = parseProductPayload(req.body);
        } catch (parseError) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, error: parseError.message });
        }

        if (req.files?.images?.length) parsedBody.images = req.files.images.map(f => f.path);
        if (req.files?.videos?.length) parsedBody.videos = req.files.videos.map(f => f.path);

        // ── 1. Sanitize attributes in incoming flat variants ──────────────────
        if (parsedBody.variants) {
            parsedBody.variants = parsedBody.variants.map(v => ({
                ...v,
                attributes: (v.attributes || []).map(a => ({ name: a.name, value: a.value }))
            }));
        }

        // ── 2. Validate ───────────────────────────────────────────────────────
        const { error, value } = updateProductSchema.validate(parsedBody, { abortEarly: true });
        if (error) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, error: error.details[0].message });
        }

        // ── 3. Fetch product ──────────────────────────────────────────────────
        const product = await Product.findOne({
            _id:       req.params.id,
            shop_id:   shopId,
            isDeleted: false
        }).session(session);

        if (!product) throw new Error('Product not found');

        // ── 4. Snapshot current stock for inventory logging ───────────────────
        const oldStockById  = new Map(); // variantId  → stock
        const oldVariantByKey = new Map(); // stableKey → variant snapshot (for matrix matching)

        for (const v of product.variants) {
            oldStockById.set(v._id.toString(), v.stock);
            oldVariantByKey.set(makeVariantKey(v.attributes), v.toObject ? v.toObject() : v);
        }

        // ── 5. Update scalar fields ───────────────────────────────────────────
        const SCALAR = [
            'title',
            'slug',
            'description',
            'category',
            'tags',
            'collections',
            'status',
            'seo',
            'lowStockThreshold',
            'images',
            'videos',
            'options',
            'features',
            'specifications',
            'comments'
        ];
        for (const field of SCALAR) {
            if (value[field] !== undefined) product[field] = value[field];
        }

        if (value.pricing) {
            product.pricing = { ...product.pricing.toObject(), ...value.pricing };
        }

        // ── 6. Variant operations ─────────────────────────────────────────────
        //   Priority order: variantMatrix > addAttributeOption > removeVariants > variants
        //   In practice callers should only send one; the priority just prevents
        //   ambiguous or conflicting operations from silently combining.

        if (value.variantMatrix) {
            // ── Op B: matrix regeneration ─────────────────────────────────────
            // Existing stock is preserved wherever attribute combos match.
            product.options = value.options || normalizeProductOptions(value.variantMatrix.attributes);
            product.variants = expandMatrix(value.variantMatrix, oldVariantByKey);

        } else if (value.addAttributeOption) {
            // ── Op C: add one new option to an existing dimension ─────────────
            const { name, option, defaultStock, defaultPrice } = value.addAttributeOption;

            const { newVariants, error: opError } = generateNewOptionCombos(
                product.variants,
                name,
                option,
                defaultStock,
                defaultPrice
            );

            if (opError) throw new Error(opError);

            // Append — existing variants untouched
            product.variants.push(...newVariants);

        } else if (value.removeVariants) {
            // ── Op D: remove by _id ───────────────────────────────────────────
            const removeSet = new Set(value.removeVariants);
            const remaining = product.variants.filter(v => !removeSet.has(v._id.toString()));

            if (remaining.length === 0) {
                throw new Error('Cannot remove all variants. A product must have at least one variant.');
            }

            // Verify all requested IDs actually existed
            const foundIds = new Set(product.variants.map(v => v._id.toString()));
            for (const id of removeSet) {
                if (!foundIds.has(id)) throw new Error(`Variant not found: ${id}`);
            }

            product.variants = remaining;

        } else if (value.variants) {
            // ── Op A: flat patch ──────────────────────────────────────────────
            for (const incoming of value.variants) {
                if (incoming._id) {
                    const existing = product.variants.id(incoming._id);
                    if (!existing) {
                        throw new Error(
                            `Variant not found: ${incoming._id}. Omit _id to create a new variant.`
                        );
                    }
                    const normalized = normalizeIncomingVariant(incoming);
                    existing.stock         = normalized.stock;
                    existing.attributes    = normalized.attributes;
                    existing.priceOverride = normalized.priceOverride ?? normalized.pricing?.price;
                    existing.pricing       = normalized.pricing;
                    existing.inventory     = normalized.inventory;
                    existing.image         = normalized.image;
                    existing.barcode       = normalized.barcode;
                    existing.weight        = normalized.weight;
                    existing.dimensions    = normalized.dimensions;
                    existing.tax           = normalized.tax;
                    existing.status        = normalized.status;
                    existing.isActive      = normalized.isActive;
                    if (incoming.sku !== undefined) existing.sku = incoming.sku;
                } else {
                    product.variants.push(normalizeIncomingVariant(incoming));
                }
            }
        }

        // ── 7. Save ───────────────────────────────────────────────────────────
        await product.save({ session });

        // ── 8. Batch inventory logs (single insertMany, not N awaits) ─────────
        const logsToInsert = [];

        for (const v of product.variants) {
            const oldStock = oldStockById.get(v._id.toString()) ?? 0;
            const diff     = v.stock - oldStock;

            if (diff !== 0) {
                logsToInsert.push({
                    shop_id:     shopId,
                    productId:   product._id,
                    variantId:   v._id,
                    change:      diff,
                    type:        'MANUAL',
                    referenceId: product._id,
                    beforeStock: oldStock,
                    afterStock:  v.stock,
                    user:        req.user._id,
                    note:        'Product update — manual stock change'
                });
            }
        }

        if (logsToInsert.length > 0) {
            await InventoryLog.insertMany(logsToInsert, { session });
        }

        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            data:    product
        });

    } catch (err) {
        await session.abortTransaction();
        console.error('Update product error:', err);
        return res.status(400).json({ success: false, error: err.message });
    } finally {
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
                    variant.stock = Number(updates.stock);
                });
            }

            await product.save({ session });
        }

        await session.commitTransaction();

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
