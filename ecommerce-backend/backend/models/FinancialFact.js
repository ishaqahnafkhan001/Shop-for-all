const mongoose = require('mongoose');
const schema = new mongoose.Schema({
    shop_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    key: { type: String, required: true },
    kind: { type: String, enum: ['delivery', 'refund', 'restock'], required: true },
    order_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    return_id: { type: mongoose.Schema.Types.ObjectId },
    occurredAt: { type: Date, required: true },
    version: { type: String, default: 'commerce-v2' },
    snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ shop_id: 1, key: 1 }, { unique: true });
schema.index({ shop_id: 1, occurredAt: 1, kind: 1 });
schema.index({ shop_id: 1, 'snapshot.customer': 1, kind: 1, occurredAt: 1 });
schema.pre('save', function () { if (!this.isNew) throw new Error('Financial facts are append-only.'); });
for (const operation of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace', 'deleteOne', 'deleteMany', 'findOneAndDelete']) {
    schema.pre(operation, function () { throw new Error('Financial facts are append-only.'); });
}
schema.pre('deleteOne', { document: true, query: false }, function () { throw new Error('Financial facts are append-only.'); });
schema.pre('bulkWrite', function () { throw new Error('Financial facts are append-only.'); });
module.exports = mongoose.model('FinancialFact', schema);
