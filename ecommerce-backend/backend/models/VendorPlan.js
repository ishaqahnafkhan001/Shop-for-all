const mongoose = require('mongoose');

const vendorPlanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    monthlyPrice: {
        type: Number,
        default: 0
    },
    productLimit: {
        type: Number,
        default: 100
    },
    staffLimit: {
        type: Number,
        default: 2
    },
    features: {
        storeBuilder: { type: Boolean, default: true },
        coupons: { type: Boolean, default: true },
        analytics: { type: Boolean, default: true },
        customDomain: { type: Boolean, default: false },
        staffAccounts: { type: Boolean, default: true },
        bulkProductTools: { type: Boolean, default: true }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('VendorPlan', vendorPlanSchema);
