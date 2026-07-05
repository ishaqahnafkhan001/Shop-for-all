const PUBLIC_PRODUCT_CARD_PROJECT = {
    title: 1,
    slug: 1,
    category: 1,
    collections: 1,
    imageAltText: 1,
    coverMediaId: 1,
    images: { $slice: ['$images', 1] },
    pricing: {
        sellingPrice: '$pricing.sellingPrice',
        discount: '$pricing.discount',
        salePrice: '$pricing.salePrice',
        compareAtPrice: '$pricing.compareAtPrice'
    },
    finalPrice: 1,
    salePrice: 1,
    compareAtPrice: 1,
    scheduledSale: 1,
    averageRating: 1,
    numReviews: 1,
    totalStock: { $sum: '$variants.stock' },
    variantCount: { $size: { $ifNull: ['$variants', []] } }
};

const toPlainObject = (value) => {
    if (!value) return value;
    if (typeof value.toObject === 'function') return value.toObject({ virtuals: true });
    return { ...value };
};

const sanitizePublicPricing = (pricing = {}) => ({
    sellingPrice: pricing.sellingPrice,
    discount: pricing.discount,
    salePrice: pricing.salePrice,
    compareAtPrice: pricing.compareAtPrice
});

const sanitizePublicVariantPricing = (pricing = {}) => {
    const clean = {};
    if (pricing.price !== undefined) clean.price = pricing.price;
    if (pricing.compareAtPrice !== undefined) clean.compareAtPrice = pricing.compareAtPrice;
    return clean;
};

const sanitizePublicVariant = (variant = {}) => {
    const clean = toPlainObject(variant) || {};
    delete clean.inventory;
    delete clean.tax;

    clean.pricing = sanitizePublicVariantPricing(clean.pricing || {});

    return clean;
};

const sanitizePublicKeyValueItems = (items = []) => (
    Array.isArray(items)
        ? items
            .map(item => ({
                title: String(item?.title || item?.point || item?.label || item?.name || '').trim(),
                value: String(item?.value || item?.reason || item?.description || item?.text || '').trim()
            }))
            .filter(item => item.title && item.value)
        : []
);

const sanitizePublicSellingPoints = (items = []) => (
    Array.isArray(items)
        ? items
            .map(item => {
                if (typeof item === 'string') {
                    const reason = String(item || '').trim();
                    return reason ? {
                        title: 'Product benefit',
                        value: reason,
                        point: 'Product benefit',
                        reason
                    } : null;
                }

                const point = String(item?.point || item?.title || item?.label || item?.name || '').trim();
                const reason = String(item?.reason || item?.value || item?.description || item?.text || '').trim();
                return point && reason ? {
                    title: point,
                    value: reason,
                    point,
                    reason
                } : null;
            })
            .filter(Boolean)
        : []
);

const sanitizePublicProduct = (product) => {
    const clean = toPlainObject(product);
    if (!clean) return clean;

    clean.pricing = sanitizePublicPricing(clean.pricing || {});
    if (Array.isArray(clean.variants)) {
        clean.variants = clean.variants.map(sanitizePublicVariant);
    }

    clean.features = sanitizePublicSellingPoints(clean.features);
    clean.specifications = sanitizePublicKeyValueItems(clean.specifications);
    clean.comments = sanitizePublicKeyValueItems(clean.comments);
    delete clean.__v;

    return clean;
};

const sanitizePublicProducts = (products = []) => products.map(sanitizePublicProduct);

module.exports = {
    PUBLIC_PRODUCT_CARD_PROJECT,
    sanitizePublicProduct,
    sanitizePublicProducts
};
