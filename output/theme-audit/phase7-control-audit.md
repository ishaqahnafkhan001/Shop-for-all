# Phase 7 — exposed control wiring

Date: 2026-10-09 (Asia/Dhaka).

**Status:** implementation and isolated service/render verification finished. The
full Phase 7 acceptance gate remains open: authenticated save/publish/hard reload
against a real isolated database and running storefront has not been performed.
This report does not certify deployed end-to-end behavior.

## Actual control path

Editor callbacks update the existing Builder theme state. Group edits use
`updateBuilderThemeSetting`; card style commands retain `updateProductCardSetting`.
Color edits retain `setColorPathValue` / `applyCompatibleColorUpdates`.

Draft: `useAutosaveRecovery` -> `PUT /store-builder/admin/draft` ->
`saveStoreBuilderDraft` -> validation, normalization, capability and ownership
checks -> tenant-scoped StoreBuilderDraft.

Publication: `StoreBuilderPage.publishChanges` -> `PATCH /store-builder/admin` ->
`publishStoreBuilder` -> normalized snapshot, current plan and revision checks ->
Shop.theme + revision record -> public theme loader/effective resolver -> shared
renderer -> DOM and CSS. Builder reload uses `loadBuilderTheme` on returned data.

The API and persistence architecture was retained. No database schema or stored
theme version was changed in this phase.

## Confirmed gaps and repairs

Paths below are relative to the repository root.

| Severity | Location / consumer | Root cause | Repair |
| --- | --- | --- | --- |
| High | Admin `storeBuilderThemeUtils.js`, `StoreBuilderPage.jsx`; catalog layout resolver | Layout column/gap edits changed global defaults, but concrete All Products values always won. | Explicit edit command synchronizes the corresponding catalog fields; existing snapshots and section-specific overrides remain untouched on load. |
| High | `StorefrontPreview.jsx` editor toolbar | Effective sections could be filtered before calculating an index used against the unfiltered draft. | Resolve toolbar commands against original draft IDs/indices; regression clicks the actual Hide callback with an earlier filtered section. |
| High | `referenceCore.jsx:getHeroSlides`, `StorefrontHero.jsx` | When every configured slide was disabled, fallback revived the first disabled slide. | Explicit disabled slides remain disabled; retain a screen-reader store heading. Legacy absent/empty-slide fallback remains compatible. |
| High | `StorefrontSectionRenderer.jsx:HomepageSection` | A second slice limited explicitly selected featured products to one row. | Render every resolved selected product; automatic fallback remains bounded. |
| Medium | `StorefrontHeader.jsx:HeaderNavItem` | Saved megaMenu flag had no rendering branch. | Wide desktop dropdown renders children in columns; mobile drawer retains its existing link behavior. Editor now describes the real behavior. |
| Medium | `StorefrontProductCard.jsx` | Inline borderColor defeated hover border classes. | Base border uses a local CSS variable through a class, allowing the configured hover rule to win. |
| Medium | `StorefrontProductCard.jsx` | Sale badge hardcoded white text and a dark overlay masked configured colors. | Apply saved text/background colors directly. |
| Medium | `StorefrontProductCard.jsx` | Rating visibility depended on review visibility, and review count had no independent render. | Independent rating and review-count controls, conditional on available data. |
| Medium | `referenceCore.jsx`, `presentation/VariantSelector.jsx` | Four saved variant-chip colors had no tokens/consumer. | Shared tokens drive selected and unselected option buttons. |
| Medium | `styles.css` | Secondary-page headings used fixed weights/body font even when heading tokens changed. | Shared h1/h2 rule consumes heading font and weight in both apps. Product-card title weight retains its explicit inline consumer. |
| Medium | `presentation/CheckoutSections.jsx`, `styles.css` | Generic buttons, hardcoded card/gradient colors, and fixed mobile shape overrode checkout settings. | Checkout-specific surfaces, main text, status colors and submit buttons consume checkout tokens; mobile submit uses the configured shape. |
| Medium | `StorefrontSectionVariants.jsx:ReviewsVariantSection` | Selected reviews always won over the editor's manual-text mode. | Honor explicit text mode; selected mode retains text fallback if no approved review is available. |
| Medium | `StorefrontPreview.jsx` | Missing mock Buy callback suppressed the actual Buy button in Home preview. | Provide inert preview action so the shared presentation remains visible. |
| Low | `referenceCore.jsx`, `styles.css` | Nested brand.primary was only a fallback behind concrete section colors. | Add direct primary-brand token consumer for page kicker labels; the existing Apply brand color command still fans out a palette explicitly. |

## Control-family coverage

| Exposed family | Stored paths | Consumer / verified boundary |
| --- | --- | --- |
| Logo and favicon | logoUrl, faviconUrl | Shared header/logo and existing metadata path; existing branding/SEO tests. Actual uploaded-media delivery is a release gate. |
| Navigation | header.variant, navigation labels/URLs/order/children/megaMenu | Shared header + mobile drawer; structural tests; saved wide-menu rendering; browser wide-menu opening verified. |
| Hero | variant, height, overlayOpacity; slide enabled/copy/media/CTA/focal points/order | Shared hero resolver/components; existing hero tests plus disabled-last-slide publication regression. Image-dependent height/overlay controls require an image. |
| Typography | headingFont, bodyFont, headingWeight | Actual editor callbacks -> publication -> tokens; shared heading CSS. Browser Georgia/600 selection visibly applied on checkout. Inter/Roboto local assets remain shared from Phase 6. |
| Layout | widths, spacing, padding/margins, product columns/gap, alignment | Existing token helpers; new actual Layout editor-to-publication/catalog markup test. Explicit section column overrides still take precedence. |
| Catalog | enabled, title, subtitle, desktop/tablet/mobile columns, spacing | Shared All Products renderer; existing contract/layout tests, new synchronized global-edit regression. |
| Product cards | style, fit, aspect, corners, shadow, title size/weight, price size, visibility flags, button style/shape | Actual ProductCardsEditor callbacks for 20 controls -> draft -> publish -> schema hydration -> changed ProductCard markup. Prior inheritance tests cover resets and explicit overrides. |
| Colors | all exposed nested color groups and legacy aliases | Every field in colorSectionGroups passes real service normalization and strict schema reload and changes resolved CSS styles. Existing alias tests remain green. Newly repaired DOM consumers have focused assertions. Browser checkout surfaces/badge examples checked; no claim of pixel testing every color. |
| Sections | type/variant/order/lock/visibility, title/text, products/reviews/categories, banners and media | Existing section registry, structural/hero tests; new selected-product, review-source and original-index command regressions. Data-dependent sections require their respective content. |
| Footer/policies | footer text/contact/social/custom links; policy bodies | Existing shared footer/policy views and tests. Empty policy text intentionally gets the existing policy default. No new policy semantics. |
| Checkout branding | logo, bannerText, trustMessage, buttonStyle | Shared checkout views; configured colors and shape verified in desktop markup/mobile browser. Order submission remains unchanged. |
| Mobile | compactHeader, showBottomNavigation | Existing header/footer consumers; mobile screenshot confirms bottom navigation and action-bar offset. stickyCheckoutButton remains hidden by the shared capability policy because it has no dedicated consumer. |
| Payment providers | paymentSettings.providers | Already disabled and labelled as unavailable; no new payment implementation. |

Product-card controls target the existing catalog/homepage grid renderer. Checkout
line items and the compact related-product link strip retain their own presentation;
this phase does not replace them with cart-action cards. Body-copy, status and
supporting-text styles outside exposed customization remain intentional fixed
presentation values.

### Existing spacing compatibility

The stored padding pair 40/40 and margin pair 0/40 represent automatic legacy
spacing in `getSectionLayout`. Other pairs supply numeric pixel overrides. The
editor now explains this behavior rather than implying that every displayed
default number is an exact CSS measurement. No saved-theme migration or automatic
restyling of these defaults was introduced.

## Verification evidence

- **152 tests passed, zero failures/skips**: `phase7-tests.txt`.
- Twelve new wiring tests, including actual editor callbacks, real draft/publish
  service functions, capability checks, JSON serialization, Mongoose schema
  casting/validation/hydration, effective resolution and rendered output.
- The service harness substitutes database/model I/O, asset ownership/promotion,
  and plan loading with isolated in-memory fixtures. It does not exercise MongoDB
  transactions, HTTP authentication, file storage, deployed caches or real tenants.
- Both production builds pass: `phase7-admin-build.txt` and
  `phase7-storefront-build.txt`.
- `git diff --check` passes.
- Browser fixture: `ecommerce-admin/tests/fixtures/theme-controls.html`. Actual
  typography editor selected Georgia and weight 600. Wide-menu child links opened
  in columns; disabled hero remained hidden; preview Buy actions appeared. Mobile
  checkout visibly showed configured background/cards, brown headings and a purple
  pill submit button. Screenshot: `phase7-mobile-checkout.jpg`.

## Compatibility and release gate

Corrected consumers can intentionally change existing appearance: previously
ignored saved mega-menu, badge, variant-chip, checkout and typography values now
take effect; all-disabled hero slides stop displaying; all selected featured items
are visible. Review these differences on representative existing stores before
release. No schema bump, migration, tenant-query change, production write, deploy
or commit was performed.

To close the full Phase 7 acceptance gate, use an isolated database and tenant:
change each control family in the authenticated Builder, save draft, reopen it,
publish, visit the live storefront directly, hard reload, and compare the relevant
DOM/computed CSS at desktop and mobile widths. Confirm revision increments and a
second tenant remains unchanged. Do not treat this report's in-memory cycle or
synthetic browser fixture as that live acceptance run.

Phase 8 implementation (semantic responsive behavior) is next in sequence. The
Phase 7 real-environment gate must remain recorded until completed.
