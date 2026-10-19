const draftConflict = () => Object.assign(new Error('This draft changed in another session. Reload before saving or discarding it.'), {
    statusCode: 409, code: 'DRAFT_CONFLICT',
});

const draftWriteFilter = (shopId, expectedUpdatedAt) => {
    const filter = { shop_id: shopId };
    // Older clients remain supported. New clients always send null or an ISO token.
    if (expectedUpdatedAt === undefined) return filter;
    if (expectedUpdatedAt === null) return { ...filter, updatedAt: { $exists: false } };
    const date = new Date(expectedUpdatedAt);
    if (typeof expectedUpdatedAt !== 'string' || !Number.isFinite(date.getTime())) {
        throw Object.assign(new Error('Invalid draft version.'), { statusCode: 400, code: 'INVALID_DRAFT_VERSION' });
    }
    return { ...filter, updatedAt: date };
};

const assertDraftTenant = (req) => {
    if (req.body?.expectedShopId !== undefined && String(req.body.expectedShopId) !== String(req.tenantId)) {
        throw Object.assign(new Error('The active store changed. Reload the Store Builder.'), { statusCode: 409, code: 'TENANT_CHANGED' });
    }
};

module.exports = { draftConflict, draftWriteFilter, assertDraftTenant };
