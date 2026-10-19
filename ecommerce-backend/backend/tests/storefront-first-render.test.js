const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const Module = require('node:module');
const { pathToFileURL } = require('node:url');
const { resolveEffectiveTheme } = require('@scaleup/storefront-theme');
const { PREBUILT_THEMES, resolvePrebuiltTheme } = require('@scaleup/storefront-theme/prebuilt');

const root = path.resolve(__dirname, '../../..');
let ui, React, render;
test.before(async () => {
    const filename = path.join(root, 'ecommerce-admin/first-render-test.cjs');
    const req = Module.createRequire(filename);
    const { rolldown } = await import(pathToFileURL(req.resolve('rolldown')).href);
    const src = path.join(root, 'ecommerce-storefront/src').replaceAll('\\', '/');
    const bundle = await rolldown({
        input: 'virtual:first-render', platform: 'node',
        external: ['react', 'react/jsx-runtime', 'react-dom', 'lucide-react', 'crypto'],
        resolve: { alias: { '@': src, '@scaleup/storefront-theme': path.join(root, 'packages/storefront-theme/index.mjs') } },
        plugins: [{ name: 'first-render', resolveId(id) {
            if (id.startsWith('virtual:')) return id;
            if (['next/headers', 'next/navigation', 'next/server', 'react-hot-toast'].includes(id)) return `virtual:${id}`;
            if (id.includes('/context/CartContext')) return 'virtual:cart';
            if (id.includes('/storefront/Navbar')) return 'virtual:navbar';
            if (id.includes('/storefront/StorefrontFooter')) return 'virtual:footer';
            if (id.includes('/storefront/AnalyticsConsentBanner')) return 'virtual:consent';
            if (id.includes('/storefront/StorefrontRevisionWatcher')) return 'virtual:consent';
            return null;
        }, load(id) {
            if (id === 'virtual:first-render') return `
                import React from 'react';
                import {useStorefrontTheme} from '${src}/components/storefront/StorefrontThemeProvider.jsx';
                export {default as Provider} from '${src}/components/storefront/StorefrontThemeProvider.jsx';
                export {default as Layout} from '${src}/app/[subdomain]/layout.jsx';
                export {default as proxy} from '${src}/proxy.js';
                export {getPublishedStorefrontSettings as loadSettings} from '${src}/lib/storefrontPublishedSettings.js';
                export {fetchStorefrontBootstrap} from '${src}/lib/storefrontServer.js';
                export {getReferenceThemeStyle} from '${src}/components/storefront/ReferenceStorefront.jsx';
                export {setHost, setPath} from 'next/headers';
                export function Probe() {
                    const {settings, theme} = useStorefrontTheme();
                    return React.createElement('output', {'data-revision': settings?.themeRevision}, settings?.shopName + ':' + theme.hero.title);
                }
            `;
            if (id === 'virtual:next/headers') return `let host = '', path = '/'; export const setHost = value => {host = value}; export const setPath = value => {path = value}; export const headers = async () => new Map([['host',host], ['x-storefront-pathname',path]]);`;
            if (id === 'virtual:next/server') return `export const NextResponse = { next: options => ({options}), rewrite: (url, options) => ({url: String(url), options}) };`;
            if (id === 'virtual:next/navigation') return `export const notFound = () => {throw new Error('NOT_FOUND')}; export const redirect = url => {throw new Error('REDIRECT:' + url)};`;
            if (id === 'virtual:cart') return `export const CartProvider = ({children}) => children;`;
            if (id === 'virtual:consent') return `export default () => null;`;
            if (id === 'virtual:react-hot-toast') return `export const Toaster = () => null;`;
            if (['virtual:navbar', 'virtual:footer'].includes(id)) return `
                import React from 'react';
                import {useStorefrontTheme} from '${src}/components/storefront/StorefrontThemeProvider.jsx';
                export default function ShellProbe() { const {settings, theme} = useStorefrontTheme();
                    return React.createElement('${id.endsWith('navbar') ? 'header' : 'footer'}', null, settings.shopName + ':' + theme.hero.title); }
            `;
            return null;
        } }],
    });
    try {
        const { output } = await bundle.generate({ format: 'cjs' });
        const compiled = new Module(filename, module);
        compiled.paths = Module._nodeModulePaths(path.dirname(filename));
        compiled._compile(output[0].code, filename);
        ui = compiled.exports; React = req('react'); render = req('react-dom/server').renderToStaticMarkup;
    } finally { await bundle.close(); }
});

const settings = (name, revision = 1) => ({
    _id: name, subdomain: name.toLowerCase(), shopName: name, themeRevision: revision,
    theme: resolveEffectiveTheme({ hero: { title: `${name} published ${revision}` } }),
});
const html = (shop, children = React.createElement(ui.Probe)) => render(React.createElement(ui.Provider, {
    subdomain: shop.subdomain, settings: shop,
}, children));

test('all nine published presets are styled in the initial HTML and survive serialized props identically', () => {
    for (const preset of PREBUILT_THEMES) {
        const shop = { ...settings('Published'), theme: resolveEffectiveTheme(resolvePrebuiltTheme({ presetId: preset.id })) };
        const first = html(shop);
        const fromPayload = html(JSON.parse(JSON.stringify(shop)));
        assert.equal(first, fromPayload, preset.id);
        const style = ui.getReferenceThemeStyle(shop.theme);
        for (const [key, value] of Object.entries(style)) {
            if (key.startsWith('--') && value != null) assert.ok(first.includes(`${key}:${String(value).replaceAll('"', '&quot;')}`), `${preset.id}: ${key}`);
        }
        assert.match(first, /data-revision="1"/);
    }
});

test('new server revisions and tenant snapshots render immediately without carrying prior theme state', () => {
    const a = html(settings('Alpha', 8));
    const b = html(settings('Beta', 2));
    const published = html(settings('Alpha', 9));
    assert.match(a, /Alpha published 8/);
    assert.match(b, /Beta published 2/); assert.doesNotMatch(b, /Alpha/);
    assert.match(published, /Alpha published 9/); assert.doesNotMatch(published, /published 8/);
    assert.equal(html(settings('Alpha', 9)), published);
});

test('tenant providers reject missing snapshots; platform pages retain their default theme', () => {
    assert.throws(() => render(React.createElement(ui.Provider, { subdomain: 'alpha' })), /published storefront theme/);
    assert.match(render(React.createElement(ui.Provider, null, 'Platform')), /Platform/);
});

test('published settings use fresh, tenant-specific public requests and forward the custom host', async t => {
    const requests = [];
    t.mock.method(global, 'fetch', async (url, options) => {
        requests.push({ url, options });
        const name = url.includes('/alpha/') ? 'Alpha' : 'Beta';
        return { ok: true, json: async () => settings(name, requests.length) };
    });
    const a = await ui.loadSettings('alpha', 'alpha.scaleup.codes');
    const b = await ui.loadSettings('beta', 'beta.example.com');
    assert.equal(a.shopName, 'Alpha'); assert.equal(b.shopName, 'Beta');
    assert.match(requests[0].url, /\/storefront\/alpha\/info$/);
    assert.match(requests[1].url, /\/storefront\/beta\/info$/);
    for (const { options } of requests) assert.equal(options.cache, 'no-store');
    assert.equal(requests[1].options.headers['x-storefront-host'], 'beta.example.com');
    // The existing server helper only signs when configured. Never print the secret.
    if (process.env.STOREFRONT_PROXY_SECRET) assert.match(requests[1].options.headers['x-storefront-signature'], /^[a-f0-9]{64}$/);
});

test('direct nested routes render the server settings around children before any client effects', async t => {
    ui.setHost('merchant.example.com');
    t.mock.method(global, 'fetch', async (url, options) => {
        assert.match(url, /\/storefront\/merchant.example.com\/info$/);
        assert.equal(options.headers['x-storefront-host'], 'merchant.example.com');
        return { ok: true, json: async () => settings('CanonicalMerchant', 12) };
    });
    const tree = await ui.Layout({ params: Promise.resolve({ subdomain: 'merchant.example.com' }), children: React.createElement(ui.Probe) });
    const result = render(tree);
    assert.match(result, /<header>CanonicalMerchant:CanonicalMerchant published 12<\/header>/);
    assert.match(result, /data-revision="12"/);
    assert.match(result, /<footer>CanonicalMerchant:CanonicalMerchant published 12<\/footer>/);
});

test('failed and malformed public lookups never render tenant children with a fallback theme', async t => {
    for (const failure of [null, { ok: true, json: async () => ({}) }]) {
        const mocked = t.mock.method(global, 'fetch', async () => { if (!failure) throw new Error('Offline'); return failure; });
        const tree = await ui.Layout({ params: Promise.resolve({ subdomain: 'alpha' }), children: 'PRIVATE_TO_THIS_STORE' });
        const result = render(tree);
        assert.match(result, /Store temporarily unavailable/);
        assert.doesNotMatch(result, /PRIVATE_TO_THIS_STORE|sf-presentation/);
        mocked.mock.restore();
    }
});

test('missing or locked stores and custom-domain plan redirects retain backend access decisions', async t => {
    ui.setPath('/products/example?variant=blue');
    for (const status of [404, 423, 403]) {
        const mocked = t.mock.method(global, 'fetch', async () => ({ ok: false, status, json: async () => status === 403
            ? { code: 'CUSTOM_DOMAIN_PLAN_INACTIVE', platformHost: 'alpha.scaleup.codes' } : { error: 'Unavailable' } }));
        await assert.rejects(ui.Layout({ params: Promise.resolve({ subdomain: 'alpha' }), children: 'Hidden' }),
            status === 403 ? /REDIRECT:https?:\/\/alpha.scaleup.codes\/products\/example\?variant=blue/ : /NOT_FOUND/);
        mocked.mock.restore();
    }
});

test('tenant rewrites preserve the public redirect path and overwrite spoofed path headers', () => {
    for (const host of ['localhost', 'alpha.localhost', 'alpha.scaleup.codes', 'merchant.example.com']) {
        const url = new URL(`http://${host}/products/example?variant=blue`);
        const result = ui.proxy({ url: String(url), nextUrl: url, headers: new Headers({ host, 'x-storefront-pathname': '//attacker.example' }) });
        assert.equal(result.options.request.headers.get('x-storefront-pathname'), '/products/example?variant=blue');
        assert.equal(result.options.request.headers.get('host'), host);
        if (host === 'localhost') assert.equal(result.url, undefined);
        else assert.ok(result.url.includes(`/${host === 'merchant.example.com' ? host : 'alpha'}/products/example`));
    }
});

test('homepage bootstrap revision guards reject mixed snapshots instead of rendering mismatched section data', async t => {
    let revision = 8;
    t.mock.method(global, 'fetch', async () => ({ ok: true, json: async () => ({ data: { shop: settings('Alpha', revision), products: [] } }) }));
    await assert.rejects(ui.fetchStorefrontBootstrap('alpha', {}, { fresh: true, expectedRevision: 9 }), { code: 'STOREFRONT_REVISION_CHANGED' });
    revision = 9;
    assert.equal((await ui.fetchStorefrontBootstrap('alpha', {}, { fresh: true, expectedRevision: 9 })).shop.themeRevision, 9);
});
