const crypto = require('crypto');
const AiGenerationRequest = require('../../models/AiGenerationRequest');
const { getAiConfig } = require('../../config/ai');
const { hashRequest } = require('./aiOperationIdentity');
const { getPreferences, effectivePreferences } = require('./aiPreferencesService');
const { getShopPlanAccess } = require('../billing/planAccessService');
const { reserveWeeklyAiUsage, getWeeklyAiUsage, getUtcWeekWindow, accountingError } = require('../billing/planUsageService');
const { finalizeAiOperation, reconcileAiOperation, reconcileStaleAiOperations, identityFor } = require('./aiAccountingRecoveryService');
const { SUBSCRIPTION_EVENTS, emitSubscriptionEvent } = require('../billing/subscriptionEvents');
const RETENTION_HOURS = 24;
const REQUEST_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,119}$/;
const cleanRequestId = (value = '') => REQUEST_ID_PATTERN.test(String(value || '').trim()) ? String(value).trim() : '';
const getAiRequestId = (req) => cleanRequestId(req.get?.('x-ai-request-id') || req.body?.requestId || req.body?.generationRequestId)
    || `legacy-${cleanRequestId(req.id || req.requestId) || crypto.randomUUID()}`;
const duplicateState = (record) => {
    const state = record?.status;
    const error = accountingError(state === 'completed' ? 'AI_REQUEST_REPLAY' : state === 'failed' ? 'AI_REQUEST_FAILED' : 'AI_REQUEST_IN_PROGRESS',
        state === 'completed' ? 'This AI request has already finished.' : state === 'failed'
            ? 'This operation failed. Regenerate to start a new operation.' : 'This AI request is processing or recovering. Retry the same operation.',
        state === 'completed' ? 200 : 409);
    error.existing = record;
    return error;
};
const beginAiGeneration = async ({ req, feature }) => {
    const config = getAiConfig();
    if (config.accountingVersion !== 2) throw accountingError('AI_ACCOUNTING_CUTOVER_REQUIRED', 'AI generation is temporarily unavailable. Please contact support.');
    const context = req.planAccess || await getShopPlanAccess(req.tenantId);
    const requestId = getAiRequestId(req);
    const inputHash = hashRequest(req, feature);
    await reconcileStaleAiOperations({ shopId: req.tenantId, limit: 4 });
    const retry = await AiGenerationRequest.exists({ shopId: req.tenantId, feature, requestId });
    if (!retry && await AiGenerationRequest.exists({ shopId: req.tenantId, providerOutcome: 'unknown', cooldownUntil: { $gt: new Date() } })) {
        throw accountingError('AI_CAPACITY_PENDING', 'A previous provider request has an uncertain outcome. Retry shortly.', 409);
    }
    const entityId = feature === 'growth.ad_planning' ? req.body?.productId : feature === 'product.content' && req.body?.entityId !== 'new-product' ? req.body?.entityId : null;
    const entity = entityId ? await require('./aiEntityService').ownedProduct(req.tenantId, entityId) : null;
    const entityVersion = entity?.updatedAt ? new Date(entity.updatedAt).toISOString() : '';
    const preferences = effectivePreferences(await getPreferences(req.tenantId), req.body?.language || req.body?.languageHint);
    const { start, end } = getUtcWeekWindow();
    let record;
    try {
        record = await AiGenerationRequest.create({ shopId: req.tenantId, actorId: req.user?._id || req.user?.id || null,
            feature, requestId, inputHash, entityId: entityId || '', entityVersion, accountingVersion: 2, quotaPeriodStart: start, quotaPeriodEnd: end,
            deadline: new Date(Date.now() + config.operationTimeoutMs), fence: 1 });
    } catch (error) {
        if (error?.code !== 11000) throw error;
        let existing = await AiGenerationRequest.findOne({ shopId: req.tenantId, feature, requestId }).lean();
        if (existing?.inputHash && existing.inputHash !== inputHash) throw accountingError('AI_REQUEST_INPUT_CONFLICT', 'This operation ID belongs to different input. Regenerate to start a new operation.', 409);
        existing = await reconcileAiOperation(existing);
        const duplicate = duplicateState(existing);
        if (existing?.status === 'completed') duplicate.usage = await getWeeklyAiUsage({ shopId: req.tenantId, limit: context.limits.aiProductCreationsPerWeek });
        throw duplicate;
    }
    // Keep the durable ledger on every error, including an uncertain reserve write.
    // Recovery will close admission using the immutable database-clock deadline.
    const reservation = await reserveWeeklyAiUsage({ shopId: req.tenantId, limit: context.limits.aiProductCreationsPerWeek,
        owner: record._id, deadline: record.deadline, periodStart: start, periodEnd: end, fence: 1 });
    const running = await AiGenerationRequest.updateOne({ ...identityFor(record), status: 'reserving', fence: 1,
        $expr: { $gt: ['$deadline', '$$NOW'] } }, { $set: { status: 'in_progress' } });
    if (running.modifiedCount !== 1) throw accountingError('AI_REQUEST_IN_PROGRESS', 'This operation is recovering. Retry the same operation.', 409);
    const controller = new AbortController();
    req.res?.once('close', () => { if (!req.res.writableEnded) controller.abort(); });
    if (req.aborted) controller.abort();
    return { context, feature, requestId, recordId: record._id, reservation, deadline: record.deadline,
        signal: controller.signal, preferences, entityVersion, fence: 1, inputHash, startedAt: Date.now() };
};
const stateIdentity = (req, state) => ({ _id: state.recordId, shopId: req.tenantId, accountingVersion: 2 });
const completeAiGeneration = async ({ req, state, result, meta = {} }) => {
    if (!state) return null;
    const source = ['provider', 'mixed', 'manual', 'unknown_legacy'].includes(meta.source) ? meta.source : 'deterministic_fallback';
    // Until a mixed-output charging policy is approved, only wholly accepted provider output consumes a unit.
    await AiGenerationRequest.updateOne({ ...stateIdentity(req, state), status: 'in_progress', fence: state.fence,
        $expr: { $gt: ['$deadline', '$$NOW'] } }, { $set: {
        status: 'outcome_ready', outcome: 'completed', settlement: source === 'provider' ? 'consumed' : 'released',
        source, result, providerOutcome: 'known', safeErrorCode: meta.errorCode || '',
        provenance: { provider: meta.provider || '', promptId: meta.promptId || state.feature, promptVersion: meta.promptVersion || '',
            model: ['provider', 'mixed'].includes(source) ? String(meta.model || '') : '', latencyMs: Math.max(0, Date.now() - state.startedAt) }
    } });
    let record = await AiGenerationRequest.findOne(stateIdentity(req, state)).lean();
    record = await reconcileAiOperation(record);
    if (!record?.accountingAcknowledgedAt || record.status !== 'completed') throw accountingError('AI_RESULT_NOT_ACCEPTED', 'This operation expired or is recovering. Retry the same operation.', 409);
    const usage = await getWeeklyAiUsage({ shopId: req.tenantId, limit: state.context.limits.aiProductCreationsPerWeek });
    // Notifications have no authority over the already durable outcome/accounting.
    if (record.settlement === 'consumed') await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.USAGE_CHANGED, {
        req, shopId: req.tenantId, subscriptionId: state.context.subscription?._id, planKey: state.context.planKey,
        affectedResources: ['aiGeneration'], metadata: { action: 'ai_generation', feature: state.feature, resource: 'aiGeneration', usage }
    }).catch(() => {});
    return usage;
};
const failAiGeneration = async ({ req, state, error }) => {
    if (!state) return;
    try {
        const code = error?.causeCode || error?.code;
        const known = ['AI_NOT_CONFIGURED', 'AI_PROVIDER_BAD_REQUEST', 'AI_PROVIDER_AUTH_FAILED', 'AI_MODEL_NOT_FOUND',
            'AI_PROVIDER_RATE_LIMITED', 'AI_RESPONSE_EMPTY', 'AI_RESPONSE_PARSE_FAILED', 'INSUFFICIENT_PRODUCT_CONTEXT',
            'AI_RESPONSE_REFUSED', 'AI_RESPONSE_INCOMPLETE', 'AI_INVALID_INPUT', 'AI_INVALID_INTERVAL'].includes(code);
        await AiGenerationRequest.updateOne({ ...stateIdentity(req, state), status: 'in_progress', fence: state.fence }, {
            $set: { status: 'outcome_ready', outcome: 'failed', settlement: 'released', source: 'none',
                safeErrorCode: String(error?.code || 'AI_PROVIDER_FAILED').slice(0, 80),
                providerOutcome: known ? 'known' : 'unknown',
                cooldownUntil: known ? null : new Date(Date.now() + getAiConfig().unknownCooldownMs),
                'provenance.latencyMs': Math.max(0, Date.now() - state.startedAt) }
        });
        const record = await AiGenerationRequest.findOne(stateIdentity(req, state)).lean();
        await finalizeAiOperation(record);
    } catch (_) {
        // Unresolved rows have no TTL. The worker and bounded admission recovery retry.
    }
};
const getReplayResponse = (error) => error?.code === 'AI_REQUEST_REPLAY' && error.existing?.result
    ? { ...error.existing.result, usage: error.usage } : null;
module.exports = { beginAiGeneration, completeAiGeneration, failAiGeneration, getReplayResponse, getAiRequestId,
    __test: { cleanRequestId, duplicateState, RETENTION_HOURS } };
