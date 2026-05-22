/**
 * Normalizes raw product data from the API into a consistent shape.
 * Kept outside components so it's never recreated on re-render.
 */
export const normalizeProduct = (raw) => {
    if (!raw) return null;

    const sellingPrice = raw?.pricing?.sellingPrice ?? raw?.sellingPrice ?? 0;
    const discount     = raw?.pricing?.discount     ?? raw?.discount     ?? 0;
    const finalPrice   = raw?.finalPrice ?? Math.round(sellingPrice - (sellingPrice * discount) / 100);
    const stock        = raw?.totalStock ?? raw?.stock ?? (
        Array.isArray(raw?.variants)
            ? raw.variants.reduce((sum, v) => sum + (v?.stock || 0), 0)
            : 0
    );

    return {
        ...raw,
        sellingPrice,
        discount,
        finalPrice,
        stock,
        averageRating : raw?.averageRating ?? 0,
        numReviews    : raw?.numReviews    ?? 0,
        images        : raw?.images?.length > 0 ? raw.images : [raw?.imageUrl || 'https://via.placeholder.com/600'],
        variants      : raw?.variants      || [],
        features      : raw?.features      || [],
        specifications: raw?.specifications || [],
        comments      : raw?.comments      || [],
    };
};