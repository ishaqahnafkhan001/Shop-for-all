const PUBLIC_PRODUCT_CARD_PROJECT = {
    title: 1,
    slug: 1,
    category: 1,
    collections: 1,
    imageAltText: 1,
    images: { $slice: ['$images', 1] },
    pricing: {
        sellingPrice: '$pricing.sellingPrice',
        discount: '$pricing.discount'
    },
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
    discount: pricing.discount
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
                title: String(item?.title || '').trim(),
                value: String(item?.value || '').trim()
            }))
            .filter(item => item.title && item.value)
        : []
);

const sanitizePublicProduct = (product) => {
    const clean = toPlainObject(product);
    if (!clean) return clean;

    clean.pricing = sanitizePublicPricing(clean.pricing || {});
    if (Array.isArray(clean.variants)) {
        clean.variants = clean.variants.map(sanitizePublicVariant);
    }

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
