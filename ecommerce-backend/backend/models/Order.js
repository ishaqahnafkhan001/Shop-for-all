const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 🔹 Order Item Snapshot
 */
const orderItemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },

    title: { type: String, required: true },
    sku: String,

    attributes: [
        {
            name: String,
            value: String
        }
    ],

    quantity: { type: Number, required: true, min: 1 },

    price: { type: Number, required: true },
    buyingPrice: { type: Number, required: true },

    total: { type: Number, required: true }

}, { _id: false });

/**
 * 🔹 Payment Schema
 */
const paymentSchema = new Schema({
    method: {
        type: String,
        enum: ['COD', 'BKASH', 'NAGAD', 'CARD'],
        required: true
    },

    status: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
        default: 'Pending'
    },

    transactionId: String,
    paidAt: Date

}, { _id: false });

/**
 * 🔹 Shipping Schema
 */
const shippingSchema = new Schema({
    zone: {
        type: String,
        enum: ['Inside Dhaka', 'Outside Dhaka'],
        required: true
    },

    cost: {
        type: Number,
        required: true
    },

    address: {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        addressLine: { type: String, required: true },
        city: { type: String, required: true }
    },

    courier: String,
    trackingId: String,

    shippedAt: Date,
    deliveredAt: Date

}, { _id: false });

/**
 * 🔹 Main Order Schema
 */
const orderSchema = new Schema({

    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },

    customer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    items: {
        type: [orderItemSchema],
        required: true
    },

    /**
     * 💰 Pricing Breakdown
     */
    pricing: {
        subtotal: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        shipping: { type: Number, required: true },
        tax: { type: Number, default: 0 },
        total: { type: Number, required: true }
    },

    /**
     * 💳 Payment
     */
    payment: paymentSchema,

    /**
     * 🚚 Shipping
     */
    shipping: shippingSchema,

    /**
     * 🔄 Order Status
     */
    status: {
        type: String,
        enum: [
            'Pending',
            'Confirmed',
            'Processing',
            'Shipped',
            'Delivered',
            'Cancelled',
            'Returned'
        ],
        default: 'Pending',
        index: true
    },

    /**
     * 📝 Extra
     */
    notes: String,

    isDeleted: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});


// 🚀 INDEXES (IMPORTANT)
orderSchema.index({ shop_id: 1, createdAt: -1 });
orderSchema.index({ shop_id: 1, status: 1 });
orderSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);