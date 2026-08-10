const SlugRedirect = require('../../models/SlugRedirect');

const MAX_HISTORY_PER_RESOURCE = 10;

const normalizeHistoricalSlug = value => {
    try {
        return decodeURIComponent(String(value || ''))
            .normalize('NFKC')
            .trim()
            .toLowerCase()
            .replace(/^\/+|\/+$/g, '')
            .slice(0, 160);
    } catch {
        return String(value || '').normalize('NFKC').trim().toLowerCase().slice(0, 160);
    }
};

const assertHistoricalSlugAvailable = async ({ shopId, resourceType, slug, resourceId = null, session = null }) => {
    const oldSlug = normalizeHistoricalSlug(slug);
    if (!oldSlug) return;
    const collision = await SlugRedirect.findOne({
        shop_id: shopId,
        resourceType,
        oldSlug,
        ...(resourceId ? { resourceId: { $ne: resourceId } } : {})
    }).select('_id').session(session || null).lean();
    if (collision) {
        const error = new Error('This URL was previously used by another item. Choose a different slug.');
        error.code = 'SLUG_HISTORY_COLLISION';
        throw error;
    }
};

const recordSlugRedirect = async ({ shopId, resourceType, resourceId, oldSlug, newSlug, session = null }) => {
    const normalizedOld = normalizeHistoricalSlug(oldSlug);
    const normalizedNew = normalizeHistoricalSlug(newSlug);
    if (!normalizedOld || !normalizedNew || normalizedOld === normalizedNew) return null;

    await assertHistoricalSlugAvailable({ shopId, resourceType, slug: normalizedOld, resourceId, session });
    const redirect = await SlugRedirect.findOneAndUpdate(
        { shop_id: shopId, resourceType, oldSlug: normalizedOld },
        { $set: { resourceId } },
        { new: true, upsert: true, runValidators: true, session: session || undefined }
    );
    const stale = await SlugRedirect.find({ shop_id: shopId, resourceType, resourceId })
        .sort({ createdAt: -1, _id: -1 })
        .skip(MAX_HISTORY_PER_RESOURCE)
        .select('_id')
        .session(session || null)
        .lean();
    if (stale.length) {
        await SlugRedirect.deleteMany({ _id: { $in: stale.map(item => item._id) } }).session(session || null);
    }
    return redirect;
};

const resolveSlugRedirect = async ({ shopId, resourceType, oldSlug }) => (
    SlugRedirect.findOne({
        shop_id: shopId,
        resourceType,
        oldSlug: normalizeHistoricalSlug(oldSlug)
    }).select('resourceId oldSlug').lean()
);

module.exports = {
    MAX_HISTORY_PER_RESOURCE,
    normalizeHistoricalSlug,
    assertHistoricalSlugAvailable,
    recordSlugRedirect,
    resolveSlugRedirect
};
