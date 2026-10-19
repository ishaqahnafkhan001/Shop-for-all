# Phase 6 — Gallery, Builder and storefront presentation

Completed 2026-10-08 at the shared-code, server-render and local browser smoke-test boundary.

## Problems addressed

| Mismatch | Correction |
| --- | --- |
| Gallery maintained a separate hero snapshot and static preset artwork | Gallery cards render the authoritative StorefrontPreview as a cropped thumbnail. Full previews use the same component. |
| Builder product, cart, checkout and policy pages were independent mockups | Extracted the existing live markup into the existing renderer package and reused it from both applications. |
| Page utilities and provider token aliases existed only in storefront | Both apps import shared CSS; getReferenceThemeStyle owns the aliases. |
| Font selection could fall back differently across surfaces | Bundled the same licensed Inter and Roboto variable font files for both apps. |
| Preview product processing differed and silently truncated after ten products | Shared product/media transformations; removed the cutoff and resolved Collection and CollectionShowcase product references. |
| A scaled parent-document preview did not provide a real CSS viewport | Sandboxed iframe document with mirrored stylesheets; scale only the outer frame. |

## Authoritative paths

Gallery preset + current merchant content -> shared preset resolution -> StorefrontPreview.

Builder draft + merchant data -> StorefrontPreview -> resolveEffectiveTheme.

Live tenant loader -> effective published theme -> live adapter.

All paths use the existing theme/composition registries, shared header/Home/footer,
shared secondary-page presentation, getReferenceThemeStyle and renderer styles.css.
Preview commerce state is mocked. Presentation markup is shared.

## Files and responsibility

- `packages/storefront-renderer/presentation/`: product gallery/details/variants/actions/extras/reviews, cart, checkout, policy and image presentation; injectable link/image runtime.
- `packages/storefront-renderer/normalizeProduct.js`, `media.js`, `imageDomains.js`: shared transformations and existing image optimization allowlist.
- `packages/storefront-renderer/styles.css`, `fonts/`, `reference/referenceCore.jsx`: CSS utilities, licensed local fonts and shared token aliases.
- `ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx`, `StorefrontPreviewFrame.jsx`, `PreviewCommercePages.jsx`: effective resolution, real viewport and mock commerce adapter.
- `ecommerce-admin/src/pages/dashboard/StoreBuilder/themes/ThemeGallery.jsx`: renderer-generated thumbnail and full preview; current-version apply handling.
- `ecommerce-storefront/src/components/product/`, cart route, checkout component facade and policy detail adapter: retain live behavior while consuming shared views.
- `ecommerce-storefront/src/components/storefront/StorefrontPresentationRuntime.jsx`: Next image/link adapter. Existing import paths remain available as facades.
- `ecommerce-admin/tests/fixtures/theme-presentation.html`: local synthetic-data browser fixture, served by the Admin Vite dev server; not part of the production application entry.

## Compatibility and behavior

No schema change, migration or saved-theme rewrite. Existing production presentation
was extracted rather than redesigned. Hardcoded presentation styles still present
in those views remain candidates for the Phase 7 consumer/control audit.

Next image optimization and navigation remain in live adapters. Preview uses native
images and inert links with shared sizing, cropping, alt and fallback components.
Order creation, payment, authentication, review submission, analytics, cart storage
and tenant loading remain outside the shared presentation package.

The preview iframe allows same-origin DOM access for its React portal, but does
not allow document scripts, form submission or navigation privileges. Theme data
continues through the existing sanitizer/resolver. No arbitrary theme HTML is
inserted into srcDoc.

Desktop/tablet/mobile/small-mobile preview widths are 1180/768/390/320 pixels.
Thumbnail height is 740 pixels before scaling; normal preview height is 800.
Fixed mobile actions and bottom navigation now belong to this viewport. Semantic
device overrides and inheritance remain Phase 8 work.

## Verification

- **140 tests passed, 0 failed, 0 skipped**: `phase6-tests.txt`.
- New presentation tests render all nine Gallery presets and 45 preset/page
  combinations, plus empty states and collections referencing products beyond ten.
- Shared variant pricing, stock, zero prices and media metadata are exercised.
- Live commerce callback forwarding and separation of API actions are checked.
- Admin production build passed: `phase6-admin-build.txt`.
- Storefront production build passed: `phase6-storefront-build.txt`.
- `git diff --check` passed.
- Local browser smoke checked Home composition/merchant media, checkout fields,
  mobile product quantity changing from one to two, cart totals and policy text.
  The 390px product frame visibly contains the fixed action bar and bottom nav.
  Screenshot: `phase6-mobile-product.jpg`.
- Browser fixture uses synthetic data without an authenticated tenant or database.
  Gallery's nine-card composition is covered by server-render tests; this is not a
  full browser screenshot matrix of the Gallery modal.

## Remaining gates and rollout notes

- Actual MongoDB publish/restore and authenticated live-store reload are unverified.
  Use an explicitly isolated test database before running integration writes.
- Full preview/live pixel comparisons, all responsive breakpoints, image delivery,
  computed font loading, first-render hydration and cache transitions remain later
  verification gates. The local screenshot does not establish deployed parity.
- Local fonts add approximately 1.37 MB of uncompressed assets; browsers request
  the families used. Font subsetting/compression and thumbnail performance should
  be measured in the later performance/visual gates.
- Rebuild/restart consumers together. During verification, Vite retained an older
  linked-package export until restarted with --force; production builds passed.
- No production writes, deployment or commits were performed. Prior Phase 1–5
  working-tree changes were retained.

Next: **Phase 7**, tracing exposed controls through draft state, save, publish,
reload and component consumption, including section indices after filtering.
