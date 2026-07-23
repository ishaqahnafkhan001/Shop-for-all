const StoreBuilderAsset = require('../../models/StoreBuilderAsset');
const StoreBuilderDraft = require('../../models/StoreBuilderDraft');
const Shop = require('../../models/Shop');
const mongoose = require('mongoose');
const { cloudinary } = require('../../config/cloudinary');
const { extractThemeAssetUrls } = require('@scaleup/storefront-theme');

const TEMPORARY_ASSET_TTL_MS = 24 * 60 * 60 * 1000;
const RETIRED_ASSET_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

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

const assertThemeAssetOwnership = async ({ shopId, theme }) => {
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
            status: { $in: ['temporary', 'active'] }
        }).lean();
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

    const records = await StoreBuilderAsset.find({ url: { $in: urls } }).lean();
    const foreign = records.find(asset => String(asset.shop_id) !== String(shopId));
    if (foreign) {
        const error = new Error('One or more uploaded assets do not belong to this shop.');
        error.statusCode = 403;
        error.code = 'ASSET_NOT_OWNED';
        throw error;
    }

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
    const now = new Date();
    const beforeUrls = new Set(extractThemeAssetUrls(beforeTheme));
    const afterUrls = new Set(extractThemeAssetUrls(afterTheme));
    const promotedUrls = [...afterUrls];
    const retiredUrls = [...beforeUrls].filter(url => !afterUrls.has(url));
    const affectedUrls = [...new Set([...promotedUrls, ...retiredUrls])];
    let snapshotQuery = StoreBuilderAsset.find({ shop_id: shopId, url: { $in: affectedUrls } })
        .select('_id status expiresAt promotedAt retiredAt cleanupAfter')
        .lean();
    if (session) snapshotQuery = snapshotQuery.session(session);
    const previousStates = affectedUrls.length ? await snapshotQuery : [];

    try {
        const promotionQuery = promotedUrls.length
            ? StoreBuilderAsset.updateMany(
                { shop_id: shopId, url: { $in: promotedUrls }, status: 'temporary' },
                { $set: { status: 'active', promotedAt: now, expiresAt: null, cleanupAfter: null } }
            )
            : null;
        const retirementQuery = retiredUrls.length
            ? StoreBuilderAsset.updateMany(
                { shop_id: shopId, url: { $in: retiredUrls }, status: 'active' },
                { $set: { status: 'retired', retiredAt: now, cleanupAfter: new Date(now.getTime() + RETIRED_ASSET_GRACE_MS) } }
            )
            : null;
        if (session) {
            promotionQuery?.session(session);
            retirementQuery?.session(session);
        }
        await Promise.all([promotionQuery, retirementQuery].filter(Boolean));
        return { previousStates };
    } catch (error) {
        if (!session) {
            await restoreAssetStates({ shopId, previousStates }).catch(() => {});
        }
        throw error;
    }
};

const attachAssetsToDraft = async ({ shopId, draftId, theme }) => {
    const urls = extractThemeAssetUrls(theme);
    if (!urls.length) return [];
    const assets = await StoreBuilderAsset.find({ shop_id: shopId, url: { $in: urls }, status: 'temporary' }).select('_id').lean();
    const assetIds = assets.map(asset => asset._id);
    await Promise.all([
        StoreBuilderAsset.updateMany({ _id: { $in: assetIds } }, { $set: { draftId } }),
        StoreBuilderDraft.updateOne({ _id: draftId, shop_id: shopId }, { $set: { assetIds } })
    ]);
    return assetIds;
};

const destroyAsset = async (asset) => {
    await cloudinary.uploader.destroy(asset.publicId, {
        resource_type: asset.resourceType || 'image',
        invalidate: true
    });
    await StoreBuilderAsset.updateOne({ _id: asset._id }, {
        $set: { status: 'deleted', expiresAt: null, cleanupAfter: null }
    });
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
    if (asset.draftId) {
        await StoreBuilderDraft.updateOne(
            { _id: asset.draftId, shop_id: shopId },
            { $pull: { assetIds: asset._id } }
        );
    }
    await destroyAsset(asset);
};

const cleanupExpiredStoreBuilderAssets = async ({ limit = 100 } = {}) => {
    const now = new Date();
    const candidates = await StoreBuilderAsset.find({
        status: { $in: ['temporary', 'retired'] },
        $or: [
            { status: 'temporary', expiresAt: { $lte: now } },
            { status: 'retired', cleanupAfter: { $lte: now } }
        ]
    }).sort({ createdAt: 1 }).limit(Math.min(Math.max(Number(limit) || 100, 1), 500));

    let deleted = 0;
    let skipped = 0;
    let failed = 0;
    for (const asset of candidates) {
        const attachedDraft = asset.status === 'temporary'
            ? await StoreBuilderDraft.exists({ shop_id: asset.shop_id, assetIds: asset._id })
            : null;
        if (attachedDraft) {
            skipped += 1;
            await StoreBuilderAsset.updateOne(
                { _id: asset._id },
                { $set: { expiresAt: new Date(now.getTime() + TEMPORARY_ASSET_TTL_MS) } }
            );
            continue;
        }
        const referenced = await Shop.exists({
            _id: asset.shop_id,
            $or: [
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
                await StoreBuilderAsset.updateOne({ _id: asset._id }, { $set: { status: 'active', expiresAt: null, cleanupAfter: null } });
            }
            continue;
        }
        try {
            await destroyAsset(asset);
            deleted += 1;
        } catch (error) {
            failed += 1;
            await StoreBuilderAsset.updateOne(
                { _id: asset._id },
                { $set: asset.status === 'temporary'
                    ? { expiresAt: new Date(now.getTime() + 60 * 60 * 1000) }
                    : { cleanupAfter: new Date(now.getTime() + 60 * 60 * 1000) } }
            );
        }
    }
    return { scanned: candidates.length, deleted, skipped, failed };
};

module.exports = {
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
