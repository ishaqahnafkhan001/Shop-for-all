const mongoose = require('mongoose');
const { ThemeSnapshot, installThemeGuard } = require('./storeBuilderThemeContract');

const storeBuilderDraftSchema = new mongoose.Schema({
    shop_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        unique: true,
        index: true
    },
    theme: { type: ThemeSnapshot, required: true, default: {} },
    searchAliases: { type: [String], default: [] },
    customDomain: { type: mongoose.Schema.Types.Mixed, default: {} },
    storewideDiscount: { type: Number, min: 0, max: 100, default: 0 },
    basedOnRevision: { type: Number, required: true, min: 0, default: 0 },
    assetIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StoreBuilderAsset' }],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

storeBuilderDraftSchema.index({ shop_id: 1, updatedAt: -1 });

installThemeGuard(storeBuilderDraftSchema, { draft: true });
module.exports = mongoose.model('StoreBuilderDraft', storeBuilderDraftSchema);
