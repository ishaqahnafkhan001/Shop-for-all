const mongoose = require('mongoose');
const { Schema } = mongoose;

const inventoryMutationSchema = new Schema({
    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    idempotencyKey: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['processing', 'completed', 'failed'],
        default: 'processing',
        index: true
    },
    beforeStock: Number,
    afterStock: Number,
    inventoryLogId: {
        type: Schema.Types.ObjectId,
        ref: 'InventoryLog'
    },
    lastError: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    }
}, { timestamps: true });

inventoryMutationSchema.index(
    { shop_id: 1, idempotencyKey: 1 },
    { unique: true }
);

module.exports = mongoose.model('InventoryMutation', inventoryMutationSchema);
