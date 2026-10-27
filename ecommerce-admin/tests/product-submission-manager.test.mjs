import test from 'node:test';
import assert from 'node:assert/strict';
import { ProductSubmissionManager, classifySubmissionError, productSubmissionScope } from '../src/services/productSubmissionManager.js';

const scope = 'actor:shop';
const productId = 'a'.repeat(24);
const fixture = () => {
    const image = new File(['real image bytes'], 'cover.png', { type: 'image/png', lastModified: 10 });
    const video = new File(['video bytes'], 'demo.mp4', { type: 'video/mp4', lastModified: 20 });
    return {
        snapshot: { formData: { title: 'Shirt', status: 'Draft', publicationStatus: 'draft', pricing: { buyingPrice: '40', sellingPrice: '100' }, seo: { title: 'Search title' }, specifications: [{ key: 'Fabric', value: 'Cotton' }], comments: [{ key: 'Note', value: 'Hand wash' }], features: [{ point: 'Soft', explanation: 'Comfort' }], sellerFacts: { materials: 'Cotton' } }, imageFiles: [image], videoFiles: [video], coverImageIndex: 0, selectedCollections: ['collection'], attributes: [{ name: 'color', options: ['Red'] }], optionInputs: ['uncommitted'], defaultStock: 3, stockOverrides: { '["Red"]': 5 }, variantDetails: { '["Red"]': { sku: 'RED', price: '120', lowStockThreshold: 0 } } },
        entries: [['title', 'Shirt'], ['images', image], ['videos', video], ['variantMatrix', '{"attributes":[{"name":"color","options":["Red"]}]}']]
    };
};
const fail = (status, code = '', error = 'Injected failure') => Object.assign(new Error(error), { response: { status, data: { code, error } } });
const tick = () => new Promise(resolve => setTimeout(resolve, 5));
async function idle(manager) { for (let i = 0; i < 200 && manager.running.size; i++) await tick(); assert.equal(manager.running.size, 0); }
function setup(api = {}) {
    const stored = new Map();
    const notifications = [];
    const store = { list: async s => [...stored.values()].filter(r => r.scope === s), put: async r => { stored.set(r.id, structuredClone(r)); }, remove: async (_s, id) => stored.delete(id) };
    const manager = new ProductSubmissionManager({ scope, store, api: { get: async () => ({ data: { success: true, data: { state: 'failed' } } }), post: async () => ({ data: { success: true, data: { _id: productId } } }), ...api }, retryDelay: () => 0, notify: (...args) => notifications.push(args) });
    return { manager, stored, notifications, store };
}

test('durable handoff returns before server success; transfer progress and confirmation have distinct states', async () => {
    let finish;
    const { manager, stored, notifications } = setup({ post: (_url, data, config) => { assert(data instanceof FormData); config.onUploadProgress({ loaded: 10, total: 20 }); return new Promise(resolve => { finish = resolve; }); } });
    const id = await manager.enqueue(fixture());
    await tick();
    assert(stored.get(id).snapshot);
    assert.equal(manager.records.get(id).state, 'uploading');
    assert.equal(manager.records.get(id).progress, 50);
    assert.equal(notifications.length, 0);
    finish({ data: { success: true, data: { _id: productId } } });
    await idle(manager);
    assert.equal(manager.records.get(id).state, 'saved');
    assert.equal(stored.get(id).entries, undefined);
    assert.equal(notifications[0][0], 'success');
});

test('quota or storage failures prevent requests and handoff', async () => {
    const { manager } = setup({ post: () => assert.fail('No request before durable handoff') });
    manager.store.put = async () => { throw new Error('Quota exceeded'); };
    await assert.rejects(manager.enqueue(fixture()), /Quota/);
    assert.equal(manager.records.size, 0);
});

test('validation failure is never retried; complete variants, content, images and video survive', async () => {
    let calls = 0;
    const { manager, stored } = setup({ post: async () => { calls++; throw fail(400); } });
    const input = fixture();
    const id = await manager.enqueue(input);
    await idle(manager);
    assert.equal(calls, 1);
    assert.equal(manager.records.get(id).state, 'failed');
    assert.equal(manager.records.get(id).editable, true);
    assert.deepEqual(stored.get(id).snapshot, structuredClone(input.snapshot));
    assert.equal(await stored.get(id).snapshot.imageFiles[0].text(), 'real image bytes');
    assert.equal(await stored.get(id).snapshot.videoFiles[0].text(), 'video bytes');
});

test('transient server and upload failures use bounded retries with the same identifier', async () => {
    for (const code of ['', 'PRODUCT_UPLOAD_FAILED']) {
        const keys = [];
        const { manager } = setup({ post: async (_u, _d, config) => { keys.push(config.headers['X-Product-Submission']); throw fail(503, code); } });
        const id = await manager.enqueue(fixture());
        await idle(manager);
        assert.equal(keys.length, 3);
        assert.deepEqual([...new Set(keys)], [id]);
        assert.equal(manager.records.get(id).kind, code ? 'upload' : 'server');
    }
});

test('a lost response reconciles server success without another POST', async () => {
    let calls = 0;
    const { manager, notifications } = setup({ post: async () => { calls++; throw new Error('Connection lost'); }, get: async () => ({ data: { success: true, data: { state: 'completed', productId } } }) });
    const id = await manager.enqueue(fixture());
    await idle(manager);
    assert.equal(calls, 1);
    assert.equal(manager.records.get(id).state, 'saved');
    assert.equal(notifications.filter(([kind]) => kind === 'success').length, 1);
});

test('missing backend confirmation cannot produce a success notification', async () => {
    const { manager, notifications } = setup({ post: async () => ({ data: { success: true } }), get: async () => ({ data: { success: true, data: { state: 'processing' } } }) });
    const id = await manager.enqueue(fixture());
    await idle(manager);
    assert.equal(manager.records.get(id).state, 'recovery');
    assert.equal(manager.records.get(id).editable, false);
    assert(!notifications.some(([kind]) => kind === 'success'));
});

test('multiple independent submissions complete out of order and duplicate retries do not post twice', async () => {
    const pending = [];
    const { manager } = setup({ post: (_u, _d, config) => new Promise(resolve => pending.push({ resolve, id: config.headers['X-Product-Submission'] })) });
    const first = await manager.enqueue(fixture());
    const second = await manager.enqueue(fixture());
    await tick();
    void manager.run(first);
    assert.equal(pending.length, 2);
    pending[1].resolve({ data: { success: true, data: { _id: 'b'.repeat(24) } } });
    await tick();
    assert.equal(manager.records.get(second).state, 'saved');
    assert.notEqual(manager.records.get(first).state, 'saved');
    pending[0].resolve({ data: { success: true, data: { _id: productId } } });
    await idle(manager);
    assert.equal(manager.records.get(first).productId, productId);
});

test('refresh marks interrupted requests as recovery and reconciles without auto publishing', async () => {
    const { manager, store, stored } = setup();
    const record = { ...fixture(), id: crypto.randomUUID(), scope, state: 'saving', createdAt: Date.now() };
    await store.put(record);
    manager.api.post = () => assert.fail('Refresh must not auto publish');
    manager.api.get = async () => { throw new Error('Offline'); };
    await manager.start();
    assert.equal(stored.get(record.id).state, 'recovery');
    assert(stored.get(record.id).snapshot);
});

test('scope change aborts transport and suppresses stale completion and notifications', async () => {
    let finish;
    let signal;
    const { manager, notifications } = setup({ post: (_u, _d, config) => { signal = config.signal; return new Promise(resolve => { finish = resolve; }); } });
    const id = await manager.enqueue(fixture());
    await tick();
    manager.dispose();
    finish({ data: { success: true, data: { _id: productId } } });
    await idle(manager);
    assert(signal.aborted);
    assert.notEqual(manager.records.get(id).state, 'saved');
    assert.equal(notifications.length, 0);
});

test('expired authentication pauses automatic retries and requires the original signed in scope', async () => {
    let calls = 0;
    const { manager } = setup({ post: async () => { calls++; throw fail(401); }, get: async () => ({ data: { user: { _id: 'other', shop_id: 'shop', role: 'VendorAdmin' } } }) });
    const id = await manager.enqueue(fixture());
    await idle(manager);
    assert.equal(calls, 1);
    assert(manager.paused);
    await assert.rejects(manager.retry(id), /original account/);
    await assert.rejects(manager.enqueue(fixture()), /Sign in/);
});

test('scope includes both tenant and actor, and restored collections never include other scopes', async () => {
    assert.equal(productSubmissionScope({ _id: 'a', shop_id: 'b', role: 'VendorAdmin' }), 'a:b');
    assert.equal(productSubmissionScope({ _id: 'a', shop_id: 'b', role: 'Customer' }), '');
    const { manager, store } = setup();
    await store.put({ id: 'foreign', scope: 'other:shop', state: 'failed' });
    await manager.start();
    assert.equal(manager.records.size, 0);
});

test('error classification distinguishes invalid media, invalid data, permission, transient and uncertain operations', () => {
    assert.equal(classifySubmissionError(fail(400, 'INVALID_PRODUCT_MEDIA')).kind, 'upload');
    assert.equal(classifySubmissionError(fail(400)).transient, false);
    assert.equal(classifySubmissionError(fail(403)).transient, false);
    assert.equal(classifySubmissionError(fail(429)).transient, true);
    assert.equal(classifySubmissionError(fail(409, 'SUBMISSION_PROCESSING')).kind, 'uncertain');
});

test('corrections keep the logical identifier while updating the fingerprint only after definitive rejection', async () => {
    const keys = [];
    const { manager } = setup({ post: async (_u, _d, config) => { keys.push(config.headers); if (keys.length === 1) throw fail(400); return { data: { success: true, data: { _id: productId } } }; } });
    const id = await manager.enqueue(fixture());
    await idle(manager);
    const corrected = fixture();
    corrected.snapshot.formData.title = 'Corrected title';
    corrected.entries[0][1] = 'Corrected title';
    await manager.enqueue({ ...corrected, id });
    await idle(manager);
    assert.equal(keys[0]['X-Product-Submission'], keys[1]['X-Product-Submission']);
    assert.notEqual(keys[0]['X-Product-Fingerprint'], keys[1]['X-Product-Fingerprint']);
    assert.equal(manager.records.size, 1);
    assert.equal(manager.records.get(id).state, 'saved');
});

test('late transport events cannot turn confirmed success back into saving', async () => {
    let progress;
    const { manager } = setup({ post: async (_u, _d, config) => { progress = config.onUploadProgress; return { data: { success: true, data: { _id: productId } } }; } });
    const id = await manager.enqueue(fixture());
    await idle(manager);
    progress({ loaded: 10, total: 10 });
    assert.equal(manager.records.get(id).state, 'saved');
});

test('storage filling up after the request cannot hide confirmed server success', async () => {
    const { manager, notifications } = setup({ post: async () => {
        manager.store.put = async () => { throw new Error('Disk full'); };
        return { data: { success: true, data: { _id: productId } } };
    } });
    const id = await manager.enqueue(fixture());
    await idle(manager);
    assert.equal(manager.records.get(id).state, 'saved');
    assert.equal(notifications[0][0], 'success');
});

test('concurrent Check Status actions share one GET and never POST', async () => {
    let finish, reads = 0;
    const { manager, store } = setup({ get: () => { reads++; return new Promise(resolve => { finish = resolve; }); }, post: () => assert.fail('Check Status is GET only') });
    const record = { ...fixture(), id: crypto.randomUUID(), scope, state: 'recovery' };
    await store.put(record); manager.records.set(record.id, record);
    const first = manager.checkStatus(record.id), second = manager.checkStatus(record.id), third = manager.checkStatus(record.id);
    assert.equal(first, second); assert.equal(first, third); assert.equal(reads, 1);
    finish({ data: { success: true, data: { state: 'processing', retryAfter: 120 } } });
    await first;
    assert.equal(manager.records.get(record.id).editable, false);
    assert.equal(manager.records.get(record.id).canRetryOriginal, false);
    assert.equal(manager.checking.size, 0);
});

test('malformed completion and failed status checks never enable editing or lose the form', async () => {
    for (const response of [{ data: { success: true, data: { state: 'completed', productId: 'invalid' } } }, { data: { data: { state: 'completed', productId } } }]) {
        const { manager, store, notifications } = setup({ get: async () => response });
        const record = { ...fixture(), id: crypto.randomUUID(), scope, state: 'failed', editable: true, error: 'Original validation error' };
        await store.put(record); manager.records.set(record.id, record);
        await assert.rejects(manager.checkStatus(record.id));
        assert.equal(manager.records.get(record.id).state, 'recovery');
        assert.equal(manager.records.get(record.id).editable, false);
        assert.deepEqual(manager.records.get(record.id).snapshot, record.snapshot);
        assert.equal(notifications.length, 0);
    }
});

test('expired sessions lock prior editable recovery and retain original problem and media', async () => {
    const { manager, store } = setup({ get: async () => { throw fail(401); } });
    const record = { ...fixture(), id: crypto.randomUUID(), scope, state: 'failed', editable: true, error: 'Original upload problem' };
    await store.put(record); manager.records.set(record.id, record);
    await assert.rejects(manager.checkStatus(record.id), /Sign in/);
    assert.equal(manager.records.get(record.id).editable, false);
    assert.equal(manager.records.get(record.id).originalError, 'Original upload problem');
    assert.deepEqual(manager.records.get(record.id).snapshot, record.snapshot);
    assert(manager.paused);
});

test('a second tab hydrates a live browser save without changing its stored state or posting', async () => {
    const { manager, store, stored } = setup({ get: async () => ({ data: { success: true, data: { state: 'not_found' } } }), post: () => assert.fail('Hydration never reposts') });
    const record = { ...fixture(), id: crypto.randomUUID(), scope, state: 'uploading', browserLock: { owner: 'other-tab', until: Date.now() + 30000 } };
    await store.put(record);
    await manager.start();
    assert.equal(manager.records.get(record.id).state, 'uploading');
    assert.equal(stored.get(record.id).state, 'uploading');
    manager.dispose();
});

test('discard rechecks the receipt, refuses active or uncertain outcomes, and cannot remove a concurrent retry', async () => {
    for (const state of ['processing', 'not_found', 'completed']) {
        const { manager, store, stored } = setup({ get: async () => ({ data: { success: true, data: { state, productId, retryAfter: 10 } } }) });
        const record = { ...fixture(), id: crypto.randomUUID(), scope, state: 'failed', editable: true };
        await store.put(record); manager.records.set(record.id, record);
        await assert.rejects(manager.discard(record.id), /confirmed rejected/);
        assert(stored.has(record.id));
    }
    const { manager, store, stored } = setup();
    const record = { ...fixture(), id: crypto.randomUUID(), scope, state: 'failed', editable: true, revision: 1 };
    await store.put(record); manager.records.set(record.id, record);
    store.remove = async (_scope, id) => {
        stored.set(id, { ...stored.get(id), state: 'uploading', revision: 3 });
        throw Object.assign(new Error('Changed in another tab'), { code: 'PRODUCT_STORAGE_CONFLICT' });
    };
    await assert.rejects(manager.discard(record.id), /another tab/);
    assert(stored.get(record.id).snapshot);
});

test('a delayed status response cannot resurrect a discarded record', async () => {
    let finish;
    const { manager, store, stored } = setup({ get: () => new Promise(resolve => { finish = resolve; }) });
    const record = { ...fixture(), id: crypto.randomUUID(), scope, state: 'recovery' };
    await store.put(record); manager.records.set(record.id, record);
    const pending = manager.checkStatus(record.id);
    stored.delete(record.id); manager.records.delete(record.id);
    finish({ data: { success: true, data: { state: 'failed' } } });
    await pending;
    assert.equal(stored.has(record.id), false);
    assert.equal(manager.records.has(record.id), false);
});

test('shared notification claims deduplicate success across managers while both receive confirmed state', async () => {
    const first = setup();
    const claims = new Set();
    first.store.claimNotification = async (_s, id, kind, signature) => { const key = `${id}:${kind}:${signature}`; if (claims.has(key)) return false; claims.add(key); return true; };
    const secondNotifications = [];
    const second = new ProductSubmissionManager({ scope, store: first.store, api: first.manager.api, notify: (...args) => secondNotifications.push(args) });
    const record = { ...fixture(), id: crypto.randomUUID(), scope, state: 'recovery' };
    await first.store.put(record); first.manager.records.set(record.id, record); second.records.set(record.id, record);
    await Promise.all([first.manager.succeed(record, productId), second.succeed(record, productId)]);
    assert.equal(first.notifications.length + secondNotifications.length, 1);
    assert.equal(first.manager.records.get(record.id).state, 'saved');
    assert.equal(second.records.get(record.id).state, 'saved');
    assert.equal(first.stored.get(record.id).snapshot, undefined);
});

test('release and cross-tab refresh cannot downgrade a confirmed save when persistent success storage fails', async () => {
    const { manager, stored, store } = setup();
    store.acquire = async (_s, id) => stored.get(id);
    store.renew = async () => true;
    store.release = async (_s, id) => ({ ...stored.get(id), state: 'recovery', browserLock: undefined });
    const put = store.put;
    store.put = async (record, options) => { if (options?.confirmed) throw new Error('Disk full'); return put(record); };
    const id = await manager.enqueue(fixture());
    await idle(manager);
    assert.equal(manager.records.get(id).state, 'saved');
    await manager.sync();
    assert.equal(manager.records.get(id).state, 'saved');
    manager.dispose();
});
