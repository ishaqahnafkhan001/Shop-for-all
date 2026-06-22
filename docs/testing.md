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
