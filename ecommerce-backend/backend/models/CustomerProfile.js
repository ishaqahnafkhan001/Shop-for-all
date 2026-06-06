const mongoose = require('mongoose');
const { Schema } = mongoose;

const customerProfileSchema = new Schema({
    account_id: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true
    },
    membership_id: {
        type: Schema.Types.ObjectId,
        ref: 'ShopMembership',
        required: true,
        unique: true
    },
    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    legacyUser_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        trim: true,
        required: true
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    addresses: [{
        label: { type: String, trim: true, default: 'Default' },
        fullName: { type: String, trim: true },
        phone: { type: String, trim: true },
        addressLine: { type: String, trim: true },
        city: { type: String, trim: true },
        isDefault: { type: Boolean, default: false }
    }]
}, { timestamps: true });

customerProfileSchema.index({ shop_id: 1, account_id: 1 }, { unique: true });

module.exports = mongoose.model('CustomerProfile', customerProfileSchema);
