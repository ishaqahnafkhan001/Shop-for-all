# Phase 7 — Controlled release preparation

**Verdict: BLOCKED.** Default-off release infrastructure and runbooks are prepared. Phase 6 still has mandatory acceptance gaps, operational drills are not verified in the target deployment, and no named real merchant pilot has been approved or activated.

## Implemented and verified locally

- Server-authoritative OFF / explicit `pilot` allowlist / approved `all` policy. Missing or invalid config fails closed. Writes and public rendering have independent switches.
- Existing full, active, operational Builder entitlement plus fresh tenant actor/staff permission and operator scope control v5 writes. Plan downgrade/expiry preserves storage; re-enablement does not convert data. Public rendering requires its separate current server entitlement/policy check.
- No automatic migration/adoption from any of the ten presets, including Atelier. v4 remains unchanged; old clients cannot erase a v5 graph. Default rollout is OFF in the checked configuration; enabled fixture policies exist only in explicitly isolated synthetic processes.
- Published-only, privacy-reduced public projection, batched source serialization, revision-consistent media resolution and server-owned commerce presentation.
- Existing cache invalidation augmented with policy/entitlement context in keys; no second cache service. Env-based policy changes require consistent restarts across instances. Already-open pages require refresh; revision polling alone does not detect an operator policy change.
- Existing logger/audit infrastructure reused for bounded failure codes, tenant/revision and request correlation. No full graph/customer/secrets are added to new logs. Browser fallback diagnostics are console-only, not installed remote telemetry.
- Disposable lifecycle integration verifies unique indexes, old-client/CAS/permission guards, default deny, pilot, publication, actual SSR/CSS parity, independent write/render kill switches, downgrade/re-enablement and retained-media revision recovery.

## Release documents

1. [RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md): exact environment variables, entitlement boundary, reader-first ordering, backups/indexes, multi-instance/cache/worker coordination, monitoring ownership and pilot checklist.
2. [ROLLBACK.md](ROLLBACK.md): stop expansion, write kill, render kill, supported revision recovery and compatible software rollback; preserve v5 content/references and recoverable media.
3. [MERCHANT_GUIDE.md](MERCHANT_GUIDE.md): implemented modes, pages, selection, bounded controls, responsive inheritance, copies/presets, undo/recovery and protected commerce limits.
4. [Phase 6 browser instructions](../phase6/BROWSER_ACCEPTANCE.md): working local preview, isolated fixture startup, real 200% zoom handoff and remaining checks.

## Production checklist — not executed

- [ ] Phase 6 actual zoom/accessibility/performance acceptance approved.
- [ ] Relevant failure register triaged; broader backend/Admin checks resolved or formally accepted by the release owner.
- [ ] Commercial eligibility, limited/full access and downgrade presentation approved by product. Existing technical `full` guard is not a new pricing decision.
- [ ] Explicit conversion/mapping and recovery path approved for each initial merchant; current work does not automatically convert legacy sections to adaptive templates.
- [ ] Target Mongo replica set, required unique indexes and retained revisions/assets verified read-only before authorized schema/index work.
- [ ] Consistent backup and restore to a separate environment proven, including external media availability.
- [ ] Compatible readers/write fences deployed to every API instance and relevant worker before any writer; old writers drained.
- [ ] Frontend/backend asset compatibility, gate fingerprint, cache invalidation and entitlement behavior verified across the target topology.
- [ ] Monitoring owner and sink, failure/latency dashboards, staging-derived thresholds and alert delivery exercise accepted. Browser fallback collection/Web Vitals are not configured by this task.
- [ ] Operator write/render kills and supported revision restoration rehearsed on target-like infrastructure; safe compatible software rollback artifact retained.
- [ ] Named pilot tenants, approving owner, observation period and stop criteria separately authorized.
- [ ] Broader rollout requires a later review and explicit approval; no general activation by default.

## Remaining risks and decisions

The most material unverified risks are accessibility at actual 200% zoom, complete keyboard/screen-reader behavior, realistic browser performance, production backup/media restore, multiple API/cache instances and operational alert/rollback execution. The local tests establish specific boundaries; they do not prove the target deployment's configuration or provider recovery.

No deployment, production migration, pilot/public activation, real notification/order, dependency installation, commit or push occurred. The exact next step is Phase 6 manual zoom and remaining acceptance evidence, then release-owner review using this checklist. **Not ready for a real authorized pilot yet.**
