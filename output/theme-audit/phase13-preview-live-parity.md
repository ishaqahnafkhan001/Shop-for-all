# Phase 13 - Objective preview/live parity

Date: 2026-10-10, Asia/Dhaka.

Status: controlled server-render comparisons and targeted data-path repairs completed.
**Full visual and deployed-store acceptance remains open.** No browser screenshots,
authenticated publication, database writes, migrations, deployment or commit occurred.
The earlier browser security-policy rejection was not worked around.

## Controlled comparison

`ecommerce-backend/backend/tests/storefront-preview-parity.test.js` renders these
production components, rather than three copies of the shared Home component:

1. Gallery's full-preview adapter (`ThemeGalleryPreview`).
2. Builder's preview panel (`StoreBuilderPreviewPanel`).
3. Live `StorefrontThemeProvider`, `Navbar`, `StorefrontHomeClient` and `StorefrontFooter`.
   Live Home runs the real `useShopData` initial-data preparation.

The Gallery comparison starts with the candidate returned by its actual
`buildPreviewTheme`. That exact candidate supplies Builder and the simulated published
snapshot. Gallery previews a proposed preset application: comparing it with an older,
customized live revision is not a controlled comparison. No presets are automatically
reapplied to existing stores.

| Input | Fixed value / handling |
| --- | --- |
| Preset | Each of the nine registered presets |
| Contract | Existing schema version 4; candidate preset metadata retained |
| Revision | Simulated published revision 17; same candidate on all surfaces |
| Merchant content | Identical hero, footer, story, category art, section selections and reviews |
| Plan | Separate full and limited cases; unavailable plans must reject Gallery application |
| Branding | Same resolved branding input; same verified/trusted-badge presentation input |
| Catalog | First nine of twelve fixture products; identical two-page pagination |
| Selection | Explicit product 11 remains available outside the first catalog page |
| Prices/stock | Zero final price, sold-out product, scheduled-sale card, ordinary discounts |
| Review content | Same buyer, text and reviewed-product title |
| Commerce state | Cart count 3, no wishlist entries, no logged-in customer |
| Promotions | Same 25% storewide discount; scheduled-banner and popup features absent |
| Locale | English document and existing BDT formatting; no new locale/currency system |

The comparator extracts only the balanced `.sf-presentation` root. It removes outer
editor chrome and React resource hints outside that root. **No text, class, style,
image source, link or other presentation attribute is normalized away.** All eighteen
preset/plan cases produce identical markup across the three paths: 54 surface renders.
Hashes are recorded in `phase13-parity-matrix.json`.

I/O and browser boundaries are substituted: iframe mounting returns its children,
Next Link uses an anchor adapter, network calls are prohibited, commerce actions are
no-ops, and the closed SearchModal is substituted. These are SSR comparisons, not a
Next server, actual iframe layout, hydration, computed-style or pixel comparison.

## Fixed project-wide viewports

One manifest, `packages/storefront-renderer/viewports.js`, drives both Gallery and
Builder document widths. Use these same dimensions for live browser acceptance:

| Device | CSS viewport |
| --- | --- |
| Desktop | 1180 x 800 |
| Tablet | 768 x 800 |
| Mobile | 390 x 800 |
| Small mobile | 320 x 800 |

Use device scale factor 1, browser zoom 100%, identical scroll position, loaded fonts
and decoded images, and no editor selection for comparisons. Editor Fit scaling is
outside the iframe and does not change its document viewport. Gallery thumbnails
intentionally crop to 740px height; acceptance uses **full preview**, not thumbnails.
Responsive HTML is equal across device choices because real CSS media queries control
the document. This is not counted as four successful visual tests.

## Findings and targeted repairs

| Severity | Finding and cause | Repair / files |
| --- | --- | --- |
| High | Gallery full preview hardcoded the discount to zero; cards omitted it. | `ThemeGallery.jsx` and `StoreBuilderPage.jsx` forward the actual discount. |
| High | Builder's private product projection omitted variants and scheduled-sale preparation; selected products also expanded the catalog page. | `storeBuilderService.js` now retains public detail fields and prepares a separate nine-card catalog using the existing public projection, sale service and sanitization. Counts and deterministic ordering match live initial pagination. |
| High | Live manual-product lookup handled only FeaturedProducts, so off-page Collection/CollectionShowcase selections disappeared after publication. | `controllers/storeController.js` includes all three supported product-section types in the existing tenant-scoped lookup. |
| High | Bootstrap loaded selected products/reviews only from the published theme, losing draft-only selections beyond the initial page. | `storeBuilderService.js` reads the existing draft first and unions published/draft selection IDs before querying. |
| High | Later private picker pages could replace public sale prices and introduce unpublished-only categories into the preview. | `productController.js` optionally returns public preview cards; Builder requests and merges them, keeps bootstrap public categories, and preserves existing detail fields during cache merges. Ineligible cards are explicitly excluded. |
| Medium | Bootstrap public products bypassed the public serializer used by the new preview cards. | Live bootstrap applies the existing public serializer to catalog and manual products, including media entitlement restrictions. |
| Medium | Builder/Gallery omitted the verified/trusted badges rendered by live header/footer. | Forward both badge inputs throughout the preview path. Extract the existing trusted-badge checks unchanged into `verification/publicTrustedBadgeService.js` and reuse them in both loaders. |
| Medium | Preview review data lacked the reviewed-product title used in live review cards. | Tenant-scoped title enrichment in Builder bootstrap, matching live review preparation. |
| Medium | Empty preview data silently inserted sample categories and could create an extra composition column. | Remove the sample-category fallback in `StorefrontPreview.jsx`. |
| Medium | Preview passed legacy `preview` flags that made mobile navigation sticky and suppressed the mobile menu. | Use normal header/footer behavior inside the existing iframe; links still suppress navigation. Footer uses live fixed positioning and safe-area offsets. |
| Medium | Tailwind `font-sans` and `font-mono` resolved differently in Admin and Next despite shared markup. | Shared `styles.css` scopes sans text to the theme body font, uses a consistent monospace stack and aligns font smoothing. |
| Low | Preview root minimum height and document language differed from live. | Match minimum viewport height and English document language; centralize viewport dimensions. |

`services/products/storefrontPreviewDataService.js` is an environment data adapter,
not a theme resolver or renderer. It reuses `PUBLIC_PRODUCT_CARD_PROJECT`,
`buildPublicProductQuery`, `applyScheduledSalesToProducts` and `sanitizePublicProducts`.
Ordinary Admin product responses are unchanged; the Builder opts into an additional
`previewProducts` field using `storefrontPreview=true` on the existing protected route.

## Evidence

- **224 tests passed**, zero failed: `phase13-tests.txt`.
- Admin production build passed: `phase13-admin-build.txt`.
- Storefront production build passed: `phase13-storefront-build.txt`.
- Whitespace check: `phase13-diff-check.txt`.
- New parity suite: 18 exact comparisons, empty-data, unavailable-plan, fresh picker,
  fixed mobile-navigation and viewport-contract checks.
- New data suite: actual bootstrap/controller/service code with database/service doubles;
  tenant-scoped projection, draft selections, sanitization, pricing forwarding, review
  titles, off-page Collections, private picker opt-in and trusted-badge gates.
- Existing 188 theme tests plus nine badge tests remain passing.

Mongo aggregate execution and scheduled-sale database eligibility are mocked. Data
tests verify the pipeline, tenant/public filters, forwarding and real sanitizer; they
do not prove live database/index performance or a real sale transition.

## Acceptance still open

1. Capture all three full surfaces at each manifest viewport after loading the same
   published candidate and fixture. Compare header, hero, section visibility/order,
   grids, images, typography, borders/shadows, footer and scroll/fixed positioning.
   The earlier browser-policy block prevents automated acceptance in this session.
2. Authenticate to a test store, save/publish/reload, then repeat with a second tenant.
   Verify draft-only selections, remote media restrictions, badges and new picker pages
   against real queries. Existing Phase 12 races and refresh gates remain open.
3. Active scheduled banners and sale-announcement popups are live-only adapters today.
   This matrix holds those feature inputs off. Their enabled states require preview
   integration or a separate controlled comparison before claiming whole-page parity.
4. Secondary product/cart/checkout/policy pages retain Phase 6/10 render coverage and
   mocked preview commerce state. They have not received this phase's complete live
   adapter/controlled-state pixel comparison. Native preview vs Next optimized image
   delivery, filter/menu interactions, carousel timing and loading states need browsers.
5. The catalog and price inputs are snapshots. A sale or catalog update during an open
   Builder session requires fresh data; this phase does not add background sale polling.
6. Prior Phase 10 contrast findings and live cart/checkout zero-price calculations remain
   open. Equal preview/live output is not proof that the shared design is accessible.

## Compatibility and rollout

No theme schema, preset version or saved merchant configuration changed. Older
bootstrap responses still work through the prior preview fallback; deploy backend
before Admin to obtain the corrected product cards. Badge policy is unchanged.
Bootstrap now performs an additional public-card projection and sale preparation,
reads the draft before selecting data, and enriches review titles. Measure latency with
large explicit selections. No database migration or Redis reconfiguration is required.

The user's Redis URL subsequently passed a read-only PING locally. That result does
not establish running API/worker or deployed Redis connectivity.

Phase 14 is the next planned regression-suite phase. Phase 13's visual acceptance
remains open and must not be marked complete solely from matching HTML or builds.
