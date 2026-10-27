# Browser acceptance resumed — 22 October 2026

Browser access is restored. Used the actual authenticated Admin preview and rebuilt production Next storefront, with the existing synthetic fixtures and isolated Mongo replica set. Native 200% verification found navigation/proof-input defects and narrow purchase-label truncation; focused fixes and regression tests are now verified. No real merchant, order, notification, payment or courier operation was performed.

## Rebuilt mobile filter — PASS

On `/categories/Shop%20A%20Category` at an observed **390 CSS pixels**:

- Keyboard opening moved focus to Minimum price inside the dialog; body scrolling was locked.
- Shift+Tab wrapped from the first close control to Apply; Tab wrapped from Apply to Close filters. Focus stayed inside the dialog.
- Escape removed the dialog, restored focus to Filters and released body scrolling.
- Applying minimum price 100 closed the dialog and produced the actual URL `?minPrice=100&page=1` and visible price chip.
- Resizing the open drawer to an observed **1024 CSS pixels** removed it and released body scrolling. No hidden dialog retained focus.

Evidence: [filter-evidence.json](filter-evidence.json), [mobile-filter.png](mobile-filter.png). The prior failure is retained in earlier reports; these observations verify the rebuilt fix.

## Native zoom — PASS for the tested views

Automated Ctrl+plus/equal initially left Chrome at 100%. The user then set the Chrome menu to 200% separately for the Admin and storefront sites. Native `Page.getLayoutMetrics` confirmed **`cssVisualViewport.zoom=2`**, with **`devicePixelRatio=2`** and approximately 639 CSS pixels of viewport width. `visualViewport.scale` remains 1 at native desktop page zoom and was not used alone as proof. No CSS zoom, transform, viewport reduction or device scale override was substituted.

Actual 200% checks cover all ten public route families: home, product, category, collection, populated/empty cart, populated checkout, signed-out/registration/signed-in account, tracking lookup, policies index and policy details. No measured page-level horizontal overflow occurred. Header navigation and footer policy access remain reachable. Product/cart quantity changes, checkout navigation, Bengali/English form input and a visible 2px keyboard focus outline were observed. Search focus enters its dialog and Escape restores its opener. No order, OTP, registration, password change, cancellation or return request was submitted.

In the normal Builder, tree Enter selected the text section and opened its inspector. A valid desktop font edit changed preview computation from 44px to 36px; undo restored 44px and redo restored 36px. Preview click selected the inspector. Reload showed the normal draft-recovery offer; **Restore draft** recovered 36px. Mobile/tablet previews correctly inherited 28px, and switching page away/back retained the desktop edit. Panels and controls reflowed without page-level horizontal overflow.

Evidence: [native-zoom.json](native-zoom.json), `editor-native-200.png`, `product-native-200.png`, `checkout-native-200.png`, `account-native-200.png`, `tracking-native-200.png`, `policies-native-200.png`, `home-native-200.png`, `live-navigation-native-200.png`. The user-set zoom is left at 200% for review; Chrome's Ctrl+0/menu can restore 100%.

## Confirmed fixes and exact source paths

| Path | Change |
|---|---|
| `packages/storefront-renderer/reference/StorefrontHeader.jsx` | Adaptive mobile navigation previously left focus outside and ignored Escape. Reuse the existing dialog helper, named modal semantics and trigger state; close at the existing 1024px desktop boundary. Long menus now scroll within the panel so keyboard focus can reach their final links at 200%. Changes are gated by `adaptiveParts`; legacy markup remains unchanged. |
| `packages/storefront-renderer/presentation/TrackingView.jsx` | Adaptive proof image/video inputs used `display:none` and were unreachable by keyboard. Use visually hidden, focusable inputs with visible label focus rings. Upload handlers, accepted formats and all business logic remain unchanged. Legacy classes are preserved. |
| `packages/storefront-renderer/reference/StorefrontProductCard.jsx` | Native 200% exposed Buy Now truncation in a narrow adaptive card. Actions now wrap by available width, retain a 44px minimum height and allow label wrapping. Wider cards retain side-by-side actions. Legacy markup and commerce callbacks stay unchanged. |
| `ecommerce-backend/backend/tests/adaptive-release.test.js` | Three additional regressions cover navigation state, keyboard-accessible file controls and narrow-card purchase labels. Existing assertions retained. |
| `ecommerce-admin/tests/fixtures/adaptive-dialogs.html` | Development-only browser fixture entry; not an application route or production build entry. |
| `ecommerce-admin/tests/fixtures/adaptive-dialogs.jsx` | Mounts the existing shared renderer with existing code-owned synthetic data and local, inert actions. Exercises modal states without an OTP/authentication bypass, external transport or duplicate editor/controller. |

The before/after navigation failure is in [header-before.json](header-before.json). The rebuilt real Next route passes entry, both wraps and Escape/opener restoration. At 390→1024px, the navigation drawer closes and body scroll unlocks. Long Bengali/English navigation initially extended to 836px in a 624px viewport with no scrolling; after correction keyboard focus scrolls to Account at bottom 603px.

At actual native 200%, the shared tracking-component fixture verifies cancellation and return dialog names, focus entry, forward/backward wraps, Escape restoration and pending-action dismissal guards. Proof inputs are now in the tab order with visible focus rings. Keyboard removal exposes no remaining proof group and disables incomplete submission. [dialog-evidence.json](dialog-evidence.json), `return-dialog-native-200.png`, `navigation-native-200.png`. These are actual shared-component browser checks, not a claim of a live OTP/return/cancellation transaction.

The final screenshot review found Buy Now text measuring 67px in a 41px label box with ellipsis. After the adaptive-only correction, the rebuilt real card exposes its complete 67px label in a 124px button (44px outer height), without page overflow at native 200%. At an observed 1280px viewport, both actions retain the same row. Evidence: `card-before.json`, `card-after.json`, `card-wide.json`, `storefront-final-native-200.png`. The requested wide override returned 1280px rather than 1440px; only the observed width is credited for this targeted recheck.

## Verification after fixes

| Check | Result / artifact |
|---|---|
| Seventeen-file compatibility command from the parent report | **850/850 PASS**, including three new tests; `compatibility.log`, `home-parity.json`. Rerun after the last source change. |
| `node --test 'tests/*.test.js'` | **1303/1308**, same five previously classified failures; `backend-full.log`. No introduced failure. |
| Production Next `next build --webpack` | PASS after final change; `storefront-build.log`. |
| Admin `vite build --outDir ../output/adaptive-builder/phase6/browser-2026-10-22/admin-dist --emptyOutDir=false` | PASS; `admin-build.log`. |
| Full storefront ESLint | PASS; `storefront-lint.log`. |
| Full Admin ESLint | Same **13 historical errors / 0 warnings**; `admin-lint.log`. New fixture passes its focused lint after exporting its fixture component; `fixture-lint.log`. |
| `node output/adaptive-builder/phase6/verify-tooling.cjs` | 57 JS files, 16 errors/1 warning all pre-existing, **zero introduced**; `shared-tooling.log`, parent `lint-delta.json`. CJS/ESM plan/CSS parity **20/20**. |
| Isolated actual HTTP/Next lifecycle integration | **1/1 PASS**; `mongo-release.log`, same isolation command as the follow-up report. Existing relevant full Mongo **62/62** evidence retained; persistence was not changed. |
| `node scripts/check-adaptive-release-config.js` | PASS, default OFF, writes/rendering false; `config-check.log`. |
| `git diff --check`; phase-local final audit / diff reconstruction | PASS; no missing/protected/whitespace failures, original tracker and revision preserved; `git-diff-check.log`, `integrity-check.log`, parent `integrity.json`. Exact task diff reconstructs 58 source/test/helper/fixture files without unresolved comparisons. |

The final renderer entry is 571,287 unminified bytes with React/JSX/lucide external; this is not production transfer size. No dependency or original theme was changed. Initial fixture lint exposed a Fast Refresh export rule and was fixed without suppressing the rule. The initial new card test used the wrong catalog source key; its fixture data was corrected to the existing `sources.home_products` contract, retaining its assertions. All prior Phase 0–5 artifacts and frozen expectations are protected by the final integrity audit.

## Supported browser measurements — partial evidence

The newly available Chrome diagnostics expose standard Navigation/Paint entries and performance counters. Measurements are warm-cache loopback observations, without CPU/network throttling or a controlled legacy comparison:

| Observed page/run | FCP (ms) | Response start (ms) | Load event end (ms) |
|---|---:|---:|---:|
| Admin development Builder, warm navigation | 364 | 9.2 | 223.3 |
| Published storefront home, warm reload 1 | 196 | 115.0 | 211.5 |
| Published storefront home, warm reload 2 | 252 | 183.3 | 270.6 |
| Published storefront home, warm reload 3 | 184 | 108.8 | 206.9 |

Raw navigation, paint, resource-size and heap counters: [performance.json](performance.json). FCP is independent of the load event and can occur later. Counter samples include browser instrumentation/runtime allocations; they do not prove editor history retention or memory growth. The synthetic product image is unavailable and exercises fallback; this is not representative image-load evidence.

`PerformanceTimeline.enable` is unsupported by the browser tool. LCP, CLS, INP, hydration-specific duration, representative cold/warm cache/device conditions, interaction latency distributions and retained heap growth remain unverified. No optimization or production SLO claim follows these observations.

## Remaining gates

The native-zoom and targeted tracking/modal gates above are resolved for the documented states. Complete screen-reader/touch/reduced-motion/contrast acceptance and representative performance remain incomplete. Target operational checks, historical-failure disposition and product/release authorization remain outstanding. **Phase 6 BLOCKED; Phase 7 BLOCKED; default real merchant rollout OFF.** No deployment, real activation, commit or push.
