const mongoose = require('mongoose');
const { ThemeSnapshot, installThemeGuard } = require('./storeBuilderThemeContract');

const storeBuilderRevisionSchema = new mongoose.Schema({
    shop_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    revision: { type: Number, required: true, min: 1 },
    theme: { type: ThemeSnapshot, required: true },
    assetIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StoreBuilderAsset' }],
    searchAliases: { type: [String], default: [] },
    customDomain: { type: mongoose.Schema.Types.Mixed, default: {} },
    storewideDiscount: { type: Number, min: 0, max: 100, default: 0 },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    publishedByName: { type: String, trim: true, maxlength: 120, default: '' },
    source: { type: String, enum: ['publish', 'restore', 'migration'], default: 'publish' },
    changeScope: {
        type: String,
        enum: ['storefront', 'homepage-seo'],
        default: 'storefront',
        index: true
    },
    restoredFromRevision: { type: Number, default: null },
    changeSummary: { type: [mongoose.Schema.Types.Mixed], default: [] }
}, { timestamps: true });

storeBuilderRevisionSchema.index({ shop_id: 1, revision: -1 }, { unique: true });
storeBuilderRevisionSchema.index({ shop_id: 1, createdAt: -1 });

installThemeGuard(storeBuilderRevisionSchema, { revision: true });
module.exports = mongoose.model('StoreBuilderRevision', storeBuilderRevisionSchema);
