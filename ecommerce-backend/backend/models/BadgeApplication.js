const mongoose = require('mongoose');
const { Schema } = mongoose;

const badgeApplicationSchema = new Schema({
    shopId: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    requestedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
        default: null
    },
    status: {
        type: String,
        enum: [
            'draft',
            'pending_analysis',
            'analyzing',
            'analysis_completed',
            'pending_super_admin_review',
            'approved',
            'rejected',
            'expired',
            'revoked'
        ],
        default: 'pending_analysis',
        index: true
    },
    badgeType: {
        type: String,
        enum: ['trusted_seller', 'verified_seller'],
        default: 'trusted_seller'
    },
    eligibilitySnapshot: {
        plan: { type: String, default: '' },
        subscriptionStatus: { type: String, default: '' },
        verificationStatus: { type: String, default: '' },
        shopAgeDays: { type: Number, default: 0 },
        completedSales: { type: Number, default: 0 },
        facebookLinkPresent: { type: Boolean, default: false },
        averageRating: { type: Number, default: 0 },
        reviewCount: { type: Number, default: 0 },
        unresolvedAbuseReports: { type: Number, default: 0 },
        refundRate: { type: Number, default: null }
    },
    analysisJobId: {
        type: Schema.Types.ObjectId,
        ref: 'Job',
        default: null,
        index: true
    },
    analysisScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    analysisSummary: {
        type: String,
        trim: true,
        default: ''
    },
    analysisFindings: {
        positives: { type: [String], default: [] },
        risks: { type: [String], default: [] },
        vendorSummary: { type: String, trim: true, default: '' }
    },
    recommendation: {
        type: String,
        enum: ['approve', 'review', 'reject'],
        default: 'review',
        index: true
    },
    superAdminDecision: {
        type: String,
        enum: ['approved', 'rejected', 'revoked', ''],
        default: ''
    },
    superAdminReason: {
        type: String,
        trim: true,
        default: ''
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
        default: null
    },
    approvedAt: Date,
    rejectedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
        default: null
    },
    rejectedAt: Date
}, { timestamps: true });

badgeApplicationSchema.index({ shopId: 1, status: 1, createdAt: -1 });
badgeApplicationSchema.index({ status: 1, recommendation: 1, createdAt: -1 });

module.exports = mongoose.model('BadgeApplication', badgeApplicationSchema);
