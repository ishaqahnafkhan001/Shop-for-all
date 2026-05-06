const Product = require('../models/Product');
const { createProductSchema, updateProductSchema } = require('../validations/productValidation');
const InventoryLog = require('../models/InventoryLog');
const mongoose = require('mongoose');


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
        // 1️⃣ Extract Cloudinary Media URLs from req.files
        let imageUrls = [];
        let videoUrls = [];

        if (req.files) {
            if (req.files.images) {
                imageUrls = req.files.images.map(file => file.path);
            }
            if (req.files.videos) {
                videoUrls = req.files.videos.map(file => file.path);
            }
        }

        // 2️⃣ Parse FormData strings back into JSON objects/arrays
        const parsedBody = { ...req.body };
        const jsonFields = ['pricing', 'variants', 'features', 'specifications', 'comments'];

        for (const field of jsonFields) {
            if (typeof parsedBody[field] === 'string') {
                try {
                    parsedBody[field] = JSON.parse(parsedBody[field]);
                } catch (e) {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid JSON format provided for field: ${field}`
                    });
                }
            }
        }

        // 3️⃣ Combine parsed text fields with media URLs for validation
        const payloadToValidate = {
            ...parsedBody,
            images: imageUrls,
            videos: videoUrls
        };

        // 4️⃣ Run Joi Validation
        const { error, value } = createProductSchema.validate(payloadToValidate);
        if (error) {
            return res.status(400).json({ success: false, error: error.details[0].message });
        }

        // 5️⃣ Save to MongoDB
        const product = await Product.create({
            ...value,
            shop_id: req.tenantId  // ✅ Consistent with rest of codebase
        });

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            data: product
        });

    } catch (err) {
        console.error("Create product error:", err);
        res.status(500).json({ success: false, error: "Failed to create product", details: err.message });
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

        // ✅ Sanitize attributes — guard against missing attributes array
        if (req.body.variants) {
            req.body.variants = req.body.variants.map(v => ({
                ...v,
                attributes: (v.attributes || []).map(a => ({
                    name: a.name,
                    value: a.value
                }))
            }));
        }

        const { error, value } = updateProductSchema.validate(req.body);
        if (error) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, error: error.details[0].message });
        }

        const product = await Product.findOne({
            _id: req.params.id,
            shop_id: shopId,
            isDeleted: false
        }).session(session);

        if (!product) throw new Error("Product not found");

        // ✅ Snapshot old stock before any changes
        const oldVariantsMap = new Map();
        product.variants.forEach(v => {
            oldVariantsMap.set(v._id.toString(), v.stock);
        });

        // ✅ Update scalar fields
        if (value.title       !== undefined) product.title       = value.title;
        if (value.description !== undefined) product.description = value.description;
        if (value.category    !== undefined) product.category    = value.category;
        if (value.images      !== undefined) product.images      = value.images;

        if (value.pricing) {
            product.pricing = { ...product.pricing.toObject(), ...value.pricing };
        }

        if (value.features !== undefined) {
            product.features = value.features;
        }

        if (value.specifications !== undefined) {
            product.specifications = value.specifications;
        }

        if (value.comments !== undefined) {
            product.comments = value.comments;
        }

        // ✅ Smart variant update: patch existing, append new — never silently drop
        if (value.variants) {
            const updatedVariants = [];

            for (const incoming of value.variants) {
                if (incoming._id) {
                    const existing = product.variants.id(incoming._id);

                    if (!existing) {
                        throw new Error(`Variant not found: ${incoming._id}. Send without _id to create a new one.`);
                    }

                    existing.stock         = incoming.stock;
                    existing.attributes    = incoming.attributes;
                    existing.priceOverride = incoming.priceOverride;
                    existing.image         = incoming.image;
                    existing.isActive      = incoming.isActive ?? true;

                    updatedVariants.push(existing);
                } else {
                    // New variant — no _id
                    updatedVariants.push(incoming);
                }
            }

            product.variants = updatedVariants;
        }

        await product.save({ session });

        // ✅ Batch inventory logs — single insertMany instead of N awaits in a loop
        const logsToInsert = [];

        for (const v of product.variants) {
            const oldStock = oldVariantsMap.get(v._id.toString()) ?? 0;
            const diff = v.stock - oldStock;

            if (diff !== 0) {
                logsToInsert.push({
                    shop_id: shopId,
                    productId: product._id,
                    variantId: v._id,
                    change: diff,
                    type: 'MANUAL',
                    referenceId: product._id,
                    beforeStock: oldStock,
                    afterStock: v.stock,
                    user: req.user._id,
                    note: 'Product update — manual stock change'
                });
            }
        }

        if (logsToInsert.length > 0) {
            await InventoryLog.insertMany(logsToInsert, { session });
        }

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: "Product updated successfully",
            data: product
        });

    } catch (err) {
        await session.abortTransaction();
        console.error("Update product error:", err);
        res.status(400).json({ success: false, error: err.message });
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