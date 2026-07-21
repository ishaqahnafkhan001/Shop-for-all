# Scaleup Subscription Plans

## Source Of Truth

Canonical fallback definitions live in `ecommerce-backend/backend/config/subscriptionPlans.js`. The `VendorPlan` collection can hold audited Super Admin edits; `billingPlanService` merges a stored plan over its canonical fallback. Public pricing, vendor billing, feature gates, quota middleware, and reconciliation resolve through these backend services.

Run the idempotent plan synchronization after reviewing the target database:

```bash
cd ecommerce-backend/backend
node scripts/sync-subscription-plans.js --dry-run
npm run sync:plans
```

The script matches legacy plans by slug or case-insensitive canonical name, refuses ambiguous duplicates, and does not modify shop subscriptions. Back up the `vendorplans`, `subscriptions`, and `shops` collections before a production run. Rollback means restoring those collections or restoring the previous plan documents; shop-owned products, staff, themes, domains, schedules, and logs are never deleted by the plan sync.

## Plan Matrix

| Capability | Starter | Growth | Pro |
| --- | ---: | ---: | ---: |
| Monthly price | BDT 999 | BDT 1,999 | BDT 3,999 |
| Products | 100 | 500 | Unlimited |
| AI product generations/week | 10 | 50 | Unlimited |
| Images/product | 5 | 10 | 15 |
| VendorStaff accounts | 1 | 3 | 10 |
| Activity logs | 7 days | 30 days | 45 days |
| Growth Center | No | Yes | Yes |
| Store Builder | Limited | Full | Full |
| Custom domain | No | Yes | Yes |
| Customer management | No | Yes | Yes |
| Trust system | No | Yes | Yes |
| Notification Center | No | Yes | Yes |
| Scheduled sales | No | Yes | Yes |
| Scheduled product publishing | No | No | Yes |

Unlimited values are stored as `null`. Do not use `-1`, `Infinity`, or large placeholder numbers.

## Entitlement Precedence

Operational access is evaluated in this order:

1. Authenticated user and tenant ownership.
2. Role and staff permission.
3. Shop active and approved.
4. Subscription status is `trialing`, `active`, `past_due`, or `grace`.
5. Plan enables the feature.
6. The shop feature override is not explicitly `false`.
7. The plan quota has capacity.

An explicit shop override of `false` always denies access. An override of `true` cannot enable a feature disabled by the plan. Trials use Starter entitlements for 14 days. Billing, settings, verification, support, profile, and logout remain available when operational modules are blocked.

## Weekly AI Quota

AI usage is tenant-scoped and resets Sunday at 00:00 UTC. A reservation is acquired before provider work so concurrent requests cannot exceed the limit. Failed generations release the reservation; only usable successful responses increment `used`. Responses expose `used`, `limit`, `remaining`, `unlimited`, and `resetsAt`.

## Starter Store Builder

Starter can edit:

- Store name, navigation logo, separate browser icon, and basic brand identity.
- Basic header/navigation and typography settings.
- Standard hero content and images.
- Quick brand color and curated palette controls.
- The existing Featured Products section.
- Basic footer information, required All Products content, SEO, checkout copy, policies, and normal storefront content.

Starter cannot newly edit or render:

- Additional advanced homepage section types.
- Dynamic section ordering.
- Advanced layout variants, product grid styles, or mobile layout controls.
- Section-by-section and advanced legacy color controls.
- Scheduled banners, premium layouts, or other advanced design capabilities.
- Custom domains.

Restricted saved theme values are preserved. The public Starter theme filters advanced homepage sections, and an upgrade restores access to the saved data.

## Upgrade And Downgrade

- Products, staff, and images above the new limit remain stored and viewable. New products/staff/reactivations/images are blocked until usage is compliant or the plan is upgraded.
- Custom-domain configuration is preserved and marked plan-inactive on Starter. The Scaleup subdomain remains active.
- Pending scheduled products are marked plan-blocked and never auto-publish after loss of Pro. Upgrading does not publish an overdue item without vendor review.
- Pending scheduled sales are plan-blocked on Starter; active sales end and storefront caches are invalidated. Historical order price snapshots are unchanged.
- Trust review history remains stored, while a plan-inactive badge is not rendered publicly.
- Advanced Store Builder data is preserved but unavailable for new Starter edits and filtered from the public theme.
- Activity logs are removed asynchronously in tenant-safe worker batches after the applicable retention cutoff. Platform audit logs are separate and unaffected.
- Growth/customer/notification history is preserved while module access is locked.

Plan reconciliation runs after plan changes, records a platform audit event through the existing Super Admin flow, invalidates storefront caches, and sends the vendor a critical plan-change notification. Weekly usage is not reset by an upgrade.

## Notification Policy

The plan-gated Notification Center covers optional vendor in-app operational notifications. Password reset, account security, identity verification, billing/subscription notices, critical platform alerts, customer order-status email, and legally required communications remain independent of this feature.

## API Errors

- `FEATURE_NOT_AVAILABLE`: plan or explicit shop override denies a module.
- `PLAN_LIMIT_REACHED`: product, staff, image, or weekly AI capacity is exhausted.
- `SUBSCRIPTION_INACTIVE`: subscription status does not permit operational work.
- `SHOP_SUSPENDED`: shop is inactive, unapproved, or suspended.
- `STORE_BUILDER_CAPABILITY_REQUIRED`: Starter attempted an advanced builder update.

Frontend locks are explanatory UX only. Backend middleware and tenant-scoped services are authoritative.

## Verification

```bash
cd ecommerce-backend/backend && npm test
cd ecommerce-backend/backend && npm run test:launch:local
cd ecommerce-admin && npm run lint && npm run build
cd ecommerce-storefront && npm run lint && npm run build
git diff --check
```

Use `npm run test:integration` with a disposable `MONGO_URI_TEST` when Docker is unavailable. Never run integration tests against production data.
