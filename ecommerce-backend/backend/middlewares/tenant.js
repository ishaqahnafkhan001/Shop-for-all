const Shop = require('../models/Shop');
// const redis = require('../config/redis'); // Enable when ready for Redis

exports.resolveTenant = async (req, res, next) => {
    try {
        const subdomain = req.params.subdomain?.toLowerCase();

        if (!subdomain) {
            return res.status(400).json({ error: "Subdomain is required to fetch store data." });
        }

        // 🚀 1. REDIS CACHE (Uncomment to enable zero-latency lookups)
        // const cachedTenant = await redis.get(`tenant:${subdomain}`);
        // if (cachedTenant) {
        //     const parsedTenant = JSON.parse(cachedTenant);
        //     req.tenantId = parsedTenant._id;
        //     req.tenantName = parsedTenant.shopName;
        //     return next();
        // }

        // 🐌 2. DATABASE QUERY (Fast lean query)
        const shop = await Shop.findOne({
            subdomain: subdomain,
            isActive: true
        }).select('_id shopName').lean();

        if (!shop) {
            return res.status(404).json({ error: "Store not found or deactivated." });
        }

        // 📦 3. SAVE TO CACHE (Uncomment to cache for 1 hour)
        // await redis.setex(`tenant:${subdomain}`, 3600, JSON.stringify({
        //     _id: shop._id,
        //     shopName: shop.shopName
        // }));

        // 4. ATTACH TENANT CONTEXT
        req.tenantId = shop._id;
        req.tenantName = shop.shopName;

        next();
    } catch (err) {
        console.error("Tenant Resolution Error:", err);
        res.status(500).json({ error: "Server error resolving store data." });
    }
};