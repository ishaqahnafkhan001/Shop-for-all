const mongoose = require('mongoose');
const { Schema } = mongoose;

const productDailyMetricSchema = new Schema({
    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    product_id: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    views: { type: Number, default: 0 },
    addToCarts: { type: Number, default: 0 },
    checkouts: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    deliveredOrders: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    deliveredRevenue: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    checkoutRate: { type: Number, default: 0 },
    rolledUpAt: { type: Date, default: Date.now }
}, { timestamps: true });

productDailyMetricSchema.index({ shop_id: 1, product_id: 1, date: 1 }, { unique: true });
productDailyMetricSchema.index({ shop_id: 1, date: -1 });

module.exports = mongoose.model('ProductDailyMetric', productDailyMetricSchema);
