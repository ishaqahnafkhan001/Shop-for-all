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

const cancellationSchema = new Schema({
    cancelledBy: {
        type: String,
        enum: ['customer', 'vendor', 'system', ''],
        default: ''
    },
    reason: {
        type: String,
        trim: true,
        maxlength: 160,
        default: ''
    },
    note: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },
    cancelledAt: {
        type: Date,
        default: null
    }
}, { _id: false });

const timelineEventSchema = new Schema({
    type: {
        type: String,
        trim: true,
        required: true
    },
    actorType: {
        type: String,
        enum: ['customer', 'vendor', 'system'],
        default: 'system'
    },
    message: {
        type: String,
        trim: true,
        default: ''
    },
    reason: {
        type: String,
        trim: true,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
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

const courierShipmentSchema = new Schema({
    provider: {
        type: String,
        enum: ['pathao', 'redx', ''],
        default: ''
    },
    trackingId: {
        type: String,
        trim: true,
        default: ''
    },
    status: {
        type: String,
        enum: ['not_queued', 'queued', 'syncing', 'synced', 'failed'],
        default: 'not_queued',
        index: true
    },
    charge: {
        type: Number,
        default: 0,
        min: 0
    },
    createdAt: {
        type: Date,
        default: null
    },
    lastSyncedAt: {
        type: Date,
        default: null
    },
    lastError: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ''
    },
    rawResponse: {
        type: Schema.Types.Mixed,
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
        validate: {
            validator: function (items) {
                return Array.isArray(items) && items.length > 0;
            },
            message: 'Order must contain at least one item'
        }
    },

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
     * Must be null when no coupon is applied.
     */
    promotion: {
        type: orderPromotionSchema,
        default: null
    },

    payment: {
        type: paymentSchema,
        required: true
    },

    shipping: {
        type: shippingSchema,
        required: true
    },

    shippingProvider: {
        type: String,
        enum: ['pathao', 'redx', null],
        default: null,
        index: true
    },

    courierShipment: {
        type: courierShipmentSchema,
        default: () => ({})
    },

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

    notes: {
        type: String,
        trim: true,
        default: ''
    },

    cancellation: {
        type: cancellationSchema,
        default: () => ({})
    },

    timeline: {
        type: [timelineEventSchema],
        default: []
    },

    source: {
        type: String,
        trim: true,
        default: 'direct',
        index: true
    },

    isPathaoSynced: {
        type: Boolean,
        default: false,
        index: true
    },

    pathaoConsignmentId: {
        type: String,
        trim: true,
        default: ''
    },

    pathaoSyncStatus: {
        type: String,
        enum: ['not_queued', 'queued', 'syncing', 'synced', 'failed'],
        default: 'not_queued',
        index: true
    },

    pathaoLastError: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ''
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
orderSchema.index({ 'payment.status': 1, updatedAt: -1 });
orderSchema.index({ shop_id: 1, isDeleted: 1, createdAt: -1 });
orderSchema.index({ shop_id: 1, isDeleted: 1, status: 1, createdAt: -1 });

/**
 * 🔒 Safety check before validation
 * No next() used here.
 */
orderSchema.pre('validate', function () {
    if (!this.items || this.items.length === 0) {
        throw new Error('Order must contain at least one item');
    }

    if (!this.pricing) {
        throw new Error('Order pricing is required');
    }

    const subtotal = Number(this.pricing.subtotal || 0);
    const discount = Number(this.pricing.discount || 0);
    const shipping = Number(this.pricing.shipping || 0);
    const tax = Number(this.pricing.tax || 0);
    const total = Number(this.pricing.total || 0);

    const expectedTotal = Math.max(0, subtotal - discount + tax) + shipping;

    if (!Number.isFinite(expectedTotal)) {
        throw new Error('Invalid order pricing');
    }

    if (!Number.isFinite(total) || total < 0) {
        throw new Error('Order total cannot be negative');
    }
});

module.exports = mongoose.model('Order', orderSchema);
