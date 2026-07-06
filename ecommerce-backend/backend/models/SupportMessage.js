const mongoose = require('mongoose');
const { Schema } = mongoose;
const { SUPPORT_MESSAGE_TYPES } = require('../services/support/supportConstants');

const attachmentSchema = new Schema({
    publicId: { type: String, trim: true, default: '' },
    url: { type: String, trim: true, default: '' },
    resourceType: { type: String, trim: true, default: '' },
    mimeType: { type: String, trim: true, default: '' },
    sizeBytes: { type: Number, default: 0 },
    originalFilename: { type: String, trim: true, maxlength: 180, default: '' }
}, { _id: false });

const supportMessageSchema = new Schema({
    ticketId: {
        type: Schema.Types.ObjectId,
        ref: 'SupportTicket',
        required: true,
        index: true
    },
    senderUserId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    senderRole: {
        type: String,
        trim: true,
        default: ''
    },
    messageType: {
        type: String,
        enum: SUPPORT_MESSAGE_TYPES,
        required: true,
        index: true
    },
    body: {
        type: String,
        trim: true,
        maxlength: 10000,
        default: ''
    },
    attachments: {
        type: [attachmentSchema],
        default: []
    },
    isInternalNote: {
        type: Boolean,
        default: false,
        index: true
    },
    editedAt: Date
}, { timestamps: true });

supportMessageSchema.index({ ticketId: 1, createdAt: 1 });

module.exports = mongoose.model('SupportMessage', supportMessageSchema);
