# Storefront Theme System: Architecture, Capability and Mobile Audit

Date: 7 October 2026. Repository: `C:/Users/user/WebstormProjects/Shop-for-all`.

Scope: read-only application audit. Application source and merchant records were not modified. The JSON verification output and this report are audit artifacts.

## 1. Executive Summary

**Recommendation: partially redesign the configuration and composition boundaries while keeping the shared theme contract, renderer, publication service, and tenant model.**

The platform currently has **one storefront renderer family and nine active structural presets**. It has **zero separately implemented complete storefront theme families** and no restaurant theme. The presets do change section composition and use real header, hero, and section variants; calling them only color skins would understate the implementation. They do not yet deliver independently controlled full-site experiences across home, listing, product details, cart, checkout, and policies.

The present architecture can support stronger themes through bounded extensions. Shared components do not prevent different websites. The limiting factors are the fixed page shell, the closed section registry, the shared product-card/footer structures, the absence of per-theme page templates and interaction definitions, and the absence of a durable distinction between theme defaults and merchant overrides.

Merchants with full access can change structural controls across the common catalog. A Fashion preset can be edited toward an Electronics appearance while retaining Fashion provenance. The system enforces plan permissions and general validity, but it does not enforce a selected theme's identity.

Use a hybrid mobile editor: shared configuration, commands, validation, history, and publication, with a dedicated phone interaction layout. The existing Store/Preview/Settings tabs already provide a useful starting point.

Verification: the earlier investigation passed 43 existing focused tests. This expanded audit completed 99 React render operations over all nine presets, plus per-preset JSON/Mongoose in-memory round trips and token/customization probes. These are executable checks, not visual or end-to-end publication certification. No staging session was supplied, and `MONGO_URI_TEST` is not configured. Browser publication, database persistence, actual network media, and complete commerce interactions remain unverified.

## 2. Current Theme Architecture

| Responsibility | Actual implementation |
|---|---|
| Runtime contract | [index.cjs][contract], schema version 4; ESM re-export through `index.mjs` |
| Defaults and validation | `FALLBACK_THEME`, `normalizeTheme`, `validateTheme`, sanitizer, section registry |
| Catalog | [prebuilt.cjs][presets], nine immutable active entries, catalog version 2 |
| Preset selection | [ThemeGallery][gallery] resolves a preset against merchant content; [StoreBuilderPage][builder] places the result in draft React state |
| Admin defaults | [storeBuilderThemeUtils][utils] derives `defaultTheme` from the shared fallback |
| Server draft | `StoreBuilderDraft`, one record per shop; browser local recovery is also shop-scoped |
| Publication | [storeBuilderService][service] validates, normalizes, checks asset ownership, performs revision-conditioned update, records history |
| Published state | [Shop.theme][shop] contains the resolved configuration; `themeRevision` identifies publication |
| Public resolution | [storeController][public] and [storeBuilderController][settings] use different transformation paths |
| Rendering | [shared renderer][renderer], with local storefront re-exports |
| Runtime context | [StorefrontThemeProvider][provider], plus independently resolved homepage/category/collection page data |

Actual lifecycle:

```text
Theme gallery / editor
  -> complete draft theme in React state
  -> Admin preview
  -> local recovery + PUT /api/store-builder/admin/draft
  -> PATCH /api/store-builder/admin with expectedRevision
  -> permissions + normalization + asset ownership + revision check
  -> Shop.theme + revision history + cache invalidation
  -> public bootstrap OR public theme-settings endpoint
  -> normalization and CSS variables
  -> shared components and storefront route components
```

`preset.id/version/appliedAt` is provenance. The live renderer does not load a catalog entry and combine it with an override document. It renders the already expanded `Shop.theme`. Changing a catalog definition therefore does not automatically change published stores.

The shared homepage structure is fixed: header in the tenant layout; hero first in the homepage; ordered dynamic sections; All Products after those sections; footer in the tenant layout. Hero and All Products are not ordinary movable dynamic sections. This prevents the exact Minimal example from placing Newsletter after the built-in product catalog without changing composition support.

The model combines design values, navigation, hero copy/media, section content, product/review selections, policies, SEO, checkout branding, payment-related settings, and responsive settings in one document. The preset resolver deliberately preserves merchant content, which is useful, but this is procedural separation rather than independently represented ownership.

Tenant safeguards inspected: authenticated tenant IDs for Admin changes; tenant resolution for public requests; shop-scoped draft/revision/product/review queries; asset ownership checks; shop-specific cache keys; revision restore scoped by both shop and revision ID. No cross-tenant theme leak was established. Production isolation still requires integration checks.

## 3. Exact Number of Themes

| Counting rule | Count |
|---|---:|
| Independently implemented complete theme families | **0** |
| Shared storefront renderer family | **1** |
| Active catalog presets with structural variation | **9** |
| Registered dynamic section types | **13** |
| Header structural variants | **3** |
| Hero structural variants | **5** |
| Distinct product-card component structures | **1** |
| Distinct footer component structures | **1** |

The nine entries are real selectable configurations with meaningful component variants. They are not nine independent full-site theme systems. Palette presets, section variants, default fallback objects, local renderer re-exports, thumbnails, and section templates are excluded from the complete-theme count.

The 13 registered section types are FeaturedProducts, Collection, CategoryList, Banner, TextBlock, Newsletter, Reviews, FAQ, TrustBadges, BrandStory, PromoBlock, BrandShowcase, and CollectionShowcase. Collection, BrandShowcase, and CollectionShowcase are marked `editorEnabled: false`, although renderer/contract support exists. A preset can therefore introduce a legacy/supported section without providing the same complete editing experience as an editor-enabled type.

## 4. Theme-by-Theme Status

All definitions below are in [prebuilt.cjs][presets], version 2. Every row uses the same product-card renderer and footer structure. Each inherits the shared customization surface and its bugs; no preset-specific customization policy exists. The section sequence shown is the blueprint between the fixed hero and the final All Products catalog. Unmatched merchant sections may be appended. Content-dependent sections are disabled when usable content is absent.

| Name / ID / source line | Main layout; header; hero | Product cards and catalog columns D/T/M | Ordered dynamic blueprint | Mobile implementation | Status |
|---|---|---|---|---|---|
| Modern General / `modern-general` / 279 | Wide; standard; split | Modern square; 4/3/2 | Category cards -> Featured -> Promo strip -> Collection grid -> Review cards -> Boxed newsletter | Compact header; bottom navigation on; shared responsive components | Mostly a structural preset; partially functional |
| Minimal General / `minimal-general` / 301 | Standard width, spacious; minimal; minimal | Minimal square; 3/2/2 | Featured -> Category cards -> Standard story -> Minimal newsletter | Compact header; bottom navigation off | Mostly a structural preset; partially functional |
| Modern Fashion / `modern-fashion` / 321 | Wide, spacious; centered; fullBleed | Premium portrait, cover images; 4/3/2 | Category image grid -> Featured -> Overlay banner -> Image-right story -> Collection grid -> Quote reviews -> Full-width newsletter | Compact header; bottom navigation on | Mostly a structural preset; partially functional |
| Editorial Fashion / `editorial-fashion` / 344 | Full Width, spacious, centered cards; minimal; editorial | Minimal portrait, square corners; 3/2/2 | Editorial story -> Editorial categories -> Mosaic collection -> Featured -> Minimal reviews -> Minimal newsletter | Noncompact header; bottom navigation off | Mostly a structural preset; partially functional |
| Luxury Jewellery / `luxury-jewellery` / 366 | Narrow, spacious, dark palette; centered; centered | Premium square, elevated shadow; 3/2/2 | Spacious collection -> Category image grid -> Featured -> Full-width story -> Quote reviews -> Trust -> Boxed newsletter | Compact header; bottom navigation on | Mostly a structural preset; partially functional; fixed light surfaces weaken dark design |
| Minimal Jewellery / `minimal-jewellery` / 389 | Narrow, spacious; minimal; minimal | Minimal square; category/stock hidden; 3/2/2 | Featured -> Circular categories -> Standard story -> Minimal reviews | Compact header; bottom navigation off | Mostly a structural preset; partially functional |
| Soft Beauty / `soft-beauty` / 409 | Standard width, spacious; centered; split | Modern portrait, contain images; 3/2/2 | Circular categories -> Featured -> Split banner -> Image-right story -> Review cards -> FAQ -> Boxed newsletter | Compact header; bottom navigation on | Mostly a structural preset; partially functional |
| Modern Electronics / `modern-electronics` / 432 | Wide, compact; standard; split | Modern square, small title, stock visible; 4/3/2 | Category cards -> Featured -> Promo strip -> Collection grid -> Trust -> FAQ | Compact header; bottom navigation on | Mostly a structural preset; partially functional; configured Mega menu has no renderer effect |
| Fresh Grocery / `fresh-grocery` / 454 | Wide, compact catalog; standard; centered | Modern square, rating hidden, stock visible; 4/3/2 | Circular categories -> Featured -> Split promo -> Spacious collection -> Trust -> Full-width newsletter | Compact header; bottom navigation on | Mostly a structural preset; partially functional |

Footer for every entry: the shared brand/navigation/support layout, responsive collapse, social/contact links, policy links, and optional bottom navigation; colors differ and merchant footer content is retained. No footer variant selector or independent footer architecture exists.

Header `menuStyle` values such as Nested and Mega are stored by presets, but `StorefrontHeader` does not read that field or the navigation `megaMenu` flag. Nested links render through the common dropdown logic. Simple and Mega configurations with identical links produced identical header markup in the probe.

No entry failed the isolated renderer smoke check, so none is classified as wholly broken. None is certified fully functional because shared defects and unverified end-to-end paths remain.

### Verification coverage for every entry

| Check | All nine results | What this proves / does not prove |
|---|---|---|
| Resolve selected preset | Pass | Resolver returns correct preset ID and configuration; gallery click was traced, not exercised in an authenticated session |
| JSON and Mongoose round trip | Pass | In-memory representation survives serialization/schema casting; no database write occurred |
| Shared page render | Pass | Actual React renderer returned markup, matching header and hero variant markers, product text, and footer text |
| Device props | Pass for normal, desktop, tablet, mobile, smallMobile | Branches execute; this does not evaluate browser media queries or prove viewport fit |
| Admin previews | Pass for home, product, cart, checkout, policy | Preview components render; their production counterparts are different in several cases |
| Customization samples | Pass for grouped price color, body font token, explicit card shape, header variant, footer copy; spacing fixture included | Does not prove all controls affect computed styles; known no-op controls were separately reproduced |
| Products/categories/reviews | Synthetic records supplied successfully | Real fetch, image delivery, sale timing, stock truth, and review eligibility not tested end to end |
| Publish, reload, restore | Unverified in live environment | Repository path and existing tests inspected; no disposable DB/test session configured |
| Actual listing, detail, cart, checkout, policy behavior | Source-audited; live browser behavior unverified | Shared routes exist, but no theme-specific page template routing exists |

The machine-readable record is [verification.json](C:/Users/user/WebstormProjects/Shop-for-all/output/theme-audit/verification.json). The 99 renders comprise 45 shared-page device-mode renders, 45 Admin preview-page renders, and nine customized shared-page renders. They are not 99 browser tests.

## 5. Can Themes Produce Completely Different Storefronts?

They can produce noticeably different homepages today. They cannot yet represent all four requested experiences faithfully across the whole site.

| Requested capability | Current answer | Boundary |
|---|---|---|
| Different section hierarchy/order | Partial | Flat dynamic list reorders; hero/catalog/header/footer remain anchored |
| Different layouts | Yes, within variants | Header, hero, category/story/collection/review/promo/banner branches change markup |
| Theme-specific components | No dedicated binding | All themes choose from the shared registry; adding a specialized component requires code and contract work |
| Theme-specific section types | No per-theme registry | Closed shared allowlist; unsupported types are rejected |
| Remove/hide sections | Yes, partly | Dynamic sections can be disabled/deleted; hero/catalog have separate visibility; footer/header structure remains fixed |
| Different navbar structure | Partial | Three variants; no implemented Mega configuration behavior or specialized industry navigation |
| Different hero structure | Yes | Five actual structural variants |
| Different product-card structure | Limited | One component with style values and conditional pieces; no separate information architecture |
| Different footer structure | No | One responsive footer, editable content/colors |
| Different desktop/mobile composition | Partial | Reflow, image/focal-point choices, visibility and columns; no independent ordered compositions |
| Theme-owned design system | Partial | Curated token values exist; protected token relationships and identity policy do not |
| Different page templates | No | Product/listing/cart/checkout/policy layout selection is not theme-driven |

Minimal: achievable approximately, but Newsletter cannot follow the built-in catalog in the supplied hierarchy. Fashion: editorial/image-grid/mosaic variants are useful; a dedicated lookbook and Instagram feed are missing. Electronics: current search/category/product presentation is useful; dedicated technical cards, comparison, brands grid, deals, and flash-sale sections need implementation. A generic promotion is not a functioning flash-sale integration. Restaurant: no theme or menu/reservation semantics exist; generic categories and products can approximate a menu visually, but cannot supply reservation, dish options, service availability, or restaurant-specific interactions.

Newsletter currently renders copy/icon styling through `TextualVariantSection`; it does not supply a subscription form/action. BrandShowcase uses that generic textual path, so it is not a complete brand-logo gallery.

## 6. Current Customization Capabilities

Availability below describes the implementation surface; plan restrictions can reduce access.

| Category | Customizable? | Current implementation / scope | Problems or boundaries |
|---|---|---|---|
| Primary, secondary, accent colors | Yes | Global grouped brand colors and generated palette | Legacy aliases can disagree with canonical groups |
| Text/background colors | Yes | Global plus header/hero/card/catalog/section/footer/checkout groups | Advanced flat foreground no-op; fixed surfaces remain |
| Detailed component colors | Yes | Borders, icons, badges, ratings, prices, buttons, inputs, success/error states | Some tokens are emitted but unused; groups are not arbitrary per-section-instance palettes |
| Fonts | Yes | Four allowlisted body/heading families | Inter/Roboto assets not supplied by inspected font loading |
| Heading weight | Yes | Global 600/700/800/900 | Fixed weights bypass it on some page headings |
| Typography scale/base size | Partial | `typography.baseSize` 12-20 in contract/presets | No normal editor control; rem utility sizes do not scale with wrapper font-size |
| Heading size | Limited | Hero/section classes and card title-size options | No general responsive heading scale editor |
| Logo/favicon | Yes | Separate uploads/URLs, store scope | Public settings endpoints differ in branding fallback |
| Button style/radius | Partial | Product Solid/Outline/Ghost and shape; checkout Solid/Rounded/Pill | No unified button design contract across every component |
| Card/image radius | Yes | Discrete product-card/image tokens | No universal site-radius controller |
| Card shadows | Partial | None/Soft/Elevated and grouped shadow color | Shadow color unused in actual card shadow classes |
| Product-card features | Yes | Image fit/aspect, category/rating/review/stock/SKU/wishlist/discount/action toggles, title/price sizes | Selecting style alone does not apply its style defaults |
| Navbar | Partial | Three structures; links, order, children, logo | Mega control is inactive; no arbitrary header slots |
| Hero | Yes | Five variants, height, overlay, slides, copy, CTAs, desktop/mobile images and focal points | Zero focal coordinate incorrectly falls back to 50 in duplicate adapters |
| Footer | Content/colors | Story, contact, social and extra links | One fixed structure; no column/template choice |
| Container/section width | Yes | Allowlisted width modes | Not a per-page family composition system |
| Section spacing | Partial | Global spacing/padding/margin; some section gap settings | Numeric default sentinel; no complete desktop/tablet/mobile spacing hierarchy |
| Product columns | Yes, uneven | Catalog desktop/tablet/mobile; Featured and Category controls mostly desktop/mobile | Global/section precedence confusing; tablet controls incomplete elsewhere |
| Dynamic sections | Yes | Add, change, duplicate, order, hide, delete; manual selections/content | Closed registry; some registered sections lack full editor support |
| Responsive visibility | Partial | Dynamic desktop/mobile flags | Tablet uses breakpoint behavior rather than its own visibility contract |
| Mobile controls | Partial | Compact header, bottom nav, sticky checkout setting | Sticky checkout setting is ignored; no device-scoped general override editor |
| Policies/navigation/SEO | Yes | Stored merchant content and settings | These are merchant data, not theme identity |
| Checkout branding | Yes | Logo, banner/trust copy, selected button treatment | Preview is separately authored |
| Payment providers | Stored only in this UI | Disabled coming-soon provider checkboxes | Theme setting is not proof of payment integration |
| Arbitrary CSS/JS/components | No | Sanitized bounded contract | Keep this boundary; do not allow tenant configuration to execute code |

## 7. Recommended Customization Boundaries

The current system has plan permissions and supported values, but no clear Level 1/2/3 boundary per selected theme. Merchant-editable section locks are convenience state, not an identity policy enforced from a trusted theme definition.

| Ownership | Recommended editable surface | Guardrails |
|---|---|---|
| Level 1: safe brand customization | Logo/favicon, semantic brand palette, curated font pair, button/card radius, border/shadow intensity, spacing and type scale | Theme-defined options/ranges; contrast feedback; reset to selected theme defaults |
| Level 2: structural customization | Allowed section order/visibility, product columns, approved header/hero/footer/card variants, optional sections | Per-theme allowed set, dependencies, sensible minimum content and limits |
| Level 3: theme identity | Page templates, required structural anchors, specialized components, navigation/interaction model, design-token relationships | Controlled by versioned code definitions; merchant can switch theme or explicitly enter a Custom mode |
| Merchant content | Copy, images, links, products, reviews, policies, collections | Preserved independently of theme; never invent claims/content during switching |
| Responsive overrides | Columns, spacing/type scale, media crop, approved visibility/navigation variants | Only allowlisted responsive properties; inherit/reset per viewport |
| Section-specific overrides | Content, source, approved variant, local spacing/visibility | Bound to stable section IDs and constrained by that section's schema |
| Locked platform rules | Tenant ownership, valid URLs, checkout correctness, required legal/system behavior | Server-enforced; never supplied by merchant policy payload |

Allowing a client to choose any header, hero, section, and density without theme constraints necessarily allows convergence toward another theme. A selected theme label alone cannot protect identity. Offer a clear Custom state for intentional departures instead of silently retaining an inaccurate theme label.

## 8. Mobile Editor Analysis

Source: [StoreBuilderHeader][headerui], [StoreBuilderPreviewPanel][previewpanel], [StoreBuilderEditorPanel][inspector], [StoreBuilderSidebar][sidebar], [Builder UI controls][ui], [usePreviewMode][previewmode].

What is already good: below `xl`, Store, Preview, and Settings act as separate workspaces. Selecting an element switches to Settings. Inspector width is fixed only at larger breakpoints. Drawers use full available width up to a maximum and implement focus/Escape handling. Many primary controls have 40-44px minimum heights. Section ordering uses explicit up/down buttons, so touch users do not depend on dragging. No drag/drop implementation was found in the Store Builder.

Remaining issues are supported by source, but touch/device usability was not observed in a live session:

- Both main preview and gallery initialize to Desktop. On a phone, the first view is a scaled 1180px composition.
- Fit preview is clamped to a minimum scale of 0.25; with nested padding at narrow widths, this can exceed available space and be clipped. At usable fit sizes, targets inside a desktop preview become tiny.
- The five page tabs sit in one nonwrapping inline group; nested padding and multiple control groups make a narrow toolbar fragile.
- Section action buttons use 14px icons plus 8px padding, about 30px targets. Banner reorder/delete controls are smaller still. Main workspace tabs are larger, but target sizing is inconsistent.
- Product selection has a nested scrolling list; mobile preview has its own bounded scrolling region. Long forms, software keyboard, and nested scroll behavior need device checks.
- Selecting a preview element moves away from the preview to Settings; there is no continuously visible explanation of which viewport the next edit affects.
- Device selection controls the preview, not a universal edit scope. Editing a normal color/layout value while viewing Mobile still changes the base configuration.
- Responsive controls are scattered between Hero, Mobile, Product Cards, and individual sections. There is no consistent tablet override workflow.

The mobile editor has already moved beyond simply shrinking three desktop columns, but its workflow is incomplete.

## 9. Mobile Architecture Recommendation

Choose **Approach C: Hybrid**. Desktop retains a multi-panel workspace; tablet can use preview plus an inspector drawer; phone gets a focused section list, one inspector task at a time, and a full-screen preview. All use the same commands, theme resolver, capabilities, undo/redo, validation, assets, drafts and publication.

Approach A is cheapest but cannot solve dense controls and competing preview/inspector attention by CSS alone. Approach B can improve phone UX but risks independent validation and editor behavior if built as a second application. The hybrid should share logic and field schemas while composing controls differently.

Recommended phone flow: Store/sections -> select section -> Content / Design / Responsive tabs -> explicit edit scope such as All devices or Mobile override -> Preview -> publish review. Keep move up/down controls and add accessible move-to-position where long lists need it; drag is optional. Use consistent touch targets, logical focus return, sticky primary actions, keyboard-safe drawers, and visible inherited-value/reset indicators.

For responsive data, extend the existing model with **sparse allowlisted overrides**. Do not duplicate the complete theme under three device objects.

```js
// Proposed shape, not implemented code.
merchant = {
  themeRef: { id: 'editorial-commerce', version: 1 },
  overrides: {
    tokens: { brandPrimary: '#7f1d1d' },
    layout: { productColumns: 4, sectionSpacing: 80 }
  },
  responsive: {
    tablet: { layout: { productColumns: 3, sectionSpacing: 60 } },
    mobile: { layout: { productColumns: 2, sectionSpacing: 32 } }
  },
  sections: [{
    id: 'stable-merchant-section-id', type: 'FeaturedProducts',
    content: { productIds: ['merchant-owned-id'] },
    overrides: { variant: 'grid' },
    responsive: { mobile: { visible: true, columns: 2 } }
  }]
};
```

This is a target ownership model, not a requirement to replace every current field immediately. Adapt existing `desktopSettings`, `mobileSettings`, and catalog columns into one resolver; retain old readers during migration. Define one breakpoint contract and expose tablet consistently. An omitted property means inherit, not reset to a generated default.

Resolution: choose trusted theme defaults for the viewport; apply permitted merchant base values; apply matching merchant responsive overrides; resolve local section overrides; validate final invariants. Define array behavior explicitly: section identity/order operations are not generic deep merges.

Mobile composition may differ where useful: a compact header, drawer navigation, stacked hero, fewer columns, different crop, collapsible support content, and a sticky action. Preserve content identity, purchase actions, meaningful reading order, and accessible navigation. Prefer natural responsive reflow; introduce controlled composition variants when reflow is insufficient. Avoid maintaining duplicate content trees or rendering contradictory interactive controls for different devices.

## 10. Confirmed Bugs

Severity is impact within the Theme System. P0 in the roadmap denotes repair order, not a claim of a Critical security vulnerability.

| ID / severity | Evidence and root cause | Consequence |
|---|---|---|
| B1 High | `normalizeProductCard` in [contract][contract] applies style defaults before a fully populated existing card; [ProductCardsEditor][cardseditor] changes only style | Modern -> Minimal retains Soft/Solid/800 instead of None/Outline/700 |
| B2 High | [color state][colorstate] omits foreground from flat-to-group mapping; normalizer gives grouped secondary precedence | Saved text color can have no rendered effect |
| B3 High | [plan service][plans] compares raw stored restricted fields to normalized incoming fields | Legacy layout/default or migration filling blocks allowed limited-plan saves |
| B4 High | [public bootstrap][public] applies essential branding/public metadata; [settings endpoint][settings] omits parts of that pipeline | Header/logo/public settings can change between pages |
| B5 High | [StorefrontPreview][preview] owns independent product/cart/checkout/policy pages | Preview cannot guarantee real-page parity |
| B6 High | Preview uses a div plus zoom; Banner/Reviews and many classes use outer media queries | Mobile/tablet preview can apply desktop rules |
| B7 High | Preview slices combined products to ten before resolving selections; builder data lacks normalized total stock/pricing | Selected products disappear; stock/prices differ from production |
| B8 Medium | [provider][provider] starts null, later hydrates/fetches, resets to fallback on error; page and provider own separate settings | Default flashes and inconsistent/stale settings |
| B9 Medium | [checkout page][checkout] always provides mobile sticky bar; no consumer for `stickyCheckoutButton` | Toggle is inactive |
| B10 Medium | [card renderer][card] inline border overrides hover class; shadow color token unused | Some color controls do not affect actual appearance |
| B11 Medium | [designTokens][tokens] treats numeric default padding/margins as legacy sentinel; populated catalog columns override global layout | Numeric controls and global inheritance have surprising effects |
| B12 Medium | Fonts select Inter/Roboto but inspected assets load Geist; fixed rem sizes/heading weights bypass parts of typography | Inconsistent device fonts and incomplete scale changes |
| B13 Medium | [Shop schema][shop] and contract differ: wishlist true/false, catalog title, Editorial spacing acceptance | Creation/loading paths differ; a contract-valid configuration can fail storage validation |
| B14 Medium | [header renderer][header] never reads menuStyle or megaMenu; identical-markup probe passed | Mega menu controls/configuration have no structural effect |
| B15 Medium | [gallery][gallery] disables selected preset by ID only; [builder][builder] reset uses global defaults | Cannot directly reapply same preset/new version through that button; reset does not restore selected theme identity |
| B16 Low | [builder utility][utils] and [reference core][core] use `Number(x) || 50` for hero focal coordinates | Valid 0% crop becomes 50% |

B1/B2/B3/B11/B13/B14 have direct executable probes. Other confirmed rows follow explicit source control flow/CSS rules, without claiming a deployed visual reproduction.

Conditional risks: autosave can finish out of order because drafts lack write sequencing; process-local cache invalidation cannot invalidate another server's memory cache; Redis recovery can leave old local fallback entries. These paths warrant integration tests. No concurrent/live failure was reproduced. Fresh homepage server fetching and existing publication invalidation mean caching is not the universal root cause.

## 11. Architectural Limitations

| Classification | Limitation | Required response |
|---|---|---|
| Architectural limitation | Expanded theme snapshot mixes defaults, content and overrides | Add explicit ownership and pinned definitions; preserve existing snapshots |
| Architectural limitation | Fixed hero/list/catalog shell and no per-theme page template mapping | Add bounded composition slots/templates in the shared renderer |
| Architectural limitation | One generic footer/card architecture and closed sections | Extend approved renderer variants/sections where product needs justify them |
| Missing feature | Restaurant, lookbook, social feed, technical comparison, reservations | Implement components and real data/action contracts before marketing them as supported |
| Missing feature | Newsletter signup | Add service-backed form/action; present component is informational |
| Missing feature | Theme identity policy, per-theme allowed overrides and reset | Add trusted manifests and server validation |
| Missing feature | Coherent tablet/responsive settings | Add sparse overrides and shared breakpoint rules |
| Bug | Saved controls lost, ignored or rejected | Repair current paths first |
| UX problem | Phone defaults to scaled desktop; tiny tools; unclear device scope | Recompose phone workflow while sharing editor logic |
| Verification gap | Existing tests emphasize configuration/source assertions | Add real computed-style, screenshot, data-flow and publication tests |

The existing architecture is extendable. A new renderer per palette would multiply maintenance without resolving these ownership problems. Meaningful theme families should differ in page composition, supported components, and interaction rules while reusing stable commerce primitives.

## 12. Recommended Architecture

Retain the two existing shared packages and strengthen their responsibilities:

```text
Versioned theme definition (trusted code)
  layout/page templates + component variants + tokens + allowed sections
  defaults + customization policy + responsive rules
                         |
Merchant-owned content and sparse allowed overrides
                         |
Shared effective-theme resolver + capability/identity validation
                         |
Resolved snapshot, publication revision, renderer compatibility version
                         |
Same renderer and styles in preview and storefront
```

Backend public endpoints should call one effective public-settings pipeline. Preview receives the same trusted branding/capability context and applies the same pure resolution rules to its draft. The server remains authoritative about permissions, identity constraints, tenant ownership, URLs and asset ownership.

Keep published resolved snapshots for reliable serving and rollback. Pin definitions/renderer compatibility, and do not force old shops to track the latest catalog. Theme metadata should distinguish definition version, merchant revision, and whether the store is in Custom mode.

Extend the existing renderer with code-selected templates and allowlisted component variants. Theme IDs refer to trusted definitions; tenant JSON must not name arbitrary imports or contain executable CSS/JS. Share product, inventory, price, review, and section data presenters between preview and storefront. Reuse the same presentational route templates; keep order/payment/auth behavior in existing application services.

Use one tenant settings provider initialized on the server, with explicit publication revision and refresh semantics. Preserve last good settings only within the same tenant; tenant changes must not briefly expose another tenant's configuration.

Maintain **three core commerce families initially**: General Catalog, Editorial Commerce, and Dense Catalog. Map the existing nine entries to supported style packs within these families. Add Restaurant as a fourth family only after its domain components and booking/menu behavior are implemented. This is a maintenance recommendation, not a claim that those three families already exist. Keep all existing nine IDs compatible; consolidation must not delete published configurations.

## 13. Prioritized Fix Plan

| Priority | Concrete work / principal files | Dependencies | Risks and release checks |
|---|---|---|---|
| P0: consistency foundations | Fix plan comparison and contract/schema drift in `storeBuilderPlanService.js`, `storeBuilderService.js`, `Shop.js`, shared contract. Unify public resolution in both controllers/branding service. Capture regressions. | Existing fixture baselines | Keep plan enforcement; no silent resets or tenant leakage |
| P1: current theme functionality | Repair editor style/color mutations, sticky toggle, Mega behavior or disable misleading control, hover/shadow/focal/spacing consumers, same-preset reapply/version check. Initialize provider and repair preview product data/viewport. | P0 | Verify actual saved-to-rendered results, fonts, refresh, and all nine IDs |
| P2: customization boundaries | Add versioned definition policy, sparse overrides, responsive inheritance and reset-to-selected-theme behavior inside existing theme package/editor service. Separate merchant content ownership. | P0/P1, agreed field semantics | Do not infer historical override intent by naive comparison with latest defaults |
| P3: mobile editor | Recompose Header/Sidebar/Inspector/PreviewPanel and shared field controls; viewport-scoped editing; tablet support; touch actions and full-screen preview | P2 shared commands/resolver | Keyboard/focus/scroll checks at real widths; identical mutation results across shells |
| P4: theme-specific composition | Extend StorefrontHome/page templates, header/footer/card variants and section registry. Start three families; share nonhome presentation with Admin preview. Add required business services for specialized sections | Stable P1/P2, per-family specification | Avoid arbitrary component loading; verify complete shopping journey per family |
| P5: polish and operations | Screenshot regression suite, contrast/font/image budgets, content guidance, accessible controls, draft sequencing/cache topology verification and rollout telemetry | Functional paths established | Treat presentation failures separately from data/service failures; preserve rollback |

Do not wait for new families to fix no-op controls and save rejection. Those defects directly reduce trust in every current preset.

## 14. Migration / Rollout Strategy

1. Capture representative version-4 fixtures and published snapshots, including legacy themes without preset metadata, sparse documents, all nine presets, disabled sections, limited-plan stores, and two tenants with different data.
2. Introduce the new resolver behind a compatibility switch. Read current `Shop.theme` as an exact legacy snapshot; keep the existing renderer path available.
3. For stores with reliable historical definition/version data, migrate content and overrides against that exact version. Do not compare against the newest catalog and assume every difference was intentional.
4. Where intent cannot be reconstructed, preserve the expanded snapshot as a legacy/custom baseline. Offer an explicit reviewed upgrade with before/after preview and retained content. Unknown preset IDs remain renderable through compatibility handling.
5. Adapt responsive fields without losing legacy values or ordering. Preserve section IDs, media URLs, selected products/reviews, disabled sections, navigation, SEO, policy and checkout content.
6. Run both resolvers on fixtures and compare outputs before any store opts in. Confirm model/database round trips and server capability enforcement.
7. Pilot with disposable stores and a small explicit cohort. Publish through existing revision conditions/history; retain enough versioned definition and rendering behavior for rollback.
8. Roll out incrementally after viewport/commerce/tenant tests pass. Observe failed saves, invalid settings, renderer errors and mismatch reports. Remove compatibility code only after usage is measured and stores are migrated deliberately.

Catalog definition version and renderer compatibility version must be managed separately: preserving the theme object alone cannot protect an old store from a renderer change that alters the meaning of the same tokens.

## 15. Acceptance Criteria

- Every exposed field has documented ownership, scope, allowed values, persistence mapping, resolver precedence and a renderer consumer.
- Full-plan and limited-plan stores can save allowed changes; restricted edits remain rejected after normalization.
- All nine legacy IDs resolve, publish, refresh and restore in a disposable database. A second tenant's data and theme remain unchanged throughout.
- Test both subdomain and custom-domain paths; header/footer/body receive the same effective revision on first render and navigation.
- For each supported theme family, exercise homepage, listing, detail, cart, checkout and policy pages at 1440px, 768px, 390px and a narrow 320px width. Verify computed styles, screenshots, keyboard navigation and interaction behavior.
- Preview and production use identical presentation logic, CSS/fonts, effective theme rules and product pricing/stock presenters for the same inputs.
- Run fixtures with empty catalogs, long titles, selected products outside the first ten, zero stock, regular and sale prices, missing media, manual reviews, disabled sections and sparse legacy settings.
- Each Level 1 change preserves required family composition; Level 2 edits remain within the definition policy. Attempts to change locked fields are rejected by the server.
- Tablet/mobile overrides inherit predictably, can be reset independently, and do not silently modify another viewport. Reading order and interactive controls remain accessible.
- Phone editor controls are usable without precision taps; core editing and reordering work without drag; preview fits; software keyboard does not hide essential actions.
- Theme switching and upgrade preserve merchant content; reset restores the selected pinned definition; publication/restore are revision-safe.
- Out-of-order autosave and multi-process cache tests pass in the intended deployment topology.

The audit is complete at repository and isolated-render level. Live end-to-end validation remains a release gate; it has not been represented as passed. Implementation has not started.

[contract]: C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/index.cjs
[presets]: C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/prebuilt.cjs
[renderer]: C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontHome.jsx
[builder]: C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx
[utils]: C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/storeBuilderThemeUtils.js
[gallery]: C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/themes/ThemeGallery.jsx
[service]: C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/storeBuilderService.js
[shop]: C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/Shop.js
[public]: C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/storeController.js
[settings]: C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/storeBuilderController.js
[provider]: C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/components/storefront/StorefrontThemeProvider.jsx
[headerui]: C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderHeader.jsx
[previewpanel]: C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPreviewPanel.jsx
[inspector]: C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderEditorPanel.jsx
[sidebar]: C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderSidebar.jsx
[ui]: C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/builderUi.jsx
[previewmode]: C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/hooks/usePreviewMode.js
[cardseditor]: C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/editors/ProductCardsEditor.jsx
[colorstate]: C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/storeBuilderColorState.js
[plans]: C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/billing/storeBuilderPlanService.js
[preview]: C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx
[checkout]: C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/checkout/page.jsx
[card]: C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontProductCard.jsx
[tokens]: C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/designTokens.js
[header]: C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontHeader.jsx
[core]: C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/referenceCore.jsx
