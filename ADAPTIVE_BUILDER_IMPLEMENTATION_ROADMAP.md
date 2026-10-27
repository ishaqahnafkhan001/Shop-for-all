# Adaptive Full-Site Store Builder — Implementation Roadmap

**Date:** 20 October 2026. **Status:** planning only. No phase below has been implemented by this investigation.

Companions: [architecture audit and page matrix](C:/Users/user/WebstormProjects/Shop-for-all/ADAPTIVE_BUILDER_ARCHITECTURE_AUDIT.md), [system design and proposed contracts](C:/Users/user/WebstormProjects/Shop-for-all/ADAPTIVE_BUILDER_SYSTEM_DESIGN.md).

## 1. Recommended scope and release order

Build inside the existing shared contract, renderer, Admin Builder and backend publication services. Keep all ten existing theme definitions unchanged. Make adaptive assignment explicit per page; keep every unassigned page on its current rendering path.

### Practical MVP

1. One default template for each existing page family, plus shared header/footer assignments.
2. Rich homepage/global editing and compatible decorative nested groups, using existing section views.
3. Product/category/collection cores with approved design parts and optional surrounding content.
4. Cart/checkout/account/tracking cores with limited style controls; existing logic and internal field structure remain protected.
5. Policies index/detail templates using the current policy content and defaults.
6. Responsive typed styles, contextual selection, property inheritance/reset, copy-based saved sections and bounded style presets.
7. Existing drafts/autosave/undo/revisions/publication; new graph/media validation and all-page cache handling.
8. Safe page/state previews, with read-only synthetic protected states where interactive seams do not yet exist.

The MVP is a useful full-site design surface, **not complete internal block rearrangement of every functional form**. It does not include real-time collaboration, a marketplace, custom code, new commerce APIs, new payment/shipping methods, real customer data in preview, public draft share links, or additional storefront routes.

## 2. Decisions before implementation or rollout

| Decision | Recommended default | Approval / dependency |
|---|---|---|
| Architecture | Constrained templates + registered blocks + protected functional cores | Approve this boundary before building an editor. |
| Data format | Explicit opt-in theme v5 with `siteBuilder`; existing storage/revision pipeline | Confirm contract/rollout ownership; all consumers must support reads before writes. |
| MVP boundaries | Rich home/globals; other commerce pages protected cores first | Approve against the audit page matrix. Do not sell unrestricted field editing. |
| Plan eligibility | Preserve current none/limited/full rules; no automatic new entitlements | Decide the adaptive command matrix. Current Atelier availability across Builder-enabled shops is not approval for this feature. |
| Downgrade/grandfathering | Preserve data and required commerce functionality; no destructive automatic conversion | Product must define which advanced presentation remains visible and which edits become locked. No independent subscription changes. |
| Essential/optional parts | Existing functional inventory and actual backend requirements | Product/engineering confirm optional content versus conditional/required functional controls per blueprint. |
| Design ranges | Initial bounded styles and 256 KiB/200-node proposal | Validate representative content and browser tests before freezing v5. |
| Reuse behavior | Saved-section insertion copies; named style presets can affect multiple nodes | Approve clear impact/reset UI; synchronized linked sections are later. |
| Publication | Whole-site revision, transactional new-format publication | Verify MongoDB transaction capability and rollback/media behavior in an isolated environment. |
| Adoption/rollout | Separate default-off adaptive gate, authorized synthetic/pilot tenants first | Product owner names rollout owner and pilot scope. Do not reuse the enabled Atelier flag. |
| Acceptance tooling | Existing repository tools and approved isolated infrastructure | Recheck browser/Mongo availability. Missing runtime coverage remains a blocked gate, not a pass. |

Architecture work and inert tests can proceed after scope approval; business decisions must be settled before enabling affected merchant commands or publishing adaptive stores. Do not create arbitrary new tier restrictions as a shortcut.

## 3. Phases, dependencies and acceptance gates

Estimates are **focused engineer-days**, with five days per engineering week. They include implementation, focused tests and review/repair within the stated scope. They are planning ranges, not measured completion times or a delivery commitment.

### Phase 0 — Freeze the real baseline and minimum contracts: 3–5 days

**Dependencies:** repository access, agreed MVP/protected-block boundaries; no merchant rollout required.

**Targets:** existing test harnesses and immutable fixtures; new proposed `ecommerce-backend/backend/tests/adaptive-builder-baseline.test.js` and `tests/fixtures/adaptive-builder/baseline-manifest.json`.

**Work:**

- Validate the existing frozen nine-theme evidence; never regenerate those expectations to hide drift.
- Add missing Atelier/current customized-snapshot coverage and explicitly record all ten definition versions/hashes.
- Capture schema/normalization/effective output, page/critical-state markup, core callback contracts, image references and known request shapes with synthetic tenant data.
- Establish actual unit/lint/build status and classify differences from historical reports.
- Agree stable page kinds, protected core inventory, compatibility boundaries and preview fixture ownership from the audit.
- Measure representative document bytes, resolve/render work, editor memory/interaction and initial route payloads where tools are available.

**Gate:** reproducible immutable baseline, honest known-failure register and missing-browser/database gates. No shared runtime or database schema change yet.

**Risks:** prior reports include baseline failures and blocked browser acceptance. Fix introduced defects; classify unrelated failures with evidence rather than weakening assertions.

### Phase 1 — Inert shared page/block/style contract: 10–15 days

**Dependencies:** Phase 0 and approved contract scope.

**Targets:** proposed pure modules within `packages/storefront-theme/`; isolated unit/contract fixtures. Extend package exports only after compatibility checks.

**Work:**

- Define page/blueprint kinds, allowed block slots, required cores and editable semantic parts.
- Implement pure raw graph validation, strict typed styles, finite data bindings and responsive resolution.
- Implement ID-safe add/remove/copy/move/reset commands that cannot mutate protected topology.
- Define copy-based saved sections and nonrecursive style presets with bounded references.
- Add CJS/ESM parity checks and structured issue paths.

**Gate:** unsupported input, cycles, foreign graph links, required-core deletion/duplication, unsafe keys/styles/URLs and over-budget candidates are rejected; false/zero/reset semantics are correct; no existing format/output changes.

**Risks:** early overgeneralization. Start with home, product and checkout manifests to test optional, data-bound and protected cases, then complete the same mechanism for other families.

### Phase 2 — Storage, compatibility, permissions and assets: 10–15 days

**Dependencies:** stable Phase 1; versioning, plan, downgrade and transaction decisions approved.

**Targets:** shared `index.cjs`/`index.mjs`, `capabilities.cjs`/`effective.cjs`; backend `models/Shop.js`, `StoreBuilderDraft.js`, `StoreBuilderRevision.js`; existing Builder service/controller/availability/compatibility/SEO/asset paths.

**Work:**

- Add version-aware schema support and declared `theme.siteBuilder` persistence without normalizing away or archiving the graph.
- Keep v4 reads/writes unchanged and adoption off. Deploy reader support before accepting adaptive publication.
- Reject old complete saves that would drop a current v5 graph; preserve unknown future-version protections.
- Enforce backend-derived staff/tenant/plan/adoption policy for final candidates, including direct service and revision restore paths.
- Extend source/media reference collection, ownership, draft attachment, promotion, retained-revision media safety and cleanup to all templates/globals/libraries.
- Reuse existing draft CAS and whole-site publication; require transactions for v5 publication.
- Add page/node-aware change summaries, public projection and all-page invalidation; preserve graph during SEO-only writes.

**Gate:** exact real Mongoose round trips; no writes after failed validation; isolated rollback/restart/concurrent publication tests; media referenced by a retained revision cannot be silently deleted; old writers cannot erase new data.

**Risks:** this is the highest data-loss boundary. Do not expose graph uploads before ownership/cleanup understands them, and do not treat Mixed as a validator.

### Phase 3 — Shared renderer and responsive style compiler: 12–18 days

**Dependencies:** Phases 1–2; all-page core contracts defined.

**Targets:** existing shared reference/presentation components, design tokens and scoped styles; proposed renderer adapters; existing storefront provider/shell and effective public-loading boundaries.

**Work:**

- Resolve the active page assignment plus globals; unassigned routes use existing rendering unchanged.
- Add protected core adapters around existing view/controller boundaries.
- Render compatible content/stack/column groups and compile typed styles into static scoped CSS variables/properties.
- Apply all three responsive tiers consistently in SSR and preview.
- Keep route data loading, authentication, pricing and actions in current owners.
- Add runtime defensive handling for corrupt/unavailable presentation while preserving required commerce access; report unsupported schema rather than silently deleting configuration.
- Keep the shared manifest browser-safe: no backend model, secret, database or private-data imports.

**Gate:** opt-in SSR/CSR parity; same compiled preview/live output; no hydration-dependent viewport tree; all ten legacy baselines unchanged; no per-node data-fetch waterfall or bundle import of all private page controllers.

**Risks:** scattered hardcoded styles may require small opt-in part hooks. Do not solve them with broad unscoped CSS or by replacing all page markup.

### Phase 4 — Contextual Builder and rich home/globals: 15–22 days

**Dependencies:** shared contract/renderer and safe storage are stable.

**Targets:** existing Builder page, sidebar, inspector, registry, section/hero/product/navigation/footer editors, preview frame, history/issues drawers and queue/recovery hooks; new small tree/selection/style controls inside the existing directory.

**Work:**

- Add page/global selection, stable tree/breadcrumb selection and contextual part inspector.
- Implement Quick Edit, Design and constrained Advanced UI over the same command validation.
- Add compatible block insertion/copy/reorder, responsive inheritance display and targeted resets.
- Extend existing home/global views, preserving hero/catalog and theme composition behavior until explicit adoption.
- Connect saved-section copy insertion and style-preset impact review.
- Coalesce slider/typing interactions into useful undo steps; reuse existing queue and publish barrier.
- Route validation issues to stable IDs rather than indexes; keep old local recovery versions readable or explicitly quarantined, never discarded silently.

**Gate:** keyboard/click selection works without activating commerce; required controls cannot be removed through UI or direct JSON; undo/redo/draft recovery preserve IDs/content/references; preview agrees with published output.

**Risks:** JSON snapshot history and all-card gallery previews can become expensive. Measure first; avoid adding a new global state library or event-sourcing system prematurely.

### Phase 5 — All existing page families and safe previews: 15–22 days

**Dependencies:** Phases 1–4; page/core capabilities and preview states approved.

**Targets:** product/category/collection/cart/checkout/account/track/policy route owners and their current views, existing `PreviewCommercePages.jsx`, preview page selector and fixture adapters.

**Work:**

- Enable product/listing core styling and surrounding content slots.
- Add policy index/detail template adapters while retaining policy text/defaults and metadata ownership.
- Expose only approved core styles for cart/checkout/auth/account/tracking, retaining controller state and API contracts.
- Use small presentation seams where necessary; no wholesale account/tracking extraction.
- Add safe page/state previews. Use synthetic private states and read-only shared regions until safe action ports exist.
- Explicitly cover loading/error/empty/success and conditional eligibility/role states.

**Gate:** every existing customer page family has a documented supported design surface; unsupported internal edits are visibly locked. No preview can send OTP, create an order, change a password, cancel/return an order, upload proof or send a notification.

**Risks:** account `SecurityTab`, password reset and tracking contain API-owning code. A sandboxed iframe alone cannot prevent parent-side handlers from making requests. Do not duplicate their markup to get an early preview checkbox.

### Phase 6 — Acceptance and authorized MVP pilot: 8–12 days

**Dependencies:** Phases 0–5; release owner, pilot/plan policy, isolated integration environment and browser capability available.

**Targets:** existing test suites/fixtures and deployment/rollback runbook. No automatic merchant publication or deployment.

**Work:**

- Execute the complete matrix below against both legacy and opted-in candidates.
- Verify all API write paths, asset collection/cleanup, concurrent drafts/publications, SEO changes, cache invalidation and old-client behavior.
- Perform actual responsive, keyboard/focus, accessibility and critical workflow browser checks.
- Validate export/pre-adoption backup and media-safe restore without assuming an old revision survives retention.
- Review diff, configuration and package/build compatibility; authorize a bounded pilot only when gates pass.

**Gate:** every mandatory gate is Pass, or the pilot is Blocked. Historical SSR/test counts do not substitute for current browser/database evidence.

## 4. Later enhancements

| Phase | Scope | Focused effort | Main dependency |
|---|---|---:|---|
| 7 | Finer product/listing internal slots and richer compatible nested groups | 12–18 days | Product/query/action contract and focus/order tests |
| 8 | Carefully approved internal cart/checkout layout and part editing | 15–25 days | Existing OTP/consent/pricing/idempotency integration and browser gates |
| 9 | Finer account/tracking regions and interactive synthetic preview states | 10–18 days | Narrow view/action ports; no new auth/order-access service |
| 10 | Per-resource template assignment and synchronized saved sections, if still required | 8–15 days | Tenant ownership, update impact review, dependency/rollback policy |
| 11 | Additional full-site regression, performance tuning and expanded rollout | 8–12 days | All enabled features and release approvals |

These phases are not prerequisites for the bounded MVP. Public draft sharing, broader block libraries and real-time collaboration require separate estimates/security designs; they are not hidden in the table.

## 5. Realistic effort

- **MVP:** phases 0–6 total **73–109 engineer-days**, approximately **15–22 engineering weeks** for one experienced engineer with regular design/QA support.
- **MVP plus the listed later work:** **126–197 engineer-days**, approximately **25–40 engineering weeks** for one engineer. This still excludes a freeform canvas and collaboration service.
- With **two experienced engineers plus regular UI/UX and QA support**, a reasonable planning envelope is **10–14 calendar weeks for the MVP**, and **18–26 weeks for the listed full roadmap**. Shared contract/storage/rendering work limits parallelism; dividing effort by headcount alone is misleading.

Assumptions: existing commerce behavior is retained; no payment/shipping/auth rewrite; existing dependencies are sufficient; product decisions arrive promptly; reference designs and acceptance environments are available; existing failures are classified early. These are estimates, not promises or a claim that the existing code has been performance-tested.

### Risks that increase effort

1. More internal checkout/auth/tracking freedom than the atomic-core MVP.
2. Unresolved v4 baseline failures or previously undiscovered coupling in views.
3. Media retention/recovery requirements and asset references absent from current cleanup paths.
4. A need to support mixed old/new backend writers or unsupported storefront binaries.
5. Per-entity templates, synchronized blocks or real-time multi-user editing added early.
6. Missing browser access, isolated MongoDB/transaction support or reliable provider mocks.
7. Full accessibility/localization/long-content fixes found after the design engine exposes new combinations.
8. Lifting bounds or adding arbitrary CSS/HTML, which invalidates this architecture and estimate.

## 6. Mandatory test matrix

These are **required future tests**, not results produced by this audit.

| Area | Required cases / acceptance |
|---|---|
| Ten-theme compatibility | Definitions/versions unchanged; existing customized/raw/normalized/effective snapshots; all current page/critical-state markup and commerce callbacks; preserve existing nine assertions and add Atelier, never replace baselines. |
| Format | v4 unchanged; valid v5 round trips; unknown future version; omitted/old graph writes; unknown keys; no archive/truncation loss; CJS/ESM parity. |
| Tree/commands | Missing/duplicate protected core; invalid parent/page/type; duplicate IDs; cycles; shared/dangling/unreachable children; deep/large input; copy ID regeneration; move/reset semantics; invalid style-preset and saved-section references. |
| Style/responsive | Missing versus false/zero; base/tablet/desktop inheritance; specific base overrides versus less-specific desktop values; noninherited spacing; property/part/unit bounds; no selector/URL/executable CSS; protected error/focus/control visibility. |
| Security | XSS strings; unsafe/encoded/protocol-relative URLs; prototype/operator keys; arbitrary events/props; forged plan/tenant/required flags; foreign products/media/templates; direct draft/publish/restore/SEO bypass; CSRF/session/staff boundaries retained. |
| Media | Nested/global/library extraction; tenant ownership; draft promotion; failed transaction/restart; retained revision pins; cleanup/pruning; restore with missing media; legacy external URLs preserved safely without server-side fetching. |
| Draft/history | Two tabs editing different pages conflict safely; stale revision/timestamp; autosave/save/discard/publish ordering; unmount/tenant switch; local storage limits; keyboard undo and slider coalescing; recovery schema mismatch. |
| Publication | Real isolated replica set; concurrent CAS; rollback after Shop/revision/audit/asset failure; restart recovery; post-commit invalidation failure; exact one publication; legacy standalone behavior unchanged and adaptive unsupported-storage failure explicit. |
| Product/listings | Variant selection, no override/zero price, stock 0/1/many, quantity limits, cart/buy, review action, filters/sort/pagination and correct category/collection scope. |
| Cart/checkout | Tenant cart isolation, persistence/refresh/zero totals, required fields, zones, coupons, policy acceptance, optional marketing, OTP request/resend/cooldown/expiry/limits/proof binding, duplicate submit/retry, actual returned order ID and success/empty/error states. |
| Account/tracking | Anonymous/customer/vendor states, registration/reset/security limits, own orders/logout, no private order data before OTP, edited lookup identity invalidates access, eligibility-driven cancel/return, proof validation and failures. |
| Preview | Same resolver/compiler/views; selected tenant public content; synthetic private data; outbound API-write/upload/provider traps; no real auth/order/OTP action; stable selection under reorder/resizing. |
| Browser/accessibility | 320/360/390/430/767/768/1023/1024/1440 px; long Bengali/English text; absent media; keyboard, focus, tabs/dialogs, screen-reader names, 200% zoom, reduced motion, overflow and sticky controls. Static validation is insufficient. |
| Performance/cache | Measured baseline versus bounded maximum graph; resolve/serialize/payload/bundle work; editor input/selection/undo; no per-node fetches; tenant/revision/entitlement cache isolation; draft/private data never in public cache; global publication refreshes every route family. |
| Package/build | Clean and warm Vite startup, package source/export changes, React dependency generations, Next.js SSR/client exports, production builds and scoped lint/security checks. |
| Rollback | Disable adoption without breaking active v5 pages; supported v4 recovery from preserved backup; content/media retained; no unreviewed data rewrite or unsafe old-binary rollback. |

### Existing verification to reuse

Use, rather than replace, the existing backend suites:

- `storefront-theme-merge`, `storefront-effective-theme`, `storefront-capabilities`, `storefront-composition`, `storefront-structural-variants`, `storefront-preview-parity`, `storefront-preview-data`, `storefront-first-render`, `storefront-state-delivery`, `storefront-control-wiring`.
- `storefront-atelier-contract`, `storefront-atelier-builder`, `storefront-atelier-commerce`, `storefront-atelier-routes`, `storefront-release-hardening`, and the existing Store Builder tests.
- Integration: `tests/integration/store-builder-safety.integration.test.js`, `checkout-order-safety.integration.test.js`, `atelier-release-hardening.integration.test.js`, and newly added adaptive cases.
- Admin: `tests/storefront-package-watch.test.mjs`, `tests/vite-dependency-cache.test.mjs`, existing renderer/Builder fixtures and isolated SSR harnesses.

The current repository paths for these suites were checked; the tests were **not executed for this planning task**. Previously reported failures must be re-established at Phase 0 against the then-current revision.

### Command and environment policy

- Run focused `node --test` suites as each boundary changes; use existing backend `npm test` for the final unit gate.
- Run `npm run test:integration` only with an explicitly verified disposable MongoDB replica set and mocked email/SMS/OTP/payment/courier/marketing transports. Inspect harness startup before running it. A database name containing `test` is not proof of isolation.
- Run affected-file lint during work; record whole Admin/storefront lint results and classify baseline failures at release gates. Do not weaken rules/assertions to get a green report.
- Run both existing frontend `npm run build` scripts, package import/export checks, existing relevant security checks, and `git diff --check` before acceptance.
- Use actual approved browser tooling; do not bypass disabled browser settings or install extra tooling without authorization.
- Do not send real notifications or perform live orders/returns/OTP while testing without explicit authorization.

## 7. File-level implementation dependencies

All entries describe **future changes**, not edits made by this audit.

| Area | Existing files/directories | Why changes depend on earlier phases |
|---|---|---|
| Shared contract | `packages/storefront-theme/index.cjs`, `index.mjs`, `effective.cjs`, `capabilities.cjs`, plus proposed pure page/style modules | Backend, Admin and storefront must agree on version, merge, protection and responsive meaning before UI edits. |
| Persistence | `ecommerce-backend/backend/models/Shop.js`, `StoreBuilderDraft.js`, `StoreBuilderRevision.js`; `services/storeBuilder/storeBuilderService.js`, `themeCompatibilityService.js`, `draftConcurrency.js` | Schema preservation and CAS/transaction behavior precede merchant adoption. |
| Permissions / write coverage | `routes/storeBuilderRoutes.js`, `controllers/storeBuilderController.js`, `services/storeBuilder/themeAvailabilityService.js`, `storeBuilderSeoService.js` | Every candidate/restore/SEO path must enforce the same final graph policy. |
| Media | `services/storeBuilder/storeBuilderAssetService.js`, `models/StoreBuilderAsset.js`, shared extraction | Ownership and lifetime accounting must understand every new reference before graph uploads. |
| Shared runtime | `packages/storefront-renderer/reference/`, `presentation/`, `designTokens.js`, `styles.css` | Pure contract first; opt-in adapters preserve existing callbacks and styles. |
| Tenant shell / data | `ecommerce-storefront/src/app/[subdomain]/layout.jsx`, `StorefrontThemeProvider.jsx`, `lib/storefrontPublishedSettings.js`, `lib/storefrontServer.js`, revision watcher | Global template ownership, SSR consistency and public/private cache separation. |
| Page adapters | Existing product/category/collection/cart/checkout/account/track/policy files in the audit source index | Add narrowly scoped presentation seams after core contracts and style capabilities exist. |
| Editor | Existing `StoreBuilderPage.jsx`, sidebar/panels/registries/editors/preview and hooks | Consume authoritative metadata and commands; never invent client-only permissions. |
| Tests | Existing shared SSR fixtures, backend tests and isolated integration helpers | Freeze baselines first and add new cases; no blanket snapshot replacement. |

No commerce endpoint, product-price schema, stock ledger, authentication token format or order-access API is an implementation target for this Builder project.

## 8. Rollout and operational gates

1. Preserve and verify all-ten baseline data before shared changes.
2. Ship inactive contract/read support and compatible storage/public projection; adoption disabled.
3. Verify no unexpected v4 output changes and no old-writer data loss.
4. Complete a synthetic/disposable tenant walkthrough, transaction/media/rollback tests and browser acceptance.
5. Confirm plan policy, downgrade behavior, rollout owner and exact pilot tenants.
6. Obtain explicit pilot/publication authorization. Keep existing ten themes usable throughout.
7. Observe validation errors/conflicts, public resolve failures, media reference errors, payload/render costs and cache convergence using tenant-scoped IDs/revisions, not customer secrets.
8. Expand eligibility only after pilot evidence. Gate-off stops new adoption; it must not make existing adaptive stores unreadable.

Current Atelier availability is a separate decision and remains unaffected by these proposed phases. This investigation changes no live setting.

## 9. Exact first safe implementation task

**Task: create a test-only all-ten compatibility baseline manifest using the existing isolated renderer/contract harness.**

**Proposed files:**

- `ecommerce-backend/backend/tests/fixtures/adaptive-builder/baseline-manifest.json`
- `ecommerce-backend/backend/tests/adaptive-builder-baseline.test.js`

**Inputs:** current ten definitions, existing immutable nine-theme baseline artifacts, existing synthetic customized themes and route/state fixtures, current supported schema/version and commerce callback contracts.

**Required outcome:**

1. Validate the old nine against their existing immutable artifacts; add missing tenth-theme/current-state evidence without changing those artifacts.
2. Record definition/version hashes and representative raw → normalized → effective → rendered outputs for the actual page families and critical states.
3. Record which checks are executable, baseline-failing or blocked; do not label historical/browser/database evidence as newly verified.
4. Verify there is no application import of a new adaptive module, no new accepted persisted format, no database/environment change, and no theme publication.

**Stop after this test-only task for review.** The next implementation task would be the inactive pure manifest/validator prototype for home, product and checkout. Do not begin with a canvas, source-wide extraction, schema migration, or enabling merchant access.

## 10. Current investigation result

Delivered three planning documents. Source-grounded architecture, page/protected-core matrix, proposed v5 contracts, responsive strategy, backend/media safeguards, compatibility/migration plan, phased dependencies, effort ranges and future test gates are documented. Runtime acceptance is not claimed. Implementation and rollout remain unstarted.
