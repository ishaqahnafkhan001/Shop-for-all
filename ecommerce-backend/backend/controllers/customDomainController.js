const Shop = require('../models/Shop');
const cache = require('../services/cacheService');
const { invalidateTenantCache } = require('../middlewares/tenant');
const { logPlatformAudit } = require('../services/platformAuditLogService');
const {
    normalizeCustomDomain,
    isValidCustomDomain,
    isPlatformDomain
} = require('../utils/domainUtils');
const {
    buildCustomDomainVerificationFields,
    buildExpectedTxtValue,
    checkDomainDns
} = require('../services/domain/dnsVerificationService');

const DNS_CHECK_COOLDOWN_MS = 30 * 1000;
const recentChecks = new Map();

const assertCustomDomainAvailable = async (domain, shopId) => {
    const existingShop = await Shop.findOne({
        _id: { $ne: shopId },
        'customDomain.domain': domain
    }).select('_id').lean();

    if (existingShop) {
        const error = new Error('This domain is already connected to another shop.');
        error.statusCode = 400;
        throw error;
    }
};

const ensureDomainVerificationFields = async (shop) => {
    const domain = normalizeCustomDomain(shop?.customDomain?.domain);
    if (!domain) return shop;

    const current = shop.customDomain?.toObject ? shop.customDomain.toObject() : shop.customDomain || {};
    if (current.verificationToken && current.expectedTxtValue) return shop;

    const verificationFields = buildCustomDomainVerificationFields(shop._id, domain);
    shop.customDomain = {
        ...current,
        domain,
        ...verificationFields
    };
    await shop.save();
    return shop;
};

const clearExpiredCooldowns = (now = Date.now()) => {
    for (const [key, timestamp] of recentChecks.entries()) {
        if (now - timestamp > DNS_CHECK_COOLDOWN_MS * 2) recentChecks.delete(key);
    }
};

const enforceCooldown = (shopId, domain) => {
    const now = Date.now();
    clearExpiredCooldowns(now);
    const key = `${shopId}:${domain}`;
    const previous = recentChecks.get(key) || 0;
    const waitMs = DNS_CHECK_COOLDOWN_MS - (now - previous);
    if (waitMs > 0) {
        const error = new Error(`Please wait ${Math.ceil(waitMs / 1000)} seconds before checking DNS again.`);
        error.statusCode = 429;
        throw error;
    }
    recentChecks.set(key, now);
};

const invalidateShopDomainCache = async (shop, previousDomain = '') => {
    await Promise.all([
        shop?.subdomain ? invalidateTenantCache(shop.subdomain) : Promise.resolve(),
        shop?.customDomain?.domain ? invalidateTenantCache(shop.customDomain.domain) : Promise.resolve(),
        previousDomain ? invalidateTenantCache(previousDomain) : Promise.resolve(),
        shop?._id ? cache.del(`storefront:settings:${shop._id}`) : Promise.resolve(),
        shop?._id ? cache.delPattern(`storefront:bootstrap:${shop._id}:*`) : Promise.resolve()
    ]);
};

const toPublicResponse = (shop, result, message = '') => ({
    status: shop.customDomain?.status || 'PendingVerification',
    domain: shop.customDomain?.domain || '',
    ownershipVerified: Boolean(shop.customDomain?.ownershipVerified),
    routingVerified: Boolean(shop.customDomain?.routingVerified),
    manuallyVerifiedRouting: Boolean(shop.customDomain?.manuallyVerifiedRouting),
    verifiedAt: shop.customDomain?.verifiedAt || null,
    lastCheckedAt: shop.customDomain?.lastCheckedAt || null,
    lastDnsCheckStatus: shop.customDomain?.lastDnsCheckStatus || result?.status || '',
    lastDnsCheckError: shop.customDomain?.lastDnsCheckError || result?.error || '',
    lastOwnershipCheckStatus: shop.customDomain?.lastOwnershipCheckStatus || '',
    lastRoutingCheckStatus: shop.customDomain?.lastRoutingCheckStatus || '',
    lastDnsRecords: shop.customDomain?.lastDnsRecords || result?.records || {},
    expectedTxtValue: shop.customDomain?.expectedTxtValue || result?.expectedTxtValue || '',
    dnsTarget: shop.customDomain?.dnsTarget || result?.dnsTarget || '',
    verificationMethod: shop.customDomain?.verificationMethod || 'TXT',
    message: message || result?.message || ''
});

const getDomainStatusFromDnsResult = (result = {}) => {
    if (result.verified) return 'Verified';
    if (!result.ownershipVerified) return 'PendingVerification';
    if (['DNS_TARGET_MISSING', 'APEX_ROUTING_MANUAL'].includes(result.code)) return 'OwnershipVerified';
    return 'RoutingPending';
};

const runDomainDnsCheck = async ({ req, shop, actor = 'vendor' }) => {
    const previousDomain = normalizeCustomDomain(shop.customDomain?.domain);
    const domain = previousDomain;
    if (!domain) {
        const error = new Error('No custom domain configured.');
        error.statusCode = 400;
        throw error;
    }
    if (isPlatformDomain(domain)) {
        const error = new Error('Platform domains cannot be used as store custom domains.');
        error.statusCode = 400;
        throw error;
    }
    if (!isValidCustomDomain(domain)) {
        const error = new Error('Invalid custom domain.');
        error.statusCode = 400;
        throw error;
    }

    await assertCustomDomainAvailable(domain, shop._id);
    enforceCooldown(shop._id, domain);
    await ensureDomainVerificationFields(shop);

    const result = await checkDomainDns(domain, shop.customDomain || {});
    const now = new Date();
    const nextStatus = getDomainStatusFromDnsResult(result);
    const update = {
        'customDomain.domain': domain,
        'customDomain.status': nextStatus,
        'customDomain.ownershipVerified': Boolean(result.ownershipVerified),
        'customDomain.routingVerified': Boolean(result.routingVerified),
        'customDomain.manuallyVerifiedRouting': false,
        'customDomain.verifiedAt': result.verified ? (shop.customDomain?.verifiedAt || now) : null,
        'customDomain.lastCheckedAt': now,
        'customDomain.dnsTarget': result.dnsTarget || shop.customDomain?.dnsTarget || '',
        'customDomain.expectedTxtValue': result.expectedTxtValue || buildExpectedTxtValue(shop.customDomain?.verificationToken),
        'customDomain.lastDnsCheckStatus': result.status,
        'customDomain.lastDnsCheckError': result.verified ? '' : (result.message || result.error || 'DNS verification failed.'),
        'customDomain.lastOwnershipCheckStatus': result.ownershipVerified ? 'verified' : 'not_verified',
        'customDomain.lastRoutingCheckStatus': result.routingVerified ? 'verified' : (result.status || 'not_verified'),
        'customDomain.lastDnsRecords': result.records || { txt: [], cname: [], a: [] }
    };

    const updated = await Shop.findByIdAndUpdate(
        shop._id,
        { $set: update },
        { new: true, runValidators: true }
    ).select('shopName subdomain customDomain');

    await invalidateShopDomainCache(updated, previousDomain);

    await logPlatformAudit({
        req,
        action: result.verified ? 'domain.dns_check_passed' : 'domain.dns_check_failed',
        entityType: 'Shop',
        entityId: shop._id,
        entityLabel: shop.shopName,
        shop_id: shop._id,
        message: `${actor === 'super_admin' ? 'Super Admin' : 'Vendor'} DNS check ${result.verified ? 'passed' : 'failed'} for ${domain}`,
        reason: result.verified ? '' : (result.message || result.error || 'DNS verification failed.'),
        metadata: {
            domain,
            resultCode: result.code,
            ownershipVerified: result.ownershipVerified,
            routingVerified: result.routingVerified,
            routingRequired: result.routingRequired,
            dnsTarget: result.dnsTarget
        },
        severity: result.verified ? 'info' : 'warning'
    });

    return { shop: updated, result };
};

exports.checkVendorCustomDomainDns = async (req, res) => {
    try {
        const shop = await Shop.findById(req.tenantId).select('shopName subdomain customDomain');
        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        const { shop: updated, result } = await runDomainDnsCheck({ req, shop, actor: 'vendor' });

        if (!result.verified) {
            return res.status(400).json({
                success: false,
                code: 'DNS_VERIFICATION_FAILED',
                message: result.message,
                data: toPublicResponse(updated, result)
            });
        }

        return res.status(200).json({
            success: true,
            data: toPublicResponse(updated, result, 'Domain verification successful.')
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            success: false,
            code: err.statusCode === 429 ? 'DNS_CHECK_COOLDOWN' : 'DNS_VERIFICATION_ERROR',
            error: err.message || 'Failed to check domain DNS.'
        });
    }
};

exports.checkSuperAdminCustomDomainDns = async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.shopId).select('shopName subdomain customDomain');
        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        const { shop: updated, result } = await runDomainDnsCheck({ req, shop, actor: 'super_admin' });

        if (!result.verified) {
            return res.status(400).json({
                success: false,
                code: 'DNS_VERIFICATION_FAILED',
                message: result.message,
                data: toPublicResponse(updated, result)
            });
        }

        return res.status(200).json({
            success: true,
            data: toPublicResponse(updated, result, 'Domain verification successful.')
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            success: false,
            code: err.statusCode === 429 ? 'DNS_CHECK_COOLDOWN' : 'DNS_VERIFICATION_ERROR',
            error: err.message || 'Failed to check domain DNS.'
        });
    }
};

exports.ensureDomainVerificationFields = ensureDomainVerificationFields;
