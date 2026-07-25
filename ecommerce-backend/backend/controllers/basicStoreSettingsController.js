const Shop = require('../models/Shop');
const cache = require('../services/cacheService');
const { logAudit } = require('../services/auditLogService');
const { normalizeThemeForShop } = require('../services/storeBuilder/storeBuilderService');
const { PLATFORM_ROOT_DOMAIN } = require('../utils/domainUtils');
const { cloudinary } = require('../config/cloudinary');

const cleanText = (value, maxLength = 500) => String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, maxLength);

const cleanUrl = (value) => {
    const input = String(value || '').trim();
    if (!input) return '';
    try {
        const url = new URL(input);
        return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
    } catch {
        return '';
    }
};

const booleanValue = value => value === true || value === 'true';
const isValidEmail = value => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const cleanupUploadedAsset = async (file) => {
    const publicId = file?.public_id || file?.filename;
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId, {
        resource_type: file.resource_type || 'image'
    }).catch(() => null);
};

const serializeBasicSettings = (shop) => ({
    shopName: shop.shopName,
    subdomain: shop.subdomain,
    platformStoreUrl: shop.subdomain
        ? `https://${shop.subdomain}.${PLATFORM_ROOT_DOMAIN}`
        : '',
    logoUrl: shop.theme?.logoUrl || '',
    faviconUrl: shop.theme?.faviconUrl || '',
    contact: {
        label: shop.theme?.footer?.contactLabel || 'Contact store',
        email: shop.theme?.footer?.contactEmail || ''
    },
    socialLinks: {
        facebookUrl: shop.theme?.footer?.facebookUrl || '',
        instagramUrl: shop.theme?.footer?.instagramUrl || '',
        twitterUrl: shop.theme?.footer?.twitterUrl || '',
        youtubeUrl: shop.theme?.footer?.youtubeUrl || '',
        tiktokUrl: shop.theme?.footer?.tiktokUrl || ''
    },
    policies: {
        refund: shop.theme?.policies?.refund || '',
        shipping: shop.theme?.policies?.shipping || '',
        privacy: shop.theme?.policies?.privacy || '',
        terms: shop.theme?.policies?.terms || ''
    },
    paymentSettings: {
        additionalMethodsEnabled: Boolean(shop.theme?.paymentSettings?.additionalMethodsEnabled),
        providers: {
            bkash: Boolean(shop.theme?.paymentSettings?.providers?.bkash),
            nagad: Boolean(shop.theme?.paymentSettings?.providers?.nagad),
            rocket: Boolean(shop.theme?.paymentSettings?.providers?.rocket)
        }
    }
});

const invalidateBasicSettingsCache = shopId => Promise.all([
    cache.del(`storefront:settings:${shopId}`),
    cache.delPattern(`storefront:bootstrap:${shopId}:*`),
    cache.delPattern(`storefront:*:${shopId}:*`)
]);

exports.getBasicStoreSettings = async (req, res) => {
    try {
        const shop = await Shop.findById(req.tenantId)
            .select('shopName subdomain theme.logoUrl theme.faviconUrl theme.footer theme.policies theme.paymentSettings')
            .lean();
        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found.' });
        return res.status(200).json({ success: true, data: serializeBasicSettings(shop) });
    } catch {
        return res.status(500).json({ success: false, error: 'Unable to load store settings.' });
    }
};

exports.updateBasicStoreSettings = async (req, res) => {
    try {
        const shop = await Shop.findById(req.tenantId)
            .select('shopName subdomain theme');
        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found.' });

        const before = serializeBasicSettings(shop);
        const payload = req.body || {};
        const social = payload.socialLinks || {};
        const policies = payload.policies || {};
        const payments = payload.paymentSettings || {};
        const providers = payments.providers || {};
        const incomingName = cleanText(payload.shopName ?? shop.shopName, 50);
        if (incomingName.length < 3) {
            return res.status(400).json({
                success: false,
                error: 'Store name must be at least 3 characters.'
            });
        }
        const contactEmail = cleanText(
            payload.contact?.email ?? shop.theme?.footer?.contactEmail,
            160
        );
        if (!isValidEmail(contactEmail)) {
            return res.status(400).json({
                success: false,
                error: 'Enter a valid store contact email.'
            });
        }

        const mergedTheme = {
            ...(shop.theme?.toObject ? shop.theme.toObject() : shop.theme || {}),
            logoUrl: payload.logoUrl === undefined ? shop.theme?.logoUrl : cleanUrl(payload.logoUrl),
            faviconUrl: payload.faviconUrl === undefined ? shop.theme?.faviconUrl : cleanUrl(payload.faviconUrl),
            footer: {
                ...(shop.theme?.footer?.toObject ? shop.theme.footer.toObject() : shop.theme?.footer || {}),
                contactLabel: cleanText(payload.contact?.label ?? shop.theme?.footer?.contactLabel, 80),
                contactEmail,
                facebookUrl: social.facebookUrl === undefined ? shop.theme?.footer?.facebookUrl : cleanUrl(social.facebookUrl),
                instagramUrl: social.instagramUrl === undefined ? shop.theme?.footer?.instagramUrl : cleanUrl(social.instagramUrl),
                twitterUrl: social.twitterUrl === undefined ? shop.theme?.footer?.twitterUrl : cleanUrl(social.twitterUrl),
                youtubeUrl: social.youtubeUrl === undefined ? shop.theme?.footer?.youtubeUrl : cleanUrl(social.youtubeUrl),
                tiktokUrl: social.tiktokUrl === undefined ? shop.theme?.footer?.tiktokUrl : cleanUrl(social.tiktokUrl)
            },
            policies: {
                ...(shop.theme?.policies?.toObject ? shop.theme.policies.toObject() : shop.theme?.policies || {}),
                refund: policies.refund === undefined ? shop.theme?.policies?.refund : cleanText(policies.refund, 20000),
                shipping: policies.shipping === undefined ? shop.theme?.policies?.shipping : cleanText(policies.shipping, 20000),
                privacy: policies.privacy === undefined ? shop.theme?.policies?.privacy : cleanText(policies.privacy, 20000),
                terms: policies.terms === undefined ? shop.theme?.policies?.terms : cleanText(policies.terms, 20000)
            },
            paymentSettings: {
                ...(shop.theme?.paymentSettings?.toObject
                    ? shop.theme.paymentSettings.toObject()
                    : shop.theme?.paymentSettings || {}),
                additionalMethodsEnabled: payments.additionalMethodsEnabled === undefined
                    ? Boolean(shop.theme?.paymentSettings?.additionalMethodsEnabled)
                    : booleanValue(payments.additionalMethodsEnabled),
                providers: {
                    ...(shop.theme?.paymentSettings?.providers?.toObject
                        ? shop.theme.paymentSettings.providers.toObject()
                        : shop.theme?.paymentSettings?.providers || {}),
                    bkash: providers.bkash === undefined
                        ? Boolean(shop.theme?.paymentSettings?.providers?.bkash)
                        : booleanValue(providers.bkash),
                    nagad: providers.nagad === undefined
                        ? Boolean(shop.theme?.paymentSettings?.providers?.nagad)
                        : booleanValue(providers.nagad),
                    rocket: providers.rocket === undefined
                        ? Boolean(shop.theme?.paymentSettings?.providers?.rocket)
                        : booleanValue(providers.rocket)
                }
            }
        };

        shop.shopName = incomingName;
        shop.theme = await normalizeThemeForShop(mergedTheme, shop);
        await shop.save();
        await invalidateBasicSettingsCache(shop._id);
        const after = serializeBasicSettings(shop);
        await logAudit({
            req,
            shop_id: shop._id,
            action: 'shop.basic_settings_updated',
            entityType: 'Shop',
            entityId: shop._id,
            entityLabel: shop.shopName,
            before,
            after
        });
        return res.status(200).json({
            success: true,
            message: 'Store settings saved.',
            data: after
        });
    } catch (error) {
        return res.status(error.statusCode || 400).json({
            success: false,
            code: error.code || 'BASIC_SETTINGS_UPDATE_FAILED',
            error: error.message || 'Unable to save store settings.'
        });
    }
};

exports.uploadBasicStoreBrandAsset = async (req, res) => {
    try {
        if (!req.file?.path) {
            return res.status(400).json({ success: false, error: 'A logo or icon file is required.' });
        }
        const target = req.body?.target === 'favicon' ? 'faviconUrl' : 'logoUrl';
        const shop = await Shop.findById(req.tenantId).select('shopName subdomain theme');
        if (!shop) {
            await cleanupUploadedAsset(req.file);
            return res.status(404).json({ success: false, error: 'Shop not found.' });
        }

        const mergedTheme = {
            ...(shop.theme?.toObject ? shop.theme.toObject() : shop.theme || {}),
            [target]: req.file.path
        };
        shop.theme = await normalizeThemeForShop(mergedTheme, shop);
        await shop.save();
        await invalidateBasicSettingsCache(shop._id);
        await logAudit({
            req,
            shop_id: shop._id,
            action: target === 'faviconUrl' ? 'shop.browser_icon_updated' : 'shop.logo_updated',
            entityType: 'Shop',
            entityId: shop._id,
            entityLabel: shop.shopName,
            metadata: { target }
        });
        return res.status(200).json({
            success: true,
            message: target === 'faviconUrl' ? 'Browser icon updated.' : 'Store logo updated.',
            data: serializeBasicSettings(shop)
        });
    } catch (error) {
        await cleanupUploadedAsset(req.file);
        return res.status(400).json({
            success: false,
            error: error.message || 'Unable to upload this brand asset.'
        });
    }
};

module.exports.cleanText = cleanText;
module.exports.cleanUrl = cleanUrl;
module.exports.isValidEmail = isValidEmail;
module.exports.serializeBasicSettings = serializeBasicSettings;
