# Product Activity & Recovery Center

This enhancement extends the existing Smart Product Publishing manager, IndexedDB database, React context, Axios client, and authenticated submission receipt endpoint. It introduces no dependencies, backend API changes, collections, queues, external services, or Edit Product changes.

## Merchant experience

The Products page has a compact **Unfinished products** entry with a live count and a short breakdown of products saving, needing attention, or awaiting confirmation. The existing dashboard Product Activity trigger opens the same center from other dashboard pages.

Product Activity is a side drawer on desktop and a full-height sheet on mobile. It has two tabs:

- **Unfinished** contains every visible current-account/current-shop submission that has not been confirmed saved.
- **Recently Saved** contains the existing limited history of up to ten confirmed submissions, with verified product links and no unnecessary form/media payloads.

Cards show the product name, a local image thumbnail when available, submission date/time, a short explanation, status, relevant actions, and the last known server or connectivity problem. Long names wrap. Missing attachments are named. Records older than thirty days show a review reminder and remain available.

| Merchant status | Existing internal state or evidence | Action |
| --- | --- | --- |
| Saving | Preparing, uploading, or saving with an active browser operation | View progress |
| Saved | Backend-confirmed product ID | View Product |
| Needs attention | Definitively failed receipt and editable recovery | Review & Retry |
| Check status | Interrupted, unavailable, malformed, or otherwise unconfirmed outcome | Check Status |

**View progress** shows the current phase and actual upload percentage when the browser supplies measurable transfer progress. A percentage measures transfer to the API, not subsequent media processing or database work. There are no fabricated processing percentages.

**Check Status** is GET-only. It cannot upload, publish, or retry a product. When reconciliation permits an original-payload retry, a secondary **Review original** action opens the preserved read-only form with a separate **Retry original submission** button. Editing remains blocked until a definitive rejection.

## User journeys

### Successful saving

Save Product and Save & Add Another retain their existing durable handoff and immediate navigation. After backend confirmation, the submission moves to Recently Saved, browser media/form payloads are released, and the current catalog query refreshes without resetting search, filters, sort, page, or page size. The existing toast says **Product added successfully** and includes a verified **View Product** action.

### Confirmed failure

The center shows Needs attention, the original problem, and Review & Retry. Opening that action reloads the exact UUID in the active user/shop scope and rechecks the server receipt. The original Add Product form restores descriptions, SEO, publication settings, prices, stock, variant details, collections, seller facts, benefits, specifications, notes, images, videos, and cover selection. Correction uses the existing submission UUID and existing idempotent request flow.

Missing attachments are identified by filename or position. A usable file in the preserved multipart payload can restore a missing snapshot copy. If a gallery slot really is unavailable, surviving cover and variant image references are remapped to the same surviving files; a missing variant image selection is explicitly flagged for review. Valid preserved fields and files remain available. Corrupt structural data is retained but is not silently substituted into an editable form. Its status can still be checked and its local recovery can be discarded after a confirmed rejection.

### Uncertain status

The center says Check status, preserving the original snapshot, payload, fingerprint, and UUID. A status request validates the response contract, receipt state, and any product identifier before changing the visible outcome. Processing and unknown outcomes never become confirmed failure merely because a browser request timed out.

Concurrent status actions for the same product share one request. Authentication failures pause automatic submission and keep recovery locked; a successful authenticated scoped check can establish the original session again. A full-page Sign in again link on the recovery screen revalidates authentication rather than relying on a stale cached user.

No continuous server polling was introduced. Dashboard initialization performs bounded status reads for persisted unfinished entries. Broadcast messages and window focus/visibility changes refresh local state; a local timer notices expired browser claims without repeatedly polling the server.

### Refresh and dashboard closure

IndexedDB restores the currently authenticated actor/shop's records after refresh or reopening the dashboard. Initialization performs no product POSTs. Active records owned by another open tab remain Saving. A stale or interrupted browser claim becomes Check status and requires reconciliation.

Uploads and JavaScript do not continue reliably after a tab closes. The existing backend may finish a request that already reached it; its receipt remains authoritative. Browser recovery is available only in the same browser profile and origin while its storage remains intact.

### Discard recovery

Only a definitively rejected, idle submission offers Discard recovery. A separate confirmation explains that locally preserved form data and attachments will be removed and that a shop product will not be deleted. Cancel retains the record.

Confirmation rechecks the authenticated receipt and removes only that scoped local record using its current storage revision. Active, unknown, completed, unauthorized, or concurrently modified records cannot be discarded through this action. It never sends a product DELETE or removes the backend receipt. A concurrent retry claims a new revision before POST, so an older discard cannot remove its recovery data.

## Cross-tab and storage behavior

The existing `shop-product-submissions` IndexedDB database and `submissions` store remain in use. There is no second recovery database.

Each record has a business revision. IndexedDB read/write transactions enforce compare-and-set updates and conditional deletion across tabs. Existing records cannot be recreated by a delayed update after deletion. Confirmed success cannot be overwritten with an old pending snapshot or restored blobs.

A short browser claim coordinates an active submission: a thirty-second lease renews every ten seconds while its owner is saving. Other tabs cannot edit, retry, or discard that live claim. The backend's existing actor/shop-scoped unique receipt, admission lease, owner fencing, fingerprint rules, and transaction remain the final duplicate-prevention authority.

`BroadcastChannel` transmits only a version, scope, and record identifier. Receiving tabs reload their own scoped IndexedDB records. Forms and files are not broadcast. Local refresh on focus/visibility provides an additional synchronization path. Expired tab leases are reclassified locally without claiming the server outcome.

Notification ownership is claimed atomically in the existing record. Two tabs can display the confirmed result and refresh their catalogs while only one claims its success toast. Repeated checks do not create repeated status toasts. Unknown outcomes use **We couldn't confirm your product yet — Check Status**; definitive failures use **Couldn't save your product — Review & Retry**. Toasts use the existing react-hot-toast system.

Storage failures keep an unsaved form open and explain that recovery could not be committed. Confirmed backend success remains success even if later local storage writes fail. Its in-memory confirmation cannot be downgraded by a stale storage read or release.

### Retention choices

- Successful history retains the existing maximum of ten lightweight records, releasing form/media data after verified success.
- Thirty days is an **age-for-review reminder**, not an expiry guarantee or automatic deletion policy.
- Existing unfinished records are never silently purged.
- New pending records are capped at one hundred per current actor/shop on this browser. At that limit, the merchant must review or explicitly discard a confirmed rejected recovery; the current unsaved form remains open. Existing older records over this limit are retained.
- Device/browser quota may impose a lower practical limit. Clearing storage, browser eviction, private-session closure, switching browser profiles, or device loss can remove local recovery sooner.

## Security and integrity review

The enhancement keeps the existing backend receipt contract and authorization behavior unchanged. Tenant and actor headers remain expected-session checks, not authorization inputs. Every receipt request continues through vendor authentication and product permission checks.

The recovery store and visible lists use both actor and shop scope. Scope changes remount and dispose the old manager, aborting its requests. Old responses and foreign-scope broadcast events cannot update the new account's activity. Only valid twenty-four-character hexadecimal product IDs become product links.

There are no credentials, cookies, or access tokens in new recovery metadata. Thumbnails use local image Blobs and release object URLs on removal, tab change, and unmount; the center does not load arbitrary recovery URLs.

Safe retries remain explicit and preserve the original UUID/payload while an outcome is uncertain. Definitively rejected corrections keep the original logical UUID. The existing backend still controls validation, upload ownership, stock logs, publication rules, and idempotent product creation. No pricing, inventory, storefront, Store Builder, or Edit Product behavior was changed for this enhancement.

## Exact files changed for this enhancement

The working tree also contains earlier Smart Product Publishing and deletion-audit work. The following inventory is specific to this Recovery Center enhancement.

| File | Purpose |
| --- | --- |
| [ProductActivity.jsx](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/components/products/ProductActivity.jsx) | Drawer/sheet, tabs, cards, thumbnails, progress, checks, discard confirmation, focus management |
| [ProductList.jsx](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/pages/dashboard/products/ProductList.jsx) | Compact unfinished count and entry; existing catalog controls preserved |
| [ProductSubmissionContext.jsx](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/context/ProductSubmissionContext.jsx) | Shared drawer controls, existing toasts with actions, catalog revision, scoped local synchronization |
| [productSubmissionManager.js](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/services/productSubmissionManager.js) | GET-only deduplicated reconciliation, safe discard, tab claims, notification claims, stale-result protection |
| [productSubmissionStore.js](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/services/productSubmissionStore.js) | Existing IndexedDB transactions with revisions, conditional deletion, tab coordination, notification claims, capacity guard |
| [productSubmissionRecovery.js](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/services/productSubmissionRecovery.js) | Safe recovery inspection/normalization and named missing-media/age warnings |
| [productActivity.js](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/utils/productActivity.js) | Four user-facing statuses, counts, descriptions, verified IDs, measurable progress |
| [AddProduct.jsx](/Users/user/Downloads/Shop-for-all/ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx) | Scope-safe recovery, original problem, named missing media, locked uncertain form, separate Check Status/original retry actions |
| [product-activity.test.mjs](/Users/user/Downloads/Shop-for-all/ecommerce-admin/tests/product-activity.test.mjs) | Five status/count/progress/presentation tests |
| [product-submission-recovery.test.mjs](/Users/user/Downloads/Shop-for-all/ecommerce-admin/tests/product-submission-recovery.test.mjs) | Four missing-media, corrupt-record, preservation, gallery-reference, and age-review scenarios |
| [product-submission-manager.test.mjs](/Users/user/Downloads/Shop-for-all/ecommerce-admin/tests/product-submission-manager.test.mjs) | Additional reconciliation, session, discard/race, notification, and storage-success tests; receipt mocks match the real success contract |
| [product-activity.browser.cjs](/Users/user/Downloads/Shop-for-all/ecommerce-admin/tests/product-activity.browser.cjs) | Actual drawer/recovery/two-tab/IndexedDB/server workflow and accessibility checks |
| [product-editor.browser.cjs](/Users/user/Downloads/Shop-for-all/ecommerce-admin/tests/product-editor.browser.cjs) | Existing assertions adapted to the new activity drawer and actionable toast |
| [product-publishing.browser.cjs](/Users/user/Downloads/Shop-for-all/ecommerce-admin/tests/product-publishing.browser.cjs) | Existing workflow assertions adapted to tabs and separate check/original retry; query/page preservation retained |
| [smart-product-publishing.md](/Users/user/Downloads/Shop-for-all/docs/smart-product-publishing.md) | Link to this enhancement report while retaining the initial implementation record |
| [This report](/Users/user/Downloads/Shop-for-all/docs/product-activity-recovery-center.md) | Current behavior, files, safety properties, retention choices, verification, and limitations |

No backend files were changed for this enhancement. Existing backend receipts and their tests were reused.

## Verification

Integration tests used only the disposable local MongoDB replica set on port 27132, with separate named test databases for new browser, regression browser, and HTTP tests. Browser upload/destroy provider calls were stubbed; authentication, endpoints, file handling, IndexedDB, and MongoDB remained real. No live email, SMS, payment, or Cloudinary operations were intentionally sent.

| Check | Result |
| --- | --- |
| Admin unit tests, including recovery, status presentation, and manager behavior | **47 passed** |
| Backend product/media/inventory/scheduling/content unit regressions | **68 passed** |
| Publishing, Add/Edit, variants/media, stock, tenant, and auth HTTP regressions | **24 passed** |
| New Recovery Center browser scenario | **1 passed** |
| Existing Add/Edit and Smart Publishing browser scenarios | **2 passed** |
| Admin production build | **Passed** |
| ESLint across all changed frontend runtime files | **Passed** |
| `git diff --check` | **Passed** |
| Full admin lint | **18 errors and 4 warnings in unchanged files** |

The full lint issues remain in existing Topbar, GrowthCenter, Store Builder, and theme fixture files. They were not suppressed, and existing assertions were retained. The backend has no separate build/lint script; its runtime was unchanged in this enhancement and its relevant executable suites passed.

The new browser scenario exercises scoped refresh reconstruction without POST, exact counts, four statuses, GET deduplication, server-confirmed completion, safe discard cancellation/confirmation, complete form/media correction under the original UUID, missing filenames, real storage errors, two simultaneously open dashboards, one success toast, cross-tab discard, session expiry and account switching, keyboard focus cycling/return, and a 390-pixel sheet. It also uses real IndexedDB transactions to test stale-write rejection, conditional delete versus a new claim, no resurrection after deletion, atomic notification claims, and retaining all one hundred records when rejecting the next new recovery. The existing publishing scenario retains its filter/sort/page-two refresh assertions, and the Edit regression retains its media, pricing, stock, and recovery assertions.

Commands (run from the respective project directory):

```sh
# ecommerce-admin
node --test tests/*.test.mjs
npx eslint src/services/productSubmission*.js src/context/ProductSubmissionContext.jsx src/pages/dashboard/products/AddProduct.jsx src/components/products/ProductActivity.jsx src/pages/dashboard/products/ProductList.jsx src/utils/productActivity.js
npm run build
npm run lint

# Requires verified disposable MONGO_URI_TEST and available Playwright/Chrome.
node --test tests/product-activity.browser.cjs
node --test --test-concurrency=1 tests/product-editor.browser.cjs tests/product-publishing.browser.cjs

# ecommerce-backend/backend, with verified disposable MONGO_URI_TEST
node --test --test-concurrency=1 tests/integration/product-publishing.integration.test.js tests/integration/product-editor.integration.test.js tests/integration/product-f06-f11.integration.test.js tests/integration/product-stock-reliability.integration.test.js tests/integration/tenant-isolation.integration.test.js tests/integration/auth-rbac-privacy.integration.test.js
node --test tests/product-f06-f11.test.js tests/product-media-validation.test.js tests/product-editor-hardening.test.js tests/product-content-ai.test.js tests/product-edit-hydration.test.js tests/store-builder-color-product-edit-images.test.js tests/inventory-stock.test.js tests/phase2-scheduling-runtime.test.js tests/catalog-category-collection-management.test.js tests/ai-acceptance-provenance.test.js

# Repository root
git diff --check
```

## Remaining limits

Recovery is browser-local and is not a cross-device backup. Browser storage may disappear at any time; the UI states this explicitly. No service worker or server job was added to keep browser uploads running after closure.

Cross-tab synchronization uses BroadcastChannel when supported plus focus/visibility refresh. Background tabs may delay timers; the server receipt and admission fencing remain authoritative even when a browser claim expires. Unconfirmed records require a status check and may wait for the existing backend admission lease before original retry is permitted.

Corrupt records are retained and safely presented; unreadable form structure is not silently treated as a complete editable product. Missing or corrupt original wire payloads cannot use automatic original-payload retry. A confirmed rejection can still be discarded locally after verification.

Accessibility verification uses keyboard/browser behavior, native modal semantics plus explicit focus wrapping, and mobile viewport/layout checks. It does not represent a full screen-reader compatibility certification. Real Cloudinary production network behavior remains outside the stubbed provider tests.

Nothing was deployed, published, committed, or pushed.
