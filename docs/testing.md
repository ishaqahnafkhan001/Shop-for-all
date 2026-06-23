# Testing

This repo has three deployable apps:

- Backend: `ecommerce-backend/backend`
- Admin: `ecommerce-admin`
- Storefront: `ecommerce-storefront`

## Local Commands

Backend:

```bash
cd ecommerce-backend/backend
cp .env.test.example .env.test
npm ci
npm test
```

Admin:

```bash
cd ecommerce-admin
npm ci
npm run lint
npm run build
```

Storefront:

```bash
cd ecommerce-storefront
npm ci
npm run lint
npm run build
```

## CI

GitHub Actions runs:

- Backend `npm ci` and `npm test`
- Admin `npm ci`, `npm run lint`, and `npm run build`
- Storefront `npm ci`, `npm run lint`, and `npm run build`

No Playwright or E2E dependency is added yet. Add browser E2E only after dependency approval.

## Test Database

Use a separate MongoDB database for integration tests. Never run tests against production data.

## Backend Launch-Safety Integration Tests

The launch-safety suite exercises real Express routes against a real MongoDB test database. It covers tenant isolation, checkout/order tampering, Store Builder sanitization, RBAC, CSRF, and public API privacy.

Run from `ecommerce-backend/backend`:

```bash
npm test
npm run test:mongo:up
npm run test:integration:local
npm run test:mongo:down
```

Or run the full local launch gate, including static tests, local Mongo startup, integration tests, and cleanup:

```bash
npm run test:launch:local
```

Requirements:

- `MONGO_URI_TEST` is required for `npm run test:integration`.
- The database must be disposable. The integration harness deletes all collections before and after each test.
- The database name must include `test`; otherwise the harness refuses to run cleanup.
- Checkout/order tests use MongoDB transactions. Use MongoDB Atlas or a local replica set.
- A standalone local MongoDB server may fail transaction tests even when normal static tests pass.
- If using Atlas, create a separate test database and never reuse production or staging data.

### Local Docker Replica Set

The repository includes a test-only Compose file at `docker-compose.test-mongo.yml`.

From `ecommerce-backend/backend`:

```bash
npm run test:mongo:up
npm run test:integration:local
npm run test:mongo:down
```

Details:

- MongoDB is exposed on local port `27018` to avoid colliding with a normal dev MongoDB on `27017`.
- The test URI is:
  `mongodb://127.0.0.1:27018/shop_for_all_launch_test?directConnection=true&replicaSet=rs0`
- `npm run test:mongo:down` uses `docker compose down -v`, so test data is removed.
- This database is for tests only. Do not point the app, admin, or storefront at it for development data.

### Atlas Alternative

If Docker is not available, create a separate Atlas database just for launch-gate tests and run:

```bash
MONGO_URI_TEST="mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/shop_for_all_launch_test?retryWrites=true&w=majority" npm run test:integration
```

The database name must include `test`, and it must be disposable because the suite clears all collections.

If `MONGO_URI_TEST` is missing, the suite exits with setup instructions instead of silently skipping coverage.
