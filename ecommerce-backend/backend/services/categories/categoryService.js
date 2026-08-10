const cleanCategoryName = (value = '') => String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
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
        seo: {
            title: String(category.seo?.title || '').trim().slice(0, 70),
            description: String(category.seo?.description || '').trim().slice(0, 170)
        },
        ...(category.updatedAt ? { updatedAt: category.updatedAt } : {}),
        ...(Number.isFinite(Number(category.productCount)) ? { productCount: Number(category.productCount) } : {})
    };
};

const mergeCategoryDetails = ({ names = [], metadata = [], counts = new Map() } = {}) => {
    const metadataByKey = new Map();
    for (const item of metadata) {
        const key = normalizeCategoryKey(item?.name);
        if (!key) continue;

        const current = metadataByKey.get(key);
        const currentHasImage = Boolean(current?.coverImage?.url || current?.image);
        const itemHasImage = Boolean(item?.coverImage?.url || item?.image);
        const currentUpdatedAt = new Date(current?.updatedAt || 0).getTime() || 0;
        const itemUpdatedAt = new Date(item?.updatedAt || 0).getTime() || 0;

        if (!current || (itemHasImage && !currentHasImage) || (itemHasImage === currentHasImage && itemUpdatedAt > currentUpdatedAt)) {
            metadataByKey.set(key, item);
        }
    }

    const displayNameByKey = new Map();
    for (const candidate of [...names, ...metadata.map(item => item?.name)]) {
        const name = cleanCategoryName(candidate);
        const key = normalizeCategoryKey(name);
        if (key && !displayNameByKey.has(key)) displayNameByKey.set(key, name);
    }

    return [...displayNameByKey.entries()]
        .sort(([, nameA], [, nameB]) => nameA.localeCompare(nameB))
        .map(([key, name]) => serializeCategoryDetail({
            ...(metadataByKey.get(key) || {}),
            name,
            productCount: counts.get(key) ?? undefined
        }, name));
};

module.exports = {
    cleanCategoryName,
    normalizeCategoryKey,
    serializeCategoryDetail,
    mergeCategoryDetails
};
