const Product = require('../models/Product');

class OutOfStockError extends Error {
    constructor(message) {
        super(message);
        this.name = 'OutOfStockError';
        this.code = 'OUT_OF_STOCK';
        this.statusCode = 400;
    }
}

const isWriteConflict = (err) => {
    const labels = typeof err?.hasErrorLabel === 'function'
        ? ['TransientTransactionError', 'UnknownTransactionCommitResult'].filter(label => err.hasErrorLabel(label))
        : Array.from(err?.errorLabels || []);

    return err?.code === 112 ||
        labels.includes('TransientTransactionError') ||
        /writeconflict|write conflict/i.test(String(err?.message || ''));
};

const toNumberQuantity = (quantity) => {
    const numericQuantity = Number(quantity);
    if (!Number.isInteger(numericQuantity) || numericQuantity < 1) {
        throw new Error('Quantity must be a positive whole number');
    }
    return numericQuantity;
};

const getVariantFromProduct = (product, variantId) => {
    if (!product || !variantId) return null;

    if (typeof product.variants?.id === 'function') {
        return product.variants.id(variantId);
    }

    return (product.variants || []).find(variant => String(variant._id) === String(variantId));
};

const buildOutOfStockMessage = ({ product, variant, quantity }) => {
    const title = product?.title || 'Selected product';
    const sku = variant?.sku ? ` (SKU: ${variant.sku})` : '';
    const available = Number(variant?.stock || 0);

    if (available > 0 && available < quantity) {
        return `Insufficient stock for "${title}"${sku}. Available: ${available}`;
    }

    return `Insufficient stock for "${title}"${sku}.`;
};

const decrementVariantStockAtomically = async ({
    ProductModel = Product,
    product,
    shopId,
    variantId,
    quantity,
    session
}) => {
    const numericQuantity = toNumberQuantity(quantity);
    const variant = getVariantFromProduct(product, variantId);

    if (!variant) {
        throw new Error(`Variant not found for product: ${product?.title || product?._id || 'unknown'}`);
    }

    const beforeStock = Number(variant.stock || 0);

    if (beforeStock < numericQuantity) {
        throw new OutOfStockError(buildOutOfStockMessage({ product, variant, quantity: numericQuantity }));
    }

    const afterStock = beforeStock - numericQuantity;

    try {
        const result = await ProductModel.updateOne(
            {
                _id: product._id,
                shop_id: shopId,
                isDeleted: false,
                variants: {
                    $elemMatch: {
                        _id: variant._id,
                        stock: { $gte: numericQuantity }
                    }
                }
            },
            {
                $inc: { 'variants.$.stock': -numericQuantity },
                $set: { 'variants.$.inventory.stock': afterStock }
            },
            { session }
        );

        const modifiedCount = result?.modifiedCount ?? result?.nModified ?? 0;
        const matchedCount = result?.matchedCount ?? result?.n ?? 0;

        if (modifiedCount !== 1 || matchedCount !== 1) {
            throw new OutOfStockError(buildOutOfStockMessage({ product, variant, quantity: numericQuantity }));
        }

        return {
            variant,
            quantity: numericQuantity,
            beforeStock,
            afterStock
        };
    } catch (err) {
        if (err instanceof OutOfStockError) throw err;
        if (isWriteConflict(err)) {
            throw new OutOfStockError(buildOutOfStockMessage({ product, variant, quantity: numericQuantity }));
        }
        throw err;
    }
};

module.exports = {
    OutOfStockError,
    decrementVariantStockAtomically,
    getVariantFromProduct
};
