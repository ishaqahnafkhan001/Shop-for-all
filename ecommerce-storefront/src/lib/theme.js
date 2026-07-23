import {
    FALLBACK_THEME as CONTRACT_FALLBACK_THEME,
    THEME_SCHEMA_VERSION,
    getEnabledHomepageSections as getContractEnabledHomepageSections,
    getSortedNavigation as getContractSortedNavigation,
    getThemeCssVars as getContractThemeCssVars,
    normalizeTheme as normalizeContractTheme,
} from '@scaleup/storefront-theme';

import { buildDefaultPolicies } from './defaultPolicies.js';

export { THEME_SCHEMA_VERSION };

export const FALLBACK_THEME = {
    ...CONTRACT_FALLBACK_THEME,
    policies: buildDefaultPolicies({ storeName: 'this store' }),
};

const mergePolicies = (base = {}, incoming = {}) => Object.keys(base).reduce((acc, key) => {
    const value = incoming?.[key];
    acc[key] = typeof value === 'string' && value.trim() ? value : base[key];
    return acc;
}, {});

export const normalizeTheme = (candidate = {}) => {
    const normalized = normalizeContractTheme(candidate);
    return {
        ...normalized,
        policies: mergePolicies(FALLBACK_THEME.policies, normalized.policies),
    };
};

export const getThemeCssVars = (themeCandidate = {}) => getContractThemeCssVars(normalizeTheme(themeCandidate));

export const getEnabledHomepageSections = (themeCandidate = {}) => (
    getContractEnabledHomepageSections(normalizeTheme(themeCandidate))
);

export const getSortedNavigation = (themeCandidate = {}) => (
    getContractSortedNavigation(normalizeTheme(themeCandidate))
);
