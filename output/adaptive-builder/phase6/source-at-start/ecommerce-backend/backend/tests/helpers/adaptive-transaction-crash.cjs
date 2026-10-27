'use strict';
// Only launched by the isolated integration suite with isolatedAcceptance preload.
if (process.env.SFA_ISOLATED_ACCEPTANCE !== 'c085454b' || process.env.NODE_ENV !== 'test') throw new Error('Isolated crash test only.');
const mongoose = require('mongoose');
const Shop = require('../../models/Shop');
const Draft = require('../../models/StoreBuilderDraft');
const Audit = require('../../models/AuditLog');
const policy = require('../../services/storeBuilder/adaptivePersistencePolicy');
const { publishStoreBuilder } = require('../../services/storeBuilder/storeBuilderService');
async function main() {
    await mongoose.connect(process.env.MONGO_URI_TEST);
    const shopId = process.argv[2];
    if (!/^[a-f0-9]{24}$/i.test(shopId)) throw new Error('Invalid synthetic shop ID.');
    const draft = await Draft.findOne({ shop_id: shopId }).lean();
    const shop = await Shop.findById(shopId).select('themeRevision').lean();
    policy.assertAdaptiveThemeMutation = async () => {}; // Local test mock, not a production authorization path.
    const save = Audit.prototype.save;
    Audit.prototype.save = async function (...args) {
        await save.apply(this, args);
        process.stdout.write('CRASH_AFTER_AUDIT\n');
        process.exit(17);
    };
    await publishStoreBuilder({ shopId, theme: draft.theme, expectedRevision: shop.themeRevision,
        audit: { action: 'adaptive.test.crash' } });
    throw new Error('Crash hook was not reached.');
}
main().catch(error => { console.error(error.message); process.exit(2); });
