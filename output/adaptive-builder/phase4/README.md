# Adaptive Store Builder — Phase 4

Date: 21 October 2026 (Asia/Dhaka).

**Acceptance: BLOCKED.** Inactive homepage/global editor implementation is complete
for this phase's supported contracts. Actual **200% browser zoom** remains
unverified. Ordinary merchant adoption remains disabled. Phase 5 has not started.

## Scope and decisions

- Home, global header and global footer editing only. Other page options are
  explicitly disabled. Product/checkout presentation adapters from Phase 3 remain
  available to tests; this phase exposes no customer-page editing.
- Reuses the existing `StoreBuilderPage` whole-theme state, dirty comparison,
  serialized draft queue, CAS timestamps/revisions, autosave and history. No second
  draft store, renderer, provider, database collection or dependency was added.
- The lazy contextual editor requires a v5 document and an explicit server
  availability grant. Production `getAdaptiveAvailability()` still always returns
  `available: false`; mutation policy, actor/tenant/staff/plan checks and old-client
  fences are unchanged. Existing v5 designs/drafts open read-only when unavailable.
- No theme conversion, merchant adoption, environment change, deployment,
  publication, production-data modification, commit or push was performed.
- Code-owned Hero, Story, Promotion and Banner starters compose existing registered
  blocks. They do not add new schema types or convert existing legacy sections.
- Layout is tree/slot based. Fixed functional sizes, arbitrary placement, CSS,
  HTML, JavaScript, selectors and programmable sources are not offered.

## Implemented editor behavior

### Structure and selection

- Three areas: hierarchical structure, actual shared-renderer iframe preview,
  contextual inspector. Small screens use one selectable panel; tablet screens
  move the inspector below the structure/preview area.
- Stable `{templateId,nodeId,partId,viewport}` selection, selection breadcrumbs,
  optional-block add/remove/duplicate/reorder/move, visibility and parent/locate
  controls. Graph changes use the existing immutable commands and full validation.
- Protected identity/navigation/policy cores cannot be removed, duplicated,
  hidden, moved or saved as merchant sections. Invalid slots are omitted; node
  budgets disable oversized additions; the command validator remains authoritative.
- Click-to-select uses parent-side event capture. Commerce clicks select catalog
  parts without executing their actions. Submit events are blocked. Keyboard tree
  navigation, preview Enter/Space, Escape, visible focus and issue-to-field focus
  use registered identities. No array index is persisted as a selected identity.

### Content, design and reuse

- Quick Edit: text/headings, typed links, tenant images, catalog count/manual public
  products, simple colors, visibility, starter layouts and compatible saved presets.
- Design Mode: renderer-supported color tokens/custom solid colors, font family,
  size/weight/line height/letter spacing, alignment, dimensions, padding/margins,
  gaps, borders/radius, media fit/aspect ratio, stack/columns and mobile stacking.
- Advanced Mode: approved semantic parts, detailed tier overrides, saved-section
  creation/rename/preview/independent insertion/deletion and compatible named
  presets with affected-property/use counts. Applying a preset affects one node;
  explicit overrides retain precedence. Referenced presets cannot be deleted.
- Device widths are real 390/768/1280px iframes, externally fitted to the Admin
  panel. The document inside the iframe responds to CSS breakpoints, rather than
  receiving a scaled desktop snapshot. Scrollbars can reduce its content width
  (for example 390px frame / 375px content).
- Property origins distinguish explicit, earlier-tier, preset and theme/page
  inheritance. Property/tier/page/subtree resets preserve content and unrelated
  data. Reset also clears rejected local field text. Unknown local recovery formats
  are retained until explicit discard; they do not prevent separate server saves.
- Existing bounded history coalesces typing at 550ms idle and at most 2 seconds
  during continuous adaptive editing, with interaction boundaries and 30 entries.
  Stable node IDs survive undo, redo and recovery. No second history engine.

### Globals and intentional constraints

- Header: current/tenant-owned logo selection, existing compatible composition
  variants, registered identity/navigation/utility typography, colors, spacing and
  page container width. Atelier's masthead composition remains code-owned and is
  explained rather than represented by an ineffective variant control.
- Footer: existing description/contact label/contact email, approved semantic
  styles, safe additional registered content and page width. Existing navigation,
  social/custom links, policy links and store information are retained. This phase
  does not add a second navigation/social-link manager or freely editable columns.
  Theme-owned column composition is explicitly explained.
- Global adapters reuse the existing Reference/Atelier components. Opt-in markers
  and scoped container rules adapt their composition to a narrow edited container.
  Legacy non-adaptive markup omits the markers and keeps its existing rendering.
- Legacy theme replacement/reset actions are unavailable for adaptive drafts;
  defensive handlers also preserve the complete graph. Contextual resets remain.

## Exact changed source/test paths

Paths below are relative to the repository root. `changed-files.txt` and
`integrity.json` provide the complete machine-readable list and SHA-256 hashes.
Earlier uncommitted Phase 1–3 work was present at task start and is not counted as
new Phase 4 work merely because Git lists it as dirty.

| Path | Purpose |
|---|---|
| `ecommerce-admin/src/pages/dashboard/StoreBuilder/adaptive/AdaptiveStoreEditor.jsx` | Gated shell, selection/tree, real preview, safe commands, modes, scoped issue handling |
| `ecommerce-admin/src/pages/dashboard/StoreBuilder/adaptive/AdaptiveInspector.jsx` | Typed content/style controls, globals, resets and libraries |
| `ecommerce-admin/src/pages/dashboard/StoreBuilder/adaptive/adaptiveEditorState.js` | Pure selection/placement/starter/recovery helpers and scoped command boundary |
| `ecommerce-admin/src/pages/dashboard/StoreBuilder/adaptive/adaptiveEditor.css` | Responsive panels, selection/focus, reduced motion |
| `ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx` | Existing state/history/autosave integration, v5 read-only fence, recovery and action guards |
| `ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderHeader.jsx` | Explain/disable unsupported adaptive theme replacement and global reset; avoid duplicate mobile navigation |
| `ecommerce-admin/src/pages/dashboard/StoreBuilder/storeBuilderThemeUtils.js` | Explicit version-aware theme loading |
| `ecommerce-admin/src/pages/dashboard/StoreBuilder/hooks/useAutosaveRecovery.js` | Preserve unknown recovery, correct lifecycle/dependencies, reuse existing write queue |
| `packages/storefront-theme/pageTemplateCommands.cjs` | Add validated library operations and atomic page-style reset |
| `packages/storefront-theme/ADAPTIVE_CONTRACT.md` | Additive commands and inactive editor/global boundary documentation |
| `packages/storefront-renderer/adaptive/pagePlan.js` | Resolve header/footer assignments through the same registry/plan |
| `packages/storefront-renderer/adaptive/ProtectedCore.jsx` | Reuse existing header/footer views with trusted props |
| `packages/storefront-renderer/adaptive/corePalette.js` | Approved global surface contexts |
| `packages/storefront-renderer/adaptive/styleCompiler.js` | Scoped global styles and safe container-responsive composition |
| `packages/storefront-renderer/adaptive/PageTemplateRenderer.jsx` | Optional editor-only keyboard focus markers |
| `packages/storefront-renderer/reference/StorefrontHeader.jsx` | Opt-in semantic/layout markers; default output unchanged |
| `packages/storefront-renderer/reference/StorefrontFooter.jsx` | Opt-in semantic/layout markers; default output unchanged |
| `packages/storefront-renderer/atelier/AtelierHeader.jsx` | Opt-in identity/utility/surface markers |
| `packages/storefront-renderer/atelier/AtelierFooter.jsx` | Opt-in identity/navigation/policy/surface markers |
| `ecommerce-backend/backend/services/storeBuilder/storeBuilderService.js` | Authenticated bootstrap availability and referenced tenant media; public selected-product hydration |
| `ecommerce-backend/backend/tests/adaptive-editor.test.js` | 54 editor/contract/rendering/security tests |
| `ecommerce-backend/backend/tests/integration/adaptive-editor.integration.test.js` | Real MongoDB tenant media/gate and library-copy/CAS tests |
| `ecommerce-backend/backend/tests/fixtures/adaptive-builder/editor-fixtures.cjs` | Synthetic store/public product/media/global fixtures |
| `ecommerce-backend/backend/tests/fixtures/adaptive-builder/editor-browser-api.js` | Browser-only isolated mock transport and conflict/limit/Atelier scenarios |
| `ecommerce-backend/backend/tests/fixtures/adaptive-builder/editor-browser.jsx` | Mount actual Builder and expose fixture-only diagnostics |
| `ecommerce-backend/backend/tests/helpers/adaptive-editor.cjs` | CJS SSR/pure-helper fixture bundle; reject live dependencies |
| `ecommerce-backend/backend/tests/helpers/adaptive-editor-browser.cjs` | Loopback, GET-only browser fixture; CSP blocks network transports/forms |
| `ecommerce-backend/backend/tests/helpers/benchmark-adaptive-editor.cjs` | Bounded selection/tree/edit/serialization/SSR measurements |
| `ecommerce-backend/backend/tests/adaptive-renderer.test.js` | Header/footer now have authorized adapters, so are no longer unsupported-family cases |
| `ecommerce-backend/backend/tests/adaptive-renderer-remediation.test.js` | Expect the additive five-adapter capability map |
| `ecommerce-backend/backend/tests/storefront-atelier-builder.test.js` | Supply actual version-aware recovery helper to existing VM harness; retain assertions |
| `ecommerce-backend/backend/tests/storefront-preview-data.test.js` | Supply new explicit storage/policy mock dependencies and assert closed bootstrap availability |
| `track.md` | Phase 4 completion/verification/blocker entry; earlier content retained |

Additional task-only scripts, logs, builds, browser bundle, screenshots and
evidence are under this directory. No application model, route, commerce API,
dependency/lockfile, `.env`, preset definition or adoption policy was changed.

## Verification results

| Gate | Result | Evidence |
|---|---|---|
| Before-edit compatibility | **671/671** | `compatibility-before.log` |
| Final compatibility | **723/723** | `compatibility-gate.log`, exit 0 |
| New editor tests | **54/54** | Included in final compatibility/full backend; earlier `editor-final.log` has 53 before the Quick Edit preset test |
| Full backend unit suite | **1175/1180**, five historical failures | `backend-unit-gate.log`, exit 1 |
| Real isolated MongoDB | **55/57**, two historical failures | `mongo-integration-verified.log`, exit 1; both new integration tests pass |
| Actual Builder browser | 34 passing assertions, two earlier failed attempts corrected and retested; no unresolved recorded interaction | `browser/results.json` |
| CJS/ESM plans, CSS, capabilities | **PASS**, 13 page/palette cases | `tooling-gate.log`, `tooling-results.json` |
| All changed JS/JSX lint | **PASS**, 30 files, 0 errors/warnings | `tooling-gate.log` |
| Actual Admin ESLint on changed Builder files | **PASS** | `admin-focused-lint-accepted.log`, exit 0 |
| Full Admin ESLint | **16 errors / 2 warnings**, remaining historical findings | `admin-full-lint-gate.log` |
| Storefront ESLint | **PASS** | `storefront-lint-final.log`, exit 0 |
| Admin production build | **PASS** | `admin-build-gate.log`, exit 0 |
| Storefront production build | **PASS** | `storefront-build-final.log`, exit 0 |
| Git whitespace check | **PASS** | `git-diff-check.log`, exit 0 |
| Source/immutable evidence integrity | **PASS** | `integrity.json`, `changed-files.txt`, `artifact-sha256.json` |
| Actual 200% browser zoom | **BLOCKED** | `zoom-prerequisite.json` |

The final count is 671 earlier cases minus two now-supported global
unsupported-adapter cases plus 54 new tests = 723. No frozen expectation/hash was
regenerated. All ten preset definitions, 370 exact rendering cases, 144 protected
earlier hashes and 20 Gallery/Builder/live-home comparisons remain unchanged.
Frozen manifest SHA-256:
`06f9c824214c10ec907fcb5e5de12e269f3ba334749d98294ca381153452b841`.

### Browser evidence and limits

The fixture mounts the actual `StoreBuilderPage`, actual existing iframe and
adaptive renderer. API imports are aliased only in this test bundle to a synthetic
transport. It has no real axios/Auth/Cart/order/OTP integration. HTTP writes,
provider uploads and publication are deliberately blocked. Positive backend
approval fixtures are in-process method mocks on the disposable database only.

Verified: grouped text undo/redo; server-draft reload/recovery; acknowledged recovery
prompt dismissal; unknown recovery retention during server autosave; stale draft
conflict; header/footer selection/protection; per-section and desktop/mobile
typography; invalid input, contrast rejection and reset; semantic product-card
click selection without navigation/cart writes; keyboard child navigation and
preview activation/focus; saved copies and deletion independence; preset creation
and application; compatible insertion/reorder/duplicate/removal; typed links;
preview-only mode; seven Admin widths (320/360/390/430/768/1024/1440); 200-node
document editing and budget rejection; default/Atelier narrow global containers.

Two recorded failed attempts are retained with successful retest references:
issue focus originally selected the source dropdown instead of the invalid hex
input (fixed); an expanded test diagnostic string caused apparent 320px overflow
(diagnostic now wraps; application panels themselves were bounded).

Actual 200% zoom was attempted **before edits**. The available browser has viewport
controls but no zoom API; DOM shortcut timed out and the native shortcut left
width/DPR/scale unchanged. Viewport resizing and fitted preview scaling do not
prove zoom accessibility. Full assistive-technology/touch testing, actual upload
provider behavior and a real approved merchant publication are not claimed.

Saved screenshots: `browser/desktop-editor.png`, `browser/mobile-editor.png`.
Final tab cleanup/viewport reset was interrupted with “Local browser use is disabled
in Work settings”; no setting was re-enabled or bypassed. The local fixture server
was stopped. Temporary browser tabs may remain until the app closes them.

### Historical failures, not hidden or weakened

Backend five, same as Phase 3:

1. `ai-acceptance-provenance.test.js:11`: SEO provider/fallback chargeability expectation.
2. `ai-preferences.test.js:27`: prompt version expectation (5 versus 4).
3. `security-hardening.test.js:339`: low-stock source-text expectation.
4. `security-hardening.test.js:377`: promotion source/UI copy expectation.
5. `security-hardening.test.js:883` (assertion 905): courier confirmation/retry source-text expectation.

Integration two, same as Phase 3:

1. `store-builder-safety.integration.test.js:295`: spreading nested Mongoose theme
   objects into the pure patch guard exceeds depth; pre-existing diagnosis retained.
2. `store-builder-safety.integration.test.js:438`: limited-plan partial normalization
   introduces the fallback section, yielding 403 rather than the expected 200.

Full Admin lint previously had 18 errors/4 warnings. This phase corrected two
existing render-phase ref writes and two dependency warnings in the hook/Page it
already modified. Remaining 16 errors/2 warnings are in unchanged files; no lint
rule or test assertion was disabled to hide them.

Initial failures caused by this work (wrong storage-entry import, missing test
harness dependencies, validation-focus target and narrow header composition) were
fixed and rerun. Early logs are retained separately from the final gate logs.

## Performance

`editor-performance.json` reports warm local Node measurements, not a production
SLA. At 200 total nodes / 50 home nodes: validation/edit median **23.42ms**, p95
**24.46ms**; resolution median **8.40ms**, p95 **10.26ms**; serialization median
**0.60ms**, p95 **1.00ms**; SSR preview median **3.80ms**, p95 **4.27ms**.

The 200-node snapshot was 58,411 UTF-8 bytes. Thirty retained UTF-16 history strings
would occupy approximately 3.50MB of string data; this excludes runtime/object
overhead/current/future and is **not a measured browser heap**. The supported whole
theme remains bounded at 256KiB and history at 30 entries.

Browser synthetic initial frame readiness was about 354–455ms in recorded runs;
near-limit frame readiness 359ms and input-to-two-animation-frame observation
65.4ms. These timings include fixture scheduling/rendering and are observations
from this machine, not statistically reliable production percentiles. Selection
does not fetch catalog data or rebuild an independent draft. The memoized preview
keeps its plan when only selection changes. The explicit inactive renderer bundle
is 434,057 raw bytes with React/JSX/lucide external, not a route download estimate.

## Security and compatibility

- Reuses graph/content/source/style limits, safe IDs, finite public bindings,
  protected-core invariants and typed compiler-owned semantics. No direct JSON
  inspector or CSS/HTML/expression bypass exists.
- Preview actions are inert and captured; no real customer/order data is used.
  Only trusted public product projections and referenced tenant media enter the
  preview. Copying saved sections does not turn an asset ID into authorization.
- Bootstrap media query includes `shop_id`, referenced IDs and permitted states;
  response omits provider public IDs. Integration tests prove foreign/unreferenced
  URLs are not hydrated, other tenants are isolated and anonymous access is denied.
- Backend ownership, transactions, membership, trusted-plan/staff authorization,
  old-client fences, CAS and adoption rejection remain active. Pure UI validation
  does not claim to prove database ownership.
- Rejecting a protected palette retains the last valid document/preview and blocks
  publication until corrected/reset. Optional contrast feedback is advisory;
  protected contrast is also checked by the shared resolved-palette mechanism.
- Existing application routes, ten theme definitions/output, legacy normalization,
  commerce behavior, model schemas and write policies are unchanged. The existing
  Builder gains the documented recovery hardening. No new merchant capability is
  active. v5 persistence from Phase 2 was reused, not introduced or enabled here.

## Commands and isolated environment

Run test commands from `ecommerce-backend/backend` unless otherwise stated. Exact
stdout/stderr and native exit codes are retained beside this report.

```powershell
# Full backend includes all immutable/theme/security/editor unit suites
$env:THEME_PARITY_REPORT='C:/Users/user/WebstormProjects/Shop-for-all/output/adaptive-builder/phase4/full-unit-home-parity-gate.json'
node --test 'tests/*.test.js'

# Final focused compatibility (723 cases)
node --test tests/adaptive-builder-baseline.test.js tests/storefront-preview-parity.test.js tests/storefront-atelier-contract.test.js tests/storefront-atelier-routes.test.js tests/storefront-atelier-commerce.test.js tests/storefront-atelier-builder.test.js tests/storefront-atelier-presentation.test.js tests/storefront-release-hardening.test.js tests/storefront-effective-theme.test.js tests/store-builder-prebuilt-themes.test.js tests/adaptive-page-contract.test.js tests/adaptive-persistence.test.js tests/adaptive-renderer.test.js tests/adaptive-renderer-remediation.test.js tests/adaptive-editor.test.js

# Only after verifying the disposable replica set and exact database
$env:NODE_ENV='test'
$env:SFA_ISOLATED_ACCEPTANCE='c085454b'
$env:MONGO_URI_TEST='mongodb://127.0.0.1:27028/atelier_acceptance_c085454b_test?directConnection=true&replicaSet=rs0'
node --require ./tests/helpers/isolatedAcceptance.cjs --test --test-concurrency=1 tests/integration/adaptive-persistence.integration.test.js tests/integration/store-builder-safety.integration.test.js tests/integration/atelier-release-hardening.integration.test.js tests/integration/adaptive-editor.integration.test.js
node tests/helpers/benchmark-adaptive-editor.cjs

# Repository root
node output/adaptive-builder/phase4/verify-tooling.cjs
node output/adaptive-builder/phase4/final-audit.cjs
git diff --check

# ecommerce-admin
node node_modules/vite/bin/vite.js build --outDir ../output/adaptive-builder/phase4/admin-dist --emptyOutDir=false
node node_modules/eslint/bin/eslint.js .
node node_modules/eslint/bin/eslint.js src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx src/pages/dashboard/StoreBuilder/StoreBuilderHeader.jsx src/pages/dashboard/StoreBuilder/storeBuilderThemeUtils.js src/pages/dashboard/StoreBuilder/hooks/useAutosaveRecovery.js src/pages/dashboard/StoreBuilder/adaptive

# ecommerce-storefront
node node_modules/next/dist/bin/next build
node node_modules/eslint/bin/eslint.js .
```

Mongo used cached official `mongo:7`, image SHA
`c53852c00c23ca9f23fc39690350ffa9a80e3642fe8f96879726d8da0abe80a7`,
container `sfa-adaptive-phase4`, ownership label `sfa.task=adaptive-phase4`, loopback
27028, tmpfs `/data/db`, replica set `rs0` and verified writable primary. Existing
isolation preload blocks `.env`, external services/workers and uses mocked
transports. The container was stopped/removed only after label/port/tmpfs ownership
checks (`mongo-cleanup.json`); cached image and previous evidence were retained.

## Remaining gates and exact next safe task

**Phase 4 readiness: BLOCKED. No Phase 5, adoption, deployment or publication.**

First safe task: open the isolated actual-Builder fixture in an approved browser
with a real browser zoom control, set **200%**, verify shell/inspector/header/footer,
keyboard focus/issue navigation and EN/BN wrapping, and record zoom measurements,
screenshots and overflow results. Do not substitute CSS zoom or viewport scaling.

Then review the historical failure register and the documented accessibility,
provider/upload and publication limits. Product approval/entitlement, pilot and
reader-first deployment gates remain separate. No configuration migration is
required to keep this implementation inactive.
