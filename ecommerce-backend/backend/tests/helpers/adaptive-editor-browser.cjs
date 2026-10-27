'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const Module = require('node:module');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '../../../..');
const req = Module.createRequire(path.join(root, 'ecommerce-admin/package.json'));
async function main() {
    const out = path.join(root, 'output/adaptive-builder/phase4/browser'); fs.mkdirSync(out, { recursive: true });
    const { rolldown } = await import(pathToFileURL(req.resolve('rolldown')));
    const fixtureRoot = path.join(root, 'ecommerce-backend/backend/tests/fixtures/adaptive-builder');
    const modules = new Set();
    const bundle = await rolldown({ input: path.join(fixtureRoot, 'editor-browser.jsx'), platform: 'browser',
        transform: { define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{}'} },
        plugins: [{ name: 'isolated-whole-builder', resolveId(id, importer) {
            if (/AuthContext|CartContext|^next\//.test(id)) throw new Error('Live controller blocked: ' + id);
            if (/\bapi\/api(?:\.js)?$/.test(id)) return path.join(fixtureRoot, 'editor-browser-api.js');
            if (id.startsWith('@scaleup/storefront-theme')) { const sub = id.split('/').slice(2).join('/'); return path.join(root, 'packages/storefront-theme', sub ? sub + (sub === 'prebuilt' ? '.cjs' : '.mjs') : 'index.mjs'); }
            if (id === '@scaleup/storefront-renderer') return path.join(root, 'packages/storefront-renderer/index.jsx');
            if (id === '@scaleup/storefront-renderer/adaptive') return path.join(root, 'packages/storefront-renderer/adaptive/index.jsx');
            if (id.startsWith('@scaleup/storefront-renderer/presentation/')) return path.join(root, 'packages/storefront-renderer/presentation', id.split('/').at(-1) + '.jsx');
            if (id.startsWith('@scaleup/storefront-renderer/')) { const sub = id.split('/').slice(2).join('/'); const json = require(path.join(root, 'packages/storefront-renderer/package.json')); return path.join(root, 'packages/storefront-renderer', json.exports['./' + sub] || (sub + '.js')); }
            if (!id.startsWith('.') && !path.isAbsolute(id)) { try { return req.resolve(id); } catch { /* Default resolver handles extension paths. */ } }
            void importer; return null;
        }, load(id) {
            modules.add(id);
            if (id.endsWith('.css')) return { code: '', moduleType: 'js' };
            if (/axios|ecommerce-admin[\\/]src[\\/]api[\\/]api/.test(id)) throw new Error('Real HTTP transport reached fixture: ' + id);
            return null;
        } }] });
    try {
        const { output } = await bundle.generate({ format: 'es', codeSplitting: false });
        for (const entry of output) if (entry.type === 'chunk') fs.writeFileSync(path.join(out, 'editor.js'), entry.code);
    } finally { await bundle.close(); }
    fs.writeFileSync(path.join(out, 'bundle.json'), JSON.stringify({ modules: [...modules] }, null, 2));
    const assets = path.join(root, 'output/adaptive-builder/phase4/admin-dist/assets');
    const cssByEntry = new Map();
    for (const name of fs.readdirSync(assets).filter(name => name.endsWith('.css')).sort((a, b) => fs.statSync(path.join(assets, b)).mtimeMs - fs.statSync(path.join(assets, a)).mtimeMs)) {
        const entry = name.split('-')[0]; if (!cssByEntry.has(entry)) cssByEntry.set(entry, name);
    }
    const css = [...cssByEntry.values()].sort((a, b) => Number(b.startsWith('index-')) - Number(a.startsWith('index-')));
    const server = http.createServer((request, response) => {
        const url = new URL(request.url, 'http://127.0.0.1:5234');
        if (request.method !== 'GET') { response.writeHead(405); response.end('No fixture HTTP write endpoints'); return; }
        response.setHeader('Content-Security-Policy', "default-src 'self';script-src 'self';style-src 'self' 'unsafe-inline';img-src 'self';font-src 'self';connect-src 'none';form-action 'none';base-uri 'none'");
        if (url.pathname === '/editor.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(fs.readFileSync(path.join(out, 'editor.js'))); return; }
        const asset = /^\/assets\/([A-Za-z0-9_.-]+)$/.exec(url.pathname);
        if (asset && fs.existsSync(path.join(assets, asset[1]))) { response.setHeader('Content-Type', asset[1].endsWith('.css') ? 'text/css' : 'font/ttf'); response.end(fs.readFileSync(path.join(assets, asset[1]))); return; }
        if (url.pathname === '/synthetic-ceramic.png') { response.setHeader('Content-Type', 'image/svg+xml'); response.end('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#d9d1c4"/><circle cx="320" cy="240" r="120" fill="#817561"/></svg>'); return; }
        if (url.pathname !== '/') { response.writeHead(404); response.end('Fixture not found'); return; }
        response.setHeader('Content-Type', 'text/html;charset=utf-8');
        response.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isolated contextual Builder</title>${css.map(name => `<link rel="stylesheet" href="/assets/${name}">`).join('')}</head><body style="margin:0;min-width:0"><div id="root"></div><script type="module" src="/editor.js"></script></body></html>`);
    });
    server.listen(5234, '127.0.0.1', () => console.log('Isolated whole Builder: http://127.0.0.1:5234/'));
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
