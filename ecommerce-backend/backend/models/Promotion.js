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
 * Important: Do not use next() here.
 */
promotionSchema.pre('validate', function () {
    if (this.code) {
        this.code = String(this.code).trim().toUpperCase();
    }

    if (this.name) {
        this.name = String(this.name).trim();
    }

    if (this.type === 'FREE_SHIPPING') {
        this.value = 0;
    }

    if (!this.appliesTo) {
        this.appliesTo = {
            scope: 'ALL',
            productIds: [],
            categories: [],
            collectionIds: []
        };
    }

    if (this.appliesTo.scope === 'ALL') {
        this.appliesTo.productIds = [];
        this.appliesTo.categories = [];
        this.appliesTo.collectionIds = [];
    }
});

/**
 * 🔒 Safety validation
 * Important: throw errors directly instead of next(new Error()).
 */
promotionSchema.pre('save', function () {
    if (this.expiresAt && this.startsAt && this.expiresAt <= this.startsAt) {
        throw new Error('Promotion expiry date must be after start date');
    }

    if (
        this.usageLimit !== null &&
        this.usageLimit !== undefined &&
        this.usageCount > this.usageLimit
    ) {
        throw new Error('Usage count cannot exceed usage limit');
    }

    if (this.type === 'PERCENTAGE' && this.value > 100) {
        throw new Error('Percentage discount cannot exceed 100');
    }

    if (this.type === 'BUY_X_GET_Y') {
        const buyQuantity = Number(this.buyXGetY?.buyQuantity || 0);
        const getQuantity = Number(this.buyXGetY?.getQuantity || 0);

        if (buyQuantity <= 0 || getQuantity <= 0) {
            throw new Error('BUY_X_GET_Y requires buyQuantity and getQuantity');
        }
    }
});

module.exports = mongoose.model('Promotion', promotionSchema);