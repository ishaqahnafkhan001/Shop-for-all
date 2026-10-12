const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });

async function main() {
    const connectionUrl = process.env.REDIS_URL?.trim();
    if (!connectionUrl) {
        console.log('Redis is NOT configured: REDIS_URL is empty or missing. Backend cache mode: per-process memory.');
        process.exitCode = 1;
        return;
    }

    let client;
    let timeout;
    try {
        const parsed = new URL(connectionUrl);
        if (!['redis:', 'rediss:'].includes(parsed.protocol)) throw new Error('Invalid protocol');
        const Redis = require('ioredis');
        client = new Redis(connectionUrl, {
            lazyConnect: true,
            connectTimeout: 4000,
            commandTimeout: 4000,
            maxRetriesPerRequest: 0,
            retryStrategy: () => null,
            enableOfflineQueue: false,
        });
        // Do not log connection URLs or error messages that may contain credentials.
        client.on('error', () => {});
        const reply = await Promise.race([
            (async () => { await client.connect(); return client.ping(); })(),
            new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Timeout')), 6000); }),
        ]);
        if (reply !== 'PONG') throw new Error('Unexpected response');
        console.log('Redis is configured and reachable: PING returned PONG. No cache data was written.');
    } catch {
        console.error('Redis is configured but the connection check FAILED. Verify the URL, credentials, network access and TLS settings.');
        process.exitCode = 1;
    } finally {
        clearTimeout(timeout);
        client?.disconnect();
    }
}

main();
