'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const git = 'C:/Program Files/Git/cmd/git.exe';
const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8').replace(/^\uFEFF/, '');
const json = name => JSON.parse(read(name));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n');
const start = json('task-start.json');
const sourceFiles = [
    'packages/storefront-theme/responsiveStyles.cjs', 'packages/storefront-theme/pageTemplates.cjs',
    'packages/storefront-theme/pageTemplateValidation.cjs', 'packages/storefront-theme/ADAPTIVE_CONTRACT.md',
    ...['index.jsx', 'pagePlan.js', 'corePalette.js', 'styleCompiler.js', 'ProtectedCore.jsx', 'PageTemplateRenderer.jsx'].map(name => 'packages/storefront-renderer/adaptive/' + name),
    ...['ProductDetailsView.jsx', 'ProductInfo.jsx', 'ProductImageGallery.jsx', 'VariantSelector.jsx', 'ActionButtons.jsx', 'ProductExtras.jsx', 'CheckoutSections.jsx'].map(name => 'packages/storefront-renderer/presentation/' + name),
    ...['StorefrontSectionRenderer.jsx', 'StorefrontProductCard.jsx', 'StorefrontSectionVariants.jsx'].map(name => 'packages/storefront-renderer/reference/' + name),
    ...['adaptive-renderer.test.js', 'adaptive-renderer-remediation.test.js', 'fixtures/adaptive-builder/browser-fixture.jsx',
        'fixtures/adaptive-builder/remediation-fixtures.cjs', 'helpers/adaptive-browser.cjs'].map(name => 'ecommerce-backend/backend/tests/' + name),
    'output/adaptive-builder/phase3/README.md', 'track.md',
];
const counts = log => Object.fromEntries(['tests', 'pass', 'fail'].map(key => [key, Number(new RegExp('^ℹ ' + key + ' (\\d+)', 'm').exec(read(log))?.[1])]));
const compatibility = counts('compatibility-final.log');
const unit = counts('backend-unit-final.log');
const mongo = counts('mongo.log'), mongoRelease = counts('mongo-release.log');
assert.deepEqual(compatibility, { tests: 671, pass: 671, fail: 0 });
assert.deepEqual(unit, { tests: 1128, pass: 1123, fail: 5 });
assert.deepEqual(mongo, { tests: 47, pass: 45, fail: 2 });
assert.deepEqual(mongoRelease, { tests: 8, pass: 8, fail: 0 });
const browser = json('browser/matrix.json');
assert.equal(browser.length, 48);
for (const row of browser) {
    assert.equal(row.hydrated, 'yes'); assert.equal(row.errors, ''); assert.equal(row.fallback, false);
    assert.ok(row.scroll <= row.client); assert.equal(row.contrastFailures.length, 0);
    assert.equal(row.fieldContrastFailures.length, 0); assert.equal(row.smallControls.length, 0);
}
for (const name of ['admin-build-final', 'storefront-build-final', 'storefront-lint', 'benchmark-final']) assert.equal(read(name + '.exit.txt').trim(), '0', name);
const tooling = json('tooling-results.json');
assert.equal(tooling.lint.errors + tooling.lint.warnings, 0);
const baselinePath = 'ecommerce-backend/backend/tests/fixtures/adaptive-builder/baseline-manifest.json';
assert.equal(sha(baselinePath), start.files[baselinePath]);
assert.equal(sha(baselinePath), '06f9c824214c10ec907fcb5e5de12e269f3ba334749d98294ca381153452b841');
const benchmark = json('benchmark-final.json');
const fileList = sourceFiles.map(file => '- `' + file + '`').join('\n');
const suiteNames = [
    'adaptive-builder-baseline', 'storefront-preview-parity', 'storefront-atelier-contract', 'storefront-atelier-routes',
    'storefront-atelier-commerce', 'storefront-atelier-builder', 'storefront-atelier-presentation', 'storefront-release-hardening',
    'storefront-effective-theme', 'store-builder-prebuilt-themes', 'adaptive-page-contract', 'adaptive-persistence',
    'adaptive-renderer', 'adaptive-renderer-remediation',
].map(name => 'tests/' + name + '.test.js').join(' ');
const report = `# Adaptive Store Builder — Phase 3 blocker remediation

Date: 20 October 2026. Start revision: \`${start.revision}\`. Existing dirty work preserved.

**Final readiness: BLOCKED.** The implementation and tested compatibility gates pass. Actual **200% browser zoom** remains unverified: the available browser exposes viewport dimensions, and the tested zoom shortcut left \`innerWidth=1440\`, \`devicePixelRatio=1\`, \`visualViewport.scale=1\` unchanged. A 320×450 viewport is useful short-screen evidence, not a substitute for real zoom. Phase 4 has not started.

## 1. Original blockers, causes and resolution

| Blocker | Source-grounded cause | Resolution |
|---|---|---|
| Content before protected cores | Version-1 manifest, factory, graph validator and commands already agreed on root index 0. Earlier Phase 3 expectations requested product content before it; this was a scope conflict, not a renderer ordering defect. | Retain required, singleton, nonremovable root-0 product/checkout cores. Declare \`beforeCore:false, afterCore:true\`; expose the same capability to future inspectors. Tests reject remove/copy/move/displacement without mutating input. Supporting content above a core requires a separately reviewed blueprint. |
| Accepted style values did not reliably reach visible elements | Trusted views contain inline colours, nested backgrounds and size utilities. Wrapper declarations alone did not style actual fields, headings, summaries, grids or media. | Add opt-in semantic/surface/layout markers, scoped typed compilation and per-context typography variables. Catalog gaps/card typography/outer backgrounds, media fit/radius and safe page width now have concrete targets. Surface box settings target one wrapper. Border, padding, width and radius are not copied to children. Font-size overrides use a safe line-height fallback so legacy size utilities cannot retain a smaller fixed line box. |
| General core paint was rejected | The renderer returned \`CORE_PALETTE_ADAPTER\` because it could not validate actual nested code-owned surface contexts. A paired button guard did not prove contextual safety. | Pure \`corePalette.js\` resolves semantic paint at all three tiers, validates text at 4.5:1 and required control border/fill at 3:1, then compiles only fixed scoped selectors. Controls with zero-width or indistinguishable borders fail unless their fill provides contrast. Border-only outer edits do not activate unrelated paint. |
| Responsive overflow inside wide viewports | Legacy desktop grids used fixed/minimum columns based on viewport width even inside a narrow configured page. | Scoped container queries retain a single column until the actual commerce core is at least 1000px wide; desktop columns use \`minmax(0,1fr)\`. A 520px page inside a 1440px viewport is browser-tested. Existing legacy breakpoints remain unchanged. |
| Accessibility gaps | Tiny icon buttons/policy disclosures, short-height OTP content and low-contrast default muted/error copy were insufficiently protected. | Adaptive-only 44px button/disclosure targets, two-tone focus ring, scrollable bounded OTP form, existing dialog focus hook for every explicitly adaptive presentation, named field/error seams and darker default muted/error ink. Explicit validated palettes take precedence. A trusted missing product state no longer reveals stale purchase controls. |

No commerce controller, route, API, pricing, inventory, totals, consent, OTP rate limit or tenant policy was changed. The protected adapter still forwards trusted data and callbacks to existing views.

## 2. Supported styles and explicit limits

\`ADAPTIVE_RENDER_CAPABILITIES\` is frozen and derived from the shared registry. Only **home, product and checkout** have adapters. Category, collection, cart, account, track, policiesIndex, policy, header and footer contracts exist but resolution fails with \`PAGE_ADAPTER\`; future UI must not advertise them as rendered.

| Property group | Actual renderer support |
|---|---|
| \`color, background, borderColor\` | Typed token/solid colour resolution. Protected semantic context palettes; outer borders remain local. Optional cards retain their commerce button colour pair rather than copying the card foreground into actions. |
| \`fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, textAlign\` | Approved values compile; core and part typography uses nearest semantic variables to beat legacy inline/utility styles. Explicit part values win over node/page settings. Safe line-height fallback preserves readable enlarged fields. |
| \`width, maxWidth\` | Optional block dimensions clamped to containing width. Page supports only outer maxWidth: 320–1920px or exactly 100%. No functional fixed width/height. |
| \`height, aspectRatio, objectFit\` | Media only; objectFit is contain/cover. Radius reaches the actual image. No clipping of functional controls. |
| \`minHeight\` | Optional content.section only, 0–600px. |
| Four logical paddings / four logical margins | Existing bounded values on registered targets; page/part boxes are not inherited. Functional bounds unchanged. |
| \`borderWidth, borderRadius\` | Local boundaries and approved semantic parts; required control visibility checked for palette/border edits. |
| \`gap, columns, alignItems, justifyContent, stackOnMobile\` | Registered stack/section/column semantics. Catalog gap has a real opt-in grid seam. Mobile stacking false survives resolution. |
| \`visible\` | Optional content only; required cores/controls cannot be hidden. |

The regression test iterates every advertised block/part property with a valid typed sample and compilation. Real browser assertions cover representative actual targets, not every possible combination of all bounds. No arbitrary selectors/classes/HTML/CSS/JS/URLs, position, z-index, clipping or programmable bindings were added. Limits and whole-theme budgets remain intact. Preset references cannot bypass validation. Ownership remains the existing backend's responsibility; the pure palette resolver does not claim to prove it.

## 3. Browser and accessibility evidence

Actual SSR + hydration fixture, actual shared views and installed production stylesheet; synthetic data only. GET-only loopback server, blocked live dependencies, no real notifications/orders. [Matrix](remediation/browser/matrix.json), [read-only probe](remediation/browser/probe.js), [interaction evidence](remediation/browser/interaction-evidence.json), [native accessibility names](remediation/browser/otp-ax.txt).

- **48/48** cases hydrate without errors/fallback/horizontal document overflow, measured text/field contrast failures or enabled button/field/disclosure targets below 44px.
- 21 cases: all three families at 320, 360, 390, 430, 768, 1024 and 1440 CSS px; English/Bengali long product/home copy and checkout errors.
- 16 cases: product variants/checkout OTP using default, light, custom and inverted edge palettes at 320 and 1440px. Dark palettes are also exercised across the seven widths. Text contrast uses browser-computed RGB/OKLCH/OKLab colours with alpha composition against actual ancestor backgrounds; disabled controls are excluded.
- Three cases: a 520px configured page inside a 1440px viewport. Media is 180px high, cover-fit, 12px radius; section minHeight 120px; products grid gap 24px and card title 18px. Checkout label 16px remains distinct from summary 20px.
- Eight cases: product zero-price/sold-out/loading/missing and checkout busy/empty/success/no-consent at 320px. Missing images have accessible names/fallbacks.
- Keyboard: Back to Cart → Full Name → Email → Phone Number → Full Address → Delivery area; names verified in native AX. Policy consent toggles order-button eligibility using the existing callback seam. OTP autofocus, Tab/Shift+Tab cycle and Escape cancellation verified; cooldown and invalid six-digit submission remain guarded. No provider/verification request executed.
- Short-screen OTP at 320×450: form height 448px, scroll height 801px, overflow auto, top 0/bottom 450. Contents remain reachable without unlocking the page behind it. [Screenshot](remediation/browser/otp-320x450.png).
- Two-tone focus outline checked in the actual browser. CSS transitions mean an immediate computed shadow sample can be between its endpoints; visible outline and screenshots are retained.
- **Unverified:** real 200% browser zoom; physical touchscreen/virtual-keyboard behavior; spoken NVDA/JAWS/VoiceOver sessions and a complete WCAG conformance audit. Native AX names and keyboard tests are not a claim of those checks. Contrast against arbitrary future media is outside these fixtures.

![Synthetic adaptive checkout, 390px](remediation/browser/otp-390.png)

## 4. Commands and results

Backend commands below run from \`ecommerce-backend/backend\`; set \`THEME_PARITY_REPORT\` to this remediation directory before parity/unit runs. Logs and exit files are retained in \`remediation/\`.

| Check | Result |
|---|---|
| Pre-edit compatibility | 644/644 passed; original blockers reproduced before source changes. |
| Final Phase 0–3 + remediation | **671/671 passed**; 27 new tests, 107 total renderer tests. All 370 frozen cases, 144 older hashes and 20 Gallery/Builder/live-home comparisons preserved. |
| Package unit script equivalent | **1123/1128**; same five historical failures listed below. No introduced failure remains. |
| Isolated adaptive/Store Builder MongoDB | **45/47**; 35 adaptive persistence checks pass; same two historical Store Builder failures. |
| Isolated Atelier release hardening | **8/8**. Combined isolated result **53/55**. |
| Focused lint | **24 JS/JSX/CJS/MJS files, 0 errors, 0 warnings**. |
| Admin full lint | Existing **18 errors, 4 warnings** in unchanged files. |
| Storefront full lint | Passed. |
| Admin / storefront production builds | Both passed on final source. |
| Explicit browser entry / Node CJS + ESM | Passed; **11** page/palette plan+CSS parity cases and capability parity. No new dependency. |
| \`git diff --check\` | Passed; Git emits existing LF/CRLF advisories, not whitespace failures. |

\`node --test ${suiteNames}\`

\`node --test 'tests/*.test.js'\` (the package test script's suite selection).

MongoDB: cached official mongo:7 image, task label \`adaptive-remediation-fc0f7ec2\`, loopback port 27028, tmpfs, rs0 primary verified; existing isolated preload blocks real credentials/external transports and mocks notifications. Commands:

\`node --require ./tests/helpers/isolatedAcceptance.cjs --test --test-concurrency=1 tests/integration/adaptive-persistence.integration.test.js tests/integration/store-builder-safety.integration.test.js\`

\`node --require ./tests/helpers/isolatedAcceptance.cjs --test --test-concurrency=1 tests/integration/atelier-release-hardening.integration.test.js\`

Exact test-only env guard: \`NODE_ENV=test\`, \`SFA_ISOLATED_ACCEPTANCE=c085454b\`, \`MONGO_URI_TEST=mongodb://127.0.0.1:27028/atelier_acceptance_c085454b_test?directConnection=true&replicaSet=rs0\`. The first recorded Mongo command also named a nonmatching atelier-release path; Node selected only the two existing suites (47 tests). The correct hardening file was then run explicitly (8 tests). Container label/isolation was checked before stop/removal; cached image retained. No shared database was targeted.

Builds: Admin \`node node_modules/vite/bin/vite.js build --outDir ../output/adaptive-builder/phase3/remediation/admin-dist --emptyOutDir=false\`; storefront \`node node_modules/next/dist/bin/next build\`. Lints: installed ESLint on each app; focused lint/bundle/parity in \`node output/adaptive-builder/phase3/remediation/verify-tooling.cjs\`. Browser server: \`node tests/helpers/adaptive-browser.cjs\`; it is stopped after evidence collection and viewport override reset.

An exploratory bare \`node --test\` also selected integration suites without the disposable environment: **1121/1221**, with **95 environment/setup failures plus the same five unit failures**. That log is retained as \`backend-full.log\`; it is not presented as an integration verification result. Package unit selection and isolated integration commands above provide the applicable evidence.

### Historical failures retained

1. \`ai-acceptance-provenance.test.js:11\`: empty product output / requested SEO fallback expectation.
2. \`ai-preferences.test.js:27\`: prompt version expectation 5 vs 4.
3. \`security-hardening.test.js:339\`: low-stock source regex expectation.
4. \`security-hardening.test.js:377\`: promotion warning copy/source regex expectation.
5. \`security-hardening.test.js:883\`: courier confirmation/Retry Courier source regex expectation.
6. \`integration/store-builder-safety.integration.test.js:295\`: spreading a Mongoose value into the pure normalizer reaches its depth guard; JSON boundary passes.
7. \`integration/store-builder-safety.integration.test.js:438\`: limited-plan partial normalization inserts a featured-products section rejected by the existing capability gate (403 vs expected 200).

These match the retained pre-remediation Phase 3 logs. Their test and responsible source files were not modified in this task. They remain release risks; assertions and plan/tenant guards were not weakened to clear them.

### Performance observations

\`node tests/helpers/benchmark-adaptive-renderer.cjs\`: 20 warmups + 100 samples. ${benchmark.results.map(row => `${row.name}: resolve median ${row.resolution.medianMs.toFixed(2)}ms, p95 ${row.resolution.p95Ms.toFixed(2)}ms; SSR median ${row.ssrIncludingCss.medianMs.toFixed(2)}ms`).join('; ')}. Near-limit document has 200 total nodes / 50 active nodes. This Windows run overlapped verification processes; measurements are observations, not an isolated performance SLO or retained-memory guarantee. The legacy entry does not import the adaptive resolver/compiler.

## 5. Exact files changed in this remediation

Repository root: \`C:/Users/user/WebstormProjects/Shop-for-all\`. SHA-256 and absolute paths are in [source-manifest.json](remediation/source-manifest.json). Existing work from Phases 1–3 was not reverted.

${fileList}

Generated logs, bundles, screenshots, manifests, fixture assets, helper scripts and retained app builds live only under \`output/adaptive-builder/phase3/remediation/\`. Prior evidence is preserved except this explicitly updated Phase 3 README. Frozen baseline SHA-256: \`06f9c824214c10ec907fcb5e5de12e269f3ba334749d98294ca381153452b841\`.

## 6. Compatibility, limitations and next step

All ten definitions, v4 normalization/effective resolution and frozen expected output are unchanged. No existing assertion/snapshot was regenerated. Six earlier renderer assertions were updated to test implemented palette support and semantic selectors; the singleton assertion now counts markup after removing its stylesheet, so a fixed CSS selector is not mistaken for an extra DOM core. No security or commerce assertion was removed.

No Store Builder UI, adaptive adoption, persistence/write-fence policy, merchant data, deployment, publication, dependency installation, commit or push was changed. The inactive contract's additive controls are not merchant capabilities. V5 ownership/transaction/recovery restrictions remain the existing Phase 2 implementation, verified with synthetic isolated fixtures.

**Next safe task:** verify actual 200% browser zoom in a browser with a real supported zoom control, record the zoom setting plus viewport/DPR and recheck product, checkout/OTP and long-content reflow. Review historical release failures separately. Revisit this readiness verdict before authorizing Phase 4; do not auto-enable adoption or start the editor.
`;
const reportPath = path.join(root, 'output/adaptive-builder/phase3/README.md');
const marker = '<!-- ORIGINAL_PHASE3_REPORT -->';
const previous = fs.readFileSync(reportPath, 'utf8');
const original = previous.includes(marker) ? previous.slice(previous.indexOf(marker) + marker.length).replace(/^\n/, '') : previous;
fs.writeFileSync(reportPath, report + '\n## Retained original Phase 3 report (historical)\n\nThe following evidence predates remediation; current status and superseding decisions are above.\n\n' + marker + '\n' + original);
const trackPath = path.join(root, 'track.md');
const trackMarker = '<!-- TRACK_BEFORE_PHASE3_REMEDIATION -->';
const oldTrack = fs.readFileSync(trackPath, 'utf8');
const oldHistory = oldTrack.includes(trackMarker) ? oldTrack.slice(oldTrack.indexOf(trackMarker) + trackMarker.length).replace(/^\n/, '') : oldTrack;
fs.writeFileSync(trackPath, `# Adaptive Store Builder — Phase 3 remediation (20 October 2026)

**Readiness: BLOCKED — actual 200% browser zoom remains unverified. Stop before Phase 4.**

Resolved core-first contract conflict, explicit adapter capabilities, scoped semantic palettes/typography/borders, catalog/media controls, narrow-page grid behavior, OTP short-screen scrolling/focus, touch targets, stale missing-product protection and adaptive-only contrast defects. Existing shared views/controllers retained; no merchant UI/adoption/data/deployment.

- Compatibility: **671/671**, including 27 new regression tests (107 renderer total), all ten definitions, 370 frozen cases, 144 older hashes and 20 home parity comparisons.
- Unit suite: **1123/1128**, same five historical failures. Isolated Mongo: **53/55**, same two historical failures; all 35 adaptive persistence + eight Atelier hardening checks pass.
- Real browser: **48/48** matrix cases; widths 320/360/390/430/768/1024/1440, default/light/dark/custom/inverted palettes, EN/BN wrapping, consent/OTP/critical states, narrow configured pages, contrast and 44px control targets. Real zoom shortcut left width/DPR/scale unchanged; 320×450 test is not zoom evidence.
- Both final production builds pass. Focused lint: 24 files, 0 errors/warnings. Storefront lint passes; full Admin retains 18 errors/4 warnings. CJS/ESM plan+CSS/capability parity passes (11 cases). Git diff check passes.
- Commands, exact changed paths, sources/hashes, browser screenshots/probe, benchmark observations, historical classifications and next safe acceptance task: **output/adaptive-builder/phase3/README.md** and **output/adaptive-builder/phase3/remediation/**.
- Disposable labeled tmpfs Mongo container removed after ownership check; synthetic browser tab closed, viewport reset and server stopped. No actual orders/messages were sent. No frozen expected results were changed.

Next: actual 200% zoom acceptance using a browser with a real zoom control, then review readiness. No automatic Phase 4.

${trackMarker}
${oldHistory}`);
const allowed = new Set(sourceFiles);
const current = execFileSync(git, ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
const candidates = [...new Set([...Object.keys(start.files), ...current])];
const changed = candidates.filter(file => !file.startsWith('output/adaptive-builder/phase3/remediation/')
    && (!fs.existsSync(path.join(root, file)) || sha(file) !== start.files[file]));
const unexpected = changed.filter(file => !allowed.has(file));
assert.deepEqual(unexpected, [], 'Unexpected pre-existing source/artifact changes');
assert.deepEqual(changed.sort(), [...sourceFiles].sort(), 'Exact task source scope');
write('source-manifest.json', sourceFiles.map(file => ({ path: file, absolutePath: path.join(root, file), initialSha256: start.files[file] || null, sha256: sha(file) })));
write('integrity.json', { revision: execFileSync(git, ['rev-parse', 'HEAD'], { cwd: root }).toString().trim(),
    checkedInitialFiles: Object.keys(start.files).length, exactChangedFiles: changed, unexpectedChanges: unexpected,
    frozenBaselineSha256: sha(baselinePath), priorEvidenceUnchangedExceptAuthorizedReadme: true,
    tenPresetDefinitionsAndLegacyV4SourcesUnchanged: ['index.cjs', 'index.mjs', 'effective.cjs', 'capabilities.cjs'].every(name => sha('packages/storefront-theme/' + name) === start.files['packages/storefront-theme/' + name]) });
let diffExit = 0, diffText = '';
try { diffText = execFileSync(git, ['diff', '--check'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
catch (error) { diffExit = error.status || 1; diffText = String(error.stdout) + String(error.stderr); }
fs.writeFileSync(path.join(__dirname, 'diff-check.log'), diffText || 'PASS\n');
fs.writeFileSync(path.join(__dirname, 'diff-check.exit.txt'), String(diffExit) + '\n');
assert.equal(diffExit, 0);
write('results.json', { verdict: 'BLOCKED', blocker: 'Actual 200% browser zoom unavailable/unverified', compatibility, unit,
    mongo: { tests: mongo.tests + mongoRelease.tests, pass: mongo.pass + mongoRelease.pass, fail: mongo.fail + mongoRelease.fail },
    browser: { cases: browser.length, failures: 0, realZoom: 'BLOCKED' }, tooling, changedFileCount: changed.length });
const artifacts = [];
function walk(dir) { for (const item of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, item.name); if (item.isDirectory()) walk(full); else if (full !== path.join(__dirname, 'artifact-sha256.json')) artifacts.push({ path: path.relative(root, full).replaceAll('\\', '/'), sha256: crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex') }); } }
walk(__dirname); write('artifact-sha256.json', artifacts);
console.log(JSON.stringify(json('results.json'), null, 2));
