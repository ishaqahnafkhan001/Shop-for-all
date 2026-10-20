# Atelier Editorial — Figma and storefront component mapping

**Planning only, 20 October 2026.** All nine Figma frame screenshots and design contexts were inspected. No source component below has been implemented or changed for this task. Existing behavior is grounded in [the functional inventory](C:/Users/user/WebstormProjects/Shop-for-all/STOREFRONT_RAW_STRUCTURE_AND_FUNCTIONAL_INVENTORY.md). Read alongside [the implementation plan](C:/Users/user/WebstormProjects/Shop-for-all/NEW_THEME_IMPLEMENTATION_PLAN.md) and [the regression matrix](C:/Users/user/WebstormProjects/Shop-for-all/NEW_THEME_REGRESSION_MATRIX.md).

Implementation choices: **R1** reuse unchanged; **R2** reuse with scoped presentation; **R3** isolated presentation variant; **R4-O** optional pure presentation seam only after a separately approved preview/structural need. Every new appearance is selected by the optional validated `theme.presentationVariant = 'atelier-editorial'`; missing/null uses current rendering. Homepage composition and preset provenance do not select the storefront family.

All current **live routes and states** are mandatory. Essential Builder scope is its current home/product/cart/checkout/policy preview modes, availability, selection, editor controls, autosave and publish/restore. New category/collection/account/tracking preview choices and their extractions are optional Phase O.

## 1. Inspected design reference

| Figma frame | Node | Scope observed |
|---|---|---|
| Desktop homepage | [2:2](https://www.figma.com/design/sZlr7zuW8dDLDQ0ESGXSf5?node-id=2-2) | Announcement, header, statement/media hero, promo strip, four category tiles, four product cards, story, trust row and footer |
| Mobile homepage | [2:3](https://www.figma.com/design/sZlr7zuW8dDLDQ0ESGXSf5?node-id=2-3) | Brand/menu, stacked hero, two-column tiles/cards, story and compact footer |
| Product detail | [2:4](https://www.figma.com/design/sZlr7zuW8dDLDQ0ESGXSf5?node-id=2-4) | Gallery, product info, finish choices, quantity, cart/buy, detail disclosures and related heading |
| Category / collection | [2:5](https://www.figma.com/design/sZlr7zuW8dDLDQ0ESGXSf5?node-id=2-5) | Heading, sidebar filters, count/sort, product listing |
| Shopping bag | [2:6](https://www.figma.com/design/sZlr7zuW8dDLDQ0ESGXSf5?node-id=2-6) | Items/variant/SKU/quantity/remove, summary, promo code, checkout link |
| Checkout | [2:7](https://www.figma.com/design/sZlr7zuW8dDLDQ0ESGXSf5?node-id=2-7) | Customer fields, delivery zone, COD, policy and marketing checkboxes, summary; explicitly a nonfunctional concept |
| Account | [2:8](https://www.figma.com/design/sZlr7zuW8dDLDQ0ESGXSf5?node-id=2-8) | Login form and decorative panel; other account views mentioned but not drawn |
| Tracking | [2:9](https://www.figma.com/design/sZlr7zuW8dDLDQ0ESGXSf5?node-id=2-9) | Lookup form and illustrative timeline; explicitly notes phone/OTP requirement |
| Policies | [2:10](https://www.figma.com/design/sZlr7zuW8dDLDQ0ESGXSf5?node-id=2-10) | Contents links and two sample policy sections; four policy types named |

Figma visual-only/sample elements include merchant/product illustrations, demo prices and IDs, text-layer icons, free-delivery claims, locale labels and prototype disclaimers. Use actual interactive HTML controls and current data; never copy sample claims or pretend that shape/text nodes implement a form.

## 2. Shared shell and global states

| Figma section | Existing component / source | Proposed implementation | Data source and current behavior | Isolation requirement |
|---|---|---|---|---|
| Brand wordmark, navigation and utility row; 3:5–9 | `Navbar` and shared header: `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/components/storefront/Navbar.jsx:29`; `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontHeader.jsx:180` | R3 `AtelierHeader` receives existing header model/callbacks; use real home/navigation/search/account/track/cart controls | Shop name/subdomain, logo, verified/trusted state, normalized navigation/children, cart count; same live search-open callback | Shared parent chooses new view only for Atelier; existing nine header branches/markup remain intact |
| Sample FORM & FOUND logo/name | Existing `BrandMark`, same header file at 57 | R2 merchant logo or merchant text fallback; no sample wordmark asset | `theme.logoUrl`, `shopName`, subdomain fallback | Never gate identity or renderer by merchant name; test long Bengali/Latin names |
| Mobile menu symbol, node 4:6 | Existing header mobile controls | R2 actual menu button, links/children, close, account/tracking/search/cart access | Existing open/close state; utility links remain reachable despite reduced mobile mockup | CSS/semantics gated; keyboard and focus handling tied to correct document |
| Top free-delivery strip, 3:2–4 and repeated supporting headers | No independent announcement-bar component/config in current shell | Do not create a default shipping claim. Omit initially; existing campaign content remains on its supported surface | Current courier/checkout behavior does not establish the sample ৳2,500 threshold. `PromoBlock` and banners already carry configured merchant copy | No new announcement schema or inferred shipping promotion; any later feature is a separate scoped task |
| BD / EN | No locale/currency switcher found in current functional inventory | Currently unsupported; omit as a control | No language/currency selection state/API exists in inspected path | No fake dropdown or decorative control with implied behavior |
| Search utility / open overlay | `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/components/search/SearchModal.jsx:9` | R2 same local-search input/results/close; presentation aligned with new theme | Bounded product fetch from Navbar (limit 12); title/category/description local filter, popular first four, empty state | Keep search scope/API behavior; no new results route advertised |
| Bag count / wishlist-style glyphs | Header cart link; card actions; `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/hooks/useStorefrontProductActions.js:18` | R2/R3 real named buttons/links | Tenant local cart count and existing local wishlist; no wishlist page | No static “02”; no new persistence service |
| Desktop footer, nodes 3:108–114; mobile 4:73–74 | `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontFooter.jsx:99` | R3 `AtelierFooter` consumes existing computed links/identity/contact/social/policies | Shop name/initials, optional merchant text/email/social/custom links, policy links, credit, badge, optional bottom navigation | Preserve default footer path for nine; no unsupported category-index/about route or sample social accounts |
| Fixed trust/marketing text | Shared footer and section `TrustBadges` | R2 merchant-configured trust row and existing platform informational text; preserve true badge conditions | Verification comes from backend; merchant trust copy from enabled section settings | Do not convert design claims into verified operational guarantees |
| Consent banner, toast, variant selector, loading or error overlay (not drawn) | `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/components/storefront/AnalyticsConsentBanner.jsx:17`; `StorefrontVariantPickerModal.jsx:16`; route loading branches | R2 same existing state/actions, new scoped surfaces and focus/overflow treatment | Browser consent, product variants, active pending/error state | Keep them within the same theme scope, including any portal target; no lost overlays behind mobile bars |
| Unavailable tenant page | `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/layout.jsx:19` | R1 neutral unavailable/not-found behavior | Tenant settings unavailable or rejected | Cannot safely apply merchant theme before resolving it; do not fall back to another tenant |

## 3. Homepage mapping — desktop and mobile

| Figma section | Existing component / source | Proposed implementation | Data source and supported action | Isolation requirement |
|---|---|---|---|---|
| Full page sequence | `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontHome.jsx:12`; `StorefrontComposition.jsx:13` | R2 existing standard compositor/registry with scoped hooks; asymmetry belongs inside R3 hero | Effective theme, available sections, catalog, campaign node; current merchant section order/visibility | Each eligible section once; no forced demo content or independent page controller |
| Hero kicker/title/body, 3:11–13 / 4:8–10 | `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontHero.jsx:255` | R3 `AtelierHero` receives existing slide model, title and media; fluid typography and natural wrapping | Hero slide badge/title/subtitle/discount; fallback heading from shop identity | Existing slide state, normalization, enabled/hidden state remain; no fixed sample line breaks |
| Primary/secondary action, 3:14–16 / 4:11–12 | Same hero component | R3 real CTA links | Existing CTA text+destination pairs; preserve secondary action even if absent from mobile mockup | Render each only with valid label+link; never hardcode `/products` as an index route |
| Asymmetric hero art, 3:17–26 / 4:13–20 | Existing hero media | R3 dynamic merchant campaign media in new media frame; optional decorative generic orbit/backdrop | Existing desktop/mobile hero images, focal data and alt fallback | Replace sample product artwork with merchant media. “VIEW OBJECT” only if an existing configured CTA supplies it; do not infer a featured product |
| Multiple slides/controls (not drawn) | Existing hero arrows/dots/timer | R2 keep supported slides and explicit controls | Up to existing five normalized slides; timer/pause handlers | Same five-second model, reduced-motion rule added only to new branch; hide controls for one slide |
| Dark promotional strip, 3:27–28 / 4:21–22 | `PromoBlock` through `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontSectionVariants.jsx:307` | R2 strip treatment from existing section title/text | Merchant-authored configured text; content gate suppresses empty optional block | No moving ticker required; preserve section order/visibility and do not copy sample promises |
| Category heading and tiles, 3:29–61 / 4:23–49 | `CategoryVariantSection` in same file at 102 | R3 tile presentation with real category image/name/count/link, generated ordinal as decorative index | Category details or existing category derivation from catalog; current representative image fallback | No fixed four-category assumption or category renaming; one/zero/many data states |
| Featured product heading/cards, 3:63–99 / 4:51–67 | `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontSectionRenderer.jsx:72`; `StorefrontProductCard.jsx:26` | R3 Atelier cards; shared parent derives price/discount/stock/SKU and actions | Eligible selected products or existing section fallback; detail link, wishlist, Add and Buy when enabled | Keep all active flags, out-of-stock and variant-buy flow; no sample prices/media; no hiding cards to match sample count |
| Brand-story band, 3:100–105 / 4:68–72 | `BrandStoryVariantSection`, `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontSectionVariants.jsx:237` | R2/R3 merchant title/text/media with dark treatment | Existing enabled BrandStory settings; absent text/media suppresses display | No new story route. Reference story CTA is not supported by current BrandStory contract; omit or let existing configured navigation/adjacent Banner provide action |
| Trust row, 3:106 | Existing `TrustBadges`, `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontSectionRenderer.jsx:146` | R2 same parsed text items in new presentation | Merchant section text, up to eight existing entries | No invented easy-returns/local-delivery promise; visibility depends on actual section content |
| Remaining optional sections (not drawn) | Existing registry: Reviews/FAQ/Banner/TextBlock/Newsletter/Collection/CollectionShowcase/BrandShowcase | R2 style same current renderers under Atelier scope; small isolated view only where needed | Same selected product/review/text/media sources and existing visibility gates | Do not remove enabled merchant sections. Newsletter remains text/icon; BrandShowcase image remains unconsumed unless separately authorized |
| Full catalog search/filter/pagination (not drawn on home reference) | `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontAllProducts.jsx:105` | R2 editorial listing treatment with all existing controls | Current API-backed results, category/price/rating/stock/search/sort/page handlers | Keep configured allProducts enablement; style cohesive full catalog, do not silently remove functionality for Figma fidelity |
| Scheduled launch banners/sale popup (not drawn) | `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/StorefrontHomeClient.jsx:45` | R2 same active campaign model/countdowns/dismissal with new presentation | Tenant campaign data and plan features; link eligibility and frequency rules | Do not treat these as preset content; no altered campaign timing or exposure |

### Sparse content contract

Missing campaign image yields the existing fallback or text-led hero; empty title retains a meaningful store heading. Long text wraps and grows the section. Category/featured/story/review absence collapses that section without a reserved blank column. A single product remains a real card; many use existing paging. Optional strip/story/trust sections are not seeded with concept copy. Core navigation, catalog if enabled, cart/account/tracking/policy access remain usable independently of merchandising content.

## 4. Product detail mapping — `/products/{id}`

| Figma section | Existing component / source | Proposed implementation | Data source / behavior | Isolation requirement |
|---|---|---|---|---|
| Breadcrumb text, 4:82 | Existing Back/Continue Shopping link and public product/category data | R2 use verified destinations only; optional simple Home/category/current-product path | Actual product title/category/slug; no category hierarchy model inferred from “OBJECTS / LIGHTING” | No fictional nested category routes or sample product URL |
| Gallery/media/thumbnails, 4:83–103 | `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/ProductImageGallery.jsx:8` | R2 reuse image switching/fallback, scoped image frame | Actual product images; selected variant image prepended by parent | Do not copy unrelated sample thumbnail products; preserve image alt/error behavior |
| Title/rating/price/description, 4:104–109 | `ProductInfo` and `useProductData`: `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/ProductInfo.jsx:20`; `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/hooks/useProductData.js:10` | R2 existing ProductDetailsView with scoped treatment; R3 local arrangement only if essential | Real normalized product/current variant, derived final/original/discount, reviews, description fallback/toggle | Same computed values; never recompute price in Atelier view |
| Finish circles, 4:110–113 | `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/VariantSelector.jsx:12` | R2 existing option buttons, possibly swatch treatment only for a supported real color value, always named | Current available/selected attributes and active variants; selection resets quantity and changes variant model | Do not invent hex codes for textual finishes or reduce available attributes to “finish” |
| Quantity/stock/cart/buy, 4:114–124 | `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/ProductDetailsView.jsx:57`; `ActionButtons.jsx:15`; live `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/components/product/ProductDetails.jsx:77` | R2 retain existing detail controls/handlers and disabled/unavailable/mobile branches | Current quantity/stock and add/buy callbacks; cart item+variant identity | No copied add handler; preserve quantity bounds and out-of-stock branch |
| Highlights/specifications disclosures, 4:123 | `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/ProductExtras.jsx:121` | R2 keep accessible information tabs/disclosures and existing buying-guide data, even if Figma omits one | Actual features/specifications/comments or explicit empty panels | No forced benefits/spec values; no silent removal of buying guide |
| Related heading, 4:125–126; review list/form not fully drawn | `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/RelatedProducts.jsx`; `ReviewSection.jsx:139` | R2 existing cards/list/form styled in new scope | Same-category related products, actual reviews; authenticated submit with rating/comment validation | Preserve review authentication; validate existing login href on tenant host before release |
| Controller/loading/404/metadata | `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/products/[id]/page.jsx:87`; product component | R1 server route, R2 source-backed state views | Canonical slug, eligible public product, metadata/JSON-LD and loading | No new route or product fetch service; API errors do not render sample product |

## 5. Category and collection mapping

| Figma section | Existing component / source | Proposed implementation | Data source / behavior | Isolation requirement |
|---|---|---|---|---|
| Page heading/body/count, 4:134–137,152 | `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/categories/[slug]/CategoryPageClient.jsx:36`; `collections/[slug]/CollectionPageClient.jsx:20` | R2 current category/collection client markup with scoped semantic hooks; no mandatory shared-view extraction | Category name/optional cover or collection title/description/cover and actual count | Keep category and collection server endpoints/canonical routes distinct |
| Category sidebar, 4:138–144 | Homepage catalog has category-choice controls; category route is already scoped to one category | Use actual route's supported controls; category navigation may reuse configured category links if supplied, otherwise omit mockup's radio group | Category route has price/stock/sale/rating; collection route has sort/paging only | No new all-products index at `/products`; home `/#products` remains catalog destination |
| Price/stock/Apply, 4:145–151 | Category client filter form; home `StorefrontAllProducts` filter panel | R2 same category controls, clear/chips and conditional rating kept | Existing URL minPrice/maxPrice/stock/sale/rating query update | Do not display a collection filter form with no implemented handler |
| Sort and count, 4:152–153 | Current category and collection sort selects | R2 actual selects/options and page count | Route-specific existing sort keys; category Best Rated only when rating data/filter exists | Do not unify differing backend query values accidentally |
| Product listing, 4:154–197 | Shared ProductCard and product action hook | R3 same new card everywhere | Actual eligible products; add/buy/variant/wishlist behavior as applicable | Preserve no-products/loading/pagination/variant-picker states not drawn in reference |
| Tablet/mobile (not drawn) | Current responsive filter/modal controls | R2 adapt catalog to narrow screens with proper labels/focus/close | Same state/query handlers, two/one-column cards | Breakpoints proposed; no inferred Figma tablet spec |

## 6. Shopping bag mapping — `/cart`

| Figma section | Existing component / source | Proposed implementation | Data source / behavior | Isolation requirement |
|---|---|---|---|---|
| Title, items and summary, 5:9–46 | `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/CartView.jsx:6`; live `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/cart/page.jsx:14` | R2 semantic classes, reuse shared tree; new conditional wrapper only if structure requires it | Tenant cart from CartContext, current provisional subtotal/shipping/savings/total | Do not change cart storage or use sample totals/delivery amount as source |
| Each image/title/variant/SKU/quantity/remove, 5:13–36 | Same CartView item rows | R2 style existing elements | Local cart snapshot, selectedVariant attributes/SKU/stock, current update/remove callbacks | Keep category/description/old price/stock limit where supplied; do not lose fields omitted by mockup |
| Promo code/Apply, 5:47–49 | Current `handleApplyPromo` | R1 behavior/R2 appearance | Uppercase nonblank code saved to sessionStorage; validation occurs in checkout | Copy must not say discount applied before validation |
| Checkout/continue links, 5:50–53 | Existing cart links/mobile action | R2 actual `/checkout` and `/` destinations | Local cart state | No new step or demo checkout |
| Empty state, recommendations/mobile controls (not drawn) | Existing CartView and variant picker | R2 same controls and pending/empty branches | Cart length and recommendation response; recommendation failure omits list | Theme must cover these states; recommendations cannot inherit legacy visual defaults |

## 7. Checkout mapping — `/checkout`

| Figma section | Existing component / source | Proposed implementation | Data source / behavior | Isolation requirement |
|---|---|---|---|---|
| Page title/numbered customer section, 5:61–66 | `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/CheckoutSections.jsx:125`; `CheckoutPageShell`, `CheckoutCustomerInfo` | R2 current form shell and semantic section styling | Existing live form submit and customer state | One form with real labels and controlled inputs; no copied Figma absolute fields |
| Name/email/phone/area/address, 5:67–81 | `CheckoutCustomerInfo`, same file at 185 | R1 controls/R2 presentation | Current required fields and `formData`; Inside Dhaka/Outside Dhaka select | Keep validation, names/IDs, customer input state and backend contract |
| COD/delivery, 5:82–86 | Existing `CheckoutDeliveryChargeNotice`, `CheckoutDeliveryMethod`, `CheckoutPaymentMethod` | R2 same current informational method/charge UI | Existing Dhaka zone logic and COD; server final validation | No free-delivery threshold, courier picker or online payment added |
| Policy and marketing checkboxes, 5:87–88 | `CheckoutPolicyConsent`; live `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/checkout/page.jsx:440` | R1 semantics/R2 presentation; retain placement if moving it would require ownership rewrite | Required policy acceptance, optional separate subscription confirmation choice | Do not merge consents or precheck marketing; keep actual double-opt-in meaning in copy |
| Summary/products/totals, 5:89–111 | `CheckoutOrderSummary`, same presentation file at 645 | R2 same live rows/coupon/totals/remove/quantity/policy text | Current cart plus refreshed product data, coupon preview and provisional totals | Keep currently supported controls even where mockup shows display-only rows |
| “PLACE DEMO ORDER”, prototype banner/disclaimer, 5:63–64,112–114 | Actual order handler in live checkout page at 194–410 | Replace concept text with current real Place Order/processing copy; preserve handler | Guest `/public/orders` or authenticated `/storefront/{tenant}/orders`, verification token and idempotency | No mock success, new endpoint or demo handler in live code |
| Phone OTP modal (not drawn) | `CheckoutOtpModal`, presentation file at 816; live checkout handlers | R2 same modal with correct focus/error/loading state | Existing send/verify hooks, masked phone and server proof | Inline `CheckoutPhoneOtpBox` export is not the active flow; do not accidentally mount a second verification UI |
| Empty/success/mobile/policies/errors (not drawn) | Same CheckoutSections exports | R2 all branch views in new scope | Actual accepted order ID; cart empty; policy content; pending/errors | Success must follow API response; no live test SMS/email without explicit authorization |

## 8. Customer account mapping — `/account`

| Figma section | Existing component / source | Proposed implementation | Data source / behavior | Isolation requirement |
|---|---|---|---|---|
| Dark decorative panel, 5:123–127 | No current equivalent required for auth | R3 small theme-only decorative region in the existing AuthView; no account view framework | Generic theme-owned shapes; fixed non-promissory UI copy; no sample customer data | Hidden/reduced on narrow screens; aria-hidden decoration; no merchant-specific image requirement |
| Login heading/email/password/forgot/sign in/create, 5:128–140 | `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/components/account/AuthView.jsx:4`; account route | R2 current AuthView markup/props/handlers with scoped appearance | Current login mode/state/handlers; AuthContext session | Reuse real submit and toggle; registration remains account toggle, not inactive `/signup` |
| Registration/email OTP (not drawn) | Same AuthView; account route handlers | R2 all current name/email/password/code/send/resend/timer controls | Same `/auth/send-otp` and `/auth/register-customer` contracts | Keep cooldown, disabled identity fields and tenant context |
| Password recovery stages (not drawn) | `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/components/account/PasswordResetFlow.jsx:44` | R2 existing stage markup with scoped appearance; state/API/timers remain in this controller | Email request, six OTP inputs, resetToken, strong matching passwords | Preserve paste/backspace/focus/timers and validation; no second reset implementation |
| History/profile/security mentioned at 5:142 | `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/components/account/CustomerDashboard.jsx:5`; `CustomerTabs.jsx:9` | R2 current dashboard/tab/profile/security markup; no mandatory extraction | Authenticated customer, own orders; read-only profile; actual password-update handler | These views lack full Figma detail; derive from approved type/surface system, retain every functional inventory element |
| Vendor portal/logout/loading/errors (not drawn) | `VendorView`, account page/auth context | R1 behavior/R2 theme presentation | Current VendorAdmin/VendorStaff role branch, logout, auth loading | No broadened role/customer visibility. Ignore old toast-only password placeholder, retain SecurityTab's real handler |

## 9. Tracking and after-sale mapping — `/track`

| Figma section | Existing component / source | Proposed implementation | Data source / behavior | Isolation requirement |
|---|---|---|---|---|
| Lookup heading/ID/phone/Send access code, 5:150–163 | `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/track/page.jsx:99` | R2 existing tracking lookup markup/state/handlers with scoped presentation | Current customer-entered ID+delivery phone; send OTP and verify/token process | No sample `FF-10458`; preserve button state labels and reset access when ID/phone changes |
| Demo status panel, 5:164–186 | Verified order display/timeline in same route at 380–752 | R2 existing verified-order regions, actual status/timeline/amounts/items/payment/address; no whole-page extraction | Existing access-token-authorized response and current progress steps | Do not show before OTP. Do not infer “out for delivery” from the visual mockup or manufacture expected arrival dates |
| Verified-order timeline and delivery details | Current progress/timeline, courier ID/shipped/delivered fields | R2 vertical editorial presentation where appropriate | Actual event message/date/reason, payment and courier fields | No renamed state implies a transition the backend never returned |
| Cancellation (not drawn) | Same route cancellation handlers/modal at 210,759 | R2 existing modal with scoped hooks; retain reason/note/close/submit/busy | `canCancel`, order access token and existing cancellation API | Eligibility and token remain authoritative; no action for ineligible states |
| Return/refund/proof (not drawn) | Same route at 251,810 | R2 existing modal with scoped hooks; keep selected-item/reason/details/images/video/file-remove controls | Existing eligibility; required description and 1–3 proof images; optional video | Keep multipart contract, validation, upload authorization and error feedback |
| Concept disclaimer, 5:187 | No live equivalent required | O only if tracking preview is separately approved: label local fixtures in Builder chrome | Optional local preview fixture mode | Live screen never claims “demo” and never renders fixture private data |

## 10. Policies mapping — `/policies` and `/policies/{type}`

| Figma section | Existing component / source | Proposed implementation | Data source / behavior | Isolation requirement |
|---|---|---|---|---|
| Heading/contents, 5:195–207 | `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/policies/page.jsx:69` | R2 existing policy index with scoped semantic presentation; no mandatory shared index extraction | Four policy types, labels and merchant/default content | Keep actual anchors and individual page links; no invented “Contact” page |
| Policy body, 5:208–212 | Existing full policy text on index; shared `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/PolicyView.jsx:4` | R2 full current content containers | `getPolicyContent`, theme policies and fallback defaults | Figma shows two sample sections; real page must retain all four full sections and not substitute explanatory mock copy |
| Individual policy route (not separately drawn) | `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/policies/[type]/page.jsx:83` | R2 existing detail view | Supported type, shop/default content, metadata/404 | Server content resolution and unknown-type 404 unchanged |
| Footer support links, 5:213 | Shared footer | R3 same actual links as shell | Current policy/account/track/contact destinations | No sample merchant text or duplicate footer application |

## 11. Additional existing routes and states

These are covered even where the Figma file does not define a dedicated screen.

| Existing route/state | Implementation decision |
|---|---|
| Header search and home catalog search | Same respective bounded-local and API-backed flows; style both; no new search page |
| Checkout confirmation | Same in-page success with short/full ID, tracking instruction and shopping link; no new confirmation route |
| Expanded account order | Same in-page order items/variant/amounts/product links; no new order-detail route |
| Registration | Same account toggle/OTP; `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/signup/page.jsx` is commented and must not become a theme task |
| Tenant loading files | Scoped loader treatment after a theme scope exists; server unavailable/404 can stay neutral when theme is unknown |
| Robots/sitemap/API proxy | Reuse unchanged. They do not render theme page composition |
| Platform root/legal/login | Preserve existing platform appearance and behavior; Atelier scope only exists in opted-in tenant subtree |
| Existing merchant custom navigation URLs | Preserve validated configured destination. Theme does not create `/about`, category/collection index or arbitrary merchant content pages |

## 12. Component contracts and extraction limits

The current components remain the contract owners. This table describes required behavior, not a mandate to create new view files.

| Existing owner / narrow addition | Required inputs | Optional inputs / states | Mandatory responsibility / limit |
|---|---|---|---|
| Existing provider/preview root; optional small ThemeScope helper | Already resolved theme/children | Optional presentationVariant and existing style variables | Set exact marker; read-only propagation if needed. No new resolver, fetch, stored state or compulsory wrapper |
| Shared header; optional stateless AtelierHeader | Existing brand/navigation/link/cart model and search/menu callbacks | Logo/badges/nested links | Presentation only; legacy branch unchanged, no new session/product query |
| Shared hero; optional AtelierHero | Existing active-slide model/navigation callbacks | Media/CTAs/slides/paused state | Dynamic presentation, same timer/content behavior; composition edits do not change family |
| Shared ProductCard; optional AtelierProductCard | Parent-derived product price/stock/action model | Current flags/rating/SKU/wishlist | New card markup only; no price/variant/cart logic copied |
| Shared footer; optional AtelierFooter | Existing identity/link/policy models | Contact/social/verified/mobile links | Presentation only; no new routes or data model |
| Current ProductDetailsView and primitives | Existing product/variant/quantity/callback/content props | Current related/reviews/media/empty branches | Scope first; a small essential region can be gated, no mandatory replacement detail view |
| Current category/collection clients | Existing route-specific products/query/filter/sort/page state | Current cover/description/mobile/empty state | Add scoped hooks; keep handler/query owners; no mandatory CatalogPageView |
| Current CartView/CheckoutSections | Current cart/form/totals/consent/OTP/callback state | Coupon/branding/policies/error/success | Keep forms and handlers, add precise styles/small measured branches; no copied controller |
| Current account components | Current form/tab/user/order/reset/security state and callbacks | OTP timers/error/loading/vendor branch | Keep state/API/validation in place; no mandatory AccountViews |
| Current tracking page/modals | Current lookup/token-authorized order/actions/upload state | Timeline/courier/payment/cancel/return branches | Scope existing regions, retain all authorization/eligibility/file behavior; no mandatory TrackingView |
| Current policy index/PolicyView | Resolved labels/full content/destinations | Current fallback text | Style current markup; no mandatory PoliciesIndexView |
| Extra preview choices and pure seams | Only if separately approved in Phase O | Local fixture data for private states | Optional follow-up; no live customer/order calls, copied controllers or new core release gate |

New Atelier-only stateless views, if justified, belong under `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/atelier/`. Existing shared commerce presentation remains under `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/`. A missing extra preview mode does not justify moving working account/tracking state or markup during the mandatory theme release.

## 13. Design deviations that must remain explicit

The real storefront will contain current OTP, reviews, cart recommendations, full policies, logged-in account, cancellation/returns and state feedback even where a mockup omits them. It will not contain the mockup's free-delivery claim, locale control, sample product artwork/data, sample order timeline or demo submit handler. A story button or third hero media link requires an existing valid configured destination. Missing merchant content collapses optional sections; generic decorative art never substitutes a real product.

Those differences follow the approved requirement to preserve functional commerce while translating the visual direction. Any demand to add the missing capabilities requires a separate product decision before implementation expands.

## 14. Identity, eligibility, rollout and acceptance integration

| Concern | Final mapping / ownership |
|---|---|
| Persistent family | Optional `theme.presentationVariant`, validated/normalized in `C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/index.cjs` and stored optionally in `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/Shop.js`; absence preserves current output |
| Merchant composition edit | Changes homepage arrangement only; shell/product/cart/checkout/account/tracking remain Atelier. UI currently marks composition theme-controlled, but full-access supported writes/restore can change it |
| Legacy preset selection | Clears prior Atelier marker during authorized full preset application without modifying any legacy definition; limited appearance-only application retains protected marker/layout |
| Current plan policy | Full: structure; limited: current allowed appearance only; none: no Builder selection. Atelier complete/partial eligibility and downgrade/grandfathering remain product decisions |
| Server adoption guard | Default off; optional exact test-tenant allowlist, then approved general eligibility. Guard marker and reserved preset ID on raw/merged draft/publish/restore/SEO targets before writes |
| Guard source | Proposed `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/themeAvailabilityService.js`, invoked by existing services, never a client-controlled permission |
| Essential Builder integration | Existing five preview modes, trusted availability, real thumbnail, supported controls, save/publish/reload/restore and content preservation |
| Optional Builder expansion | Category/collection/account/tracking preview selectors and extra pure seams are Phase O, separate approval/4–7 days; all corresponding live pages remain mandatory |
| Legacy acceptance | Freeze all nine definitions/raw published/normalized/effective/markup/style/image/workflow baselines before shared edits; preserve old assertions and add new tests separately |
| First implementation task | Read-only baseline freeze and focused existing tests, with external effects mocked. Then optional identity/server guard together while adoption remains off |

The adoption switch is not a rendering kill switch: it blocks new activation and reapplication, not silent rewrites of committed snapshots. Existing authorized unchanged-identity edits and explicit switch-away follow the plan's transition policy. Product approval is needed before merchant adoption, not before isolated baseline work.
