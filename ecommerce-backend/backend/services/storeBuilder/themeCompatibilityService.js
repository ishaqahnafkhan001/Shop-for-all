const { sanitizeThemePayload, mergeThemePatch } = require('@scaleup/storefront-theme');
const Shop = require('../../models/Shop');

// Preserve safe fields an older strict Mongoose schema would otherwise discard.
// The archive is opaque to rendering. Reinstating a field needs an explicit future
// migration, so unknown configuration cannot bypass today's validation or plan gates.
const preserveThemeExtensions = (incoming = {}, previous = {}) => {
    const next = sanitizeThemePayload(incoming);
    const old = sanitizeThemePayload(previous);
    const extensions = mergeThemePatch(old.extensions || {}, next.extensions || {});
    const archived = Array.isArray(extensions.schemaFields) ? extensions.schemaFields : [];
    const fields = new Map(archived.filter(field => field && Array.isArray(field.path)).map(field => [JSON.stringify(field.path), field]));
    const walk = (value, path = []) => {
        if (path[0] === 'extensions' || value === undefined) return;
        const schemaPath = ['theme', ...path].join('.');
        const definition = Shop.schema.path(schemaPath);
        if (definition && !['Array', 'DocumentArrayElement', 'Embedded'].includes(definition.instance)) return;
        if (path.length && !definition && Shop.schema.pathType(schemaPath) !== 'nested') {
            fields.set(JSON.stringify(path), { path, value });
            return;
        }
        if (value && typeof value === 'object') {
            Object.entries(value).forEach(([key, child]) => walk(child, [...path, key]));
        }
    };
    walk(old);
    walk(next);
    if (fields.size) extensions.schemaFields = [...fields.values()];
    if (Object.keys(extensions).length) next.extensions = extensions;
    return next;
};

module.exports = { preserveThemeExtensions };
