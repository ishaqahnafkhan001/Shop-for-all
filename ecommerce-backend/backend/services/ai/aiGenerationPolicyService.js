const crypto = require('crypto');
const AiGenerationRequest = require('../../models/AiGenerationRequest');
const { getShopPlanAccess } = require('../billing/planAccessService');
const {
    reserveWeeklyAiUsage,
    completeWeeklyAiUsage,
    releaseWeeklyAiUsage,
    getWeeklyAiUsage
} = require('../billing/planUsageService');
const { SUBSCRIPTION_EVENTS, emitSubscriptionEvent } = require('../billing/subscriptionEvents');

const RETENTION_HOURS = 24;
const REQUEST_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,119}$/;

const cleanRequestId = (value = '') => {
    const candidate = String(value || '').trim();
    return REQUEST_ID_PATTERN.test(candidate) ? candidate : '';
};

const getAiRequestId = (req) => cleanRequestId(
    req.get?.('x-ai-request-id') || req.body?.requestId || req.body?.generationRequestId
) || `legacy-${cleanRequestId(req.id || req.requestId) || crypto.randomUUID()}`;

const findExisting = ({ shopId, feature, requestId }) => AiGenerationRequest.findOne({
    shopId,
    feature,
    requestId
}).lean();

const duplicateState = (record) => {
    const state = record?.status || 'in_progress';
    const error = new Error(state === 'completed'
        ? 'This AI request has already finished.'
        : state === 'failed'
            ? 'This AI request failed. Start a new request to try again.'
            : 'This AI request is already being processed.');
    error.code = state === 'completed'
        ? 'AI_REQUEST_REPLAY'
        : state === 'failed'
            ? 'AI_REQUEST_FAILED'
            : 'AI_REQUEST_IN_PROGRESS';
    error.statusCode = state === 'completed' ? 200 : 409;
    error.existing = record;
    return error;
};

const beginAiGeneration = async ({ req, feature }) => {
    const context = req.planAccess || await getShopPlanAccess(req.tenantId);
    const requestId = getAiRequestId(req);
    const expiresAt = new Date(Date.now() + RETENTION_HOURS * 60 * 60 * 1000);
    let record;

    try {
        record = await AiGenerationRequest.create({
            shopId: req.tenantId,
            actorId: req.user?._id || req.user?.id || null,
            feature,
            requestId,
            expiresAt
        });
    } catch (error) {
        if (error?.code !== 11000) throw error;
        const existing = await findExisting({ shopId: req.tenantId, feature, requestId });
        throw duplicateState(existing || { status: 'in_progress' });
    }

    let reservation;
    try {
        reservation = await reserveWeeklyAiUsage({
            shopId: req.tenantId,
            limit: context.limits.aiProductCreationsPerWeek
        });
        record.status = 'in_progress';
        await record.save();
    } catch (error) {
        await AiGenerationRequest.deleteOne({ _id: record._id }).catch(() => {});
        throw error;
    }

    return {
        context,
        feature,
        requestId,
        recordId: record._id,
        reservation,
        startedAt: Date.now()
    };
};

const completeAiGeneration = async ({ req, state, result, meta = {} }) => {
    if (!state) return null;
    const source = meta.source === 'provider' ? 'provider' : 'deterministic_fallback';
    if (source === 'provider') await completeWeeklyAiUsage(state.reservation);
    else await releaseWeeklyAiUsage(state.reservation);

    const usage = await getWeeklyAiUsage({
        shopId: req.tenantId,
        limit: state.context.limits.aiProductCreationsPerWeek
    });
    await AiGenerationRequest.updateOne(
        { _id: state.recordId, shopId: req.tenantId },
        {
            $set: {
                status: 'completed',
                source,
                result,
                safeErrorCode: meta.errorCode || '',
                provenance: {
                    promptId: meta.promptId || state.feature,
                    promptVersion: meta.promptVersion || '',
                    model: source === 'provider' ? String(meta.model || '') : '',
                    latencyMs: Math.max(0, Date.now() - state.startedAt)
                }
            }
        }
    );

    if (source === 'provider') {
        await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.USAGE_CHANGED, {
            req,
            shopId: req.tenantId,
            subscriptionId: state.context.subscription?._id,
            planKey: state.context.planKey,
            affectedResources: ['aiGeneration'],
            metadata: { action: 'ai_generation', feature: state.feature, resource: 'aiGeneration', usage }
        });
    }
    return usage;
};

const failAiGeneration = async ({ req, state, error }) => {
    if (!state) return;
    await releaseWeeklyAiUsage(state.reservation);
    await AiGenerationRequest.updateOne(
        { _id: state.recordId, shopId: req.tenantId },
        {
            $set: {
                status: 'failed',
                source: 'none',
                safeErrorCode: String(error?.code || 'AI_PROVIDER_FAILED').slice(0, 80),
                'provenance.latencyMs': Math.max(0, Date.now() - state.startedAt)
            }
        }
    ).catch(() => {});
};

const getReplayResponse = (error) => error?.code === 'AI_REQUEST_REPLAY'
    ? error.existing?.result || null
    : null;

module.exports = {
    beginAiGeneration,
    completeAiGeneration,
    failAiGeneration,
    getReplayResponse,
    getAiRequestId,
    __test: { cleanRequestId, duplicateState, RETENTION_HOURS }
};
