const Shop = require('../models/Shop');
const { getPreferences, normalizePreferences } = require('../services/ai/aiPreferencesService');
exports.get = async (req, res) => {
    try { res.json({ success: true, data: await getPreferences(req.tenantId) }); }
    catch (error) { res.status(error.statusCode || 503).json({ error: error.statusCode ? error.message : 'Preferences could not be loaded.' }); }
};
exports.save = async (req, res) => {
    try {
        const version = req.body?.version;
        if (!Number.isSafeInteger(version) || version < 0) return res.status(400).json({ error: 'A valid preference version is required.' });
        const preferences = normalizePreferences(req.body);
        const filter = { _id: req.tenantId, ...(version === 0 ? { $or: [{ 'aiPreferences.version': 0 }, { 'aiPreferences.version': { $exists: false } }] } : { 'aiPreferences.version': version }) };
        const data = { ...preferences, version: version + 1, updatedAt: new Date() };
        const result = await Shop.updateOne(filter, { $set: { aiPreferences: data } }, { runValidators: true });
        if (!result.matchedCount) return res.status(409).json({ error: 'Preferences changed in another session. Reload before saving.' });
        res.json({ success: true, data });
    } catch (error) { res.status(error.statusCode || 503).json({ error: error.statusCode ? error.message : 'Preferences could not be saved.' }); }
};
