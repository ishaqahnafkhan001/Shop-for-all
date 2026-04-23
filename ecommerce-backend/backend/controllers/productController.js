// controllers/productController.js
const Product = require('../models/Product');
const { createProductSchema } = require('../validations/productValidation');

exports.createProduct = async (req, res) => {
    try {
        // 1. Run Joi Validation on what the user typed in the React form
        const { error, value } = createProductSchema.validate(req.body);

        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        // 2. THE SECURITY LOCK: Get the shopId from the JWT Token middleware
        // (Assuming your auth middleware attached the decoded token to req.user)
        const currentShopId = req.user.shopId;

        // 3. Save to MongoDB (The Vault)
        // We spread the validated Joi data (...value) and forcefully attach the secure shopId
        const newProduct = await Product.create({
            ...value,
            shop_id: currentShopId
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
