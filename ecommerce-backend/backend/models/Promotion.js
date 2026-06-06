const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 🔹 Promotion / Coupon Schema
 */
const promotionSchema = new Schema({

    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },

    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },

    code: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        maxlength: 40
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
        required: true
    },

    value: {
        type: Number,
        default: 0,
        min: 0
    },

    appliesTo: {
        scope: {
            type: String,
            enum: ['ALL', 'PRODUCTS', 'CATEGORIES', 'COLLECTIONS'],
            default: 'ALL'
        },

        productIds: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Product'
            }
        ],

        categories: [
            {
                type: String,
                trim: true
            }
        ],

        collectionIds: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Collection'
            }
        ]
    },

    buyXGetY: {
        buyQuantity: {
            type: Number,
            default: 0,
            min: 0
        },

        getQuantity: {
            type: Number,
            default: 0,
            min: 0
        },

        getDiscountPercent: {
            type: Number,
            default: 100,
            min: 0,
            max: 100
        }
    },

    minSubtotal: {
        type: Number,
        default: 0,
        min: 0
    },

    startsAt: {
        type: Date,
        default: Date.now
    },

    expiresAt: {
        type: Date,
        default: null
    },

    usageLimit: {
        type: Number,
        default: null,
        min: 0
    },

    usageCount: {
        type: Number,
        default: 0,
        min: 0
    },

    perCustomerLimit: {
        type: Number,
        default: 1,
        min: 1
    },

    isActive: {
        type: Boolean,
        default: true
    }

}, {
    timestamps: true
});

/**
 * 🚀 Indexes
 */
promotionSchema.index({ shop_id: 1, code: 1 }, { unique: true });
promotionSchema.index({ shop_id: 1, isActive: 1, expiresAt: 1 });
promotionSchema.index({ shop_id: 1, type: 1 });

/**
 * 🔒 Normalize before validation
 */
promotionSchema.pre('validate', function (next) {
    if (this.code) {
        this.code = this.code.trim().toUpperCase();
    }

    if (this.name) {
        this.name = this.name.trim();
    }

    if (this.type === 'FREE_SHIPPING') {
        this.value = 0;
    }

    if (this.appliesTo?.scope === 'ALL') {
        this.appliesTo.productIds = [];
        this.appliesTo.categories = [];
        this.appliesTo.collectionIds = [];
    }

    next();
});

/**
 * 🔒 Safety validation
 */
promotionSchema.pre('save', function (next) {
    if (this.expiresAt && this.startsAt && this.expiresAt <= this.startsAt) {
        return next(new Error('Promotion expiry date must be after start date'));
    }

    if (this.usageLimit !== null && this.usageCount > this.usageLimit) {
        return next(new Error('Usage count cannot exceed usage limit'));
    }

    if (this.type === 'PERCENTAGE' && this.value > 100) {
        return next(new Error('Percentage discount cannot exceed 100'));
    }

    if (this.type === 'BUY_X_GET_Y') {
        if (!this.buyXGetY.buyQuantity || !this.buyXGetY.getQuantity) {
            return next(new Error('BUY_X_GET_Y requires buyQuantity and getQuantity'));
        }
    }

    next();
});

module.exports = mongoose.model('Promotion', promotionSchema);