const Shop = require('../models/Shop');
const Product = require('../models/Product');
const Collection = require('../models/Collection');
const StoreBuilderAsset = require('../models/StoreBuilderAsset');
const cache = require('../services/cacheService');
const { logAudit } = require('../services/auditLogService');
const {
    BRANDING_ASSET_FIELDS,
    BRANDING_REMOVAL_FIELDS,
    assertBrandingUpload,
    buildBrandingUpdate,
    createActiveBrandingAsset,
    destroyUploadedFile,
    getStoredOrDerivedBranding,
    resolveStoreBranding,
    retireAssetIfUnreferenced,
    safeDefaultBranding
} = require('../services/shops/storeBrandingService');

const BRANDING_SELECT = 'shopName subdomain branding theme.logoUrl theme.faviconUrl theme.hero';

const invalidateBrandingCaches = shopId => Promise.all([
    cache.del(`storefront:settings:${shopId}`),
    cache.del(`storefront:branding:${shopId}`),
    cache.delPattern(`storefront:bootstrap:${shopId}:*`),
    cache.delPattern(`storefront:*:${shopId}:*`)
]);

const versionFilter = (shopId, expectedVersion) => ({
    _id: shopId,
    ...(expectedVersion === 0
        ? {
            $or: [
                { 'branding.version': 0 },
                { 'branding.version': { $exists: false } }
            ]
        }
        : { 'branding.version': expectedVersion })
});

const serializeConflict = async (res, shopId) => {
    const current = await Shop.findById(shopId).select('branding.version').lean();
    return res.status(409).json({
        success: false,
        code: 'BRANDING_VERSION_CONFLICT',
        message: 'Store branding was updated in another session.',
        currentVersion: Number(current?.branding?.version || 0)
    });
};

const storedBrandingFields = branding => ({
    'branding.logoAssetId': branding.logoAssetId || null,
    'branding.faviconAssetId': branding.faviconAssetId || null,
    'branding.heroImageAssetId': branding.heroImageAssetId || null,
    'branding.logoRemoved': Boolean(branding.logoRemoved),
    'branding.faviconRemoved': Boolean(branding.faviconRemoved),
    'branding.heroImageRemoved': Boolean(branding.heroImageRemoved),
    'branding.heroTitle': branding.heroTitle,
    'branding.heroSubtitle': branding.heroSubtitle,
    'branding.heroCtaLabel': branding.heroCtaLabel,
    'branding.heroCtaType': branding.heroCtaType,
    'branding.heroCtaTargetId': branding.heroCtaTargetId || '',
    'branding.heroCtaUrl': branding.heroCtaUrl || '',
    'branding.heroHidden': Boolean(branding.heroHidden),
    'branding.source': branding.source || 'explicit'
});

const auditBrandingChange = ({
    req,
    shop,
    action,
    changedFields,
    previousVersion,
    newVersion
}) => logAudit({
    req,
    shop_id: shop._id,
    action,
    entityType: 'ShopBranding',
    entityId: shop._id,
    entityLabel: shop.shopName,
    metadata: {
        changedFields,
        previousVersion,
        newVersion
    }
});

exports.getStoreBranding = async (req, res) => {
    try {
        const shop = await Shop.findById(req.tenantId).select(BRANDING_SELECT).lean();
        if (!shop) return res.status(404).json({ success: false, code: 'SHOP_NOT_FOUND', message: 'Shop not found.' });
        return res.status(200).json({
            success: true,
            data: await resolveStoreBranding(shop)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            code: 'BRANDING_LOAD_FAILED',
            message: 'Store branding could not be loaded.'
        });
    }
};

exports.getStoreBrandingDestinations = async (req, res) => {
    try {
        const [products, categories, collections] = await Promise.all([
            Product.find({
                shop_id: req.tenantId,
                isDeleted: false,
                isActive: true,
                status: 'Published'
            }).select('_id title slug').sort({ title: 1 }).limit(100).lean(),
            Product.distinct('category', {
                shop_id: req.tenantId,
                isDeleted: false,
                isActive: true,
                status: 'Published'
            }),
            Collection.find({ shop_id: req.tenantId, isActive: true })
                .select('_id title slug')
                .sort({ title: 1 })
                .limit(100)
                .lean()
        ]);
        return res.status(200).json({
            success: true,
            data: {
                products: products.map(product => ({
                    id: product._id,
                    label: product.title,
                    slug: product.slug
                })),
                categories: categories.filter(Boolean).sort().slice(0, 100).map(category => ({
                    id: category,
                    label: category
                })),
                collections: collections.map(collection => ({
                    id: collection._id,
                    label: collection.title,
                    slug: collection.slug
                }))
            }
        });
    } catch {
        return res.status(500).json({
            success: false,
            code: 'BRANDING_DESTINATIONS_LOAD_FAILED',
            message: 'Store destinations could not be loaded.'
        });
    }
};

exports.updateStoreBranding = async (req, res) => {
    try {
        const shop = await Shop.findById(req.tenantId).select(BRANDING_SELECT).lean();
        if (!shop) return res.status(404).json({ success: false, code: 'SHOP_NOT_FOUND', message: 'Shop not found.' });

        const { expectedVersion, next } = await buildBrandingUpdate({ shop, payload: req.body || {} });
        const now = new Date();
        const updated = await Shop.findOneAndUpdate(
            versionFilter(shop._id, expectedVersion),
            {
                $set: {
                    ...storedBrandingFields(next),
                    'branding.updatedAt': now,
                    'branding.updatedBy': req.user?._id || req.user?.id || null
                },
                $inc: { 'branding.version': 1 }
            },
            { new: true, runValidators: true }
        ).select(BRANDING_SELECT).lean();
        if (!updated) return serializeConflict(res, shop._id);

        await invalidateBrandingCaches(shop._id);
        const changedFields = [
            'heroTitle',
            'heroSubtitle',
            'heroCta',
            'heroHidden'
        ];
        await auditBrandingChange({
            req,
            shop,
            action: 'STORE_BRANDING_UPDATED',
            changedFields,
            previousVersion: expectedVersion,
            newVersion: expectedVersion + 1
        });
        if (Boolean(shop.branding?.heroHidden) !== Boolean(next.heroHidden)) {
            await auditBrandingChange({
                req,
                shop,
                action: 'STORE_HERO_VISIBILITY_CHANGED',
                changedFields: ['heroHidden'],
                previousVersion: expectedVersion,
                newVersion: expectedVersion + 1
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Store branding saved.',
            data: await resolveStoreBranding(updated)
        });
    } catch (error) {
        return res.status(error.statusCode || 400).json({
            success: false,
            code: error.code || 'BRANDING_UPDATE_FAILED',
            message: error.message || 'Store branding could not be saved.'
        });
    }
};

exports.uploadStoreBrandingAsset = async (req, res) => {
    const target = String(req.brandingAssetTarget || '');
    let asset = null;
    try {
        const allowedBodyFields = new Set(['expectedVersion']);
        const unknownFields = Object.keys(req.body || {}).filter(key => !allowedBodyFields.has(key));
        if (unknownFields.length) {
            const error = new Error(`Unknown branding field${unknownFields.length > 1 ? 's' : ''}: ${unknownFields.join(', ')}`);
            error.statusCode = 400;
            error.code = 'UNKNOWN_BRANDING_FIELDS';
            throw error;
        }
        assertBrandingUpload({ file: req.file, target });
        const expectedVersion = Number(req.body?.expectedVersion);
        if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
            const error = new Error('A valid branding version is required.');
            error.statusCode = 400;
            error.code = 'BRANDING_VERSION_REQUIRED';
            throw error;
        }

        const shop = await Shop.findById(req.tenantId).select(BRANDING_SELECT).lean();
        if (!shop) {
            const error = new Error('Shop not found.');
            error.statusCode = 404;
            error.code = 'SHOP_NOT_FOUND';
            throw error;
        }

        const current = getStoredOrDerivedBranding(shop);
        const field = BRANDING_ASSET_FIELDS[target];
        const removalField = BRANDING_REMOVAL_FIELDS[target];
        const previousAssetId = current[field] || null;
        asset = await createActiveBrandingAsset({ req, file: req.file, target });
        const now = new Date();
        const updated = await Shop.findOneAndUpdate(
            versionFilter(shop._id, expectedVersion),
            {
                $set: {
                    ...storedBrandingFields({
                        ...current,
                        [field]: asset._id,
                        [removalField]: false,
                        source: 'explicit'
                    }),
                    'branding.updatedAt': now,
                    'branding.updatedBy': req.user?._id || req.user?.id || null
                },
                $inc: { 'branding.version': 1 }
            },
            { new: true, runValidators: true }
        ).select(BRANDING_SELECT).lean();

        if (!updated) {
            await StoreBuilderAsset.deleteOne({ _id: asset._id });
            await destroyUploadedFile(req.file);
            asset = null;
            return serializeConflict(res, shop._id);
        }

        await retireAssetIfUnreferenced(previousAssetId);
        await invalidateBrandingCaches(shop._id);
        await auditBrandingChange({
            req,
            shop,
            action: target === 'logo'
                ? 'STORE_LOGO_CHANGED'
                : target === 'favicon'
                    ? 'STORE_FAVICON_CHANGED'
                    : 'STORE_HERO_CHANGED',
            changedFields: [field],
            previousVersion: expectedVersion,
            newVersion: expectedVersion + 1
        });
        return res.status(200).json({
            success: true,
            message: `${target === 'hero' ? 'Hero image' : target === 'favicon' ? 'Browser icon' : 'Store logo'} updated.`,
            data: await resolveStoreBranding(updated)
        });
    } catch (error) {
        if (asset?._id) await StoreBuilderAsset.deleteOne({ _id: asset._id }).catch(() => null);
        await destroyUploadedFile(req.file);
        return res.status(error.statusCode || 400).json({
            success: false,
            code: error.code || 'BRANDING_UPLOAD_FAILED',
            message: error.message || 'This branding image could not be uploaded.'
        });
    }
};

exports.removeStoreBrandingAsset = async (req, res) => {
    try {
        const target = String(req.brandingAssetTarget || '');
        const field = BRANDING_ASSET_FIELDS[target];
        const removalField = BRANDING_REMOVAL_FIELDS[target];
        const expectedVersion = Number(req.body?.expectedVersion);
        if (!field || !Number.isInteger(expectedVersion) || expectedVersion < 0) {
            return res.status(400).json({
                success: false,
                code: 'BRANDING_VERSION_REQUIRED',
                message: 'A valid branding version is required.'
            });
        }
        const unknownFields = Object.keys(req.body || {}).filter(key => key !== 'expectedVersion');
        if (unknownFields.length) {
            return res.status(400).json({
                success: false,
                code: 'UNKNOWN_BRANDING_FIELDS',
                message: `Unknown branding field${unknownFields.length > 1 ? 's' : ''}: ${unknownFields.join(', ')}`
            });
        }

        const shop = await Shop.findById(req.tenantId).select(BRANDING_SELECT).lean();
        if (!shop) return res.status(404).json({ success: false, code: 'SHOP_NOT_FOUND', message: 'Shop not found.' });
        const current = getStoredOrDerivedBranding(shop);
        const previousAssetId = current[field] || null;
        const updated = await Shop.findOneAndUpdate(
            versionFilter(shop._id, expectedVersion),
            {
                $set: {
                    ...storedBrandingFields({
                        ...current,
                        [field]: null,
                        [removalField]: true,
                        source: 'explicit'
                    }),
                    'branding.updatedAt': new Date(),
                    'branding.updatedBy': req.user?._id || req.user?.id || null
                },
                $inc: { 'branding.version': 1 }
            },
            { new: true, runValidators: true }
        ).select(BRANDING_SELECT).lean();
        if (!updated) return serializeConflict(res, shop._id);

        await retireAssetIfUnreferenced(previousAssetId);
        await invalidateBrandingCaches(shop._id);
        await auditBrandingChange({
            req,
            shop,
            action: target === 'logo'
                ? 'STORE_LOGO_CHANGED'
                : target === 'favicon'
                    ? 'STORE_FAVICON_CHANGED'
                    : 'STORE_HERO_CHANGED',
            changedFields: [field],
            previousVersion: expectedVersion,
            newVersion: expectedVersion + 1
        });
        return res.status(200).json({
            success: true,
            message: `${target === 'hero' ? 'Hero image' : target === 'favicon' ? 'Browser icon' : 'Store logo'} removed.`,
            data: await resolveStoreBranding(updated)
        });
    } catch (error) {
        return res.status(error.statusCode || 400).json({
            success: false,
            code: error.code || 'BRANDING_REMOVE_FAILED',
            message: error.message || 'This branding image could not be removed.'
        });
    }
};

exports.resetStoreBranding = async (req, res) => {
    try {
        const expectedVersion = Number(req.body?.expectedVersion);
        if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
            return res.status(400).json({
                success: false,
                code: 'BRANDING_VERSION_REQUIRED',
                message: 'A valid branding version is required.'
            });
        }
        const unknownFields = Object.keys(req.body || {}).filter(key => key !== 'expectedVersion');
        if (unknownFields.length) {
            return res.status(400).json({
                success: false,
                code: 'UNKNOWN_BRANDING_FIELDS',
                message: `Unknown branding field${unknownFields.length > 1 ? 's' : ''}: ${unknownFields.join(', ')}`
            });
        }

        const shop = await Shop.findById(req.tenantId).select(BRANDING_SELECT).lean();
        if (!shop) return res.status(404).json({ success: false, code: 'SHOP_NOT_FOUND', message: 'Shop not found.' });
        const current = getStoredOrDerivedBranding(shop);
        const defaults = safeDefaultBranding(shop);
        defaults.logoRemoved = true;
        defaults.faviconRemoved = true;
        defaults.heroImageRemoved = true;
        const updated = await Shop.findOneAndUpdate(
            versionFilter(shop._id, expectedVersion),
            {
                $set: {
                    ...storedBrandingFields(defaults),
                    'branding.source': 'default',
                    'branding.updatedAt': new Date(),
                    'branding.updatedBy': req.user?._id || req.user?.id || null
                },
                $inc: { 'branding.version': 1 }
            },
            { new: true, runValidators: true }
        ).select(BRANDING_SELECT).lean();
        if (!updated) return serializeConflict(res, shop._id);

        await Promise.all([
            retireAssetIfUnreferenced(current.logoAssetId),
            retireAssetIfUnreferenced(current.faviconAssetId),
            retireAssetIfUnreferenced(current.heroImageAssetId)
        ]);
        await invalidateBrandingCaches(shop._id);
        await auditBrandingChange({
            req,
            shop,
            action: 'STORE_BRANDING_RESET',
            changedFields: ['logoAssetId', 'faviconAssetId', 'heroImageAssetId', 'heroContent', 'heroHidden'],
            previousVersion: expectedVersion,
            newVersion: expectedVersion + 1
        });
        return res.status(200).json({
            success: true,
            message: 'Store branding restored to safe defaults.',
            data: await resolveStoreBranding(updated)
        });
    } catch (error) {
        return res.status(error.statusCode || 400).json({
            success: false,
            code: error.code || 'BRANDING_RESET_FAILED',
            message: error.message || 'Store branding could not be reset.'
        });
    }
};

module.exports.invalidateBrandingCaches = invalidateBrandingCaches;
