const Shop = require('../models/Shop');
const Product = require('../models/Product');

/**
 * @desc    Get Shop Details (Name, logo, etc.)
 * @route   GET /api/storefront/:subdomain/info
 */
exports.getStoreInfo = async (req, res) => {
    try {
        // req.tenantId was attached by our resolveTenant middleware!
        const shop = await Shop.findById(req.tenantId).select('-__v');

        if (!shop) {
            return res.status(404).json({ error: "Shop details not found." });
        }

        res.status(200).json(shop);
    } catch (err) {
        res.status(500).json({ error: "Error fetching shop info." });
    }
};

/**
 * @desc    Get all products for a specific storefront
 * @route   GET /api/storefront/:subdomain/products
 */
exports.getStoreProducts = async (req, res) => {
    try {
        // We only fetch products belonging to THIS shop
        const products = await Product.find({ shop_id: req.tenantId })
            .sort({ createdAt: -1 }); // Show newest items first

        res.status(200).json({
            count: products.length,
            products
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching products." });
    }
};

/**
 * @desc    Get a single product detail (for the Product Page)
 * @route   GET /api/storefront/:subdomain/products/:id
 */
exports.getSingleProduct = async (req, res) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            shop_id: req.tenantId // Security: Ensure product belongs to this shop
        });

        if (!product) {
            return res.status(404).json({ error: "Product not found." });
        }

        res.status(200).json(product);
    } catch (err) {
        res.status(500).json({ error: "Error fetching product details." });
    }
};