const assert = require('node:assert/strict');
const test = require('node:test');

const {
    InventoryLog,
    Order,
    Product,
    createLaunchSafetyContext,
    createProduct,
    makeCheckoutPayload
} = require('../helpers/launchSafetyHarness');

test('public checkout recalculates price and shipping instead of trusting client totals', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const { productA } = ctx.data.products;
    const client = ctx.client();

    const response = await client.unsafePost(
        '/api/public/orders',
        makeCheckoutPayload({
            product: productA.product,
            variant: productA.variant,
            shippingCost: 0,
            customerEmail: 'tamper-public@launch.test'
        })
    );

    assert.equal(response.status, 201);
    assert.equal(response.body.total, 1280);
    assert.equal(response.body.order.items[0].price, 1200);
    assert.equal(response.body.order.items[0].buyingPrice, undefined);

    const order = await Order.findById(response.body.orderId).lean();
    assert.equal(order.pricing.subtotal, 1200);
    assert.equal(order.pricing.shipping, 80);
    assert.equal(order.pricing.total, 1280);
    assert.equal(order.items[0].price, 1200);
    assert.equal(order.items[0].buyingPrice, 500);

    const product = await Product.findById(productA.product._id).lean();
    assert.equal(product.variants[0].stock, 19);

    const logs = await InventoryLog.find({ referenceId: order._id }).lean();
    assert.equal(logs.length, 1);
    assert.equal(logs[0].change, -1);
});

test('authenticated checkout recalculates totals and rejects cross-shop coupons', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const { productA, productB } = ctx.data.products;

    const customerA = ctx.customerAClient();
    const authOrder = await customerA.unsafePost(`/api/storefront/launchshopa/orders`, {
        items: [{
            productId: productA.product._id,
            variantId: productA.variant._id,
            quantity: 1
        }],
        shipping: {
            zone: 'Inside Dhaka',
            address: {
                fullName: 'Customer A',
                phone: '01700000000',
                addressLine: '123 Launch Safety Road',
                city: 'Dhaka'
            }
        },
        payment: { method: 'COD' },
        consent: {
            checkoutPolicyAccepted: true,
            version: 'launch_safety_v1'
        }
    });

    assert.equal(authOrder.status, 201);
    assert.equal(authOrder.body.total, 1280);

    const authOrderDoc = await Order.findById(authOrder.body.orderId).lean();
    assert.equal(authOrderDoc.pricing.subtotal, 1200);
    assert.equal(authOrderDoc.pricing.shipping, 80);
    assert.equal(authOrderDoc.pricing.total, 1280);

    const shopBClient = ctx.client();
    const crossShopCoupon = await shopBClient.unsafePost('/api/public/orders', {
        ...makeCheckoutPayload({
            product: productB.product,
            variant: productB.variant,
            promotionCode: 'SAVEA',
            customerEmail: 'coupon-shop-b@launch.test'
        }),
        subdomain: 'launchshopb'
    });

    assert.equal(crossShopCoupon.status, 400);
    assert.match(crossShopCoupon.body.error, /Coupon/i);
});

test('concurrent checkout against stock one creates only one order and one inventory log', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const raceProduct = await createProduct({
        shop: ctx.data.shops.shopA,
        title: 'Race Stock Product',
        slug: 'race-stock-product',
        sellingPrice: 300,
        buyingPrice: 100,
        stock: 1
    });

    const first = ctx.client();
    const second = ctx.client();
    const payload = (email) => makeCheckoutPayload({
        product: raceProduct.product,
        variant: raceProduct.variant,
        customerEmail: email
    });

    const results = await Promise.all([
        first.unsafePost('/api/public/orders', payload('race-one@launch.test')),
        second.unsafePost('/api/public/orders', payload('race-two@launch.test'))
    ]);

    const successful = results.filter(result => result.status === 201);
    const failed = results.filter(result => result.status !== 201);

    assert.equal(successful.length, 1);
    assert.equal(failed.length, 1);
    assert.match(failed[0].body.error, /stock|available/i);

    const product = await Product.findById(raceProduct.product._id).lean();
    assert.equal(product.variants[0].stock, 0);

    const orders = await Order.find({ 'items.productId': raceProduct.product._id }).lean();
    assert.equal(orders.length, 1);

    const logs = await InventoryLog.find({ productId: raceProduct.product._id }).lean();
    assert.equal(logs.length, 1);
    assert.equal(logs[0].change, -1);
});

test('order status and tracking APIs preserve role and privacy boundaries', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const { orderA, orderB } = ctx.data.orders;

    const customerAStatusUpdate = await ctx.customerAClient().unsafePatch(`/api/admin/orders/${orderA._id}/status`, {
        status: 'Delivered'
    });
    assert.equal(customerAStatusUpdate.status, 403);

    const vendorAUpdateOther = await ctx.vendorAClient().unsafePatch(`/api/admin/orders/${orderB._id}/status`, {
        status: 'Delivered'
    });
    assert.equal(vendorAUpdateOther.status, 404);

    const publicTracking = await ctx.client().get(`/api/storefront/launchshopa/track-order/${orderA._id}?phone=01700000000`);
    assert.equal(publicTracking.status, 200);
    assert.equal(publicTracking.body.items[0].buyingPrice, undefined);
    assert.equal(publicTracking.body.shipping?.address, undefined);
    assert.equal(publicTracking.body.pricing, undefined);
});
