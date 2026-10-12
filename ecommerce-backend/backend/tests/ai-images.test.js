const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { buildImagePart, isTrustedImageUrl } = require('../services/products/productAiImageService');
const { readAiConfig } = require('../config/ai');
const config = readAiConfig({});
const url = 'https://res.cloudinary.com/store/image/upload/public/product.png';
const fixture = (format = 'png', width = 8, height = 8) => sharp({ create: { width, height, channels: 3, background: '#123456' } }).toFormat(format).toBuffer();

test('public image decoder validates JPEG, PNG and WebP, strips metadata, rejects spoofed/truncated/oversize images', async () => {
    for (const format of ['png', 'jpeg', 'webp']) {
        const buffer = await fixture(format);
        const result = await buildImagePart({ file: { buffer, mimetype: `image/${format}` } });
        assert.equal(result.usedImage, true);
        const metadata = await sharp(Buffer.from(result.part.data, 'base64')).metadata();
        assert.equal(metadata.format, 'jpeg');
        assert.equal(metadata.exif, undefined);
    }
    for (const file of [
        { buffer: Buffer.from('fake'), mimetype: 'image/png' },
        { buffer: await fixture('png'), mimetype: 'image/jpeg' },
        { buffer: (await fixture('jpeg')).subarray(0, 30), mimetype: 'image/jpeg' },
        { buffer: Buffer.alloc(config.imageBytes + 1), mimetype: 'image/png' },
        { buffer: await fixture('png', 5000, 5000), mimetype: 'image/png' }
    ]) assert.equal((await buildImagePart({ file })).usedImage, false);
});

test('remote images require exact public URL and tenant ownership before fetch', async () => {
    let calls = 0;
    const fetchImpl = async () => { calls++; return new Response(await fixture(), { headers: { 'content-type': 'image/png' } }); };
    for (const imageUrl of [url, 'https://res.cloudinary.com/store/image/upload/vendor_verifications/nid/a.png',
        'https://res.cloudinary.com/store/image/authenticated/a.png', 'https://other.cloudinary.com/a.png',
        `${url}?token=secret`, 'https://user:pass@res.cloudinary.com/a.png', 'http://127.0.0.1/a.png']) {
        const result = await buildImagePart({ shopId: 'tenant-b', imageUrl, ownsImage: async () => false, fetchImpl });
        assert.equal(result.usedImage, false);
    }
    assert.equal(calls, 0);
    const result = await buildImagePart({ shopId: 'tenant-a', imageUrl: url,
        ownsImage: async (shopId, imageUrl) => shopId === 'tenant-a' && imageUrl === url, fetchImpl });
    assert.equal(result.usedImage, true);
    assert.equal(calls, 1);
    assert.equal(isTrustedImageUrl(url), true);
    assert.throws(() => readAiConfig({ TRUSTED_PRODUCT_IMAGE_HOSTS: '*.cloudinary.com' }));
});

test('streaming limits ignore dishonest Content-Length and cancel oversize response', async () => {
    let chunks = 0, cancelled = false;
    const response = new Response(new ReadableStream({
        pull(controller) { chunks++; controller.enqueue(new Uint8Array(1024 * 1024)); },
        cancel() { cancelled = true; }
    }), { headers: { 'content-type': 'image/png', 'content-length': '1' } });
    const result = await buildImagePart({ shopId: 'a', imageUrl: url, ownsImage: async () => true, fetchImpl: async () => response });
    assert.equal(result.usedImage, false);
    assert.ok(chunks <= 7);
    assert.equal(cancelled, true);
});

test('cancellation and redirects never deliver an image to the provider', async () => {
    const controller = new AbortController();
    const pending = buildImagePart({ shopId: 'a', imageUrl: url, signal: controller.signal, ownsImage: async () => true,
        fetchImpl: async (_url, options) => { assert.equal(options.redirect, 'error'); return new Promise(() => {}); } });
    controller.abort();
    assert.equal((await pending).usedImage, false);
    assert.equal((await buildImagePart({ shopId: 'a', imageUrl: url, ownsImage: async () => true,
        fetchImpl: async () => ({ ok: true, redirected: true, headers: new Headers({ 'content-type': 'image/png' }) }) })).usedImage, false);
});
