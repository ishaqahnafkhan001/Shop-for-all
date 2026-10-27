# Browser acceptance — 21 October 2026

**22 October update:** browser interaction is restored. **Native 200% is verified** in Chrome after user-assisted menu changes on both sites (`cssVisualViewport.zoom=2`, DPR 2). Builder and all ten public routes reflow without measured page-level horizontal overflow in the documented states. Rebuilt filter, navigation and shared tracking modal keyboard checks pass; zoom-discovered navigation/proof-input accessibility defects were fixed. Chrome exposes initial Navigation/Paint/resource/heap measurements; representative performance and complete accessibility remain incomplete. [Current evidence and remaining gates](browser-2026-10-22/README.md). Earlier observations below are retained for their original revision.

## Verified environments

The ordinary Admin application at <http://127.0.0.1:5185/dashboard/adaptive-builder-preview> uses the implemented editor, normal authentication and a server-issued synthetic development grant. Fixture login: `vendor-a@launch.example.com` / `LaunchPass@123`. Publication and uploads are disabled; drafts are browser-local. This is not a second editor.

The real production Next build at <http://launchshopa.localhost:3018/> uses a separate disposable database and loopback API. Only its generated synthetic shop is approved in that process. All notification/payment/courier transports are isolated. Fixture customer: `customer-a@launch.example.com` / `LaunchPass@123`. These are synthetic credentials.

### Restart commands

First verify the existing task-owned Docker service `sfa-adaptive-phase5`: label `sfa.task=adaptive-phase5`, loopback `127.0.0.1:27028`, tmpfs `/data/db`, replica set `rs0`, primary. Do not substitute a shared database or remove the isolation preload. Do not start a second listener on occupied ports. Stop only identified task-owned processes; the user's unrelated port-3000 server is outside this procedure.

From `ecommerce-backend/backend`, start the ordinary preview API in one terminal:

```powershell
$env:NODE_ENV='test'
$env:SFA_ISOLATED_ACCEPTANCE='c085454b'
$env:SFA_ACCEPTANCE_DATABASE='preview'
$env:MONGO_URI_TEST='mongodb://127.0.0.1:27028/atelier_acceptance_c085454b_test?directConnection=true&replicaSet=rs0'
node --require ./tests/helpers/isolatedAcceptance.cjs ./tests/helpers/adaptive-development-server.cjs
```

From `ecommerce-admin`, in another terminal:

```powershell
$env:VITE_API_URL='http://127.0.0.1:4008/api'
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5185 --strictPort
```

For the published synthetic fixture, first build the storefront using `node node_modules/next/dist/bin/next build --webpack` from `ecommerce-storefront`. Do not rebuild while the fixture's production Next process is serving that build. Then, from `ecommerce-backend/backend`:

```powershell
$env:NODE_ENV='test'
$env:SFA_ISOLATED_ACCEPTANCE='c085454b'
$env:SFA_ACCEPTANCE_DATABASE='adaptive_browser'
$env:MONGO_URI_TEST='mongodb://127.0.0.1:27028/adaptive_browser_phase6_test?directConnection=true&replicaSet=rs0'
node --require ./tests/helpers/isolatedAcceptance.cjs ./tests/helpers/adaptive-published-preview.cjs
```

The last helper clears only its hardcoded disposable database, seeds synthetic fixtures, publishes through the existing authenticated API and starts the real Next application on 3018. Never use it against production. Each restart generates new tenant IDs; browser-local cart/customer state may need clearing through normal UI actions.

## Evidence actually collected

- `browser/acceptance.json`: all 12 editor page/global choices, 57 available synthetic states, selection and inspector journeys, responsive controls, save/reload, saved-section independent copy and style-preset use. Invalid font size 500 was rejected without changing the graph; the affected input exposes `aria-invalid` and its error description. Valid input clears the error.
- Actual preview click selected product `title`; text alignment updated immediately; undo and redo restored the expected computed alignment. Required-core removal, duplication, hiding and movement were disabled with an explanation.
- Optional text was added, copied, reordered and removed. Bengali/English text and independent saved copies persisted after refresh and page changes. The tree supports Arrow-key selection, Enter-to-locate and a visible 3px focus outline.
- Nine editor viewport widths: 320, 360, 390, 430, 767, 768, 1023, 1024, 1440 CSS pixels; no page-level horizontal overflow. Mobile preview panel was checked after reflow settled.
- `browser/live-acceptance.json`: 10 public routes × those nine widths = 90 checks with no page-level horizontal overflow. Header/footer appeared across the routes. This proves measured overflow, not complete visual or accessibility acceptance at every width.
- Actual product quantity → add to cart → cart → checkout navigation; required policy consent and disabled incomplete submission; synthetic customer login/dashboard/security-tab/sign-out; remove-item empty cart. No order, OTP, password change, payment, email or SMS was submitted through the browser.
- No hydration errors were captured in the tested journeys. The browser console is not a remote monitoring service or proof of every possible hydration state.
- Saved screenshots include `browser/editor-desktop-final.png` and `browser/editor-mobile.png`. Published screenshots and the final targeted accessibility recheck are recorded separately in the same directory.

## Actual 200% zoom — verified 22 October

The original in-app attempts did not change zoom. On 22 October, the user set actual Chrome menu zoom for both origins, which was independently confirmed through supported layout diagnostics and DPR. The real Builder and required public pages were then exercised at 200%; see `browser-2026-10-22/native-zoom.json` and its report for exact states, actions, screenshots and limits. No CSS zoom, transform, resized screenshot or device emulation was substituted. Full WCAG compliance is not inferred from this targeted pass.

### Reproducible native zoom regression procedure

1. Open the two URLs above in an installed browser with visible zoom controls. Use its menu to select **200%** and capture the menu/zoom indicator; retain a 100% comparison. Browser-native zoom is required.
2. At 200%, test homepage, product, populated/empty cart, populated checkout, signed-out/signed-in account, tracking, policy index/details and the Builder.
3. Tab and Shift+Tab through navigation, modals, forms, editor tree and inspector. Check visible focus, no trapped/inaccessible required controls, usable fields, readable errors, reflow, no clipped text and no unintended page-level horizontal overflow.
4. In the Builder, select a preview element, edit a bounded property, switch page/tier, undo/redo and reload the local draft. Confirm all panels can be reached and closed by keyboard.
5. Use the synthetic customer only. Do not submit orders, OTPs, provider messages or payments. Capture screenshots with page, browser zoom indicator, viewport/OS, observed defects and results. Reset zoom afterwards.
6. Retain actual zoom evidence, fix confirmed defects and rerun affected compatibility checks. The 22 October evidence completes this targeted native-zoom gate; broader Phase 6 acceptance still requires its remaining checks.

## Remaining accessibility/performance acceptance

Screen-reader behavior, full WCAG 2.2 AA review, all supported color combinations, reduced-motion interaction, touch target review and exhaustive state/content stress testing remain incomplete. Actual 200% reflow passed for the documented views. Existing static/contrast/semantic/focus tests and targeted browser checks do not establish full compliance.

The original browser surface exposed no usable timings. Chrome now provides initial standard Navigation/Paint/resource-size/heap observations, retained in `browser-2026-10-22/performance.json`. Representative LCP, CLS, INP, hydration duration, cold/warm image/cache comparisons, interaction latency distributions and retained heap/history growth remain unverified. Use a staging performance trace under agreed network/device conditions, with legacy/adaptive comparison and repeated runs. No invented scores or optimization claims are made.
