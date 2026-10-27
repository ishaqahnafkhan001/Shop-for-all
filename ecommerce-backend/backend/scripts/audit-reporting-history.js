// Read-only: explicit connection and shop required; no .env loading or backfill.
// REPORTING_AUDIT_URI='mongodb://...' node scripts/audit-reporting-history.js SHOP_ID
const mongoose = require('mongoose');
const Order = require('../models/Order');
const ReturnRequest = require('../models/ReturnRequest');
const FinancialFact = require('../models/FinancialFact');

async function main() {
    const shopId = process.argv[2];
    if (!process.env.REPORTING_AUDIT_URI || !mongoose.isValidObjectId(shopId)) {
        throw new Error('Set REPORTING_AUDIT_URI explicitly and pass one shop ObjectId. This audit does not write or infer missing history.');
    }
    // Disable Mongoose collection/index creation for a strictly read-only audit.
    await mongoose.connect(process.env.REPORTING_AUDIT_URI, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 5000 });
    const shop_id = new mongoose.Types.ObjectId(shopId);
    const [missingDeliveryDates, legacyCoupons, missingRefundDates, refundsWithoutAllocation, missingBuyingCosts, legacyDeliveries, unreviewedReceipts, ledgerFacts] = await Promise.all([
        Order.countDocuments({ shop_id, status: { $in: ['Delivered', 'Returned'] }, deliveryFactId: null, 'shipping.deliveredAt': null }),
        Order.countDocuments({ shop_id, 'pricing.discount': { $gt: 0 }, items: { $elemMatch: { couponDiscount: { $exists: false } } } }),
        ReturnRequest.countDocuments({ shop_id, 'refund.status': 'Refunded', 'refund.financialFactId': null, 'refund.refundedAt': null }),
        ReturnRequest.countDocuments({ shop_id, 'refund.status': 'Refunded', 'refund.amount': { $gt: 0 }, 'items.refundAmount': { $not: { $gt: 0 } } }),
        Order.countDocuments({ shop_id, deliveryFactId: null, items: { $elemMatch: { buyingPrice: null } } }),
        Order.countDocuments({ shop_id, deliveryFactId: null, 'shipping.deliveredAt': { $ne: null } }),
        ReturnRequest.countDocuments({ shop_id, status: 'Received', receivedAt: null, inventoryRestoredAt: null }),
        FinancialFact.countDocuments({ shop_id }),
    ]);
    process.stdout.write(`${JSON.stringify({ shopId, generatedAt: new Date(), readOnly: true, missingDeliveryDates, legacyCoupons, missingRefundDates, refundsWithoutAllocation, missingBuyingCosts, legacyDeliveries, unreviewedReceipts, ledgerFacts }, null, 2)}\n`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
