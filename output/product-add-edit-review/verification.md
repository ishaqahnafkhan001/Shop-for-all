# Product editor review verification

Date: 20 October 2026.

## Existing backend tests

Working directory: `/Users/user/Downloads/Shop-for-all/ecommerce-backend/backend`.

```sh
node --test tests/product-edit-hydration.test.js tests/store-builder-color-product-edit-images.test.js tests/inventory-stock.test.js tests/product-content-ai.test.js tests/catalog-category-collection-management.test.js tests/phase2-scheduling-runtime.test.js
```

Result: **39 tests, 39 passed, 0 failed, 0 skipped**. Node v23.9.0. A MODULE_TYPELESS_PACKAGE_JSON warning was emitted for the storefront theme module; it did not fail the run.

Coverage included source-level hydration/media wiring guards, category/collection guards, atomic stock decrement checks, AI content utilities and contracts, scheduling/sale guards, and shared theme behavior. Passing these checks did not validate all editor interactions.

## Existing admin tests

Working directory: `/Users/user/Downloads/Shop-for-all/ecommerce-admin`.

```sh
node --test tests/ai-merchant-workflows.test.mjs tests/ai-operation.test.mjs tests/catalog-csv.test.mjs
```

Result: **9 tests, 9 passed, 0 failed, 0 skipped**.

## New read-only diagnostic probes

Working directory: repository root.

```sh
node output/product-add-edit-review/verify-contracts.cjs > output/product-add-edit-review/contract-probes.json
```

Result: exit 0; **12 diagnostic observations reproduced**. The assertions deliberately establish current problematic behavior and one latent risk. They are not passing regression tests for desired behavior.

| Probe | Observation |
|---|---|
| P01 | Metadata payload without existing stock rejected |
| P02 | Simple variant empty SKU/attributes rejected on update |
| P03 | Hydrated inventory alert fields rejected on update |
| P04 | Optional category sent as empty string rejected |
| P05 | Existing cover wins over newly selected index |
| P06 | Base simple-product price change retains old effective variant price |
| P07 | Add-option leaves product options and storefront selection stale |
| P08 | Relaxing only validation would expose omitted-stock reset to zero |
| P09 | Duplicate combination against an existing variant accepted by validation/service/model casting |
| P10 | Matrix accepts 210 combinations; flat array rejects 201 |
| P11 | Simple low-stock threshold zero becomes five |
| P12 | Timezone-free Add-style timestamp parses differently under UTC and Asia/Dhaka |

The cover probe evaluates the actual resolver extracted from the controller without importing or starting the HTTP application. Service probes use in-memory Mongoose documents; they do not call save or connect to MongoDB. The timezone probe uses child processes with explicit TZ values.

## Boundaries

No authenticated UI walkthrough, Cloudinary upload/provider call, Mongo-backed integration run, or live scheduled worker execution was performed. No production-readiness claim follows from these checks. No application code was modified.
