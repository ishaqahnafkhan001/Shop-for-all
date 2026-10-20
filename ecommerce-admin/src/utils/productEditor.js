export const MAX_VARIANTS = 500;
export const PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PRODUCT_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
export const PRODUCT_FILE_BYTES = 10 * 1024 * 1024;
export const productImageLimit = value => value === null ? 15 : Math.min(15, Math.max(0, Number(value ?? 5)));

export const mergeProductFiles = (existing, incoming, { kind = 'image', limit, retained = 0 }) => {
    const allowed = kind === 'image' ? PRODUCT_IMAGE_TYPES : PRODUCT_VIDEO_TYPES;
    const files = Array.from(incoming || []);
    if (files.some(file => !allowed.includes(file.type))) throw new Error(kind === 'image' ? 'Use JPG, PNG, or WebP product images.' : 'Use MP4 or MOV product videos.');
    if (files.some(file => file.size > PRODUCT_FILE_BYTES)) throw new Error('Each product file must be 10 MiB or smaller.');
    const identity = file => `${file.name}:${file.size}:${file.lastModified}`;
    const merged = [...existing];
    const seen = new Set(existing.map(identity));
    for (const file of files) if (!seen.has(identity(file))) { merged.push(file); seen.add(identity(file)); }
    if (retained + merged.length > limit) throw new Error(`You can use up to ${limit} product ${kind === 'image' ? 'images' : 'videos'}. Remove a file before adding more.`);
    return merged;
};

export const toPublishInstant = value => {
    const date = new Date(value);
    if (!value || !Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) throw new Error('Choose a valid future publish date and time.');
    return date.toISOString();
};

export const variantMetadataPayload = (variant, baseline) => {
    const payload = {};
    for (const key of ['attributes', 'priceOverride', 'pricing', 'image', 'sku', 'barcode', 'weight', 'dimensions', 'status', 'tax', 'isActive']) {
        if (variant[key] !== undefined) payload[key] = variant[key];
    }
    payload.inventory = {};
    for (const key of ['lowStockThreshold', 'trackQuantity', 'allowOversell']) if (variant.inventory?.[key] !== undefined) payload.inventory[key] = variant.inventory[key];
    if (variant._id) payload._id = variant._id;
    else { payload.stock = Number(variant.stock); payload.inventory.stock = Number(variant.stock); }
    if (variant._id && baseline) {
        for (const key of Object.keys(payload)) {
            if (key === '_id') continue;
            if (['pricing', 'inventory', 'dimensions', 'tax'].includes(key) && payload[key]) {
                payload[key] = Object.fromEntries(Object.entries(payload[key]).filter(([field, value]) => JSON.stringify(value) !== JSON.stringify(baseline[key]?.[field])));
                if (!Object.keys(payload[key]).length) delete payload[key];
            } else if (JSON.stringify(payload[key]) === JSON.stringify(baseline[key])) delete payload[key];
        }
    }
    return payload;
};

export const productCombinationCount = attributes => attributes.reduce((count, attr) => count * attr.options.length, 1);

export const productVariantKey = variant => JSON.stringify((variant.attributes || [])
    .map(attribute => [String(attribute.name || '').trim().toLowerCase(), String(attribute.value || '').trim().toLowerCase()])
    .sort((a, b) => a[0].localeCompare(b[0])));

export const productOptionCombinationCount = (variants, attributeName) => {
    const dimensions = new Map();
    for (const variant of variants) for (const attribute of variant.attributes || []) {
        const name = attribute.name.trim().toLowerCase();
        if (!dimensions.has(name)) dimensions.set(name, new Set());
        dimensions.get(name).add(attribute.value.trim().toLowerCase());
    }
    const name = attributeName.trim().toLowerCase();
    if (!dimensions.has(name)) return 0;
    return [...dimensions].reduce((count, [key, values]) => key === name ? count : count * values.size, 1);
};

export const productImageSources = ({ images = [], variants = [] } = {}) => [...new Set([
    ...images, ...variants.map(variant => variant.image)
].filter(source => source && !source.startsWith('product-image:')).map(source => {
    try { const url = new URL(source); url.search = ''; url.hash = ''; return url.toString(); }
    catch { return source.trim(); }
}))];
