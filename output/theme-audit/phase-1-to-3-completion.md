# Theme system: completion through Phase 3

Date: 2026-10-07

## Completed scope

| Phase | Result |
| --- | --- |
| 1 — Canonical contract | Existing flat theme format retained. New-shop presentation defaults agree with the shared contract. Raw patch semantics distinguish omission, explicit values, nullable clears and array replacement. Saved snapshots retain their explicit values. |
| 2 — Compatibility/versioning | Existing version 4 retained. Unsupported current/incoming versions are blocked on writes. Safe unknown fields survive through optional compatibility archives. Legacy reads remain non-destructive. |
| 3 — Shared effective resolution | Public and preview paths share plan filtering, branding, policy defaults and normalized responsive configuration. Tenant resource loading remains on the server. |

## Resolution architecture

The shared contract lives in `packages/storefront-theme`. `effective.cjs` composes
the existing normalization rules and the extracted plan/branding functions.
`policies.cjs` contains the existing backend policy templates; Admin and storefront
policy helpers delegate to it.

```text
Tenant-scoped shop / Builder snapshot
  + server-resolved legacy sections and branding resources
  -> defaults + saved values + optional raw patch
  -> compatibility normalization
  -> plan restrictions
  -> branding overlay
  -> policy fallback
  -> effective theme containing all responsive values
  -> shared renderer
```

| Consumer | Resolution boundary |
| --- | --- |
| Public settings, shop info, storefront bootstrap, legacy catalog | `effectiveThemeService.applyEffectiveStoreTheme` |
| Builder and expanded Gallery preview | `resolveEffectiveTheme` with plan, branding and shop-name context |
| Gallery thumbnail data | Same shared effective resolver |
| Storefront provider and page clients | `src/lib/theme.js` facade delegates to the resolver |
| Shared Header, Home and Footer | Shared effective resolver at the component boundary |

Builder state remains an editable snapshot. Restricted preview output is never
saved over premium configuration after a plan downgrade. Preset selection continues
to use the existing prebuilt-theme command; the public renderer does not import the
preset registry or overwrite merchant edits from a preset ID.

## Compatibility decisions

- New shops inherit corrected defaults; sparse hydrated legacy records retain their
  historical defaults. Explicit empty text and false values remain explicit.
- Historical fully normalized themes cannot reveal which defaults a merchant
  intentionally chose. Their saved values are treated as explicit; no inference is
  made by comparing them with today's defaults.
- Safe unknown fields are archived before strict schema serialization. Archives
  follow normal sanitizer limits and are excluded from public effective output.
  Schema inspection reads declared paths without caching request-controlled paths.
- Future schema versions remain identifiable during read-only inspection. Writes
  reject either a newer stored theme or newer incoming theme before external work.
- No database migration, production write or deployment was performed.

## Verification

- **119 focused tests passed**, with no failures or skipped tests.
- **Admin Vite production build passed.**
- **Storefront Next production build passed.**
- All nine preset configurations retain presentation across schema round trips.
- Actual public settings, shop-info and bootstrap handlers return equal theme data
  for two tenant fixtures, including cached settings responses; external I/O is mocked.
- Actual branding loading scopes asset and CTA queries to the current shop, rejecting
  the other fixture tenant's resources.
- Actual Builder preview code passes the expected effective data to its three
  renderer boundaries across **108 combinations**: nine presets × three plan levels
  × four device modes. These are 324 captured renderer-input comparisons.
- Compatibility tests cover missing/older versions, newer-version rejection,
  read-only behavior, safe unknown fields, null/false/zero/empty values, SEO partial
  patches, and normalized limited-plan no-op saves.

Logs: `phase3-tests.txt`, `phase3-tests-new.txt`, `phase3-admin-build.txt`, and
`phase3-storefront-build.txt` in this directory. The package README contains the
contract and rollout details; root `track.md` records the handoff.

## Remaining boundary

This completes Phase 1–3 implementation and configuration verification. It does not
certify browser visual parity, viewport CSS, first-render provider behavior, live
MongoDB publish/restore transactions, or deployment. Those remain the later phases
and their integration gates. No isolated integration database was supplied.

Deploy the shared package and all consuming applications together, retaining existing
revision snapshots. Existing public caches have a 60-second TTL and should expire or
be invalidated during rollout. Older backend writers do not preserve the new archive
metadata. Phase 4 has not started.
