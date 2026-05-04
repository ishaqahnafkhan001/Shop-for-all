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

        // ✅ Convert early so both skip() and limit() get Numbers
        const page  = Math.max(Number(req.query.page)  || 1, 1);
        const limit = Math.min(Number(req.query.limit) || 10, 100); // cap at 100

        const query = {
            shop_id: shopId,
            isDeleted: false
        };

        if (category) query.category = category;
        if (search)   query.$text = { $search: search };

        const [products, total] = await Promise.all([
            Product.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)  // ✅ Both are Numbers now
                .limit(limit),
            Product.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: products,
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
        const { error, value } = createProductSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ success: false, error: error.details[0].message });
        }

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