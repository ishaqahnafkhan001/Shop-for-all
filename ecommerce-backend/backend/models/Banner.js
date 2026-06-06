const mongoose = require('mongoose');
const { Schema } = mongoose;

const bannerSchema = new Schema({
    // ✅ Ties the banner to a specific shop
    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: [true, 'A banner must belong to a shop'],
        index: true
    },
    title: {
        type: String,
        required: [true, 'Banner title is required'],
        trim: true
    },
    // Changed from 'image' to 'images' as an Array of Strings
    images: {
        type: [String],
        validate: [v => v.length > 0, 'At least one banner image is required']
    },
    desktopImages: {
        type: [String],
        default: []
    },
    mobileImages: {
        type: [String],
        default: []
    },
    link: {
        type: String,
        default: '' // Optional: Redirect users to a specific product/category
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);
