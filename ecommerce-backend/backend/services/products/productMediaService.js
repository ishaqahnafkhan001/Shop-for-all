const parseProductPayload = (body) => {
    const parsedBody = { ...body };
    const jsonFields = [
        'pricing',
        'variants',
        'variantMatrix',
        'options',
        'features',
        'specifications',
        'comments',
        'collections',
        'seo',
        'addAttributeOption',
        'removeVariants'
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
    return Number.isInteger(index) && imageUrls[index] ? imageUrls[index] : '';
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

module.exports = {
    parseProductPayload,
    resolveVariantImageReferences
};
