import { inspectRecovery, normalizeSubmission, validSubmissionId, validProductId } from './productSubmissionRecovery.js';
import { MAX_UNFINISHED_PRODUCTS, PRODUCT_TAB_LEASE_MS } from './productSubmissionStore.js';
export const ACTIVE_PRODUCT_STATES = ['preparing', 'uploading', 'saving'];
export const productSubmissionScope = user => {
    const actor = user?._id || user?.id;
    const shop = user?.shop_id || user?.shopId || user?.shop?._id || user?.shop?.id;
    return actor && shop && ['VendorAdmin', 'VendorStaff'].includes(user.role) ? `${actor}:${shop}` : '';
};
export const submissionHeaders = (scope, id, fingerprint) => {
    const [actor, shop] = scope.split(':');
    return { 'X-Product-Actor': actor, 'X-Product-Shop': shop, ...(id && { 'X-Product-Submission': id, 'X-Product-Fingerprint': fingerprint }) };
};

export async function fingerprintEntries(entries) {
    const digest = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', value))].map(byte => byte.toString(16).padStart(2, '0')).join('');
    const fields = [];
    for (const [name, value] of entries) fields.push([name, value instanceof Blob ? { name: value.name, type: value.type, hash: await digest(await value.arrayBuffer()) } : value]);
    return digest(new TextEncoder().encode(JSON.stringify(fields)));
}

export function classifySubmissionError(error) {
    const status = error.response?.status;
    const body = error.response?.data;
    const message = body?.error || body?.message || error.message || 'Unable to save product.';
    if (status === 401 || body?.code === 'PRODUCT_SCOPE_CHANGED') return { kind: 'authentication', message, transient: false };
    if (status === 403) return { kind: 'permission', message, transient: false };
    if (body?.code === 'INVALID_PRODUCT_MEDIA' || body?.code === 'PRODUCT_UPLOAD_FAILED') return { kind: 'upload', message, transient: status >= 500 };
    if (body?.code === 'SUBMISSION_PROCESSING' || body?.code === 'SUBMISSION_CONTENT_CHANGED') return { kind: 'uncertain', message, transient: false };
    if (status === 408 || status === 429 || status >= 500) return { kind: 'server', message, transient: true };
    if (status) return { kind: 'validation', message, transient: false };
    return { kind: 'network', message, transient: true };
}

// Owns requests outside form components. IndexedDB is the handoff boundary.
export class ProductSubmissionManager {
    constructor({ scope, api, store, changed = () => {}, notify = () => {}, catalogChanged = () => {}, storageFailed = () => {}, retryDelay = attempt => 1000 * 2 ** attempt }) {
        Object.assign(this, { scope, api, store, changed, notify, catalogChanged, storageFailed, retryDelay });
        this.records = new Map();
        this.running = new Map();
        this.active = true;
        this.paused = false;
        this.clientId = crypto.randomUUID();
        this.checking = new Map();
        this.statusControllers = new Set();
        this.notifications = new Set();
    }
    list() { return [...this.records.values()].filter(Boolean).sort((a, b) => (Number.isFinite(b.createdAt) ? b.createdAt : 0) - (Number.isFinite(a.createdAt) ? a.createdAt : 0)); }
    emit() {
        if (!this.active) return;
        this.changed(this.list());
        clearTimeout(this.leaseTimer);
        const expiries = this.list().map(record => record.browserLock?.until).filter(until => until > Date.now());
        if (expiries.length) this.leaseTimer = setTimeout(() => this.sync().catch(error => this.storageFailed(error.message)), Math.min(...expiries) - Date.now() + 20);
    }
    async save(record, patch, options) {
        const next = { ...record, ...patch, updatedAt: Date.now() };
        let stored;
        try { stored = await this.store.put(next, options) || next; }
        catch (error) {
            if (error.code === 'PRODUCT_STORAGE_CONFLICT') {
                const current = normalizeSubmission(error.record, this.scope);
                if (current) this.records.set(record.id, current);
                else this.records.delete(record.id);
                this.emit();
            } else this.storageFailed(error.message);
            throw error;
        }
        this.syncSequence = (this.syncSequence || 0) + 1;
        this.records.set(stored.id, stored);
        this.emit();
        return stored;
    }
    async sync() {
        const sequence = this.syncSequence = (this.syncSequence || 0) + 1;
        const records = await this.store.list(this.scope);
        if (!this.active || sequence !== this.syncSequence) return;
        const previous = this.records;
        const next = new Map();
        for (const raw of records) {
            const record = normalizeSubmission(raw, this.scope);
            if (!record) continue;
            const local = previous.get(record.id);
            if (local?.state === 'saved' && validProductId(local.productId) && record.state !== 'saved') { next.set(record.id, local); continue; }
            next.set(record.id, record.state !== 'saved' && ((record.revision || 0) < (local?.revision || 0) || (this.running.has(record.id) && (record.revision || 0) === (local?.revision || 0))) ? { ...local, browserLock: record.browserLock } : record);
        }
        this.records = next;
        if ([...next.values()].some(record => record.state === 'saved' && previous.get(record.id)?.state !== 'saved')) this.catalogChanged();
        this.emit();
    }
    async notifyOnce(kind, record) {
        if (!this.active || !record) return;
        if (kind === 'success' ? record.state !== 'saved' || !validProductId(record.productId) : record.state === 'saved') return;
        const signature = kind === 'success' ? 'confirmed' : `${record.fingerprint}:${kind}:${record.originalError || record.error}`;
        const key = `${record.id}:${kind}:${signature}`;
        if (this.notifications.has(key)) return;
        const allowed = this.store.claimNotification ? await this.store.claimNotification(this.scope, record.id, kind, signature).catch(error => { this.storageFailed(error.message); return false; }) : true;
        if (allowed && this.active) { this.notifications.add(key); this.notify(kind, record); }
    }
    async start() {
        this.active = true;
        const generation = this.generation = (this.generation || 0) + 1;
        this.unsubscribe?.();
        this.unsubscribe = this.store.subscribe?.(this.scope, () => this.sync().catch(error => this.storageFailed(error.message)));
        await this.sync();
        if (!this.active || generation !== this.generation) return;
        const records = this.list();
        await Promise.all(records.map(async record => {
            if (!this.active || generation !== this.generation) return;
            if (record.state !== 'saved') await this.checkStatus(record.id).catch(() => {});
        }));
    }
    async enqueue({ snapshot, entries, id }) {
        if (!this.active || this.paused) throw new Error('Sign in again before saving products. Your form is still here.');
        if (id && this.running.has(id)) throw new Error('This product is already being saved.');
        if (id) await this.checkStatus(id);
        const existing = id && this.records.get(id);
        if (existing && !existing.editable) throw new Error('Check the original submission before changing it.');
        if (id && !existing) throw new Error('This recovery is unavailable for the current account and shop.');
        if (existing?.browserLock?.until > Date.now()) throw new Error('This product is still being saved in another dashboard tab.');
        if (!id && this.list().filter(record => record.state !== 'saved').length >= MAX_UNFINISHED_PRODUCTS) throw new Error('Review or discard an unfinished product before adding another. Your form remains open.');
        const fingerprint = await fingerprintEntries(entries);
        if (!this.active) throw new Error('Your account or shop changed. The form has not been submitted.');
        const record = { id: id || crypto.randomUUID(), revision: existing?.revision || 0, scope: this.scope, createdAt: existing?.createdAt || Date.now(), snapshot, entries, fingerprint, title: snapshot.formData.title, state: 'preparing', editable: false, error: '', progress: null, browserLock: this.store.acquire ? { owner: this.clientId, until: Date.now() + PRODUCT_TAB_LEASE_MS, purpose: 'saving' } : undefined };
        await this.save(record, {}, { create: !existing }); // Durable handoff and tab claim precede the POST.
        if (!this.active) throw new Error('Your account or shop changed. Recover the form from the original account.');
        void this.run(record.id);
        return record.id;
    }
    reconcile(id, signal) { return this.checkStatus(id, { signal, internal: true }); }
    checkStatus(id, options = {}) {
        if (this.checking.has(id)) return this.checking.get(id);
        const task = this.performCheck(id, options).finally(() => { this.checking.delete(id); this.emit(); });
        this.checking.set(id, task);
        this.emit();
        return task;
    }
    async performCheck(id, { signal, internal = false } = {}) {
        let record = this.records.get(id);
        if (!record || record.state === 'saved') return record;
        if (!validSubmissionId(id)) throw new Error('This recovery identifier is damaged. Keep the record and check the product catalog.');
        const controller = new AbortController();
        this.statusControllers.add(controller);
        const abort = () => controller.abort();
        signal?.addEventListener('abort', abort, { once: true });
        try {
            const response = await this.api.get(`/admin/product-submissions/${encodeURIComponent(id)}`, { headers: submissionHeaders(this.scope), signal: controller.signal, timeout: 15000 });
            if (!this.active || !this.records.has(id)) return undefined;
            const receipt = response.data?.data;
            if (response.data?.success !== true || !['completed', 'failed', 'processing', 'not_found'].includes(receipt?.state)) throw new Error('The server returned an unrecognized save status. Your recovery is preserved.');
            this.paused = false; // The authenticated endpoint verified this exact actor and shop.
            if (receipt.state === 'completed') {
                if (!validProductId(receipt.productId)) throw new Error('The server has not confirmed a valid product link. Check again later.');
                return this.succeed(this.records.get(id), receipt.productId);
            }
            const current = this.records.get(id);
            if ((current.revision || 0) !== (record.revision || 0)) return current;
            if (!internal && (this.running.has(id) || current.browserLock?.until > Date.now())) return current;
            const editable = receipt.state === 'failed';
            return await this.save(current, { state: editable ? 'failed' : 'recovery', browserLock: current.browserLock?.until > Date.now() ? current.browserLock : undefined, receiptState: receipt.state, checkedAt: Date.now(), canRetryOriginal: receipt.state === 'not_found' || (receipt.state === 'processing' && Number(receipt.retryAfter) === 0), editable, originalError: editable ? receipt.error || current.originalError || current.error : current.originalError, error: editable ? receipt.error || current.originalError || current.error || 'Review the product and try again.' : receipt.state === 'processing' ? 'The server is still processing this product. Check again later.' : 'The server has no confirmed result. The original submission is preserved.', checkError: '' });
        } catch (error) {
            if (!this.active || !this.records.has(id)) throw error;
            if (error.code === 'PRODUCT_STORAGE_CONFLICT') return this.records.get(id);
            const authentication = error.response?.status === 401 || error.response?.data?.code === 'PRODUCT_SCOPE_CHANGED';
            if (authentication) this.paused = true;
            const message = authentication ? 'Sign in to the original account and shop, then check this product again.' : error.response?.status === 403 ? 'Your account cannot check product status. Ask the shop owner to restore product access.' : error.response ? error.response.data?.error || 'Unable to check the save status. Your recovery is preserved.' : 'Unable to reach the server. Your recovery is preserved; reconnect and check again.';
            const current = this.records.get(id);
            if (!this.running.has(id) && !(current.browserLock?.until > Date.now())) await this.save(current, { state: 'recovery', editable: false, canRetryOriginal: false, originalError: current.originalError || current.error, error: message, checkError: message }).catch(() => {});
            throw new Error(message, { cause: error });
        } finally { signal?.removeEventListener('abort', abort); this.statusControllers.delete(controller); }
    }
    async succeed(record, productId) {
        if (!this.active) return record;
        const alreadySaved = this.records.get(record.id)?.state === 'saved';
        const saved = { ...record, state: 'saved', productId, snapshot: undefined, entries: undefined, editable: false, error: '', progress: null, updatedAt: Date.now() };
        // A full disk cannot turn a confirmed server creation into a reported failure.
        let stored;
        try { stored = await this.store.put(saved, { confirmed: true }) || saved; }
        catch (error) { this.storageFailed(error.message); stored = saved; }
        this.syncSequence = (this.syncSequence || 0) + 1;
        this.records.set(saved.id, stored);
        this.emit();
        if (!alreadySaved && this.active) { this.catalogChanged(); await this.notifyOnce('success', stored); }
        const olderSuccesses = this.list().filter(item => item.state === 'saved').slice(10);
        for (const old of olderSuccesses) await this.remove(old.id).catch(() => {});
        return saved;
    }
    async run(id) {
        if (!this.active || this.paused || this.running.has(id)) return;
        const controller = new AbortController();
        this.running.set(id, controller);
        let record = this.records.get(id);
        let heartbeat;
        try {
            if (this.store.acquire) {
                record = await this.store.acquire(this.scope, id, this.clientId);
                if (!record) { await this.sync(); return; }
                this.records.set(id, record);
                heartbeat = setInterval(() => this.store.renew(this.scope, id, this.clientId).catch(error => this.storageFailed(error.message)), 10000);
            }
            for (let attempt = 0; attempt < 3 && this.active && !this.paused; attempt++) {
                record = this.records.get(id);
                if (!record?.entries || record.state === 'saved') return;
                record = await this.save(record, { state: 'uploading', editable: false, error: '', progress: null });
                const data = new FormData();
                record.entries.forEach(([name, value]) => value instanceof Blob ? data.append(name, value, value.name || 'recovered-file') : data.append(name, value));
                try {
                    const response = await this.api.post('/admin/products', data, {
                        signal: controller.signal,
                        timeout: 120000,
                        headers: submissionHeaders(this.scope, id, record.fingerprint),
                        onUploadProgress: event => {
                            if (!this.active || controller.signal.aborted) return;
                            // Transport progress measures transfer to the API, not Cloudinary processing.
                            const current = this.records.get(id);
                            if (!this.running.has(id) || !['uploading', 'saving'].includes(current?.state)) return;
                            this.records.set(id, { ...current, state: event.total && event.loaded >= event.total ? 'saving' : 'uploading', progress: event.total ? Math.min(100, Math.round(event.loaded / event.total * 100)) : null });
                            this.emit();
                        }
                    });
                    if (!this.active) return;
                    const productId = response.data?.success && response.data?.data?._id;
                    if (!/^[a-f\d]{24}$/i.test(productId || '')) throw new Error('The server did not confirm a product identifier.');
                    await this.succeed(record, productId);
                    return;
                } catch (error) {
                    if (!this.active) return;
                    const failure = classifySubmissionError(error);
                    record = await this.save(record, { state: 'recovery', kind: failure.kind, editable: false, error: failure.message, originalError: failure.message, progress: null });
                    if (failure.kind === 'authentication') {
                        this.paused = true;
                        for (const [otherId, request] of this.running) if (otherId !== id) request.abort();
                    }
                    let checked;
                    if (!this.paused) checked = await this.reconcile(id, controller.signal).catch(() => null);
                    if (checked?.state === 'saved') return;
                    // Invalid data and authorization failures always require user action.
                    if (!failure.transient || attempt === 2 || this.paused || controller.signal.aborted) break;
                    await this.save(this.records.get(id), { state: 'preparing', editable: false, error: `Retrying save (${attempt + 2}/3)… ${failure.message}` });
                    await new Promise(resolve => {
                        const timer = setTimeout(resolve, this.retryDelay(attempt));
                        controller.signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
                    });
                }
            }
            if (this.active) await this.notifyOnce(this.records.get(id)?.editable ? 'failure' : 'uncertain', this.records.get(id));
        } catch (error) {
            // Durable initial record remains recoverable even if storage later fills up.
            if (this.active) {
                if (error.code === 'PRODUCT_STORAGE_CONFLICT') { await this.sync().catch(() => {}); return; }
                this.records.set(id, { ...record, state: 'recovery', editable: false, error: `Recovery needs attention: ${error.message}` });
                this.emit();
                await this.notifyOnce('uncertain', this.records.get(id));
            }
        } finally {
            clearInterval(heartbeat);
            const released = await this.store.release?.(this.scope, id, this.clientId).catch(error => this.storageFailed(error.message));
            const latest = this.records.get(id);
            if (released && latest?.state !== 'saved' && (released.revision || 0) >= (latest?.revision || 0)) this.records.set(id, normalizeSubmission(released, this.scope));
            this.running.delete(id); this.emit();
        }
    }
    async retry(id) {
        if (this.running.has(id)) return;
        if (this.paused) {
            const session = await this.api.get('/auth/me');
            if (productSubmissionScope(session.data?.user) !== this.scope) throw new Error('Sign in to the original account and shop before retrying.');
            this.paused = false;
        }
        const checked = await this.checkStatus(id);
        if (checked?.state === 'saved') return;
        if (!checked?.canRetryOriginal || !inspectRecovery(checked).validPayload) throw new Error('Check the server status before retrying. Use Review & Retry for a rejected product.');
        if (checked.browserLock?.until > Date.now()) throw new Error('This product is still saving in another dashboard tab.');
        void this.run(id);
    }
    async discard(id) {
        if (this.running.has(id) || this.checking.has(id)) throw new Error('Wait for this product’s current operation to finish.');
        const checked = await this.checkStatus(id);
        if (!this.active || !checked || checked.scope !== this.scope || checked.state !== 'failed' || !checked.editable || checked.browserLock?.until > Date.now()) throw new Error('Only a confirmed rejected product can be discarded. Check its status first.');
        await this.store.remove(this.scope, id, checked.revision || 0);
        this.syncSequence = (this.syncSequence || 0) + 1;
        this.records.delete(id);
        this.emit();
    }
    async remove(id) {
        if (this.running.has(id)) return;
        const record = this.records.get(id);
        if (record?.state !== 'saved') throw new Error('Use Discard recovery for a confirmed rejected product.');
        await this.store.remove(this.scope, id, record.revision || 0);
        this.syncSequence = (this.syncSequence || 0) + 1;
        this.records.delete(id);
        this.emit();
    }
    dispose() {
        this.active = false;
        this.generation = (this.generation || 0) + 1;
        this.unsubscribe?.();
        clearTimeout(this.leaseTimer);
        for (const request of this.running.values()) request.abort();
        for (const request of this.statusControllers) request.abort();
    }
}
