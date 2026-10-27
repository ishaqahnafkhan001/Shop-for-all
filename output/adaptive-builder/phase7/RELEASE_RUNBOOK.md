# Adaptive Builder release runbook

Status: preparation only. No deployment or real-merchant activation is authorized by this document.

## Operator configuration

`ecommerce-backend/backend/services/storeBuilder/adaptiveRolloutPolicy.js` owns the process policy. Request bodies, query strings, client storage and Atelier selection cannot grant access.

| Variable | Default / accepted values | Purpose |
|---|---|---|
| `ADAPTIVE_BUILDER_ROLLOUT` | `off`; `pilot` or `all` | Operator-approved scope. The older value `on` fails closed. |
| `ADAPTIVE_BUILDER_APPROVAL` | unset | Nonsecret approval/change reference, 8–80 safe characters. Presence records operator approval; it does not authenticate a user. |
| `ADAPTIVE_BUILDER_SHOP_IDS` | unset | Comma-separated ObjectIds for `pilot`; maximum 100 entries, strictly validated. Never populate from merchant input. |
| `ADAPTIVE_BUILDER_WRITES` | unset/off; explicit `on` | Permit approved v5 writes. |
| `ADAPTIVE_BUILDER_RENDERING` | unset/off; explicit `on` | Permit approved published adaptive rendering. |

An incomplete or invalid configuration grants neither writing nor rendering. Pilot requires a nonempty valid allowlist. `all` still requires approval, explicit write/render switches, and each shop's existing effective entitlements. Default configuration was checked OFF; the isolated synthetic preview processes are the only enabled exceptions in this task. No `.env` was edited.

Run `node scripts/check-adaptive-release-config.js` from `ecommerce-backend/backend`. It reads configuration without connecting to MongoDB or printing approval values, tenant IDs or secrets. It cannot prove deployment authorization, backup readiness or cross-instance consistency.

## Existing entitlement boundaries

| State | Editing / publishing | Presentation / data |
|---|---|---|
| No Builder access | Denied by existing feature/permission gates | Existing plan-filtered legacy presentation; retain v5 storage. |
| Limited Builder | No adaptive writes | Existing limited legacy presentation; retain v5 storage. |
| Full, active, operational, Builder feature enabled | Additionally requires approved operator scope and writes ON | Additionally requires rendering ON for adaptive output. |
| Suspended/expired/inactive shop | No adaptive access | Existing platform operational/storefront access rules remain authoritative. |
| Staff | Existing route permission plus fresh active user/membership/staff permission check for v5 mutation | No staff-controlled entitlement override. |
| Existing v5 while writes OFF | Read-only; old-client fences remain | Rendering can remain ON independently. |
| Re-enablement | Rechecks current permissions and plan | Original v5 graph remains available; no automatic conversion. |

Full access is the existing technical guard, not a newly approved commercial package. Product must approve commercial eligibility and downgrade presentation before any real pilot. Independently authorized, strictly scoped homepage SEO updates continue to preserve the entire graph under the existing policy.

## Reader-first deployment sequence — NOT EXECUTED

1. Name the release owner, approving product owner, test tenants and maintenance/incident contacts. Close Phase 6 acceptance gaps first.
2. Establish a consistent backup of Shop, drafts, revisions and asset metadata plus underlying media retention. Prove restore in a separate environment. An exported URI or an untested backup is insufficient.
3. Verify MongoDB replica-set/transaction support and required actual indexes. This task verified disposable Mongo only: unique draft shop, unique `(shop_id, revision)`, unique asset `publicId`. Do not run destructive test harnesses against production.
4. Deploy compatible v5 readers, model write fences, media retention and concurrency support to **all** API instances before any v5 writer. Keep all adaptive switches OFF. Keep compatible worker/media-cleanup readers deployed too.
5. Verify v4 requests are unchanged, unsupported versions fail closed, and older clients cannot erase v5 published data, drafts or revisions. Do not operate mixed old/new writers.
6. Deploy the shared renderer, guarded storefront routes and editor. Verify build assets are served together and normal Admin login works. Keep adoption OFF; there is no automatic v4 conversion or automatic Atelier adoption.
7. Compare the sanitized policy fingerprint and effective feature configuration on every API instance. Settings/bootstrap cache keys include the policy fingerprint and plan/operational context; publish/restore invalidates their existing tenant prefixes. Drain old instances before changing policy. Client-only flags are insufficient.
8. Validate on synthetic staging stores: draft CAS, transaction failure, actual browser navigation, publish, exact compiler parity, restore, media retention, permission revocation, downgrade and both kill switches.
9. Connect the existing logs/audits to the operator's monitoring, demonstrate alert delivery and recovery, and approve thresholds against representative staging/pilot distributions. No production alert service was configured here.
10. Obtain a **separate explicit approval** for named merchant tenants, commercial eligibility, conversion/mapping behavior, backup/restore readiness and the rollout owner. Only then configure `pilot` and its exact tenant IDs. Enable render before admitting approved writes; do not expose an unreviewed adoption/conversion workflow.
11. Require a measured observation period and review of errors, latency, media recovery, accessibility and conversion before changing to approved `all`. No wider activation is performed by these instructions.

## Operational visibility

Reuse existing `http_request` events (request ID, route, tenant, status, latency), revision/audit records and cache-recovery warnings. New sanitized events:

- `store_builder_operation_failed`: operation, tenant ID, correlation ID, bounded error code and status for publish/draft/discard/restore/public settings failures.
- `store_builder_adaptive_public_fallback`: public projection/media failure; tenant, revision and finite diagnostic code only.
- `store_builder_adaptive_renderer_fallback`: browser diagnostic with page family, revision and bounded validation codes. This is a console diagnostic, **not** an installed remote error collector.

CI owns exact preview/live compiler comparisons; no runtime parity-monitoring service was invented. Inspect validation/conflict rates, public fallbacks, media failures, cache warnings, rollback outcomes and payload/bundle sizes. A frontend error sink, actual Web Vitals collection and production dashboards remain operational acceptance work.

No passwords, cookies, OTPs, tokens, customer details, media URLs or full graphs are added to these diagnostics. Audit permissions/retention must remain tenant-aware. Do not paste complete request bodies into incident tickets.

Establish alert thresholds from approved staging/pilot request counts and p50/p95 latency/error distributions. The local Node/SSR figures in Phase 6 do not justify production SLOs. New invariant violations (cross-tenant access, missing required cores, lost revisions/media) require immediate investigation regardless of statistical thresholds.

## Pilot checklist

- [ ] Phase 6 accepted, including actual 200% zoom and remaining accessibility/performance evidence.
- [ ] Synthetic desktop/mobile journeys and protected commerce states pass.
- [ ] Named merchant scope and commercial policy separately approved.
- [ ] No conversion by preset/theme identity; explicit reviewed candidate and recovery revision.
- [ ] Draft/save/conflict/publish/restore/retention checks pass on the target topology.
- [ ] Old writers removed; cache and policy consistent across instances.
- [ ] Monitoring owner, alert exercise, backup restore and kill-switch drill accepted.
- [ ] Customer-facing review completed before each authorized publication.

## Local evidence environments

The ordinary Admin preview at `http://127.0.0.1:5185/dashboard/adaptive-builder-preview` uses existing authentication and a server-issued synthetic development grant. Login fixture: `vendor-a@launch.example.com` / `LaunchPass@123`. It has browser-local drafts and cannot publish/upload/place real orders. These are disposable fixture credentials, not production credentials.

The published browser fixture at `http://launchshopa.localhost:3018/` runs a real production storefront build against a separate loopback test API and hardcoded disposable DB. Its only approved shop is generated synthetic Shop A. All notification transports are mocked; no worker starts. Do not point these harnesses at a shared database.

See Phase 6 `BROWSER_ACCEPTANCE.md` for restart commands and acceptance evidence. Keep the task-owned tmpfs Mongo service available until manual review is complete. Stop owned fixture listeners before restarting or rebuilding the storefront; do not stop the user's unrelated port-3000 dev server.
