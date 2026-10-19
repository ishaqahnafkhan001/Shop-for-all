import React, { useState } from 'react';
import axios from 'axios';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import API from '../../src/api/api.js';
import { AuthProvider } from '../../src/context/AuthContext.jsx';
import ProductAiAssistant from '../../src/components/products/ProductAiAssistant.jsx';
import CatalogTools from '../../src/pages/dashboard/CatalogTools.jsx';
import GrowthCenter from '../../src/pages/dashboard/GrowthCenter.jsx';
import HomepageSeoPage from '../../src/pages/dashboard/Seo/HomepageSeoPage.jsx';
import '../../src/index.css';

const product = { _id: '507f1f77bcf86cd799439011', updatedAt: new Date().toISOString(), title: 'Cotton shirt', category: 'Clothing', images: [], pricing: { sellingPrice: 500 }, status: 'Draft', description: 'Original description', seo: { title: '', description: '' } };
const calls = [];
const history = new Map(), drafts = new Map(), generations = new Map();
let failNext = false, delayMs = 0, seoDraft = {}, revision = 0;
const meta = { source: 'provider', operationId: 'fixture', promptVersion: '3.0.0' };
const suggestions = { description: 'A cotton shirt with clear product details.', seoTitle: 'Cotton Shirt | Fixture Store', seoDescription: 'Compare the cotton shirt options and product details.', imageAlt: 'Cotton shirt',
    sellingPoints: [{ point: 'Cotton fabric', reason: 'The supplied material is cotton.' }], specifications: [{ label: 'Material', value: 'Cotton' }], extraNotes: ['Review the size chart.'] };
// Every request is intercepted. This fixture never contacts a backend or paid provider.
API.defaults.adapter = async config => {
    const id = config.headers.get?.('x-ai-request-id') || config.headers['x-ai-request-id'];
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    const url = config.url;
    const reply = data => ({ data, status: 200, statusText: 'OK', headers: {}, config });
    if (url === '/auth/me') return reply({ success: true, user: { _id: 'fixture-user', role: 'VendorAdmin', planAccess: { usage: { ai: { used: 0, pending: 0, available: 10, limit: 10 } }, featureStatuses: {}, storeBuilderCapabilities: {} } } });
    if (url.includes('csrf')) return reply({ csrfToken: 'fixture' });
    if (url.startsWith('/admin/ai/history')) {
        const itemId = url.split('/')[4], item = history.get(itemId);
        if (config.method === 'get' && !itemId) return reply({ data: [...history.values()] });
        if (config.method === 'get') return reply({ data: { entry: item, current: product, currentVersion: product.updatedAt, stale: item.entityVersion !== product.updatedAt } });
        if (config.method === 'delete') history.delete(itemId);
        else if (!itemId) {
            const generated = generations.get(body.operationId);
            const entry = { _id: crypto.randomUUID(), content: Object.fromEntries(['description', 'seoTitle', 'seoDescription', 'imageAlt'].map(key => [key, generated.data[key]])),
                provenance: generated.meta, entityVersion: product.updatedAt, createdAt: new Date().toISOString() };
            history.set(entry._id, entry); return reply({ data: entry });
        } else if (url.endsWith('/feedback')) item.feedback = body.reason;
        else item.application = { state: 'applied_to_form' };
        return reply({ success: true });
    }
    if (url.startsWith('/admin/growth/campaign-drafts')) {
        const itemId = url.split('/')[4];
        if (config.method === 'get') return reply({ data: [...drafts.values()] });
        if (config.method === 'delete') { drafts.delete(itemId); return reply({ success: true }); }
        const source = itemId && url.endsWith('/duplicate') ? drafts.get(itemId) : body;
        const duplicate = url.endsWith('/duplicate');
        const entry = { ...source, _id: duplicate ? crypto.randomUUID() : itemId || crypto.randomUUID(), version: (source.version || 0) + 1 };
        drafts.set(entry._id, entry); return reply({ data: entry });
    }
    if (id) {
        calls.push(id); document.getElementById('operation-log').textContent = calls.join('\n');
        if (delayMs) await new Promise(resolve => setTimeout(resolve, delayMs));
        if (failNext) { failNext = false; throw new Error('Simulated lost response. Retry the same operation.'); }
        let data = suggestions;
        if (url.includes('collections')) data = { name: 'Cotton collection', slug: 'cotton-collection', description: suggestions.description, seoTitle: suggestions.seoTitle, seoDescription: suggestions.seoDescription, keywords: ['Cotton'] };
        if (url.includes('seo/ai')) data = { meta, alternatives: [1, 2, 3].map(i => ({ id: String(i), title: `Fixture Store ${i}`, description: `Shop fixture products ${i}.` })) };
        if (url.includes('generate-ad')) data = { primaryText: 'Review our cotton shirt.', headline: 'Cotton shirt', description: 'Compare available options.', callToAction: 'Shop Now', confidence: 'low', suggestedInterests: [], suggestedLocationFocus: [], improvementSuggestions: [], meta: { ...meta, source: body.requestedFields ? 'provider' : 'mixed', requestedFields: body.requestedFields, evidenceWindow: body.interval, productSnapshot: { title: product.title, version: product.updatedAt }, limitations: [] } };
        const resolvedMeta = { ...(data.meta || meta), operationId: id };
        if (data.meta) data = { ...data, meta: resolvedMeta };
        const payload = { success: true, data, meta: resolvedMeta, usage: { used: 1, pending: 0, available: 9, limit: 10 } };
        generations.set(id, payload);
        return reply(payload);
    }
    if (url.includes('/seo/bootstrap')) return reply({ data: { published: { seo: {} }, draft: { seo: seoDraft }, themeRevision: revision, shop: { shopName: 'Fixture Store' }, capabilities: {}, domain: {} } });
    if (url.includes('/seo/draft')) { seoDraft = body.seo; return reply({ data: { seo: seoDraft } }); }
    if (url.includes('/seo/publish')) { seoDraft = body.seo; revision++; return reply({ data: { seo: seoDraft, themeRevision: revision } }); }
    if (url.includes('/growth/products/')) { const range = Number(config.params?.range || 30), to = new Date(), from = new Date(+to - range * 86400000); return reply({ data: { product, range, interval: { from, to }, metrics: { views: 12, orders: 0, recommendation: { message: 'Needs activity', suggestedActions: [] } } } }); }
    if (url.includes('/growth/')) return reply({ data: { summary: {}, products: [{ product, views: 12, label: 'not_enough_data', recommendation: {} }], terms: [], recommendations: [] } });
    if (url.includes('/products')) return reply({ data: [product], products: [product] });
    if (url.includes('/collections') && config.method !== 'get') return reply({ success: true, data: { ...body, _id: 'fixture-collection' } });
    if (url.includes('/collections') || url.includes('/categories')) return reply({ data: [] });
    throw new Error(`Unexpected fixture request: ${url}`);
};

function Fixture() {
    const [surface, setSurface] = useState('Product');
    const [form, setForm] = useState(product);
    const [saved, setSaved] = useState('');
    return <main className="mx-auto max-w-6xl p-4">
        <h1 className="text-xl font-bold">AI workflow verification — synthetic data</h1>
        <nav className="my-4 flex gap-3">{['Product', 'Collection', 'SEO', 'Growth'].map(name => <button key={name} onClick={() => setSurface(name)}>{name}</button>)}</nav>
        <div className="my-4 flex gap-4"><button onClick={() => { failNext = true; }}>Simulate lost response</button><label>Delay <input aria-label="Response delay" type="number" onChange={e => { delayMs = Number(e.target.value); }} /></label></div>
        {surface === 'Product' && <>
            <label>Product title<input aria-label="Product title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
            <label>Description<textarea aria-label="Product description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
            <ProductAiAssistant entityId={product._id} formData={form} setFormData={setForm} getFirstImage={() => null} getVariants={() => []} />
            <button onClick={() => setSaved(JSON.stringify(form))}>Save product fixture</button><output aria-label="Saved product">{saved}</output>
        </>}
        {surface === 'Collection' && <CatalogTools />}
        {surface === 'SEO' && <HomepageSeoPage />}
        {surface === 'Growth' && <GrowthCenter />}
        <h2 className="mt-8 font-bold">Operation IDs</h2><pre id="operation-log" className="whitespace-pre-wrap text-xs" />
        <Toaster />
    </main>;
}
axios.defaults.adapter = API.defaults.adapter;
createRoot(document.getElementById('root')).render(<MemoryRouter><AuthProvider><Fixture /></AuthProvider></MemoryRouter>);
