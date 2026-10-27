# Storefront theme contract

This package owns theme defaults, normalization, patch semantics, policy fallbacks,
and effective theme resolution. CJS and ESM entry points expose the same functions.
The existing persisted format is a flat `Shop.theme` document with `version: 4`.

## Canonical input and inheritance

`createThemeInput(storedTheme, { defaults, overrides })` represents the input layers.
`resolveEffectiveTheme(storedTheme, context)` returns the effective presentation.

- `defaults` is an optional selected-default snapshot. It is merged before saved
  fields. When omitted, existing normalizers supply `FALLBACK_THEME` and style-specific
  defaults. Do not merge the fully materialized fallback into sparse groups first:
  doing so defeats, for example, Minimal card style inheritance.
- `storedTheme` contains saved overrides. Missing/undefined fields inherit. Every
  concrete saved value is explicit, even when equal to a default. Legacy normalized
  snapshots are therefore explicit snapshots; historical edit intent is not guessed.
- `overrides` is an optional partial edit. `mergeThemePatch` recursively merges
  objects and replaces arrays wholesale. Merge before sanitization/normalization;
  some existing SEO sanitizers materialize sibling defaults.
- False, zero, empty strings and empty arrays are explicit values. Null inherits
  except for the contract's nullable preset/SEO fields, where it clears. Navigation
  retains its required Policies link; empty policy text receives the existing policy
  fallback. Those are explicit product rules after the generic merge.
- `productCard.inheritedStyleFields` is the existing additive marker for three
  style-derived fields. Choosing a card style/reset establishes inheritance;
  individually editing a field makes it explicit. Other missing fields inherit by
  presence, without a second stored override tree.

Preset selection remains an explicit edit command in `./prebuilt`. It writes a
resolved snapshot with preset identity/version metadata. Runtime resolution never
looks up a preset ID and reapplies a newer registry entry over merchant changes.
Saving the Builder's complete snapshot freezes materialized values as explicit;
it does not promise ongoing inheritance from future preset releases.

## Effective resolution

```text
Tenant-scoped shop + legacy banner/branding loaders (server)
  -> existing compatibility normalization
  -> selected defaults + saved fields + optional edit patch
  -> plan restrictions
  -> resolved branding
  -> shared missing-policy defaults
  -> normalized desktop/tablet/mobile configuration
  -> shared rendering
```

The implementation merges raw layers before normalization to avoid materializing
defaults into partial patches. Existing normalization contains legacy aliases and
section/hero adapters; it is not duplicated in each application.

`context` accepts `defaults`, `overrides`, `planAccess`, `branding`, and `shopName`.
It contains resolved JSON data, not database handles, requests, global tenant state,
browser globals, clock reads, or network calls. The server adapter
`services/storeBuilder/effectiveThemeService.js` loads tenant-owned resources and
calls this pure resolver. Missing plan context means a consumer is normalizing an
already effective theme or a standalone editor snapshot; it does not downgrade it.

Admin previews receive resolved branding and plan context from authenticated
bootstrap. Editable state remains unrestricted so saving a preview cannot erase
premium configuration after a plan downgrade. Gallery thumbnails and expanded
previews use the same effective resolver. Public settings, bootstrap, shop info,
and the legacy catalog response use the same server adapter. Storefront providers,
routes, and shared renderer boundaries consume that effective result.

Responsive configuration keeps existing storage paths: `mobile`, responsive catalog
columns, section desktop/mobile settings, and hero image/focal-point pairs. The
resolver returns all viewports together. CSS/components select the active viewport;
it never reads `window` or changes the theme based on a preview container's width.
Viewport rendering correctness is a later phase, separate from configuration parity.

## Compatibility and versioning

- Version 4 already existed; no redundant version system or database backfill is
  introduced. Missing versions use legacy compatibility. Reads preserve a higher
  version number; draft/publish normalization rejects unsupported current or
  incoming versions before external work with `UNSUPPORTED_THEME_VERSION` (409).
- New-document presentation defaults normalize identically to the contract.
  Hydrated sparse legacy records intentionally retain historical wishlist, catalog
  copy and initial-section defaults. Explicit existing values are untouched.
- Safe unknown root fields are retained under `extensions.unknown`. The server
  archives fields that strict Mongoose paths would discard as
  `extensions.schemaFields` entries (`path` array and `value`). Existing Mixed
  fields retain their supported data. Earlier archives survive older-client edits.
- Archives remain subject to the normal sanitizer's JSON, depth, collection-size,
  text and URL limits. They are compatibility data, not executable extensions or a
  byte-for-byte backup of rejected input. Prototype/Mongo operator keys are removed.
  Restoring archived fields requires an explicit future migration; archives are
  excluded from effective public output.
- Legacy banner loading uses `persist: false`. Compatibility reads do not rewrite
  stored records. Existing publication/revision infrastructure remains responsible
  for writes and rollback.

## Verification and rollout boundary

The focused backend suite covers canonical merges, legacy versions, strict schema
round trips, future-version write rejection, policy parity, actual public handlers
with mocked I/O, tenant-scoped branding queries, and actual Builder preview inputs
for nine presets × three plan levels × four device modes.

These are configuration and server-render checks. They do not prove browser CSS,
hydration timing, MongoDB publication transactions, or deployed visual parity.
Ship the shared package, backend, Admin and storefront together. Retain revision
snapshots and let existing 60-second public caches expire or invalidate them during
rollout. Older backend writers do not understand the new archive metadata; mixed
application-version writes are not a supported rollout mode.

## Phase 4: composition registry

`HOMEPAGE_COMPOSITIONS` in `composition.cjs` defines supported composition IDs and
section roles. `layout.homepageComposition` persists the selection; its allowlist
also drives normalization, validation and the Shop schema. The existing preset
registry selects a composition when applied. The renderer never branches on a
preset ID.

| Composition | Preset defaults | Hierarchy |
| --- | --- | --- |
| standard | Six unchanged preset families; all legacy themes missing this field | Existing hero, ordered sections, catalog |
| discovery | Modern Electronics v3 | Hero beside category navigation, followed by remaining sections and catalog |
| editorial | Editorial Fashion v3 | Hero and merchant story share an asymmetric spread; remaining sections and catalog follow |
| boutique | Luxury Jewellery v3 | Hero outside the contained body; curated collection and story share a gallery below |

`planHomepageComposition` partitions sections into slots without mutation or
duplication. The first eligible section fills a role. All others keep their saved
relative order. Disabled, unavailable, or viewport-specific sections do not reserve
side columns. Empty stores receive no invented content. Existing commerce nodes,
callbacks, editor IDs and link components pass through the shared Home renderer.

The registry catalog is version 3. Only the three changed presets advance to v3;
the other six remain v2. An older saved preset ID alone never opts a store into the
new layout. Gallery offers Apply update for an older preset, using the existing
draft confirmation, undo and publish flow. Limited-plan application preserves its
existing restricted layout; the no-builder plan resolves to the standard composition.

Composition grids use shared spacing tokens and collapse on narrow previews/mobile.
The initial checks establish server-rendered hierarchy, preservation and compiled
CSS availability. Browser computed layout and screenshots are not yet verified.
Gallery thumbnails remain simplified; authoritative thumbnail generation and full
page presentation parity belong to Phase 6.

## Phase 5: identity and customization capabilities

`capabilities.cjs` is a closely related part of this contract. It derives choices
from `STRUCTURAL_VARIANTS`, section support from `SECTION_REGISTRY`, and slot
placement from `HOMEPAGE_COMPOSITIONS`. No capability object is persisted, no
additional theme schema is introduced, and no preset ID is reapplied on read.

- `getThemeCapabilities(theme, planAccess)` provides editor choices, section
  permissions, composition identity, and ordering guidance.
- `getThemePropertyCapability(path, { theme, planAccess, sectionType })` returns
  customization level, classification, plan allowance, and direct editability.
- `THEME_CAPABILITY_RULES` classifies each canonical root group and more specific
  overrides. Descendants inherit the most specific matching rule. Numeric section
  and slide indexes use `*`; unknown root paths are locked.
- `getThemeEditorRestriction` supplies inspector/sidebar restrictions.
- `assertStoreBuilderUpdateAllowed` is the shared write policy. The backend
  adapter retains its existing exports. Use `completeSnapshot: true` for the
  normalized object about to be persisted; omission must not bypass restrictions.

### Customization classification

| Properties | Level / classification | Behavior |
| --- | --- | --- |
| Logo, favicon, colors, fonts, typography, hero copy/media, checkout branding, policies, SEO content | Safe / fully customizable | Existing validation, sanitization, and ownership checks still apply |
| Layout spacing/padding/margins | Safe / fully customizable | Existing whole-layout plan gate still applies |
| Header/hero variants, card style, widths, grids, navigation, footer, catalog and payment display settings | Structural / partially customizable | Existing schema enums and renderer choices; commerce authorization remains separate |
| Homepage section content | Safe / section specific | The selected section type and plan determine editing availability |
| Section type/order and section variants | Structural / partially customizable | Existing full-builder gate; variant options come from the section registry |
| Mobile settings, section desktop/mobile settings and media, mobile/tablet grid columns | Structural / responsive only | Existing responsive behavior; viewport verification is a later gate |
| Card shadow/titleWeight/buttonStyle with `inheritedStyleFields` membership | Safe / inherited | Style command supplies defaults; an explicit field edit ends inheritance |
| `layout.homepageComposition`, preset provenance, card inheritance metadata | Identity / theme controlled | Explicit theme/style commands; no ordinary composition dropdown |
| Version, migration/archive metadata, generated SEO suggestion metadata, legacy fixed header fields | Identity / locked | Managed by existing system commands or normalization; retained for compatibility |
| `mobile.stickyCheckoutButton` | Locked | Saved value retained, control hidden because no renderer consumes it |

These classifications describe customization commands, not a new JSON whitelist.
They do not strip existing fields or reject a saved snapshot simply because it
contains system-managed metadata. `validateTheme` still validates section types,
variants, schema version, and URLs; Mongoose and asset ownership checks still run.
Full-access API callers can explicitly submit any registered composition, including
custom themes and revision restores. A saved preset ID is provenance, not a rule
that forces its current defaults onto a store.

### Plan and identity behavior

Limited plans retain existing layout/product-grid/header-variant/hero-variant and
advanced-section restrictions. Featured-product content and visibility remain
editable. Adding, duplicating, deleting, changing types, and reordering sections
are disabled. Validation checks both old and new section types, preventing an
advanced section from being converted to FeaturedProducts to bypass the gate.

Colors and functioning mobile toggles are now accessible on limited plans, matching
what the backend already accepts. The former editor-only restrictions were not
save-time policy. No-builder plans report `access: none` and block Builder editing.
Domain and scheduled-banner availability continue to use their existing plan flags.

Draft and publish services check the normalized snapshot. Publish obtains current
plan access for the requested shop, so revision restore cannot bypass the same
policy. The separately gated homepage-SEO flow keeps its existing behavior.
Tenant lookup filters, revision conflicts, asset ownership, and transactions remain
in their existing service layers.

Composition slot placement is inherited from the saved composition. The first
eligible section occupies a slot; unclaimed sections retain merchant order.
Discovery category navigation recommends one column in its narrow slot while
retaining all four supported column choices. Presets do not invent additional
header, hero, section-variant, or column locks.

### Compatibility and verification limits

No schema bump, migration, or database rewrite. All nine presets retain composition
and provenance through safe edits and in-memory Mongoose round trips. Unchanged
restricted values remain saveable after downgrade; actual restricted changes,
including a restore that changes them, require full access.

The temporary Vite fallback variant registry was removed. Rebuild/restart Admin,
storefront, and backend together with the shared package; stale optimized bundles
must be refreshed. Runtime editor markup tests replace the old test requiring that
duplicate list. Browser visual parity and real MongoDB publication remain unverified.

## Phase 6 — shared presentation

Gallery cards and full previews call the same `StorefrontPreview` used by Builder.
It resolves the theme with `resolveEffectiveTheme`, then uses the existing shared
header, Home composition and footer. Product, cart, checkout and refund-policy
views come from `packages/storefront-renderer/presentation`; live routes import
the same views. Preview adapters supply mock commerce state and inert actions.
Live adapters retain authentication, API calls, cart persistence, analytics,
review submission and order creation.

The renderer's `product-data` and `media` exports supply product normalization,
variant/pricing/stock derivation and image metadata to both applications.
`getReferenceThemeStyle` owns the provider aliases, while `styles.css` supplies
the shared page utilities and locally bundled Inter/Roboto fonts. Framework image
and link adapters preserve Next optimization/navigation in live pages and safe
native images/inert links in preview; crop, alt, sizing and fallback components
remain shared.

Preview uses a React portal into a sandboxed iframe document. Its real width is
1180, 768, 390 or 320 pixels; only the outer frame is scaled to fit the editor.
Stylesheets are mirrored into that document so media queries and fixed/sticky
elements use its viewport. This is presentation infrastructure, not the later
responsive configuration/inheritance phase. Gallery thumbnails are cropped live
renderer output, not separately maintained artwork.

Phase 6 verification: 140 focused tests pass, including nine Gallery presets and
45 preset/page server renders; both production builds pass. Local synthetic-data
browser smoke verifies the frame and representative page interactions. Real
publish/reload, first-render/cache behavior, font timing and full cross-surface
pixel comparisons remain later gates. See `output/theme-audit/phase6-completion.md`.

## Phase 7 — control consumers

Explicit Builder layout edits now synchronize catalog column/gap aliases through
`updateBuilderThemeSetting`; loading existing themes preserves their snapshots.
Preview section commands use the original draft index behind the stable section
ID, even when the effective theme filters earlier sections.

Shared renderer consumers now honor the wide desktop menu, independent card
rating/review visibility, sale badge text/background, hover border and variant-chip
colors, checkout colors/shape, and secondary-page heading font/weight. Explicit
manual review mode wins over selected reviews. Disabling all configured hero
slides no longer revives the first slide; legacy empty-list behavior is retained.
Explicitly selected featured products are no longer truncated to a single row.

The legacy section box pairs (padding 40/40, margins 0/40) still mean automatic
spacing; the editor documents this. Stored themes are not migrated. Existing
saved values that previously lacked a consumer can now visibly take effect.

Verification: 152 focused tests and both builds pass; actual editor callbacks
and draft/publish service code run with in-memory I/O, real schema validation,
serialization/hydration and shared rendering. Synthetic browser smoke verifies
representative controls. The authenticated MongoDB publish/hard-reload acceptance
gate remains open. See `output/theme-audit/phase7-control-audit.md` for the matrix
and exact limits; do not equate these tests with deployed end-to-end verification.

## Phase 8 - semantic responsive behavior

`mobile.heroComposition` accepts Theme, Image first or Text first. Below 768px,
Split/Editorial/Minimal panel heroes use the selected ordering; overlay heroes
retain their theme composition. `mobile.sectionSpacing` accepts Theme, Compact,
Comfortable or Spacious and sets flexible homepage top margins to 24/32/40px below
768px. Explicit layout margin pairs still win. Theme preserves prior behavior.

Optional `layout.productColumnsTablet` supplies the featured-section default;
section `desktopSettings.tabletColumns` takes priority. Explicit Builder edits
synchronize the catalog value. Its absence preserves legacy derived columns.
Phone grids honor their selected columns until 768px. Desktop density still uses
the existing progressive breakpoints. Hero mobile media now uses the same 768px
boundary as focal positioning. Commerce bars reserve bottom-nav space only on phones.

No schema-version bump, migration, preset reapplication or database write. Ship
the updated contract, backend schema and consumers together. 156 focused tests,
both builds and synthetic browser viewport measurements pass. See
`output/theme-audit/phase8-responsive-completion.md` for evidence and limitations.

## Phase 9 - mobile Builder presentation

Mobile Builder uses the existing theme edit commands, history, validation and
publication handlers. View navigation, compact actions/page controls, initial
phone preview, touch sizing and drawer presentation are handled in Admin only.
No theme contract or persistence changes. The Admin build and 156 existing tests
pass. Actual-component browser checks cover selection, typography reaching the
preview, responsive workspaces and drawer focus. A browser-policy block prevented
the final narrow-width/scroll-lock recheck; see
`output/theme-audit/phase9-mobile-builder.md` for the exact boundary.

## Phase 10 - nine-preset audit

All nine presets have isolated service/schema edit-publication checks and seven
page/component render checks each. Shared zero-price card handling and eligible
variant inventory/selection were repaired. Live home/category/collection adapters
reuse product normalization, and category/collection grids honor the catalog's
spacing, mobile columns and card alignment. 166 focused tests and both builds pass.

Full acceptance remains open: resolved contrast findings affect Luxury Jewellery,
Minimal Jewellery and Fresh Grocery; live commerce calculations have separate
zero-discarding fallbacks. All-nine viewport/pixel parity and authenticated database
publication remain unverified. No preset versions/colors or stored themes were
changed. See `output/theme-audit/phase10-nine-theme-audit.md` for the matrix.

## Phase 11 - published snapshot and first render

The tenant server layout now loads fresh public settings through
`getPublishedStorefrontSettings(subdomain, host)`. It reuses the existing public
endpoint, effective resolver and shared renderer. React request-scoped memoization
shares the snapshot with the homepage; no process-global tenant snapshot is kept.
The provider renders its settings prop directly and has no client fetch or child
hydration setter. Home/category/collection consume this context alongside the shell
and commerce pages. Missing tenant snapshots cannot silently render platform defaults.

New published revision props apply synchronously; homepage state is keyed by tenant
and revision. Existing Next layouts retain their snapshot during ordinary navigation.
Publication notification and refresh/invalidation of already-open tabs remain Phase 12.
174 focused tests and the storefront build pass. Actual browser hydration, navigation,
authenticated publication and custom-domain deployment acceptance remain unverified.
See `output/theme-audit/phase11-first-render.md` for evidence and tradeoffs.

## Phase 12 - state delivery and concurrency

Builder autosave/manual saves share a serial queue. Publish/restore drains it before
committing, then clears local recovery without deleting a newer server draft. New
Builder writes/discards send the existing draft updatedAt as a concurrency token
and assert the active shop. SEO draft writes/discards compare the version they read.
Legacy clients omitting tokens remain supported and do not receive the full ordering
guarantees of the new client. No schema field or migration was introduced.

Public settings/bootstrap cache keys include a fresh database revision, shop update
time and effective plan inputs. Tenant routing always reads the current mapping from
the database. Configured Redis failures act as cache misses rather than producing
worker-local fallback copies. Committed publish/restore results survive cache cleanup
failures with a warning. Revision-aware reads provide correctness independently of
whether another worker received invalidation.

A public no-store revision endpoint feeds a visible-tab watcher. Navigation, focus and
a 30-second interval can request router.refresh for newer revisions; the server remains
the theme authority. Homepage bootstrap revision mismatches receive one bounded retry,
then an explicit retry state instead of mixed section data. 188 focused tests and both
builds pass. Live Mongo/Redis concurrency,
browser interaction/hydration, and load testing remain open. Read
`output/theme-audit/phase12-state-delivery.md` before rollout.

## Phase 13 - controlled preview/live comparison

The actual Gallery full-preview adapter, Builder panel and live provider/header/home/
footer now have exact presentation-markup comparisons for all nine presets on full
and limited plans. Eighteen cases produce matching hashes with fixed revision,
content, branding, prices, selections and pagination. Iframe mounting, network and
commerce effects are substituted: matching server HTML does not establish pixel parity.

`@scaleup/storefront-renderer/viewports` defines desktop 1180x800, tablet 768x800,
mobile 390x800 and small-mobile 320x800 CSS viewports for previews and live acceptance.
Gallery thumbnails are cropped; comparisons must use its full preview.

Repairs forward discounts and public badges, remove sample categories for empty stores,
use live mobile navigation positioning, and scope font utilities consistently. Builder
bootstrap and optional picker card responses reuse public projection/sale/sanitization
rules. Public catalog cards remain separate from off-page product selections; draft-only
selections load on bootstrap. Live Collections now fetch off-page selections too.

224 tests and both builds pass. Browser screenshots, authenticated publication, enabled
scheduled banners/popups and complete secondary-page visual comparisons remain open.
No schema/preset version or saved theme was changed. Details and the controlled-input
matrix are in `output/theme-audit/phase13-preview-live-parity.md`.
