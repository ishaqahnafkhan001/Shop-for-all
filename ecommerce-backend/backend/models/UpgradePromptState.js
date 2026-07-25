const mongoose = require('mongoose');

const upgradePromptStateSchema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    category: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80
    },
    milestoneKey: {
        type: String,
        trim: true,
        maxlength: 120,
        default: ''
    },
    shownCount: {
        type: Number,
        min: 0,
        default: 0
    },
    lastShownAt: {
        type: Date,
        default: null
    },
    dismissedUntil: {
        type: Date,
        default: null
    },
    completedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

upgradePromptStateSchema.index(
    { shopId: 1, category: 1, milestoneKey: 1 },
    { unique: true }
);

module.exports = mongoose.model('UpgradePromptState', upgradePromptStateSchema);
