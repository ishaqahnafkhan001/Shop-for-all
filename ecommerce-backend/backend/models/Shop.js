const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
    label: { type: String, trim: true, maxlength: 80 },
    url: { type: String, trim: true, maxlength: 300 },
    isExternal: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 }
}, { _id: false });

const homepageSectionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Hero', 'FeaturedProducts', 'Collection', 'TextBlock', 'Newsletter', 'Reviews'],
        default: 'FeaturedProducts'
    },
    title: { type: String, trim: true, maxlength: 120 },
    isEnabled: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: true });

const shopSchema = new mongoose.Schema({
    shopName: {
        type: String,
        required: [true, 'Shop name is required'],
        trim: true,
        minlength: 3,
        maxlength: 50
    },
    subdomain: {
        type: String,
        required: [true, 'Subdomain is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[a-z0-9]+$/, 'Subdomain can only contain lowercase letters and numbers']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    approvalStatus: {
        type: String,
        enum: ['Pending', 'Approved', 'Suspended'],
        default: 'Approved',
        index: true
    },
    plan: {
        name: { type: String, default: 'Starter' },
        status: {
            type: String,
            enum: ['Trialing', 'Active', 'PastDue', 'Cancelled'],
            default: 'Trialing'
        },
        trialEndsAt: Date,
        renewsAt: Date,
        productLimit: { type: Number, default: 100 }
    },
    customDomain: {
        domain: { type: String, trim: true, lowercase: true, default: '' },
        status: {
            type: String,
            enum: ['NotConfigured', 'PendingVerification', 'Verified', 'Failed'],
            default: 'NotConfigured'
        },
        verifiedAt: Date,
        lastCheckedAt: Date
    },
    theme: {
        logoUrl: { type: String, default: '' },
        faviconUrl: { type: String, default: '' },
        fontFamily: { type: String, default: 'Inter' },
        productGridStyle: {
            type: String,
            enum: ['Comfortable', 'Compact', 'Editorial'],
            default: 'Comfortable'
        },
        colors: {
            accent: { type: String, default: '#4f46e5' },
            accentHover: { type: String, default: '#4338ca' },
            accentSoft: { type: String, default: '#c7d2fe' },
            accentBg: { type: String, default: '#eef2ff' },
            accentStrong: { type: String, default: '#3730a3' },
            accentMuted: { type: String, default: '#818cf8' },
            accentLight: { type: String, default: '#a5b4fc' },
            accentRing: { type: String, default: '#e0e7ff' },
            background: { type: String, default: '#ffffff' },
            foreground: { type: String, default: '#111827' },
            headerBackground: { type: String, default: '#ffffff' }
        },
        homepageSections: {
            type: [homepageSectionSchema],
            default: [
                { type: 'Hero', title: 'Featured offers', sortOrder: 0, isEnabled: true },
                { type: 'FeaturedProducts', title: 'Latest products', sortOrder: 1, isEnabled: true }
            ]
        },
        navigation: {
            type: [linkSchema],
            default: [
                { label: 'Shop', url: '/', sortOrder: 0 },
                { label: 'Track Order', url: '/track', sortOrder: 1 }
            ]
        },
        footer: {
            text: { type: String, default: '' },
            links: { type: [linkSchema], default: [] }
        },
        policies: {
            refund: { type: String, default: '' },
            shipping: { type: String, default: '' },
            privacy: { type: String, default: '' },
            terms: { type: String, default: '' }
        }
    },
    featureFlags: {
        storeBuilder: { type: Boolean, default: true },
        coupons: { type: Boolean, default: true },
        analytics: { type: Boolean, default: true },
        customDomain: { type: Boolean, default: false },
        staffAccounts: { type: Boolean, default: true },
        bulkProductTools: { type: Boolean, default: true }
    },
    // ✨ NEW: Storewide Discount Feature
    storewideDiscount: {
        type: Number,
        default: 0, // 0 means no sale is active
        min: [0, 'Discount cannot be negative'],
        max: [100, 'Discount cannot exceed 100%']
    },
    // 🚚 NEW: Pathao Courier Integration
    pathaoStoreId: {
        type: Number,
        default: null // Null means the vendor hasn't set up their Pathao shipping location yet
    },
    pathaoCredentials: {
        client_id: { type: String, default: null },
        client_secret: { type: String, default: null },
        username: { type: String, default: null },
        password: { type: String, default: null },
        isLive: { type: Boolean, default: false } // True for Hermes (Live), False for Sandbox
    }
}, { timestamps: true });

shopSchema.index({ 'customDomain.domain': 1 }, {
    sparse: true,
    partialFilterExpression: { 'customDomain.domain': { $type: 'string', $ne: '' } }
});

module.exports = mongoose.model('Shop', shopSchema);
