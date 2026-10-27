import contract from './storage.cjs';
export const { READABLE_THEME_VERSION, isAdaptiveTheme, assertReadableThemeVersion, validateStoredTheme,
    normalizeStoredTheme, collectAdaptiveReferences, projectAdaptiveTheme } = contract;
export default contract;
