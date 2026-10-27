# Phase 6–7 follow-up acceptance

21 October 2026. Continues the accepted implementation; does not restart architecture work. The repeated attachment's scope was compared with current reports. Stop conditions, immutable baselines and default-off real merchant rollout remain in force.

## Changes in this follow-up

| Exact source path | Confirmed issue / correction |
|---|---|
| `packages/storefront-renderer/presentation/TrackingView.jsx` | Non-Atelier adaptive cancellation/return shells had a name but no dialog role/modal semantics and did not enable the existing focus helper. Enable the existing helper for adaptive as well as Atelier. Adaptive busy actions cannot be hidden via close/secondary dismiss; return-proof groups retain exposed remove buttons instead of treating the entire group as an image. |
| `packages/storefront-renderer/presentation/CategoryView.jsx` | Mobile filter had dialog semantics but left keyboard focus outside it. Use the existing focus helper for adaptive paths; close a drawer on crossing the existing 1024px desktop boundary so hidden content cannot retain focus/body scroll lock. Existing filtering/controller logic stays unchanged. |
| `ecommerce-backend/backend/tests/adaptive-release.test.js` | Five new regression cases: cancellation/return shells at idle/busy plus proof-group removal semantics. Tests render actual shared adaptive markup using synthetic fixtures, not string checks of implementation source. |

Reports and `track.md` also updated. Full task-relative source manifest remains `../changed-files.txt`; checkpoint hashes/copies for this follow-up are in `task-start.json` and `source-at-start/`. The overall phase-start comparison remains authoritative. No original theme definition, commerce API, dependency, environment file, production data or prior Phase 0–5 artifact changed.

## Verification

| Command / check | Result | Evidence |
|---|---|---|
| New four dialog cases against old markup | 3 original tests pass / 4 new fail, confirming defect | `dialog-before.log` |
| Same four after correction | 7/7 PASS | `dialog-after.log` |
| Final compatibility command from parent report | **847/847 PASS**, including five new cases | `compatibility.log`, `home-parity.json` |
| Full backend `node --test 'tests/*.test.js'` | **1300/1305**, same five historical failures | `backend-full.log` |
| Production Next `node node_modules/next/dist/bin/next build --webpack` | PASS | `storefront-build.log` |
| Admin `node node_modules/vite/bin/vite.js build --outDir ../output/adaptive-builder/phase6/followup/admin-dist --emptyOutDir=false` | PASS | `admin-build.log` |
| Storefront full lint | PASS | `storefront-lint.log` |
| Admin full lint | Same 13 historical unrelated errors / 0 warnings | `admin-lint.log` |
| Changed-source tooling | 55 files, 16 errors/1 warning all pre-existing, zero introduced; 20 CJS/ESM plan/CSS cases PASS | `tooling.log`, parent `tooling-results.json` |
| Actual HTTP / Next / recovery integration | **1/1 PASS** against rebuilt application | `mongo-release.log` |
| Existing full relevant Mongo suite | Prior final **62/62 PASS** retained; no persistence changes in follow-up | `../mongo-final.log` |
| Config and integrity | See final exit/integrity artifacts; no rollout activation | Parent `config-check.log`, `integrity.json`, `git-diff-check.log` |

The full backend's five failures remain AI chargeability/voice and historical low-stock/promotion/confirmed-order source assertions; unrelated code/assertions were not rewritten. Original broader integration caveats remain recorded in the parent report.

Integration uses only the inspected task-owned official Mongo 7 container: label `sfa.task=adaptive-phase5`, loopback 27028, tmpfs `/data/db`, primary `rs0`. Command:

```powershell
$env:NODE_ENV='test'
$env:SFA_ISOLATED_ACCEPTANCE='c085454b'
$env:SFA_ACCEPTANCE_DATABASE='adaptive_phase6'
$env:MONGO_URI_TEST='mongodb://127.0.0.1:27028/adaptive_release_phase6_test?directConnection=true&replicaSet=rs0'
node --require ./tests/helpers/isolatedAcceptance.cjs --test --test-concurrency=1 tests/integration/adaptive-release.integration.test.js
```

All provider transports mocked/blocked. This publishes only a generated disposable fixture. No real messages, orders, payments, courier calls or merchant activation occurred.

## 21 October browser evidence and limitations

The prior production fixture reproduced the filter defect at actual `innerWidth=390`: opening Filters left `document.activeElement` on the external Filters button rather than inside `[role=dialog]`. The existing parent controller already closed on Escape; this defect concerns entry/trapping. Browser viewport targeting was checked against actual DOM width; a call to set a viewport is not accepted as evidence by itself.

Before rebuilt verification, Work disabled local browser access. The new real fixture has been restarted for review at <http://launchshopa.localhost:3018/>. Normal Admin preview remains at <http://127.0.0.1:5185/dashboard/adaptive-builder-preview>. No passing claim is made for rebuilt drawer focus/desktop-resize behavior, tracking modal keyboard interaction or complete accessibility.

An attempted read-only all-state semantic scan could not access the temporarily unavailable/hidden preview frame and produced no usable scan results. It is **not** counted as an accessibility audit. Existing structural/contrast regressions and earlier actual browser evidence remain separately documented. No new package or browser bypass was installed.

At this checkpoint actual 200% native zoom was BLOCKED; only in-app visibility/viewport capabilities were exposed. The 22 October update below resolves native zoom and targeted modal/drawer checks. Full screen-reader/touch/reduced-motion/contrast and representative Web Vitals/heap/interactive distributions remain incomplete. Node timings are not recast as browser measurements.

## Original next checks (status updated below on 22 October)

1. Re-enable browser access. At 390px on the synthetic category route, open Filters using keyboard; verify focus enters, Tab/Shift+Tab remain inside, Escape returns to Filters, Apply works, and resizing to 1024px removes the drawer and releases body scroll.
2. Verify actual tracking cancellation/return dialogs in an authorized disposable state: named role, focus entry/wrap/return, busy dismissal restrictions and keyboard-accessible proof removal. Never submit a real cancellation, return, OTP or provider message during this check.
3. Complete native 200% and remaining manual accessibility/performance checks from `../BROWSER_ACCEPTANCE.md`.
4. Review separate implementation / quality / operations / authorization decisions and launch matrix in `../../phase7/README.md` before any pilot approval.

## 22 October browser recheck

Browser access is restored. The rebuilt real category route passes keyboard focus entry, both Tab wraps, Escape/opener restoration, minimum-price Apply and closing/scroll-unlock at 1024px. The earlier blocked drawer recheck is resolved. Native 200% is independently verified in Chrome for both origins, the Builder and ten public routes. [Evidence and screenshots](../browser-2026-10-22/README.md).

Shared tracking cancellation/return dialog entry, wraps, Escape restoration, busy guards and proof removal pass actual native-200 browser checks using a development-only fixture with inert local actions. This does not claim a real OTP/cancellation/return transaction. Zoom exposed adaptive mobile navigation focus/scroll and proof-upload keyboard defects; the existing focus helper, adaptive-only scroll/semantic changes and focusable visually hidden inputs fix them. Exact six source/test/fixture paths and before/after evidence are in the new report.

Latest verification: compatibility **850/850**, full backend **1303/1308** with the same five historical failures; both final builds and storefront lint PASS; Admin lint the same 13 historical errors. Three new tests, fixture lint, CJS/ESM 20-case parity, zero introduced focused-lint diagnostics, actual HTTP/Next/disposable recovery lifecycle **1/1**, default-off config and final integrity are recorded. Representative performance, full accessibility and target operational/authorization gates remain incomplete.

**Phase 6 BLOCKED; Phase 7 BLOCKED.** No production activation, deployment, commit or push.
