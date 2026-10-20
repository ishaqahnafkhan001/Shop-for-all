import {
    FALLBACK_THEME as CONTRACT_FALLBACK_THEME,
    resolveEffectiveTheme,
    getEnabledHomepageSections as getContractEnabledHomepageSections,
    getSortedNavigation as getContractSortedNavigation,
    getThemeCssVars as getContractThemeCssVars,
} from '@scaleup/storefront-theme';

export { THEME_SCHEMA_VERSION } from '@scaleup/storefront-theme';
export const FALLBACK_THEME = resolveEffectiveTheme(CONTRACT_FALLBACK_THEME);
export const normalizeTheme = resolveEffectiveTheme;
export const getThemeCssVars = (theme = {}) => getContractThemeCssVars(normalizeTheme(theme));
export const getEnabledHomepageSections = (theme = {}) => getContractEnabledHomepageSections(normalizeTheme(theme));
export const getSortedNavigation = (theme = {}) => getContractSortedNavigation(normalizeTheme(theme));
