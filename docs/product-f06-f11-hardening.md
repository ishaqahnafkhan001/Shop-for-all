# Product Add/Edit: F06–F11 verification and repairs

20 October 2026. Scope: the implementation present after the earlier hardening pass. No new product features, packages, schema migrations, or production data changes.

| Defect | Before this pass | Current status | Fix required? | Tests |
|---|---|---|---|---|
| F06: optional category | Already repaired | Verified fixed | No; implementation unchanged | Runtime validation, HTTP create with omitted/empty/whitespace/category values, clear and reload, invalid types and length; browser blank create |
| F07: duplicate combinations | Server final-set guard worked; Edit's delimiter key could reject legitimate variants; add-option mishandled legacy whitespace/case aliases | Verified fixed in tested paths | Yes | Existing/new aliases, attribute order, case/whitespace, special delimiters, actual custom-variant UI, SKU normalization, persisted IDs/inventory/metadata |
| F08: variant limits | 500 ceiling existed, but add-option expanded before rejecting, matrix edit expanded twice, Edit lacked projected add-option guard | Verified fixed | Yes | 0/1/500/501 boundaries, direct service pre-expansion guard, create/edit/matrix/add-option/custom, conflicts, at-cap edits, rollback and unchanged logs; browser cap guard |
| F09: threshold zero | Already repaired | Verified fixed | No; implementation unchanged | Add/Edit browser, Joi null/undefined cases, simple and matrix HTTP persistence/reload, threshold crossing, stock/reservation/alert-state preservation |
| F10: media policy | Signature-only checks accepted corrupt files; exact 10 MiB rejected; UI omitted separate variant image sources; metadata edit replaced a video cover | Verified locally; live provider compatibility unverified | Yes | Decoded JPEG/PNG/WebP, real generated MP4/MOV fixtures, invalid/oversized/truncated content, exact 10 MiB multipart, ownership, unique-source quota, grandfathering, save/reload, cleanup, browser video-cover preservation |
| F11: previews | Multiple batches and cover changes worked, but changing the queue recreated retained URLs | Verified fixed | Yes | Instrumented real browser: batch append/dedup, repeated cover selection, reorder/removal, stable URLs and decoded thumbnails, failure/retry, save/cancel/unmount, balanced URL revocation, desktop/mobile |

The prior report and `output/product-add-edit-review/contract-probes.json` are historical evidence. The old diagnostic intentionally asserts the original broken behavior; it is not a current acceptance test.

## Changes in this pass

Paths below are relative to `/Users/user/Downloads/Shop-for-all`.

| File | Reason |
|---|---|
| `ecommerce-admin/src/hooks/useProductImagePreviews.js` | Keep an object URL per selected File, retain URLs across batching/ordering/cover changes, remove stale rendered entries before revocation, release remaining URLs on unmount. |
| `ecommerce-admin/src/utils/productEditor.js` | Collision-free canonical variant keys, normalized projected add-option count, unique gallery/variant image source count. |
| `ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx` | Include distinct custom variant image sources in the existing plan checks and usage text. |
| `ecommerce-admin/src/pages/dashboard/products/EditProduct.jsx` | Reuse canonical keys and projected counts; account for variant images; preserve an existing video cover until an image cover is explicitly chosen. |
| `ecommerce-backend/backend/helpers/variantMatrix.js` | Normalize legacy option dimensions without duplicate aliases; reject excessive projected combinations before expansion; validate existing-row overrides during the single matrix expansion. |
| `ecommerce-backend/backend/services/products/productVariantService.js` | Replace repeated expansion and per-combination linear searches with a canonical existing-variant map; retain the existing stock protection. |
| `ecommerce-backend/backend/config/cloudinary.js` | Decode raster images using the already-installed Sharp dependency; check bounded video atoms and required movie/media structures; await content validation; make the 10 MiB boundary inclusive. Other upload validators retain their existing policies. |
| `ecommerce-backend/backend/tests/product-f06-f11.test.js` | Runtime category, canonical variants, pre-expansion limit, boundary, and zero-threshold regressions. |
| `ecommerce-backend/backend/tests/product-media-validation.test.js` | Exercise actual storage code with valid decoded images, MP4/MOV fixtures, corrupt/truncated data and stream-limit events; only Cloudinary is stubbed. |
| `ecommerce-backend/backend/tests/integration/product-f06-f11.integration.test.js` | Four HTTP/MongoDB scenarios covering the six defects, persistence, rollback, quotas, ownership and cleanup. |
| `ecommerce-backend/backend/tests/fixtures/product-media/sample.mp4`, `sample.mov` | Self-generated 16×16 H.264 video fixtures, two frames each, authored locally with AVFoundation. No customer media. |
| `ecommerce-backend/backend/tests/integration/product-editor.integration.test.js` | Replace the earlier corrupt PNG fixture with a generated decodable PNG so the provider-failure test reaches its intended boundary. |
| `ecommerce-admin/tests/product-editor.test.mjs` | Add meaningful canonical-key, projected-count and unique-media-source regressions. |
| `ecommerce-admin/tests/product-editor.browser.cjs` | Expand the real Add/Edit browser flow and instrument object URL creation/revocation. Replace its corrupt PNG fixture. |

Other dirty files in the workspace belong to the earlier hardening pass and were preserved. Category validation, threshold defaults, stock transactions, pricing, permissions, scheduling, billing plans and database schemas were not rewritten in this pass.

## Verification and actual commands

Node v23.9.0; local disposable MongoDB replica set `f06Hardening`, loopback port 27130, test database names only. Provider uploads/deletions were stubbed. HTTP routing, authentication, permissions, middleware, Joi, services, Mongoose, transactions and database persistence were exercised.

From `/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend`:

```sh
node --test --test-reporter=tap tests/product-f06-f11.test.js tests/product-media-validation.test.js tests/product-editor-hardening.test.js tests/product-content-ai.test.js tests/product-edit-hydration.test.js tests/store-builder-color-product-edit-images.test.js tests/inventory-stock.test.js tests/phase2-scheduling-runtime.test.js tests/catalog-category-collection-management.test.js tests/ai-acceptance-provenance.test.js
```

**68 passed, 0 failed.** Includes runtime and existing contract tests; source assertions are not the sole evidence for F06–F11.

```sh
MONGO_URI_TEST='mongodb://127.0.0.1:27130/product_f06_final_http_test?replicaSet=f06Hardening' node --test --test-reporter=tap --test-concurrency=1 tests/integration/product-f06-f11.integration.test.js tests/integration/product-editor.integration.test.js tests/integration/product-stock-reliability.integration.test.js tests/integration/tenant-isolation.integration.test.js tests/integration/auth-rbac-privacy.integration.test.js tests/integration/checkout-order-safety.integration.test.js tests/integration/scheduled-sales-launch.integration.test.js
```

**27 passed, 0 failed.** Includes pricing, cover, option synchronization, UTC scheduling, inventory replay/rollback, reservation protection, checkout and tenant/role boundaries.

```sh
node --test --test-reporter=tap tests/*.test.js
```

**531 tests: 527 passed, 4 failed.** The same four failures are documented in the earlier baseline: multilingual AI prompt version, low-stock wiring/source expectation, promotion wording expectation, and courier/status-email UI expectation. This is not a green full-repository result. Before this pass the corresponding result was 525 tests, 521 passed, the same four failed.

From `/Users/user/Downloads/Shop-for-all/ecommerce-admin`:

```sh
node --test tests/*.test.mjs
```

**15 passed, 0 failed.**

```sh
MONGO_URI_TEST='mongodb://127.0.0.1:27130/product_f06_browser_test?replicaSet=f06Hardening' PLAYWRIGHT_MODULE='/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright' node --test --test-reporter=tap tests/product-editor.browser.cjs
```

**1 comprehensive browser test passed.** Real Chrome, the actual React Add/Edit pages and API/database. Desktop 1440×1000 and mobile viewport 390×844. Includes failed Add and Edit saves, stock lost-response retry, matrix creation and effective pricing, delimiter-bearing custom variants, cap guards and metadata edit at 500, video cover preservation, and preview lifecycle checks.

```sh
npx eslint src/hooks/useProductImagePreviews.js src/utils/productEditor.js src/pages/dashboard/products/AddProduct.jsx src/pages/dashboard/products/EditProduct.jsx
npm run build
```

**Scoped lint and admin production build passed.** `git diff --check` passed from the repository root. Unrelated existing lint failures were not repaired or represented as passing.

## Preserved behavior and practical limits

Existing Add/Edit workflows remain functional in the tested paths: simple/matrix creation, metadata edits, custom variants/add-option, base and override pricing, inventory adjustments and retries, stable IDs, options, cover selection, optional categories and UTC scheduling. No new product features or dependencies were added.

Threshold semantics were preserved: an explicit variant threshold, including zero, wins. Omitted create values use the existing defaults; null is invalid in the API. Matrix rows without explicit threshold overrides retain the established default 5; Add sends its selected threshold into row overrides. Product-level changes do not silently overwrite existing variant-specific thresholds. Metadata writes preserve stock, reservations and server-managed alert state.

Media checks validate raster decoding and video container structure. They do not constitute a local video codec decoder. Cloudinary remains responsible for actual video processing, and no live credentials or real provider uploads/deletions were used. Desktop Chrome with a mobile viewport does not certify Safari, Firefox, iOS camera formats or every codec variant.

Before production deployment, exercise representative JPEG/PNG/WebP and MP4/MOV files through the configured Cloudinary account in an isolated staging product, including provider rejection and cleanup. Confirm native Sharp is available in the deployment runtime as already required by the backend. Deploy the admin/backend changes together. No migration or data cleanup is required. The four existing full-suite failures remain outstanding; passing the focused tests is not a blanket production-readiness certification.
