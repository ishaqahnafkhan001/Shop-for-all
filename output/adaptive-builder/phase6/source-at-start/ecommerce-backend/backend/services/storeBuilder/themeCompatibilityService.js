const { sanitizeThemePayload, mergeThemePatch } = require('@scaleup/storefront-theme');
const Shop = require('../../models/Shop');

// Preserve safe fields an older strict Mongoose schema would otherwise discard.
// The archive is opaque to rendering. Reinstating a field needs an explicit future
// migration, so unknown configuration cannot bypass today's validation or plan gates.
const preserveThemeExtensions = (incoming = {}, previous = {}) => {
    if (Number(incoming.version) === 5 && incoming.siteBuilder) {
        const { siteBuilder, ...legacy } = incoming;
        const old = { ...(previous?.toObject ? previous.toObject() : previous) }; delete old.siteBuilder;
        return { ...preserveThemeExtensions({ ...legacy, version: 4 }, { ...old, version: 4 }), version: 5, siteBuilder };
    }
    const next = sanitizeThemePayload(incoming);
    const old = sanitizeThemePayload(previous);
    const extensions = mergeThemePatch(old.extensions || {}, next.extensions || {});
    const archived = Array.isArray(extensions.schemaFields) ? extensions.schemaFields : [];
    const fields = new Map(archived.filter(field => field && Array.isArray(field.path)).map(field => [JSON.stringify(field.path), field]));
    const walk = (value, path = [], schema = Shop.schema, schemaPath = 'theme') => {
        if (path[0] === 'extensions' || value === undefined) return;
        // Inspect declared paths directly. schema.path()/pathType() cache dynamic
        // document-array paths, including unknown request-controlled field names.
        const definition = schema.paths[schemaPath];
        if (schemaPath && !definition && !schema.nested[schemaPath]) {
            fields.set(JSON.stringify(path), { path, value });
            return;
        }
        if (definition?.schema) {
            if (Array.isArray(value)) value.forEach((item, index) => walk(item, [...path, String(index)], definition.schema, ''));
            else walk(value, path, definition.schema, '');
            return;
        }
        if (definition) return; // Scalar, scalar-array and Mixed paths persist as declared.
        if (value && typeof value === 'object') {
            Object.entries(value).forEach(([key, child]) => walk(child, [...path, key], schema, schemaPath ? `${schemaPath}.${key}` : key));
        }
    };
    walk(old);
    walk(next);
    if (fields.size) extensions.schemaFields = [...fields.values()];
    if (Object.keys(extensions).length) next.extensions = extensions;
    return next;
};

module.exports = { preserveThemeExtensions };
