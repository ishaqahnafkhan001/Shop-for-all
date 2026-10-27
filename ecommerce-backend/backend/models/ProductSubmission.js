const mongoose = require('mongoose');

// Kept after product deletion too: a late retry must never recreate a deleted product.
const schema = new mongoose.Schema({
    shop_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Shop' },
    actor: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    key: { type: String, required: true },
    fingerprint: { type: String, required: true },
    owner: { type: String, required: true },
    state: { type: String, enum: ['processing', 'failed', 'completed'], default: 'processing' },
    leaseUntil: { type: Date, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    error: { type: String, maxlength: 500 },
    httpStatus: Number,
    assets: [{
        publicId: String,
        resourceType: String,
        owner: String,
        keep: { type: Boolean, default: false },
        cleanupAfter: Date
    }]
}, { timestamps: true });
schema.index({ shop_id: 1, actor: 1, key: 1 }, { unique: true });
schema.index({ 'assets.cleanupAfter': 1 });
module.exports = mongoose.model('ProductSubmission', schema);
