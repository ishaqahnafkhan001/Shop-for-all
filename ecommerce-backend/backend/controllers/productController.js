const Product = require('../models/Product');
const Collection = require('../models/Collection');
const { createProductSchema, updateProductSchema } = require('../validations/productValidation');
const InventoryLog = require('../models/InventoryLog');
const mongoose = require('mongoose');
const { logAudit } = require('../services/auditLogService');
const { buildPagination } = require('../utils/pagination');
const {
    parseProductPayload,
    resolveVariantImageReferences
} = require('../services/products/productMediaService');
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

const { GoogleGenerativeAI } = require("@google/generative-ai");


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
        const { sort } = req.query;

        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 200);
        const isStorefrontRequest = !req.user || req.user.role === 'Customer';
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
            pagination: buildPagination({ total, page, limit })
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
