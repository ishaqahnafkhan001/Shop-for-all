const mongoose = require('mongoose');
const { Schema } = mongoose;
const {
    SUPPORT_CATEGORIES,
    KNOWN_ISSUE_STATUSES,
    SUPPORT_PRIORITIES
} = require('../services/support/supportConstants');

const supportKnownIssueSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 180
    },
    summary: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    affectedServices: [{ type: String, trim: true, maxlength: 80 }],
    affectedCategories: [{
        type: String,
        enum: SUPPORT_CATEGORIES
    }],
    severity: {
        type: String,
        enum: SUPPORT_PRIORITIES,
        default: 'normal',
        index: true
    },
    status: {
        type: String,
        enum: KNOWN_ISSUE_STATUSES,
        default: 'investigating',
        index: true
    },
    publicToVendors: {
        type: Boolean,
        default: true,
        index: true
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    resolvedAt: Date,
    updates: [{
        body: { type: String, trim: true, maxlength: 1000 },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
    }],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, { timestamps: true });

supportKnownIssueSchema.index({ publicToVendors: 1, status: 1, updatedAt: -1 });
supportKnownIssueSchema.index({ affectedCategories: 1, status: 1 });

module.exports = mongoose.model('SupportKnownIssue', supportKnownIssueSchema);
