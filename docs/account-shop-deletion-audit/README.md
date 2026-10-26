# Permanent Account & Shop Deletion — pre-implementation audit

Audit date: 20 October 2026. Repository baseline: `33aef74`. **Read-only investigation; the feature has not been implemented.**

The feature can fit the existing Express/Mongoose application and Mongo-backed worker infrastructure. It is **not safe to add a cascade-delete endpoint to the current system**. Safe implementation depends on resolving ownership and retention policy, introducing an authoritative deletion fence across every writer, preserving required customer access, and making external cleanup recoverable. No new microservice or queue provider is justified by the repository evidence.

## Readiness and evidence labels

- **Confirmed:** a schema, route, implementation or executed test establishes the stated behavior. A schema relationship does not prove that production data satisfies it.
- **Inferred:** a predicted effect of the confirmed dependency; needs implementation-time runtime verification.
- **Unknown:** runtime data, infrastructure configuration, external account configuration or contracts were unavailable.
- **Decision required:** an owner, product, legal or operational policy must be approved before irreversible implementation.

**Recommendation:** staged shutdown, durable background cleanup, bounded retries and independent verification using the existing worker. Keep deletion progress outside the documents being removed. Distinguish “request accepted,” “shop closed,” “eligible live data removed,” “retained records held,” and “backup/provider obligations resolved.” Do not call all of these “permanently deleted.”

## Deliverables

1. [Data ownership inventory](/Users/user/Downloads/Shop-for-all/docs/account-shop-deletion-audit/DATA_INVENTORY.md): all 67 registered model definitions, indirect selectors, storage, caches, jobs and shared exclusions.
2. [Dependency and workflow impact](/Users/user/Downloads/Shop-for-all/docs/account-shop-deletion-audit/DEPENDENCY_IMPACT.md): architecture, ownership answers, risk-ranked workflow matrix and UI integration.
3. [Security contract](/Users/user/Downloads/Shop-for-all/docs/account-shop-deletion-audit/SECURITY.md): owner resolution, password confirmation, token revocation, tenant boundaries and races.
4. [Retention decisions](/Users/user/Downloads/Shop-for-all/docs/account-shop-deletion-audit/RETENTION.md): active orders, money, customer records, holds and Bangladesh legal questions.
5. [External services](/Users/user/Downloads/Shop-for-all/docs/account-shop-deletion-audit/EXTERNAL_SERVICES.md): media identifiers, deletion feasibility, CDN/backups and provider limits.
6. [Deletion architecture](/Users/user/Downloads/Shop-for-all/docs/account-shop-deletion-audit/ARCHITECTURE.md): options, sequence, checkpoints, fencing, recovery and disaster recovery.
7. [Implementation plan](/Users/user/Downloads/Shop-for-all/docs/account-shop-deletion-audit/IMPLEMENTATION_PLAN.md): exact current modules and proposed files, dependency stages and rollout gates.
8. [Test plan](/Users/user/Downloads/Shop-for-all/docs/account-shop-deletion-audit/TEST_PLAN.md): fixtures, test levels, failures and release criteria.
9. [Open questions](/Users/user/Downloads/Shop-for-all/docs/account-shop-deletion-audit/OPEN_QUESTIONS.md): decisions, blockers and infrastructure evidence still required.

## Five highest-risk breakages

| Priority | Evidence and consequence | Required safeguard |
|---|---|---|
| Critical | `Account` is global; `User`/membership are tenant-specific. Deleting a shared account can revoke another shop's owner, staff or customer access. | Explicit shop/account scope, authenticated ownership resolution and a relationship census; never delete accounts by shop customer/staff email. |
| Critical | A request can pass middleware before shutdown. Queued, running, periodic and webhook work can survive it. Billing reads can recreate subscriptions. | A database write fence, drain protocol, producer/consumer guards and side-effect admission checks; cancellation alone is insufficient. |
| Critical | Store shutdown blocks the current tenant-gated order-history/tracking/return routes. Product removal also breaks cancellation/restocking. | Resolve obligations before purge and explicitly preserve a restricted historical/customer support route and required dependencies. |
| High | Product/banner media often store URLs, while NID and Builder assets store stronger metadata. Shared folders and historical revisions make prefix deletion unsafe. | Enumerate an immutable asset manifest before removing references; establish ownership and retained/shared references; handle authenticated/image/video/raw assets separately. |
| High | Cleanup has no durable tenant-deletion ledger. Restoring a backup or processing an audit outbox can bring deleted data back. | Independent minimal tombstone, replay-safe steps, restoration reconciliation before traffic/workers and an approved retention schedule. |

Sources: [identity artifacts](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/services/identityService.js:39), [authentication](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/middlewares/auth.js:20), [subscription creation on read](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/services/billing/subscriptionService.js:236), [worker handlers](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/workers/index.js:69), [tracking and order routes](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/routes/storefrontRoutes.js:199), [audit materialization](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/services/platformAuditOutboxService.js:83).

## What can be reused

MongoDB transactions, `Job` idempotency keys/claims/retries/cancellation, `WorkerLease`, tenant resolution, current-account password hashes and bcrypt comparisons, CSRF and rate limits, `User.sessionVersion`, critical audit outbox transactions, existing Cloudinary destruction primitives, and tenant cache invalidation. Each needs deletion-specific integration; none is currently a complete deletion system.

`DataRequest` currently records customer privacy requests and marks their status; it does not perform erasure. Existing product/order/return flags, staff suspension and shop suspension are not permanent deletion mechanisms. [Privacy controller](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/controllers/privacyController.js:94), [product soft deletion](/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend/controllers/productController.js:1018).

## Inspection and verification actually performed

- Read architecture, all model definitions and their compiled schema metadata, authentication/registration, tenant/role/CSRF/plan guards, commerce, provider uploads, worker dispatch and periodic jobs, billing, privacy, Store Builder, settings, storefront routing/caches and operational backup/deployment documents.
- Found 68 files under `models/`: **67 active Mongoose models** and an empty `checkout.js` placeholder. Exact collection names came from disconnected model metadata. No database connection or provider account was used for enumeration.
- Searched for additional collection access, session/refresh-token/MFA mechanisms, destructive paths, external search/storage integrations and backup automation. A live collection census and out-of-repository infrastructure inventory remain unknown.
- Ran, from `ecommerce-backend/backend`:

```sh
node --test --test-reporter=tap tests/password-reset.test.js tests/subdomain-availability.test.js tests/custom-domain.test.js tests/storefront-state-delivery.test.js tests/phase2-scheduling-runtime.test.js
```

**39 passed, 0 failed.** These are existing helper, mocked-runtime and source-contract tests. No deletion tests, database integration tests, provider mutations, migrations, dependency installs or builds were run for this audit. Prior product-editor test results are not evidence of deletion readiness.

## Preconditions to implementation

Approve the ownership/multi-membership contract, per-resource retention and active-obligation treatment, customer history access after closure, subdomain/domain reuse policy, provider asset ownership reconciliation, and actual backup/restore suppression controls. Establish who can resolve retained financial obligations and failed deletion steps. These are enumerated in `OPEN_QUESTIONS.md`; this audit deliberately does not decide them for the owner.

Only this audit directory may change during the audit. Source/data hashes are compared against the starting workspace inventory as the final read-only check.
