const mongoose = require('mongoose');
const { Schema } = mongoose;

const DATA_REQUEST_TYPES = ['export', 'delete'];
const DATA_REQUEST_STATUSES = ['requested', 'processing', 'completed', 'rejected'];

const dataRequestSchema = new Schema({
    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    customer_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    type: {
        type: String,
        enum: DATA_REQUEST_TYPES,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: DATA_REQUEST_STATUSES,
        default: 'requested',
        index: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 160,
        default: ''
    },
    phone: {
        type: String,
        trim: true,
        maxlength: 40,
        default: ''
    },
    note: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ''
    },
    requestedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    completedAt: {
        type: Date,
        default: null
    },
    handledBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    ip: {
        type: String,
        trim: true,
        maxlength: 80,
        default: ''
    },
    userAgent: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    }
}, { timestamps: true });

dataRequestSchema.index({ shop_id: 1, status: 1, requestedAt: -1 });
dataRequestSchema.index({ shop_id: 1, customer_id: 1, requestedAt: -1 });

const DataRequest = mongoose.model('DataRequest', dataRequestSchema);
DataRequest.REQUEST_TYPES = DATA_REQUEST_TYPES;
DataRequest.REQUEST_STATUSES = DATA_REQUEST_STATUSES;

module.exports = DataRequest;
