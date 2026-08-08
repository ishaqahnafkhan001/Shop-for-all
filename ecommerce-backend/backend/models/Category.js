const mongoose = require('mongoose');
const { Schema } = mongoose;

const categorySchema = new Schema({
    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80
    },
    normalizedName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80
    },
    coverImage: {
        url: { type: String, trim: true, default: '' },
        publicId: { type: String, trim: true, default: '', select: false },
        altText: { type: String, trim: true, maxlength: 140, default: '' }
    }
}, { timestamps: true });

categorySchema.index({ shop_id: 1, normalizedName: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
