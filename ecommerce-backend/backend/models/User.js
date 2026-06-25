const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        minlength: 3,
        maxlength: 50
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
    },
    role: {
        type: String,
        enum: ['SuperAdmin', 'VendorAdmin', 'VendorStaff', 'Customer'],
        default: 'Customer'
    },
    status: {
        type: String,
        enum: ['Active', 'Suspended'],
        default: 'Active'
    },
    permissions: {
        products: { type: Boolean, default: true },
        orders: { type: Boolean, default: true },
        customers: { type: Boolean, default: false },
        promotions: { type: Boolean, default: false },
        analytics: { type: Boolean, default: false },
        storeBuilder: { type: Boolean, default: false },
        settings: { type: Boolean, default: false },
        staff: { type: Boolean, default: false }
    },
    shop_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: function() {
            return this.role !== 'SuperAdmin';
        },
        index: true
    },
    account_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        index: true
    },
    membership_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ShopMembership',
        index: true
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    staffTitle: {
        type: String,
        trim: true,
        maxlength: 80,
        default: ''
    },
    staffNote: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },
    // 🔥 NEW: Array to keep track of the user's orders
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order' // Make sure this matches the exact name of your Order model
    }]
}, { timestamps: true });

userSchema.index(
    { shop_id: 1, email: 1 },
    {
        unique: true,
        partialFilterExpression: { shop_id: { $exists: true } }
    }
);

module.exports = mongoose.model('User', userSchema);
