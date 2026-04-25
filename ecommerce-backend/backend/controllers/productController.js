const Product = require('../models/Product');
const { createProductSchema, updateProductSchema } = require('../validations/productValidation');

/**
 * @desc Get all products (with pagination + search)
 */
exports.getShopProducts = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, category } = req.query;

        const query = {
            shop_id: req.user.shopId,
            isDeleted: false
        };

        if (category) query.category = category;

        if (search) {
            query.$text = { $search: search };
        }

        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Product.countDocuments(query);

        res.status(200).json({
            data: products,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (err) {
        res.status(500).json({ error: "Failed to fetch products" });
    }
};

/**
 * @desc Create product
 */
exports.createProduct = async (req, res) => {
    try {
        const { error, value } = createProductSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const product = await Product.create({
            ...value,
            shop_id: req.user.shopId
        });

        res.status(201).json({
            message: "Product created successfully",
            product
        });

    } catch (err) {
        console.error(err); // keep this

        res.status(500).json({
            error: "Failed to create product",
            details: err.message   // 👈 ADD THIS
        });
    }}

/**
 * @desc Update product (SAFE PATCH)
 */
exports.updateProduct = async (req, res) => {
    try {
        const { error, value } = updateProductSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const product = await Product.findOneAndUpdate(
            {
                _id: req.params.id,
                shop_id: req.user.shopId,
                isDeleted: false
            },
            { $set: value },
            {
                new: true,
                runValidators: true
            }
        );

        if (!product) {
            return res.status(404).json({ error: "Product not found or unauthorized" });
        }

        res.status(200).json({
            message: "Product updated",
            product
        });

    } catch (err) {
        res.status(500).json({ error: "Failed to update product" });
    }
};

/**
 * @desc Soft delete product
 */
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findOneAndUpdate(
            {
                _id: req.params.id,
                shop_id: req.user.shopId
            },
            {
                isDeleted: true
            },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ error: "Product not found or unauthorized" });
        }

        res.status(200).json({
            message: "Product deleted (soft)"
        });

    } catch (err) {
        res.status(500).json({ error: "Failed to delete product" });
    }
};