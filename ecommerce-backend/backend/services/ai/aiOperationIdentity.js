const { createHash } = require('node:crypto');
const canonicalize = (value) => {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === 'object') {
        if (value instanceof Date) return value.toISOString();
        return Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined)
            .map(key => [key, canonicalize(value[key])]));
    }
    return typeof value === 'string' ? value.normalize('NFC') : value;
};
const hashSnapshot = (value) => createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
const JSON_FIELDS = new Set(['tags', 'variants', 'features', 'specifications', 'comments', 'requestedSections', 'requestedFields', 'productIds']);
const SET_FIELDS = new Set(['tags', 'requestedSections', 'requestedFields', 'productIds']);
const normalizeRequestInput = (body = {}) => Object.fromEntries(Object.entries(body)
    .filter(([key]) => !['requestId', 'generationRequestId'].includes(key))
    .map(([key, raw]) => {
        let value = raw;
        if (JSON_FIELDS.has(key) && typeof value === 'string') {
            try { value = JSON.parse(value); } catch { /* Invalid input stays distinct and is rejected by feature validation. */ }
        }
        value = canonicalize(value);
        if (typeof value === 'string') value = value.trim();
        if (SET_FIELDS.has(key) && Array.isArray(value) && value.every(item => typeof item === 'string')) {
            value = [...new Set(value.map(item => item.trim()))].sort();
        }
        return [key, value];
    }));
const hashRequest = (req, feature) => {
    const input = normalizeRequestInput(req.body);
    return hashSnapshot({ contract: 4, provider: 'openai', feature, input, image: req.file?.buffer
        ? { mime: req.file.mimetype, digest: createHash('sha256').update(req.file.buffer).digest('hex') } : null });
};
module.exports = { canonicalize, hashSnapshot, hashRequest, normalizeRequestInput };
