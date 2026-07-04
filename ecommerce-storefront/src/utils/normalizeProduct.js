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
            ? normalizedVariants.reduce((sum, v) => sum + (v?.stock || 0), 0)
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
