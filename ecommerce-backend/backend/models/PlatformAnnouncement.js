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

module.exports = mongoose.model('PlatformAnnouncement', platformAnnouncementSchema);
