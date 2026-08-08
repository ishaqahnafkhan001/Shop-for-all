# Scaleup

Scaleup is a multi-tenant e-commerce SaaS platform for creating and operating independent online stores. The repository contains a Node.js API and worker, a React/Vite vendor and super-admin dashboard, a Next.js storefront, and shared storefront theme and rendering packages.

## Repository Structure

| Path | Purpose | Main technology |
| --- | --- | --- |
| `ecommerce-backend/backend` | API, authentication, tenant enforcement, billing, orders, catalog, Store Builder, jobs, integrations | Node.js, Express, MongoDB, Mongoose |
| `ecommerce-admin` | Vendor Admin and Super Admin applications | React, Vite |
| `ecommerce-storefront` | Public multi-tenant storefront, checkout, account, SEO, sitemap, and custom-domain handling | Next.js App Router |
| `packages/storefront-renderer` | Shared storefront UI used by both Store Builder preview and live storefront | React |
| `packages/storefront-theme` | Theme defaults, normalization, prebuilt themes, and shared theme contracts | JavaScript |
| `docs` | Architecture, testing, deployment, operations, and production-readiness documentation | Markdown |

## Architecture

```text
Customer or vendor
        |
        +-- Admin (Vite) --------------------+
        |                                    |
        +-- Storefront (Next.js) ------------+--> Express API --> MongoDB
                                             |          |
                                             |          +--> Cloudinary, email, SMS,
                                             |               Gemini, Pathao, RedX
                                             |
                                             +--> Worker --> durable Mongo-backed jobs

Store Builder preview ----+
                          +--> @scaleup/storefront-renderer
Live storefront ----------+            |
                                       +--> @scaleup/storefront-theme
```

### Important Contracts

- **Tenant isolation:** backend queries must be scoped by the authenticated shop or resolved storefront tenant. Frontend filtering is never an authorization boundary.
- **Store Builder parity:** preview and live storefront use `@scaleup/storefront-renderer`. Storefront presentation changes should normally be made in the shared package, not duplicated in either app.
- **Theme compatibility:** saved themes are normalized through `@scaleup/storefront-theme`. Existing fields must remain backward compatible when new theme controls are introduced.
- **Entitlements:** subscription capabilities are resolved through the central feature registry. Plan names or plan rank must not be used as the only authorization check.
- **Background work:** courier, campaign, scheduled sale, notification, support, and alert jobs are processed by the separate worker process.
- **Public privacy:** customer-facing serializers must use public-safe fields and must never expose product cost, buying price, supplier data, internal notes, credentials, or private tenant data.

## Prerequisites

- Node.js 20 or newer
- npm
- MongoDB for development
- Docker and Docker Compose for the local replica-set integration suite, or a disposable MongoDB Atlas test database
- Provider credentials only for integrations you intend to exercise locally

## Installation

Install each deployable application independently:

```bash
cd ecommerce-backend/backend
npm ci

cd ../../ecommerce-admin
npm ci

cd ../ecommerce-storefront
npm ci
```

The admin and storefront resolve the shared packages through local `file:` dependencies.

## Environment Configuration

Never commit `.env` files or real credentials.

### Backend

Start from the provided example:

```bash
cd ecommerce-backend/backend
cp .env.example .env
```

At minimum, configure the development database, port, CORS origins, and the security secrets required by the enabled flows. A typical local setup uses:

```dotenv
NODE_ENV=development
PORT=4000
MONGO_URI=<development-mongodb-uri>
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
ADMIN_APP_URL=http://localhost:5173
```

Authentication, CSRF, OTP, public order access, storefront proxy signing, mail, Cloudinary, courier, and AI credentials must be independent secrets. See [Production Checklist](docs/operations/production-checklist.md) for the authoritative production list.

### Admin

Create `ecommerce-admin/.env.local`:

```dotenv
VITE_API_URL=http://localhost:4000/api
VITE_API_DOMAIN=localhost:3000
```

Optional custom-domain DNS configuration uses `VITE_CUSTOM_DOMAIN_DNS_TARGET`.

### Storefront

Create `ecommerce-storefront/.env.local`:

```dotenv
API_URL=http://localhost:4000/api
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_PLATFORM_DOMAIN=localhost:3000
NEXT_PUBLIC_ADMIN_PANEL_URL=http://localhost:5173
STOREFRONT_PROXY_SECRET=<same-private-proxy-secret-as-backend>
```

`STOREFRONT_PROXY_SECRET` is server-only. Do not prefix it with `NEXT_PUBLIC_`.

## Running Locally

Run the processes in separate terminals.

### API

```bash
cd ecommerce-backend/backend
npm start
```

Health check: `http://localhost:4000/api/health` when `PORT=4000`.

### Worker

```bash
cd ecommerce-backend/backend
npm run worker
```

The API and worker are separate production services. Running only the API leaves queued background work unprocessed.

### Admin

```bash
cd ecommerce-admin
npm run dev
```

Admin: `http://localhost:5173`.

### Storefront

```bash
cd ecommerce-storefront
npm run dev
```

Platform page: `http://localhost:3000`.

Tenant storefront example: `http://your-shop-subdomain.localhost:3000`.

## Testing

### Standard verification

```bash
cd ecommerce-backend/backend
npm test

cd ../../ecommerce-admin
npm run lint
npm run build

cd ../ecommerce-storefront
npm run lint
npm run build

cd ..
git diff --check
```

### Mongo-backed launch gate

The integration suite deletes all data in its configured database. It refuses databases whose name does not contain `test`.

With Docker:

```bash
cd ecommerce-backend/backend
npm run test:launch:local
```

With a disposable Atlas database:

```bash
cd ecommerce-backend/backend
MONGO_URI_TEST="<disposable-test-database-uri>" npm run test:integration
```

Never use a development, staging, or production database for this suite. See [Testing](docs/testing.md) for details.

## Store Builder and Storefront Development

Store Builder edits shop theme data while the shared renderer provides the visual output.

```text
Admin editor state
    -> Store Builder API sanitization and normalization
    -> saved Shop theme and revisions
    -> shared theme resolver
    -> shared storefront renderer
    -> preview and live storefront
```

When modifying storefront presentation:

1. Preserve existing saved theme fields and normalization behavior.
2. Implement reusable rendering in `packages/storefront-renderer`.
3. Verify both Store Builder preview and the live Next.js storefront.
4. Test desktop, tablet, and phone preview modes.
5. Keep unknown or empty section types fail-closed instead of inventing customer-facing claims.
6. Use authoritative product, category, stock, review, pricing, and shipping data.

Relevant documentation:

- [Store Builder Architecture](docs/store-builder-architecture.md)
- [Prebuilt Storefront Themes](docs/prebuilt-storefront-themes.md)
- [Storefront Structural Variants](docs/storefront-structural-variants.md)
- [Homepage SEO Architecture](docs/homepage-seo-architecture.md)

## Core Platform Areas

- Multi-tenant products, categories, collections, variants, and inventory
- Storefront cart, checkout OTP, orders, returns, reviews, wishlist, and recommendations
- Vendor and staff RBAC
- Subscription plans, entitlements, quotas, trials, billing, and audit events
- Store Builder themes, prebuilt themes, revisions, preview, publishing, and media
- Scheduled products, promotions, sales, and launch banners
- Pathao and RedX courier integrations
- Customer campaigns and queued email delivery
- Public SEO metadata, canonical URLs, JSON-LD, robots, sitemaps, subdomains, and custom domains
- Super Admin operations, support center, announcements, plans, domains, and platform health

## Deployment

The repository contains three deployable applications and one required backend worker role:

| Service | Root directory | Command |
| --- | --- | --- |
| Backend API | `ecommerce-backend/backend` | `npm start` |
| Backend worker | `ecommerce-backend/backend` | `npm run worker` |
| Admin | `ecommerce-admin` | `npm run build` |
| Storefront | `ecommerce-storefront` | `npm run build && npm start` |

Read these before production deployment:

- [Railway Backend Deployment](docs/operations/railway-backend-deployment.md)
- [Production Checklist](docs/operations/production-checklist.md)
- [Monitoring](docs/operations/monitoring.md)
- [Backup and Restore](docs/operations/backup-restore.md)
- [Incident Runbook](docs/operations/incident-runbook.md)
- [Scheduler and Worker](docs/scheduler.md)

## Additional Documentation

- [Project Assessment](docs/reports/project-assessment-report.md)
- [Subscription Architecture](docs/subscription-architecture.md)
- [Subscription Plans](docs/subscription-plans.md)
- [Testing](docs/testing.md)

## Development Guidelines

- Preserve existing routes and response compatibility unless a migration is explicitly planned.
- Keep every backend resource lookup tenant-scoped.
- Enforce RBAC and entitlements on the backend even when UI controls are hidden.
- Reuse shared services, serializers, middleware, upload handling, and job infrastructure.
- Do not silently overwrite dirty Store Builder or product-editor state during background refreshes.
- Keep stock changes in the inventory movement path rather than silently changing stock in product edits.
- Add focused tests proportional to the behavioral and security impact of a change.
- Run the standard verification commands and `git diff --check` before considering work complete.

## License

Licensed under the [Apache License 2.0](LICENSE).
