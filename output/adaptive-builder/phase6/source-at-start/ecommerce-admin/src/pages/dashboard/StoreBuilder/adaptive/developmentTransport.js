import { normalizeStoredTheme } from '@scaleup/storefront-theme/storage';
import { createPreviewBootstrap } from './previewState.js';

export function createDevelopmentTransport(grant, storage = window.localStorage) {
    if (grant?.scope !== 'synthetic-local-only' || !/^[a-f\d]{24}$/i.test(grant.shopId) || !/^[a-f\d]{24}$/i.test(grant.actorId)) throw new Error('A valid authenticated development grant is required.');
    const scope = `${grant.shopId}:${grant.actorId}`, key = `scaleup:adaptive-development:${scope}`;
    const bootstrap = createPreviewBootstrap(); bootstrap.developmentScope = scope;
    const clone = value => structuredClone(value);
    const read = () => {
        const raw = storage.getItem(key); if (!raw) return null;
        try {
            if (raw.length > 1024 * 1024) throw new Error('Local development draft is too large.');
            const record = JSON.parse(raw);
            if (record.formatVersion !== 1) throw new Error('Unknown local development draft format. The copy has been preserved.');
            record.draft.theme = normalizeStoredTheme(record.draft.theme);
            return record.draft;
        } catch (error) { throw new Error(`Local draft cannot be opened: ${error.message}`, { cause: error }); }
    };
    const conflict = () => {
        const error = new Error('Local preview draft changed in another tab. Reload before saving.');
        error.response = { status: 409, data: { error: error.message } }; throw error;
    };
    const blocked = () => { throw new Error('This synthetic workspace cannot publish, upload or modify merchant data.'); };
    return Object.freeze({
        async get(url) {
            if (url === '/store-builder/admin') return { data: { bootstrap: { ...clone(bootstrap), draft: read() } } };
            if (url.endsWith('/seo/bootstrap')) return { data: { data: { themeRevision: 0 } } };
            if (url.includes('/products')) return { data: { data: { products: clone(bootstrap.products), pagination: { page: 1, pages: 1 } } } };
            if (url.includes('/reviews')) return { data: { data: { reviews: [], pagination: { page: 1, pages: 1 } } } };
            if (url.endsWith('/revisions')) return { data: { data: [] } };
            return blocked();
        },
        async put(url, payload) {
            if (url !== '/store-builder/admin/draft' || payload.expectedShopId !== bootstrap.shop._id) return blocked();
            const before = read();
            if (payload.basedOnRevision !== 0 || (payload.expectedDraftUpdatedAt || null) !== (before?.updatedAt || null)) conflict();
            const theme = normalizeStoredTheme(payload.theme);
            const draft = { theme, searchAliases: clone(payload.searchAliases || []), customDomain: clone(payload.customDomain || {}),
                storewideDiscount: payload.storewideDiscount || 0, basedOnRevision: 0,
                updatedAt: new Date(Math.max(Date.now(), Date.parse(before?.updatedAt || 0) + 1)).toISOString(), stale: false };
            const serialized = JSON.stringify({ formatVersion: 1, draft });
            if (serialized.length > 1024 * 1024) throw new Error('Local development draft is too large.');
            storage.setItem(key, serialized); return { data: { data: clone(draft) } };
        },
        async delete(url, options) {
            if (url !== '/store-builder/admin/draft' || options?.data?.expectedShopId !== bootstrap.shop._id) return blocked();
            const before = read(); if ((options.data.expectedDraftUpdatedAt || null) !== (before?.updatedAt || null)) conflict();
            storage.removeItem(key); return { data: {} };
        },
        post: blocked, patch: blocked,
    });
}
