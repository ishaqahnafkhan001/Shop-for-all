require('dotenv').config();

const connectDB = require('../config/db');
const { cleanupExpiredStoreBuilderAssets } = require('../services/storeBuilder/storeBuilderAssetService');

const run = async () => {
    await connectDB();
    const result = await cleanupExpiredStoreBuilderAssets({ limit: Number(process.argv[2]) || 250 });
    console.log(JSON.stringify(result));
    process.exit(result.failed ? 1 : 0);
};

run().catch(error => {
    console.error('Store Builder asset cleanup failed:', error.message);
    process.exit(1);
});
