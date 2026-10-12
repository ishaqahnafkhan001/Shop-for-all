# Phase 12 — Persistence, cache, autosave, revision and tenant safety

Date: 2026-10-10, Asia/Dhaka.

Status: implementation and isolated automated verification finished. Browser and
live infrastructure acceptance remain open. No database writes, migration, deployment
or commit were performed by this task.

## Findings and repairs

| Classification / severity | Finding | Repair |
| --- | --- | --- |
| BUG / High | Autosave debounce canceled only timers, not in-flight requests. Manual save was a separate request path. Older writes could finish last. | One serial write queue owns automatic/manual saves and carries each returned draft version into the next request. |
| BUG / High | Draft requests could finish after publish/discard; post-publish client DELETE could erase another session's newer draft. | Publish/restore pauses and drains this queue; queued autosaves are canceled. Success clears only local recovery. Explicit discard waits for writes and conditionally deletes its version. |
| BUG / High | Whole-theme draft upserts and SEO draft changes had no write conflict check. | New Builder writes/discards compare existing updatedAt. Existing-token updates never upsert. SEO updates/discards compare the snapshot version they read. Conflicts return 409. |
| BUG / High | A delayed write after active-shop switching could target the newly authenticated shop. | New Builder save/discard/publish/restore requests carry expectedShopId; controllers compare it with authenticated req.tenantId before mutation. Queue disposal cancels work that has not started. |
| BUG / High | Public caches could retain an older theme on a worker that missed deletion; a delayed old read could refill an invalidated key. | Public cache keys include a fresh database theme revision/update time and plan inputs. Old snapshots can only populate old keys. |
| BUG / High | Redis fallback and an additional tenant Map could retain stale routing/ownership data independently of shared invalidation. | Configured Redis failures produce misses/no cache writes. Tenant routing no longer reads either cache and resolves the current mapping from the database. |
| BUG / Medium | Cache cleanup failure could report publish/restore failure after the database commit. | Return the committed result with CACHE_INVALIDATION_PENDING when cleanup throws. Restore uses the existing bounded retry helper. |
| MISSING FEATURE / Medium | Open storefronts did not learn about newly published revisions. | Tenant-scoped public revision endpoint and visible-tab checks request a fresh server render. |
| BUG / Medium | Older bootstrap/focus responses could replace newer Builder state. | Bootstrap request sequence and effect-lifetime guards reject late results. |
| UX PROBLEM / Medium | Storage failures could prevent autosave or accompany a false promise of local recovery. | Storage is optional; server saving continues. Failure status distinguishes unavailable local recovery, and messages advise keeping the page open. |

## Changed implementation areas

### Admin

- `ecommerce-admin/src/pages/dashboard/StoreBuilder/hooks/draftWriteQueue.js`: serial
  writes, version propagation, generation cancellation, pause/drain and conditional clear.
- `hooks/useAutosaveRecovery.js`: queue integration, shop-bound request assertions,
  optional local storage, late-result ownership checks and accurate save status.
- `hooks/useStoreBuilderBootstrap.js`: latest-request ownership and unmount guards.
- `StoreBuilderPage.jsx`: manual save uses the queue; publish/restore drains it;
  cleanup preserves server drafts; conflict reload can proceed without deleting another
  version; background focus results have an effect-lifetime guard.
- `StoreBuilderHeader.jsx` / `shell/StoreBuilderShell.jsx`: conflict/error status and
  temporary editing lock during publication. Keyboard history shortcuts are also blocked.

### Backend

- `services/storeBuilder/draftConcurrency.js`: tenant assertion, version filter and
  consistent DRAFT_CONFLICT error. Filters always retain authenticated shop_id.
- `services/storeBuilder/storeBuilderService.js`: draft conditional writes, monotonic
  timestamp advancement, published-revision checks before/after token-aware writes,
  and guarded cleanup if publication raced the write.
- `services/storeBuilder/storeBuilderSeoService.js`: conditional shared-draft saves,
  deletes and SEO-only resets so they cannot silently overwrite a concurrently changed
  whole draft between the read and write.
- `controllers/storeBuilderController.js`: token forwarding, conditional discard,
  active-shop checks, versioned public settings keys, and nonfatal post-commit cleanup.
- `controllers/storeController.js`: bootstrap reads the shop before selecting a cache
  entry; new getStorefrontThemeRevision returns only shopId/themeRevision with no-store.
- `routes/storefrontRoutes.js`: revision route uses existing resolveTenant middleware.
- `middlewares/tenant.js`: current database ownership/availability drives authorization.
  Legacy invalidation/reset interfaces remain for callers and tests.
- `services/cacheService.js`: configured Redis outage/initialization failure produces
  a miss rather than a worker fallback; deletes also clear any local entries.

### Storefront

- `components/storefront/StorefrontRevisionWatcher.jsx`: check on mount/navigation,
  focus/visibility return and every 30 seconds while visible. Requests time out after
  eight seconds and are aborted on effect cleanup.
- `lib/storefrontRevisionCheck.js`: serialize checks; ignore failures, other tenant IDs,
  non-newer revisions and results after disposal; request router.refresh for newer versions.
- `app/[subdomain]/layout.jsx`: mount watcher with the server snapshot identity/revision.
  The provider still accepts only server settings; no client theme mutation was added.
- `app/[subdomain]/page.jsx` / `lib/storefrontServer.js`: compare homepage bootstrap
  revision with server settings, retry once, and show a reload state if the retry still
  differs. Mismatched section/product inputs are not silently presented as the new theme.

## Consistency and compatibility

The published revision CAS, existing revision history and restore-as-new-revision model
remain authoritative. No theme schema/preset version, stored color or migration changed.
The draft token uses the existing timestamp and unique shop_id index. Null means the
client saw no draft; a timestamp means update only that existing version. Duplicate-key
creation races and absent/conflicting versions become 409 responses. New saves based
on an older published revision are rejected; local editor content remains available.

Older API clients that omit draft tokens remain supported. Their historical last-writer
behavior remains a compatibility limitation. The updated Builder must be deployed to
obtain its queue/token guarantees. SEO's server read/write comparison protects concurrent
replacement, but cannot infer the intended order of legacy requests that arrive serially.

Every cache lookup still includes tenant identity. Public theme caches now read current
shop/plan inputs first. Old entries may live until TTL expiry, but an updated revision
selects a different key even without cross-worker deletion. Product/promotion data retains
its existing TTL/invalidation behavior; this is not a global commerce cache redesign.

## Evidence

- **188 focused tests passed**, zero failures: `phase12-tests.txt`.
- **Admin build passed**: `phase12-admin-build.txt`.
- **Storefront build passed**: `phase12-storefront-build.txt`.
- **Diff check passed**: `phase12-diff-check.txt`.
- New suite: `ecommerce-backend/backend/tests/storefront-state-delivery.test.js`,
  13 tests for queue ordering/barriers/disposal, failed saves, revision checking,
  draft CAS, discard/publication races, tenant-domain reassignment, Redis outage,
  shared SEO draft conflicts, revision endpoint and restore cleanup failures.
- Extended effective-theme tests leave stale cache entries in place, advance one
  tenant's database revision and verify both public theme paths select the new revision
  while the other tenant remains unchanged.
- Prior first-render, nine-theme, publication/schema and presentation tests still pass.
  The first-render suite also verifies rejection of bootstrap data with the wrong revision.

These tests execute real helper, service, controller and middleware code with controlled
I/O doubles. They do not run a MongoDB server, multiple Redis-backed worker processes,
React browser event handling, or authenticated publication. The first new revision-handler
test required adding its existing Joi dependency to the harness; final runs pass.

## Tradeoffs and remaining release gates

1. Tenant resolution now performs a database lookup per request, including polling.
   Public cache hits also read current shop/plan inputs. Measure backend load/latency
   with representative traffic before broad rollout.
2. Visible storefront tabs detect changes on checks, not instant push delivery. Hidden
   tabs defer checks until visible. Transient errors preserve the current presentation.
   A different returned shop ID is ignored; a full navigation/reload resolves any changed
   domain ownership. The revision watcher does not detect plan-only changes without a
   published revision increment.
3. Homepage settings and product/section bootstrap remain separate backend reads.
   A revision mismatch triggers one retry and then an explicit reload state if still
   mismatched. This prevents mixed theme/section inputs, but is not an atomic database
   snapshot. Continuous publication can keep the page in that retry state; verify recovery.
4. Live Mongo CAS/index behavior, transactional/standalone publication races, multiple
   tabs, authenticated tenant switching, Redis outage/recovery and multiple workers must
   be exercised in an authorized integration environment before release acceptance.
5. Browser tests must verify publish/restore while autosave is pending, conflict recovery,
   checkout/cart state preservation during server refresh, navigation, hidden tabs and
   hydration. No browser run or workaround of the earlier browser-policy block occurred.
6. Earlier contrast, commerce zero-price and visual-parity findings remain open.

## Rollout and rollback

Deploy backend support before the updated Admin and storefront. Legacy clients remain
accepted; refresh Builder sessions to enable new token-aware writes. Verify the existing
unique draft shop_id index and test representative published stores first. Observe query
load and draft conflicts. No data migration or schema rollback is needed.

Rollback this phase as a coherent application change if acceptance fails. Keep the
Phase 11 server-owned provider and prior phase repairs. Disabling the watcher alone stops
automatic refresh detection but leaves current server rendering available. Reverting
the concurrency/cache repairs reintroduces the documented old race/staleness risks.

Next planned phase: Phase 13 controlled Gallery/Builder/live parity verification.
