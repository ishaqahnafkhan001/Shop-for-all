# Atelier Editorial — tenth storefront theme implementation plan

**Status:** planning only, 20 October 2026. Application source, presets, merchant data and production settings have not been changed. This plan is based on the current repository, the two storefront reports and direct inspection of all nine Figma frames. Proposed filenames below do not exist yet unless marked existing. No application test, browser regression run or live transaction was executed during this planning task.

Repository: `C:/Users/user/WebstormProjects/Shop-for-all`. Functional baseline: [raw storefront inventory](C:/Users/user/WebstormProjects/Shop-for-all/STOREFRONT_RAW_STRUCTURE_AND_FUNCTIONAL_INVENTORY.md), especially Parts 10A–10C. Architectural context: [core anatomy audit](C:/Users/user/WebstormProjects/Shop-for-all/STOREFRONT_CORE_ANATOMY_AUDIT.md). Companion deliverables: [component mapping](C:/Users/user/WebstormProjects/Shop-for-all/NEW_THEME_COMPONENT_MAPPING.md) and [regression matrix](C:/Users/user/WebstormProjects/Shop-for-all/NEW_THEME_REGRESSION_MATRIX.md).

## 1. Executive summary

Add **Atelier Editorial** as one opt-in presentation variant in the existing storefront. Persist its identity in one optional validated scalar, `theme.presentationVariant = 'atelier-editorial'`. Missing/null uses current rendering. Homepage composition remains homepage arrangement; editing it must not switch product, cart, checkout, account or tracking identity.

Use exact-scope styling first, small additive theme-gated branches second, and existing commerce primitives throughout. Preserve the stateful account, tracking, cart and checkout implementations in place. Extract a view only for an indispensable approved visual region, not to enable extra preview choices.

Eligibility is **not decided**. Current policy permits full structural customization, limited appearance changes while protected structure is retained, and no preset selection for Builder access `none`. A default-off server adoption guard must reject unauthorized Atelier draft/publication transitions, including complete direct API payloads. Do not silently impose a new tier restriction or bypass current structure restrictions.

Revised estimate: **12–18 engineer-days for the mandatory release**, assuming an experienced engineer, available licensed font, usable baseline/test infrastructure, no commerce changes and no broad extraction. Optional category/collection/account/tracking Builder previews add **4–7 days** under separate approval. Baseline failures, policy changes and unexpected markup constraints can extend this estimate.

## 2. Approved Figma reference and evidence

[FORM & FOUND — The Everyday Edit](https://www.figma.com/design/sZlr7zuW8dDLDQ0ESGXSf5) is the approved visual concept. **FORM & FOUND is sample merchant content**, not the theme name. Figma metadata, design context and returned screenshots were inspected for every frame:

| Frame | Node / direct reference | Measured canvas |
|---|---|---|
| Editorial homepage, desktop | [2:2](https://www.figma.com/design/sZlr7zuW8dDLDQ0ESGXSf5?node-id=2-2) | 1440 × 2960 |
| Editorial homepage, mobile | [2:3](https://www.figma.com/design/sZlr7zuW8dDLDQ0ESGXSf5?node-id=2-3) | 390 × 2460 |
| Product detail | [2:4](https://www.figma.com/design/sZlr7zuW8dDLDQ0ESGXSf5?node-id=2-4) | 1440 × 1500 |
| Category / collection | [2:5](https://www.figma.com/design/sZlr7zuW8dDLDQ0ESGXSf5?node-id=2-5) | 1440 × 1310 |
| Shopping bag | [2:6](https://www.figma.com/design/sZlr7zuW8dDLDQ0ESGXSf5?node-id=2-6) | 1440 × 1120 |
| Checkout, COD | [2:7](https://www.figma.com/design/sZlr7zuW8dDLDQ0ESGXSf5?node-id=2-7) | 1440 × 1370 |
| Customer account | [2:8](https://www.figma.com/design/sZlr7zuW8dDLDQ0ESGXSf5?node-id=2-8) | 1440 × 1150 |
| Order tracking | [2:9](https://www.figma.com/design/sZlr7zuW8dDLDQ0ESGXSf5?node-id=2-9) | 1440 × 1120 |
| Policies | [2:10](https://www.figma.com/design/sZlr7zuW8dDLDQ0ESGXSf5?node-id=2-10) | 1440 × 930 |

Observed identity: warm paper surfaces, dark green-black text, large DM Sans headings, violet section labels, lime secondary actions, fine rules, restrained corners and product imagery presented in large colored fields. Desktop home pairs a large statement with a campaign image; mobile stacks statement, action and image, then uses two-column category/product groups. Supporting screens carry the same typography, rules, pale background and white form/summary surfaces.

The design context is predominantly positioned text and shape layers. It is not executable commerce code. No Figma variable definitions were returned for the desktop homepage. Only the homepage has an explicit mobile mockup; breakpoints, hover/focus/error/OTP states and most inner-page mobile layouts are **implementation proposals**, not measured Figma specifications. Refresh node context at implementation time if the design changes; temporary Figma asset URLs are not persistent production assets.

### 2.1 Measured values versus proposed implementation tokens

| Concern | Observed Figma evidence | Proposed implementation rule |
|---|---|---|
| Paper / surface | `#f6f4ed`, `#f7f5ee`, white | Map to existing background/surface tokens; no global body override |
| Ink / rule | `#202721`, `#dadbd1` | Existing foreground/border groups, applied inside the new presentation scope |
| Accent / highlight | `#606cf0`, `#dbec8b` | Configurable brand accent and secondary-action surface; small text needs contrast-safe derivative |
| Image fields | `#cfd6bc`, `#dfdaf5`, `#e8c5a6`, `#d5e9de`; illustration terracotta `#d97956` | Fixed supporting personality tokens, with merchant images replacing sample product illustrations |
| Muted text | `#7c807a` | Derive a darker readable text token; measured ratio against `#f7f5ee` is approximately 3.68:1 |
| Accent text | `#606cf0` on paper | Approximately 3.93:1 against `#f7f5ee`; darken small labels to meet the 4.5:1 acceptance target |
| Font | DM Sans regular/medium/bold/extra-bold | Local licensed font, shared by preview/live. Existing allowlist currently excludes DM Sans |
| Hero title | Desktop 93 px at node 3:12; mobile 54 px at 4:9 | Fluid scale bounded around these reference sizes; wrap naturally, no hardcoded sample line breaks |
| Other headings | Home 49/53/64 px; supporting pages 57–75 px | Proposed display/page/section roles rather than one arbitrary size per element |
| Body / utility copy | Body commonly 16–22 px; labels commonly 11–14 px | Minimum practical input/body sizes; small utility labels remain legible and do not carry essential instructions alone |
| Desktop container | Home starts around x=84 with 1272 px rule at 1440 width | Proposed maximum content width 1272 px with fluid gutters; do not copy absolute x/y coordinates |
| Mobile gutter | 18 px at width 390; image field 354 × 420 | Proposed 18 px reference gutter, fluid from narrow phones; preserve media ratio, not fixed height |
| Cards | Home desktop image 298 × 321; mobile product image 172 × 194; category image 298 × 250 | Responsive image slots; honor merchant image-fit/alt/fallback controls and valid aspect-ratio options |
| Buttons / fields | CTAs approximately 54–55 px high, 4 px corners; checkout inputs 62 px at desktop, summary corners 5–6 px | Minimum touch target 44 × 44; height grows with content; restrained radius scale 0/3/4/6 px |
| Spacing | No reusable spacing variable collection returned | Proposed scale 4, 8, 12, 16, 24, 32, 48, 64, 80, 96 px; retain configurable section spacing where supported |

Contrast ratios above were calculated from the returned colors during planning. They are not results from a rendered accessibility audit. Contrast-safe derivatives are acceptance adjustments to the reference; choose exact values in Phase 0.

### 2.2 Fixed personality and merchant-owned values

Fixed theme personality consists of type hierarchy, rules, restrained surfaces/corners, image-field treatment, editorial sequencing and responsive behavior. Merchants retain existing supported controls for brand colors, font choice, logo/favicon, hero slides/media/copy/CTAs, navigation, section content/visibility/order, footer/contact/social, policies, SEO and checkout branding. Where a structural selector cannot meaningfully vary within this composition, its capability must say theme-controlled; do not leave an apparently working control that the new renderer ignores.

Sample products, prices, category names, shipping promises, dates, customer records, order statuses, marketing claims and sample store name must never be preset defaults. Merchant text remains escaped text. Decorative generic orbit geometry may be theme-owned; sample lamps/speakers/bags/vases represent catalog content and must be replaced by merchant media.

## 3. Actual repository architecture

| Integration point | Verified behavior and source |
|---|---|
| Theme contract | Schema version 4; normalization/validation, nested tokens and section registry in [index.cjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/index.cjs:6). Composition identity and section partitioning are in [composition.cjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/composition.cjs:5) |
| Preset application | Nine definitions; gallery applies `resolvePrebuiltTheme`, which produces a complete candidate and preserves merchant content. [prebuilt.cjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/prebuilt.cjs:280), [applyPresentation](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/prebuilt.cjs:617) |
| Effective/public theme | Plan and branding resolution; public result explicitly deletes `extensions`. [effective.cjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/effective.cjs:130). Rendering identity must not be stored only in compatibility extensions |
| Published storage | `Shop.theme.layout.homepageComposition` enum derives from the shared registry; draft/revision theme fields are Mixed snapshots. [Shop.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/Shop.js:439), [StoreBuilderDraft.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/StoreBuilderDraft.js:11), [StoreBuilderRevision.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/StoreBuilderRevision.js:11) |
| Live storefront | Tenant layout provides the published effective snapshot. Live adapters own fetching, cart/auth/OTP/order behavior. [layout.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/layout.jsx:15), [StorefrontThemeProvider.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/components/storefront/StorefrontThemeProvider.jsx:15) |
| Shared rendering | Header/home/sections/cards/footer and product/cart/checkout/policy presentation live in the renderer package. [index.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/index.jsx), [Runtime.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/Runtime.jsx:1) |
| Builder preview | Same home renderer and shared product/cart/checkout/policy views. Preview state is non-live and blocks navigation/submission. Only five page choices currently exist; category/collection/account/tracking previews are not implemented. [StorefrontPreview.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx:125), [PreviewCommercePages.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/PreviewCommercePages.jsx:16) |
| Publishing | Normalization, plan checks, asset ownership, optimistic revision checks and revision creation precede published theme replacement; 20 revisions retained. Restore reuses publication. [storeBuilderService.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/storeBuilderService.js:85), [publish](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/storeBuilderService.js:333), [restore](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/storeBuilderService.js:569) |
| Autosave | Existing queue carries shop/version concurrency tokens, local recovery and 1400 ms debounce. [useAutosaveRecovery.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/hooks/useAutosaveRecovery.js:15) |

```text
Apply new preset to draft
  -> existing normalize + validate + plan capability rules
  -> default-off server transition guard + existing draft/publish/revision service
  -> Shop.theme with optional presentationVariant = atelier-editorial
  -> existing effective-theme resolver
  -> shared presentation selector and scope
  -> existing data/controller hooks + isolated view branches
  -> identical view code in preview and live storefront
```

## 4. Persistent identity and isolation decision

### 4.1 Evaluation of the previous discriminator

Currently `layout.homepageComposition` is marked theme-controlled and ordinary Builder UI does not expose a free composition selector. Full-access server validation nevertheless accepts supported layout changes. Preset application, revision restore, supported API changes, imports or a future editor can change it. See [capabilities.cjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/capabilities.cjs:19) and [write validation](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/capabilities.cjs:124).

If this field selected the entire Atelier family, changing the homepage composition to `standard` or `editorial` would also remove Atelier from every supporting page. Conversely, a composition-only change could activate a whole new storefront skin. **Reject that coupling.**

Existing `preset.id/version` is provenance, not sufficient presentation authority: the limited-plan resolver currently changes preset metadata while retaining protected layout/header/hero/sections. A renderer selected solely by preset ID could bypass that partial-application policy. See [applyPresentation](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/prebuilt.cjs:617) and [applyLimitedPlanBoundary](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/prebuilt.cjs:653). Opaque `extensions` is also unsuitable because public resolution removes it. No runtime catalog lookup is proposed.

### 4.2 Smallest safe additive contract

| Item | Recommendation |
|---|---|
| Catalog identity | `atelier-editorial`, Atelier Editorial, preset version 1; old nine definitions/versions unchanged |
| Persisted identity | One optional scalar `theme.presentationVariant`, accepted new value `atelier-editorial`; absence/null means current rendering |
| Homepage geometry | Reuse `standard` initially; asymmetry is inside the Atelier hero. No new composition enum required just to identify a skin |
| Selector | Pure `getStorefrontPresentationVariant(theme)` reads the validated field; old nine snapshots without it select `default` |
| Scoped root | `data-sf-presentation="atelier-editorial"` on the current root in live and preview |
| Theme source | Existing resolved published/candidate snapshot; no extra fetch, resolver, theme store or catalog-default merge |

Add the optional field to the current allowlist/sanitizer/normalizer/validator and Shop theme schema. No materialized default: legacy normalized/serialized output must omit it when absent. Full authorized Atelier selection sets it. Full legacy preset selection explicitly removes it. A supported null clear normalizes to absence and must actually clear persistence, not retain a previous value through deep merge. A limited appearance-only selection preserves the previous marker together with protected geometry.

Keep schema version 4 for this optional additive field, with no backfill or bulk writes. Reject unknown nonempty variants on writes; defensively use current rendering for unsupported reads. Deploy compatible readers/writers together and restore a compatible prior revision before downgrading to code that does not understand the field.

Merchant edits to homepage composition, order, colors or typography leave the marker intact. Applying/restoring a theme changes it deliberately under plan/adoption validation. Test a supported `standard → editorial` homepage change with the same Atelier marker: only homepage arrangement changes, and all supporting routes retain their identity. Catalog updates must not auto-reapply to published snapshots; a future incompatible presentation is an explicit version/variant decision.

### 4.3 Minimum rendering changes

Keep the current provider, root and resolved snapshot. Add the exact marker and use current props/context first. A small shared read-only scope helper is permitted only where an existing shared view needs propagation; it has no normalization, fetching or persistence and should not add a new DOM wrapper unnecessarily.

Scope semantic classes precisely; no global body/root/font rules or broad Tailwind utility overrides. Header/hero/card/footer may gain stateless Atelier-only markup where structure materially differs, supplied by the existing model and callbacks. Keep old branches as the default and preserve hook ordering. Account/tracking/cart/checkout stay in place with scoped hooks and small justified branches, not broad presentation extraction.

## 5. Plan policy, contract changes and server-controlled rollout

### 5.1 Current policy and explicit product decision

Verified sources: [prebuilt.cjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/prebuilt.cjs:669), [capabilities.cjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/capabilities.cjs:124), [effective.cjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/effective.cjs:4).

| Access | Current behavior | Atelier choice requiring product approval |
|---|---|---|
| `full` | Presets can replace structure and appearance, subject to validation/ownership | Which plans receive complete Atelier? |
| `limited` | Allowed appearance applies; current header/hero variants, layout, sections and migrations remain; direct protected-structure changes rejected | Offer existing appearance-only adaptation, explicitly permit complete Atelier as an entitlement, or restrict selection? |
| `none` | Preset resolver rejects selection; public theme uses existing fallback/branding/policies | No change proposed |

No confirmed Atelier-specific product requirement establishes full-plan-only eligibility. **Do not implement an assumed tier rule.** Until product approval, merchant adoption remains off. Trusted isolated tests can exercise each proposed policy.

Recommended product proposal: follow the existing boundary. Full access can receive complete Atelier; limited access, if offered the preset, receives current appearance-only adaptation and **retains its previous presentationVariant**. Label the partial result accurately. If complete Atelier is offered to limited plans, authorize a narrow preset entitlement explicitly while keeping arbitrary structural editing restrictions. Protect the marker on the server; setting it must not be a metadata-only bypass.

For a published Atelier store losing approved entitlement, the safe proposed behavior is a non-destructive effective legacy fallback under current plan rules: omit the marker in the effective copy, preserve merchant identity/content and the stored snapshot for upgrade. Product must approve downgrade/grandfathering semantics. Existing nine full/limited/none outputs remain unchanged.

### 5.2 Contract changes

- Add optional `presentationVariant`/selector/CJS–ESM exports in [index.cjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/index.cjs) and [index.mjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/index.mjs); add the optional enum without a default in [Shop.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/Shop.js:348). Test absence, null-clear, invalid values and full persistence round trip.
- Append Atelier with the existing supported `status: 'hidden'` in [prebuilt.cjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/prebuilt.cjs:280). Complete authorized selection sets the marker; applying any old preset removes a previous marker without editing old definitions; limited partial application preserves it. Keep existing content gates.
- Use existing `standard` composition and section types: optional PromoBlock, CategoryList, FeaturedProducts, optional BrandStory/TrustBadges. Preserve unmatched merchant sections and all-products enablement.
- Add DM Sans/local licensed font with current defaults unchanged. New-variant capability metadata locks only controls the new structure cannot honor; supported copy/media/colors/links/visibility remain functional.
- Protect `presentationVariant` as a structural identity at raw-patch and complete-snapshot checks. Existing command-only metadata is not itself a server write authorization check. Any broader plan permission requires the explicit product decision above.
- Keep extensions opaque and out of public rendering. No new root theme object, route app, commerce API, migration or generic theme framework.
- Update the existing preset validator deliberately: its current `SUPPORTED_FONTS` is separate from the theme font allowlist, `SUPPORTED_PRESENTATION_KEYS` must accept the new scalar, and `validatePrebuiltThemeRegistry` hardcodes nine entries. Preserve the original nine subset/assertions; validate ten total definitions and nine merchant-visible active entries while Atelier is hidden. Hidden definitions must remain fully contract-validatable without bypassing server write enforcement. See [prebuilt.cjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/prebuilt.cjs:13) and [registry validation](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/prebuilt.cjs:709).

### 5.3 Rollout that cannot be bypassed through API payloads

The gallery filter alone is not a protection: `getPrebuiltThemes()` excludes inactive entries, but `getPrebuiltTheme(id)` still looks them up, and `resolvePrebuiltTheme()` currently checks existence/access rather than status. Clients send complete theme snapshots; there is no dedicated preset-application endpoint to secure alone.

Plan one small backend `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/themeAvailabilityService.js` guard (new), reused by current write services. Proposed server-owned settings: `ATELIER_EDITORIAL_ROLLOUT=off|allowlist|on` (default off), plus optional `ATELIER_EDITORIAL_TEST_SHOP_IDS` for isolated test IDs. Missing/invalid rollout or unresolved eligibility fails closed for new adoption. These are proposed settings only, not added environment configuration.

| State | Allowed transitions |
|---|---|
| off | Reject introduction of Atelier marker **or reserved preset ID** into a draft/published theme, including guessed IDs, marker-only patches, saved drafts, direct service/API payloads and revision restore |
| allowlist | Permit only exact server-configured isolated test tenant IDs, still subject to auth, approved test policy, ownership and normal plan validation |
| on | Permit only product-approved eligible tenants/plans; client flags cannot grant eligibility |

This is an **adoption gate**, not an automatic rendering kill switch. Turning it off after rollout does not rewrite or unpublish committed snapshots. Already published Atelier identity may continue unchanged-identity edits under its approved current entitlement; switching away remains allowed through normal validation. Entering Atelier, reapplying/replacing its preset identity/version, or restoring it after switching away is adoption and must pass the gate. Current published identity is read from the database, never supplied by the caller. Compare canonical normalized ID/version/appliedAt values so a Date-versus-ISO serialization change does not look like reapplication. During development an unallowlisted merchant cannot obtain that published identity through these APIs.

Guard raw reserved identities and the **merged normalized target** before draft/Shop/asset/revision writes. Use trusted tenant/auth context for shop ID and server-derived plan/allowlist state. Do not accept request-supplied preview mode, previous-theme claim, plan object or rollout switch. Existing source snapshots/unknown extension fields must not become alternate activation mechanisms.

Required integration points:

1. `saveStoreBuilderDraft` before persistence, including old drafts resubmitted after rollout state changes.
2. `publishStoreBuilder` before publication, including complete snapshots, direct service callers and restore. The `changeScope === 'homepage-seo'` exception must never skip identity/adoption validation.
3. `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/storeBuilderSeoService.js`, which normalizes/writes a full theme for SEO draft operations. Preserve existing authorized identity; never introduce/change it through SEO save/publish/discard/rebase.
4. Existing Builder bootstrap returns trusted availability metadata; gallery/resolver UX reflects it. The client apply command rejects unavailable selection, but the server remains authoritative. Keep pure preset resolution deterministic for registry validation and offline fixtures; constructing a hidden candidate is not permission to persist it.

No new publication endpoint or general feature-flag platform. Keep checks narrow to this reserved theme so the nine existing presets' acceptance behavior is unchanged. Rejection must leave drafts, published revision, assets and other tenants untouched.

### 5.4 Product approvals still required

Before enabling merchant adoption: complete-versus-appearance-only plan eligibility, downgrade/grandfathering, pilot tenant IDs and rollout authority. Additional preview modes require separate scope approval. These questions do not block safe baseline capture or isolated implementation with adoption off.

## 6. Component reuse and minimum-change strategy

Reuse tenant routing, published settings/cache/revision delivery, effective-theme stages, cart/auth contexts, all product/checkout hooks, public eligibility/serialization, server pricing/stock/order/auth/OTP/review/return APIs, consent/idempotency, autosave, ownership and publication services.

| Region | Mandatory approach | Extraction threshold |
|---|---|---|
| Header/hero/card/footer | Small explicit Atelier-only branches from existing models/callbacks | New stateless view only where Figma structure materially differs; legacy renderer remains default |
| Home sections/catalog/compositor | Existing compositor and registry with scoped semantic styling | No new composition enum solely to select a skin |
| Product detail | Existing ProductDetailsView/gallery/info/variant/action/review primitives | Small new arrangement only if an indispensable region cannot be expressed safely; no new product hook |
| Live category/collection | Current clients, query state, filters/sort/paging/data retained | No mandatory CatalogPageView extraction |
| Cart/checkout | Existing shared views/form IDs/actions/state/validation | Small gated structural change only where needed; no copied controller/form or broad extraction |
| Account/reset/security/vendor | Existing components/handlers, scoped wrappers/classes and optional small decoration | Keep OTP/password/session state in place; no mandatory AccountViews extraction |
| Tracking/cancel/return | Current route/state/actions/proof-upload markup | Small pure region only if essential; no monolithic TrackingView rewrite |
| Policies | Current index/detail routes and text resolution | Scoped presentation; no mandatory new policy-view framework |
| Search/modals/consent/loading | Existing controls/state with new scope | No alternate modal/controller system |

Every existing **live route** and functional/state element remains mandatory. Extra Builder page modes are optional; they do not justify broad refactoring or delay core acceptance.

## 7. Revised implementation phases and estimates

The mandatory release covers the **complete live storefront** and the **existing five Builder preview modes**. New category/collection/account/tracking preview choices are optional Phase O, with separate acceptance and estimate.

| Phase | Mandatory work and exact likely files | Dependency / risk | Tests and acceptance / estimated effort |
|---|---|---|---|
| **0 — Freeze baseline and product specification** | Existing nine preset definitions, representative persisted snapshots and old renderer captures; these three planning documents; inspect `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/AGENTS.md` before later source edits | First task; low implementation risk. Record eligibility/downgrade/pilot decision owners | Capture definition/configuration/normalized/effective/markup/image baselines **before shared edits**; run existing focused tests and record failures. 1–2 days |
| **1 — Optional identity and server adoption gate** | `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/index.cjs`, `index.mjs`, `prebuilt.cjs`, `capabilities.cjs`, `effective.cjs`; `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/Shop.js`; new `services/storeBuilder/themeAvailabilityService.js`; existing Builder service/SEO/controller boundaries | Phase 0; medium. Product decision may remain pending while all merchant adoption is off | Missing field preserves exact legacy output; explicit clear/switch behavior; direct API/draft/publish/restore/SEO spoofing rejected atomically; no application bypass through limited plans. 1–2 days |
| **2 — Scoped presentation foundation and homepage** | Existing live theme provider and Admin preview root; shared styles/local font; `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/atelier/atelier.css` and minimal stateless header/hero/card/footer views; existing reference components/sections/catalog; standard compositor retained | Phase 1; medium. Dynamic merchant content and current callbacks required | Old branches/defaults unchanged; new identity stable under composition edits; 1440/390 reference anchors, empty/long content, sections/actions; existing home preview parity. 2–3 days |
| **3 — Live product/category/collection** | Current shared product primitives; current `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/categories/[slug]/CategoryPageClient.jsx` and `collections/[slug]/CollectionPageClient.jsx`; scoped semantic hooks | Phase 2; medium. No new page controllers or preview modes | Same variants/stock/price/reviews/query/sort/pagination/canonical paths, no lost controls. 1–2 days |
| **4 — Live cart/checkout/customer/tracking/policies** | Existing `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/CartView.jsx`, `CheckoutSections.jsx`, `PolicyView.jsx`; existing account components and tracking/policy route markup; scoped classes and small gated regions only | Phase 3; high correctness risk. Preserve stateful components and all commerce contracts | OTP/consent/idempotency/auth/order-access/returns and all error/loading/empty/mobile states retained; no broad extraction. 2–3 days |
| **5 — Essential Builder and persistence verification** | Existing `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/themes/ThemeGallery.jsx`, `StorefrontPreview.jsx`, `PreviewCommercePages.jsx`, `StoreBuilderPage.jsx`, relevant current editors; existing autosave/publish/restore logic | Phases 1–4; medium. Approved eligibility needed before real adoption | Trusted availability UX; real thumbnail; existing home/product/cart/checkout/policy preview parity; supported controls/save/reload/switch/restore. New page-choice list unnecessary. 1–2 days |
| **6 — Regression and controlled release** | Existing tests/fixtures and focused additive tests; deployment configuration/operator checklist | All core phases; medium–high release risk | All nine definition/configuration/render/commerce baselines unchanged; API gate and tenant tests; both lint/builds; authorized allowlist pilot; release only after product policy approved. 2–4 days |
| **O — Optional additional preview modes** | Only if approved: `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/hooks/usePreviewMode.js`, preview adapters and narrowly justified pure view seams | After core gates; separate scope. Never require live private data or copied controllers | Category/collection/account/tracking local fixture previews and no-side-effect parity. 4–7 additional days; not a release gate for the core theme |

**Revised budget:** 12–18 engineer-days for core implementation/review/verification. Phase ranges overlap in verification and are planning estimates, not delivery promises. Optional preview work brings combined effort to approximately 16–25 days. No aesthetic, business-rule or unrelated refactor work is included.

## 8. File ownership and minimum-change limits

Classification: **N** new-theme-only; **A** narrow additive shared variation; **T** existing contract extension; **B** essential Builder integration; **G** existing global dependency; **O** optional scope; **X** change to avoid. New filenames are proposals, not created files.

| File / group | Ownership and mandatory action | Isolation / scope limit |
|---|---|---|
| `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/index.cjs`, `index.mjs` | T: optional presentationVariant normalization/validation/selector/export and DM Sans support | No materialized legacy default; no change to existing fallback, token values or schema version |
| `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/prebuilt.cjs` | T: append Atelier with supported hidden status, new selection/clear/limited-preserve behavior and availability UX input | Keep nine definitions/versions/catalog metadata immutable; do not change shared content-gate semantics |
| `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/capabilities.cjs`, `effective.cjs` | T: protect the new field and implement only approved eligibility/effective fallback | Existing nine policy outputs unchanged; no implicit Atelier full-only restriction |
| `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/composition.cjs` | G: reuse unchanged initially | No new enum or storefront identity inferred from homepage arrangement |
| `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/Shop.js` | T: optional presentationVariant enum with no default materialization | No backfill/schema migration; test full snapshot round trip and explicit removal |
| `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/themeAvailabilityService.js` (new) | N: small server-owned adoption/eligibility transition guard | No request-controlled bypass and no parallel publication system |
| `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/storeBuilderService.js` | A: invoke guard on trusted raw/merged target before draft/publish writes, including restore callers | Keep existing authorization, asset ownership, concurrency, transactions and revision behavior |
| `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/storeBuilderSeoService.js`; `controllers/storeBuilderController.js` | A/B: guard full-theme SEO draft writes and surface trusted current-tenant availability metadata | SEO scope cannot change theme identity; preserve existing APIs/response fields additively |
| `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/atelier/atelier.css` (new); existing `styles.css` | N/A: exact-scope semantic rules/import and local font | No broad utility overrides, global typography changes or legacy default/token edits |
| `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/fonts/dm-sans-variable.woff2`, `DM-Sans-OFL.txt` (new) | G: licensed static font; verify availability/rights first | No dependency/remote font requirement; previous font declarations unchanged |
| `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/atelier/AtelierHeader.jsx`, `AtelierHero.jsx`, `AtelierProductCard.jsx`, `AtelierFooter.jsx` (new only when needed) | N: stateless structural variants from existing data/actions | No duplicated fetch, price/stock, slide timer, cart or authentication logic |
| `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontHeader.jsx`, `StorefrontHero.jsx`, `StorefrontProductCard.jsx`, `StorefrontFooter.jsx` | A: gated view choice after existing data/hooks | Legacy return path/props and accessible controls unchanged |
| `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontHome.jsx`, `StorefrontSectionRenderer.jsx`, `StorefrontSectionVariants.jsx`, `StorefrontAllProducts.jsx` | A: scope/semantic hooks; same section/content logic | Do not rewrite compositor or replace legacy section renderers |
| `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/ProductDetailsView.jsx`, `ProductImageGallery.jsx`, `ProductInfo.jsx`, `VariantSelector.jsx`, `ActionButtons.jsx`, `ProductExtras.jsx`, `ReviewSection.jsx`, `RelatedProducts.jsx` | A: existing primitives with scoped styling/small measured structural branch | No mandatory replacement ProductDetails view; no commerce duplication |
| `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/CartView.jsx`, `CheckoutSections.jsx`, `PolicyView.jsx` | A: add semantic hooks under Atelier scope; preserve element/action contracts | No copied form/controller or broad extraction |
| `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/components/storefront/StorefrontThemeProvider.jsx`; `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx` | A/B: same resolved theme marker/context in current root | No additional resolver/fetch; keep old root geometry for existing presets |
| `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/ThemeScope.jsx` (only if needed) | A: small read-only propagation helper | Not mandatory if current props/context suffice; no extra DOM/persistent state |
| `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/categories/[slug]/CategoryPageClient.jsx`, `collections/[slug]/CollectionPageClient.jsx` | A: existing client markup with scoped hooks | Query/data/state untouched; no mandatory CatalogPageView |
| `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/components/account/AuthView.jsx`, `PasswordResetFlow.jsx`, `CustomerDashboard.jsx`, `CustomerTabs.jsx`, `VendorView.jsx` | A: scoped appearance and small theme-only decorative/structural regions | Preserve current OTP/password/session state and handlers in place; no mandatory AccountViews extraction |
| `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/track/page.jsx`, `policies/page.jsx` | A: scoped markup/regions in current files | Keep access-token, cancellation/return/upload and policy handling; no mandatory TrackingView/PoliciesIndexView |
| `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/StorefrontHomeClient.jsx`; existing search/modal/consent/loading components | A: limited semantic hooks only where existing output needs theme treatment | Keep timing, dismissal, search scope and consent |
| `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/themes/ThemeGallery.jsx`, `StoreBuilderPage.jsx`, `StoreBuilderEditorPanel.jsx`, `PreviewCommercePages.jsx`, existing editors | B: adoption availability, current preview parity, supported controls/font, change summary | Existing five preview modes sufficient for core release; reuse autosave/undo/publish |
| `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/hooks/usePreviewMode.js`; new CatalogPageView/AccountViews/TrackingView/PoliciesIndexView | O: extra preview choices and only the seams necessary for them | Separate product approval/estimate; core release must not depend on these files |
| `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/package.json`, `index.jsx` | G: modify exports only if an actually introduced entry point needs it | Keep all existing exports, especially /viewports; wildcard may already cover a new view |
| Global app layouts/CSS; cart/auth/checkout hooks; order/OTP/auth controllers; new commerce services/migrations | X: avoid | Existing API/business contracts remain unchanged |

Filenames abbreviated within a row share the directory of its first full path. Any proposed broader extraction needs a concrete visual/behavioral reason and a revised risk/test review; optional preview convenience is insufficient.

## 9. Responsive, interaction and accessibility strategy

Use 1440 px desktop and 390 px mobile as reference anchors. Proposed tests cover 320, 360, 390, 430, 768, 1024 and 1440 px; retain the existing Builder viewport constants and add fixture sizes rather than changing their meaning. Proposed breakpoints are 640/768/1024 px to fit the current system, with content-driven intermediate behavior. These are engineering decisions, not Figma annotations.

- Header: wrap long brand text without colliding with utilities; mobile menu retains search/account/cart/tracking even when the reference hides them. Menus/modals support keyboard navigation, Escape, focus return and body-scroll handling in the correct iframe document.
- Home: text precedes hero media on mobile as observed; category/product groups become two columns where titles/actions fit, one on very narrow content where needed. Never hide products solely to imitate the mockup's two sample cards. Preserve configured catalog pagination and section visibility.
- Product: gallery before information on narrow screens, usable thumbnails, labeled options and stock/price updates, quantity bounds, existing mobile purchase actions. No color-only variant choices without a readable attribute label.
- Catalog: controls become an accessible filter panel; collection retains its smaller actual control set. Chips/sort/paging do not overflow. Three-column reference listing adapts to two/one, preserving item order.
- Cart/checkout: item controls and summary stack; summary/submit remain reachable with keyboard and mobile keyboard open. Avoid overlapping mobile navigation, purchase bars, consent banner and OTP modal. Required labels, browser validation and inline feedback remain exposed.
- Account/reset/security: form first on mobile; decorative panel may be reduced. Six OTP inputs retain paste/backspace/focus behavior and cooldown. Logged-in views must receive the same visual language even though Figma shows login only.
- Tracking: lookup precedes verified details; timeline becomes vertical on narrow screens. Cancellation and return forms retain all fields, file controls and errors; never show a sample order before OTP.
- Policies: contents precedes full texts on mobile; long merchant content wraps; anchors account for header height. Individual policy page remains supported.
- Images use current safe image handling, dynamic merchant media, alt text and error fallbacks. No product illustration or Figma screenshot is embedded as the actual product content.
- Minimum interaction target 44 × 44 px; visible focus; essential small text contrast target 4.5:1 and large text 3:1. Verify configurable color combinations; fixed design accents are not permission to fail contrast.
- Motion proposal: 120–180 ms state transitions, no mandatory moving ticker or hero motion. Honor `prefers-reduced-motion`, pause autoplay for focus/hover and preserve explicit slide navigation. Avoid page-shift animations around checkout/OTP.

## 10. Essential Store Builder integration and optional preview expansion

**Mandatory:** real gallery thumbnail/full home preview; safe selection using trusted availability; correct marker and existing editor controls; existing home/product/cart/checkout/policy preview modes using shared presentation; local recovery/autosave/undo; publish review/concurrency; save/reload/publish/restore and switch-back; plan/ownership/adoption checks in the server. Existing preview and live views must agree for equivalent resolved data/state.

The new catalog entry uses the existing supported `status: 'hidden'` during development. Merchant bootstrap exposes availability from the server guard, not a client environment flag. Preview/apply controls reflect it, but direct writes still pass the server transition guard. An allowlisted test tenant can exercise the complete existing flow in an isolated environment; no new publish endpoint is required.

**Optional Phase O:** category, collection, account and tracking page selectors, extra private-state mockups and new pure-view extractions for those previews. They are useful follow-up work, not prerequisites for a cohesive live theme. All four live page areas are still styled and functionally verified in the mandatory release.

Keep current Link/Image adapters, iframe viewport/style copying and preview no-op effects. Do not fetch a real customer/order to populate a design preview. Any future private preview state uses clearly labeled local fixtures in Builder chrome and has no OTP/order/marketing/provider effect.

Preview/live parity does not require refactoring stateful routes. Verify existing five preview modes via shared views; verify other live pages via their current route components and browser/state fixtures. If optional preview modes are approved later, introduce only the minimum pure region needed and preserve the existing live handler/state owner.

## 11. Merchant content and exact legacy preservation

Preserve logo/favicon, hero slides/copy/links, navigation/children, footer/contact/social, policies, SEO, payment/checkout branding, product/category/collection records, section content/selection IDs, tenant cart keys and customer sessions. Applying a preset changes a draft only. Do not bulk-write or re-normalize existing shops just because a new variant is deployed.

The nine catalog definitions and versions must remain byte/structure-equivalent to their frozen baseline; append the new definition without changing their metadata. Old published themes remain untouched in storage, and their normalized/effective/render outputs remain unchanged when read. Missing presentationVariant stays absent; the new field is not inferred from composition or preset metadata.

Switching into Atelier deliberately sets the new marker when authorized. Changing homepage composition leaves it intact. Switching to a legacy preset clears it; limited appearance-only application preserves the previous marker alongside protected structure. Test these transitions explicitly to prevent a stale Atelier skin after switch-back or a limited-plan identity bypass.

Existing section content gates/reordering/enablement behavior is the compatibility baseline, including media-only BrandStory not being automatically enabled by the current preset gate. Do not globally fix or reinterpret those rules during this theme task. Merchant text/media/IDs must survive, while intentional presentation/order/visibility changes are disclosed in draft review.

Reapplying an old preset restores its preset presentation, not the exact earlier customized snapshot. Exact recovery uses existing undo/revision restore. No new store-data archive or migration is required.

## 12. Security and compatibility constraints

The renderer accepts public tenant data or explicit view props, never tenant IDs chosen by theme copy. Keep server filtering, canonical routes, customer/session scoping, server price/stock authority, product/variant IDs and cart item keys unchanged. Existing order access tokens and eligibility control tracking/returns; no preview sample status becomes real order state.

Use validated navigation/media URLs, escaped text and existing safe media wrappers. Do not insert Figma-generated HTML, SVG strings or merchant HTML through `dangerouslySetInnerHTML`. Generic static decorative assets must be trusted local assets; merchant imagery stays dynamic. No sample shipping claim, estimated arrival date, locale selector, newsletter signup or online payment choice is added by reproducing a text layer.

Coordinate the same shared contract/renderer revision across backend/Admin/storefront. File-package installation/copying and export resolution must be verified in both Vite and Next production builds; a working workspace file alone does not prove installed copies are current. Existing `/viewports` export must remain intact given the previously reported Vite resolution issue.

## 13. Acceptance gates

Before any shared code edit, freeze registry objects/versions, representative raw published configurations, normalized/effective outputs, rendered markup/computed styles and desktop/mobile images for all nine presets. Keep this evidence immutable during implementation. Preserve every existing nine-theme assertion; update literal catalog cardinality separately and append tenth-specific cases. Do not replace old assertions or regenerate baselines to hide changes.

Core release requires: nine definitions/configurations/rendering/commerce unchanged; every existing live route and documented control/state supported; existing five Builder preview modes correct; optional identity stable under composition edits; authenticated direct-write rollout rejection; approved plan policy and safe downgrade behavior; content-preserving apply/save/publish/restore; existing tenant/pricing/stock/auth/order-access/OTP/consent/idempotency tests; both frontend lint/build gates.

Additional preview modes and their parity tests are optional and cannot expand the core release gate implicitly. A concrete necessary local presentation branch can be tested without general route extraction.

The regression matrix supplies practical commands/scenarios and explicitly marks optional work. No application tests or builds were run in this refinement; current baseline failures are unknown. Test providers must be mocked, with no live sends or production orders.

## 14. Risks and product approvals

| Item | Decision / effect on estimate |
|---|---|
| Eligibility | Product must approve which plans receive complete Atelier, appearance-only adaptation or no selection. No hardcoded full-only assumption |
| Downgrade/grandfathering | Product must approve ongoing access and recovery; safe proposal is non-destructive effective fallback preserving stored snapshot |
| Rollout ownership | Product/operator must choose isolated pilot tenant IDs and the authority/date for general availability; default remains off |
| Optional preview expansion | Separate scope approval; adds 4–7 engineer-days and extraction risk, never required for current live routes |
| Identity correctness | Optional field needs allowlist/schema/policy/clear/round-trip tests. Using composition or preset provenance as identity is rejected |
| Direct write bypasses | Raw/merged checks at draft/publish/restore/SEO boundaries are mandatory; discovering another relevant theme write path may extend Phase 1 |
| CSS/markup limitations | Scope first; if precise essential geometry requires an extraction, document it and add focused regression before expanding work |
| Baseline failures/test infrastructure | Existing failures, unavailable isolated Mongo/browser/font rendering or stale file-package installs can extend verification; report rather than assume |
| Font/contrast/multilingual content | Licensed DM Sans and darker accessible labels remain Phase 0 specification work; Bengali/long text may expose metric issues |
| Deployment/rollback | Coordinate optional-field readers/writers; restore compatible snapshot before old binary downgrade. No mass merchant rewriting |
| Unsupported concept features | Locale/free-delivery claims/new story routes/payment methods are excluded unless separately requested |
| Missing inner-page mobile/state Figma | Use approved visual system with existing functional elements; material unresolved interaction requires a scoped product/design clarification |

Core estimate 12–18 days assumes small presentation changes, no extra previews, stable approved direction, usable infrastructure and no commerce changes. Expanded exact pixel geometry requiring broad route extraction, new entitlement design, new content fields or unplanned features requires re-estimation; do not absorb that scope silently.

## 15. Exact safe first implementation task

After explicit implementation authorization, execute **Phase 0: capture and freeze the nine-preset baseline before editing shared source**. Using existing deterministic fixtures, record each registry definition/version and representative persisted raw, normalized and effective themes; capture current markup/computed styles and desktop/mobile route images; run the focused existing suites with mocked external effects and record all failures.

This first task introduces no new presentation field, renderer branch, dependency, migration or merchant publication. Keep adoption off while product records eligibility/downgrade/pilot decisions and the font/token specification. Then implement optional identity and the server transition guard together, followed by scoped home/live pages, essential existing Builder parity and release gates. Optional preview expansion follows separately if approved.

This refinement changes only the three planning documents and does not authorize implementation, rollout or publication.
