import {
    FALLBACK_THEME,
    normalizeTheme,
    mergeThemePatch,
    updateProductCardSetting,
    resolveHeroSlideFields
} from '@scaleup/storefront-theme';
import { HERO_SLIDE_LIMIT } from './storeBuilderConstants.jsx';

export const normalizeBuilderNavigation = (navigation = []) => navigation.map((item, index) => ({
    isExternal: false,
    megaMenu: false,
    sortOrder: index,
    ...item,
    children: Array.isArray(item.children)
        ? item.children.map((child, childIndex) => ({
            isExternal: false,
            sortOrder: childIndex,
            ...child
        }))
        : []
}));

export const normalizeBuilderTheme = (theme = {}) => {
    const normalized = normalizeTheme(theme);

    return {
        ...normalized,
        faviconUrl: theme.faviconUrl || normalized.faviconUrl || '',
        navigation: normalizeBuilderNavigation(normalized.navigation)
    };
};

export const defaultTheme = normalizeBuilderTheme(FALLBACK_THEME);

// Explicit editor commands synchronize the legacy/global catalog aliases. This
// runs only on an edit; loading an existing theme never changes saved overrides.
export const updateBuilderThemeSetting = (theme, group, key, value) => {
    if (group === 'productCard') return { ...theme, productCard: updateProductCardSetting(theme.productCard, key, value) };
    const patch = { [group]: { [key]: value } };
    if (group === 'layout') {
        const catalogKey = { productColumnsDesktop: 'desktopColumns', productColumnsTablet: 'tabletColumns', productColumnsMobile: 'mobileColumns', productGap: 'spacing' }[key];
        if (catalogKey) patch.allProducts = { [catalogKey]: value };
        if (key === 'productGap') patch.productGridStyle = value;
    }
    return mergeThemePatch(theme, patch);
};

export const createBuilderSectionId = (type = 'section') => {
    const token = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `${String(type || 'section').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${token}`.slice(0, 80);
};

export const normalizeHomepageSections = (sections = []) => sections
    .filter(section => {
        if (!section || section.type === 'Hero') return false;
        const settings = section.settings || {};
        const source = settings.source || section.source || {};
        const productIds = settings.productIds || source.productIds || [];
        return !(['FeaturedProducts', 'Collection'].includes(section.type) && !source.type && (!Array.isArray(productIds) || productIds.length === 0));
    })
    .map((section, index) => {
        const type = section.type === 'BannerGrid' ? 'Banner' : section.type;
        const settings = section.settings || {};
        const source = settings.source || section.source || {};
        const productIds = settings.productIds || source.productIds || [];

        return {
            ...section,
            id: section.id || section._id || `${type || 'section'}-${index}`,
            type,
            sortOrder: Number.isFinite(Number(section.sortOrder)) ? Number(section.sortOrder) : index,
            settings: type === 'FeaturedProducts'
                ? {
                    ...settings,
                    productIds,
                    source: { type: source.type || 'manual', productIds }
                }
                : settings,
            mobileSettings: section.mobileSettings || {},
            source: type === 'FeaturedProducts'
                ? { type: source.type || 'manual', productIds }
                : (section.source || {})
        };
    })
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((section, index) => ({ ...section, sortOrder: index }));

export const createHeroSlide = (overrides = {}) => ({
    id: `hero-slide-${Date.now()}`,
    enabled: true,
    desktopImage: '',
    mobileImage: '',
    title: '',
    subtitle: '',
    badgeText: 'Limited time offer',
    discountText: '',
    primaryCtaText: 'Shop Now',
    primaryCtaLink: '#products',
    secondaryCtaText: 'Explore Collection',
    secondaryCtaLink: '#products',
    ...overrides
});

export const normalizeHeroSlideForBuilder = resolveHeroSlideFields;

export const getBuilderHeroSlides = (hero = {}) => {
    const slides = Array.isArray(hero.bannerSlides) ? hero.bannerSlides : [];
    if (slides.length > 0) {
        return slides.map((slide, index) => normalizeHeroSlideForBuilder(slide, index, hero)).slice(0, HERO_SLIDE_LIMIT);
    }
    return [normalizeHeroSlideForBuilder({}, 0, hero)];
};

export const syncHeroLegacyFields = (hero = {}, slides = []) => {
    const firstSlide = slides[0] || normalizeHeroSlideForBuilder({}, 0, hero);
    return {
        ...hero,
        bannerSlides: slides.slice(0, HERO_SLIDE_LIMIT),
        title: firstSlide.title ?? '',
        subtitle: firstSlide.subtitle ?? '',
        imageUrl: firstSlide.desktopImage || firstSlide.mobileImage || '',
        ctaLabel: firstSlide.primaryCtaText ?? 'Shop Now',
        ctaUrl: firstSlide.primaryCtaLink ?? '#products'
    };
};

// Complete snapshots retain the historical root replacement behavior. Deep
// merging fallback groups here would mask sparse style/layout inheritance.
export const loadBuilderTheme = (snapshot = {}) => normalizeBuilderTheme({
    ...defaultTheme,
    ...(snapshot || {})
});

export const mergeTheme = (base = {}, incoming = {}) => normalizeBuilderTheme(mergeThemePatch(base, incoming));

export const sortForSnapshot = (value) => {
    if (Array.isArray(value)) return value.map(sortForSnapshot);
    if (!value || typeof value !== 'object') return value;

    return Object.keys(value).sort().reduce((acc, key) => {
        acc[key] = sortForSnapshot(value[key]);
        return acc;
    }, {});
};

export const stableStringify = (value) => JSON.stringify(sortForSnapshot(value));

export const safeParseSnapshot = (snapshot) => {
    try {
        return JSON.parse(snapshot);
    } catch {
        return null;
    }
};

export const formatBuilderDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

export const isHexColor = (value) => /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(String(value || ''));
