const history = require('../services/ai/aiContentHistoryService');
const campaigns = require('../services/ai/aiCampaignDraftService');
const execute = fn => async (req, res) => {
    try { res.json({ success: true, data: await fn(req) }); }
    catch (error) { res.status(error.statusCode || 503).json({ success: false, code: error.code || 'AI_CONTENT_UNAVAILABLE', error: error.statusCode ? error.message : 'Saved content is temporarily unavailable.' }); }
};
exports.historyList = execute(req => history.listHistory(req.tenantId, req.query.entityId));
exports.historySave = execute(req => history.saveHistory({ shopId: req.tenantId, actorId: req.user._id, ...{ entityId: req.body.entityId, operationId: req.body.operationId } }));
exports.historyReview = execute(req => history.reviewHistory(req.tenantId, req.params.id));
exports.historyApply = execute(async req => { await history.recordApply(req.tenantId, req.params.id, req.body, req.user._id); return { state: 'applied_to_form' }; });
exports.historyFeedback = execute(async req => {
    const { entry } = await history.getEntry(req.tenantId, req.params.id);
    const reasons = history.History.schema.path('feedback').enumValues;
    if (!reasons.includes(req.body.reason)) throw Object.assign(new Error('Choose a supported feedback reason.'), { statusCode: 400 });
    await history.History.updateOne({ shopId: req.tenantId, _id: entry._id }, { $set: { feedback: req.body.reason } });
    return { reason: req.body.reason };
});
exports.historyDelete = execute(async req => { const { entry } = await history.getEntry(req.tenantId, req.params.id); await history.History.deleteOne({ shopId: req.tenantId, _id: entry._id }); return { deleted: true }; });
exports.campaignList = execute(req => campaigns.listDrafts(req.tenantId, req.query.productId));
exports.campaignSave = execute(req => campaigns.saveDraft({ shopId: req.tenantId, actorId: req.user._id, id: req.params.id, input: req.body }));
exports.campaignDuplicate = execute(req => campaigns.duplicateDraft(req.tenantId, req.params.id, req.user._id));
exports.campaignDelete = execute(async req => { const { draft } = await campaigns.getDraft(req.tenantId, req.params.id); await campaigns.Draft.deleteOne({ shopId: req.tenantId, _id: draft._id }); return { deleted: true }; });
