# Catalog Tools review

Date: 23 October 2026

## Scope and conclusion

Reviewed the current local implementation of `/dashboard/catalog-tools`, its CSV parser, product import/export and bulk-update handlers, collection update flow, category editor, permissions, shared modal, and existing catalog tests. This is a source-based functional and usability review, not a live browser or production-data audit. Existing workspace changes were left intact.

The feature has a useful foundation: filtering, variant-aware low-stock summaries, bulk field validation, hidden-selection warnings, transactional bulk product updates, collection CRUD, reviewed AI suggestions with undo, and category cover/SEO management. The first investment should be data correctness and clear operation boundaries, followed by navigation and performance.

## Highest-priority fixes

### 1. Make CSV import behavior match its promise — high priority

Evidence: `ecommerce-admin/src/pages/dashboard/CatalogTools.jsx` describes import as creating or updating products. `ecommerce-backend/backend/controllers/productController.js:1196` builds new documents and calls `insertMany`; exported IDs are ignored. Export/edit/import therefore cannot update existing products, and may create duplicates or encounter uniqueness errors.

Improvement: offer explicit Create new and Update existing modes. Match updates by a stable shop-scoped product ID, with a clearly defined SKU alternative if needed. Show a validation preview with create/update/skip/error counts before writing. Until updates exist, label the action as create-only.

Acceptance: importing an edited export updates the same IDs in update mode; repeated submission does not duplicate products; foreign or missing IDs produce actionable row errors.

### 2. Report partial imports and make retries safe — high priority

Evidence: import uses `insertMany(docs, { ordered: false })`, catches failures as a generic 400, and provides no row result report. Some writes can succeed before an error. The UI reloads only after a successful response, so successful partial inserts can remain invisible. It has no import-in-progress guard, and its success count comes from input length rather than the server result.

Improvement: validate all rows before writing and choose a documented atomic or partial-success policy. Return created/updated/skipped/failed rows and downloadable errors. Add an operation ID, duplicate-submission protection, progress state, and an explicit recovery path. Refresh after partial success.

Acceptance: mixed valid/invalid input reports exactly what persisted; retrying failed rows does not recreate successful rows; double-clicks cannot start duplicate jobs.

### 3. Separate collection membership from bulk selection — high priority

Evidence: `CatalogTools.jsx` uses the same `selected` state for product bulk edits and collection membership. `beginCollectionEdit` fills that selection, successful bulk updates clear it, and `saveCollection` always submits it as `productIds`.

Failure scenario: edit a collection, bulk-update its selected products, then save the still-open collection editor. The successful bulk action has cleared the selection, so the collection is saved with no products. Clearing selection manually has the same membership effect.

Improvement: use independent bulk-selection and collection-member state. Copy the selection when starting a new collection. Give the collection editor its own member list and explicit add/remove controls. Warn before discarding unsaved collection changes or replacing an active edit.

Acceptance: bulk updates and Clear selection cannot alter an open collection draft; saving a metadata-only edit preserves all members.

### 4. Stop presenting the CSV as a full backup — high priority

Evidence: export includes summary fields but omits descriptions, images, individual variants/SKUs, collection relationships, and visibility. Import creates one default variant and placeholder content. The export button tooltip calls this a backup.

Improvement: label it a product-summary export, or implement a versioned restore-capable format with product and variant records. Offer All products, Filtered products, and Selected products export scopes; currently export always downloads the whole catalog.

Acceptance: documented field coverage matches the export, and any advertised restore operation preserves variant identity, stock, images, descriptions, and visibility.

### 5. Keep category renames and product filters consistent — medium priority

Evidence: `saveCategorySeo` updates category state after a rename but does not refresh products or migrate `categoryFilter`. Product filtering compares the cached category string exactly.

Impact: the new category name can show no products until refresh, and an existing filter can retain an obsolete value.

Improvement: refresh affected products and categories together, translate the active filter, and preferably use stable category IDs for relationships. Rename this dialog to Category details because it edits more than SEO.

Acceptance: renaming a filtered category immediately preserves the visible products and updates their labels.

## Improvements across the full tool

| Area | Current limitation | Recommended improvement |
| --- | --- | --- |
| Navigation | Products, bulk editing, collection editor, collections, and category covers share a long page; Products stays visually active in anchor navigation. | Use Products, Collections, Categories, and Import/Export views with accurate active states. Keep filters and selection when switching intentionally. |
| Product discovery | Search covers title, category, and status only; there is no sorting control. | Search SKU and tags; add price, visibility, missing-image, and collection filters; add sort options and saved views. |
| Product inspection | Rows show stock and discount but omit actual prices, SKU, tags, and visibility; clicking selects instead of opening details. | Add configurable table columns and a distinct product-detail link or drawer. Show variant-level stock on demand. |
| Bulk-edit review | Confirmation lists requested operations but not their resulting values. | Preview old/new prices, discounts, effective selling prices, affected variants, and hidden selections before applying. Flag below-cost results using store policy. |
| Bulk recovery | The handler records an audit event but this page has no operation history or bulk rollback. | Add an activity view with actor, timestamp, affected IDs, outcomes, and stored before-values. Support guarded undo where no subsequent edits conflict. |
| Large catalogs | The page fetches every product page and renders every matching row; list height only creates a scroll container. | Move filtering, sorting, pagination, and summary counts to the server. Use virtualization if keeping long lists; define Select page versus Select all matching explicitly. |
| Loading/errors | Section failures appear in a toast; initial product failure can appear as No products yet. Overlapping loads have no stale-response protection. | Add persistent section errors and retry buttons, distinguish empty from failed, and cancel or ignore obsolete requests. |
| Collections | Membership editing depends on the general product selector; saving collection and product backlinks involves separate writes. | Add a dedicated member picker, member counts and ordering, dirty-state protection, and transactional relationship updates. Test failure between collection save and backlink updates. |
| Category covers | Cover changes are available, but there is no crop/focal-point or alt-text editor in this page. | Show storefront crop previews, allow focal-point and alt-text editing, and provide a searchable category list for larger catalogs. |
| AI assistant | Review, field-specific apply, stale-input checks, and undo already exist. | Preserve these safeguards; show storefront/search previews and verify comparison field names align with generated names. Keep AI secondary to the normal editor. |
| Accessibility | Filters lack explicit accessible labels; upload inputs are hidden inside labels; shared Modal lacks dialog semantics, focus trapping/restoration, Escape handling, and a named close button. | Add accessible names, keyboard-operable upload buttons, and a shared accessible dialog implementation. Test keyboard-only operation. |
| Staff access | The page requires `catalogTools`, while its product-list API independently requires `products`. | Define and enforce the intended permission dependency, or provide a catalog-authorized read endpoint. Explain unavailable capabilities rather than showing a misleading empty list. |

## Additional import correctness work

- Validate required and duplicate headers, allowed columns, numeric values, enums, and row limits before submission. The parser currently checks quoting and column counts but silently overwrites duplicate header keys.
- Do not silently raise selling price to buying cost: the handler currently applies `Math.max(sellingPrice, buyingPrice)`. Report invalid values or require explicit acknowledgement of corrections.
- Preserve numeric zero consistently. Numeric `lowStockThreshold: 0` is replaced by 5 by the backend's `||` fallback, although CSV string `"0"` currently survives it.
- Do not imply imports are drafts: incoming Published status is accepted. Make publication intent explicit in the preview.
- Include import operations in catalog cache invalidation and audit history; those follow-ups are present for bulk edits but absent from the inspected import handler.

## Recommended delivery order

1. **Correctness:** separate collection membership state; correct CSV labels and import semantics; add partial-result handling and safe retries; synchronize category renames.
2. **Daily workflow:** dedicated views, richer product rows, searchable membership picker, price-change preview, accessible dialogs, persistent error states.
3. **Scale and recovery:** server-side queries and summaries, asynchronous large jobs, operation history and guarded undo, saved filters, and a documented complete export format if restoration is required.

## Verification

Ran:

```sh
node --test ecommerce-admin/tests/catalog-csv.test.mjs ecommerce-backend/backend/tests/catalog-bulk-updates.test.js ecommerce-backend/backend/tests/catalog-category-collection-management.test.js
```

Result: 11 tests passed, 0 failed. These include parser/unit checks, source-structure assertions, and a storefront rendering check. They do not establish live database import behavior or browser usability.

Add behavioral coverage for export-update-import, partial import failure and retry, duplicate submission, collection editing during bulk changes, category rename with active filters, restricted staff access, failed initial load, keyboard dialog interactions, and large-catalog selection semantics. No application code was changed during this review.
