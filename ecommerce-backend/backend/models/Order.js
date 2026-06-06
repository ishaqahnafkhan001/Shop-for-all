const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 🔹 Order Item Snapshot
 * Stores product/variant info at purchase time.
 */
const orderItemSchema = new Schema({
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },

    variantId: {
        type: Schema.Types.ObjectId,
        required: true
    },

    title: {
        type: String,
        required: true,
        trim: true
    },

    sku: {
        type: String,
        trim: true,
        default: ''
    },

    attributes: [
        {
            name: {
                type: String,
                trim: true
            },
            value: {
                type: String,
                trim: true
            }
        }
    ],

    quantity: {
        type: Number,
        required: true,
        min: 1
    },

    price: {
        type: Number,
        required: true,
        min: 0
    },

    buyingPrice: {
        type: Number,
        required: true,
        min: 0
    },

    total: {
        type: Number,
        required: true,
        min: 0
    }

}, { _id: false });

/**
 * 🔹 Promotion Snapshot
 * Stores applied coupon state at order time.
 * This prevents old orders from changing if promotion rules change later.
 */
const orderPromotionSchema = new Schema({
    code: {
        type: String,
        uppercase: true,
        trim: true,
        default: null
    },

    type: {
        type: String,
        enum: [
            'PERCENTAGE',
            'FIXED_AMOUNT',
            'BUY_X_GET_Y',
            'FREE_SHIPPING',
            'FIRST_ORDER'
        ],
        default: null
    },

    discountAmount: {
        type: Number,
        default: 0,
        min: 0
    },

    freeShipping: {
        type: Boolean,
        default: false
    }

}, { _id: false });

/**
 * 🔹 Payment Schema
 */
const paymentSchema = new Schema({
    method: {
        type: String,
        enum: ['COD', 'BKASH', 'NAGAD', 'CARD'],
        required: true,
        default: 'COD'
    },

    status: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
        default: 'Pending'
    },

    transactionId: {
        type: String,
        trim: true,
        default: ''
    },

    paidAt: {
        type: Date,
        default: null
    }

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
        required: true,
        min: 0
    },

    address: {
        fullName: {
            type: String,
            required: true,
            trim: true
        },

        phone: {
            type: String,
            required: true,
            trim: true
        },

        addressLine: {
            type: String,
            required: true,
            trim: true
        },

        city: {
            type: String,
            required: true,
            trim: true
        }
    },

    courier: {
        type: String,
        trim: true,
        default: ''
    },

    trackingId: {
        type: String,
        trim: true,
        default: ''
    },

    shippedAt: {
        type: Date,
        default: null
    },

    deliveredAt: {
        type: Date,
        default: null
    }

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
        required: true,
        validate: [
            items => Array.isArray(items) && items.length > 0,
            'Order must contain at least one item'
        ]
    },

    /**
     * 💰 Pricing Breakdown
     */
    pricing: {
        subtotal: {
            type: Number,
            required: true,
            min: 0
        },

        discount: {
            type: Number,
            default: 0,
            min: 0
        },

        shipping: {
            type: Number,
            required: true,
            min: 0
        },

        tax: {
            type: Number,
            default: 0,
            min: 0
        },

        total: {
            type: Number,
            required: true,
            min: 0
        }
    },

    /**
     * 🎟 Promotion Snapshot
     * Must be null when no coupon is applied.
     */
    promotion: {
        type: orderPromotionSchema,
        default: null
    },

    /**
     * 💳 Payment
     */
    payment: {
        type: paymentSchema,
        required: true
    },

    /**
     * 🚚 Shipping
     */
    shipping: {
        type: shippingSchema,
        required: true
    },

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
    notes: {
        type: String,
        trim: true,
        default: ''
    },

    source: {
        type: String,
        trim: true,
        default: 'direct',
        index: true
    },

    isDeleted: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});

/**
 * 🚀 Indexes
 */
orderSchema.index({ shop_id: 1, createdAt: -1 });
orderSchema.index({ shop_id: 1, status: 1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ shop_id: 1, isDeleted: 1 });

/**
 * 🔒 Safety check before save
 */
orderSchema.pre('validate', function (next) {
    if (!this.items || this.items.length === 0) {
        return next(new Error('Order must contain at least one item'));
    }

    const expectedTotal =
        Math.max(
            0,
            (this.pricing.subtotal || 0) -
            (this.pricing.discount || 0) +
            (this.pricing.tax || 0)
        ) + (this.pricing.shipping || 0);

    if (this.pricing.total < 0) {
        return next(new Error('Order total cannot be negative'));
    }

    if (!Number.isFinite(expectedTotal)) {
        return next(new Error('Invalid order pricing'));
    }

    next();
});

module.exports = mongoose.model('Order', orderSchema);