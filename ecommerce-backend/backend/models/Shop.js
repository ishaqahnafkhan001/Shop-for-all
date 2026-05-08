const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
    shopName: {
        type: String,
        required: [true, 'Shop name is required'],
        trim: true,
        minlength: 3,
        maxlength: 50
    },
    subdomain: {
        type: String,
        required: [true, 'Subdomain is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[a-z0-9]+$/, 'Subdomain can only contain lowercase letters and numbers']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // ✨ NEW: Storewide Discount Feature
    storewideDiscount: {
        type: Number,
        default: 0, // 0 means no sale is active
        min: [0, 'Discount cannot be negative'],
        max: [100, 'Discount cannot exceed 100%']
    },
    // 🚚 NEW: Pathao Courier Integration
    pathaoStoreId: {
        type: Number,
        default: null // Null means the vendor hasn't set up their Pathao shipping location yet
    },
    pathaoCredentials: {
        client_id: { type: String, default: null },
        client_secret: { type: String, default: null },
        username: { type: String, default: null },
        password: { type: String, default: null },
        isLive: { type: Boolean, default: false } // True for Hermes (Live), False for Sandbox
    }
}, { timestamps: true });

module.exports = mongoose.model('Shop', shopSchema);