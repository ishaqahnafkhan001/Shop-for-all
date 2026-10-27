# Adaptive Builder rollback and recovery

Preparation only. Production actions require explicit operator authorization. The isolated lifecycle test exercised write kill, render kill, compatible revision restoration and media retention.

| Action | Mechanism | What it does / does not do |
|---|---|---|
| Stop expansion | Freeze the pilot allowlist; do not approve more tenants | Retains already approved tenant behavior. No DB rollback. |
| Stop adaptive writes | `ADAPTIVE_BUILDER_WRITES=off` consistently on all API instances | Blocks new adaptive edits/publications/discards, retaining graph/drafts/revisions/media. Existing scoped SEO rules remain independent. Rendering can continue. |
| Disable adaptive rendering | `ADAPTIVE_BUILDER_RENDERING=off` (or rollout OFF) on every instance | New public resolutions use the retained legacy backing presentation and existing plan rules. Published v5 data is **not** rewritten to v4. Policy cache fingerprint changes. |
| Restore a design | Existing authorized revision-restore endpoint with an explicit current revision token | Transactionally publishes a compatible retained snapshot as a new revision and promotes retained assets. Requires writes/access authorization. It is not accomplished by a frontend flag. |
| Revert software | Roll back only to a v5-compatible reader/writer release | Disable writers first. Never send v5 documents to old software that cannot preserve them. Restore DB backups only under a separately reviewed disaster-recovery operation. |

Environment switches take effect when each process receives updated configuration/restarts. Already-open pages can retain their rendered snapshot until refresh/navigation; the existing revision watcher observes publication revisions, not environment-policy changes. Do not describe these switches as instantaneous global client revocation. Request a customer-page refresh and verify fresh public requests after an incident change. Permission/access checks still run on every write.

## Restore procedure

1. Stop conflicting writers and capture current revision, target revision and tenant scope. Retain the exact graph and asset references for audit/recovery.
2. Review target schema, required commerce cores and referenced asset ownership/availability. Never construct a partial v4 theme to bypass v5 fences.
3. If restoring v4 appearance for a v5 shop, use a reviewed **v5-compatible recovery snapshot with legacy backing values and no adaptive assignments**, retaining previous v5 revisions. The test used this approach; an old v4 revision is not automatically permitted to erase v5 data.
4. Temporarily authorize only the required tenant/write operation through normal policy. Call the existing tenant-scoped restore route with `expectedRevision`. A conflict requires reload/review, not a forced retry.
5. Confirm the new revision, public fallback/assignments, tenant caches, required commerce controls and retained media. Then restore the intended operator write/render policy.
6. Keep prior revisions/media until normal, verified retention permits cleanup. Do not manually delete Cloudinary assets or clear adaptive fields.

If a transaction aborts, do not assume publication succeeded. If commit succeeded but cache invalidation reports pending, preserve the success/revision and repair/invalidate the tenant cache; do not blindly republish.

## Tested / untested

Verified in disposable Mongo: 62-case integration suite plus real HTTP/Next lifecycle, unique indexes, CAS, transaction rollback, old-client races, permission checks, retained media, restore, policy cache separation and downgrade/re-enable behavior. Production backup restore, real distributed cache configuration, process coordination and actual media-provider disaster recovery remain untested. No production rollback was performed.
