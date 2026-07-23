const mongoose = require('mongoose');

const storeBuilderAssetSchema = new mongoose.Schema({
    shop_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    draftId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreBuilderDraft', default: null },
    target: { type: String, trim: true, maxlength: 80, default: 'theme' },
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
    resourceType: { type: String, enum: ['image', 'video', 'raw'], default: 'image' },
    format: { type: String, trim: true, default: '' },
    mimeType: { type: String, trim: true, default: '' },
    originalName: { type: String, trim: true, maxlength: 255, default: '' },
    size: { type: Number, min: 0, default: 0 },
    width: { type: Number, min: 0, default: 0 },
    height: { type: Number, min: 0, default: 0 },
    status: {
        type: String,
        enum: ['temporary', 'active', 'retired', 'deleted', 'failed'],
        default: 'temporary',
        index: true
    },
    expiresAt: { type: Date, default: null, index: true },
    promotedAt: { type: Date, default: null },
    retiredAt: { type: Date, default: null },
    cleanupAfter: { type: Date, default: null, index: true }
}, { timestamps: true });

storeBuilderAssetSchema.index({ shop_id: 1, url: 1 });
storeBuilderAssetSchema.index({ shop_id: 1, status: 1, createdAt: -1 });
storeBuilderAssetSchema.index({ publicId: 1 }, { unique: true });

module.exports = mongoose.model('StoreBuilderAsset', storeBuilderAssetSchema);
