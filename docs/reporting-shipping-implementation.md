# Overview, Analytics, Growth Center and delivery charges — implementation record

22 October 2026. This records the first two implementation increments of the action plan, not completion of all twelve steps. Changes are local; no production migration, deployment, commit or push was performed.

## Implemented

- A shared `commerce-v2` calculation supplies Overview, Analytics, Growth product metrics and Growth product detail trends. Orders are counted once even when they contain multiple variants. Tenant IDs are normalized before aggregation.
- Sales use recorded delivery dates and stored order items. Current product deletion and later order status changes do not remove delivery evidence. Completed refunds are recognized on their refund dates, including negative net-sales periods. Pending refunds do not reduce sales.
- New orders store coupon allocations on eligible product lines, with exact paisa totals. Historical coupons without allocations use a disclosed proportional fallback.
- Partial returns leave the order Delivered until all item quantities have been physically received. Refund completion checks cumulative quantities and the returned items’ paid value after coupons. Completed refunds cannot be edited again. Original delivery dates cannot be overwritten by repeating Delivered, and completed/cancelled orders cannot be sent back through fulfillment.
- Missing historical buying costs make the affected profit totals unavailable. Missing delivery/refund dates produce warnings and are excluded; mutable `updatedAt` is never substituted as a financial date.
- Financial reporting supports 7/30/90 calendar days, this month, last month, and validated custom dates in Asia/Dhaka across all three pages. Today is partial. Active orders include Confirmed. Low-stock reporting evaluates variant thresholds across the catalog instead of truncating the first 500 products.
- Analytics discloses unmeasured conversion and abandoned carts. It includes a sales reconciliation showing gross product sales, coupons, completed refunds, net sales, delivery charges and tax separately. Failed reporting requests show retry states. Overview discards superseded requests; Growth detail requests are cancelled when closed or replaced.
- Growth includes products with no recorded activity, retains archived sales, labels behavioral ratios as event ratios, and treats recommendations as preliminary. Promotion suggestions check current availability. Calendar intervals remain frozen when passed to Growth AI, while valid older rolling intervals remain accepted.
- Dashboard caches are invalidated after order creation, cancellation, delivery updates and refund completion. Delivery/refund date query indexes are declared.

## Metric contract

All source amounts are BDT; allocation and accumulation use integer paisa. API date intervals are half-open `[from, to)`. Date-only end dates include that entire Dhaka calendar day.

| Field | Definition |
|---|---|
| Gross product sales | Stored item totals for deliveries occurring in the interval |
| Coupon discount | Stored eligible-line allocation; proportional fallback only for historical orders without allocations |
| Net product sales | Gross product sales minus coupons minus completed product refunds occurring in the interval |
| Delivered orders | Distinct orders with a recorded delivery in the interval |
| Delivered units | Delivered item quantities, before later returned quantities |
| Average delivered product order | Delivered product value after coupons, before subsequent refunds, divided by delivered orders |
| Product gross profit | Net product sales minus stored buying cost, reversing sellable returned cost on receipt; legacy returns retain their prior settlement-date convention |
| Delivery and tax | Stored charges on delivered orders, separate from product revenue; these are not cash-settlement records |
| Active orders | Current Pending, Confirmed, Processing and Shipped orders |
| Returning buyers | Buyers delivered to in the selected interval who also had a recorded delivery before its start |

Reference fixture: two lines worth BDT 1,000 and 500, costs 400 and 200, coupon 100, delivery 80. Expected gross 1,500; net product sales 1,400; product gross profit 800; delivery 80; order value 1,480; one order. A completed second-line refund of 466.67 with restored inventory leaves net sales 933.33 and gross profit 533.33. A later refund-only interval can have negative sales.

## Merchant delivery settings

Shipping Settings now has a separate customer delivery charge form. Select a supported Bangladesh **district**, an inside charge and an outside charge. “Inside” means within that district, not a city corporation boundary. Zero is valid; negative, non-finite, excessive and sub-paisa charges are rejected.

Example: base Chattogram, inside BDT 60, outside BDT 150. A customer selects Chattogram to receive 60, or Dhaka to receive 150. No district is preselected. The cart says “Calculated at checkout.” Supported district names are selected from the backend list; legacy English aliases are normalized by the server.

Settings are tenant scoped, require shipping permission, use version conflict detection and write an audit entry. Courier credentials remain a separate setup.

Checkout obtains a signed quote from the server, bound to shop, district, rule, amount, configuration version and a fifteen-minute expiry. Guest and authenticated order creation both revalidate it before consuming phone-verification proof. Changed settings or an expired quote require review of an updated charge. An idempotent retry returns the existing order. Free-shipping coupons preserve the original charge and shipping discount in the snapshot.

Each new order stores the rule, zone label, version, district, original charge, shipping discount and final charge. Later merchant edits do not reprice previous orders.

Unconfigured shops retain an explicitly disclosed compatibility default: Dhaka 80 / outside 120, matching the former checkout display. This corrects the backend's former outside price of 130 for future orders only. Old clients using Inside/Outside Dhaka are accepted only while the shop is unconfigured. Once rates are saved, a valid district quote is required. Coordinate backend and storefront rollout before enabling settings for merchants.

## Verification

Tests use disposable loopback MongoDB replica-set databases, not the application's configured database.

- Reporting/shipping integration tests cover cross-page reconciliation; multiple variants; archived products/orders; later negative refunds; unavailable cost; scoped/versioned settings; guest and authenticated checkout; stale quotes; free shipping; idempotent retries; partial/refund limits; concurrent refund serialization; preserved delivery timestamps; and low stock beyond 500 products.
- Unit tests cover exact rounding, eligible coupon allocations, date boundaries, district aliases, free rates, tampering, wrong-shop quotes, expiry and malformed charges.
- Existing checkout tests and focused Growth AI HTTP tests pass, including frozen calendar evidence and authorization boundaries.
- A real browser test covers Overview, Analytics failure/retry, Growth Center, saving delivery settings, and mobile checkout resolving inside/outside Chattogram charges. No browser runtime errors were observed.
- Admin and storefront production builds and scoped frontend lint pass.

Final focused checks: 16 unit tests, 9 checkout/reporting integration tests, 8 Growth AI HTTP integration tests, and one browser scenario passed. The broad unit run passed 531 of 535 tests.

The entire repository test suite is **not green**. The broad run exposed unrelated AI prompt-version, product low-stock enqueue, promotion-copy and courier-button source assertions. Broad integration execution also contains suites that demand their own specific disposable database names, plus existing AI history, product bulk-state and Store Builder failures. Do not treat focused passing checks as a whole-repository release signoff.

## Remaining work and release conditions

1. **Finish step 3 corrections and historical review:** new delivery, receipt/restock, and refund facts plus separate receipt/settlement are implemented. Completed refunds remain locked. A standalone correction/adjustment workflow, automatic payment-provider settlement, and reviewed historical backfill are still absent. New facts are immutable through the application model, not through database access controls. Establish retention/erasure handling and restricted database access before production use; the current privacy-request panel only tracks requests and does not execute erasure.
2. **Review historical data before production rollout:** missing delivery/refund dates, historical coupon scope, full-order refunds that may include delivery/tax, and missing costs. The read-only audit below reports gaps. No automatic backfill or guessed dates have been applied. Persist corrected history only from reviewed evidence.
3. **Finish steps 5–7:** broader customer identity reconciliation, operational drill-downs, paginated product/variant reports, cross-device named saved reports, and the full Overview layout redesign. Custom date UI, preceding-period comparisons, CSV export, daily data table, and one locally saved period are implemented. Current counts and period sales should remain visibly distinguished.
4. **Steps 8–9:** durable deduplicated session/checkout IDs, consent-aware coverage, acquisition attribution and genuine checkout abandonment. Existing event counts remain approximate; “Not measured” is intentional until the required data exists.
5. **Steps 10–11:** recommendation confidence and measured experiments, margin/return-aware campaign gates, shared request caching and durable reconciled daily rollups. Current financial reports stream facts and legacy order history, query legacy refund orders individually, and read another interval for comparisons; load-test large tenants before rollout. No performance SLA or scale claim is made.
6. **Step 12:** prepare indexes before accepting traffic, run staging reconciliation with real historical distributions, review the default shipping policy, then deploy backend and storefront together. Validate actual courier expenses separately from customer delivery charges. Resolve broader-suite failures before claiming complete launch readiness.

### Read-only historical audit

`ecommerce-backend/backend/scripts/audit-reporting-history.js` requires an explicit `REPORTING_AUDIT_URI` and one shop ObjectId. It does not load `.env`, write data, build indexes or infer dates. Supply credentials through the environment, never in a committed file or shared report. It outputs counts, not customer records. The command is:

```sh
node scripts/audit-reporting-history.js SHOP_OBJECT_ID
```

The original action plan remains the roadmap. This document is the implementation status and the record of what still needs to be delivered.


## Second increment — financial facts, return receipt, and report controls

### Financial history and returns

- `FinancialFact` stores delivery, receipt/restock, and refund evidence with a unique shop/event key. Operations and facts commit together in MongoDB transactions, with transient transaction retries. Repeating a delivery keeps its original timestamp and fact. Duplicate receipts/refunds cannot repeat inventory or financial changes.
- Delivery facts freeze item values, coupon allocation, buying cost, order charges, source, and a customer identifier. Later product deletion or operational-order changes do not rewrite those financial totals. Existing dated orders can be snapshotted when touched by the delivery/return flow; their provenance is `existing_delivery_record`, not a claim of independently reviewed historical evidence.
- Approved returns require an explicit sellable-unit decision per line. Unsellable units require a reason and do not enter stock. Inventory logs and the receipt fact record the movement; original item costs, rather than current catalog costs, drive the cost reversal.
- Receipt leaves revenue unchanged. Completing a manual refund records its product, delivery, and tax components at refund time and does not restock again. Total and component caps use the original paid order snapshot and previous completed refunds. An order becomes Returned after all units are received; payment becomes Refunded only when the full original charge is recorded as refunded.
- Physically deleted catalog variants can be recorded with zero restock and a reason, then refunded. Partial failures roll back all stock, logs, status, and facts together. The admin exposes the receipt decision separately from the manual refund form and locks completed refund controls.
- Example: two BDT 100 units with BDT 40 unit cost, delivery 80 and tax 10. Receiving both with only one sellable unit restores one unit and reverses BDT 40 cost. A later BDT 290 refund splits into products 200, delivery 80, and tax 10. Cumulative net product sales are 0; product gross profit is −40 for the unsellable unit. The refund-only period has −200 net product sales and no second cost reversal.
- Refund facts intentionally omit free-text payment notes, transaction references, and proof files. A customer ID remains linkable data. Application middleware blocks edits, deletes, replacements, and bulk writes of facts; privileged raw database access is outside that boundary. No new erase/retention policy has been silently introduced.
- Reports expose legacy/ledger coverage counts and warn when deliveries still use mutable legacy snapshots. Unknown historic dates/costs remain disclosed. No production data was backfilled.

### Reporting controls

- Period filters live in the URL on Overview, Analytics, and Growth Center. Named month presets and custom ranges have a 366-day bound. End dates include that Dhaka day; present/future end bounds are capped at the current instant. Invalid ranges remain recoverable through the page controls.
- Overview and Analytics show preceding-period changes for net product sales, product gross profit, and delivered orders. The previous span uses the same elapsed duration and local clock boundary for partial current days. Zero or negative prior values show an absolute change without a misleading percentage; unknown profit stays unavailable.
- Save/load period stores one preference per user/shop on the current device. It is not a server-synced named report system. The Overview top-products link carries the selected period into Growth and focuses Product Performance.
- Analytics exports summary, daily, and product rows using the shared reporting service and the displayed interval bounds. CSV includes currency, timezone, metric version, generation time, warnings, and separate delivery/tax refund columns. Text cells are protected against spreadsheet formula interpretation; numeric negative adjustments remain numeric. Existing Analytics authentication, permission, and subscription checks apply to exports.
- Analytics includes a keyboard-accessible daily table equivalent to the chart. Growth accepts custom historical evidence intervals without changing them to a fresh 30-day range; generated campaign drafts retain their existing historical-evidence warning.
- Exports rerun the report for the frozen date bounds. A later recorded correction or refund within those bounds can change a subsequent export; this is not a persisted point-in-time report snapshot. Charts are not zero-filled where historical coverage is uncertain.

### Second-increment verification

Using isolated loopback replica-set test databases:

- 5 ledger integration tests passed: delivery rollback/idempotency, append-only guards, history after deletion/mutation, partial sellable receipt, negative later refunds, component caps, tenant isolation, concurrent receipt limits, and multi-product rollback.
- 10 reporting/shipping/checkout integration tests passed, including custom-date reconciliation across all three pages, comparison to zero activity, authenticated CSV export, partial refunds, concurrent settlements, and merchant delivery quotes.
- 8 Growth AI HTTP integration tests passed.
- 17 focused reporting/scheduling unit tests passed, including month rollover, elapsed-time comparisons, custom AI evidence bounds, CSV quoting, coupons, and shipping quotes.
- The expanded real-browser scenario passed: period changes, failure/retry, custom dates, local saved-period restoration, CSV download, daily table, damaged receipt, manual delivery-inclusive refund, settings, and mobile checkout. No browser runtime errors were reported.
- Changed admin files pass scoped lint, and the admin production build passes. A repository-wide admin lint run still reports 17 existing errors outside the changed reporting files. The security-hardening unit file passes 42/45; its same three existing source assertions concern product low-stock enqueue, promotion wording, and courier-button wording.

Release conditions remain: prepare the fact indexes, use a replica-set MongoDB deployment, reconcile legacy history in staging, settle retention/correction policy, and resolve broader repository checks. No production migration, deployment, commit, or push was performed.
