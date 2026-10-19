const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { pathToFileURL } = require('node:url');
const contract = require('@scaleup/storefront-theme');
const root = path.resolve(__dirname, '../../..');
let createQueue, createWatcher;
test.before(async () => {
    ({ createDraftWriteQueue: createQueue } = await import(pathToFileURL(path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder/hooks/draftWriteQueue.js')).href));
    ({ createStorefrontRevisionCheck: createWatcher } = await import(pathToFileURL(path.join(root, 'ecommerce-storefront/src/lib/storefrontRevisionCheck.js')).href));
});
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const load = (relative, deps) => {
    const filename = path.join(root, 'ecommerce-backend/backend', relative);
    const compiled = new Module(filename, module);
    compiled.require = id => deps[id] || {};
    compiled._compile(fs.readFileSync(filename, 'utf8'), filename);
    return compiled.exports;
};

test('autosave and manual save are serialized and use the preceding returned version', async () => {
    const first = deferred(); const calls = [];
    const queue = createQueue({ initialVersion: 'v0', save: async data => {
        calls.push(data); return calls.length === 1 ? first.promise : { updatedAt: 'v2' };
    } });
    const a = queue.save({ theme: 'a' }); const b = queue.save({ theme: 'b' });
    await Promise.resolve(); assert.equal(calls.length, 1);
    first.resolve({ updatedAt: 'v1' }); await Promise.all([a, b]);
    assert.deepEqual(calls.map(x => x.expectedDraftUpdatedAt), ['v0', 'v1']);
    assert.deepEqual(calls.map(x => x.theme), ['a', 'b']);
});

test('publication drains an in-flight save, cancels queued saves and does not delete another draft', async () => {
    const first = deferred(); let writes = 0, deletes = 0, drained = false;
    const queue = createQueue({ save: () => { writes++; return first.promise; }, remove: () => { deletes++; } });
    const a = queue.save({}); await Promise.resolve();
    const b = queue.save({}); const barrier = queue.pause().then(() => { drained = true; });
    await Promise.resolve(); assert.equal(drained, false);
    first.resolve({ updatedAt: 'v1' }); await Promise.all([a, b, barrier]);
    assert.equal(writes, 1); assert.equal(drained, true);
    await queue.clear({ clearServer: false }); assert.equal(deletes, 0);
});

test('discard waits for writes and carries their version; closing a tenant cancels pending writes', async () => {
    const first = deferred(); const removed = []; let writes = 0;
    const queue = createQueue({ save: () => { writes++; return first.promise; }, remove: version => removed.push(version) });
    const a = queue.save({}); await Promise.resolve();
    const clear = queue.clear(); first.resolve({ updatedAt: 'v1' }); await Promise.all([a, clear]);
    assert.deepEqual(removed, ['v1']);
    const next = queue.save({}); queue.close(); await next; assert.equal(writes, 1);
});

test('failed saves do not advance concurrency tokens or poison the queue', async () => {
    const calls = [];
    const queue = createQueue({ initialVersion: 'v0', save: async data => {
        calls.push(data.expectedDraftUpdatedAt); if (calls.length === 1) throw new Error('Offline'); return { updatedAt: 'v1' };
    } });
    await assert.rejects(queue.save({}), /Offline/); await queue.save({});
    assert.deepEqual(calls, ['v0', 'v0']);
});

test('revision watcher ignores failures, wrong tenants and older revisions, and refreshes newer revisions', async () => {
    let next = { shopId: 'a', themeRevision: 4 }, count = 0;
    const watcher = createWatcher({ shopId: 'a', revision: 4, read: async () => { if (next instanceof Error) throw next; return next; }, refresh: () => count++ });
    await watcher.check(); next = { shopId: 'b', themeRevision: 9 }; await watcher.check();
    next = { shopId: 'a', themeRevision: 3 }; await watcher.check();
    next = new Error('Offline'); await watcher.check(); assert.equal(count, 0);
    next = { shopId: 'a', themeRevision: 5 }; await watcher.check(); assert.equal(count, 1);
    watcher.close(); await watcher.check(); assert.equal(count, 1);
});

test('revision watcher serializes checks and ignores late results after tenant navigation', async () => {
    const pending = deferred(); let reads = 0, refreshed = 0, visible = false;
    const watcher = createWatcher({ shopId: 'a', revision: 1, visible: () => visible,
        read: () => { reads++; return pending.promise; }, refresh: () => refreshed++ });
    await watcher.check(); assert.equal(reads, 0); visible = true;
    const request = watcher.check(); await watcher.check(); assert.equal(reads, 1);
    watcher.close(); pending.resolve({ shopId: 'a', themeRevision: 2 }); await request;
    assert.equal(refreshed, 0);
});

test('draft filters require the authenticated tenant and an exact valid concurrency token', () => {
    const { draftWriteFilter, assertDraftTenant } = require('../services/storeBuilder/draftConcurrency');
    assert.deepEqual(draftWriteFilter('a', null), { shop_id: 'a', updatedAt: { $exists: false } });
    assert.equal(draftWriteFilter('b', '2026-10-10T00:00:00.000Z').updatedAt.toISOString(), '2026-10-10T00:00:00.000Z');
    assert.throws(() => draftWriteFilter('a', 'invalid'), { code: 'INVALID_DRAFT_VERSION' });
    assert.throws(() => assertDraftTenant({ tenantId: 'a', body: { expectedShopId: 'b' } }), { code: 'TENANT_CHANGED' });
    assert.doesNotThrow(() => assertDraftTenant({ tenantId: 'a', body: { expectedShopId: 'a' } }));
});

test('actual draft service rejects stale writers and publications racing draft writes', async () => {
    let draft = null, revision = 2, publishDuringSave = false;
    const query = value => ({ select() { return this; }, lean: async () => value });
    const matches = filter => draft && (filter.updatedAt?.$exists === false ? false : +new Date(filter.updatedAt) === +draft.updatedAt);
    const service = load('services/storeBuilder/storeBuilderService.js', {
        '@scaleup/storefront-theme': contract,
        '../../models/Shop': { findById: id => query({ _id: id, shopName: 'Shop', theme: {}, themeRevision: revision }) },
        '../../models/StoreBuilderDraft': {
            async findOneAndUpdate(filter, update, options) {
                assert.equal(filter.shop_id, 'a');
                if ((!draft || !matches(filter)) && !options.upsert) return null;
                if (draft && !matches(filter)) throw Object.assign(new Error('Unique tenant draft'), { code: 11000 });
                draft = { _id: 'draft-a', ...update.$set }; if (publishDuringSave) revision++;
                return { ...draft, toObject: () => ({ ...draft }) };
            },
            async deleteOne(filter) { assert.equal(filter.shop_id, 'a'); if (matches(filter)) draft = null; },
        },
        './draftConcurrency': require('../services/storeBuilder/draftConcurrency'),
        './themeCompatibilityService': require('../services/storeBuilder/themeCompatibilityService'),
        '../policies/defaultPolicyTemplates': contract,
        '../themeSectionService': { ensureThemeSectionArchitecture: async () => {} },
        '../billing/storeBuilderPlanService': require('../services/billing/storeBuilderPlanService'),
        './storeBuilderAssetService': { assertThemeAssetOwnership: async () => {}, attachAssetsToDraft: async () => {} },
    });
    const payload = { shopId: 'a', theme: {}, basedOnRevision: 2, expectedDraftUpdatedAt: null, planAccess: { storeBuilderAccess: 'full' } };
    const saved = await service.saveStoreBuilderDraft(payload);
    await assert.rejects(service.saveStoreBuilderDraft(payload), { code: 'DRAFT_CONFLICT' });
    assert.equal(+draft.updatedAt, +saved.updatedAt);
    draft = null; // A different session explicitly discarded the saved draft.
    await assert.rejects(service.saveStoreBuilderDraft({ ...payload, expectedDraftUpdatedAt: saved.updatedAt.toISOString() }), { code: 'DRAFT_CONFLICT' });
    assert.equal(draft, null);
    const recreated = await service.saveStoreBuilderDraft(payload);
    publishDuringSave = true;
    await assert.rejects(service.saveStoreBuilderDraft({ ...payload, expectedDraftUpdatedAt: recreated.updatedAt.toISOString() }), { code: 'DRAFT_CONFLICT' });
    assert.equal(draft, null);
    await assert.rejects(service.saveStoreBuilderDraft(payload), { code: 'DRAFT_CONFLICT' });
});

test('tenant middleware resolves reassigned domains from the database on every request', async () => {
    let owner = 'a'; let reads = 0;
    const middleware = load('middlewares/tenant.js', {
        crypto: require('crypto'), '../utils/domainUtils': require('../utils/domainUtils'),
        '../services/cacheService': { get: () => assert.fail('Must not read cached authorization'), del: async () => {} },
        '../services/vendorVerificationService': { ensureShopVerificationStatus: async shop => ({ shop }) },
        '../services/shops/featureAccessService': { hasFeature: async () => true },
        '../models/Shop': { findOne: query => {
            assert.ok(JSON.stringify(query).includes('merchant.example.com')); reads++;
            return { select: async () => ({ _id: owner, subdomain: owner, isActive: true, approvalStatus: 'Approved', customDomain: { domain: 'merchant.example.com' } }) };
        } },
    });
    for (const id of ['a', 'b']) {
        owner = id;
        const req = { params: { subdomain: 'merchant.example.com' }, get: header => header === 'host' ? 'api.scaleup.codes' : '' };
        let next = false;
        await middleware.resolveTenant(req, { status: code => { throw new Error(String(code)); } }, () => { next = true; });
        assert.equal(req.tenantId, id); assert.equal(next, true);
    }
    assert.equal(reads, 2);
});

test('public revision handler exposes only the authorized tenant revision with no-store caching', async () => {
    const controller = load('controllers/storeController.js', { joi: require('joi'), '../models/Shop': {
        findById: id => { assert.equal(id, 'a'); return { select() { return this; }, lean: async () => ({ _id: id, themeRevision: 7 }) }; },
    } });
    let body, cache;
    await controller.getStorefrontThemeRevision({ tenantId: 'a' }, { set: (key, value) => { cache = [key, value]; }, json: value => { body = value; } });
    assert.deepEqual(body, { shopId: 'a', themeRevision: 7 }); assert.deepEqual(cache, ['Cache-Control', 'no-store']);
});

test('configured Redis outages behave as cache misses without worker-local fallback copies', async t => {
    const oldUrl = process.env.REDIS_URL;
    process.env.REDIS_URL = 'redis://fixture.invalid';
    t.mock.method(console, 'error', () => {});
    try {
        const cache = load('services/cacheService.js', { ioredis: class {
            on() {}
            async get() { throw new Error('Offline'); }
            async set() { throw new Error('Offline'); }
            async del() { throw new Error('Offline'); }
        } });
        await cache.set('storefront:settings:a', { theme: 'old' });
        assert.equal(await cache.get('storefront:settings:a'), null);
        await cache.del('storefront:settings:a');
        assert.equal(await cache.get('storefront:settings:a'), null);
    } finally {
        if (oldUrl === undefined) delete process.env.REDIS_URL; else process.env.REDIS_URL = oldUrl;
    }
});

test('SEO draft writes reject concurrent replacement of the whole Builder draft', async () => {
    const draft = { _id: 'draft-a', theme: {}, updatedAt: new Date('2026-10-10T00:00:00Z'), basedOnRevision: 2 };
    let writes = 0;
    const service = load('services/storeBuilder/storeBuilderSeoService.js', {
        '@scaleup/storefront-theme': contract,
        '../../models/Shop': { findById: () => ({ select() { return this; }, lean: async () => ({ _id: 'a', theme: {}, themeRevision: 2 }) }) },
        '../../models/StoreBuilderDraft': {
            findOne: filter => { assert.equal(filter.shop_id, 'a'); return { lean: async () => draft }; },
            findOneAndUpdate: async (filter, update, options) => {
                assert.equal(filter.shop_id, 'a'); assert.equal(+filter.updatedAt, +draft.updatedAt);
                assert.equal(options.upsert, false); assert.ok(+update.$set.updatedAt > +draft.updatedAt);
                writes++; return null; // another session changed/deleted the matched version
            },
        },
        './draftConcurrency': require('../services/storeBuilder/draftConcurrency'),
        './storeBuilderService': { normalizeThemeForShop: async theme => theme, normalizeShopAliases: async () => ({ aliases: [] }) },
        './storeBuilderAssetService': { assertThemeAssetOwnership: async () => {}, attachAssetsToDraft: async () => assert.fail('No successful write') },
    });
    await assert.rejects(service.saveStoreBuilderSeoDraft({ shopId: 'a', seo: { title: 'New' }, basedOnRevision: 2 }), { code: 'DRAFT_CONFLICT' });
    assert.equal(writes, 1);
});

test('a committed revision restore remains successful when cache invalidation fails', async t => {
    t.mock.method(console, 'error', () => {});
    let result, status;
    const controller = load('controllers/storeBuilderController.js', {
        '../services/storeBuilder/draftConcurrency': require('../services/storeBuilder/draftConcurrency'),
        '../services/storeBuilder/storeBuilderService': { restoreStoreBuilderRevision: async args => {
            assert.equal(args.shopId, 'a'); assert.equal(args.expectedRevision, 7); return { themeRevision: 8 };
        } },
        '../models/Shop': { findById: () => ({ select() { return this; }, lean: async () => ({ subdomain: 'a' }) }) },
        '../services/cacheService': { del: async () => { throw new Error('Offline'); }, delPattern: async () => {} },
        '../middlewares/tenant': { invalidateTenantCache: async () => {} },
    });
    await controller.restoreStoreBuilderRevision({ tenantId: 'a', params: { id: 'revision-a' }, body: { expectedRevision: 7, expectedShopId: 'a' } },
        { status(code) { status = code; return this; }, json(data) { result = data; return this; } });
    assert.equal(status, 200); assert.equal(result.data.themeRevision, 8);
    assert.deepEqual(result.data.warnings, ['CACHE_INVALIDATION_PENDING']);
});
