# Phase 10 - All nine themes audit

Date: 2026-10-09, Asia/Dhaka.

## Outcome

Code/configuration audit and bounded rendering repairs are complete. **Full Phase
10 acceptance is open.** No theme is declared fully working merely because it
renders. Browser viewport/parity, real publication and the findings below still
need closure. All nine have passing isolated configuration/customization and
rendered-data checks; 166 focused tests and both production builds pass.

## Matrix

Legend: **Code** = actual resolver/renderer or route client checked, with framework
or external I/O substituted where described. **Isolated** = real service and schema
cycle with in-memory model I/O. **Pending** = not verified for all nine in a browser
or authenticated environment. Layout identities are intentionally shared where
appropriate; colors, typography, section variants and card treatment differentiate
presets sharing a composition.

| Theme | Desktop | Tablet | Mobile | Layout / header / hero | Customization | Preview parity | Publish | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Modern General | Pending | Pending | Pending | Code: standard / standard / split | Isolated pass | Shared presentation; pixels pending | Isolated pass; live pending | Partial verification |
| Minimal General | Pending | Pending | Pending | Code: standard / minimal / minimal | Isolated pass | Shared presentation; pixels pending | Isolated pass; live pending | Partial verification |
| Modern Fashion | Pending | Pending | Pending | Code: standard / centered / fullBleed | Isolated pass | Shared presentation; pixels pending | Isolated pass; live pending | Partial verification |
| Editorial Fashion | Pending | Pending | Pending | Code: editorial / minimal / editorial | Isolated pass | Shared presentation; pixels pending | Isolated pass; live pending | Partial verification |
| Luxury Jewellery | Pending | Pending | Pending | Code: boutique / centered / centered | Isolated pass | Shared presentation; pixels pending | Isolated pass; live pending | Contrast findings |
| Minimal Jewellery | Pending | Pending | Pending | Code: standard / minimal / minimal | Isolated pass | Shared presentation; pixels pending | Isolated pass; live pending | Footer contrast finding |
| Soft Beauty | Pending | Pending | Pending | Code: standard / centered / split | Isolated pass | Shared presentation; pixels pending | Isolated pass; live pending | Partial verification |
| Modern Electronics | Pending | Pending | Pending | Code: discovery / standard / split | Isolated pass | Shared presentation; pixels pending | Isolated pass; live pending | Partial verification |
| Fresh Grocery | Pending | Pending | Pending | Code: standard / standard / centered | Isolated pass | Shared presentation; pixels pending | Isolated pass; live pending | Sale-badge contrast finding |

Shared commerce-calculation findings below apply across all themes. Prior Phase 8
viewport measurements were synthetic representative cases, not this entire matrix.
The earlier browser-policy block was not bypassed; no Phase 10 browser run or
screenshot is claimed.

## Verified coverage

For each of the nine presets:

1. Apply the preset to merchant content, run actual draft/publish service functions,
   validate with the Shop schema, serialize/hydrate and resolve the effective theme.
2. Preserve preset ID/version, hero copy, footer copy and refund policy.
3. Edit heading font/weight, phone/tablet columns, product gap, mobile spacing and
   hero order, card button shape, rating/review/stock/badge visibility, checkout
   button shape and a nested card-button color. Run the service/schema cycle again.
4. Verify identity, header/hero variants and section snapshots survive the edits,
   and the expected values reach layout resolution and CSS tokens.
5. Render Home (including catalog), Product, Cart, Checkout and Policy using the
   actual preview/shared presentation, checking merchant content and valid output.
6. Render the actual CategoryPageClient and CollectionPageClient against the same
   theme. Verify variant-derived stock, zero price, one-column mobile classes,
   four-column tablet classes and Compact catalog gap.
7. Verify card discounts, review counts, stock, out-of-stock disabled actions and
   zero prices; verify product review content and empty-cart presentation.

This is **63 page/component renders** in the new nine-preset checks (7 per preset),
plus card and empty-state renders. Category/collection tests mock Next navigation,
link/image wrappers and commerce action hooks. They do not simulate HTTP requests,
hydration, filters, actual purchases or browser media-query evaluation.

The publication harness mocks model I/O, plan loading and asset operations. It
checks tenant IDs in mock queries but is not an authentication, Mongo transaction,
cache invalidation or cross-tenant session test. No production records were touched.

## Defects corrected

| Severity | File / function | Root cause and repair |
| --- | --- | --- |
| High | `packages/storefront-renderer/reference/referenceCore.jsx:158`, `getPrice` | `finalPrice || sellingPrice` replaced a valid zero with the original price. New tests failed for all nine themes before the repair. Nullish fallback now preserves zero. |
| High | `packages/storefront-renderer/normalizeProduct.js`, stock fallback / `getInitialAttributes` / attribute options | Variant-only inventory counted disabled/archived variants, and initial selection could choose an unavailable variant. Fallback stock and selection now use eligible variants consistently; explicit aggregate stock remains authoritative. Missing legacy `isActive` follows the existing matched-variant rule and is eligible. |
| Medium | `ecommerce-storefront/src/hooks/useShopData.js` and category/collection clients, product normalization | Three independent normalizers discarded variant-only inventory, diverging from Builder preview. They now use the existing shared normalizer. |
| Medium | `categories/[slug]/CategoryPageClient.jsx:54`, `collections/[slug]/CollectionPageClient.jsx:29`, grid resolution | These routes retained the premature 640px two-column override, ignored the catalog's own spacing and omitted card alignment. They now use shared `resolveAllProductsLayout`, the existing grid maps, and saved alignment. |

No duplicate renderer, schema bump, preset reapplication or migration was added.
The installed Next client-component guidance was read before storefront edits.

## Open findings

### 1. High - live commerce paths still discard zero amounts

- `ecommerce-storefront/src/app/[subdomain]/cart/page.jsx:39`: savings calculation
  uses `finalPrice || sellingPrice`.
- `ecommerce-storefront/src/app/[subdomain]/checkout/page.jsx:107`, and later
  unit-price preparation near lines 293/320: `cartPrice || finalPrice || sellingPrice`.
- `ecommerce-storefront/src/app/[subdomain]/checkout/hooks/useCheckoutCoupon.js:42`:
  the same fallback in coupon calculations.

For `{cartPrice: 0, finalPrice: 0, sellingPrice: 100}`, these expressions select
100. Fixing the theme card does not repair those independent calculations.
This is a source-confirmed calculation defect; no claim is made that the server
actually charges that amount. Backend price authority must be included in the
commerce regression work. Do not globally search/replace every `||` in these files.

### 2. High - Luxury Jewellery foreground conflicts with its dark surface

`packages/storefront-theme/prebuilt.cjs:83` assigns `brand.secondary = dark`, while
the Luxury palette at line 373 supplies a light `foreground` and dark background.
`reference/referenceCore.jsx:202` prefers `brand.secondary` for the effective body
foreground. The resulting pair is `#09090b` on `#0f0f12`, ratio **1.04:1**.
Some elements have their own correctly contrasting tokens, so this is not a claim
that every element is invisible. It explains why dark-theme support cannot be
certified from successful rendering alone.

The repair needs explicit foreground semantics plus a review of light hardcoded
surfaces in shared secondary-page components. Changing the global foreground to
white without checking those surfaces could introduce new unreadable text.

### 3. Medium - three presets contain weak small-text color pairs

Resolved pairs below the Builder's existing 4.5 contrast threshold:

| Theme | Pair | Ratio |
| --- | --- | --- |
| Luxury Jewellery | White on gold add/checkout/hero buttons and selected variant chip | 3.64:1 |
| Minimal Jewellery | `#737373` footer text on `#f5f5f5` | 4.35:1 |
| Fresh Grocery | White sale-badge text on `#ea580c` | 3.56:1 |

These are resolved-token measurements, not screenshots or a complete accessibility
audit. Thirteen selected text/background pairs were checked for each preset.
Outline/ghost card buttons can use different effective backgrounds.

Correct affected preset palettes through explicit versioned preset updates. Keep
saved concrete merchant colors authoritative; provide deliberate update/reset
actions instead of silently rewriting existing stores. No palette/version change
was made during this audit.

## Evidence

- `phase10-initial-tests.txt`: all nine new cases reproduce the zero-price card bug.
- `phase10-tests.txt`: **166 tests passed**, zero failed/skipped, after all repairs.
- `phase10-admin-build.txt`, `phase10-storefront-build.txt`: production builds pass.
- `phase10-diff-check.txt`: diff whitespace check; line-ending notices only.
- `phase10-preset-analysis.json`: per-theme identities and 13 resolved contrast pairs.
- `phase10-analyze-presets.cjs`: reproducible read-only token analysis.
- New coverage is in `ecommerce-backend/backend/tests/storefront-control-wiring.test.js`.

## Ordered follow-up

1. Resolve zero-price handling in live cart/coupon/checkout with focused amount
   regressions and backend-authority checks. Keep financial behavior changes explicit.
2. Repair Luxury foreground/surface semantics and the three affected preset palettes;
   version preset changes and test existing saved themes remain unchanged on load.
3. In an available browser, run the nine-theme matrix at desktop/tablet/phone widths,
   including long copy, missing images, empty collections, variants and filter drawers.
4. Complete authenticated isolated-database save/reopen/publish/hard-reload and
   second-tenant checks. Compare preview and live computed styles and screenshots.
5. Phase 11 is the next planned architecture phase: authoritative first render and
   provider consistency. The findings and acceptance checks above stay open.
