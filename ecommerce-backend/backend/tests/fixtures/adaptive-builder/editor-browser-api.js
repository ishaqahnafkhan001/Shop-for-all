// Test transport only. Bundler aliases this module for the synthetic fixture;
// production API imports and network/provider calls never reach this adapter.
import fixtures from './editor-fixtures.cjs';
import sized from './contract-fixtures.cjs';
import { normalizeStoredTheme } from '@scaleup/storefront-theme/storage';
import prebuilt from '@scaleup/storefront-theme/prebuilt';
const scenario = new URLSearchParams(location.search).get('size') === '200' ? 'limit' : new URLSearchParams(location.search).get('presentation') === 'atelier' ? 'atelier' : 'default';
const key = 'adaptive-phase4:isolated-server' + (scenario === 'default' ? '' : ':' + scenario);
let bootstrap;
const clone = value => JSON.parse(JSON.stringify(value));
const state = () => {
    if (!bootstrap) {
        try { bootstrap = JSON.parse(localStorage.getItem(key)); } catch { /* Isolated fixture storage is optional. */ }
        if (!bootstrap) {
            bootstrap = fixtures.editorBootstrap();
            if (scenario === 'limit') bootstrap.shop.theme = normalizeStoredTheme({ version: 5, siteBuilder: sized.sizedFixture(200) });
            if (scenario === 'atelier') bootstrap.shop.theme = normalizeStoredTheme({ ...prebuilt.resolvePrebuiltTheme({ presetId: 'atelier-editorial', appliedAt: '2026-10-01T00:00:00.000Z' }), version: 5, siteBuilder: bootstrap.shop.theme.siteBuilder });
        }
        if (new URLSearchParams(location.search).get('readonly') === 'yes') bootstrap.adaptiveAvailability.available = false;
    }
    return bootstrap;
};
const emit = kind => { localStorage.setItem(key, JSON.stringify(state())); window.dispatchEvent(new CustomEvent('adaptive-fixture-write', { detail: kind })); };
window.addEventListener('adaptive-fixture-conflict', () => { if (state().draft) { state().draft.updatedAt = new Date().toISOString(); emit('other-writer'); } });
const conflict = () => { throw { response: { status: 409, data: { error: 'Synthetic draft conflict', latestRevision: state().publication.revision } } }; };
const api = {
    async get(url) {
        const current = state();
        if (url === '/store-builder/admin') return { data: { bootstrap: clone(current) } };
        if (url.endsWith('/seo/bootstrap')) return { data: { data: { themeRevision: current.publication.revision } } };
        if (url.includes('/products')) return { data: { data: { products: current.products, categories: current.categories, pagination: { page: 1, pages: 1 } } } };
        if (url.includes('/reviews')) return { data: { data: { reviews: [], pagination: { page: 1, pages: 1 } } } };
        throw new Error('Unmocked synthetic GET blocked: ' + url);
    },
    async put(url, payload) {
        if (url !== '/store-builder/admin/draft') throw new Error('Unmocked synthetic write blocked');
        const current = state();
        if (payload.expectedShopId !== current.shop._id) throw new Error('Synthetic tenant mismatch');
        if ((payload.expectedDraftUpdatedAt || null) !== (current.draft?.updatedAt || null) || payload.basedOnRevision !== current.publication.revision) conflict();
        current.draft = { ...clone(payload), updatedAt: new Date().toISOString(), stale: false };
        emit('draft'); return { data: { data: clone(current.draft) } };
    },
    async delete(url, config) {
        if (url !== '/store-builder/admin/draft') throw new Error('Synthetic delete blocked');
        const current = state();
        if (config?.data?.expectedShopId !== current.shop._id || (config?.data?.expectedDraftUpdatedAt || null) !== (current.draft?.updatedAt || null)) conflict();
        current.draft = null; emit('discard'); return { data: {} };
    },
    async patch() { throw new Error('Publication is deliberately blocked by this browser fixture.'); },
    async post() { throw new Error('Upload/provider/revision writes are deliberately blocked by this browser fixture.'); },
};
export default api;
