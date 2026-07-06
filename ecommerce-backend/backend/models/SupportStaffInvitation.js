const mongoose = require('mongoose');
const { Schema } = mongoose;
const {
    SUPPORT_ROLES,
    SUPPORT_SKILLS,
    DEFAULT_SUPPORT_CONFIG
} = require('../services/support/supportConstants');

const supportStaffInvitationSchema = new Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    tokenHash: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    supportRole: {
        type: String,
        enum: SUPPORT_ROLES,
        required: true
    },
    skills: [{
        type: String,
        enum: SUPPORT_SKILLS,
        default: 'general_support'
    }],
    maximumActiveTickets: {
        type: Number,
        min: 1,
        max: 50,
        default: DEFAULT_SUPPORT_CONFIG.defaultMaxActiveTickets
    },
    autoAssignmentEnabled: {
        type: Boolean,
        default: true
    },
    workingHours: {
        type: Schema.Types.Mixed,
        default: {}
    },
    invitedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    consumedAt: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'expired', 'revoked'],
        default: 'pending',
        index: true
    }
}, { timestamps: true });

supportStaffInvitationSchema.index({ email: 1, status: 1 });
supportStaffInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('SupportStaffInvitation', supportStaffInvitationSchema);
