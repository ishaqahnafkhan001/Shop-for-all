const { randomUUID } = require('node:crypto');
const OpenAI = require('openai');
const { getAiConfig } = require('../../config/ai');
const { hashSnapshot } = require('./aiOperationIdentity');

const providerError = (code, status) => Object.assign(new Error('AI generation is temporarily unavailable.'), { code, status });
const classifyProviderError = (error, signal) => {
    if (signal?.aborted) return signal.reason?.code || 'AI_OPERATION_CANCELLED';
    if (error instanceof OpenAI.APIUserAbortError) return 'AI_OPERATION_CANCELLED';
    if (error instanceof OpenAI.APIConnectionTimeoutError) return 'AI_PROVIDER_TIMEOUT';
    if (error instanceof OpenAI.APIConnectionError) return 'AI_PROVIDER_CONNECTION_FAILED';
    const status = Number(error?.status || 0);
    if (status === 400) return 'AI_PROVIDER_BAD_REQUEST';
    if (status === 401 || status === 403) return 'AI_PROVIDER_AUTH_FAILED';
    if (status === 404) return 'AI_MODEL_NOT_FOUND';
    if (status === 408 || status === 504) return 'AI_PROVIDER_TIMEOUT';
    if (status === 429) return 'AI_PROVIDER_RATE_LIMITED';
    if (status >= 500) return 'AI_PROVIDER_UNAVAILABLE';
    return error?.code?.startsWith('AI_') ? error.code : 'AI_PROVIDER_ERROR';
};
const tokens = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
const extractUsage = (response) => ({
    inputTokens: tokens(response?.usage?.input_tokens),
    outputTokens: tokens(response?.usage?.output_tokens),
    totalTokens: tokens(response?.usage?.total_tokens)
});
const extractText = (response) => {
    const content = (response?.output || []).filter(item => item.type === 'message').flatMap(item => item.content || []);
    if (content.some(item => item.type === 'refusal')) throw providerError('AI_RESPONSE_REFUSED');
    if (response?.status === 'incomplete') throw providerError('AI_RESPONSE_INCOMPLETE');
    if (response?.status !== 'completed') throw providerError('AI_PROVIDER_UNAVAILABLE');
    return (typeof response.output_text === 'string' ? response.output_text : content
        .filter(item => item.type === 'output_text' && typeof item.text === 'string').map(item => item.text).join('\n')).trim();
};
// Responses strict JSON requires every declared property and closed objects.
// Preserve optional feature fields with null instead of inventing their content.
const toStrictSchema = schema => {
    const result = { ...schema };
    if (schema.type === 'object') {
        const required = new Set(schema.required || []);
        result.properties = Object.fromEntries(Object.entries(schema.properties || {}).map(([key, value]) => {
            const child = toStrictSchema(value);
            return [key, required.has(key) ? child : { anyOf: [child, { type: 'null' }] }];
        }));
        result.required = Object.keys(result.properties);
        result.additionalProperties = false;
    }
    if (schema.items) result.items = toStrictSchema(schema.items);
    return result;
};
const awaitWithAbort = (promise, signal) => new Promise((resolve, reject) => {
    const abort = () => {
        signal.removeEventListener('abort', abort);
        reject(signal.reason || providerError('AI_OPERATION_CANCELLED'));
    };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
});
const recordAttempt = async (operation, attempt, started = false) => {
    if (!operation?.recordId || !operation?.reservation?.shopId) return;
    try {
        const Ledger = require('../../models/AiGenerationRequest');
        const identity = { _id: operation.recordId, shopId: operation.reservation.shopId, accountingVersion: 2 };
        if (started) await Ledger.updateOne({ ...identity, status: 'in_progress', fence: operation.fence }, {
            $push: { attempts: { $each: [attempt], $slice: -4 } }
        });
        else await Ledger.updateOne({ ...identity, 'attempts.attemptId': attempt.attemptId }, { $set: { 'attempts.$': attempt } });
    } catch (_) { /* Observability cannot change the durable accounting decision. */ }
};

const bindContext = async (operation, snapshot) => {
    if (!operation?.recordId || !operation?.reservation?.shopId) return;
    const Ledger = require('../../models/AiGenerationRequest');
    const contextHash = hashSnapshot(snapshot);
    const write = await Ledger.updateOne({ _id: operation.recordId, shopId: operation.reservation.shopId,
        accountingVersion: 2, status: 'in_progress', fence: operation.fence,
        $expr: { $gt: ['$deadline', '$$NOW'] } }, { $set: { contextHash } });
    if (write.matchedCount !== 1) throw providerError('AI_RESULT_NOT_ACCEPTED');
};

const createProviderSession = ({ operation, signal, config = getAiConfig(), clientFactory = key => new OpenAI({ apiKey: key, maxRetries: 0, logLevel: 'off', baseURL: 'https://api.openai.com/v1' }),
    onAttempt = attempt => recordAttempt(operation, attempt),
    onAttemptStarted = attempt => recordAttempt(operation, attempt, true) } = {}) => {
    signal = signal || operation?.signal;
    const controller = new AbortController();
    const deadline = Math.min(Number(new Date(operation?.deadline || Date.now() + config.operationTimeoutMs)), Date.now() + config.operationTimeoutMs);
    const abort = () => controller.abort(providerError('AI_OPERATION_CANCELLED'));
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(providerError('AI_PROVIDER_TIMEOUT')), Math.max(0, deadline - Date.now()));
    const attempts = [];
    const check = (minimumMs = 1) => {
        if (controller.signal.aborted) throw controller.signal.reason;
        if (deadline - Date.now() < minimumMs) throw providerError('AI_PROVIDER_TIMEOUT');
    };
    const generate = async ({ prompt, imagePart, schema, temperature, topP, maxOutputTokens, feature }) => {
        check();
        if (!config.apiKey) throw providerError('AI_NOT_CONFIGURED');
        if (attempts.length >= (feature === 'product.content' ? 2 : 1)) throw providerError('AI_ATTEMPT_LIMIT');
        const attempt = { attemptId: randomUUID(), epoch: attempts.length + 1, feature, model: config.model,
            provider: 'openai', modality: imagePart ? 'image' : 'text', startedAt: new Date(), endedAt: null,
            outcome: 'unknown', latencyMs: null, statusClass: null, inputTokens: null, outputTokens: null, totalTokens: null };
        attempts.push(attempt);
        const attemptController = new AbortController();
        const onAbort = () => attemptController.abort(controller.signal.reason);
        controller.signal.addEventListener('abort', onAbort, { once: true });
        const attemptTimer = setTimeout(() => attemptController.abort(providerError('AI_PROVIDER_TIMEOUT')),
            Math.min(config.attemptTimeoutMs, deadline - Date.now()));
        try {
            if (attempt.epoch === 1) await awaitWithAbort(bindContext(operation, {
                contract: 4, provider: 'openai', feature, model: config.model, prompt, image: imagePart || null,
                schema, temperature, topP, maxOutputTokens
            }), attemptController.signal);
            await awaitWithAbort(Promise.resolve().then(() => onAttemptStarted({ ...attempt })), attemptController.signal).catch(() => {});
            const client = clientFactory(config.apiKey);
            check();
            if (attemptController.signal.aborted) throw attemptController.signal.reason;
            const content = [{ type: 'input_text', text: prompt }, ...(imagePart ? [{ type: 'input_image',
                image_url: `data:${imagePart.mimeType};base64,${imagePart.data}`, detail: 'auto' }] : [])];
            const result = await awaitWithAbort(client.responses.create({ model: config.model, store: false,
                input: [{ role: 'user', content }],
                max_output_tokens: Math.min(maxOutputTokens || config.outputTokens, config.outputTokens),
                // These short, schema-constrained generations used no reasoning on GPT-4.1 mini.
                ...(config.model === 'gpt-6-luna' ? { reasoning: { effort: 'none' } } : {}),
                text: { format: { type: 'json_schema', name: feature.replace(/[^a-zA-Z0-9_-]/g, '_'), strict: true, schema: toStrictSchema(schema) } },
                // Reasoning models do not all support sampling controls. Preserve them only for GPT-4 models.
                ...(/^gpt-4/.test(config.model) ? { temperature, top_p: topP } : {})
            }, { signal: attemptController.signal, timeout: Math.max(1, Math.min(config.attemptTimeoutMs, deadline - Date.now())), maxRetries: 0 }), attemptController.signal);
            check();
            Object.assign(attempt, extractUsage(result), { outcome: 'response', statusClass: '2xx' });
            const text = extractText(result);
            if (!text) throw providerError('AI_RESPONSE_EMPTY');
            return text;
        } catch (error) {
            const code = classifyProviderError(error, attemptController.signal);
            attempt.outcome = ['AI_PROVIDER_TIMEOUT', 'AI_OPERATION_CANCELLED', 'AI_PROVIDER_CONNECTION_FAILED'].includes(code) ? 'unknown' : 'failed';
            if (Number(error?.status)) attempt.statusClass = `${Math.floor(error.status / 100)}xx`;
            throw providerError(code, Number(error?.status) || undefined);
        } finally {
            clearTimeout(attemptTimer);
            controller.signal.removeEventListener('abort', onAbort);
            attempt.endedAt = new Date();
            attempt.latencyMs = attempt.endedAt - attempt.startedAt;
            // Bound telemetry waiting too; a failed write is recovered/observed separately.
            await awaitWithAbort(Promise.resolve().then(() => onAttempt({ ...attempt })), controller.signal).catch(() => {});
        }
    };
    return { generate, check, signal: controller.signal, deadline, attempts,
        remainingMs: () => Math.max(0, deadline - Date.now()),
        close: () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); } };
};
const withProviderSession = async (options, run) => {
    const session = createProviderSession(options);
    try {
        session.check();
        const result = await run(session);
        session.check();
        if (result?.meta) result.meta = { ...result.meta, provider: 'openai', operationId: options.operation?.requestId,
            preferenceVersion: options.operation?.preferences?.version || 0, language: options.operation?.preferences?.language || 'auto',
            attemptCount: session.attempts.length,
            providerUsage: session.attempts.map(({ inputTokens, outputTokens, totalTokens, outcome }) => ({ inputTokens, outputTokens, totalTokens, outcome })) };
        return result;
    } finally { session.close(); }
};
module.exports = { createProviderSession, withProviderSession, classifyProviderError, extractUsage, extractText, toStrictSchema, awaitWithAbort };
