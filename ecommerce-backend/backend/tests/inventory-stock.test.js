const assert = require('node:assert/strict');
const test = require('node:test');

const {
    OutOfStockError,
    decrementVariantStockAtomically
} = require('../services/inventoryStockService');

const makeProductSnapshot = ({ stock = 1 } = {}) => {
    const variant = {
        _id: 'variant-1',
        sku: 'RACE-1',
        stock,
        inventory: { stock }
    };
    const variants = [variant];
    variants.id = (id) => variants.find(item => String(item._id) === String(id));

    return {
        _id: 'product-1',
        shop_id: 'shop-1',
        title: 'Race Condition Product',
        variants
    };
};

test('atomic stock decrement uses tenant-safe elemMatch and $inc update', async () => {
    const product = makeProductSnapshot({ stock: 5 });
    let capturedQuery = null;
    let capturedUpdate = null;
    let capturedOptions = null;

    const ProductModel = {
        updateOne: async (query, update, options) => {
            capturedQuery = query;
            capturedUpdate = update;
            capturedOptions = options;
            return { matchedCount: 1, modifiedCount: 1 };
        }
    };

    const result = await decrementVariantStockAtomically({
        ProductModel,
        product,
        shopId: 'shop-1',
        variantId: 'variant-1',
        quantity: 2,
        session: 'session-token'
    });

    assert.equal(result.beforeStock, 5);
    assert.equal(result.afterStock, 3);
    assert.deepEqual(capturedQuery, {
        _id: 'product-1',
        shop_id: 'shop-1',
        isDeleted: false,
        variants: {
            $elemMatch: {
                _id: 'variant-1',
                stock: { $gte: 2 }
            }
        }
    });
    assert.deepEqual(capturedUpdate, {
        $inc: { 'variants.$.stock': -2 },
        $set: { 'variants.$.inventory.stock': 3 }
    });
    assert.deepEqual(capturedOptions, { session: 'session-token' });
});

test('two concurrent checkout attempts against stock 1 only allow one decrement', async () => {
    let persistedStock = 1;
    const successfulLogs = [];

    const ProductModel = {
        updateOne: async (query, update) => {
            await new Promise(resolve => setImmediate(resolve));
            const quantity = query.variants.$elemMatch.stock.$gte;

            if (persistedStock < quantity) {
                return { matchedCount: 0, modifiedCount: 0 };
            }

            persistedStock += update.$inc['variants.$.stock'];
            return { matchedCount: 1, modifiedCount: 1 };
        }
    };

    const attempts = await Promise.allSettled([
        decrementVariantStockAtomically({
            ProductModel,
            product: makeProductSnapshot({ stock: 1 }),
            shopId: 'shop-1',
            variantId: 'variant-1',
            quantity: 1
        }),
        decrementVariantStockAtomically({
            ProductModel,
            product: makeProductSnapshot({ stock: 1 }),
            shopId: 'shop-1',
            variantId: 'variant-1',
            quantity: 1
        })
    ]);

    for (const attempt of attempts) {
        if (attempt.status === 'fulfilled') {
            successfulLogs.push({
                productId: 'product-1',
                variantId: 'variant-1',
                change: -attempt.value.quantity,
                beforeStock: attempt.value.beforeStock,
                afterStock: attempt.value.afterStock,
                type: 'ORDER'
            });
        }
    }

    const fulfilled = attempts.filter(attempt => attempt.status === 'fulfilled');
    const rejected = attempts.filter(attempt => attempt.status === 'rejected');

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].reason instanceof OutOfStockError, true);
    assert.equal(persistedStock, 0);
    assert.equal(persistedStock < 0, false);
    assert.equal(successfulLogs.length, 1);
    assert.equal(successfulLogs[0].change, -1);
    assert.equal(successfulLogs[0].type, 'ORDER');
});
