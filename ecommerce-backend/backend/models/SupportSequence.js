const mongoose = require('mongoose');
const { Schema } = mongoose;

const supportSequenceSchema = new Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    seq: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('SupportSequence', supportSequenceSchema);
