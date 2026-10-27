/* Requires a disposable MONGO_URI_TEST and optional bundled PLAYWRIGHT_MODULE. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { Writable } = require('node:stream');
const fs = require('node:fs');
const path = require('node:path');
const { createLaunchSafetyContext, Product, InventoryLog } = require('../../ecommerce-backend/backend/tests/helpers/launchSafetyHarness');

const waitFor = async (predicate, message = 'Expected browser state did not arrive') => {
    for (let attempt = 0; attempt < 240; attempt++) {
        if (await predicate()) return;
        await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.fail(message);
};

test('Product Activity restores scoped unfinished work, reconciles safely, discards locally, synchronizes tabs and manages focus', { timeout: 180000 }, async t => {
    const origin = 'http://localhost:5183';
    process.env.CORS_ORIGINS = origin;
    process.env.ADMIN_APP_URL = origin;
    const cleanups = [];
    const ctx = await createLaunchSafetyContext({ after: callback => cleanups.push(callback) });
    const ProductSubmission = require('../../ecommerce-backend/backend/models/ProductSubmission');
    const Collection = require('../../ecommerce-backend/backend/models/Collection');
    const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
    const cloudinary = require('../../ecommerce-backend/backend/node_modules/cloudinary').v2;
    const upload = cloudinary.uploader.upload_stream;
    const destroy = cloudinary.uploader.destroy;
    let uploadCount = 0;
    let holdUpload = false;
    let releaseUpload;
    cloudinary.uploader.destroy = async () => ({ result: 'ok' });
    cloudinary.uploader.upload_stream = (options, callback) => new Writable({
        write(_chunk, _encoding, done) { done(); },
        final(done) {
            const index = ++uploadCount;
            const resourceType = options.resource_type === 'video' ? 'video' : 'image';
            const finish = () => {
                callback(null, { public_id: `${options.folder}/${options.public_id || `activity-${index}`}`, secure_url: `https://example.com/activity-${index}.${resourceType === 'video' ? 'mp4' : 'webp'}`, resource_type: resourceType, bytes: 100 });
                done();
            };
            if (holdUpload) { holdUpload = false; releaseUpload = finish; }
            else finish();
        }
    });
    const vite = spawn(process.execPath, [path.resolve(__dirname, '../node_modules/vite/bin/vite.js'), '--host', 'localhost', '--port', '5183', '--strictPort'], {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, VITE_API_URL: `${ctx.baseUrl.replace('127.0.0.1', 'localhost')}/api` },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    let viteLog = '';
    vite.stdout.on('data', chunk => { viteLog += chunk; });
    vite.stderr.on('data', chunk => { viteLog += chunk; });
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    t.after(async () => {
        if (releaseUpload) releaseUpload();
        await browser.close();
        vite.kill('SIGTERM');
        cloudinary.uploader.upload_stream = upload;
        cloudinary.uploader.destroy = destroy;
        for (const cleanup of cleanups.reverse()) await cleanup();
    });
    for (let attempt = 0; attempt < 100; attempt++) {
        if (vite.exitCode !== null) throw new Error(viteLog);
        try { if ((await fetch(origin)).ok) break; } catch { /* Vite is starting. */ }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    const context = await browser.newContext({ timezoneId: 'Asia/Dhaka', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const tokenA = ctx.vendorAClient().jar.token;
    const tokenB = ctx.vendorBClient().jar.token;
    const cookiesFor = token => ['localhost', '127.0.0.1'].map(domain => ({ name: 'token', value: token, domain, path: '/', httpOnly: true, sameSite: 'Lax' }));
    await context.addCookies(cookiesFor(tokenA));
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const png = await require('../../ecommerce-backend/backend/node_modules/sharp')({ create: { width: 8, height: 8, channels: 3, background: '#8855ff' } }).png().toBuffer();
    const video = fs.readFileSync(path.resolve(__dirname, '../../ecommerce-backend/backend/tests/fixtures/product-media/sample.mp4'));
    await context.route('https://example.com/**', route => route.fulfill({ contentType: 'image/png', body: png }));
    await context.route('https://res.cloudinary.com/**', route => route.fulfill({ contentType: 'image/png', body: png }));
    let productPosts = 0;
    let productDeletes = 0;
    context.on('request', request => {
        if (/\/api\/admin\/products(?:\?|$)/.test(request.url()) && request.method() === 'POST') productPosts++;
        if (/\/api\/admin\/products\//.test(request.url()) && request.method() === 'DELETE') productDeletes++;
    });
    const collection = await Collection.create({ shop_id: ctx.data.shops.shopA._id, title: 'Recovery collection', slug: 'recovery-collection' });
    const actor = String(ctx.data.identities.vendorA.user._id);
    const shop = String(ctx.data.shops.shopA._id);
    const actorB = String(ctx.data.identities.vendorB.user._id);
    const shopB = String(ctx.data.shops.shopB._id);
    const scope = `${actor}:${shop}`;
    const ids = Object.fromEntries(['full', 'missing', 'discard', 'unknown', 'processing', 'corrupt', 'aged', 'saved', 'foreign'].map(name => [name, randomUUID()]));
    await ProductSubmission.create(Object.entries(ids).filter(([name]) => !['unknown', 'foreign'].includes(name)).map(([name, key]) => ({
        key, actor, shop_id: shop, fingerprint: 'a'.repeat(64), owner: randomUUID(),
        state: name === 'saved' ? 'completed' : name === 'processing' ? 'processing' : 'failed',
        leaseUntil: new Date(Date.now() + 5 * 60 * 1000),
        ...(name === 'saved' ? { productId: ctx.data.products.productA.product._id } : {}),
        error: name === 'full' ? 'The image upload failed. Review the preserved product and try again.' : 'Review the rejected product before saving again.',
        httpStatus: 400
    })));
    await page.goto(`${origin}/dashboard/products`);
    await page.getByRole('button', { name: /^Add product$/i }).or(page.getByRole('link', { name: /^Add product$/i })).first().waitFor();
    await page.getByRole('button', { name: 'Unfinished products: 0', exact: true }).click();
    await page.getByRole('dialog', { name: 'Product Activity', exact: true }).getByRole('heading', { name: 'No unfinished products', exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog', { name: 'Product Activity', exact: true }).waitFor({ state: 'hidden' });
    const seeded = await page.evaluate(async ({ ids, scope, scopeB, png, video, collection, productId }) => {
        const { productSubmissionStore: store } = await import('/src/services/productSubmissionStore.js');
        const { fingerprintEntries } = await import('/src/services/productSubmissionManager.js');
        const image = new File([new Uint8Array(png)], 'preserved-cover.png', { type: 'image/png', lastModified: 20 });
        const clip = new File([new Uint8Array(video)], 'preserved-demo.mp4', { type: 'video/mp4', lastModified: 30 });
        const snapshotFor = title => ({
            formData: {
                title, slug: '', description: 'A full preserved cotton product with independent color variants.', category: 'Clothing', tags: 'cotton,shirt',
                status: 'Draft', publicationStatus: 'draft', publishAt: '', lowStockThreshold: 0, imageAltText: 'Cotton shirt front',
                seo: { title: 'Preserved cotton shirt', description: 'An independently preserved SEO description.' },
                pricing: { buyingPrice: '50', sellingPrice: '100', discount: 10 },
                features: [{ point: 'Comfort', reason: 'Soft cotton for everyday wear', title: 'Comfort', value: 'Soft cotton for everyday wear' }],
                specifications: [{ title: 'Fabric', value: 'Cotton' }], comments: [{ title: 'Care', value: 'Hand wash' }],
                sellerFacts: { brand: 'Recovery brand', model: 'RC-1', material: '100% cotton', dimensions: '30 × 20 cm', packageContents: 'One shirt' }
            },
            imageFiles: [image], videoFiles: [clip], coverImageIndex: 0, selectedCollections: [collection],
            attributes: [{ name: 'color', options: ['Red', 'Blue'] }], optionInputs: [''], defaultStock: 4,
            stockOverrides: { '["Red"]': 5 }, variantDetails: { '["Red"]': { sku: 'RECOVERY-RED', price: '120', lowStockThreshold: 0 } }
        });
        const entriesFor = snapshot => {
            const data = new FormData();
            Object.entries(snapshot.formData).forEach(([name, value]) => {
                if (name === 'publishAt') return;
                data.append(name, value && typeof value === 'object' ? JSON.stringify(value) : String(value));
            });
            data.append('collections', JSON.stringify(snapshot.selectedCollections));
            data.append('coverImageIndex', '0');
            data.append('variantMatrix', JSON.stringify({ attributes: snapshot.attributes, defaultStock: snapshot.defaultStock, overrides: { '["Red"]': { stock: 5, pricing: { price: 120 }, sku: 'RECOVERY-RED', inventory: { stock: 5, lowStockThreshold: 0 } }, '["Blue"]': { stock: 4, inventory: { stock: 4, lowStockThreshold: 0 } } } }));
            snapshot.imageFiles.forEach(file => data.append('images', file));
            snapshot.videoFiles.forEach(file => data.append('videos', file));
            return [...data.entries()];
        };
        const titles = { full: 'Full recovery cotton shirt', missing: `Missing cover recovery ${'x'.repeat(75)}`, discard: 'Discard this local recovery', unknown: 'Unconfirmed original payload', processing: 'Still processing on server', corrupt: 'Damaged local recovery', aged: 'Older recovery remains available', saved: 'Previously confirmed product', foreign: 'Other merchant private product' };
        const serial = {};
        for (const [name, id] of Object.entries(ids)) {
            const snapshot = snapshotFor(titles[name]);
            let entries = entriesFor(snapshot);
            const fingerprint = await fingerprintEntries(entries);
            const record = { id, scope: name === 'foreign' ? scopeB : scope, title: titles[name], snapshot, entries, fingerprint, createdAt: Date.now() - (name === 'aged' ? 40 * 86400000 : 3600000), updatedAt: Date.now(), state: ['unknown', 'processing'].includes(name) ? 'recovery' : name === 'saved' ? 'saved' : 'failed', editable: !['unknown', 'processing', 'saved'].includes(name), error: name === 'full' ? 'The image upload failed. Review the preserved product and try again.' : 'Review the rejected product before saving again.' };
            if (name === 'missing') {
                record.snapshot.imageFiles = [{ name: 'lost-front.png', type: 'image/png', size: 100 }];
                record.entries = entries.map(([field, value]) => field === 'images' ? [field, { name: 'lost-front.png', type: 'image/png', size: 100 }] : [field, value]);
            }
            if (name === 'corrupt') {
                record.snapshot = { formData: { title: titles[name], pricing: 'damaged' }, attributes: 'damaged', imageFiles: 'damaged' };
                record.entries = 'damaged';
            }
            if (name === 'saved') { record.productId = productId; record.snapshot = undefined; record.entries = undefined; record.editable = false; }
            await store.put(record, { create: true });
            serial[name] = { id, title: record.title, fingerprint };
        }
        return serial;
    }, { ids, scope, scopeB: `${actorB}:${shopB}`, png: [...png], video: [...video], collection: String(collection._id), productId: String(ctx.data.products.productA.product._id) });

    const readRecord = (target, id) => target.evaluate(async ({ scope, id }) => {
        const { productSubmissionStore } = await import('/src/services/productSubmissionStore.js');
        const record = (await productSubmissionStore.list(scope)).find(item => item.id === id);
        if (!record) return null;
        return {
            id: record.id, state: record.state, fingerprint: record.fingerprint,
            snapshot: record.snapshot && { ...record.snapshot, imageFiles: Array.isArray(record.snapshot.imageFiles) ? await Promise.all(record.snapshot.imageFiles.map(async file => file instanceof Blob ? { name: file.name, type: file.type, bytes: [...new Uint8Array(await file.arrayBuffer())] } : file)) : record.snapshot.imageFiles, videoFiles: Array.isArray(record.snapshot.videoFiles) ? await Promise.all(record.snapshot.videoFiles.map(async file => file instanceof Blob ? { name: file.name, type: file.type, bytes: [...new Uint8Array(await file.arrayBuffer())] } : file)) : record.snapshot.videoFiles }
        };
    }, { scope, id });
    const openActivity = async target => {
        await target.bringToFront();
        const drawer = target.getByRole('dialog', { name: 'Product Activity', exact: true });
        if (!await drawer.isVisible()) await target.getByRole('button', { name: 'Product Activity', exact: true }).click();
        await drawer.waitFor();
        return drawer;
    };
    const card = (drawer, title) => drawer.locator('article').filter({ hasText: title });
    const closeActivity = async target => {
        await target.bringToFront();
        const drawer = target.getByRole('dialog', { name: 'Product Activity', exact: true });
        if (await drawer.isVisible()) { await target.keyboard.press('Escape'); await drawer.waitFor({ state: 'hidden' }); }
    };

    // Hydration reconstructs each UUID exactly once and never POSTs persisted records.
    const postsBeforeRefresh = productPosts;
    await page.reload();
    const unfinishedEntry = page.getByRole('button', { name: /Unfinished products/i, includeHidden: true });
    await unfinishedEntry.waitFor({ state: 'visible' });
    assert.match(await unfinishedEntry.innerText(), /7/);
    await unfinishedEntry.click();
    let drawer = page.getByRole('dialog', { name: 'Product Activity', exact: true });
    await drawer.waitFor();
    await drawer.getByRole('tab', { name: /^Unfinished/ }).click();
    await card(drawer, seeded.full.title).waitFor();
    assert.equal(await card(drawer, seeded.full.title).count(), 1);
    assert.equal(await card(drawer, seeded.foreign.title).count(), 0);
    assert.equal(productPosts, postsBeforeRefresh);
    await card(drawer, seeded.full.title).getByText('Needs attention', { exact: true }).waitFor();
    await card(drawer, seeded.unknown.title).getByText('Check status', { exact: true }).waitFor();
    await card(drawer, seeded.aged.title).waitFor();
    assert.equal(await card(drawer, seeded.full.title).locator('time[datetime]').count(), 1);
    assert.equal(await card(drawer, seeded.full.title).locator('img').count(), 1);
    assert.equal(await card(drawer, seeded.processing.title).getByRole('button', { name: 'Discard recovery', exact: true }).count(), 0);
    assert.equal(await card(drawer, seeded.unknown.title).getByRole('link', { name: 'Review & Retry', exact: true }).count(), 0);
    await drawer.getByRole('tab', { name: /^Recently Saved/ }).click();
    await card(drawer, seeded.saved.title).getByRole('link', { name: /View Product/i }).waitFor();
    assert.equal(await card(drawer, seeded.saved.title).getByRole('link', { name: /View Product/i }).getAttribute('href'), `/dashboard/products/edit/${ctx.data.products.productA.product._id}`);
    await drawer.getByRole('tab', { name: /^Unfinished/ }).click();

    // Check Status coalesces repeated clicks and cannot POST or make an uncertain form editable.
    let releaseCheck;
    let checkRequests = 0;
    await page.route(`**/api/admin/product-submissions/${ids.processing}`, async route => {
        checkRequests++;
        await new Promise(resolve => { releaseCheck = resolve; });
        await route.continue();
    });
    const processing = card(drawer, seeded.processing.title);
    await processing.getByRole('button', { name: 'Check Status', exact: true }).evaluate(button => { button.click(); button.click(); });
    await waitFor(() => Boolean(releaseCheck));
    assert.equal(checkRequests, 1);
    releaseCheck();
    await waitFor(async () => !(await processing.getByRole('button', { name: /Check Status|Checking/ }).isDisabled()));
    await page.unroute(`**/api/admin/product-submissions/${ids.processing}`);
    assert.equal(productPosts, postsBeforeRefresh);
    assert.equal(await processing.getByRole('link', { name: 'Review & Retry', exact: true }).count(), 0);
    const uncertainBefore = await readRecord(page, ids.unknown);
    await card(drawer, seeded.unknown.title).getByRole('button', { name: 'Check Status', exact: true }).click();
    await waitFor(async () => (await readRecord(page, ids.unknown))?.state === 'recovery');
    const uncertainAfter = await readRecord(page, ids.unknown);
    assert.equal(uncertainAfter.id, uncertainBefore.id);
    assert.equal(uncertainAfter.fingerprint, uncertainBefore.fingerprint);
    assert.deepEqual(uncertainAfter.snapshot, uncertainBefore.snapshot);
    assert.equal(productPosts, postsBeforeRefresh);

    // The backend receipt is the only authority for moving an uncertain record to Saved.
    await ProductSubmission.updateOne({ key: ids.processing }, { $set: { state: 'completed', productId: ctx.data.products.productA.product._id } });
    await processing.getByRole('button', { name: 'Check Status', exact: true }).click();
    await drawer.getByRole('tab', { name: /^Recently Saved/ }).click();
    await card(drawer, seeded.processing.title).getByRole('link', { name: /View Product/i }).waitFor();
    assert.equal((await readRecord(page, ids.processing)).snapshot, undefined);
    await drawer.getByRole('tab', { name: /^Unfinished/ }).click();

    // Discard confirmation removes only the selected browser recovery, not products or receipts.
    const productsBeforeDiscard = await Product.countDocuments();
    const receiptCountBeforeDiscard = await ProductSubmission.countDocuments();
    await card(drawer, seeded.discard.title).getByRole('button', { name: 'Discard recovery', exact: true }).click();
    const confirm = page.getByRole('dialog', { name: 'Discard recovery', exact: true });
    await confirm.waitFor();
    await confirm.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert(await readRecord(page, ids.discard));
    await card(drawer, seeded.discard.title).getByRole('button', { name: 'Discard recovery', exact: true }).click();
    await confirm.getByRole('button', { name: 'Discard recovery', exact: true }).click();
    await card(drawer, seeded.discard.title).waitFor({ state: 'hidden' });
    assert.equal(await readRecord(page, ids.discard), null);
    assert.match(await unfinishedEntry.innerText(), /5/); // One receipt completed and one recovery was discarded.
    assert.equal(await Product.countDocuments(), productsBeforeDiscard);
    assert.equal(await ProductSubmission.countDocuments(), receiptCountBeforeDiscard);
    assert.equal(productDeletes, 0);

    // Missing files are named and valid preserved fields remain editable after confirmed rejection.
    await card(drawer, seeded.missing.title).getByRole('link', { name: 'Review & Retry', exact: true }).click();
    await page.locator('#title').waitFor();
    assert.equal(await page.locator('#title').inputValue(), seeded.missing.title);
    await page.getByText(/lost-front\.png/).first().waitFor();
    assert.equal(await page.locator('#description').inputValue(), 'A full preserved cotton product with independent color variants.');
    assert.equal(await page.locator('#seoTitle').inputValue(), 'Preserved cotton shirt');
    assert.equal(await page.locator('#seller-fact-brand').inputValue(), 'Recovery brand');
    assert.equal(await page.getByRole('button', { name: /^Remove product image/ }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Remove product video 1', exact: true }).count(), 1);
    assert.equal(await page.locator('tbody tr').count(), 2);

    // A separate failed UUID restores every form section and corrects through the original receipt.
    drawer = await openActivity(page);
    await drawer.getByRole('tab', { name: /^Unfinished/ }).click();
    await card(drawer, seeded.full.title).getByRole('link', { name: 'Review & Retry', exact: true }).click();
    await page.locator('#title').waitFor();
    assert.equal(await page.locator('#title').inputValue(), seeded.full.title);
    assert.equal(await page.locator('#defaultStock').inputValue(), '4');
    assert.equal(await page.locator('#lowStockThreshold').inputValue(), '0');
    assert.equal(await page.locator('#status').inputValue(), 'Draft');
    assert.equal(await page.getByRole('button', { name: /^Remove product image/ }).count(), 1);
    assert.equal(await page.getByRole('button', { name: 'Remove product video 1', exact: true }).count(), 1);
    assert.equal(await page.locator('tbody tr').first().getByPlaceholder('SKU').inputValue(), 'RECOVERY-RED');
    assert.equal(await page.getByPlaceholder('Title (e.g. Material)').first().inputValue(), 'Fabric');
    assert.equal(await page.getByPlaceholder('Value (e.g. Cotton)').first().inputValue(), 'Cotton');
    await page.getByText('The image upload failed. Review the preserved product and try again.', { exact: false }).first().waitFor();
    await page.locator('#title').fill('Corrected preserved cotton shirt');
    await page.getByRole('button', { name: 'Save Product', exact: true }).click();
    await page.waitForURL('**/dashboard/products');
    await waitFor(async () => (await ProductSubmission.findOne({ key: ids.full }))?.state === 'completed');
    const product = await Product.findOne({ title: 'Corrected preserved cotton shirt' });
    assert(product);
    assert.equal(product.publicationStatus, 'draft');
    assert.equal(product.isActive, false);
    assert.equal(product.images.length, 1);
    assert.equal(product.videos.length, 1);
    assert.equal(product.variants.length, 2);
    assert.deepEqual(product.variants.map(variant => variant.stock), [5, 4]);
    assert.equal(product.variants[0].sku, 'RECOVERY-RED');
    assert.equal(product.variants[0].pricing.price, 120);
    assert.equal(product.specifications[0].value, 'Cotton');
    assert.equal(product.comments[0].value, 'Hand wash');
    assert.equal(product.seo.title, 'Preserved cotton shirt');
    assert.equal(product.sellerFacts.brand, 'Recovery brand');
    assert.equal(String(product.collections[0]), String(collection._id));
    assert.equal(await InventoryLog.countDocuments({ productId: product._id }), 2);

    // Corrupt data is discoverable without crashing or causing an automatic product request.
    drawer = await openActivity(page);
    await drawer.getByRole('tab', { name: /^Unfinished/ }).click();
    await card(drawer, seeded.corrupt.title).waitFor();
    assert.equal(productDeletes, 0);

    // Real IndexedDB write errors keep the entered form and prevent a background POST.
    await closeActivity(page);
    await page.goto(`${origin}/dashboard/products/add`);
    await page.locator('#title').waitFor();
    await page.locator('#title').fill('Storage capacity problem');
    await page.locator('#description').fill('This form must remain open if browser recovery storage cannot be committed.');
    await page.locator('#buyingPrice').fill('50');
    await page.locator('#sellingPrice').fill('100');
    await page.locator('input[type=file]').first().setInputFiles({ name: 'storage.png', mimeType: 'image/png', buffer: png });
    await page.evaluate(() => {
        window.originalActivityStorePut = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (value, ...args) {
            if (value?.title === 'Storage capacity problem') throw new DOMException('Recovery storage is full. Free device space and try again.', 'QuotaExceededError');
            return window.originalActivityStorePut.call(this, value, ...args);
        };
    });
    const postsBeforeQuota = productPosts;
    await page.getByRole('button', { name: 'Save Product', exact: true }).click();
    await page.getByText(/Recovery storage is full|Free device space/i).first().waitFor();
    assert(page.url().endsWith('/products/add'));
    assert.equal(await page.locator('#title').inputValue(), 'Storage capacity problem');
    assert.equal(productPosts, postsBeforeQuota);
    await page.evaluate(() => { IDBObjectStore.prototype.put = window.originalActivityStorePut; });

    // Two open dashboards share one active record; only its owner emits a success toast.
    page.once('dialog', dialog => dialog.accept());
    await page.goto(`${origin}/dashboard/products`);
    const second = await context.newPage();
    second.setDefaultTimeout(12000);
    second.on('pageerror', error => errors.push(error.message));
    await second.goto(`${origin}/dashboard/products`);
    let secondDrawer = await openActivity(second);
    await secondDrawer.getByRole('tab', { name: /^Unfinished/ }).click();
    await card(secondDrawer, seeded.missing.title).waitFor();
    await closeActivity(page);
    await page.goto(`${origin}/dashboard/products/add`);
    await page.locator('#title').waitFor();
    await page.locator('#title').fill('Cross-tab single background product');
    await page.locator('#description').fill('One background submission observed from two current account dashboard tabs.');
    await page.locator('#buyingPrice').fill('20');
    await page.locator('#sellingPrice').fill('40');
    await page.locator('#status').selectOption('Draft');
    await page.locator('input[type=file]').first().setInputFiles({ name: 'cross-tab.png', mimeType: 'image/png', buffer: png });
    const successToasts = target => target.getByRole('status').filter({ hasText: 'Product added successfully' });
    await successToasts(page).waitFor({ state: 'hidden' });
    await successToasts(second).waitFor({ state: 'hidden' });
    holdUpload = true;
    await page.bringToFront();
    await page.getByRole('button', { name: 'Save Product', exact: true }).click();
    await page.waitForURL('**/dashboard/products');
    await waitFor(() => Boolean(releaseUpload));
    await card(secondDrawer, 'Cross-tab single background product').getByText('Saving', { exact: true }).waitFor();
    assert.equal(await card(secondDrawer, 'Cross-tab single background product').count(), 1);
    assert.equal(await card(secondDrawer, 'Cross-tab single background product').getByRole('button', { name: 'Discard recovery', exact: true }).count(), 0);
    const liveKey = (await ProductSubmission.findOne({ state: 'processing', key: { $nin: Object.values(ids) } })).key;
    releaseUpload();
    releaseUpload = undefined;
    await waitFor(async () => (await ProductSubmission.findOne({ key: liveKey }))?.state === 'completed');
    await secondDrawer.getByRole('tab', { name: /^Recently Saved/ }).click();
    await card(secondDrawer, 'Cross-tab single background product').getByRole('link', { name: /View Product/i }).waitFor();
    await successToasts(page).waitFor();
    assert.equal(await successToasts(page).count() + await successToasts(second).count(), 1);
    assert.equal(await Product.countDocuments({ title: 'Cross-tab single background product' }), 1);

    // Local discard propagates to the other open dashboard without a reload.
    await secondDrawer.getByRole('tab', { name: /^Unfinished/ }).click();
    drawer = await openActivity(page);
    await drawer.getByRole('tab', { name: /^Unfinished/ }).click();
    await card(drawer, seeded.aged.title).getByRole('button', { name: 'Discard recovery', exact: true }).click();
    await page.getByRole('dialog', { name: 'Discard recovery', exact: true }).getByRole('button', { name: 'Discard recovery', exact: true }).click();
    await card(secondDrawer, seeded.aged.title).waitFor({ state: 'hidden' });

    // Desktop focus trap and Escape return focus to the original trigger.
    await closeActivity(page);
    const trigger = page.getByRole('button', { name: 'Product Activity', exact: true });
    await trigger.focus();
    await page.keyboard.press('Enter');
    drawer = page.getByRole('dialog', { name: 'Product Activity', exact: true });
    await drawer.waitFor();
    assert(await drawer.evaluate(element => element.contains(document.activeElement)));
    for (let index = 0; index < 18; index++) {
        await page.keyboard.press('Tab');
        const focusState = await drawer.evaluate(element => ({ contained: element.contains(document.activeElement), tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label'), text: document.activeElement?.textContent?.slice(0, 100), open: element.open }));
        assert(focusState.contained, `Tab ${index + 1} left the activity drawer: ${JSON.stringify(focusState)}`);
    }
    await page.keyboard.press('Escape');
    await drawer.waitFor({ state: 'hidden' });
    assert(await trigger.evaluate(element => element === document.activeElement));
    await page.setViewportSize({ width: 390, height: 844 });
    await trigger.click();
    await drawer.waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert(await drawer.evaluate(element => { const box = element.getBoundingClientRect(); return box.width <= innerWidth && box.height <= innerHeight; }));
    await page.screenshot({ path: '/tmp/product-activity-mobile.png', fullPage: true });
    await closeActivity(page);

    // Expired credentials leave the original recovery intact and do not trigger a POST.
    await second.close();
    const postsBeforeExpiry = productPosts;
    const beforeExpiry = await readRecord(page, ids.unknown);
    await context.clearCookies();
    drawer = await openActivity(page);
    await drawer.getByRole('tab', { name: /^Unfinished/ }).click();
    const expiredCard = card(drawer, seeded.unknown.title);
    await expiredCard.getByRole('button', { name: 'Check Status', exact: true }).click();
    await expiredCard.getByRole('alert').filter({ hasText: /sign in|session|authoriz|401/i }).waitFor();
    assert.deepEqual((await readRecord(page, ids.unknown)).snapshot, beforeExpiry.snapshot);
    assert.equal(productPosts, postsBeforeExpiry);
    await context.addCookies(cookiesFor(tokenA));
    await page.reload();
    drawer = await openActivity(page);
    await drawer.getByRole('tab', { name: /^Unfinished/ }).click();
    await card(drawer, seeded.unknown.title).waitFor();
    await closeActivity(page);

    // A changed account can see only its own locally scoped record, never A's form or media.
    await context.addCookies(cookiesFor(tokenB));
    await page.goto(`${origin}/dashboard/products`);
    drawer = await openActivity(page);
    await drawer.getByRole('tab', { name: /^Unfinished/ }).click();
    await card(drawer, seeded.foreign.title).waitFor();
    assert.equal(await card(drawer, seeded.missing.title).count(), 0);
    await closeActivity(page);
    await page.goto(`${origin}/dashboard/products/add?recover=${ids.missing}`);
    await page.getByRole('alert').filter({ hasText: /unavailable for this account and shop|original account/i }).waitFor();
    assert.equal(await page.locator('#title').count(), 0);

    // Execute the actual IndexedDB transaction implementation against isolated test scopes.
    const storageContracts = await page.evaluate(async () => {
        const { productSubmissionStore: store } = await import('/src/services/productSubmissionStore.js');
        const isolatedScope = `browser-store-contract:${crypto.randomUUID()}`;
        const id = crypto.randomUUID();
        const original = await store.put({ id, scope: isolatedScope, title: 'CAS fixture', state: 'failed', editable: true, createdAt: Date.now(), snapshot: { formData: { title: 'CAS fixture' }, imageFiles: [new File(['retained'], 'fixture.png', { type: 'image/png' })] } }, { create: true });
        const claimed = await store.acquire(isolatedScope, id, 'owner-one');
        let staleRemoveRejected = false;
        try { await store.remove(isolatedScope, id, original.revision); }
        catch (error) { staleRemoveRejected = error.code === 'PRODUCT_STORAGE_CONFLICT'; }
        const saved = await store.put({ ...claimed, state: 'saved', productId: 'a'.repeat(24), snapshot: undefined, entries: undefined }, { confirmed: true });
        await store.put({ ...original, state: 'uploading', snapshot: original.snapshot });
        const afterStaleSavedWrite = await store.get(isolatedScope, id);
        const notificationClaims = await Promise.all([store.claimNotification(isolatedScope, id, 'success', 'confirmed'), store.claimNotification(isolatedScope, id, 'success', 'confirmed')]);
        const notificationRecord = await store.get(isolatedScope, id);
        await store.remove(isolatedScope, id, notificationRecord.revision);
        let resurrectionRejected = false;
        try { await store.put(original); }
        catch (error) { resurrectionRejected = error.code === 'PRODUCT_STORAGE_CONFLICT'; }
        const afterDeletion = await store.get(isolatedScope, id);
        const capScope = `browser-store-cap:${crypto.randomUUID()}`;
        for (let index = 0; index < 100; index++) await store.put({ id: crypto.randomUUID(), scope: capScope, title: `Unfinished ${index}`, state: 'failed', editable: true, createdAt: Date.now() }, { create: true });
        let capRejected = false;
        try { await store.put({ id: crypto.randomUUID(), scope: capScope, title: 'Over cap', state: 'failed', createdAt: Date.now() }, { create: true }); }
        catch (error) { capRejected = /100 unfinished/.test(error.message); }
        const capped = await store.list(capScope);
        for (const record of capped) await store.remove(capScope, record.id, record.revision);
        return { staleRemoveRejected, savedRevisionIncreased: saved.revision > original.revision, savedStayedSaved: afterStaleSavedWrite.state === 'saved', savedFilesReleased: afterStaleSavedWrite.snapshot === undefined && afterStaleSavedWrite.entries === undefined, notificationClaims: notificationClaims.filter(Boolean).length, resurrectionRejected, recordAbsentAfterDeletion: afterDeletion === undefined, capRejected, capCount: capped.length };
    });
    assert.deepEqual(storageContracts, { staleRemoveRejected: true, savedRevisionIncreased: true, savedStayedSaved: true, savedFilesReleased: true, notificationClaims: 1, resurrectionRejected: true, recordAbsentAfterDeletion: true, capRejected: true, capCount: 100 });
    assert.equal(productDeletes, 0);
    assert.deepEqual(errors, []);
});
