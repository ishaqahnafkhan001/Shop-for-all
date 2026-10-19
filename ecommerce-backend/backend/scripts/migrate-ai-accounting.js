const mongoose = require('mongoose');
const AiGenerationRequest = require('../models/AiGenerationRequest');
const PlanUsage = require('../models/PlanUsage');

const migrateAiAccounting = async ({ apply = false, writersQuiesced = false } = {}) => {
    const legacy = { accountingVersion: { $ne: 2 } };
    const [active, reserved, windows] = await Promise.all([
        AiGenerationRequest.countDocuments({ ...legacy, status: { $nin: ['completed', 'failed'] } }),
        PlanUsage.countDocuments({ ...legacy, reserved: { $ne: 0 } }),
        PlanUsage.countDocuments(legacy)
    ]);
    const report = { mode: apply ? 'apply' : 'dry-run', legacyActive: active, ambiguousWindows: reserved,
        eligibleWindows: windows, blocked: active > 0 || reserved > 0, modified: 0 };
    if (!apply) return report;
    if (!writersQuiesced || report.blocked) {
        throw new Error('Cutover refused: all old writers must be quiesced and legacy active/reserved accounting explicitly reconciled.');
    }
    // No inferred refunds, consumption, result ownership or historical provenance.
    const result = await PlanUsage.updateMany({ ...legacy, reserved: 0 }, {
        $set: { accountingVersion: 2, receipts: [] }
    });
    report.modified = result.modifiedCount;
    await AiGenerationRequest.createIndexes();
    await PlanUsage.createIndexes();
    return report;
};

if (require.main === module) {
    (async () => {
        // Deliberately use an explicit variable, never load the application's .env.
        if (!process.env.AI_MIGRATION_MONGO_URI) throw new Error('AI_MIGRATION_MONGO_URI must be explicitly set.');
        await mongoose.connect(process.env.AI_MIGRATION_MONGO_URI, { autoIndex: false, autoCreate: false });
        console.log(JSON.stringify(await migrateAiAccounting({ apply: process.argv.includes('--apply'),
            writersQuiesced: process.argv.includes('--writers-quiesced') })));
    })().catch(error => {
        console.error('AI accounting migration failed:', error.message);
        process.exitCode = 1;
    }).finally(() => mongoose.disconnect());
}
module.exports = { migrateAiAccounting };
