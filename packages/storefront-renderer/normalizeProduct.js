// Display snapshots are advisory; order prices are always recomputed by the server.
// Accept numeric API strings, but never coerce null/blank/boolean data to a free price.
export const getValidPrice = (...values) => {
    for (const value of values) {
        if (typeof value !== 'number' && typeof value !== 'string') continue;
        if (typeof value === 'string' && !value.trim()) continue;
        const price = Number(value);
        if (Number.isFinite(price) && price >= 0) return price;
    }
    return null;
};

export const getCartItemPrice = (item = {}) => (
    getValidPrice(item.cartPrice, item.finalPrice, item.sellingPrice, item.pricing?.sellingPrice) ?? 0
);

export const getCartItemOriginalPrice = (item = {}) => (
    getValidPrice(item.selectedVariant?.pricing?.price, item.selectedVariant?.priceOverride,
        item.sellingPrice, item.pricing?.sellingPrice) ?? 0
);

// Refresh only the matching product/variant. Never substitute another tenant's ID
// or silently select a different option when the chosen variant disappeared.
export const refreshCartItemPrice = (item, rawProduct) => {
    if (!rawProduct || String(rawProduct._id) !== String(item._id)) return item;
    const product = normalizeProduct(rawProduct);
    const variantId = item.variantId || item.selectedVariant?._id;
    const variant = variantId
        ? product.variants.find(v => String(v._id) === String(variantId) && v.isActive !== false && v.status !== 'archived')
        : product.variants.find(v => v.isActive !== false && v.status !== 'archived');
    if (variantId && !variant) return item;
    const attributes = Object.fromEntries((variant?.attributes || []).map(a => [a.name, a.value]));
    const price = getProductPresentation({...product, variants: variant ? [variant] : []}, attributes);
    return {...item, sellingPrice: price.baseOriginalPrice, finalPrice: price.displayFinalPrice, cartPrice: price.displayFinalPrice};
};

/**
 * Normalizes raw product data from the API into a consistent shape.
 * Kept outside components so it's never recreated on re-render.
 */
export const normalizeProduct = (raw) => {
    if (!raw) return null;

    const sellingPrice = raw?.pricing?.sellingPrice ?? raw?.sellingPrice ?? 0;
    const discount     = raw?.pricing?.discount     ?? raw?.discount     ?? 0;
    const finalPrice   = raw?.finalPrice ?? Math.round(sellingPrice - (sellingPrice * discount) / 100);
    const normalizedVariants = (raw?.variants || []).map(variant => ({
        ...variant,
        stock: variant?.inventory?.stock ?? variant?.stock ?? 0,
        priceOverride: variant?.pricing?.price ?? variant?.priceOverride
    }));
    const stock        = raw?.totalStock ?? raw?.stock ?? (
        Array.isArray(normalizedVariants)
            ? normalizedVariants.filter(v => v.isActive !== false && v.status !== 'archived').reduce((sum, v) => sum + (v?.stock || 0), 0)
            : 0
    );

    const images = raw?.images?.length > 0 ? raw.images : (raw?.imageUrl ? [raw.imageUrl] : []);
    const coverMediaId = raw?.coverMediaId || raw?.imageUrl || images[0] || "";

    return {
        ...raw,
        sellingPrice,
        discount,
        salePrice     : raw?.salePrice ?? raw?.pricing?.salePrice,
        compareAtPrice: raw?.compareAtPrice ?? raw?.pricing?.compareAtPrice,
        scheduledSale : raw?.scheduledSale || null,
        finalPrice,
        stock,
        averageRating : raw?.averageRating ?? 0,
        numReviews    : raw?.numReviews    ?? 0,
        coverMediaId,
        imageUrl      : coverMediaId,
        images,
        options       : raw?.options       || [],
        variants      : normalizedVariants,
        features      : raw?.features      || [],
        specifications: raw?.specifications || [],
        comments      : raw?.comments      || [],
        variantsLoaded: Array.isArray(raw?.variants) && raw.variants.length > 0,
    };
};

export const getInitialAttributes = (product) => {
    if (!product?.variants?.length) return {};
    const first = product.variants.find(v => v.isActive !== false && v.status !== 'archived');
    return Object.fromEntries((first?.attributes || []).map(a => [a.name, a.value]));
};
export function getProductPresentation(product, selectedAttributes = {}) {
    /* ---------- derived: attribute options ---------- */
    const availableAttributes = (() => {
        if (product?.options?.length > 0) {
            return Object.fromEntries(
                product.options
                    .slice()
                    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                    .map(option => [
                        option.name,
                        (option.values || [])
                            .slice()
                            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                            .map(value => value.value)
                    ])
            );
        }
        if (!product?.variants) return {};
        const attrs = {};
        product.variants.forEach(variant => {
            if (variant.isActive === false || variant.status === 'archived') return;
            (variant.attributes || []).forEach(({ name, value }) => {
                if (!attrs[name]) attrs[name] = new Set();
                attrs[name].add(value);
            });
        });
        return Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, [...v]]));
    })();

    /* ---------- derived: matched variant ---------- */
    const currentVariant = (() => {
        if (!product?.variants?.length) return null;
        return product.variants.find(variant =>
            variant.isActive !== false &&
            variant.status !== 'archived' &&
            (variant.attributes || []).every(attr => selectedAttributes[attr.name] === attr.value)
        ) ?? null;
    })();

    /* ---------- derived: display pricing / stock ---------- */
    const displayStock      = currentVariant
        ? (currentVariant.inventory?.stock ?? currentVariant.stock ?? 0)
        : (product?.stock ?? 0);
    const baseOriginalPrice = getValidPrice(currentVariant?.pricing?.price, currentVariant?.priceOverride, product?.sellingPrice) ?? 0;
    const productDiscount = product?.discount ?? 0;
    const productDiscountPrice = Math.round(baseOriginalPrice - (baseOriginalPrice * productDiscount) / 100);
    const scheduledSale = product?.scheduledSale || null;
    const scheduledSalePrice = scheduledSale
        ? (scheduledSale.discountType === 'fixed'
            ? Math.max(0, Math.round(productDiscountPrice - Number(scheduledSale.discountValue || 0)))
            : Math.max(0, Math.round(productDiscountPrice - ((productDiscountPrice * Number(scheduledSale.discountValue || 0)) / 100))))
        : null;
    const displayFinalPrice = scheduledSalePrice !== null ? scheduledSalePrice : productDiscountPrice;
    const displayDiscount = scheduledSalePrice !== null && productDiscountPrice > 0
        ? Math.round(((productDiscountPrice - scheduledSalePrice) / productDiscountPrice) * 100)
        : productDiscount;

    return { availableAttributes, currentVariant, displayStock, baseOriginalPrice, displayFinalPrice, displayDiscount };
}
