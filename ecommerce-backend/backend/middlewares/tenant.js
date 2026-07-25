const Shop = require('../models/Shop');
const crypto = require('crypto');
const cache = require('../services/cacheService');
const { ensureShopVerificationStatus } = require('../services/vendorVerificationService');
const {
    normalizeCustomDomain,
    getHostnameFromHostHeader,
    getPlatformSubdomainFromHostname,
    isPlatformRootHost,
    isValidCustomDomain,
    isPlatformDomain,
    buildKnownCustomDomainQuery,
    PLATFORM_ROOT_DOMAIN
} = require('../utils/domainUtils');
const tenantCache = new Map();
const TENANT_CACHE_TTL = 5 * 60 * 1000;
const TENANT_AVAILABILITY_CHECK_TTL = 30 * 1000;

const unavailableResponse = (res, extra = {}) => res.status(423).json({
    success: false,
    code: 'STORE_UNAVAILABLE',
    error: 'This store is temporarily unavailable.',
    ...extra
});

const normalizeSubdomain = (subdomain = '') => String(subdomain || '').trim().toLowerCase();

const safeEqual = (left, right) => {
    const a = Buffer.from(String(left || ''));
    const b = Buffer.from(String(right || ''));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const getTrustedStorefrontHost = (req) => {
    const forwardedHost = getHostnameFromHostHeader(req.get('x-storefront-host') || '');
    if (!forwardedHost) return '';

    const secret = process.env.STOREFRONT_PROXY_SECRET;
    if (!secret) {
        return process.env.NODE_ENV === 'production' ? '' : forwardedHost;
    }

    const timestamp = Number(req.get('x-storefront-timestamp') || 0);
    const signature = String(req.get('x-storefront-signature') || '');
    if (!timestamp || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000 || !signature) return '';

    const expected = crypto
        .createHmac('sha256', secret)
        .update(`${forwardedHost}.${timestamp}`)
        .digest('hex');

    return safeEqual(signature, expected) ? forwardedHost : '';
};

const getRequestedTenant = (req) => {
    const routeValue = normalizeSubdomain(req.params.subdomain);
    const forwardedHost = getTrustedStorefrontHost(req) || getHostnameFromHostHeader(req.get('host') || '');

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
                query: buildKnownCustomDomainQuery(customDomainFromHost)
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
            query: buildKnownCustomDomainQuery(customDomain)
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
    subdomain: shop.subdomain,
    customDomain: shop.customDomain,
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

    if (tenantType === 'customDomain') {
        const { hasFeature } = require('../services/shops/featureAccessService');
        if (
            currentShop?.customDomain?.planInactive === true ||
            !(await hasFeature(currentShop?._id, 'customDomain'))
        ) {
            await cache.del(cacheKey);
            tenantCache.delete(tenantKey);
            return unavailableResponse(res, {
                code: 'CUSTOM_DOMAIN_PLAN_INACTIVE',
                platformHost: currentShop?.subdomain
                    ? `${currentShop.subdomain}.${PLATFORM_ROOT_DOMAIN}`
                    : ''
            });
        }
    }

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
            .select('_id shopName subdomain customDomain isActive approvalStatus suspensionReason verification createdAt');

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

exports.resetTenantCacheForTests = () => {
    if (process.env.NODE_ENV !== 'test') {
        throw new Error('Tenant cache reset is only available in tests.');
    }
    tenantCache.clear();
};
