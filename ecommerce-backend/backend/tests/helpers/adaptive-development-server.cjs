'use strict';
// Run with isolatedAcceptance.cjs against the verified task-owned replica set.
if (process.env.SFA_ISOLATED_ACCEPTANCE !== 'c085454b' || process.env.NODE_ENV !== 'test') throw new Error('Use the isolated acceptance preload and verified disposable MongoDB.');
process.env.CORS_ORIGINS = 'http://127.0.0.1:5185';
const { createLaunchSafetyContext, DEFAULT_PASSWORD } = require('./launchSafetyHarness');
const cleanups = [];
async function main() {
    const ctx = await createLaunchSafetyContext({ after: callback => cleanups.push(callback) });
    process.env.NODE_ENV = 'development';
    process.env.ADAPTIVE_BUILDER_DEV_SHOP_IDS = String(ctx.data.shops.shopA._id);
    const app = require('../../app');
    const server = app.listen(4008, '127.0.0.1', () => console.log(JSON.stringify({ preview: 'http://127.0.0.1:5185/dashboard/adaptive-builder-preview',
        api: 'http://127.0.0.1:4008/api', syntheticLogin: ctx.data.identities.vendorA.user.email, syntheticPassword: DEFAULT_PASSWORD,
        note: 'Disposable synthetic database. Existing authentication and permissions apply; no real merchant records or provider transports.' })));
    let closing = false;
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
        if (closing) return; closing = true;
        process.env.NODE_ENV = 'test';
        await new Promise(resolve => server.close(resolve));
        for (const cleanup of cleanups.reverse()) await cleanup();
        process.exit(0);
    });
}
main().catch(error => { console.error(error); process.exitCode = 1; });
