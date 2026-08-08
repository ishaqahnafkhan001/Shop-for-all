const cleanCategoryName = (value = '') => String(value || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);

const normalizeCategoryKey = (value = '') => cleanCategoryName(value).toLowerCase();

const serializeCategoryDetail = (category = {}, fallbackName = '') => {
    const name = cleanCategoryName(category.name || fallbackName);
    const image = String(category.coverImage?.url || category.image || '').trim();

    return {
        ...(category._id ? { _id: category._id } : {}),
        name,
        // Category pages historically use the encoded category name, not a generated slug.
        slug: name,
        image,
        coverImage: image ? {
            url: image,
            altText: String(category.coverImage?.altText || `${name} category`).trim().slice(0, 140)
        } : null,
        ...(Number.isFinite(Number(category.productCount)) ? { productCount: Number(category.productCount) } : {})
    };
};

const mergeCategoryDetails = ({ names = [], metadata = [], counts = new Map() } = {}) => {
    const metadataByName = new Map(metadata.map(item => [normalizeCategoryKey(item.name), item]));
    const allNames = [...new Set([
        ...names.map(cleanCategoryName),
        ...metadata.map(item => cleanCategoryName(item.name))
    ].filter(Boolean))];

    return allNames
        .sort((a, b) => a.localeCompare(b))
        .map(name => serializeCategoryDetail({
            ...(metadataByName.get(normalizeCategoryKey(name)) || {}),
            productCount: counts.get(normalizeCategoryKey(name)) ?? undefined
        }, name));
};

module.exports = {
    cleanCategoryName,
    normalizeCategoryKey,
    serializeCategoryDetail,
    mergeCategoryDetails
};
