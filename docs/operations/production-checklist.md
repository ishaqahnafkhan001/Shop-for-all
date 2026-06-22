# Production Checklist

## Before Deploy

- Confirm all production environment variables are present.
- Confirm `JWT_SECRET`, `CSRF_SECRET`, Cloudinary secrets, mail provider keys, and courier credentials are not committed.
- Run backend tests.
- Run admin lint/build.
- Run storefront lint/build.
- Confirm MongoDB backups are enabled.
- Confirm Cloudinary account access and billing are healthy.

## Health Checks

- API: `GET /api/health`
- Admin app loads and can log in.
- Storefront loads for an active tenant.
- Store Builder saves and storefront reflects changes.
- Checkout creates an order.
- Mail provider can send OTP and order emails.
- Pathao sync worker is running if courier sync is enabled.

## Runtime Processes

- Web API: `npm start`
- Worker: `npm run worker`
- Analytics rollup: `npm run rollup:analytics`

## Rollback

- Keep the last known good deployment available.
- Roll back app code first.
- Roll back database migrations only with a tested restore plan.
- Do not delete legacy NID URLs automatically; private NID migration is lazy and reversible.
