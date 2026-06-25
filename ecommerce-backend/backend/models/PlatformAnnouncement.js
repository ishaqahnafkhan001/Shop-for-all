const mongoose = require('mongoose');

const platformAnnouncementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 140
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    audience: {
        type: String,
        enum: ['All', 'VendorAdmin', 'VendorStaff'],
        default: 'All'
    },
    targetAudience: {
        type: String,
        enum: ['all_vendors', 'all_shops', 'plan', 'shop'],
        default: 'all_vendors',
        index: true
    },
    targetPlan: {
        type: String,
        trim: true,
        default: ''
    },
    targetPlanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VendorPlan',
        default: null,
        index: true
    },
    targetShopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        default: null,
        index: true
    },
    severity: {
        type: String,
        enum: ['Info', 'Warning', 'Critical'],
        default: 'Info'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isPublished: {
        type: Boolean,
        default: true,
        index: true
    },
    publishedAt: {
        type: Date,
        default: Date.now
    },
    startAt: {
        type: Date,
        default: null
    },
    expiresAt: {
        type: Date,
        default: null
    },
    archivedAt: {
        type: Date,
        default: null,
        index: true
    }
}, { timestamps: true });

platformAnnouncementSchema.index({ isPublished: 1, archivedAt: 1, createdAt: -1 });
platformAnnouncementSchema.index({ severity: 1, audience: 1, createdAt: -1 });
platformAnnouncementSchema.index({ targetAudience: 1, targetPlan: 1, targetPlanId: 1, targetShopId: 1, expiresAt: 1 });

module.exports = mongoose.model('PlatformAnnouncement', platformAnnouncementSchema);
