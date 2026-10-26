# Verification and acceptance plan

These are **future implementation tests**, except the executed baseline at the end. No destructive test, database integration or provider mutation was run for this audit.

Test levels: **U** pure unit predicates/serialization; **S** service runtime with explicit fakes/faults; **I** actual HTTP/auth/middleware plus disposable MongoDB replica set; **B** real browser and actual app/API with disposable DB; **P** controlled staging provider resources; **DR** isolated backup restoration with egress/traffic disabled. Source-string assertions alone do not prove deletion, concurrency, authorization or media absence.

## Disposable fixture requirements

Create fixtures using the current [launchSafetyHarness.js](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/tests/helpers/launchSafetyHarness.js:1) or a deletion-specific isolated extension. It intentionally clears its test database. Require an explicitly disposable test-only URI and verified replica set; never infer safety from a variable name alone or run against production/staging/shared developer data. Do not load the application's production environment to construct fixtures. Provider clients are stubbed by default.

- Shops A/B, plus a second membership shop C; unrelated B must continue transacting throughout A cleanup.
- Separate owner Accounts; Account A owning or ambiguously administering another shop; customer Account shared across A/B; a staff Account shared across A/B; platform/support Account with no tenant ownership; guest/unlinked legacy Users and legacy JWT shapes.
- Single owner, multiple VendorAdmins, mismatched/missing legacy/Account verification owner, inactive memberships and suspended Account/User/Shop. Same email/phone across tenant-specific records and independently shared identity.
- Products with stable variant IDs, stock/reservedStock/alert metadata; archived/soft-deleted catalog; category borrowed image, collection reverse links; POs, logs and idempotency mutations.
- All order/payment/courier/return/refund states, independent invoice/manual-payment review states and uncertain real-provider outcomes; consent/customer backlinks and retained historical snapshots.
- Builder live/draft/revision/retired assets, legacy/restricted theme fields, transformed/query/versioned URLs, shared external/preset sources, mixed image/video/raw and authenticated NID files, migrated originals and support/return evidence.
- All 67 current model types, indirect SupportMessage/Assignment rows, nullable-shop Job payloads, pending/completed audit outbox, platform/global records that must remain, OTPs for different shops/purposes, AI in-flight receipts/results and TTL edge cases.
- Warm/cold Redis and process caches, restored stale cache, custom domain plus platform subdomain, localStorage cart/wishlist, expired proof and current sessions.
- Large shop fixture using bounded batches and provider pagination, duplicate/conflicting/unknown ownership, malformed IDs and legacy collections. New model added to source must fail registry-coverage acceptance until classified.

## P0 — authorization, scope and transaction correctness

| ID / level | Scenario and assertion |
|---|---|
| AUTH-01 U/S/I/B | Proven owner + correct current password + reviewed scope accepted; VendorStaff with all permissions denied; unrelated VendorAdmin and platform role without explicit authority denied. |
| AUTH-02 I | Body/path/header shop/account substitution cannot change server-selected S/A. Cross-tenant request/status/receipt probing returns no foreign scope or PII. |
| AUTH-03 U/I | Missing/expired/tampered JWT, missing Account/User/membership, wrong sessionVersion, suspended identity and all legacy claim variants fail appropriately. New deletion mutation refuses legacy account-less tokens. |
| AUTH-04 I | Current-password mismatch, old stolen but valid session, stale preflight, changed owner/membership, CSRF missing/wrong, rate-limit attempts; no password/token in job/audit/log payloads. |
| AUTH-05 I | Multiple owned/joined shops and customer/staff/platform roles block or preserve Account according to explicitly approved scope; B credentials/memberships/history are unchanged. Never auto-delete customer/staff Accounts just because A membership was their last. |
| AUTH-06 U/I | Wrong-purpose checkout, order-access, reset, marketing or receipt proof cannot authorize deletion. Scope/expiry/nonce/grant-hash mismatch denied. |
| AUTH-07 I/B | Preflight issues narrow receipt before submission; lost acceptance response after session revocation can recover minimal state using that grant; requestId alone cannot. Receipt never authorizes delete/cancel/login or retained customer data; short expiry enforced. |
| STATE-01 I | Concurrent same-key submissions yield one persisted request, fence, job and critical audit intent; changed request scope conflicts; different keys cannot create two active requests for S. |
| STATE-02 I | Failure at each acceptance write aborts all request/fence/job/audit changes. Successful acceptance returns 202, never a completed-erasure response. |
| STATE-03 I | Eligibility changes between preflight/confirmation/transaction: active order, new membership, hold, payment approval or policy version mismatch prevents unsafe acceptance. |
| RACE-01 I | Pause checkout immediately after admission/read; close shop concurrently; resume. Correct transactional fence permits a pre-cutoff completed operation included in drain/manifest or rejects/conflicts it. No late surviving order/guest/consent/log/job after verified drain. Test both public and authenticated checkout. |
| RACE-02 I | Same controlled interleaving for product create/edit, upload linking, stock adjustment, PO receiving, returns/restock, staff/customer creation and settings/Builder publish. Test actual Mongo writes; mocked “guard called” tests are insufficient. |
| RACE-03 I/S | Pause a provider operation before send, during send and before result persistence. Cancellation cannot be treated as undo. Reconcile or hold uncertain outcome; stale completion cannot revive rows. |
| RACE-04 I | Old worker lease resumes after a new executor claims request: old lease cannot checkpoint/finalize; per-item side effects remain replay safe and independently reconciled. |

## P0/P1 — data inventory, obligations and cross-tenant integrity

| ID / level | Scenario and assertion |
|---|---|
| DATA-01 U/S/I | Registry covers all 67 active current model definitions, plus every external/embedded category. Unclassified new model, nullable payload variant or contradictory ownership blocks completion. |
| DATA-02 I | Seed at least one row per direct model and all indirect children; execute approved cleanup; independently query residuals by shop and frozen foreign IDs. Include archived, soft-deleted, failed, dead, cancelled and expired-but-not-yet-TTL-purged records. |
| DATA-03 I | Ticket → messages/assignments/attachments, outbox.audit.shop_id/entity references, OTP metadata, User.order backlinks, AI entity IDs, campaign recipients, subscription IDs and historical media are discovered before parent deletion. |
| DATA-04 I | Dangling IDs, missing tenant keys and a B row referencing an A product/ticket are investigated/held, not removed by widening a selector. Empty/undefined S/A never becomes a broad delete. |
| DATA-05 I | B and shared global collection fingerprints match before/after (VendorPlan, agents, global known issues/sequence/announcements/leases); B login, Settings, product Add/Edit and checkout still succeed. |
| DATA-06 I | Eligible owner Account finalization cannot leave login/reset legacy migration capable of recreating the account. Customer/staff Accounts remain intact unless their own deletion is separately authorized. |
| RETAIN-01 U/I | Active orders/deliveries/refunds/POs/reservations and financial reviews exercise exact blocker rules; no synthetic cancellation, paid/refunded state or stock reset is introduced. |
| RETAIN-02 I | Delivered/Cancelled/Returned is not assumed safe: approved customer-rights and financial retention/hold decisions control treatment. Holds have explicit reason, scope, review/expiry and access. |
| RETAIN-03 I/B | After approved eligible catalog/Shop removal or minimization, retained history/tracking/receipts/refunds remain available only to the authorized customer/operator; no new checkout or full inactive-store access is enabled. |
| RETAIN-04 I | Minimized retained records remove unnecessary email/phone/NID/free text/media; legal/commercial fields remain intact. Hashing alone is not asserted to anonymize identifiers. |
| BILL-01 I | Access lookup during/after cleanup cannot recreate Subscription, invoice or trial. Cancellation/renewal/downgrade/reconciliation/manual approval cannot reactivate Shop or staff/products. |
| BILL-02 I | Other suspended shops retain legitimate billing/verification recovery. Unrelated plan access, renewals and manual payments remain functional. |
| AI-01 S/I | Freeze admissions; reconcile completed, failed, timed-out, uncertain and receipt-only operations with their owner/fence/week. No premature deletion/TTL of unresolved accounting and no cross-request credit release. |
| AI-02 S/I | Late provider response/history save/draft duplication cannot recreate erased content; provider-held uncertainty produces declared retention/operator state, not success. |

## P1 — workers, providers, caches and failures

| ID / level | Scenario and assertion |
|---|---|
| JOB-01 I | Cancel ordinary queued/failed/running work with exact scope, preserve unrelated Jobs and the deletion orchestrator. Include every worker queue, including inactive-compatible support, receipt and welcome queues. |
| JOB-02 S/I | Run overdue publishing/sales, billing lifecycle/reconciliation, AI recovery, email reconciliation, activity retention and asset cleanup during deletion. Direct loops cannot recreate or accidentally purge held records. |
| JOB-03 I | Audit intent pending/processing/completed and materialized log are scrubbed/retained consistently; replay cannot reintroduce erased actor/entity snapshots. |
| EXT-01 S/I | Resend valid late events for present, removed, held and wrong-tenant recipients. Signature validation remains intact; deletion status suppresses unsafe mutations; unrelated webhook processing works. |
| EXT-02 S/P | Parcel/email accepted but local acknowledgement lost: reconcile provider identity/outcome, avoid duplicate shipment/send, preserve financial obligation evidence. Provider errors remain explicit. |
| MEDIA-01 S/I/P | Exact owned image/video/raw/authenticated/public resource identities, derivative/version/query URLs, borrowed image, external cloud, same publicId in different environments/types. No arbitrary URL/prefix destruction. |
| MEDIA-02 S/I | Current Shop + every draft/revision/banner/category/collection/variant/cover/entitlement/support/return reference participates. Shared/preset/held proof remains; eligible exclusive resource removed and outcome checked. |
| MEDIA-03 S/P | Provider success, already absent, denied, invalid type, timeout, rate limit, partial page and malformed response. Success followed by checkpoint failure safely replays; failed provider deletion never becomes final success. |
| MEDIA-04 P | Verify original/derived delivery, CDN invalidation, authenticated NID access and account backup behavior using isolated owned fixtures; document cache/backup exceptions. |
| FAIL-01 I | Inject failure before/after each database batch checkpoint. Resume from stable keys without skipping rows or duplicating retained transformations. Large data stays within memory/BSON/transaction bounds. |
| FAIL-02 S/I | Crash worker during drain/manifest/provider call/purge/final verification; restart with stale lease. No lost progress or early Shop/Account removal. |
| FAIL-03 S/I | Provider outages and database outages produce bounded backoff and operator-visible pending/held state; unrelated tenant processing continues. |
| FAIL-04 I | Failure after parent data is unexpectedly removed still recovers via durable request/manifest; missing parents cannot be misreported as proof of complete erasure. |
| CACHE-01 I/B | Warm/cold/outage/recovered Redis, per-process memory, public bootstrap/settings/product/collections/dashboard/billing/navigation and host caches; stale writers cannot refill after invalidation. |
| CACHE-02 B/P | Next fetch/render/image caching, platform subdomain/custom domain, noindex/unavailable output, domain reuse quarantine; old carts/wishlist/proofs cannot place orders for a different shop. |

## P1/P2 — UI, regression and restore

| ID / level | Scenario and assertion |
|---|---|
| UI-01 B | Owner-only control, staff visibility/permission denial, exact scope, blockers, retention explanations and password confirmation fit existing Settings patterns. No new features outside deletion flow. |
| UI-02 B | Desktop/mobile, keyboard trap/escape/focus return, readable labels, alert announcements, submit/loading state, repeated clicks, failed validation and retry preserve entered data. No nested forms. |
| UI-03 B | Acceptance vs completion wording, lost response, expired receipt, current logout/redirect, other membership login and retained customer history; no falsely successful deletion. |
| REG-01 I/B | B simple/matrix product Add/Edit, category/collections, variants/stock/reservations, pricing, cover/preview/media and UTC scheduled publishing continue; no F01–F11 regressions. |
| REG-02 I/B | B checkout idempotency/concurrency, order history, returns, inventory receiving, auth/password reset, consent, billing and Store Builder autosave/publish/revision restore remain intact. |
| REG-03 I | Existing API response shapes/codes for active shops remain compatible; availability errors for deleting/deleted shops are documented and clients handle them safely. |
| RESTORE-01 DR | Restore a snapshot from before deletion without starting workers/traffic; overlay current independent ledger; reapply purge/holds and invalidate restored Redis/caches before enabling access. No deleted shop/auth/media is resurrected. |
| RESTORE-02 DR | Restored audit outbox, dead Jobs, nullable payloads, AI receipts and provider webhook retries cannot revive deleted rows or repeat external side effects. |
| RESTORE-03 DR/P | Verify backup expiry/compliance lock/Cloudinary versions and residual provider data against actual approved settings. A same-snapshot tombstone alone must fail the test. |
| RESTORE-04 I/DR | Older application/worker version lacks lifecycle guards: rollout must block enabling deletion; rollback cannot re-enable unsafe old writers after erasure. |

## Release gates and evidence

1. Signed-off ownership/multi-shop and retention/obligation policies, actual provider/backup inventory and recovery roles.
2. Registry completeness and owner/tenant/auth/CSRF/replay tests green.
3. Real replica-set race/drain tests green for every critical writer. Provider call admission/reconciliation and receipt recovery demonstrated.
4. Every eligible manifest item removed; retained/shared items explicitly classified with review/expiry; independent residual scan passes. No unknown item is silently ignored.
5. Two-tenant functionality and fingerprints remain correct; current relevant suites and full-suite failures are compared against a new implementation baseline, not the historic product report alone.
6. Isolated staging/provider and restore drills pass with actual settings and saved evidence. Infrastructure compliance locks/retention limits are disclosed accurately.
7. All app/worker/script instances are compatible; monitoring and operator runbooks exist; first controlled deletion and post-completion verification are reviewed.

Evidence should include request/policy/manifest versions, cutoff/lease history, counts by category, provider outcome codes without sensitive payloads, retained-item justifications and a signed/controlled completion summary. Do not retain entire deleted data sets merely to prove their deletion.

## Non-destructive baseline actually executed during this audit

Working directory: `/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend`.

```sh
node --test --test-reporter=tap tests/password-reset.test.js tests/subdomain-availability.test.js tests/custom-domain.test.js tests/storefront-state-delivery.test.js tests/phase2-scheduling-runtime.test.js
```

**39 tests passed, 0 failed.** They exercise existing helper/mocked-runtime/source-contract behavior for password reset, subdomain/domain handling, scheduling and storefront state. No new deletion tests or destructive integration fixture execution occurred. Passing these tests does not validate a nonexistent deletion feature.
