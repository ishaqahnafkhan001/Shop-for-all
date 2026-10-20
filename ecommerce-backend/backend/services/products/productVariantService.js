const {
    expandMatrix,
    makeVariantKey,
    generateNewOptionCombos,
    normalizeProductOptions
} = require('../../helpers/variantMatrix');
const MAX_VARIANTS = 500;
const canonicalKey = makeVariantKey;
const plain = value => value?.toObject ? value.toObject() : (value || {});

const assertVariantSet = variants => {
    if (!variants.length || variants.length > MAX_VARIANTS) throw new Error(`A product must have 1 to ${MAX_VARIANTS} variants.`);
    const seen = new Set();
    const ids = new Set();
    for (const variant of variants) {
        if (variant._id) {
            if (ids.has(String(variant._id))) throw new Error('Duplicate variant identity detected.');
            ids.add(String(variant._id));
        }
        const attrs = variant.attributes || [];
        const names = attrs.map(a => String(a.name).trim().toLowerCase());
        if (new Set(names).size !== names.length) throw new Error('Duplicate attribute name in variant.');
        const key = canonicalKey(attrs);
        if (seen.has(key)) throw new Error('Duplicate variant combination detected.');
        seen.add(key);
    }
};

const reconcileProductOptions = product => {
    const previous = (product.options || []).map(plain);
    const names = new Map();
    for (const variant of product.variants) for (const attr of variant.attributes || []) {
        const name = String(attr.name).trim().toLowerCase();
        attr.name = name;
        if (!names.has(name)) names.set(name, new Set());
        names.get(name).add(attr.value);
    }
    product.options = [...names].map(([name, values], index) => {
        const old = previous.find(option => option.name.toLowerCase() === name);
        const ordered = [...values].sort((a, b) => {
            const position = value => old?.values?.findIndex(item => item.value === value) ?? -1;
            return (position(a) < 0 ? Infinity : position(a)) - (position(b) < 0 ? Infinity : position(b));
        });
        return { ...(old || {}), name, sortOrder: old?.sortOrder ?? index, values: ordered.map((value, i) => ({
            ...(old?.values?.find(item => item.value === value) || { value, label: value }), sortOrder: i
        })) };
    });
};

// Historical simple products copied the base amounts into their sole variant.
// Move those copies only on an explicit base edit; preserve distinct custom amounts.
const updateProductPricing = (product, pricing) => {
    const previous = plain(product.pricing);
    const variant = product.variants?.length === 1 && !(product.variants[0].attributes || []).length ? product.variants[0] : null;
    if (variant) {
        if (pricing.sellingPrice !== undefined && (variant.pricing?.price ?? variant.priceOverride) === previous.sellingPrice && (variant.priceOverride == null || variant.priceOverride === previous.sellingPrice)) {
            variant.pricing.price = pricing.sellingPrice;
            variant.priceOverride = pricing.sellingPrice;
        }
        if (pricing.buyingPrice !== undefined && variant.pricing?.costPrice === previous.buyingPrice) variant.pricing.costPrice = pricing.buyingPrice;
    }
    product.pricing = { ...previous, ...pricing };
    if (product.pricing.sellingPrice < product.pricing.buyingPrice) throw new Error('Selling price must be ≥ buying price');
};

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
    pricing: {},
    inventory: {
        stock: Number(stock) || 0,
        reservedStock: 0,
        lowStockThreshold: Number(lowStockThreshold ?? 5),
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

const applyVariantOperations = ({ product, value, canRemoveStock = false }) => {
    const oldVariants = product.variants.map(variant => plain(variant));
    const assertRemoval = remaining => {
        const keptIds = new Set(remaining.map(v => String(v._id)));
        for (const old of oldVariants) if (!keptIds.has(String(old._id))) {
            if (Number(old.inventory?.reservedStock || 0) > 0) throw new Error('Cannot remove a variant with reserved inventory.');
            if (old.stock > 0 && !canRemoveStock) throw Object.assign(new Error('Stocked variant removal requires inventoryManage permission.'), { statusCode: 403 });
        }
    };
    const finish = () => { assertVariantSet(product.variants); reconcileProductOptions(product); };
    if (['variantMatrix', 'variants', 'removeVariants', 'addAttributeOption'].filter(key => value[key] !== undefined).length > 1) throw new Error('Conflicting variant operations.');
    if (value.variantMatrix) {
        const matrix = value.variantMatrix;
        if (matrix.attributes.reduce((n, attr) => n * attr.options.length, 1) > MAX_VARIANTS) throw new Error(`Maximum allowed is ${MAX_VARIANTS} variants.`);
        const existing = new Map(oldVariants.map(variant => [canonicalKey(variant.attributes), variant]));
        const expanded = expandMatrix(value.variantMatrix, existing, override => {
            if (override.stock !== undefined || override.inventory?.stock !== undefined || override.inventory?.reservedStock !== undefined) throw new Error('Use the inventory adjustment endpoint for existing stock.');
        });
        assertRemoval(expanded);
        product.options = value.options || normalizeProductOptions(value.variantMatrix.attributes);
        product.variants = expanded;
        finish();
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
        if (product.variants.length + newVariants.length > MAX_VARIANTS) throw new Error(`Maximum allowed is ${MAX_VARIANTS} variants.`);
        product.variants.push(...newVariants);
        finish();
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

        assertRemoval(remaining);
        product.variants = remaining;
        finish();
        return;
    }

    if (!value.variants) return;

    for (const incoming of value.variants) {
        if (incoming._id) {
            const existing = product.variants.id(incoming._id);
            if (!existing) {
                throw new Error(`Variant not found: ${incoming._id}. Omit _id to create a new variant.`);
            }
            if (incoming.stock !== undefined || incoming.inventory?.stock !== undefined || incoming.inventory?.reservedStock !== undefined) throw new Error('Use the inventory adjustment endpoint for existing stock.');
            for (const field of ['attributes', 'image', 'barcode', 'weight', 'sku', 'status', 'isActive']) if (incoming[field] !== undefined) existing[field] = incoming[field];
            for (const field of ['pricing', 'inventory', 'dimensions', 'tax']) if (incoming[field] !== undefined) existing[field] = { ...plain(existing[field]), ...incoming[field] };
            if (incoming.pricing?.price !== undefined || incoming.priceOverride !== undefined) {
                const price = incoming.pricing?.price !== undefined ? incoming.pricing.price : incoming.priceOverride;
                existing.pricing.price = price == null ? undefined : price;
                existing.priceOverride = price == null ? undefined : price;
            }
            if (incoming.status !== undefined) existing.isActive = incoming.status === 'active';
        } else {
            product.variants.push(normalizeIncomingVariant(incoming));
        }
    }
    finish();
};

const buildStockAdjustmentLogs = ({ product, oldStockById, shopId, userId }) => {
    const currentIds = new Set(product.variants.map(v => String(v._id)));
    const removed = [...oldStockById].filter(([id, stock]) => !currentIds.has(id) && stock > 0).map(([id, stock]) => ({
        shop_id: shopId, productId: product._id, variantId: id, change: -stock, type: 'MANUAL', referenceId: product._id,
        beforeStock: stock, afterStock: 0, user: userId, note: 'Product update — variant removed'
    }));
    return product.variants.reduce((logs, variant) => {
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
    }, removed);
};

module.exports = {
    MAX_VARIANTS,
    assertVariantSet,
    updateProductPricing,
    normalizeIncomingVariant,
    buildSimpleVariant,
    snapshotVariantStock,
    applyVariantOperations,
    buildStockAdjustmentLogs,
    expandMatrix,
    normalizeProductOptions
};
