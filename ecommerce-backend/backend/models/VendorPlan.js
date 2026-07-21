const mongoose = require('mongoose');

const vendorPlanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    slug: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    monthlyPrice: {
        type: Number,
        default: 0
    },
    yearlyPrice: {
        type: Number,
        default: 0
    },
    productLimit: {
        type: Number,
        default: 100
    },
    staffLimit: {
        type: Number,
        default: 1
    },
    currency: { type: String, trim: true, uppercase: true, default: 'BDT' },
    limits: {
        aiProductCreationsPerWeek: { type: Number, min: 0, default: 10 },
        imagesPerProduct: { type: Number, min: 1, max: 30, default: 5 },
        staffAccounts: { type: Number, min: 0, default: 1 },
        productCount: { type: Number, min: 0, default: 100 },
        activityLogRetentionDays: { type: Number, min: 1, max: 3650, default: 7 }
    },
    features: {
        aiProductCreation: { type: Boolean, default: true },
        storeBuilder: { type: Boolean, default: true },
        coupons: { type: Boolean, default: true },
        analytics: { type: Boolean, default: true },
        customDomain: { type: Boolean, default: false },
        staffAccounts: { type: Boolean, default: true },
        bulkProductTools: { type: Boolean, default: true },
        growthCenter: { type: Boolean, default: true },
        aiAdGenerator: { type: Boolean, default: true },
        customerSection: { type: Boolean, default: false },
        trustSystem: { type: Boolean, default: false },
        notifications: { type: Boolean, default: false },
        scheduledProductPublishing: { type: Boolean, default: false },
        scheduledSales: { type: Boolean, default: false },
        platformBrandingRemoval: { type: Boolean, default: false }
    },
    storeBuilderAccess: {
        type: String,
        enum: ['limited', 'full'],
        default: 'limited'
    },
    storeBuilderCapabilities: {
        basicBranding: { type: Boolean, default: true },
        basicHeader: { type: Boolean, default: true },
        standardHero: { type: Boolean, default: true },
        featuredProducts: { type: Boolean, default: true },
        basicFooter: { type: Boolean, default: true },
        allProducts: { type: Boolean, default: true },
        advancedSections: { type: Boolean, default: false },
        sectionReordering: { type: Boolean, default: false },
        scheduledBanners: { type: Boolean, default: false },
        premiumLayouts: { type: Boolean, default: false },
        advancedDesign: { type: Boolean, default: false }
    },
    badgeEligible: {
        type: Boolean,
        default: false
    },
    prioritySupport: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

vendorPlanSchema.index(
    { slug: 1 },
    {
        unique: true,
        partialFilterExpression: { slug: { $type: 'string', $ne: '' } }
    }
);

module.exports = mongoose.model('VendorPlan', vendorPlanSchema);
