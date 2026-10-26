# Step-by-step action plan: Overview, Analytics, and Growth Center

Prepared: 22 October 2026.

Implementation has started. See [the implementation record](reporting-shipping-implementation.md) for completed work, verification results and remaining release conditions. The findings below describe the pre-implementation baseline.

This plan turns the [detailed review](/Users/user/Downloads/Shop-for-all/docs/overview-analytics-growth-center-review.md) into an implementation sequence. The financial calculations, tenant-ID handling, return behavior, and tracking code were rechecked while preparing it. The main defects remain present. All changes below are recommendations; this document does not represent completed implementation.

**Recommended order: dependable financial data → clear operational reporting → reliable shopper measurement → measurable growth actions.** Keep the existing application, authentication, order snapshots, campaign drafts, and job infrastructure. A new analytics platform or a separate microservice is not required for the initial fixes.

## Delivery order

| Release | Steps | Outcome | Required before release |
|---|---|---|---|
| A — Correct and explain existing reports | 1–5 | Consistent money, order counts, inventory alerts, and honest unavailable/error states | Financial fixtures reconcile; partial refunds and deleted products preserve history |
| Shipping — coordinated with A | S1–S6 below | Merchant-configured delivery areas and charges, consistent checkout totals | Storefront quote and saved order agree for guest and authenticated buyers |
| B — Improve daily decisions | 6–7 | Focused Overview and usable Analytics with dates, comparisons, and drill-downs | Same metric/period agrees across pages; permissions and failed requests are handled |
| C — Repair measurement | 8–9 | Deduplicated sessions, linked checkout stages, useful attribution and abandonment | Browser behavior reconciles to its measured cohort; saved order totals remain authoritative |
| D — Improve growth decisions | 10–11 | Evidence-based actions, saved experiments, efficient reporting | Recommendations respect data quality, stock, and known economics; aggregates reconcile |
| Every release | 12 | Controlled migration, verification, and rollout | Release-specific acceptance checks pass |

Each release can contain several small pull requests. Implement tests and verification with each change, then use Step 12 as the release gate. Do not defer correctness tests to the end.

## Shipping workstream: configurable delivery areas and charges

Added on 22 October 2026 following the requirement for merchant-defined “Inside X: Y taka / Outside X: Z taka.”

**Recommendation: include this in the same roadmap, as a separate implementation workstream and pull request sequence.** It changes checkout pricing, address data, merchant settings, and order snapshots. Coordinate its shipping data contract with Step 1 and complete it before final end-to-end financial reporting acceptance. The aggregation hotfixes can proceed immediately while shipping is implemented.

A newly verified defect makes this more urgent: the [storefront calculation](/Users/user/Downloads/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/checkout/hooks/useCheckoutTotals.js:14) uses BDT 80 inside Dhaka and BDT 120 outside, while the [backend pricing function](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/services/orders/orderPricingService.js:4) uses BDT 80 and BDT 130. Both checkout types need a single authoritative price calculation. The current order schema also restricts zone labels to Inside Dhaka/Outside Dhaka, and checkout uses the zone selection as the city field.

Keep the first version focused on one merchant-defined base delivery area and two flat customer charges. For example, a merchant can configure Inside Chattogram: BDT 70 and Outside Chattogram: BDT 130. These are illustrative settings, not proposed universal prices.

**S1 — Define the shipping contract.** Store the shop's base delivery area, its explicit geographic coverage, inside/outside rule IDs, display labels, charges, currency, enabled state, and configuration version. Distinguish a city from a district so “Inside X” has an unambiguous boundary. Keep real recipient city/district separate from the delivery rate zone. The charge collected from the buyer is separate from the actual courier expense paid by the merchant.

**S2 — Add merchant settings.** Add a Delivery charges section to the existing [Shipping Settings page](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/pages/dashboard/ShippingSettings/ShippingSettings.jsx), alongside its existing courier setup. Provide base area selection, inside charge, outside charge, a preview, and validated save with the shipping permission. Accept a deliberate zero charge and reject negative/non-finite values. Apply settings per shop, with version/conflict handling and an audit entry. Define and disclose a migration/default policy for unconfigured existing shops; do not silently choose between the conflicting current prices.

**S3 — Centralize checkout quotes.** Use one backend shipping quote function for preview, promotion evaluation, guest order creation, and authenticated order creation. Resolve the rule from recipient geography and the shop's configured coverage. Do not trust a browser-submitted amount or merely a buyer-selected cheaper label. Apply free-shipping promotions through the same calculation. An incomplete or unsupported address must not silently mean free shipping or an assumed Dhaka location.

**S4 — Update checkout and persistence.** Remove hard-coded prices and Dhaka-only labels from checkout, request validation, and the order schema. Show the resolved charge before confirmation and save the actual recipient location. Save the applied rule ID, label, configuration version, original charge, shipping discount, and final charge as an order snapshot. If the address, promotion, or rate configuration changes before placement, revalidate the quote and show any changed total for confirmation. Preserve existing order idempotency and avoid repricing an order already created under the same request.

**S5 — Connect the financial reports.** Read shipping collected from the order snapshot, never from today's merchant configuration. Represent any shipping refund separately. Track courier expense in its own field/source when available; a merchant charging BDT 80 does not prove the courier cost was BDT 80. Until actual expenses are captured, report shipping collected and mark shipping margin/contribution profit incomplete where necessary.

**S6 — Verify and migrate.** Cover Dhaka and non-Dhaka shops, real inside/outside addresses, zero charges, free-shipping promotions, different shop rates, tampered client amounts, settings changes during checkout, stale quotes, and guest/authenticated parity. Preserve legacy order amounts and labels. Require the displayed checkout total, saved order, invoice/confirmation, and report components to agree. Keep courier parcel address mappings valid as city and zone become separate fields.

**Completion check:** a merchant chooses X, Y, and Z; the buyer enters an actual delivery address; the server resolves and displays the appropriate charge; the order preserves that exact accepted charge; and later settings edits do not change past orders or reports.

## Step 1. Define the numbers and create a common reference dataset

**Priority: first. Owner: product lead and backend engineer.**

Write a short versioned metric contract and use it in all three pages, APIs, and exports. Recommended starting definitions:

| Metric | Recommended definition |
|---|---|
| Gross delivered product sales | Sum of item snapshot totals for delivery occurrences in the interval, before order-level coupon allocation |
| Discounts | Allocated order-level coupon discounts on those delivered items; existing item-level price discounts are already reflected in snapshots |
| Net product sales | Delivered item value after allocated discounts, less recognized product refunds occurring in the interval |
| Shipping / tax collected | Separate components; do not mix these into product sales |
| Placed orders | Distinct authoritative orders created in the interval |
| Delivered orders | Distinct orders with a delivery occurrence in the interval |
| Units delivered | Sum of delivered item quantities |
| Active orders | Current Pending, Confirmed, Processing, and Shipped orders |
| Average delivered product order value | Product value after coupons at delivery, divided by distinct delivered orders; show later refund adjustments separately |
| Product gross profit | Net product sales less recognized cost of goods, with an explicit returned-inventory cost policy |
| Contribution profit | Product gross profit plus retained shipping collected, less recorded courier, payment, return, and attributable advertising costs |

Average order value needs a delivery cohort numerator and denominator. Dividing a refund-heavy period's net sales by that period's delivered order count can be misleading, especially when the refunds relate to earlier orders. Label the chosen AOV basis explicitly.

Use **Net product sales** as the primary sales KPI. Show delivered order value, shipping, tax, discounts, and refunds in a reconciliation breakdown. Use **Product gross profit** only when its inputs are available and correctly defined. Display contribution profit as unavailable until required costs are recorded; unknown costs must not silently become zero. The label Net Profit should wait until the system captures the full costs required for that meaning.

Recommended report defaults: last 30 calendar days including today, comparison to the preceding equal-length calendar period, shop timezone with Asia/Dhaka as the initial product default, and current supported shop currency. Mark today as partial and compare equivalent elapsed time, or offer completed-day comparison. Use half-open intervals `[from, to)` throughout. Operational stock and active-order panels should say **Current**, since they are not period totals.

Add reusable synthetic cases covering one order with multiple lines, two variants of one product, multiple units, coupons, shipping, refunds, product deletion, and different placement/delivery dates. These are expected-result fixtures, not snapshots of whatever the current implementation returns.

**Done when:** one written formula exists for each displayed metric, and fixtures state the correct result before implementation starts.

## Step 2. Fix the financial aggregation and tenant identifier defects

**Priority: urgent. Owner: backend engineer. Depends on Step 1.**

Start in [order analytics](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/services/orders/orderAnalyticsService.js), [Analytics controller](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/controllers/analyticsController.js), and [Growth controller](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/controllers/growthController.js).

Required changes:

1. Calculate order totals once per order. Use item reduction within an order or separate order/item aggregation branches; never sum the whole order total after unwinding items.
2. Normalize and validate the authoritative tenant ID before every aggregation. Do not accept a client-supplied shop ID as a replacement for authenticated scope.
3. Keep order counts, product-containing order counts, line counts, and unit counts as separate fields. A two-product order is one shop order; product-level order counts are not additive across products.
4. Allocate order-level coupons to eligible lines using stored order snapshots and a deterministic rounding rule. Preserve totals exactly. Do not apply item-level discounts a second time.
5. Use exact supported currency units for calculations and validate conversion of existing values. Do not reprice historical orders using today's catalog.
6. Route the primary pages through shared financial calculations. Inspect and update the older dashboard-stats and inventory revenue endpoints too, so legacy consumers cannot retain conflicting formulas.
7. Give financial charts and cards the same definition and date basis. Remove misleading profit labels until their new calculation is available.
8. Build the latest 12 calendar-month series with year labels, instead of selecting the earliest 12 populated months. Zero-fill only periods known to have complete data.

For the review fixture, gross product sales are BDT 1,500, discount BDT 100, product value after discount BDT 1,400, shipping BDT 80, and final order total BDT 1,480. Buying cost is BDT 600, giving BDT 800 product gross profit before any return. Those are different named measures. **BDT 2,960 must never appear as that order's revenue.**

**Done when:** the fixture reconciles to BDT 1,480 total order value and BDT 1,400 product value after discount; string and ObjectId tenant contexts return identical results; foreign-shop data remains excluded; cards and charts agree for identical definitions and periods.

## Step 3. Correct partial returns and preserve historical sales

**Priority: urgent. Owner: backend engineer. Depends on Steps 1–2.**

This requires coordinated order, return, and reporting changes. Changing only the Growth query will leave the underlying problem unresolved.

The current [return controller](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/controllers/returnController.js) sets the whole order to Returned and its payment to Refunded after restoring returned items. The reporting queries then discard the order's delivered value.

Required changes:

1. Preserve the original delivery occurrence, item values, and costs even when current return/refund state changes.
2. Represent return quantities and refund amounts per order line. Distinguish partial and full returns/refunds through explicit summaries or derived state; update order UI and downstream consumers together.
3. Separate physical receipt, restocking eligibility, refund authorization, and completed refund. Receiving an item is not evidence that a refund has been paid, and refund completion is not evidence that an item is resalable.
4. Recognize financial refund adjustments on completed refund occurrence. If the product chooses an earlier financial recognition policy, represent it explicitly rather than inferring it from Received or Closed.
5. Reconcile order-level refund amounts with their line allocations, including shipping/tax components where applicable. Handle later corrections explicitly.
6. Make financial and inventory updates idempotent. Validate cumulative returned quantity and refunded value across requests; repeated callbacks must not repeat stock restoration or money adjustments.
7. Keep negative refund-only period movement. Remove the zero clamp from financial totals.
8. Keep financial totals independent of a live Product join. Use snapshot names/SKUs for archived or deleted products; allow current catalog information to enrich a historical row without determining whether it exists.
9. Add a minimal internal delivery/refund fact record or equivalent immutable event history. Use existing transaction/job infrastructure to keep facts consistent with operations. Avoid introducing a broad accounting system just to fix these reports.
10. Backfill history in a dry run first. Use authoritative delivery timestamps, timeline entries, and confirmed refund records. Mark uncertain legacy records and report their coverage; do not silently substitute mutable `updatedAt` as an exact delivery time.

A simple acceptance example: delivered product value after discounts is BDT 1,400. A completed product refund of BDT 200 leaves cumulative net product sales of BDT 1,200. If the refund occurs next month, the sale remains in its delivery month and the next month shows a BDT −200 refund adjustment. Remaining items keep their delivery value. Cost reversals depend separately on the returned goods disposition.

**Done when:** partial refunds preserve unaffected lines, a pending refund does not count as completed, retrying the same transition changes nothing, deleted products retain history, and refund-only intervals can be negative.

## Step 4. Correct misleading metrics and unavailable-data behavior

**Priority: urgent. Owner: full-stack engineer. Can begin alongside Steps 2–3.**

Change the three page components and their response contracts:

| Current problem | Immediate correction |
|---|---|
| Orders / registered customers labeled Conversion Rate | Remove that conversion KPI; show conversion unavailable until eligible session measurement exists |
| Product browser order events labeled Orders | Label them Product order events, or replace the order count with authoritative distinct orders |
| No abandonment collector, but a zero card | Show Not configured / Not measured |
| Order channel labeled Traffic Source | Label it Order channel until real acquisition attribution is available |
| Registered users treated like buyers | Separate Registered customers, Buyers in period, and Returning buyers |
| Failed API request renders zeroes | Persistent error state and Retry; retain previous data only with its original period and stale status |
| One Growth endpoint failure blocks all new content | Independent widget states or an assembled response with explicit section failures |
| Period changes leave old results under a new label | Abort obsolete requests and verify response interval/shop before applying it |
| Closing a loading insight can reopen/populate it | Cancel the detail request and clear its loading state on close |

Return a value state with metrics: available, incomplete, unavailable, or error. Genuine zero is an available numeric zero. Show measurement coverage and the last successful update time. Informational limitations should sit near the affected metric, not in a generic warning that users learn to ignore.

Until reliable measurement is in place, Growth should present existing labels as preliminary signals. Suppress promotion recommendations when the necessary data is unavailable or known to be inconsistent; keep product editing and manual campaign drafting usable.

**Done when:** users can distinguish zero business activity from missing instrumentation or failed loading, and a failed range change cannot present old values as new-period results.

## Step 5. Make operational and customer metrics consistent

**Priority: high. Owner: backend/full-stack engineer. Depends on Step 1.**

Required changes:

- Include Confirmed in the active-order definition, with a visible breakdown for Pending, Confirmed, Processing, and Shipped.
- Use one inventory-risk function across Overview, Analytics, catalog summaries, and notifications. Apply variant threshold, then product threshold, then the documented default.
- Define low stock consistently as stock at or below threshold; keep Out of stock distinct. If zero means “alert only when empty,” implement that consistently. If alerts can be disabled, use an explicit setting.
- Query the complete catalog for matching variants and paginate the result. Do not load an arbitrary 500-product subset and call it a shop-wide summary.
- Distinguish sellable availability from raw stock where reservations or availability controls apply. Preserve those existing stock rules while sharing their reporting projection.
- Calculate top sellers from delivered facts, with clear options for units or net product sales. Keep inventory movement reporting as a separate operational view.
- Count returning buyers from prior qualifying purchase history. Keep the customer identifier stable within the shop and do not count duplicate user records as additional buyers.
- Invalidate or refresh affected dashboard caches after order and return changes, using shop-scoped keys. Expose the freshness window instead of promising instant updates.

**Done when:** a sold-out size is visible even when another size has 50 units; products beyond the first 500 are evaluated; a Confirmed order appears as active; a customer with an earlier purchase and one current purchase is correctly recognized as returning.

## Step 6. Reorganize Overview around daily work

**Priority: high. Owner: frontend engineer with product/design review. Depends on Release A.**

Update [Overview](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/pages/dashboard/Overview.jsx) in this order:

1. A compact urgent-work row: orders awaiting confirmation, fulfillment problems, stockouts, and returns requiring action. Each count opens the correct filtered list.
2. Four KPIs: Net product sales, Delivered orders, Average delivered product order value, and Active orders. Label the first three by period and the final one Current.
3. One daily sales chart with a comparison and a visible data-through timestamp.
4. Stock priorities with product, variant, current stock, threshold, and Restock/View action.
5. Top products with the chosen ranking definition and a working Analytics link preserving period and product.
6. Compact setup/account information. Show only relevant onboarding steps and collapse completed setup. Blocking billing/verification information remains prominent.

Add real navigation to clickable-looking inventory rows. Implement or remove the unused `focus=top-products` behavior. Make onboarding destinations respect role and subscription capabilities.

Choose a consistent financial visibility policy. A practical approach is separate permission for financial/profit metrics while allowing operational Overview access. Enforce it in API responses as well as the UI, and make cache keys or post-cache filtering respect it.

**Done when:** a merchant can identify the next operational task and reach it directly; no card suggests an unavailable feature as an unfinished setup requirement; staff receive only their permitted data.

## Step 7. Turn Analytics into a usable reporting workspace

**Priority: high. Owner: full-stack engineer. Depends on Release A.**

Update [Analytics](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/pages/dashboard/AdvancedAnalytics.jsx) incrementally:

- Add Last 7 days, Last 30 days, This month, Last month, and validated custom ranges, with previous-period comparison and shop timezone.
- Keep filters in the URL. Return the selected interval, currency, date basis, metric version, generated time, and completeness in API metadata.
- Start with Sales, Products, and Delivery/Returns views, because their source records already exist. Add Acquisition and Funnel when Steps 8–9 provide valid data.
- Show a sales reconciliation: gross product sales → coupon discounts → product refunds → net product sales; shipping and tax appear separately.
- Add sortable, paginated product/variant reporting and links to permitted orders. Preserve deleted-product snapshot rows in historical reports.
- Add first-time/returning buyer reporting and cancellation/return breakdowns with explicit event dates and denominator definitions.
- Add CSV export from the same reporting service after on-screen reconciliation passes. Include filters, timezone, currency, and metric version in the export.
- Provide accessible chart labels and equivalent tables. Check mobile layouts, keyboard navigation, loading, empty, incomplete, and failure states.

A comparison with zero in the previous period should say New activity or show the absolute change, rather than an infinite percentage. A partial current day should not look like a full-day decline.

**Done when:** identical filters reconcile across Overview, Analytics, and exports, and a user can investigate a change down to the underlying records.

## Step 8. Rebuild behavioral tracking around real sessions and checkouts

**Priority: foundation for trustworthy growth. Owner: storefront and backend engineers. Depends on Step 1.**

Work in the [tracker](/Users/user/Downloads/Shop-for-all/ecommerce-storefront/src/utils/analyticsTracker.js), [collector](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/controllers/analyticsEventController.js), product/cart/search surfaces, and checkout flow. Read the storefront's [AGENTS.md](/Users/user/Downloads/Shop-for-all/ecommerce-storefront/AGENTS.md) before editing its code.

Required changes:

1. Separate a pseudonymous browser ID from a real session ID. A configurable 30-minute inactivity boundary is a proposed initial session rule, not a property of the current implementation.
2. Define an event schema with version, event ID, authoritative shop scope, occurrence time, server receipt time, session ID, product/variant identity, and bounded typed metadata.
3. Give a checkout its own stable ID. Carry it through guest and authenticated order placement and idempotent retries.
4. Create order-success facts from the server after the order commits. One order produces one authoritative order success; product-line facts remain separate.
5. Add event deduplication, time validation, owned-product checks, safe metadata limits, and merchant preview/test traffic exclusion. Rate limiting remains an additional control.
6. Instrument the shared product actions so homepage, category, collection, and detail interactions are covered consistently.
7. Preserve consent behavior. On acceptance, begin measurement of the current eligible state from that time; do not fabricate pre-consent history. Stop behavioral collection appropriately when consent is withdrawn.
8. Keep analytics delivery non-blocking. Use bounded retries or a small delivery queue where appropriate; failure must not stop checkout.
9. Define funnel conversion using distinct linked sessions or checkout IDs in the same eligible cohort, with sequence and attribution windows. Unmeasured orders remain in authoritative business totals, but cannot be divided by an unrelated tracked-visitor denominator.

**Done when:** one two-product order counts as one order; event retries do not inflate counts; a session completing several orders is counted once in session conversion; visitors declining tracking do not erase their actual order revenue; each cart surface produces the intended events.

## Step 9. Add acquisition attribution and genuine checkout abandonment

**Priority: after session/checkout identity. Owner: full-stack engineer. Depends on Step 8.**

For attribution, retain permitted landing source, medium, campaign, and referrer across navigation. Attach a validated attribution snapshot to the resulting order, including model/version and attribution window. Keep order channel separate from acquisition source. Distinguish Direct, Unknown, and Unattributed. A session-scoped model is a simpler initial choice than claiming cross-device or long-term attribution the application cannot establish.

For abandonment, start from a checkout with items and a stable ID. Store activity time, progress, order linkage, and recovery state. A configurable 60-minute inactivity threshold is a proposed starting product rule; exclude active checkouts and distinguish abandonment from a later purchase that has not yet been reconciled. Track anonymous checkout abandonment separately from identified carts that could support a recovery workflow.

Repair search reporting at the same time: use an explicit submitted or settled query identity, authoritative search result count where available, normalized terms, unique-session counts, and a full unique-term total separate from the top-results list. Avoid treating an incomplete page of products as the entire catalog's result count.

**Done when:** a campaign landing remains attributable after product/cart navigation; Direct is not used as a catch-all for missing data; an active checkout is never reported abandoned; a completed/recovered checkout cannot remain Open; search totals and top-25 display limits are clearly distinguished.

## Step 10. Convert Growth Center into an action and experiment workflow

**Priority: after reliable reporting and measurement. Owner: full-stack engineer with product review. Depends on Steps 2–9.**

Preserve the useful existing ad-copy and saved-draft mechanisms. Reorganize [Growth Center](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx) around Actions, Product Opportunities, Search Demand, Experiments, and Campaign Drafts.

Each action should store product/scope, reason code, rule version, evidence interval, numerator/denominator, data quality, recommended action, status, owner where supported, and evaluation time. Offer Open, In progress, Completed, Dismissed, and Snoozed states. Completion records that work was done; it does not assert that performance improved.

Before recommending promotion, evaluate available variants and stock, known margins, returns/cancellations, delivery readiness, and measurement sufficiency. Missing economics should limit the advice to research or content/discovery work. Do not replace the existing small thresholds with arbitrary larger thresholds and call the result confidence; define sample requirements, uncertainty, and calibration.

Include zero-activity products in the opportunity view without interpreting a tracking gap as low demand. Give each recommendation one direct action: Edit product, Restock, Review shipping, Inspect checkout errors, or Create draft. Move long product insights to a stable page or a manageable drawer with separate performance and creative sections.

Link a recommendation and saved campaign draft to an experiment with a hypothesis, primary metric, baseline, start/end time, changes made, and outcome. Record manual spend only if its provenance is clear. Add ad-platform integration later when needed. ROAS and acquisition-cost metrics require actual spend and attributable outcomes; present them as unavailable until then.

**Done when:** every recommendation has evidence, limitations, and a useful destination; out-of-stock or unprofitable products are not presented as ready to scale; merchants can record an action and later inspect its outcome; AI suggestions remain reviewable and tied to their evidence.

## Step 11. Consolidate repeated work and implement correct daily aggregates

**Priority: begin query consolidation early; enable rollups after correctness is stable. Owner: backend engineer.**

Growth's overview, products, and recommendations currently repeat the same product calculations. Share one request-scoped or cached result, or return an assembled workspace response with section-level states. Use one frozen interval for the response. Add pagination and filters before the catalog grows further.

Then revise the existing [rollup script](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/scripts/runAnalyticsRollup.js), [shop daily metrics](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/models/ShopDailyMetric.js), and [product daily metrics](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/models/ProductDailyMetric.js).

Daily aggregates must use the same versioned definitions as live reports, count orders distinctly, preserve delivery/refund occurrence dates, support negative adjustments, and handle late events. Make backfill and recomputation idempotent and able to remove stale aggregate rows. Ratios should be calculated from correctly combined numerators and denominators, not averages of daily percentages. Unique customers/sessions across multiple days cannot generally be recovered by summing daily unique counts; retain an appropriate distinct-identity strategy or limit the metric's stated scope.

Reconcile rollups against source facts before switching readers. Keep a recent live tail and a finalized historical range with explicit boundaries so no data is counted twice. Use query plans to select indexes; measure latency and scanned records before setting service targets. Show data-through time and monitor lag/errors.

The existing raw event retention is 180 days. Older historical behavioral data cannot be reconstructed after expiry unless valid aggregates already exist; backfills must disclose that limit.

**Done when:** dashboard, chart, product report, and export totals reconcile; recomputing the same period changes nothing; late refunds update the correct period; old and live ranges do not overlap; query load no longer multiplies across Growth endpoints.

## Step 12. Verify, migrate, and release each increment

**Priority: applies to every release. Owner: engineer delivering the change plus reviewer.**

Use a disposable local/staging database with no production credentials for development verification. Expand the original controlled fixtures into meaningful regression tests, covering:

| Scenario | Required result |
|---|---|
| One order with two lines or two variants | One order total and one shop order count |
| Coupon, shipping, tax, and quantity > 1 | Components reconcile exactly to stored snapshots |
| Created last month, delivered this month | Delivery-based sales appear in this month |
| Refund this month for an older sale | Original delivery remains; current refund adjustment appears once |
| Received return awaiting refund | No completed-refund value is reported |
| Partial return | Remaining lines retain value and delivery history |
| Deleted product | Past sales remain, with snapshot identity |
| No sales vs API failure | Distinct zero and error states |
| More than 500 products / sold-out variant | Complete stock summary and correct variant alert |
| Tenant ID string/ObjectId and foreign shop | Equal own-shop results; no cross-shop data |
| Consent declined, duplicate events, interrupted navigation | No improper behavioral collection or inflated events; actual orders remain correct |
| Shop/range changes while loading | Obsolete results are ignored |
| Staff/plan change | UI, API, export, and cache honor effective access |
| Repeated backfill or webhook | No duplicate financial or inventory effect |

For historical migrations, first produce a read-only reconciliation report: affected record counts, old/new totals, exact vs uncertain dates, refund allocation exceptions, and excluded rows. Test backups/restore and use resumable batches with a recorded migration version. Do not overwrite ambiguous historical evidence merely to make totals agree.

Run the new read path alongside the old one on staging or a controlled subset and inspect differences against the agreed formulas. Differences from known bugs are expected; unexplained differences are release blockers. Use a feature flag for reader cutover. If financial writes have migrated, rollback must remain compatible with those writes; do not deploy an older return handler that would undo the corrected partial-refund behavior.

Validate the actual admin screens on desktop and mobile after the data fixes: values, tooltips, date controls, deep links, focus, keyboard actions, error states, and partial loading. Then observe reconciliation errors, failed requests, response times, and aggregate lag after release.

**Done when:** all release-specific checks pass, data differences are explained, migrations are recoverable, and the live interface communicates the actual definitions and limitations.

## The first work package to assign

Assign Steps 1–5 as the immediate corrective release, split into reviewable changes:

1. Metric definitions and expected-result fixtures.
2. Tenant normalization, order/item aggregation, and explicit unavailable/error states.
3. Delivery/refund history, coupon/refund allocation, and deleted-product preservation.
4. Shared inventory/active-order/customer definitions and integration into all three pages.
5. Cross-page reconciliation, migration dry run, and browser verification.

UI restructuring can be prepared while this work proceeds, but it should be released against the corrected metric contract. Tracking and growth experiments follow once their dependencies are reliable. This sequence gives the merchant trustworthy improvements in each release and avoids rebuilding the same calculations several times.
