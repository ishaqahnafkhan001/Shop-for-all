const History = require('../../models/AiContentHistory');
const Ledger = require('../../models/AiGenerationRequest');
const { ownedProduct, productText } = require('./aiEntityService');
const { error, textFields, createBoundedContent, provenance } = require('./aiContentStorage');
const FIELDS = { description: 4000, seoTitle: 160, seoDescription: 500, imageAlt: 300 };
const live = shopId => ({ shopId, expiresAt: { $gt: new Date() } });
const version = product => new Date(product.updatedAt).toISOString();
const getEntry = async (shopId, id) => {
    if (!require('mongoose').isValidObjectId(id)) throw error('AI_HISTORY_NOT_FOUND', 'Saved suggestion not found.', 404);
    const entry = await History.findOne({ ...live(shopId), _id: id }).lean();
    if (!entry) throw error('AI_HISTORY_NOT_FOUND', 'Saved suggestion not found.', 404);
    const product = await ownedProduct(shopId, entry.entityId);
    return { entry, product };
};
const saveHistory = async ({ shopId, actorId, entityId, operationId }) => {
    await ownedProduct(shopId, entityId);
    if (typeof operationId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,119}$/.test(operationId)) throw error('AI_CONTENT_INVALID', 'Invalid generation reference.');
    const existing = await History.findOne({ ...live(shopId), feature: 'product.content', operationId }).lean();
    if (existing) {
        if (String(existing.entityId) !== String(entityId)) throw error('AI_CONTENT_INVALID', 'This suggestion belongs to another product.');
        return existing;
    }
    const row = await Ledger.findOne({ shopId, feature: 'product.content', entityId: String(entityId), requestId: operationId, status: 'completed' }).lean();
    if (!row) throw error('AI_HISTORY_UNAVAILABLE', 'This suggestion is no longer available to save. Generate another suggestion.', 404);
    const sections = row.result?.meta?.requestedSections;
    const allowed = Array.isArray(sections) ? Object.fromEntries(Object.entries(FIELDS).filter(([key]) => sections.includes(key) || key.startsWith('seo') && sections.includes('seo'))) : FIELDS;
    const content = textFields(row.result?.data, allowed);
    if (!Object.values(content).some(Boolean)) throw error('AI_HISTORY_EMPTY', 'This suggestion has no description, SEO or image ALT text to save.');
    const data = { shopId, actorId, entityId, feature: 'product.content', operationId, content, entityVersion: row.entityVersion,
        provenance: provenance(row, row.result?.meta), expiresAt: new Date(Date.now() + 30 * 86400000) };
    try { return await createBoundedContent(History, data); }
    catch (err) { if (err.code === 11000) { const duplicate = await History.findOne({ ...live(shopId), operationId, feature: 'product.content' }).lean(); if (duplicate) return duplicate; } throw err; }
};
const listHistory = async (shopId, entityId) => {
    await ownedProduct(shopId, entityId);
    return History.find({ ...live(shopId), entityId }).sort({ createdAt: -1 }).limit(50).lean();
};
const reviewHistory = async (shopId, id) => {
    const { entry, product } = await getEntry(shopId, id);
    return { entry, current: productText(product), currentVersion: version(product), stale: entry.entityVersion !== version(product) };
};
const recordApply = async (shopId, id, { currentVersion, fields, edited = false }, actorId) => {
    const { entry, product } = await getEntry(shopId, id);
    if (version(product) !== currentVersion) throw error('AI_HISTORY_STALE', 'The saved product changed. Review the current product before applying again.', 409);
    if (!Array.isArray(fields) || !fields.length || fields.length > 4 || fields.some(key => !Object.hasOwn(FIELDS, key) || !entry.content[key])) throw error('AI_CONTENT_INVALID', 'Select only saved public text fields.');
    const updated = await History.updateOne({ ...live(shopId), _id: id }, { $set: { application: { state: 'applied_to_form', edited: Boolean(edited), fields: [...new Set(fields)], actorId, currentVersion, at: new Date() } } });
    if (!updated.matchedCount) throw error('AI_HISTORY_NOT_FOUND', 'Saved suggestion no longer exists.', 404);
};
// A saved event is confirmed only after the normal Product transaction committed.
const confirmProductSave = async (shopId, product, actorId) => {
    try {
        const current = productText(product);
        const entries = await History.find({ ...live(shopId), entityId: product._id, 'application.state': 'applied_to_form', 'application.edited': false, 'application.actorId': actorId }).limit(50).lean();
        for (const entry of entries) {
            if (entry.application.fields.every(key => current[key] === entry.content[key])) await History.updateOne({ ...live(shopId), _id: entry._id, 'application.at': entry.application.at }, {
                $set: { 'application.state': 'saved', 'application.savedAt': new Date(), 'application.savedVersion': version(product) }
            });
        }
    } catch { /* History analytics never changes a successful domain save. */ }
};
module.exports = { FIELDS, History, getEntry, saveHistory, listHistory, reviewHistory, recordApply, confirmProductSave };
