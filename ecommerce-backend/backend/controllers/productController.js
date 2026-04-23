const Product = require('../models/Product');
const { createProductSchema } = require('../validations/productValidation');

/**
 * @desc    Get all products for the logged-in vendor
 * @route   GET /api/admin/products
 */
exports.getShopProducts = async (req, res) => {
    try {
        // We use req.user.shopId which was attached by the 'protect' middleware
        const products = await Product.find({ shop_id: req.user.shopId })
            .sort({ createdAt: -1 });

        res.status(200).json(products);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch products" });
    }
};

/**
 * @desc    Create a new product
 * @route   POST /api/admin/products
 */
exports.createProduct = async (req, res) => {
    try {
        const { error, value } = createProductSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const newProduct = await Product.create({
            ...value,
            shop_id: req.user.shopId
        });

        res.status(201).json({
            message: "Product added successfully!",
            product: newProduct
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to add product" });
    }
};

/**
 * @desc    Update a product
 * @route   PATCH /api/admin/products/:id
 */
exports.updateProduct = async (req, res) => {
    try {
        // We don't validate the whole schema because it's a PATCH (partial update)
        // But we ensure the user can only update products belonging to THEIR shop
        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, shop_id: req.user.shopId },
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({ error: "Product not found or unauthorized" });
        }

        res.status(200).json({
            message: "Product updated successfully",
            product
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update product" });
    }
};

/**
 * @desc    Delete a product
 * @route   DELETE /api/admin/products/:id
 */
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findOneAndDelete({
            _id: req.params.id,
            shop_id: req.user.shopId
        });

        if (!product) {
            return res.status(404).json({ error: "Product not found or unauthorized" });
        }

        res.status(200).json({ message: "Product deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete product" });
    }
};