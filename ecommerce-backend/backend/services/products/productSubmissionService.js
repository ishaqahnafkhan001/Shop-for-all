const { randomUUID } = require('node:crypto');
const ProductSubmission = require('../../models/ProductSubmission');
const Product = require('../../models/Product');
const indexClients = new WeakMap();
const ensureSubmissionIndex = async () => {
    const client = ProductSubmission.db.getClient();
    if (!indexClients.has(client)) indexClients.set(client, ProductSubmission.collection.createIndex({ shop_id: 1, actor: 1, key: 1 }, { unique: true }).catch(error => { indexClients.delete(client); throw error; }));
    await indexClients.get(client);
};

const validKey = value => typeof value === 'string' && /^[a-zA-Z0-9-]{16,80}$/.test(value);
const scope = (req, key) => ({ shop_id: req.tenantId, actor: req.user._id, key });
const receiptView = receipt => ({
    state: receipt.state,
    productId: receipt.productId,
    error: receipt.error,
    httpStatus: receipt.httpStatus,
    retryAfter: receipt.state === 'processing' ? Math.max(0, Math.ceil((receipt.leaseUntil - Date.now()) / 1000)) : 0
});
const checkScope = (req, res) => {
    if (req.get('X-Product-Shop') !== String(req.tenantId) || req.get('X-Product-Actor') !== String(req.user._id)) {
        res.status(403).json({ success: false, code: 'PRODUCT_SCOPE_CHANGED', error: 'Your account or shop changed. Sign in to the original shop to recover this product.' });
        return false;
    }
    return true;
};

exports.getProductSubmission = async (req, res, next) => {
    if (!checkScope(req, res)) return;
    if (!validKey(req.params.key)) return res.status(400).json({ error: 'Invalid submission identifier.' });
    try {
        const receipt = await ProductSubmission.findOne(scope(req, req.params.key)).lean();
        return res.json({ success: true, data: receipt ? receiptView(receipt) : { state: 'not_found' } });
    } catch (error) { next(error); }
};

exports.claimProductSubmission = async (req, res, next) => {
    const key = req.get('X-Product-Submission');
    if (!key) return next(); // Existing API clients retain their contract.
    if (!checkScope(req, res)) return;
    const fingerprint = req.get('X-Product-Fingerprint');
    if (!validKey(key) || !/^[a-f0-9]{64}$/.test(fingerprint || '')) {
        return res.status(400).json({ error: 'Invalid submission identifier or fingerprint.' });
    }
    try {
        // Admission must not race ahead of the unique index on a fresh database.
        await ensureSubmissionIndex();
        const query = scope(req, key);
        let receipt = await ProductSubmission.findOne(query);
        const owner = randomUUID();
        const leaseUntil = new Date(Date.now() + 5 * 60 * 1000);
        if (!receipt) {
            try { receipt = await ProductSubmission.create({ ...query, fingerprint, owner, leaseUntil }); }
            catch (error) {
                if (error.code !== 11000) throw error;
                receipt = await ProductSubmission.findOne(query);
            }
        }
        if (receipt.state !== 'failed' && receipt.fingerprint !== fingerprint) return res.status(409).json({ code: 'SUBMISSION_CONTENT_CHANGED', error: 'This submission already contains different data. Review its status before changing it.' });
        if (receipt.state === 'completed') {
            const product = await Product.findOne({ _id: receipt.productId, shop_id: req.tenantId });
            // Receipt remains authoritative even if the product was subsequently deleted.
            return res.status(200).json({ success: true, replayed: true, data: product || { _id: receipt.productId, deleted: true } });
        }
        if (receipt.owner !== owner) {
            receipt = await ProductSubmission.findOneAndUpdate({ ...query, $or: [{ state: 'failed' }, { state: 'processing', fingerprint, leaseUntil: { $lte: new Date() } }] }, { $set: { owner, leaseUntil, fingerprint, state: 'processing' }, $unset: { error: 1, httpStatus: 1 } }, { new: true });
            if (!receipt) return res.status(409).json({ code: 'SUBMISSION_PROCESSING', error: 'Product is still being saved. Check its status shortly.' });
        }
        req.productSubmission = { _id: receipt._id, owner };
        const sendJson = res.json;
        res.json = function (body) {
            if (res.statusCode >= 400 && typeof body?.error === 'string') req.productSubmissionError = body.error.slice(0, 500);
            return sendJson.call(this, body);
        };
        // Only definitive responses fail a receipt. Disconnects retain uncertainty.
        res.once('finish', () => {
            if (res.statusCode < 400 || req.productCommitted || req.productCommitUncertain) return;
            ProductSubmission.updateOne({ ...req.productSubmission, state: 'processing' }, { $set: { state: 'failed', httpStatus: res.statusCode, error: req.productSubmissionError || 'The save was rejected. Review the product and try again.' } }).catch(() => {});
        });
        return next();
    } catch (error) { next(error); }
};

exports.completeProductSubmission = async (req, productId, session) => {
    if (!req.productSubmission) return;
    const result = await ProductSubmission.updateOne({ ...req.productSubmission, state: 'processing' }, { $set: { state: 'completed', productId, 'assets.$[asset].keep': true }, $unset: { error: 1 } }, { session, arrayFilters: [{ 'asset.owner': req.productSubmission.owner }] });
    if (result.matchedCount !== 1) throw Object.assign(new Error('Submission ownership changed. Check its status before retrying.'), { statusCode: 409 });
};

// Write the provider target before uploading, so a server crash leaves a cleanup intent.
exports.prepareSubmissionUpload = async (req, resourceType) => {
    if (!req.productSubmission) return null;
    const folder = `shop_products/submissions/${req.productSubmission._id}/${req.productSubmission.owner}`;
    const publicId = randomUUID();
    const asset = { publicId: `${folder}/${publicId}`, resourceType, owner: req.productSubmission.owner, keep: false, cleanupAfter: new Date(Date.now() + 60 * 60 * 1000) };
    const result = await ProductSubmission.updateOne({ ...req.productSubmission, state: 'processing' }, { $push: { assets: asset } });
    if (result.matchedCount !== 1) throw new Error('Submission ownership changed before upload.');
    return { folder, public_id: publicId, overwrite: false, resource_type: resourceType, timeout: 120000 };
};

exports.confirmSubmissionUpload = async (req, options, result) => {
    if (!req.productSubmission || !options) return;
    const match = { ...req.productSubmission, state: 'processing' };
    const updated = await ProductSubmission.updateOne(match, { $set: { 'assets.$[asset].publicId': result.public_id || `${options.folder}/${options.public_id}` } }, { arrayFilters: [{ 'asset.publicId': `${options.folder}/${options.public_id}`, 'asset.owner': req.productSubmission.owner }] });
    if (updated.matchedCount !== 1) {
        await require('cloudinary').v2.uploader.destroy(result.public_id, { resource_type: options.resource_type }).catch(() => {});
        throw new Error('Submission ownership changed during upload.');
    }
};

exports.cleanupProductSubmissionAssets = async ({ limit = 50, now = new Date() } = {}) => {
    const receipts = await ProductSubmission.find({ assets: { $elemMatch: { keep: false, cleanupAfter: { $lte: now } } } }).limit(limit);
    let cleaned = 0;
    for (let receipt of receipts) {
        if (receipt.state === 'processing' && receipt.leaseUntil <= now) {
            receipt = await ProductSubmission.findOneAndUpdate({ _id: receipt._id, owner: receipt.owner, state: 'processing', leaseUntil: { $lte: now } }, { $set: { owner: randomUUID(), state: 'failed', error: 'The interrupted save did not commit. Review and retry.', httpStatus: 503 } }, { returnDocument: 'after' });
            if (!receipt) continue; // A concurrent commit may have retained these assets.
        }
        for (const asset of receipt.assets) {
            if (asset.keep || asset.cleanupAfter > now || (receipt.state === 'processing' && asset.owner === receipt.owner)) continue;
            try {
                const result = await require('cloudinary').v2.uploader.destroy(asset.publicId, { resource_type: asset.resourceType });
                if (!['ok', 'not found'].includes(result?.result)) continue;
                await ProductSubmission.updateOne({ _id: receipt._id }, { $pull: { assets: { _id: asset._id, keep: false } } });
                cleaned++;
            } catch (_) { /* Keep the intent for the existing worker's next sweep. */ }
        }
    }
    return { scanned: receipts.length, cleaned };
};
