const LIMIT = 50;
const error = (code, message, statusCode = 400) => Object.assign(new Error(message), { code, statusCode });
const cleanText = (value, max) => {
    if (typeof value !== 'string' || value.length > max) throw error('AI_CONTENT_INVALID', 'Check the text fields and their length limits.');
    return value.normalize('NFC').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
};
const textFields = (value, fields) => Object.fromEntries(Object.entries(fields).filter(([key]) => value?.[key] !== undefined)
    .map(([key, max]) => [key, cleanText(value[key], max)]));
const readyIndexes = new WeakMap();
const requireContentIndexes = async Model => {
    const client = Model.db.getClient();
    let checks = readyIndexes.get(client);
    if (!checks) { checks = new Map(); readyIndexes.set(client, checks); }
    if (!checks.has(Model.modelName)) checks.set(Model.modelName, (async () => {
        const indexes = await Model.collection.indexes();
        if (!indexes.some(index => index.unique && index.key.shopId === 1 && index.key.slot === 1)
            || !indexes.some(index => index.key.expiresAt === 1 && index.expireAfterSeconds === 0)) throw new Error('Missing content indexes');
        if (Model.modelName === 'AiContentHistory' && !indexes.some(index => index.unique && index.key.shopId === 1 && index.key.feature === 1 && index.key.operationId === 1)) throw new Error('Missing history identity index');
    })());
    try { await checks.get(Model.modelName); }
    catch { checks.delete(Model.modelName); throw error('AI_CONTENT_SETUP_REQUIRED', 'Saved suggestions are temporarily unavailable. Contact support.', 503); }
};
// Fixed slots enforce the tenant cap even when many creates race on standalone MongoDB.
const createBoundedContent = async (Model, data) => {
    await requireContentIndexes(Model);
    await Model.deleteMany({ shopId: data.shopId, expiresAt: { $lte: new Date() } });
    for (let retry = 0; retry < LIMIT; retry++) {
        const occupied = new Set((await Model.find({ shopId: data.shopId }).select('slot').lean()).map(row => row.slot));
        const slot = Array.from({ length: LIMIT }, (_, index) => index).find(index => !occupied.has(index));
        if (slot === undefined) throw error('AI_CONTENT_CAPACITY', 'This store has 50 saved items. Delete an older item before saving another.', 409);
        try { return await Model.create({ ...data, slot }); }
        catch (err) { if (err.code !== 11000 || !err.keyPattern?.slot) throw err; }
    }
    throw error('AI_CONTENT_CAPACITY', 'Another item is being saved. Please retry.', 409);
};
const provenance = (row, meta = {}) => ({ source: row.source, provider: row.provenance?.provider || 'unknown_legacy', operationId: row.requestId, promptId: row.provenance?.promptId,
    promptVersion: row.provenance?.promptVersion, language: meta.language || 'auto', preferenceVersion: meta.preferenceVersion || 0,
    generatedAt: row.createdAt, fieldOrigins: meta.fieldOrigins || {} });
module.exports = { LIMIT, error, cleanText, textFields, createBoundedContent, provenance, requireContentIndexes };
