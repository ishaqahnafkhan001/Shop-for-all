# Phase 5 — Theme identity, customization, and capabilities

Completed 2026-10-08 at the configuration, editor markup, and mocked service boundary.

## Changes

1. Added `packages/storefront-theme/capabilities.cjs` within the existing shared
   contract. It classifies property groups and derives structural choices from the
   existing variant, section, and composition registries.
2. Connected the Builder inspector, sidebar, header/hero/section editors, color and
   mobile controls to that policy. Removed the duplicate variant fallback registry.
3. Explained composition identity and section placement in the editor. Discovery
   navigation recommends one category column while preserving supported choices.
4. Moved backend plan validation into the shared contract with its original backend
   exports preserved. Fixed advanced-section conversion bypass and added validation
   of the normalized snapshot at draft/publish persistence boundaries.
5. Revision restore now passes the same current tenant plan check as publication.
   Existing tenant scoping, revision conflicts, asset ownership, and transactions
   remain responsible for their respective protections.

## Deliberate behavior changes

- Limited-plan merchants can access color controls and functioning mobile toggles
  previously blocked only in the editor. These changes were already accepted by
  backend validation. Layout and structural plan restrictions remain.
- Limited-plan section add/reorder/duplicate/delete/type controls are disabled;
  featured-product content and visibility remain editable.
- The sticky-checkout toggle is hidden: repository inspection found no storefront
  consumer. Its stored field remains intact for compatibility.
- A downgraded store cannot restore a revision that changes restricted design
  fields. Unchanged restricted values are accepted. Full-plan explicit selection
  and restore remain supported.

## Identity and compatibility

Ordinary customization preserves the saved composition. Theme selection remains
an explicit command. Supported variants are not arbitrarily restricted by preset.
Full-access API submissions can still select any registered composition, allowing
custom themes and historical restores. Preset IDs never silently apply defaults.

No schema version bump, migration, or database rewrite was performed. Existing
themes, unknown-field archives, and legacy standard-composition fallback remain.
The property matrix and exact command semantics are documented in
`packages/storefront-theme/README.md`.

## Verification

- Focused suite: **134 passed, 0 failed, 0 skipped**.
- Actual editor components were bundled and server-rendered to verify choices,
  plan gates, identity guidance, and unsupported-control suppression.
- All nine preset identities survived safe edits and in-memory Mongoose round trips.
- Actual draft/publish/restore service functions were exercised with mocked I/O:
  restricted changes reject before writes; allowed publication/restore reaches
  asset ownership validation. Tenant lookup/plan query scopes were asserted.
- Admin Vite production build: passed.
- Storefront Next.js production build: passed.

Initial regressions identified the obsolete test requiring duplicate variant
metadata. It was replaced with runtime option-equivalence checks. New fixture
corrections supplied the required manual product source and matched the HTML
disabled attribute rather than CSS class names.

## Remaining gates

Browser interaction, computed styles, screenshot parity, live MongoDB persistence,
and deployment have not been verified. Rebuild/restart all consumers together;
the temporary stale-Vite-contract fallback is removed. Phase 6 is next: Gallery,
Builder, and storefront presentation fidelity across the supported themes/pages.
