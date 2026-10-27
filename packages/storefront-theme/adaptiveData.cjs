'use strict';

// JSON-only boundary shared by the inactive contract. No getters, custom objects,
// coercion, truncation or JSON.parse/stringify cloning of unvalidated input.
const LIMITS = Object.freeze({ templates: 12, nodesPerTemplate: 50, totalNodes: 200,
    layoutDepth: 3, savedSections: 20, stylePresets: 20, bytes: 256 * 1024, jsonDepth: 16 });
const own = (value, key) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(value, key);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
// eslint-disable-next-line no-control-regex -- Control bytes must be rejected in JSON keys.
const safeKey = key => !['__proto__', 'prototype', 'constructor'].includes(key) && !/[.$\u0000-\u001f\u007f]/u.test(key);
const id = value => typeof value === 'string' && /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(value) && safeKey(value);
const issue = (errors, path, code, message) => { if (errors.length < 100) errors.push({ path: [...path], code, message }); };
const utf8Bytes = text => {
    let bytes = 0;
    for (const char of text) { const point = char.codePointAt(0); bytes += point < 128 ? 1 : point < 2048 ? 2 : point < 65536 ? 3 : 4; }
    return bytes;
};
function inspectJson(value, maxBytes = LIMITS.bytes) {
    const errors = [], ancestors = new Set();
    let entries = 0, stringCharacters = 0;
    function walk(item, path, depth) {
        if (++entries > 20000) { issue(errors, path, 'JSON_LIMIT', 'Too many JSON values.'); return; }
        if (depth > LIMITS.jsonDepth) { issue(errors, path, 'JSON_DEPTH', 'JSON nesting exceeds the contract limit.'); return; }
        if (typeof item === 'string') {
            stringCharacters += item.length;
            if (stringCharacters > maxBytes) issue(errors, path, 'BYTE_LIMIT', 'String content exceeds the byte budget.');
            return;
        }
        if (item === null || typeof item === 'boolean') return;
        if (typeof item === 'number' && Number.isFinite(item)) return;
        if (typeof item !== 'object' || (!Array.isArray(item) && !record(item))) {
            issue(errors, path, 'JSON_TYPE', 'Use plain JSON objects, arrays and finite primitive values.'); return;
        }
        if (ancestors.has(item)) { issue(errors, path, 'JSON_CYCLE', 'Cyclic JSON is not supported.'); return; }
        ancestors.add(item);
        const keys = Reflect.ownKeys(item);
        if (keys.length > 2000) {
            issue(errors, path, 'JSON_LIMIT', 'Too many object properties.'); ancestors.delete(item); return;
        }
        for (const key of keys) {
            if (entries > 20000) break;
            if (Array.isArray(item) && key === 'length') continue;
            if (typeof key !== 'string' || key.length > 128 || !safeKey(key)) { issue(errors, path, 'UNSAFE_KEY', 'Unsafe object key.'); continue; }
            const descriptor = Object.getOwnPropertyDescriptor(item, key);
            if (!descriptor.enumerable || !own(descriptor, 'value') || (Array.isArray(item) && !/^(0|[1-9][0-9]*)$/.test(key))) {
                issue(errors, [...path, key], 'JSON_PROPERTY', 'Accessors and non-JSON properties are not allowed.'); continue;
            }
            walk(descriptor.value, [...path, key], depth + 1);
        }
        if (Array.isArray(item) && (item.length > 2000 || Object.keys(item).length !== item.length)) issue(errors, path, 'JSON_ARRAY', 'Use bounded, dense arrays.');
        ancestors.delete(item);
    }
    let bytes = null;
    try {
        walk(value, [], 0);
        if (!errors.length) bytes = utf8Bytes(JSON.stringify(value));
    } catch {
        issue(errors, [], 'JSON_TYPE', 'Input must be ordinary JSON without custom behavior.');
    }
    if (bytes !== null && bytes > maxBytes) issue(errors, [], 'BYTE_LIMIT', `Configuration exceeds ${maxBytes} UTF-8 bytes.`);
    return { valid: errors.length === 0, errors, bytes };
}
function shape(value, keys, errors, path) {
    if (!record(value)) { issue(errors, path, 'OBJECT_REQUIRED', 'Expected a plain object.'); return false; }
    for (const key of Object.keys(value)) if (!keys.includes(key)) issue(errors, [...path, key], 'UNKNOWN_PROPERTY', 'Property is not registered.');
    return true;
}
const clone = value => JSON.parse(JSON.stringify(value)); // Only after inspectJson succeeds.
function deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
    return value;
}
module.exports = { LIMITS, own, record, safeKey, id, issue, inspectJson, shape, clone, deepFreeze };
