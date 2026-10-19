const integer = (env, key, fallback, min, max) => {
    const raw = env[key];
    const value = raw === undefined || raw === '' ? fallback : Number(raw);
    if (!Number.isSafeInteger(value) || value < min || value > max) {
        throw new Error(`Invalid ${key}: expected an integer between ${min} and ${max}.`);
    }
    return value;
};

const modelName = value => {
    const model = String(value ?? 'gpt-6-luna').trim();
    if (!/^gpt-[a-z0-9][a-z0-9.-]{1,79}$/.test(model)) throw new Error('Invalid OPENAI_MODEL: expected a GPT model identifier.');
    return model;
};

const readAiConfig = (env = process.env) => Object.freeze({
    accountingVersion: integer(env, 'AI_ACCOUNTING_VERSION', 0, 0, 2),
    concurrency: integer(env, 'AI_TENANT_CONCURRENCY', 2, 1, 16),
    receiptCapacity: integer(env, 'AI_RECEIPT_CAPACITY', 128, 16, 256),
    operationTimeoutMs: integer(env, 'AI_OPERATION_TIMEOUT_MS', 60000, 1000, 120000),
    unknownCooldownMs: integer(env, 'AI_UNKNOWN_OUTCOME_COOLDOWN_MS', 30000, 1000, 120000),
    retentionHours: integer(env, 'AI_REQUEST_RETENTION_HOURS', 24, 1, 168),
    provider: 'openai',
    model: modelName(env.OPENAI_MODEL),
    apiKey: String(env.OPENAI_API_KEY || '').trim(),
    outputTokens: integer(env, 'OPENAI_MAX_OUTPUT_TOKENS', 2400, 128, 8192),
    productOutputTokens: integer(env, 'OPENAI_PRODUCT_AI_MAX_OUTPUT_TOKENS', 2400, 128, 8192),
    attemptTimeoutMs: integer(env, 'OPENAI_TIMEOUT_MS', 45000, 1000, 120000),
    imageBytes: 5 * 1024 * 1024,
    imagePixels: 16000000,
    imageDecodeConcurrency: integer(env, 'AI_IMAGE_DECODE_CONCURRENCY', 4, 1, 8),
    aggregatePrivacyThreshold: integer(env, 'AI_AGGREGATE_PRIVACY_THRESHOLD', 3, 3, 100),
    imageHosts: Object.freeze(['res.cloudinary.com', ...String(env.TRUSTED_PRODUCT_IMAGE_HOSTS || '')
        .split(',').map(host => host.trim().toLowerCase()).filter(Boolean).map(host => {
            if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(host)
                || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)) {
                throw new Error('Invalid TRUSTED_PRODUCT_IMAGE_HOSTS: use exact public HTTPS hostnames.');
            }
            return host;
        })])
});

let config;
const getAiConfig = () => config || (config = readAiConfig());
module.exports = { getAiConfig, readAiConfig };
