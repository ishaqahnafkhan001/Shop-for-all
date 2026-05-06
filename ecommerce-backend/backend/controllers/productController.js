const Product = require('../models/Product');
const { createProductSchema, updateProductSchema } = require('../validations/productValidation');
const InventoryLog = require('../models/InventoryLog');
const mongoose = require('mongoose');
const {
    expandMatrix,
    makeVariantKey,
    generateNewOptionCombos
} = require('../helpers/variantMatrix');



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
        const { search, category } = req.query;

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;

        // Product query (filtered)
        const query = {
            shop_id: shopId,
            isDeleted: false
        };

        if (category) query.category = category;
        if (search) query.$text = { $search: search };

        const skip = (page - 1) * limit;

        // ✨ THE FIX: Add Product.distinct to fetch all categories for this shop
        const [products, total, uniqueCategories] = await Promise.all([
            Product.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Product.countDocuments(query),
            // Notice we don't use 'query' here, because we want ALL categories
            // for the shop, not just the ones matching the current search filter
            Product.distinct('category', { shop_id: shopId, isDeleted: false })
        ]);

        res.status(200).json({
            success: true,
            data: products,
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
    try {
        // ── 1. Extract Cloudinary media URLs ─────────────────────────────────
        let imageUrls = [];
        let videoUrls = [];

        if (req.files?.images) imageUrls = req.files.images.map(f => f.path);
        if (req.files?.videos) videoUrls = req.files.videos.map(f => f.path);

        // ── 2. Parse JSON fields from FormData ────────────────────────────────
        //    When sent as multipart/form-data, JSON objects arrive as strings.
        const parsedBody   = { ...req.body };
        const JSON_FIELDS  = ['pricing', 'variants', 'variantMatrix', 'features', 'specifications', 'comments'];

        for (const field of JSON_FIELDS) {
            if (typeof parsedBody[field] === 'string') {
                try {
                    parsedBody[field] = JSON.parse(parsedBody[field]);
                } catch {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid JSON in field: "${field}"`
                    });
                }
            }
        }

        // ── 3. Merge media into payload ───────────────────────────────────────
        const payload = { ...parsedBody, images: imageUrls, videos: videoUrls };

        // ── 4. Validate ───────────────────────────────────────────────────────
        const { error, value } = createProductSchema.validate(payload, { abortEarly: true });
        if (error) {
            return res.status(400).json({ success: false, error: error.details[0].message });
        }

        // ── 5. Expand matrix → flat variants ──────────────────────────────────
        if (value.variantMatrix) {
            value.variants = expandMatrix(value.variantMatrix);
            delete value.variantMatrix;
        }

        // ── 6. Save ───────────────────────────────────────────────────────────
        const product = await Product.create({
            ...value,
            shop_id: req.tenantId
        });

        return res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data:    product
        });

    } catch (err) {
        console.error('Create product error:', err);
        return res.status(500).json({
            success: false,
            error:   'Failed to create product',
            details: err.message
        });
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

        // ── 1. Sanitize attributes in incoming flat variants ──────────────────
        if (req.body.variants) {
            req.body.variants = req.body.variants.map(v => ({
                ...v,
                attributes: (v.attributes || []).map(a => ({ name: a.name, value: a.value }))
            }));
        }

        // ── 2. Validate ───────────────────────────────────────────────────────
        const { error, value } = updateProductSchema.validate(req.body, { abortEarly: true });
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
        const oldStockByKey = new Map(); // stableKey  → stock  (for matrix matching)

        for (const v of product.variants) {
            oldStockById.set(v._id.toString(), v.stock);
            oldStockByKey.set(makeVariantKey(v.attributes), v.stock);
        }

        // ── 5. Update scalar fields ───────────────────────────────────────────
        const SCALAR = ['title', 'description', 'category', 'images', 'videos', 'features', 'specifications', 'comments'];
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
            product.variants = expandMatrix(value.variantMatrix, oldStockByKey);

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
                    existing.stock         = incoming.stock;
                    existing.attributes    = incoming.attributes;
                    existing.priceOverride = incoming.priceOverride;
                    existing.image         = incoming.image;
                    existing.isActive      = incoming.isActive ?? true;
                    if (incoming.sku !== undefined) existing.sku = incoming.sku;
                } else {
                    product.variants.push(incoming);
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