const {
    expandMatrix,
    makeVariantKey,
    generateNewOptionCombos,
    normalizeProductOptions
} = require('../../helpers/variantMatrix');

const normalizeIncomingVariant = (variant) => {
    const stock = Number(variant.inventory?.stock ?? variant.stock ?? 0);
    const status = variant.status || (variant.isActive === false ? 'draft' : 'active');

    return {
        ...variant,
        stock,
        inventory: {
            trackQuantity: true,
            allowOversell: false,
            reservedStock: 0,
            lowStockThreshold: 5,
            ...(variant.inventory || {}),
            stock
        },
        pricing: {
            ...(variant.priceOverride !== undefined ? { price: variant.priceOverride } : {}),
            ...(variant.pricing || {})
        },
        status,
        isActive: status === 'active' && variant.isActive !== false
    };
};

const buildSimpleVariant = ({ stock = 0, pricing = {}, lowStockThreshold = 5 }) => ({
    sku: '',
    attributes: [],
    stock: Number(stock) || 0,
    pricing: {
        price: pricing.sellingPrice,
        costPrice: pricing.buyingPrice
    },
    inventory: {
        stock: Number(stock) || 0,
        reservedStock: 0,
        lowStockThreshold: Number(lowStockThreshold) || 5,
        trackQuantity: true,
        allowOversell: false
    },
    status: 'active',
    tax: { taxable: true },
    isActive: true
});

const snapshotVariantStock = (product) => {
    const oldStockById = new Map();
    const oldVariantByKey = new Map();

    for (const variant of product.variants) {
        oldStockById.set(variant._id.toString(), variant.stock);
        oldVariantByKey.set(makeVariantKey(variant.attributes), variant.toObject ? variant.toObject() : variant);
    }

    return { oldStockById, oldVariantByKey };
};

const applyVariantOperations = ({ product, value, oldVariantByKey }) => {
    if (value.variantMatrix) {
        product.options = value.options || normalizeProductOptions(value.variantMatrix.attributes);
        product.variants = expandMatrix(value.variantMatrix, oldVariantByKey);
        return;
    }

    if (value.addAttributeOption) {
        const { name, option, defaultStock, defaultPrice } = value.addAttributeOption;
        const { newVariants, error: opError } = generateNewOptionCombos(
            product.variants,
            name,
            option,
            defaultStock,
            defaultPrice
        );

        if (opError) throw new Error(opError);
        product.variants.push(...newVariants);
        return;
    }

    if (value.removeVariants) {
        const removeSet = new Set(value.removeVariants);
        const remaining = product.variants.filter(variant => !removeSet.has(variant._id.toString()));

        if (remaining.length === 0) {
            throw new Error('Cannot remove all variants. A product must have at least one variant.');
        }

        const foundIds = new Set(product.variants.map(variant => variant._id.toString()));
        for (const id of removeSet) {
            if (!foundIds.has(id)) throw new Error(`Variant not found: ${id}`);
        }

        product.variants = remaining;
        return;
    }

    if (!value.variants) return;

    for (const incoming of value.variants) {
        if (incoming._id) {
            const existing = product.variants.id(incoming._id);
            if (!existing) {
                throw new Error(`Variant not found: ${incoming._id}. Omit _id to create a new variant.`);
            }
            const normalized = normalizeIncomingVariant(incoming);
            existing.stock = normalized.stock;
            existing.attributes = normalized.attributes;
            existing.priceOverride = normalized.priceOverride ?? normalized.pricing?.price;
            existing.pricing = normalized.pricing;
            existing.inventory = normalized.inventory;
            existing.image = normalized.image;
            existing.barcode = normalized.barcode;
            existing.weight = normalized.weight;
            existing.dimensions = normalized.dimensions;
            existing.tax = normalized.tax;
            existing.status = normalized.status;
            existing.isActive = normalized.isActive;
            if (incoming.sku !== undefined) existing.sku = incoming.sku;
        } else {
            product.variants.push(normalizeIncomingVariant(incoming));
        }
    }
};

const buildStockAdjustmentLogs = ({ product, oldStockById, shopId, userId }) => (
    product.variants.reduce((logs, variant) => {
        const oldStock = oldStockById.get(variant._id.toString()) ?? 0;
        const diff = variant.stock - oldStock;

        if (diff !== 0) {
            logs.push({
                shop_id: shopId,
                productId: product._id,
                variantId: variant._id,
                change: diff,
                type: 'MANUAL',
                referenceId: product._id,
                beforeStock: oldStock,
                afterStock: variant.stock,
                user: userId,
                note: 'Product update — manual stock change'
            });
        }

        return logs;
    }, [])
);

module.exports = {
    normalizeIncomingVariant,
    buildSimpleVariant,
    snapshotVariantStock,
    applyVariantOperations,
    buildStockAdjustmentLogs,
    expandMatrix,
    normalizeProductOptions
};
