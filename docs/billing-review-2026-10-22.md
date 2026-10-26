# Billing review — 22 October 2026

The billing section has useful foundations, but payment integrity and subscription-period handling should be fixed before adding more billing features. This review covers the vendor page, relevant Super Admin payment actions, invoice/payment services, subscription activation, display, lifecycle, and route checks. It is a source review with focused tests and isolated service probes, not a full production, browser, or security audit. No application code or live billing records were changed.

## Current behavior

A vendor selects Beginner, Starter, Growth, or Pro and a monthly/yearly cycle. The server calculates a price and creates an unpaid invoice. The vendor submits manual bKash, Nagad, bank, or other payment details. Super Admin approves or rejects them. Approval marks the invoice paid and activates the plan. Separate services handle trials, expiry, grace, suspension, scheduled downgrades, quotas, and audit history.

Useful existing protections include vendor-owner authorization, shop-scoped invoice lookup, server-calculated invoice pricing, payment-review state checks, transactional approval/rejection through the governance service, audit records, and downgrade previews. These are worth retaining.

## Confirmed defects and code-supported failure paths

### 1. P1 — Early renewal discards remaining paid time

`activateSubscription` always sets period start to approval time and end to approval time plus 30/365 days, including same-plan renewals.

Reproduced without a database: an active subscription paid through December 1, renewed November 20, ends December 20. Preserving the remaining 11 days under the existing 30-day policy would end December 31.

Fix: distinguish renewal, immediate upgrade, scheduled change, and reactivation. Same-plan renewal should extend from the later of the existing paid-through date and activation time. Preserve the original activation date separately. Define upgrade credit/proration explicitly. Decide whether “monthly” means a calendar month or a fixed 30-day period and label it consistently.

Evidence: [subscriptionService.js](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/services/billing/subscriptionService.js:326).

### 2. P1 — Full activation does not require payment amount to match the invoice

Submission accepts a client-provided amount; approval marks the invoice fully paid and activates the plan without reconciling payment and invoice amounts. For example, a smaller submitted amount can produce full activation if a reviewer approves it. This still requires Super Admin approval; it is not automatic activation by the vendor.

`Number(amount || invoice.amount || 0)` also replaces an explicit zero with the invoice amount. The Super Admin revenue calculation sums paid invoice amounts, which can then disagree with payment amounts.

Fix: validate finite positive amounts in integer paisa, require a transaction reference server-side, compare expected versus verified amount during approval, and reject mismatches unless an explicit partial-payment/credit workflow handles them. Show expected, submitted, verified, and remaining amounts together.

Evidence: [paymentVerificationService.js](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/services/billing/paymentVerificationService.js:50), [approval](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/services/billing/paymentVerificationService.js:177), [controller](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/controllers/billingController.js:627).

### 3. P1 — Payment submission is not atomic or idempotent

Payment creation, invoice submission, and subscription pending-review changes are separate writes. A failure can leave a payment without matching invoice/subscription state. Two requests with different references can both pass the initial invoice check and create pending payments for one invoice; the ordinary invoice/status index is not a uniqueness constraint. The same-reference index does not prevent that case. This concurrent failure path is established from the code, not reproduced against a live database.

Fix: transactionally claim an eligible invoice, create its payment attempt, and update review state. Add request idempotency and enforce at most one pending attempt per invoice. Send notifications after commit through retryable jobs. Keep approval tied to the current payment attempt, not just any pending payment row.

Evidence: [submission](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/services/billing/paymentVerificationService.js:39), [invoice transition](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/services/billing/invoiceService.js:54).

### 4. P2 — Expired/cancelled invoices can be submitted again

The service rejects paid/submitted invoices but does not allowlist payable states. Its helper changes any non-paid invoice to submitted. Isolated probes confirmed both cancelled → submitted and expired → submitted. The vendor dropdown hides these invoices, but the API path remains permissive.

Fix: allow only unpaid/rejected invoices, with due-date and supersession checks according to the chosen policy. Reissue an invoice when the old quote is no longer valid.

Evidence: [paymentVerificationService.js](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/services/billing/paymentVerificationService.js:39), [invoiceService.js](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/services/billing/invoiceService.js:54).

### 5. P2 — Pending payment changes the active billing cycle

`markPendingApproval` overwrites the subscription billing cycle before payment approval. A probe confirmed that an active monthly subscription becomes labelled yearly while its payment remains pending. Rejection clears pending-plan fields but does not restore the previous cycle.

Fix: store `pendingBillingCycle` separately; apply it only after approval. Keep active plan, active cycle, and active paid-through date unchanged during review.

Evidence: [subscriptionService.js](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/services/billing/subscriptionService.js:206).

### 6. P2 — Current-plan button blocks renewal and cycle changes

PlanCard identifies “Current plan” by plan tier and active status, ignoring the selected billing cycle, then disables the button. An active monthly customer cannot choose the same plan yearly through this selector. There is no explicit renew-current-plan action on this page.

Fix: separate “Renew current plan,” “Change billing cycle,” and “Change plan.” Show resulting start/end dates and any credit before invoice creation. Implement this after fixing period preservation.

Evidence: [Billing.jsx](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/pages/dashboard/Billing.jsx:366).

### 7. P2 — Older unpaid invoices become unreachable

The page requests only 20 invoices and does not render pagination or consume its pagination metadata. Payment candidates come from that same truncated list. An older unpaid invoice can disappear from both history and payment selection. Payments fetch 20 rows and display only five, also without a full-history action.

Fix: paginated/searchable invoice and payment history, a separately queried payable-invoice queue, and persistent selection by invoice ID.

Evidence: [Billing.jsx](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/pages/dashboard/Billing.jsx:594), [payment cards](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/pages/dashboard/Billing.jsx:1542).

### 8. P2 — Rejection reasons do not reach the vendor UI

The API returns `rejectionReason`, but vendor payment cards show only provider, plan/reference, and status. Vendors are told a payment was rejected without seeing the recorded reason or what to correct.

Fix: show the reason, invoice link, submission/review dates, and a resubmit action. Preserve a read-only history of attempts. Keep internal reviewer notes separate from vendor-facing messages.

Evidence: [Billing.jsx](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/pages/dashboard/Billing.jsx:1542).

### 9. P2 — Invoice creation can create repeated bills for the same choice

Each create-invoice request generates a fresh invoice number and record. There is no request idempotency or reuse/supersession of an existing unpaid quote for the same plan/cycle. Repeated selections or retried requests can clutter the list and leave conflicting payable choices.

Fix: return the same invoice for a retried request. Reuse a valid matching unpaid invoice or explicitly supersede it when the intended purchase changes. Do not silently replace an invoice with a payment already under review.

Evidence: [billingController.js](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/controllers/billingController.js:658), [invoiceService.js](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/services/billing/invoiceService.js:14).

## Recommended experience

1. **Current subscription:** effective plan, active billing cycle, paid-through date, status, and one primary action. Pending changes should be a separate panel.
2. **Amount due:** invoice amount, due date, selected plan/cycle, payment status, and the service period being purchased.
3. **Payment instructions:** verified recipient number/account, account type, transfer instructions, invoice reference, and copy buttons. The reviewed page offers provider selection but no configured destination details.
4. **Payment submission:** read-only expected amount, actual paid amount only if deliberately supported, validated reference and sender details, and private proof upload rather than an arbitrary URL field.
5. **Review progress:** submission receipt, pending/approved/rejected state, review expectation, visible rejection reason, and support contact. Do not promise a review deadline until operations can meet it.
6. **Invoice/payment history:** complete pagination, invoice detail, printable/downloadable invoice and paid receipt, status/date filters, and resubmission history.
7. **Plan changes:** clear before/after features, quota effects, billing dates, renewal versus upgrade, and scheduled downgrade status. Replace “Upgrade immediately by creating an invoice” with wording that explains payment verification is required.
8. **Resilient loading:** current plan, history, usage, and timeline should have independent loading/error states. Currently one failed request in `Promise.all` makes the entire billing page fail, even if the payment data loaded successfully.

## Implementation order and acceptance checks

**First: financial correctness.** Preserve renewal time, separate pending cycle, validate verified amounts, allowlist invoice transitions, and make submission atomic/idempotent. Test early/late renewal, pending/rejected cycle change, underpayment, zero/invalid amount, duplicate submission, simultaneous reviewers, and rollback after each write.

**Second: reliable payment journey.** Add current-plan renewal/cycle actions, recipient instructions, rejection details, and invoice/payment pagination. Test more than 20 invoices with an old unpaid invoice, retry after a lost response, and recovery from a timeline API failure.

**Third: operational polish.** Add invoice/receipt downloads, reminder jobs, review queue age, reconciliation alerts, and a summary of pending/approved/rejected payment attempts. Persist explicit refund dates/amounts before treating payment refunds as reliable period reporting; current Super Admin refunds use mutable `updatedAt`.

**Last: gateway automation.** Introduce a provider integration only after the same invariants hold for manual payments. Webhooks must be authenticated, deduplicated, matched to authoritative amounts, and safe to retry.

## Validation and limits

All 33 tests in billing-core, subscription-lifecycle-safety, subscription-architecture, and subscription-plans passed. Isolated in-memory service probes reproduced early-renewal time loss, pre-approval cycle mutation, and cancelled/expired invoice resubmission. Those probes replaced persistence/event dependencies and did not connect to the configured database or send messages.

The submission race and underpayment approval findings are based on the actual execution paths and missing guards, not a production exploit or a full concurrency integration run. Existing passing tests do not cover these cases sufficiently. No real payments, subscriptions, invoices, or account access were changed.
