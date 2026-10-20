## 2026-10-20 — User-authorized Atelier availability for all shops

The user superseded the earlier release instruction to keep rollout disabled, first approving ADI-only access and then explicitly requesting **Enable for all shop**. Updated only the rollout keys in the ignored local backend `.env`: `ATELIER_EDITORIAL_ROLLOUT=on`, empty test-shop list, and `ATELIER_EDITORIAL_APPROVED_PLAN_KEYS=beginner,starter,growth,pro`. Other environment values were compared and remain unchanged. The repository example remains safely disabled by default. No tenant themes were applied or published.

Existing plan entitlements remain enforced: Starter receives appearance-only application; Growth/Pro receive complete Atelier; Beginner has no Store Builder access and remains ineligible. The actual environment → backend policy → gallery helper check passed for two synthetic tenant IDs under every current plan (10 gallery entries for Starter/Growth/Pro, 9 for Beginner). Existing Builder/contract suites passed **42/42**, including the frozen nine definitions and write guards. The SSR harness emitted shared-package externalization warnings but no failed tests.

Reloaded only the existing nodemon API process by touching `app.js` modification time (SHA-256 confirmed its bytes unchanged). Health returned connected, uptime 4 seconds, PID changed from 12244 to 24260. No notification worker was started. This changes availability in the **running local backend**, not a remote deployment. Authenticated browser verification remains unavailable in Work settings. Reload Admin to fetch fresh theme availability; no automatic publication occurred.

## 2026-10-20 — React DOM cache generation follow-up

The browser reported `react-dom_client.js` importing private export `t` from an incompatible cached `react-dom.js`. Current HTTP responses contain the export, supporting a mixed immutable-cache-generation failure. A cold-start integration check also exposed that Vite's default HTML scan included Atelier test fixtures with aliases available only under their fixture config; that scan failed and caused incremental on-demand optimization.

Updated `ecommerce-admin/vite.config.js` to scan only `index.html` and include all current runtime package entries, React DOM client, JSX runtimes and shared data/prebuilt entry points in initial optimization. Added `ecommerce-admin/tests/vite-dependency-cache.test.mjs`: an isolated dependency cache and concrete reserved ephemeral port, cold app entry fetch, lazy Builder/preview/gallery fetches, unchanged dependency generation/React responses, and native ESM linking of the generated React DOM client. The test removes only its verified owned temporary cache.

Final checks: **7/7** watcher/cache tests; affected config/tests lint clean; Admin production build passed; HTTP graph from `src/main.jsx` covered **198 modules**, zero failed responses and zero missing exports. No browser cache/profile was modified; a hard refresh (Ctrl+Shift+R) is needed to discard already cached incompatible modules. Browser UI behavior itself remains unverified.

---

## 2026-10-20 — Store Builder development loading repair

**Confirmed cause:** the running admin Vite server served a stale shared `CheckoutSections.jsx` that did not export `CheckoutMarketingConsent`, while `PreviewCommercePages.jsx` imported it. Shared source files reached through node_modules junctions were not watched; the existing watcher only tracked package manifests. The generic route boundary then displayed the loading error.

**Changes:** updated `ecommerce-admin/vite.config.js` to watch both real shared-package source directories, debounce source/module/manifest changes, restart Vite with forced dependency optimization, and remove pending work/listeners when the server closes. Added `ecommerce-admin/tests/storefront-package-watch.test.mjs`. No saved themes or database records were changed.

**Verified:** six targeted tests pass; lint passes for the config and new test; admin production build passes; a disposable module probe confirmed a warm server serves edited shared source and rebuilds optimized dependencies; final HTTP import-graph check covered 86 modules with no failed responses or missing exports; probe removed; `git diff --check` passes. Vite was refreshed in place by its config watcher.

**Limit:** local browser control is disabled in Work settings, so the actual authenticated Store Builder UI was not visually verified. Reload the existing tab once to clear its error boundary. Evidence and the task-only config patch are under `output/atelier-editorial/builder-load-fix/`.

---

# Atelier Editorial — final release hardening and acceptance

Date: 20 October 2026. **Verdict: C. BLOCKED.** The zero-price and checkout OTP defects are fixed and have automated and real MongoDB evidence. Browser acceptance, the retained test/lint failures and product/release approvals are not complete. No real merchant publication, deployment, commit, push, production database migration, rollout change or live notification was performed.

This report supersedes the readiness summary below it, while preserving the historical reports. Scope was the supplied final-hardening request. Required planning/inventory documents, current diff and frozen Phase 0–6 evidence were reviewed; the broad storefront investigation was not repeated. Task-only source hashes, patch, commands and logs are in output/atelier-editorial/hardening.

## 1. Blocker resolution matrix

| Blocker | Before | After | Evidence | Status |
|---|---|---|---|---|
| Zero-price variants | Valid zero replaced by base prices in cart/checkout; guest null override could become zero | Shared consumers preserve numeric zero; matching product refresh and both server order paths agree on unit prices | 53 focused tests; eight new database tests include guest/customer persisted totals | **PASS for automated functional gate**; browser gate separate |
| OTP resend/cooldown | Active dialog omitted supported resend/timing contract | Same send endpoint; server timestamps and retry metadata; expiry, disabled/busy state, duplicate-call locks, tenant/cart binding and timer cleanup | Focused actual hooks/page handlers plus real HTTP cooldown/concurrency/lockout/rate-limit/proof replay tests | **PASS for automated functional/security gate**; physical mobile/focus acceptance blocked |
| Five backend failures | 713/718 in prior report | Final normal and serial runs each **766/771**, exactly five retained failures | backend-normal-final.txt, backend-serial-final.txt; Phase 0 HEAD failure log | **FAIL overall suite**; five are pre-existing |
| SDK timing test | Historical intermittent mocked-fetch abort assertion | Three isolated 9/9 runs; passes in initial and final normal/serial full suites | sdk-isolated-1/2/3.txt and full-suite logs | **PASS in executed runs**; historical timing sensitivity is not claimed fixed |
| MongoDB acceptance | Docker unavailable in prior phase | Official authorized mongo:7 image; owned loopback replica set; final relevant suites **28/30**, including **8/8 new tests** | relevant-integrations-final.txt, mongo-container.json, mongo-indexes.json | Environment **resolved**; acceptance **FAIL** due to two reproduced baseline tests |
| Browser acceptance | Disabled in Work settings | Availability rechecked; still disabled; no bypass/tool installation | Tool inventory returned Local browser use is disabled in Work settings | **BLOCKED** |
| Production OTP index state | Not verified | Schema conflict fixed; correct unique/TTL indexes proven only on disposable MongoDB | Actual captured index documents; production untouched | **BLOCKED pending deployed index inspection/remediation approval** |
| Product/release approval | Undecided | No eligibility, downgrade, merchant ID or availability decision invented | Trusted policy defaults remain off | **BLOCKED** |

## 2. Root causes and corrections

### Price flow

Raw API product data passes through the existing normalizeProduct/getProductPresentation implementation, selected variant, ProductDetails or useStorefrontProductActions, tenant CartProvider, CartView, checkout batch refresh/coupon/totals/summary and the guest or authenticated order API. The server loads the product inside its tenant and recomputes the unit price before persisting the order.

The primary client defect was truthiness fallback at several independent consumers: cartPrice/finalPrice zero fell through to sellingPrice. Checkout rows also ignored cartPrice. Product-card cart construction could coerce a null override to zero and replace zero sellingPrice with the base price. Cart savings/compare-at display could advertise the base product price for a free variant. Checkout fetched current products but did not use them to refresh the selected item price.

The existing product-data module now supplies the common finite/nonnegative price selector and matching-product refresh. Numeric zero is retained; null, undefined, blank, boolean, negative and non-finite candidates are not converted to a free override. Numeric API strings remain supported. Discounts and scheduled sales reuse getProductPresentation. A missing/removed variant is not silently replaced with another chosen option. Display fallback remains advisory: an unavailable/invalid snapshot is never authority to create a free server order.

Cart persistence is scoped to its storage key even when the same mounted provider changes tenant. Batch responses from an earlier tenant/unmounted effect are ignored. Real database tests verify zero, positive, missing/null overrides and server totals; focused tests also cover zero base price, invalid candidate inputs, scheduled/percentage discounts, mixed items, quantities, reload, coupon input, all ten presentations and actual guest/customer checkout callbacks. Backend-authoritative product/variant lookups and stock/proof processing remain in their existing controllers.

The guest controller had a separate Number(null) coercion defect. Its existing server-side pricing now falls back to the product only when an override is absent, while retaining a genuine zero. Client price/total tampering is ignored in the HTTP integration tests.

### OTP flow

Existing contract: POST /api/storefront/:subdomain/checkout/send-otp can be repeated when the existing OTP service permits it. Success supplies expiresAt/resendAvailableAt. Verification uses the existing verify-otp endpoint and returns the same phoneVerificationToken and proof expiry. No alternate endpoint, provider, token scheme or limit was added.

The active dialog now exposes resend, a visible server-timed countdown, expiry feedback and disabled/loading states. Closing/reopening does not reset the cooldown; cart/city changes cannot erase the phone/session cooldown. The hook and page prevent concurrent send/verify/order callbacks. The proof and response epoch include the tenant and checkout binding. Timers stop on cleanup; stale responses cannot trigger a new tenant's order. Six-digit numeric input/paste and existing busy/cancel restrictions remain. Retry-After/positive retryAfterSeconds is consumed; the latter is forwarded from the existing backend OTP service as compatible additive error metadata.

Server cooldown, attempt limit, rate limiter, expiry, cart/shop/session binding and one-use proof consumption remain authoritative. Client countdown is informational. Real database/HTTP tests cover concurrent sends, rejection during cooldown, wrong/expired codes, correct proof, foreign tenant/cart rejection, five-attempt lockout, HTTP rate-limit rejection, proof replay and idempotent order retry with one stock decrement. Synthetic transport acceptance is not evidence of real SMS delivery.

### Additional defects exposed by real database testing

- OTP.js declared key_1 twice, first non-unique and then unique/sparse. Fresh MongoDB index creation failed with IndexKeySpecsConflict. Removed only the duplicate field index; retained explicit unique sparse key, unique email/purpose and TTL indexes. Existing production indexes were not modified.
- Concurrent first writes could both normalize verification metadata and one Shop.save failed with VersionError, returning HTTP 500 before publication CAS. The guard now retries that error once by reloading through the same tenant/owner verification service, then rechecks suspension. Other/repeated failures still fail closed. Real unprimed concurrent publication now yields one success and one 409; a focused regression confirms suspension is never bypassed. Both pre-fix files exactly matched HEAD (preexisting-infrastructure-findings.json).

## 3. Exact changed files

Compared with task-start hashes, excluding earlier work already present: **21 source/test/report files, 18 modified and 3 added**. Existing uncommitted work was retained. Generated evidence under output is additional test output, not application changes.

| Kind | File | Reason |
|---|---|---|
| modified | [ecommerce-admin/tests/fixtures/atelier-route-runtime.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/atelier-route-runtime.jsx) | Return the actual timestamp/proof-expiry contract from the existing fail-closed fixture API. |
| modified | [ecommerce-backend/backend/tests/helpers/atelier-routes.cjs](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/helpers/atelier-routes.cjs) | Expose real hooks, CartProvider and checkout through the existing isolated Rolldown harness. |
| added | [ecommerce-backend/backend/tests/helpers/isolatedAcceptance.cjs](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/helpers/isolatedAcceptance.cjs) | Explicit opt-in for the verified disposable endpoint; disable real dotenv loading, sanitize transports, restrict MongoDB/network destinations and block worker startup. |
| added | [ecommerce-backend/backend/tests/integration/atelier-release-hardening.integration.test.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/integration/atelier-release-hardening.integration.test.js) | Add eight real MongoDB/HTTP tests for indexes, persisted prices, guarded drafts/publish/restore, publication claims, OTP lifecycle/limits, proof replay and idempotency; install its own SMS mock before imports. |
| added | [ecommerce-backend/backend/tests/storefront-release-hardening.test.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/storefront-release-hardening.test.js) | Add 53 focused price, persisted-cart, tenant, lifecycle, controller and actual checkout-handler regressions. |
| modified | [ecommerce-backend/backend/controllers/checkoutOtpController.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/checkoutOtpController.js) | Expose positive numeric retryAfterSeconds on existing error responses as additive metadata. |
| modified | [ecommerce-backend/backend/controllers/publicController.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/publicController.js) | Treat null/undefined/empty variant overrides as absent instead of coercing null to a free order price; preserve authoritative numeric zero. |
| modified | [ecommerce-backend/backend/middlewares/vendorVerificationGuard.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/middlewares/vendorVerificationGuard.js) | Retry only a stale-document VersionError once through the same tenant/owner service; reevaluate suspension and fail closed on repeated/other errors. |
| modified | [ecommerce-backend/backend/models/OTP.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/OTP.js) | Remove the duplicate non-unique key index declaration; preserve the existing unique sparse declaration and TTL. |
| modified | [ecommerce-backend/backend/services/checkout/checkoutOtpService.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/checkout/checkoutOtpService.js) | Forward the existing OTP service retryAfterSeconds result through the established checkout error; no new endpoint, limit or provider. |
| modified | [ecommerce-storefront/src/app/[subdomain]/cart/page.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/cart/page.jsx) | Calculate savings from the selected original and current prices, including valid zero. |
| modified | [ecommerce-storefront/src/app/[subdomain]/checkout/hooks/useCheckoutCartProducts.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/checkout/hooks/useCheckoutCartProducts.js) | Ignore stale/unmounted refresh responses and isolate the product map by tenant. |
| modified | [ecommerce-storefront/src/app/[subdomain]/checkout/hooks/useCheckoutCoupon.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/checkout/hooks/useCheckoutCoupon.js) | Keep zero prices in coupon validation item payloads. |
| modified | [ecommerce-storefront/src/app/[subdomain]/checkout/hooks/useCheckoutPhoneOtp.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/checkout/hooks/useCheckoutPhoneOtp.js) | Use server timestamps for cooldown/expiry, preserve cooldown by phone, prevent concurrent calls, reject stale tenant/cart outcomes, bind proof lifetime and clean timers on unmount. |
| modified | [ecommerce-storefront/src/app/[subdomain]/checkout/page.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/checkout/page.jsx) | Use refreshed matching-product prices for totals/summary/advisory guest prices/analytics; connect resend state and guard concurrent verification/order submission. |
| modified | [ecommerce-storefront/src/context/CartContext.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/context/CartContext.jsx) | Preserve zero totals and tenant-keyed persistence; prevent the previous tenant cart from being displayed or written during a mounted tenant change. |
| modified | [ecommerce-storefront/src/hooks/useStorefrontProductActions.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/hooks/useStorefrontProductActions.js) | Use existing product presentation pricing for selected-variant cart snapshots, preserving zero and scheduled discounts. |
| modified | [packages/storefront-renderer/normalizeProduct.js](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/normalizeProduct.js) | Reuse the existing product-data module for finite, nonnegative price selection, zero-safe cart/original prices and matching-product checkout refresh; retain existing discount/scheduled-sale calculations. |
| modified | [packages/storefront-renderer/presentation/CartView.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/CartView.jsx) | Render the same zero-safe unit price as totals; compare the selected variant original price and suppress misleading crossed-out base prices for free variants. |
| modified | [packages/storefront-renderer/presentation/CheckoutSections.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/CheckoutSections.jsx) | Use the shared price selector in summary rows; add optional resend/countdown/expiry/feedback controls to the existing active OTP dialog. |
| modified | [track.md](C:/Users/user/WebstormProjects/Shop-for-all/track.md) | Prepend this final acceptance report and retain all historical evidence. |

No theme definition/version, frozen baseline, stylesheet, package/lock file, application environment file, entitlement or tenant-ownership rule was changed by this task. Existing request paths/body contracts remain; retryAfterSeconds is optional additional response metadata. Shared price/OTP corrections intentionally apply to existing themes too.

## 4. Tests actually executed

All listed unit/integration totals have zero skipped/cancelled tests. Provider transports were mocked or blocked; no real delivery claim is made.

| Directory / command | Final result | Log |
|---|---|---|
| Backend: node --test tests/storefront-release-hardening.test.js | **53/53 pass** | focused-final.txt |
| Backend: node --test tests/store*.test.js | **463/463 pass**; includes the 53 new tests | theme-tests-final.txt |
| Backend: node --test tests/*.test.js | **766/771 pass; 5 fail** | backend-normal-final.txt |
| Backend: node --test --test-concurrency=1 tests/*.test.js | **766/771 pass; 5 fail** | backend-serial-final.txt |
| Backend: node --test tests/ai-provider-adapter.test.js, three independent runs | **9/9 each** | sdk-isolated-1/2/3.txt |
| Backend: node --test tests/storefront-preview-parity.test.js with THEME_PARITY_REPORT pointing to the evidence file | **25/25 pass; 20 equal SSR comparisons** | preview-live-parity.txt/.json |
| Sanitized isolated runner, five relevant integration files | **28/30 pass; 2 fail**, new file **8/8 pass** | relevant-integrations-final.txt |
| Same existing Builder suite with five verified HEAD theme/service/Shop sources substituted | **10/12 pass**, same two failures | builder-head.txt; pre-atelier-loader.cjs; head-source/ |
| Admin: node node_modules/eslint/bin/eslint.js . | **18 errors, 4 warnings**; all reproduced at HEAD | admin-lint-final.txt; admin-lint-classification.json |
| Storefront: node node_modules/eslint/bin/eslint.js . | **Pass** | storefront-lint-final.txt |
| Shared renderer: ESLint.lintText under storefront configuration, comparison with baseline | **No added diagnostics**; one retained Hero diagnostic | shared-lint-final.txt; shared-lint-comparison.json |
| Admin: node node_modules/vite/bin/vite.js build | **Pass** | admin-build-final.txt |
| Storefront: node node_modules/next/dist/bin/next build | **Pass** | storefront-build-final.txt |
| Package resolution in backend/Admin/storefront | Shared theme resolves to the same physical index.cjs; both frontend viewports exports resolve to the same file | package-resolution.json |
| git diff --check and task-file trailing whitespace scan | **Pass** | diff-check.txt; final-review.json |

The first restricted storefront build failed while downloading existing Geist fonts. The final network-enabled normal build succeeded; no font/code workaround was applied. The first restricted database run failed with loopback EACCES; the sanitized approved runner succeeded outside that network restriction. Initial new-test failures caused by an over-specific static-render whitespace assertion, wrapper-versus-view component identity, a Mongoose-document fixture and an incorrect helper client method were corrected in the new tests. They were not application regressions or weakened legacy assertions. Final files/logs supersede development runs, which remain preserved.

### Exact isolated integration invocation

From repository root, using the task-owned replica set described below:

~~~powershell
node output/atelier-editorial/hardening/run-integration.cjs relevant-integrations-final tests/integration/atelier-release-hardening.integration.test.js tests/integration/store-builder-safety.integration.test.js tests/integration/checkout-order-safety.integration.test.js tests/integration/tenant-isolation.integration.test.js tests/integration/auth-rbac-privacy.integration.test.js
~~~

The Node runner selects only those paths, removes inherited application credentials, provides synthetic test secrets, disables actual dotenv loading through the explicit preload, pins MongoDB to the verified URI, mocks email/SMS, blocks external sockets/HTTP and worker startup. No payment/courier/marketing provider transport was reached. The eight-test file installs its own SMS mock before importing checkout services; it does not make the existing general integration command depend on this task-specific URI.

### Database ownership, indexes and cleanup

The user explicitly authorized downloading the official mongo:7 image. Created task-owned container sfa-atelier-acceptance-20261020-c085454b, label com.scaleup.purpose=atelier-acceptance-c085454b, loopback-only 127.0.0.1:27028, replica set rs0, tmpfs /data/db and /data/configdb, no mounted/shared volume, restart disabled. Confirmed the new server initially contained only MongoDB system databases. Only atelier_acceptance_c085454b_test was used. The endpoint/ownership checks were more than a database-name substring check.

Actual index inspection proved unique sparse OTP key_1, unique email_1_purpose_1, TTL expiresAt_1, unique draft shop_id_1 and unique revision shop_id_1_revision_-1. The harness deletes collection documents before/after tests; captured final database is empty. Both temporary container lifecycles were removed after ownership/ID checks. The authorized downloaded image remains cached. No user service, shared database or production worker was reconfigured or stopped. Infrastructure/image provenance and exact index documents remain in mongo-container.json/mongo-indexes.json; the official pull digest was sha256:c53852c00c23ca9f23fc39690350ffa9a80e3642fe8f96879726d8da0abe80a7.

## 5. Retained failures: evidence and disposition

### Five backend unit failures

All reproduce the frozen Phase 0 preexisting-failures-at-head.txt outcomes and the final normal/serial runs. Existing assertions were retained.

| Test | Exact failure | Classification / relationship | Recommended resolution |
|---|---|---|---|
| ai-acceptance-provenance.test.js:11, empty Product output | SEO origin actual provider; expected deterministic_fallback | Pre-existing, unrelated AI acceptance behavior | Reconcile requested SEO acceptance/provenance with meaningful generator tests in a separate AI fix |
| ai-preferences.test.js:27, effective voice | Actual prompt version 5.0.0; expected 4.0.0 | Pre-existing, unrelated contract expectation | Review intended prompt version and update implementation/expectation only with contract evidence |
| security-hardening.test.js:339, low stock | Missing source match enqueueLowStockAlertsForLogs(lowStockLogs) | Pre-existing source-shape assertion; no security exemption inferred | Trace the current threshold/queue path and replace brittle checks only with equally strong behavior coverage |
| security-hardening.test.js:377, promotion scheduling | Missing text matching checkout will not apply them before the start time | Pre-existing Admin source/text assertion | Verify current scheduling UI/checkout behavior before correcting the assertion or copy |
| security-hardening.test.js:883, confirmed order notification | Missing source text Retry Courier | Pre-existing Admin source/text assertion | Verify the current courier retry component/permission path; preserve actual retry/notification coverage |

### Two additional existing integration failures

Current existing Builder suite and verified pre-Atelier theme-source run each produce 10/12; the complete relevant run has 28/30. The HEAD reproduction replaces index.cjs, capabilities.cjs, prebuilt.cjs, Shop.js and storeBuilderService.js only. It retains the current integration harness, independent OTP-index/verification correction and safe transport wrappers; this is explicitly a theme-code baseline comparison, not a claim that an entire original deployment was executed.

| Existing test / command | Exact failure | Baseline / recommended resolution |
|---|---|---|
| store-builder-safety.integration.test.js:295, full-plan prebuilt blueprint; runner above or builder-head | RangeError: Theme patch exceeds the supported nesting depth, before the HTTP save | Test spreads a Mongoose theme subdocument into normalizeTheme rather than a plain snapshot. Same failure with HEAD theme code. Correct that fixture serialization in separately approved existing-test maintenance while preserving its round-trip assertions |
| Same file:438, limited-plan draft autosave | allowedDraft.status is 403; expected 200 at :448 | Same current/HEAD result. Investigate sparse/full snapshot capability handling against the existing limited-plan contract; do not relax entitlements to obtain a pass |

An initial third integration failure (scaleup.codes accepted instead of rejected) was test-environment dependent: the isolated runner had PLATFORM_ROOT_DOMAIN=localhost while the existing assertion expects scaleup.codes. Setting the runner's synthetic platform root to that fixture value fixed it without application changes or network transmission.

### Admin lint: all 22 diagnostics independently checked

Command: node node_modules/eslint/bin/eslint.js . in ecommerce-admin. For every affected file, git show HEAD:<path> was linted with the same unchanged current ESLint configuration and its diagnostics matched by rule/severity/message. Line numbers refer to the current source. No lint rule or assertion was disabled to make the gate pass.

| Source | Level | Rule | Exact message (first line) | Evidence |
|---|---|---|---|---|
| [ecommerce-admin/src/components/dashboard/Topbar.jsx:11](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/components/dashboard/Topbar.jsx:11) | Error | no-unused-vars | 'Check' is defined but never used. | Reproduced at HEAD |
| [ecommerce-admin/src/components/dashboard/Topbar.jsx:391](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/components/dashboard/Topbar.jsx:391) | Error | react-hooks/set-state-in-effect | Error: Calling setState synchronously within an effect can trigger cascading renders | Reproduced at HEAD |
| [ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx:163](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx:163) | Error | react-hooks/set-state-in-effect | Error: Calling setState synchronously within an effect can trigger cascading renders | Reproduced at HEAD |
| [ecommerce-admin/src/pages/dashboard/StoreBuilder/editors/BasicEditors.jsx:63](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/editors/BasicEditors.jsx:63) | Error | no-unused-vars | 'setTheme' is defined but never used. | Reproduced at HEAD |
| [ecommerce-admin/src/pages/dashboard/StoreBuilder/hooks/useAutosaveRecovery.js:18](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/hooks/useAutosaveRecovery.js:18) | Error | react-hooks/refs | Error: Cannot access refs during render | Reproduced at HEAD |
| [ecommerce-admin/src/pages/dashboard/StoreBuilder/hooks/useAutosaveRecovery.js:23](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/hooks/useAutosaveRecovery.js:23) | Error | react-hooks/refs | Error: Cannot access refs during render | Reproduced at HEAD |
| [ecommerce-admin/src/pages/dashboard/StoreBuilder/hooks/useAutosaveRecovery.js:65](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/hooks/useAutosaveRecovery.js:65) | Warning | react-hooks/exhaustive-deps | React Hook useEffect has a missing dependency: 'persist'. Either include it or remove the dependency array. | Reproduced at HEAD |
| [ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx:508](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx:508) | Warning | react-hooks/exhaustive-deps | React Hook useEffect has a missing dependency: 'autosave'. Either include it or remove the dependency array. | Reproduced at HEAD |
| [ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx:86](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx:86) | Error | react-refresh/only-export-components | Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components. | Reproduced at HEAD |
| [ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx:177](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx:177) | Warning | react-hooks/exhaustive-deps | React Hook useMemo has a missing dependency: 'theme'. Either include it or remove the dependency array. | Reproduced at HEAD |
| [ecommerce-admin/src/pages/dashboard/StoreBuilder/themes/ThemeGallery.jsx:11](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/themes/ThemeGallery.jsx:11) | Error | react-refresh/only-export-components | Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components. | Reproduced at HEAD |
| [ecommerce-admin/src/pages/dashboard/StoreBuilder/themes/ThemeGallery.jsx:139](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/themes/ThemeGallery.jsx:139) | Warning | react-hooks/exhaustive-deps | React Hook useMemo has unnecessary dependencies: 'branding' and 'shopName'. Either exclude them or remove the dependency array. | Reproduced at HEAD |
| [ecommerce-admin/tests/fixtures/ai-workflows.jsx:1](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/ai-workflows.jsx:1) | Error | no-unused-vars | 'React' is defined but never used. | Reproduced at HEAD |
| [ecommerce-admin/tests/fixtures/ai-workflows.jsx:77](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/ai-workflows.jsx:77) | Error | react-refresh/only-export-components | Fast refresh only works when a file has exports. Move your component(s) to a separate file. | Reproduced at HEAD |
| [ecommerce-admin/tests/fixtures/builder-mobile.jsx:1](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/builder-mobile.jsx:1) | Error | no-unused-vars | 'React' is defined but never used. | Reproduced at HEAD |
| [ecommerce-admin/tests/fixtures/builder-mobile.jsx:18](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/builder-mobile.jsx:18) | Error | react-refresh/only-export-components | Fast refresh only works when a file has exports. Move your component(s) to a separate file. | Reproduced at HEAD |
| [ecommerce-admin/tests/fixtures/theme-controls.jsx:1](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/theme-controls.jsx:1) | Error | no-unused-vars | 'React' is defined but never used. | Reproduced at HEAD |
| [ecommerce-admin/tests/fixtures/theme-controls.jsx:16](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/theme-controls.jsx:16) | Error | react-refresh/only-export-components | Fast refresh only works when a file has exports. Move your component(s) to a separate file. | Reproduced at HEAD |
| [ecommerce-admin/tests/fixtures/theme-presentation.jsx:1](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/theme-presentation.jsx:1) | Error | no-unused-vars | 'React' is defined but never used. | Reproduced at HEAD |
| [ecommerce-admin/tests/fixtures/theme-presentation.jsx:9](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/theme-presentation.jsx:9) | Error | react-refresh/only-export-components | Fast refresh only works when a file has exports. Move your component(s) to a separate file. | Reproduced at HEAD |
| [ecommerce-admin/tests/fixtures/theme-responsive.jsx:1](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/theme-responsive.jsx:1) | Error | no-unused-vars | 'React' is defined but never used. | Reproduced at HEAD |
| [ecommerce-admin/tests/fixtures/theme-responsive.jsx:17](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/theme-responsive.jsx:17) | Error | react-refresh/only-export-components | Fast refresh only works when a file has exports. Move your component(s) to a separate file. | Reproduced at HEAD |

These remain a failed Admin lint gate, including the existing Builder diagnostics; pre-existing does not mean automatically acceptable for release.

### SDK timing finding

The existing 30ms operation deadline includes SDK request setup before fetch is invoked. Under contention it can legitimately expire before the mocked transport's abort listener exists, while the test expects an in-flight abort flag. This is a source-supported explanation of timing sensitivity, not proof of the exact historical scheduler sequence. Three isolated reruns and all executed full configurations passed in this task; no timeout was increased and the provider/test sources were unchanged. Preserve the earlier failed parallel log. Future stabilization should separately test pre-dispatch expiry and a deterministically started in-flight request, preserving cancellation/listener-cleanup assertions. Do not call the historical flake permanently fixed.

## 6. Legacy, security and release-control review

- All nine existing preset definitions/versions/configuration/effective/capability snapshots still pass frozen assertions. Original 144 product/category/collection/cart/checkout/account/tracking/policy markup comparisons match; four frozen legacy fixture files are byte-identical to task start. No baseline was regenerated. Modern General, Minimal General, Modern Fashion, Editorial Fashion, Luxury Jewellery, Minimal Jewellery, Soft Beauty, Modern Electronics and Fresh Grocery remain in the same catalog and policy paths.
- Twenty full/limited Gallery/Builder/live home SSR comparisons match. This is markup evidence, not a browser pixel/iframe/hydration certification. Shared zero-price and active OTP corrections intentionally change the defective cases across the original themes; legacy static fixtures/rendering outside those corrections are preserved.
- theme.presentationVariant remains the explicit Atelier identity, independent of homepage composition/provenance. Default-off backend guards were not rewritten. Unit coverage and real HTTP tests reject unauthorized raw/full draft/publish/forged identity/client-policy input, deny foreign revision access and off-mode re-adoption, and allow only an exact server allowlist transition. SEO ignores injected unrelated theme fields; service tests retain its identity boundary. Legacy presets remain available under existing rollout modes.
- Actual local backend .env has none of the three Atelier rollout/allowlist/approved-plan keys. Default is off; running/deployed overrides remain unverified. The only temporary allowlist values were synthetic shop IDs in isolated test processes. No merchant subscription, entitlement, gallery production availability or application environment was changed.
- Real tests exercise tenant-scoped products/orders/theme revisions, authenticated roles, private/cost response fields, checkout proof consumption, stock concurrency and order idempotency. No client price or local countdown becomes security authority. The verification retry uses the same trusted tenant/owner service and still returns 403 for suspension/500 for exhausted error recovery.
- Final task-only review found no stylesheet/unscoped CSS change, dependency/lock change, duplicate commerce service/provider, baseline rewrite or unrelated application edit. Existing uncommitted changes remain. Browser focus, native keyboard behavior, current Figma alignment and actual delivery remain explicitly unverified.

## 7. Performance and browser acceptance

Both final production builds pass. Measured emitted-asset footprint against the task-start built artifacts:

| Artifact set | Final bytes | Per-file gzip total | Byte delta | Gzip delta |
|---|---:|---:|---:|---:|
| admin | 3,978,794 | 1,524,330 | +300 | +94 |
| storefront | 3,189,497 | 1,416,012 | -5466 | -1437 |

These are whole emitted asset-directory totals, including fonts/media and build variability. They are not per-route transfer size, runtime speed, Lighthouse/Core Web Vitals or a measured performance improvement. No browser profiling, new screenshot, visual pixel diff or refreshed Figma inspection was performed. Earlier phase screenshots are historical evidence only.

### Reproducible blocked browser checklist

Use an isolated seeded backend with transport mocks and two test shops, plus current Admin/storefront builds; keep production adoption off. Browser use must first be enabled by the user in Work settings. Do not bypass it with another browser-control tool. Use only an explicitly authorized test-shop allowlist if Atelier must be adopted in that isolated environment.

At **320, 360, 390, 430, 768, 1024 and 1440px**, capture current screenshots and compare with the approved Figma references and frozen legacy screenshots. Check overflow, long English/Bengali text, empty/missing media, focus visibility, contrast, modal scroll, reduced motion and native mobile keyboard/touch operation:

1. Home /: shell/navigation/search, editorial hero ordering, sections, products, footer and bottom navigation.
2. /products/{seeded-slug}: zero/no/positive override, discounts/scheduled sale, stock, variant change, quantity, add/buy, reviews and related items.
3. /categories/{seeded-slug} and /collections/{seeded-slug}: retain distinct filters versus sort/paging and URL state; verify add/buy/wishlist/variant modal.
4. /cart: zero unit/subtotal/compare-at/savings, mixed items, quantity/removal, coupon deferral, reload and tenant switch.
5. /checkout: customer fields, delivery zones, separate optional marketing and required policy consent, coupon feedback and server quote. Test initial/failed send, resend countdown, cooldown expiry, invalid/expired/correct code, paste, 429/network failure, close/reopen, focus restoration, unmount and double clicks. Confirm one verified order, idempotent retry, rejected-order cart retention and successful cart clear.
6. /account: login, registration resend timer, reset, profile/history/password and logout; wrong-role/vendor branches.
7. /track: no order disclosure before access verification; correct/expired access code, cancellation/return eligibility and proof controls.
8. /policies and all refund/shipping/privacy/terms routes, including missing/unknown policy state.
9. Admin → Store Builder: the existing five home/product/cart/checkout/policy previews only; allowed/revoked gallery application, responsive iframe scaling, edits, undo/redo, autosave conflict/recovery, publish/reload/restore and content-preserving legacy switch.
10. Repeat representative legacy pages/actions against original screenshots. Do not claim the nine-theme visual gate from SSR alone.

No scenario above is certified as newly browser-passed in this task. A further existing quote inconsistency remains visible in source: useCheckoutTotals estimates Outside Dhaka at 120 while authoritative getShippingCostForZone returns 130. This task did not change shipping business rules. Resolve/approve that quote alignment before certifying the corresponding checkout scenario; zero unit-price semantics are verified separately.

## 8. Deployment prerequisites, recovery and remaining actions

**Required next work only:**

1. Resolve the five retained unit failures, two reproduced Builder integration failures and Admin lint debt under their existing contracts. Do not suppress assertions or relax plan permissions. The SDK timing limitation remains documented even though current runs pass.
2. Complete the blocked actual-browser/visual/interaction matrix, including native mobile OTP/focus behavior, five Builder previews, hydration/network inspection and the existing outside-zone quote mismatch.
3. Before any deployment, inspect actual OTP indexes read-only. If key_1 is already unique/sparse and other required indexes/TTL are correct, no index replacement is needed. If the old non-unique index exists, obtain an approved maintenance operation: back up, review duplicate nonempty keys privately, coordinate issuance/verification during repair, remove only the conflicting index, create/verify the intended unique sparse key index and retain TTL/email-purpose constraints. Do not drop the OTP collection, arbitrarily delete live codes or run automatic production syncIndexes. No migration or production inspection was performed here.
4. Obtain explicit product decisions: complete Atelier eligibility; limited appearance-only behavior; downgrade/grandfathering; exact pilot merchant IDs; rollout owner; production-availability authorization. Current trusted off policy and existing plan checks remain until then.
5. Prepare a compatible guarded backend/shared package/Admin/storefront release with adoption off. Validate the deployed package contents/exports and actual environment policy; a version string or local test alone is insufficient. No deployment was done in this task.
6. Before an approved pilot, export the pilot's complete published configuration and private draft with theme revision/draft token, aliases, custom-domain/settings and current merchant content. Keep a private durable copy with timestamp/checksum outside the retained revision window; the last 20 revisions are not a backup guarantee. Rehearse recovery through existing supported APIs with current concurrency tokens. An approved legacy candidate applied to the latest merchant content and published through guards is the recovery when an old customized revision is unavailable. Integration tests verify newer content survives that recovery. Off blocks new adoption but preserves legitimate existing Atelier edits; switching back to Atelier still requires authorization.
7. After those gates and an authorized pilot plan, perform any live-provider smoke test only with specifically approved recipients and actual provider/delivery evidence. This task sent none.

**Final readiness: C. BLOCKED.** Functional remediation and new isolated technical tests pass; the complete suite is not green, actual browser acceptance is missing, deployed index/configuration state is unverified and product/pilot authority remains pending. This result does not authorize publication or general availability.

---

# Atelier Editorial — Phases 5 + 6 final report

Date: 20 October 2026. **Release outcome: BLOCKED.** Essential Builder implementation and isolated regression gates pass. Required browser and disposable-database acceptance are unavailable, existing commerce issues remain, and product/rollout approval is pending. No real merchant theme was published, no rollout setting or actual environment value was changed, and no real email/SMS/OTP/courier/payment call, deployment, commit, push or dependency installation was performed.

## A. Phase status

| Phase | Status | Evidence |
|---|---|---|
| Phase 5 — Store Builder | **Blocked for final acceptance; implementation passes isolated gates** | Initial gate 409/409 before Phase 6; final gate 410/410. 27 new Builder tests cover real presentation, gallery availability, switching, content preservation, history/queue behavior and actual service guard/publication/restore functions with in-memory models. Browser iframe/UI and real MongoDB persistence are blocked. |
| Phase 6 — final verification | **Blocked** | Both production builds pass, no new lint diagnostics, 144 exact legacy route markup comparisons pass, 20 current Gallery/Builder/live SSR comparisons match. Final serialized full suite: 713/718 passed; five baseline failures remain. Current browser/network/visual/hydration and real database integration are not certified. |

Phase 0–4 prerequisites were reviewed before edits: frozen nine-theme definition/configuration/markup evidence, optional identity, default-off backend guard, shared homepage and all required supporting-page implementations exist. The previously reported zero-price cart and checkout resend limitations are understood and were not silently rewritten in this task. No new critical data/authorization/legacy failure was found at the Phase 5 isolated gate. Phase 6 proceeded only with independent safe checks; missing integration was never counted as passed.

## B. Exact files changed by this task

Compared with the 824 task-start source hashes in phase5/start-source-hashes.json. This excludes earlier Phase 0–4 work already present in the worktree. Repository-relative labels below link to absolute workspace files. Logs/JSON generated under output are evidence artifacts.

### Modified (11)

- [ecommerce-admin/src/pages/dashboard/StoreBuilder/themes/themeAvailability.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/themes/themeAvailability.js)
- [packages/storefront-renderer/atelier/atelier.css](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/atelier/atelier.css)
- [ecommerce-admin/src/pages/dashboard/StoreBuilder/PreviewCommercePages.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/PreviewCommercePages.jsx)
- [ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx)
- [ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx)
- [ecommerce-admin/src/pages/dashboard/StoreBuilder/themes/ThemeGallery.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/themes/ThemeGallery.jsx)
- [ecommerce-storefront/src/app/[subdomain]/checkout/components/CheckoutSections.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/checkout/components/CheckoutSections.jsx)
- [ecommerce-storefront/src/app/[subdomain]/checkout/page.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/checkout/page.jsx)
- [packages/storefront-renderer/presentation/CheckoutSections.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/CheckoutSections.jsx)
- [packages/storefront-theme/capabilities.cjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/capabilities.cjs)
- [track.md](C:/Users/user/WebstormProjects/Shop-for-all/track.md)

### Added (2)

- [ecommerce-backend/backend/tests/helpers/atelier-builder.cjs](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/helpers/atelier-builder.cjs)
- [ecommerce-backend/backend/tests/storefront-atelier-builder.test.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/storefront-atelier-builder.test.js)

## C. Store Builder implementation results

### Gallery, identity and authorized selection

- The existing registry, renderer-based thumbnail, candidate resolver, five preview choices and application workflow are reused. Ordinary availability still yields exactly nine cards; trusted allowlist availability yields the tenth. No browser flag authorizes persistence.
- Atelier application rechecks the latest server-derived availability at confirmation. Revocation prevents its apply callback. Failed async application retains the draft/dialog and presents a reachable error. Busy state prevents duplicate callbacks and disables cancellation/close while application is pending. Legacy application follows its previous path.
- Current-theme labeling identifies an existing hidden Atelier preset even when re-adoption is unavailable. Appearance-only provenance is distinguished from the active page presentation, using only theme.presentationVariant for runtime identity.
- Full switches to each of the nine original presets clear the marker. Limited appearance-only rules retain the protected identity. Composition edits remain independent. Existing contract/service tests cover marker-only/complete payloads, raw/normalized targets, off/unset/invalid policy, allowlist/plan policy, direct draft/publish/restore and SEO bypass boundaries.
- Local backend .env contains no Atelier rollout mode, allowlist or approved-plan keys, so it defaults off. Only these non-secret settings were inspected; no tenant IDs or secrets were logged. Running service/deployed environment overrides were not verified.

### Five previews and editing controls

- Home/product/cart/checkout/policy still use the existing shared presentation components, resolved theme and iframe viewport architecture. No category/collection/account/tracking Builder mode, new preview application, endpoint or editor was added.
- The missing separate marketing-consent element in the Atelier checkout preview now uses a small stateless CheckoutMarketingConsent view also used by live checkout. The live callback/payload/security state remains owned by the original page. The local wrapper is additive; the original live consent DOM and semantics are retained.
- Preview consent can be toggled locally. Customer fields, delivery/coupon values, cart quantities and order actions remain the existing representative non-live adapter state; preview does not pretend to validate coupons, verify phones or create orders. No new client price/shipping calculator was introduced. The submission boundary prevents default and phone verification remains false.
- The standalone checkout branding sample now receives the same explicit Atelier scope as the page preview.
- CategoryList, BrandStory and PromoBlock structural variant selectors were advertised as editable although their Atelier branches deliberately control structure. Existing capability metadata now marks those choices theme-controlled. Their content, images, links, visibility, selection IDs, order and spacing remain editable under the existing plan rules. Other section variant controls and the nine presets retain their prior behavior.
- The existing mobile hero Image first/Text first control now affects Atelier media order below 768px. Tablet/desktop composition stays independent. Existing fonts, heading weight, colors, catalog columns and bottom navigation forwarding are checked. CSS remains explicitly scoped.
- Iframe sandbox remains allow-same-origin without allow-scripts; style synchronization, scaling and viewport definitions remain unchanged: desktop 1180×800, tablet 768×800, mobile 390×800, smallMobile 320×800. Unit/SSR checks do not evaluate media queries or prove browser scaling.

### Switching, content, autosave and recovery

- Tests exercise legacy → Atelier → each legacy preset while preserving merchant logo/favicon, hero slides/media/copy, navigation, footer/contact, policies, SEO, checkout branding, payment settings and section content/product/review IDs. Existing intentional presentation/section ordering rules remain in place. Products, customers and sessions are not rewritten by theme application.
- The actual existing snapshot/undo/redo functions were executed in a test context with their state setters substituted. Identity and ancillary merchant settings survive undo, redo and snapshot recovery; malformed snapshots are rejected. This is not a browser keyboard-history test.
- The actual draft queue was checked for serialization, concurrency-token retention, conflict/pause/resume behavior and separate tenant queues. Existing source tests retain local-recovery and revision-watcher boundaries.
- Actual backend services and adoption guard were executed with Mongoose I/O replaced by two disposable in-memory record maps: authorized draft → publish → JSON hydration → legacy switch → restore succeeds; stale draft/publish and foreign revision attempts fail; another tenant remains unchanged. Asset ownership/audit I/O is mocked. These checks do not establish MongoDB atomicity, indexes, transactions, real authorization sessions or actual asset ownership.
- Recovery with adoption off was exercised without an old revision: retain a backup, apply a supported legacy preset to the latest current content and publish a new revision through the existing service. Re-adopting Atelier after switching away still requires authorization.

## D. Exact test results

| Command / method | Result | Evidence |
|---|---|---|
| Backend: node --test tests/store*.test.js, initial Phase 5 | 409 passed, 0 failed | phase5/gate-tests.txt |
| Backend: node --test tests/storefront-atelier-builder.test.js, final | **27 passed, 0 failed**, no skipped tests | phase5/builder-tests.txt |
| Backend: node --test tests/store*.test.js, final | **410 passed, 0 failed**, no skipped tests | phase6/theme-tests-final.txt |
| Backend: node --test tests/*.test.js, first parallel run | **717 total: 711 passed, 6 failed**, 0 skipped | phase6/backend-tests.txt |
| Backend: node --test tests/ai-provider-adapter.test.js | **9 passed, 0 failed** | phase6/ai-provider-recheck.txt |
| Backend: node --test --test-concurrency=1 tests/*.test.js, first serial run | 717 total: 712 passed, 5 failed | phase6/backend-tests-serial.txt |
| Same full serial command after final gallery test | **718 total: 713 passed, 5 failed**, 0 skipped | phase6/backend-tests-serial-final.txt |
| Backend PowerShell: $env:THEME_PARITY_REPORT='<local evidence path>'; node --test tests/storefront-preview-parity.test.js | **25 tests passed; 20 Gallery/Builder/live SSR comparisons identical** (10 presets × full/limited) | phase6/preview-live-parity.txt and .json |
| Admin: node node_modules/eslint/bin/eslint.js . | **18 existing errors, 4 existing warnings**, zero new diagnostics | phase6/admin-lint.txt |
| Storefront: node node_modules/eslint/bin/eslint.js . | Passed | phase6/storefront-lint.txt |
| Shared renderer ESLint.lintText comparison under storefront directory | 29 files, zero added diagnostics; one pre-existing hero diagnostic | phase6/shared-lint-comparison.json |
| Admin: node node_modules/vite/bin/vite.js build | Passed, final build 2.50s | phase6/admin-build.txt |
| Storefront: node node_modules/next/dist/bin/next build | Passed | phase6/storefront-build.txt |
| git diff --check; new-file trailing-whitespace scan | Passed | phase6/diff-check.txt |
| docker info --format '{{.ServerVersion}}' | Failed preflight: Docker Desktop Linux engine unavailable | phase5/environment.json |

### Failures retained and investigated

The final five failures are the same previously reproduced at original HEAD: ai-acceptance-provenance.test.js:11, ai-preferences.test.js:27 and security-hardening.test.js:339/:377/:883 (low-stock, promotion UI, confirmed-order/courier source assertions). No assertions were removed or baseline snapshots regenerated. Original evidence remains in phase0/preexisting-failures-at-head.txt.

The first parallel full run also failed ai-provider-adapter.test.js:24 at its 30ms deadline: the mocked fetch's abort flag was false. The same file passed 9/9 in isolation and in serialized full runs. Its source/provider files are unchanged by this task. This supports an intermittent timing-test classification; it does not prove every possible scheduling condition is safe. The failed parallel run remains in the report and log. No real provider was called.

During test authoring, two new assertions initially used a synthetic theme without the merchant hero they expected; the fixture was corrected. A later async test was interrupted because its policy-prop simulation omitted a rerender and left a mock promise unresolved; the test setup was corrected. These are recorded in phase6/test-development-notes.json, and final Builder tests pass 27/27.

### Blocked checks — not skipped or passed

- Real MongoDB draft/publish/reload/restore, concurrency, transactions, unique-index and recovery tests were **not run**. No disposable endpoint/ownership was verified; Docker is unavailable.
- Existing launchSafetyHarness can delete every collection and its name check only requires a database containing "test". That guard alone does not establish ownership/isolation. There is no verified blanket outbound-adapter isolation for this run. No shared/staging/production database was used, no app/worker was started for integration, and no production credentials were exercised.
- Required two-tenant HTTP/session/customer/order isolation, tampered totals, actual stock/order idempotency, OTP rate limits/expiry, ownership and proof-upload storage remain blocked for integration acceptance. Existing mocked/unit checks pass where applicable; 352 backend production/context/hook source hashes are unchanged.
- Local browser use is disabled in Work settings. No new browser actions, screenshots, real iframe scaling, live preview network assertions, responsive pixel comparisons, focus/keyboard/screen-reader checks, hydration checks or runtime profiling were executed in this phase. Node preview render/callback tests plus a fail-closed API/session import guard and a mocked-fetch counter verify only that unit boundary. They are not a substitute for real browser network capture.
- No new external integration, dependency installation, database endpoint guess or alternate browser-control method was used to bypass these blockers.

## E. Visual, responsive and accessibility evidence

The prior Phase 3–4 captures remain available as **historical implementation evidence**, not new Phase 5–6 screenshots:

- [output/atelier-editorial/phase3/product-desktop.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase3/product-desktop.jpg) / [output/atelier-editorial/phase3/product-mobile.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase3/product-mobile.jpg)
- [output/atelier-editorial/phase3/category-desktop.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase3/category-desktop.jpg) / [output/atelier-editorial/phase3/category-mobile.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase3/category-mobile.jpg)
- [output/atelier-editorial/phase4/checkout-desktop.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase4/checkout-desktop.jpg) / [output/atelier-editorial/phase4/checkout-mobile.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase4/checkout-mobile.jpg)
- [output/atelier-editorial/phase4/account-desktop.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase4/account-desktop.jpg) / [output/atelier-editorial/phase4/account-mobile.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase4/account-mobile.jpg)
- [output/atelier-editorial/phase4/track-verified-desktop.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase4/track-verified-desktop.jpg) / [output/atelier-editorial/phase4/track-verified-mobile.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase4/track-verified-mobile.jpg)
- [output/atelier-editorial/phase4/policy-index-desktop.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase4/policy-index-desktop.jpg) / [output/atelier-editorial/phase4/policy-index-mobile.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase4/policy-index-mobile.jpg)

Other historical home/cart/collection/policy/reset/modal captures and 168 Phase 4 route/state-width checks remain under output/atelier-editorial. The seven widths 320/360/390/430/768/1024/1440, long Bengali/English, empty/one/many products and media failures require a fresh browser rerun after this task's CSS/control changes. A reduced viewport does not prove operation with a native on-screen keyboard.

Figma connector access is unavailable in this phase. The previously verified frames 2:2–2:10, measured planning documentation and prior captures were used as references. No current pixel-diff or new Figma comparison is claimed. Deliberate differences remain: merchant data instead of fictional FORM & FOUND content; configurable grid/color values; collection's sort-only distinction; secure tracking before order disclosure; complete policies; extended auth/error/OTP/return states. New consent content matches the existing live feature, not a fictional design control. Mobile hero ordering now responds to the supported merchant option.

Static default palette contrast was calculated: ink/paper 14.01:1, muted/paper 5.48:1, accent/paper 5.76:1, primary button 15.29:1 and ink/lime 11.93:1. These pairs meet 4.5:1; they are **not** rendered WCAG certification and do not cover every inherited label, focus state, user override or disabled element. Existing labels, checkbox separation and disabled-state semantics are asserted; complete keyboard/screen-reader/touch-target/reduced-motion validation is blocked in this phase.

## F. Security, compatibility and legacy preservation

| Original preset | Frozen definition/version/configuration, effective output, route markup and SSR parity | Current browser pixels / full commerce integration |
|---|---|---|
| modern-general | Pass | Blocked; historical visual evidence retained |
| minimal-general | Pass | Blocked; historical visual evidence retained |
| modern-fashion | Pass | Blocked; historical visual evidence retained |
| editorial-fashion | Pass | Blocked; historical visual evidence retained |
| luxury-jewellery | Pass | Blocked; historical visual evidence retained |
| minimal-jewellery | Pass | Blocked; historical visual evidence retained |
| soft-beauty | Pass | Blocked; historical visual evidence retained |
| modern-electronics | Pass | Blocked; historical visual evidence retained |
| fresh-grocery | Pass | Blocked; historical visual evidence retained |

The 410-test gate retains the frozen nine-preset contracts and **144 exact legacy route markup comparisons** (27 product/category/collection + 117 commerce/account/tracking/policy states). The 20 current SSR parity cases agree across Gallery, Builder and live home. These results do not certify current pixel geometry, real merchant saved rows or commerce under real sessions. No frozen fixture or old assertion was changed.

Manual review of the touched paths found no new untrusted HTML sink, arbitrary URL renderer, notification transport, auth/order endpoint, schema migration, business calculator or second theme system. The only runtime identity remains the validated optional marker; existing sanitization, ownership, plan and write guards stay in place. Added checkbox markup is static text with React-controlled state; preview callbacks do not authorize or submit orders. Backend application source, order/auth/OTP hooks and contexts remain byte-identical to task start (352 protected files).

Installed Admin/storefront/backend theme entries resolve to the same physical shared index; both renderer hosts resolve the preserved /viewports export to the same source. Shared package version remains 1.0.0; no package/lockfile was edited. Admin React 19.2.5 and storefront React 19.2.4 remain separate app versions; Admin's existing explicit React aliases/dedupe remain. A matching version string alone is not a release-artifact compatibility check: verify file hashes/exports/fonts/SVG/CSS in the packaged deployment.

Production-asset measurement versus the preceding Phase 4 build: Admin +2778 bytes / +852 individually gzipped bytes; storefront +861 bytes / +122 individually gzipped bytes. This is a local emitted-file comparison, not initial-route transfer size or a Core Web Vitals result. No new dependency or duplicate renderer application was added. Runtime layout shift, LCP/INP, repeated API calls, image loading and hydration are unmeasured. Evidence: phase6/performance.json, assets-before.json, assets-after.json, package-compatibility.json and protected-source.json.

## G. Remaining product decisions and release blockers

1. Confirm complete Atelier subscription eligibility; whether limited plans may discover an appearance-only adaptation; downgrade and grandfathering policy. Current technical boundaries are preserved, not new product approval.
2. Name disposable pilot stores, an authorized rollout owner and approval/rollback authority. No real pilot or general availability was enabled.
3. Supply/verify an owned disposable MongoDB replica set and browser access, with no production worker and all outbound transports mocked/blocked; complete the blocked matrix.
4. Resolve the existing zero-price variant cart display/client-total defect and the active checkout OTP resend/cooldown gap in a separately focused commerce follow-up. This task did not replace price or OTP rules.
5. Resolve or formally gate the five baseline test failures, existing Admin/shared lint debt and the intermittent SDK timing test before claiming all required release gates passed.
6. Finish current visual/responsive/accessibility/runtime verification. Prior snapshots must not be regenerated to conceal a regression.

## H. Controlled release and practical recovery runbook

**Current decision: BLOCKED.** No operator should enable a merchant pilot from this report alone. When prerequisites and product/owner approval exist:

### 1. Prepare an isolated acceptance environment

- Verify the exact disposable database endpoint/name, owner and replica-set capability out of band; a name containing "test" is insufficient. Use credentials that cannot access real merchant data.
- Stop/connect no production worker to this test database. Replace/deny all email/SMS/OTP/payment/courier/webhook/media-provider side effects; prove that a test send/upload cannot reach the Internet. Do not merely rely on NODE_ENV=test.
- Only then use the existing local Mongo test setup and integration commands. Run integration serially because the harness deletes all collections. Never point MONGO_URI_TEST at production, staging or shared development.
- Test two distinct tenants across products/categories/themes/customers/sessions/carts/orders; test price/stock tampering, duplicate/retry/consent, auth/reset/OTP/tracking, eligibility and uploads; validate required indexes and publication conflict/recovery.
- Capture current browser network evidence for all five Builder modes, seven-width screenshots for every live route and Builder viewport, mobile keyboard/focus/safe-area checks and browser performance/hydration observations. Compare all nine against the existing frozen evidence.

### 2. Build/deploy compatible artifacts with adoption off

- Keep the server rollout mode off or unset, with no approved general-plan list. Build a coherent immutable source/artifact revision containing the shared contract, backend guard, Admin and storefront; verify /viewports, all existing exports, DM Sans/license, decorative assets and both CSS files in the package. No migration/backfill is required for the optional marker.
- Deploy compatible backend/contract readers and writers with the guard off first, then Admin and storefront with the same contract/renderer revision. Verify normal nine-theme reads/writes and exports after each component. Do not activate a candidate while any reader/writer is incompatible.
- Only the approved owner may enable allowlist mode with exact IDs for the authorized disposable pilot. Leave general rollout disabled and the approved-plan list empty until their separate approval. Recheck server bootstrap availability and rejection for an unapproved tenant; hiding a card alone is not sufficient.
- On the disposable pilot, save/reload, preview, publish, revision watch, switch-away and restore through existing APIs, retaining expected shop/revision tokens and checking asset ownership. Capture acceptance evidence before any proposal for real merchants.

### 3. Backup and rollback without depending on 20 retained revisions

- Before an approved pilot, export the complete tenant-scoped published snapshot and current draft/revision metadata, including merchant content, selection IDs, branding, policies, SEO, payment/checkout settings, domain/aliases and discount. Store it privately with tenant ID, theme/schema/preset versions and expected revision. Keep asset references/backups needed for recovery. Verify restoration on a disposable clone. No backup was taken from real merchant data in this task.
- To stop new adoption, set rollout off in the approved environment. This does not erase an unchanged legitimate published Atelier identity; existing edits and switching away remain allowed.
- If a previous compatible revision exists, use the existing restore flow with the current expected revision after previewing its content. Restoration creates a new revision; it is not a database overwrite.
- If old revisions have expired, load the **latest** tenant snapshot/draft, apply a supported legacy preset with full authorized Builder access and review preserved content, sections and controls. Save and publish through the normal conflict/ownership validation; verify the marker is absent and the real storefront follows the legacy path. Use the private export to restore any deliberately chosen older content, rather than blindly replacing newer merchant edits.
- Restoring/re-adopting Atelier from a legacy state requires the server policy to authorize it again, even from a backup/revision. Do not bypass that boundary.
- Preserve compatible code until affected stores have switched back or restored a compatible snapshot. Only then consider code rollback to a release that cannot read the new marker. Do not delete database collections, bulk-migrate stores or copy a different tenant's theme/assets as recovery.

No step above was executed against a real deployment. Approvals, integration, pilot enablement and merchant publication remain future actions.

---

# Atelier Editorial — Phase 5 gate / Phase 6 active

Essential Builder changes pass 409/409 focused tests, including 26 new component/history/service unit tests. No new critical compatibility failure identified. Real MongoDB persistence and browser acceptance remain blocked by unavailable isolated infrastructure; these are not passed. Phase 6 independent regression/build/static checks are in progress. General adoption remains off; no live publication or external providers.

---

# Atelier Editorial — Phases 3 + 4 implementation report

Date: 20 October 2026. Scope: only the requested Phase 3 and Phase 4 work. **Presentation implementation is finished; production acceptance is conditional on the blockers below. Phase 5 has not started.** Atelier remains hidden and server adoption remains off by default. No actual environment settings, merchant database records, notifications, orders, publication, deployment, commits or dependencies were changed.

## Phase status

| Phase | Result | Evidence and limits |
|---|---|---|
| 3 — product, category, collection | **Implemented; isolated frontend gate passed before Phase 4** | Intermediate 259/259 theme tests; 27 exact original-theme route markup comparisons; product variant/quantity/cart/buy, filter retention and queries, collection sorting/pagination, image failures and long Bengali content exercised in the browser. Canonical server route and commerce-hook sources unchanged. |
| 4 — cart, checkout, account, tracking, policies, shared states | **Presentation implemented; isolated regression gates pass** | Final 383/383 theme tests, 117 additional exact legacy markup comparisons, mocked guest/customer checkout and secure tracking actions, both builds. Existing zero-price cart totals and active checkout resend/cooldown limitation remain acceptance gaps. Database/provider/live tenant integration is not certified. |

## Architecture and reused business logic

The only runtime presentation discriminator is the existing validated optional theme.presentationVariant = 'atelier-editorial', selected through getStorefrontPresentationVariant. Homepage composition, preset provenance, URL and merchant identity are not used to select the presentation. An absent marker retains the original branch. No stateful page was extracted, no new route application, theme provider, commerce service or price/variant algorithm was introduced.

- Scoped atelier-pages.css styles the existing product, catalog, cart, checkout, account, tracking and policy trees. Existing product hooks, CartContext, account session handlers, checkout OTP/coupon/totals/form hooks and tracking handlers are reused.
- Product details keep gallery/zoom/fallback, variant availability, stock, SKU/barcode, ratings/reviews, quantity, Add/Buy, information tabs and related products. Related products use the existing card primitive with Atelier presentation. Unbacked generic purchase claims are omitted only for Atelier.
- Category keeps all existing filters, chips, query names, sorting and pagination. Its mobile sheet retains selection. Collection keeps its distinct sort/pagination contract; no fake category filters were added.
- Cart retains tenant storage and pending coupon behavior: "Coupon saved. It will be validated during checkout." Checkout retains required customer fields, COD, both zones, real coupon calculation, separate policy/marketing consent, phone proof, guest/customer endpoints, idempotency and success-only cart clearing.
- Account retains login, registration/email verification, existing resend timers, reset stages, history expansion, profile, password changes, logout and the vendor branch. Theme-gated label associations were added where controls lacked accessible names.
- Tracking retains access-code authorization and shows no order before verification. Existing eligible cancellation, returns, selected items, required images, optional video and multipart payloads remain intact. Proof previews use an Atelier-only group role so their existing remove button is exposed to assistive technology.
- Policies retain all four full merchant/fallback documents, TOC, individual routes and unknown-type 404. Merchant text is escaped.
- Search, variant picker, OTP and tracking dialogs gain Atelier-only focus containment, Escape dismissal, busy restrictions, focus restoration, scroll locking and short-viewport scrolling. Consent remains separate and avoids bottom action bars. Atelier toast options use the same library/store, above bottom actions and below dialogs. A single exact CSS relationship hides the existing outer duplicate toast host only when its direct tenant root explicitly selects Atelier; legacy host behavior is unchanged.
- Existing five Store Builder preview modes reuse the same product/cart/checkout/policy presentation props. No optional category/account/tracking preview modes were added. Full Builder persistence/parity verification belongs to Phase 5.
- Only the unreleased Atelier preset's checkout defaults were refined to white card/input surfaces and an ink button. Existing merchant overrides still win; a regression assertion covers this. The original nine definitions and versions remain frozen.

### New presentation pieces

- [packages/storefront-renderer/atelier/AtelierAccountAccent.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/atelier/AtelierAccountAccent.jsx) — stateless account accent, with two local Figma decorative SVGs.
- [packages/storefront-renderer/atelier/useAtelierDialog.js](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/atelier/useAtelierDialog.js) — presentation-only focus/keyboard/scroll helper; owns no auth/OTP/request state.
- AtelierCheckoutDialog inside CheckoutSections.jsx — small focus wrapper around the existing modal tree. The legacy modal remains callable without React hooks; the existing direct-call security assertion is preserved.
- [packages/storefront-renderer/atelier/atelier-pages.css](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/atelier/atelier-pages.css) — exact-identity scoped page styles; one explicitly tested parent-host rule as described above.

## Exact verification results

Commands are run from the named project directory with the installed Node runtime. Logs and JSON are under output/atelier-editorial/phase3 and phase4.

| Check | Command / method | Final result |
|---|---|---|
| Prerequisite theme baseline | Existing focused theme suites before edits | 226 passed, 0 failed |
| Phase 3 gate | node --test tests/store*.test.js, before Phase 4 additions | 259 passed, 0 failed |
| Final theme/Builder gate | Backend: node --test tests/store*.test.js | **383 passed, 0 failed**, 23 files |
| Full backend unit/security suite | Backend: node --test tests/*.test.js | **691 tests: 686 passed, 5 baseline failures**; no skips |
| Admin lint | Admin: node node_modules/eslint/bin/eslint.js . | 18 baseline errors, 4 baseline warnings; no additions |
| Storefront lint | Storefront: node node_modules/eslint/bin/eslint.js . | Passed |
| Shared renderer lint | ESLint.lintText from storefront directory, 29 files vs task-start snapshots/HEAD | No added diagnostics; StorefrontHero.jsx has its same existing diagnostic |
| Admin production build | Admin: node node_modules/vite/bin/vite.js build | Passed |
| Storefront production build | Storefront: node node_modules/next/dist/bin/next build | Passed |
| Diff hygiene | git diff --check; scan new source/fixtures for trailing whitespace | Passed |
| Database preflight | docker info --format '{{.ServerVersion}}' | **Blocked**: Docker Desktop Linux engine unavailable; no destructive harness or shared database used |

### Original nine-theme evidence

- 27 exact original markup hashes: nine presets × product/category/collection.
- 117 exact original markup hashes: nine presets × cart/checkout/policy/login/registration/reset/dashboard/profile/security/vendor/tracking/OTP/policy-index. These frozen values were generated from preserved task-start source copies; current output matches them.
- Frozen definition, version, normalization, effective configuration and existing renderer assertions remain in the focused suite. No old assertions were removed or relaxed.
- The 18 Phase 0/2 home desktop/mobile markup/style/JPEG comparisons remain available in phase2/final-legacy-comparison.json and phase0/settled. **They were not rerun after this phase**: local browser use became disabled in Work settings when opening the final comparison tab. Current route markup tests and scoped CSS checks pass; do not present the historical home captures as new visual execution.
- 355 backend production, commerce context/hook and relevant server route source hashes match task start. AST comparisons of 45 non-render functions in cart/checkout/account/tracking/reset/security files are identical. This proves source preservation, not live database or authorization acceptance.

### Browser verification (synthetic, fail-closed API adapter)

The test-only Vite fixture renders actual storefront components/hooks with synthetic merchant data. Unknown API calls throw; it does not connect to backend/provider services. Authentication context and responses are mocked. No real credentials, customer recipients, orders, OTP sends or uploads to a provider were used.

- **147 route/width cases:** 21 routes/states × 320, 360, 390, 430, 768, 1024, 1440. Zero horizontal overflow, clipped headings or visible buttons smaller than 44px. DM Sans loaded.
- **21 extra responsive cases:** reset OTP digits, verified tracking and return modal at the same seven widths. Zero measured issues. A 390×500 viewport also kept the return dialog contained and its proof/submit controls reachable by scrolling. A native on-screen keyboard was not emulated.
- Product selected a stock-2 zero-price variant with correct ID and price snapshot; quantity clamped; Add and Buy forwarded current selection. Missing/loading/one/no/broken-image/long Bengali cases were exercised. Existing authenticated review submission was sent only to the mock adapter; signed-out prompt remained.
- Category mobile filters retained price/stock/sale/rating on close/reopen and produced the original URL keys. Collection used sort/page and no unsupported filters. Tenant B's bag was empty while A's persisted items restored.
- Cart quantity/remove/empty and pending coupon UI passed. Coupon validation used the checkout mock, with zone/coupon totals visible. Guest/customer order payload field names, phone proof presence, policy acceptance and marketing=false were recorded without raw sensitive values.
- A rejected mocked customer order preserved the bag; retry reused the idempotency key; accepted response displayed the order confirmation and cleared the bag. Both guest and customer endpoints were exercised. Invalid OTP retained the bag and showed an accessible alert; busy OTP disabled close/cancel and resisted Escape. Final input focus was checkout-modal-otp.
- Registration locked identity and disabled resend during its existing 3-minute timer. Recovery retained its 60-second resend timer, six-digit paste, strength/matching validation and mock completion. History expanded, profile/security remained available, mock logout returned to login and vendor URL used the configured test admin origin.
- Tracking showed no results before access verification or after send alone. Verified requests included the existing access-token header. Pending cancellation and delivered eligible return used actual handlers; proof selection/removal controlled submit availability and multipart field names were retained. Provider eligibility enforcement and actual file storage are not verified here.
- Search Escape restored its trigger; tracking Tab wrapped and Escape restored the cancellation trigger. The installed real toast library was exercised in a test hierarchy matching the layouts: one visible Atelier host, hidden outer duplicate; both legacy hosts remained as before. Consent declined and dismissed using the existing handler.

### Important failures and blocked acceptance

1. **Existing zero-price cart display/total defect — release blocker.** Selecting a zero-price variant stores cartPrice/finalPrice=0 with the correct variant ID, but existing || price fallbacks in CartContext/CartView/checkout substitute the base price. Browser reproduction showed 0 in the bag snapshot and 1200 in the cart in both Atelier and Modern General. This predates the theme and was preserved because the task forbids price derivation/controller changes. Backend authoritative totals are unchanged, but a correct server does not excuse a misleading cart. Fix and test this as an explicit shared-commerce follow-up before release. See phase4/shared-and-edge-checks.json and the existing source paths in the manifest.
2. **Existing active checkout OTP modal has no resend/cooldown control.** The active Send Code → Verify flow has no dedicated resend action/cooldown UI. Registration and reset do have timers and those are preserved. No uncontrolled retry or duplicate OTP state was introduced. Restoring a supported server-backed checkout resend contract requires a focused follow-up; this requirement is not certified complete.
3. **Five pre-existing backend failures remain.** AI acceptance provenance, AI language/voice preferences, low-stock source assertion, promotion UI source assertion and confirmed-order/courier UI source assertion. All five were reproduced at original HEAD during Phase 0 (phase0/preexisting-failures-at-head.txt). Final full suite has exactly these five; the temporary new modal direct-call failure was fixed without changing the old assertion.
4. **Safe integration unavailable.** Real MongoDB tenant persistence/concurrency, real session authorization, backend checkout price/stock enforcement, provider delivery, live Next SSR/hydration and live publication are not certified. No integration harness was run against the configured merchant database. Docker preflight result is recorded.
5. **Lint debt remains.** The existing admin errors/warnings and one shared hero diagnostic were not changed as unrelated work. Build success does not imply lint debt was fixed.
6. **Visual/accessibility limits.** Browser measurements and keyboard checks are not a full assistive-technology audit or exact Figma pixel-diff certification. Current final home JPEG comparison was blocked as stated above.

## Figma comparison and deliberate differences

Frames 2:4–2:10 were read through the Figma connector during this task. The product uses the large 665:748 gallery ratio, editorial name/price, black Add and lime Buy; catalog uses the editorial heading/filter relationship; cart/checkout use thin separators and a white summary; account uses the dark 537px accent and exact 325×270 / 163×165 decorative SVG root sizes. Policies use the TOC/full-document composition. Screenshots were visually inspected.

- Synthetic fixture media/merchant content is clearly test-only; live application continues to use merchant content. No Figma fictional products, customer/orders, prices, courier dates, unsupported delivery promises or demo checkout handlers were added.
- Grid counts, optional cover, merchant color overrides and existing supported controls can differ from Figma by configuration. Collection has no fake category filter rail.
- Tracking retains the real verified sequence and all existing status/timeline/payment/cancellation/return sections. It does not display the Figma example order before authorization. Its current step content is arranged vertically; extra existing sections extend the design.
- Mobile, narrow tablets, registration, reset, dashboard/security/vendor, empty/error/loading and return dialogs extend the same visual language beyond the static frames.
- Full policies replace the design's short example excerpts. Existing business copy and merchant/fallback policies are retained; Atelier's COD explanation omits platform setup instructions.
- Rounded badges or state/error treatments that convey existing commerce status remain where appropriate; they were not globally rewritten.

## Screenshots and evidence

All screenshots are isolated synthetic fixtures, not a published merchant site. The task-owned local fixture server on port 5211 was stopped after verification. Key captures:

- [output/atelier-editorial/phase3/product-desktop.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase3/product-desktop.jpg) / [output/atelier-editorial/phase3/product-mobile.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase3/product-mobile.jpg)
- [output/atelier-editorial/phase3/category-desktop.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase3/category-desktop.jpg) / [output/atelier-editorial/phase3/category-mobile.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase3/category-mobile.jpg)
- [output/atelier-editorial/phase3/collection-desktop.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase3/collection-desktop.jpg) / [output/atelier-editorial/phase3/collection-mobile.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase3/collection-mobile.jpg)
- [output/atelier-editorial/phase4/cart-desktop.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase4/cart-desktop.jpg) / [output/atelier-editorial/phase4/cart-mobile.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase4/cart-mobile.jpg)
- [output/atelier-editorial/phase4/checkout-desktop.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase4/checkout-desktop.jpg) / [output/atelier-editorial/phase4/checkout-mobile.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase4/checkout-mobile.jpg)
- [output/atelier-editorial/phase4/account-desktop.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase4/account-desktop.jpg) / [output/atelier-editorial/phase4/account-mobile.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase4/account-mobile.jpg)
- [output/atelier-editorial/phase4/track-verified-desktop.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase4/track-verified-desktop.jpg) / [output/atelier-editorial/phase4/track-verified-mobile.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase4/track-verified-mobile.jpg)
- [output/atelier-editorial/phase4/policy-index-desktop.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase4/policy-index-desktop.jpg) / [output/atelier-editorial/phase4/policy-index-mobile.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase4/policy-index-mobile.jpg)
- [output/atelier-editorial/phase4/return-modal-mobile.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase4/return-modal-mobile.jpg) / [output/atelier-editorial/phase4/return-modal-controls-mobile.jpg](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase4/return-modal-controls-mobile.jpg)

Additional reset/registration/dashboard/vendor/policy-detail/consent/OTP captures are in phase4. Machine-readable summaries: [output/atelier-editorial/phase4/gate.json](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase4/gate.json), changed-files.json, source-invariants.json, responsive-checks.json, additional-states-responsive.json, interaction-checks.json, shared-and-edge-checks.json and shared-lint-comparison.json. Phase 3 intermediate evidence remains in phase3/gate.json.

## Exact changed source/test/document files for this task

This manifest compares against the Phase 3 task-start hashes, **not HEAD**, so it excludes the previous Phase 0–2 implementation. Generated logs, source snapshots, Vite cache and screenshots under output are evidence artifacts rather than application changes. No application source outside the following list was changed.

### Modified (35)

- [ecommerce-admin/src/pages/dashboard/StoreBuilder/PreviewCommercePages.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/PreviewCommercePages.jsx)
- [ecommerce-admin/vite.config.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/vite.config.js)
- [ecommerce-storefront/src/app/[subdomain]/account/page.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/account/page.jsx)
- [ecommerce-storefront/src/app/[subdomain]/cart/page.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/cart/page.jsx)
- [ecommerce-storefront/src/app/[subdomain]/categories/[slug]/CategoryPageClient.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/categories/[slug]/CategoryPageClient.jsx)
- [ecommerce-storefront/src/app/[subdomain]/checkout/page.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/checkout/page.jsx)
- [ecommerce-storefront/src/app/[subdomain]/collections/[slug]/CollectionPageClient.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/collections/[slug]/CollectionPageClient.jsx)
- [ecommerce-storefront/src/app/[subdomain]/layout.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/layout.jsx)
- [ecommerce-storefront/src/app/[subdomain]/policies/[type]/PolicyPageClient.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/policies/[type]/PolicyPageClient.jsx)
- [ecommerce-storefront/src/app/[subdomain]/policies/page.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/policies/page.jsx)
- [ecommerce-storefront/src/app/[subdomain]/track/page.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/app/[subdomain]/track/page.jsx)
- [ecommerce-storefront/src/components/account/AuthView.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/components/account/AuthView.jsx)
- [ecommerce-storefront/src/components/account/CustomerDashboard.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/components/account/CustomerDashboard.jsx)
- [ecommerce-storefront/src/components/account/CustomerTabs.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/components/account/CustomerTabs.jsx)
- [ecommerce-storefront/src/components/account/PasswordResetFlow.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/components/account/PasswordResetFlow.jsx)
- [ecommerce-storefront/src/components/account/VendorView.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/components/account/VendorView.jsx)
- [ecommerce-storefront/src/components/product/ProductDetails.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/components/product/ProductDetails.jsx)
- [ecommerce-storefront/src/components/search/SearchModal.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/components/search/SearchModal.jsx)
- [ecommerce-storefront/src/components/storefront/AnalyticsConsentBanner.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/components/storefront/AnalyticsConsentBanner.jsx)
- [ecommerce-storefront/src/components/storefront/StorefrontVariantPickerModal.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/components/storefront/StorefrontVariantPickerModal.jsx)
- [packages/storefront-renderer/index.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/index.jsx)
- [packages/storefront-renderer/presentation/ActionButtons.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/ActionButtons.jsx)
- [packages/storefront-renderer/presentation/CartView.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/CartView.jsx)
- [packages/storefront-renderer/presentation/CheckoutSections.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/CheckoutSections.jsx)
- [packages/storefront-renderer/presentation/PolicyView.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/PolicyView.jsx)
- [packages/storefront-renderer/presentation/ProductDetailsView.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/ProductDetailsView.jsx)
- [packages/storefront-renderer/presentation/ProductExtras.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/ProductExtras.jsx)
- [packages/storefront-renderer/presentation/ProductImageGallery.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/ProductImageGallery.jsx)
- [packages/storefront-renderer/presentation/ProductInfo.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/ProductInfo.jsx)
- [packages/storefront-renderer/presentation/RelatedProducts.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/RelatedProducts.jsx)
- [packages/storefront-renderer/presentation/ReviewSection.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/ReviewSection.jsx)
- [packages/storefront-renderer/presentation/VariantSelector.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/VariantSelector.jsx)
- [packages/storefront-renderer/styles.css](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/styles.css)
- [packages/storefront-theme/prebuilt.cjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/prebuilt.cjs)
- [track.md](C:/Users/user/WebstormProjects/Shop-for-all/track.md)

### Added (24)

- [ecommerce-admin/tests/atelier-routes.config.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/atelier-routes.config.js)
- [ecommerce-admin/tests/fixtures/atelier-headers.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/atelier-headers.js)
- [ecommerce-admin/tests/fixtures/atelier-image.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/atelier-image.js)
- [ecommerce-admin/tests/fixtures/atelier-link.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/atelier-link.js)
- [ecommerce-admin/tests/fixtures/atelier-navigation.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/atelier-navigation.js)
- [ecommerce-admin/tests/fixtures/atelier-phase4-cases.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/atelier-phase4-cases.jsx)
- [ecommerce-admin/tests/fixtures/atelier-route-cases.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/atelier-route-cases.jsx)
- [ecommerce-admin/tests/fixtures/atelier-route-data.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/atelier-route-data.js)
- [ecommerce-admin/tests/fixtures/atelier-route-runtime.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/atelier-route-runtime.jsx)
- [ecommerce-admin/tests/fixtures/atelier-routes.css](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/atelier-routes.css)
- [ecommerce-admin/tests/fixtures/atelier-routes.html](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/atelier-routes.html)
- [ecommerce-admin/tests/fixtures/atelier-routes.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/atelier-routes.jsx)
- [ecommerce-admin/tests/fixtures/atelier-toast-case.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/atelier-toast-case.jsx)
- [ecommerce-admin/tests/fixtures/atelier-toast.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/atelier-toast.js)
- [ecommerce-backend/backend/tests/fixtures/atelier-legacy/phase3-markup-sha256.json](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/fixtures/atelier-legacy/phase3-markup-sha256.json)
- [ecommerce-backend/backend/tests/fixtures/atelier-legacy/phase4-markup-sha256.json](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/fixtures/atelier-legacy/phase4-markup-sha256.json)
- [ecommerce-backend/backend/tests/helpers/atelier-routes.cjs](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/helpers/atelier-routes.cjs)
- [ecommerce-backend/backend/tests/storefront-atelier-commerce.test.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/storefront-atelier-commerce.test.js)
- [ecommerce-backend/backend/tests/storefront-atelier-routes.test.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/storefront-atelier-routes.test.js)
- [packages/storefront-renderer/atelier/AtelierAccountAccent.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/atelier/AtelierAccountAccent.jsx)
- [packages/storefront-renderer/atelier/account-lime.svg](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/atelier/account-lime.svg)
- [packages/storefront-renderer/atelier/account-terracotta.svg](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/atelier/account-terracotta.svg)
- [packages/storefront-renderer/atelier/atelier-pages.css](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/atelier/atelier-pages.css)
- [packages/storefront-renderer/atelier/useAtelierDialog.js](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/atelier/useAtelierDialog.js)

## Readiness and safe next work

**Ready for Phase 5 development/verification with adoption kept off; not ready for merchant rollout.** First obtain an available disposable MongoDB test environment, then verify essential existing Builder home/product/cart/checkout/policy controls and preview parity, draft/save/reload/publish/switch/restore persistence under the server gate. Treat the zero-price defect and checkout resend/cooldown contract as explicit acceptance blockers, with focused shared-commerce follow-up authorization. Preserve the original nine tests and baselines. Product eligibility and a controlled test-shop pilot still require the decisions recorded in the planning documents. No new optional preview modes or Phase 5 implementation was started.

---

# Atelier Editorial — Phase 3 gate / Phase 4 active

Phase 3 passed its isolated frontend gate: **259 focused tests**, **27 original-theme route markup comparisons**, **21 responsive route/width checks**, zero new frontend lint diagnostics. Product zero-price variant/quantity/cart/buy, gallery failure, long Bengali, category filter retention/query/pagination, collection sort/paging and tenant cart namespaces exercised using actual frontend handlers and fail-closed API fixtures. Source authority, server routes and commerce hooks remain unchanged.

Evidence: output/atelier-editorial/phase3/{gate.json,gate-tests.txt,route-tests.txt,responsive-checks.json,content-edge-checks.json,interaction-checks.json}. MongoDB/live tenant integration remains blocked, not passed.

Active phase: **4 — cart/checkout/account/tracking/policies and shared states**. Proceed with scoped visual hooks only; no service/controller rewrite, public adoption or real provider sends.

---

# Atelier Editorial — Phases 3 + 4 in progress

Active phase: **3 — product/category/collection**. Preserve prior implementation and all legacy themes. Phase 0–2 prerequisites reviewed; isolated MongoDB integration remains blocked and is not required for safe scoped frontend work. No adoption/publication or real provider calls. Starting source hashes and targeted source copies recorded under output/atelier-editorial/phase3.

Next: isolated presentation CSS, minimal gated hooks, focused functional/legacy tests and browser verification; pass Phase 3 gate before Phase 4.

---

# Atelier Editorial — Phases 0–2 completion report

Task date: 20 October 2026. Active work: **Phases 0–2 finished; stopped before Phase 3.** Release status: **development candidate, adoption off; live persistence/pilot acceptance remains blocked.** This report supersedes the brief Atelier progress entry previously at the top. Historical tracking is preserved below.

## Completion status

| Phase | Status | Verification and limits |
|---|---|---|
| 0 — baseline and safety | **Pass** | Original Git state, 869 tracked-file hashes, frozen nine-preset contracts, 200/200 initial focused tests, desktop/mobile and commerce-preview captures, Figma and font-license review. Disposable MongoDB integration classified blocked before any destructive harness ran. |
| 1 — identity and restrictions | **Pass for isolated implementation gates** | 216/216 intermediate theme tests. Optional identity survives normalization/Mongoose hydration, clears on full legacy application, remains independent of composition; trusted off/allowlist/on and actual service write guards verified with mocked database/provider infrastructure. Real MongoDB persistence/concurrency is **not verified**. |
| 2 — homepage and preview | **Pass for fixture/automated gates** | Final 226/226 focused tests, both production builds, seven responsive widths and edge-content cases, actual gallery/Builder iframe checks, final 18 original-theme comparisons identical. No authenticated live-store checkout, real tenant publication or production delivery was exercised. |

No general release, merchant publication, subscription-entitlement change, database migration, commit, push or deployment was performed. No outbound email/SMS/OTP/payment provider was invoked. Actual .env values were not changed.

## Implementation and architecture

- The existing shared contract remains the source of truth: optional `theme.presentationVariant = 'atelier-editorial'`; missing/null uses the original rendering path. Schema version 4 and preset catalog version 3 remain unchanged. The original nine definitions and versions are frozen in pre-change fixtures.
- `getStorefrontPresentationVariant(theme)` selects presentation only from the explicit marker. Preset provenance and homepage composition cannot select the skin. Full application of a legacy preset clears it; limited appearance-only application retains protected identity under existing plan rules.
- Atelier version 1 is the hidden tenth registry entry. Ordinary galleries still expose nine. Candidate visibility comes from server bootstrap policy; frontend hiding is only UX.
- A narrow backend guard checks raw input merged with trusted persisted state and the actual normalized write target. The existing central normalizer covers draft, publish, revision restore, SEO full-theme writes and recovered snapshots. Tenant identity comes from the loaded shop; plan policy is fetched by its ID. Client plan/shop/preview flags grant no permission. Invalid identity writes fail validation before sanitization can erase them.
- Adoption defaults off. Exact authorized test shops may be enabled through server configuration. General eligibility is not invented: `on` also requires explicitly approved server plan keys, empty by default. Existing limited/full access boundaries remain in force; an appearance-only application does not acquire the structural marker. Product eligibility for general release remains a decision.
- Turning adoption off does not erase an unchanged legitimate published identity. Existing edits and a switch back to a legacy theme remain possible; reapplication/new identity requires authorization. Homepage SEO cannot change presentation/preset identity.
- Existing preview/live roots receive the same optional data attribute; no new wrapper, theme state store, API fetch, renderer application or commerce service was added.
- Small Atelier views were necessary for the editorial DOM: header, hero, product card, category/story and footer. Existing parent components prepare navigation, product prices/stock/discounts, slide models, images, links and actions. The new views do not recalculate commerce data or implement cart logic.
- All presentation selectors are gated by `data-sf-presentation="atelier-editorial"`. The local font face has a unique DM Sans name. No global body/root/utility override or production !important rule was added.
- Runtime identity, products, categories, content and destinations remain supplied by existing merchant data paths. Only isolated fixtures contain synthetic marketing copy/media. Section application preserves existing IDs, visibility, enabled duplicates, merchant content and rendered order; missing blueprint types are appended. All 13 current optional section types continue through the existing registry.
- Builder candidate thumbnails render the actual shared homepage. Existing inert preview adapters remain responsible for suppressing live commerce/customer actions. Header/hero structural controls are explicitly theme-controlled; compatible content, media, color, typography and other existing controls remain available.

## Tests and verification

Commands below ran from the indicated application directory. Logs store the expanded explicit file arguments, including the full backend suite; no destructive integration command was run.

| Check | Command / evidence | Result |
|---|---|---|
| Original focused baseline | [Exact 19-suite command and output](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase0/focused-tests.txt) | **200 pass, 0 fail** before source edits |
| Phase 1 focused | [Exact command/output](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase1-tests.txt) | **216 pass, 0 fail** |
| Final focused theme/Builder suites | [Exact 21-suite command/output](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/focused-tests-final.txt) | **226 pass, 0 fail, 0 skip** |
| Full backend unit suite | [Expanded node --test command/output](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/backend-unit-tests-final.txt) | **534 tests: 529 pass, 5 fail, 0 skip** |
| Reproduce those five on original Git HEAD | [Original-source output](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase0/preexisting-failures-at-head.txt); node --require <recorded dependency redirect> --test the same three files | **55 tests: 50 pass, same 5 fail** |
| Admin lint | `node node_modules/eslint/bin/eslint.js .`; [comparison against original source](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/admin-lint-final-comparison.json) | **18 errors, 4 warnings; no added diagnostics** |
| Storefront lint | `node node_modules/eslint/bin/eslint.js`; [output](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/storefront-lint-final.txt) | **Pass** |
| Shared renderer JSX outside app lint roots | `node ../output/atelier-editorial/lint-shared.cjs` from ecommerce-storefront; [comparison](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/shared-jsx-lint-comparison.json) | Five new JSX files: **0 errors/warnings**. All 15 reviewed JSX files: **no added diagnostics**; one pre-existing shared Hero lint error reproduced on HEAD. Uses lintText with storefront JSX config and an app-equivalent file path. |
| Admin production build | `node node_modules/vite/bin/vite.js build`; [output](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/admin-build-final.txt) | **Pass** |
| Storefront production build | `node node_modules/next/dist/bin/next build` | **Pass**, Next 16.2.10 Turbopack, compilation 3.3s, static generation 10/10; observed execution output. Existing next/font Google Geist fetch required approved network execution. |
| Backend/shared JS syntax | `node --check <file>`; [15 exact files/results](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/syntax-check-final.json) | **15/15 pass** |
| Diff/whitespace and final scope | `git diff --check`, new text-file whitespace check, final diff/manifest review | **Pass**; final summary in [verification summary](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/verification-summary.json) |
| Real MongoDB integration | Existing disposable Docker replica-set harness inspected; `docker info` failed to reach DockerDesktopLinuxEngine | **Blocked**, not executed; no shared or production DB fallback |

Final focused command (backend directory):

```text
node --test tests/store-builder-color-product-edit-images.test.js tests/store-builder-contract.test.js tests/store-builder-navigation-seo.test.js tests/store-builder-prebuilt-themes.test.js tests/storefront-atelier-contract.test.js tests/storefront-atelier-presentation.test.js tests/storefront-capabilities.test.js tests/storefront-card-inheritance.test.js tests/storefront-color-aliases.test.js tests/storefront-composition.test.js tests/storefront-control-wiring.test.js tests/storefront-effective-theme.test.js tests/storefront-first-render.test.js tests/storefront-hero-contract.test.js tests/storefront-presentation.test.js tests/storefront-preview-data.test.js tests/storefront-preview-parity.test.js tests/storefront-state-delivery.test.js tests/storefront-structural-variants.test.js tests/storefront-theme-controls.test.js tests/storefront-theme-merge.test.js
```

### Five pre-existing backend failures

Each failure reproduced from revision `40515d4f6a01f5460451613efbe592b51df692c3` using its original source. They are not relabeled as passing and were not fixed by unrelated changes:

1. `ecommerce-backend/backend/tests/ai-acceptance-provenance.test.js:11` — empty Product output chargeability/requested-section assertion.
2. `ecommerce-backend/backend/tests/ai-preferences.test.js:27` — four-generator effective voice assertion.
3. `ecommerce-backend/backend/tests/security-hardening.test.js:339` — low-stock implementation/source assertion.
4. Same file `:377` — promotion scheduling Admin-source assertion.
5. Same file `:883` — confirmed-order notification/courier UI-source assertion.

The first two concern existing AI tests; the other three assert existing notification/catalog/promotion UI text or source patterns. Reproduction establishes that this change did not introduce them; it does not establish that the underlying existing functionality is correct. They remain separate maintenance work. Likewise existing Admin lint violations remain unresolved.

### Browser inspection — actual running code, synthetic inputs

- CUA/IAB, isolated localhost Vite fixture; no authenticated merchant/customer APIs. Checked 320, 360, 390, 430, 768, 1024 and 1440px: no document horizontal overflow, detected visible heading/card/category clipping or price/action overlap; local font loaded. [Results](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase2/responsive-checks.json).
- Mobile menu expansion and Escape close, slide previous/next/dots/manual pause, unavailable-stock disabled controls and inert preview navigation were exercised. Long Bengali copy at 320/390/1440px and empty/one/many (12 categories)/all-section cases were checked. [Interaction/content results](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase2/interaction-and-content-checks.json).
- Gallery and Builder iframe carried the Atelier marker and actual editorial hero. [Preview/long-copy results](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase2/final-content-and-preview-checks.json). Its earlier empty-content observation is superseded by [fresh-bundle check](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase2/fresh-build-checks.json): zero visible hero copy/media and zero products when explicitly empty; primary hero button resolves to ink rgb(32,39,33).
- Initial computed-style captures sampled transitions. Those originals were retained, not overwritten. Canonical settled baselines were captured from an independently extracted original Git revision with transitions disabled only by fixture query `?baseline=1`. Production CSS was not weakened. Original source hashes and frozen contract fixture remain unchanged.
- Final comparison uses desktop 1440x1000 and mobile 390x900. An initially mismatched 1000px mobile viewport moved the fixed navigation; matching original height resolved it. [Final 18 comparisons](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase2/final-legacy-comparison.json) all show identical homepage markup, sampled computed styles and JPEG bytes. This evidence covers deterministic fixture inputs, not every possible merchant configuration/browser.
- Source-level and render tests cover shared preview/live composition and callback forwarding. No real user cart, OTP, payment, account, tenant network fetch or published-store end-to-end flow was claimed as verified.

## Visual review and documented deviations

Reference: Figma `sZlr7zuW8dDLDQ0ESGXSf5`, desktop `2:2`, mobile `2:3`; retrieved contexts and screenshots inspected. Implemented paper #f7f5ee, ink #202721, lime #dbec8b, violet accent with darker #4653c9 for small text, editorial DM Sans, large fluid hero, asymmetric desktop/media stack on mobile, colored product/category fields, inverse story/promo panels and editorial footer.

Official DM Sans normal variable asset and OFL1.1 license were obtained from Google Fonts `ofl/dmsans`; license accompanies the asset. Inter/Arial/system fallbacks remain, including for Bengali glyphs absent from DM Sans. No dependency was installed.

Actual final screenshots include the fixture toolbar, which is outside production storefront UI:

- [Desktop 1440px hero (1425px content capture after scrollbar)](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase2/atelier-desktop-hero.jpg)
- [Desktop full homepage](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase2/atelier-desktop.jpg)
- [Mobile 390px hero (375px content capture after scrollbar)](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase2/atelier-mobile-hero.jpg)
- [Mobile full homepage](C:/Users/user/WebstormProjects/Shop-for-all/output/atelier-editorial/phase2/atelier-mobile.jpg)

Meaningful differences: fixture merchant name/content and synthetic geometric media replace FORM & FOUND and fictional product imagery; real stores supply their own assets. Existing merchant section order, optional enabled sections, catalog/filter controls, wishlist/buy actions and policy/support links remain, so page length and content differ from the mockup. Existing merchant aspect ratios and supported configuration are honored. Decorative lime/image-field colors are intentionally theme-owned and explained in Builder. No pixel-perfect fidelity claim is made. Final screenshots were visually inspected for typography, hero, fields, section rhythm and mobile wrapping.

## Exact changed-file manifest

46 application/test/asset/tracker files changed or added; generated evidence is listed separately below. No package manifests or lockfiles changed.

| Repository-relative path | Change |
|---|---|
| [ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx) | Forward trusted availability to the gallery; reject unavailable client apply attempts for clear UX. |
| [ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx) | Apply the optional marker to the existing preview root; reuse shared views and inert preview adapters. |
| [ecommerce-admin/src/pages/dashboard/StoreBuilder/editors/BasicEditors.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/editors/BasicEditors.jsx) | Offer DM Sans only for Atelier or an already selected DM Sans value. |
| [ecommerce-admin/src/pages/dashboard/StoreBuilder/editors/ColorEditor.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/editors/ColorEditor.jsx) | Explain Atelier inverse panels and intentionally fixed decorative fields. |
| [ecommerce-admin/src/pages/dashboard/StoreBuilder/themes/ThemeGallery.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/themes/ThemeGallery.jsx) | Discover a candidate from trusted metadata; render its actual homepage thumbnail. |
| [ecommerce-admin/src/pages/dashboard/StoreBuilder/themes/themeAvailability.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/themes/themeAvailability.js) | Pure gallery filter: nine active entries by default; hidden candidate only when explicitly available. |
| [ecommerce-admin/tests/fixtures/theme-presentation.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/tests/fixtures/theme-presentation.jsx) | Synthetic Atelier content, edge cases, and test-only deterministic baseline mode; original nine fixture inputs preserved. |
| [ecommerce-admin/vite.config.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/vite.config.js) | Allow only the shared font asset directory in addition to the existing Admin root. |
| [ecommerce-backend/backend/.env.example](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/.env.example) | Document three default-off rollout variables; actual .env unchanged. |
| [ecommerce-backend/backend/models/Shop.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/Shop.js) | Optional enum field with undefined default; no backfill or legacy materialization. |
| [ecommerce-backend/backend/services/storeBuilder/storeBuilderService.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/storeBuilderService.js) | Central write-boundary validation/guard and trusted bootstrap availability; SEO scope forwarded. |
| [ecommerce-backend/backend/services/storeBuilder/themeAvailabilityService.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/themeAvailabilityService.js) | Trusted tenant/plan adoption policy; raw/merged/normalized checks; off/allowlist/on; unchanged published identity remains usable. |
| [ecommerce-backend/backend/tests/fixtures/atelier-legacy/capture.cjs](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/fixtures/atelier-legacy/capture.cjs) | Fixed-time original nine contract snapshot capture. |
| [ecommerce-backend/backend/tests/fixtures/atelier-legacy/contracts.json](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/fixtures/atelier-legacy/contracts.json) | Frozen pre-change definitions, versions, raw/normalized/effective configurations and capability outputs. |
| [ecommerce-backend/backend/tests/store-builder-prebuilt-themes.test.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/store-builder-prebuilt-themes.test.js) | Keep original nine-preset assertions on the immutable legacy subset; tenth tested separately. |
| [ecommerce-backend/backend/tests/storefront-atelier-contract.test.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/storefront-atelier-contract.test.js) | Immutable legacy contracts, marker lifecycle, Mongoose hydration, composition independence, section retention and actual service rejection tests. |
| [ecommerce-backend/backend/tests/storefront-atelier-presentation.test.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/storefront-atelier-presentation.test.js) | Bundle real shared/UI modules; verify gallery, dynamic copy, product flags/callbacks, empty hero, sections and scoped CSS/font license. |
| [ecommerce-backend/backend/tests/storefront-capabilities.test.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/storefront-capabilities.test.js) | Supply the real new guard dependency to the existing isolated service loader. |
| [ecommerce-backend/backend/tests/storefront-control-wiring.test.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/storefront-control-wiring.test.js) | Retain nine active-theme publication/rendering cases and supply the new guard dependency. |
| [ecommerce-backend/backend/tests/storefront-preview-data.test.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/storefront-preview-data.test.js) | Supply the guard dependency to the existing isolated service loader. |
| [ecommerce-backend/backend/tests/storefront-state-delivery.test.js](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/storefront-state-delivery.test.js) | Supply the guard dependency to the existing isolated service loader. |
| [ecommerce-storefront/src/components/storefront/StorefrontThemeProvider.jsx](C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/src/components/storefront/StorefrontThemeProvider.jsx) | Put the same optional presentation marker on the existing live root. |
| [packages/storefront-renderer/atelier/AtelierFooter.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/atelier/AtelierFooter.jsx) | Dynamic identity, existing navigation/support/contact/social links and platform credit. |
| [packages/storefront-renderer/atelier/AtelierHeader.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/atelier/AtelierHeader.jsx) | Editorial dynamic wordmark/logo, utilities and accessible mobile navigation. |
| [packages/storefront-renderer/atelier/AtelierHero.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/atelier/AtelierHero.jsx) | Fluid asymmetrical copy/media presentation with existing slides, destinations and controls. |
| [packages/storefront-renderer/atelier/AtelierProductCard.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/atelier/AtelierProductCard.jsx) | Editorial image fields and controls; no pricing, inventory or cart business logic. |
| [packages/storefront-renderer/atelier/AtelierSections.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/atelier/AtelierSections.jsx) | Dynamic category and story views using existing models/configured content. |
| [packages/storefront-renderer/atelier/atelier.css](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/atelier/atelier.css) | Marker-scoped paper/ink/editorial styling, responsive rules, reduced motion and local font face. |
| [packages/storefront-renderer/fonts/DM-Sans-OFL.txt](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/fonts/DM-Sans-OFL.txt) | Official SIL OFL redistribution license. |
| [packages/storefront-renderer/fonts/dm-sans-variable.ttf](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/fonts/dm-sans-variable.ttf) | Official Google Fonts normal variable DM Sans asset. |
| [packages/storefront-renderer/reference/StorefrontAllProducts.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontAllProducts.jsx) | Forward homepage presentation to cards and select its scoped container. |
| [packages/storefront-renderer/reference/StorefrontComposition.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontComposition.jsx) | Use an Atelier container while keeping the existing composition planner. |
| [packages/storefront-renderer/reference/StorefrontFooter.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontFooter.jsx) | Add the gated footer view; retain existing link preparation and mobile bottom navigation. |
| [packages/storefront-renderer/reference/StorefrontHeader.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontHeader.jsx) | Add the gated header view; retain menu state, navigation preparation, badges and search callback. |
| [packages/storefront-renderer/reference/StorefrontHero.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontHero.jsx) | Add the gated hero view, manual pause/reduced motion and Atelier empty-slide handling; preserve legacy branch. |
| [packages/storefront-renderer/reference/StorefrontHome.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontHome.jsx) | Resolve the marker once and pass it to existing homepage components. |
| [packages/storefront-renderer/reference/StorefrontProductCard.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontProductCard.jsx) | Forward the existing computed prices, stock, action handlers and design flags to an isolated view. |
| [packages/storefront-renderer/reference/StorefrontSectionRenderer.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontSectionRenderer.jsx) | Forward presentation through existing registered section branches; add scoped feature/trust hooks. |
| [packages/storefront-renderer/reference/StorefrontSectionVariants.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/StorefrontSectionVariants.jsx) | Gated category/story/promo presentation; existing category models and optional section renderers reused. |
| [packages/storefront-renderer/reference/referenceCore.jsx](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/reference/referenceCore.jsx) | Atelier-only max-width variable and quoted local-font fallbacks; old style output preserved. |
| [packages/storefront-renderer/styles.css](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/styles.css) | Import the scoped stylesheet. |
| [packages/storefront-theme/capabilities.cjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/capabilities.cjs) | Protect identity under existing access boundaries; mark Atelier header/hero structure as theme-controlled. |
| [packages/storefront-theme/index.cjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/index.cjs) | Optional validated/sanitized marker, explicit null clearing, pure selector and DM Sans support. |
| [packages/storefront-theme/index.mjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/index.mjs) | Expose the same selector to ESM consumers. |
| [packages/storefront-theme/prebuilt.cjs](C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/prebuilt.cjs) | Hidden tenth definition, full/limited switch semantics and Atelier-only merchant section retention. |
| [track.md](C:/Users/user/WebstormProjects/Shop-for-all/track.md) | Current completion report, manifest, evidence, blockers and next action; historical tracker preserved below. |

Evidence only: `output/atelier-editorial/` contains original/final test logs, source hashes, screenshots, sampled styles/markup, comparison results, source-revision failure reproduction helper, baseline Vite configuration and manifest. These are outside production runtime paths. The task-created original-source extraction/archive and dependency junction were safely removed after stopping both temporary fixture servers. Application node_modules remained intact. The original source is reproducible from the recorded Git revision; the retained baseline Vite config expects the same temporary extraction path and test-only transition-disabling fixture style. Original capture files and diagnostic attempts are retained; final files named above are authoritative.

The four initially untracked reports remain unchanged: `NEW_THEME_IMPLEMENTATION_PLAN.md`, `NEW_THEME_COMPONENT_MAPPING.md`, `NEW_THEME_REGRESSION_MATRIX.md`, `STOREFRONT_RAW_STRUCTURE_AND_FUNCTIONAL_INVENTORY.md`. Historical application code outside the manifest was not altered.

## Configuration, deployment and rollback

Only documented example settings were added:

```dotenv
ATELIER_EDITORIAL_ROLLOUT=off
ATELIER_EDITORIAL_TEST_SHOP_IDS=
ATELIER_EDITORIAL_APPROVED_PLAN_KEYS=
```

- `off` (also missing/invalid mode): no new adoption. Ordinary galleries remain nine.
- `allowlist`: only exact server-configured test shop ObjectIds, with normal existing full/limited permissions. Do not put tenant IDs in browser configuration. A full existing Builder access is needed for structural application under current policy; this is not a new product entitlement.
- `on`: additionally requires server-approved plan keys. Those keys are deliberately unconfigured; product approval is required before choosing them or enabling general availability.

Before a separately authorized pilot:

1. Restore a working positively isolated disposable MongoDB replica set; run persistence/reload, transaction/concurrent revision and tenant authorization integration gates. Never substitute the application database or run a destructive harness without verifying isolation.
2. Resolve product eligibility, downgrade behavior and exact authorized test merchants. Keep rollout off until then.
3. Deploy compatible shared-contract readers/backend first, then matching Admin/storefront builds, with adoption still off. No migration/backfill or index change is required for the optional field. Mixed-version readers must not receive pilot themes until both frontends support the marker.
4. In local development, restart Vite with `--force` after changing shared local package exports; a warm prebundle was stale during verification. Production builds already include the new exports and font.
5. Export each pilot's trusted published theme and revision before adoption, store securely by tenant, and retain beyond the existing 20-revision history. Only then authorize a narrow allowlist pilot and verify save/reload/publish/restore against disposable/test stores.
6. For rollback, restore the tenant's known legacy snapshot/export through existing authorized revision/write paths, confirm its marker is absent, then turn adoption off. Switching away is permitted even when adoption is off. Restore legacy snapshots before downgrading old contract readers; turning the gate off alone intentionally does not remove an already published theme.

No live rollout or publication was performed as part of this task.

## Remaining work and risks

- **Release blocker:** real MongoDB integration/persistence/concurrency and authenticated live tenant/publish end-to-end acceptance remain untested because the isolated database is unavailable. Mocked service tests and Mongoose hydration do not replace these gates.
- **Product decision:** final plan eligibility, approved plan keys, downgrade behavior and authorized pilot cohort. Default-off configuration is the safe state until those decisions and tests are complete.
- **Existing quality failures:** five backend unit failures and 18 Admin lint errors/4 warnings reproduced on original source; one shared Hero lint error likewise unchanged. Do not treat the full repository as clean.
- **Visual limits:** one browser engine and synthetic fixture data; actual merchant imagery, all overlay combinations, assistive technologies, live performance and all production device/browser variants still need pilot checks. Existing reduced-motion behavior was preserved/enhanced but no full accessibility certification is claimed.
- **Next authorized implementation scope:** Phase 3 product/category/collection presentation, followed by later cart/checkout/account/tracking/policy work according to the plan. Their existing commerce primitives remain intact. Extra Builder page-preview modes are optional later work and were not added.

**Next action:** provide/restore the isolated MongoDB environment and complete the recorded integration gates, then obtain explicit pilot/eligibility approval. Stop here; Phase 3 and publication need a separate instruction.

---

# Storefront Theme System — Implementation Track

Current scope: user authorized Phase 13 on 2026-10-10 (Asia/Dhaka).
Status: Phase 13 controlled render/data comparisons and targeted parity repairs implemented; 224 tests and both builds pass. Visual/browser and live infrastructure acceptance remain open, alongside earlier findings.
The current continuation advances the implementation boundary to Phase 13 without claiming full visual or deployed end-to-end completion.
No production database writes or deployment are authorized by this implementation task.

## Architecture Decisions
- Follow the revised implementation PDF in Downloads; current implementation boundary is Phase 13, with the documented earlier gates and findings open.
- Retain the existing shared theme contract, renderer, and publication architecture.
- The shared FALLBACK_THEME defines new-store defaults. Compatibility exceptions for existing sparse records remain explicit at the persistence boundary.
- No production database writes, migration run, deployment, or schema version bump. New compatibility metadata is additive; version 4 remains authoritative.
- Phase 1 is closed using the existing flat snapshot format: missing raw fields inherit; every saved concrete field is explicit. There is no attempt to recover lost historical edit intent.
- Phase 1B design: establish absent-versus-explicit semantics for hero-slide fields in the existing shared contract. Missing/null string fields inherit; explicit empty strings clear. Zero focal coordinates and false enabled flags are values. Explicit slide arrays replace legacy slide synthesis. Existing nullable preset/SEO clears remain supported.
- Do not insert fully normalized global defaults before sparse style/layout groups. Explicit selected-default snapshots and raw edit patches use createThemeInput; normalizers supply style-specific inheritance afterward.
- Keep raw field resolution separate from save-time sanitization so Builder typing retains spaces; the shared normalizer still sanitizes before persistence/rendering.
- Phase 1C decision: optional productCard.inheritedStyleFields lists only shadow, titleWeight, and buttonStyle. Absent metadata preserves legacy flat values. An empty list means all three values are explicit. Never infer provenance by value equality.
- Style selection is an explicit command that resets these three fields to the chosen style defaults. Individual edits remove the edited field from inheritance, even if its value equals the current default. UI explains the reset and offers Apply style defaults for the current style.
- Keep resolved flat values for existing renderers/older readers. Metadata is additive, version 4 remains, no database rewrite. Preset application replaces productCard and therefore discards prior style inheritance along with prior card presentation.
- Phase 1D: all six existing mergeTheme call sites are complete snapshot loads or reset construction. Preserve their shallow root overlay plus normalization as loadBuilderTheme; do not deep-merge defaults into these snapshots.
- Partial edits use shared mergeThemePatch before normalization. Objects recurse, arrays replace, omitted/undefined values inherit, false/zero/empty strings remain explicit. Null clears only the existing nullable contract paths; other nulls inherit. No normalization/sanitization during typing; normalize once at the completed-theme boundary.
- Partial card-field edits remove edited style fields from inheritedStyleFields unless the patch explicitly supplies a replacement inheritance list. Style selection continues to use the existing explicit reset command.
- Ignore prototype-control keys and bound recursive traversal. This helper is for plain JSON theme data, not arbitrary objects or a substitute for validation/sanitization.
- Phase 1E: retain normalizeThemeColors read precedence and preset data. Correct edit commands: flat aliases map to their nested targets; explicit nested values in the same update win. Resolve competing flat soft aliases in fixed order (accentBg after accentSoft), independent of object key order.
- Synchronize nested edits back only to unambiguous flat aliases (one target); exclude accentSoft because it is a distinct palette shade sharing brand.soft with accentBg. Multi-target aliases are not inverted: editing a checkout button must not recolor product actions.
- Keep incomplete hex input in local editor state; mirror only valid hex values. Apply generated brand colors first and explicit palette values second so a generated nested value cannot mask a merchant's flat palette choice.

## Completed Work
### Phase 0
- Read the revised implementation PDF and reused the existing audit at output/theme-audit/storefront-theme-audit.md.
- Confirmed the working tree contained only the pre-existing untracked output/ directory before implementation.
- Re-ran the focused baseline: 43 tests passed, 0 failed.
### Phase 1
- Selected BUG fixes: productCard.showWishlist default, allProducts.title default, and allProducts.spacing enum.
- Phase 1A complete: new Shop documents obtain the two defaults from FALLBACK_THEME; hydrated existing sparse documents retain false / 'Shop products'. Explicit values remain authoritative.
- Added Editorial to the catalog-spacing schema enum.
- Added six regression tests; all nine preset configurations survive JSON serialization, Mongoose hydration, and shared normalization unchanged.
- Phase 1B complete (BUG): shared resolveHeroSlideFields replaces Builder and renderer duplicates. Cleared slide copy/images/CTA fields survive normalization; legacy fields mirror resolved image/CTA values without truthiness fallbacks.
- Explicit empty slide arrays remain empty in the contract; absent arrays still support legacy image-based slide synthesis.
- Hero rendering consumes resolved copy and requires both text and URL for each CTA. A cleared visible heading retains a screen-reader-only shop heading.
- Nine new regression tests include actual Builder/renderer modules and 15 server renders (five hero variants x live/desktop-preview/mobile-preview).
- Phase 1C complete (BUG + MISSING FEATURE): selecting Minimal/Modern/Premium now applies shadow/titleWeight/buttonStyle defaults through a shared edit command. Optional inheritedStyleFields records provenance for these fields; subsequent field edits become explicit overrides.
- Mongoose persists the allowlisted metadata with no default injection into legacy records. Added Apply style defaults and explanatory text in the card editor. Preset application retains its curated card values.
- Eight new regressions cover legacy stability, inherited values, explicit values equal to defaults, empty inheritance lists, immutability, schema round trip, invalid metadata, and all nine presets.
- Phase 1D complete (BUG): shared mergeThemePatch recursively preserves omitted nested values, replaces arrays atomically, respects explicit values and nullable clears, removes explicit card edits from inherited fields, and clones inputs without prototype-control keys.
- Builder mergeTheme now means a normalized partial update, starting from an empty base by default. loadBuilderTheme preserves historical root-overlay behavior for complete snapshots. All six snapshot/reset call sites migrated; ordinary setThemeGroup edits use the raw patch helper to preserve typing whitespace. The special card-style command remains intact.
- Eight new tests execute the actual Builder utility and shared exports, including sparse snapshots and all nine presets; snapshot loading matches the previous implementation.
- Phase 1E complete (BUG): foreground edits mirror to brand.secondary, the renderer's authoritative text token. One-target nested edits update their flat alias, with no reverse fan-out for multi-target aliases.
- Explicit nested edits win within a mixed update, including incomplete typed hex values; overlapping flat soft aliases resolve in fixed order. Generated brand shades apply before explicit palette choices.
- Nested color controls, palette application, valid main-brand edits, and section color resets use the corrected edit path. Saved-theme normalization and preset definitions were not changed.
- Eight new regressions cover text-token persistence, nested/flat precedence, localized reverse synchronization, soft aliases, incomplete input, all nine preset no-ops, the built-in palette catalog, and generated checkout shades.
### Later phases
- See the phase-specific entries below for completed work. Phases 7, 9, 10, 11, 12 and 13 have open acceptance checks; Phase 14 remains pending.


### Phase 1F — contract closure
- All new Shop presentation defaults normalize identically to the shared fallback. Catalog subtitle and initial Featured Products section were the final drift repairs; sparse hydrated legacy values are preserved.
- Canonical input is documented in packages/storefront-theme/README.md. Stored concrete values are explicit, omission inherits, nullable clears are allowlisted, arrays replace, and responsive settings retain their existing paths.
- Added raw input layering before final sanitization. A regression test protects SEO siblings from defaults materialized by sanitizing a partial patch too early.
- Existing normalized snapshots intentionally freeze defaults as explicit values. Preset IDs do not trigger live reapplication of registry values.

### Phase 2 — compatibility and existing version 4
- Added unsupported-version guards for both incoming themes and currently stored themes on save/publication normalization. Read-only inspection remains possible without downgrading the version marker.
- Safe unknown root and strict-schema nested fields survive in optional extensions metadata; existing Mixed fields retain supported data. Effective public output excludes the archive.
- The archive is sanitized, bounded JSON, not a byte-for-byte backup of unsafe/rejected data. Prototype-control and Mongo operator keys are removed.
- No migration-on-read or database backfill. Existing revisions and publication transaction logic remain in place.
- Limited-plan comparisons use normalized values. The server-owned banner migration flag no longer causes false design-permission failures.

### Phase 3 — shared effective resolution
- Shared resolveEffectiveTheme owns normalization, plan filtering, branding overlay, policy fallback, and normalized responsive configuration. CJS and ESM expose the same resolver.
- Public settings, shop info, bootstrap and legacy catalog use one server environment adapter; branding assets/CTA targets remain tenant scoped. Public responses retain themeRevision.
- Builder bootstrap provides resolved branding to the preview. Builder and Gallery previews apply the same context/resolver, while editable snapshots retain unrestricted configuration.
- Storefront provider/routes and shared Header/Home/Footer use the shared effective resolution boundary.
- Backend, Admin and storefront policy helpers now delegate to one existing template source. Merchant-authored text remains authoritative.
- Configuration parity is verified; full page composition, CSS viewport behavior and initial provider lifecycle remain later-phase work.

### Phase 4 — registry and genuine composition (2026-10-08)
- Added HOMEPAGE_COMPOSITIONS and a stable section-slot planner to the existing shared contract. layout.homepageComposition is normalized, validated and persisted using the same registry-derived enum.
- Added discovery (Modern Electronics), editorial (Editorial Fashion), and boutique (Luxury Jewellery) structures to the shared Home renderer. The remaining six preset families explicitly use standard; old saved themes missing the field retain the legacy composition.
- Catalog version is now 3. The three changed presets advance to version 3; unchanged presets remain version 2. Gallery offers Apply update for an older selected preset through the existing draft confirmation/undo flow.
- Components reuse existing hero, sections, catalog, commerce callbacks and editor selection. No API or database-loader changes. No preset-ID branching in the renderer. Unclaimed sections preserve merchant order; unavailable or viewport-specific slot content does not reserve a side column.
- New source: packages/storefront-theme/composition.cjs and packages/storefront-renderer/reference/StorefrontComposition.jsx. Integration: shared index CJS/ESM, prebuilt registry, Shop schema, StorefrontHome, ThemeGallery. Tests: storefront-composition.test.js; existing preset version assertions updated.
- 126 focused tests pass (seven new composition tests); includes 15 real representative home server renders across live/desktop/tablet/mobile/small-mobile modes, schema round trips, legacy fallbacks, plan boundaries, section conservation and commerce callback forwarding.
- Admin and Next production builds pass. Both generated CSS outputs contain the three composition grid templates. Logs: output/theme-audit/phase4-tests.txt, phase4-admin-build.txt, phase4-storefront-build.txt.
- No browser screenshot/computed-style check, live publish transaction, database migration or deployment. Gallery thumbnails remain simplified until Phase 6. Phase 5 capability classification is the next boundary.

## Current Problems
- No failing tests remain in the Phase 1–3 focused suite.
- Browser layout/interaction parity, provider first-render consistency, publication integration and deployment remain unverified.
- Previously normalized legacy data cannot reveal historical edit intent; compatibility deliberately treats saved fields as explicit.
- The old per-subphase limitations in the session log are historical; the Phase 1F–3 entries and current contract README supersede them.

## Confirmed Root Causes
- Independently maintained persistence defaults and enum values drifted from the shared contract.
- Hero resolution was duplicated in three places with different fallback rules. Truthiness checks treated explicit clears and zero coordinates as missing, and final JSX reintroduced legacy copy after resolution.
- Card style selection previously changed only the style label in a fully materialized object. Saved shadow/titleWeight/buttonStyle values then overrode the new style defaults during normalization.
- The prior mergeTheme spread objects only at the root: a partial nested object replaced the whole existing group, then normalization filled lost siblings with global defaults. Complete snapshot loads need different semantics and are now explicit.
- Advanced foreground edits were missing a brand.secondary alias. Flat-to-nested mirroring ran after nested edits and overwrote explicit section values; overlapping flat aliases depended on property insertion order. Generated palette values and explicit choices needed distinct application steps.
- Additional repaired causes: public settings omitted branding; policy defaults had three implementations; previews omitted public plan/branding context; strict schema serialization discarded unknown fields; unsupported future versions could be downgraded on save.

## Files Changed
Phase 1F–3 additions: packages/storefront-theme/{effective.cjs,policies.cjs,README.md}; backend services/storeBuilder/{effectiveThemeService.js,themeCompatibilityService.js}; public controllers, Builder bootstrap, policy facades, Gallery/Builder preview props, storefront theme facade and shared rendering boundaries; tests/storefront-effective-theme.test.js. Existing policy/branding tests follow the consolidated entry points.

Historical Phase 1A–1E file list:
- track.md: implementation status and handoff (created this session).
- ecommerce-backend/backend/tests/store-builder-contract.test.js: six regression tests for defaults, Editorial spacing, explicit values, legacy hydration, and all nine presets.
- ecommerce-backend/backend/models/Shop.js: import shared defaults, retain historical defaults during legacy hydration, and accept Editorial spacing.
- packages/storefront-theme/index.cjs: shared hero field resolver, sanitize after resolution, explicit array handling, and legacy mirror repair (Phase 1B).
- packages/storefront-theme/index.mjs: export the same resolver to ESM consumers.
- ecommerce-admin/src/pages/dashboard/StoreBuilder/storeBuilderThemeUtils.js: reuse shared resolver and preserve empty CTA values during synchronization.
- packages/storefront-renderer/reference/referenceCore.jsx: reuse shared resolver, including zero focal coordinates.
- packages/storefront-renderer/reference/StorefrontHero.jsx: honor cleared visible copy and CTA URLs.
- ecommerce-backend/backend/tests/storefront-hero-contract.test.js: new executable contract/consumer/server-render regressions. Requires installed Admin development dependencies (Rolldown) and React; does not write a bundle to disk.
- Phase 1C extends packages/storefront-theme/index.cjs and index.mjs with allowlisted inheritance, validation, and updateProductCardSetting; extends models/Shop.js with optional inheritedStyleFields.
- ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx: routes card edits through the shared command.
- ecommerce-admin/src/pages/dashboard/StoreBuilder/editors/ProductCardsEditor.jsx: explicit style-reset explanation and Apply style defaults button.
- ecommerce-backend/backend/tests/storefront-card-inheritance.test.js: eight new regression tests.
- Phase 1D extends packages/storefront-theme/index.cjs and index.mjs with mergeThemePatch; extends storeBuilderThemeUtils.js with loadBuilderTheme and corrected mergeTheme; updates StoreBuilderPage.jsx snapshot calls and ordinary field edits.
- ecommerce-backend/backend/tests/storefront-theme-merge.test.js: eight new executable merge/compatibility tests; uses installed Admin Rolldown to load the real utility without writing a bundle.
- ecommerce-admin/src/pages/dashboard/StoreBuilder/storeBuilderColorState.js: foreground mapping, deterministic forward precedence, and scoped reverse alias synchronization.
- ecommerce-admin/src/pages/dashboard/StoreBuilder/storeBuilderColorConfig.js: applyColorPalette separates generated defaults from explicit palette choices.
- Phase 1E also updates StoreBuilderPage.jsx palette/main-brand/section-reset call sites.
- ecommerce-backend/backend/tests/storefront-color-aliases.test.js: eight new color edit/normalization/schema/palette regressions, executing actual state and palette helpers.

## Tests Run
### Final Phase 1–3 verification
- 119 focused tests passed, 0 failed, 0 skipped. Command and results: output/theme-audit/phase3-tests.txt.
- Includes actual public settings/shop-info/bootstrap handlers with mocked I/O for two tenants and cache hits; actual tenant-scoped branding lookup filters; future-version write/read-only behavior; all nine presets across three plans; 108 actual Builder preview renders with 324 captured renderer inputs across four device modes.
- Admin production build and storefront Next production build passed. Final rerun logs: output/theme-audit/phase3-admin-build.txt and phase3-storefront-build.txt.
- No real MongoDB publication test, browser computed-style test or screenshot parity test was performed. No isolated test database was supplied; the existing integration harness is destructive to its configured database.
- Existing Node module-type and Git line-ending warnings remain. They do not fail the checks.

### Historical verification
- Baseline command, from ecommerce-backend/backend:
  `node --test tests/store-builder-contract.test.js tests/store-builder-prebuilt-themes.test.js tests/storefront-theme-controls.test.js tests/storefront-structural-variants.test.js tests/store-builder-color-product-edit-images.test.js`
- Baseline result: 43 passed, 0 failed.
- Regression command: `node --test tests/store-builder-contract.test.js` (same working directory).
- Before source changes: 8 passed, 3 failed, confirming exactly the wishlist default, catalog title default, and Editorial enum defects.
- After source changes, the full focused command above: 49 passed, 0 failed, 0 skipped (including six new tests).
- `git diff --check`: passed. Reviewed the complete source/test diff; changes are limited to the model and contract tests, plus this track file. Git emitted the repository's LF-to-CRLF conversion warnings.
- Phase 1B red run: new hero suite had 3 passed / 5 failed before implementation. A subsequent actual renderer test reproduced legacy text and secondary-link fallback after the resolver was fixed.
- Phase 1B final command, from ecommerce-backend/backend:
  `node --test tests/store-builder-contract.test.js tests/store-builder-prebuilt-themes.test.js tests/storefront-theme-controls.test.js tests/storefront-structural-variants.test.js tests/store-builder-color-product-edit-images.test.js tests/storefront-hero-contract.test.js tests/store-builder-navigation-seo.test.js`
- Result: 66 passed, 0 failed, 0 skipped, including all nine preset configuration round trips and 15 hero server renders.
- `npm run build` from ecommerce-admin: passed (Vite production build).
- Final source diff reviewed; `git diff --check` passed. Pre-existing Phase 1A changes and output/ artifacts preserved.
- Phase 1C red run: 3 passed / 5 failed before source implementation. Green focused card suite: 8 passed / 0 failed.
- Phase 1C final command (same backend directory):
  `node --test tests/store-builder-contract.test.js tests/store-builder-prebuilt-themes.test.js tests/storefront-theme-controls.test.js tests/storefront-structural-variants.test.js tests/store-builder-color-product-edit-images.test.js tests/storefront-hero-contract.test.js tests/store-builder-navigation-seo.test.js tests/storefront-card-inheritance.test.js`
- Final result: 74 passed, 0 failed, 0 skipped. Admin `npm run build` passed again. Reviewed new source and UI diff; `git diff --check` passed.
- Phase 1D red run: 8 new tests failed before implementation (lost sibling values plus missing shared patch/load APIs). Green focused suite: 8 passed, 0 failed.
- Phase 1D full command, from ecommerce-backend/backend:
  `node --test tests/store-builder-contract.test.js tests/store-builder-prebuilt-themes.test.js tests/storefront-theme-controls.test.js tests/storefront-structural-variants.test.js tests/store-builder-color-product-edit-images.test.js tests/storefront-hero-contract.test.js tests/store-builder-navigation-seo.test.js tests/storefront-card-inheritance.test.js tests/storefront-theme-merge.test.js`
- Result: 82 passed, 0 failed, 0 skipped. Admin `npm run build` passed. Added cyclic-input depth assertions afterward and reran the merge suite: 8 passed. No production code changes after the full suite/build.
- Reviewed the new shared helper, Builder utility, and all six migrated callers; `git diff --check` passed. Prior dirty files and output/ artifacts retained.
- Phase 1E red run: 1 passed / 5 failed before source changes. Initial test fixture referenced getThemeCssVars.colors instead of its actual colorGroups result; corrected after the foreground assertion began passing. Final targeted suite: 8 passed / 0 failed.
- Phase 1E final command, from ecommerce-backend/backend:
  `node --test tests/store-builder-contract.test.js tests/store-builder-prebuilt-themes.test.js tests/storefront-theme-controls.test.js tests/storefront-structural-variants.test.js tests/store-builder-color-product-edit-images.test.js tests/storefront-hero-contract.test.js tests/store-builder-navigation-seo.test.js tests/storefront-card-inheritance.test.js tests/storefront-theme-merge.test.js tests/storefront-color-aliases.test.js`
- Result: 90 passed, 0 failed, 0 skipped. Admin `npm run build` passed. Reviewed the color helper/config/Builder integration diff; `git diff --check` passed.

## Failed Tests / Known Issues
- No baseline failures. Existing MODULE_TYPELESS_PACKAGE_JSON warning for the storefront theme module is unrelated.
- No remaining failures in the 49-test focused suite.
- No remaining failures in the expanded 66-test suite. Initial standalone bundling emitted peer-resolution warnings; explicitly externalized React/icons and pointed the test at the repository's actual shared contract export. Final hero runs had no such warnings.
- No remaining failures in the expanded 74-test suite. Existing module-type and Git line-ending warnings remain unrelated.
- No failures in the 82-test suite or final merge rerun. Existing module-type and line-ending warnings remain.
- No failures in the expanded 90-test suite. Existing module-type and line-ending warnings remain unrelated.
- Initial test authoring run had two additional test issues: an incorrect positional call to the preset resolver and an overly broad assumption about hydration dirty paths. Corrected the call to the actual object-argument API and checked the two affected paths directly. Existing array defaults can mark other theme paths dirty on sparse hydration; that behavior predates this repair.
- Database integration, publication, browser screenshots, and deployed storefront behavior have not been verified in this session.

## Migration / Compatibility Notes
- Preserve explicitly saved false and empty-string values.
- Verified old records with no theme, an empty theme, or empty affected groups retain their historical defaults when hydrated. Default callbacks use Mongoose's document newness flag; no migration infers whether a previously materialized value was a merchant override.
- Verified explicit true/false wishlist values and empty/custom titles survive new-document construction, serialization, hydration, and normalization.
- Hydrated reads and lean reads remain separate existing paths; this subphase does not promise parity for every sparse legacy record across those paths.
- Editorial is an additive enum repair; no existing enum value is removed.
- No records are rewritten on read by this task.
- Phase 1B does not add a persistence format or bump the schema version. Existing normalized explicit values remain authoritative, including values equal to defaults; no override provenance is inferred.
- Deliberate behavior corrections: saved empty hero copy no longer renders old legacy copy; empty CTA URLs hide their buttons; coordinates of zero remain at the image edge. Null hero strings inherit rather than clear; use an empty string to clear. Existing nullable preset and SEO metadata clears are covered.
- Unknown valid slide properties survive shared resolution; save-time sanitizer remains in force. Builder typing whitespace is preserved until normalization/save.
- Phase 1C metadata is optional and additive. Legacy records receive no inheritance list on hydration; explicit old values remain unchanged. Choosing a style/reset deliberately resets only the three documented style fields; it does not change image settings, visibility flags, title size, colors, or merchant content.
- All currently resolved flat values remain stored for readers without metadata support. Older writers may drop inheritance metadata or fail to mark later flat edits as explicit; coordinate the updated contract, backend, and Admin rollout. No mixed-version write compatibility is claimed.
- Phase 1D changes no schema or stored records. Complete load/draft recovery/history/restore/publish-response/reset semantics remain compatible with previous root-overlay normalization, including sparse Minimal card styles and layout settings.
- Null in a partial object inherits unless its exact path is an existing nullable field. Arrays replace as whole JSON values (no ID-based merging); existing normalizers can still enforce policies such as the required Policies navigation link after a merge.
- mergeThemePatch is a raw JSON operation, not a sanitizer or final resolver. Normalized mergeTheme sanitizes only after merging; current live editing preserves unfinished text. Existing dedicated color commands continue handling color aliases; generic merging does not make a legacy alias authoritative.
- Phase 1E performs no migration or schema change. All nine saved preset themes remain identical after a no-op color update and normalization. Explicit foreground edits change only foreground and brand.secondary in those fixtures.
- Multi-target aliases (for example primaryButtonBg affecting product and checkout buttons) remain one-way edit commands. A single section change cannot safely redefine every target of that alias. accentSoft remains a distinct palette shade; nested brand.soft synchronizes accentBg only.
- Incomplete typed values remain local and do not propagate as valid aliases. Existing save-time validation/sanitization remains responsible for accepted color values.

## Risks
The following includes historical subphase notes. Current limits are the unverified browser/DB/deployment gates and coordinated rollout described above.
- Compatibility defaults protect existing sparse hydrated records. Removing these exceptions later requires explicit legacy fixtures and a migration strategy.
- Historical Phase 1A scope note: subtitle and initial-section defaults were repaired in Phase 1F; final new-document parity is now tested.
- In-memory Mongoose validation is not a MongoDB persistence or publish test.
- Server markup checks do not establish browser layout, hydration, carousel interaction, or deployed preview/live parity. No production publish or database migration was performed.
- Empty bannerSlides is preserved as configuration; existing renderer/Builder fallback behavior can still show a legacy hero/editor placeholder. This does not implement a hide-hero action or change all-disabled-slide behavior.
- Rebuild/restart consumers together when rolling out the new shared export; running dev servers may retain an older optimized dependency cache.
- Card verification covers contract/edit commands, schema hydration, and production compilation. Actual browser style selection, network publication, and screenshot comparisons remain unverified.
- Raw patch traversal rejects excessive/cyclic nesting and non-plain nested objects; callers must supply JSON theme data and normalize/validate at trust boundaries. Maintain nullable patch paths when the canonical nullable fields change.
- No browser keystroke/undo/network-publish test was performed for Phase 1D. Snapshot fixtures and production compilation are verified; runtime browser parity remains pending.
- Phase 1E verification covers edit helpers, normalized color tokens, Mongoose hydration, presets/palettes, and compilation. Browser computed CSS, screenshots, network publishing, and real tenant sessions remain unverified.
- Existing normalizeThemeColors legacy-default remapping and read precedence were preserved; this edit-path repair is not a complete redesign of color storage or historical migrations.

## Deferred Work
- Phase 9 onward in the revised PDF: mobile Builder UX, provider first-render consistency, caching/autosave, complete preset differentiation, visual parity and rollout gates.
- Live MongoDB publish/restore verification needs an explicitly isolated test database.
- A coordinated application rollout is needed for the shared exports and archive metadata. Existing 60-second caches must expire or be invalidated at rollout. No mixed-version backend-write guarantee is made.

## Next Step
1. Next planned architecture phase is Phase 11 (provider/first render). Keep the Phase 10 contrast/commerce findings and all pending visual/authenticated-publication checks open until actually resolved.
2. Read this tracker, the shared contract README, Phase 10 audit matrix, and git status. Preserve existing Phase 1–10 changes.
3. Reuse the shared capability/variant/composition sources; do not restore duplicate editor contracts or silently reapply preset IDs.
4. Use output/theme-audit/phase7-control-audit.md for control coverage, corrected consumers and compatibility notes. The section toolbar now targets original draft indices by stable ID.
5. Full browser visual parity, real Mongo publish/restore, deployment, and provider/cache gates remain unverified. Phase 8 provides synthetic responsive viewport measurements; it is not full nine-theme or deployed coverage.

## Session Log
### 2026-10-10 - Redis configuration check
- User asked whether Redis is actually configured. Inspected configuration keys without printing credentials: REDIS_URL was absent from backend .env, .env.example, .env.test.example and available process/user/machine environment. ioredis is installed. No local listener was found on 6379 or backend ports 4000/5000.
- Added an empty REDIS_URL placeholder to the ignored local backend .env and documented the optional setting in .env.example. This intentionally leaves Redis disabled until a real connection URL is supplied.
- Added npm run check:redis: explicit backend dotenv loading, bounded read-only PING, credential-safe output and exit 1 when absent/unreachable. Running it locally confirmed NOT configured / per-process memory. No live Redis PONG or remote deployment configuration was verified.
- Updated deployment instructions. No Redis server was provisioned, no cache data was written/deleted, and no running service was restarted. Phase 13 remains next.

### 2026-10-10 - Phase 12
- Read the PDF Phase 12 scope and traced autosave/manual save/publish/discard, shared SEO drafts, publication CAS, revision restore, tenant resolution and both public theme caches.
- Added one per-Builder draft write queue, publication drain barrier, stale bootstrap response guards, conditional draft writes/deletes using existing updatedAt tokens, and active-shop assertions. New token-aware updates cannot recreate a discarded draft. SEO writes/discards use conditional updates against their read version. Existing clients omitting tokens retain legacy behavior for compatibility.
- Publication/restore waits for this Builder's draft requests, clears local recovery only after success, and temporarily blocks editing. Conflict reload preserves the newer shared draft. Storage failures no longer stop server autosave or falsely promise local recovery.
- Public settings/bootstrap caches include database revision/update time and effective plan inputs. Redis outages do not create fallback worker copies. Tenant ownership/availability always resolves from the database; removed both tenant cache read paths. Cache cleanup failure no longer reports a committed publication/restore as failed.
- Added a tenant-resolved no-store revision endpoint and visible-tab watcher (navigation/focus/30 seconds) that asks Next to refresh the server snapshot. No client theme setter was reintroduced.
- 188 focused tests, Admin build, storefront build and diff check pass. New tests exercise queue races, draft conflicts/discard/publication races, SEO CAS, late revision checks, domain reassignment, Redis failure behavior, restore warnings and revision cache selection without local invalidation. Homepage mixed-revision bootstrap data is retried once and rejected if still mismatched. External database/cache/framework I/O is mocked; no browser or live deployment acceptance claimed.
- Report: output/theme-audit/phase12-state-delivery.md. No schema migration, stored-theme change, database operation, deployment or commit. Phase 13 is next; existing visual/publication gates remain open.

### 2026-10-10 - Phase 11
- Tenant layout now awaits a fresh public settings snapshot, resolved through the existing contract. React request-scoped memoization shares the host/tenant snapshot with homepage data and metadata.
- Provider receives resolved settings as props, with no client theme fetch, mutable theme state or child hydration setter. Home/category/collection use the same context as header/footer/commerce. Platform defaults remain available; tenant providers reject missing snapshots.
- Failed lookups render a neutral unavailable page, missing/locked stores use notFound, and custom-domain plan redirects retain the original public path/query through a proxy-overwritten request header.
- Homepage state is keyed by tenant/revision so a refreshed published revision consumes fresh initial data. Tenant/host changes key the provider subtree; normal revision updates preserve the cart provider.
- 174 focused tests, storefront build and diff check pass. New tests cover nine-preset SSR/serialization consistency, snapshot replacement renders, public host/no-store forwarding, layout/error handling and rewrite headers. Existing catalog tests now deliberately pass a conflicting page theme to verify context authority.
- Report: output/theme-audit/phase11-first-render.md. No browser hydration/navigation run, live database publication, deployment or commit. Existing browser policy block was not worked around. Already-open tabs retain their layout snapshot until server refresh; publication awareness/invalidation is Phase 12 work.

### 2026-10-09 - Phase 10
- Audited all nine presets with isolated real draft/publish/schema/hydration cycles, customization, content retention and seven page/component renders per theme. Category/collection route clients run with framework/navigation/commerce mocks.
- Reproduced the zero-price card bug in all nine, then fixed nullish fallback. Consolidated three live catalog normalizers, repaired category/collection grid spacing/columns/alignment, and made fallback variant inventory/initial selection exclude disabled/archived variants.
- 166 focused tests and both builds pass. Report/matrix: output/theme-audit/phase10-nine-theme-audit.md. Reproducible contrast output: phase10-preset-analysis.json.
- Open findings: Luxury foreground 1.04:1 and gold buttons 3.64:1; Minimal Jewellery footer 4.35:1; Fresh Grocery sale badge 3.56:1; separate zero-discarding calculations in live cart/coupon/checkout.
- No new browser run, policy workaround, authenticated publication, database write, preset restyling, deployment or commit. Full Phase 10 acceptance remains open. Phase 11 is next in the architecture sequence.

### 2026-10-09 - Phase 9
- Improved mobile Builder navigation/focus, compact header/page controls, touch sizes, initial phone preview and bottom-sheet drawers using existing theme commands and publishing handlers.
- Actual-component browser fixture verified typography edits reaching the preview, iframe hero selection opening the inspector, drawer focus stability/trap/Escape/restore, and 44px buttons across 320/390/768/1180px.
- Found a 15px scrollbar-related overflow at 320px from body min-width; added a Builder-scoped fix. Added scroll locking for the dashboard's nested scroll parent. Final browser recheck/screenshot was blocked by browser security policy upon reconnect; did not work around it. Viewport override reset.
- 156 existing focused tests, Admin build and diff check pass. No backend/schema changes, database writes, deployment or commit. Browser fixture history/publication callbacks are stubs.
- Report: output/theme-audit/phase9-mobile-builder.md. Phase 10 implementation is next; final Phase 9 visual checks remain recorded.

### 2026-10-09 - Phase 8
- User reported everything works and explicitly authorized Phase 8.
- Added compatible semantic mobile hero ordering and homepage section spacing, plus optional default tablet product columns through the existing model/schema/editor/renderer.
- Repaired the premature mobile one-column override, aligned hero image/focal breakpoints, and removed the tablet bottom-navigation gap from commerce action bars.
- 156 focused tests and both builds pass. Browser measured Home at nine widths and four secondary pages at phone/tablet/desktop; no document overflow in the fixture. New editor values pass isolated service/schema publish/reload tests.
- Report: output/theme-audit/phase8-responsive-completion.md. Evidence: phase8-browser-evidence.json and phase8-mobile-home.jpg. Drawer interaction was not reliably activated through automation; no claim of interaction verification.
- No database writes, deployment or commit. Phase 9 is next; authenticated publication, full theme matrix, live parity, provider/cache and release gates remain.

### 2026-10-09 — Phase 7
- Repaired ineffective layout/catalog commands, filtered-section toolbar indices, last-slide disable behavior, featured selection truncation, mega menu, card hover/badge/rating controls, variant-chip colors, secondary-page heading typography, checkout color/shape consumers and review source mode. Restored the preview Buy callback.
- Every exposed nested color passes isolated draft/publish/schema/reload resolution; 20 actual product-card controls and actual typography/layout callbacks produce persisted/rendered changes. Existing spacing-default sentinel semantics are explained in the editor.
- 152 focused tests pass; both builds and diff check pass. Browser smoke verified desktop wide menu, heading font selection, Buy presentation and mobile checkout colors/shape. Screenshot: output/theme-audit/phase7-mobile-checkout.jpg.
- Report: output/theme-audit/phase7-control-audit.md. No production/database writes or deployment. Real authenticated save/publish/hard reload acceptance remains open; do not call it fully end-to-end verified.

### 2026-10-08 — Phase 6
- Replaced handmade Gallery thumbnails and independent secondary-page previews with the authoritative shared presentation. Product, cart, checkout and policy markup now lives in the existing renderer package; live adapters retain network, authentication, analytics, cart and order actions.
- Shared product/variant/media transformations, CSS utilities, provider token aliases and locally licensed Inter/Roboto fonts now feed both applications. Preview supports all supplied products and collection product references.
- Builder and Gallery use sandboxed iframe viewports so responsive CSS, fixed bars and sticky elements operate at the selected width. Outer scaling only fits the editor area.
- 140 focused tests pass, including nine-preset Gallery rendering and 45 preset/page server renders. Both production builds and git diff --check pass. Local browser smoke covers Home, product quantity, cart, checkout and policy. Screenshot: output/theme-audit/phase6-mobile-product.jpg.
- See output/theme-audit/phase6-completion.md for files, compatibility and remaining gates. No database writes or deployment. Phase 7 remains next.

### 2026-10-08 — Phase 5
- Added shared property classifications and theme/plan capabilities derived from existing registries. Editor and backend use the same capability source; duplicate Vite structural fallback removed.
- Preserved identity through ordinary edits, documented composition placement, and retained all supported variants/column choices. Existing stored composition/preset values are never inferred or reapplied.
- Fixed editor-only mobile/color restrictions, unavailable sticky-checkout control, exposed section actions that the backend rejects, advanced-section type-conversion bypass, and restore/persistence plan-check gaps.
- 134 focused tests pass, including nine new capability tests and replacement of one obsolete source assertion with actual editor rendering. Both production builds pass. See output/theme-audit/phase5-completion.md and packages/storefront-theme/README.md for the matrix and compatibility changes.
- No database writes, deployment, browser visual claims, or subagents. Phase 6 remains next.

### 2026-10-08 — Phase 4
- User requested continuation. Read PDF Phase 4/5/6 boundaries and inspected the preset registry, shared Home renderer, persistence and Gallery flow.
- Implemented three representative compositions in the existing architecture. Versioned the changed presets and provided explicit update application without auto-changing saved stores.
- Initial regression identified expected catalog-version assertions; updated the explicit per-preset version fixture. New tests and both builds pass. Preserved the earlier uncommitted work and commit 49f4d04.
- Stopped at the Phase 4 boundary. Next: Phase 5 capability/identity classification.

### 2026-10-07 — completion through Phase 3
- User explicitly extended the scope to Phase 3 and later said continue.
- Consolidated defaults, compatibility/version checks, public and preview resolution, and policy fallbacks. Preserved tenant loaders outside the pure resolver.
- Regression tests exposed an omitted Joi fixture in the mocked handler harness, Mongoose subpath-cache behavior in archive detection, and raw ObjectId serialization at the effective resolver boundary; corrected these and reran the suite.
- 119 focused tests pass. Both production builds pass. Configuration parity is verified through real preview/handler code with external I/O mocked.
- No database writes, deployment, screenshot claims, or new agents. Stopping at the requested Phase 3 boundary.

### 2026-10-07 10:58
- User requested continuation. Read track, inspected alias map, normalization, color controls/palette composition, and shared renderer foreground consumption. Confirmed missing foreground mapping and conflicting flat/nested update precedence. Starting the bounded edit-path fix.
### 2026-10-07 11:01
- Completed Phase 1E. Eight new tests and 90 total focused tests passed; Admin production build and diff check passed. Confirmed no-op preservation for all nine theme presets and explicit color behavior across the built-in palette catalog. No database writes, deployment, or browser visual testing. Stopped at the boundary.
### 2026-10-07 10:52
- User requested the nested-merge step. Read track, confirmed prior dirty files, inspected all six calls and state editing, and recorded snapshot-versus-patch behavior before implementation.
### 2026-10-07 10:55
- Completed Phase 1D: shared raw patch, normalized merge utility, compatible snapshot loader, and ordinary Builder field integration. 82 focused tests passed; final merge suite with cycle guards passed; Admin build and diff check passed. No database writes, deployment, or browser interaction test. Stopped at the boundary.
### 2026-10-07 05:34
- User requested continuation after Phase 1B. Inspected card editor, state setter, contract normalization, Mongoose persistence, Mixed draft storage, plan policy, and preset replacement.
- Recorded the narrow provenance representation and explicit reset semantics before implementation. Existing themes must retain their appearance until a merchant chooses a style/reset action.
- Completed Phase 1C. 74 tests passed, Admin build passed, source/UI diff reviewed, whitespace check passed. No database writes, deployment, or browser interaction verification. Prior Phase 1A/1B work retained.
### 2026-10-07 01:12
- Reviewed revised requirements, current source, and prior audit; baseline passed. Starting regression tests for the bounded persistence repair.
- Regression fixtures now reproduce the three intended failures and pass compatibility checks before source edits.
### 2026-10-07 01:14
- Completed the three schema repairs. Focused suite: 49/49 passed; all nine presets passed configuration round trips. Diff reviewed and whitespace check passed.
- No database operations, deployment, browser tests, or visual parity verification performed. Full Phase 1 and subsequent phases remain pending.
### 2026-10-07 01:25
- User requested the next step. Re-read track and inspected contract, Builder utility/call sites, and renderer. Found duplicated hero resolution, truthiness fallbacks restoring cleared content, and zero focal points coerced to 50 in Builder and renderer.
- Selected one bounded Phase 1B repair. Generic nested merging is deferred until override provenance can be represented safely.
### 2026-10-07 01:30
- Completed shared hero resolution and final renderer corrections. 66 tests passed, including 15 server-render assertions; Admin build passed; diff reviewed and whitespace check passed. No database writes or deployment. Stopped at the Phase 1B boundary.

### 2026-10-10 - Phase 13
- User authorized the next phase after Redis configuration. The read-only Redis check returned PONG; running services and remote deployment remain unverified.
- Read Phase 13 scope from the revised PDF. Defined one viewport manifest and added exact markup comparisons across the actual Gallery full preview, Builder panel and live provider/navbar/home/footer with controlled inputs. All nine presets on full/limited plans match (18 cases, 54 renders); unavailable plans reject preset previews.
- Fixed Gallery discount forwarding, preview badges, empty-store categories, mobile navigation positioning, shared font utilities and viewport-height/language differences.
- Builder loads public cards with existing projection/sale/sanitization rules, separates initial catalog from selected products, loads draft-only selections and review product titles. Later picker pages opt into public card data and preserve detail fields/public categories. Live Collection sections now fetch off-page selections; live bootstrap sanitizes its product output.
- 224 tests, both production builds and diff check pass. Report: output/theme-audit/phase13-preview-live-parity.md. Matrix: phase13-parity-matrix.json. Database/service doubles are used; no browser run or workaround, database write, migration, deployment or commit.
- Full Phase 13 acceptance remains open: screenshots/computed layout, authenticated publication, active scheduled banners/popups, full secondary-page comparisons, and earlier contrast/commerce findings. Phase 14 is next in the plan.

### 2026-10-10 - Phase 13 development-server follow-up
- User reported the Vite overlay for the new renderer /viewports export. Both the source and installed junction manifest already contained the export; the existing development server returned HTTP 500 while cold production builds had passed.
- Confirmed Vite package-data caching skips manifest watching under node_modules with preserveSymlinks enabled. Added explicit real-path manifest watching for the two local storefront packages in ecommerce-admin/vite.config.js; manifest changes restart Vite to clear its package-resolution cache.
- The config edit restarted the existing dev server. Its actual transformed StorefrontPreview module and resolved viewports module now both return HTTP 200; the viewport export is present and the preview response has no Vite error overlay. This is HTTP/module verification, not a browser visual or Phase 14 acceptance run.

## AI Admin implementation - 2026-10-10

- Scope: latest implementation request; R01-R15 in five ordered phases. R16 and autonomous commerce remain deferred. Existing theme changes are preserved.
- Reference: docs/AI_ADMIN_PLATFORM_SECOND_STAGE_REVIEW.md; the separately named (2) copy was not found in Downloads or attachments. Five original audits were read during the preceding review and current source is revalidated before edits.
- Phase 1 / R01 in progress: owned weekly receipts, immutable period/deadline, durable outcome before settlement, idempotent recovery, terminal acknowledgement and delayed receipt pruning. Input binding and truthful pending usage are integrated foundations for R06/R08.
- Changes: backend AI configuration/models/accounting/policy/recovery. Verification pending; no release claim.
- Cutover: new admissions require explicit accounting version 2. Legacy counters require quiesced old writers and reviewed migration; no customer database/environment/deployment operations authorized or performed.
- Runtime: Docker CLI is installed but its daemon was unavailable; starting the local runtime for disposable Mongo tests. Provider calls remain mocked.
- Remaining: phase 1 fault/topology tests + migration + worker; phases 2-5; final security/reliability review.
- Phase 1 verification: `node --test tests/ai-accounting.test.js tests/seo-ai-production-hardening.test.js`: 11/11 pass. `node output/run-ai-accounting-tests.cjs`: 10/10 on standalone + 10/10 on replica set (Mongo 7.0.14, isolated loopback databases). Faults cover creation/reserve/running/outcome/settlement/ack/prune/TTL, repeated recovery and original-week ownership. A portable test-only Mongo runtime was installed under output because Docker could not start; no backend runtime dependency added. Replica-set shutdown emitted ECONNRESET after tests; test results themselves passed.
- Broader `npm test`: 442 tests, 433 pass, 9 fail. Failures are pre-existing theme/source-pattern assertions in catalog-category-collection-management, phase2-scheduling-runtime, product-content-ai, security-hardening and seo-rendering; these renderer sources were unchanged by AI Phase 1. R09 will replace obsolete source assertions with behavioral coverage, without disabling checks.
- Worker recovery, fail-closed configuration, dry-run/idempotent migration and merchant-safe operation errors added. Source diff reviewed; operational cutover remains unexecuted. Phase 2 begins with provider transport and acceptance.
- Phase 2 / R02,R03,core R07: one shared Gemini transport with actual SDK AbortSignal, pre-abort rejection, total deadline, bounded Product quality repair, safe status errors and nullable attempt token metadata. Client disconnect is cancellation intent; unknown outcomes have a bounded tenant cooldown, never a remote cancellation claim.
- Product checks every requested section; Collection/SEO/Growth acceptance precedes fallback synthesis. Concise Bangla accepted. Growth mixed output is explicitly mixed and free pending a charging-policy decision. SEO field origins survive shared sanitization; manual edits invalidate only the edited field; old matching text is unknown_legacy.
- Verification: 66/66 focused tests pass, including replacement of the four stale regex assertions with rendered behavior/actual helper calls; Admin production build passes. HTTP generate/Apply/draft reload/publish/revision/shared resolver passes on both standalone and replica set, alongside 10 accounting tests each (11/11 per topology). All provider results are synthetic. No customer writes/deployments/provider charges.
- Phase 3 begins: safe context/image boundaries, canonical resolved context, frontend operation lifecycle, Growth interval/Collection integrity, telemetry/operator health, remaining behavioral/security/browser gates.

### AI phases 3–5 — 2026-10-12

- Phase 3 / R04–R10: bounded public context, privacy-safe aggregates, tenant-owned bounded image decoding, canonical identity/context hashes, shared operation/usage/Undo lifecycle, exact Growth intervals, Collection ownership and operator attempt health. Added Sharp solely for safe image decoding/re-encoding. Prior full backend gate was 459/459; phase-3 topology gate 12/12 each. Product/Collection synthetic browser flows passed in the earlier run; SEO/Growth full browser acceptance remained open.
- Phase 4 / R11–R13: contextual permission/plan/quota feedback, stronger billing/verification guards, unused Admin SDK removal, Product readiness issue selection and editable suggestions, private versioned Store Branding voice preferences for all four generators. Individual SEO improvement selection now preserves the other field. Legacy routes/slugs remain compatible. Phase-4 focused gate 74/74, topology 14/14 each and Admin build passed.
- Phase 5 / R14–R15: opt-in Product scalar history/enum feedback/versioned compare and reapply; normal Product commit confirms saved events. Growth drafts support editable copy, selective generation/Apply/Undo, versioned saves, duplicate/archive/delete, copy, historical evidence and truthful field origins. Both collections enforce atomic per-tenant 50-item limits and expiry. Content-index migration is additive, dry-run by default and idempotent; missing required indexes fail closed.
- Final review fixes: Product preview helper import, selected SEO acceptance/provider schema/apply/history scope, stale usage updates, history request cancellation, campaign source badges/current facts, safe merchant config-error wording, and real Product PATCH save test. No commerce authority added.
- Final gates: focused backend 50/50; Admin behavior 6/6; Mongo/HTTP 17/17 standalone + 17/17 replica set; Admin production build, focused ESLint and diff check passed. Commands/logs: docs/AI_ADMIN_IMPLEMENTATION_REPORT.md. Mongo test teardown can emit ECONNRESET after successful tests.
- Broader backend gate: 457/462 passed; five old source-text expectations remain for catalog photo copy, inventory copy, Builder heading (two cases), and dashboard navigation local symbol. These unrelated UI assertions are recorded individually in the report; not skipped/hidden. Three AI-related brittle assertions were replaced with behavior checks.
- Browser policy rejected further local-page access; no workaround used. Latest phase-4/5 UI, complete SEO/Growth browser flows, real provider quality, production workers/topology/indexes and representative runtime performance remain release gates. No production database/env/deployment/provider-spend actions performed.
- Migration/product concerns: require quiesced v2 cutover, additive content indexes and approved fixture-store verification; confirm mixed-output charging, 50-item limits, 30/90-day retention and existing staff sharing. Full Growth mixed drafts currently free in app quota; accepted partial provider copy consumes one unit. R16/dynamic Collections/autonomous actions remain deferred.

### 2026-10-12 — OpenAI provider migration

- Replaced the shared Gemini adapter with OpenAI Responses (`openai@7.32.0`), removed the backend Google SDK and switched all four feature generators, Product images and the legacy description route. Default model: configurable `gpt-4.1-mini`. Strict structured output, safe refusal/incomplete handling, cancellation/deadlines, no transport retries and `store: false`; tenant/quota/acceptance behavior retained.
- Backend local `.env` and example now use `OPENAI_*`. An OpenAI key was found during final verification, preserved without printing, and successfully retrieved the configured model using a read-only API call. No live generation or customer database mutation. `AI_ACCOUNTING_VERSION=0` remains unchanged and still blocks generation pending the existing reviewed cutover.
- Added current-provider attempt/provenance attribution and health filtering; advanced prompt/request contracts to version 4. Preserved historical content and documented old-operation-ID conflicts, deployment variables and process restart. Runbook: docs/operations/openai-ai-provider.md.
- Gates: focused backend 55/55; Mongo/HTTP 18/18 standalone + 18/18 replica set with mocked provider calls; broad backend 462/467 with the same five unrelated UI source-text failures; diff check passed. Logs: output/openai-focused.log, output/openai-topology.log, output/openai-backend-tests.log, output/openai-diff-check.log. No frontend changes in this provider migration.
