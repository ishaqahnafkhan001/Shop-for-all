const mongoose = require('mongoose');
const { Schema } = mongoose;

const ANALYTICS_EVENT_TYPES = [
    'product_view',
    'add_to_cart',
    'begin_checkout',
    'order_placed',
    'search'
];

const analyticsEventSchema = new Schema({
    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    sessionId: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
        index: true
    },
    customer_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    eventType: {
        type: String,
        enum: ANALYTICS_EVENT_TYPES,
        required: true,
        index: true
    },
    product_id: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        default: null,
        index: true
    },
    variant_id: {
        type: Schema.Types.ObjectId,
        default: null
    },
    order_id: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        default: null,
        index: true
    },
    value: {
        type: Number,
        default: 0,
        min: 0
    },
    currency: {
        type: String,
        default: 'BDT',
        uppercase: true,
        trim: true,
        maxlength: 8
    },
    source: {
        type: String,
        trim: true,
        maxlength: 120,
        default: 'direct'
    },
    utm: {
        source: { type: String, trim: true, maxlength: 120, default: '' },
        medium: { type: String, trim: true, maxlength: 120, default: '' },
        campaign: { type: String, trim: true, maxlength: 160, default: '' },
        content: { type: String, trim: true, maxlength: 160, default: '' },
        term: { type: String, trim: true, maxlength: 160, default: '' }
    },
    device: {
        type: { type: String, trim: true, maxlength: 40, default: '' },
        browser: { type: String, trim: true, maxlength: 80, default: '' },
        os: { type: String, trim: true, maxlength: 80, default: '' }
    },
    pageUrl: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ''
    },
    referrer: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ''
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

analyticsEventSchema.index({ shop_id: 1, createdAt: -1 });
analyticsEventSchema.index({ shop_id: 1, eventType: 1, createdAt: -1 });
analyticsEventSchema.index({ shop_id: 1, product_id: 1, createdAt: -1 });
analyticsEventSchema.index({ sessionId: 1, createdAt: -1 });

const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);
AnalyticsEvent.EVENT_TYPES = ANALYTICS_EVENT_TYPES;

module.exports = AnalyticsEvent;
