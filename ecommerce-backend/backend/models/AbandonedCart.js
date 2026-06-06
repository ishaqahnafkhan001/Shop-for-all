const mongoose = require('mongoose');
const { Schema } = mongoose;

const abandonedCartSchema = new Schema({
    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    customer: {
        email: { type: String, trim: true, lowercase: true },
        fullName: { type: String, trim: true },
        phone: { type: String, trim: true }
    },
    items: [{
        productId: { type: Schema.Types.ObjectId, ref: 'Product' },
        variantId: Schema.Types.ObjectId,
        title: String,
        quantity: { type: Number, default: 1 },
        price: { type: Number, default: 0 }
    }],
    subtotal: {
        type: Number,
        default: 0
    },
    source: {
        type: String,
        default: 'direct'
    },
    status: {
        type: String,
        enum: ['Open', 'Recovered', 'Ignored'],
        default: 'Open',
        index: true
    },
    recoveredOrder: {
        type: Schema.Types.ObjectId,
        ref: 'Order'
    }
}, { timestamps: true });

abandonedCartSchema.index({ shop_id: 1, updatedAt: -1 });

module.exports = mongoose.model('AbandonedCart', abandonedCartSchema);
