const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Writable } = require('node:stream');
const sharp = require('sharp');
const { createLaunchSafetyContext, Product, InventoryLog, setShopPlan } = require('../helpers/launchSafetyHarness');
const { getLowStockThreshold, shouldQueueLowStockAlert } = require('../../services/inventoryLowStockAlertService');
const base = title => ({ title, description: 'A complete description of this test product.', images: ['https://example.com/test.png'], pricing: { buyingPrice: 1, sellingPrice: 2 }, status: 'Draft' });
const attrs = value => [{ name: 'color', value }];
const snapshot = async id => JSON.stringify(await Product.findById(id).lean());

test('F06/F09 category omitted, whitespace, assigned and cleared; zero thresholds persist and protected inventory remains unchanged', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const client = ctx.vendorAClient();
    for (const [index, category] of [undefined, '', '  ', ' Clothing '].entries()) {
        const payload = { ...base(`Category test ${index}`), lowStockThreshold: 0, simpleStock: 4, ...(category === undefined ? {} : { category }) };
        const response = await client.unsafePost('/api/admin/products', payload);
        assert.equal(response.status, 201, JSON.stringify(response.body));
        const id = response.body.data._id;
        const saved = await Product.findById(id);
        assert.equal(saved.category || '', category?.trim() || '');
        assert.equal(saved.lowStockThreshold, 0);
        assert.equal(saved.variants[0].inventory.lowStockThreshold, 0);
        const variantId = String(saved.variants[0]._id);
        await Product.updateOne({ _id: id }, { $set: { 'variants.0.inventory.reservedStock': 2, 'variants.0.inventory.lowStockAlertActive': true, 'variants.0.inventory.lowStockAlertStatus': 'sent', 'variants.0.inventory.lowStockAlertSentAt': new Date('2026-01-01') } });
        const edit = await client.unsafePatch(`/api/admin/products/${id}`, { category: '', variants: [{ _id: variantId, sku: ' zero-sku ', inventory: { lowStockThreshold: 0 } }] });
        assert.equal(edit.status, 200, JSON.stringify(edit.body));
        const loaded = await client.get(`/api/admin/products/${id}`);
        assert.equal(loaded.body.data.category, '');
        assert.equal(loaded.body.data.lowStockThreshold, 0);
        assert.equal(loaded.body.data.variants[0].sku, 'ZERO-SKU');
        const reloaded = await Product.findById(id);
        assert.equal(String(reloaded.variants[0]._id), variantId);
        assert.equal(reloaded.variants[0].stock, 4);
        assert.equal(reloaded.variants[0].inventory.reservedStock, 2);
        assert.equal(reloaded.variants[0].inventory.lowStockThreshold, 0);
        assert.equal(reloaded.variants[0].inventory.lowStockAlertStatus, 'sent');
        assert.equal(reloaded.variants[0].inventory.lowStockAlertActive, true);
        assert.equal(reloaded.variants[0].inventory.lowStockAlertSentAt.toISOString(), '2026-01-01T00:00:00.000Z');
        const before = await snapshot(id);
        for (const invalid of [{ category: {} }, { category: 'x'.repeat(101) }, { lowStockThreshold: null }, { variants: [{ _id: variantId, inventory: { lowStockThreshold: null } }] }, { variants: [{ _id: variantId, inventory: { lowStockAlertStatus: 'not_triggered' } }] }]) {
            const response = await client.unsafePatch(`/api/admin/products/${id}`, invalid);
            assert.equal(response.status, 400, JSON.stringify(response.body));
            assert.match(response.body.error, /category|lowStockThreshold|lowStockAlertStatus/);
            assert.equal(await snapshot(id), before);
        }
    }
    const matrix = await client.unsafePost('/api/admin/products', { ...base('Threshold matrix test'), lowStockThreshold: 0, variantMatrix: { attributes: [{ name: 'color', options: ['red', 'blue', 'green'] }], overrides: { red: { inventory: { lowStockThreshold: 0 } }, blue: { inventory: { lowStockThreshold: 2 } } } } });
    assert.equal(matrix.status, 201, JSON.stringify(matrix.body));
    const saved = await Product.findById(matrix.body.data._id);
    // Existing matrix policy: an explicit variant override wins; otherwise 5.
    assert.deepEqual(saved.variants.map(v => v.inventory.lowStockThreshold), [0, 2, 5]);
    for (const variant of saved.variants) assert.equal(getLowStockThreshold(saved, variant), variant.inventory.lowStockThreshold);
    assert.equal(shouldQueueLowStockAlert({ product: saved, variant: saved.variants[0], beforeStock: 1, afterStock: 0 }).shouldAlert, true);
});

test('F07 complete resulting variants reject aliases while valid custom, add-option and matrix changes preserve existing identities and inventory', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const client = ctx.vendorAClient();
    const product = ctx.data.products.productA.product;
    product.variants = [{ attributes: [{ name: 'color', value: 'Red' }, { name: 'size', value: 'M' }], stock: 8, sku: 'ORIGINAL', inventory: { stock: 8, reservedStock: 2, lowStockThreshold: 0 }, barcode: 'barcode', weight: 2 }];
    await product.save();
    const id = String(product.variants[0]._id);
    let before = await snapshot(product._id);
    for (const operation of [
        { variants: [{ attributes: [{ name: ' SIZE ', value: ' m ' }, { name: 'COLOR', value: ' red ' }], stock: 0 }] },
        { addAttributeOption: { name: ' COLOR ', option: ' red ' } }
    ]) {
        const response = await client.unsafePatch(`/api/admin/products/${product._id}`, operation);
        assert.equal(response.status, 400, JSON.stringify(response.body));
        assert.match(response.body.error, /duplicate|already exists/i);
        assert.equal(await snapshot(product._id), before);
    }
    const added = await client.unsafePatch(`/api/admin/products/${product._id}`, { variants: [{ attributes: [{ name: 'color', value: 'red|size:m' }, { name: 'size', value: 'L' }], stock: 0, sku: ' custom-sku ' }] });
    assert.equal(added.status, 200, JSON.stringify(added.body));
    assert.equal(added.body.data.variants[1].sku, 'CUSTOM-SKU');
    const option = await client.unsafePatch(`/api/admin/products/${product._id}`, { addAttributeOption: { name: 'color', option: 'blue' } });
    assert.equal(option.status, 200, JSON.stringify(option.body));
    const saved = await Product.findById(product._id);
    const original = saved.variants.id(id);
    assert.equal(original.stock, 8);
    assert.equal(original.inventory.reservedStock, 2);
    assert.equal(original.inventory.lowStockThreshold, 0);
    assert.equal(original.barcode, 'barcode');
    assert.equal(original.weight, 2);
    assert(saved.options.find(o => o.name === 'color').values.some(v => v.value === 'blue'));
    before = await snapshot(product._id);
    const failed = await client.unsafePatch(`/api/admin/products/${product._id}`, { title: 'Should not save', variants: [{ _id: id, sku: 'changed' }, { attributes: attrs('blue'), stock: 0 }, { attributes: attrs(' BLUE '), stock: 0 }] });
    assert.equal(failed.status, 400);
    assert.equal(await snapshot(product._id), before);
});

test('F08 create and edit enforce 500 across flat, matrix, add-option, custom and conflicting operations with atomic failures', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const client = ctx.vendorAClient();
    const variants = Array.from({ length: 500 }, (_, i) => ({ attributes: attrs(`c${i}`), stock: 0 }));
    const created = await client.unsafePost('/api/admin/products', { ...base('Five hundred flat variants'), variants });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.data._id;
    const ids = created.body.data.variants.map(v => v._id);
    const edit = await client.unsafePatch(`/api/admin/products/${id}`, { variants: [{ _id: ids[0], sku: 'AT-CAP' }] });
    assert.equal(edit.status, 200, JSON.stringify(edit.body));
    assert.deepEqual(edit.body.data.variants.map(v => v._id), ids);
    const before = await snapshot(id);
    const logs = await InventoryLog.countDocuments();
    for (const operation of [
        { variants: [{ attributes: attrs('extra'), stock: 1 }] },
        { addAttributeOption: { name: 'color', option: 'extra', defaultStock: 1 } },
        { variants: [], addAttributeOption: { name: 'color', option: 'extra' } },
        { removeVariants: ids },
        { variantMatrix: { attributes: [{ name: 'a', options: Array.from({ length: 8 }, (_, i) => `a${i}`) }, { name: 'b', options: Array.from({ length: 8 }, (_, i) => `b${i}`) }, { name: 'c', options: Array.from({ length: 8 }, (_, i) => `c${i}`) }] } }
    ]) {
        const response = await client.unsafePatch(`/api/admin/products/${id}`, { title: 'Must roll back', ...operation });
        assert.equal(response.status, 400, JSON.stringify(response.body));
        assert.equal(await snapshot(id), before);
        assert.equal(await InventoryLog.countDocuments(), logs);
    }
    for (const invalid of [[], [...variants, { attributes: attrs('501'), stock: 0 }]]) {
        assert.equal((await client.unsafePost('/api/admin/products', { ...base('Invalid variant limit'), variants: invalid })).status, 400);
    }
    const matrix = { attributes: [{ name: 'a', options: Array.from({ length: 50 }, (_, i) => `a${i}`) }, { name: 'b', options: Array.from({ length: 10 }, (_, i) => `b${i}`) }] };
    const matrixCreated = await client.unsafePost('/api/admin/products', { ...base('Five hundred matrix variants'), variantMatrix: matrix });
    assert.equal(matrixCreated.status, 201, JSON.stringify(matrixCreated.body));
    const mid = matrixCreated.body.data._id;
    const mids = matrixCreated.body.data.variants.map(v => v._id);
    const regenerated = await client.unsafePatch(`/api/admin/products/${mid}`, { variantMatrix: matrix });
    assert.equal(regenerated.status, 200, JSON.stringify(regenerated.body));
    assert.deepEqual(regenerated.body.data.variants.map(v => v._id), mids);
    const below = await client.unsafePost('/api/admin/products', { ...base('One below maximum'), variants: variants.slice(0, 499) });
    assert.equal(below.status, 201);
    const boundary = await client.unsafePatch(`/api/admin/products/${below.body.data._id}`, { addAttributeOption: { name: 'color', option: 'last' } });
    assert.equal(boundary.status, 200, JSON.stringify(boundary.body));
    assert.equal(boundary.body.data.variants.length, 500);
});

test('F10 real multipart types, size/content rejection, persistence, tenant ownership, source limits and failed-save cleanup', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const client = ctx.vendorAClient();
    const cloudinary = require('cloudinary').v2;
    const originalUpload = cloudinary.uploader.upload_stream;
    const originalDestroy = cloudinary.uploader.destroy;
    const destroyed = [];
    let uploaded = 0;
    cloudinary.uploader.destroy = async (id, options) => { destroyed.push({ id, options }); return { result: 'ok' }; };
    cloudinary.uploader.upload_stream = (options, callback) => new Writable({
        write(_chunk, _encoding, done) { done(); },
        final(done) {
            const id = `shop_products/f06-${++uploaded}`;
            const video = !options.format;
            callback(null, { public_id: id, secure_url: `https://res.cloudinary.com/test/${video ? 'video' : 'image'}/upload/${id}.${video ? 'mp4' : 'webp'}`, resource_type: video ? 'video' : 'image' }); done();
        }
    });
    t.after(() => { cloudinary.uploader.upload_stream = originalUpload; cloudinary.uploader.destroy = originalDestroy; });
    const body = new FormData();
    const { images: _images, ...fields } = base('All supported media formats');
    for (const [key, value] of Object.entries(fields)) body.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
    for (const [format, mime] of [['jpeg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp']]) {
        const bytes = await sharp({ create: { width: 16, height: 16, channels: 3, background: 'blue' } }).toFormat(format).toBuffer();
        body.append('images', new Blob([bytes], { type: mime }), `image.${format}`);
    }
    for (const [name, mime] of [['sample.mp4', 'video/mp4'], ['sample.mov', 'video/quicktime']]) body.append('videos', new Blob([fs.readFileSync(path.join(__dirname, '../fixtures/product-media', name))], { type: mime }), name);
    body.append('coverImageIndex', '2');
    const created = await client.unsafePost('/api/admin/products', body);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.data._id;
    const saved = await Product.findById(id);
    assert.equal(saved.images.length, 3);
    assert.equal(saved.videos.length, 2);
    assert.equal(saved.coverMediaId, saved.images[2]);
    assert.equal(destroyed.length, 0);
    const loaded = await client.get(`/api/admin/products/${id}`);
    assert.deepEqual(loaded.body.data.images, saved.images);
    assert.deepEqual(loaded.body.data.videos, saved.videos);
    assert.equal(loaded.body.data.coverMediaId, saved.coverMediaId);
    assert.equal((await ctx.vendorBClient().unsafePatch(`/api/admin/products/${id}`, { title: 'Foreign edit' })).status, 404);
    const jpeg = await sharp({ create: { width: 16, height: 16, channels: 3, background: 'green' } }).jpeg().toBuffer();
    const pieces = [jpeg.subarray(0, 2)];
    for (let remaining = 10 * 1024 * 1024 - jpeg.length; remaining > 0;) {
        let size = Math.min(65537, remaining);
        if (remaining > size && remaining - size < 4) size -= 4;
        const comment = Buffer.alloc(size);
        comment[0] = 255; comment[1] = 254; comment.writeUInt16BE(size - 2, 2);
        pieces.push(comment); remaining -= size;
    }
    pieces.push(jpeg.subarray(2));
    const exactLimit = new FormData();
    for (const [key, value] of Object.entries({ ...fields, title: 'Exactly ten MiB' })) exactLimit.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
    exactLimit.append('images', new Blob(pieces, { type: 'image/jpeg' }), 'exact-limit.jpg');
    const exact = await client.unsafePost('/api/admin/products', exactLimit);
    assert.equal(exact.status, 201, JSON.stringify(exact.body));
    const foreign = await ctx.vendorBClient().unsafePatch(`/api/admin/products/${ctx.data.products.productB.product._id}`, { images: [saved.images[0]] });
    assert.equal(foreign.status, 400);
    const before = await snapshot(id);
    for (const [mime, bytes] of [['image/gif', Buffer.from('GIF89a')], ['image/png', Buffer.alloc(10 * 1024 * 1024 + 1)], ['image/png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, ...Array(20).fill(0)])], ['video/mp4', Buffer.from('0000ftypinvalid movie')]]) {
        const invalid = new FormData(); invalid.append(mime.startsWith('video') ? 'videos' : 'images', new Blob([bytes], { type: mime }), 'invalid.bin');
        assert.equal((await client.unsafePatch(`/api/admin/products/${id}`, invalid)).status, 400);
        assert.equal(await snapshot(id), before);
        assert.equal(uploaded, 6);
    }
    const validPng = await sharp({ create: { width: 16, height: 16, channels: 3, background: 'red' } }).png().toBuffer();
    const failed = new FormData(); failed.append('images', new Blob([validPng], { type: 'image/png' }), 'new.png'); failed.append('title', 'x');
    assert.equal((await client.unsafePatch(`/api/admin/products/${id}`, failed)).status, 400);
    for (let i = 0; !destroyed.length && i < 30; i++) await new Promise(resolve => setTimeout(resolve, 10));
    assert.deepEqual(destroyed.map(x => x.id), ['shop_products/f06-7']);
    assert.equal(await snapshot(id), before);
    await setShopPlan({ shopId: saved.shop_id, plan: ctx.data.plans.beginner });
    // Gallery is at the allowance; a separate variant image must count too.
    const variantId = String(saved.variants[0]._id);
    const limit = await client.unsafePatch(`/api/admin/products/${id}`, { variants: [{ _id: variantId, image: 'https://example.com/extra-variant.png' }] });
    assert.equal(limit.status, 403, JSON.stringify(limit.body));
    assert.equal(await snapshot(id), before);
    // A gallery image reused by a variant is the same source, even with a query.
    const reuse = await client.unsafePatch(`/api/admin/products/${id}`, { variants: [{ _id: variantId, image: `${saved.images[0]}?cache=1` }] });
    assert.equal(reuse.status, 200, JSON.stringify(reuse.body));
    const overLimitUpload = new FormData(); overLimitUpload.append('images', new Blob([validPng], { type: 'image/png' }), 'over-limit.png');
    assert.equal((await client.unsafePatch(`/api/admin/products/${id}`, overLimitUpload)).status, 403);
    const legacy = Array.from({ length: 5 }, (_, i) => `https://example.com/legacy-${i}.png`);
    await Product.updateOne({ _id: id }, { $set: { images: legacy, coverMediaId: legacy[0], 'variants.0.image': legacy[4] } });
    assert.equal((await client.unsafePatch(`/api/admin/products/${id}`, { title: 'Grandfathered media retained' })).status, 200);
    assert.deepEqual((await Product.findById(id)).images, legacy);
    assert(destroyed.every(x => ['shop_products/f06-7', 'shop_products/f06-8'].includes(x.id)));
});
