const SENSITIVE_KEYS = [
    'password',
    'pass',
    'token',
    'otp',
    'authorization',
    'cookie',
    'cookies',
    'nidnumber',
    'apikey',
    'api_key',
    'secret',
    'email_pass',
    'admin_email_pass',
    'order_mail_pass'
];

const isSensitiveKey = (key = '') => {
    const normalized = String(key).toLowerCase().replace(/[^a-z0-9_]/g, '');
    return SENSITIVE_KEYS.some(sensitive => normalized.includes(sensitive));
};

const redact = (value, depth = 0) => {
    if (depth > 6) return '[MaxDepth]';
    if (!value || typeof value !== 'object') return value;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(item => redact(item, depth + 1));

    return Object.entries(value).reduce((acc, [key, item]) => {
        acc[key] = isSensitiveKey(key) ? '[REDACTED]' : redact(item, depth + 1);
        return acc;
    }, {});
};

const formatError = (error) => {
    if (!error) return null;
    return {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    };
};

const write = (level, message, meta = {}) => {
    const payload = redact({
        level,
        message,
        timestamp: new Date().toISOString(),
        ...meta,
        ...(meta.error ? { error: formatError(meta.error) } : {})
    });

    const line = JSON.stringify(payload);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
};

module.exports = {
    info: (message, meta) => write('info', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    error: (message, meta) => write('error', message, meta),
    redact
};
