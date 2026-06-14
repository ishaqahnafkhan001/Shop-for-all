const mongoose = require('mongoose');
const Banner = require('../models/Banner');

const FIXED_SECTION_TYPES = new Set(['Hero']);

const makeSectionId = (prefix, value) => `${prefix}-${String(value || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '').slice(-40)}`;

const normalizeProductSource = (section = {}) => {
    const settings = section.settings || {};
    const source = settings.source || section.source || {};
    const productIds = settings.productIds || source.productIds || [];

    if (section.type !== 'FeaturedProducts') return section;

    return {
        ...section,
        settings: {
            ...settings,
            productIds,
            source: {
                type: source.type || 'manual',
                productIds
            }
        },
        source: {
            type: source.type || 'manual',
            productIds
        }
    };
};

const isLegacyAllProductsSection = (section = {}) => {
    if (!['FeaturedProducts', 'Collection'].includes(section.type)) return false;
    const settings = section.settings || {};
    const source = settings.source || section.source || {};
    const productIds = settings.productIds || source.productIds || [];
    return !source.type && (!Array.isArray(productIds) || productIds.length === 0);
};

const normalizeDynamicSections = (sections = []) => sections
    .filter(section => section && !FIXED_SECTION_TYPES.has(section.type) && !isLegacyAllProductsSection(section))
    .map((section, index) => normalizeProductSource({
        ...section,
        id: section.id || makeSectionId(section.type || 'section', section._id || index),
        type: section.type === 'BannerGrid' ? 'Banner' : section.type,
        sortOrder: Number.isFinite(Number(section.sortOrder)) ? Number(section.sortOrder) : index,
        settings: section.settings || {},
        mobileSettings: section.mobileSettings || {},
        source: section.source || {}
    }))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((section, index) => ({ ...section, sortOrder: index }));

const getBannerImage = (banner, type = 'desktop') => {
    if (type === 'mobile') return banner.mobileImages?.[0] || banner.desktopImages?.[0] || banner.images?.[0] || banner.image || '';
    return banner.desktopImages?.[0] || banner.images?.[0] || banner.image || '';
};

const createBannerSection = (banner, sortOrder) => ({
    id: makeSectionId('legacy-banner', banner._id),
    type: 'Banner',
    title: banner.title || 'Promotional banner',
    isEnabled: banner.isActive !== false,
    sortOrder,
    settings: {
        desktopImage: getBannerImage(banner, 'desktop'),
        mobileImage: getBannerImage(banner, 'mobile'),
        title: banner.title || '',
        subtitle: '',
        buttonText: banner.link ? 'Shop now' : '',
        buttonLink: banner.link || '',
        sourceBannerId: String(banner._id)
    },
    mobileSettings: {
        image: getBannerImage(banner, 'mobile'),
        isVisible: true
    },
    source: {
        type: 'legacyBanner',
        bannerId: String(banner._id)
    }
});

const ensureThemeSectionArchitecture = async (shopDocOrLean) => {
    if (!shopDocOrLean) return shopDocOrLean;

    const shopId = shopDocOrLean._id || shopDocOrLean.id;
    const theme = shopDocOrLean.theme || {};
    const legacyAllProductsSection = (theme.homepageSections || []).find(isLegacyAllProductsSection);
    const sections = normalizeDynamicSections(theme.homepageSections || []);
    const hasMigrated = theme.migrations?.bannerSectionsV1 === true;

    if (!shopId || hasMigrated) {
        shopDocOrLean.theme = {
            ...theme,
            homepageSections: sections,
            allProducts: {
                title: 'Shop products',
                isEnabled: true,
                desktopColumns: 3,
                tabletColumns: 2,
                mobileColumns: 2,
                spacing: 'Comfortable',
                ...(legacyAllProductsSection?.title ? { title: legacyAllProductsSection.title } : {}),
                ...(theme.allProducts || {})
            },
            migrations: {
                ...(theme.migrations || {}),
                bannerSectionsV1: hasMigrated
            }
        };
        return shopDocOrLean;
    }

    const legacyBanners = await Banner.find({ shop_id: shopId }).sort({ createdAt: -1 }).lean();
    const existingLegacyIds = new Set(
        sections
            .map(section => section.settings?.sourceBannerId || section.source?.bannerId)
            .filter(Boolean)
            .map(String)
    );
    const migratedSections = legacyBanners
        .filter(banner => !existingLegacyIds.has(String(banner._id)))
        .map((banner, offset) => createBannerSection(banner, sections.length + offset));
    const nextSections = normalizeDynamicSections([...sections, ...migratedSections]);
    const nextTheme = {
        ...theme,
        homepageSections: nextSections,
        allProducts: {
            title: 'Shop products',
            isEnabled: true,
            desktopColumns: 3,
            tabletColumns: 2,
            mobileColumns: 2,
            spacing: 'Comfortable',
            ...(legacyAllProductsSection?.title ? { title: legacyAllProductsSection.title } : {}),
            ...(theme.allProducts || {})
        },
        migrations: {
            ...(theme.migrations || {}),
            bannerSectionsV1: true
        }
    };

    await mongoose.model('Shop').updateOne(
        { _id: shopId, 'theme.migrations.bannerSectionsV1': { $ne: true } },
        {
            $set: {
                'theme.homepageSections': nextSections,
                'theme.allProducts': nextTheme.allProducts,
                'theme.migrations.bannerSectionsV1': true
            }
        }
    );

    shopDocOrLean.theme = nextTheme;
    return shopDocOrLean;
};

module.exports = {
    ensureThemeSectionArchitecture,
    normalizeDynamicSections
};
