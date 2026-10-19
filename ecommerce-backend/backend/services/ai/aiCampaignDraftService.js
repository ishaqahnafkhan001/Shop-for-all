const Draft = require('../../models/AiCampaignDraft');
const Ledger = require('../../models/AiGenerationRequest');
const { ownedProduct } = require('./aiEntityService');
const { error, cleanText, textFields, createBoundedContent, provenance } = require('./aiContentStorage');
const TEXT_FIELDS = { primaryText: 2500, headline: 160, description: 500, callToAction: 30 };
const CTAS = ['Shop Now', 'Order Now', 'Learn More', 'Send Message'];
const live = shopId => ({ shopId, expiresAt: { $gt: new Date() } });
const expires = () => new Date(Date.now() + 90 * 86400000);
const snapshot = product => ({ title: product.title, sellingPrice: Number(product.pricing?.sellingPrice || 0), version: new Date(product.updatedAt).toISOString() });
const normalizeContent = value => {
    const content = textFields(value, TEXT_FIELDS);
    if (Object.keys(content).length !== 4 || !CTAS.includes(content.callToAction)) throw error('AI_CONTENT_INVALID', 'Provide all four copy fields and a supported call to action.');
    return content;
};
const getDraft = async (shopId, id) => {
    if (!require('mongoose').isValidObjectId(id)) throw error('AI_DRAFT_NOT_FOUND', 'Campaign draft not found.', 404);
    const draft = await Draft.findOne({ ...live(shopId), _id: id }).lean();
    if (!draft) throw error('AI_DRAFT_NOT_FOUND', 'Campaign draft not found.', 404);
    const product = await ownedProduct(shopId, draft.productId);
    return { draft, product };
};
const present = (draft, product) => ({ ...draft, currentProduct: snapshot(product),
    productChanged: draft.evidence?.product?.version !== new Date(product.updatedAt).toISOString(),
    evidenceStale: !draft.evidence?.interval?.to || Date.now() - new Date(draft.evidence.interval.to).getTime() > 86400000 });
const listDrafts = async (shopId, productId) => {
    const product = await ownedProduct(shopId, productId);
    return (await Draft.find({ ...live(shopId), productId }).sort({ updatedAt: -1 }).limit(50).lean()).map(draft => present(draft, product));
};
const sourceFor = async (shopId, productId, operationId, content, previous, product, appliedFields = [], manualFields = []) => {
    if (![appliedFields, manualFields].every(fields => Array.isArray(fields) && fields.length <= 4 && fields.every(key => Object.hasOwn(TEXT_FIELDS, key)))) throw error('AI_CONTENT_INVALID', 'Choose supported text fields.');
    let row;
    if (operationId) {
        if (typeof operationId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,119}$/.test(operationId)) throw error('AI_CONTENT_INVALID', 'Invalid generation reference.');
        row = await Ledger.findOne({ shopId, feature: 'growth.ad_planning', entityId: String(productId), requestId: operationId, status: 'completed' }).lean();
        if (!row) throw error('AI_DRAFT_SOURCE_EXPIRED', 'This generation reference expired. Keep editing the existing draft or generate again.', 409);
    }
    const result = row?.result?.data;
    const meta = result?.meta || {};
    const fieldOrigins = {};
    for (const key of Object.keys(TEXT_FIELDS)) {
        fieldOrigins[key] = manualFields.includes(key) ? { source: 'manual' } : result && appliedFields.includes(key) && content[key] === result[key]
            ? { ...provenance(row, meta), source: meta.fieldOrigins?.[key] || row.source }
            : previous?.content[key] === content[key] ? previous.provenance.fieldOrigins?.[key] || { source: 'unknown_legacy' } : { source: 'manual' };
    }
    const list = (value, limit, max) => Array.isArray(value) ? value.slice(0, limit).filter(item => typeof item === 'string').map(item => cleanText(item, max)) : [];
    const sources = new Set(Object.values(fieldOrigins).map(origin => origin.source));
    return {
        provenance: { source: sources.size === 1 ? [...sources][0] : 'mixed', fieldOrigins },
        evidence: row ? {
            interval: meta.evidenceWindow, product: meta.productSnapshot || snapshot(product),
            language: meta.language || 'auto', campaignType: 'general', generatedAt: meta.generatedAt || row.createdAt,
            activitySufficiency: ['low', 'medium', 'high'].includes(result.confidence) ? result.confidence : 'limited',
            interests: list(result.suggestedInterests, 12, 100),
            locations: list(result.suggestedLocationFocus, 5, 60).filter(item => Object.values(require('./growthAiContext').REGION_ALIASES).includes(item)),
            advisoryAudience: typeof result.targetedCustomer === 'string' ? cleanText(result.targetedCustomer, 700) : '',
            limitations: list(meta.limitations, 8, 600)
        } : previous?.evidence || { product: snapshot(product), interval: null, language: 'auto', campaignType: 'general', activitySufficiency: 'limited', limitations: ['Manual planning draft; no generated analytics evidence.'] }
    };
};
const saveDraft = async ({ shopId, actorId, id, input }) => {
    const previous = id ? (await getDraft(shopId, id)).draft : null;
    const productId = previous?.productId || input.productId;
    const product = await ownedProduct(shopId, productId);
    if (previous && input.version !== previous.version) throw error('AI_DRAFT_CONFLICT', 'This draft changed in another session. Reload before saving.', 409);
    const content = normalizeContent(input.content);
    const name = cleanText(input.name, 100);
    if (!name || !['draft', 'archived'].includes(input.status || 'draft')) throw error('AI_CONTENT_INVALID', 'Add a draft name and valid status.');
    const source = await sourceFor(shopId, productId, input.operationId, content, previous, product, input.appliedFields, input.manualFields);
    const data = { name, content, ...source, status: input.status || 'draft', expiresAt: expires() };
    if (!previous) return present((await createBoundedContent(Draft, { ...data, shopId, actorId, productId })).toObject(), product);
    const updated = await Draft.findOneAndUpdate({ ...live(shopId), _id: id, version: input.version }, { $set: data, $inc: { version: 1 } }, { returnDocument: 'after', runValidators: true }).lean();
    if (!updated) throw error('AI_DRAFT_CONFLICT', 'This draft changed in another session. Reload before saving.', 409);
    return present(updated, product);
};
const duplicateDraft = async (shopId, id, actorId) => {
    const { draft, product } = await getDraft(shopId, id);
    const copy = await createBoundedContent(Draft, { shopId, actorId, productId: draft.productId, name: `${draft.name.slice(0, 93)} (copy)`,
        content: draft.content, evidence: draft.evidence, provenance: draft.provenance, status: 'draft', expiresAt: expires() });
    return present(copy.toObject(), product);
};
module.exports = { Draft, TEXT_FIELDS, normalizeContent, listDrafts, getDraft, saveDraft, duplicateDraft };
