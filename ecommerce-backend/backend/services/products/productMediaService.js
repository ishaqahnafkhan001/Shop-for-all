const parseProductPayload = (body) => {
    const parsedBody = { ...body };
    const jsonFields = [
        'pricing',
        'images',
        'videos',
        'variants',
        'variantMatrix',
        'options',
        'features',
        'specifications',
        'comments',
        'collections',
        'seo',
        'sellerFacts',
        'addAttributeOption',
        'removeVariants',
        'existingImages',
        'removedImages',
        'coverImageIndex'
    ];

    for (const field of jsonFields) {
        if (typeof parsedBody[field] === 'string') {
            try {
                parsedBody[field] = JSON.parse(parsedBody[field]);
            } catch {
                throw new Error(`Invalid JSON in field: "${field}"`);
            }
        }
    }

    if (typeof parsedBody.tags === 'string') {
        if (parsedBody.tags.trim().startsWith('[')) {
            parsedBody.tags = JSON.parse(parsedBody.tags);
        } else {
            parsedBody.tags = parsedBody.tags.split(',').map(tag => tag.trim()).filter(Boolean);
        }
    }

    return parsedBody;
};

const resolveImageReference = (value, imageUrls = []) => {
    const raw = String(value || '').trim();
    if (!raw.startsWith('product-image:')) return raw;

    const index = Number(raw.replace('product-image:', ''));
    if (!Number.isInteger(index) || index < 0 || !imageUrls[index]) throw new Error('Variant image selection is no longer available. Select an image again.');
    return imageUrls[index];
};

const resolveCoverMediaId = ({ images = [], videos = [], requestedCover = '', coverImageIndex }) => {
    if (coverImageIndex !== undefined && coverImageIndex !== null) {
        const index = Number(coverImageIndex);
        if (!Number.isInteger(index) || index < 0 || index >= images.length) {
            if (!images.length && index === 0) return videos[0] || '';
            throw new Error('Selected cover image is no longer available.');
        }
        return images[index];
    }
    if ([...images, ...videos].includes(requestedCover)) return requestedCover;
    return images[0] || videos[0] || '';
};

const resolveVariantImageReferences = (payload, imageUrls = []) => {
    if (payload.variantMatrix?.overrides) {
        for (const override of Object.values(payload.variantMatrix.overrides)) {
            if (override?.image) override.image = resolveImageReference(override.image, imageUrls);
            if (override?.image === '') delete override.image;
        }
    }

    if (Array.isArray(payload.variants)) {
        payload.variants = payload.variants.map(variant => ({
            ...variant,
            image: variant.image ? resolveImageReference(variant.image, imageUrls) : variant.image
        }));
    }

    return payload;
};

const normalizeSourceIdentity = (value) => {
    const source = String(value || '').trim();
    if (!source) return '';
    try {
        const url = new URL(source);
        url.search = '';
        url.hash = '';
        return url.toString();
    } catch {
        return source;
    }
};

const getUniqueProductImageSources = (product = {}) => {
    const values = [
        ...((product.videos || []).includes(product.coverMediaId) ? [] : [product.coverMediaId]),
        ...(Array.isArray(product.images) ? product.images : []),
        ...(Array.isArray(product.variants)
            ? product.variants.map(variant => variant?.image)
            : [])
    ];
    return [...new Set(values.map(normalizeSourceIdentity).filter(Boolean))];
};

// External HTTP(S) product URLs remain supported. Managed CDN assets must be
// newly uploaded, already retained, or recorded as belonging to this shop.
const assertProductMediaReferences = async ({ product, previous = {}, uploaded = [], shopId, session }) => {
    const sources = [...getUniqueProductImageSources(product), ...(product.videos || [])].filter(Boolean);
    const retained = new Set([...getUniqueProductImageSources(previous), ...(previous.videos || []), ...uploaded].map(normalizeSourceIdentity));
    for (const source of sources) {
        let url;
        try { url = new URL(source); } catch { throw new Error('Use a valid HTTP(S) product media URL.'); }
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Use a valid HTTP(S) product media URL.');
        if (retained.has(normalizeSourceIdentity(source))) continue;
        if (url.hostname !== 'res.cloudinary.com') continue;
        if (/(?:authenticated|private|verification|vendor_verifications)/i.test(decodeURIComponent(url.pathname))) throw new Error('Private assets cannot be used as product media.');
        const owned = await require('../../models/Product').exists({ shop_id: shopId, isDeleted: false, $or: [{ images: source }, { videos: source }, { 'variants.image': source }] }).session(session);
        if (!owned) throw new Error('This managed media asset does not belong to this store. Upload the file instead.');
    }
};

module.exports = {
    assertProductMediaReferences,
    resolveCoverMediaId,
    parseProductPayload,
    resolveVariantImageReferences,
    normalizeSourceIdentity,
    getUniqueProductImageSources
};
