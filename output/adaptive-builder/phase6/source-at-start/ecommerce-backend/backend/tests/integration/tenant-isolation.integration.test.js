const assert = require('node:assert/strict');
const test = require('node:test');

const {
    Product,
    createLaunchSafetyContext
} = require('../helpers/launchSafetyHarness');

test('vendor and staff requests stay scoped to their own shop', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const {
        products: { productA, productB },
        orders: { orderB },
        identities: { customerB }
    } = ctx.data;

    const vendorA = ctx.vendorAClient();

    const productList = await vendorA.get('/api/admin/products?limit=50');
    assert.equal(productList.status, 200);
    assert.equal(productList.body.data.some(item => String(item._id) === String(productA.product._id)), true);
    assert.equal(productList.body.data.some(item => String(item._id) === String(productB.product._id)), false);

    const otherProduct = await vendorA.get(`/api/admin/products/${productB.product._id}`);
    assert.equal(otherProduct.status, 404);

    const deleteOtherProduct = await vendorA.unsafeDelete(`/api/admin/products/${productB.product._id}`);
    assert.equal(deleteOtherProduct.status, 404);
    const productBStillExists = await Product.findById(productB.product._id).lean();
    assert.equal(productBStillExists.isDeleted, false);

    const orderList = await vendorA.get('/api/admin/orders?limit=50');
    assert.equal(orderList.status, 200);
    assert.equal(orderList.body.data.some(item => String(item._id) === String(orderB._id)), false);

    const updateOtherOrder = await vendorA.unsafePatch(`/api/admin/orders/${orderB._id}/status`, {
        status: 'Confirmed'
    });
    assert.equal(updateOtherOrder.status, 404);

    const customers = await vendorA.get('/api/admin/customers');
    assert.equal(customers.status, 200);
    assert.equal(Array.isArray(customers.body), true);
    assert.equal(customers.body.some(item => String(item._id) === String(customerB.user._id)), false);

    const growthProducts = await vendorA.get('/api/admin/growth/products?range=30');
    assert.equal(growthProducts.status, 200);
    const growthTitles = growthProducts.body.data.products.map(item => item.product?.title || item.title);
    assert.equal(growthTitles.includes(productB.product.title), false);

    const staffA = ctx.staffAClient();
    const staffProducts = await staffA.get('/api/admin/products?limit=10');
    assert.equal(staffProducts.status, 200);

    const staffGrowth = await staffA.get('/api/admin/growth/overview?range=30');
    assert.equal(staffGrowth.status, 403);

    const staffCustomers = await staffA.get('/api/admin/customers');
    assert.equal(staffCustomers.status, 403);
});

test('customers and non-platform roles cannot cross account or admin boundaries', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const {
        orders: { orderA, orderB }
    } = ctx.data;

    const customerA = ctx.customerAClient();
    const myOrders = await customerA.get('/api/storefront/launchshopa/my-orders');
    assert.equal(myOrders.status, 200);
    assert.equal(myOrders.body.data.some(item => String(item._id) === String(orderA._id)), true);
    assert.equal(myOrders.body.data.some(item => String(item._id) === String(orderB._id)), false);

    const otherOrder = await customerA.get(`/api/storefront/launchshopa/my-orders/${orderB._id}`);
    assert.equal(otherOrder.status, 404);

    const wrongTenantOrder = await customerA.get(`/api/storefront/launchshopb/my-orders/${orderB._id}`);
    assert.equal(wrongTenantOrder.status, 401);

    const customerAdminAccess = await customerA.get('/api/admin/products');
    assert.equal(customerAdminAccess.status, 403);

    const vendorSuperAdminAccess = await ctx.vendorAClient().get('/api/super-admin/shops');
    assert.equal(vendorSuperAdminAccess.status, 403);

    const staffSuperAdminAccess = await ctx.staffAClient().get('/api/super-admin/shops');
    assert.equal(staffSuperAdminAccess.status, 403);

    const superAdminAccess = await ctx.superAdminClient().get('/api/super-admin/shops');
    assert.equal(superAdminAccess.status, 200);
});
