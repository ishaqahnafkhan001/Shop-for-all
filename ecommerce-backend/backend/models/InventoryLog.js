const mongoose = require('mongoose');
const { Schema } = mongoose;

const inventoryLogSchema = new Schema({

    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },

    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },

    variantId: {
        type: Schema.Types.ObjectId,
        required: true
    },

    /**
     * 🔄 Change Info
     */
    change: {
        type: Number, // +10, -5
        required: true
    },

    type: {
        type: String,
        enum: ['ORDER', 'CANCEL', 'MANUAL', 'RETURN'],
        required: true
    },

    referenceId: {
        type: Schema.Types.ObjectId // orderId, etc
    },

    /**
     * 📊 Snapshot
     */
    beforeStock: Number,
    afterStock: Number,

    /**
     * 👤 Actor
     */
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    note: String

}, { timestamps: true });


// 🔥 Indexes
inventoryLogSchema.index({ productId: 1, createdAt: -1 });
inventoryLogSchema.index({ shop_id: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);