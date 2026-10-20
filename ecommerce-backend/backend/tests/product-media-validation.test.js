const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable, Writable } = require('node:stream');
const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');
const { upload, cloudinary } = require('../config/cloudinary');

test('F10 product storage accepts decoded JPG/PNG/WebP and complete MP4/MOV containers, rejects malformed content before provider upload', async t => {
    const original = cloudinary.uploader.upload_stream;
    let uploaded = 0;
    cloudinary.uploader.upload_stream = (_options, callback) => new Writable({
        write(_chunk, _encoding, done) { done(); },
        final(done) { callback(null, { public_id: `test/${++uploaded}`, secure_url: 'https://example.com/upload.webp' }); done(); }
    });
    t.after(() => { cloudinary.uploader.upload_stream = original; });
    const handle = (buffer, mimetype, truncated = false) => new Promise((resolve, reject) => {
        const stream = new Readable({ read() { this.push(buffer); if (truncated) this.emit('limit'); this.push(null); } });
        upload.storage._handleFile({}, { stream, mimetype }, (error, result) => error ? reject(error) : resolve(result));
    });
    const invalid = [
        ['image/png', Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(30)])],
        ['image/jpeg', Buffer.from([255, 216, 255, ...Array(20).fill(0)])],
        ['image/webp', Buffer.from('RIFF0000WEBPnot an image')],
        ['video/mp4', Buffer.from('0000ftypnot a movie')],
        ['video/quicktime', Buffer.from('0000mdatnot a movie')]
    ];
    for (const [type, bytes] of invalid) await assert.rejects(handle(bytes, type), /content|format|image|video/i);
    assert.equal(uploaded, 0);
    for (const [format, mime] of [['jpeg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp']]) {
        const bytes = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#9944ff' } }).toFormat(format).toBuffer();
        await handle(bytes, mime);
        await assert.rejects(handle(bytes.subarray(0, Math.floor(bytes.length / 2)), mime));
        await assert.rejects(handle(bytes, mime, true), { code: 'LIMIT_FILE_SIZE' });
        await assert.rejects(handle(bytes, 'image/gif'));
    }
    for (const [filename, mime] of [['sample.mp4', 'video/mp4'], ['sample.mov', 'video/quicktime']]) {
        const bytes = fs.readFileSync(path.join(__dirname, 'fixtures/product-media', filename));
        await handle(bytes, mime);
        await assert.rejects(handle(bytes.subarray(0, bytes.length - 8), mime));
    }
    assert.equal(uploaded, 5);
});
