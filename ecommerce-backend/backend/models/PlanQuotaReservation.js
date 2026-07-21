const mongoose = require('mongoose');

const planQuotaReservationSchema = new mongoose.Schema({
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    resource: { type: String, enum: ['products', 'staff'], required: true },
    slot: { type: Number, required: true, min: 1 },
    operationId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true }
}, { timestamps: true });

planQuotaReservationSchema.index({ shopId: 1, resource: 1, slot: 1 }, { unique: true });
planQuotaReservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PlanQuotaReservation', planQuotaReservationSchema);
