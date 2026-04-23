const Shop = require('../models/Shop');

exports.resolveTenant = async (req, res, next) => {
    try {
        // 1. Extract subdomain.
        // We expect Next.js to call: GET /api/storefront/shoes/products
        const subdomain = req.params.subdomain;

        if (!subdomain) {
            return res.status(400).json({ error: "Subdomain is required to fetch store data." });
        }

        // 2. Find the active shop in the database
        // We use .select('_id') to make the database query lightning fast
        const shop = await Shop.findOne({ subdomain: subdomain.toLowerCase(), isActive: true }).select('_id shopName');

        if (!shop) {
            return res.status(404).json({ error: "Store not found or deactivated." });
        }

        // 3. Attach the secure shop database ID to the request
        req.tenantId = shop._id;
        req.tenantName = shop.shopName;

        next();
    } catch (err) {
        console.error("Tenant Resolution Error:", err);
        res.status(500).json({ error: "Server error resolving store data." });
    }
};