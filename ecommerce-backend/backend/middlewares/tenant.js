const Shop = require('../models/Shop');
const cache = require('../services/cacheService');
const { ensureShopVerificationStatus } = require('../services/vendorVerificationService');
const {
    normalizeCustomDomain,
    getHostnameFromHostHeader,
    getPlatformSubdomainFromHostname,
    isPlatformRootHost,
    isValidCustomDomain,
    isPlatformDomain,
    buildVerifiedCustomDomainQuery
} = require('../utils/domainUtils');
const tenantCache = new Map();
const TENANT_CACHE_TTL = 5 * 60 * 1000;
const TENANT_AVAILABILITY_CHECK_TTL = 30 * 1000;

const unavailableResponse = (res) => res.status(423).json({
    success: false,
    code: 'STORE_UNAVAILABLE',
    error: 'This store is temporarily unavailable.'
});

const normalizeSubdomain = (subdomain = '') => String(subdomain || '').trim().toLowerCase();

const getRequestedTenant = (req) => {
    const routeValue = normalizeSubdomain(req.params.subdomain);
    const forwardedHost = getHostnameFromHostHeader(
        req.get('x-storefront-host') ||
        req.get('x-forwarded-host') ||
        req.get('host') ||
        ''
    );

    if (!routeValue) return null;

    if (forwardedHost && !isPlatformRootHost(forwardedHost)) {
        const subdomainFromHost = getPlatformSubdomainFromHostname(forwardedHost);
        if (subdomainFromHost) {
            if (routeValue !== subdomainFromHost) return { invalid: true, key: routeValue };
            return {
                key: subdomainFromHost,
                tenantType: 'subdomain',
                query: { subdomain: subdomainFromHost }
            };
        }

        const customDomainFromHost = normalizeCustomDomain(forwardedHost);
        if (
            customDomainFromHost &&
            !isPlatformDomain(customDomainFromHost) &&
            isValidCustomDomain(customDomainFromHost)
        ) {
            return {
                key: customDomainFromHost,
                tenantType: 'customDomain',
                query: buildVerifiedCustomDomainQuery(customDomainFromHost)
            };
        }
    }

    if (routeValue.includes('.')) {
        const customDomain = normalizeCustomDomain(routeValue);
        if (!customDomain || isPlatformDomain(customDomain) || !isValidCustomDomain(customDomain)) {
            return { invalid: true, key: routeValue };
        }
        return {
            key: customDomain,
            tenantType: 'customDomain',
            query: buildVerifiedCustomDomainQuery(customDomain)
        };
    }

    return {
        key: routeValue,
        tenantType: 'subdomain',
        query: { subdomain: routeValue }
    };
};

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

const attachActiveTenant = async ({ req, res, shop, tenantKey, cacheKey, tenantType }) => {
    const checked = isAvailabilityFresh(shop)
        ? { shop }
        : await ensureShopVerificationStatus(shop);
    const currentShop = checked.shop || shop;

    if (!currentShop || currentShop.isActive === false || currentShop.approvalStatus === 'Suspended') {
        await cache.del(cacheKey);
        tenantCache.delete(tenantKey);
        return unavailableResponse(res);
    }

    const tenant = buildCachedTenant(currentShop);

    await cache.set(cacheKey, tenant, TENANT_CACHE_TTL / 1000);
    tenantCache.set(tenantKey, {
        shop: tenant,
        expiresAt: Date.now() + TENANT_CACHE_TTL
    });

    req.tenantId = tenant._id;
    req.tenantName = tenant.shopName;
    req.tenantType = tenantType;
    return null;
};

exports.resolveTenant = async (req, res, next) => {
    try {
        const requestedTenant = getRequestedTenant(req);

        if (!requestedTenant) {
            return res.status(400).json({ error: "Subdomain is required to fetch store data." });
        }

        if (requestedTenant.invalid) {
            return res.status(404).json({ error: "Store not found." });
        }

        const { key: tenantKey, query, tenantType } = requestedTenant;
        const cacheKey = `tenant:${tenantKey}`;
        const sharedCachedTenant = await cache.get(cacheKey);
        if (sharedCachedTenant) {
            const blocked = await attachActiveTenant({ req, res, shop: sharedCachedTenant, tenantKey, cacheKey, tenantType });
            if (blocked) return blocked;
            return next();
        }

        const cachedTenant = tenantCache.get(tenantKey);
        if (cachedTenant && cachedTenant.expiresAt > Date.now()) {
            const blocked = await attachActiveTenant({ req, res, shop: cachedTenant.shop, tenantKey, cacheKey, tenantType });
            if (blocked) return blocked;
            return next();
        }

        const shop = await Shop.findOne(query)
            .select('_id shopName isActive approvalStatus suspensionReason verification createdAt');

        if (!shop) {
            return res.status(404).json({ error: "Store not found." });
        }

        const blocked = await attachActiveTenant({ req, res, shop, tenantKey, cacheKey, tenantType });
        if (blocked) return blocked;

        next();
    } catch (err) {
        console.error("Tenant Resolution Error:", err);
        res.status(500).json({ error: "Server error resolving store data." });
    }
};

exports.invalidateTenantCache = async (subdomain) => {
    const normalized = normalizeCustomDomain(subdomain) || normalizeSubdomain(subdomain);
    if (!normalized) return;
    tenantCache.delete(normalized);
    await cache.del(`tenant:${normalized}`);
};
