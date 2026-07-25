# Subscription plan deployment

Subscription capability definitions are security-sensitive and live in
`config/subscriptionPlans.js`.

Run this migration before deploying a new API or worker version:

```bash
npm run sync:plans
```

The API and worker also run the same idempotent synchronization before accepting
traffic. Startup fails when synchronization cannot complete. Commercial prices
and limits already stored in `VendorPlan` remain editable; canonical capability
flags, Store Builder access, and badge eligibility are synchronized from code.

Use this command to inspect the planned changes without writing:

```bash
npm run sync:plans -- --dry-run
```

The worker runs subscription lifecycle processing automatically. Optional tuning:

```text
BILLING_LIFECYCLE_INTERVAL_MS=900000
BILLING_LIFECYCLE_BATCH_SIZE=100
BILLING_LIFECYCLE_LOCK_TIMEOUT_MS=600000
```

The defaults are 15 minutes, 100 subscriptions per transition batch, and a
10-minute stale-lock timeout.
