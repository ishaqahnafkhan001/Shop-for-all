const Shop = require('../models/Shop');
const { logAudit } = require('../services/auditLogService');
const { districts, settingsFor, normalizeSettings, resolveRate, issueQuote } = require('../services/orders/shippingRateService');
exports.getRates = async (req, res) => {
    try {
        const shop = await Shop.findById(req.tenantId).select('deliveryRates').lean();
        if (!shop) return res.status(404).json({ success: false, error: 'Store not found' });
        res.json({ success: true, data: { ...settingsFor(shop), districts } });
    } catch { res.status(500).json({ success: false, error: 'Could not load delivery charges' }); }
};
exports.saveRates = async (req, res) => {
    try {
        const next = normalizeSettings(req.body);
        const versionMatch = req.body.version === 0 ? { $or: [{ 'deliveryRates.version': 0 }, { 'deliveryRates.version': { $exists: false } }] } : { 'deliveryRates.version': req.body.version };
        const shop = await Shop.findOneAndUpdate({ _id: req.tenantId, ...versionMatch }, { $set: { deliveryRates: next } }, { new: true, runValidators: true }).select('deliveryRates').lean();
        if (!shop) return res.status(409).json({ success: false, error: 'Delivery settings changed. Reload before saving.' });
        await logAudit({ req, shop_id: req.tenantId, action: 'shipping.delivery_rates.updated', entityType: 'Shop', entityId: req.tenantId, after: next });
        res.json({ success: true, data: { ...settingsFor(shop), districts } });
    } catch (error) { res.status(error.statusCode || 500).json({ success: false, error: error.statusCode ? error.message : 'Could not save delivery charges' }); }
};
exports.quote = async (req, res) => {
    try {
        const shop = await Shop.findById(req.tenantId).select('deliveryRates').lean();
        if (!shop) return res.status(404).json({ success: false, error: 'Store not found' });
        const rate = resolveRate(settingsFor(shop), req.query.district);
        res.json({ success: true, data: { ...rate, token: issueQuote(req.tenantId, rate) } });
    } catch (error) { res.status(error.statusCode || 500).json({ success: false, error: error.statusCode ? error.message : 'Could not calculate delivery charge' }); }
};
