/* Run with a disposable MONGO_URI_TEST and PLAYWRIGHT_MODULE when Playwright is bundled externally. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { Writable } = require('node:stream');
const path = require('node:path');
const { createLaunchSafetyContext, Product } = require('../../ecommerce-backend/backend/tests/helpers/launchSafetyHarness');

test('smart publishing navigates before completion, refreshes filters, restores IndexedDB media, handles concurrent saves and lost responses', { timeout: 120000 }, async t => {
    process.env.CORS_ORIGINS = 'http://localhost:5181';
    process.env.ADMIN_APP_URL = 'http://localhost:5181';
    const cleanups = [];
    const ctx = await createLaunchSafetyContext({ after: callback => cleanups.push(callback) });
    const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
    const cloudinary = require('../../ecommerce-backend/backend/node_modules/cloudinary').v2;
    const originalUpload = cloudinary.uploader.upload_stream;
    const originalDestroy = cloudinary.uploader.destroy;
    cloudinary.uploader.destroy = async () => ({ result: "ok" });
    let uploadCount = 0;
    cloudinary.uploader.upload_stream = (options, callback) => new Writable({
        write(_chunk, _encoding, done) { done(); },
        final(done) { const n = ++uploadCount; const video = !options.format; callback(null, { public_id: `test/product-${n}`, secure_url: `https://example.com/upload-${n}.${video ? 'mp4' : 'webp'}`, resource_type: video ? 'video' : 'image', bytes: 100 }); done(); }
    });
    const vite = spawn(process.execPath, [path.resolve(__dirname, '../node_modules/vite/bin/vite.js'), '--host', 'localhost', '--port', '5181', '--strictPort'], {
        cwd: path.resolve(__dirname, '..'), env: { ...process.env, VITE_API_URL: `${ctx.baseUrl.replace('127.0.0.1', 'localhost')}/api` }, stdio: ['ignore', 'pipe', 'pipe']
    });
    let viteLog = '';
    vite.stdout.on('data', chunk => { viteLog += chunk; });
    vite.stderr.on('data', chunk => { viteLog += chunk; });
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    t.after(async () => {
        await browser.close();
        vite.kill('SIGTERM');
        cloudinary.uploader.upload_stream = originalUpload;
        cloudinary.uploader.destroy = originalDestroy;
        for (const cleanup of cleanups.reverse()) await cleanup();
    });
    for (let i = 0; i < 100; i++) {
        if (vite.exitCode !== null) throw new Error(viteLog);
        try { if ((await fetch('http://localhost:5181')).ok) break; } catch { /* wait for Vite */ }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    const context = await browser.newContext({ timezoneId: 'Asia/Dhaka', viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(() => {
        const create = URL.createObjectURL.bind(URL);
        const revoke = URL.revokeObjectURL.bind(URL);
        window.previewUrls = { created: [], revoked: [], revokedWhileDisplayed: [] };
        URL.createObjectURL = file => { const url = create(file); window.previewUrls.created.push(url); return url; };
        URL.revokeObjectURL = url => {
            if ([...document.images].some(img => img.getAttribute('src') === url)) window.previewUrls.revokedWhileDisplayed.push(url);
            window.previewUrls.revoked.push(url); revoke(url);
        };
    });
    const token = ctx.vendorAClient().jar.token;
    await context.addCookies([{ name: 'token', value: token, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax' }]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const png = await require('../../ecommerce-backend/backend/node_modules/sharp')({ create: { width: 16, height: 16, channels: 3, background: '#9944ff' } }).png().toBuffer();
    await page.route('https://example.com/**', route => route.fulfill({ contentType: 'image/png', body: png }));
    await page.route('https://res.cloudinary.com/**', route => route.fulfill({ contentType: 'image/png', body: png }));
    const origin = 'http://localhost:5181';
    // Cookies for the API are sent by same-site requests through localhost too.
    await context.addCookies([{ name: 'token', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }]);

    const InventoryLog = require('../../ecommerce-backend/backend/models/InventoryLog');
    const ProductSubmission = require('../../ecommerce-backend/backend/models/ProductSubmission');
    const waitFor = async predicate => { for (let i = 0; i < 150; i++) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 25)); } assert.fail('Timed out waiting for product state'); };
    const fill = async title => {
        await page.locator('#title').waitFor();
        await page.locator('#title').fill(title);
        await page.locator('#description').fill('Complete recoverable product description for this browser workflow.');
        await page.locator('#buyingPrice').fill('50');
        await page.locator('#sellingPrice').fill('100');
        await page.locator('#status').selectOption('Draft');
        await page.locator('input[type=file]').first().setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: png });
    };
    const readRecords = () => page.evaluate(async () => {
        const db = await new Promise((resolve, reject) => { const req = indexedDB.open('shop-product-submissions'); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
        const all = await new Promise(resolve => { const req = db.transaction('submissions').objectStore('submissions').getAll(); req.onsuccess = () => resolve(req.result); });
        db.close();
        return Promise.all(all.map(async record => ({ ...record, snapshot: record.snapshot ? { ...record.snapshot, imageFiles: await Promise.all(record.snapshot.imageFiles.map(async file => ({ name: file.name, size: file.size, type: file.type, bytes: [...new Uint8Array(await file.arrayBuffer())] }))), videoFiles: await Promise.all(record.snapshot.videoFiles.map(async file => ({ name: file.name, size: file.size, type: file.type, bytes: [...new Uint8Array(await file.arrayBuffer())] }))) } : null, entries: undefined })));
    });
    const activity = () => page.getByRole('dialog', { name: 'Product Activity', exact: true });
    const expandActivity = async () => {
        if (!(await activity().isVisible())) await page.getByRole('button', { name: 'Product Activity', exact: true }).click();
        await activity().getByRole('tab', { name: /^Unfinished/ }).click();
    };
    // Enough matching products to verify that a success refresh preserves page two.
    await Product.create(Array.from({ length: 12 }, (_, i) => ({
        shop_id: ctx.data.shops.shopA._id, title: `Background filler ${i}`, slug: `background-filler-${i}`,
        description: 'Catalog pagination fixture description.', status: 'Draft', publicationStatus: 'draft', isActive: false,
        images: ['https://example.com/filler.png'], pricing: { buyingPrice: 1, sellingPrice: 2 },
        variants: [{ attributes: [], stock: 0, inventory: { stock: 0 } }]
    })));
    const errorsBefore = errors.length;

    // Native validation and domain validation both keep the form in place.
    await page.goto(`${origin}/dashboard/products/add`);
    await page.locator('#title').waitFor();
    await page.getByRole('button', { name: 'Save Product', exact: true }).click();
    assert(page.url().endsWith('/products/add'));
    assert.equal((await readRecords()).length, 0);
    await fill('Background product one');
    await page.locator('#defaultStock').fill('-1');
    await page.getByRole('button', { name: 'Save Product', exact: true }).click();
    assert(page.url().endsWith('/products/add'));
    assert.equal((await readRecords()).length, 0);
    await page.locator('#defaultStock').fill('3');

    // Hold the response: navigation must finish while the server request is outstanding.
    let releaseFirst;
    let firstPosts = 0;
    let catalogQueries = [];
    await page.route('**/api/admin/products?*', async route => { catalogQueries.push(route.request().url()); await route.continue(); });
    await page.route('**/api/admin/products', async route => {
        if (route.request().method() !== 'POST') return route.continue();
        firstPosts++;
        await new Promise(resolve => { releaseFirst = resolve; });
        return route.abort('failed');
    });
    await page.getByRole('button', { name: 'Save Product', exact: true }).evaluate(button => { button.click(); button.click(); });
    await page.waitForURL('**/dashboard/products');
    await waitFor(() => Boolean(releaseFirst));
    assert.equal(firstPosts, 1);
    assert.equal(await Product.countDocuments({ title: 'Background product one' }), 0);
    assert.equal((await readRecords()).filter(record => record.title === 'Background product one').length, 1);
    await expandActivity();
    await activity().getByRole('article', { name: 'Background product one', exact: true }).getByText('Saving', { exact: true }).waitFor();
    await activity().getByRole('button', { name: 'View progress', exact: true }).click();
    await activity().getByText('Keep the dashboard open while saving. The result appears after the server confirms it.').waitFor();
    await activity().getByRole('button', { name: 'Close product activity', exact: true }).click();
    await page.goto(`${origin}/dashboard/products?search=Background&status=Draft&sort=nameAsc`);
    // A full navigation interrupts the browser transport; the server still has no claim.
    releaseFirst();
    await page.unroute('**/api/admin/products');
    // Simulate the abandoned browser claim aging out; the backend was never reached.
    await page.evaluate(async () => {
        const db = await new Promise(resolve => { const request = indexedDB.open('shop-product-submissions'); request.onsuccess = () => resolve(request.result); });
        await new Promise((resolve, reject) => {
            const tx = db.transaction('submissions', 'readwrite');
            const store = tx.objectStore('submissions');
            const request = store.getAll();
            request.onsuccess = () => {
                const record = request.result.find(item => item.title === 'Background product one');
                if (record.browserLock) record.browserLock.until = Date.now() - 1;
                store.put(record);
            };
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    });
    await page.reload();
    assert.equal(await Product.countDocuments({ title: 'Background product one' }), 0);
    await expandActivity();
    await activity().getByRole('button', { name: 'Check Status', exact: true }).click();
    await activity().getByRole('link', { name: 'Review original', exact: true }).click();
    await page.getByRole('button', { name: 'Retry original submission', exact: true }).click();
    await page.getByRole('link', { name: 'View Product', exact: true }).last().waitFor();
    await waitFor(async () => await Product.countDocuments({ title: 'Background product one' }) === 1);
    await page.goto(`${origin}/dashboard/products?search=Background&status=Draft&sort=nameAsc`);

    // Save & Add Another permits a second independent submission while the first is held.
    await page.goto(`${origin}/dashboard/products/add`);
    await fill('Background product two');
    let releaseSecond;
    let secondKey;
    await page.route('**/api/admin/products', async route => {
        if (route.request().method() !== 'POST') return route.continue();
        secondKey = route.request().headers()['x-product-submission'];
        await new Promise(resolve => { releaseSecond = resolve; });
        return route.continue();
    });
    await page.getByRole('button', { name: 'Save & Add Another', exact: true }).click();
    await page.waitForURL('**/products/add?fresh=*');
    await page.waitForFunction(() => document.querySelector('#title')?.value === '');
    assert.equal(await page.locator('#title').inputValue(), '');
    assert.equal(await page.getByRole('button', { name: /^Remove product image/ }).count(), 0);
    await waitFor(() => Boolean(releaseSecond));
    await page.unroute('**/api/admin/products');
    await fill('Background product three');
    await page.getByRole('button', { name: 'Save Product', exact: true }).click();
    await page.waitForURL('**/dashboard/products');
    await waitFor(async () => await Product.countDocuments({ title: 'Background product three' }) === 1);
    // Client-side router navigation retains the manager and current catalog parameters.
    await page.evaluate(() => { history.pushState(null, '', '/dashboard/products?search=Background&status=Draft&sort=nameAsc'); window.dispatchEvent(new PopStateEvent('popstate')); });
    await page.getByPlaceholder('Search by product name…').fill('Background');
    await waitFor(() => catalogQueries.some(url => url.includes('search=Background') && url.includes('status=Draft') && url.includes('sort=nameAsc')));
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await waitFor(() => catalogQueries.some(url => url.includes('page=2') && url.includes('search=Background') && url.includes('status=Draft') && url.includes('sort=nameAsc')));
    const queriesBeforeSuccess = catalogQueries.length;
    releaseSecond();
    await waitFor(async () => (await ProductSubmission.findOne({ key: secondKey }))?.state === 'completed');
    await waitFor(() => catalogQueries.length > queriesBeforeSuccess);
    assert(page.url().includes('status=Draft'));
    assert(page.url().includes('sort=nameAsc'));
    assert(catalogQueries.slice(queriesBeforeSuccess).some(url => url.includes('page=2') && url.includes('search=Background') && url.includes('status=Draft') && url.includes('sort=nameAsc')));

    // Multiple failed products retain independent snapshots, real File blobs and complete variants.
    await page.goto(`${origin}/dashboard/products/add`);
    await fill('Recover full matrix');
    await page.locator('#lowStockThreshold').fill('0');
    await page.getByPlaceholder('e.g. color').fill('color');
    await page.getByPlaceholder('Type option, press Enter').fill('Red');
    await page.getByPlaceholder('Type option, press Enter').press('Enter');
    await page.getByPlaceholder('Add more…').fill('Blue');
    await page.getByPlaceholder('Add more…').press('Enter');
    await page.locator('#defaultStock').fill('4');
    await page.locator('tbody tr').first().getByPlaceholder('SKU').fill('RECOVER-RED');
    await page.locator('tbody tr').first().locator('input[type=number]').first().fill('120');
    for (const [heading, title, value] of [['6. Specifications', 'Fabric', 'Cotton'], ['7. Extra notes', 'Care', 'Hand wash']]) {
        const section = page.locator('section').filter({ has: page.getByRole('heading', { name: heading, exact: true }) });
        await section.getByRole('button', { name: 'Add', exact: true }).click();
        await section.getByPlaceholder('Title (e.g. Material)').fill(title);
        await section.getByPlaceholder('Value (e.g. Cotton)').fill(value);
    }
    const invalidVideo = Buffer.from('This is not a valid video, deliberately preserved for recovery');
    await page.locator('input[type=file]').nth(1).setInputFiles({ name: 'invalid.mp4', mimeType: 'video/mp4', buffer: invalidVideo });
    await page.getByRole('button', { name: 'Save Product', exact: true }).click();
    await page.waitForURL('**/dashboard/products');
    await waitFor(async () => (await readRecords()).some(record => record.title === 'Recover full matrix' && record.state === 'failed'));
    const beforeReload = (await readRecords()).find(record => record.title === 'Recover full matrix');
    assert.equal(beforeReload.snapshot.imageFiles[0].name, 'cover.png');
    assert.equal(beforeReload.snapshot.videoFiles[0].name, 'invalid.mp4');
    assert.equal(beforeReload.snapshot.attributes[0].options.length, 2);
    assert.equal(beforeReload.snapshot.variantDetails['["Red"]'].sku, 'RECOVER-RED');
    assert.equal(beforeReload.snapshot.formData.specifications[0].value, 'Cotton');
    assert.equal(beforeReload.snapshot.formData.comments[0].value, 'Hand wash');
    await page.goto(`${origin}/dashboard/products/add`);
    await fill('Independent rejected product');
    await page.locator('input[type=file]').nth(1).setInputFiles({ name: 'other-invalid.mp4', mimeType: 'video/mp4', buffer: invalidVideo });
    await page.getByRole('button', { name: 'Save Product', exact: true }).click();
    await page.waitForURL('**/dashboard/products');
    await waitFor(async () => (await readRecords()).filter(record => record.state === 'failed').length === 2);
    await page.reload();
    await page.getByRole('button', { name: 'Product Activity', exact: true }).waitFor();
    assert.deepEqual((await readRecords()).find(record => record.id === beforeReload.id).snapshot, beforeReload.snapshot);
    await expandActivity();
    await activity().locator('article').filter({ hasText: 'Recover full matrix' }).getByRole('link', { name: 'Review & Retry' }).click();
    await page.locator('#title').waitFor();
    assert.equal(await page.locator('#title').inputValue(), 'Recover full matrix');
    assert.equal(await page.locator('#lowStockThreshold').inputValue(), '0');
    assert.equal(await page.locator('tbody tr').count(), 2);
    assert.equal(await page.getByRole('button', { name: 'Remove product video 1' }).count(), 1);
    await page.getByRole('button', { name: 'Remove product video 1' }).click();
    await page.getByRole('button', { name: 'Save Product', exact: true }).click();
    await page.waitForURL('**/dashboard/products');
    await waitFor(async () => await Product.countDocuments({ title: 'Recover full matrix' }) === 1);
    const matrix = await Product.findOne({ title: 'Recover full matrix' });
    assert.equal(matrix.variants.length, 2);
    assert.equal(matrix.variants[0].sku, 'RECOVER-RED');
    assert.equal(matrix.variants[0].pricing.price, 120);
    assert.equal(matrix.specifications[0].value, 'Cotton');
    assert.equal(matrix.comments[0].value, 'Hand wash');
    assert.equal(await InventoryLog.countDocuments({ productId: matrix._id }), 2);

    // A backend success followed by a dropped browser response reconciles instead of posting again.
    await page.goto(`${origin}/dashboard/products/add`);
    await fill('Lost response publishing');
    let lostPosts = 0;
    await page.route('**/api/admin/products', async route => {
        if (route.request().method() !== 'POST') return route.continue();
        lostPosts++;
        await route.fetch();
        await route.abort('failed');
    });
    await page.getByRole('button', { name: 'Save Product', exact: true }).click();
    await page.waitForURL('**/dashboard/products');
    await waitFor(async () => (await readRecords()).some(record => record.title === 'Lost response publishing' && record.state === 'saved'));
    assert.equal(lostPosts, 1);
    assert.equal(await Product.countDocuments({ title: 'Lost response publishing' }), 1);
    await page.unroute('**/api/admin/products');
    // Switching accounts cannot expose another user's activity or restore its blobs.
    const vendorBToken = ctx.vendorBClient().jar.token;
    await context.addCookies([{ name: 'token', value: vendorBToken, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }]);
    await page.goto(`${origin}/dashboard/products/add?recover=${beforeReload.id}`);
    await page.getByRole('alert').filter({ hasText: 'unavailable for this account and shop' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Product Activity', exact: true }).count(), 0);
    assert.equal(await page.locator('#title').count(), 0);
    await context.addCookies([{ name: 'token', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }]);
    await page.goto(`${origin}/dashboard/products`);
    await page.getByRole('button', { name: 'Product Activity', exact: true }).waitFor();
    await expandActivity();
    assert.equal(await activity().locator('article').filter({ hasText: 'Independent rejected product' }).getByRole('link', { name: 'Review & Retry' }).count(), 1);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.keyboard.press('Escape');
    await activity().waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('button', { name: 'Product Activity', exact: true }).evaluate(element => element === document.activeElement), true);
    await page.keyboard.press('Enter');
    await activity().waitFor({ state: 'visible' });
    assert.equal(await activity().getByRole('button', { name: 'Close product activity', exact: true }).evaluate(element => element === document.activeElement), true);
    await activity().locator('article').first().waitFor({ state: 'visible' });
    await page.waitForTimeout(350); // Let the existing sidebar's viewport transition finish.
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: '/tmp/product-publishing-mobile.png', fullPage: true });
    assert.deepEqual(errors.slice(errorsBefore), []);
});
