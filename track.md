# Storefront Theme System — Implementation Track

Current scope: user requested completion through Phase 3 on 2026-10-07.
Status: Phase 1 contract closure, Phase 2 compatibility, and Phase 3 shared effective resolver in progress.
The earlier one-subphase stopping rule is superseded by this explicit request.
No production database writes or deployment are authorized by this implementation task.

## Architecture Decisions
- Follow the revised implementation PDF in Downloads; current authorized boundary is the end of Phase 3.
- Retain the existing shared theme contract, renderer, and publication architecture.
- The shared FALLBACK_THEME defines new-store defaults. Compatibility exceptions for existing sparse records remain explicit at the persistence boundary.
- No production database writes, migration, deployment, or schema version bump in this subphase.
- Full Phase 1 requires explicit override/inheritance semantics and nested-merge fixes; this subphase does not complete it.
- Phase 1B design: establish absent-versus-explicit semantics for hero-slide fields in the existing shared contract. Missing/null string fields inherit; explicit empty strings clear. Zero focal coordinates and false enabled flags are values. Explicit slide arrays replace legacy slide synthesis. Existing nullable preset/SEO clears remain supported.
- Avoid a blanket deep merge: fully normalized saved themes contain no override provenance, and merging fallback card/layout values first can defeat style-specific defaults. Durable override metadata and generic merging remain pending.
- Keep raw field resolution separate from save-time sanitization so Builder typing retains spaces; the shared normalizer still sanitizes before persistence/rendering.
- Phase 1C decision: optional productCard.inheritedStyleFields lists only shadow, titleWeight, and buttonStyle. Absent metadata preserves legacy flat values. An empty list means all three values are explicit. Never infer provenance by value equality.
- Style selection is an explicit command that resets these three fields to the chosen style defaults. Individual edits remove the edited field from inheritance, even if its value equals the current default. UI explains the reset and offers Apply style defaults for the current style.
- Keep resolved flat values for existing renderers/older readers. Metadata is additive, version 4 remains, no database rewrite. Preset application replaces productCard and therefore discards prior style inheritance along with prior card presentation.
- Phase 1D: all six existing mergeTheme call sites are complete snapshot loads or reset construction. Preserve their shallow root overlay plus normalization as loadBuilderTheme; do not deep-merge defaults into these snapshots.
- Partial edits use shared mergeThemePatch before normalization. Objects recurse, arrays replace, omitted/undefined values inherit, false/zero/empty strings remain explicit. Null clears only the existing nullable contract paths; other nulls inherit. No normalization/sanitization during typing; normalize once at the completed-theme boundary.
- Partial card-field edits remove edited style fields from inheritedStyleFields unless the patch explicitly supplies a replacement inheritance list. Style selection continues to use the existing explicit reset command.
- Ignore prototype-control keys and bound recursive traversal. This helper is for plain JSON theme data, not arbitrary objects or a substitute for validation/sanitization.
- Phase 1E: retain normalizeThemeColors read precedence and preset data. Correct edit commands: flat aliases map to their nested targets; explicit nested values in the same update win. Resolve competing flat soft aliases in fixed order (accentBg after accentSoft), independent of object key order.
- Synchronize nested edits back only to unambiguous flat aliases (one target); exclude accentSoft because it is a distinct palette shade sharing brand.soft with accentBg. Multi-target aliases are not inverted: editing a checkout button must not recolor product actions.
- Keep incomplete hex input in local editor state; mirror only valid hex values. Apply generated brand colors first and explicit palette values second so a generated nested value cannot mask a merchant's flat palette choice.

## Completed Work
### Phase 0
- Read the revised implementation PDF and reused the existing audit at output/theme-audit/storefront-theme-audit.md.
- Confirmed the working tree contained only the pre-existing untracked output/ directory before implementation.
- Re-ran the focused baseline: 43 tests passed, 0 failed.
### Phase 1
- Selected BUG fixes: productCard.showWishlist default, allProducts.title default, and allProducts.spacing enum.
- Phase 1A complete: new Shop documents obtain the two defaults from FALLBACK_THEME; hydrated existing sparse documents retain false / 'Shop products'. Explicit values remain authoritative.
- Added Editorial to the catalog-spacing schema enum.
- Added six regression tests; all nine preset configurations survive JSON serialization, Mongoose hydration, and shared normalization unchanged.
- Phase 1B complete (BUG): shared resolveHeroSlideFields replaces Builder and renderer duplicates. Cleared slide copy/images/CTA fields survive normalization; legacy fields mirror resolved image/CTA values without truthiness fallbacks.
- Explicit empty slide arrays remain empty in the contract; absent arrays still support legacy image-based slide synthesis.
- Hero rendering consumes resolved copy and requires both text and URL for each CTA. A cleared visible heading retains a screen-reader-only shop heading.
- Nine new regression tests include actual Builder/renderer modules and 15 server renders (five hero variants x live/desktop-preview/mobile-preview).
- Phase 1C complete (BUG + MISSING FEATURE): selecting Minimal/Modern/Premium now applies shadow/titleWeight/buttonStyle defaults through a shared edit command. Optional inheritedStyleFields records provenance for these fields; subsequent field edits become explicit overrides.
- Mongoose persists the allowlisted metadata with no default injection into legacy records. Added Apply style defaults and explanatory text in the card editor. Preset application retains its curated card values.
- Eight new regressions cover legacy stability, inherited values, explicit values equal to defaults, empty inheritance lists, immutability, schema round trip, invalid metadata, and all nine presets.
- Phase 1D complete (BUG): shared mergeThemePatch recursively preserves omitted nested values, replaces arrays atomically, respects explicit values and nullable clears, removes explicit card edits from inherited fields, and clones inputs without prototype-control keys.
- Builder mergeTheme now means a normalized partial update, starting from an empty base by default. loadBuilderTheme preserves historical root-overlay behavior for complete snapshots. All six snapshot/reset call sites migrated; ordinary setThemeGroup edits use the raw patch helper to preserve typing whitespace. The special card-style command remains intact.
- Eight new tests execute the actual Builder utility and shared exports, including sparse snapshots and all nine presets; snapshot loading matches the previous implementation.
- Phase 1E complete (BUG): foreground edits mirror to brand.secondary, the renderer's authoritative text token. One-target nested edits update their flat alias, with no reverse fan-out for multi-target aliases.
- Explicit nested edits win within a mixed update, including incomplete typed hex values; overlapping flat soft aliases resolve in fixed order. Generated brand shades apply before explicit palette choices.
- Nested color controls, palette application, valid main-brand edits, and section color resets use the corrected edit path. Saved-theme normalization and preset definitions were not changed.
- Eight new regressions cover text-token persistence, nested/flat precedence, localized reverse synchronization, soft aliases, incomplete input, all nine preset no-ops, the built-in palette catalog, and generated checkout shades.
### Phases 2-14
- Pending; no implementation claimed.

## Current Problems
- The two selected new-store default mismatches and Editorial enum rejection are fixed. Historical missing-field defaults are intentionally retained only for existing hydrated records.
- Full normalized configurations still cannot distinguish inherited defaults from explicit merchant overrides.
- Product-card style provenance is now available for three fields after an explicit style/reset action. Other normalized groups still lack provenance; this does not complete the canonical override model.
- Preview/live resolution, responsive preview, provider lifecycle, and incomplete control wiring remain as documented in the audit.
- Nested patch merging and the scoped color alias edit precedence are repaired. Remaining schema/default mismatches and broader override provenance still prevent full contract parity.

## Confirmed Root Causes
- Independently maintained persistence defaults and enum values drifted from the shared contract.
- Hero resolution was duplicated in three places with different fallback rules. Truthiness checks treated explicit clears and zero coordinates as missing, and final JSX reintroduced legacy copy after resolution.
- Card style selection previously changed only the style label in a fully materialized object. Saved shadow/titleWeight/buttonStyle values then overrode the new style defaults during normalization.
- The prior mergeTheme spread objects only at the root: a partial nested object replaced the whole existing group, then normalization filled lost siblings with global defaults. Complete snapshot loads need different semantics and are now explicit.
- Advanced foreground edits were missing a brand.secondary alias. Flat-to-nested mirroring ran after nested edits and overwrote explicit section values; overlapping flat aliases depended on property insertion order. Generated palette values and explicit choices needed distinct application steps.
- Broader causes are recorded in the existing audit; they are outside this session's implementation boundary.

## Files Changed
- track.md: implementation status and handoff (created this session).
- ecommerce-backend/backend/tests/store-builder-contract.test.js: six regression tests for defaults, Editorial spacing, explicit values, legacy hydration, and all nine presets.
- ecommerce-backend/backend/models/Shop.js: import shared defaults, retain historical defaults during legacy hydration, and accept Editorial spacing.
- packages/storefront-theme/index.cjs: shared hero field resolver, sanitize after resolution, explicit array handling, and legacy mirror repair (Phase 1B).
- packages/storefront-theme/index.mjs: export the same resolver to ESM consumers.
- ecommerce-admin/src/pages/dashboard/StoreBuilder/storeBuilderThemeUtils.js: reuse shared resolver and preserve empty CTA values during synchronization.
- packages/storefront-renderer/reference/referenceCore.jsx: reuse shared resolver, including zero focal coordinates.
- packages/storefront-renderer/reference/StorefrontHero.jsx: honor cleared visible copy and CTA URLs.
- ecommerce-backend/backend/tests/storefront-hero-contract.test.js: new executable contract/consumer/server-render regressions. Requires installed Admin development dependencies (Rolldown) and React; does not write a bundle to disk.
- Phase 1C extends packages/storefront-theme/index.cjs and index.mjs with allowlisted inheritance, validation, and updateProductCardSetting; extends models/Shop.js with optional inheritedStyleFields.
- ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx: routes card edits through the shared command.
- ecommerce-admin/src/pages/dashboard/StoreBuilder/editors/ProductCardsEditor.jsx: explicit style-reset explanation and Apply style defaults button.
- ecommerce-backend/backend/tests/storefront-card-inheritance.test.js: eight new regression tests.
- Phase 1D extends packages/storefront-theme/index.cjs and index.mjs with mergeThemePatch; extends storeBuilderThemeUtils.js with loadBuilderTheme and corrected mergeTheme; updates StoreBuilderPage.jsx snapshot calls and ordinary field edits.
- ecommerce-backend/backend/tests/storefront-theme-merge.test.js: eight new executable merge/compatibility tests; uses installed Admin Rolldown to load the real utility without writing a bundle.
- ecommerce-admin/src/pages/dashboard/StoreBuilder/storeBuilderColorState.js: foreground mapping, deterministic forward precedence, and scoped reverse alias synchronization.
- ecommerce-admin/src/pages/dashboard/StoreBuilder/storeBuilderColorConfig.js: applyColorPalette separates generated defaults from explicit palette choices.
- Phase 1E also updates StoreBuilderPage.jsx palette/main-brand/section-reset call sites.
- ecommerce-backend/backend/tests/storefront-color-aliases.test.js: eight new color edit/normalization/schema/palette regressions, executing actual state and palette helpers.

## Tests Run
- Baseline command, from ecommerce-backend/backend:
  `node --test tests/store-builder-contract.test.js tests/store-builder-prebuilt-themes.test.js tests/storefront-theme-controls.test.js tests/storefront-structural-variants.test.js tests/store-builder-color-product-edit-images.test.js`
- Baseline result: 43 passed, 0 failed.
- Regression command: `node --test tests/store-builder-contract.test.js` (same working directory).
- Before source changes: 8 passed, 3 failed, confirming exactly the wishlist default, catalog title default, and Editorial enum defects.
- After source changes, the full focused command above: 49 passed, 0 failed, 0 skipped (including six new tests).
- `git diff --check`: passed. Reviewed the complete source/test diff; changes are limited to the model and contract tests, plus this track file. Git emitted the repository's LF-to-CRLF conversion warnings.
- Phase 1B red run: new hero suite had 3 passed / 5 failed before implementation. A subsequent actual renderer test reproduced legacy text and secondary-link fallback after the resolver was fixed.
- Phase 1B final command, from ecommerce-backend/backend:
  `node --test tests/store-builder-contract.test.js tests/store-builder-prebuilt-themes.test.js tests/storefront-theme-controls.test.js tests/storefront-structural-variants.test.js tests/store-builder-color-product-edit-images.test.js tests/storefront-hero-contract.test.js tests/store-builder-navigation-seo.test.js`
- Result: 66 passed, 0 failed, 0 skipped, including all nine preset configuration round trips and 15 hero server renders.
- `npm run build` from ecommerce-admin: passed (Vite production build).
- Final source diff reviewed; `git diff --check` passed. Pre-existing Phase 1A changes and output/ artifacts preserved.
- Phase 1C red run: 3 passed / 5 failed before source implementation. Green focused card suite: 8 passed / 0 failed.
- Phase 1C final command (same backend directory):
  `node --test tests/store-builder-contract.test.js tests/store-builder-prebuilt-themes.test.js tests/storefront-theme-controls.test.js tests/storefront-structural-variants.test.js tests/store-builder-color-product-edit-images.test.js tests/storefront-hero-contract.test.js tests/store-builder-navigation-seo.test.js tests/storefront-card-inheritance.test.js`
- Final result: 74 passed, 0 failed, 0 skipped. Admin `npm run build` passed again. Reviewed new source and UI diff; `git diff --check` passed.
- Phase 1D red run: 8 new tests failed before implementation (lost sibling values plus missing shared patch/load APIs). Green focused suite: 8 passed, 0 failed.
- Phase 1D full command, from ecommerce-backend/backend:
  `node --test tests/store-builder-contract.test.js tests/store-builder-prebuilt-themes.test.js tests/storefront-theme-controls.test.js tests/storefront-structural-variants.test.js tests/store-builder-color-product-edit-images.test.js tests/storefront-hero-contract.test.js tests/store-builder-navigation-seo.test.js tests/storefront-card-inheritance.test.js tests/storefront-theme-merge.test.js`
- Result: 82 passed, 0 failed, 0 skipped. Admin `npm run build` passed. Added cyclic-input depth assertions afterward and reran the merge suite: 8 passed. No production code changes after the full suite/build.
- Reviewed the new shared helper, Builder utility, and all six migrated callers; `git diff --check` passed. Prior dirty files and output/ artifacts retained.
- Phase 1E red run: 1 passed / 5 failed before source changes. Initial test fixture referenced getThemeCssVars.colors instead of its actual colorGroups result; corrected after the foreground assertion began passing. Final targeted suite: 8 passed / 0 failed.
- Phase 1E final command, from ecommerce-backend/backend:
  `node --test tests/store-builder-contract.test.js tests/store-builder-prebuilt-themes.test.js tests/storefront-theme-controls.test.js tests/storefront-structural-variants.test.js tests/store-builder-color-product-edit-images.test.js tests/storefront-hero-contract.test.js tests/store-builder-navigation-seo.test.js tests/storefront-card-inheritance.test.js tests/storefront-theme-merge.test.js tests/storefront-color-aliases.test.js`
- Result: 90 passed, 0 failed, 0 skipped. Admin `npm run build` passed. Reviewed the color helper/config/Builder integration diff; `git diff --check` passed.

## Failed Tests / Known Issues
- No baseline failures. Existing MODULE_TYPELESS_PACKAGE_JSON warning for the storefront theme module is unrelated.
- No remaining failures in the 49-test focused suite.
- No remaining failures in the expanded 66-test suite. Initial standalone bundling emitted peer-resolution warnings; explicitly externalized React/icons and pointed the test at the repository's actual shared contract export. Final hero runs had no such warnings.
- No remaining failures in the expanded 74-test suite. Existing module-type and Git line-ending warnings remain unrelated.
- No failures in the 82-test suite or final merge rerun. Existing module-type and line-ending warnings remain.
- No failures in the expanded 90-test suite. Existing module-type and line-ending warnings remain unrelated.
- Initial test authoring run had two additional test issues: an incorrect positional call to the preset resolver and an overly broad assumption about hydration dirty paths. Corrected the call to the actual object-argument API and checked the two affected paths directly. Existing array defaults can mark other theme paths dirty on sparse hydration; that behavior predates this repair.
- Database integration, publication, browser screenshots, and deployed storefront behavior have not been verified in this session.

## Migration / Compatibility Notes
- Preserve explicitly saved false and empty-string values.
- Verified old records with no theme, an empty theme, or empty affected groups retain their historical defaults when hydrated. Default callbacks use Mongoose's document newness flag; no migration infers whether a previously materialized value was a merchant override.
- Verified explicit true/false wishlist values and empty/custom titles survive new-document construction, serialization, hydration, and normalization.
- Hydrated reads and lean reads remain separate existing paths; this subphase does not promise parity for every sparse legacy record across those paths.
- Editorial is an additive enum repair; no existing enum value is removed.
- No records are rewritten on read by this task.
- Phase 1B does not add a persistence format or bump the schema version. Existing normalized explicit values remain authoritative, including values equal to defaults; no override provenance is inferred.
- Deliberate behavior corrections: saved empty hero copy no longer renders old legacy copy; empty CTA URLs hide their buttons; coordinates of zero remain at the image edge. Null hero strings inherit rather than clear; use an empty string to clear. Existing nullable preset and SEO metadata clears are covered.
- Unknown valid slide properties survive shared resolution; save-time sanitizer remains in force. Builder typing whitespace is preserved until normalization/save.
- Phase 1C metadata is optional and additive. Legacy records receive no inheritance list on hydration; explicit old values remain unchanged. Choosing a style/reset deliberately resets only the three documented style fields; it does not change image settings, visibility flags, title size, colors, or merchant content.
- All currently resolved flat values remain stored for readers without metadata support. Older writers may drop inheritance metadata or fail to mark later flat edits as explicit; coordinate the updated contract, backend, and Admin rollout. No mixed-version write compatibility is claimed.
- Phase 1D changes no schema or stored records. Complete load/draft recovery/history/restore/publish-response/reset semantics remain compatible with previous root-overlay normalization, including sparse Minimal card styles and layout settings.
- Null in a partial object inherits unless its exact path is an existing nullable field. Arrays replace as whole JSON values (no ID-based merging); existing normalizers can still enforce policies such as the required Policies navigation link after a merge.
- mergeThemePatch is a raw JSON operation, not a sanitizer or final resolver. Normalized mergeTheme sanitizes only after merging; current live editing preserves unfinished text. Existing dedicated color commands continue handling color aliases; generic merging does not make a legacy alias authoritative.
- Phase 1E performs no migration or schema change. All nine saved preset themes remain identical after a no-op color update and normalization. Explicit foreground edits change only foreground and brand.secondary in those fixtures.
- Multi-target aliases (for example primaryButtonBg affecting product and checkout buttons) remain one-way edit commands. A single section change cannot safely redefine every target of that alias. accentSoft remains a distinct palette shade; nested brand.soft synchronizes accentBg only.
- Incomplete typed values remain local and do not propagate as valid aliases. Existing save-time validation/sanitization remains responsible for accepted color values.

## Risks
- Compatibility defaults protect existing sparse hydrated records. Removing these exceptions later requires explicit legacy fixtures and a migration strategy.
- Full-contract schema drift remains, including catalog subtitle defaults; do not infer full parity from these three repairs.
- In-memory Mongoose validation is not a MongoDB persistence or publish test.
- Server markup checks do not establish browser layout, hydration, carousel interaction, or deployed preview/live parity. No production publish or database migration was performed.
- Empty bannerSlides is preserved as configuration; existing renderer/Builder fallback behavior can still show a legacy hero/editor placeholder. This does not implement a hide-hero action or change all-disabled-slide behavior.
- Rebuild/restart consumers together when rolling out the new shared export; running dev servers may retain an older optimized dependency cache.
- Card verification covers contract/edit commands, schema hydration, and production compilation. Actual browser style selection, network publication, and screenshot comparisons remain unverified.
- Raw patch traversal rejects excessive/cyclic nesting and non-plain nested objects; callers must supply JSON theme data and normalize/validate at trust boundaries. Maintain nullable patch paths when the canonical nullable fields change.
- No browser keystroke/undo/network-publish test was performed for Phase 1D. Snapshot fixtures and production compilation are verified; runtime browser parity remains pending.
- Phase 1E verification covers edit helpers, normalized color tokens, Mongoose hydration, presets/palettes, and compilation. Browser computed CSS, screenshots, network publishing, and real tenant sessions remain unverified.
- Existing normalizeThemeColors legacy-default remapping and read precedence were preserved; this edit-path repair is not a complete redesign of color storage or historical migrations.

## Deferred Work
- Explicit inherited versus overridden values, null/false/zero/empty semantics across the whole contract.
- Broader inheritance metadata across other theme groups; nested merging outside the repaired Builder patch boundary.
- Schema versioning and legacy migration strategy, shared effective resolver, registry/composition, and preview/live parity.
- Remaining phases and rollout gates in the revised PDF.

## Next Step
1. Read this track and inspect `git status --short`; Phase 1A-1E changes remain uncommitted. Preserve output/ artifacts.
2. For Phase 1F, compare remaining Shop.theme defaults/enums with FALLBACK_THEME and normalization, starting with the known allProducts.subtitle drift. Distinguish deliberate compatibility differences from actual new-store defects.
3. Use fixtures for new documents, hydrated sparse legacy records, explicit saved empty values, and full normalized presets before any correction. Do not overwrite historical values or introduce migration-on-read.
4. Repair one coherent set of remaining contract mismatches, then record a concrete Phase 1 exit matrix: which properties have provenance/clear semantics, which remain legacy-compatible only, and what must precede Phase 2 versioning and Phase 3 shared resolution.
5. Re-run the Phase 1E 90-test command above from `C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend`, plus targeted regressions; build Admin if integration changes, review diff, and update track before the next boundary.

## Session Log
### 2026-10-07 10:58
- User requested continuation. Read track, inspected alias map, normalization, color controls/palette composition, and shared renderer foreground consumption. Confirmed missing foreground mapping and conflicting flat/nested update precedence. Starting the bounded edit-path fix.
### 2026-10-07 11:01
- Completed Phase 1E. Eight new tests and 90 total focused tests passed; Admin production build and diff check passed. Confirmed no-op preservation for all nine theme presets and explicit color behavior across the built-in palette catalog. No database writes, deployment, or browser visual testing. Stopped at the boundary.
### 2026-10-07 10:52
- User requested the nested-merge step. Read track, confirmed prior dirty files, inspected all six calls and state editing, and recorded snapshot-versus-patch behavior before implementation.
### 2026-10-07 10:55
- Completed Phase 1D: shared raw patch, normalized merge utility, compatible snapshot loader, and ordinary Builder field integration. 82 focused tests passed; final merge suite with cycle guards passed; Admin build and diff check passed. No database writes, deployment, or browser interaction test. Stopped at the boundary.
### 2026-10-07 05:34
- User requested continuation after Phase 1B. Inspected card editor, state setter, contract normalization, Mongoose persistence, Mixed draft storage, plan policy, and preset replacement.
- Recorded the narrow provenance representation and explicit reset semantics before implementation. Existing themes must retain their appearance until a merchant chooses a style/reset action.
- Completed Phase 1C. 74 tests passed, Admin build passed, source/UI diff reviewed, whitespace check passed. No database writes, deployment, or browser interaction verification. Prior Phase 1A/1B work retained.
### 2026-10-07 01:12
- Reviewed revised requirements, current source, and prior audit; baseline passed. Starting regression tests for the bounded persistence repair.
- Regression fixtures now reproduce the three intended failures and pass compatibility checks before source edits.
### 2026-10-07 01:14
- Completed the three schema repairs. Focused suite: 49/49 passed; all nine presets passed configuration round trips. Diff reviewed and whitespace check passed.
- No database operations, deployment, browser tests, or visual parity verification performed. Full Phase 1 and subsequent phases remain pending.
### 2026-10-07 01:25
- User requested the next step. Re-read track and inspected contract, Builder utility/call sites, and renderer. Found duplicated hero resolution, truthiness fallbacks restoring cleared content, and zero focal points coerced to 50 in Builder and renderer.
- Selected one bounded Phase 1B repair. Generic nested merging is deferred until override provenance can be represented safely.
### 2026-10-07 01:30
- Completed shared hero resolution and final renderer corrections. 66 tests passed, including 15 server-render assertions; Admin build passed; diff reviewed and whitespace check passed. No database writes or deployment. Stopped at the Phase 1B boundary.
