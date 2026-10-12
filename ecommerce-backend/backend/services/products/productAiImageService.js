const sharp = require('sharp');
const { getAiConfig } = require('../../config/ai');
const { awaitWithAbort } = require('../ai/openaiProviderAdapter');

const MIME_FORMAT = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };
const TEXT_ONLY = Object.freeze({ part: null, usedImage: false, imageSource: 'text_only', mimeType: '', imageSizeBytes: 0 });
let activeDecodes = 0;

const isTrustedImageUrl = (value, config = getAiConfig()) => {
    try {
        const url = new URL(value);
        const path = decodeURIComponent(url.pathname);
        if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash
            || !config.imageHosts.includes(url.hostname.toLowerCase())) return false;
        // Verification assets share the CDN with public product photos, but are never AI inputs.
        if (/(?:vendor_verifications|verification|authenticated|private|(?:^|\/)nid(?:\/|$))/i.test(path)) return false;
        if (url.hostname === 'res.cloudinary.com' && !/^\/[^/]+\/image\/upload\//.test(path)) return false;
        return true;
    } catch { return false; }
};

const ownsPublicImage = async (shopId, url) => {
    if (!shopId) return false;
    const Product = require('../../models/Product');
    if (await Product.exists({ shop_id: shopId, isDeleted: false, images: url })) return true;
    const Asset = require('../../models/StoreBuilderAsset');
    return Boolean(await Asset.exists({ shop_id: shopId, url, resourceType: 'image',
        status: { $in: ['active', 'temporary'] }, target: { $in: ['product', 'product-image'] },
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }));
};

const readBoundedImage = async (response, { signal, maxBytes }) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Image body is unavailable.');
    const chunks = [];
    let total = 0;
    try {
        for (;;) {
            const { done, value } = await awaitWithAbort(reader.read(), signal);
            if (done) break;
            total += value.byteLength;
            if (total > maxBytes) throw new Error('Image exceeds limit.');
            chunks.push(Buffer.from(value));
        }
        return Buffer.concat(chunks, total);
    } finally {
        // Do not wait on a broken remote stream to acknowledge cancellation.
        reader.cancel().catch(() => {});
        reader.releaseLock();
    }
};

const matchesSignature = (buffer, mime) => {
    if (mime === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (mime === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
    return mime === 'image/webp' && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
};

const decodePublicImage = async (buffer, mime, { signal, config }) => {
    if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > config.imageBytes
        || !matchesSignature(buffer, mime) || activeDecodes >= config.imageDecodeConcurrency) return null;
    activeDecodes += 1;
    const decode = async () => {
        const options = { failOn: 'warning', limitInputPixels: config.imagePixels, limitInputChannels: 4 };
        const metadata = await sharp(buffer, options).timeout({ seconds: 3 }).metadata();
        if (metadata.format !== MIME_FORMAT[mime] || (metadata.pages || 1) !== 1
            || !metadata.width || !metadata.height || metadata.width > 8192 || metadata.height > 8192
            || metadata.width * metadata.height > config.imagePixels) return null;
        // Full decode rejects truncated files; re-encoding strips EXIF and other metadata.
        const clean = await sharp(buffer, options).timeout({ seconds: 3 }).rotate()
            .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
            .flatten({ background: '#ffffff' }).jpeg({ quality: 85 }).toBuffer();
        return clean.length <= config.imageBytes ? clean : null;
    };
    // Hold capacity until native work actually stops, even if the request disconnects.
    return awaitWithAbort(decode().finally(() => { activeDecodes -= 1; }), signal);
};

const buildImagePart = async ({ file, imageUrl, shopId, signal, config = getAiConfig(),
    fetchImpl = fetch, ownsImage = ownsPublicImage } = {}) => {
    if (signal?.aborted) return { ...TEXT_ONLY };
    const controller = new AbortController();
    const abort = () => controller.abort(new Error('Image operation cancelled.'));
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 5000);
    try {
        let buffer, mime, imageSource;
        if (file) {
            buffer = file.buffer;
            mime = file.mimetype;
            imageSource = 'local_file';
        } else {
            if (!isTrustedImageUrl(imageUrl, config) || !await awaitWithAbort(ownsImage(shopId, imageUrl), controller.signal)) return { ...TEXT_ONLY };
            if (controller.signal.aborted) return { ...TEXT_ONLY };
            const response = await awaitWithAbort(fetchImpl(imageUrl, { signal: controller.signal, redirect: 'error' }), controller.signal);
            mime = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
            if (!response.ok || response.redirected || !MIME_FORMAT[mime]
                || Number(response.headers.get('content-length')) > config.imageBytes) {
                response.body?.cancel().catch(() => {});
                return { ...TEXT_ONLY };
            }
            buffer = await readBoundedImage(response, { signal: controller.signal, maxBytes: config.imageBytes });
            imageSource = 'existing_product_image';
        }
        const clean = await decodePublicImage(buffer, mime, { signal: controller.signal, config });
        if (!clean || controller.signal.aborted) return { ...TEXT_ONLY };
        return { part: { data: clean.toString('base64'), mimeType: 'image/jpeg' }, usedImage: true,
            imageSource, mimeType: 'image/jpeg', imageSizeBytes: clean.length };
    } catch { return { ...TEXT_ONLY }; }
    finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
};

module.exports = { buildImagePart, isTrustedImageUrl, ownsPublicImage, readBoundedImage };
