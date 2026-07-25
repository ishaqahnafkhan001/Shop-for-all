const mongoose = require('mongoose');

const Collection = require('../../models/Collection');
const Product = require('../../models/Product');
const Shop = require('../../models/Shop');
const StoreBuilderAsset = require('../../models/StoreBuilderAsset');
const StoreBuilderDraft = require('../../models/StoreBuilderDraft');
const { cloudinary } = require('../../config/cloudinary');

const CTA_TYPES = Object.freeze(['SHOP', 'PRODUCT', 'CATEGORY', 'COLLECTION', 'CUSTOM_URL', 'NONE']);
const BRANDING_SOURCES = Object.freeze(['default', 'derived', 'migrated', 'explicit']);
const BRANDING_ASSET_FIELDS = Object.freeze({
    logo: 'logoAssetId',
    favicon: 'faviconAssetId',
    hero: 'heroImageAssetId'
});
const BRANDING_REMOVAL_FIELDS = Object.freeze({
    logo: 'logoRemoved',
    favicon: 'faviconRemoved',
    hero: 'heroImageRemoved'
});
const BRANDING_UPLOAD_RULES = Object.freeze({
    logo: { maxBytes: 2 * 1024 * 1024, minWidth: 64, minHeight: 64, maxWidth: 4000, maxHeight: 4000 },
    favicon: { maxBytes: 1024 * 1024, minWidth: 16, minHeight: 16, maxWidth: 1024, maxHeight: 1024 },
    hero: { maxBytes: 6 * 1024 * 1024, minWidth: 640, minHeight: 320, maxWidth: 6000, maxHeight: 6000 }
});

const toPlain = value => value?.toObject ? value.toObject() : (value || {});

const cleanBrandingText = (value, maxLength) => String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const hasStoredBranding = branding => {
    const value = toPlain(branding);
    return Number(value.version || 0) > 0 ||
        Boolean(value.updatedAt) ||
        value.source === 'explicit' ||
        value.source === 'migrated';
};

const firstPublishedHeroSlide = theme => {
    const slides = Array.isArray(theme?.hero?.bannerSlides) ? theme.hero.bannerSlides : [];
    return slides.find(slide => (
        slide?.enabled !== false &&
        (
            slide.desktopImage ||
            slide.mobileImage ||
            slide.title ||
            slide.subtitle ||
            slide.primaryCtaText
        )
    )) || null;
};

const safeDefaultBranding = shop => ({
    logoAssetId: null,
    faviconAssetId: null,
    heroImageAssetId: null,
    logoRemoved: false,
    faviconRemoved: false,
    heroImageRemoved: false,
    heroTitle: cleanBrandingText(shop?.shopName || 'Online store', 80),
    heroSubtitle: 'Browse our latest products',
    heroCtaLabel: 'Shop now',
    heroCtaType: 'SHOP',
    heroCtaTargetId: '',
    heroCtaUrl: '',
    heroHidden: false,
    source: 'default',
    version: Number(shop?.branding?.version || 0),
    updatedAt: shop?.branding?.updatedAt || null,
    updatedBy: shop?.branding?.updatedBy || null,
    legacyLogoUrl: '',
    legacyFaviconUrl: '',
    legacyHeroImageUrl: ''
});

const deriveBrandingFromShop = shop => {
    const plainShop = toPlain(shop);
    const theme = toPlain(plainShop.theme);
    const slide = firstPublishedHeroSlide(theme);
    const hero = toPlain(theme.hero);
    const defaults = safeDefaultBranding(plainShop);
    const ctaLabel = cleanBrandingText(
        slide?.primaryCtaText || hero.ctaLabel || defaults.heroCtaLabel,
        30
    );
    const ctaUrl = String(slide?.primaryCtaLink || hero.ctaUrl || '').trim();
    let heroCtaType = ctaLabel ? 'SHOP' : 'NONE';
    let heroCtaUrl = '';
    if (ctaLabel && ctaUrl && ctaUrl !== '#products') {
        try {
            heroCtaUrl = validateCustomUrl(ctaUrl);
            heroCtaType = 'CUSTOM_URL';
        } catch {
            heroCtaType = 'SHOP';
        }
    }

    return {
        ...defaults,
        heroTitle: cleanBrandingText(slide?.title || hero.title || defaults.heroTitle, 80),
        heroSubtitle: cleanBrandingText(slide?.subtitle || hero.subtitle || defaults.heroSubtitle, 180),
        heroCtaLabel: ctaLabel,
        heroCtaType,
        heroCtaUrl,
        source: 'derived',
        legacyLogoUrl: String(theme.logoUrl || '').trim(),
        legacyFaviconUrl: String(theme.faviconUrl || '').trim(),
        legacyHeroImageUrl: String(slide?.desktopImage || slide?.mobileImage || hero.imageUrl || '').trim()
    };
};

const getStoredOrDerivedBranding = shop => {
    const plainShop = toPlain(shop);
    const stored = toPlain(plainShop.branding);
    if (!hasStoredBranding(stored)) return deriveBrandingFromShop(plainShop);

    const theme = toPlain(plainShop.theme);
    const slide = firstPublishedHeroSlide(theme);
    return {
        ...safeDefaultBranding(plainShop),
        ...stored,
        heroTitle: cleanBrandingText(stored.heroTitle || plainShop.shopName || 'Online store', 80),
        heroSubtitle: cleanBrandingText(stored.heroSubtitle, 180),
        heroCtaLabel: cleanBrandingText(stored.heroCtaLabel, 30),
        heroCtaType: CTA_TYPES.includes(stored.heroCtaType) ? stored.heroCtaType : 'NONE',
        heroCtaTargetId: String(stored.heroCtaTargetId || '').trim(),
        heroCtaUrl: String(stored.heroCtaUrl || '').trim(),
        heroHidden: Boolean(stored.heroHidden),
        source: BRANDING_SOURCES.includes(stored.source) ? stored.source : 'default',
        legacyLogoUrl: stored.logoRemoved ? '' : String(theme.logoUrl || '').trim(),
        legacyFaviconUrl: stored.faviconRemoved ? '' : String(theme.faviconUrl || '').trim(),
        legacyHeroImageUrl: stored.heroImageRemoved
            ? ''
            : String(slide?.desktopImage || slide?.mobileImage || theme.hero?.imageUrl || '').trim()
    };
};

const getOwnedBrandingAssets = async ({ shopId, branding }) => {
    const ids = [
        branding.logoAssetId,
        branding.faviconAssetId,
        branding.heroImageAssetId
    ].filter(Boolean);
    if (!ids.length) return new Map();

    const assets = await StoreBuilderAsset.find({
        _id: { $in: ids },
        shop_id: shopId,
        status: { $in: ['active', 'temporary'] }
    }).select('_id url target width height').lean();

    return new Map(assets.map(asset => [String(asset._id), asset]));
};

const resolveCtaUrl = async ({ shopId, branding }) => {
    if (!branding.heroCtaLabel || branding.heroCtaType === 'NONE') return null;
    if (branding.heroCtaType === 'SHOP') return '#products';
    if (branding.heroCtaType === 'CUSTOM_URL') {
        try {
            return validateCustomUrl(branding.heroCtaUrl) || null;
        } catch {
            return null;
        }
    }

    if (branding.heroCtaType === 'PRODUCT' && mongoose.Types.ObjectId.isValid(branding.heroCtaTargetId)) {
        const product = await Product.findOne({
            _id: branding.heroCtaTargetId,
            shop_id: shopId,
            isDeleted: false
        }).select('_id slug').lean();
        return product ? `/products/${product.slug || product._id}` : null;
    }

    if (branding.heroCtaType === 'COLLECTION' && mongoose.Types.ObjectId.isValid(branding.heroCtaTargetId)) {
        const collection = await Collection.findOne({
            _id: branding.heroCtaTargetId,
            shop_id: shopId,
            isActive: true
        }).select('_id slug').lean();
        return collection ? `/collections/${collection.slug || collection._id}` : null;
    }

    if (branding.heroCtaType === 'CATEGORY' && branding.heroCtaTargetId) {
        const category = await Product.findOne({
            shop_id: shopId,
            category: branding.heroCtaTargetId,
            isDeleted: false
        }).select('category').lean();
        return category ? `/categories/${encodeURIComponent(category.category)}` : null;
    }

    return null;
};

const resolveStoreBranding = async shop => {
    const plainShop = toPlain(shop);
    const branding = getStoredOrDerivedBranding(plainShop);
    const assets = await getOwnedBrandingAssets({ shopId: plainShop._id, branding });
    const assetUrl = id => id ? assets.get(String(id))?.url || '' : '';
    const heroCtaUrl = await resolveCtaUrl({ shopId: plainShop._id, branding });

    return {
        logoUrl: assetUrl(branding.logoAssetId) || branding.legacyLogoUrl || '',
        faviconUrl: assetUrl(branding.faviconAssetId) || branding.legacyFaviconUrl || '',
        heroImageUrl: assetUrl(branding.heroImageAssetId) || branding.legacyHeroImageUrl || '',
        heroTitle: branding.heroTitle,
        heroSubtitle: branding.heroSubtitle,
        heroCta: {
            label: heroCtaUrl ? branding.heroCtaLabel : '',
            type: heroCtaUrl ? branding.heroCtaType : 'NONE',
            targetId: heroCtaUrl && !['SHOP', 'CUSTOM_URL'].includes(branding.heroCtaType)
                ? branding.heroCtaTargetId
                : null,
            url: heroCtaUrl
        },
        heroHidden: Boolean(branding.heroHidden),
        source: branding.source,
        version: Number(branding.version || 0),
        updatedAt: branding.updatedAt || null
    };
};

const validateCustomUrl = value => {
    const input = String(value || '').trim();
    if (!input) return '';
    if (input.startsWith('/')) {
        const path = input.toLowerCase();
        if (
            path.startsWith('//') ||
            path.startsWith('/admin') ||
            path.startsWith('/dashboard') ||
            path.startsWith('/api')
        ) {
            const error = new Error('The custom link cannot point to an administrative or API route.');
            error.statusCode = 400;
            error.code = 'UNSAFE_BRANDING_CTA';
            throw error;
        }
        return input;
    }
    try {
        const url = new URL(input);
        if (url.protocol !== 'https:') throw new Error('unsafe');
        return url.toString();
    } catch {
        const error = new Error('Enter a valid HTTPS destination.');
        error.statusCode = 400;
        error.code = 'INVALID_BRANDING_CTA';
        throw error;
    }
};

const assertCtaTargetOwned = async ({ shopId, type, targetId }) => {
    if (type === 'SHOP' || type === 'NONE' || type === 'CUSTOM_URL') return;
    if (!targetId) {
        const error = new Error('Select a destination for the hero button.');
        error.statusCode = 400;
        error.code = 'BRANDING_CTA_TARGET_REQUIRED';
        throw error;
    }

    let owned = false;
    if (type === 'PRODUCT' && mongoose.Types.ObjectId.isValid(targetId)) {
        owned = Boolean(await Product.exists({ _id: targetId, shop_id: shopId, isDeleted: false }));
    } else if (type === 'COLLECTION' && mongoose.Types.ObjectId.isValid(targetId)) {
        owned = Boolean(await Collection.exists({ _id: targetId, shop_id: shopId }));
    } else if (type === 'CATEGORY') {
        owned = Boolean(await Product.exists({ shop_id: shopId, category: String(targetId), isDeleted: false }));
    }

    if (!owned) {
        const error = new Error('The selected destination does not belong to this shop.');
        error.statusCode = 403;
        error.code = 'BRANDING_CTA_TARGET_NOT_OWNED';
        throw error;
    }
};

const buildBrandingUpdate = async ({ shop, payload }) => {
    const allowedFields = new Set([
        'heroTitle',
        'heroSubtitle',
        'heroCtaLabel',
        'heroCtaType',
        'heroCtaTargetId',
        'heroCtaUrl',
        'heroHidden',
        'expectedVersion'
    ]);
    const unknown = Object.keys(payload || {}).filter(key => !allowedFields.has(key));
    if (unknown.length) {
        const error = new Error(`Unknown branding field${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}`);
        error.statusCode = 400;
        error.code = 'UNKNOWN_BRANDING_FIELDS';
        throw error;
    }

    const expectedVersion = Number(payload.expectedVersion);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
        const error = new Error('A valid branding version is required.');
        error.statusCode = 400;
        error.code = 'BRANDING_VERSION_REQUIRED';
        throw error;
    }

    const current = getStoredOrDerivedBranding(shop);
    const next = {
        ...current,
        heroTitle: cleanBrandingText(payload.heroTitle ?? current.heroTitle, 80),
        heroSubtitle: cleanBrandingText(payload.heroSubtitle ?? current.heroSubtitle, 180),
        heroCtaLabel: cleanBrandingText(payload.heroCtaLabel ?? current.heroCtaLabel, 30),
        heroCtaType: String(payload.heroCtaType ?? current.heroCtaType ?? 'NONE').toUpperCase(),
        heroCtaTargetId: String(payload.heroCtaTargetId ?? current.heroCtaTargetId ?? '').trim(),
        heroCtaUrl: String(payload.heroCtaUrl ?? current.heroCtaUrl ?? '').trim(),
        heroHidden: payload.heroHidden === undefined ? Boolean(current.heroHidden) : payload.heroHidden === true,
        source: 'explicit'
    };

    if (!next.heroTitle) {
        const error = new Error('Hero heading is required and must be 80 characters or fewer.');
        error.statusCode = 400;
        error.code = 'INVALID_BRANDING_TITLE';
        throw error;
    }
    if (!CTA_TYPES.includes(next.heroCtaType)) {
        const error = new Error('Select a valid hero button destination.');
        error.statusCode = 400;
        error.code = 'INVALID_BRANDING_CTA_TYPE';
        throw error;
    }
    if (!next.heroCtaLabel) {
        next.heroCtaType = 'NONE';
        next.heroCtaTargetId = '';
        next.heroCtaUrl = '';
    } else if (next.heroCtaType === 'CUSTOM_URL') {
        next.heroCtaUrl = validateCustomUrl(next.heroCtaUrl);
        next.heroCtaTargetId = '';
    } else {
        next.heroCtaUrl = '';
        await assertCtaTargetOwned({
            shopId: shop._id,
            type: next.heroCtaType,
            targetId: next.heroCtaTargetId
        });
        if (['SHOP', 'NONE'].includes(next.heroCtaType)) next.heroCtaTargetId = '';
    }

    return { expectedVersion, next };
};

const assertBrandingUpload = ({ file, target }) => {
    const rules = BRANDING_UPLOAD_RULES[target];
    if (!rules || !file?.path || !(file.public_id || file.filename)) {
        const error = new Error(`A valid ${target} image is required.`);
        error.statusCode = 400;
        error.code = 'INVALID_BRANDING_ASSET';
        throw error;
    }
    if (Number(file.size || 0) > rules.maxBytes) {
        const error = new Error(`The ${target} image is too large.`);
        error.statusCode = 400;
        error.code = 'BRANDING_ASSET_TOO_LARGE';
        throw error;
    }
    const width = Number(file.width || 0);
    const height = Number(file.height || 0);
    if (
        width < rules.minWidth ||
        height < rules.minHeight ||
        width > rules.maxWidth ||
        height > rules.maxHeight
    ) {
        const error = new Error(
            `${target === 'hero' ? 'Hero image' : target === 'favicon' ? 'Browser icon' : 'Logo'} dimensions are not supported.`
        );
        error.statusCode = 400;
        error.code = 'INVALID_BRANDING_ASSET_DIMENSIONS';
        throw error;
    }
};

const createActiveBrandingAsset = async ({ req, file, target }) => StoreBuilderAsset.create({
    shop_id: req.tenantId,
    uploadedBy: req.user?._id || req.user?.id || null,
    target: `essential_branding_${target}`,
    url: file.secure_url || file.path,
    publicId: file.public_id || file.filename,
    resourceType: file.resource_type || 'image',
    format: file.format || '',
    mimeType: file.mimetype || '',
    originalName: file.originalname || '',
    size: Number(file.size || 0),
    width: Number(file.width || 0),
    height: Number(file.height || 0),
    status: 'active',
    promotedAt: new Date(),
    expiresAt: null
});

const destroyUploadedFile = async file => {
    const publicId = file?.public_id || file?.filename;
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId, {
        resource_type: file.resource_type || 'image',
        invalidate: true
    }).catch(() => null);
};

const retireAssetIfUnreferenced = async assetId => {
    if (!assetId) return;
    const asset = await StoreBuilderAsset.findById(assetId).lean();
    if (!asset) return;
    const [shopReference, draftReference] = await Promise.all([
        Shop.exists({
            $or: [
                { 'branding.logoAssetId': asset._id },
                { 'branding.faviconAssetId': asset._id },
                { 'branding.heroImageAssetId': asset._id },
                { 'theme.logoUrl': asset.url },
                { 'theme.faviconUrl': asset.url },
                { 'theme.hero.imageUrl': asset.url },
                { 'theme.hero.bannerSlides.desktopImage': asset.url },
                { 'theme.hero.bannerSlides.mobileImage': asset.url }
            ]
        }),
        StoreBuilderDraft.exists({ assetIds: asset._id })
    ]);
    if (shopReference || draftReference) return;
    const now = new Date();
    await StoreBuilderAsset.updateOne({ _id: asset._id, status: 'active' }, {
        $set: {
            status: 'retired',
            retiredAt: now,
            cleanupAfter: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        }
    });
};

const applyBrandingToPublicTheme = ({ theme = {}, branding, storeBuilderEnabled = false }) => {
    if (!branding) return theme;

    if (storeBuilderEnabled) {
        const hero = theme.hero || {};
        const hasPremiumHero = Boolean(
            hero.imageUrl ||
            hero.title ||
            (Array.isArray(hero.bannerSlides) && hero.bannerSlides.some(slide => (
                slide?.desktopImage || slide?.mobileImage || slide?.title
            )))
        );
        return {
            ...theme,
            logoUrl: theme.logoUrl || branding.logoUrl,
            faviconUrl: theme.faviconUrl || branding.faviconUrl,
            hero: hasPremiumHero ? hero : {
                ...hero,
                title: branding.heroTitle,
                subtitle: branding.heroSubtitle,
                imageUrl: branding.heroImageUrl,
                ctaLabel: branding.heroCta?.label || '',
                ctaUrl: branding.heroCta?.url || '',
                hidden: branding.heroHidden
            }
        };
    }

    const ctaLabel = branding.heroCta?.label || '';
    const ctaUrl = branding.heroCta?.url || '';
    return {
        ...theme,
        logoUrl: branding.logoUrl || '',
        faviconUrl: branding.faviconUrl || '',
        hero: {
            ...(theme.hero || {}),
            title: branding.heroTitle,
            subtitle: branding.heroSubtitle,
            imageUrl: branding.heroImageUrl || '',
            ctaLabel,
            ctaUrl,
            hidden: branding.heroHidden,
            height: branding.heroImageUrl ? 'Medium' : 'Compact',
            bannerSlides: [{
                id: 'essential-branding-hero',
                enabled: true,
                desktopImage: branding.heroImageUrl || '',
                mobileImage: branding.heroImageUrl || '',
                title: branding.heroTitle,
                subtitle: branding.heroSubtitle,
                badgeText: '',
                discountText: '',
                primaryCtaText: ctaLabel,
                primaryCtaLink: ctaUrl,
                secondaryCtaText: '',
                secondaryCtaLink: ''
            }]
        }
    };
};

module.exports = {
    CTA_TYPES,
    BRANDING_ASSET_FIELDS,
    BRANDING_REMOVAL_FIELDS,
    BRANDING_UPLOAD_RULES,
    cleanBrandingText,
    hasStoredBranding,
    safeDefaultBranding,
    deriveBrandingFromShop,
    getStoredOrDerivedBranding,
    resolveStoreBranding,
    validateCustomUrl,
    buildBrandingUpdate,
    assertBrandingUpload,
    createActiveBrandingAsset,
    destroyUploadedFile,
    retireAssetIfUnreferenced,
    applyBrandingToPublicTheme
};
