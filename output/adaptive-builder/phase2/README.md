# Adaptive Store Builder — Phase 2 implementation and verification

Date: 20 October 2026. Starting revision: `54a04b6d34939dab3b9cc6f0139a753116edbd32`.

**Phase 2 safety contract: PASS. Phase 3 readiness: PASS for inactive renderer development after review.** This is not production or adoption approval. The five existing backend failures, two existing Builder integration failures, existing Admin lint violations, product entitlement decisions and later browser/release gates remain open. **Phase 3 has not started.**

## 1. Impact analysis and implementation

The changes extend the current theme package, Shop/draft/revision models and publication service. They introduce no application collection, second publishing pipeline, renderer, editor UI or runtime dependency.

1. **Readers and storage:** add explicit v5 readers and atomic validated JSON storage. Keep the legacy editor API/default version at 4, preserving the frozen version guards. Store the graph at `theme.siteBuilder`, never in an archive. Validate the Phase 1 contract, actual effective color tokens and whole-theme budget before persistence.
2. **Writer fencing:** compare complete snapshots with authoritative persisted versions. Fence query/document/upsert races using version predicates, existing revision/timestamp CAS, and a hidden Shop write counter for transactional draft/publication coordination. Preserve unpublished v5 drafts when an older publisher performs cleanup.
3. **Authorization:** separately gate adaptive changes, re-read user/membership/staff permissions and plan access on the server, and reject new adoption. Existing none/limited/full policies and Atelier availability remain intact. Existing v5 SEO maintenance requires authorized full access and the existing SEO entitlement; graph/content editing stays read-only.
4. **Assets:** collect typed image/product references through the Phase 1 manifest, validate tenant ownership/public product eligibility, retain current/draft/revision media, and coordinate cleanup with atomic claims and reference revisions.
5. **Transactions:** reuse the existing publication workflow but require verified transaction support for v5. Shop, revision, audit, assets and draft changes commit or roll back together. Cache/retention work after commit returns warnings on failure.
6. **Projection:** provide an unmounted future public projection with assigned templates/globals and required public assets only. Current public output continues to use the v4 fallback presentation.

## 2. Exact source manifest

Paths are absolute. `source-manifest.json` records status and final SHA-256 for every changed source/document file. Generated evidence and the retained Admin build are listed separately in `artifact-sha256.json`.

| File | Responsibility |
|---|---|
| [storage.cjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/storage.cjs) | New explicit v5 version check, validation, normalization, typed reference discovery and inactive public projection. |
| [storage.mjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/storage.mjs) | Matching ESM reader exports. |
| [index.cjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/index.cjs) | Lazy reader exports; ordinary v4 imports remain isolated from adaptive execution. |
| [index.mjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/index.mjs) | Root CJS/ESM parity for the new explicit reader functions. |
| [package.json](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/package.json) | Add `./storage` entry; preserve the existing root, adaptive and prebuilt entries and dependencies. |
| [effective.cjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/effective.cjs) | Validate stored v5 and expose only its legacy fallback through the current effective-rendering path. |
| [pageTemplates.cjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/pageTemplates.cjs) | Add `assetFields` metadata to the existing image block; no block/blueprint/style behavior change. |
| [storeBuilderThemeContract.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/storeBuilderThemeContract.js) | New validated atomic JSON types, model guards, immutable revisions and old-writer fences. |
| [Shop.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/Shop.js) | Declare `theme.siteBuilder`, hidden adaptive write counter and model safeguards. |
| [StoreBuilderDraft.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/StoreBuilderDraft.js) | Validated snapshot type and draft guards. |
| [StoreBuilderRevision.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/StoreBuilderRevision.js) | Validated immutable snapshot, asset IDs and guards. |
| [StoreBuilderAsset.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/StoreBuilderAsset.js) | Cleanup claim state, claim recovery timestamp and monotonic reference revision. |
| [adaptivePersistencePolicy.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/adaptivePersistencePolicy.js) | New trusted actor/tenant/staff/plan checks and independently closed adoption policy. |
| [storeBuilderService.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/storeBuilderService.js) | v5 normalization/read support, final-candidate policy, draft coordination, transaction enforcement, publication/restore and safe cleanup. |
| [storeBuilderSeoService.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/storeBuilderSeoService.js) | Graph-preserving SEO maintenance, transaction/CAS and media synchronization; refuse editing unpublished adaptive drafts through old SEO discard. |
| [storeBuilderAssetService.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/storeBuilderAssetService.js) | Ownership, typed references, promotion, revision retention, safe deletion/cleanup and draft token preservation. |
| [themeCompatibilityService.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/themeCompatibilityService.js) | Keep the active v5 graph out of legacy sanitization/truncation/archives. |
| [effectiveThemeService.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/effectiveThemeService.js) | Safe persisted reads and unmounted tenant-scoped future projection. |
| [themeSectionService.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/themeSectionService.js) | Do not migrate an adaptive snapshot's legacy fallback during reads. |
| [storeBuilderController.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/storeBuilderController.js) | Preserve v5 drafts during old discard flows; add tenant-scoped future cache invalidation prefix. |
| [basicStoreSettingsController.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/basicStoreSettingsController.js) | Refuse legacy basic-theme replacements of v5 designs during reader-first rollout. |
| [migrate-store-builder-themes.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/scripts/migrate-store-builder-themes.js) | Skip adaptive/future versions in the legacy migration. Script was not executed. |
| [adaptive-persistence.test.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/adaptive-persistence.test.js) | New 14-test pure reader/security/projection/compatibility suite. |
| [adaptive-persistence.integration.test.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/integration/adaptive-persistence.integration.test.js) | New 35-test real MongoDB persistence/concurrency/security/media/recovery suite. |
| [adaptive-transaction-crash.cjs](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/helpers/adaptive-transaction-crash.cjs) | Isolated child-process crash after transactional audit persistence; no public bypass. |
| [track.md](C:/Users/user/WebstormProjects/Shop-for-all/track.md) | Append-only Phase 2 findings, verification and handoff; original contents preserved. |

## 3. Data and compatibility contract

### Explicit reader API

`@scaleup/storefront-theme/storage` exports `READABLE_THEME_VERSION = 5`, `assertReadableThemeVersion`, `validateStoredTheme`, `normalizeStoredTheme`, `collectAdaptiveReferences`, `projectAdaptiveTheme` and `isAdaptiveTheme`.

The existing `THEME_SCHEMA_VERSION = 4`, `ALLOWED_THEME_KEYS`, legacy `validateTheme`, `normalizeTheme` and `assertSupportedThemeVersion` remain the v4 editor contract. Their old assertions remain unchanged. Backend v5 persistence uses the new explicit reader functions. Do not send v5 through the legacy sanitizer/merge path. Unsupported later versions fail closed; there is no automatic conversion or downgrade.

The v5 parent contains the Phase 1 `siteBuilder.version = 1` document. Graphs, IDs, empty maps, saved sections and style presets survive exact save/load cycles. Graph budgets and actual theme token contrast are validated without truncation. Existing BSON dates and IDs in legacy fields are canonically serialized at the backend boundary; the graph itself must be plain JSON.

Mongoose custom types use atomic-value semantics so Mongoose does not flatten a whole-document validator onto individual nullable leaves or minimize required empty maps. They are not permissive `Schema.Types.Mixed` storage. Cast, save and query guards call the shared validators; malformed graphs are rejected even with `runValidators: false` or `validateBeforeSave: false`. Retained revision theme snapshots cannot be edited in place. Application writers replace complete snapshots; direct in-place atomic-value edits require explicit dirty marking and still pass model validation.

### Verified preservation

- 14-, 80- and 200-node v5 graphs round-trip exactly through real Shop, draft and revision documents, including empty library maps.
- All ten v4 themes round-trip identically to the original Git Shop schema in a separate disposable test collection, using identical synthetic subdocument IDs.
- Old full saves, missing/malformed graphs, unsupported versions, stale/concurrent saves, document-save races and draft-upsert races cannot erase v5 data.
- v4 publication and SEO cleanup preserve an existing unpublished v5 draft unchanged; it remains stale rather than being deleted/rebased by an older client.
- SEO draft, publish and discard preserve unrelated adaptive configuration and keep retained media synchronized.
- Phase 0 definitions/configurations, **370 exact rendering cases, 144 older hashes and 20 Gallery/Builder/live-home comparisons** remain unchanged. No snapshot or existing assertion was edited.

## 4. Writer and permission inventory

| Path | Current behavior |
|---|---|
| Full Builder draft save | Raw/final validation and plan checks; adaptive actor policy; explicit tokens; model fences; transactional v5 draft/media update. |
| Publish / direct publication service | Final candidate checks, published revision CAS, adoption denial and required v5 transaction. |
| Revision restore | Reuses the same publication guard, ownership, transaction and audit path. A v5-to-v4 restore is refused, not silently converted. |
| Theme application | Existing full snapshot flows use the same draft/publication services; no separate adoption bypass. |
| SEO draft/publish/discard | Server merges only SEO into trusted data; scopes cannot smuggle structural changes. Existing published-v5 maintenance is authorized separately from adoption. |
| Basic settings/logo/icon replacement | v4 behavior retained; v5 replacement is explicitly read-only. |
| Draft discard and publication cleanup | v5 drafts cannot be removed through legacy discard or v4 publication cleanup. |
| Legacy banner/section migration | v5 reads/persistence are skipped; no fallback migration or implicit adoption. |
| Legacy theme migration script | Skips v5/future themes; not run. |
| Default-policy backfill script | Inspected, not run or changed. It saves a projected legacy document; the model fence rejects a v5 replacement. Do not run it over adaptive stores without a separate version-aware maintenance decision. |
| Shop registration | Existing code-owned legacy theme initialization; it does not accept a submitted adaptive graph. |
| Essential branding | Owns the separate existing branding record; theme graph is not replaced. Shared cleanup now protects its media when referenced by current/draft/revision designs. |

Adaptive requests do not trust submitted shop IDs, role/plan names, rollout flags or block protection fields. Active user and tenant membership, staff permission and current plan are loaded from trusted storage. A full Builder plan is a necessary closed-policy guard here, **not an approved adaptive product entitlement**. New adoption is unavailable to every plan until product policy and rollout are explicitly approved.

`ADAPTIVE_BUILDER_ROLLOUT` defaults to off. Even setting it to `on` cannot enable adoption in this release: availability remains false because entitlements are unapproved. Atelier's existing setting is independent and unchanged. Isolated positive publication tests mock policy in process memory; no endpoint, production test flag or merchant bypass was added.

## 5. Transaction and media evidence

### Disposable environment

Verified cached official `mongo:7` image, task label, container ID, loopback-only `127.0.0.1:27028`, tmpfs storage, replica set `rs0` and writable primary before destructive tests. Exact database: `atelier_acceptance_c085454b_test`. See `database-evidence.json`.

The existing isolation preload prevents real `.env` loading, unexpected MongoDB targets, external transports and worker startup, and mocks mail/SMS. Cloudinary deletion tests mock the provider. No live notifications, customer orders, payments, courier operations or media deletions were performed. The task-owned container was removed after verification; cached image and all evidence/build artifacts were retained.

For the actual child-process crash test only, the disposable server's transaction lifetime was reduced from 60 to 5 seconds to bound abandoned-session recovery. This changed no application or deployment configuration.

### Publication

The old topology-name heuristic sees a direct replica-set connection as `Single`; v5 now checks MongoDB `hello` for a writable replica set/router, sessions and supported wire version, then uses a real transaction. v4's existing transaction/fallback choice is preserved.

Ten failure-injection cases cover before/after Shop update, revision creation, audit persistence, asset promotion and draft deletion. Every case preserves the original records and supports retry. Additional tests verify concurrent publication, explicit stale retry, reconnect recovery, abrupt child-process termination inside a transaction, no-transaction refusal, and cache failure after commit. Committed publication returns success plus `CACHE_INVALIDATION_PENDING`; retention failure returns `REVISION_RETENTION_PENDING`.

### Media

Discovery uses registry-declared image asset fields and finite source metadata across all template/global/saved-section records. It does not scan arbitrary strings. Current header/footer contracts do not permit image blocks; their existing logos remain legacy theme/branding references. No new global-media editing capability was invented.

New revision asset metadata supplements snapshot inspection so older retained revisions need no bulk backfill. Current design, draft, retained revisions, globals and saved sections are checked before deletion. Retired owned media may be reactivated during restore. Cleanup fails closed on invalid history or more than the configured 20 retained revisions until retention is repaired.

Cleanup claims set `deleting`, block new references, recheck retention, and compare a monotonic reference revision as well as timestamps. A stale claim can recover after one hour. Tests cover same-timestamp races, claimed-media refusal, abandoned-draft grace, retained history beyond seven days, metadata-free old revisions, pruning/release, restore and transactional rollback. Asset metadata attachment no longer changes the draft CAS timestamp.

Already deleted provider objects cannot be recreated by these changes. Legacy external URL availability and out-of-band provider deletion are not verified; no remote fetch or provider recovery claim is made.

## 6. Commands and results

Commands below ran from `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend` unless stated otherwise. Counts overlap; do not sum them as independent coverage.

| Check | Result / evidence |
|---|---|
| Before edits: `node --test tests/adaptive-builder-baseline.test.js tests/storefront-preview-parity.test.js tests/adaptive-page-contract.test.js` | **261/261 pass**, `baseline-before.log`. |
| `node --test tests/adaptive-persistence.test.js` | **14/14 pass**, `persistence-unit.log`; included again in the final full run. |
| Ten compatibility suites + Phase 1 + new pure persistence suite | **564/564 pass**, `compatibility-final.log`; exact command below. Final full backend reran these suites after subsequent backend-only safeguards. |
| `node --test tests/*.test.js` | Before **1002/1007**, final **1016/1021**. Same five pre-existing failures; no introduced failures. `backend-before.log`, `backend-final-gate.log`. |
| Isolated new + existing Builder/release integration suites | Before **18/20**, final **53/55**. **35/35 new integration tests pass**; same two pre-existing failures. `integration-before.log`, `integration-final-gate.log`. |
| Repository root: `node output/adaptive-builder/phase2/verify-tooling.cjs` | 24 changed JS files checked. Five existing lint violations confirmed against Git source; **zero introduced violations**. Browser-target reader bundle smoke passes, **178901 bytes uncompressed, zero external imports**. Not a DOM test. |
| Admin: `node node_modules/eslint/bin/eslint.js .` | Existing **18 errors / 4 warnings**, `admin-lint.log`; Admin sources unchanged. |
| Storefront: `node node_modules/eslint/bin/eslint.js` | **PASS**, `storefront-lint.log`. |
| Admin: `node node_modules/vite/bin/vite.js build --outDir ../output/adaptive-builder/phase2/admin-dist --emptyOutDir=false` | **PASS**, `admin-build.log`; new build retained. |
| Storefront: `node node_modules/next/dist/bin/next build` | **PASS**, `storefront-build.log`. No storefront source change. |
| `git diff --check`, source/artifact hashes | **PASS**, `diff-check.log`, `integrity.json`. |

Compatibility command:

```powershell
node --test tests/adaptive-builder-baseline.test.js tests/storefront-preview-parity.test.js tests/storefront-atelier-contract.test.js tests/storefront-atelier-routes.test.js tests/storefront-atelier-commerce.test.js tests/storefront-atelier-builder.test.js tests/storefront-atelier-presentation.test.js tests/storefront-release-hardening.test.js tests/storefront-effective-theme.test.js tests/store-builder-prebuilt-themes.test.js tests/adaptive-page-contract.test.js tests/adaptive-persistence.test.js
```

Integration command, **only after verifying the disposable infrastructure**:

```powershell
$env:NODE_ENV='test'
$env:SFA_ISOLATED_ACCEPTANCE='c085454b'
$env:MONGO_URI_TEST='mongodb://127.0.0.1:27028/atelier_acceptance_c085454b_test?directConnection=true&replicaSet=rs0'
node --require ./tests/helpers/isolatedAcceptance.cjs --test --test-concurrency=1 tests/integration/adaptive-persistence.integration.test.js tests/integration/store-builder-safety.integration.test.js tests/integration/atelier-release-hardening.integration.test.js
```

### Existing failures, investigated rather than hidden

1. AI acceptance provenance: actual SEO origin `provider`, expected `deterministic_fallback`.
2. AI preferences: actual prompt version `5.0.0`, expected `4.0.0`.
3. Low-stock security test: source-text expectation for the old enqueue call.
4. Promotion scheduling security test: source-text expectation for old warning copy.
5. Courier/status notification security test: source-text expectation for `Retry Courier`.

Their failing tests and implicated application inputs remain unchanged. They reproduce before and after this phase.

The two existing Builder integration failures also reproduce before edits:

- **Normalization depth:** a test spreads a live Mongoose theme, retaining nested document objects that the pure merger traverses. Canonical JSON serialization succeeds. New persistence tests use the proper boundary and prove real round trips. The old case still stops before its later assertions, including old preset metadata expectations; those later assertions are not claimed verified.
- **Limited-plan typography draft 403:** normalizing the partial patch inserts fallback section `featured-products` into a store whose section list is empty. The final capability check correctly detects `sectionReordering` and rejects it. This is a legacy partial-normalization mismatch, not proof that typography needs full access. `legacy-boundary-diagnosis.json` records the precise difference. It was not fixed by weakening plan enforcement or changing old v4 normalization. New v5 complete snapshots and server-merged SEO changes avoid this boundary; none/limited adaptive requests remain denied.

Early introduced implementation/test failures were repaired. Existing assertions and frozen expectations were not edited. Intermediate logs remain as evidence; only the final-gate logs describe the final state.

## 7. Reader-first deployment and remaining risks

No deployment, production migration, adoption, real publication, commit or push occurred. All ten theme definitions, frontend routes/Builder UI, commerce APIs, dependencies/lockfiles and earlier evidence/build artifacts remain unchanged. The former file-cleanup policy rejection was respected; no retained build output was removed.

Required future sequence:

1. Review this patch and the remaining failure register; keep adaptive rollout off.
2. Deploy v5 readers/model safeguards to every applicable backend consumer before any v5 writer. Drain old server/worker binaries and verify operational scripts. New guards cannot retrofit an already running old binary or privileged raw database writer.
3. Verify real deployment topology, indexes, backup/restore and cleanup scheduling without running an automatic bulk migration. Existing unique draft-per-shop and revision-per-shop/number indexes remain required; isolated index tests pass.
4. Keep adoption unavailable while implementing the shared renderer and safe editor integration in separately approved phases. Public projection is currently unmounted and uncached; future cache keys must include tenant, revision, page/global and effective plan/branding context.
5. Decide adaptive plan/command eligibility, downgrade/grandfathering, rollout ownership and pilot scope. An environment flag alone is insufficient in this release.
6. Resolve the pre-existing application/test/lint blockers and complete future browser, accessibility, hydration, provider-media and production-topology acceptance before any live pilot.

Model guards defend application document/query writes. Privileged raw collection operations and old binaries remain operational trust boundaries; no database-wide production validator or migration was installed. Cleanup needs the existing scheduled task; no new worker was added. Retention protects available media references, not assets already removed outside the platform.

**Exact next task, only after review/authorization:** implement an inactive shared page-template renderer/style compiler using the existing Phase 1 manifest and protected commerce primitives, fed by the explicit public projection. Begin with synthetic home/product/checkout fixtures. Preserve the legacy branch and rerun all ten-theme hashes. Keep merchant adoption off; do not start that work as part of this phase.
