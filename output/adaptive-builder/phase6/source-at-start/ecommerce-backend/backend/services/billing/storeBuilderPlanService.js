// The shared contract owns editor and write-time capability policy.
const {
    getPublicThemeForPlan,
    assertStoreBuilderUpdateAllowed,
    LIMITED_EDITABLE_SECTION_TYPES,
    RESTRICTED_THEME_KEYS,
    RESTRICTED_VARIANT_PATHS
} = require('@scaleup/storefront-theme');

module.exports = {
    // Compatibility exports for existing backend callers; mutating these sets
    // cannot change the authoritative shared policy.
    STARTER_EDITABLE_SECTION_TYPES: new Set(LIMITED_EDITABLE_SECTION_TYPES),
    STARTER_RESTRICTED_THEME_KEYS: new Set(RESTRICTED_THEME_KEYS),
    STARTER_RESTRICTED_VARIANT_PATHS: RESTRICTED_VARIANT_PATHS,
    assertStoreBuilderUpdateAllowed,
    getPublicThemeForPlan
};
