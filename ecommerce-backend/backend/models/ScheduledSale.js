const mongoose = require('mongoose');
const { Schema } = mongoose;

const salePopupSchema = new Schema({
    enabled: { type: Boolean, default: false },
    title: { type: String, trim: true, maxlength: 120, default: '' },
    message: { type: String, trim: true, maxlength: 240, default: '' },
    ctaLabel: { type: String, trim: true, maxlength: 60, default: '' },
    ctaUrl: { type: String, trim: true, maxlength: 500, default: '' },
    frequency: {
        type: String,
        enum: ['once_per_session', 'once_per_day', 'every_visit'],
        default: 'once_per_session'
    },
    timing: {
        type: String,
        enum: ['active', 'upcoming', 'both'],
        default: 'active'
    },
    displayStartsAt: { type: Date, default: null },
    desktopImage: { type: String, trim: true, maxlength: 500, default: '' },
    mobileImage: { type: String, trim: true, maxlength: 500, default: '' }
}, { _id: false });

const scheduledSaleSchema = new Schema({
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
    description: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },
    scope: {
        type: String,
        enum: ['all_products', 'selected_products', 'selected_collections'],
        default: 'all_products',
        index: true
    },
    productIds: [{
        type: Schema.Types.ObjectId,
        ref: 'Product'
    }],
    collectionIds: [{
        type: Schema.Types.ObjectId,
        ref: 'Collection'
    }],
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0
    },
    priority: {
        type: Number,
        default: 0,
        min: 0,
        index: true
    },
    startsAt: {
        type: Date,
        required: true,
        index: true
    },
    endsAt: {
        type: Date,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['scheduled', 'active', 'ended', 'cancelled', 'plan_blocked'],
        default: 'scheduled',
        index: true
    },
    popup: {
        type: salePopupSchema,
        default: () => ({})
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    cancelledAt: {
        type: Date,
        default: null
    },
    processingState: {
        type: String,
        enum: ['idle', 'processing', 'completed', 'failed'],
        default: 'idle',
        index: true
    },
    processingStartedAt: {
        type: Date,
        default: null
    },
    processingCompletedAt: {
        type: Date,
        default: null
    },
    processingBy: {
        type: String,
        trim: true,
        default: ''
    },
    retryCount: {
        type: Number,
        default: 0,
        min: 0
    },
    lastProcessingError: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    }
}, { timestamps: true });

scheduledSaleSchema.index({ shop_id: 1, status: 1, startsAt: 1, endsAt: 1 });
scheduledSaleSchema.index({ shop_id: 1, productIds: 1 });
scheduledSaleSchema.index({ shop_id: 1, collectionIds: 1 });
scheduledSaleSchema.index({ status: 1, startsAt: 1, endsAt: 1, processingState: 1 });

scheduledSaleSchema.pre('validate', function () {
    if (this.name) this.name = String(this.name).trim();
    if (this.discountType === 'percentage' && Number(this.discountValue) > 100) {
        throw new Error('Percentage discount cannot exceed 100');
    }
    if (this.endsAt && this.startsAt && this.endsAt <= this.startsAt) {
        throw new Error('Sale end time must be after start time');
    }
    if (this.scope === 'all_products') {
        this.productIds = [];
        this.collectionIds = [];
    }
    if (this.scope === 'selected_products') {
        this.collectionIds = [];
    }
    if (this.scope === 'selected_collections') {
        this.productIds = [];
    }
});

module.exports = mongoose.model('ScheduledSale', scheduledSaleSchema);
