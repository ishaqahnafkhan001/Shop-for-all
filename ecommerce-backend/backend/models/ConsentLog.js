const mongoose = require('mongoose');
const { Schema } = mongoose;

const CONSENT_TYPES = ['checkout_policy', 'analytics', 'marketing'];

const consentLogSchema = new Schema({
    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    customer_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    order_id: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        default: null,
        index: true
    },
    type: {
        type: String,
        enum: CONSENT_TYPES,
        required: true,
        index: true
    },
    version: {
        type: String,
        trim: true,
        maxlength: 80,
        default: 'v1'
    },
    acceptedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    ip: {
        type: String,
        trim: true,
        maxlength: 80,
        default: ''
    },
    userAgent: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    }
}, { timestamps: true });

consentLogSchema.index({ shop_id: 1, customer_id: 1, type: 1, acceptedAt: -1 });
consentLogSchema.index({ shop_id: 1, order_id: 1, type: 1 });

const ConsentLog = mongoose.model('ConsentLog', consentLogSchema);
ConsentLog.CONSENT_TYPES = CONSENT_TYPES;

module.exports = ConsentLog;
