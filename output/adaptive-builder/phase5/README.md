# Adaptive Full-Site Store Builder — Phase 5

Date: 21 October 2026 (Asia/Dhaka).

## Acceptance and scope

**Phase 6 readiness: BLOCKED.** The existing editor now supports all twelve registered page families with shared presentation adapters and synthetic state controls. Mandatory authenticated browser interaction, hydration, responsive visual checks and actual 200% browser zoom could not be executed: the approved browser tool repeatedly reports **“Local browser use is disabled in Work settings.”** HTTP checks are not substituted for those gates.

Adaptive merchant adoption and publication remain disabled by the unchanged backend policy. No production data, `.env`, theme definitions, commerce calculations, authentication/OTP endpoints, database schemas, dependencies, lockfiles, deployment, commits or pushes were changed. Work stops after Phase 5.

Initial/final Git revision: `54a04b6d34939dab3b9cc6f0139a753116edbd32`. Existing uncommitted Phase 1–4 work was retained. `task-start.json` records the initial status and file hashes; `integrity.json` compares the final state against that record. A Git diff against HEAD includes earlier phases; use the Phase 5 manifest to identify this phase's changes.

## A. Implementation

- Extended the **existing** contextual editor's selector into Storefront, Shopping, Customer, Information and Global groups. All assigned registered pages can be selected; unassigned pages remain disabled. No template adoption/conversion UI was added.
- Retained one whole-site theme state, existing draft queue, autosave, conflict handling, recovery, 30-entry history and publication barriers. Device choice survives page changes; selected nodes/parts reset safely. Page changes finish the pending history boundary.
- Added a finite synthetic-state selector, independent from merchant JSON. Account, cart, checkout and tracking previews never obtain a real customer session/order or call commerce APIs. All action ports are inert; canvas click, keyboard activation and submit capture remain isolated.
- Extended the existing protected-core adapter and compiler. Optional sections, copies, saved-section insertion, presets, responsive overrides and resets continue through the existing immutable commands and full-document validation.
- Added narrowly scoped semantic parts for functional presentation, media frames, catalog grids and approved stack/column layouts. Controls expose registry allowlists, not arbitrary CSS, classes, selectors, URLs, scripts or component names.
- Moved presentation JSX from category, collection, account, tracking and policy-index routes into shared pure views. Existing storefront routes delegate to the same views; controllers retain their API calls, hooks, query/filter logic, authorization, calculations and action handlers. No API-owning commerce controller enters Admin's renderer dependency graph.

## B. Page capability matrix

All rows support registered page width, colors, typography, spacing and borders; node/part settings use base/tablet/desktop inheritance. Optional content is limited by each page's existing registry. A protected core cannot be hidden, removed, copied, nested or moved.

| Page family | Implemented editable presentation | Synthetic states | Limits / trusted functionality |
|---|---|---|---|
| Home | Existing eight optional block types, sections/nested layouts, public catalog blocks, content, media, preset/library commands | Content | Existing Phase 4 functionality retained. No automatic assignment/adoption. |
| Product | Gallery frame height/aspect/fitting; gallery/information stack or columns; information, title, price, options, quantity, description, independent add-to-cart/buy-now parts; optional product/catalog sections | Normal, variants, out of stock, zero price, missing image, long EN/BN title, discounted, loading, missing | Prices, inventory, variant selection, quantity limits and callbacks are trusted. Gallery thumbnail composition remains code-owned. Sections before the core are unsupported. |
| Category | Title; existing product-count description; cover frame; filter panel; sort; product grid with 1–4 columns per tier; cards; pagination; empty/error surfaces; optional sections | Populated, empty, filtered, loading, missing | Membership/filter/sort/pagination remain in existing controller. The existing category page does not render category-description copy; no new description feature was invented. |
| Collection | Title, existing description, cover frame, sort, grid/columns/gap, cards, pagination, empty/error surfaces; optional sections | Populated, empty, loading, missing | Existing collection membership and query callbacks retained. No new category-style filters. |
| Cart | Container/layout, heading, item surfaces, image frames, summary/totals, checkout-link styling and optional information | Populated, empty, refreshing, error | Quantities, removal, line prices, subtotal, savings, delivery estimate, total and checkout navigation preserved. Quantity controls are not styled as the checkout primary button. |
| Checkout | Page/form surfaces, width, labels, inputs, summary, primary buttons, approved stack/column layout and up to two optional roots around the required core | Form, empty, validation error, OTP, OTP error, expired OTP, loading, submission failure, success | Required fields, separate marketing/required policy consent, OTP, shipping/payment calculations and submission remain protected. No order/OTP can be submitted by preview. |
| Account | Existing auth, dashboard/orders/profile and password-security presentation; surfaces, typography, labels, inputs, buttons and approved dashboard layout; compatible text/link sections | Login, registration, verification, orders (current empty-history example), profile, security, loading, error | Synthetic identity only. Controller-driven password-recovery and vendor-account-specific flows are not added as preview modes. Existing storefront flows remain intact. |
| Tracking | Heading, lookup/OTP inputs, labels, verified result/status/timeline summary, buttons, spacing and compatible information sections | Lookup, OTP, invalid information, verification error, found, in transit, delivered, cancelled, return eligible/ineligible | A supplied order alone does not grant access: adapter requires trusted `accessVerified === true`. Existing phone/OTP, cancellation/return eligibility and handlers remain authoritative. Action modals/uploads are not interactive preview operations. |
| Policies index | Heading, surfaces, typography, spacing, navigation/contents links and compatible optional content | Index | Existing required policy list, links and default-policy data retained. Index column composition stays code-owned. |
| Policy details | Heading, text body, navigation link, content width, surfaces, spacing and compatible optional content | Shipping, refund, privacy, terms, not found | Uses existing trusted saved/default policy text, escaped by React. No HTML/rich-text editor, new policy types or programmable bindings. |
| Header | Existing identity, logo, navigation/utilities styling and compatible optional text/sections | Navigation | Required store identity and navigation preserved; legacy/Atelier composition rules retained. |
| Footer | Existing identity, footer copy/contact, navigation/policy styling and compatible optional text/sections | Policy access | Required policy access preserved; composition remains code-owned. |

### Responsive and structural constraints

- Base `<768px`, tablet `768–1023px`, desktop `>=1024px`. Legacy theme breakpoints are unchanged.
- Resolve responsive tiers inside each layer before specificity. Node/part base values remain stronger than less-specific page desktop values. Reset removes an override; it does not flatten other tiers. Existing zero/false handling is preserved.
- Media height/aspect/fitting permissions apply only to code-owned image/frame parts. Catalog columns apply only to listing parts. Functional controls still reject visibility, arbitrary width/height, clipping and negative margins. Approved layout selectors/custom properties are compiler-owned.
- Product/cart/checkout/account layouts stack in narrow containers. Checkout placement variables prevent an approved stacked layout from creating an implicit second summary column.
- **Blueprint conflict:** the request asks for sections before product core, but accepted v1 contracts fix every required core at root index zero. That invariant is preserved, tested and explained in the UI. Before-core insertion requires a separately reviewed versioned-blueprint decision; this phase does not silently relax it.
- Maximums remain 12 templates, 50 nodes/template, 200 applicable nodes, depth 3, 20 saved sections, 20 presets and 256 KiB complete theme. Checkout/header/footer retain their tighter root limits.

## C. Exact changed files

`changed-files.txt` lists every changed/new **source, test and tracker** path relative to the repository. `integrity.json` contains their final SHA-256 values and whether they existed at task start. Phase 5 evidence/generated build files are inventoried separately in `artifact-sha256.json`; earlier Phase 0–4 artifacts and frozen expectations are protected by the integrity comparison.

Responsibilities are grouped below; the adjacent generated `changed-file-responsibilities.md` expands this to one row per exact path.

| Area | Responsibility |
|---|---|
| Admin `App.jsx`, StoreBuilder route/wrapper, `DevelopmentStoreBuilderPage.jsx` | Existing authenticated/permission/feature guards plus a DEV-only synthetic workspace route/link. Production bundle excludes the development route and local transport. |
| Admin `StoreBuilderPage.jsx`, header and bootstrap/autosave/media hooks | Inject the transport into the existing state/queue; default remains the existing API. Scope recovery keys; disable publication/uploads in the synthetic workspace. |
| Admin adaptive editor, inspector and state | All-page navigation, scenarios, safe selection, registered semantic controls, existing commands and history boundaries. |
| Admin `previewState.js`, `developmentTransport.js`, public SVG | Code-owned synthetic examples, no-op ports, scoped browser-local CAS storage and a local synthetic image. |
| Backend route + `developmentPreviewAccess.js` | Read-only development grant; real authentication, DB actor/membership/permission, full active plan, loopback connection and explicit shop allowlist. |
| Shared theme registry/validator/responsive modules | Additive trusted part/media/grid/layout allowlists; no schema/limits/core-position changes. |
| Shared renderer adaptive modules | Twelve adapters, semantic palette contexts, protected access ports and scoped compilation. |
| Shared presentation views and storefront delegating wrappers | Reuse actual JSX; retain API/controller/business owners. Conditional semantic attributes disappear on legacy paths. |
| Tests/helpers | New full-site/security/state/command/CAS checks, actual development-grant integration, synthetic dev server, benchmark; adapt source-inspection tests to moved view paths. |

Existing immutable snapshots were not regenerated. Earlier tests that expected absent Phase 5 adapters/disabled page options now assert supported adapters and fail-closed missing assignments. Six source-inspection checks follow the moved presentation modules/default injected API; their functional/security assertions are retained. The five historical backend failure assertions were not weakened.

## D. Authenticated local preview

**URL:** http://127.0.0.1:5185/dashboard/adaptive-builder-preview

The actual Admin app and isolated backend were left running at report time. Use the normal Admin login with these **disposable synthetic fixture credentials**:

- Email: `vendor-a@launch.example.com`
- Password: `LaunchPass@123`

This is the normal Admin router/auth/permission/plan flow, then the real `StoreBuilderPage`/`AdaptiveStoreEditor`, not a standalone component fixture. The API grant is read-only; generated page data and draft storage stay in the browser. Published merchant settings and customer/order data are not used.

Verified via HTTP (`local-access.json`): Admin route 200, actual editor module transformation 200, synthetic password login 200, authorized grant 200, normal bootstrap 200 with `adaptiveAvailability.available === false`. The grant has `publication:false`, `uploads:false`, scope `synthetic-local-only`. **These results do not establish successful browser rendering, hydration, interaction or zoom.**

### Startup commands (PowerShell)

From `C:\Users\user\WebstormProjects\Shop-for-all`, the task-owned container is `sfa-adaptive-phase5`: official cached Mongo 7, label `sfa.task=adaptive-phase5`, loopback port `27028`, tmpfs `/data/db`, replica set `rs0`. `infrastructure.txt` records the inspected ownership/port/storage/primary state. Do not run another process on those occupied ports or launch tests while this preview backend is running: the test harness clears its disposable database.

For a fresh disposable container **only when that named container does not exist**, use the already cached official image (no installation was performed this phase):

```powershell
docker run -d --name sfa-adaptive-phase5 --label sfa.task=adaptive-phase5 --tmpfs /data/db:rw,size=512m -p 127.0.0.1:27028:27017 mongo:7 --replSet rs0 --bind_ip_all --setParameter transactionLifetimeLimitSeconds=5
docker exec sfa-adaptive-phase5 mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
docker exec sfa-adaptive-phase5 mongosh --quiet --eval 'JSON.stringify({writable:db.hello().isWritablePrimary,set:db.hello().setName})'
```

If it already exists, inspect its label/port/tmpfs before reusing it. A stopped tmpfs container loses its data and needs replica-set initialization again. Wait for `writable:true` before starting the backend.

Terminal 1, isolated API (never point these commands at Atlas or a shared database):

```powershell
Set-Location C:\Users\user\WebstormProjects\Shop-for-all\ecommerce-backend\backend
$env:NODE_ENV = 'test'
$env:SFA_ISOLATED_ACCEPTANCE = 'c085454b'
$env:MONGO_URI_TEST = 'mongodb://127.0.0.1:27028/atelier_acceptance_c085454b_test?directConnection=true&replicaSet=rs0'
& 'C:\Program Files\nodejs\node.exe' --require ./tests/helpers/isolatedAcceptance.cjs ./tests/helpers/adaptive-development-server.cjs
```

Terminal 2, actual Admin app:

```powershell
Set-Location C:\Users\user\WebstormProjects\Shop-for-all\ecommerce-admin
$env:VITE_API_URL = 'http://127.0.0.1:4008/api'
& 'C:\Program Files\nodejs\node.exe' node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5185 --strictPort
```

No `.env` edits are necessary. The server helper permits its generated synthetic shop ID in `ADAPTIVE_BUILDER_DEV_SHOP_IDS`, mocks providers and prevents external network/worker startup through the existing isolated preload. Normal non-isolated development would require `NODE_ENV=development` and an explicit authorized shop ID allowlist; this is never an adoption flag and production denies the grant.

### Manual acceptance sequence still required

1. Sign in, open the URL and confirm page selector, structure tree, canvas, inspector, devices, undo/redo and draft status render.
2. Product → Design Mode → select protected core → galleryFrame: change fit/aspect; title: change typography; surface: choose a contrast-safe color pair. Main layout supports stack/columns; thumbnail placement is fixed.
3. Category/Collection → listing: change base/tablet/desktop columns. Inspect actual filter/sort/pagination presentation and empty state.
4. Cart → totals/primaryButton; Checkout → form/input/summary/layout. Choose validation-error/OTP/error/expired/loading/success examples. No business action should execute.
5. Account → login/registration/verification/profile/security; Tracking → OTP/found/transit/delivered/cancellation/return examples; Policies → index/detail and existing plain text.
6. Add a compatible optional section after the core, copy it, save/insert a copy, use/reset a preset; switch pages and devices; undo/redo and reload. Draft changes must stay local to this workspace.
7. Keyboard-only interaction, focus/labels/errors, long EN/BN wrapping, reduced motion, small heights and **real browser 200% zoom**. Record actual browser zoom control/state; viewport resize or the frame's fit scale does not count.

Local draft/recovery keys include authenticated shop and actor IDs, distinct from merchant recovery keys. Browser reload under the same fixture server retains them. Restarting the synthetic server reseeds fixture identities; old local copies remain under their old scope and are not automatically applied to a new identity. Stop the helper with Ctrl+C before destructive test commands. Leave cleanup of the named container to the developer after verifying its label; no other container/database should be removed.

## E. Commerce and security

- Required cores remain root-first, singleton, nonduplicable, nonremovable and nonhideable, enforced by shared validation and commands on the complete resulting graph. JSON cannot define actions, arbitrary data expressions, protected-core sources or component implementations.
- Existing product presentation/calculation helpers, cart view and checkout sections receive existing trusted values/callbacks. Category/collection/tracking/account controllers remain outside the renderer and Admin bundle. Backend order, payment, shipping, OTP, auth and tracking-access APIs were not changed.
- Account private views require a trusted authenticated flag and user; tracking order rendering requires a trusted verified-access flag. These are **adapter inputs from trusted code**, not authentication proofs. Live routes must continue performing their existing server/API checks; merchant graph JSON cannot supply these fields.
- Development grant: production/test default deny, socket-level loopback (forwarded headers ignored), strict allowlisted shop IDs, active DB actor, same tenant/membership, staff permission and active full-plan access. It returns no customer/order/settings payload or publication authority. Responses are `no-store`.
- Local storage is not a server security boundary. The development factory refuses network mutation/publication/uploads regardless of client state; the unchanged server adoption policy remains the authoritative protection. CAS prevents two tabs from blindly overwriting the same local draft. Unknown formats/invalid themes are retained and surfaced instead of silently cleared.
- Shared style/content/source protections and budgets remain in force. New media/grid flags come from the code-owned registry, not JSON. Protected controls still reject arbitrary hiding/sizing; contrast checks cover supported semantic surfaces/controls. Nested product information, listing/card, cart-summary and tracking-summary parent contexts are code-owned registry data shared by backend validation and the renderer; unsafe child paint is rejected at both boundaries.
- Existing tenant asset validation, public eligibility, older-client protection, transaction/publish barriers and policy/SEO graph preservation were exercised by compatibility and isolated Mongo suites. No new upload system, collection, programmable lookup or unrestricted markup was added.
- The development server uses synthetic data in verified disposable Mongo, mocks email/SMS/provider transports and starts no workers. No real orders, OTPs, emails, SMS, payments or courier operations were issued.

## F. Preview and live parity

Verified: the same resolved template, compiler, core adapter and shared view yield exact SSR under inert preview ports versus equivalent trusted callback ports for all twelve families. CJS/ESM plans, CSS and capabilities match in 20 page/palette cases. Callback identity, protected state gating, catalogs, cart totals and existing core semantics are checked. No controller/network import appears in the Admin renderer graph.

Legacy storefront routes now reuse the moved pure view markup, and all frozen legacy outputs remain unchanged. **No production route selects an adaptive template in this phase.** Existing authoritative adoption policy remains false, public adaptive projection remains inactive, and unassigned/unauthorized stores retain legacy rendering. End-to-end live-route adaptive selection, server-granted projection/batch-source joins and actual customer-session/controller wiring to the new adapters are **not claimed verified or enabled**. Those need a separately approved default-off integration/acceptance step before release. A caller-controlled JSON flag must never authorize them.

SSR determinism tests do not prove hydration. Authenticated browser hydration, cross-page history/recovery interaction, modal/focus behavior, mobile visual layout and real commerce journeys remain browser acceptance gaps; historical tests/Phase 4 evidence are not relabelled as Phase 5 browser results.

## G. Verification results

| Gate | Actual result | Evidence |
|---|---|---|
| Pre-edit compatibility | **723/723 PASS** | `compatibility-before.log` |
| Final compatibility + full-site tests | **839/839 PASS**, including **116 new full-site tests** | `compatibility-final-tests.log` |
| Full backend unit/security suite | **1291/1296**; same five historical failures | `backend-final-tests.log` |
| Disposable Mongo full set | **59/61**; same two historical failures; all four new full-site/grant/CAS integration tests pass | `mongo-final-tests.log`; independent `mongo-new-tests.log` **4/4** |
| Admin production build | PASS | `admin-build-final.log` |
| Storefront production build | PASS | `storefront-build-final.log` |
| Full Admin lint | **16 errors, 2 warnings**, same historical set | `admin-lint.log` |
| Storefront lint | PASS | `storefront-lint.log` |
| Focused changed-JS lint | 58 files, 12 existing unused-variable errors in two source-inspection test files; **0 introduced, 0 warnings** | `focused-lint.log`, `lint-delta.json`, `tooling-results.json`; baseline compared against task-start revision |
| Modules | CJS SSR load, ESM parse and **20-case CJS/ESM plan/CSS parity PASS** | `tooling-results.json` |
| Local access/auth | HTTP/module/login/grant/bootstrap **200**, publication false, normal adoption false | `local-access.json` |
| Frozen baseline | Ten presets; 370 rendering cases; 144 earlier hashes; 20 Gallery/Builder/live-home comparisons retained | compatibility logs, home-parity JSON, `integrity.json` |
| Diff/integrity | PASS: no protected artifact/theme/snapshot mutation, removed initial files, introduced whitespace or revision change | `integrity.json`, `git-diff-check.log` |
| Actual Admin browser, hydration, 200% zoom | **BLOCKED** by Work browser setting | `local-access.json`; tool attempts recorded in conversation |

The frozen manifest hash remains `06f9c824214c10ec907fcb5e5de12e269f3ba334749d98294ca381153452b841`.

### Commands

From `ecommerce-backend/backend`:

```powershell
$env:THEME_PARITY_REPORT = 'C:/Users/user/WebstormProjects/Shop-for-all/output/adaptive-builder/phase5/final-home-parity.json'
node --test 'tests/*.test.js'
node --test tests/adaptive-builder-baseline.test.js tests/storefront-preview-parity.test.js tests/storefront-atelier-contract.test.js tests/storefront-atelier-routes.test.js tests/storefront-atelier-commerce.test.js tests/storefront-atelier-builder.test.js tests/storefront-atelier-presentation.test.js tests/storefront-release-hardening.test.js tests/storefront-effective-theme.test.js tests/store-builder-prebuilt-themes.test.js tests/adaptive-page-contract.test.js tests/adaptive-persistence.test.js tests/adaptive-renderer.test.js tests/adaptive-renderer-remediation.test.js tests/adaptive-editor.test.js tests/adaptive-full-site.test.js
node tests/helpers/benchmark-adaptive-full-site.cjs
```

With the verified disposable replica set, preview server stopped and the three isolation variables shown above:

```powershell
node --require ./tests/helpers/isolatedAcceptance.cjs --test --test-concurrency=1 tests/integration/adaptive-persistence.integration.test.js tests/integration/store-builder-safety.integration.test.js tests/integration/atelier-release-hardening.integration.test.js tests/integration/adaptive-editor.integration.test.js tests/integration/adaptive-full-site.integration.test.js
```

Admin: `node node_modules/vite/bin/vite.js build --outDir ../output/adaptive-builder/phase5/admin-dist --emptyOutDir=false`; `node node_modules/eslint/bin/eslint.js .`.

Storefront: `node node_modules/next/dist/bin/next build`; `node node_modules/eslint/bin/eslint.js`.

Repository root: `node output/adaptive-builder/phase5/verify-tooling.cjs`; `git diff --check`; `node output/adaptive-builder/phase5/final-audit.cjs`. Logs have companion `.exit.txt` files. Lint/full-suite exit failures remain failures; historical classification does not turn them into green runs.

### Failure register

Unchanged backend failures: `ai-acceptance-provenance.test.js` (requested section chargeability/fallback), `ai-preferences.test.js` (prompt version 5 vs 4), `security-hardening.test.js` low-stock queue source assertion, promotion scheduling copy assertion and confirmed-status test's existing `Retry Courier` source assertion.

Unchanged Mongo failures: `store-builder-safety.integration.test.js` full-plan prebuilt round-trip (Mongoose object spreading/nesting) and limited-plan autosave (403 vs expected 200). They remain release blockers, not evidence of passing production persistence.

Introduced during development and fixed/retested: superseded unsupported-adapter/page assertions; source-inspection paths after view moves; one new unused semantic prop; missing enum sample in typed-style test; nested surface containment/contrast gap found in final review (493 focused checks pass after repair); test-only NODE_ENV cleanup order, Headers access and incorrect fixture plan name. The first integration attempt's failed output is retained as `mongo-tests.log`; it was stopped when the cleanup guard left its test process open. Corrected isolated runs complete with only the two historical failures. No frozen expectations were regenerated.

## H. Performance and accessibility

`performance.json` measures warm local Node operations on synthetic 14/80/200-node whole-site graphs. Other verification tasks were running concurrently; these are observations, not browser timings or an SLA.

| Nodes | Validated inspector edit p95 | Serialization p95 | Resolve all 12 pages p95 | Product style compile p95 | Product SSR p95 |
|---|---:|---:|---:|---:|---:|
| 14 | 12.15ms | 0.14ms | 53.41ms | 0.11ms | 12.02ms |
| 80 | 17.15ms | 0.51ms | 51.40ms | 0.16ms | 18.28ms |
| 200 | 21.73ms | 0.87ms | 83.53ms | 0.18ms | 21.53ms |

Near-limit snapshot: 58,411 UTF-8 bytes. Thirty retained history strings approximately 3,504,660 UTF-16 bytes, excluding current/future/object/React/browser overhead. History remains bounded. Shared explicit browser renderer entry is 568,052 bytes (~555 KiB) unminified with external React/icons; actual Admin build splits the adaptive editor and common renderer. No commerce controllers, repeated per-block fetching, new cache or state dependency was added.

Actual page-switch/input latency, iframe layout/paint and browser heap remain **unmeasured**. Near-limit validated edits measured 21.73ms p95 in this Node run; this is not an input-to-paint latency or a guarantee for slower devices. Profile the real editor before deciding on further optimization.

Source/SSR tests cover labels/required fields/consent/error semantics, touch/focus compiler rules, reduced-motion CSS, bounded functional typography, contrast, responsive inheritance, EN/BN long titles and escaped policy text. Existing labels were extended to opt-in adaptive auth/filter/security fields without changing legacy output. Real keyboard navigation, focus restoration/trapping, contrast after layout, overflow, small heights, reduced-motion interaction and 200% zoom remain **unverified Phase 5 browser checks**. No viewport/fit scaling is counted as zoom.

## I. Remaining work and exact next safe task

1. **First:** enable an approved local browser surface, sign into the running isolated normal Admin at the URL above, execute the manual acceptance sequence and actual 200% zoom, record screenshots/assertions and fix confirmed defects. Do not enable adoption to run this check.
2. Review default-off live-route integration and trusted projection/data ports for each commerce controller, preserving existing authorization and calculations; verify actual SSR/hydration and private-session access before rollout.
3. Resolve the existing backend/Mongo/Admin lint release register separately; preserve all frozen baseline assertions.
4. Decide whether before-core product content warrants a new approved blueprint, and whether additional gallery composition, recovery/vendor/modal preview modes or policy-index layout controls are product requirements. Current unsupported options stay explicit.
5. Complete real browser performance/accessibility and cross-page reload/history/conflict/media recovery checks. Retest all ten themes after any shared-code fix.

**No Phase 6 implementation, merchant enablement, deployment or publication has begun.**
