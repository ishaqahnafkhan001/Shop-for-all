// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    // THE CRITICAL INDEX:
    // This tells MongoDB to group all products by shop_id for lightning-fast lookups
    shop_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },

    title: {
        type: String,
        required: [true, 'Product title is required'],
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative']
    },
    originalPrice: {
        type: Number,
        default: 0
    },
    category: {
        type: String,
        index: true // Optional: Add this if vendors will frequently filter by category!
    },
    imageUrl: {
        type: String,
        required: true // This will be the URL from Cloudinary
    },
    stock: {
        type: Number,
        default: 1
    }
}, { timestamps: true });

// Optional: A Compound Index
// If a customer visits "clothingbd.yourwebsite.com/category/shirts",
// this makes searching by BOTH shop and category instantly fast.
productSchema.index({ shop_id: 1, category: 1 });

module.exports = mongoose.model('Product', productSchema);