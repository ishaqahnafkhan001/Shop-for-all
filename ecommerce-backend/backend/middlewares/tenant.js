const Shop = require('../models/Shop');
const cache = require('../services/cacheService');
const tenantCache = new Map();
const TENANT_CACHE_TTL = 5 * 60 * 1000;

exports.resolveTenant = async (req, res, next) => {
    try {
        const subdomain = req.params.subdomain?.toLowerCase();

        if (!subdomain) {
            return res.status(400).json({ error: "Subdomain is required to fetch store data." });
        }

        const cacheKey = `tenant:${subdomain}`;
        const sharedCachedTenant = await cache.get(cacheKey);
        if (sharedCachedTenant) {
            req.tenantId = sharedCachedTenant._id;
            req.tenantName = sharedCachedTenant.shopName;
            return next();
        }

        const cachedTenant = tenantCache.get(subdomain);
        if (cachedTenant && cachedTenant.expiresAt > Date.now()) {
            req.tenantId = cachedTenant.shop._id;
            req.tenantName = cachedTenant.shop.shopName;
            return next();
        }

        // 🐌 2. DATABASE QUERY (Fast lean query)
        const shop = await Shop.findOne({
            subdomain: subdomain,
            isActive: true
        }).select('_id shopName').lean();

        if (!shop) {
            return res.status(404).json({ error: "Store not found or deactivated." });
        }

        await cache.set(cacheKey, shop, TENANT_CACHE_TTL / 1000);

        // 4. ATTACH TENANT CONTEXT
        tenantCache.set(subdomain, {
            shop,
            expiresAt: Date.now() + TENANT_CACHE_TTL
        });

        req.tenantId = shop._id;
        req.tenantName = shop.shopName;

        next();
    } catch (err) {
        console.error("Tenant Resolution Error:", err);
        res.status(500).json({ error: "Server error resolving store data." });
    }
};
