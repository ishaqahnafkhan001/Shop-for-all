const DB_NAME = 'shop-product-submissions';
export const MAX_UNFINISHED_PRODUCTS = 100;
export const PRODUCT_TAB_LEASE_MS = 30000;
let database;
let channel;
const listeners = new Set();
const keyFor = (scope, id) => `${scope}/${id}`;
const revisionOf = value => Number.isSafeInteger(value) && value >= 0 && value < Number.MAX_SAFE_INTEGER ? value : 0;
const conflict = record => Object.assign(new Error('This product changed in another dashboard tab. Check its current status before continuing.'), { code: 'PRODUCT_STORAGE_CONFLICT', record });
function activityChannel() {
    if (!channel && typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('shop-product-activity');
        channel.onmessage = ({ data }) => {
            if (data?.version !== 1 || typeof data.scope !== 'string' || typeof data.id !== 'string') return;
            for (const listener of listeners) if (listener.scope === data.scope) listener.callback();
        };
    }
    return channel;
}
function openDatabase() {
    if (!database) database = new Promise((resolve, reject) => {
        if (!globalThis.indexedDB) return reject(new Error('Recovery storage is unavailable in this browser. Keep your form open.'));
        const request = indexedDB.open(DB_NAME, 2);
        request.onupgradeneeded = () => {
            const store = request.result.objectStoreNames.contains('submissions') ? request.transaction.objectStore('submissions') : request.result.createObjectStore('submissions', { keyPath: 'storageKey' });
            if (!store.indexNames.contains('scope')) store.createIndex('scope', 'scope');
        };
        request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); database = undefined; }; resolve(db); };
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('Close older dashboard tabs to enable recovery storage.'));
    }).catch(error => { database = undefined; throw error; });
    return database;
}
async function read(scope, id) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('submissions', 'readonly');
        const store = tx.objectStore('submissions');
        const request = id === undefined ? store.index('scope').getAll(scope) : store.get(keyFor(scope, id));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error || request.error);
        tx.onabort = () => reject(tx.error || new Error('Recovery storage could not be read.'));
    });
}
// Business revisions protect against delayed writes and deletion/retry races across tabs.
async function mutate(scope, id, update, capacity = false) {
    const db = await openDatabase();
    const value = await new Promise((resolve, reject) => {
        const tx = db.transaction('submissions', 'readwrite');
        const store = tx.objectStore('submissions');
        let result, failure, changed = false;
        const apply = records => {
            const request = store.get(keyFor(scope, id));
            request.onsuccess = () => {
                try {
                    const change = update(request.result, records);
                    result = change.value;
                    if (change.remove) { store.delete(keyFor(scope, id)); changed = true; }
                    else if (change.record) { store.put({ ...change.record, storageKey: keyFor(scope, id) }); changed = true; }
                } catch (error) { failure = error; tx.abort(); }
            };
        };
        if (capacity) { const request = store.index('scope').getAll(scope); request.onsuccess = () => apply(request.result); }
        else apply();
        tx.oncomplete = () => { if (changed) activityChannel()?.postMessage({ version: 1, scope, id }); resolve(result); };
        tx.onerror = () => reject(failure || tx.error);
        tx.onabort = () => reject(failure || tx.error || new Error('Recovery storage could not be saved. Check device storage.'));
    });
    return value;
}
export const productSubmissionStore = {
    list: scope => read(scope), get: (scope, id) => read(scope, id),
    subscribe(scope, callback) {
        const listener = { scope, callback }; listeners.add(listener); activityChannel();
        return () => { listeners.delete(listener); if (!listeners.size && channel) { channel.close(); channel = undefined; } };
    },
    put(record, { create = false, confirmed = false } = {}) {
        return mutate(record.scope, record.id, (current, records) => {
            if (!current && !create) throw conflict(null);
            if (!current && records.filter(item => item.state !== 'saved').length >= MAX_UNFINISHED_PRODUCTS) throw new Error('You have 100 unfinished products on this browser. Review or discard a rejected recovery before adding another. Your current form is still open.');
            if (current?.state === 'saved' && !confirmed) return { value: current };
            if (current && !confirmed && revisionOf(current.revision) !== revisionOf(record.revision)) throw conflict(current);
            if (current?.browserLock?.until > Date.now() && current.browserLock.owner !== record.browserLock?.owner && !confirmed) throw conflict(current);
            const next = { ...record, revision: revisionOf(current?.revision) + 1, _notified: current?._notified || {}, browserLock: confirmed ? undefined : current?.browserLock && current.browserLock.owner === record.browserLock?.owner ? current.browserLock : record.browserLock };
            return { record: next, value: next };
        }, create);
    },
    acquire(scope, id, owner) {
        return mutate(scope, id, current => {
            if (!current || current.state === 'saved' || (current.browserLock?.until > Date.now() && current.browserLock.owner !== owner)) return { value: null };
            const next = { ...current, revision: revisionOf(current.revision) + 1, browserLock: { owner, until: Date.now() + PRODUCT_TAB_LEASE_MS, purpose: 'saving' } };
            return { record: next, value: next };
        });
    },
    renew(scope, id, owner) {
        return mutate(scope, id, current => {
            if (!current || current.browserLock?.owner !== owner) return { value: false };
            const next = { ...current, browserLock: { ...current.browserLock, until: Date.now() + PRODUCT_TAB_LEASE_MS } };
            return { record: next, value: true };
        });
    },
    release(scope, id, owner) {
        return mutate(scope, id, current => {
            if (!current || current.browserLock?.owner !== owner) return { value: current };
            const interrupted = ['preparing', 'uploading', 'saving'].includes(current.state);
            const next = { ...current, revision: revisionOf(current.revision) + 1, browserLock: undefined, ...(interrupted && { state: 'recovery', editable: false, error: 'This browser save was interrupted. Check the server status before continuing.' }) };
            return { record: next, value: next };
        });
    },
    claimNotification(scope, id, kind, signature) {
        return mutate(scope, id, current => {
            if (!current || current._notified?.[kind] === signature) return { value: false };
            const next = { ...current, _notified: { ...current._notified, [kind]: signature } };
            return { record: next, value: true };
        });
    },
    remove(scope, id, revision) {
        return mutate(scope, id, current => {
            if (!current) return { value: true };
            if ((revision !== undefined && revisionOf(current.revision) !== revision) || current.browserLock?.until > Date.now()) throw conflict(current);
            return { remove: true, value: true };
        });
    }
};
