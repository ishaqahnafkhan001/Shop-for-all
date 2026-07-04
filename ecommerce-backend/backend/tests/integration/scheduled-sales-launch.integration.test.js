const assert = require('node:assert/strict');
const test = require('node:test');

const Banner = require('../../models/Banner');
const Collection = require('../../models/Collection');
const ScheduledSale = require('../../models/ScheduledSale');
const {
    processScheduledSaleStates
} = require('../../services/sales/scheduledSaleService');
const {
    Order,
    Product,
    createLaunchSafetyContext,
    createProduct,
    makeCheckoutPayload
} = require('../helpers/launchSafetyHarness');

const minutesFromNow = (minutes) => new Date(Date.now() + (minutes * 60 * 1000));

const createActiveSale = async ({ shop, productIds = [], discountValue = 50, scope = 'selected_products', name = 'Launch Sale' }) => {
    return ScheduledSale.create({
        shop_id: shop._id,
        name,
        scope,
        productIds,
        discountType: 'percentage',
        discountValue,
        priority: 10,
        startsAt: minutesFromNow(-30),
        endsAt: minutesFromNow(30),
        status: 'active',
        popup: {
            enabled: false
        }
    });
};

test('scheduled sale API enforces tenant scope and staff salesManage permission', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const { shopA } = ctx.data.shops;
    const { productA, productB } = ctx.data.products;

    const vendorA = ctx.vendorAClient();
    const crossShopSale = await vendorA.unsafePost('/api/admin/scheduled-sales', {
        name: 'Wrong Shop Sale',
        scope: 'selected_products',
        productIds: [productB.product._id],
        discountType: 'percentage',
        discountValue: 20,
        startsAt: minutesFromNow(-5),
        endsAt: minutesFromNow(60)
    });

    assert.equal(crossShopSale.status, 400);
    assert.match(crossShopSale.body.error, /do not belong/i);

    const ownSale = await vendorA.unsafePost('/api/admin/scheduled-sales', {
        name: 'Shop A Selected Sale',
        scope: 'selected_products',
        productIds: [productA.product._id],
        discountType: 'percentage',
        discountValue: 25,
        priority: 7,
        startsAt: minutesFromNow(-5),
        endsAt: minutesFromNow(60),
        popup: {
            enabled: true,
            title: 'Selected sale',
            timing: 'active',
            frequency: 'once_per_day'
        }
    });

    assert.equal(ownSale.status, 201);
    assert.equal(ownSale.body.data.scope, 'selected_products');
    assert.equal(String(ownSale.body.data.shop_id), String(shopA._id));

    const staffA = ctx.staffAClient();
    const staffSales = await staffA.get('/api/admin/scheduled-sales');
    assert.equal(staffSales.status, 403);
});

test('scheduled sale pricing reaches public surfaces and checkout order snapshots', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const { shopA } = ctx.data.shops;
    const { productA } = ctx.data.products;
    const client = ctx.client();

    const sale = await createActiveSale({
        shop: shopA,
        productIds: [productA.product._id],
        discountValue: 50
    });
    const collection = await Collection.create({
        shop_id: shopA._id,
        title: 'Launch Picks',
        slug: 'launch-picks',
        productIds: [productA.product._id],
        isActive: true
    });
    await Product.updateOne(
        { _id: productA.product._id },
        { $set: { collections: [collection._id] } }
    );

    const bootstrap = await client.get('/api/storefront/launchshopa/bootstrap');
    assert.equal(bootstrap.status, 200);
    const bootstrapProduct = bootstrap.body.data.products.find(item => String(item._id) === String(productA.product._id));
    assert.equal(bootstrapProduct.salePrice, 600);
    assert.equal(bootstrapProduct.compareAtPrice, 1200);

    const allProducts = await client.get('/api/storefront/launchshopa/products?limit=10');
    assert.equal(allProducts.status, 200);
    const listProduct = allProducts.body.data.find(item => String(item._id) === String(productA.product._id));
    assert.equal(listProduct.salePrice, 600);

    const categoryProducts = await client.get('/api/storefront/launchshopa/products?category=Shop%20A%20Category&limit=10');
    assert.equal(categoryProducts.status, 200);
    assert.equal(categoryProducts.body.data[0].salePrice, 600);

    const productDetail = await client.get('/api/storefront/launchshopa/products/shop-a-product');
    assert.equal(productDetail.status, 200);
    assert.equal(productDetail.body.salePrice, 600);
    assert.equal(productDetail.body.scheduledSale.name, sale.name);

    const collectionPage = await client.get('/api/storefront/launchshopa/collections/launch-picks');
    assert.equal(collectionPage.status, 200);
    assert.equal(collectionPage.body.data.products[0].salePrice, 600);

    const recommendations = await client.get('/api/storefront/launchshopa/recommendations/cart?limit=6');
    assert.equal(recommendations.status, 200);
    const recommendedProduct = recommendations.body.data.find(item => String(item._id) === String(productA.product._id));
    assert.equal(recommendedProduct.salePrice, 600);

    const orderResponse = await client.unsafePost(
        '/api/public/orders',
        makeCheckoutPayload({
            product: productA.product,
            variant: productA.variant,
            shippingCost: 999,
            customerEmail: 'sale-checkout@launch.test'
        })
    );
    assert.equal(orderResponse.status, 201);
    assert.equal(orderResponse.body.order.items[0].price, 600);
    assert.equal(orderResponse.body.order.items[0].buyingPrice, undefined);

    const order = await Order.findById(orderResponse.body.orderId).lean();
    assert.equal(order.items[0].price, 600);
    assert.equal(String(order.items[0].scheduledSale.saleId), String(sale._id));
    assert.equal(order.items[0].scheduledSale.discountAmount, 600);
    assert.equal(order.pricing.subtotal, 600);
    assert.equal(order.pricing.shipping, 80);
    assert.equal(order.pricing.total, 680);
});

test('scheduled sale worker recovers overdue activation and ending idempotently', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const { shopA } = ctx.data.shops;
    const { productA } = ctx.data.products;

    const activating = await ScheduledSale.create({
        shop_id: shopA._id,
        name: 'Overdue Activation',
        scope: 'selected_products',
        productIds: [productA.product._id],
        discountType: 'percentage',
        discountValue: 10,
        startsAt: minutesFromNow(-15),
        endsAt: minutesFromNow(15),
        status: 'scheduled'
    });
    const ending = await ScheduledSale.create({
        shop_id: shopA._id,
        name: 'Overdue Ending',
        scope: 'all_products',
        discountType: 'percentage',
        discountValue: 5,
        startsAt: minutesFromNow(-60),
        endsAt: minutesFromNow(-1),
        status: 'active'
    });
    const freshProcessing = await ScheduledSale.create({
        shop_id: shopA._id,
        name: 'Fresh Lock',
        scope: 'all_products',
        discountType: 'percentage',
        discountValue: 5,
        startsAt: minutesFromNow(-60),
        endsAt: minutesFromNow(60),
        status: 'scheduled',
        processingState: 'processing',
        processingStartedAt: new Date()
    });
    const staleProcessing = await ScheduledSale.create({
        shop_id: shopA._id,
        name: 'Stale Lock',
        scope: 'all_products',
        discountType: 'percentage',
        discountValue: 5,
        startsAt: minutesFromNow(-60),
        endsAt: minutesFromNow(60),
        status: 'scheduled',
        processingState: 'processing',
        processingStartedAt: minutesFromNow(-10)
    });

    const firstRun = await processScheduledSaleStates({ limit: 10 });
    assert.deepEqual(firstRun.touched.map(String), [String(shopA._id)]);

    const [activated, ended, fresh, recovered] = await Promise.all([
        ScheduledSale.findById(activating._id).lean(),
        ScheduledSale.findById(ending._id).lean(),
        ScheduledSale.findById(freshProcessing._id).lean(),
        ScheduledSale.findById(staleProcessing._id).lean()
    ]);

    assert.equal(activated.status, 'active');
    assert.equal(activated.processingState, 'completed');
    assert.equal(ended.status, 'ended');
    assert.equal(ended.processingState, 'completed');
    assert.equal(fresh.status, 'scheduled');
    assert.equal(fresh.processingState, 'processing');
    assert.equal(recovered.status, 'active');
    assert.equal(recovered.processingState, 'completed');

    const secondRun = await processScheduledSaleStates({ limit: 10 });
    assert.deepEqual(secondRun.touched, []);
});

test('sale popups and scheduled product launch banners are tenant scoped and state aware', async (t) => {
    const ctx = await createLaunchSafetyContext(t);
    const { shopA } = ctx.data.shops;
    const { productA } = ctx.data.products;
    const client = ctx.client();

    await ScheduledSale.create([
        {
            shop_id: shopA._id,
            name: 'Upcoming Popup',
            scope: 'all_products',
            discountType: 'percentage',
            discountValue: 15,
            startsAt: minutesFromNow(20),
            endsAt: minutesFromNow(90),
            status: 'scheduled',
            popup: {
                enabled: true,
                title: 'Launch soon',
                timing: 'upcoming',
                frequency: 'once_per_day',
                displayStartsAt: minutesFromNow(-1)
            }
        },
        {
            shop_id: shopA._id,
            name: 'Expired Popup',
            scope: 'all_products',
            discountType: 'percentage',
            discountValue: 15,
            startsAt: minutesFromNow(-90),
            endsAt: minutesFromNow(-20),
            status: 'active',
            popup: {
                enabled: true,
                title: 'Expired',
                timing: 'active'
            }
        }
    ]);

    const popupBootstrap = await client.get('/api/storefront/launchshopa/bootstrap');
    assert.equal(popupBootstrap.status, 200);
    assert.equal(popupBootstrap.body.data.activeSalePopups.length, 1);
    assert.equal(popupBootstrap.body.data.activeSalePopups[0].title, 'Launch soon');
    assert.equal(popupBootstrap.body.data.activeSalePopups[0].frequency, 'once_per_day');

    const launchProduct = await createProduct({
        shop: shopA,
        title: 'Scheduled Launch Product',
        slug: 'scheduled-launch-product',
        sellingPrice: 900,
        buyingPrice: 300,
        stock: 12
    });
    const publishAt = minutesFromNow(45);
    await Product.updateOne(
        { _id: launchProduct.product._id },
        {
            $set: {
                publicationStatus: 'scheduled',
                publishAt,
                status: 'Draft',
                isActive: false
            }
        }
    );

    await Banner.create([
        {
            shop_id: shopA._id,
            title: 'Launch countdown',
            type: 'scheduled_product',
            scheduledProduct: launchProduct.product._id,
            images: ['https://res.cloudinary.com/demo/image/upload/banner-desktop.jpg'],
            desktopImages: ['https://res.cloudinary.com/demo/image/upload/banner-desktop.jpg'],
            mobileImages: ['https://res.cloudinary.com/demo/image/upload/banner-mobile.jpg'],
            startsAt: minutesFromNow(-5),
            endsAt: minutesFromNow(90),
            isActive: true,
            countdownEnabled: true,
            postLaunchBehavior: 'convert_to_product'
        },
        {
            shop_id: shopA._id,
            title: 'Inactive launch banner',
            type: 'scheduled_product',
            scheduledProduct: launchProduct.product._id,
            images: ['https://res.cloudinary.com/demo/image/upload/inactive.jpg'],
            desktopImages: ['https://res.cloudinary.com/demo/image/upload/inactive.jpg'],
            mobileImages: ['https://res.cloudinary.com/demo/image/upload/inactive-mobile.jpg'],
            startsAt: minutesFromNow(-5),
            endsAt: minutesFromNow(90),
            isActive: false
        },
        {
            shop_id: shopA._id,
            title: 'Ended launch banner',
            type: 'scheduled_product',
            scheduledProduct: launchProduct.product._id,
            images: ['https://res.cloudinary.com/demo/image/upload/ended.jpg'],
            desktopImages: ['https://res.cloudinary.com/demo/image/upload/ended.jpg'],
            mobileImages: ['https://res.cloudinary.com/demo/image/upload/ended-mobile.jpg'],
            startsAt: minutesFromNow(-90),
            endsAt: minutesFromNow(-1),
            isActive: true
        }
    ]);

    const activeBanners = await client.get('/api/banners/storefront/launchshopa/active');
    assert.equal(activeBanners.status, 200);
    assert.equal(activeBanners.body.length, 1);
    assert.equal(activeBanners.body[0].title, 'Launch countdown');
    assert.equal(activeBanners.body[0].link, '');
    assert.equal(activeBanners.body[0].countdownEnabled, true);
    assert.equal(activeBanners.body[0].scheduledProduct.isPublic, false);

    await Product.updateOne(
        { _id: launchProduct.product._id },
        {
            $set: {
                publicationStatus: 'published',
                publishAt: null,
                publishedAt: new Date(),
                status: 'Published',
                isActive: true
            }
        }
    );

    const postLaunchBanners = await client.get('/api/banners/storefront/launchshopa/active');
    assert.equal(postLaunchBanners.status, 200);
    assert.equal(postLaunchBanners.body.length, 1);
    assert.equal(postLaunchBanners.body[0].link, '/products/scheduled-launch-product');
    assert.equal(postLaunchBanners.body[0].countdownEnabled, false);
    assert.equal(postLaunchBanners.body[0].scheduledProduct.isPublic, true);
});
