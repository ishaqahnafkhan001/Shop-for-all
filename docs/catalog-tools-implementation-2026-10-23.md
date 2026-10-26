# Catalog Tools improvements — 23 October 2026

## Delivered

- Separate Products & bulk edit, Collections, Categories, Import / Export, and Activity views, with active navigation, responsive controls, a wider search field, and independent collection and bulk selections.
- Server-side product search (including SKU and tags), sorting, stock/status/category/visibility filters, 50-row pagination, catalog-wide summary counts, page selection, and session-only saved filter views.
- Product rows show prices, visibility, tags and SKUs, with a separate edit link. The mobile selection bar links directly to bulk fields.
- CSV create and update-by-ID modes, preview and validation, duplicate-header checks, row-level errors with download, bounded file size, busy state, and explicit publication guidance.
- Atomic imports: validation failure saves nothing. Successful operation IDs are recorded transactionally so retrying the same request does not duplicate writes. Update imports preserve variant inventory, images, descriptions, and URLs; below-cost prices are rejected rather than silently corrected.
- All/filtered/selected summary exports, with accurate explanation that this is not a complete backup.
- Bulk before/after pricing review, variant pricing changes, effective-price and below-cost indicators, and stale-preview rejection. Bulk history stores before-values and supports transactional undo only if every affected product is unchanged.
- Independent collection membership, member labels, explicit add/remove controls, unsaved-change warnings before replacing/canceling drafts and leaving the browser, and transactional collection/backlink changes.
- Category search, rename/filter refresh, category cover alt-text editing, and clearer Category details labeling.
- Accessible shared dialogs with named controls, Escape handling, focus trapping and restoration; accessible filter names and keyboard-reachable upload inputs.
- Persistent load errors, retry, stale-response protection, and a catalog-authorized product endpoint that does not require the separate products permission.

## Validation

- 14 focused unit, parser, source-contract and rendering checks passed.
- 5 database integration tests passed against an isolated local MongoDB replica set. Coverage includes atomic import validation, owned-ID updates, retry replay, variant preservation, bulk preview, guarded undo, catalog-only staff access, and rollback after simulated collection-backlink failure.
- One real Chromium workflow test passed across desktop and mobile. It covers collection editing across bulk updates, import preview, category rename, keyboard dialog dismissal/focus restoration, and failed initial loading.
- Admin production build, focused ESLint checks, and diff whitespace checks passed.

The tests use disposable databases. Existing unrelated workspace edits were retained. No deployment was performed.

## Deliberate limits and further work

- Imports are synchronous and capped at 200 rows; bulk edits are capped at 500 products. Background job processing for larger batches remains a separate extension.
- Exports are summaries, not restore-capable full backups. Update imports intentionally do not modify variants, stock, descriptions, images or URLs.
- Saved filter views last for the current mounted session; they are not shared or persisted between logins.
- Activity currently displays the latest 50 bulk edits and their undo status. Imports also produce audit events, but the Activity view does not yet provide a unified history for every catalog action.
- Category covers retain the existing crop behavior. A focal-point/crop editor, configurable product columns, and more advanced filters are not included.
- Browser-close protection and draft-replacement protection are included; a global router navigation blocker for all sidebar links is not included.

Transactional writes require MongoDB configured as a replica set, as existing transactional bulk operations already do. The new CatalogImport and CatalogOperation collections are created automatically; CatalogImport has a unique store/operation-ID index.
