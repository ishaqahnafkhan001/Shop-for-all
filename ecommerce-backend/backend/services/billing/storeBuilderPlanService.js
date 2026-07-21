const deepEqual = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

const STARTER_EDITABLE_SECTION_TYPES = new Set(['Hero', 'FeaturedProducts']);
const STARTER_RESTRICTED_THEME_KEYS = new Set([
    'layout',
    'productGridStyle',
    'migrations'
]);

const assertStoreBuilderUpdateAllowed = ({ currentTheme = {}, incomingTheme = {}, planAccess }) => {
    if (!incomingTheme || planAccess?.storeBuilderAccess === 'full') return;

    for (const key of STARTER_RESTRICTED_THEME_KEYS) {
        if (incomingTheme[key] !== undefined && !deepEqual(incomingTheme[key], currentTheme[key])) {
            const error = new Error(`${key} editing requires the Growth plan.`);
            error.statusCode = 403;
            error.code = 'STORE_BUILDER_CAPABILITY_REQUIRED';
            error.capability = 'advancedDesign';
            throw error;
        }
    }

    if (Array.isArray(incomingTheme.homepageSections)) {
        const currentSections = Array.isArray(currentTheme.homepageSections) ? currentTheme.homepageSections : [];
        const currentOrder = currentSections.map(section => String(section.id || section._id || ''));
        const incomingOrder = incomingTheme.homepageSections.map(section => String(section.id || section._id || ''));
        if (!deepEqual(currentOrder, incomingOrder)) {
            const error = new Error('Custom section ordering requires the Growth plan.');
            error.statusCode = 403;
            error.code = 'STORE_BUILDER_CAPABILITY_REQUIRED';
            error.capability = 'sectionReordering';
            throw error;
        }

        incomingTheme.homepageSections.forEach((section, index) => {
            const current = currentSections[index];
            if (!STARTER_EDITABLE_SECTION_TYPES.has(section.type) && !deepEqual(section, current)) {
                const error = new Error('Advanced homepage sections require the Growth plan.');
                error.statusCode = 403;
                error.code = 'STORE_BUILDER_CAPABILITY_REQUIRED';
                error.capability = 'advancedSections';
                throw error;
            }
        });
    }
};

const getPublicThemeForPlan = (theme = {}, planAccess = {}) => {
    if (planAccess?.storeBuilderAccess === 'full') return theme;

    return {
        ...theme,
        homepageSections: (Array.isArray(theme.homepageSections) ? theme.homepageSections : [])
            .filter(section => section?.type === 'FeaturedProducts')
    };
};

module.exports = {
    STARTER_EDITABLE_SECTION_TYPES,
    STARTER_RESTRICTED_THEME_KEYS,
    assertStoreBuilderUpdateAllowed,
    getPublicThemeForPlan
};
