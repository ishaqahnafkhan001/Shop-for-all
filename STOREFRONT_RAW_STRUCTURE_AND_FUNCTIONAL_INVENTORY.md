# Storefront raw structure and functional inventory

**Source snapshot:** Shop for All working tree, 20 October 2026. This is a read-only source audit. “Implemented” means an active source path renders or handles the element; it does **not** establish successful production use. No browser session, provider, customer record or live database was exercised. The existing `STOREFRONT_CORE_ANATOMY_AUDIT.md` addresses presentation and extensibility; this document records the current functional structure only.

For compact references below: **SF** = `ecommerce-storefront/src`, **R** = `packages/storefront-renderer`, **T** = `packages/storefront-theme`, **BE** = `ecommerce-backend/backend`, and **SB** = `ecommerce-admin/src/pages/dashboard/StoreBuilder`. Part 15 expands the most important paths. Classification uses **CR** (core required for its applicable workflow), **C** (required only when data/feature is enabled), **O** (optional), **I** (informational), **A** (interactive). Thus `C+A` is a conditional control, while `CR+I` is essential displayed information.

## Part 1 — Storefront architecture overview

1. `SF/proxy.js:25` inspects the request host. A tenant subdomain or supported custom domain is rewritten into Next.js's internal `/[subdomain]` segment. The backend's `BE/middlewares/tenant.js:50` resolves the requested shop and checks that the route/host point to the same tenant. Public storefront routes attach `req.tenantId`; disabled/suspended shops are unavailable.
2. `SF/app/[subdomain]/layout.jsx:15` fetches a published tenant snapshot through `SF/lib/storefrontPublishedSettings.js:7` and `SF/lib/storefrontServer.js:72`. It mounts the theme provider, revision watcher, tenant-keyed cart provider, header, `<main>`, footer, analytics-consent banner and toast host. The root app layout also supplies authentication and generic providers (`SF/app/layout.jsx:27`); tenant children use the nearer tenant cart/theme provider.
3. The backend reads `BE/models/Shop.js:347-348` (`branding`, published `theme`) and tenant-owned product/category/collection/review/banner records. `BE/controllers/storeController.js:162` builds the homepage bootstrap with eligible products, section-specific products/reviews, categories, banners, active sale popups and pagination. `BE/routes/storefrontRoutes.js:94-270` exposes public browsing plus protected order/review and OTP/tracking actions.
4. The Store Builder resolves one of nine preset **definitions** with `T/prebuilt.cjs:566-670`, saves drafts and publishes a candidate into `Shop.theme` using `BE/services/storeBuilder/storeBuilderService.js:257,333`. The live storefront renders the published theme, not a separate app for each preset. `T/index.cjs:59` registers 13 section types; `R/reference/StorefrontHome.jsx:12` and `R/reference/StorefrontComposition.jsx:13` place them. Header, hero, cards, sections and footer come from the shared renderer.
5. Navigation/cart/product actions are client interactions; catalog, product detail, category, collection and metadata have server-backed entry points. The Admin preview uses the same reference renderer and shared commerce presentation components with candidate data (`SB/StorefrontPreview.jsx:11`, `SB/PreviewCommercePages.jsx`), while live actions call APIs.

**Data boundary:** a theme supplies presentation and merchant-authored content. It does not own a product's authoritative price, stock, identity, order, customer session or delivery state. The customer cart stores a local snapshot, then checkout fetches product details and the backend validates orders (`SF/context/CartContext.jsx:6`; `SF/app/[subdomain]/checkout/hooks/useCheckoutCartProducts.js:7`; `BE/controllers/orderController.js:241`; `BE/controllers/publicController.js:274`).

## Part 2 — Complete page and route inventory

Public tenant URLs on a tenant host appear as `/...`; the internal Next.js route is `/[subdomain]/...`. All tenant pages inherit the shell in `SF/app/[subdomain]/layout.jsx`. “Data” lists the minimum source used to render the route; Part 11 details calls.

| Public path / internal route | Active page, purpose, required data | Actions and conditional states |
|---|---|---|
| `/` → `SF/app/[subdomain]/page.jsx:76` | Homepage; shop settings + bootstrap products, categories, sections and pagination | Hero/section/category/product links; catalog filters/sort/search/pages; cart/buy; conditional banners and sale popup; unavailable/404/plan redirect |
| `/products/{id}` → `SF/app/[subdomain]/products/[id]/page.jsx:87` | Product detail; shop and public product by ID/slug | Gallery, variants, quantity, cart/buy, review form and related products; canonical redirect; missing product 404 or client fallback |
| `/categories/{slug}` → `SF/app/[subdomain]/categories/[slug]/page.jsx:134` | Category name, optional metadata/image, product results and pagination | Price, availability, sale, rating and sort filters; product actions; slug redirect/404/empty state |
| `/collections/{slug}` → `SF/app/[subdomain]/collections/[slug]/page.jsx:98` | Collection title, optional description/image, products | Sort and previous/next pages; product actions; canonical redirect/404/empty state |
| `/cart` → `SF/app/[subdomain]/cart/page.jsx:14` | Local cart items, summary, recommendations | Quantity/remove, save coupon for checkout, checkout link; empty state |
| `/checkout` → `SF/app/[subdomain]/checkout/page.jsx:35` | Cart, shop policies, product refresh, form, coupon preview | Address/delivery selection, optional marketing opt-in, policy consent, phone OTP, order submit; empty/success/error states |
| `/account` → `SF/app/[subdomain]/account/page.jsx:13` | Auth state; customer orders if logged in | Login, register through form toggle, password reset, order history/profile/password change, logout; vendor role portal link |
| `/track` → `SF/app/[subdomain]/track/page.jsx:99` | Customer-supplied order ID + delivery phone, then access token/order | Send/verify access OTP, track, cancel when eligible, request return with proof when eligible; error/conditional states |
| `/policies` → `SF/app/[subdomain]/policies/page.jsx` | Shop/theme policies with defaulted content | Four in-page anchors, per-policy links, back to store |
| `/policies/{type}` → `SF/app/[subdomain]/policies/[type]/page.jsx` | One supported policy | Back/navigation through shared `PolicyView`; unknown type 404 |
| `/signup` → `SF/app/[subdomain]/signup/page.jsx` | **No active page component:** entire source is commented out | Registration actually occurs in `/account`'s `AuthView`; do not count `/signup` as functioning |
| `/robots.txt`, `/sitemap.xml`, `/sitemaps/{name}` → tenant route handlers | Tenant SEO data, not visible pages | Generated response; no page controls |

Other route files in this Next.js application belong to the **platform**, not tenant theme pages: `SF/app/page.jsx` is the Scaleup landing page, `SF/app/legal/[type]/page.jsx` serves platform legal content, and `SF/app/login/page.jsx` redirects to the Admin login. Root `robots.txt`/`sitemap.xml` are platform SEO handlers. `SF/app/api/[...path]/route.js` proxies browser API traffic to the backend; it is not a customer page. No dedicated tenant search-results, standalone order-detail, or standalone order-confirmation page file was found. Checkout renders confirmation in place; account order rows expand in place; tracking is `/track`.

## Part 3 — Shared storefront shell

### Header and navigation

`SF/components/storefront/Navbar.jsx:29` obtains the published theme/shop snapshot and tenant cart count, passes them to `R/reference/StorefrontHeader.jsx:180`, and owns `SF/components/search/SearchModal.jsx:9`. The actual header children are:

| Child | Data and condition | Interaction / classification |
|---|---|---|
| BrandMark | `theme.logoUrl` image or first-letter fallback, shop name or subdomain; literal “Storefront” subtitle; optional verified-seller and trusted badges | Home link `"/"`; `CR+I/A` for identity/link, badges `O+I` (`StorefrontHeader.jsx:27-82`) |
| Navigation links | `theme.navigation`, normalized/sorted; first three directly shown, remainder in “More” menu; optional child links and `megaMenu` grouping | Navigate to merchant-configured URLs; `C+A`; fallback labels are not category discovery unless configured (`:83-177`, `:198-233`) |
| Search trigger | Header button, not an always-open editable search field | Opens `SearchModal`; `C+A` (`Navbar.jsx:55`; `StorefrontHeader.jsx:210`) |
| Account, cart, tracking | Fixed utility destinations; cart count from nearest `CartProvider` | `/account`, `/cart`, `/track`; `CR+A` when those workflows apply (`StorefrontHeader.jsx:235-252`, `:370-376`) |
| Mobile menu and search | Toggle, close button, navigation/child links, account/tracking links; header search button | Local open state; closes on link/overlay; `C+A` (`StorefrontHeader.jsx:202`, `:314-390`) |

There is **no standalone announcement-bar component** in this header. `theme.header.menuStyle` is stored, but the active header chooses actual dropdown layout from each navigation item's `children`/`megaMenu`; a merchant tagline is not read by `BrandMark` (the small label is the fixed word “Storefront”). The uploaded logo is used in the header; the shared footer does not render that image.

### Footer and other global children

`SF/components/storefront/StorefrontFooter.jsx:9` wraps `R/reference/StorefrontFooter.jsx:99`. The footer always constructs a store identity block (initials plus name), store links (configured navigation or Home/Policies/Track fallback, then Account and Cart), policy/support links, a copyright/platform-credit row, “Secure checkout” and “Privacy-friendly analytics” text. Merchant footer description, contact mail link, custom support links, social links and verified badge appear only when configured/eligible. The mobile bottom navigation appears only when `theme.mobile.showBottomNavigation` is true; its links are Home, Search (`/#products`), Track, Account and Cart with optional count (`StorefrontFooter.jsx:99-225`). The footer does **not** render the uploaded logo, phone/address fields, a newsletter form, payment-provider icons or category links generated independently from navigation.

The shell also mounts `StorefrontRevisionWatcher` to poll published theme revision, `AnalyticsConsentBanner` when consent is unknown, and toast notifications (`SF/app/[subdomain]/layout.jsx:38-53`; `SF/components/storefront/AnalyticsConsentBanner.jsx:17`). The banner's Allow/Decline buttons write analytics consent; it is not a marketing subscription control. `AuthProvider` checks `/auth/me` for session state (`SF/context/AuthContext.js:39`); the tenant `CartProvider` stores items under a subdomain-keyed localStorage key (`SF/context/CartContext.jsx:6-38`).

## Part 4 — Homepage raw anatomy

`SF/app/[subdomain]/page.jsx:16-49` loads bootstrap and published settings, reconciles `themeRevision`, then renders `StorefrontHomeClient`. `SF/hooks/useShopData.js:6-33` normalizes bootstrap data; later filter/page changes fetch `/storefront/{subdomain}/products`. `R/reference/StorefrontHome.jsx:12-139` creates `StorefrontHero`, enabled `HomepageSection` instances and `StorefrontAllProducts`; `StorefrontComposition` places them. The four composition identities only change placement/slot claiming; they reuse the same functional children (`T/composition.cjs:5-29`).

**Hero raw children:** optional desktop/mobile image from active slide (or placeholder), optional badge text, title (or screen-reader fallback shop name), optional offer/discount text, subtitle, primary and secondary CTA links only when both label and destination exist, and previous/next arrows plus slide dots only with multiple slides. Slides change by buttons and a five-second timer, with pause state. Sources: `R/reference/StorefrontHero.jsx:19-172`, `:255-325`; slide data from `Shop.theme.hero` via `T/index.cjs`. No video node was found.

**Independent promotional children:** active Banner records yield a launch/promotion panel with title, optional subtitle/image/countdown and conditional destination/CTA (`SF/app/[subdomain]/StorefrontHomeClient.jsx:106-175`). Active sale popups yield title, optional message/media/countdown/CTA and dismissal; frequency controls use session/local storage (`:290-322`, `:401-485`). They depend on campaign data and plan features from `BE/controllers/storeController.js:162-395`, not on a preset section type.

### Registered homepage sections and their real children

Each enabled section may also be hidden on desktop/mobile by section visibility settings. `R/reference/StorefrontHome.jsx:61-81` suppresses categories without data, story without text/media, and collections without eligible products; individual renderers suppress other empty data. `T/index.cjs:59-92` registers all 13 types:

| Section type | Raw elements, input data and action | Availability / editor status |
|---|---|
| `FeaturedProducts` | Title, fixed subtitle, “View all” anchor, `ProductCard` list from section-specific product IDs or catalog slice | No products → no section; editor selectable (`R/reference/StorefrontSectionRenderer.jsx:72-98`) |
| `CategoryList` | Title; category name, optional image, optional product count, links to `/categories/{slug}`; can derive representative image/count from product data | No categories/products → unavailable; editor selectable (`R/reference/StorefrontSectionVariants.jsx:52-175`) |
| `Collection` | Section title and selected eligible `ProductCard` items | No items → null; registered but `editorEnabled: false` (`T/index.cjs:64-68`; `R/reference/StorefrontSectionVariants.jsx:283`) |
| `Banner` | Title, optional subtitle, optional CTA label, desktop/mobile image, previous/next controls for multiple images; whole banner links to configured URL or `#products` | Editor selectable; media and CTA text individually optional (`StorefrontSectionVariants.jsx:325-350`) |
| `TextBlock` | Section title and text | Editor selectable; generic textual renderer (`StorefrontSectionRenderer.jsx:163`) |
| `Newsletter` | Section title/text and, for one treatment, mail icon | **No input/submit/subscription action** in this section; editor selectable (`StorefrontSectionVariants.jsx:307-322`) |
| `Reviews` | Title, review comment, optional rating/name/product title or manual text | No manual text/eligible selected review → null; editor selectable (`StorefrontSectionVariants.jsx:181-233`) |
| `FAQ` | Title and `<details>` questions/answers parsed from text lines | No parsed question → null; editor selectable (`StorefrontSectionRenderer.jsx:121-145`) |
| `TrustBadges` | Title and up to eight text-derived trust items | No entries → null; editor selectable (`StorefrontSectionRenderer.jsx:146-158`) |
| `BrandStory` | Store-story label, title, optional text/image | Homepage availability requires text or media; editor selectable (`StorefrontSectionVariants.jsx:237-281`) |
| `PromoBlock` | Title/text, no commerce control | Editor selectable; generic textual renderer (`StorefrontSectionVariants.jsx:307-322`) |
| `BrandShowcase` | Generic title/text | Registered, `editorEnabled: false`; its stored `imageUrl` is **not read** by the generic textual renderer (`T/index.cjs:85`; `StorefrontSectionRenderer.jsx:163`) |
| `CollectionShowcase` | Title and selected eligible `ProductCard` items | No items → null; registered but `editorEnabled: false` (`T/index.cjs:88`; `StorefrontSectionVariants.jsx:283-301`) |

**All-products catalog:** `R/reference/StorefrontAllProducts.jsx:105` reads current product results, category list, filter state, page metadata and theme visibility. If `allProducts.isEnabled === false`, it renders nothing (`:141`). Otherwise it has title/subtitle, catalog search input, sort select, category/price/rating/stock controls, active filter chips, mobile filter panel, result count, product grid, empty/reset state and numbered previous/next pagination (`:213-375`). `StorefrontHomeClient.jsx:181-273` updates filter/page state and debounces catalog search; `SF/hooks/useShopData.js:73-135` sends these to the tenant product endpoint. The home catalog is an API-backed search/filter path, unlike the header's local modal.

## Part 5 — Product components

### ProductCard: rendered versus merely available

All home, category and collection product grids use the same `R/reference/StorefrontProductCard.jsx:26` via re-export wrappers under `SF/components/storefront/reference/`. The card consumes a normalized public product and callback props. Its structure does **not** branch on `productCard.style`.

| Field or action | Actual card behavior | Status |
|---|---|---|
| Identifier | `_id`/`slug` builds `/products/{slug-or-id}` link; `_id` also keys cards | Required data; ID itself normally not shown |
| Image | One primary image with fallback icon; alt from product media; no card gallery | Rendered; gallery only on detail page |
| Title and category | Title always; category when present and `showCategory` permits | Rendered / category conditional |
| Description/excerpt | Not read by card | Available in other data/detail, **not card-rendered** |
| Price and discount | Derived final price, optional struck-through original, optional percentage badge | Rendered; backend supplies eligible price/discount source (`:39-44`, `:174-204`) |
| Rating/reviews | Stars and numeric rating/count when positive and flags permit | Conditional (`:46-49`, `:193-208`) |
| Stock/SKU | Stock text optionally shown; SKU optionally shown from product/first variant/fallback ID suffix | Conditional; no variant selector in card (`:98`, `:212-226`) |
| Wishlist | Heart toggles tenant-keyed local wishlist through `useStorefrontProductActions`; no wishlist page found | Conditional local interaction (`:162-173`; `SF/hooks/useStorefrontProductActions.js:18-103`) |
| View details | Whole-card link to product route | Rendered (`:142`) |
| Add to cart | Calls `onProductAdd`; disabled at zero stock; adds default/current normalized product to local cart | Conditional on `showQuickBuy` (`:229-243`) |
| Buy now | Calls `onProductBuyNow`; may open variant-picker modal, then adds and navigates to checkout | Conditional on `showQuickBuy` and stock (`:245`; `SF/hooks/useStorefrontProductActions.js:115-205`) |
| Quantity or full variant information | No quantity control or variant list in card | Supported on detail page/variant picker, not card |

### Product detail

`SF/app/[subdomain]/products/[id]/page.jsx:87` fetches public product/shop, handles 404/canonical slug and emits metadata/structured data. `SF/components/product/ProductDetails.jsx:39` uses `useProductData` (`SF/hooks/useProductData.js:10`) to hydrate the product, fetch reviews and up to five related same-category products, select attributes/current variant, and derive stock/price/discount. It passes all interactions into `R/presentation/ProductDetailsView.jsx:8`:

- `ProductImageGallery`: active image; optional category/discount labels; thumbnail buttons only for multiple valid images; image-error fallback (`R/presentation/ProductImageGallery.jsx:8`). Selecting a variant can lead with that variant image.
- `ProductInfo`: rating/review count, title, optional variant SKU/barcode, price/old price/discount, COD information and collapsible description. If description is absent, a fixed fallback sentence is rendered (`R/presentation/ProductInfo.jsx:20-104`).
- `VariantSelector`: attribute option buttons based on available attributes/variants; parent resets quantity on selection (`R/presentation/VariantSelector.jsx:12`; `SF/components/product/ProductDetails.jsx:111`).
- Quantity: minus/plus, minimum one and maximum displayed stock; hidden when out of stock (`ProductDetailsView.jsx:47-89`).
- `ActionButtons`: stock/unavailable status, add-to-cart, buy-now when in stock, informational trust/support text; a mobile action bar repeats purchase actions when in stock (`R/presentation/ActionButtons.jsx:12`; `ProductDetailsView.jsx:108-165`).
- `ProductInformationTabs`: highlights from `features`, details from `specifications`, buying guide from `comments`; each has an explicit empty state and keyboard tab handling (`R/presentation/ProductExtras.jsx:121-238`).
- `RelatedProducts` (only if products exist) and `ReviewSection` (reviews list, empty state, rating/comment form). Review submission requires a customer session and calls `POST /storefront/{subdomain}/products/{id}/reviews`; fetch uses GET of the same path (`SF/components/product/ReviewSection.jsx:3`; `R/presentation/ReviewSection.jsx:38-187`; `SF/hooks/useProductData.js:25`).

`handleAddToCart` stores selected variant, quantity and displayed price in the tenant cart; `handleBuyNow` adds then routes to `/checkout` (`SF/components/product/ProductDetails.jsx:75-112`). The checkout/backend must still decide authoritative stock and price. Product loading skeleton, missing-product fallback and related/review lazy-load states are present.

## Part 6 — Commerce components

### Cart

`SF/context/CartContext.jsx:6-113` keys items by product ID plus selected variant ID, persists them in `shopforall_cart_{subdomain}` and exposes add/remove/update/clear/count/derived total. `SF/app/[subdomain]/cart/page.jsx:14` obtains this state, requests up to six recommendations from `GET /storefront/{subdomain}/recommendations/cart`, and maps data into `R/presentation/CartView.jsx:6`.

The cart has an empty state with a shopping link, item list (image, title, option/variant information when stored, unit/subtotal and quantity/remove controls), order summary (subtotal, provisional shipping, savings and total), coupon input and “Apply” that **only saves a pending code to sessionStorage**, checkout/continue links, conditional recommendations and a mobile checkout action (`CartView.jsx:10-312`; `cart/page.jsx:73-100`). Coupon validity is checked later in checkout. Cart totals derive from local snapshots; do not interpret them as an order quote. Recommendations failing to load are silently omitted.

### Checkout and order placement

`SF/app/[subdomain]/checkout/page.jsx:35-481` uses `useCheckoutFormState`, `useCheckoutCartProducts`, `useCheckoutCoupon`, `useCheckoutPhoneOtp` and `useCheckoutTotals`. `R/presentation/CheckoutSections.jsx` provides the active presentation, re-exported by tenant wrapper `SF/app/[subdomain]/checkout/components/CheckoutSections.jsx`.

| Checkout child | Inputs/data and action | Condition / source |
|---|---|---|
| `CheckoutPageShell` and optional branding | Back-to-cart link, heading, fixed trust text; optional logo/banner text | Branding only if configured (`CheckoutSections.jsx:101-181`) |
| `CheckoutCustomerInfo` | Required full name, email, phone, full address and delivery-area select | Delivery area has **Inside Dhaka / Outside Dhaka**, not an arbitrary courier picker (`:185-286`) |
| Delivery notice and method | Displays two zone amounts and highlights selected zone | Informational; selection occurs in customer-info select (`:288-339`) |
| Payment method | Displays **Cash on Delivery** | No selectable online provider; authenticated payload sets `payment.method: "COD"`, guest path uses current guest order contract (`:341-362`; `checkout/page.jsx:242-313`) |
| Marketing consent | Separate optional checkbox | Opt-in value travels in order consent; distinct from required policy acceptance (`checkout/page.jsx:440-443`) |
| `CheckoutOrderSummary` | Refreshed item details, quantities/removal, coupon input/apply feedback, subtotal/delivery/discount/total, optional expandable policies, required policy checkbox, submit button | Cart and theme policy data; submit disabled without policy acceptance (`CheckoutSections.jsx:447-792`) |
| Phone verification | OTP modal with send/verify/error and masked phone | If not verified on submit; `POST /storefront/{subdomain}/checkout/send-otp` and `/verify-otp` (`checkout/page.jsx:157-192`, `:370-410`; `CheckoutSections.jsx:816`) |
| Success/empty states | Order ID with tracking instruction or return-to-store link | Rendered in place, not separate routes (`CheckoutSections.jsx:28-98`; `checkout/page.jsx:413-419`) |

`validateCheckoutIntent` checks nonempty cart, accepted policies and one of the two delivery zones (`checkout/page.jsx:194`). Authenticated customers POST to `/storefront/{subdomain}/orders`; guests POST to `/public/orders`, both with phone-verification token, checkout session, promotion/consent and idempotency key (`:219-314`). On success the page stores order ID, clears cart and pending coupon, shows confirmation and emits an analytics event; failures show a toast/modal error and retain the cart (`:334-367`). `useCheckoutTotals.js:4` computes a provisional client total; backend order controllers are responsible for final validation. The cart's default delivery estimate and checkout's zone-based amount are different displayed contexts (`SF/lib/cartConstants.js`; `useCheckoutTotals.js:12`).

## Part 7 — Customer components

**Authentication and account:** `/account` is the active login/registration entry (`SF/app/[subdomain]/account/page.jsx:13`). Logged-out `AuthView` has email/password sign-in; a toggle reveals full name, email, password and six-digit email OTP registration (`SF/components/account/AuthView.jsx:4-153`). `AccountPage.handleSendOTP` calls `/auth/send-otp`; registration calls `/auth/register-customer` with subdomain; login delegates to `AuthContext.login` calling `/auth/login`; session lookup uses `/auth/me`; logout calls `/auth/logout` (`account/page.jsx:90-155`; `SF/context/AuthContext.js:39-120`). Forgot password opens `PasswordResetFlow`, which calls `/auth/forgot-password`, `/auth/verify-reset-otp` and `/auth/reset-password` with customer audience and tenant context (`SF/components/account/PasswordResetFlow.jsx:44-175`). The separate `/signup` route has no active component.

Logged-in customers see `CustomerDashboard` with Order History, My Profile, Change Password and Sign Out (`SF/components/account/CustomerDashboard.jsx:5-48`). `OrderHistoryTab` expands rows showing ID/date/status, items and totals, with product links; no separate account order-detail route is rendered (`SF/components/account/CustomerTabs.jsx:9-162`). `ProfileTab` displays name/email/role only (`:164-187`). `SecurityTab` submits current/new/confirmed password to `/auth/update-password` after client strength/match checks (`:189-293`). `AccountPage` also contains an older `handlePasswordReset` toast-only placeholder, but the rendered `SecurityTab` owns its own real handler and ignores that passed prop. Vendor roles see `VendorView` with Admin Panel link and logout instead of the customer dashboard (`SF/components/account/VendorView.jsx:4-26`). Customer order loading has a spinner; auth failures produce toasts/errors.

**Order tracking and after-sale actions:** `/track` takes short/full order ID and delivery phone. `TrackOrderPage.handleTrackOrder` first requests an access OTP, then verifies the six-digit code, stores a short-lived access token in page state and uses it in the `x-order-access-token` header for `GET /storefront/{subdomain}/track-order/{id}` (`SF/app/[subdomain]/track/page.jsx:99-205`; `BE/routes/storefrontRoutes.js:224-245`). With an order it displays status/progress or cancellation, order date, delivery address/zone/courier/tracking ID, line items, subtotal/discount/shipping/tax/total, payment status, timeline, cancellation and return status/proof where supplied (`track/page.jsx:380-754`). Cancellation button appears only if `order.canCancel`; return form appears only if return eligibility permits. Cancellation sends reason/note/token; return sends selected items, reason/description, one to three proof images and optional video as multipart data (`:210-306`, `:624-930`). Server eligibility and token checks remain authoritative (`BE/controllers/publicController.js:881-1234`). Invalid/missing input and API errors produce toasts; an order is not shown without access verification.

## Part 8 — Remaining pages and states

- **Category page:** `CategoryPageClient` renders back link, name, product count, optional image, URL-query-driven price/availability/sale/rating filters, active chips, sort select, `ProductCard` grid, pagination, empty/clear state and conditional variant-picker modal (`SF/app/[subdomain]/categories/[slug]/CategoryPageClient.jsx:36-398`). `page.jsx:51-98` requests tenant shop/products, category detail and pagination; it handles slug redirects/404 and metadata.
- **Collection page:** `CollectionPageClient` renders back link, title, optional description/image, count, sort select, product grid, previous/next pagination, empty state and variant picker (`SF/app/[subdomain]/collections/[slug]/CollectionPageClient.jsx:20-169`). It has **no category-style filter panel**. `page.jsx:30-59` requests tenant collection/shop/products and handles 404/canonical redirect.
- **Search:** header `SearchModal` filters locally against at most 12 products fetched when opened (`SF/components/storefront/Navbar.jsx:36-52`; `SF/components/search/SearchModal.jsx:22-34`), showing initial popular items, matching product links or an empty message. Homepage `StorefrontAllProducts` instead sends debounced search to tenant product API with result paging (`SF/app/[subdomain]/StorefrontHomeClient.jsx:226`; `SF/hooks/useShopData.js:77`). No dedicated search-results route exists.
- **Policies:** `/policies` lists refund, shipping, privacy and terms using merchant text or defaults, in-page anchors and links to `/policies/{type}` (`SF/app/[subdomain]/policies/page.jsx:69-158`; `SF/lib/defaultPolicies.js`). An individual policy uses shared `R/presentation/PolicyView.jsx` and 404s unsupported types (`SF/app/[subdomain]/policies/[type]/page.jsx:83-90`).
- **System states:** tenant shell returns “Store temporarily unavailable” when settings fetch fails, and calls `notFound()` for 404/423 (`SF/app/[subdomain]/layout.jsx:19-36`). Home client has a “Store Unavailable” error branch (`StorefrontHomeClient.jsx:341`). Product detail has loading and missing-product branches; cart/checkout have empty states; category/collection have no-products states; search has no-result text; account has auth/order loading; tracking uses toasts and conditional content. Tenant root/product/checkout `loading.jsx` files are present. No tenant-specific `not-found.jsx` or `error.jsx` was found; missing route/data uses Next.js `notFound()` or page-local states. `signup/page.jsx` being commented out should be treated as nonfunctional, not as a verified rendered page.
- **Other route handlers:** tenant and platform robots/sitemaps plus API proxy exist, but do not render customer component trees. Platform landing/legal/login are separate from merchant themes (Part 2).

## Part 9 — Raw component trees

The trees list active functional nodes. Bracketed text is an existing condition; no visual design properties are included.

```text
RootLayout
└── AuthProvider → generic ThemeProvider/CartProvider/Toaster
    └── VendorLayout [tenant settings available]
        ├── StorefrontThemeProvider + StorefrontRevisionWatcher
        └── tenant CartProvider
            ├── Navbar → ReferenceStorefrontHeader
            │   ├── BrandMark → logo or fallback, name, [verified/trusted badges]
            │   ├── navigation links → [child/overflow links]
            │   ├── search trigger → [SearchModal]
            │   ├── account/track/cart links → [cart count]
            │   └── [mobile menu]
            ├── main → route page
            ├── StorefrontFooter → ReferenceStorefrontFooter
            │   ├── initials/name → [description] → [verification]
            │   ├── store/support/policy links → [contact email] → [social links]
            │   ├── copyright/trust text
            │   └── [mobile bottom navigation]
            ├── [AnalyticsConsentBanner: consent unknown]
            └── toast notifications
```

```text
Homepage: VendorHomePage → StorefrontHomeClient
├── ReferenceStorefrontHome → StorefrontComposition
│   ├── StorefrontHero → [media], title/fallback, [badge/offer/subtitle], [CTAs], [slide controls]
│   ├── [StorefrontLaunchBanners: active campaign records]
│   ├── [HomepageSection × enabled/available sections: 13 registered types]
│   │   └── category links / ProductCard list / content / review / FAQ / banner nodes
│   └── [StorefrontAllProducts: enabled]
│       ├── catalog search, sort, filters, active chips, result count
│       ├── ProductCard list or empty result
│       └── [pagination: multiple pages]
├── [sale popup: active and not dismissed]
└── [StorefrontVariantPickerModal: buy-now product needs option]
```

```text
CategoryPage → CategoryPageClient
├── category name, product count, [cover image]
├── filters (price, stock, sale, [rating]), sort, active chips
├── ProductCard list or no-products state
├── [pagination]
└── [variant picker]

CollectionPage → CollectionPageClient
├── title, [description/image], count, sort
├── ProductCard list or no-products state
├── [previous/next pagination]
└── [variant picker]
```

```text
Product Page → ProductDetails → ProductDetailsView
├── Continue Shopping link
├── ProductImageGallery → active image/fallback, [category/discount], [thumbnails]
├── ProductInfo → rating/count, title, [SKU/barcode], price/[discount], description toggle
├── VariantSelector → [attribute choices]
├── [quantity control: stock > 0] → ActionButtons (stock, add, [buy now])
├── ProductInformationTabs → highlights/details/buying guide or empty panels
├── [RelatedProducts] → product links
├── ReviewSection → review list/empty, [authenticated review form]
└── [mobile add/buy controls: stock > 0]
```

```text
CartPage → CartView
├── [empty cart: return link]
└── [items exist]
    ├── cart rows → image, title, [variant], unit/line price, quantity, remove
    ├── summary → subtotal, provisional shipping, savings, total
    ├── coupon input → save code for checkout
    ├── checkout / continue-shopping links
    ├── [recommendations → ProductCard]
    └── [mobile checkout action]

CheckoutPage → CheckoutPageShell
├── [branding banner], header/back link
├── customer form → name, email, phone, address, delivery area
├── delivery notice/method and COD information
├── [optional marketing opt-in]
├── order summary → cart rows/quantity/remove, coupon, totals,
│   [policy text], required policy consent, submit
├── [phone OTP modal: verification needed]
├── [empty cart state]
└── [success state: order ID and tracking instruction]
```

```text
AccountPage
├── [logged out] AuthView → login form OR registration form + email OTP
│   └── [forgot password] PasswordResetFlow → email → OTP → new password
├── [Customer] CustomerDashboard → order history / profile / password change / logout
├── [Vendor role] VendorView → Admin Panel link / logout
└── [auth or order loading]

TrackOrderPage
├── order ID + phone form → [access OTP] → access token
├── [verified order] status/progress, address/shipping, items/totals, payment, timeline
├── [eligible cancellation] reason/note modal
└── [eligible return] selected items/reason/description/proof modal

PoliciesPage → four policy summaries/anchors → PolicyPageClient → PolicyView
```

## Part 10 — Master component inventory

Scope codes: **S** shared shell, **H** home, **D** product detail, **K** category/collection, **C** cart/checkout, **U** customer/order, **P** policy. “Source” is a repository-relative path or the exact mapped prefix from the document header. This table classifies the functional nodes; Parts 3–8 enumerate their children and conditions.

| Component / source | Scope | Children or displayed data | Action / dependency | Class |
|---|---|---|---|---|
| `VendorLayout` — `SF/app/[subdomain]/layout.jsx:15` | S | Settings, header/main/footer/providers | Tenant settings; unavailable/404 branch | CR+I |
| `StorefrontThemeProvider` — `SF/components/storefront/StorefrontThemeProvider.jsx:15` | S | Published theme/settings context | All tenant pages require resolved theme | CR+I |
| `ReferenceStorefrontHeader` — `R/reference/StorefrontHeader.jsx:180` | S | Brand, nav, search, account/cart, optional badges/menu | Routes, cart and settings | CR+I/A |
| `BrandMark` — `R/reference/StorefrontHeader.jsx:57` | S | Logo/fallback, name, badges | Home link; shop/verification data | CR+I/A; badges O+I |
| `SearchModal` — `SF/components/search/SearchModal.jsx:9` | S | Input, popular/matching/empty products | Local filter and product links; bounded fetch | C+A |
| `ReferenceStorefrontFooter` — `R/reference/StorefrontFooter.jsx:99` | S | Initials/name, links, policies, optional contact/social/badge | Store routes and mail/social links | CR+I/A; extras O |
| `AnalyticsConsentBanner` — `SF/components/storefront/AnalyticsConsentBanner.jsx:17` | S | Consent text/buttons | Persists analytics choice | C+A |
| `StorefrontHero` — `R/reference/StorefrontHero.jsx:255` | H | Slide media, copy, CTAs, optional controls | Merchant theme slides/links | C+I/A |
| `StorefrontLaunchBanners` — `SF/app/[subdomain]/StorefrontHomeClient.jsx:106` | H | Campaign media/title/[timer/CTA] | Banner/schedule data; conditional link | O+I/A |
| Sale popup — `StorefrontHomeClient.jsx:290,401` | H | Sale copy/[media/timer/CTA] | Dismiss, optional link; campaign data | O+I/A |
| `StorefrontComposition` — `R/reference/StorefrontComposition.jsx:13` | H | Hero, eligible sections, catalog | Places existing nodes; theme composition | C+I |
| `HomepageSection` — `R/reference/StorefrontSectionRenderer.jsx:31` | H | One registered section's children | Section config/data; actions by type | O/C+I/A |
| `StorefrontAllProducts` — `R/reference/StorefrontAllProducts.jsx:105` | H | Search/sort/filter/grid/pagination | API-backed product state; may be disabled | C+I/A |
| `CategoryPageClient` — `SF/app/[subdomain]/categories/[slug]/CategoryPageClient.jsx:36` | K | Header, filter panel, cards, pages | URL query, category products | C+I/A |
| `CollectionPageClient` — `SF/app/[subdomain]/collections/[slug]/CollectionPageClient.jsx:20` | K | Title/[image/description], sort, cards, pages | URL query, collection products | C+I/A |
| `ProductCard` — `R/reference/StorefrontProductCard.jsx:26` | H/K/C | Image, title, price, [rating/badge/stock/SKU/category/actions] | Public product + cart/wishlist callbacks | CR+I/A where product list rendered |
| `StorefrontVariantPickerModal` — `SF/components/storefront/StorefrontVariantPickerModal.jsx:16` | H/K/C | Options, SKU/stock, loading/empty | Buy-now with multiple variants | C+A |
| `ProductDetails` — `SF/components/product/ProductDetails.jsx:39` | D | Data/loading/error, detail view, reviews/related | Product API, cart and auth | CR+I/A for detail route |
| `ProductImageGallery` — `R/presentation/ProductImageGallery.jsx:8` | D | Active image/fallback/[thumbnails] | Product/variant media, thumbnail selection | CR+I/A |
| `ProductInfo` — `R/presentation/ProductInfo.jsx:20` | D | Title, rating, price, description/[IDs] | Product and selected variant data | CR+I/A |
| `VariantSelector` — `R/presentation/VariantSelector.jsx:12` | D | Available attribute choices | Select variant; product variants | C+A |
| `ProductInformationTabs` — `R/presentation/ProductExtras.jsx:121` | D | Features/specs/comments or empty panels | Tab/FAQ-like disclosure | O+I/A |
| `ReviewSection` — `R/presentation/ReviewSection.jsx:139` | D | Reviews/empty/form | GET reviews; protected POST review | O/C+I/A |
| `CartProvider` — `SF/context/CartContext.jsx:6` | S/C | Tenant cart state/count/total | Local storage, add/update/remove/clear | CR+A for purchase |
| `CartView` — `R/presentation/CartView.jsx:6` | C | Items, summary, coupon, [recommendations] | Cart mutations, checkout link | CR+I/A for cart route |
| `CheckoutPage` — `SF/app/[subdomain]/checkout/page.jsx:35` | C | Form, consent, summary, OTP, success/empty | Cart/auth/guest order APIs | CR+I/A for purchase |
| `CheckoutOrderSummary` — `R/presentation/CheckoutSections.jsx:645` | C | Items, coupon, totals, policies, submit | Cart/coupon/consent; order submit | CR+I/A |
| `AuthView` / `PasswordResetFlow` — `SF/components/account/AuthView.jsx:4`; `PasswordResetFlow.jsx:44` | U | Login/registration/OTP/reset forms | Auth APIs and session | C+A |
| `CustomerDashboard` — `SF/components/account/CustomerDashboard.jsx:5` | U | History/profile/security tabs | Authenticated customer/orders | C+I/A |
| `TrackOrderPage` — `SF/app/[subdomain]/track/page.jsx:99` | U | Lookup, OTP, order/timeline/[cancel/return] | Order-access token and tenant APIs | C+I/A |
| `PoliciesPage` / `PolicyView` — `SF/app/[subdomain]/policies/page.jsx`; `R/presentation/PolicyView.jsx` | P | Four policy texts, index/per-policy navigation | Merchant policy data and defaults | C+I/A |

No component in this inventory is exclusive to an industry preset. “Required” is contextual: a review form is not required to buy; checkout is required to place an order, not to browse; optional campaigns may be absent while the storefront still functions.

### Part 10A — Element-level rendering ledger

This ledger refines the broader `CR/C/O/I/A` labels above. **PE** = platform-essential to resolve and isolate a tenant; **E** = page-essential for the named route or active transaction; **C** = required only when its parent data, feature or workflow exists; **O** = optional content or action; **NR** = source-available field/export with no element in the active render path. `D` means displayed information and `A` means an input, button, link or other action. A row marked `NR` must not be interpreted as a live feature. Repeated product/order rows describe **each** rendered record, not a single page-wide field. Paths use the prefixes defined at the top of this report.

| Active parent / route | Individual element or state | Class; rendered source versus data/condition | Exact source |
|---|---|---|---|
| Tenant shell / all pages | Host-to-shop resolution and published settings; unavailable message or 404/423 instead of another shop | PE; no customer control; message only on failure | `SF/proxy.js:25`; `SF/app/[subdomain]/layout.jsx:15-36` |
| Header / all pages | Brand home link; uploaded logo **or** first-letter fallback; shop name; fixed “Storefront” sublabel | E+A/D; logo only with `theme.logoUrl`, name falls back to subdomain | `R/reference/StorefrontHeader.jsx:57-82,205` |
| Header / all pages | Verified-seller badge and trusted badge, each with label and explanatory title | C+D; separate shop verification/trust data; absent when inactive | `R/reference/StorefrontHeader.jsx:21-55` |
| Header / all pages | Merchant navigation label/link; optional child links; “More” control and remainder after first three links | C+A; `theme.navigation` only; no automatic category list | `R/reference/StorefrontHeader.jsx:83-177,189-233` |
| Header / all pages | Search trigger; Track Order, Account, Cart links; cart count badge | E+A; count C+D when greater than zero | `R/reference/StorefrontHeader.jsx:210-252` |
| Header / all pages | Mobile open-menu button, close/overlay, repeated links and search trigger | C+A; same destinations, local menu state | `R/reference/StorefrontHeader.jsx:314-390` |
| Header configuration | Merchant tagline, standalone announcement bar, `header.menuStyle` as a separate menu control | NR; BrandMark prints fixed “Storefront”; dropdown grouping follows each item's children/`megaMenu` | `R/reference/StorefrontHeader.jsx:57-177` |
| Search modal / header | Search text input; close button | C+A; mounted only when header search opens | `SF/components/search/SearchModal.jsx:54-82` |
| Search modal / header | Intro text; up to four popular product links with image/title/price; matched product links with image/title/category/price; no-results text | C+D/A; local filter over at most 12 loaded products; no server search on each keystroke | `SF/components/search/SearchModal.jsx:88-170`; `SF/components/storefront/Navbar.jsx:36-52` |
| Footer / all pages | Initials, shop name, fixed “Storefront” label, optional merchant description and verification badge | E+D; initials always used, even if `theme.logoUrl` exists | `R/reference/StorefrontFooter.jsx:99-165` |
| Footer / all pages | Store links from navigation or Shop/Policies/Track fallback, then Account/Cart; policy links and optional custom support links | E+A/C+A; capped lists; custom links need label and URL | `R/reference/StorefrontFooter.jsx:99-118,167-195` |
| Footer / all pages | Optional contact-email link with configurable label; optional social links; copyright/platform credit; fixed secure-checkout/analytics statements | C+A for links, E+D for credit/statements; `contactEmail` produces `mailto:` | `R/reference/StorefrontFooter.jsx:118-211` |
| Footer / all pages | Home, Search, Track, Account, Cart bottom links; optional Cart count | C+A/D; only if `theme.mobile.showBottomNavigation`; Search goes to `/#products` | `R/reference/StorefrontFooter.jsx:127-137,215-231` |
| Footer configuration | `theme.logoUrl` image, phone, postal address, newsletter input and payment icons | NR in active footer; initials/name and optional contact-email link are rendered instead | `R/reference/StorefrontFooter.jsx:99-231` |
| Analytics banner / all pages | Explanation, Decline and Allow buttons | C+D/A; shown only while analytics choice is `unknown`; persists chosen state | `SF/components/storefront/AnalyticsConsentBanner.jsx:17-56` |
| Homepage hero | Active slide image or empty media fallback; optional mobile image; badge; title or screen-reader-only store name; discount/offer text; subtitle | E+D/C+D; `hero.hidden` yields only the hidden heading | `R/reference/StorefrontHero.jsx:19-172,255-325` |
| Homepage hero | Primary CTA and secondary CTA; previous/next slide buttons and per-slide dots | C+A; each CTA requires both text and URL; slide controls require more than one slide | `R/reference/StorefrontHero.jsx:71-103,149-171,255-325` |
| Homepage hero data | `storewideDiscount` prop | NR as a separate hero label; the hero explicitly ignores that prop and prints slide `discountText` | `R/reference/StorefrontHero.jsx:255-270` |
| Homepage launch banners | Each active campaign title; optional subtitle/image/countdown/CTA label and destination; non-link placeholder when URL absent | O+D/A; depends on active backend campaign and visibility | `SF/app/[subdomain]/StorefrontHomeClient.jsx:106-175` |
| Homepage sale popup | Limited-time label/title; optional message/media/countdown/CTA; dismiss button | O+D/A; active sale, feature gate and frequency storage; CTA only with destination | `SF/app/[subdomain]/StorefrontHomeClient.jsx:283-322,401-485` |
| `FeaturedProducts` section | Heading; fixed subtitle; View all `#products` link; each `ProductCard` | C+D/A; no eligible products removes section | `R/reference/StorefrontSectionRenderer.jsx:72-98` |
| `CategoryList` section | Heading; each category link/name, image or initial fallback, optional positive count | C+D/A; categories or derivable products required | `R/reference/StorefrontSectionVariants.jsx:52-175` |
| `Collection` / `CollectionShowcase` section | Heading and selected product cards | C+D/A; selected eligible products required; editor selection disabled for both | `R/reference/StorefrontSectionRenderer.jsx:112-120`; `T/index.cjs:64-90` |
| `Banner` section | Image or mobile image; title; optional subtitle/button text; entire-section link; previous/next image buttons | C+D/A; link falls back to `#products`, controls need multiple images; button text is inside that link | `R/reference/StorefrontSectionVariants.jsx:325-350` |
| `Reviews` section | Heading; each review's comment, optional name/product title/rating stars | C+D; eligible reviews or manual text required; no review-submit action here | `R/reference/StorefrontSectionVariants.jsx:181-233` |
| `FAQ` section | Heading; each question `<summary>` and optional answer | C+D/A; parsed text must yield a question; `<details>` opens locally | `R/reference/StorefrontSectionRenderer.jsx:121-145` |
| `TrustBadges` section | Heading; up to eight text items/icons | C+D; no parsed entries removes section | `R/reference/StorefrontSectionRenderer.jsx:146-158` |
| `BrandStory` section | Story label, title, optional text/image | C+D; text or image required for homepage placement | `R/reference/StorefrontSectionVariants.jsx:237-281`; `R/reference/StorefrontHome.jsx:61-81` |
| `TextBlock`, `PromoBlock`, `Newsletter`, `BrandShowcase` | Section title and text; optional icon determined by treatment | C+D; generic text renderer; no form or CTA action | `R/reference/StorefrontSectionRenderer.jsx:163-166`; `R/reference/StorefrontSectionVariants.jsx:307-323` |
| `Newsletter` section | Email input, submit button, subscription result | NR; section name and stored text do not create these elements | `R/reference/StorefrontSectionVariants.jsx:307-323` |
| `BrandShowcase` section | Stored `imageUrl` | NR; field may exist in configuration but generic renderer does not read it | `T/index.cjs:85`; `R/reference/StorefrontSectionRenderer.jsx:163-166` |
| Home catalog | Heading/subtitle; search input; sort select: newest, price low/high, rating high/low, name A–Z/Z–A | C+D/A; entire catalog absent if `allProducts.isEnabled === false` | `R/reference/StorefrontAllProducts.jsx:141,210-227` |
| Home catalog | Category buttons including All; minimum/maximum price inputs and Apply Price; in-stock checkbox; 5+/4+/3+ rating buttons; Clear Filter | C+A; query state handled by home client; the rating buttons render even when no product has a rating | `R/reference/StorefrontAllProducts.jsx:60-101`; `SF/app/[subdomain]/StorefrontHomeClient.jsx:181-273` |
| Home catalog | Filter-open/close controls; active chip labels/removal and Clear all; result count; loading, product cards or no-results/clear state; numbered/previous/next paging | C+D/A; page controls only for multiple pages; filters have desktop and mobile render paths | `R/reference/StorefrontAllProducts.jsx:227-375` |
| Category page | Back-to-store link; category name, product count, optional cover image | E+D/A; cover comes from category detail, not every category | `SF/app/[subdomain]/categories/[slug]/CategoryPageClient.jsx:210-246` |
| Category page | Price range label, Min/Max inputs; Availability select (All/In/Out); On sale checkbox; optional Rating select (Any/4+/3+); Apply/Clear buttons | C+A; rating select only if rating data or an active rating query exists; draft values apply to URL on Apply | `SF/app/[subdomain]/categories/[slug]/CategoryPageClient.jsx:140-206` |
| Category page | Mobile filter open/close/overlay; active filter chip/removal/Clear; sort select (Default, Newest, price low/high, conditionally Best Rated); product cards; no-products text/Clear or Home link; previous/next and page count | C+D/A; Best Rated requires rating data or active rating filter; paging and empty branch depend on response; URL query is source of applied filters | `SF/app/[subdomain]/categories/[slug]/CategoryPageClient.jsx:249-398` |
| Collection page | Back-to-store link; title, optional description/cover image, count; sort select (newest/oldest/price low/high/best rated) | E+D/A/C+D; sort writes URL query | `SF/app/[subdomain]/collections/[slug]/CollectionPageClient.jsx:58-110` |
| Collection page | Product cards; empty text and Home link; previous/next/page count; conditional variant-picker modal | C+D/A; no category-style filter form here | `SF/app/[subdomain]/collections/[slug]/CollectionPageClient.jsx:112-169` |
| Product card / all grids | Product-detail link with accessible title; primary image or fallback; product title; current price | E+D/A per rendered card; `slug` or `_id` identifies destination | `R/reference/StorefrontProductCard.jsx:142-190` |
| Product card / all grids | Original price and discount badge; optional category; rating stars/value/review count; stock text; SKU text | C+D; discount/rating/stock/SKU depend on value and card flags | `R/reference/StorefrontProductCard.jsx:175-226` |
| Product card / all grids | Wishlist heart; Add button; Buy/Buy Now button; out-of-stock disabled/unavailable label | C+A; wishlist/card purchase controls depend on flags; callbacks come from live page | `R/reference/StorefrontProductCard.jsx:162-173,229-263` |
| Product card / all grids | Description, gallery controls, quantity input, full variant selector | NR on card; some data/actions exist in product detail or cart | `R/reference/StorefrontProductCard.jsx:26-263` |
| Variant picker / home/category/collection/cart recommendations | Product title and option/SKU/stock rows; close button; per-variant select buttons; loading/no-options text | C+D/A; opens when buy-now needs a variant choice; out-of-stock option cannot be chosen | `SF/components/storefront/StorefrontVariantPickerModal.jsx:16-110` |
| Product detail | Continue Shopping link; active image or missing-image text; optional category/discount labels; optional thumbnail buttons | E+D/A; thumbnails require multiple valid images | `R/presentation/ProductDetailsView.jsx:20-35`; `R/presentation/ProductImageGallery.jsx:8-110` |
| Product detail | Rating/count; title; optional SKU/barcode; current price; optional original price/discount; COD text; description/fallback text and expand/collapse button | E+D/C+D/A; description control only if long enough | `R/presentation/ProductInfo.jsx:20-104` |
| Product detail | Attribute group labels and option buttons; selected combination/stock hint | C+D/A; selector returns null with no attributes; selecting option updates variant, price, image, SKU, stock | `R/presentation/VariantSelector.jsx:12-72`; `SF/components/product/ProductDetails.jsx:109-112` |
| Product detail | Quantity label/value, minus/plus buttons; stock/unavailable status and “Ready for checkout” label; Add to Cart and conditional Buy Now buttons; duplicated mobile title/price/Add/Buy controls | E/C+D/A; quantity/mobile actions/Buy Now only with stock; Add becomes disabled “Currently Unavailable” at zero stock; min 1/max displayed stock | `R/presentation/ProductDetailsView.jsx:39-143`; `R/presentation/ActionButtons.jsx:15-58` |
| Product detail assurances | Secure checkout, Easy returns, Fast delivery, Cash on delivery informational tiles and customer-support paragraph | O+D; fixed copy from `ActionButtons`, no link, input or provider action | `R/presentation/ActionButtons.jsx:5-88` |
| Product detail | Information tab buttons: Highlights, Specifications, Buying guide; feature point/reason, specification name/value, guide question/answer; explicit empty-tab text | C+D/A; tabs exist even if their corresponding data array is empty | `R/presentation/ProductExtras.jsx:115-234` |
| Product detail | Related-product links; review summary/count, each reviewer/rating/date/comment, or no-reviews text | C+D/A; related content only with products, reviews may be empty | `SF/components/product/RelatedProducts.jsx`; `R/presentation/ReviewSection.jsx:15-36,139-187` |
| Product detail review form | Login link if unauthenticated; otherwise 1–5 rating buttons, Comment textarea, error/success message, submit button | C+A; requires signed-in customer for POST; rating/comment required client-side. Renderer builds the literal login href `/{subdomain}/account`; navigation on a tenant host was not runtime-tested | `R/presentation/ReviewSection.jsx:38-136`; `SF/components/product/ReviewSection.jsx` |
| Cart | Empty-cart title/explanation and Shop link **or** Cart heading/count and per-item rows | E+D/A; branch depends on tenant cart length | `R/presentation/CartView.jsx:6-49` |
| Cart item | Image/fallback, title, optional category/SKU/description/variant attribute chips, unit price and optional old price | E+D/C+D; data from locally stored cart snapshot, not authoritative order price | `R/presentation/CartView.jsx:55-125` |
| Cart item | Quantity minus/value/plus, stock-limit notice, remove button | E+A/C+D; minus disabled at 1; plus uses stored stock or fallback | `R/presentation/CartView.jsx:129-166` |
| Cart summary | Subtotal; estimated delivery; conditional savings; Total; promo-code label/input/Apply/feedback; checkout and continue-shopping links | E+D/A; input uppercases code; Apply only stores a nonblank pending code in sessionStorage | `R/presentation/CartView.jsx:176-261`; `SF/app/[subdomain]/cart/page.jsx:81-90` |
| Cart informational copy | Fixed Secure/Delivery/Support labels above the rows; checkout/delivery/COD reassurance below summary | O+D; informational text, no provider guarantee or extra action | `R/presentation/CartView.jsx:36-46,245-260` |
| Cart recommendations | Heading, optional loading state, recommended `ProductCard` list, View all `/#products` link; mobile total/checkout link | C+D/A; recommendations request may fail and omit items | `R/presentation/CartView.jsx:262-318`; `SF/app/[subdomain]/cart/page.jsx:47-76` |
| Checkout shell | Back-to-cart link, heading/explanation, fixed trust labels, optional branding logo/banner text | E+D/A/C+D; branding hidden if both values absent | `R/presentation/CheckoutSections.jsx:101-181` |
| Checkout customer form | Full Name text input, Email email input, Phone Number tel input, Full Address textarea, Delivery area select with empty/Inside Dhaka/Outside Dhaka options; each has a visible label | E+A; all five inputs marked required; state in `useCheckoutFormState` | `R/presentation/CheckoutSections.jsx:185-286` |
| Checkout delivery/payment | Delivery-charge notice; Inside Dhaka `৳80` and Outside Dhaka `৳120` information; Cash on Delivery explanation | E+D; display only, not selectable shipping cards or payment radio buttons | `R/presentation/CheckoutSections.jsx:288-362` |
| Checkout marketing | “Send me a confirmation email to subscribe to this store's offers and product updates” checkbox/label | O+A; independent from mandatory policy consent | `SF/app/[subdomain]/checkout/page.jsx:440-443` |
| Checkout item | Image/fallback, title, optional refreshed short description, quantity minus/value/plus, line/unit price and Remove button | E+D/A; uses cart item plus refreshed product; currently no selected-variant label in this summary | `R/presentation/CheckoutSections.jsx:542-641` |
| Checkout summary | Item count; coupon label/input/Apply/feedback; subtotal, delivery, conditional discount, total; policy checkbox and optional policy `<details>`; Place Order button; trust/COD text | E+D/A/C+D; coupon input uppercases code and validates in checkout; Place Order disabled while loading or without policy acceptance | `R/presentation/CheckoutSections.jsx:447-540,645-792` |
| Checkout mobile submit | Total, pay-on-delivery label, duplicate Place Order submit button | C+D/A; same form submit; disabled while loading or without policy acceptance | `R/presentation/CheckoutSections.jsx:794-814` |
| Checkout OTP modal | Masked phone/instructions; close/cancel, Send code, six-digit input, Verify code, error and busy states | C+D/A; opens on order attempt without verified phone; send/verify endpoints then order submission | `R/presentation/CheckoutSections.jsx:816-944`; `SF/app/[subdomain]/checkout/page.jsx:370-478` |
| Checkout result | Empty-cart explanation/return link **or** success heading, short/full order ID, tracking instruction and return-to-store link | E+D/A per branch; shown in place; no separate route | `R/presentation/CheckoutSections.jsx:28-98`; `SF/app/[subdomain]/checkout/page.jsx:413-419` |
| Checkout source export | Inline `CheckoutPhoneOtpBox` input/Send/Verify controls | NR in active checkout page; shared export exists but page imports/mounts the modal instead | `R/presentation/CheckoutSections.jsx:364-431`; `SF/app/[subdomain]/checkout/page.jsx:14-19,423-478` |
| Checkout data | Selected variant attributes beside each order-summary item; selectable online payment method; courier picker | NR; variant identity may be present in cart/order data, but this summary does not print it; payment UI is COD information only | `R/presentation/CheckoutSections.jsx:542-641,341-362` |
| Account / signed out | Email Address input, Password input, Sign in button, Forgot password button, Create account toggle | E+A for account login branch; login uses tenant-aware auth session | `SF/components/account/AuthView.jsx:4-145`; `SF/app/[subdomain]/account/page.jsx:116-155` |
| Account / registration toggle | Full Name, Email Address and Password inputs; Send verification code button; six-digit Verification Code input, resend button/timer; register submit; switch-back toggle | C+A/D; OTP fields after code sent; name/email/password lock while awaiting code | `SF/components/account/AuthView.jsx:34-145`; `SF/app/[subdomain]/account/page.jsx:90-142` |
| Account / reset stage 1 | Email Address input, Send code button, Back-to-login button | C+A; tenant context and email required | `SF/components/account/PasswordResetFlow.jsx:80-104,195-213,314-325` |
| Account / reset stage 2 | Six individual verification-digit inputs; expiry text, resend/timer, Verify button | C+A/D; six digits required, resend cooldown | `SF/components/account/PasswordResetFlow.jsx:105-128,216-254` |
| Account / reset stage 3 | New Password and Confirm Password inputs; strength/match indicators; Reset Password button | C+A/D; button disabled until strong and matching | `SF/components/account/PasswordResetFlow.jsx:129-152,257-312` |
| Account / signed-in customer | Welcome name/email; Order History, My Profile and Change Password tab buttons; Sign Out button | E+D/A for authenticated account route | `SF/components/account/CustomerDashboard.jsx:5-48` |
| Account / order history | Empty-orders message and Shop link **or** per-order ID/date/first item/extra-item count, total/status, expand button | C+D/A; order list from authenticated `/my-orders`; expansion local state | `SF/components/account/CustomerTabs.jsx:9-79` |
| Account / expanded order | Each item image/title/optional variant chips/quantity/unit and line price with product link; subtotal, optional shipping and total | C+D/A; shown only for expanded order | `SF/components/account/CustomerTabs.jsx:80-158` |
| Account / profile | Full Name, Email Address and Account Role labels/values | E+D; read-only, no profile-edit form | `SF/components/account/CustomerTabs.jsx:164-187` |
| Account / security | Current Password, New Password and Confirm New Password inputs; strength/mismatch hints; submit/loading feedback | C+A/D; `PUT /auth/update-password`, requires current password and strong matching replacement | `SF/components/account/CustomerTabs.jsx:189-293` |
| Account / vendor role | Greeting/name/role, Admin Panel external link, Sign Out button | C+D/A; replaces customer dashboard for VendorAdmin/VendorStaff | `SF/components/account/VendorView.jsx:4-26`; `SF/app/[subdomain]/account/page.jsx:206-215` |
| Account source handler | `AccountPage.handlePasswordReset` toast-only placeholder | NR as a handler for active password-change form; `SecurityTab` owns its own live submit | `SF/app/[subdomain]/account/page.jsx`; `SF/components/account/CustomerTabs.jsx:189-293` |
| Tracking lookup | Order ID input; Delivery phone input; submit button labelled “Send access code,” “Verify and track,” “Track” or “Checking...” by state; sent-code instruction and six-digit access-code input | E+A/C+D; OTP stage after request, order body not displayed before token verification | `SF/app/[subdomain]/track/page.jsx:312-375` |
| Tracking summary | Short order ID; order and updated dates; status and payment badges; cancelled message/reason or progress steps | C+D; only after verified order load | `SF/app/[subdomain]/track/page.jsx:380-455` |
| Tracking delivery | Customer name, address and phone; shipping zone; optional courier/tracking ID, shipped/delivered timestamps | C+D; optional fields require corresponding order values | `SF/app/[subdomain]/track/page.jsx:460-506` |
| Tracking amounts | Subtotal, optional discount/promo code, shipping, optional tax, total | C+D; from verified order response | `SF/app/[subdomain]/track/page.jsx:512-552` |
| Tracking items/payment | Each line's image/title/quantity/SKU-or-“No SKU”, line and unit amount; payment method/status, optional transaction/paid-at details | C+D; from verified order response; variant attributes are not shown in this view | `SF/app/[subdomain]/track/page.jsx:555-615` |
| Tracking actions/history | Conditional Cancel order button, Return/refund request/status and proof links; status note; event timeline message/date/optional reason | C+D/A; buttons rely on `canCancel`/return eligibility; proof links require uploaded media | `SF/app/[subdomain]/track/page.jsx:620-752` |
| Cancellation modal | Close button; Reason select; Optional note textarea; Back and Confirm buttons; busy state | C+A; only when cancel eligible; sends reason/note with order-access token | `SF/app/[subdomain]/track/page.jsx:78-97,759-804` |
| Return modal | Close; per-item selection checkbox/label/quantity; Reason select; required Details textarea; image-file input (1–3 JPEG/PNG/WebP required), optional video-file input (MP4/QuickTime); selected-file labels/remove buttons; Back and Submit | C+A/D; only when return eligible; validates selected items/proof, sends multipart request | `SF/app/[subdomain]/track/page.jsx:810-935` |
| Policies index | Heading/explanation; four type anchors; per-type title and **full policy text** with “Open page” link; Back to store link | E+D/A; merchant policy text or defaults; index does not truncate each policy to a summary | `SF/app/[subdomain]/policies/page.jsx:69-158` |
| Individual policy | Policy label/title, full text and Back to store link | E+D/A; unknown type 404; no editor/acceptance control on this page | `SF/app/[subdomain]/policies/[type]/page.jsx:83-90`; `R/presentation/PolicyView.jsx:4-29` |
| Route/system states | Home unavailable, product missing/loading, category/collection empty/404, cart and checkout empty, account auth/order loading, tracking error/toast, tenant root/product/checkout loading files | C+D; each bound to its page/error branch; no tenant-specific `error.jsx` or `not-found.jsx` | `SF/app/[subdomain]/layout.jsx:19-36`; `SF/app/[subdomain]/loading.jsx`; Parts 2 and 8 source paths |

### Part 10B — Functional contracts of active components

“Required” here means data needed for the component's **meaningful active behavior**, even where a JSX prop has a JavaScript default. Optional data is explicitly named. The ledger above is the element checklist; these contracts specify which component owns each action and state transition. Server responses and browser state remain separate from merchant theme fields.

| Major component / route | Required data; optional data | Children, actions, conditional behavior and source |
|---|---|---|
| `VendorLayout` / every tenant page | Required: resolved tenant ID, published shop/settings snapshot. Optional: available badge/analytics state. | Provides the tenant theme/cart context and mounts header, route `<main>`, footer, consent banner, toasts. Failed tenant lookup renders unavailable/404 branch; it must not substitute another tenant's settings. `SF/app/[subdomain]/layout.jsx:15-55`; `SF/lib/storefrontPublishedSettings.js:7`. |
| `Navbar` + `ReferenceStorefrontHeader` / shell | Required: tenant subdomain, theme, shop-name fallback, cart count. Optional: navigation, logo, verification/trust badges. | Brand home link, configured navigation/overflow/children, search trigger, account/track/cart, mobile menu. Search trigger opens `SearchModal`; cart count comes from `CartProvider`; mobile menu is local state. `SF/components/storefront/Navbar.jsx:29-75`; `R/reference/StorefrontHeader.jsx:57-390`. |
| `SearchModal` / shell | Required: `isOpen`, `onClose`, bounded product list. Optional per product: image/category/description/price. | Input filters title/category/description locally; blank query shows intro and at most four popular links, nonblank shows matches or empty text. Result links close modal; query of at least two characters emits a debounced analytics event. It does not fetch by typed query. `SF/components/search/SearchModal.jsx:9-170`; `Navbar.jsx:36-52`. |
| `ReferenceStorefrontFooter` / shell | Required: shop-name fallback and effective theme. Optional: navigation/footer links, footer text/contact/social, verification, mobile-bottom-nav flag/count. | Initials/name, store/support/policy/contact/social links, credit and fixed assurances; accordion links on narrower view, optional five-link bottom nav. Contact is a mailto link only with email; uploaded logo is not read. `R/reference/StorefrontFooter.jsx:99-231`. |
| `AnalyticsConsentBanner` / shell | Required: client-stored analytics choice. Optional: none. | Explanation plus Decline/Allow; hidden when choice is absent during initial read or already decided; button persists choice. Separate from marketing consent. `SF/components/storefront/AnalyticsConsentBanner.jsx:17-56`. |
| `StorefrontHomeClient` + `ReferenceStorefrontHome` / `/` | Required: tenant subdomain, bootstrap shop/theme, catalog products and section configuration. Optional: categories/details, sectionProducts/Reviews, banners, sale popups, filters/pagination. | Passes Hero, available enabled sections and all-products catalog to one renderer; owns catalog filter/page/search state and variant-picker actions. Initial bootstrap comes from server; later catalog filter/page updates use products API; unavailable response shows error branch. `SF/app/[subdomain]/StorefrontHomeClient.jsx:178-404`; `R/reference/StorefrontHome.jsx:12-151`. |
| `StorefrontHero` / `/` | Required: effective theme and shop-name fallback. Optional: slide images/mobile images, badge/title/subtitle/discount/CTA pairs, multiple slides. | Media/copy/CTA link children; arrows/dots select slides, timer advances every five seconds unless paused. `hero.hidden` or no slides renders only a screen-reader heading. `R/reference/StorefrontHero.jsx:19-172,255-325`. |
| `StorefrontLaunchBanners` / `/` | Required when present: active banner array. Optional per banner: subtitle/image/launch time/CTA URL and label. | Repeated campaign cards/countdowns; link requires a destination and, for scheduled products, public availability. Otherwise the card is noninteractive and may say “Available after launch.” Time boundary refreshes campaign data. `SF/app/[subdomain]/StorefrontHomeClient.jsx:45-175`. |
| Sale popup / `/` | Required when present: active sale popup record and tenant/feature eligibility. Optional: message/media/schedule/CTA/frequency. | Title, optional countdown and linked CTA, dismiss button. Local/session frequency record suppresses repeat display; Escape dismisses. `SF/app/[subdomain]/StorefrontHomeClient.jsx:283-322,401-485`. |
| `HomepageSection` / `/` | Required: enabled section type/config and matching data for data-driven types. Optional: title/text/media/mobile visibility/product/review selections. | Dispatches to 13 registered types. `FeaturedProducts`, `CategoryList`, `Collection`, `CollectionShowcase` render linked data; Banner links and image buttons; FAQ disclosures; Reviews/Trust/Story/text sections display content. Unsupported type yields null; disabled visibility and empty prerequisites suppress sections. Individual child elements are in Part 4 and Part 10A. `R/reference/StorefrontSectionRenderer.jsx:31-168`; `R/reference/StorefrontSectionVariants.jsx:102-350`; `R/reference/StorefrontHome.jsx:61-81`. |
| `FeaturedProducts` section / `/` | Required: section config and eligible section/catalog products. Optional: title and product-card flags. | Heading, fixed subtitle, View all anchor and product cards; no products returns null. `R/reference/StorefrontSectionRenderer.jsx:72-98`. |
| `CategoryList` section / `/` | Required: category details/names or products with categories. Optional per category: image and positive count; optional section title. | Category name/image-or-initial/count and route link; no category models returns null. `R/reference/StorefrontSectionVariants.jsx:52-175`. |
| `Collection` and `CollectionShowcase` sections / `/` | Required: selected eligible product IDs resolved to products. Optional: title/card settings. | Heading and product cards, null with no products. Registry permits rendering while editor creation is disabled for these two types. `R/reference/StorefrontSectionRenderer.jsx:112-120`; `R/reference/StorefrontSectionVariants.jsx:283-301`; `T/index.cjs:64-90`. |
| `Banner` section / `/` | Required: section config; link destination falls back to `#products`. Optional: title, subtitle, desktop/mobile images, button text, multiple-image array. | Whole banner is link; button text is part of its content. Multiple images add previous/next buttons; no separate CTA click handler. `R/reference/StorefrontSectionVariants.jsx:325-350`. |
| `Reviews` section / `/` | Required: eligible selected reviews or manual review text. Optional per review: name, rating and product title. | Read-only quote/review children; no review input here; no entries returns null. `R/reference/StorefrontSectionVariants.jsx:181-233`. |
| `FAQ` section / `/` | Required: text that parses to at least one question (or nonempty fallback line). Optional: section title and answer text. | Question `<summary>` toggles disclosure; optional answer; no parsed content returns null. `R/reference/StorefrontSectionRenderer.jsx:121-145`. |
| `TrustBadges` section / `/` | Required: nonempty text-derived badge entries. Optional: heading. | Heading and up to eight read-only items/icons; empty list returns null. `R/reference/StorefrontSectionRenderer.jsx:146-158`. |
| `BrandStory` section / `/` | Required: story text or image. Optional: heading and whichever of text/image is absent. | Label/title, optional paragraph/media, no direct customer control. Homepage availability check suppresses empty story. `R/reference/StorefrontHome.jsx:61-81`; `R/reference/StorefrontSectionVariants.jsx:237-281`. |
| `Newsletter`, `PromoBlock`, `TextBlock`, `BrandShowcase` sections / `/` | Required: registered enabled section. Optional: title/text. `BrandShowcase.imageUrl` may be stored. | Generic title/text content; no form or button action. `BrandShowcase.imageUrl` is not consumed by the generic renderer. `R/reference/StorefrontSectionRenderer.jsx:163-166`; `R/reference/StorefrontSectionVariants.jsx:307-323`. |
| `StorefrontAllProducts` / `/` | Required: `allProducts` flag/config, current products, `filters`, pagination and change callbacks; theme. Optional: categories, ratings, `priceInput`, loading state. | Catalog search, sort, category/price/rating/stock filters, chips, product cards, empty/reset and page controls. All callbacks are supplied by `StorefrontHomeClient`; `isEnabled === false` returns null. `R/reference/StorefrontAllProducts.jsx:105-375`; `SF/hooks/useShopData.js:73-135`. |
| `ProductCard` / home/category/collection/recommendations | Required: product ID/slug, title and price source; link component and action callbacks for enabled actions. Optional: image, category, original price/discount, rating/reviews, stock, SKU, wishlist and quick-buy flags. | Detail link, primary image/fallback, metadata and conditional wishlist/add/buy buttons. Out-of-stock disables purchase. No card quantity, description, gallery or variant list; buy-now may delegate to variant picker. `R/reference/StorefrontProductCard.jsx:26-263`; `SF/hooks/useStorefrontProductActions.js:70-205`. |
| `StorefrontVariantPickerModal` / buying from grids | Required: `open`, product variants, `onSelectVariant`, `onClose`. Optional: loading/image/SKU/stock. | Product summary, close, variant buttons with labels/SKU/stock; archived/inactive variants omitted and zero-stock choices disabled. Null while closed, loading and no-options branches otherwise. `SF/components/storefront/StorefrontVariantPickerModal.jsx:16-110`. |
| `CategoryPageClient` / `/categories/{slug}` | Required: resolved category name, shop/subdomain, products, pagination/query filter state. Optional: category detail/cover and rating data. | Back link, title/count, optional cover, draft price/stock/sale/rating controls and Apply/Clear, URL-driven chips/sort/page controls, cards/empty state/variant picker. Applying filters resets page; empty or unknown category handled by server page. `SF/app/[subdomain]/categories/[slug]/CategoryPageClient.jsx:36-398`; `page.jsx:51-134`. |
| `CollectionPageClient` / `/collections/{slug}` | Required: resolved collection, shop/subdomain, products and pagination. Optional: description/cover, sort query. | Back link, collection metadata/count, sort, cards, empty Home link, previous/next and variant picker. Sort resets page; no category-style filters. `SF/app/[subdomain]/collections/[slug]/CollectionPageClient.jsx:20-169`; `page.jsx:30-98`. |
| `ProductDetails` / `/products/{id}` | Required: tenant, product ID and public product response. Optional: server initial product, reviews, related products, variants. | `useProductData` resolves/refreshes product and derived price/stock, then passes handlers/data to `ProductDetailsView`; loading/missing states precede it. Add writes tenant cart; Buy Now adds and routes to checkout. `SF/components/product/ProductDetails.jsx:39-139`; `SF/hooks/useProductData.js:10-126`. |
| `ProductImageGallery` / product detail | Required: product title, image list (may be empty). Optional: selected variant image, alt text/category/discount. | One active image/fallback, optional badges and thumbnail buttons. Variant image is prepended by parent; thumbnail click changes local active index. `R/presentation/ProductDetailsView.jsx:14-35`; `R/presentation/ProductImageGallery.jsx:8-110`. |
| `ProductInfo` / product detail | Required: title and derived final price. Optional: rating/review count, variant SKU/barcode, original price/discount, description. | Rating/title/IDs/price/COD/description. Missing description uses fixed sentence; long description exposes expand/collapse. `R/presentation/ProductInfo.jsx:20-104`. |
| `VariantSelector` + purchase controls / product detail | Required when variants exist: attribute options, selected values, variant list and selection handler; purchase controls need displayed stock, quantity and cart/buy handlers. Optional: SKU/stock combination details. | Attribute buttons update selected combination and reset quantity; quantity minus/plus constrained to 1..stock. Add remains visible but disabled at zero stock, while Buy Now and mobile copies require stock. Fixed assurance/help text follows actions. Selector itself returns null without attributes. `R/presentation/VariantSelector.jsx:12-72`; `R/presentation/ProductDetailsView.jsx:39-143`; `R/presentation/ActionButtons.jsx:15-88`. |
| `ProductInformationTabs` / product detail | Required: arrays or empty values for features, specifications and comments. Optional: populated entries. | Three tab buttons always render; selected panel shows point/reason, key/value specs or guide disclosures, or an explicit empty message. Tab change is local state. `R/presentation/ProductExtras.jsx:115-234`. |
| `ReviewSection` + `RelatedProducts` / product detail | Required: product/tenant ID and review list; optional: related products and authenticated customer state. | Review count/cards or empty message; signed-out login link versus signed-in rating/comment form and POST submit, with validation and feedback. Related list appears only with products. `R/presentation/ReviewSection.jsx:15-187`; `SF/components/product/ReviewSection.jsx`; `SF/components/product/RelatedProducts.jsx`. |
| `CartProvider` / shell and purchase routes | Required: tenant subdomain for storage key. Optional: persisted item array. | Holds item key (`productId` + variant ID), quantity, count, derived total and add/update/remove/clear methods. Browser storage is tenant-keyed; item prices/stock are snapshots. `SF/context/CartContext.jsx:6-113`. |
| `CartPage` + `CartView` / `/cart` | Required: cart state/actions and derived subtotal; optional: promo code, recommendation results, theme card options. | Empty/filled branch; item information and quantity/remove; estimated totals, coupon-save feedback, checkout/continue links. Fetches up to six recommendations; failure omits them. `SF/app/[subdomain]/cart/page.jsx:14-100`; `R/presentation/CartView.jsx:6-318`. |
| `CheckoutPage` / `/checkout` | Required: nonempty tenant cart, five customer fields, delivery zone, policy acceptance, phone verification and server order response. Optional: coupon, marketing choice, checkout branding/policy text and signed-in user. | Coordinates form/summary/OTP modal; validates intent, issues OTP calls and submits authenticated or guest order with idempotency key. Success clears cart and renders confirmation; failure retains cart. Client totals are provisional. `SF/app/[subdomain]/checkout/page.jsx:35-481`. |
| `CheckoutDetailsColumn` / checkout | Required: `formData` and input-change callback. Optional: selected delivery zone drives informational notice. | Five labeled required fields; two displayed zone charges and COD information. Selecting the area updates form state, not a courier or payment selection. `R/presentation/CheckoutSections.jsx:185-286,288-445`. |
| `CheckoutOrderSummary` / checkout | Required: cart items/actions, totals, policy state/setter, submit/loading state. Optional: refreshed product descriptions, coupon code/result, discount, visible policy texts, branding trust message. | Rows with quantity/remove, coupon preview, price breakdown, policy checkbox/disclosures, Place Order submit and COD/trust text. Submit disabled without consent or while loading; order handler performs further validation. `R/presentation/CheckoutSections.jsx:447-792`; `SF/app/[subdomain]/checkout/page.jsx:194-367`. |
| `CheckoutOtpModal` / checkout | Required: `open`, state, code/setter, masked phone, send/verify/cancel handlers. Optional: error string. | Idle send → code input → verify → order placement/error; six digits required to verify, close/cancel blocked while busy. Only mounted during active page flow; `CheckoutPhoneOtpBox` export is unused there. `R/presentation/CheckoutSections.jsx:816-944`; `SF/app/[subdomain]/checkout/page.jsx:370-478`. |
| `AuthView` / `/account` signed out | Required: auth form/setter, login/register mode, submit handler. Optional: OTP sent/timer/loading and forgot-password callback. | Sign-in email/password; register adds name and email OTP controls; toggle switches forms; forgot password opens reset flow. On valid customer login the auth provider updates session. `SF/components/account/AuthView.jsx:4-145`; `SF/app/[subdomain]/account/page.jsx:90-155`. |
| `PasswordResetFlow` / `/account` signed out | Required: tenant subdomain, reset-stage state, email/OTP/new password and stage handlers. Optional: resend cooldown/loading feedback. | Email request → six-digit OTP verification → strong matching replacement → return to login. It has back and resend controls; backend reset endpoints decide validity. `SF/components/account/PasswordResetFlow.jsx:44-325`. |
| `CustomerDashboard` / `/account` authenticated | Required: `user`, customer order list and logout handler. Optional: loading/empty list. | Local tab state switches Order History, Profile and Security; logout ends session. Order rows expand locally; profile is read-only; SecurityTab calls password-update API. Vendor roles render `VendorView` instead. `SF/components/account/CustomerDashboard.jsx:5-48`; `SF/components/account/CustomerTabs.jsx:9-293`; `SF/app/[subdomain]/account/page.jsx:162-215`. |
| `TrackOrderPage` / `/track` | Required: tenant subdomain, customer-entered order ID and delivery phone, access OTP/token and verified order response. Optional: courier/tracking/payment/timeline/return data. | Lookup form requests OTP then verifies it; token gates GET order. Verified data shows status, address, amounts/items/payment/timeline. `canCancel` enables cancellation form; return eligibility enables item/reason/details/proof form. Invalid input/API errors toast; action endpoints remain tenant/token guarded. `SF/app/[subdomain]/track/page.jsx:99-935`; `BE/routes/storefrontRoutes.js:224-245`. |
| `PoliciesPage` + `PolicyView` / `/policies`, `/policies/{type}` | Required: tenant shop and one of four policy types; optional: merchant-authored text (default text available). | Index anchors, full text for all four policies and individual “Open page” links; detail title/full content/back link. Unsupported type returns 404. No policy acceptance action here; checkout owns its checkbox. `SF/app/[subdomain]/policies/page.jsx:69-158`; `SF/app/[subdomain]/policies/[type]/page.jsx:83-90`; `R/presentation/PolicyView.jsx:4-29`. |

### Part 10C — Conditional state contract by route

| Route/component | Trigger → actual rendered branch or control consequence | Class / source |
|---|---|---|
| All tenant routes | Shop resolution fails → temporarily-unavailable message; 404/423 → Next not-found path. Published revision changes → client refresh watcher. | PE/C+D; `SF/app/[subdomain]/layout.jsx:15-55` |
| Homepage | Bootstrap error → “Store Unavailable”; catalog request pending → six placeholders; zero filtered products → No products found and Clear filters. | E/C+D/A; `SF/app/[subdomain]/StorefrontHomeClient.jsx:341-359`; `R/reference/StorefrontAllProducts.jsx:260-295` |
| Homepage content | Hidden hero → screen-reader heading only; absent section prerequisites → null; absent campaign → no launch banner/sale popup; dismissed sale → popup removed. | C/NR; `R/reference/StorefrontHero.jsx:255-325`; `R/reference/StorefrontHome.jsx:61-81`; `SF/app/[subdomain]/StorefrontHomeClient.jsx:106-175,283-322` |
| Header search | Closed → no modal; blank query → intro/popular links; nonblank zero matches → No products found; fetch failure leaves bounded list empty. | C+D/A; `SF/components/search/SearchModal.jsx:17-170`; `SF/components/storefront/Navbar.jsx:36-52` |
| Category/collection | Invalid canonical slug/product → server redirect or 404; zero products → empty explanation with Clear/Home action; multiple pages → page controls. | E/C+D/A; `SF/app/[subdomain]/categories/[slug]/page.jsx:51-134`, `CategoryPageClient.jsx:302-360`; `collections/[slug]/page.jsx:30-98`, `CollectionPageClient.jsx:112-162` |
| Product detail | Loading → spinner; missing/failed public product → missing-product message and Back to shop; no media → image fallback; stock zero → quantity/mobile controls absent and purchase unavailable; no reviews → empty text. | E/C+D/A; `SF/components/product/ProductDetails.jsx:115-139`; `R/presentation/ProductImageGallery.jsx:53-108`, `ProductDetailsView.jsx:57-143`, `ReviewSection.jsx:139-187` |
| Cart | No items → empty-cart message/Shop link; coupon blank → local error feedback; coupon filled → saved-for-checkout feedback; recommendation error → recommendation list omitted. | E/C+D/A; `R/presentation/CartView.jsx:6-30,206-260`; `SF/app/[subdomain]/cart/page.jsx:47-90` |
| Checkout | No items → empty-cart state; missing required HTML field/policy/zone → browser or page validation prevents order; phone unverified → OTP modal; OTP send/verify/order failure → error text/toast; order accepted → in-place success/order ID and cart clear. | E/C+D/A; `SF/app/[subdomain]/checkout/page.jsx:194-478`; `R/presentation/CheckoutSections.jsx:28-98,816-944` |
| Account | Auth or order fetch pending → spinner; signed out → login/register/reset forms; customer → dashboard and orders-empty branch when applicable; vendor role → portal view; auth/password errors → toast/inline hint. | E/C+D/A; `SF/app/[subdomain]/account/page.jsx:162-220`; `SF/components/account/CustomerTabs.jsx:23-32,189-293` |
| Tracking | Before verification → lookup form only; missing ID/phone or invalid OTP/API response → toast, no order detail; verified order → summary; Cancelled → cancellation branch instead of progress; ineligible cancel/return → related action absent; action failure → toast. | E/C+D/A; `SF/app/[subdomain]/track/page.jsx:143-312,380-752` |
| Policies | Shop text absent → default policy text; unsupported policy type → 404; valid type → title/body/Back link. | E/C+D/A; `SF/app/[subdomain]/policies/page.jsx:69-158`; `policies/[type]/page.jsx:83-90` |

## Part 11 — Data and functionality dependencies

| Component/user action | Frontend source → API | Backend/model/state and fallback |
|---|---|---|
| Open tenant store | `proxy.js` → `getPublishedStorefrontSettings` → `GET /storefront/{tenant}/info` | `resolveTenant`; `Shop`; effective published theme; unavailable/404 instead of another tenant's data (`BE/middlewares/tenant.js:50`; `BE/controllers/storeController.js:131`) |
| Render home | `getInitialStorefrontData` → `GET /storefront/{tenant}/bootstrap` | `Shop`, `Product`, `Category`, `Collection`, `Review`, `Banner`, sale data; eligible tenant product query; section IDs map to products/reviews (`BE/controllers/storeController.js:162-395`) |
| Filter/page home | `StorefrontHomeClient` → `useShopData` → `GET /storefront/{tenant}/products` | Tenant published products, search/filter/sort/pagination; retains prior categories (`SF/hooks/useShopData.js:73-135`) |
| Header search | `Navbar` → `GET /storefront/{tenant}/products?limit=12`; `SearchModal` local filter | Bounded product snapshot; no server request per query (`Navbar.jsx:36`; `SearchModal.jsx:22`) |
| Category/collection | Server `page.jsx` → `/info`, `/products` or `/collections/{slug}` | Tenant category/collection/product models, optional media, pagination and 404/redirect |
| Product detail/reviews | Product server fetch and `useProductData` → `/products/{id}`, `/products/{id}/reviews`, category products | Public Product, Review; missing/failed product fallback; review submit requires auth (`BE/routes/storefrontRoutes.js:158-181`) |
| Add/buy/wishlist | `useStorefrontProductActions` → tenant `CartProvider`; full product fetch if variant choices needed | Browser localStorage keyed by tenant; cart item key product+variant; wishlist localStorage, no wishlist API (`SF/hooks/useStorefrontProductActions.js:18-205`) |
| Cart recommendations | `CartPage` → `/recommendations/cart?ids=...` | Tenant recommendation response; omitted on failure (`SF/app/[subdomain]/cart/page.jsx:43-76`) |
| Coupon | Cart saves pending code; `useCheckoutCoupon` previews with promotion API | Validation not performed by cart; checkout/backend determines eligible discount (`SF/app/[subdomain]/checkout/hooks/useCheckoutCoupon.js`) |
| Phone OTP / order | `useCheckoutPhoneOtp` → `/checkout/send-otp`, `/verify-otp`; checkout → authenticated `/storefront/{tenant}/orders` or guest `/public/orders` | Tenant/phone verification, product/stock/order service, idempotency; `Order` model; failure retains cart (`BE/controllers/orderController.js:241`; `BE/controllers/publicController.js:274`) |
| Session/account | `AuthContext` and `AccountPage` → `/auth/me`, `/login`, `/register-customer`, `/send-otp`, `/logout`, reset/password APIs, `/storefront/{tenant}/my-orders` | Tenant customer identity, cookie session, protected orders (`BE/routes/authRoutes.js:40-139`; `BE/routes/storefrontRoutes.js:192-218`) |
| Track/cancel/return | `TrackOrderPage` → `/orders/{id}/access/send-otp`, `/verify-otp`, `/track-order/{id}`, `/cancel`, `/returns` | Order-access token, tenant order eligibility, return proof upload (`BE/controllers/publicController.js:881-1234`) |
| Policy/metadata | Server shop info and `theme.policies`/SEO fields | Theme defaults via `T/policies.cjs`; dynamic page metadata, tenant robots/sitemaps |

The browser API calls commonly pass through `SF/app/api/[...path]/route.js` to `/api` on the backend, which also forwards tenant host context. `StorefrontRevisionWatcher` polls `/storefront/{tenant}/theme-revision` and asks Next.js to refresh on change. The Admin builder's draft/publish APIs are control-plane dependencies, not customer interactions (`BE/routes/storeBuilderRoutes.js`; `BE/services/storeBuilder/storeBuilderService.js:257,333`).

## Part 12 — Nine-preset structural coverage

All nine presets reuse the shell, hero component, section registry, ProductCard, category/collection/product pages, cart, checkout, account, tracking and policy paths. They select composition/section types; they do not add an industry-specific checkout or product model. `T/prebuilt.cjs:280-480` defines the blueprints. **Baseline activation rule:** FeaturedProducts and CategoryList are automatically enabled in a preset blueprint, but can still render nothing if catalog/category data is absent. Other listed blueprint sections enable only when matching merchant content exists (`T/prebuilt.cjs:520-615`); a retained unmatched merchant section can also remain in the flow. “Conditional” below means blueprint-defined, not guaranteed visible.

| Preset | Composition / automatic content sections | Conditional blueprint sections | Raw functional difference |
|---|---|---|---|
| Modern General | Standard; CategoryList, FeaturedProducts | PromoBlock, CollectionShowcase, Reviews, Newsletter | Same shared sections/actions |
| Minimal General | Standard; FeaturedProducts, CategoryList | BrandStory, Newsletter | Same shared sections/actions |
| Modern Fashion | Standard; CategoryList, FeaturedProducts | Banner, BrandStory, CollectionShowcase, Reviews, Newsletter | Same shared sections/actions |
| Editorial Fashion | Editorial; CategoryList, FeaturedProducts | BrandStory companion, CollectionShowcase, Reviews, Newsletter | Story can be claimed into companion slot when present |
| Luxury Jewellery | Boutique; CategoryList, FeaturedProducts | CollectionShowcase and BrandStory gallery slots, Reviews, TrustBadges, Newsletter | Collection/story can be claimed into gallery when present |
| Minimal Jewellery | Standard; FeaturedProducts, CategoryList | BrandStory, Reviews | Same shared sections/actions |
| Soft Beauty | Standard; CategoryList, FeaturedProducts | Banner, BrandStory, Reviews, FAQ, Newsletter | Same shared sections/actions |
| Modern Electronics | Discovery; CategoryList companion, FeaturedProducts | PromoBlock, CollectionShowcase, TrustBadges, FAQ | Category section can accompany hero when data exists |
| Fresh Grocery | Standard; CategoryList, FeaturedProducts | PromoBlock, CollectionShowcase, TrustBadges, Newsletter | Same shared sections/actions |

The combined unique raw components are the shell and controls in Part 3, Hero/launch banner/sale popup/catalog plus 13 section types in Part 4, shared ProductCard/detail components in Part 5, and the non-home route components in Parts 6–8. A preset does not make an optional review, story, collection, newsletter block or trust item exist without its required content. Preset switching copies merchant logo/favicon, navigation, footer, policies, SEO, payment settings and checkout branding; section content is retained but may be reordered or disabled by the content gate (`T/prebuilt.cjs:566-650`).

## Part 13 — Essential storefront functionality and customer journey

| Transition | Trigger and state/destination | Required data; failure or validation branch |
|---|---|---|
| Visit store → home | Host rewrite, tenant layout, server bootstrap | Active tenant and published settings; unavailable/404/plan redirect (`SF/proxy.js:25`; `SF/app/[subdomain]/layout.jsx:15`) |
| Home → find product | Hero/section/category/product links; catalog search/filter/sort/pages or header modal | Eligible tenant products; empty catalog/search state (`R/reference/StorefrontAllProducts.jsx:105`; `SF/components/search/SearchModal.jsx:22`) |
| Card → detail | `ProductCard` whole-card link `/products/{slug-or-id}` | Public product; 404/canonical redirect or client missing state (`R/reference/StorefrontProductCard.jsx:142`; `SF/app/[subdomain]/products/[id]/page.jsx:87`) |
| Detail → choose options/quantity | Variant buttons and quantity +/- | Available variants and stock; quantity clamped locally, action disabled at zero stock (`R/presentation/VariantSelector.jsx:12`; `ProductDetailsView.jsx:47`) |
| Product → cart | Add callback through `ProductDetails`/`useStorefrontProductActions` → `CartProvider` | Product/variant identity; local cart persists by tenant; toast feedback (`SF/context/CartContext.jsx:40`) |
| Product → checkout directly | Buy-now adds to cart, then routes `/checkout`; card may first open variant picker | Available stock/options; fetch error or out-of-stock toast (`SF/hooks/useStorefrontProductActions.js:115`) |
| Cart → checkout | Quantity/remove/coupon-save then `/checkout` link | Nonempty cart; coupon merely stored until checkout (`R/presentation/CartView.jsx:6`; `SF/app/[subdomain]/cart/page.jsx:78`) |
| Checkout → order | Form, delivery zone, policy checkbox, optional marketing choice, phone OTP; POST authenticated or guest order | Required fields, policy/zone, verification token, server pricing/stock, idempotency; error retains cart (`SF/app/[subdomain]/checkout/page.jsx:194-367`) |
| Order → feedback | In-page `CheckoutSuccessState` shows short/full ID; clears cart | Successful API response with order ID; no separate confirmation route (`R/presentation/CheckoutSections.jsx:28`) |
| Feedback → tracking | User opens `/track`, enters order ID and delivery phone, verifies access OTP | Order and matching phone; access token required; then order status/timeline/cancel/return if eligible (`SF/app/[subdomain]/track/page.jsx:141-306`) |
| Account alternative | `/account` login/registration → authenticated history/profile/security | Tenant-scoped customer session and orders; registration email OTP, reset flow, error toasts (`SF/app/[subdomain]/account/page.jsx:90-215`) |

Essential invariants visible in this flow are tenant identity, routable products, honest price/availability display, cart item/variant identity, order validation, policy consent, phone verification, protected order access and clear success/error states. Promotional, social, review, story, newsletter-labelled text and analytics-consent components are not required for a basic purchase.

## Part 14 — Missing, incomplete, legacy and unverified functionality

**Not implemented as an active tenant component:** standalone announcement bar; hero video; card gallery/description/quantity/full variant selector; dedicated tenant search-results page; dedicated order confirmation/detail route; active `/signup` page; newsletter signup form in the `Newsletter` section; footer newsletter, uploaded logo, phone/address display, automatic category list or payment-provider icons. The header search modal is limited to the fetched product subset; it does not query the backend for every typed term. The shared footer uses initials and name rather than `theme.logoUrl`. These are source observations, not proposed changes.

**Registered or displayed but not the implied action:** `BrandShowcase` stores an image setting but the active generic renderer uses title/text; `Collection`, `CollectionShowcase`, `BrandShowcase` render under existing data but are `editorEnabled: false` in `T/index.cjs:64-90`. The `Newsletter` section is text/icon only; checkout marketing opt-in is separate. Checkout displays only COD; stored payment-provider settings do not create additional checkout choices. Delivery cards are informational; the area select determines the zone. The cart coupon action saves a code but does not validate it. The checkout order-summary row does not display selected variant attributes even though cart/order data can contain variant identity. The tracking item row prints SKU or “No SKU,” not variant attributes. The shared `CheckoutPhoneOtpBox` export is not mounted by the active checkout, which uses `CheckoutOtpModal`. `StorefrontHero` receives but ignores `storewideDiscount`; it renders slide `discountText`. The `/account` registration form works through a toggle even though `/signup/page.jsx` is commented. An old `AccountPage.handlePasswordReset` placeholder exists, but the rendered `SecurityTab` has its own API handler.

**Source verified, runtime unverified:** tenant host resolution on every deployed domain; the review form's literal `/{subdomain}/account` login link on a tenant host; CDN/media availability; external OTP/email/SMS delivery; live order placement/payment; return proof upload; all provider outcomes; real device/browser behavior; accessibility beyond code inspection; actual content in every merchant theme. The presence of UI and routes does not prove these operations succeed in production. No source, environment, database or merchant data was changed for this audit.

## Part 15 — Source code references and completeness check

| Concern | Full repository-relative files / entry points |
|---|---|
| Host and tenant shell | `ecommerce-storefront/src/proxy.js:25` (`proxy`); `ecommerce-storefront/src/app/[subdomain]/layout.jsx:15` (`VendorLayout`); `ecommerce-backend/backend/middlewares/tenant.js:50` (`getRequestedTenant`) |
| Published theme/data | `ecommerce-storefront/src/lib/storefrontPublishedSettings.js:7`; `ecommerce-storefront/src/lib/storefrontServer.js:72`; `ecommerce-backend/backend/controllers/storeController.js:131,162`; `ecommerce-backend/backend/models/Shop.js:347` |
| Theme/presets/preview | `packages/storefront-theme/index.cjs:59` (`SECTION_REGISTRY`); `packages/storefront-theme/prebuilt.cjs:280,566,617`; `packages/storefront-theme/composition.cjs:5`; `ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx:11` |
| Shared header/home/sections/cards/footer | `packages/storefront-renderer/reference/StorefrontHeader.jsx:180`; `StorefrontHero.jsx:255`; `StorefrontHome.jsx:12`; `StorefrontComposition.jsx:13`; `StorefrontSectionRenderer.jsx:31`; `StorefrontSectionVariants.jsx:102`; `StorefrontAllProducts.jsx:105`; `StorefrontProductCard.jsx:26`; `StorefrontFooter.jsx:99` (all under `packages/storefront-renderer/reference/`) |
| Live home and search | `ecommerce-storefront/src/app/[subdomain]/page.jsx:76`; `StorefrontHomeClient.jsx:178`; `ecommerce-storefront/src/hooks/useShopData.js:44`; `ecommerce-storefront/src/components/storefront/Navbar.jsx:29`; `ecommerce-storefront/src/components/search/SearchModal.jsx:9` |
| Category and collection | `ecommerce-storefront/src/app/[subdomain]/categories/[slug]/page.jsx:134`, `CategoryPageClient.jsx:36`; `collections/[slug]/page.jsx:98`, `CollectionPageClient.jsx:20` |
| Product detail | `ecommerce-storefront/src/app/[subdomain]/products/[id]/page.jsx:87`; `ecommerce-storefront/src/components/product/ProductDetails.jsx:39`, `RelatedProducts.jsx`; `ecommerce-storefront/src/hooks/useProductData.js:10`; `packages/storefront-renderer/presentation/ProductDetailsView.jsx:8`, `ProductImageGallery.jsx:8`, `ProductInfo.jsx:20`, `VariantSelector.jsx:12`, `ActionButtons.jsx`, `ProductExtras.jsx:121`, `ReviewSection.jsx:139` |
| Cart, checkout, actions | `ecommerce-storefront/src/context/CartContext.jsx:6`; `ecommerce-storefront/src/hooks/useStorefrontProductActions.js:70`; `ecommerce-storefront/src/app/[subdomain]/cart/page.jsx:14`; `checkout/page.jsx:35`; `packages/storefront-renderer/presentation/CartView.jsx:6`; `CheckoutSections.jsx:28` |
| Auth, account, tracking | `ecommerce-storefront/src/context/AuthContext.js:39`; `ecommerce-storefront/src/app/[subdomain]/account/page.jsx:13`; `ecommerce-storefront/src/components/account/AuthView.jsx:4`, `CustomerDashboard.jsx:5`, `CustomerTabs.jsx:9`, `PasswordResetFlow.jsx:44`, `VendorView.jsx:4`; `ecommerce-storefront/src/app/[subdomain]/track/page.jsx:99` |
| Policies, routing and API | `ecommerce-storefront/src/app/[subdomain]/policies/page.jsx`; `policies/[type]/page.jsx`; `ecommerce-storefront/src/app/api/[...path]/route.js`; `ecommerce-backend/backend/routes/storefrontRoutes.js:94-270`; `authRoutes.js:40-139`; `publicRoutes.js:8-18` |

**Coverage check:** every `page.jsx` under `SF/app/[subdomain]` is in Part 2, including the commented signup file; tenant SEO route handlers, platform page routes and the API proxy are separately identified. Parts 3–8 trace the active imports for shell, home, product, cart, checkout, account, tracking, policies and search. Part 4 accounts for all 13 registered section types and Part 12 all nine presets. No test or build was needed to alter behavior because this deliverable is documentation; functionality claims above are explicitly limited to static source inspection.
