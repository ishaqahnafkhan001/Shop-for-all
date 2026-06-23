import {
    FALLBACK_THEME,
    normalizeTheme
} from '../../../../../ecommerce-storefront/src/lib/theme.js';
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
            id: section.id || section._id || `${type || 'section'}-${index}-${Date.now()}`,
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

export const normalizeHeroSlideForBuilder = (slide = {}, index = 0, hero = {}) => ({
    id: slide.id || `hero-slide-${index + 1}`,
    enabled: slide.enabled !== false,
    desktopImage: slide.desktopImage || slide.imageUrl || (index === 0 ? hero.imageUrl : '') || '',
    mobileImage: slide.mobileImage || '',
    title: slide.title ?? (index === 0 ? hero.title : '') ?? '',
    subtitle: slide.subtitle ?? (index === 0 ? hero.subtitle : '') ?? '',
    badgeText: slide.badgeText ?? 'Limited time offer',
    discountText: slide.discountText ?? '',
    primaryCtaText: slide.primaryCtaText || (index === 0 ? hero.ctaLabel : '') || 'Shop Now',
    primaryCtaLink: slide.primaryCtaLink || (index === 0 ? hero.ctaUrl : '') || '#products',
    secondaryCtaText: slide.secondaryCtaText ?? 'Explore Collection',
    secondaryCtaLink: slide.secondaryCtaLink || '#products'
});

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
        ctaLabel: firstSlide.primaryCtaText || 'Shop Now',
        ctaUrl: firstSlide.primaryCtaLink || '#products'
    };
};

export const mergeTheme = (base = defaultTheme, incoming = {}) => normalizeBuilderTheme({
    ...(base || {}),
    ...(incoming || {})
});

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
