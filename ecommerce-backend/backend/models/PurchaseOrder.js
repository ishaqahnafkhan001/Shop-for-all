const mongoose = require('mongoose');
const { Schema } = mongoose;

const purchaseItemSchema = new Schema({
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },

    variantId: {
        type: Schema.Types.ObjectId,
        required: true
    },

    quantity: {
        type: Number,
        required: true
    },

    costPrice: {
        type: Number,
        required: true
    }

}, { _id: false });

const purchaseOrderSchema = new Schema({

    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },

    supplier: {
        type: Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    },

    items: [purchaseItemSchema],

    totalCost: Number,

    status: {
        type: String,
        enum: ['Pending', 'Ordered', 'Received', 'Cancelled'],
        default: 'Pending'
    },

    expectedDeliveryDate: Date,
    receivedAt: Date,

    notes: String

}, { timestamps: true });

purchaseOrderSchema.index({ shop_id: 1, createdAt: -1 });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);