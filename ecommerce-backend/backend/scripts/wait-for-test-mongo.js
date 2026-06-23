const mongoose = require('mongoose');

const uri = process.env.MONGO_URI_TEST ||
    'mongodb://127.0.0.1:27018/shop_for_all_launch_test?directConnection=true&replicaSet=rs0';

const timeoutMs = Number(process.env.TEST_MONGO_WAIT_MS || 60000);
const intervalMs = 1000;
const startedAt = Date.now();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const waitForMongo = async () => {
    let lastError = null;

    while (Date.now() - startedAt < timeoutMs) {
        try {
            await mongoose.connect(uri, {
                serverSelectionTimeoutMS: 1500
            });

            await mongoose.connection.db.admin().command({ ping: 1 });
            await mongoose.connection.db.admin().command({ replSetGetStatus: 1 });
            await mongoose.disconnect();

            console.log('[test-mongo] MongoDB replica set is ready.');
            return;
        } catch (error) {
            lastError = error;

            if (mongoose.connection.readyState !== 0) {
                await mongoose.disconnect().catch(() => {});
            }

            await sleep(intervalMs);
        }
    }

    throw new Error([
        '[test-mongo] MongoDB test replica set did not become ready in time.',
        `URI: ${uri}`,
        `Last error: ${lastError?.message || 'unknown'}`,
        'Make sure Docker is running, then run: npm run test:mongo:up'
    ].join('\n'));
};

waitForMongo().catch(error => {
    console.error(error.message);
    process.exit(1);
});
