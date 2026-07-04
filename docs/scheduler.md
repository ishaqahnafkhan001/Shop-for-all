# Scheduler And Worker Operations

Scaleup scheduled products, scheduled sales, low-stock alerts, courier jobs, badge analysis, notifications, and customer email campaigns are processed by the backend worker.

## Command

From `ecommerce-backend/backend`:

```bash
npm run worker
```

This runs `node workers/index.js`.

## Required Environment

Use the same backend environment required by the API process:

- `MONGO_URI` or `MONGODB_URI`
- `JWT_SECRET`
- email/courier/SMS/Cloudinary variables needed by the jobs you enable
- `WORKER_POLL_INTERVAL_MS` optional, defaults to `3000`

Do not run the worker against production data from a local laptop.

## Production Frequency

Run at least one always-on worker process per production environment. On Railway, create a separate worker service that uses the same repository and starts with:

```bash
cd ecommerce-backend/backend && npm run worker
```

The worker polls continuously. A cron-only invocation is not enough for courier, email, and scheduled publication reliability.

## Multi-Instance Behavior

Mongo-backed `Job` queues use atomic `findOneAndUpdate` claims with lock IDs, retry counts, stale-lock recovery, and bounded error messages. Multiple worker instances can run safely for queued jobs.

Scheduled product publication is idempotent: the final product update only succeeds while the product is still scheduled and overdue.

Scheduled sale transitions now claim one due sale at a time with a processing state, worker ID, stale lock recovery, retry count, and completion timestamp before invalidating storefront caches.

## Retry And Stale Recovery

Queued jobs:

- `queued` and due jobs can be claimed.
- `failed` jobs are retried with backoff until `maxAttempts`.
- `running` jobs with stale locks can be reclaimed.
- Dead jobs keep a short sanitized `lastError`.

Scheduled sale transitions:

- Due sales move through `processingState: "processing"`.
- Stale processing locks can be reclaimed after 5 minutes.
- Successful transitions set `processingState: "completed"`.
- Failures set `processingState: "failed"` and store a short non-secret error message.

## Local Testing

Use the disposable Mongo replica set:

```bash
cd ecommerce-backend/backend
npm run test:launch:local
```

Or start the database and run integration tests manually:

```bash
npm run test:mongo:up
npm run test:integration:local
npm run test:mongo:down
```

## Confirm Jobs Are Running

Check backend logs for:

- `worker_started`
- `job_completed`
- `scheduled_product_published`
- `scheduled_sale_states_processed`
- `low_stock_alert_created`

Check Mongo collections:

- `jobs.status`
- `scheduledsales.status`
- `scheduledsales.processingState`
- product `publicationStatus`

## Investigating Failed Publication Or Sale Transition

1. Confirm the worker service is running.
2. Check `jobs` for dead or failed scheduled product jobs.
3. Check the shop is active, approved, and not suspended.
4. Check product `publicationStatus`, `publishAt`, `status`, and `isDeleted`.
5. Check scheduled sale `status`, `startsAt`, `endsAt`, `processingState`, `retryCount`, and `lastProcessingError`.
6. Restart the worker if locks are stale; stale locks are recoverable.
7. Never manually update production data without recording an audit note.
