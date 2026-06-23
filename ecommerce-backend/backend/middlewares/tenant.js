const Shop = require('../models/Shop');
const cache = require('../services/cacheService');
const { ensureShopVerificationStatus } = require('../services/vendorVerificationService');
const tenantCache = new Map();
const TENANT_CACHE_TTL = 5 * 60 * 1000;
const TENANT_AVAILABILITY_CHECK_TTL = 30 * 1000;

const unavailableResponse = (res) => res.status(423).json({
    success: false,
    code: 'STORE_UNAVAILABLE',
    error: 'This store is temporarily unavailable.'
});

const normalizeSubdomain = (subdomain = '') => String(subdomain || '').toLowerCase();

const isAvailabilityFresh = (shop = {}) => (
    shop.availabilityCheckedAt &&
    Date.now() - Number(shop.availabilityCheckedAt) < TENANT_AVAILABILITY_CHECK_TTL &&
    shop.isActive !== false &&
    shop.approvalStatus !== 'Suspended'
);

const buildCachedTenant = (shop) => ({
    _id: shop._id,
    shopName: shop.shopName,
    isActive: shop.isActive,
    approvalStatus: shop.approvalStatus,
    suspensionReason: shop.suspensionReason,
    availabilityCheckedAt: Date.now()
});

const attachActiveTenant = async ({ req, res, shop, subdomain, cacheKey }) => {
    const checked = isAvailabilityFresh(shop)
        ? { shop }
        : await ensureShopVerificationStatus(shop);
    const currentShop = checked.shop || shop;

    if (!currentShop || currentShop.isActive === false || currentShop.approvalStatus === 'Suspended') {
        await cache.del(cacheKey);
        tenantCache.delete(subdomain);
        return unavailableResponse(res);
    }

    const tenant = buildCachedTenant(currentShop);

    await cache.set(cacheKey, tenant, TENANT_CACHE_TTL / 1000);
    tenantCache.set(subdomain, {
        shop: tenant,
        expiresAt: Date.now() + TENANT_CACHE_TTL
    });

    req.tenantId = tenant._id;
    req.tenantName = tenant.shopName;
    return null;
};

exports.resolveTenant = async (req, res, next) => {
    try {
        const subdomain = normalizeSubdomain(req.params.subdomain);

        if (!subdomain) {
            return res.status(400).json({ error: "Subdomain is required to fetch store data." });
        }

        const cacheKey = `tenant:${subdomain}`;
        const sharedCachedTenant = await cache.get(cacheKey);
        if (sharedCachedTenant) {
            const blocked = await attachActiveTenant({ req, res, shop: sharedCachedTenant, subdomain, cacheKey });
            if (blocked) return blocked;
            return next();
        }

        const cachedTenant = tenantCache.get(subdomain);
        if (cachedTenant && cachedTenant.expiresAt > Date.now()) {
            const blocked = await attachActiveTenant({ req, res, shop: cachedTenant.shop, subdomain, cacheKey });
            if (blocked) return blocked;
            return next();
        }

        const shop = await Shop.findOne({
            subdomain: subdomain
        }).select('_id shopName isActive approvalStatus suspensionReason verification createdAt');

        if (!shop) {
            return res.status(404).json({ error: "Store not found." });
        }

        const blocked = await attachActiveTenant({ req, res, shop, subdomain, cacheKey });
        if (blocked) return blocked;

        next();
    } catch (err) {
        console.error("Tenant Resolution Error:", err);
        res.status(500).json({ error: "Server error resolving store data." });
    }
};

exports.invalidateTenantCache = async (subdomain) => {
    const normalized = normalizeSubdomain(subdomain);
    if (!normalized) return;
    tenantCache.delete(normalized);
    await cache.del(`tenant:${normalized}`);
};
