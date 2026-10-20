const test = require('node:test');
const assert = require('node:assert/strict');
const { createLaunchSafetyContext, Product, InventoryLog, setShopPlan } = require('../helpers/launchSafetyHarness');
const Collection = require('../../models/Collection');
const { buildOrderLineItem } = require('../../services/orders/orderPricingService');

test('editor metadata persists and reloads without inventory changes; tenant boundaries hold', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const own = ctx.data.products.productA.product;
    const foreign = ctx.data.products.productB.product;
    const variant = own.variants[0];
    const client = ctx.staffAClient();
    const response = await client.unsafePatch(`/api/admin/products/${own._id}`, {
        category: '', seo: { title: 'Updated SEO', description: 'Updated description' },
        features: [{ point: 'Comfort', reason: 'Soft fabric' }], sellerFacts: { brand: 'Verified brand' },
        variants: [{ _id: String(variant._id), sku: 'EDITED-SKU', inventory: { lowStockThreshold: 0 } }]
    });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    const loaded = await client.get(`/api/admin/products/${own._id}`);
    assert.equal(loaded.body.data.variants[0].sku, 'EDITED-SKU');
    assert.equal(loaded.body.data.variants[0].stock, variant.stock);
    assert.equal(loaded.body.data.variants[0].inventory.lowStockThreshold, 0);
    assert.equal(loaded.body.data.category, '');
    assert.equal(loaded.body.data.seo.title, 'Updated SEO');
    const stockAttack = await client.unsafePatch(`/api/admin/products/${own._id}`, { variants: [{ _id: String(variant._id), attributes: variant.attributes.map(a => ({ name: a.name, value: a.value })), stock: 0 }] });
    assert.equal(stockAttack.status, 400);
    const reserveAttack = await client.unsafePatch(`/api/admin/products/${own._id}`, { variants: [{ _id: String(variant._id), inventory: { reservedStock: 0 } }] });
    assert.equal(reserveAttack.status, 400);
    const foreignEdit = await client.unsafePatch(`/api/admin/products/${foreign._id}`, { title: 'Attack' });
    assert.equal(foreignEdit.status, 404);
    assert.equal((await Product.findById(foreign._id)).title, foreign.title);
    assert.equal((await Product.findById(own._id)).variants[0].stock, variant.stock);
});

test('simple base price and cost edits agree after persistence, public reload and order pricing', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const product = ctx.data.products.productA.product;
    product.variants = [{ attributes: [], stock: 12, priceOverride: 1200, pricing: { price: 1200, costPrice: 500 } }];
    await product.save();
    const body = new FormData();
    body.append('pricing', JSON.stringify({ sellingPrice: 1500, buyingPrice: 700, discount: 10 }));
    const response = await ctx.vendorAClient().unsafePatch(`/api/admin/products/${product._id}`, body);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    const saved = await Product.findById(product._id);
    const publicDetail = await ctx.client().get(`/api/storefront/launchshopa/products/${product._id}`);
    assert.equal(publicDetail.status, 200);
    assert.equal(JSON.stringify(publicDetail.body).includes('costPrice'), false);
    const { normalizeProduct, getProductPresentation } = await import('../../../..//packages/storefront-renderer/normalizeProduct.js');
    const display = getProductPresentation(normalizeProduct(publicDetail.body.data || publicDetail.body));
    const line = buildOrderLineItem({ product: saved, variant: saved.variants[0], item: { quantity: 2 } });
    assert.equal(display.displayFinalPrice, 1350);
    assert.equal(line.orderItem.price, 1350);
    assert.equal(line.orderItem.buyingPrice, 700);
    assert.equal(line.subtotal, 2700);
});

test('cover change persists, options reconcile, foreign collections and unsafe URLs fail atomically', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const product = ctx.data.products.productA.product;
    const images = ['https://example.com/a.webp', 'https://example.com/b.webp'];
    product.images = images;
    product.coverMediaId = images[0];
    product.variants[0].attributes[0].name = 'size';
    product.options = [{ name: 'size', values: [{ value: product.variants[0].attributes[0].value }] }];
    await product.save();
    const client = ctx.vendorAClient();
    const body = new FormData();
    body.append('existingImages', JSON.stringify(images));
    body.append('coverImageIndex', '1');
    assert.equal((await client.unsafePatch(`/api/admin/products/${product._id}`, body)).status, 200);
    assert.equal((await Product.findById(product._id)).coverMediaId, images[1]);
    const added = await client.unsafePatch(`/api/admin/products/${product._id}`, { addAttributeOption: { name: 'size', option: 'xxl', defaultStock: 2 } });
    assert.equal(added.status, 200, JSON.stringify(added.body));
    assert(added.body.data.options[0].values.some(v => v.value === 'xxl'));
    assert.equal(String(added.body.data.variants[0]._id), String(product.variants[0]._id));
    const foreign = await Collection.create({ shop_id: ctx.data.shops.shopB._id, title: 'Foreign', slug: 'foreign', productIds: [] });
    const badCollection = await client.unsafePatch(`/api/admin/products/${product._id}`, { title: 'Should roll back', collections: [String(foreign._id)] });
    assert.equal(badCollection.status, 400);
    const badImage = await client.unsafePatch(`/api/admin/products/${product._id}`, { variants: [{ _id: String(product.variants[0]._id), image: 'javascript:alert(1)' }] });
    assert.equal(badImage.status, 400);
    const foreignMedia = ctx.data.products.productB.product.images[0];
    await Product.updateOne({ _id: product._id }, { $set: { images: ['https://example.com/own.webp'], coverMediaId: 'https://example.com/own.webp' } });
    const foreignImage = await client.unsafePatch(`/api/admin/products/${product._id}`, { images: [foreignMedia] });
    assert.equal(foreignImage.status, 400);
    const ownedCollection = await Collection.create({ shop_id: ctx.data.shops.shopA._id, title: 'Own', slug: 'own', productIds: [] });
    const assigned = await client.unsafePatch(`/api/admin/products/${product._id}`, { collections: [String(ownedCollection._id)] });
    assert.equal(assigned.status, 200, JSON.stringify(assigned.body));
    assert((await Collection.findById(ownedCollection._id)).productIds.some(id => String(id) === String(product._id)));
    assert.equal((await Product.findById(product._id)).title, product.title);
});

test('scheduled product edits reuse durable jobs, enforce staff permission and publish only when due', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const product = ctx.data.products.productA.product;
    const client = ctx.vendorAClient();
    const publishAt = '2030-11-01T04:00:00.000Z';
    const schedule = { publicationStatus: 'scheduled', publishAt };
    assert.equal((await ctx.staffAClient().unsafePatch(`/api/admin/products/${product._id}`, schedule)).status, 403);
    assert.equal((await client.unsafePatch(`/api/admin/products/${product._id}`, { ...schedule, publishAt: '2030-11-01T10:00' })).status, 400);
    assert.equal((await client.unsafePatch(`/api/admin/products/${product._id}`, schedule)).status, 200);
    assert.equal((await client.unsafePatch(`/api/admin/products/${product._id}`, { ...schedule, title: 'Scheduled updated title' })).status, 200);
    const Job = require('../../models/Job');
    assert.equal(await Job.countDocuments({ 'payload.productId': product._id, name: 'products.publish_scheduled' }), 1);
    const { publishScheduledProduct } = require('../../services/products/scheduledProductService');
    assert.equal(await publishScheduledProduct({ productId: product._id, shopId: product.shop_id }), null);
    await Product.updateOne({ _id: product._id }, { $set: { publishAt: new Date(Date.now() - 1000) } });
    const published = await publishScheduledProduct({ productId: product._id, shopId: product.shop_id });
    assert.equal(published.status, 'Published');
    assert.equal(published.publishAt, null);
    assert.equal((await client.unsafePatch(`/api/admin/products/${product._id}`, { status: 'Archived' })).status, 200);
    assert.equal((await Product.findById(product._id)).publicationStatus, 'draft');
});

test('legacy over-plan media can remain on metadata edits but cannot grow', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const product = ctx.data.products.productA.product;
    const images = Array.from({ length: 8 }, (_, i) => `https://example.com/legacy-${i}.webp`);
    await Product.updateOne({ _id: product._id }, { $set: { images, coverMediaId: images[0] } });
    await setShopPlan({ shopId: product.shop_id, plan: ctx.data.plans.beginner });
    const client = ctx.vendorAClient();
    const titleEdit = await client.unsafePatch(`/api/admin/products/${product._id}`, { title: 'Legacy images retained' });
    assert.equal(titleEdit.status, 200, JSON.stringify(titleEdit.body));
    const increase = await client.unsafePatch(`/api/admin/products/${product._id}`, { images: [...images, 'https://example.com/new-image.webp'] });
    assert.equal(increase.status, 403);
    assert.deepEqual((await Product.findById(product._id)).images, images);
});

test('membership denial overrides stale legacy permissions for stocked removals and scheduling', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const staff = ctx.data.identities.staffA;
    await require('../../models/User').updateOne({ _id: staff.user._id }, { $set: { 'permissions.inventoryManage': true, 'permissions.productsSchedule': true } });
    await require('../../models/StaffPermission').updateOne({ membership_id: staff.membership._id }, { $set: { 'permissions.inventoryManage': false, 'permissions.productsSchedule': false } });
    const product = ctx.data.products.productA.product;
    product.variants.push({ attributes: [{ name: 'Size', value: 'Second' }], stock: 1 });
    await product.save();
    const client = ctx.staffAClient();
    const removed = await client.unsafePatch(`/api/admin/products/${product._id}`, { removeVariants: [String(product.variants[0]._id)] });
    assert.equal(removed.status, 403);
    assert.equal((await Product.findById(product._id)).variants.length, 2);
    const scheduled = await client.unsafePatch(`/api/admin/products/${product._id}`, { publicationStatus: 'scheduled', publishAt: '2030-11-01T04:00:00Z' });
    assert.equal(scheduled.status, 403);
});

test('a partial upload failure removes newly uploaded assets and never persists a product', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const { Writable } = require('node:stream');
    const cloudinary = require('cloudinary').v2;
    const originalUpload = cloudinary.uploader.upload_stream;
    const originalDestroy = cloudinary.uploader.destroy;
    const removed = [];
    let attempts = 0;
    cloudinary.uploader.destroy = async id => { removed.push(id); return { result: 'ok' }; };
    cloudinary.uploader.upload_stream = (_options, callback) => new Writable({
        write(_chunk, _encoding, done) { done(); },
        final(done) {
            attempts++;
            if (attempts === 1) callback(null, { public_id: 'test/new-upload-only', secure_url: 'https://example.com/new-upload.webp', resource_type: 'image', bytes: 100 });
            else callback(new Error('Injected provider failure'));
            done();
        }
    });
    t.after(() => { cloudinary.uploader.upload_stream = originalUpload; cloudinary.uploader.destroy = originalDestroy; });
    const png = await require('sharp')({ create: { width: 16, height: 16, channels: 3, background: '#9944ff' } }).png().toBuffer();
    const body = new FormData();
    body.append('images', new Blob([png], { type: 'image/png' }), 'one.png');
    body.append('images', new Blob([png], { type: 'image/png' }), 'two.png');
    const before = await Product.countDocuments();
    const result = await ctx.vendorAClient().unsafePost('/api/admin/products', body);
    assert.equal(result.status, 400);
    assert.equal(await Product.countDocuments(), before);
    assert(removed.includes('test/new-upload-only'));
    assert(removed.every(id => id === 'test/new-upload-only'));
});

test('initial product stock is logged and invalid multipart/media requests leave no product', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const client = ctx.vendorAClient();
    const body = new FormData();
    for (const [key, value] of Object.entries({ title: 'New simple product', description: 'An adequately described product', category: '', pricing: JSON.stringify({ buyingPrice: 50, sellingPrice: 100, discount: 0 }), images: JSON.stringify(['https://example.com/new.webp']), simpleStock: '7', lowStockThreshold: '0', status: 'Draft' })) body.append(key, value);
    const created = await client.unsafePost('/api/admin/products', body);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.data.variants[0].stock, 7);
    assert.equal(created.body.data.variants[0].inventory.lowStockThreshold, 0);
    assert.equal(await InventoryLog.countDocuments({ productId: created.body.data._id, afterStock: 7 }), 1);
    const before = await Product.countDocuments();
    const bad = new FormData();
    bad.append('pricing', '{bad-json');
    assert.equal((await client.unsafePost('/api/admin/products', bad)).status, 400);
    const upload = new FormData();
    upload.append('images', new Blob(['<script>bad</script>'], { type: 'image/jpeg' }), 'fake.jpg');
    assert.equal((await client.unsafePost('/api/admin/products', upload)).status, 400);
    assert.equal(await Product.countDocuments(), before);
});
