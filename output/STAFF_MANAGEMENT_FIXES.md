# Staff management fixes — 28 October 2026

## Changes

- `ecommerce-admin/src/pages/dashboard/StaffPermissions.jsx`: partial permission patches, response-driven permission state, synchronous pending guard, disabled mutation controls, status-only activation payloads, changed permissions only in profile edits, labelled creation inputs, minimum password length, persistent load error/retry, native modal dialog, Deactivate wording.
- `ecommerce-backend/backend/config/staffPermissions.js`: extracted existing backend permission keys/defaults as a lightweight common contract.
- `ecommerce-backend/backend/services/staff/staffCapacityService.js`: consumes common contract and rejects malformed/coerced permission values.
- `ecommerce-backend/backend/validations/userValidation.js`: staff-specific complete allowlist, strict boolean updates, bounded profile fields, valid statuses, minimum eight-character staff creation password. Public registration schema remains unchanged.
- `ecommerce-backend/backend/controllers/userController.js`: transactional creation, update and deactivation including identity/membership/permissions/audit writes; tenant-scoped membership updates; conflict responses; session-version increment on suspension; staff-only explicit listing projection. Existing role authorization and quota gates retained.
- `ecommerce-backend/backend/tests/staff-management.test.js`: real request schema and malformed permission regression tests in addition to existing checks.
- `ecommerce-backend/backend/tests/integration/staff-management.integration.test.js`: actual HTTP creation/list/update/tenant isolation, rollback fault injection, concurrent permission patches, suspension/reactivation session invalidation.

## Verification

- `node --test tests/staff-management.test.js`: 5/5 pass.
- Isolated replica-set integration suite: 4/4 pass. `output/staff-integration.log` contains results. Used the verified task-owned `sfa-adaptive-phase5` Docker container, tmpfs storage, loopback port 27028 and disposable `atelier_acceptance_c085454b_test` database. Existing isolated acceptance preload blocks external transports; no real account or notification operations.
- Targeted StaffPermissions ESLint: pass. Admin production build: pass. Controller syntax and scoped `git diff --check`: pass.
- Native dialog behavior has not been manually browser-verified in this task. Full repository test suite not rerun.

## Compatibility / deployment

Staff writes now require MongoDB transaction support (replica set or compatible sharded deployment). No non-atomic fallback is used. Concurrent conflicting updates return 409 and must be retried after refresh. Listing remains an array but now contains only staff and approved display fields; the sole repository consumer is the Staff page.

Existing account-password matching remains the current onboarding contract. Invitation/acceptance email workflows and forced initial password changes are not implemented here; they require a separate coordinated onboarding change. No dependency installation, production migration, real staff messages, deployment, commit or push.
