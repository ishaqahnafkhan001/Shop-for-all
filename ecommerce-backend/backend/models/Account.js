const mongoose = require('mongoose');
const { Schema } = mongoose;
const { PLATFORM_ROLES } = require('../config/platformPermissions');

const accountSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },
    passwordHash: {
        type: String,
        required: true,
        select: false
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 50
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
    status: {
        type: String,
        enum: ['Active', 'Suspended'],
        default: 'Active'
    },
    platformRole: {
        type: String,
        enum: ['None', ...PLATFORM_ROLES],
        default: 'None'
    }
}, { timestamps: true });

module.exports = mongoose.model('Account', accountSchema);
