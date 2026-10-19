// Additive only: does not load .env, rewrite content, or delete existing indexes.
const mongoose = require('mongoose');
const models = [require('../models/AiContentHistory'), require('../models/AiCampaignDraft')];
const migrate = async ({ apply = false } = {}) => {
    const planned = models.map(Model => ({ collection: Model.collection.name, indexes: Model.schema.indexes() }));
    if (apply) for (const Model of models) await Model.createIndexes();
    return { applied: apply, planned };
};
if (require.main === module) (async () => {
    if (!process.env.AI_MIGRATION_MONGO_URI) throw new Error('Set AI_MIGRATION_MONGO_URI explicitly for the reviewed target.');
    await mongoose.connect(process.env.AI_MIGRATION_MONGO_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 5000 });
    console.log(JSON.stringify(await migrate({ apply: process.argv.includes('--apply') }), null, 2));
})().catch(() => { console.error('AI content index migration failed. Check the target and database permissions.'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
module.exports = { migrate };
