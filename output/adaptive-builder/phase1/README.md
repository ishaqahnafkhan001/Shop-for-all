# Adaptive Full-Site Store Builder — Phase 1 implementation report

Date: 20 October 2026. Start revision: `54a04b6d34939dab3b9cc6f0139a753116edbd32`.

**Phase 2 readiness: PASS.** The inactive contract is implemented and its final tests pass. **Phase 2 has not started.** This is not production release approval: the existing release failures and later persistence/rendering/media/browser gates remain open.

## A. Implementation and exact source paths

All paths below are relative to `C:/Users/user/WebstormProjects/Shop-for-all`.

| File | Change / responsibility |
|---|---|
| `packages/storefront-theme/adaptiveData.cjs` | New bounded JSON/key/ID utilities, safe cloning after validation, immutable manifest freezing and issue format. |
| `packages/storefront-theme/pageTemplates.cjs` | New frozen registry: twelve exact approved page kinds, versioned blueprints, nineteen block types, finite sources, slots, protected cores, parts and supported operations. |
| `packages/storefront-theme/pageTemplateValidation.cjs` | New strict graph/content/source/style/preset/saved-section validator and separate whole-theme JSON byte-budget check. No persistence/adoption. |
| `packages/storefront-theme/responsiveStyles.cjs` | New typed style properties, component bounds, explicit tiers, responsive inheritance/specificity and known functional contrast checks. No CSS/DOM engine. |
| `packages/storefront-theme/pageTemplateCommands.cjs` | New immutable validated commands, copy ID remapping, compatible cross-template/saved-section insertion and precise resets. |
| `packages/storefront-theme/adaptive.cjs` | New explicit opt-in CommonJS entry. |
| `packages/storefront-theme/adaptive.mjs` | New equivalent ESM entry. |
| `packages/storefront-theme/package.json` | Four additive lines for `./adaptive`; existing root/prebuilt entry points and dependencies unchanged. |
| `packages/storefront-theme/ADAPTIVE_CONTRACT.md` | New API, data shapes, exact bounds, command semantics and integration responsibilities. |
| `ecommerce-backend/backend/tests/adaptive-page-contract.test.js` | New 218-test contract/security/command/compatibility suite, including deterministic malformed-input matrices. |
| `ecommerce-backend/backend/tests/fixtures/adaptive-builder/contract-fixtures.cjs` | New synthetic small/medium/near-limit graph fixtures; does not change the frozen manifest. |
| `ecommerce-backend/backend/tests/helpers/benchmark-adaptive-contract.cjs` | New opt-in pure benchmark and all-ten existing-snapshot whole-theme size checks. |
| `track.md` | Additive Phase 1 progress/results/handoff; previous contents preserved byte-for-byte. |

Generated evidence is confined to `output/adaptive-builder/phase1/`. Its exact file list and SHA-256 values are in `artifact-sha256.json`. Includes logs, `results.json`, `integrity.json`, benchmark output, tooling verification script and the retained local Admin build output. The accidentally created empty `ecommerce-backend/backend/output/adaptive-builder/phase1/` directory also remains; it contains no files.

### Contract decisions

- Import only `@scaleup/storefront-theme/adaptive`. The normal v4 root does not import any new module. The isolated document has contract `version: 1`; live `THEME_SCHEMA_VERSION` is still **4**.
- Exact kinds: `home`, `product`, `category`, `collection`, `cart`, `checkout`, `account`, `track`, `policiesIndex`, `policy`, `header`, `footer`. Assignments are optional, so no adoption is implied.
- Every non-home blueprint retains its exact required core at root position zero. No arbitrary nesting, duplicate, removal, retyping, submitted child tree or content/handler replacement is allowed. Code-owned state declarations preserve the boundary around existing controllers.
- Optional section → stack/columns → leaf structure; finite text/image/link/catalog blocks reuse existing section/source concepts. This is a tree, not a generic programmable graph. The existing legacy section registry is unchanged.
- IDs are globally unique across trees; copies remap to unused IDs and keep source/library content independent. Moves stay within the target template. Cross-template and saved copies must validate in their destination.
- Resets remove overrides and prune empty style maps; explicit zero/false remain values. Missing text properties inherit; box properties do not automatically inherit.
- Presets are bounded typed references, never recursive or a way to broaden component capabilities. Unused templates/presets/saved sections are validated too.
- Proposed limits are enforced without truncation: 12 templates, 50 nodes/tree, 200 total including saved sections, depth 3, 20 saved sections, 20 presets, 256 KiB future whole-theme budget. Additional defensive JSON limits are documented. No legacy limit changed.

See the [contract reference](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/ADAPTIVE_CONTRACT.md) for usable code examples and the complete operation/data contract.

## B. Commands and verification

Backend commands ran from `ecommerce-backend/backend`; application builds ran from their app directories. No dependencies were installed.

| Command / evidence | Final result |
|---|---|
| `node --test tests/adaptive-builder-baseline.test.js tests/storefront-preview-parity.test.js` → `baseline-before.log` | **43/43 pass before implementation.** |
| `node --test tests/adaptive-page-contract.test.js` → `contracts.log` | **218/218 pass.** Final code is also covered by the full run below. |
| Existing ten compatibility suites → `baseline-after.log` | **332/332 pass.** Command listed below. |
| `node --test tests/*.test.js` → `backend-final.log` | **1002/1007 pass; same five pre-existing failures.** |
| `node output/adaptive-builder/phase1/verify-contract-tooling.cjs` from repository root | **10 new JavaScript modules/tests lint clean: zero errors/warnings.** CJS/ESM/browser-target package checks pass. |
| Admin: `node node_modules/vite/bin/vite.js build --outDir ../output/adaptive-builder/phase1/admin-dist` | **PASS**, `admin-build.log`. No deployment. |
| Storefront: `node node_modules/next/dist/bin/next build` | **PASS**, `storefront-build.log`. |
| `node tests/helpers/benchmark-adaptive-contract.cjs` | **PASS**, `benchmark-final.json`; all ten full-snapshot budget checks pass. |
| `git diff --check` and byte comparisons | **PASS**, `diff-check.log`, `integrity.json`. |

The after-implementation compatibility command was:

```powershell
$env:THEME_PARITY_REPORT='C:/Users/user/WebstormProjects/Shop-for-all/output/adaptive-builder/phase1/home-parity-after.json'
node --test tests/adaptive-builder-baseline.test.js tests/storefront-preview-parity.test.js tests/storefront-atelier-contract.test.js tests/storefront-atelier-routes.test.js tests/storefront-atelier-commerce.test.js tests/storefront-atelier-builder.test.js tests/storefront-atelier-presentation.test.js tests/storefront-release-hardening.test.js tests/storefront-effective-theme.test.js tests/store-builder-prebuilt-themes.test.js
```

The full final run includes the same suites after the last runtime edits. Counts overlap; do not add them as independent coverage.

Preserved baseline: **all ten preset definitions/versions, 370 exact rendering cases, 144 earlier hashes, 20 Gallery/Builder/live-home comparisons**, v4 normalization/effective outputs, current source/plan/version guards, product callbacks and existing cart/checkout/OTP behavior. No snapshot regeneration. Previously captured browser evidence is retained unchanged; this phase did not recapture pixels or execute UI interactions.

New tests cover all twelve families and atomic core operations; compatibility/count/ownership/cycle/reachability failures; JSON/prototype/getter/unknown-key attacks; text/source/URL and encoded-scheme restrictions; every style group and invalid bounds; inherited specificity and reset behavior; no input mutation/partial result; copy/saved/preset semantics; all count/byte boundaries; CJS/ESM parity; old-root dependency isolation and current v5 write rejection.

The browser-target bundle is **173282 bytes uncompressed, zero external imports**. It reuses existing legacy utility code and is not included in current storefront rendering. The generated ESM bundle was imported in Node for syntax/pure contract smoke only; this does **not** establish browser DOM, hydration or accessibility behavior.

### Failures and limits

Final introduced failures: **none**. Early new-code failures were repaired, not skipped: malformed percent destinations now fail closed, and a test no longer mutates its already frozen setup. Targeted ESLint comments explain the three intentional control-character denylist regular expressions; recommended rules otherwise apply to all new JavaScript.

Five final backend failures match the accepted Phase 0 run by name and unchanged implicated source/tests:

1. `ai-acceptance-provenance.test.js`: SEO origin `provider`, expected `deterministic_fallback`.
2. `ai-preferences.test.js`: prompt version `5.0.0`, expected `4.0.0`.
3. `security-hardening.test.js`: old low-stock source pattern.
4. Same file: old promotion scheduling copy pattern.
5. Same file: `Retry Courier` source-text expectation.

Full Admin lint and MongoDB/browser journeys were not rerun: no related implementation changed in this inactive-only phase. Their accepted Phase 0 failures/gaps remain recorded: 18 Admin lint errors/4 warnings, two Builder integration failures, remaining browser/accessibility checks and revision-media recovery. They remain release gates rather than successful Phase 1 checks.

Cleanup limitation: automatic approval review rejected recursive deletion of the generated Admin distribution with the stated reason **“blocked by policy.”** No workaround was attempted. It remains local in the evidence directory and has not been published.

### Performance observations

Standalone Node `v24.12.0`, 20 warmups, 100 validation samples and 1000 three-tier resolution batches; synthetic inputs only:

| Fixture | Nodes | Complete-theme bytes | Validation median / p95 |
|---|---:|---:|---:|
| Small | 14 | 8990 | 2.70 / 2.98 ms |
| Medium | 80 | 26462 | 3.51 / 3.90 ms |
| Near node limit | 200 | 58436 | 4.77 / 4.98 ms |
| Near byte limit | 200 | 252569 | 6.26 / 6.64 ms |

Three-tier resolution batch median **0.066 ms**, p95 **0.076 ms**. The near-byte graph also fits with each frozen theme's raw configuration under 262144 bytes. Long text, legacy content and presets can exhaust bytes before node counts; no bound was expanded. This is a local microbenchmark, not production latency, peak-memory evidence or a release performance guarantee. The earlier concurrent benchmark is retained separately and has scheduling variance.

## C. Security assessment

**Structural:** complete final graph validation, trusted required-core/slot/page rules, exclusive ownership, global ID uniqueness, depth/count/bytes, reserved IDs, no merchant protection/role/state predicates. Commands validate input and output, clone only validated JSON and return no partial result on failure.

**Styles:** typed finite values and code-owned block/part allowlists; no selectors, classes, CSS strings, executable expressions, URL media, positioning/z-index/opacity/clipping or arbitrary event props. Protected controls cannot be hidden or resized through decorative controls. Responsive layers resolve before specificity; page boxes do not propagate into child controls.

**Content/sources:** bounded plain text, typed safe destinations with repeated percent-decoding checks, asset/product ID syntax, finite public/current-route bindings and bounded counts. No private customer/order/session lookup language or arbitrary endpoint. Unknown retained structures and dormant libraries are rejected.

**Known boundaries:** pure validation does not prove ownership, authorization, public eligibility or final browser layout/accessibility. Contrast uses explicit/default foreground/background at all tiers and must receive the actual complete effective tenant token map from trusted integration code; fallback tokens are for isolated defaults/tests. Theme color changes require revalidation. JSON parsing can already have discarded duplicate lexical keys; this API validates the resulting plain object and enforces ID collisions across trees. No arbitrary merchant HTML/CSS/JS execution surface is introduced.

## D. Compatibility and preservation

- **832/834** recorded pre-existing source/config/test files are byte-identical. Only `track.md` and four additive `package.json` export lines differ; the complete prior tracker contents remain byte-identical.
- **65/65 protected Phase 0 artifact/source hashes** unchanged, excluding only the intentionally extended tracker. No earlier expected result was changed.
- Existing index CJS/ESM, effective/capability modules, all ten definitions and original registry, renderer, frontend routes/Builder, backend models/services/APIs, environment and lockfiles/dependencies remain unchanged.
- Fresh-process dependency checks show ordinary v4 imports load no adaptive module. Existing future-version guards still reject incoming/current v5 before writes. Old opaque unknown-field retention remains unchanged; it is not an active graph or adoption path.
- No active merchant capability, persisted schema v5, database collection, provider, rendering engine, feature flag, adaptive upload or public API was added. No live notifications/orders, production writes, deployment/publication, commit or push occurred.

## E. Phase 2 handoff

**PASS for the completed inactive contract. Stop after Phase 1.**

Exact next task, after review/authorization: implement version-aware storage and compatibility tests, beginning with explicit v5 reader support, graph-preserving partial writers and rejection of older-client replacements of newer data. Then prove strict model round trips, trusted tenant/staff/plan/source ownership, complete-theme/effective-color validation, transactional draft/publication/restore and retained-revision media safety on verified disposable MongoDB. Keep adaptive adoption disabled. Do not enable a renderer or merchant UI as part of that storage task.
