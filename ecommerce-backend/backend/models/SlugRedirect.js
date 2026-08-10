const mongoose = require('mongoose');

const slugRedirectSchema = new mongoose.Schema({
    shop_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    resourceType: { type: String, enum: ['product', 'collection', 'category'], required: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    oldSlug: { type: String, required: true, trim: true, maxlength: 160 }
}, { timestamps: true });

slugRedirectSchema.index({ shop_id: 1, resourceType: 1, oldSlug: 1 }, { unique: true });
slugRedirectSchema.index({ shop_id: 1, resourceType: 1, resourceId: 1, createdAt: -1 });

module.exports = mongoose.model('SlugRedirect', slugRedirectSchema);
