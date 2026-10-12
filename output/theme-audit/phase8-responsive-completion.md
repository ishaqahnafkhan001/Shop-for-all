# Phase 8 - Responsive theme configuration

## Implemented

The existing theme contract, Builder commands, Shop schema and shared renderer
remain authoritative. No separate mobile theme or rendering tree was introduced.

| Setting or behavior | Contract and consumer |
| --- | --- |
| Mobile hero composition | `mobile.heroComposition`: Theme / Image first / Text first. The shared PanelHero changes media/content order below 768px for Split, Editorial and Minimal. Overlay heroes retain their composition and disable this control. |
| Mobile section spacing | `mobile.sectionSpacing`: Theme / Compact / Comfortable / Spacious. Flexible homepage section top margins become 24/32/40px below 768px. Explicit layout margin pairs take priority. Catalog padding and composition slots retain their own rules. |
| Tablet product columns | Optional `layout.productColumnsTablet`, 1-4. Explicit Builder edits also update `allProducts.tabletColumns`. Featured sections inherit it unless they have their own tablet override. |
| Mobile product columns | Catalog and featured grids now honor one column throughout widths below 768px, removing the premature two-column override at 640px. |
| Mobile hero image | The source-image breakpoint now matches the existing mobile focal-point breakpoint: below 768px. |
| Commerce action bars | Product, cart and checkout bars reserve bottom-navigation space on phones only. At tablet widths they sit at the bottom edge; desktop retains normal page actions. |

Existing responsive typography, section visibility, compact-header toggle,
bottom-navigation toggle and desktop-to-drawer navigation remain in use.
No new typography scale or duplicate navigation model was needed for this phase.
Desktop product counts retain the existing gradual 1024/1280/1536px density rules.

## Files

- `packages/storefront-theme/index.cjs`: defaults, enum validation, read normalization,
  optional tablet columns. `capabilities.cjs`: responsive classification.
- `ecommerce-backend/backend/models/Shop.js`: additive persistence fields.
- `ecommerce-admin/src/pages/dashboard/StoreBuilder/editors/BasicEditors.jsx`:
  semantic controls, scope and breakpoint help.
- `StoreBuilderPage.jsx`: passes the existing edit command to MobileEditor.
- `storeBuilderThemeUtils.js`: tablet layout-to-catalog edit mapping.
- `packages/storefront-renderer/designTokens.js`: section spacing and tablet inheritance.
- Shared `reference/StorefrontHome.jsx`, `StorefrontSectionRenderer.jsx`,
  `StorefrontAllProducts.jsx`, `StorefrontHero.jsx`, and `styles.css`: consumers.
- `ecommerce-backend/backend/tests/storefront-control-wiring.test.js`: four new
  normalization, persistence, editor and rendering regressions.
- `ecommerce-admin/tests/fixtures/theme-responsive.{html,jsx}`: synthetic browser fixture.

## Compatibility

Missing mobile fields resolve to Theme, preserving historical rendering.
Missing layout tablet columns remain absent, preserving previously derived featured
columns and the catalog's own saved value. No migration or preset reapplication.
Existing section overrides remain authoritative. All applications must deploy with
the updated shared contract/schema; older writers may not retain the new fields.

Intentional corrections for saved themes: one-column phone grids stay one column
from 640-767px; mobile hero media now applies over that range; tablet commerce bars
no longer leave an empty bottom-navigation gap. Review these at release.

## Verification

- **156 focused tests pass**, zero failures/skips: `phase8-tests.txt`.
- Both production builds pass: `phase8-admin-build.txt`, `phase8-storefront-build.txt`.
- The existing in-memory draft/publish harness exercises the actual services,
  schema validation, serialization, hydration and effective resolver. It does not
  use MongoDB, HTTP authentication or deployed caching.
- Browser used the real iframe viewport and shared renderer, with actual Builder
  controls selecting Image first, Compact spacing and 3 tablet columns.
- Home checked at **320, 390, 640, 767, 768, 1023, 1024, 1180, 1536px**.
  One-column grids and 24px section margin persist through 767px; at 768px grids
  become three columns and spacing returns to the theme's 48px. Split hero becomes
  side-by-side at 1024px. Phone-only section hiding changes at 768px.
- Existing heading sizes respond at the expected breakpoints (30.4/48/60/72px in
  the fixture). Image-first order verified on all three panel variants; text-first
  verified on Split. Overlay variants have no mobile-order override.
- Product, cart, checkout and policy presentations checked at **320, 768, 1180px**.
  No horizontal document overflow. Action bars measure bottom 64px on phones,
  0px on tablets, and display:none on desktop. Header menu trigger is visible on
  phone/tablet and hidden on desktop.
- Raw measurements: `phase8-browser-evidence.json`. Windows iframe scrollbars
  consume 15px of content width; selected viewport widths determine media queries.
- Screenshot: `phase8-mobile-home.jpg`.

Browser automation could inspect the header breakpoint but could not reliably
activate the iframe drawer button (locator action errors); drawer interaction is
not claimed as verified. No order submission, production/database write, deployment
or commit occurred. Full nine-theme visual/parity coverage remains Phase 10/13.
The Phase 7 authenticated real-database save/publish/reload gate remains separately
recorded; the user's report that everything works is not automated evidence of it.

## Next

Phase 9: mobile Store Builder UX using the same model, edit commands, history,
validation and publishing flow.
