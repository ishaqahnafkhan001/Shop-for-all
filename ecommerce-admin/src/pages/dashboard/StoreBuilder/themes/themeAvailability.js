import { getPrebuiltThemes } from '@scaleup/storefront-theme/prebuilt';

// UX discovery only. The backend independently authorizes every write.
export const getAvailableGalleryThemes = (themeAvailability = {}) => getPrebuiltThemes({ includeHidden: true })
    .filter(theme => theme.status === 'active' || (theme.id === 'atelier-editorial'
        && themeAvailability[theme.id]?.available === true));

export const isGalleryThemeAvailable = (theme, themeAvailability = {}) =>
    Boolean(theme && getAvailableGalleryThemes(themeAvailability).some(candidate => candidate.id === theme.id));
