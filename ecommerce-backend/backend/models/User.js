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
        enum: ['SuperAdmin', 'SupportAgent', 'SupportLead', 'TechnicalSupport', 'VendorAdmin', 'VendorStaff', 'Customer'],
        default: 'Customer'
    },
    status: {
        type: String,
        enum: ['Active', 'Suspended'],
        default: 'Active'
    },
    sessionVersion: {
        type: Number,
        min: 0,
        default: 0
    },
    planSuspendedAt: {
        type: Date,
        default: null
    },
    planSuspendedFor: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    permissions: {
        overview: { type: Boolean, default: false },
        products: { type: Boolean, default: true },
        catalogTools: { type: Boolean, default: false },
        orders: { type: Boolean, default: true },
        returns: { type: Boolean, default: false },
        customers: { type: Boolean, default: false },
        privacyRequests: { type: Boolean, default: false },
        promotions: { type: Boolean, default: false },
        notifications: { type: Boolean, default: false },
        shipping: { type: Boolean, default: false },
        analytics: { type: Boolean, default: false },
        growthCenter: { type: Boolean, default: false },
        storeBuilder: { type: Boolean, default: false },
        settings: { type: Boolean, default: false },
        activityLogs: { type: Boolean, default: false },
        collectionsAi: { type: Boolean, default: false },
        productsSchedule: { type: Boolean, default: false },
        salesManage: { type: Boolean, default: false },
        bannersManage: { type: Boolean, default: false },
        inventoryAlertsManage: { type: Boolean, default: false },
        inventoryRead: { type: Boolean, default: false },
        inventoryManage: { type: Boolean, default: false },
        growthRead: { type: Boolean, default: false },
        purchaseOrdersRead: { type: Boolean, default: false },
        purchaseOrdersManage: { type: Boolean, default: false },
        purchaseOrdersReceive: { type: Boolean, default: false }
    },
    shop_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: function() {
            return !['SuperAdmin', 'SupportAgent', 'SupportLead', 'TechnicalSupport'].includes(this.role);
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
    phoneVerified: {
        type: Boolean,
        default: false
    },
    phoneVerifiedAt: Date,
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerifiedAt: Date,
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
