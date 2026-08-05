const {
    FALLBACK_THEME,
    cloneTheme,
    normalizeHomepageSections,
    normalizeTheme
} = require('@scaleup/storefront-theme');

const deepEqual = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

const STARTER_EDITABLE_SECTION_TYPES = new Set(['Hero', 'FeaturedProducts']);
const STARTER_RESTRICTED_THEME_KEYS = new Set([
    'layout',
    'productGridStyle',
    'migrations'
]);
const STARTER_RESTRICTED_VARIANT_PATHS = Object.freeze([
    ['header', 'variant'],
    ['hero', 'variant']
]);

const assertStoreBuilderUpdateAllowed = ({ currentTheme = {}, incomingTheme = {}, planAccess }) => {
    if (!incomingTheme || planAccess?.storeBuilderAccess === 'full') return;
    if (planAccess?.storeBuilderAccess === 'none') {
        const error = new Error('Store Builder is not included in the current plan.');
        error.statusCode = 403;
        error.code = 'FEATURE_NOT_INCLUDED';
        error.feature = 'storeBuilder';
        throw error;
    }

    for (const key of STARTER_RESTRICTED_THEME_KEYS) {
        if (incomingTheme[key] !== undefined && !deepEqual(incomingTheme[key], currentTheme[key])) {
            const error = new Error(`${key} editing requires the Growth plan.`);
            error.statusCode = 403;
            error.code = 'STORE_BUILDER_CAPABILITY_REQUIRED';
            error.capability = 'advancedDesign';
            throw error;
        }
    }

    const currentNormalized = normalizeTheme(currentTheme);
    const incomingNormalized = normalizeTheme(incomingTheme);
    for (const [group, key] of STARTER_RESTRICTED_VARIANT_PATHS) {
        if (incomingTheme?.[group]?.[key] !== undefined
            && !deepEqual(incomingNormalized[group]?.[key], currentNormalized[group]?.[key])) {
            const error = new Error('Structural layout variants require the Growth plan.');
            error.statusCode = 403;
            error.code = 'STORE_BUILDER_CAPABILITY_REQUIRED';
            error.capability = 'advancedDesign';
            throw error;
        }
    }

    if (Array.isArray(incomingTheme.homepageSections)) {
        const currentSections = normalizeHomepageSections(currentTheme.homepageSections);
        const incomingSections = normalizeHomepageSections(incomingTheme.homepageSections);
        const currentOrder = currentSections.map(section => String(section.id || ''));
        const incomingOrder = incomingSections.map(section => String(section.id || ''));
        if (!deepEqual(currentOrder, incomingOrder)) {
            const error = new Error('Custom section ordering requires the Growth plan.');
            error.statusCode = 403;
            error.code = 'STORE_BUILDER_CAPABILITY_REQUIRED';
            error.capability = 'sectionReordering';
            throw error;
        }

        incomingSections.forEach((section, index) => {
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

    if (planAccess?.storeBuilderAccess === 'none') {
        const normalized = normalizeTheme(theme);
        const defaults = cloneTheme(FALLBACK_THEME);

        return normalizeTheme({
            ...defaults,
            logoUrl: normalized.logoUrl,
            faviconUrl: normalized.faviconUrl,
            checkoutBranding: {
                ...defaults.checkoutBranding,
                logoUrl: normalized.logoUrl
            },
            paymentSettings: normalized.paymentSettings,
            footer: {
                ...defaults.footer,
                text: normalized.footer?.text || '',
                contactLabel: normalized.footer?.contactLabel || defaults.footer.contactLabel,
                contactEmail: normalized.footer?.contactEmail || '',
                facebookUrl: normalized.footer?.facebookUrl || '',
                instagramUrl: normalized.footer?.instagramUrl || '',
                twitterUrl: normalized.footer?.twitterUrl || '',
                youtubeUrl: normalized.footer?.youtubeUrl || '',
                tiktokUrl: normalized.footer?.tiktokUrl || '',
                links: []
            },
            policies: normalized.policies
        });
    }

    return {
        ...theme,
        homepageSections: (Array.isArray(theme.homepageSections) ? theme.homepageSections : [])
            .filter(section => section?.type === 'FeaturedProducts')
    };
};

module.exports = {
    STARTER_EDITABLE_SECTION_TYPES,
    STARTER_RESTRICTED_THEME_KEYS,
    STARTER_RESTRICTED_VARIANT_PATHS,
    assertStoreBuilderUpdateAllowed,
    getPublicThemeForPlan
};
