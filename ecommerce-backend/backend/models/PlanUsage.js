const mongoose = require('mongoose');

const planUsageSchema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    metric: {
        type: String,
        enum: ['aiProductCreations'],
        required: true
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true, index: true },
    used: { type: Number, default: 0, min: 0 },
    reserved: { type: Number, default: 0, min: 0 },
    accountingVersion: { type: Number },
    receipts: { type: [new mongoose.Schema({
        owner: { type: mongoose.Schema.Types.ObjectId, required: true },
        state: { type: String, enum: ['reserved', 'consumed', 'released'], required: true },
        fence: { type: Number, required: true },
        deadline: { type: Date, required: true },
        recovered: { type: Boolean, default: false }
    }, { _id: false })], default: undefined }
}, { timestamps: true });

planUsageSchema.index(
    { shopId: 1, metric: 1, periodStart: 1 },
    { unique: true }
);
planUsageSchema.index({ periodEnd: 1, updatedAt: 1 });

module.exports = mongoose.model('PlanUsage', planUsageSchema);
