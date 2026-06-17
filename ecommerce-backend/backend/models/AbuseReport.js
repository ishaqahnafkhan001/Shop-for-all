const mongoose = require('mongoose');
const { Schema } = mongoose;

const abuseReportSchema = new Schema({
    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        index: true
    },
    reporterEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    reason: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },
    details: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: ''
    },
    status: {
        type: String,
        enum: ['Open', 'Reviewing', 'Resolved', 'Dismissed'],
        default: 'Open',
        index: true
    },
    internalNote: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: ''
    },
    resolutionReason: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ''
    }
}, { timestamps: true });

abuseReportSchema.index({ status: 1, createdAt: -1 });
abuseReportSchema.index({ shop_id: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('AbuseReport', abuseReportSchema);
