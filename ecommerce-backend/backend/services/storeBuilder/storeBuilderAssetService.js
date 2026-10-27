const StoreBuilderAsset = require('../../models/StoreBuilderAsset');
const StoreBuilderDraft = require('../../models/StoreBuilderDraft');
const StoreBuilderRevision = require('../../models/StoreBuilderRevision');
const Product = require('../../models/Product');
const Shop = require('../../models/Shop');
const mongoose = require('mongoose');
const { cloudinary } = require('../../config/cloudinary');
const { extractThemeAssetUrls } = require('@scaleup/storefront-theme');
const { collectAdaptiveReferences } = require('@scaleup/storefront-theme/storage');

const TEMPORARY_ASSET_TTL_MS = 24 * 60 * 60 * 1000;
const RETIRED_ASSET_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
const adaptiveReferences = theme => Number(theme?.version) === 5
    ? collectAdaptiveReferences(JSON.parse(JSON.stringify(theme))) : { assetIds: [], productIds: [] };

const themeReferences = theme => ({ urls: extractThemeAssetUrls(theme),
    ...adaptiveReferences(theme), });
const referenceQuery = theme => {
    const refs = themeReferences(theme);
    const ids = [...refs.assetIds, ...(theme?.seo?.socialImageAssetId ? [theme.seo.socialImageAssetId] : [])];
    return { $or: [{ url: { $in: refs.urls } }, { _id: { $in: ids } }] };
};
const getThemeAssetIds = async ({ shopId, theme, session = null }) => {
    const records = await StoreBuilderAsset.find({ shop_id: shopId, ...referenceQuery(theme) }).select('_id').session(session).lean();
    return records.map(asset => asset._id);
};

// Read both snapshot content and metadata, so pre-existing revisions need no
// destructive/backfill migration. At most 20 retained revisions are published.
const isAssetReferenced = async asset => {
    const [shop, draft, revisions] = await Promise.all([
        Shop.findById(asset.shop_id).select('theme branding').lean(),
        StoreBuilderDraft.findOne({ shop_id: asset.shop_id }).select('theme assetIds').lean(),
        StoreBuilderRevision.find({ shop_id: asset.shop_id }).select('theme assetIds').limit(21).lean(),
    ]);
    if (revisions.length > 20) throw new Error('Revision retention must be repaired before media cleanup.');
    if ([shop?.branding?.logoAssetId, shop?.branding?.faviconAssetId, shop?.branding?.heroImageAssetId,
        ...(draft?.assetIds || []), ...revisions.flatMap(item => item.assetIds || [])].some(id => String(id) === String(asset._id))) return true;
    return [shop?.theme, draft?.theme, ...revisions.map(item => item.theme)].filter(Boolean).some(theme => {
        const refs = themeReferences(theme);
        return refs.urls.includes(asset.url) || refs.assetIds.includes(String(asset._id)) || String(theme.seo?.socialImageAssetId) === String(asset._id);
    });
};

const buildAssetDocument = ({ req, file, target = 'theme' }) => ({
    shop_id: req.tenantId,
    uploadedBy: req.user?._id || req.user?.id || null,
    target: String(target || 'theme').slice(0, 80),
    url: file.secure_url || file.path,
    publicId: file.public_id || file.filename,
    resourceType: file.resource_type || 'image',
    format: file.format || '',
    mimeType: file.mimetype || '',
    originalName: file.originalname || '',
    size: Number(file.size || 0),
    width: Number(file.width || 0),
    height: Number(file.height || 0),
    status: 'temporary',
    expiresAt: new Date(Date.now() + TEMPORARY_ASSET_TTL_MS)
});

const registerTemporaryAsset = async ({ req, file, target }) => {
    if (!file?.path || !(file.public_id || file.filename)) {
        const error = new Error('Invalid uploaded Store Builder asset.');
        error.statusCode = 400;
        error.code = 'INVALID_ASSET';
        throw error;
    }
    try {
        return await StoreBuilderAsset.create(buildAssetDocument({ req, file, target }));
    } catch (error) {
        await cloudinary.uploader.destroy(file.public_id || file.filename, {
            resource_type: file.resource_type || 'image',
            invalidate: true
        }).catch(() => {});
        throw error;
    }
};

const assertThemeAssetOwnership = async ({ shopId, theme, session = null }) => {
    const references = adaptiveReferences(theme);
    if (references.assetIds.length) {
        const owned = await StoreBuilderAsset.find({ _id: { $in: references.assetIds }, shop_id: shopId,
            status: { $in: ['temporary', 'active', 'retired'] } }).select('_id').session(session).lean();
        if (owned.length !== references.assetIds.length) throw Object.assign(new Error('An adaptive image is unavailable or does not belong to this store.'), { statusCode: 403, code: 'ASSET_NOT_OWNED' });
    }
    if (references.productIds.length) {
        const count = await Product.countDocuments({ ...require('../products/publicProductQueryService').buildPublicProductQuery(shopId), _id: { $in: references.productIds } }).session(session);
        if (count !== references.productIds.length) throw Object.assign(new Error('A selected product is unavailable or belongs to another store.'), { statusCode: 403, code: 'PRODUCT_NOT_OWNED' });
    }
    const urls = extractThemeAssetUrls(theme);
    const socialAssetId = theme?.seo?.socialImageAssetId;
    if (socialAssetId) {
        if (!mongoose.Types.ObjectId.isValid(socialAssetId)) {
            const error = new Error('The social image asset reference is invalid.');
            error.statusCode = 400;
            error.code = 'INVALID_SOCIAL_IMAGE';
            throw error;
        }
        const socialAsset = await StoreBuilderAsset.findOne({
            _id: socialAssetId,
            shop_id: shopId,
            status: { $in: ['temporary', 'active', 'retired'] }
        }).session(session).lean();
        if (!socialAsset) {
            const error = new Error('The social image does not belong to this shop or is no longer available.');
            error.statusCode = 403;
            error.code = 'SOCIAL_IMAGE_NOT_OWNED';
            throw error;
        }
        if (String(socialAsset.url) !== String(theme?.seo?.socialImage || '')) {
            const error = new Error('The social image URL does not match the uploaded asset.');
            error.statusCode = 400;
            error.code = 'INVALID_SOCIAL_IMAGE';
            throw error;
        }
    }

    if (!urls.length) return [];

    const records = await StoreBuilderAsset.find({ url: { $in: urls } }).session(session).lean();
    const foreign = records.find(asset => String(asset.shop_id) !== String(shopId));
    if (foreign) {
        const error = new Error('One or more uploaded assets do not belong to this shop.');
        error.statusCode = 403;
        error.code = 'ASSET_NOT_OWNED';
        throw error;
    }
    if (records.some(asset => ['deleted', 'failed', 'deleting'].includes(asset.status))) throw Object.assign(new Error('A referenced image is no longer available.'), { code: 'ASSET_UNAVAILABLE', statusCode: 409 });

    return records.filter(asset => asset.status === 'temporary');
};

const restoreAssetStates = async ({ shopId, previousStates = [] }) => {
    if (!previousStates.length) return;
    await StoreBuilderAsset.bulkWrite(previousStates.map(asset => ({
        updateOne: {
            filter: { _id: asset._id, shop_id: shopId },
            update: {
                $set: {
                    status: asset.status,
                    expiresAt: asset.expiresAt || null,
                    promotedAt: asset.promotedAt || null,
                    retiredAt: asset.retiredAt || null,
                    cleanupAfter: asset.cleanupAfter || null
                }
            }
        }
    })), { ordered: false });
};

const promotePublishedAssets = async ({ shopId, beforeTheme, afterTheme, session = null }) => {
    await assertThemeAssetOwnership({ shopId, theme: afterTheme, session });
    const now = new Date();
    const beforeIds = await getThemeAssetIds({ shopId, theme: beforeTheme, session });
    const promotedIds = await getThemeAssetIds({ shopId, theme: afterTheme, session });
    const afterIds = new Set(promotedIds.map(String));
    const retiredIds = beforeIds.filter(id => !afterIds.has(String(id)));
    const affectedIds = [...beforeIds, ...promotedIds];
    let snapshotQuery = StoreBuilderAsset.find({ shop_id: shopId, _id: { $in: affectedIds } })
        .select('_id status expiresAt promotedAt retiredAt cleanupAfter')
        .lean();
    if (session) snapshotQuery = snapshotQuery.session(session);
    const previousStates = affectedIds.length ? await snapshotQuery : [];

    try {
        const promotionQuery = promotedIds.length
            ? StoreBuilderAsset.updateMany(
                { shop_id: shopId, _id: { $in: promotedIds }, status: { $in: ['temporary', 'active', 'retired'] } },
                { $set: { status: 'active', promotedAt: now, expiresAt: null, cleanupAfter: null, retiredAt: null }, $inc: { referenceRevision: 1 } }
            )
            : null;
        const retirementQuery = retiredIds.length
            ? StoreBuilderAsset.updateMany(
                { shop_id: shopId, _id: { $in: retiredIds }, status: 'active' },
                { $set: { status: 'retired', retiredAt: now, cleanupAfter: new Date(now.getTime() + RETIRED_ASSET_GRACE_MS) }, $inc: { referenceRevision: 1 } }
            )
            : null;
        if (session) {
            promotionQuery?.session(session);
            retirementQuery?.session(session);
        }
        const promoted = promotionQuery ? await promotionQuery : null;
        if (promoted && promoted.matchedCount !== promotedIds.length) throw Object.assign(new Error('Media changed while publishing. Retry from the current draft.'), { code: 'ASSET_CONFLICT', statusCode: 409 });
        if (retirementQuery) await retirementQuery;
        return { previousStates };
    } catch (error) {
        if (!session) {
            await restoreAssetStates({ shopId, previousStates }).catch(() => {});
        }
        throw error;
    }
};

const attachAssetsToDraft = async ({ shopId, draftId, theme, session = null }) => {
    await assertThemeAssetOwnership({ shopId, theme, session });
    const assetIds = await getThemeAssetIds({ shopId, theme, session });
    // Sequential operations on a Mongo session; metadata and graph commit together.
    const attached = await StoreBuilderAsset.updateMany({ shop_id: shopId, _id: { $in: assetIds }, status: { $in: ['temporary', 'active', 'retired'] } }, { $set: { draftId }, $inc: { referenceRevision: 1 } }).session(session);
    if (attached.matchedCount !== assetIds.length) throw Object.assign(new Error('Media changed while saving the draft.'), { code: 'ASSET_CONFLICT', statusCode: 409 });
    await StoreBuilderDraft.updateOne({ _id: draftId, shop_id: shopId }, { $set: { assetIds } }, { timestamps: false }).session(session);
    return assetIds;
};

const destroyAsset = async (asset) => {
    const originalStatus = asset.status === 'deleting' ? asset.cleanupFromStatus : asset.status;
    const claim = await StoreBuilderAsset.findOneAndUpdate({ _id: asset._id, shop_id: asset.shop_id,
        status: asset.status, updatedAt: asset.updatedAt, referenceRevision: asset.referenceRevision ?? { $exists: false } },
    { $set: { status: 'deleting', cleanupFromStatus: originalStatus, cleanupClaimedAt: new Date() }, $inc: { referenceRevision: 1 } }, { returnDocument: 'after' });
    if (!claim) return false;
    // Claims exclude new publication/attachment; the second reference check sees
    // any publication that won the race before the claim.
    try {
        if (await isAssetReferenced(claim)) {
            await StoreBuilderAsset.updateOne({ _id: claim._id, shop_id: claim.shop_id, status: 'deleting' }, { $set: { status: originalStatus, cleanupClaimedAt: null } });
            return false;
        }
    } catch (error) {
        await StoreBuilderAsset.updateOne({ _id: claim._id, shop_id: claim.shop_id, status: 'deleting' }, { $set: { status: originalStatus, cleanupClaimedAt: null } });
        throw error;
    }
    await cloudinary.uploader.destroy(asset.publicId, {
        resource_type: asset.resourceType || 'image',
        invalidate: true
    });
    await StoreBuilderAsset.updateOne({ _id: asset._id, shop_id: asset.shop_id, status: 'deleting' }, {
        $set: { status: 'deleted', expiresAt: null, cleanupAfter: null, cleanupClaimedAt: null }
    });
    return true;
};

const deleteTemporaryAsset = async ({ shopId, assetId }) => {
    const asset = await StoreBuilderAsset.findOne({ _id: assetId, shop_id: shopId });
    if (!asset) {
        const error = new Error('Store Builder asset not found.');
        error.statusCode = 404;
        throw error;
    }
    if (asset.status !== 'temporary') {
        const error = new Error('Published assets cannot be deleted from the draft media endpoint.');
        error.statusCode = 409;
        error.code = 'INVALID_ASSET';
        throw error;
    }
    if (await isAssetReferenced(asset)) throw Object.assign(new Error('This image is retained by a published design, draft or revision.'), { statusCode: 409, code: 'ASSET_REFERENCED' });
    if (asset.draftId) {
        await StoreBuilderDraft.updateOne(
            { _id: asset.draftId, shop_id: shopId },
            { $pull: { assetIds: asset._id } }
        );
    }
    if (!await destroyAsset(asset)) throw Object.assign(new Error('This image changed or became referenced. Reload before deleting it.'), { statusCode: 409, code: 'ASSET_CONFLICT' });
};

const cleanupExpiredStoreBuilderAssets = async ({ limit = 100 } = {}) => {
    const now = new Date();
    const candidates = await StoreBuilderAsset.find({
        status: { $in: ['temporary', 'retired', 'deleting'] },
        $or: [
            { status: 'temporary', expiresAt: { $lte: now } },
            { status: 'retired', cleanupAfter: { $lte: now } },
            { status: 'deleting', cleanupClaimedAt: { $lte: new Date(now.getTime() - 60 * 60 * 1000) } }
        ]
    }).sort({ createdAt: 1 }).limit(Math.min(Math.max(Number(limit) || 100, 1), 500));

    let deleted = 0;
    let skipped = 0;
    let failed = 0;
    for (const asset of candidates) {
        // Fail closed on malformed historical snapshots or unavailable MongoDB.
        // Never destroy an asset whose references cannot be established.
        let retained;
        try { retained = await isAssetReferenced(asset); }
        catch { failed += 1; continue; }
        const attachedDraft = asset.status === 'temporary'
            ? await StoreBuilderDraft.exists({ shop_id: asset.shop_id, assetIds: asset._id })
            : null;
        if (attachedDraft) {
            skipped += 1;
            await StoreBuilderAsset.updateOne(
                { _id: asset._id, shop_id: asset.shop_id },
                { $set: { expiresAt: new Date(now.getTime() + TEMPORARY_ASSET_TTL_MS) } }
            );
            continue;
        }
        const referenced = await Shop.exists({
            _id: asset.shop_id,
            $or: [
                { 'branding.logoAssetId': asset._id },
                { 'branding.faviconAssetId': asset._id },
                { 'branding.heroImageAssetId': asset._id },
                { 'theme.logoUrl': asset.url },
                { 'theme.faviconUrl': asset.url },
                { 'theme.checkoutBranding.logoUrl': asset.url },
                { 'theme.hero.imageUrl': asset.url },
                { 'theme.hero.bannerSlides.desktopImage': asset.url },
                { 'theme.hero.bannerSlides.mobileImage': asset.url },
                { 'theme.seo.socialImage': asset.url },
                { 'theme.homepageSections.settings.desktopImage': asset.url },
                { 'theme.homepageSections.settings.mobileImage': asset.url },
                { 'theme.homepageSections.settings.desktopImages': asset.url },
                { 'theme.homepageSections.settings.mobileImages': asset.url },
                { 'theme.homepageSections.settings.image': asset.url },
                { 'theme.homepageSections.settings.imageUrl': asset.url }
            ]
        });
        if (referenced) {
            skipped += 1;
            if (asset.status !== 'active') {
                await StoreBuilderAsset.updateOne({ _id: asset._id, shop_id: asset.shop_id }, { $set: { status: 'active', expiresAt: null, cleanupAfter: null } });
            }
            continue;
        }
        if (retained) { skipped += 1; continue; }
        try {
            if (await destroyAsset(asset)) deleted += 1;
            else skipped += 1;
        } catch (error) {
            failed += 1;
            await StoreBuilderAsset.updateOne(
                { _id: asset._id, shop_id: asset.shop_id },
                { $set: asset.status === 'temporary'
                    ? { expiresAt: new Date(now.getTime() + 60 * 60 * 1000) }
                    : { cleanupAfter: new Date(now.getTime() + 60 * 60 * 1000) } }
            );
        }
    }
    return { scanned: candidates.length, deleted, skipped, failed };
};

module.exports = {
    themeReferences,
    getThemeAssetIds,
    isAssetReferenced,
    TEMPORARY_ASSET_TTL_MS,
    RETIRED_ASSET_GRACE_MS,
    registerTemporaryAsset,
    assertThemeAssetOwnership,
    promotePublishedAssets,
    restoreAssetStates,
    attachAssetsToDraft,
    deleteTemporaryAsset,
    cleanupExpiredStoreBuilderAssets
};
