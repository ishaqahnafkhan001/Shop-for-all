const assert = require('node:assert/strict');
const { once } = require('node:events');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const Account = require('../../models/Account');
const AnalyticsEvent = require('../../models/AnalyticsEvent');
const ConsentLog = require('../../models/ConsentLog');
const InventoryLog = require('../../models/InventoryLog');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Promotion = require('../../models/Promotion');
const Shop = require('../../models/Shop');
const ShopMembership = require('../../models/ShopMembership');
const StaffPermission = require('../../models/StaffPermission');
const User = require('../../models/User');
const VendorVerification = require('../../models/VendorVerification');

const DEFAULT_PASSWORD = 'LaunchPass@123';
const TEST_JWT_SECRET = 'launch-safety-test-secret';
const TEST_CSRF_SECRET = 'launch-safety-csrf-secret';

const getDatabaseName = (uri) => {
    const clean = String(uri || '').split('?')[0].replace(/\/+$/, '');
    return clean.slice(clean.lastIndexOf('/') + 1);
};

const assertSafeTestDatabase = (uri) => {
    if (!uri) {
        throw new Error([
            'MONGO_URI_TEST is required for launch-safety integration tests.',
            'Example:',
            '  MONGO_URI_TEST="mongodb://127.0.0.1:27017/shop_for_all_launch_test" npm run test:integration',
            'Use a disposable database only. The integration harness deletes all collections before and after each test.',
            'Checkout/order tests use MongoDB transactions, so use MongoDB Atlas or a local replica set. A standalone local MongoDB may fail transaction tests.'
        ].join('\n'));
    }

    const dbName = getDatabaseName(uri);
    if (!dbName || !/test/i.test(dbName)) {
        throw new Error([
            `Refusing to run integration cleanup against non-test database "${dbName}".`,
            'MONGO_URI_TEST must point to a disposable database whose name includes "test".',
            'Example:',
            '  MONGO_URI_TEST="mongodb://127.0.0.1:27017/shop_for_all_launch_test" npm run test:integration',
            'Never point launch-safety tests at production, staging, or a shared developer database.'
        ].join('\n'));
    }
};

const connectTestDatabase = async () => {
    const uri = process.env.MONGO_URI_TEST;
    assertSafeTestDatabase(uri);

    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || TEST_JWT_SECRET;
    process.env.CSRF_SECRET = process.env.CSRF_SECRET || TEST_CSRF_SECRET;

    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000
        });
    } catch (error) {
        throw new Error([
            `Unable to connect to MONGO_URI_TEST (${getDatabaseName(uri)}).`,
            `MongoDB error: ${error.message}`,
            'Start a disposable MongoDB test database before running launch-safety integration tests.',
            'Example:',
            '  MONGO_URI_TEST="mongodb://127.0.0.1:27017/shop_for_all_launch_test" npm run test:integration',
            'Checkout/order tests use transactions, so use MongoDB Atlas or a local replica set. A standalone local MongoDB may fail transaction tests.'
        ].join('\n'));
    }
};

const clearDatabase = async () => {
    assertSafeTestDatabase(process.env.MONGO_URI_TEST);

    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map(collection => collection.deleteMany({})));
};

const closeTestDatabase = async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
};

const startTestServer = async () => {
    const app = require('../../app');
    const server = app.listen(0);
    await once(server, 'listening');
    const { port } = server.address();

    return {
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise(resolve => server.close(resolve))
    };
};

const parseSetCookie = (headers) => {
    const values = [];
    if (typeof headers.getSetCookie === 'function') {
        values.push(...headers.getSetCookie());
    } else {
        const value = headers.get('set-cookie');
        if (value) values.push(value);
    }

    return values.reduce((acc, value) => {
        const [pair] = String(value).split(';');
        const index = pair.indexOf('=');
        if (index > 0) acc[pair.slice(0, index)] = pair.slice(index + 1);
        return acc;
    }, {});
};

const makeCookieHeader = (jar = {}) => Object.entries(jar)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');

const createClient = (baseUrl, initialCookies = {}) => {
    const jar = { ...initialCookies };

    const request = async (method, path, options = {}) => {
        const headers = {
            ...(options.body !== undefined && !(options.body instanceof FormData)
                ? { 'content-type': 'application/json' }
                : {}),
            ...(makeCookieHeader(jar) ? { cookie: makeCookieHeader(jar) } : {}),
            ...(options.headers || {})
        };

        const response = await fetch(`${baseUrl}${path}`, {
            method,
            headers,
            body: options.body === undefined || options.body instanceof FormData
                ? options.body
                : JSON.stringify(options.body)
        });

        Object.assign(jar, parseSetCookie(response.headers));

        const text = await response.text();
        let body = null;
        try {
            body = text ? JSON.parse(text) : null;
        } catch {
            body = text;
        }

        return {
            status: response.status,
            headers: response.headers,
            setCookieHeader: response.headers.get('set-cookie') || '',
            body,
            text,
            cookies: { ...jar }
        };
    };

    const getCsrfToken = async () => {
        const response = await request('GET', '/api/auth/csrf-token');
        assert.equal(response.status, 200);
        return response.body.csrfToken;
    };

    const unsafe = async (method, path, body, options = {}) => {
        const csrfToken = options.csrfToken || await getCsrfToken();
        return request(method, path, {
            ...options,
            body,
            headers: {
                'x-csrf-token': csrfToken,
                ...(options.headers || {})
            }
        });
    };

    return {
        jar,
        request,
        get: (path, options) => request('GET', path, options),
        post: (path, body, options) => request('POST', path, { ...options, body }),
        put: (path, body, options) => request('PUT', path, { ...options, body }),
        patch: (path, body, options) => request('PATCH', path, { ...options, body }),
        delete: (path, options) => request('DELETE', path, options),
        unsafePost: (path, body, options) => unsafe('POST', path, body, options),
        unsafePut: (path, body, options) => unsafe('PUT', path, body, options),
        unsafePatch: (path, body, options) => unsafe('PATCH', path, body, options),
        unsafeDelete: (path, body, options) => unsafe('DELETE', path, undefined, options)
    };
};

const createIdentity = async ({
    shop,
    email,
    role,
    fullName,
    permissions = {},
    platformRole = 'None'
}) => {
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const account = await Account.create({
        email,
        passwordHash,
        fullName,
        phone: '01700000000',
        platformRole
    });

    const userPayload = {
        fullName,
        email,
        password: passwordHash,
        role,
        status: 'Active',
        permissions,
        account_id: account._id,
        phone: '01700000000'
    };

    if (shop) userPayload.shop_id = shop._id;

    const user = await User.create(userPayload);
    let membership = null;

    if (shop) {
        membership = await ShopMembership.create({
            account_id: account._id,
            shop_id: shop._id,
            role,
            legacyUser_id: user._id
        });

        user.membership_id = membership._id;
        await user.save();

        if (role === 'VendorStaff') {
            await StaffPermission.create({
                account_id: account._id,
                membership_id: membership._id,
                shop_id: shop._id,
                legacyUser_id: user._id,
                permissions
            });
        }
    }

    return { account, user, membership, email, password: DEFAULT_PASSWORD };
};

const createTokenCookie = ({ account, user, membership }) => {
    const token = jwt.sign(
        {
            id: user._id,
            accountId: account._id,
            membershipId: membership?._id || null,
            role: user.role,
            shopId: user.shop_id || null
        },
        process.env.JWT_SECRET || TEST_JWT_SECRET,
        { expiresIn: '7d' }
    );

    return { token };
};

const createProduct = async ({
    shop,
    title,
    slug,
    sellingPrice = 1000,
    buyingPrice = 400,
    stock = 20,
    category = 'Launch Safety'
}) => {
    const product = await Product.create({
        shop_id: shop._id,
        title,
        slug,
        description: `${title} description`,
        shortDescription: `${title} short description`,
        category,
        tags: ['launch-safety'],
        images: ['https://res.cloudinary.com/demo/image/upload/v1710000001/products/test.jpg'],
        pricing: {
            sellingPrice,
            buyingPrice,
            discount: 0
        },
        variants: [{
            sku: `${slug}-sku`,
            attributes: [{ name: 'Size', value: 'Default' }],
            stock,
            pricing: {
                price: sellingPrice,
                compareAtPrice: sellingPrice + 200,
                costPrice: buyingPrice
            },
            inventory: {
                stock,
                lowStockThreshold: 2,
                trackQuantity: true,
                allowOversell: false
            },
            status: 'active',
            isActive: true
        }],
        status: 'Published',
        isActive: true,
        isDeleted: false,
        averageRating: 4.8,
        numReviews: 6
    });

    return {
        product,
        variant: product.variants[0]
    };
};

const createOrder = async ({ shop, customer, product, variant, status = 'Pending' }) => {
    return Order.create({
        shop_id: shop._id,
        customer: customer._id,
        items: [{
            productId: product._id,
            variantId: variant._id,
            title: product.title,
            sku: variant.sku,
            attributes: variant.attributes,
            quantity: 1,
            price: product.pricing.sellingPrice,
            buyingPrice: product.pricing.buyingPrice,
            total: product.pricing.sellingPrice
        }],
        pricing: {
            subtotal: product.pricing.sellingPrice,
            discount: 0,
            shipping: 80,
            tax: 0,
            total: product.pricing.sellingPrice + 80
        },
        payment: {
            method: 'COD',
            status: 'Pending'
        },
        shipping: {
            zone: 'Inside Dhaka',
            cost: 80,
            address: {
                fullName: customer.fullName,
                phone: customer.phone || '01700000000',
                addressLine: '123 Launch Safety Road',
                city: 'Dhaka'
            }
        },
        status,
        source: 'test'
    });
};

const seedLaunchSafetyData = async () => {
    const shopA = await Shop.create({
        shopName: 'Launch Shop A',
        subdomain: 'launchshopa',
        isActive: true,
        approvalStatus: 'Approved',
        verification: {
            status: 'approved',
            approvedAt: new Date()
        },
        theme: {
            navigation: [{ label: 'Home', url: '/' }],
            hero: { title: 'Shop A Hero', ctaUrl: '/products' },
            policies: { privacy: 'Shop A privacy policy' },
            homepageSections: []
        }
    });

    const shopB = await Shop.create({
        shopName: 'Launch Shop B',
        subdomain: 'launchshopb',
        isActive: true,
        approvalStatus: 'Approved',
        verification: {
            status: 'approved',
            approvedAt: new Date()
        },
        theme: {
            navigation: [{ label: 'Home', url: '/' }],
            hero: { title: 'Shop B Hero', ctaUrl: '/products' },
            policies: { privacy: 'Shop B privacy policy' },
            homepageSections: []
        }
    });

    const vendorA = await createIdentity({
        shop: shopA,
        email: 'vendor-a@launch.test',
        role: 'VendorAdmin',
        fullName: 'Vendor Admin A',
        permissions: {
            products: true,
            orders: true,
            customers: true,
            promotions: true,
            analytics: true,
            storeBuilder: true,
            settings: true,
            staff: true
        }
    });

    const vendorB = await createIdentity({
        shop: shopB,
        email: 'vendor-b@launch.test',
        role: 'VendorAdmin',
        fullName: 'Vendor Admin B',
        permissions: {
            products: true,
            orders: true,
            customers: true,
            promotions: true,
            analytics: true,
            storeBuilder: true,
            settings: true,
            staff: true
        }
    });

    const staffA = await createIdentity({
        shop: shopA,
        email: 'staff-a@launch.test',
        role: 'VendorStaff',
        fullName: 'Staff A',
        permissions: {
            products: true,
            orders: true,
            customers: false,
            promotions: false,
            analytics: false,
            storeBuilder: false,
            settings: false,
            staff: false
        }
    });

    const customerA = await createIdentity({
        shop: shopA,
        email: 'customer-a@launch.test',
        role: 'Customer',
        fullName: 'Customer A'
    });

    const customerB = await createIdentity({
        shop: shopB,
        email: 'customer-b@launch.test',
        role: 'Customer',
        fullName: 'Customer B'
    });

    const superAdmin = await createIdentity({
        shop: null,
        email: 'super-admin@launch.test',
        role: 'SuperAdmin',
        fullName: 'Super Admin',
        platformRole: 'SuperAdmin'
    });

    const productA = await createProduct({
        shop: shopA,
        title: 'Shop A Product',
        slug: 'shop-a-product',
        sellingPrice: 1200,
        buyingPrice: 500,
        stock: 20,
        category: 'Shop A Category'
    });

    const productB = await createProduct({
        shop: shopB,
        title: 'Shop B Product',
        slug: 'shop-b-product',
        sellingPrice: 2400,
        buyingPrice: 900,
        stock: 20,
        category: 'Shop B Category'
    });

    const orderA = await createOrder({
        shop: shopA,
        customer: customerA.user,
        product: productA.product,
        variant: productA.variant
    });

    const orderB = await createOrder({
        shop: shopB,
        customer: customerB.user,
        product: productB.product,
        variant: productB.variant
    });

    await Promotion.create({
        shop_id: shopA._id,
        name: 'Shop A Save',
        code: 'SAVEA',
        type: 'PERCENTAGE',
        value: 10,
        minSubtotal: 0,
        isActive: true,
        perCustomerLimit: 10
    });

    await AnalyticsEvent.create([
        {
            shop_id: shopA._id,
            sessionId: 'launch-session-a',
            eventType: 'product_view',
            product_id: productA.product._id,
            value: 0
        },
        {
            shop_id: shopB._id,
            sessionId: 'launch-session-b',
            eventType: 'product_view',
            product_id: productB.product._id,
            value: 0
        }
    ]);

    await VendorVerification.create({
        shop_id: shopA._id,
        owner_id: vendorA.account._id,
        ownerModel: 'Account',
        status: 'approved',
        nidNumber: '1234567890123',
        nidName: 'Vendor Admin A',
        nidFrontUrl: 'https://res.cloudinary.com/demo/image/upload/private/nid-front.jpg',
        nidBackUrl: 'https://res.cloudinary.com/demo/image/upload/private/nid-back.jpg',
        verificationDeadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        submittedAt: new Date(),
        approvedAt: new Date()
    });

    return {
        shops: { shopA, shopB },
        identities: { vendorA, vendorB, staffA, customerA, customerB, superAdmin },
        products: { productA, productB },
        orders: { orderA, orderB }
    };
};

const createLaunchSafetyContext = async (t) => {
    await connectTestDatabase();
    await clearDatabase();
    const server = await startTestServer();

    try {
        const data = await seedLaunchSafetyData();

        const makeAuthedClient = (identity) => createClient(
            server.baseUrl,
            createTokenCookie(identity)
        );

        const context = {
            ...server,
            data,
            client: () => createClient(server.baseUrl),
            makeAuthedClient,
            vendorAClient: () => makeAuthedClient(data.identities.vendorA),
            vendorBClient: () => makeAuthedClient(data.identities.vendorB),
            staffAClient: () => makeAuthedClient(data.identities.staffA),
            customerAClient: () => makeAuthedClient(data.identities.customerA),
            customerBClient: () => makeAuthedClient(data.identities.customerB),
            superAdminClient: () => makeAuthedClient(data.identities.superAdmin)
        };

        t.after(async () => {
            await server.close();
            await clearDatabase();
            await closeTestDatabase();
        });

        return context;
    } catch (error) {
        await server.close();
        await clearDatabase().catch(() => {});
        await closeTestDatabase().catch(() => {});
        throw error;
    }
};

const makeCheckoutPayload = ({ product, variant, promotionCode, shippingCost = 0, customerEmail = 'guest@launch.test' }) => ({
    subdomain: 'launchshopa',
    customer: {
        fullName: 'Guest Buyer',
        email: customerEmail,
        phone: '01711111111'
    },
    shippingZone: 'Inside Dhaka',
    shippingCost,
    shippingAddress: {
        fullName: 'Guest Buyer',
        phone: '01711111111',
        addressLine: '123 Launch Safety Road',
        city: 'Dhaka'
    },
    items: [{
        productId: product._id,
        variantId: variant._id,
        quantity: 1,
        price: 1,
        buyingPrice: 1,
        costPrice: 1,
        total: 1
    }],
    paymentMethod: 'COD',
    promotionCode,
    consent: {
        checkoutPolicyAccepted: true,
        version: 'launch_safety_v1'
    }
});

module.exports = {
    DEFAULT_PASSWORD,
    Account,
    InventoryLog,
    Order,
    Product,
    Promotion,
    Shop,
    User,
    createProduct,
    createLaunchSafetyContext,
    makeCheckoutPayload
};
