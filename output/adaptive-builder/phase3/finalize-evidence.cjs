'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const initial = JSON.parse(fs.readFileSync(path.join(__dirname, 'task-start.json')));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
for (const [file, total, pass] of [['compatibility-final.log', 644, 644], ['backend-final.log', 1101, 1096], ['mongo-integration.log', 55, 53]]) {
    const log = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert.match(log, new RegExp(`ℹ tests ${total}(?:\\r?\\n)`));
    assert.match(log, new RegExp(`ℹ pass ${pass}(?:\\r?\\n)`));
}
const paths = [
    'packages/storefront-renderer/package.json',
    ...['index.jsx', 'pagePlan.js', 'styleCompiler.js', 'PageTemplateRenderer.jsx', 'ProtectedCore.jsx'].map(file => 'packages/storefront-renderer/adaptive/' + file),
    ...['ProductDetailsView.jsx', 'ProductInfo.jsx', 'ProductImageGallery.jsx', 'VariantSelector.jsx', 'ActionButtons.jsx'].map(file => 'packages/storefront-renderer/presentation/' + file),
    'ecommerce-backend/backend/tests/adaptive-renderer.test.js',
    ...['render-fixtures.cjs', 'browser-fixture.jsx'].map(file => 'ecommerce-backend/backend/tests/fixtures/adaptive-builder/' + file),
    ...['adaptive-renderer.cjs', 'adaptive-browser.cjs', 'benchmark-adaptive-renderer.cjs'].map(file => 'ecommerce-backend/backend/tests/helpers/' + file),
    'track.md',
];
const allowed = new Set(paths);
const previousTrack = fs.readFileSync(path.join(root, 'track.md'));
const marker = '## 2026-10-20 — Adaptive Store Builder Phase 3: inactive renderer and scoped CSS';
if (!previousTrack.toString('utf8').startsWith(marker)) {
    if (sha(previousTrack) !== initial.files['track.md']) throw new Error('Tracker changed concurrently; preserve and investigate.');
    const prefix = `${marker}

**Inactive foundation implemented; Phase 4 readiness: BLOCKED. Stop after Phase 3.**

Report: [Phase 3 implementation/evidence](C:/Users/user/WebstormProjects/Shop-for-all/output/adaptive-builder/phase3/README.md). Exact paths/hashes: [source manifest](C:/Users/user/WebstormProjects/Shop-for-all/output/adaptive-builder/phase3/source-manifest.json).

- Added the explicit renderer adaptive entry, strict immutable page plans, shared registered block rendering, scoped three-tier CSS and trusted product/checkout presentation adapters. Reused existing views, catalog sections and PresentationRuntime. Five existing product primitives only gain opt-in markers; normal output remains unchanged.
- All ten definitions, v4 behavior, 370 exact rendering cases, 144 earlier hashes and 20 Gallery/Builder/live-home comparisons are preserved. No snapshot regeneration, application route/UI wiring, theme-contract/persistence/commerce change, adaptive adoption, publication, deployment, dependency installation, commit or push.
- Pre-edit compatibility: 564/564. Final compatibility: 644/644, including 80 new renderer tests. Full backend: 1096/1101, same five historical failures. Disposable Mongo integration: 53/55, including 35/35 adaptive tests; same two historical Builder failures. Original failing tests and implicated sources remain unchanged.
- Commands: backend node --test tests/*.test.js; exact 13-suite compatibility command in the report; isolated preload + three integration suites; Admin Vite build and full ESLint; storefront Next build and full ESLint; node output/adaptive-builder/phase3/verify-tooling.cjs; node tests/helpers/benchmark-adaptive-renderer.cjs; git diff --check. Logs and native exit files retained in the phase directory.
- Both frontend builds PASS. Storefront lint PASS. Full Admin lint remains 18 errors/4 warnings. All 16 changed JS/JSX files lint clean. CJS/ESM three-family plans and CSS match. Explicit inactive browser entry: 356243 raw bytes, React/JSX/lucide external; no new dependencies.
- Actual in-app browser: 27/27 layout/hydration cases across home, long English/Bengali product and checkout at 320/360/390/430/767/768/1023/1024/1440 px. No final horizontal document overflow, recovery errors or console warnings/errors. Fixed a 320 px gallery overflow only in the adaptive branch. Exercised inert quantity/cart/consent/submit/OTP callbacks, keyboard focus, required fields, zero price and out-of-stock. No live order/notification/provider write. Browser server and tmpfs Mongo container stopped; viewport reset and task tabs closed.
- Security: graph/style/content/source validation reused, no raw HTML/code/selectors/unsafe URLs, approved media only, finite public sources and trusted actions. Invalid plans retain trusted commerce cores. Legacy opaque interiors make general core palette inheritance unsafe: affected paint fails closed; primary-button paint requires an explicit foreground/background pair.
- Blockers: immutable root-zero core contradicts requested product content above it; minHeight/editable media fitting/core width are absent or forbidden by the approved contract; broad core paint needs a verified presentation seam. Real 200% zoom is unavailable through current browser controls. Complete accessibility, other page adapters and production Next route integration remain unverified/deferred.
- Next safe task after review: select/approve the narrow contract and paint-seam scope, add isolated regression tests and complete only that inactive work before Builder UI. Phase 4/5 integration requirements are documented; neither phase started.

---

`;
    fs.writeFileSync(path.join(root, 'track.md'), Buffer.concat([Buffer.from(prefix), previousTrack]));
}
const currentTrack = fs.readFileSync(path.join(root, 'track.md'));
const originalHeading = '## 2026-10-20 — Adaptive Store Builder Phase 2: persistence, fences, permissions and media';
const offset = currentTrack.indexOf(Buffer.from(originalHeading));
const trackerTailPreserved = offset >= 0 && sha(currentTrack.subarray(offset)) === initial.files['track.md'];
const unexpected = [], changed = [], unchanged = [];
for (const [file, hash] of Object.entries(initial.files)) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute)) unexpected.push({ file, reason: 'deleted' });
    else if (sha(fs.readFileSync(absolute)) !== hash) {
        changed.push(file); if (!allowed.has(file)) unexpected.push({ file, reason: 'unexpected modification' });
    } else unchanged.push(file);
}
const manifest = paths.map(file => ({ path: path.join(root, file).replaceAll('\\', '/'),
    status: initial.files[file] ? 'modified' : 'new', sha256: sha(fs.readFileSync(path.join(root, file))) }));
fs.writeFileSync(path.join(__dirname, 'source-manifest.json'), JSON.stringify(manifest, null, 2));
const whitespace = paths.filter(file => /\.(js|jsx|cjs|json)$/.test(file) && !initial.files[file])
    .filter(file => /[\t ]+$/m.test(fs.readFileSync(path.join(root, file), 'utf8')));
const git = 'C:/Program Files/Git/cmd/git.exe';
const revision = cp.execFileSync(git, ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const integrity = { startingRevision: initial.revision, finalRevision: revision, originalFiles: Object.keys(initial.files).length,
    unchangedOriginalFiles: unchanged.length, intentionallyModifiedOriginalFiles: changed, unexpected, trackerTailPreserved,
    changedSourceFiles: manifest.length, newSourceFiles: manifest.filter(file => file.status === 'new').length,
    newFileWhitespaceErrors: whitespace, baselineSha256: sha(fs.readFileSync(path.join(root, 'ecommerce-backend/backend/tests/fixtures/adaptive-builder/baseline-manifest.json'))) };
fs.writeFileSync(path.join(__dirname, 'integrity.json'), JSON.stringify(integrity, null, 2));
const results = { readiness: 'BLOCKED', reason: 'Contract/presentation gaps and incomplete zoom/accessibility acceptance; no adoption enabled.',
    compatibility: { before: { pass: 564, total: 564 }, final: { pass: 644, total: 644 }, newRendererTests: 80 },
    fullBackend: { pass: 1096, total: 1101, historicalFailures: 5 }, mongo: { pass: 53, total: 55, adaptivePass: 35, historicalFailures: 2 },
    browser: JSON.parse(fs.readFileSync(path.join(__dirname, 'browser/acceptance.json'))), tooling: JSON.parse(fs.readFileSync(path.join(__dirname, 'tooling-results.json'))),
    builds: { admin: fs.readFileSync(path.join(__dirname, 'admin-build-final.exit.txt'), 'utf8').trim(), storefront: fs.readFileSync(path.join(__dirname, 'storefront-build-final.exit.txt'), 'utf8').trim() },
    lint: { focusedErrors: 0, focusedWarnings: 0, adminErrors: 18, adminWarnings: 4, storefront: 'PASS' },
    limitations: ['product-before-core', 'editable minimum height/fitting/core width', 'general core paint', 'real 200% zoom', 'complete accessibility', 'remaining nine adapters', 'real Next route integration'],
};
fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2));
const artifacts = {};
function visit(folder) {
    for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
        const absolute = path.join(folder, item.name);
        if (item.isDirectory()) visit(absolute);
        else if (item.name !== 'artifact-sha256.json') artifacts[path.relative(root, absolute).replaceAll('\\', '/')] = sha(fs.readFileSync(absolute));
    }
}
visit(__dirname);
fs.writeFileSync(path.join(__dirname, 'artifact-sha256.json'), JSON.stringify(artifacts, null, 2));
console.log({ ...integrity, artifacts: Object.keys(artifacts).length });
if (unexpected.length || whitespace.length || !trackerTailPreserved || revision !== initial.revision) process.exitCode = 1;
