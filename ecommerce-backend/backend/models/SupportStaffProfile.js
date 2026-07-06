const mongoose = require('mongoose');
const { Schema } = mongoose;
const {
    SUPPORT_ROLES,
    SUPPORT_SKILLS,
    SUPPORT_AVAILABILITY,
    DEFAULT_SUPPORT_CONFIG
} = require('../services/support/supportConstants');

const workingHoursSchema = new Schema({
    timezone: { type: String, trim: true, default: 'Asia/Dhaka' },
    schedule: [{
        day: { type: Number, min: 0, max: 6 },
        start: { type: String, trim: true, default: '09:00' },
        end: { type: String, trim: true, default: '18:00' },
        enabled: { type: Boolean, default: true }
    }]
}, { _id: false });

const supportStaffProfileSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    account_id: {
        type: Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true
    },
    supportRole: {
        type: String,
        enum: SUPPORT_ROLES,
        required: true,
        index: true
    },
    skills: [{
        type: String,
        enum: SUPPORT_SKILLS,
        default: 'general_support'
    }],
    manualStatus: {
        type: String,
        enum: SUPPORT_AVAILABILITY,
        default: 'available',
        index: true
    },
    maximumActiveTickets: {
        type: Number,
        min: 1,
        max: 50,
        default: DEFAULT_SUPPORT_CONFIG.defaultMaxActiveTickets
    },
    autoAssignmentEnabled: {
        type: Boolean,
        default: true,
        index: true
    },
    workingHours: {
        type: workingHoursSchema,
        default: () => ({})
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    lastAssignedAt: {
        type: Date,
        default: null,
        index: true
    },
    deactivatedAt: Date,
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, { timestamps: true });

supportStaffProfileSchema.index({ supportRole: 1, isActive: 1, manualStatus: 1 });
supportStaffProfileSchema.index({ skills: 1, isActive: 1, autoAssignmentEnabled: 1 });

module.exports = mongoose.model('SupportStaffProfile', supportStaffProfileSchema);
