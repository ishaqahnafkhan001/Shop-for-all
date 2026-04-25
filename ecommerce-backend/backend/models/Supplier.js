const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    shop_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },

    name: { type: String, required: true },
    phone: String,
    email: String,
    address: String,

    isActive: {
        type: Boolean,
        default: true
    }

}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);