const mongoose = require('mongoose');
const { Schema } = mongoose;
const { SUPPORT_ASSIGNMENT_TYPES } = require('../services/support/supportConstants');

const supportAssignmentHistorySchema = new Schema({
    ticketId: {
        type: Schema.Types.ObjectId,
        ref: 'SupportTicket',
        required: true,
        index: true
    },
    fromStaffId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    toStaffId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    assignedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    assignmentType: {
        type: String,
        enum: SUPPORT_ASSIGNMENT_TYPES,
        required: true
    },
    reason: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ''
    }
}, { timestamps: true });

supportAssignmentHistorySchema.index({ ticketId: 1, createdAt: -1 });
supportAssignmentHistorySchema.index({ toStaffId: 1, createdAt: -1 });

module.exports = mongoose.model('SupportAssignmentHistory', supportAssignmentHistorySchema);
