const mongoose = require('mongoose');
const { Schema } = mongoose;
const {
    SUPPORT_CATEGORIES,
    SUPPORT_PRIORITIES,
    SUPPORT_STATUSES
} = require('../services/support/supportConstants');

const supportTicketSchema = new Schema({
    ticketNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    createdByUserId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    category: {
        type: String,
        enum: SUPPORT_CATEGORIES,
        default: 'other',
        index: true
    },
    subcategory: { type: String, trim: true, maxlength: 120, default: '' },
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 8000 },
    priority: {
        type: String,
        enum: SUPPORT_PRIORITIES,
        default: 'normal',
        index: true
    },
    prioritySource: {
        type: String,
        enum: ['vendor_impact', 'system', 'staff_override', 'super_admin'],
        default: 'vendor_impact'
    },
    impactLevel: { type: String, trim: true, maxlength: 80, default: '' },
    status: {
        type: String,
        enum: SUPPORT_STATUSES,
        default: 'open',
        index: true
    },
    assignedTo: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    assignedAt: Date,
    assignmentType: {
        type: String,
        enum: ['automatic', 'manual', 'reassignment', 'escalation', 'reopen', 'none'],
        default: 'none'
    },
    assignmentFailureReason: {
        type: String,
        trim: true,
        default: ''
    },
    escalationLevel: {
        type: String,
        enum: ['none', 'support_lead', 'technical_support', 'super_admin', 'security_incident'],
        default: 'none',
        index: true
    },
    escalatedAt: Date,
    escalatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    escalationReason: { type: String, trim: true, maxlength: 1000, default: '' },
    affectedRoute: { type: String, trim: true, maxlength: 300, default: '' },
    affectedEntityType: { type: String, trim: true, maxlength: 80, default: '' },
    affectedEntityId: { type: String, trim: true, maxlength: 120, default: '' },
    requestId: { type: String, trim: true, maxlength: 120, default: '' },
    diagnostics: {
        type: Schema.Types.Mixed,
        default: {}
    },
    knownIssueId: { type: Schema.Types.ObjectId, ref: 'SupportKnownIssue', default: null },
    lastVendorReplyAt: Date,
    lastStaffReplyAt: Date,
    resolvedAt: Date,
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolutionSummary: { type: String, trim: true, maxlength: 3000, default: '' },
    closedAt: Date,
    closedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reopenedAt: Date,
    reopenedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reopenCount: { type: Number, default: 0, min: 0 },
    isDeleted: { type: Boolean, default: false, index: true }
}, { timestamps: true });

supportTicketSchema.index({ shop_id: 1, createdAt: -1 });
supportTicketSchema.index({ assignedTo: 1, status: 1, priority: 1, updatedAt: 1 });
supportTicketSchema.index({ status: 1, priority: 1, createdAt: 1 });
supportTicketSchema.index({ shop_id: 1, status: 1, category: 1, updatedAt: -1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
