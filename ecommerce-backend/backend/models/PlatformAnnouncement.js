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
    publishedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('PlatformAnnouncement', platformAnnouncementSchema);
