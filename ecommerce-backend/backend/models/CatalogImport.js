const mongoose = require('mongoose');
const schema = new mongoose.Schema({
    shop_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    operationId: { type: String, required: true },
    fingerprint: { type: String, required: true },
    count: Number,
    mode: String
}, { timestamps: true, autoCreate: false, autoIndex: false });
schema.index({ shop_id: 1, operationId: 1 }, { unique: true });
module.exports = mongoose.model('CatalogImport', schema);
