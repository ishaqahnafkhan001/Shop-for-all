const mongoose = require('mongoose');
const { Schema } = mongoose;

const collectionSchema = new Schema({
    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    slug: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ''
    },
    image: {
        type: String,
        default: ''
    },
    productIds: [{
        type: Schema.Types.ObjectId,
        ref: 'Product'
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    seo: {
        title: { type: String, trim: true, maxlength: 70, default: '' },
        description: { type: String, trim: true, maxlength: 170, default: '' }
    }
}, { timestamps: true });

collectionSchema.index({ shop_id: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Collection', collectionSchema);
