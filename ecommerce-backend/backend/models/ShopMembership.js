const mongoose = require('mongoose');
const { Schema } = mongoose;

const shopMembershipSchema = new Schema({
    account_id: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true
    },
    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ['VendorAdmin', 'VendorStaff', 'Customer'],
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Suspended'],
        default: 'Active'
    },
    legacyUser_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

shopMembershipSchema.index({ shop_id: 1, account_id: 1 }, { unique: true });
shopMembershipSchema.index({ shop_id: 1, role: 1 });
shopMembershipSchema.index({ legacyUser_id: 1 }, { unique: true });

module.exports = mongoose.model('ShopMembership', shopMembershipSchema);
