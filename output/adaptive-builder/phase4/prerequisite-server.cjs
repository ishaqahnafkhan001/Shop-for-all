'use strict';
// Opt-in, task-owned synthetic server. Serves only generated assets and fixed
// fixtures, never arbitrary workspace files, credentials, production APIs/data.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const Module = require('node:module');
const { pathToFileURL } = require('node:url');
const { root } = require("C:\\Users\\user\\WebstormProjects\\Shop-for-all\\ecommerce-backend\\backend\\tests\\helpers\\adaptive-renderer.cjs");
async function main() {
    const outputDir = path.join(root, 'output/adaptive-builder/phase4/prerequisite/browser');
    fs.mkdirSync(outputDir, { recursive: true });
    const req = Module.createRequire(path.join(root, 'ecommerce-admin/package.json'));
    const { rolldown } = await import(pathToFileURL(req.resolve('rolldown')));
    const fixture = path.join(root, 'ecommerce-backend/backend/tests/fixtures/adaptive-builder/browser-fixture.jsx').replaceAll('\\', '/');
    const modules = new Set();
    const options = { platform: 'browser', transform: { define: { 'process.env.NODE_ENV': '"production"' } },
        plugins: [{ name: 'isolated-browser', resolveId(id) {
            if (/\/api\/|AuthContext|CartContext|axios|storefrontServer|^next\//.test(id)) throw new Error('Live dependency blocked: ' + id);
            if (id.startsWith('virtual:')) return id;
            if (id === 'react' || id.startsWith('react/')) return req.resolve(id);
            if (id === 'react-dom/client') return req.resolve(id);
            if (id === 'lucide-react') return req.resolve(id);
            if (id === '@scaleup/storefront-theme/adaptive') return path.join(root, 'packages/storefront-theme/adaptive.mjs');
            if (id === '@scaleup/storefront-theme') return path.join(root, 'packages/storefront-theme/index.mjs');
            return null;
        }, load(id) {
            modules.add(id);
            if (id === 'virtual:client') return `import React from 'react';import {hydrateRoot} from 'react-dom/client';import {AdaptiveBrowserFixture} from '${fixture}';
                const root=document.getElementById('root');
                hydrateRoot(root,React.createElement(AdaptiveBrowserFixture,{pageKind:root.dataset.kind,scenario:root.dataset.scenario,palette:root.dataset.palette,narrow:root.dataset.narrow==='yes'}),{
                    onRecoverableError(error){document.getElementById('hydration-errors').textContent+=String(error.message)+'\\n';}
                });`;
            if (id === 'virtual:ssr') return `export {AdaptiveBrowserFixture} from '${fixture}';`;
            return null;
        } }] };
    const bundle = await rolldown({ ...options, input: 'virtual:client' });
    try { const { output } = await bundle.generate({ format: 'es', codeSplitting: false }); fs.writeFileSync(path.join(outputDir, 'fixture.js'), output[0].code); }
    finally { await bundle.close(); }
    const ssr = await rolldown({ ...options, input: 'virtual:ssr', platform: 'node', external: ['react', 'react/jsx-runtime', 'react-dom', 'lucide-react'] });
    let ui;
    try {
        const { output } = await ssr.generate({ format: 'cjs', codeSplitting: false });
        const filename = path.join(root, 'ecommerce-admin/adaptive-browser-ssr.cjs');
        const compiled = new Module(filename, module); compiled.paths = Module._nodeModulePaths(path.dirname(filename));
        compiled._compile(output[0].code, filename); ui = compiled.exports;
    } finally { await ssr.close(); }
    const React = req('react'), { renderToString } = req('react-dom/server');
    const assetsDir = path.join(root, 'output/adaptive-builder/phase3/remediation/admin-dist/assets');
    const cssName = fs.readdirSync(assetsDir).find(file => file.endsWith('.css'));
    const server = http.createServer((request, response) => {
        const url = new URL(request.url, 'http://127.0.0.1:5233');
        if (request.method !== 'GET') { response.writeHead(405); response.end('No fixture write endpoints'); return; }
        response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'");
        const asset = /^\/assets\/([A-Za-z0-9_.-]+)$/.exec(url.pathname);
        if (asset && fs.existsSync(path.join(assetsDir, asset[1]))) {
            response.setHeader('Content-Type', asset[1].endsWith('.css') ? 'text/css' : 'font/ttf');
            response.end(fs.readFileSync(path.join(assetsDir, asset[1]))); return;
        }
        if (url.pathname === '/fixture.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(fs.readFileSync(path.join(outputDir, 'fixture.js'))); return; }
        if (url.pathname === '/synthetic-ceramic.png') { response.setHeader('Content-Type', 'image/svg+xml'); response.end('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#d9d1c4"/><circle cx="320" cy="240" r="120" fill="#817561"/></svg>'); return; }
        if (url.pathname !== '/') { response.writeHead(404); response.end('Fixture not found'); return; }
        const pageKind = ['home', 'product', 'checkout'].includes(url.searchParams.get('page')) ? url.searchParams.get('page') : 'home';
        const scenario = ['normal', 'long', 'zero', 'soldout', 'variant', 'loading', 'missing', 'form', 'busy', 'error', 'otp', 'empty', 'success', 'no-consent'].includes(url.searchParams.get('scenario')) ? url.searchParams.get('scenario') : 'normal';
        const palette = ['default', 'light', 'dark', 'custom', 'edge'].includes(url.searchParams.get('palette')) ? url.searchParams.get('palette') : 'default';
        const narrow = url.searchParams.get('narrow') === 'yes';
        const markup = renderToString(React.createElement(ui.AdaptiveBrowserFixture, { pageKind, scenario, palette, narrow }));
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Adaptive synthetic ${pageKind}</title><link rel="stylesheet" href="/assets/${cssName}"></head><body style="margin:0;min-width:0"><div id="root" data-kind="${pageKind}" data-scenario="${scenario}" data-palette="${palette}" data-narrow="${narrow ? 'yes' : 'no'}">${markup}</div><pre id="hydration-errors" role="status"></pre><script type="module" src="/fixture.js"></script></body></html>`);
    });
    server.listen(5233, '127.0.0.1', () => console.log('Isolated adaptive fixture: http://127.0.0.1:5233/'));
    fs.writeFileSync(path.join(outputDir, 'bundle.json'), JSON.stringify({ bytes: fs.statSync(path.join(outputDir, 'fixture.js')).size, modules: [...modules] }, null, 2));
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
