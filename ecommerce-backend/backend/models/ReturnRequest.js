const mongoose = require('mongoose');
const { Schema } = mongoose;

const returnItemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId },
    title: { type: String, trim: true, required: true },
    sku: { type: String, trim: true, default: '' },
    quantity: { type: Number, min: 1, required: true },
    refundAmount: { type: Number, min: 0, default: 0 }
}, { _id: false });

const refundSchema = new Schema({
    status: {
        type: String,
        enum: ['NotRequired', 'Pending', 'Refunded', 'Failed'],
        default: 'Pending',
        index: true
    },
    amount: { type: Number, min: 0, default: 0 },
    method: { type: String, trim: true, default: '' },
    reference: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' },
    refundedAt: { type: Date, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, { _id: false });

const proofFileSchema = new Schema({
    url: { type: String, trim: true, default: '' },
    publicId: { type: String, trim: true, default: '' },
    originalName: { type: String, trim: true, default: '' },
    mimeType: { type: String, trim: true, default: '' },
    size: { type: Number, min: 0, default: 0 }
}, { _id: false });

const proofSchema = new Schema({
    images: { type: [proofFileSchema], default: [] },
    video: { type: proofFileSchema, default: undefined }
}, { _id: false });

const returnRequestSchema = new Schema({
    shop_id: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    order_id: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    customer_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: {
        type: [returnItemSchema],
        validate: [items => Array.isArray(items) && items.length > 0, 'At least one return item is required']
    },
    reason: { type: String, trim: true, required: true },
    customerNote: { type: String, trim: true, default: '' },
    internalNote: { type: String, trim: true, default: '' },
    status: {
        type: String,
        enum: ['Requested', 'Approved', 'Rejected', 'Received', 'Refunded', 'Cancelled', 'Closed'],
        default: 'Requested',
        index: true
    },
    resolution: { type: String, trim: true, default: '' },
    proof: { type: proofSchema, default: () => ({ images: [] }) },
    refund: { type: refundSchema, default: () => ({}) },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    inventoryRestoredAt: { type: Date, default: null },
    inventoryRestoredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isDeleted: { type: Boolean, default: false, index: true }
}, { timestamps: true });

returnRequestSchema.index({ shop_id: 1, isDeleted: 1, status: 1, createdAt: -1 });
returnRequestSchema.index({ shop_id: 1, order_id: 1, isDeleted: 1 });

module.exports = mongoose.model('ReturnRequest', returnRequestSchema);
