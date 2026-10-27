import { resolvePrebuiltTheme } from '@scaleup/storefront-theme/prebuilt';
export const buildPreviewTheme = ({ currentTheme, presetId, planAccess }) => {
    let sectionIndex = 0;
    return resolvePrebuiltTheme({
        currentTheme,
        presetId,
        planAccess,
        appliedAt: '2026-01-01T00:00:00.000Z',
        createSectionId: type => `preview-${presetId}-${String(type).toLowerCase()}-${sectionIndex += 1}`
    });
};

