const mongoose = require('mongoose');
const schema = new mongoose.Schema({
    shop_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    actor: String,
    count: Number,
    updates: mongoose.Schema.Types.Mixed,
    snapshots: [{ productId: mongoose.Schema.Types.ObjectId, before: mongoose.Schema.Types.Mixed, afterVersion: Date }],
    undoneAt: Date
}, { timestamps: true, autoCreate: false, autoIndex: false });
module.exports = mongoose.model('CatalogOperation', schema);
