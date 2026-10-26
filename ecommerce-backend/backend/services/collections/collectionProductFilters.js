// Apply effective-price filters after scheduled-sale pricing and before pagination.
const effectivePrice = product => Number(product.finalPrice ?? product.salePrice ?? product.pricing?.salePrice ?? Math.round(Number(product.pricing?.sellingPrice || 0) * (1 - Number(product.pricing?.discount || 0) / 100)));
const filterCollectionProducts = (products, filters = {}) => {
    const minimum = filters.minPrice === '' || filters.minPrice == null ? null : Number(filters.minPrice);
    const maximum = filters.maxPrice === '' || filters.maxPrice == null ? null : Number(filters.maxPrice);
    const rating = Number(filters.rating) || 0;
    const filtered = products.filter(product => {
        const price = effectivePrice(product);
        const stock = Number(product.totalStock ?? product.stock ?? 0);
        const compareAt = Number(product.compareAtPrice ?? product.pricing?.compareAtPrice ?? product.pricing?.sellingPrice ?? 0);
        if (minimum !== null && Number.isFinite(minimum) && price < minimum) return false;
        if (maximum !== null && Number.isFinite(maximum) && price > maximum) return false;
        if (filters.stock === 'in' && stock <= 0) return false;
        if (filters.stock === 'out' && stock > 0) return false;
        if (String(filters.sale) === 'true' && !(compareAt > price)) return false;
        if (rating > 0 && Number(product.averageRating || 0) < rating) return false;
        return true;
    });
    if (['price_asc', 'price_desc', 'priceAsc', 'priceDesc'].includes(filters.sort)) {
        const direction = ['price_desc', 'priceDesc'].includes(filters.sort) ? -1 : 1;
        filtered.sort((a, b) => direction * (effectivePrice(a) - effectivePrice(b)) || String(a._id).localeCompare(String(b._id)));
    }
    return filtered;
};
module.exports = { filterCollectionProducts, effectivePrice };
