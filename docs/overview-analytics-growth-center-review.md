# Overview, Analytics, and Growth Center: current behavior and improvement blueprint

Reviewed: 21 October 2026. Scope: the merchant admin pages, their APIs and metric calculations, storefront instrumentation, supporting order/return data, plan access, saved campaign drafts, and analytics rollups.

This is an analysis of the current working tree. Existing uncommitted product publishing work was preserved. Application source was not changed for this review. Findings distinguish source inspection, controlled local database reproduction, and proposed behavior. Production data, deployment configuration, live advertising accounts, and the live browser presentation were not inspected.

**The main issue is trust in the numbers.** The pages provide a useful foundation, but they do not share a consistent definition of revenue, profit, orders, conversion, reporting period, or stock risk. Several disagreements are implementation defects; others are legitimate differences that the interface does not explain. Correcting those foundations should precede adding more charts or stronger advertising advice.

## 1. How the three areas should fit together

| Area | Merchant question | Current emphasis | Recommended responsibility |
|---|---|---|---|
| Overview | What is happening, and what needs my attention today? | Sales totals, inventory, setup, billing, announcements | A concise daily operating dashboard with urgent actions and links into detail |
| Analytics | Why did business performance change? | Delivered sales, a daily chart, best sellers, customers, sources | Consistent reporting with comparisons, segments, reconciled financial measures, and drill-downs |
| Growth Center | What should I improve or test next? | Product event ratios, rule-based labels, searches, ad copy | An evidence-based action queue with readiness checks, experiments, and outcome tracking |

Keep the three pages. Give them separate responsibilities while making them read the same underlying definitions. A merchant should be able to move from an Overview alert to an Analytics explanation and then a Growth action without finding contradictory totals.

## 2. Access and plans

All three merchant areas use vendor authentication and staff permission checks. Overview requires `overview`; Analytics requires `analytics`; Growth Center requires `growthCenter`. Analytics and Growth also enforce the corresponding shop feature on the backend. Ad generation has the additional `aiAdGenerator` feature gate, rate limiting, and the shared AI generation policy.

Checked-in defaults:

| Capability | Beginner | Starter | Growth | Pro |
|---|---|---|---|---|
| Overview basics | Yes | Yes | Yes | Yes |
| Overview financial trends | No | Yes | Yes | Yes |
| Overview top products / low stock | No | Yes | Yes | Yes |
| Analytics | No | Yes | Yes | Yes |
| Growth Center | No | No | Yes | Yes |
| Ad copy generation | No | No | Yes | Yes |

Effective access can also depend on subscription state, shop configuration, and feature overrides. These are code defaults, not a claim about a particular live shop's subscription.

Sources: [navigation](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/config/dashboardNavigation.jsx), [admin routes](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/routes/adminRoutes.js:1117), [Analytics routes](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/routes/analyticsRoutes.js), [Growth routes](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/routes/growthRoutes.js), [plan definitions](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/config/subscriptionPlans.js:47).

## 3. Overview: what it does today

### Loading and data flow

`/dashboard` loads `GET /api/admin/dashboard-overview`. The controller resolves plan capabilities and calls `getDashboardOverviewResponse`. That service combines Orders, Products, Users, and InventoryLogs. It caches the assembled response for 30 seconds, using a key that includes the shop and enabled dashboard capabilities.

Announcements load separately. Owner-only components independently load onboarding, billing, usage, and other supporting information. This means the page is an aggregation of several workflows rather than one simple report.

The main request has loading, refresh, and error states. A failed refresh can retain previously loaded content alongside the error, which is useful. There is no visible calculation timestamp or cache-age indicator. Refresh can return the existing cached response. Product and inventory mutation paths include dashboard invalidation; order and return paths do not show equivalent dashboard invalidation in the reviewed code, so those changes can remain stale until cache expiry.

### Information shown

| Section | Current content | Actual scope or calculation |
|---|---|---|
| Total Revenue | BDT total | All currently Delivered, non-deleted orders; currently overcounts order totals after item expansion |
| Net Profit | BDT figure on enabled plans | Delivered item sales value minus item buying costs; excludes order-level discount and operating costs |
| Products | Replaces Net Profit on the basic dashboard | Current non-deleted product count |
| Items Sold | Unit count | Quantities on currently Delivered orders, across all time |
| Active Orders | Count | Pending, Processing, and Shipped; currently omits Confirmed |
| Financial Performance | Monthly revenue and profit chart | Delivered orders grouped by order creation month, with the earliest 12 populated months selected |
| Low Stock Alerts | Up to five variant rows | Variant stock at or below its threshold, calculated from at most 500 fetched products |
| Recent Movements | Up to five rows | Most recent inventory logs from the last 30 days, with product/variant and order reference where available |
| Adjustments | Up to five rows | Net manual stock changes per product in the last 30 days |
| Top Selling Products | Up to ten products | Negative ORDER inventory movements over 30 days; current catalog price |
| Owner setup and account context | Checklist, billing, usage, Beginner growth prompt, trusted badge | Separate supporting components; plan and role dependent |
| Platform announcements | Message, title, severity | Separately loaded platform communication |

### What is useful

The operational stock information is practical. Variant-specific low-stock labels and inventory movement descriptions are more actionable than a single total stock count. Delivered-order filtering avoids counting every pending COD order as realized sales. Shop-scoped caching and capability-sensitive responses provide a foundation worth keeping.

### Important gaps

1. **Revenue duplication.** The service unwinds order items and then sums the entire `pricing.total` for each item row. A two-line order contributes its total twice. The monthly chart repeats the same mistake.
2. **The profit card and chart disagree.** The card uses item sales less item costs. The chart uses duplicated order totals less costs. Neither is a complete net-profit calculation.
3. **Periods are mixed without labels.** Sales cards are lifetime totals, inventory activity is 30 days, low stock is current, and the chart is a selection of historical months. A merchant cannot assess one consistent period.
4. **The chart can show the wrong months.** Sorting ascending and then limiting to 12 chooses the oldest populated months, not the latest 12. The frontend labels months without a year, making longer history ambiguous. Missing months are not filled with zeroes.
5. **Confirmed orders disappear from the active count.** Confirmed is a valid order state and normally still requires fulfillment work.
6. **Top sellers are inventory deductions.** These movements can include orders that never deliver. Cancellation or return restoration is not netted against the ORDER-only ranking. Its definition differs from Analytics best sellers.
7. **Stock completeness is limited.** Only the first 500 products are evaluated, with no explicit sorting or completeness warning. The UI shows five rows without a total count or a direct restock flow.
8. **Some elements look actionable but are not.** Low-stock and adjustment rows use a pointer cursor without a click handler. “View All” passes `focus=top-products` to Growth Center, but that page does not read this parameter.
9. **Too much setup/account content can crowd the daily work.** The onboarding checklist contains 11 steps and is not filtered to the merchant's current plan capabilities. It can ask Beginner merchants to complete unavailable features such as Store Builder, coupons, or Growth Center.
10. **Overview permission includes financial information.** A staff member who can view Overview can receive the page's enabled revenue/profit information even if they lack the separate Analytics permission. Whether this is intended should be an explicit permission decision.

Sources: [Overview UI](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/pages/dashboard/Overview.jsx), [capability selection](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/controllers/orderController.js:698), [Overview calculations](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/services/orders/orderAnalyticsService.js:226), [onboarding checklist](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/components/dashboard/VendorOnboardingChecklist.jsx).

## 4. Analytics: what it does today

### Loading and period

`/dashboard/analytics` calls `GET /api/admin/analytics` once on mount. The backend accepts `from` and `to`, defaulting to approximately the previous 30 days through now. It rounds the start to server-local midnight. The page has no date selector, comparison control, or refresh button, and does not display the actual reporting interval.

Financial aggregations include currently Delivered, non-deleted orders. The date is `shipping.deliveredAt`, falling back to `updatedAt`. MongoDB date grouping does not specify a shop timezone. Consequently, report boundaries and day grouping can differ, particularly around midnight. A later edit to a legacy order without `deliveredAt` can move its revenue between reporting periods.

### Information shown and exact meaning

| Metric / panel | Current meaning |
|---|---|
| Revenue | Sum of `pricing.total` for delivered orders in the period, including the stored shipping/tax and subtracting stored order discount through that total |
| Profit | Revenue minus snapshot buying price × quantity; no courier cost, payment fee, ad spend, or overhead deduction |
| Average Order | Mean `pricing.total` of those delivered orders |
| Abandoned Carts | Open AbandonedCart records whose `updatedAt` falls within the period |
| Returning Customers | Customers with more than one delivered order inside the selected period |
| Total Customers | All Customer user records in the shop, with no reporting-period filter |
| Orders | Delivered orders in the period, rather than all placed orders |
| Conversion Rate | Delivered order count divided by all registered customer records × 100 |
| Sales by Day | Delivered revenue and the above profit formula, grouped by delivery date/fallback |
| Best Selling Products | Top ten delivered products by quantity, using order item snapshots |
| Low Stock | Up to fifteen products whose combined variant stock is strictly below the product threshold |
| Traffic Source | Delivered orders grouped by `Order.source`, with order count and revenue |

The API also computes monthly sales and discount totals that the page does not surface.

### Important gaps

1. **The Conversion Rate label is incorrect.** Registered customers are not visits or eligible checkout sessions. A repeat buyer can place multiple orders, so this ratio can exceed 100%. It cannot explain storefront conversion.
2. **Abandoned cart reporting is not operational.** Repository search found the model and the reporting read, but no application flow writing or recovering AbandonedCart records. The card can therefore show zero while real checkout abandonment exists.
3. **Tenant identifier type is inconsistent.** Unlike the Overview and Growth aggregations, Analytics passes `req.tenantId` directly into aggregation `$match`. Stored shop IDs are ObjectIds; a string value does not match them in this aggregation. Auth code can supply different types across token paths. Controlled reproduction showed zero delivered sales with a string ID while the ordinary customer count still returned one. Normalize the authoritative tenant ID before building pipelines.
4. **Returning customer semantics are too narrow.** A buyer with one historical order and one order this month is not counted as returning unless both orders fall within the current reporting window. Use prior purchase history, or rename the existing metric to “Customers with 2+ delivered orders in period.”
5. **Low-stock logic conflicts with Overview.** A product with one sold-out variant and 50 units in another can disappear from Analytics low stock. Variant overrides are ignored, and equality at the threshold is treated differently.
6. **Traffic Source is largely a checkout channel.** Both reviewed storefront checkout paths submit `source: "storefront"`. The order model has no persistent UTM attribution snapshot. A table dominated by “storefront” cannot distinguish Facebook, organic search, or individual campaigns.
7. **Profit overstates available earnings.** Shipping collected is included as income without deducting actual shipping expense. Returns and payment costs are not reconciled here. “Profit” needs a precise, narrower label until the necessary costs exist.
8. **Failure can look like business inactivity.** After a load failure, the page shows a toast and then renders empty/default zero metrics. There is no persistent error panel or retry action separating unavailable data from a valid zero.
9. **No investigation workflow.** No product/date/channel filters, previous-period deltas, customer cohorts, cancellation/return analysis, export, chart drill-down, or navigable underlying orders.
10. **Report input and completeness need hardening.** `from`/`to` are not validated for invalid values, reversed ranges, or a maximum span. There is no response metadata for timezone, currency, generation time, fallback-date usage, or completeness.

Sources: [Analytics page](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/pages/dashboard/AdvancedAnalytics.jsx), [controller](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/controllers/analyticsController.js), [tenant attachment](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/middlewares/auth.js:19), [abandoned cart schema](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/models/AbandonedCart.js), [checkout](/Users/user/Downloads/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/checkout/page.jsx:235).

## 5. Growth Center: what it does today

### Loading and sources

`/dashboard/growth` supports rolling 7-, 30-, and 90-day windows. It loads four endpoints concurrently: overview, products, search, and recommendations. Product insight is another request. Each request constructs its own time interval; the initial four requests do not share a single frozen reporting timestamp.

The sources are browser-generated AnalyticsEvents, authoritative Orders, ReturnRequests, and current Products. Browser events supply views, carts, checkout starts, and product order events. Orders and returns supply delivered product revenue and additional status metrics. Recommendations are deterministic rules; AI is used separately for optional ad planning text.

### Information shown

| Section | Displayed information |
|---|---|
| Summary cards | Product views, add-to-cart rate, order conversion, delivered revenue, checkout rate, best product, needs-attention product, and search-term count |
| What should I do today? | Preset seller advice chosen from product labels, including a product title, problem, rationale, suggested action, and expected benefit |
| Product Performance | Views, carts, product order events, delivered revenue, cart rate, conversion, label, first suggested action, and Insight button |
| Search Analytics | Up to eight displayed terms, search counts, and zero-result counts from a backend top-25 list |
| Ad Recommendations | Up to six displayed entries from a backend maximum of twelve eligible labeled products |
| Product Insight | Product views, carts, product order events, revenue, cart/conversion rates, and rule-based explanation |
| Ad Copy Helper | Caption, headline, description, CTA; advisory audience, age range, interests, location, angle, improvement advice, evidence references, limitations, and activity sufficiency |
| Campaign draft editor | Manual editing, selected-field AI application/regeneration, undo support, save/load/copy, duplicate, archive, and delete |

The backend additionally returns checkout counts, confirmed/delivered/cancelled/returned counts, return values, and daily rows. The main insight modal does not display a daily chart or most of these status and return details.

### Current formulas

- Add-to-cart rate = add-to-cart events / product-view events × 100.
- Product order conversion = product `order_placed` events / product-view events × 100.
- Cart-to-order rate = product order events / add-to-cart events × 100.
- Summary checkout rate = product checkout-start events / add-to-cart events × 100.
- Revenue = product item totals from currently Delivered, non-Refunded orders in the delivery window, less matching return-item refund amounts in the return window, clamped to a minimum of zero per product.
- “Best Product” is the first product after sorting by net delivered revenue, then browser order events, then views. It is not a profitability or confidence score and need not have a Winner label.
- “Search Terms” is the number of returned top terms, capped at 25, not the full unique-term count.

The revenue definition says it deducts refunded return value. The actual return query also accepts Received and Closed returns, including Received requests with a pending refund. This matters when interpreting the displayed figure.

### Exact label rules, evaluated in this order

| Label | Rule |
|---|---|
| Needs data | Views < 10, carts < 3, and order events < 2 |
| Winner | Views ≥ 20, cart rate ≥ 8%, conversion ≥ 2% |
| Hidden gem | Views < 25, order events ≥ 1, conversion ≥ 4% |
| Fix before ads | Views ≥ 20 and cart rate < 3% |
| Checkout problem | Cart rate ≥ 8% and cart-to-order rate < 15% |
| Low interest | Views < 25 and carts = 0, after earlier rules fail |
| Needs data, mixed performance | Any remaining case |

Rule order affects the result. For example, a small sample can receive Hidden gem or Winner once earlier checks are bypassed. These thresholds are business heuristics, not statistical confidence or a prediction of advertising profitability. Low interest is absent from the daily action priority list. A generic Collect more data action is always included, even when the catalog already has substantial activity.

### Storefront collection and its limitations

The tracker sends events only after analytics consent is accepted. It supplies a browser identifier, current URL/referrer, current URL UTM parameters, coarse device details, and caller-provided product/order metadata. Errors are swallowed so analytics does not interrupt shopping, which is appropriate for storefront reliability.

However:

- The value named `sessionId` is stored indefinitely in localStorage. It is a browser identifier, not a time-bounded session.
- There is no landing-page/session-start event, so the current stream cannot calculate full-store visit conversion.
- Order and checkout events are emitted once per cart line. A two-product order produces two order events. Multiple variants can produce multiple events for one product.
- Product-detail views are tracked in an effect; cart additions from the homepage can occur without a detail-page view. These totals are not a closed, linked funnel and ratios can exceed 100%.
- Views and checkout starts mark their local tracking guard before the consent-aware call. Accepting consent afterward does not replay the missed initial step. Later carts/orders may be tracked without the corresponding view.
- The order event is a best-effort browser call after successful order placement. Navigation, network failure, declined consent, or deliberate client input can make it differ from saved orders.
- UTM parameters are read from the current page only; they are not preserved from a campaign landing page through checkout.
- Browser collection coverage differs by shopping surface. Shared add-to-cart actions do not themselves instrument every caller; the reviewed homepage supplies a callback and ProductDetails tracks separately.
- Search analytics counts debounced typed queries, and result counts come from currently loaded products. It can report partial loaded results rather than the total catalog matches and can record multiple intermediate terms.

The public collector is rate-limited, but it trusts client-provided event/entity IDs and metadata after basic normalization. It does not verify product ownership, authenticate order events, enforce event IDs for deduplication, or establish a server-verifiable consent/session context. Client events should remain behavioral signals; they should not become the authoritative financial or order ledger.

### Delivered revenue and history gaps

1. **Partial refunds can remove too much sales value.** The return workflow marks the whole order Returned/Refunded even for a subset of items. Growth's delivered-only revenue query then drops every line in the order. It also subtracts return-item amounts, instead of preserving delivery history and applying a refund adjustment.
2. **Refund timing is unreliable.** Received/Closed can be deducted before payout; `updatedAt` fallback can move the deduction after an unrelated edit. Editable `refund.amount` can diverge from the summed item `refundAmount` used by Growth.
3. **Refund-only periods are hidden.** Clamping product totals to zero conceals legitimate negative period adjustments. Financial reporting needs to preserve negative movement where applicable.
4. **Product deletion changes historical totals.** Only current non-deleted Products survive the product join, and the overview sums their rows. Deleting a product can remove its historical sales from Growth totals.
5. **Catalog products with no activity vanish.** Product IDs originate from events/orders/returns, not the catalog. A product with zero signals has no row and cannot be prioritized for discovery work.
6. **Discount allocation is missing.** Product totals are snapshots before the separately stored order-level promotion discount. Growth's “net delivered” product revenue does not allocate that discount, unlike Analytics order total.
7. **Detail and summary use different refund rules.** The daily delivered query does not apply the summary's Refunded payment exclusion or return deductions. Surfacing the existing daily rows without correction would introduce another disagreement.

### AI and saved drafts: capabilities to preserve

This area already has meaningful safeguards: a frozen evidence interval for generation, shop/product ownership checks, shared generation request accounting/replay, language choices, deterministic fallback labeling, explicit evidence/limitations, field provenance, and protection against applying stale generated content. Location/topic context uses bounded canonical aggregates rather than sending arbitrary customer search strings into that context.

Saved campaign drafts are already implemented. They support version conflict checks, a maximum of 50 saved drafts per shop, and 90-day retention after the last save. They warn about old evidence or changed product facts. Saving/copying existing text does not require another AI generation. The current interface explicitly says planning only: it does not connect to an ad account or publish ads.

The missing piece is measurement after a merchant acts: no experiment record links a recommendation, creative draft, destination, campaign attribution, spend, and resulting performance. Keep the existing draft and provenance mechanisms and connect them to that future workflow.

### Growth UX and performance gaps

- Four initial endpoints are all-or-nothing in `Promise.all`; one failure prevents all new data from being set. There is no persistent page error state or manual refresh. On a failed range change, old data can reappear under the newly selected range.
- Overview, products, and recommendations each run the same four product aggregations plus a product lookup. That is at least fifteen repeated product-metric queries across these three requests, before overview/search-specific work.
- Product results are unpaginated and have no category, stock, evidence-quality, or label filters in this page. Generic advice cards have no direct fix action, owner, due date, completion state, or outcome.
- Closing the insight modal while detail is loading does not abort or clear the loading state. The modal remains open and the response can populate it afterward.
- Product recommendations do not check available stock, variant availability, contribution margin, return rate, cancellation rate, delivery quality, or traffic authenticity before recommending promotion.
- The long modal mixes diagnosis, raw generated output, and saved draft editing. A full product insight page with tabs would be easier to inspect and work in.

Sources: [Growth UI](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx), [rules and metrics](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/controllers/growthController.js:75), [storefront tracker](/Users/user/Downloads/Shop-for-all/ecommerce-storefront/src/utils/analyticsTracker.js), [event collector](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/controllers/analyticsEventController.js), [return workflow](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/controllers/returnController.js:50), [campaign editor](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/components/ai/GrowthCampaignEditor.jsx), [draft service](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/services/ai/aiCampaignDraftService.js).

## 6. Controlled verification: what was reproduced

A disposable MongoDB instance bound to localhost was used with synthetic data. Real application service/controller functions were called directly. No production database, external AI provider, or HTTP authentication flow was involved. The temporary database process was stopped afterward.

Fixture: one Delivered order with two distinct product lines, item sales of BDT 1,500, item buying cost of BDT 600, order discount of BDT 100, shipping collected of BDT 80, and final order total of BDT 1,480. It was created 35 days before delivery. A second order was Confirmed. Three current catalog products existed; one had no activity. One product had a sold-out variant plus another variant holding 50 units.

| Observation | Actual result |
|---|---|
| Overview Total Revenue | BDT 2,960, demonstrating duplicated order totals |
| Overview Net Profit card | BDT 900 |
| Overview monthly Profit | BDT 2,360 for the same order |
| Overview reporting month | Creation month, rather than delivery month |
| Analytics Revenue with ObjectId tenant | BDT 1,480 |
| Analytics Profit | BDT 880 |
| Analytics Conversion | 100%, based on one delivered order / one customer record |
| Analytics with the same tenant as a string | Revenue/orders zero; customer count still one |
| Confirmed order counted as Overview active | No; Active Orders was zero |
| Sold-out variant surfaced | Overview: yes; Analytics: no |
| Growth order events for one two-product order | Two, from the per-line event model |
| Growth delivered product revenue | BDT 1,500, without the BDT 100 order coupon allocation |
| Product without activity in Growth list | Omitted |
| Soft-delete Product B | Growth revenue fell from BDT 1,500 to BDT 1,000 |
| Received return with pending BDT 200 refund | Growth revenue fell to BDT 1,300 before refund completion |
| Whole order marked Returned after BDT 200 partial refund | Growth revenue fell to zero, losing the remaining value |

Additionally, 17 existing tests passed across Growth interval/taxonomy context, ad insight generation, and AI acceptance/provenance. These tests support those narrower mechanisms; they do not validate every dashboard total or the full production UI.

## 7. Priority assessment

Priority describes the recommended implementation sequence, not an external security rating.

| Priority | Work | Why it comes first |
|---|---|---|
| P1 | Fix item-expansion revenue duplication and unify financial formulas | Existing displayed financial values are demonstrably incorrect |
| P1 | Normalize aggregation tenant IDs | Valid shop data can appear as zero depending on identifier type |
| P1 | Preserve delivery history and handle partial refunds correctly | Current status-based reports can erase unrelated sold items |
| P1 | Keep historical totals independent of product deletion | Catalog maintenance must not alter past business performance |
| P1 | Correct/rename conversion and order-event metrics | Current labels invite invalid conclusions |
| P1 | Distinguish errors, uninstrumented metrics, and valid zeroes | Merchants need to know when a report is unavailable or incomplete |
| P2 | Standardize dates, timezone, comparisons, and response metadata | Makes cross-page reconciliation and daily reporting possible |
| P2 | Fix source attribution, event identity, and session/funnel semantics | Needed before trustworthy acquisition and growth advice |
| P2 | Unify variant stock logic; include Confirmed active orders | Operational alerts should describe real work consistently |
| P2 | Consolidate repeated Growth queries; add filters and pagination | Improves consistency and bounds growing database work |
| P2 | Make recommendations actionable and confidence-aware | Turns descriptive advice into a useful merchant workflow |
| P3 | Add experiments, attributable spend, cohorts, and scheduled exports | Builds higher-value analysis after reliable foundations exist |

## 8. A better measurement foundation

### One metric definition layer

Introduce one reporting service and a versioned metric dictionary consumed by all three pages. Separate order-level calculations from item-level calculations so the same order total is never repeated by item expansion. Reuse this layer for exports and daily aggregates.

Proposed financial definitions, to be agreed as product rules:

| Metric | Proposed definition |
|---|---|
| Placed orders | Distinct authoritative order IDs created in the interval |
| Delivered orders | Distinct orders with a recorded delivery occurrence in the interval |
| Units delivered | Delivered snapshot quantities, reported separately from order count |
| Gross product sales | Delivered item snapshot totals before order-level coupon allocation |
| Coupon discount | Order-level discount allocated to eligible items using a documented rule |
| Net product sales | Gross product sales − allocated discounts − recognized product refunds |
| Shipping collected | Customer shipping charges, shown separately |
| Tax collected | Stored tax, shown separately |
| Product gross profit | Net product sales − recognized cost of goods, with an explicit policy for returned inventory |
| Contribution profit | Product gross profit + retained shipping collected − actual delivery/return costs − payment fees − attributable ad spend |
| Average delivered order value | Agreed delivered-order value / distinct delivered orders; label whether shipping/tax are included |

Do not label a value Net Profit until the system actually captures and deducts the costs required for that meaning. Missing costs should be marked “not recorded” or “estimated,” rather than silently treated as zero.

Coupon allocation should preserve the original order total: use exact currency units, a deterministic rounding rule, and assign any remainder to a documented item. Store allocations on the financial snapshot; do not reconstruct history from today's product price or promotion configuration.

### Preserve financial occurrences

Current status is suitable for a live order queue. It is insufficient as the only basis for historical delivered sales. A later refund should add a refund occurrence rather than erase the delivery occurrence.

A practical design is an internal immutable fact/adjustment record for delivery, refund, and relevant costs, uniquely keyed to the underlying transition. Each record needs authoritative shop ID, order/line reference, currency, occurrence time, amount components, source version, and idempotency key. Product identity should retain snapshot title/SKU even after catalog deletion.

Use transactions or the existing durable job infrastructure with an outbox so order changes and reporting facts cannot silently diverge. Duplicate delivery webhooks or retries must not double-count. Corrections should be explicit adjustments or versioned rebuilds, with an audit trail.

For period reports, retain negative refund adjustments. For operational product rankings, a separate display can use a nonnegative score if clearly labeled; do not reuse that score as financial revenue.

### Report metadata

Every response should identify:

- Interval as `[from, to)` and its date basis: order creation, delivery, or refund occurrence.
- Reporting timezone and currency.
- Generated time, data-through watermark, and metric-definition version.
- Current and comparison-period values where requested.
- Measurement coverage: tracked sessions, authoritative orders, and known exclusions.
- Data-quality warnings such as missing legacy delivery times, unallocated historic refunds, or unavailable cost data.
- Whether a value is complete, partial, estimated, unavailable, or a genuine zero.

Use a configured shop reporting timezone; Asia/Dhaka is a reasonable default for these Bangladesh-oriented flows, subject to the actual shop setting. Group and filter using the same timezone. Custom ranges should be validated and bounded, and missing days should be zero-filled only when data is known to be complete.

### Trusted behavior events

Retain consent-aware collection. Define a short-lived session separately from a pseudonymous browser identifier. Add schema-versioned event IDs, cart/checkout correlation IDs, occurrence and receipt timestamps, validated owned product IDs, and bounded typed metadata.

Use browser events for observed behavior and server events for successful order placement. Deduplicate on event identity scoped to the shop. Exclude or flag known merchant preview/test traffic, bots, and suspicious bursts. Strip unnecessary query-string fields and minimize stored free text; the current full URL and arbitrary search terms can contain information unrelated to analytics.

Persist permitted acquisition context at landing and attach a validated attribution snapshot to checkout/orders. Distinguish channel (`storefront`, manual/admin) from acquisition source/medium/campaign. Keep direct, unknown, and unattributed separate. Do not silently infer attribution where consent or linkage is unavailable.

### Conversion that describes a real funnel

Store conversion and product conversion need separate definitions:

- Store session conversion: distinct eligible measured sessions with a successful order / distinct eligible measured storefront sessions.
- Product view-to-cart conversion: distinct measured sessions that viewed and then added that product / distinct sessions that viewed it.
- Checkout completion: distinct checkout IDs resulting in an authoritative order / distinct eligible begun checkout IDs.
- Product order conversion: distinct eligible product-view sessions with an attributable product purchase / distinct eligible product-view sessions.

Define sequence and attribution windows, deduplicate stages, and keep the numerator within the measured denominator cohort. Display the measured population and coverage. Authoritative total orders can include buyers without analytics consent; those totals should remain available without being divided by an unrelated measured-session denominator.

If session linkage is incomplete, show raw event counts with accurate names and mark conversion unavailable. Renaming existing ratios is an immediate safe improvement while complete instrumentation is built.

### Honest abandonment

Do not count every add-to-cart as an abandoned checkout. Define abandonment as a real checkout with items, no successful order, and an elapsed inactivity threshold selected as a product rule. Link recovery by checkout/order identity and exclude active checkouts. Separate anonymous checkout abandonment, identified recoverable carts, and recovered orders. If no collection flow exists, show “Not configured,” not zero.

## 9. Better page designs

### Overview: a short operating dashboard

Recommended order:

1. **Urgent work:** orders awaiting confirmation/fulfillment, courier problems, out-of-stock variants, pending returns, and blocking billing/verification issues. Each item links to the filtered work queue, subject to staff access.
2. **Four primary KPIs:** net delivered sales, delivered orders, average delivered order value, and active orders. Show interval, previous-period comparison, and definition tooltips. Use contribution profit only when costs are available and the user has access.
3. **One trend:** daily delivered sales for a visible chosen period, with the comparison period and drill-through into Analytics.
4. **Compact stock/action panel:** out-of-stock and low-stock variant counts, prioritized rows, exact threshold, and a Restock action opening the correct variant.
5. **Top products:** delivered net sales or units, with an explicit sort choice and a link into the same filtered Analytics definition.
6. **Collapsed secondary context:** setup progress until complete; billing, usage, and announcements when actionable. Show plan-aware onboarding steps and direct branding routes where appropriate.

Keep lifetime totals as an explicit secondary view. Do not mix lifetime and period cards without labels. Preserve the selected shop, interval, and filters in the URL.

### Analytics: an investigation workspace

Use one persistent date/comparison/timezone bar and a compact summary row. Suggested tabs:

| Tab | Questions and useful breakdowns |
|---|---|
| Sales | Gross/net sales bridge, discount/refund totals, placed vs delivered orders, average value, daily trends |
| Products | Product/variant units, allocated net sales, costs/margin when available, stock, returns; sortable and paginated |
| Acquisition | Sessions, attributed orders, net sales by source/medium/campaign, unknown attribution and measured coverage |
| Funnel | Linked view/cart/checkout/order stages, device split, step drop-off, tracking gaps |
| Customers | First-time vs repeat buyers, repeat purchase rate, purchase frequency, retention cohorts; avoid labeling registered users as buyers |
| Delivery and returns | Confirmation-to-delivery rate, cancellation reasons, delivery time, refund timing and partial-return value |

Every chart should offer an equivalent data table, accessible labels, keyboard navigation, and a link to the underlying permitted records. Add CSV exports after the metric contract is stable; exports must use the same period, timezone, definitions, and access rules as the screen.

### Growth Center: a measurable action queue

Replace a large collection of generic cards with a small ranked queue. Suggested tabs: Actions, Product Opportunities, Search Demand, Experiments, and Campaign Drafts. Product insight should have a stable route so merchants can share/revisit it and preserve filter context.

A useful recommendation contains:

- Product or funnel problem and a precise observation, including numerator/denominator.
- Evidence window, sample sufficiency, comparison, and known tracking gaps.
- Why the evidence suggests investigation; distinguish hypotheses from proven causes.
- Readiness checks: stock, available variants, content, delivery policy, contribution margin, return/cancellation history.
- One direct action, such as Edit product, Restock variant, Review delivery charges, or Create campaign draft.
- A responsible staff member, status, optional due date, and dismissal/snooze reason.
- An expected measurement direction and evaluation period, without promising uplift.
- A completion/experiment link and observed results after the change.

Example: “This product had 240 measured viewing sessions and 4 cart sessions in the last 30 days; its cart rate is lower than the comparison period. Review the first image and delivery-charge disclosure. Stock is available. Evidence is limited to consenting sessions. Edit product / Start a monitored test.” This is proposed interface content, not a finding about a real shop.

For a promotion candidate, require sufficient reliable observations, available stock, and acceptable known economics. A small number of orders is an early signal, not proof that paid acquisition will work. Keep heuristic label rules versioned and explainable. Use confidence ranges and calibrated minimum samples once session measurement exists, rather than inventing a universal threshold.

Rank actions using a transparent combination of affected demand, business value at risk, evidence strength, stock/economic readiness, and effort. An estimated score should be displayed as a ranking aid, not a guaranteed revenue forecast.

Keep the existing ad-copy editor, provenance, evidence interval, conflict handling, and fallback behavior. Add tracked destination links and associate a draft with an experiment. Spend, ROAS, and acquisition cost should stay unavailable until real spend and attribution are captured. External ad publishing would be a separate integration and authorization workflow.

## 10. Backend and scaling approach

Build a shared reporting request/context normalizer, financial metric service, behavior funnel service, inventory risk service, and recommendation evaluator. Controllers should compose these services rather than maintain independent formulas.

For Growth's initial view, either return one assembled workspace response or have the existing endpoints share a cached immutable snapshot keyed by shop, interval, timezone, and metric version. Independent widget errors should not blank the entire page. Requests need cancellation/stale-response protection when shop or filters change.

Existing `ShopDailyMetric`, `ProductDailyMetric`, and the rollup script can be reused as a starting point, but **they are not currently read by these pages**. The current script groups orders by creation date, counts expanded item rows as orders at shop level, captures current delivery status when run, and does not reconcile refunds. Scheduling it unchanged will not solve the correctness issues.

Revise rollups to derive from versioned authoritative facts and deduplicated behavioral stages. Maintain separate placement, delivery, and refund measures. Support idempotent recomputation, late events, and backfills. Reconcile aggregate sums to source facts and expose the data-through watermark. Raw AnalyticsEvents currently have a 180-day TTL; long-term behavior reporting needs valid rollups before that data expires.

Choose indexes from measured query plans. Candidate dimensions include shop plus delivery/fact occurrence time and shop/product/event/time; verify against actual workloads. Bound list sizes and report ranges. Use short-lived caches for current data and durable historical aggregates for completed periods. Instrument endpoint latency, scan volume, rollup lag, invalid events, deduplication, source reconciliation differences, and widget failures.

Sources: [rollup implementation](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/scripts/runAnalyticsRollup.js), [shop daily metrics](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/models/ShopDailyMetric.js), [product daily metrics](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/models/ProductDailyMetric.js), [raw retention](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/models/AnalyticsEvent.js:12).

## 11. Delivery sequence and acceptance criteria

### Phase 1: make existing numbers dependable

Fix order/item aggregation, tenant ID normalization, Confirmed active orders, page errors, and misleading metric names. Share low-stock definitions. Agree revenue/profit/date rules. Correct partial-return accounting and prevent catalog deletion from altering history. Clearly mark unavailable abandonment and attribution.

Accept when a one-line, multi-line, multi-variant, discounted, fully refunded, partially refunded, and deleted-product fixture produces the agreed figures across pages for the same interval and basis. Valid zero, unavailable data, and failed loading must have distinct states. Both legacy and account-based authenticated tenant contexts should be tested.

### Phase 2: provide useful daily and analytical workflows

Add common period/timezone/comparison controls, data timestamps, drill-down links, stock actions, filters/pagination, and plan-aware onboarding. Resolve refresh/range/modal behavior and staff financial permission policy. Consolidate Growth computation.

Accept when a merchant can open an Overview alert, inspect the same filtered population in Analytics, and take a relevant action without losing shop/period context. A failed widget or stale response must not mislabel data under a new range.

### Phase 3: repair measurement and acquisition

Add true sessions and linked checkout stages, deduplication, authoritative order success facts, consent-aware coverage, validated attribution, and honest abandonment/recovery. Introduce corrected rollups and historical backfill with limitations exposed for unrecoverable legacy fields.

Accept when one multi-product order is one order, events cannot double-count on retry, checkout recovery maps to the correct order, and a campaign landing remains attributable through navigation where collection is permitted. Revenue must reconcile even when behavioral collection is declined.

### Phase 4: connect growth advice to outcomes

Add readiness-aware action ranking, experiment records, saved draft links, tracked destinations, and post-change comparisons. Add actual ad spend integrations only when required and separately authorized.

Accept when every recommendation shows evidence and limitations, has an actionable destination, and can be followed through to a measured outcome. Do not describe before/after differences as causal uplift without an appropriate experiment design.

### Essential regression coverage

- Order count vs line count vs unit count, including two variants of one product.
- Multi-line totals, shipping, tax, scheduled price, coupon allocation, zero-cost/missing-cost cases, and rounding.
- Delivery in a different period from order placement; midnight and timezone boundaries; legacy missing delivery time.
- Partial/full refunds, refund-only periods, return received before refund, late corrections, repeated webhooks, and idempotent retries.
- Product soft deletion, renamed products, new prices, products without activity, and more than 500 catalog entries.
- Tenant isolation and ObjectId/string contexts; staff permissions and plan downgrade behavior.
- Repeated events, preview/test traffic, missing consent, consent accepted mid-visit, unloaded page navigation, and blocked analytics requests.
- Attribution across navigation and guest/authenticated checkout; direct vs unknown; safe metadata limits.
- No data, partial data, widget failure, range races, retry, expired cache, and insight close during loading.
- Rollup/source reconciliation, late event backfill, retention boundaries, and metric version migration.

## 12. Decisions to settle before implementation

1. Which sales figure is the primary merchant KPI: delivered product sales, net product sales after refunds, or total delivered order value? Show the other components separately.
2. Which cost fields can the business actually capture, and therefore which profit label is supportable?
3. Should Overview financial/profit information require a distinct staff permission?
4. What shop timezone and default interval apply, and how should legacy missing dates be presented?
5. Which acquisition model and attribution window will be used? How will unmeasured sessions be labeled?
6. What inactivity threshold defines abandonment, and which identified carts are eligible for recovery workflows?
7. How much historical data can be backfilled reliably from snapshots and return records? Which gaps must remain explicit?
8. What evidence and readiness rules should qualify a product for an advertising test, and how will those rules be evaluated against actual outcomes?

The recommended first release is a correction and clarity release: reconcile the money, use accurate labels, expose periods and data quality, and connect existing alerts to real work. The following releases can then add reliable funnel measurement and measurable growth experiments on that foundation.
