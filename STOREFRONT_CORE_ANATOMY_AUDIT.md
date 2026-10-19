# Storefront core anatomy and theme system audit

**Scope:** Read-only source audit of the current Shop for All repository, 20 October 2026. “Verified” means traced to source code or a local automated test; it does not mean a production browser or provider was exercised. No customer or production database was queried. Full file paths are repository-relative. For compact tables, `reference/` means `packages/storefront-renderer/reference/`, `theme/` means `packages/storefront-theme/`, `app/` and `components/` mean `ecommerce-storefront/src/app/` and `ecommerce-storefront/src/components/`, `context/` means `ecommerce-storefront/src/context/`, `editors/` means `ecommerce-admin/src/pages/dashboard/StoreBuilder/editors/`, and backend `models/`, `controllers/`, `services/`, `routes/` and `tests/` mean paths under `ecommerce-backend/backend/`.

## 1. Executive summary

The storefront is one multi-tenant Next.js application backed by one Express/MongoDB service. A shop owns a published `Shop.theme`; nine preset definitions can produce a candidate theme in the Store Builder. Both the builder preview and live home page use the shared `@scaleup/storefront-theme` contract and `@scaleup/storefront-renderer` reference components. The merchant explicitly publishes a candidate; a preset ID by itself does not dynamically change a live storefront. [Verified: `packages/storefront-theme/prebuilt.cjs:617`, `ecommerce-backend/backend/services/storeBuilder/storeBuilderService.js:333`, `ecommerce-storefront/src/app/[subdomain]/page.jsx:76`, `ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx:11`.]

**Actual structural range:** four homepage compositions, three header variants, five named hero variants rendered through two base hero families, 13 registered section types, and eight section families with named treatment variants. There is one product-card DOM structure, one footer structure, and one shared product-detail/cart/checkout structure apiece. Nine presets are combinations of these shared parts. Empty merchant content can collapse the distinctive editorial or boutique companion slots into a simpler page. [Verified: `packages/storefront-theme/index.cjs:13`, `packages/storefront-theme/index.cjs:59`, `packages/storefront-theme/composition.cjs:5`, `packages/storefront-renderer/reference/StorefrontComposition.jsx:13`, `packages/storefront-renderer/reference/StorefrontProductCard.jsx:23`.]

The safest path to more Shopify-like visual range is to extend the existing contract and shared renderer with deliberate, validated component variants while preserving the shop, product, pricing, inventory, cart, checkout, URL, policy, and SEO flows. This report proposes extension points only; it makes no implementation changes.

## 2. Repository architecture and rendering flow

```text
Shop registration → Shop document (branding + default theme) + owner
                         ↓
Admin Store Builder bootstrap ← Shop.theme + products/categories/collections/reviews
                         ↓
Preset selection → resolvePrebuiltTheme(current theme, preset, plan access)
                         ↓
Editor state → autosaved StoreBuilderDraft → publish validation/revision check
                         ↓
Shop.theme + themeRevision + StoreBuilderRevision → cache invalidation
                         ↓
Tenant-resolved public API → server-side Next.js fetch → effective theme
                         ↓
Theme provider/CSS variables → shared header, composition, sections, cards, footer
                         ↓
Customer pages and commerce actions → tenant-scoped backend APIs
```

- **Creation:** `registerShop` creates a `Shop` and owner in `ecommerce-backend/backend/controllers/authController.js:463`; `Shop` supplies theme/branding defaults in `ecommerce-backend/backend/models/Shop.js:347`. Branding asset resolution is in `ecommerce-backend/backend/services/shops/storeBrandingService.js`.
- **Contract:** schema v4, fallback theme, normalization, validation, section registry and structural variants are in `packages/storefront-theme/index.cjs:6`, `:13`, `:59`, `:906`, `:972`. `packages/storefront-theme/effective.cjs` resolves a plan/branding-aware effective theme. `packages/storefront-theme/capabilities.cjs` describes editor and plan permissions.
- **Builder:** `ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx` owns candidate state, preset application and publish; `themes/ThemeGallery.jsx` displays preset candidates. `hooks/useAutosaveRecovery.js` saves a server draft after an idle delay and manages local recovery. `StoreBuilderEditorPanel.jsx` and `editors/*` expose controls.
- **Persistence:** `ecommerce-backend/backend/services/storeBuilder/storeBuilderService.js:85` normalizes and validates; `:170` prepares bootstrap; `:257` saves the per-shop draft; `:333` publishes with expected revision and asset/plan checks; `:569` restores revisions. `models/StoreBuilderDraft.js` and `models/StoreBuilderRevision.js` hold draft/history, while `Shop.theme` is the published source. The service retains 20 revisions. Routes/controllers are `routes/storeBuilderRoutes.js` and `controllers/storeBuilderController.js`; admin routes require authentication, permissions and tenant context.
- **Public data:** `ecommerce-backend/backend/routes/storefrontRoutes.js:94` exposes tenant bootstrap plus theme revision, info, products, categories, collections and commerce routes. `controllers/storeController.js` assembles eligible product/category/collection/section data and applies effective theme; `services/storeBuilder/effectiveThemeService.js` handles the live effective theme. A separate public builder-settings path is in `controllers/storeBuilderController.js:717`.
- **Next.js:** `ecommerce-storefront/src/app/[subdomain]/layout.jsx:15` obtains published shop settings, wraps tenant pages with `StorefrontThemeProvider`, shared navigation/footer and cart context. `page.jsx:76` obtains homepage bootstrap; `StorefrontHomeClient.jsx:178` passes it into shared `ReferenceStorefrontHome`. `lib/storefrontServer.js:72` performs backend fetches with timeouts/revalidation; `lib/storefrontPublishedSettings.js:7` caches settings per server request. `StorefrontRevisionWatcher.jsx` polls the published revision and refreshes when it changes. Failure to obtain a tenant theme throws instead of borrowing another store's fallback (`StorefrontThemeProvider.jsx:18`).
- **Renderer:** `packages/storefront-renderer/reference/StorefrontHome.jsx` renders hero, sections and catalog through `StorefrontComposition.jsx`; `referenceCore.jsx:189` maps theme to CSS variables; `styles.css` and fixed Tailwind utilities finish the UI. Preview supplies the same reference header/home/footer and selected shared commerce views.

## 3. Complete storefront component inventory

Classification key: **R** core required for the applicable flow; **C** conditionally required when enabled or data exists; **O** optional; **D** decorative. Ownership: **P** platform, **M** merchant/shop, **T** theme presentation, **U** customer/session, **X** derived. Customization: **F** configurable, **Ptl** partial, **Pr** preset-led, **H** hardcoded, **N** unavailable. Variation: **L** layout, **S** styling, **O** order, **V** visibility, **B** behavior must remain. Multiple ownership tags mean separate content and presentation owners.

| Component / responsibility | Importance | Ownership | Customization | Variation | Source and evidence |
|---|---|---|---|---|---|
| Shop identity, name, subdomain and verification | R | M/P | Ptl | S; B | `models/Shop.js:221`; `reference/StorefrontHeader.jsx:57`, `:197`; `reference/StorefrontFooter.jsx:102` |
| Logo, fallback text mark, favicon | C | M | Ptl | S; B | `models/Shop.js:66`, `:347`; `services/shops/storeBrandingService.js`; `StorefrontHeader.jsx:57`; tenant metadata in `app/[subdomain]/layout.jsx` |
| Tenant layout, theme provider and tokens | R | P/T | Ptl | S; B | `app/[subdomain]/layout.jsx:15`; `components/storefront/StorefrontThemeProvider.jsx:15`; `reference/referenceCore.jsx:189` |
| Header/navigation, desktop dropdown and mobile menu | R | M/T/P | Ptl/Pr | L/S; B | `reference/StorefrontHeader.jsx:83`, `:180`, `:290`, `:314`; `editors/NavigationEditor.jsx` |
| Search modal and results within it | C | P/U | Ptl | S; B | `components/storefront/Navbar.jsx`, `components/search/SearchModal.jsx`; modal is populated from a limited product fetch, not a dedicated results route |
| Cart/account/order tracking controls | R | P/U | Ptl | S; B | `reference/StorefrontHeader.jsx:235`; `:339`; `reference/StorefrontFooter.jsx:129` |
| Hero slides, text, media, CTA and mobile treatment | C | M/T | F/Pr | L/S/V | `reference/StorefrontHero.jsx`; `editors/HeroEditor.jsx:8`; `models/Shop.js:420` |
| Homepage composition and flexible section order | C | T/M | Pr/Ptl | L/O/V | `theme/composition.cjs:5`, `reference/StorefrontComposition.jsx:13`; `editors/DynamicSectionsEditor.jsx` |
| Featured products and full catalog grid | C | M/P/T | Ptl | L/S/O/V; B | `reference/StorefrontSectionRenderer.jsx`; `reference/StorefrontAllProducts.jsx`; `models/Product.js` |
| Category links/cards and category pages | C | M/T/P | Ptl | L/S/O/V; B | `reference/StorefrontSectionVariants.jsx`; `app/[subdomain]/categories/[slug]/page.jsx:134` |
| Collections and curated product sections | C | M/T/P | Ptl | L/S/O/V; B | `models/Collection.js`; `reference/StorefrontSectionRenderer.jsx`; `app/[subdomain]/collections/[slug]/page.jsx:98` |
| Product card information and actions | R in lists | P/M/T/U | Ptl | S/V; B | `reference/StorefrontProductCard.jsx:23`; one anatomy; backend product serializer and stock/pricing |
| Product detail, variants, gallery, quantity, add/buy | R for purchasing | P/M/U/T | Ptl | S; B | `app/[subdomain]/products/[id]/page.jsx:87`; `presentation/ProductDetailsView.jsx` and product-data hooks |
| Cart persistence and cart page | R for checkout | P/U | Ptl | S; B | `context/CartContext.jsx`; `app/[subdomain]/cart/page.jsx:14`; `presentation/CartView.jsx` |
| Checkout forms, shipping, coupon, OTP and order submit | R for purchase | P/U/M | Ptl | S; B | `app/[subdomain]/checkout/page.jsx:35`; `checkout/components/CheckoutSections.jsx`; backend order routes/services |
| Policies and consent links | C, required by checkout where applicable | M/P | Ptl | S; B | `app/[subdomain]/policies/page.jsx`; `policies/[type]/page.jsx`; `theme/policies.cjs`; `reference/StorefrontFooter.jsx:81` |
| Reviews, FAQ, trust badges and brand story | O/C | M/T | Ptl/Pr | L/S/O/V | `theme/index.cjs:59`; `reference/StorefrontSectionVariants.jsx`; `editors/DynamicSectionsEditor.jsx` |
| Banners, promo text and sale popup | O | M/P/T | Ptl | L/S/V; B for links/timing | `models/Banner.js`; `controllers/storeController.js:35`; `StorefrontHomeClient.jsx:45`, `:106` |
| Newsletter-labelled content block | O | M/T | Ptl | L/S/O/V | `reference/StorefrontSectionVariants.jsx:309`; **no subscription input or submit action here** |
| Footer content, links, policies and mobile bottom nav | R shell / O extra content | M/T/P | Ptl | S/V; B | `reference/StorefrontFooter.jsx:99`, `:220`; `editors/FooterEditor.jsx:12` |
| SEO metadata, sitemap, robots, redirects | R for discoverability | M/P/X | Ptl | B | `app/[subdomain]/storefrontPageMetadata.js`; `robots.txt/route.js`; `sitemap.xml/route.js`; product/category/collection `page.jsx` metadata |
| Account and order tracking/returns | C | P/U | N/Ptl | S; B | `app/[subdomain]/account/page.jsx:13`; `track/page.jsx:99`; these own page structures |
| Empty/loading/error treatment | C | P | H/Ptl | S; B | `app/[subdomain]/loading.jsx`; product/checkout `loading.jsx`; page-level empty/error branches and Next.js `notFound()` |

Identity data is mandatory at shop level; logo, favicon, tagline, social links, individual sections and trusted badges are optional. Pricing, stock and product availability are derived from commerce data and must never be supplied by a visual preset.

**All 13 registered homepage section types** (`packages/storefront-theme/index.cjs:59`):

| Type | Importance; ownership | Customization and variation | Rendering status |
|---|---|---|---|
| FeaturedProducts | C; M/P/T | Ptl; order, grid, source, visibility | Product section; merchant-selectable |
| Collection | O; M/T | Ptl/legacy; variant, source, visibility | Renders, but `editorEnabled: false` |
| CategoryList | C; M/T | Ptl; four variants, order, visibility | Category links; merchant-selectable |
| Banner | O; M/T | Ptl; three variants, media/copy/order | Image section; merchant-selectable |
| TextBlock | O; M/T | Ptl; copy/order/visibility | Generic text section |
| Newsletter | O; M/T | Ptl; three visual variants | Text/icon only, no subscription form |
| Reviews | O; M/T | Ptl; three variants and review source | Review section when data/copy exists |
| FAQ | O; M/T | Ptl; copy/order/visibility | Text-derived FAQ section |
| TrustBadges | O; M/T | Ptl; copy/order/visibility | Text-derived trust item section |
| BrandStory | O; M/T | Ptl; five variants, media/copy | Story section; editorial/boutique companion eligible |
| PromoBlock | O; M/T | Ptl; three variants, copy | Promotional text block, separate from timed sale popup |
| BrandShowcase | O; M/T | Ptl/legacy; copy/media | Renders, but `editorEnabled: false` |
| CollectionShowcase | O; M/T | Ptl/legacy; three variants/source | Renders, but `editorEnabled: false` |

The homepage catalog has actual category/price/rating/stock filters, sorting and numbered pagination (`StorefrontHomeClient.jsx:181`, `:243-271`; `StorefrontAllProducts.jsx:312`). Search is a separate modal that filters only the products fetched into it. There is no standalone announcement-bar renderer; the nearest promotional surfaces are hero, Banner/PromoBlock, launch banners and sale popup. No footer newsletter form or payment-method icon strip was found in the shared footer.

## 4. Essential functional requirements

Every purchasable theme must keep tenant resolution, public-product eligibility, canonical product/category/collection routes, accessible navigation, correct price/discount/stock display, variant selection, add-to-cart, quantity rules, cart continuity, checkout validation, server-side order pricing and inventory enforcement, policy consent, and order feedback. A theme may move or restyle controls but cannot replace backend commerce authority. The header and footer must preserve routes to essential account/cart/track/policy functions even when section merchandising is sparse. `ecommerce-backend/backend/routes/storefrontRoutes.js:94`, `StorefrontProductCard.jsx:23`, `app/[subdomain]/checkout/page.jsx:35`, and `StorefrontFooter.jsx:81` show these paths.

Keyboard focus, labels, image alternatives and sensible mobile behavior are functional requirements, not optional visual polish. Existing examples include product-card button labels, image alt and focus styles in `StorefrontProductCard.jsx`. A future renderer variant must carry them forward.

## 5. Store identity and shared merchant data

| Data | Source of truth and validation | Current use | Theme switch boundary |
|---|---|---|---|
| Name, subdomain, verification | `models/Shop.js`; registration in `controllers/authController.js:463`; tenant middleware | Header/footer, metadata, badges | Preset does not own or replace |
| Logo, favicon, hero asset references | `Shop.branding` / `Shop.theme` legacy fields; `services/shops/storeBrandingService.js`; asset ownership check during publish | Header, metadata, hero | `resolvePrebuiltTheme` copies logo/favicon and existing hero content; verify asset ownership before publish |
| Tagline, hero copy, CTA | Branding and theme hero fields | Hero and shop metadata where used | Presentation fields change, merchant text and media retained |
| Navigation | Published `Shop.theme.navigation`; builder navigation editor and theme normalization | Header/footer links | Explicitly copied unchanged by preset application |
| Footer/contact/social | Published `Shop.theme.footer`; `FooterEditor.jsx:12` | Shared footer | Explicitly copied unchanged |
| Policies | Published `Shop.theme.policies`; defaults from `theme/policies.cjs`/backend | Policy pages, footer and checkout | Explicitly copied unchanged; merchant remains responsible for correctness |
| SEO | Published `Shop.theme.seo` plus product/category/collection data | Metadata and sitemap | Explicitly copied unchanged |
| Catalog, categories, collections, inventory | Separate tenant-scoped models; public queries/serializers | Home, category, collection, product, checkout | Not part of preset; should never be rewritten by switching |
| Payment/shipping | `Shop` and backend commerce configuration; `theme.paymentSettings` is also stored | Checkout/backend order processing | Preset preserves `paymentSettings`; editor describes it as scalable storage, while current checkout submits COD |

`packages/storefront-theme/prebuilt.cjs:617` is the critical boundary: it replaces color, typography, header/hero presentation, layout, product-card settings, mobile settings and section blueprint, then copies logo, favicon, navigation, footer, policies, SEO, payment settings and checkout branding from the current theme. `buildHomepageSections` (`:566`) retains existing section content but can change order, presentation settings and enabled status. It automatically enables FeaturedProducts/CategoryList; other blueprint sections need actual merchant content (`:520`). **Preserved does not mean visually unchanged:** new palette/layout can change the appearance of retained content. Plan restrictions can also retain existing structure (`:650`).

## 6. Storefront pages and reusable layouts

| Route | Actual page behavior / main renderer | Template variation |
|---|---|---|
| `/{subdomain}` | `app/[subdomain]/page.jsx:76` server bootstrap → `StorefrontHomeClient.jsx:178` → shared `ReferenceStorefrontHome` | Four composition identities plus section variants |
| `/{subdomain}/products/{id}` | Server product/info and metadata; shared product-details presentation | One product-detail structure |
| `/{subdomain}/categories/{slug}` | Tenant category filters and products; `CategoryPageClient.jsx` | Own grid page, token/card styling, no preset-specific template |
| `/{subdomain}/collections/{slug}` | Tenant collection metadata/products; `CollectionPageClient.jsx` | Own grid page, no preset-specific template |
| `/{subdomain}/cart` | `cart/page.jsx` and shared CartView | One cart structure |
| `/{subdomain}/checkout` | `checkout/page.jsx` plus shared CheckoutSections, hooks for cart refresh, totals, coupon, form and phone OTP | One checkout structure; current submit sets `paymentMethod: "COD"` at `:341` |
| `/{subdomain}/policies`, `/policies/{type}` | Index and individual merchant policies through shared policy presentation | One policy presentation |
| `/{subdomain}/account` | Login/account/order list in `account/page.jsx:13` | Own page structure; theme shell inherited |
| `/{subdomain}/track` | Order access, tracking, cancellation/returns in `track/page.jsx:99` | Own page structure; theme shell inherited |
| `/{subdomain}/signup` | Route file exists, but `signup/page.jsx` is entirely commented out | **No active signup page component verified** |
| `/{subdomain}/robots.txt`, `/sitemap.xml`, `/sitemaps/{name}` | SEO route handlers | Data responses, no visual template |

The repository also has platform root/marketing and legal routes outside `[subdomain]`; they are not merchant theme variants. There is no dedicated tenant search-results page in the route tree: the header opens a search modal. Missing product/category/collection pages call Next.js `notFound()`; no separate tenant-themed `not-found.jsx` or `error.jsx` was found. Loading files exist at tenant root, product and checkout. Checkout order-success feedback is in the checkout flow rather than a dedicated order-confirmation route.

## 7. Styling system and design tokens

| Property | Definition → consumption | Actual control and caveat |
|---|---|---|
| Colors | `theme/index.cjs:1054` groups brand/header/hero/card/catalog/sections/footer/checkout; `reference/referenceCore.jsx:189` converts to `--sf-*` variables; renderer/CSS use them | Color editor and presets change many surfaces in both preview/live. Some utility classes still use fixed white/slate, notably product media, social controls and mobile nav. |
| Typography | `theme/index.cjs:834`; `referenceCore.jsx`/`packages/storefront-renderer/styles.css` font variables and local Inter/Roboto font faces | Heading/body font, weight and base size selectable from supported list; component-specific fixed weights/sizes remain. |
| Width/spacing/grids | `theme.layout`, `theme.allProducts`, section settings; `packages/storefront-renderer/designTokens.js` and `referenceCore.jsx` map widths/gaps/columns | Builder exposes width, density, section padding/margin and desktop/tablet/mobile columns. Some fixed Tailwind paddings and responsive breakpoints remain. |
| Header | `theme.header.variant` and `StorefrontHeader.jsx:290` | Three structures: standard, minimal, centered. Header is sticky (`:314`); `menuStyle` is stored but no renderer branch on it was found. `logoPosition` is normalized/forced Left by preset application and has no independent renderer placement branch. |
| Hero | `theme.hero.variant`, height, opacity, slides/media and `StorefrontHero.jsx` | Five named treatments. Centered/fullBleed share overlay-family renderer; split/editorial/minimal share panel-family renderer. Mobile image/copy order applies to panel heroes; overlay heroes keep their composition. Image media is implemented; no theme hero video renderer was found. |
| Cards/buttons | `theme.productCard`, `StorefrontProductCard.jsx:23`; `theme/index.cjs:847` | Card radius, shadow, ratio, image fit, text sizes, button style/shape and content flags render. `productCard.style` selects default field values, **not a separate card anatomy**. Fixed card internals and white/slate states limit diversity. |
| Section variants | `theme/index.cjs:13`, `StorefrontSectionVariants.jsx`, `StorefrontSectionRenderer.jsx` | Specific families have different branches; other section types share generic treatment. Missing content can suppress a section. |
| Footer | `theme.footer`, footer color tokens, `StorefrontFooter.jsx:99` | Content/colors and bottom-nav visibility change; no footer structural variant. Desktop columns/mobile accordions are responsive forms of one implementation. |
| Motion/responsiveness | `packages/storefront-renderer/styles.css`, component Tailwind classes, JS preview viewport signals | Hero rotation, card hover, dropdowns, mobile nav and media layout. Breakpoints are largely fixed CSS; preview devices emulate widths but do not create new business behavior. |

Global storefront CSS defaults in `ecommerce-storefront/src/app/globals.css` and `packages/storefront-renderer/styles.css` provide fallback surfaces and spacing. `--sf-radius` is fixed in CSS; there is no global theme radius token despite separate card/image radii. The admin preview mounts a `.sf-presentation` frame with `getReferenceThemeStyle`, so tokenized renderer parts normally see the same variables. Fixed utility classes still apply in both places.

## 8. Currently available customization controls

The Store Builder exposes preset selection, brand logo/favicon, colors, typography, layout/grid/density, mobile composition and bottom navigation, hero slides/images/text/overlay/height, section add/order/visibility/content, navigation, card styling/display fields, footer links/contact/social/content, checkout branding, policies, SEO status and custom domain. Key editors: `BasicEditors.jsx:6`, `:47`, `:63`, `:125`, `:144`; `HeroEditor.jsx:8`; `ColorEditor.jsx:13`; `ProductCardsEditor.jsx:20`; `DynamicSectionsEditor.jsx`; `NavigationEditor.jsx`; `FooterEditor.jsx:12`; `CheckoutEditor.jsx:7`. The `settingsRegistry.js` is a navigation/search index, not the full theme schema.

Controls are plan-aware: `theme/capabilities.cjs` and backend `assertStoreBuilderUpdateAllowed` govern merchant edits, with the backend retaining authority. Advanced composition and structural variants are primarily applied through the theme gallery; `BasicEditors.jsx:68` explicitly directs users to the gallery for composition. Draft/preview changes are not live until publish. Some settings are present as future-looking storage: `CheckoutEditor.jsx:26` says `paymentSettings` does not change the current checkout flow. UI visibility of a control alone is not proof that a separate renderer exists.

## 9. Nine-theme structural comparison matrix

Baseline below uses `resolvePrebuiltTheme(FALLBACK_THEME, presetId)`. “Order” lists the automatically usable category/featured sections first; later blueprint entries are **content-gated**, and `editorial`/`boutique` composition can hoist a content-bearing companion into a layout slot. Every preset uses the same footer/product-detail/cart/checkout implementation and product-card DOM.

| Preset | Header / hero / composition | Baseline homepage order; optional treatments if merchant content exists | Category / card / catalog | Font; key palette; density; mobile | Distinct rendered effect |
|---|---|---|---|---|---|
| Modern General v2 | Standard / split medium / standard | Category → Featured; Promo strip, Collection grid, Reviews cards, Newsletter boxed | Cards; Modern defaults, 4 desktop × 2 mobile | Inter/Inter; teal `#0f766e`, pale slate; comfortable; bottom nav | Balanced general layout |
| Minimal General v2 | Minimal / minimal compact / standard | Featured → Category; BrandStory standard, Newsletter minimal | Cards; Minimal defaults, 3×2 | Arial/Arial; charcoal `#111827`, white; spacious; no bottom nav | Less dense header/hero and catalog |
| Modern Fashion v2 | Centered / fullBleed tall / standard | Category → Featured; Banner overlay, Story imageRight, Collection grid, Reviews quote, Newsletter fullWidth | Image grid; Premium defaults, portrait, 4×2 | Georgia/Inter; rose `#be123c`, near-white; spacious; bottom nav | Image-led campaign treatment |
| Editorial Fashion v3 | Minimal / editorial tall / editorial | Category → Featured by default; Story editorial companion when populated, Collection mosaic, Reviews minimal, Newsletter minimal | Editorial category; Minimal defaults, portrait, 3×2 | Georgia/Georgia; burgundy `#7f1d1d`, ivory; spacious; no bottom nav | Asymmetric hero/story spread only when story content exists |
| Luxury Jewellery v3 | Centered / centered tall / boutique | Category → Featured by default; Collection spacious + Story fullWidth may fill gallery; Reviews quote, TrustBadges, Newsletter boxed | Image grid; Premium defaults, square, 3×2 | Georgia/Inter; gold `#b7791f`, near-black; spacious; bottom nav | Dark palette and curated gallery only with collection/story content |
| Minimal Jewellery v2 | Minimal / minimal compact / standard | Featured → Category; Story standard, Reviews minimal | Circles; Minimal defaults, square, 3×2 | Georgia/Inter; green `#047857`, off-white; spacious; no bottom nav | Gallery-like spacing, same basic skeleton as Minimal General |
| Soft Beauty v2 | Centered / split medium / standard | Category → Featured; Banner split, Story imageRight, Reviews cards, FAQ, Newsletter boxed | Circles; Modern defaults, portrait, 3×2 | Georgia/Arial; pink `#c0266d`, near-white; spacious; bottom nav | Softer palette and content mix |
| Modern Electronics v3 | Standard / split compact / discovery | Category companion → Featured; Promo strip, Collection grid, TrustBadges, FAQ | Cards; Modern defaults, square, 4×2 | Inter/Roboto; blue `#2563eb`, pale slate; compact; bottom nav | Two-column hero/category discovery desk |
| Fresh Grocery v2 | Standard / centered compact / standard | Category → Featured; Promo split, Collection spacious, TrustBadges, Newsletter fullWidth | Circles; Modern defaults, square, 4×2 | Arial/Inter; green `#15803d`, light lime; comfortable sections/compact grid; bottom nav | Category-first rhythm and bright palette |

Evidence: individual definitions in `packages/storefront-theme/prebuilt.cjs:280-480`, section content gate at `:520-566`, composition in `packages/storefront-theme/composition.cjs:5` and `packages/storefront-renderer/reference/StorefrontComposition.jsx:13`. This matrix describes current implementation, not a claim of nine independent design systems or industry-specific commerce behavior. All use shared product/order logic. The “Modern/Minimal/Premium” card labels produce different normalized settings (`theme/index.cjs:847`) rather than different card component trees.

## 10. Content ownership and data flow

| Content/action | Admin/source → API/persistence → live rendering | Preset switch effect |
|---|---|---|
| Shop identity/branding | Registration/admin branding → `Shop` + asset resolution → public shop info → header/hero/metadata | Preserve identity and merchant media; hero presentation changes |
| Navigation/footer/policies/SEO | Builder editors → draft → publish `Shop.theme` → tenant settings → header/footer/policy pages/metadata | `applyPresentation` copies merchant values unchanged |
| Hero and flexible sections | Builder media/content/ordering → validated theme and asset ownership → `Shop.theme.homepageSections` → home renderer | Content retained; blueprint may reorder, change variants and disable empty optional sections |
| Products/categories/collections/reviews | Dedicated tenant models and admin workflows → storefront bootstrap/public APIs → shared cards/sections/pages | Preset only changes selection/presentation settings, not underlying records |
| Promotions/launch banners/sale popup | Banner/sale models and public bootstrap → `StorefrontHomeClient.jsx:106` and popup | Independent runtime data; preset does not own campaign scheduling |
| Cart/session | Customer actions → subdomain-keyed browser cart → cart/checkout product refresh → backend order API | Layout may change; state and validation must persist |

Public product selection filters by tenant and storefront eligibility in `controllers/storeController.js` and `services/products/publicProductQueryService.js`; final order computations remain backend concerns. Preview receives builder bootstrap products/categories/reviews and can simulate cart actions, but its data snapshot and link behavior are intentionally different from live API interactions.

## 11. Preview versus live storefront consistency

**Shared verified paths:** `StorefrontPreview.jsx:11` imports `ReferenceStorefrontHeader`, `ReferenceStorefrontHome`, `ReferenceStorefrontFooter` and `getReferenceThemeStyle`; live `Navbar.jsx`, `StorefrontHomeClient.jsx` and `StorefrontFooter.jsx` wrap those same reference components. Preview resolves the candidate with `resolveEffectiveTheme`; the backend applies an effective theme for live settings, and both paths use the shared renderer. `PreviewCommercePages.jsx` uses shared product-detail, cart, checkout and policy presentation components. `StorefrontPreviewFrame.jsx` isolates the preview with its own viewport. Existing `ecommerce-backend/backend/tests/storefront-preview-parity.test.js` compares rendered output across nine presets and two plan states. **Audit validation:** 52 focused tests across preview parity, preset resolution, controls and theme merge passed locally (`node --test`); no live browser or provider was exercised.

**Expected differences:** preview uses candidate/draft theme and sampled builder data, prevents navigation/submission, and emulates device widths; live uses published theme, fresh tenant API results, real navigation/cart/checkout and server metadata. The preview cannot prove fulfillment, live stock, payment or responsive behavior on every device. A thumbnail can also mislead when content-gated sections are empty. No evidence of a separate preset-specific live renderer was found.

## 12. Hardcoded structures and customization limitations

1. **One product-card anatomy (verified):** `StorefrontProductCard.jsx:23` uses the same image → text/price → badges → actions tree for every preset. `theme/index.cjs:847` applies style defaults; no `productCard.style` branch exists in renderer. A truly editorial/marketplace card needs a new renderer variant without duplicating pricing/actions.
2. **One footer structure (verified):** `StorefrontFooter.jsx:99` has responsive desktop/mobile forms but no `footer.variant`. Presets preserve footer content and only palette changes its look.
3. **Most non-home pages have fixed composition (verified):** product detail, cart, checkout, account, tracking, category and collection pages do not select per-preset page templates. Token styling is shared; several page-local utility classes remain.
4. **Limited homepage skeletons (verified):** four compositions, and two depend on populated companion sections. `StorefrontComposition.jsx` always finishes with the same catalog; section reordering alone cannot create wholly different storefront architectures.
5. **Stored settings without distinct rendering (verified):** header `menuStyle` and `logoPosition` are normalized/stored, but no independent header renderer branch was found; `CheckoutEditor.jsx:26` explicitly treats payment settings as storage while checkout submits COD; `Newsletter` is text-only. Do not advertise these as functioning layout/payment/signup controls.
6. **Fixed styling (verified):** card image gradient, some icon/surface colors, footer social circles/mobile nav, padding, border radius and breakpoint utilities are hardcoded in reference components. CSS variables cover much, but not every visible surface.
7. **Search scope (verified from code path):** header search opens a modal fed by a bounded product request rather than a dedicated paginated search-results route. This restricts discovery independently of theme styling.
8. **Campaigns are separate (verified):** sale popup/launch banners come from bootstrap campaign data and `StorefrontHomeClient`, not the section/preset schema. A new theme must keep their links, timing and dismissal behavior compatible.
9. **Legacy and compatibility paths (verified):** `theme/index.cjs:64`, `:85`, `:88` retains `Collection`, `BrandShowcase` and `CollectionShowcase` renderers while disabling direct editor creation; Banner accepts a `BannerGrid` migration alias (`:73`). `productGridStyle` remains alongside newer layout gap settings (`:825`). Existing compatibility fields should be measured before removal; their presence is not evidence of a second active theme engine.

These are implementation limits, not proof of an existing production failure. The exact visual impact depends on merchant content and device; visual acceptance testing remains needed.

## 13. Functionality that themes must preserve

**Functional invariants:** tenant-scoped shop lookup and API calls; published theme isolation; product and variant IDs; route slugs and redirects; backend-owned prices, discounts, tax/shipping and inventory; cart keys and persistence; checkout OTP, coupon, consent and idempotency; order creation/tracking/returns; authentication and authorization. Theme settings must never become a source of commercial truth. Reference paths: `routes/storefrontRoutes.js:94`, `controllers/storeController.js`, `app/[subdomain]/checkout/page.jsx`, `context/CartContext.jsx`, `app/[subdomain]/track/page.jsx`.

**Content-preservation rules:** keep shop identity, logo/favicon, merchant media and copy, navigation, footer/contact/social links, policies, SEO and checkout branding when switching presets; retain product/category/collection records and merchant-selected section content. Existing behavior in `prebuilt.cjs:566-650` is the baseline to protect. Reordering or visibility changes should be explicit and reversible, particularly for content-gated sections.

**Changeable presentation:** homepage composition, header/hero layout, visual hierarchy, typography, color, responsive composition, section order/variants, card treatment, density, buttons and decorative surfaces. Preserve semantic headings, accessible names, focus/keyboard behavior, image alt, readable contrast and metadata even when DOM layout changes.

**Genuinely fixed today:** shared cart/checkout mechanics and current COD submission; one footer/card anatomy and most inner-page layouts. These are current implementation facts, not permanent design requirements.

## 14. Theme extensibility assessment

| Desired design range | Current status | Smallest credible change |
|---|---|---|
| Multiple header structures | Already supported, three variants | Extend header variant enum and shared renderer for substantially new anatomy |
| Different homepage skeletons | Already supported, four | Add a composition identity/slot plan; reuse existing section renderer |
| Asymmetric editorial layout | Already supported conditionally | Supply real BrandStory content; refine composition if greater asymmetry needed |
| Minimal gallery | Partly supported by standard + spacing/cards | New composition/card variant for a genuinely different gallery |
| Dense marketplace layout | Partly supported by discovery and 4-column grid | New density/card/list layouts and full search/discovery UX; keep commerce APIs |
| Category-first storefront | Already supported | Preset section order or discovery companion |
| Distinct product-card systems | **Requires new renderer variant** | Validated `productCard.variant` with shared price/actions subcomponents |
| Alternative footer layouts | **Requires new renderer variant** | Add `footer.variant` with existing links/contact/policies as common data |
| Page-specific templates | **Requires architectural extension** | Page-level presentation slots for product/collection/checkout; reuse flow hooks and shared data |
| Optional industry merchandising | Section types already support some | Add only content-backed, validated optional section renderers; no new commerce backend unless needed |

No need for nine separate storefront applications. The existing theme contract, preview/live shared renderer, composition planner and tenant APIs are the extension seam.

## 15. Recommended architectural extension points

1. **Specify visual contracts first:** add documented, bounded variant IDs to `packages/storefront-theme/index.cjs` for cards/footer and any new page layouts. Define fallback behavior and migration/normalization so existing shops render unchanged.
2. **Extend shared renderer:** branch only inside `packages/storefront-renderer/reference/*` for component anatomy; keep product price, stock, links, actions and accessibility in common primitives. Add CSS variables or tokens for surfaces currently fixed by utility classes.
3. **Use composition slots:** extend `composition.cjs` and `StorefrontComposition.jsx` for new skeletons, with missing-content behavior tested. Keep one section registry and server-derived eligible data.
4. **Keep editor and live parity:** surface validated choices through existing Store Builder editors/capabilities; preview should render the candidate through the same components while publish still validates assets, plan and revision. Do not create a parallel preview renderer.
5. **Protect switching:** retain the merchant-content merge in `prebuilt.cjs`, expose a change summary of order/visibility effects, and preserve prior revision recovery. Snapshot tests should cover all presets with empty and populated content, desktop/mobile and limited/full plan.
6. **Decouple page layout from commerce:** if product/collection templates are added, make presentation consume existing product-data, cart and checkout hooks. Do not move stock/pricing/order decisions into theme code.

## 16. Unknowns, risks, and unverified behavior

- No live production shop, real browser-device matrix, analytics, accessibility audit or MongoDB data was examined. Actual merchant content can materially change each preset's output.
- The read-only investigation verifies code paths, not whether every current server deployment has matching package versions, cache state or all required media assets. Revision watcher timing and server cache behavior should be exercised in staging before broad rollout.
- The parity test covers rendered reference output for nine presets/two plan states, not every page interaction, campaign state, keyboard path or viewport. Preview uses simulated data and disables navigation.
- `signup/page.jsx` contains commented code only. A customer signup route or alternate auth mechanism elsewhere should be verified before presenting account creation as supported on the storefront.
- Search modal's bounded data source means results may be incomplete; no dedicated search route was found in the tenant Next.js route tree. This is a discovery limitation, not a claim that backend search is absent.
- Payment settings are stored but current checkout explicitly submits COD; provider enablement and live payment support require separate backend/frontend verification before design work advertises them.
- The audit did not run a full build or live API tests because it did not change source; existing source may have unrelated working-tree modifications. These were left untouched.

## 17. Important file paths and references

| Area | Primary files |
|---|---|
| Theme contract/default/validation | `packages/storefront-theme/index.cjs:6`, `:13`, `:59`, `:906`, `:972`; `effective.cjs`; `capabilities.cjs`; `composition.cjs:5` |
| Preset definitions/switch merge | `packages/storefront-theme/prebuilt.cjs:280-480`, `:520`, `:566`, `:617`, `:650` |
| Shared homepage/header/hero/cards/footer | `packages/storefront-renderer/reference/StorefrontHome.jsx`; `StorefrontComposition.jsx:13`; `StorefrontHeader.jsx:180`; `StorefrontHero.jsx`; `StorefrontProductCard.jsx:23`; `StorefrontFooter.jsx:99` |
| Section and CSS mapping | `packages/storefront-renderer/reference/StorefrontSectionRenderer.jsx`; `StorefrontSectionVariants.jsx:309`; `referenceCore.jsx:189`; `packages/storefront-renderer/styles.css` |
| Admin gallery/editor/preview | `ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx`; `themes/ThemeGallery.jsx`; `StorefrontPreview.jsx:11`; `PreviewCommercePages.jsx`; `editors/*`; `hooks/useAutosaveRecovery.js` |
| Backend theme persistence/API | `ecommerce-backend/backend/models/Shop.js:347`; `models/StoreBuilderDraft.js`; `models/StoreBuilderRevision.js`; `services/storeBuilder/storeBuilderService.js:170`, `:257`, `:333`; `controllers/storeBuilderController.js`; `routes/storeBuilderRoutes.js` |
| Public bootstrap/tenant commerce | `ecommerce-backend/backend/controllers/storeController.js`; `services/storeBuilder/effectiveThemeService.js`; `routes/storefrontRoutes.js:94`; `middlewares/tenant.js` |
| Live Next.js data/render | `ecommerce-storefront/src/app/[subdomain]/layout.jsx:15`; `page.jsx:76`; `StorefrontHomeClient.jsx:178`; `src/lib/storefrontServer.js:72`; `src/lib/storefrontPublishedSettings.js:7`; `src/components/storefront/StorefrontThemeProvider.jsx:15` |
| Commerce and SEO pages | `ecommerce-storefront/src/app/[subdomain]/products/[id]/page.jsx:87`; `categories/[slug]/page.jsx:134`; `collections/[slug]/page.jsx:98`; `cart/page.jsx:14`; `checkout/page.jsx:35`; `account/page.jsx:13`; `track/page.jsx:99`; `storefrontPageMetadata.js` |

**Audit result:** the platform has a coherent shared theme/rendering core and safe merchant-content preservation seams. Its strongest current visual differentiation is homepage composition, hero/header treatment, density, palette and section presentation. True card, footer and inner-page template diversity needs narrowly scoped variants in that same core.
