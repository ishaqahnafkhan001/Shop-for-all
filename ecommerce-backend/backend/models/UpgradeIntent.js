const mongoose = require('mongoose');

const upgradeIntentSchema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    tokenHash: {
        type: String,
        required: true,
        unique: true,
        select: false
    },
    capability: {
        type: String,
        trim: true,
        maxlength: 80,
        default: ''
    },
    limitKey: {
        type: String,
        enum: ['', 'productCount', 'imagesPerProduct', 'staffAccounts', 'aiProductCreationsPerWeek'],
        default: ''
    },
    recommendedPlan: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 40,
        default: ''
    },
    returnTo: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'expired', 'cancelled'],
        default: 'active',
        index: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    completedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

upgradeIntentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
upgradeIntentSchema.index({ shopId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('UpgradeIntent', upgradeIntentSchema);
