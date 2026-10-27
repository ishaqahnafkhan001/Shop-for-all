# Adaptive Store Builder — Phase 0 evidence

Date: 20 October 2026. Revision: `54a04b6d34939dab3b9cc6f0139a753116edbd32`.

**Phase 1 readiness: PASS for review of inactive contracts. Production release: BLOCKED by existing gates. Phase 1 has not started.**

The detailed report, exact commands and failure register are at the top of [track.md](C:/Users/user/WebstormProjects/Shop-for-all/track.md).

## Changed test files

- [Regression suite](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/adaptive-builder-baseline.test.js): 18 tests, no update-snapshot mode.
- [Read-only capture helper](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/helpers/adaptive-baseline.cjs): reuses existing synthetic route/Builder fixtures and installed React/Rolldown. Fixed SSR clock/timezone, restored after capture. No filesystem writes or real transports.
- [Frozen manifest](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/fixtures/adaptive-builder/baseline-manifest.json): ten definition/configuration contracts and 370 exact rendering cases. Nine complete snapshots are referenced from the untouched existing legacy fixture; the complete Atelier snapshot is embedded.

Run from `ecommerce-backend/backend`:

```powershell
node --test tests/adaptive-builder-baseline.test.js
```

Expected: 18/18 pass. A failure should be investigated against this baseline; do not regenerate expectations to hide drift. The existing `atelier-legacy` capture scripts are writers and were not executed as writers in this task.

## Evidence index

| Artifact | Meaning |
|---|---|
| `task-start.json` | Initial Git revision/worktree and 743 protected byte hashes. |
| `integrity.json` | Zero changed protected files; screenshot digests checked. |
| `results.json` | Machine-readable results, commands, classifications and limitations. |
| `artifact-sha256.json` | SHA-256 inventory of retained test/evidence files; excludes itself. |
| `home-parity.json` | Twenty Gallery/Builder/live-home exact SSR comparisons, ten themes × full/limited access. |
| `legacy-tests.log` | 172/172 existing immutable/configuration/route/commerce checks passed. |
| `adaptive-tests-final.log` | Final 18/18 pass with an independent process timezone. |
| `extended-tests.log` | 142/142 existing Builder/presentation/commerce/version/preview checks passed. |
| `backend-all.log`, `preexisting-failures.log` | 784/789 overall; the same five failures reproduce without the new suite. |
| `mongo-integration.log`, `builder-integration.log` | 8/8 and 10/12 respectively, on verified disposable MongoDB with external transports blocked. |
| `admin-lint.log`, `storefront-lint.log` | Existing 18 Admin errors/4 warnings; storefront clean. |
| `admin-build.log`, `storefront-build.log` | Both production builds passed. No deployment. |
| `diff-check.log` | Git whitespace validation passed. |
| `browser/homepage-evidence.json` | Forty homepage iframe captures and computed layout/style observations across widths 1180, 768, 390 and 320. No document overflow observed. |
| `browser/*-desktop.png`, `*-tablet.png`, `*-mobile.png`, `*-smallMobile.png` | Viewport reference images for all ten themes. These are not a pixel-diff test or a full below-fold traversal. Atelier carousel paused, slide 1 selected. |
| `browser/atelier-cart-zero.png` | Actual mocked product selection/cart: selected variant retains price 0. |
| `browser/atelier-checkout-otp.png` | Required fields/consent lead to phone-verification gate, before sending a code or placing an order. |
| `browser/atelier-tracking-verified.png` | Fixture-only access verification reveals Pending order, cancellation action and ineligible return state. |

## Limits and future gates

No production configuration/data was read for theme snapshots. No source, preset, API, environment or dependency was changed. No live notifications, orders, payment/courier operations, publication, deployment, commit or push occurred. MongoDB writes were synthetic and confined to a task-owned tmpfs replica set that has been removed. The task fixture server is stopped.

Browser tools became disabled in Work settings after these captures. Complete all-theme/all-page interactions, keyboard/focus/a11y, cross-browser behavior, delivered/eligible-return/cancel completion, browser account submissions, cold hydration and console-error verification remain open. Computed font-family alone does not establish downloaded-font availability. Current SSR cart/checkout snapshots use the pre-existing preview seam; real hooks/controllers and HTTP tests provide separate evidence.

The two existing Builder integration failures, five existing backend failures and Admin lint failures remain unresolved. Retained revisions can outlive the seven-day retired-media grace, so recovery after physical deletion is not established. Representative performance and live provider delivery were not tested.

Before v5: deploy readers/declared graph storage first; preserve v4 outputs and legacy routes; reject older-client replacement of newer graphs across every write path; keep SEO/branding updates graph-preserving; add mixed-version, transactional publication/restore and media-retention tests. No v5 schema or adaptive renderer is implemented here.

Stop after Phase 0. The next task requires review and authorization, and starts with inactive page-template, block-registry and responsive-style contracts only.
