const mongoose = require('mongoose');
const { Schema } = mongoose;

const verificationStatuses = [
    'not_submitted',
    'pending',
    'approved',
    'rejected',
    'expired',
    'suspended'
];

const vendorVerificationSchema = new Schema({
    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        unique: true,
        index: true
    },
    owner_id: {
        type: Schema.Types.ObjectId,
        refPath: 'ownerModel',
        index: true
    },
    ownerModel: {
        type: String,
        enum: ['Account', 'User'],
        default: 'Account'
    },
    status: {
        type: String,
        enum: verificationStatuses,
        default: 'not_submitted',
        index: true
    },
    nidNumber: {
        type: String,
        trim: true
    },
    nidName: {
        type: String,
        trim: true
    },
    nidFrontUrl: {
        type: String,
        default: ''
    },
    nidBackUrl: {
        type: String,
        default: ''
    },
    submittedAt: Date,
    verificationDeadline: {
        type: Date,
        required: true,
        index: true
    },
    approvedAt: Date,
    rejectedAt: Date,
    suspendedAt: Date,
    reviewedBy: {
        type: Schema.Types.ObjectId,
        refPath: 'reviewedByModel'
    },
    reviewedByModel: {
        type: String,
        enum: ['Account', 'User'],
        default: 'Account'
    },
    rejectionReason: {
        type: String,
        trim: true,
        default: ''
    },
    adminNote: {
        type: String,
        trim: true,
        default: ''
    }
}, { timestamps: true });

vendorVerificationSchema.index({ status: 1, verificationDeadline: 1 });
vendorVerificationSchema.index({ shop_id: 1, status: 1 });
vendorVerificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('VendorVerification', vendorVerificationSchema);
module.exports.VERIFICATION_STATUSES = verificationStatuses;
