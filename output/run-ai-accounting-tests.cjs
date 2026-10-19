const { MongoMemoryServer, MongoMemoryReplSet } = require('./ai-test-runtime/node_modules/mongodb-memory-server');
const { spawn } = require('node:child_process');
const path = require('node:path');
(async () => {
    for (const topology of ['standalone', 'replicaSet']) {
        const options = { binary: { version: '7.0.14' }, instance: { dbName: `ai_accounting_test_${topology}` } };
        const server = topology === 'standalone' ? await MongoMemoryServer.create(options)
            : await MongoMemoryReplSet.create({ binary: options.binary, replSet: { count: 1 } });
        try {
            console.log(`Testing topology: ${topology}`);
            const code = await new Promise(resolve => {
                const child = spawn(process.execPath, ['--test', '--test-concurrency=1', 'tests/integration/ai-accounting.integration.test.js', 'tests/integration/ai-http.integration.test.js'], {
                    cwd: path.resolve(__dirname, '../ecommerce-backend/backend'), stdio: 'inherit',
                    env: { ...process.env, NODE_ENV: 'test', AI_ACCOUNTING_VERSION: '2',
                        MONGO_URI_TEST: server.getUri(`ai_accounting_test_${topology}`) }
                });
                child.on('exit', resolve);
            });
            if (code) process.exitCode = code;
        } finally { await server.stop(); }
    }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
