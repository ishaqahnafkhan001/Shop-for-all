# Atelier Editorial — regression and release verification matrix

**Planning only, 20 October 2026.** Tests below are required future work. No application test, lint, production build, live delivery or browser regression suite was executed during this planning task. Existing suite names and harness behavior were inspected in source; their current pass/fail state is unknown.

The release must prove three outcomes independently: the tenth theme follows the approved design with dynamic merchant data; the existing nine presentations remain unchanged; all current commerce, tenant and publication contracts remain intact. Mark an unexecuted scenario **Not run**, unavailable infrastructure **Blocked**, and a failure **Failed**. Do not infer a pass from component existence or screenshot parity.

Companions: [implementation plan](C:/Users/user/WebstormProjects/Shop-for-all/NEW_THEME_IMPLEMENTATION_PLAN.md) and [component mapping](C:/Users/user/WebstormProjects/Shop-for-all/NEW_THEME_COMPONENT_MAPPING.md). Existing element baseline: [raw inventory](C:/Users/user/WebstormProjects/Shop-for-all/STOREFRONT_RAW_STRUCTURE_AND_FUNCTIONAL_INVENTORY.md).

## 1. Test environment and evidence rules

1. Use deterministic merchant/catalog fixtures and disposable tenants A/B. Freeze nonfunctional time/countdown inputs where necessary; use fixed viewport, device scale, browser version, loaded font and animation setting for visual comparison.
2. Integration tests use an isolated MongoDB replica set and a database name containing `test`. The current launch-safety harness deletes all collections before/after tests: never point it at production, staging or a shared developer database. Source: `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/helpers/launchSafetyHarness.js:70`.
3. Intercept/mock all OTP/email/SMS/marketing/courier/provider transports before exercising order/auth APIs. Do not start the general production worker against a test fixture or assume NODE_ENV alone disables every outbound transport. Assert no real provider request escaped the harness. If a test cannot establish this, use a mocked component test until the isolated integration setup is ready.
4. Capture the current nine baseline **before changing shared source**. Preserve actual current merchant-shaped themes, not just regenerated defaults. Redact private records from screenshots/logs.
5. Preserve each existing assertion for the nine presets. Append tenth-theme coverage; change literal catalog count 9→10 only with new identity/validity assertions. Do not loosen checks to make a failing new implementation pass.
6. Evidence includes revision/SHA, test command, result, browser/viewport, fixture ID, screenshots/diffs and any exclusions. No real order, notification or publication is authorized by this test plan.

## 2. Existing automated suites to reuse

All paths in this table are under `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/`.

| Existing file | Source-backed purpose to preserve | Tenth-theme extension |
|---|---|---|
| `store-builder-prebuilt-themes.test.js` | Nine immutable registry entries, existing structural signatures, content preservation, limited-plan behavior and isolated preset package export | Append hidden tenth definition/identity/font checks; retain original nine subset/count/signatures/versions. Registry total becomes 10; active merchant catalog remains 9 until rollout approval |
| `storefront-composition.test.js` | Composition slot planning/order and missing content | Existing compositor unchanged; Atelier marker independent of all supported homepage compositions; every eligible section once |
| `storefront-structural-variants.test.js` | Legacy defaults, accepted/invalid variants and registered renderers | No new composition needed initially; new presentationVariant validated independently, legacy defaults/output unchanged |
| `storefront-effective-theme.test.js` | Published effective resolution and context behavior | Optional marker survives authorized public resolution independently of composition/preset metadata; approved plan fallback only for Atelier; legacy outputs unchanged |
| `storefront-capabilities.test.js` | Editor capability metadata and write-time plan policy | New-marker supported/protected controls; direct payloads cannot bypass product-approved eligibility or existing limited structural restrictions; no assumed full-only rule |
| `storefront-theme-merge.test.js` | Theme patch/merge semantics | New preset application and switch-back preserve merchant fields and unrelated compatibility extensions |
| `storefront-theme-controls.test.js`, `storefront-control-wiring.test.js` | Existing theme controls reach current renderer | Every advertised Atelier control affects its rendered target; hidden/locked controls do not imply unsupported functionality |
| `storefront-color-aliases.test.js`, `storefront-card-inheritance.test.js` | Existing token alias and card inheritance semantics | New scoped palette/card view respects derived values/flags; old color/inheritance behavior unchanged |
| `storefront-hero-contract.test.js` | Hero content/media/CTA contract | New hero consumes same slide model and handlers; no sample product/default marketing claim |
| `storefront-preview-data.test.js` | Builder preview data eligibility and selected content | Existing preview data remains eligible/tenant-scoped; extra page previews/private fixtures are optional Phase O |
| `storefront-presentation.test.js` | Shared product/cart/checkout/policy views, callbacks, product transformations and fonts | Retain existing five-page parity/callbacks; zero prices/stock/variants/local DM Sans; add any essential small variant tests, no mandatory route extraction |
| `storefront-preview-parity.test.js` | Gallery/Builder/live home markup parity per preset/access, live provider/home source, viewport behavior | Tenth theme plus existing shared preview modes; preserve legacy fingerprints; identical scope for equivalent data. Additional page-preview parity only in optional Phase O |
| `storefront-first-render.test.js` | Published first render/SSR behavior | Atelier selector available on server and hydration; no initial default-theme flash or second client resolution |
| `storefront-state-delivery.test.js` | Autosave queue, conflicts, revision watcher and cache behavior | New theme save/reload/publish/restore follows same concurrency/revision path |
| `store-builder-contract.test.js`, `store-builder-navigation-seo.test.js` | Persistence/contract, navigation and SEO | Optional marker/absence/null-clear/Shop round trip, safe links, unchanged metadata/content |
| `store-builder-color-product-edit-images.test.js` | Existing color/image contract behavior | Shared media/token wiring still correct for Atelier and existing nine |

Existing integration files, same test root:

| File | Required evidence |
|---|---|
| `integration/store-builder-safety.integration.test.js` | Tenant-owned drafts/assets/revisions, validation/concurrency; marker persistence, adoption guards and restore |
| `integration/checkout-order-safety.integration.test.js` | Server price/shipping/inventory authority, idempotency and order-access protections with presentation unchanged |
| `integration/tenant-isolation.integration.test.js` | Tenant/customer/vendor boundaries; new presentation must not affect access policy |
| `integration/auth-rbac-privacy.integration.test.js` | Existing auth roles/privacy while account markup receives narrow scoped styling |

The existing unit suites include source/markup checks; they are not a complete interactive browser suite. Current Admin and storefront package scripts expose lint/build, not a dedicated browser-test command. Reuse available browser tooling if present, and otherwise run the manual scenarios below. Do not install a browser-test dependency under this plan or claim manual checks are automated.

## 3. Proposed focused tests and fixture additions

| Proposed file / existing fixture | Meaningful assertion |
|---|---|
| `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/storefront-atelier-contract.test.js` (new) | Optional marker selector, composition independence, both font allowlists, CJS/ESM exports, v4 retained, approved policy/guard, old snapshots unchanged |
| `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/storefront-atelier-presentation.test.js` (new) | New scope only for explicit discriminator; real data/handlers; sparse/long content; no sample data; existing components remain callable without new props |
| `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/storefront-atelier-page-parity.test.js` (optional Phase O) | Additional catalog/account/tracking preview parity only if those modes are approved; core release reuses current five-mode parity suites and live-route tests |
| `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/integration/storefront-atelier-publish.integration.test.js` (new only if existing safety suite becomes unwieldy) | Optional marker survives draft→publish→reload→restore; off/allowlist/direct/SEO transitions guarded; foreign assets/revisions and stale versions rejected |
| `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/theme-presentation.jsx`, `theme-presentation.html` (existing) | Add tenth theme/current preview states; deterministic no-effect fixtures. Extra preview modes are optional; all live pages remain covered by route/browser checks |
| `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/theme-responsive.jsx`, `theme-responsive.html` (existing) | New 1440/390 Figma anchor cases plus narrow/intermediate screens; preserve existing legacy fixture captures |
| `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/theme-controls.jsx`, `theme-controls.html` (existing) | New-theme capability/editor controls, switch-back and font loading |

Prefer extending existing harnesses to creating another renderer or fixture application. Snapshot comparisons must include rendered behavior/controls; do not test only for a new class name.

## 4. Existing nine preset protection matrix

For each row run all checks in the final column; the current status of every row is **Not run**.

| Preset | Identity/version to preserve | Required unchanged baseline |
|---|---|---|
| Modern General | `modern-general`, v2 | Definition, standard composition, existing header/hero/card/section signature; full/limited/none results; all route visuals and controls |
| Minimal General | `minimal-general`, v2 | Same checks; mobile bottom navigation remains disabled by this preset |
| Modern Fashion | `modern-fashion`, v2 | Same checks; existing centered header/full-bleed hero and merchant content retained |
| Editorial Fashion | `editorial-fashion`, v3 | Existing editorial composition/companion behavior unchanged; a presentation marker is independent of it |
| Luxury Jewellery | `luxury-jewellery`, v3 | Existing boutique composition and content-gated collection/story slots unchanged |
| Minimal Jewellery | `minimal-jewellery`, v2 | Existing content/flags and disabled mobile bottom navigation unchanged |
| Soft Beauty | `soft-beauty`, v2 | Existing categories/featured/banner/story/reviews/FAQ/newsletter behavior unchanged |
| Modern Electronics | `modern-electronics`, v3 | Existing discovery companion/category behavior unchanged |
| Fresh Grocery | `fresh-grocery`, v2 | Existing stock/rating flags and promo/collection/trust sections unchanged |

Capture representative home, product, category, collection, cart, checkout, account, tracking and policy pages at desktop/mobile for every preset. Include all current UI controls for each route, not only the Figma sample regions. Compare scope/token/computed style values as well as images; no legacy subtree may acquire the new font, semantic selector or Atelier palette. Any visual difference requires explanation and review, not automatic baseline replacement.

## 5. Contract, switching, plan and persistence matrix

| ID | Scenario / setup | Verification and acceptance | Method / phase |
|---|---|---|---|
| C01 | Raw legacy theme without new marker | Same normalized/serialized/effective output; marker remains absent, no identity inferred from composition or preset ID | Unit + immutable baseline; 0/1 |
| C02 | Append Atelier definition | Ten unique immutable entries; old nine metadata/versions/signatures unchanged; new preset version 1 | Unit; 1 |
| C03 | New discriminator | Only authorized `presentationVariant='atelier-editorial'` selects new views; missing/null means current output; unsupported writes rejected | Unit + SSR; 1 |
| C04 | Opaque extensions contain theme-looking fields | Extensions preserved for compatibility but not exposed as active public selector | Unit; 1 |
| C05 | Normalize and validate v1–v4 legacy snapshots, unsupported future version | Existing normalization/support policy remains; schema v4 retained; unsupported version rejection still works | Unit; 1 |
| C06 | Authorized candidate under approved policy | Marker, DM Sans/content/controls survive effective theme; test policy fixtures do not establish product entitlement | Unit + integration; 1/5 |
| C07 | Limited/none and crafted payload | Follow approved eligibility; existing limited partial apply retains previous marker/layout, none rejects selection; raw marker cannot bypass restrictions; nine policies unchanged | Unit + integration; 1/5 |
| C08 | Downgrade published Atelier | Verify product-approved fallback/grandfathering; safe proposal omits marker only in effective copy, preserves saved snapshot/content, restores on upgrade | Unit + integration + manual; 1/5 |
| C09 | Switch each legacy theme → Atelier → same legacy preset | Identity/content/media/links/policies/SEO/payment/checkout settings survive; new scope disappears on switch-back; current expected reorder/enablement behavior recorded | Unit + browser; 2/5 |
| C10 | Exact historical appearance recovery | Undo or published revision restore restores prior full snapshot; simply reapplying a preset is not treated as exact custom-style restore | Integration + manual; 5 |
| C11 | Empty, text-only, image-only BrandStory and duplicate section types | Existing content-gate semantics preserved, including media-only story not auto-enabled by current preset gate; no lost merchant text/media/IDs | Unit + render; 2/5 |
| C12 | Draft autosave/reload/local recovery | New theme survives all; shop/version keys unchanged; no cross-tenant recovery | Existing queue tests + integration/manual; 5 |
| C13 | Two tabs save/publish concurrently | Existing 409 handling and expectedRevision remain; no silent overwrite | Integration; 5 |
| C14 | Publish with foreign product/review/media/revision references | Existing ownership validation rejects or excludes appropriately; tenant B unchanged | Integration; 5 |
| C15 | Publish and revision watcher refresh | New published ID arrives on first render; revision refresh updates current tenant only; failed caches do not expose foreign snapshot | Existing suites + browser; 5/6 |
| C16 | Revision restore / old code rollback | Compatible prior revision restored using existing flow before old binary deployment; no unknown enum persisted by old code | Integration + release rehearsal; 6 |
| C17 | Package installation/build | Backend/Admin/storefront resolve same contract/renderer version; Vite/Next resolve all existing exports including `/viewports` | Unit import checks + both builds; 1/6 |
| C18 | No changes to merchant data on selection | Applying in Builder changes draft only; does not publish, rewrite products, change cart keys or reset session | Browser + integration; 5 |
| C19 | Change homepage composition after applying Atelier | Keep presentationVariant unchanged; change standard/editorial/discovery/boutique arrangement only on home. Product/cart/checkout/account/tracking keep same family | Unit + browser; 1–4 |
| C20 | Explicit clear and legacy switch | Null clear normalizes to absence and removes stored marker; full legacy selection clears it, limited partial selection preserves protected previous marker | Contract + persistence; 1/5 |
| C21 | Missing optional field in existing stores | No default/materialized marker, no bulk writes; exact old raw/normalized/effective hashes and workflows preserved | Unit + immutable baseline; 0/1/6 |
| C22 | Catalog visibility during development | Ten definitions, old nine active; new definition uses supported hidden status. Registry can validate hidden candidate, but merchant apply/write cannot gain authority from pure resolution | Unit + API; 1/5 |

### 5.1 Default-off adoption and API rejection matrix

The guard uses current database identity, trusted tenant context and server policy. Client catalog status, preview flags, supplied plan and claimed previous theme cannot authorize a transition. For already published authorized Atelier stores, compare canonical normalized database identity (including timestamp representation); continued edits keep preset identity/version/appliedAt and marker unchanged; reapplication changes that identity or re-enters after switch-away and must pass adoption checks. The rollout switch does not silently unpublish an existing snapshot.

| ID | Request / server state | Required result before any persistence |
|---|---|---|
| A01 | Rollout missing/invalid/off, current legacy → raw marker-only draft | Reject; no draft, Shop, asset or revision mutation |
| A02 | Same state, reserved Atelier preset ID with marker omitted | Reject new adoption; provenance-only payload cannot bypass rollout |
| A03 | Direct complete publish, or old saved draft normalized/merged into Atelier | Reject when unavailable; both raw and final target inspected |
| A04 | Direct service caller or restore from legacy to an Atelier revision | Same server guard; controller-only hiding is insufficient |
| A05 | SEO draft/publish/discard/rebase with introduced/changed marker or reserved identity | Reject transition; homepage-seo exception cannot bypass identity guard |
| A06 | Client sends enable flag/preview mode/plan/current theme/another tenant ID | Ignore for authority; trusted server tenant/policy controls decision |
| A07 | Allowlist state, tenant not in exact server list | Reject, including case/whitespace/malformed ID input; no partial writes |
| A08 | Allowlisted isolated tenant plus approved test policy | May use ordinary guarded draft/publish/restore; normal auth/ownership/concurrency still enforced |
| A09 | General rollout on, but product eligibility pending or tenant ineligible | Fail closed for new adoption; no assumed full-only or all-plan grant |
| A10 | Previously authorized published Atelier, adoption turned off | No automatic rewrite/unpublish; approved unchanged-identity edits and switch-away remain safe; reapply/version replacement/re-entry blocked |
| A11 | Legacy nine theme draft/publish/restore under every rollout state | Exactly original acceptance, ownership, errors and persisted/rendered outcomes |
| A12 | Previously saved local/recovery draft crosses tenant or rollout boundary | Server re-evaluates current trusted tenant/state; no stale authorization carried by draft |
| A13 | Reject concurrent/unauthorized new adoption | Verify database state/revision/asset ownership and tenant B untouched, not merely HTTP error text |

### 5.2 Baseline immutability and assertion preservation

Before source edits, freeze all nine definition objects/versions, representative raw published snapshots, normalized/effective outputs for full/limited/none, component markup/computed styles and route images. Record stable fixture IDs, time/fonts/viewport and source revision. Capture known workflow responses/callback contracts as well as screenshots.

Keep old nine assertions intact against that subset; append new-variant cases. The only justified aggregate count change is ten total catalog entries, with **nine active merchant-visible entries while Atelier is hidden**. Do not alter the old expected definitions/versions or refresh baseline artifacts to hide an implementation change. Any legacy visual, configuration or workflow regression blocks release of the new theme.


## 6. New theme route and action matrix

Every row requires desktop and mobile presentation coverage. “Mock” means an isolated fake provider/transport; it is not live delivery verification.

| ID / route | Actions and required states | Acceptance evidence | Reusable test layer |
|---|---|---|---|
| R01 `/` | Shop load, long name/logo fallback, badges, menu/children/More, search/account/cart/track | Dynamic identity, actual safe links; all utilities reachable, no sample name/02 count | Shared render + browser |
| R02 `/` hero | 0/1/5 slides, missing image/title/mobile image, long heading/body, both CTA pairs, dots/arrows/pause | Existing slide/content behavior; no hardcoded sample wrap or unrelated product art | Hero/contract + visual/browser |
| R03 `/` sections | All 13 registered types, disabled/mobile-only/desktop-only, missing products/categories/reviews/story/text, reordered and duplicate types | Each eligible section once; no blank companion hole; no invented newsletter form/BrandShowcase image behavior | Composition/renderer + visual |
| R04 `/` catalog | Search, seven sort options, category buttons, min/max/Apply, stock/rating/Clear/chips, numbered/prev/next paging | Exact API/filter callback values retained; no-products/loading/reset; disabled all-products respected | Controls + browser/API mock |
| R05 shell search | Open/close, empty query, popular four, local result/no-match, fetch error | Same at-most-12 snapshot scope, no fictional full-search result page; typed query safely rendered | Component/browser |
| R06 campaigns | Scheduled-product unavailable/public link, active popup CTA/countdown/Escape/dismiss/frequency | Existing plan/time/frequency/publication checks; optional absence collapses | Unit + controlled clock/browser |
| R07 `/products/{id}` | Canonical redirect/404/loading/error; gallery and fallback; long title/description collapse | Same product eligibility/metadata and real media; matching new view at reference width | Unit/render + browser |
| R08 product variants | Default/single/multiple, unavailable combinations, image/SKU/barcode, price override/zero price, stock 0/1/many, quantity min/max | Same product+variant IDs, displayed derivation and local actions; unavailable purchase disabled | Product-data tests + callbacks/browser |
| R09 product cart/buy | Add and Buy Now from detail/card, variant modal selection/close/loading/no-options | Actual existing callbacks and checkout navigation, no skipped option choice or extra cart write | Component/browser + API mock |
| R10 product information/reviews | Highlights/specs/guide populated/empty; review list/empty, signed-out login link, signed-in rating/comment submit | All original content/controls; rating/comment checks, failures and success; verify existing tenant-host login link | Render + component/browser |
| R11 `/categories/{slug}` | Cover/name/count, price, availability, sale, rating, sort, chips/Clear, mobile filter close, pagination, empty/404 | Same URL query keys/values; conditional rating controls; product actions/new card coherent | Query/callback + browser |
| R12 `/collections/{slug}` | Cover/description/count, actual sort options, prev/next, empty/404, product actions | Existing supported control set only; no inactive category-like filter form | Callback + browser |
| R13 `/cart` | Empty/filled, variant chips/SKU/description, quantities/stock limit/remove, subtotal/shipping/savings/total | Tenant local state unchanged; no sample values or lost item fields | Render + browser |
| R14 `/cart` promo/recommendation | Blank/pending saved code; rec loading/none/failure/add/buy/variant; checkout/continue/mobile | Coupon says saved until checkout validation; failed recs omitted; real destinations | Callbacks + browser |
| R15 `/checkout` fields | All five required inputs, both Dhaka zones, COD, long address, form invalid/error | Current field names/types/required and server payload remain | Shared component + integration/browser |
| R16 checkout totals/coupon | Valid/invalid/pending code, quantity/remove, client tampered total, stock/price changed | Server recomputes authoritative price/shipping/inventory; discount/zero-price semantics preserved | Existing order safety integration |
| R17 checkout consent | Required policy acceptance, optional marketing opt-in, policy disclosures | Separate choices, no prechecked marketing; consent data/idempotency unchanged | Component + integration |
| R18 checkout OTP | Send/cancel/error, six digits, invalid/expired, resend abuse response, verify/busy/order error | Same anti-abuse rules and token binding; cannot create order without required verification; no second inline OTP workflow | Mock provider + isolated integration/browser |
| R19 guest/auth order submit | Double click, network retry, timeout, accepted response and missing/failed response | Existing idempotency, correct endpoint; cart clears only after success; confirmation uses real returned ID | Existing order integration + browser |
| R20 checkout result/mobile | Success ID/instruction/return, empty state, mobile sticky submit, keyboard open, busy disable | No demo submit/disclaimer in live UI, overlap-free actions, order feedback visible | Render/browser |
| R21 `/account` sign in/register | Valid/invalid/loading; name/email/password; send/resend cooldown; registration OTP; switch toggle | Current auth endpoints/session/audience/tenant context; identity fields lock at correct OTP stage | Auth integration + browser |
| R22 account reset/security | Three reset stages, OTP paste/backspace, cooldown/expired, strength/mismatch, authenticated password change | Same security checks; real SecurityTab handler retained; no duplicate reset service | Auth mocks/integration + browser |
| R23 account dashboard | Own orders empty/populated/expand/product links, profile display, security tab, logout, vendor portal | Own customer data only; read-only profile remains; vendor branch preserved | RBAC integration + browser |
| R24 `/track` lookup | Missing/wrong ID/phone, send/verify, invalid/expired token, edit ID/phone | No order body before verification; state reset when identity changes; no demo status or ETA | Order access integration + browser |
| R25 track verified details | Pending/confirmed/shipped/delivered/cancelled, payment, address, SKU/items/amounts, courier, timeline | Exact backend values/statuses; optional fields absent cleanly; no inferred tracking event | Shared render + integration/browser |
| R26 track cancel/return | Eligibility, reasons/notes, selected items, required details, 1–3 proof images, optional video, remove files, pending/error/success | Same access token and multipart payload, server eligibility and upload rules; no omitted controls | Existing order safety + focused callback/integration/browser |
| R27 `/policies` | Four contents links, all four full texts, long merchant content, defaults, Open page/back | No sample text replacing real policy; escaped content and valid anchors | Shared render + browser |
| R28 `/policies/{type}` | Four supported types, unknown type, long text and fallback | Current default/content/404/metadata and new presentation | Unit/render + browser |
| R29 shared error/loading | Tenant root/product/checkout loading, unavailable, empty states, toast/consent/modal | New styling where theme known; neutral fallback where unknown; no borrowed tenant data | SSR/render + browser |
| R30 platform/SEO | Platform `/`, legal/login redirect, tenant robots/sitemap/API proxy | Existing platform appearance/response behavior unchanged; no Atelier marker outside opted-in tenant | Source/import + browser/request checks |

## 7. Preview, editor and live parity matrix

| ID | Scenario | Required acceptance |
|---|---|---|
| P01 | Gallery thumbnail/full preview versus Builder/live home | Same resolved input generates same scoped view; real gallery thumbnail, not a static concept screenshot |
| P02 | Product/cart/checkout/policy preview | Same shared presentation; current no-op adapters remain blocked; inputs/state can be previewed without a live order/session |
| P03 | Optional Phase O: category/collection/account/tracking preview choices | Only if approved, choices added through actual `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/hooks/usePreviewMode.js`; same pure views as live |
| P04 | Optional Phase O private preview states | If approved, local labeled fake account/order fixtures only; never query customer/order endpoint or show another tenant's records |
| P05 | Preview action safety | All links/submits, OTP, reviews, file workflows and marketing controls are local/no-op; network assertions prove no external effects |
| P06 | Font/styles in iframe | Shared local font/style assets load; computed metrics/colors match live after fonts ready; no Admin typography/focus rule leak |
| P07 | Viewport and scaling | Existing Builder desktop 1180, tablet 768, mobile 390 and smallMobile 320 remain stable. Additional 1440 design reference capture does not redefine existing constants |
| P08 | Editor controls | New theme obeys media/text/links/colors/font/visibility controls; unavailable geometry choices clearly theme-controlled; legacy choices remain intact |
| P09 | Candidate versus published snapshot | Draft editing never changes live; publish/reload/revision watcher changes live only to committed snapshot |
| P10 | Switch-back | Scope, font, tokens, component branches and capability metadata return to legacy after applying/restoring legacy theme; no stale context/portal survives |

## 8. Responsive, visual and accessibility checks

| Area | Automated or manual steps | Acceptance |
|---|---|---|
| Reference matching | Compare Atelier home at 1440 and 390 to inspected nodes 2:2/2:3; compare supporting desktop frames at 1440 | Typography hierarchy, geometry, media roles, rules/buttons/surfaces match approved direction; allowed functional differences documented |
| Intermediate/narrow widths | Inspect 320/360/390/430/768/1024/1440, 100% and 200% zoom | No horizontal overflow, lost essential controls or fixed-width sample dependencies |
| Content extremes | Long Bengali/Latin shop/title/category/variant/address/policy, missing and failed media, 0/1/many products | Natural wrapping and content growth; no hidden essential text or fake content |
| Keyboard | Tab through header/nav/dropdowns/forms/tabs; open/close all modals with Escape and restore focus | Named controls, logical order, visible focus, no lost focus behind overlay; iframe document behavior verified |
| Labels/semantics | Inspect inputs, selects, OTP, buttons, icons, headings and tabs/disclosures | Real controls with names/labels/states; no text-only “button” from Figma |
| Contrast | Measure text/control/focus pairs including configured brand colors | Small text target 4.5:1, large text 3:1; adjust observed low-contrast muted/violet labels before release |
| Touch | Check targets and spacing with narrow viewport | At least 44 × 44 target for interactive icon/control; destructive actions distinct and reachable |
| Motion | Reduced-motion enabled; hero focus/hover and timers | Explicit navigation still works, no mandatory animated ticker, no disruptive transitions around OTP/checkout |
| Mobile bars/keyboard | Cart/checkout/product actions, footer bottom nav, consent and OTP open together | No covered submit, amount or code input; safe-area treatment retained |
| Color-independent state | Selected variants, errors, stock/status, filters | Labels and state cues beyond color; no unexplained swatch values |
| Legacy visual isolation | Compare all nine screenshots/computed styles before/after identical fixture | No intended appearance changes; investigate diffs before approval |
| Assets/fonts | Inspect local assets, font-ready metrics and merchant media failures | Local licensed DM Sans; no temporary Figma URL or whole-screen image in implementation; sample product art not used as live product |

Figma contains no inner-page mobile screens or detailed error/OTP specs. These acceptance checks validate the proposed responsive/state behavior against current functional contracts; they do not imply those states were designed in Figma.

## 9. Practical command sequence for implementation

These commands are **planned**, not executed by this task. Use the current workspace dependencies. First confirm package symlinks/copies resolve the edited shared packages in all hosts. No dependency installation is requested here.

Focused existing tests from backend (PowerShell):

```powershell
Set-Location -LiteralPath 'C:\Users\user\WebstormProjects\Shop-for-all\ecommerce-backend\backend'
node --test tests/store-builder-prebuilt-themes.test.js tests/storefront-composition.test.js tests/storefront-structural-variants.test.js tests/storefront-effective-theme.test.js tests/storefront-capabilities.test.js tests/storefront-theme-merge.test.js tests/storefront-theme-controls.test.js tests/storefront-control-wiring.test.js tests/storefront-color-aliases.test.js tests/storefront-card-inheritance.test.js tests/storefront-hero-contract.test.js tests/storefront-preview-data.test.js tests/storefront-presentation.test.js tests/storefront-preview-parity.test.js tests/storefront-first-render.test.js tests/storefront-state-delivery.test.js tests/store-builder-contract.test.js tests/store-builder-navigation-seo.test.js tests/store-builder-color-product-edit-images.test.js
```

After mandatory new tests exist, run their explicit paths, followed by the full existing backend unit gate (optional extra-preview parity tests are added only in Phase O):

```powershell
node --test tests/storefront-atelier-contract.test.js tests/storefront-atelier-presentation.test.js
npm test
```

For integration, prepare the repository's disposable Mongo replica set using its existing Docker setup after confirming Docker availability. Use a dedicated temporary shell and the local disposable database only:

```powershell
npm run test:mongo:up
$env:MONGO_URI_TEST = 'mongodb://127.0.0.1:27018/shop_for_all_launch_test?directConnection=true&replicaSet=rs0'
node --test --test-concurrency=1 tests/integration/store-builder-safety.integration.test.js tests/integration/checkout-order-safety.integration.test.js tests/integration/tenant-isolation.integration.test.js tests/integration/auth-rbac-privacy.integration.test.js
```

Before running integration, verify transports are mocked and inspect harness startup for `.env`/worker behavior. If Mongo/Docker is unavailable, mark these rows Blocked and continue source/component checks; release acceptance remains incomplete. If the optional new publish integration file is created, include it explicitly. Stop the dedicated test stack using its existing script when finished; do not stop unrelated Mongo services.

Both frontend gates:

```powershell
Set-Location -LiteralPath 'C:\Users\user\WebstormProjects\Shop-for-all\ecommerce-admin'
npm run lint
npm run build
Set-Location -LiteralPath 'C:\Users\user\WebstormProjects\Shop-for-all\ecommerce-storefront'
npm run lint
npm run build
Set-Location -LiteralPath 'C:\Users\user\WebstormProjects\Shop-for-all'
git diff --check
```

Then open the existing local fixture pages from the Admin dev server and the tenant test storefront for interaction/screenshot checks. Use the actually reported local port; do not assume an old fixture URL is still live. Record the actual browser/test tool used; there is no existing package script here that can be described as a verified visual-regression runner.

## 10. Manual workflow rehearsal

1. Freeze old-nine definition/configuration/render/workflow baselines before shared changes. In an explicitly allowlisted disposable tenant with a recorded test eligibility policy, verify unavailable/available selection and existing five preview modes at desktop/mobile; optional extra modes are tested only if separately approved.
2. Apply Atelier to draft, edit real merchant media/copy/color, test local undo and autosave/reload. Confirm published storefront is unchanged before publish.
3. Publish only in the isolated test environment; verify same tenant revision and all route visuals/actions. Use mocked OTP/order transports for interactive purchase/account/tracking flows.
4. Open tenant B alongside A; compare cart/customer/product/order/preview storage boundaries. Attempt only controlled harness requests, not production abuse.
5. Reapply a legacy preset and verify content preserved, new scope absent and old presentation selected. Restore the initial published revision to recover its exact earlier customized appearance.
6. Rehearse product-approved downgrade/upgrade behavior using disposable records. Confirm off/unallowlisted/ineligible direct marker/preset-ID draft/publish/restore/SEO requests fail without mutations, while authorized identity-preserving edits/switch-away remain safe.
7. Repeat representative legacy workflows and image comparison across the nine presets; review every unexplained difference.

## 11. Release gates and rollback

| Gate | Required evidence for the mandatory release |
|---|---|
| Legacy preservation | All nine definitions/versions/raw published data remain unchanged; normalized/effective/render/style/commerce comparisons pass against pre-edit baselines; original assertions retained |
| Identity | Optional marker round-trip/absence/clear; composition edits cannot switch family; no identity inference from preset provenance or extensions |
| Server rollout | A01–A13 pass; supported hidden catalog status; guessed preset/marker/direct publish/restore/SEO cannot introduce unavailable Atelier |
| Eligibility | Product-approved full/limited/none and downgrade/grandfathering policy recorded and tested; no unapproved full-only/all-tier assumption |
| Live routes | R01–R30 covered; existing controls/state/API/pricing/stock/auth/OTP/order-access/consent/idempotency preserved |
| Essential Builder | Current five modes/thumbnail/availability/controls/save/undo/publish/restore parity; no side effects. Extra page-preview modes are optional Phase O |
| Visual/accessibility | Inspected reference anchors, responsive/focus/contrast/touch/reduced-motion checks; no legacy diff concealed by updating baselines |
| Operational | Compatible backend/Admin/storefront readers/writers; no bulk theme migration or automatic merchant publish; tested switch-away/restore |

Deploy the optional contract and authoritative guard **before exposing adoption**, with rollout off and hidden catalog entry. Develop/test in isolated fixtures; allowlist explicit pilot tenants only after core gates. General availability requires approved eligibility/downgrade/pilot decisions, then coordinated trusted server availability and gallery exposure.

Turning adoption off blocks new entry/reapplication but does not withdraw already committed rendering. Continue authorized identity-preserving edits or restore an authorized compatible prior snapshot through normal flow. Before old-code rollback, restore compatible legacy snapshots for affected authorized stores; do not mass-rewrite merchants or treat a renderer fallback as a stored migration.

Optional extra preview modes do not block the core release, and their tests do not substitute for live route verification.

## 12. Current verification record

| Activity in this planning task | Result |
|---|---|
| Read two existing storefront reports and verify focused source decisions | Completed |
| Inspect all nine Figma frames through metadata, design context and screenshots | Completed |
| Check Figma variable definitions for desktop home | Returned an empty variable map; no token library assumed |
| Calculate contrast from returned colors | Completed; two small-text color pairs need adjustment in implementation specification |
| Application source/theme implementation | Not performed |
| Backend tests / isolated Mongo integration | Not run |
| Admin/storefront lint and build | Not run |
| Interactive browser / visual regression / live notifications | Not run |
| Planning Markdown file/path/format checks | Performed at document completion; no functional pass inferred |

The exact first implementation task is Phase 0: freeze all nine definition/configuration/render/workflow baselines and run focused existing tests before any shared source change. Product eligibility/downgrade/pilot decisions are required before adoption, not before safe isolated baseline work. Revised core estimate: 12–18 engineer-days; optional additional preview modes: 4–7 more days. No source implementation, migrations, dependency installs or merchant publication is performed by this refinement.
