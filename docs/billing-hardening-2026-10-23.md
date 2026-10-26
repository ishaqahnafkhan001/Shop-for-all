# Billing fixes — 23 October 2026

Implemented the nine defect areas from `billing-review-2026-10-22.md`, plus payment instructions, independent optional-section failures, plain-text invoice/receipt downloads, and durable payment notification jobs. Changes are local; no production records, deployments, or indexes were modified.

## Behavior and policy

- Renewal adds 30 days/monthly or 365 days/yearly from the later of approval time and the active paid-through date. Initial activation is preserved. Late/reactivated subscriptions start from approval.
- An approved upgrade/cycle change takes effect immediately and carries remaining paid days forward. This is a day-carry policy, not monetary proration. Downgrades retain the existing scheduled workflow. The page describes the day lengths and carry policy.
- Pending plan/cycle are separate from active plan/cycle. Rejection clears pending fields without changing an active subscription's cycle.
- `lastPaidInvoiceId` distinguishes an activated invoice from `lastInvoiceId` (the newest quote/submission). Previously, submission could make activation incorrectly look like a duplicate.
- Submission requires an exact, finite, positive invoice amount with at most two decimal places and a nonempty reference. Approval rechecks amount, shop, invoice state, and current attempt. There is no partial-payment/credit workflow.
- Submission, pending subscription state, current invoice attempt, notification jobs, and audit intent commit transactionally. Subscription writes serialize competing invoice/payment requests. One pending payment per shop is allowed. Retrying the same provider/reference returns the original attempt; conflicting reference reuse is rejected.
- Only unpaid/rejected, unexpired invoices accept a new payment. Expired quotes require a new invoice. Matching valid quotes are reused, and request keys support retries. Different valid unpaid choices remain separate; pending payment prevents additional quote creation.
- Rejected attempts remain immutable. A corrected distinct transfer/reference can be submitted against an eligible rejected invoice. Retrying an already rejected reference does not create another attempt. The UI directs vendors to support if the original transfer was correct; it does not tell them to pay again.
- Vendor history is paginated; payable invoices have a separate query so older unpaid records remain reachable. Renewal and cycle buttons now perform invoice creation. Rejection reasons and review dates are visible; internal payment/invoice notes are omitted from vendor responses.
- Timeline/history failures show a retry banner without removing successful subscription/payment data. A failed current-subscription request still blocks the page, because authoritative plan state is required.
- Downloads are plain-text invoice summaries and paid receipts, not styled PDF/tax invoices. New paid invoices capture purchased extension start/end; historical invoices without snapshots display unavailable dates.
- Notification channels are queued independently in `billing-notifications`. Owner/platform notifications upsert on event identity to avoid duplicates on ordinary retry. Email delivery is at least once; a process failure after email acceptance may duplicate an alert. No real emails were sent by validation.

## Deployment requirements

1. Deploy backend, admin bundle, and worker together; keep the worker running to deliver queued billing notifications.
2. Configure `BILLING_BKASH_INSTRUCTIONS`, `BILLING_NAGAD_INSTRUCTIONS`, `BILLING_BANK_INSTRUCTIONS`, and `BILLING_SUPPORT_CONTACT` with verified recipient/account details. These are vendor-visible strings, never secrets. Missing instructions show an explicit contact-support message. Configure the existing Super Admin email recipient and mail provider for email alerts.
3. Use MongoDB transactions (replica set/compatible cluster). Submission now requires them, as approval already did.
4. Inspect the existing payment reference index before rollout. The schema fixes its unsupported partial `$ne` predicate to `{ transactionId: { $type: 'string', $gt: '' } }` with unique `(provider, transactionId)`. Check historical duplicates first. If a same-name incompatible index exists, schedule a controlled replacement with writes paused; do not run a blanket `syncIndexes()` in production. No index was dropped here.
5. Review historical pending-cycle inconsistencies, duplicate payments, and paid-period errors separately. This change does not guess or rewrite old financial history.

## Verification

- 33 existing billing/subscription tests passed.
- 5 MongoDB integration tests passed: concurrent quote/submission reuse, early renewal and approval replay after a later quote, pending/rejected annual cycle, amount/state/reference/ownership validation, approval mismatch, rollback, old payable discovery, durable notification creation, and repeat notification processing.
- Chrome browser test passed: renewal/cycle actions, cycle-change invoice creation, 25-invoice pagination, old payable selection, read-only amount, configured instructions, rejection message, receipt download, and timeline outage resilience.
- Admin build and scoped Billing ESLint passed. Existing Mongoose duplicate-index/deprecation warnings remain outside this patch.

## Remaining roadmap improvements

The report's later product expansion is not all implemented: private proof uploads, styled PDF invoices, searchable/date-filtered history, before/after pricing previews with monetary credits, automated reminders, review-age dashboards, reconciliation alerts, immutable refund facts, and payment gateway/webhooks remain separate work. The financial fixes do not constitute a live production/payment-provider test.
