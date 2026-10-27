# Phase 6 — Integration and acceptance

**Verdict: BLOCKED.** The guarded implementation and relevant automated checks pass. Actual native 200% and targeted modal/drawer checks now pass for documented states; complete accessibility, representative performance and release/operational gates remain incomplete. No real merchant activation, deployment, commit or push occurred.

**Latest follow-up:** compatibility **850/850**, full backend **1303/1308** with the same five historical failures. Browser access and actual native 200% are verified; rebuilt mobile filter and shared tracking/modal checks pass. Native zoom exposed adaptive navigation focus/scroll and proof-input keyboard and narrow purchase-label defects, now fixed with three additional regressions. Both final builds, lint deltas, default-off config and actual-route lifecycle pass. See [21 October follow-up](followup/README.md) and [22 October evidence](browser-2026-10-22/README.md); earlier counts below are historical checkpoints.

## Change boundary and immutable evidence

Task-start revision: `54a04b6d34939dab3b9cc6f0139a753116edbd32`. The pre-existing dirty tree was recorded before edits in `task-start.json`; prior work was retained. [changed-files.txt](changed-files.txt) is the exact source/tracker change manifest against that checkpoint (58 application/test/helper/fixture files plus `track.md`, including follow-up), not against a clean HEAD. New phase reports, scripts, logs, builds, screenshots and synthetic evidence are indexed by `artifact-sha256.json`.

The final integrity check compares initial file hashes, protected Phase 0–5 artifacts, preset definitions, frozen manifests, missing files and the preserved earlier tracker. Frozen manifest SHA-256: `06f9c824214c10ec907fcb5e5de12e269f3ba334749d98294ca381153452b841`. All ten theme definitions, 370 exact rendering cases, 144 protected earlier hashes and 20 Gallery/Builder/live-home comparisons remain unchanged. No baseline was regenerated.

### File-level responsibilities

| Files / group (exact paths in manifest) | Change and reason |
|---|---|
| `services/storeBuilder/adaptiveRolloutPolicy.js`, `adaptivePersistencePolicy.js`; `scripts/check-adaptive-release-config.js` | Default-deny OFF/pilot/all operator policy, independent write/render switches, trusted current entitlement/actor checks, sanitized read-only configuration check. |
| `effectiveThemeService.js`; `storeController.js`; `storeBuilderController.js` | Server-owned published projection; batched public sources; policy-aware cache keys; sanitized diagnostics; authorized v5 draft discard with CAS/version protection. |
| `storeBuilderService.js` | Merge partial ordinary v4 saves into the stored theme before normalization; complete preset replacement remains complete. Keep v5 completeness/old-writer fences first. |
| New `AdaptivePresentation.jsx`, `PublishedAdaptivePage.jsx`; existing storefront route/component wrappers | Conditional SSR-capable shared renderer integration for assigned, server-authorized published v5 data. Existing controllers supply trusted core render functions and callbacks. Unassigned/unauthorized paths retain legacy output. |
| Shared `adaptive/ProtectedCore.jsx`, `presentation/CategoryView.jsx`, `CheckoutSections.jsx`; storefront checkout/account wrappers | Reuse existing functional children and controllers; conditional semantic regions/parts for live styling parity. Product reviews/related items and account security content remain owned by their existing components. |
| `packages/storefront-theme/adaptive.cjs` / `.mjs`; `adaptiveEditorState.js` | One finite normalized color-token helper for editor/live resolution; nested legacy color objects are not passed as adaptive tokens. |
| `AdaptiveInspector.jsx` | Stable labels, field-associated validation errors, `aria-invalid` and error clearing without changing graph validation. |
| `StorefrontPreview.jsx`, `PreviewSectionToolbar.jsx`, `previewEditor.js`, `ThemeGallery.jsx`, `themes/themePreview.js`, `BasicEditors.jsx` | Separate pure factories from component exports and correct memo dependencies; resolve relevant Builder lint errors while retaining existing rendering. |
| `src/proxy.js`; proxy/first-render tests | Canonical tenant-root rewrite avoids internal-path 308 redirect; preserve query strings in tenant rewrites. Tenant host/proof boundary stays in place. |
| Shared header/checkout/review presentation; storefront `SearchModal.jsx`, `ReviewSection.jsx` | Adaptive icon/quantity control names; real route-aware review login URL; reuse existing dialog focus management. Disable competing adaptive autofocus so Escape restores the opener. Default shared legacy markup is preserved; the storefront review wrapper intentionally fixes the broken sign-in URL for every theme. |
| Release unit/integration tests and existing harnesses listed in manifest | Exercise gates, lifecycle, actual production Next SSR, CAS/old-client/tenant/media boundaries; update test adapters for delegated JSX while preserving old functional assertions. |
| Acceptance preload, published preview and benchmark helpers | Three fixed loopback disposable databases, mocked transports/no workers; separately reproducible real storefront browser fixture and phase-local performance output. |

## Complete preview/live path

Authenticated existing Builder → pure validated v5 candidate → existing draft/CAS API → transactional publication/revision/media protection → current server policy/plan → published-only projection and tenant-scoped source joins → existing storefront route/controller → shared `resolveAdaptivePage` / compiler / `PageTemplateRenderer` → trusted commerce presentation.

No second renderer or commerce controller was added. Adaptive code is dynamically loaded only for an assigned server projection. Internal projection helpers are not public adoption endpoints. Operator configuration is never accepted from request JSON, local storage, query strings or theme identity. The intentional shared functional corrections are the review sign-in target and canonical/query-preserving tenant rewrites; preserved rendering hashes do not imply those formerly broken navigation outcomes were left unchanged.

Actual HTTP integration publishes only a generated synthetic tenant, runs a production `next start` application, requests ten page routes through the real tenant proxy, compares exact compiler CSS after normalizing only its scope ID, and restores a compatible recovery revision. Global header/footer are checked with these routes, covering all twelve page families. See `actual-route-evidence.json`, `ssr-*.html`, `next-ssr-server.log`, `mongo-final.log` and the separate browser evidence.

## Page and state verification

| Family | Actual evidence | Limit |
|---|---|---|
| Home | Builder hero/catalog/content and optional block commands; real published home/catalog; 9 widths. | Synthetic media is intentionally nonproduction; no real media recovery/provider drill. |
| Product | Click-to-select title/alignment, quantity/add-to-cart, product information/reviews retained, account link fixed; SSR/CSS parity. | Unavailable synthetic image exercises existing image fallback; no new image-loading performance claim. |
| Category / collection | Both actual routes, Builder available loading/empty/content/error states, existing filter/sort/listing callback tests. | Not every filter permutation was manually exercised. |
| Cart | Actual quantity, summary, checkout navigation and remove-to-empty; protected core/parts. | Browser did not submit a real order. |
| Checkout | Actual customer fields, delivery/payment, quantities, summary, consent, incomplete-submit disabling; synthetic preview states and mocked integration OTP/order/security contracts. | Real-provider OTP and browser order-success journey not performed. |
| Account | Synthetic real customer login, dashboard, orders/security tab and sign-out; existing controller remains authoritative. | No password change or production authentication. |
| Tracking | Actual page/form, available synthetic OTP/result/error/cancel/return presentation states and existing controller tests. | No live OTP, real order access or courier call. |
| Policy index / details | Both actual routes, required policy navigation/content, shared template/CSS and responsive checks. | Complete editorial/accessibility review remains a manual gate. |
| Header / footer | Actual global templates and links on routes; accessible adaptive icon names; search dialog focus trap and Escape restoration. | Full keyboard/screen-reader audit is not claimed. |

The editor used all twelve page/global choices and **57 available synthetic states**. Browser evidence covers real application interaction, not only HTTP requests. `browser/acceptance.json` and `browser/live-acceptance.json` separate simulated states from actual customer-controller journeys.

## Browser, zoom and accessibility

Verified selection, inspector edits, undo/redo, add/copy/move/remove, independent saved sections, style presets, local autosave/reload and cross-page retention. Required-core destructive operations stayed disabled. Invalid font size was rejected and associated with its input. Tree Arrow-key/Enter interaction has a visible focus outline. Search has a named dialog/input, both focus wraps and verified Escape return to Search after a browser-discovered autofocus fix.

At widths **320/360/390/430/767/768/1023/1024/1440**, the editor had no page-level horizontal overflow. Ten actual storefront routes at the same widths produced **90 non-overflow checks**. These measurements do not substitute for zoom or complete visual acceptance. No hydration errors were captured in the tested interactive journeys.

**Actual 200% zoom: PASS for documented views, 22 October.** User-assisted Chrome menu changes were independently confirmed at native zoom 2/DPR 2. The Builder and all ten public route families pass measured page-level reflow and targeted control/keyboard checks. Shared cancellation/return component states and the rebuilt real navigation also pass their focus checks. Screen-reader, complete WCAG 2.2 AA, reduced-motion, touch target and exhaustive contrast/content/state acceptance remain incomplete. See [current evidence](browser-2026-10-22/README.md) and [BROWSER_ACCEPTANCE.md](BROWSER_ACCEPTANCE.md).

## Security, persistence and recovery

- Existing bounded graph/content/source/style validation, required cores, semantic capabilities, responsive specificity and complete-theme byte limits remain enforced on backend and renderer. No arbitrary HTML/CSS/JavaScript or programmable commerce/lookup port is accepted.
- Fresh active user/membership/staff permissions and current full operational Builder entitlement are required for v5 mutations. Request-supplied plan objects do not authorize adoption. Explicit approved operator tenant scope is additionally required.
- Published public data excludes saved/private libraries and unused templates/presets. Asset reads and all catalog joins are tenant-scoped; product cards reuse existing public serialization and scheduled pricing. Catalog source queries are batched per family rather than per block.
- Draft write/discard CAS, old v4 client fences, unsupported versions, foreign sources/assets, staff revocation, subscription downgrade/re-enablement, transactional publish/rollback, revision recovery and retained media are covered by disposable tests. Actual unique draft-shop, revision `(shop_id, revision)` and asset `publicId` indexes were checked there.
- Write and render kill switches are independently tested. Disabling rendering restores legacy backing presentation while preserving v5 data. Restoring a retained v5 empty-assignment revision recovers legacy appearance; it does not permit old v4 writers to erase v5 data.
- No production database/index/media restore was performed. Existing Mongoose duplicate-index/deprecation warnings remain; no assertion was weakened to suppress them.

## Performance evidence, not production SLOs

Same synthetic 200-node fixture, 30 retained JSON history strings; local Node repeated operations:

| p95 | Phase 5 baseline (ms) | Phase 6 (ms) |
|---|---:|---:|
| Serialization | 0.867 | 1.347 |
| Validated inspector edit | 21.728 | 23.620 |
| Resolve all 12 pages | 83.528 | 80.315 |
| Style compilation | 0.184 | 0.188 |
| Product SSR preview | 21.528 | 24.489 |

These are separate local runs under variable load, not evidence of a statistically proven gain or regression. No speculative optimization was introduced. Snapshot UTF-8 size is 58,411 bytes; 30 retained history strings account for approximately 3,504,660 UTF-16 bytes, excluding current/future snapshots, objects, React and actual browser heap. Small/medium fixtures and all timings are in `performance.json`.

The explicit adaptive renderer browser entry at the original checkpoint is **568,866 bytes unminified with dependencies external** (latest **571,287** after accessibility fixes), not transferred production JS or a legacy-route download estimate. Exact production route response bytes/SSR timings and CSS parity are in `actual-route-evidence.json`; these are local loopback requests, not network/load benchmarks. On 22 October Chrome diagnostics exposed initial Navigation/Paint/resource/heap counters: storefront warm-reload FCP **184/196/252 ms**, Admin development navigation FCP **364 ms**. See [raw observations and limitations](browser-2026-10-22/README.md). Representative LCP/CLS/INP, hydration cost, image/cache distributions and interactive timing/memory traces remain unverified. No performance score or improvement claim is made.

## Commands and results

Commands below use existing installed Node/tooling; no dependency was installed. Run backend commands from `ecommerce-backend/backend`.

| Check | Result | Artifact |
|---|---|---|
| Before-change compatibility | 839/839 PASS | `compatibility-before.log` |
| Final compatibility, including 3 new rollout tests | 842/842 PASS | `compatibility-final.log`, `home-parity-final.json` |
| Full backend `node --test 'tests/*.test.js'` | 1295/1300; same 5 historical failures | `backend-full.log` |
| Six relevant isolated Mongo files below | 62/62 PASS, final rerun | `mongo-final.log` |
| Supplemental all integration files | 86/102; 15 dedicated-DB guard failures, 1 unrelated catalog assertion | `mongo-broad.log` |
| Admin `node node_modules/vite/bin/vite.js build --outDir ../output/adaptive-builder/phase6/admin-dist --emptyOutDir=false` | PASS | `admin-build.log` |
| Storefront `node node_modules/next/dist/bin/next build --webpack` | PASS, including final focus fix | `storefront-build.log` |
| Storefront `node node_modules/eslint/bin/eslint.js .` | PASS | `storefront-lint-after.log` |
| Admin equivalent full lint | 13 historical unrelated errors, 0 warnings; relevant Builder errors fixed | `admin-lint-after.log` |
| Focused changed-source tooling | 16 errors/1 warning all classified pre-existing, 0 introduced; CJS/ESM parity PASS | `tooling-results.json`, `lint-delta.json` |
| Config `node scripts/check-adaptive-release-config.js` | PASS; default OFF, writes/rendering false | `config-check.log` |
| `node tests/helpers/benchmark-adaptive-release.cjs` | Completed synthetic measurement | `performance.json` |
| `git diff --check`; `node output/adaptive-builder/phase6/final-audit.cjs` from root | PASS; line-ending notices are not whitespace defects | `git-diff-check.log`, `integrity.json` |

Final focused command:

```powershell
$env:THEME_PARITY_REPORT='C:/Users/user/WebstormProjects/Shop-for-all/output/adaptive-builder/phase6/home-parity-final.json'
node --test tests/adaptive-builder-baseline.test.js tests/storefront-preview-parity.test.js tests/storefront-atelier-contract.test.js tests/storefront-atelier-routes.test.js tests/storefront-atelier-commerce.test.js tests/storefront-atelier-builder.test.js tests/storefront-atelier-presentation.test.js tests/storefront-release-hardening.test.js tests/storefront-effective-theme.test.js tests/store-builder-prebuilt-themes.test.js tests/adaptive-page-contract.test.js tests/adaptive-persistence.test.js tests/adaptive-renderer.test.js tests/adaptive-renderer-remediation.test.js tests/adaptive-editor.test.js tests/adaptive-full-site.test.js tests/adaptive-release.test.js
```

Final Mongo command uses only the verified tmpfs replica set and a database separate from both running previews:

```powershell
$env:NODE_ENV='test'
$env:SFA_ISOLATED_ACCEPTANCE='c085454b'
$env:SFA_ACCEPTANCE_DATABASE='adaptive_phase6'
$env:MONGO_URI_TEST='mongodb://127.0.0.1:27028/adaptive_release_phase6_test?directConnection=true&replicaSet=rs0'
node --require ./tests/helpers/isolatedAcceptance.cjs --test --test-concurrency=1 tests/integration/adaptive-persistence.integration.test.js tests/integration/store-builder-safety.integration.test.js tests/integration/atelier-release-hardening.integration.test.js tests/integration/adaptive-editor.integration.test.js tests/integration/adaptive-full-site.integration.test.js tests/integration/adaptive-release.integration.test.js
```

### Failure register

1. Historical backend AI empty-product chargeability expectation — unrelated to this integration; retained failing assertion.
2. Historical shared AI voice/prompt-version expectation — unrelated; retained.
3. Historical low-stock notification source assertion — unrelated; retained.
4. Historical promotion scheduling Admin source/copy assertion — unrelated; retained.
5. Historical confirmed-status courier retry source/copy assertion — unrelated; retained.
6. Historical Mongo full-plan prebuilt round trip: corrected test's Mongoose-subdocument spread and current frozen preset-version expectation; added old-version preservation assertion. Historical limited-plan autosave: fixed partial normalization/merge without fallback section injection. Both now pass; immutable baselines unchanged.
7. Admin lint: `Topbar.jsx` unused import and effect state update; `GrowthCenter.jsx` effect state update; five older fixture files' unused React/refresh export checks. Relevant Builder lint errors/warnings were fixed. No unrelated application refactor was made.
8. Supplemental broad Mongo run: AI accounting's 10 and registration welcome's 5 checks require their own specifically named disposable databases; their before-hook guards correctly rejected the Adaptive DB. They were not bypassed or counted as product failures/pass evidence. One catalog-bulk assertion (`isActive` expected false, actual true, line 78) failed. Catalog test/controller/commerce sources were not changed here; no before-task execution establishes this assertion as historical, so it remains an **unrelated unresolved finding**, not a claimed pre-existing pass.

Intermediate introduced failures (preset identity retained by an overbroad merge, changed default policy reason, test adapter handling, duplicate dialog autofocus) were fixed and retested. Their earlier logs remain in this directory. Source assertions moved with delegated JSX; assertions were not removed to conceal regressions.

## Acceptance and exact next step

**Phase 6 BLOCKED; no known newly introduced critical security/data-loss regression remains in verified paths.** This is not full production certification. Native 200% and targeted modal checks are now verified. Complete remaining accessibility and representative performance gates, and triage the failure register with release owners. Review deployment backup/index/topology/monitoring readiness and commercial eligibility before any named pilot. Phase 7 may prepare operations, but no real activation is authorized by this report.
