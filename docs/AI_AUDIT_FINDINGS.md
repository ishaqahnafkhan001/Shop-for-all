# AI audit findings — 2026-10-10

Issue register for the inspected working tree. **Confirmed** means a defect or conditional failure path is directly supported by code; it does not imply a production incident was observed. **Potential risk** requires runtime/security fixtures. **Recommendation** records architecture or maintenance debt. Confidence concerns the evidence, not event frequency. No confirmed Critical issue or cross-tenant generation leak was found.

## Prioritized register

| ID | Title | Severity | Confidence | Type | Scope |
|---|---|---|---|---|---|
| F-001 | Quota reservations can be orphaned | High | High | Confirmed conditional failure | All entries |
| F-002 | Quota settlement/result finalization can diverge and release another reservation | High | High | Confirmed conditional failure | All entries |
| F-003 | Local timeout does not cancel provider work | High | High | Confirmed reliability gap | All entries |
| F-004 | Parseable incomplete output can be accepted/charged as provider output | Medium | High | Confirmed validation gap | All entries |
| F-005 | SEO fallback provenance is lost and later labeled AI | Medium | High | Confirmed correctness | AI-003 |
| F-006 | Remote image size checked after buffering | Medium | High | Confirmed resource-control gap | AI-001 |
| F-007 | Growth generation omits selected analytics range | Medium | High | Confirmed correctness | AI-004 |
| F-008 | Collection suggestions include unused generated fields | Medium | High | Confirmed incomplete integration | AI-002 |
| F-009 | Idempotency has no payload identity; UI does not preserve retry IDs | Medium | High | Confirmed design limitation | All entries |
| F-010 | Usage display/replay omits pending or current accounting | Medium | High | Confirmed correctness | All entries |
| F-011 | Unstructured analytics/merchant text can contain private information | Medium | Medium | Potential privacy risk | AI-001/004 |
| F-012 | Tests are stale and critical fault paths lack behavioral coverage | Medium | High | Confirmed coverage debt | Cross-feature |
| F-013 | Provider settings/transport/error behavior are duplicated and inconsistent | Medium | High | Confirmed architecture debt | Cross-feature |
| F-014 | Provider token/attempt/cost telemetry is absent | Medium | High | Recommendation | Cross-feature |
| F-015 | AI environment keys omitted from template; key presence is not health | Low | High | Confirmed configuration debt | Cross-feature |
| F-016 | File/URL trust checks do not prove image content or tenant ownership | Medium | Medium | Potential security/privacy risk | AI-001 |
| F-017 | Visible AI controls, unused dependency and legacy contract need cleanup | Low | High | Confirmed usability/maintenance debt | AI-001/002/005 |

Counts: 17 findings; 0 Critical, 3 High, 12 Medium, 2 Low. These count findings, not separate vulnerabilities or features.

## Confirmed defects and failure paths

### F-001 — Quota reservations can be orphaned

**High / High confidence. Affects all entries.** Files: services/ai/aiGenerationPolicyService.js, services/billing/planUsageService.js, models/AiGenerationRequest.js, workers/index.js. [POL] [USAGE] [LEDGER] [WORKER]

Evidence: beginAiGeneration creates a ledger row, increments weekly reserved, then saves in_progress. If that save fails, catch deletes the row without releasing the successful reservation. The controller has not received state yet. A process exit can similarly strand reservations. Request TTL expires after 24 hours but does not settle PlanUsage; no AI reservation-recovery worker is registered. This is a verified conditional path, not a measured production failure.

Impact: a shop can be denied remaining weekly generations despite no usable result. Recovery evidence is lost when the ledger is deleted/expired.

Remediation: retain durable request-owned reservation identity/state, atomically coordinate reservation and request transitions where supported, and reconcile stale in-progress reservations. Preserve existing usage semantics and tenant keys.

Dependencies: F-002 settlement design; disposable Mongo replica-set fixtures; actual index verification. Regression risk: changing old weekly records or releasing active requests. Validation: inject failure after reserve/before status save, terminate after provider start, retry/reconcile twice; verify one release, no lost quota and no cross-shop updates.

### F-002 — Settlement and result finalization can diverge

**High / High confidence. All entries.** Files: shared policy, PlanUsage service and controllers. [POL] [USAGE] [PC] [CC] [SC] [GC]

Evidence: completeAiGeneration consumes/releases quota before reading current usage and writing completed result. If those DB operations throw, controller invokes failAiGeneration. That release only filters shop/week/reserved>0; it has no unique reservation or settled-state check. With another request pending, cleanup can decrement that other reservation. Completion/release also ignore matched-count evidence. A settled usage unit can remain charged while the result is marked failed/unrecoverable. Domain-event handlers swallow ordinary subscriber errors by default; this finding does not depend on such an error. [EVENT]

Impact: incorrect quota under concurrent failures, unreliable replay and user retries causing additional provider calls.

Remediation: request-owned, idempotent settlement with conditional state transitions; transaction or recoverable state machine spanning quota/result; separate post-commit telemetry. Cleanup must detect already-settled state.

Dependencies: F-001 migration/recovery decisions; disposable DB fault tests. Regression risk: double deductions/releases for existing in-progress rows. Validation: run two concurrent reservations, fail getWeeklyAiUsage or ledger update after first settlement, then repeat cleanup; ensure second reservation remains, first result/charge are consistent and retries are idempotent.

### F-003 — Timeout ends local waiting without cancelling provider work

**High / High confidence. All entries.** Files: productContentAiService.js, collectionAiService.js, storeSeoAiService.js and adInsightAIService.js callGemini. [PCALL] [CP] [SP] [GP] [PGEN]

Evidence: each races generateContent against a timer without passing an abort/cancellation mechanism to the SDK request. The timer cleanup only clears its timer. Quota can be released and UI retry started while prior provider work continues. Product can make a second quality attempt, with up to two separate timeouts.

Impact: outage/latency spikes can create overlapping requests, provider costs not represented in app units and retained network work. Actual provider late completion/cost is unverified.

Remediation: supported transport abort/deadline plus a total generation budget, distinguish timeout/late completion in telemetry and cap concurrency per tenant. Verify cancellation against the installed SDK/transport before selecting implementation.

Dependencies: controlled mocked slow transport; F-013 adapter. Regression risk: aborting valid long image generation too soon. Validation: mocked slow request times out and observes abort; no second provider attempt survives total deadline; app reservation settles once.

### F-004 — Incomplete parsed objects are treated as provider success

**Medium / High confidence. All entries.** Files: product quality/cleanup, collection normalize/generate, SEO normalize/generate, ad normalize/generate. [PGEN] [POUT] [CS] [CP] [SS] [SGEN] [GOUT] [GGEN]

Evidence: product hasUsefulSellingPoints returns true when sellingPoints was not requested, so '{}' cleans to blank description/SEO and can succeed. Collection normalizes a parsed object without required-content checks. SEO accepts three objects and fills missing text; Growth fills fields from deterministic rules. These generated substitutions can retain provider provenance. Provider response schemas reduce likelihood but do not replace application validation; no live malformed response was captured.

Impact: blank suggestions, charged units without requested useful content, or misleading origin/quality. The legacy description-only API is particularly affected.

Remediation: schema/type/required-field validation after parsing, validate requested sections, and mark synthesized fields/mixed output provenance explicitly. Preserve legacy aliases before validating normalized structures.

Dependencies: feature-specific acceptance rules and fallback semantics, F-014 attempt telemetry. Regression risk: overstrict minimums reject legitimate concise Bangla/sparse specifications. Validation: '{}', null, wrong types, partial requested sections, three empty SEO options, empty ad objects, multilingual valid outputs; verify status/source and usage truthfully.

### F-005 — Accepted SEO fallback becomes source=ai

**Medium / High confidence. AI-003.** Files: useHomepageSeo.js, SeoAiPanel.jsx, packages/storefront-theme/index.cjs and homepage-seo.cjs. [SUI] [SPANEL] [SNORM] [SSOURCE]

Evidence: applyAiSuggestion stores alternatives/hash/snapshot/acceptance markers without meta.source/fallback/prompt/model. Theme normalization omits these fields too. findAcceptedAiSource checks accepted matching content, not provider provenance. Panel has no explicit fallback badge. Deterministic fallback can therefore display later as AI-authored.

Impact: users misread origin and audits cannot distinguish accepted provider content from templates after ledger expiry.

Remediation: retain bounded versioned provenance for accepted options/fields, make resolver source match it, and visibly label fallback. Handle old records with unknown provenance rather than assuming provider.

Dependencies: backward-compatible theme schema/normalization; draft/publish tests. Regression risk: legacy accepted suggestions changing source labels. Validation: apply/save/publish/reload a fallback and provider option; source survives each step and manual edits become manual.

### F-006 — Actual remote image byte limit is enforced after allocation

**Medium / High confidence. AI-001.** File: productContentAiService.fetchImageUrlPart. [PIMAGE]

Evidence: the code checks Content-Length if supplied, then awaits response.arrayBuffer(), then rejects buffer.length>5 MiB. A trusted host response without an accurate length can allocate beyond the intended size before rejection. HTTPS allowlisting/redirect rejection/five-second abort reduce exposure; they do not enforce an incremental byte cap.

Impact: memory pressure from concurrent fetches. No denial-of-service event or arbitrary-host SSRF was demonstrated.

Remediation: read the stream with a running byte budget, abort immediately above the cap, validate response/content signatures and use per-tenant concurrency bounds.

Dependencies: controlled HTTP fixture on an explicitly trusted test host; preserve text-only fallback behavior. Validation: chunked oversized response aborts at budget, wrong MIME/signature rejected, valid 5 MiB edge case supported and failed image still has truthful imageSource.

### F-007 — Ad generation uses 30 days instead of selected range

**Medium / High confidence. AI-004.** Files: GrowthCenter.generateAdCopy/openProductDetail and growthController.getRangeStart/generateAdCopy. [GUI] [GDATA] [GC]

Evidence: detail GET sends params.range; ad POST sends productId/language/campaignType only. Controller resolves req.body.range with default 30. A 7/90-day displayed analysis can produce suggestions based on 30 days.

Impact: contradictory evidence, confidence and planning recommendations.

Remediation: send selected range and retain period/input identity in output provenance/UI. Dependencies: range validity contract and mocked analytics fixtures. Regression risk: existing client/API default should remain for omitted range. Validation: each supported range uses exactly the displayed interval and correct request context.

### F-008 — Collection rules/keywords are incompletely integrated

**Medium / High confidence. AI-002.** Files: collectionAiService schema, CatalogTools application/save/display, Collection model. [CS] [CP] [CUI] [CVIEW] [CSAVE] [CM]

Evidence: generated keywords are displayed but not applied/saved; suggestedRules are neither displayed nor executed/persisted. Model has no corresponding fields. No generated product IDs are returned.

Impact: generated work has limited user value; API capabilities can be overstated. Optional advisory rules are not a promised automatic collection engine.

Remediation: explicitly present rules as advisory or remove unsupported generation fields; only add persistence if product requirements justify it. Dependencies: decide intended user action and compatibility for API clients. Regression risk: external consumers may use existing outputs. Validation: every retained output has a visible purpose and a deliberate persistence rule; generation never silently changes membership.

### F-009 — Request IDs do not identify input or reusable UI retries

**Medium / High confidence. All entries.** Files: aiRequestId.js, policy, request schema. [ID] [POL] [LEDGER]

Evidence: unique key is tenant+feature+requestId; no payload/input hash is stored. Reusing an ID with different input replays old output. Frontend creates a fresh ID for each action and does not retain it for retry after a lost response. This does not permit another tenant's replay because tenant remains in key.

Impact: stale same-tenant output for API callers and duplicate billed work after an uncertain response.

Remediation: store canonical input hash including referenced image/context identity, reject same ID/different input and retain operation IDs for explicit safe retries. Dependencies: F-001/F-002 result recovery, request canonicalization. Regression risk: intentionally new regeneration must still get a new ID. Validation: same ID/same payload replays once, changed payload conflicts, cross-shop ID cannot access result, lost response retry calls provider once.

### F-010 — Reported remaining/replayed usage can be misleading

**Medium / High confidence. All entries.** Files: PlanUsage service, policy/controllers and Admin components. [USAGE] [POL] [PC] [CC] [SC] [GC] [PUI] [CUI] [SUI] [GUI]

Evidence: remaining=limit-used while reservation uses used+reserved. Replayed stored payload excludes usage because it is added later to HTTP response. Product updates auth usage from response; other workflow handlers consume content without updating the shared usage display.

Impact: UI reports available generations while pending reservations exhaust admission; cross-feature usage looks stale.

Remediation: distinguish used/pending/available, return freshly read usage on replay and use a shared UI usage update path. Dependencies: settlement repair, stable response schema. Regression risk: consumers expecting existing remaining semantics. Validation: concurrent requests reflect pending availability, replay contains current usage and generating any feature updates the displayed quota.

### F-012 — Stale assertions and missing failure-path tests

**Medium / High confidence. Cross-feature.** Files: product-content-ai.test.js:279–301, seo-rendering.test.js:51–80/651–660/884–903 and shared renderer/media consumers. [TP] [TSEO] [THERO] [TLINK] [EXTRAS]

Evidence: 61 selected existing tests executed: 57 pass/4 fail. The failures look for implementation text in files now backed by shared modules: point/reason aliases, imageAltText, hero source and related-product slug. Four source mismatches do not establish four runtime product failures. Existing AI policy tests inspect index definitions/status helpers rather than real fault/concurrency settlement. No AI provider calls were made.

Impact: regressions are obscured by stale failures; tests do not substantiate production reliability/tenant claims.

Remediation: behavioral assertions against shared consumers; mocked provider/HTTP response/error tests; disposable Mongo concurrent reservation/fault tests; controlled browser apply/save/publish checks.

Dependencies: F-001–F-005 acceptance behavior; isolated fixture environment. Regression risk: deleting source checks without replacing their intended guarantees. Validation: all four failures repaired by behavior coverage; wrong tenant/staff, timeout, malformed output, quota exhaustion and DB-fault scenarios fail safely.

## Potential security and privacy risks

### F-011 — Aggregate free text is not necessarily anonymous

**Medium / Medium confidence. AI-001/004.** Files: Growth analytics/prompt, AddProduct notes help, product buildContext and Product model. [GDATA] [GP]

Evidence: cohorts require at least three occurrences/orders; product-word relevance filters search terms. The surviving raw query strings and address-derived city strings are sent to the provider. No explicit PII redaction is applied in this path. Prompts say never include private customer information, but the provider receives input before following instructions.

Impact: a repeated search containing both a product word and identifying text could cross the provider boundary. No actual private record was inspected or leak observed.

Additional product risk: AddProduct describes extra notes as suitable for internal context, but Product.comments is customer-facing and buildContext passes comments to Gemini. If the merchant follows the internal-note hint, private notes could enter the provider context. No actual private note was observed. [PNOTES] [PM] [PCTX]

Remediation: clarify public-only notes and reject known private fields; redact/drop identifying free text before prompt construction; normalize cities to an approved geographic vocabulary; document allowed analytics context. Dependencies: controlled synthetic privacy fixtures and business purpose/retention review. Regression risk: overredaction may reduce useful terms in Bangla/English. Validation: names/contact/address-like fixtures never enter captured mock prompts; legitimate product terms and approved aggregate cities remain.

### F-016 — MIME/host trust does not prove content or ownership

**Medium / Medium confidence. AI-001.** Files: adminRoutes productAiImageUpload, productContentAiService file/URL handling. [UPLOAD] [PIMAGE]

Evidence: upload trusts MIME metadata, remote path accepts trusted HTTPS/Cloudinary hosts and does not verify asset belongs to req.tenantId. Allowlisting is a useful SSRF boundary, but public URL ownership and binary image validity are separate facts.

Impact: unexpected files reach the image provider; a merchant could submit an image unrelated to their authorized assets. This is not confirmed private asset access or cross-tenant Mongo leakage.

Remediation: verify file signatures/decoding/dimensions, prefer tenant-owned asset identifiers for existing images and explicitly decide whether arbitrary public product image URLs are allowed. Dependencies: asset model/compatibility policy and F-006 byte cap. Regression risk: legitimate historical/external URLs may become text-only. Validation: spoofed MIME fails, tenant assets work, unauthorized/private assets fail and allowed public URLs are handled deliberately.

## Architecture and maintenance recommendations

### F-013 — Duplicated transport and inconsistent settings/errors

**Medium / High confidence. All entries.** Files: four AI services and controllers. [PCALL] [CP] [SP] [GP] [PC] [CC] [SC] [GGEN]

Evidence: four SDK wrappers/parsers/timeouts; product clamps timeout while others use raw Number(env), product token limit is also raw Number(env). Missing key/error/fallback and HTTP-status contracts differ. There is no transport adapter or centralized config validation. Product/collection/SEO rate limits are default IP-based in-process; Growth uses tenant+actor, without an explicit shared limiter store. [UPLOAD] [CR] [SRL] [GR]

Impact: new features duplicate safeguards, bad configuration can change timeouts unpredictably, monitoring/client handling differ and limits may vary across workers/instances.

Remediation: consolidate SDK transport/config/safe errors and cancellation while retaining feature prompts/schemas/fallback rules. Validate finite bounded settings at startup; explicitly choose rate-limit keys/store for deployment topology. Do not introduce a second AI architecture or new provider solely for this cleanup.

Dependencies: F-003 cancellation and compatibility contract tests. Regression risk: altering established UI error/fallback behavior. Validation: all services reject malformed configuration predictably, share timeout/error semantics and enforce chosen distributed limits in a controlled multi-instance test.

### F-014 — Tokens, attempts and provider cost are not recorded

**Medium / High confidence. All entries.** Files: provider services, policy and ledger. [PCALL] [CP] [SP] [GP] [POL] [LEDGER]

Evidence: records store one result/source/model/prompt/latency but no per-attempt token usage, pricing or cost. Product retry counts one app unit; paid responses discarded into fallback/timeout/failure may count none. Ledger expires after 24 hours.

Impact: no reliable per-feature/shop/month cost attribution or provider-outage/latency dashboard. This is absent telemetry, not evidence of a fabricated credit balance.

Remediation: capture provider-reported usage per attempt and safe retained aggregates; separate application entitlement units from provider cost. Obtain applicable model pricing before estimating money. Dependencies: SDK usage metadata contract and retention policy. Regression risk: storing prompt/customer data unnecessarily. Validation: two attempts record two usage events, fallback records actual attempts, unknown token/cost values remain unknown and no secrets/raw private context are logged.

### F-015 — AI configuration template and health evidence are incomplete

**Low / High confidence. Cross-feature.** Files: backend/.env.example, four service config sites, superAdminOperationsController. [ENVEX] [PCALL] [CP] [SP] [GP] [CONFIG]

Evidence: template omits GEMINI_API_KEY/GEMINI_MODEL/GEMINI_TIMEOUT_MS/GEMINI_PRODUCT_AI_MAX_OUTPUT_TOKENS/TRUSTED_PRODUCT_IMAGE_HOSTS/AI_AGGREGATE_PRIVACY_THRESHOLD. Local backend has nonempty key/model, but configuration boolean only establishes presence. Actual deployment/env inheritance/provider access is unverified.

Impact: incomplete setup instructions and incorrect inference of provider health.

Remediation: document placeholders/defaults/ranges/backend-only placement; distinguish configured from healthy. Validate model access only in an authorized controlled environment, with any paid generation explicitly accounted for. Dependencies: F-013 validated config. Validation: fresh setup knows every key, frontend build has no secret, model/config health status does not claim success from key presence.

### F-017 — UI entitlement, SDK dependency and legacy contract debt

**Low / High confidence. AI-001/002/005.** Files: ProductAiAssistant, CatalogTools, Admin package.json, adminRoutes, productController.generateDescription. [PUI] [PB] [CVIEW] [APKG] [PR] [LEG]

Evidence: product/collection controls do not check the specific AI entitlement/staff flag before presenting generation; server still denies unauthorized use. Admin Google SDK has no discovered import. Deprecated controller's documented endpoint differs from actual /api/admin/generate-description; no Admin caller was found.

Impact: preventable denied requests, maintenance confusion and unused client dependency. No browser API key exposure is established.

Remediation: show accurate permission/plan state, remove unused dependency after verifying external build usage, fix route documentation and preserve legacy endpoint until real external usage is known. Dependencies: effective feature/permission contract and compatibility telemetry. Regression risk: hiding legitimately permitted actions or breaking old callers. Validation: authorized staff can generate, denied users see useful entitlement state, frontend has no SDK call and legacy clients retain documented behavior until intentional retirement.

## Suggested implementation order

1. F-001/F-002 request-owned settlement and recovery, with isolated DB concurrency/fault tests.
2. F-003/F-013 cancellation, finite configuration and shared transport contracts.
3. F-004/F-005 strict output acceptance and durable provenance.
4. F-006/F-011/F-016 image/resource/privacy boundaries.
5. F-007–F-010 range, generated-field and UI/replay consistency.
6. F-012 behavioral tests, then controlled browser/provider/deployment verification.
7. F-014/F-015/F-017 telemetry/configuration/legacy cleanup.

These are proposed changes only. Each step should preserve tenant keys, existing saved content and endpoint compatibility, and remain reviewable independently. No remediation was applied during this audit.

## Source evidence index

References resolve to inspected current source. The range is displayed here; each link opens its first line. Verified on 2026-10-10.

[APKG]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/package.json:6> "ecommerce-admin/package.json:6-37 — Admin scripts and dependencies"
[CC]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/collectionController.js:186> "ecommerce-backend/backend/controllers/collectionController.js:186-278 — suggestCollectionAi"
[CM]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/Collection.js:4> "ecommerce-backend/backend/models/Collection.js:4-54 — collectionSchema"
[CONFIG]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/superAdminOperationsController.js:686> "ecommerce-backend/backend/controllers/superAdminOperationsController.js:686-698 — configuration flags"
[CP]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/collections/collectionAiService.js:142> "ecommerce-backend/backend/services/collections/collectionAiService.js:142-269 — prompt / provider / generation"
[CR]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/routes/collectionRoutes.js:19> "ecommerce-backend/backend/routes/collectionRoutes.js:19-46 — collection guards and route"
[CS]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/collections/collectionAiService.js:16> "ecommerce-backend/backend/services/collections/collectionAiService.js:16-141 — schema / normalization / fallback / parsing"
[CSAVE]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:264> "ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:264-289 — saveCollection"
[CUI]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:440> "ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:440-494 — generateCollectionAi / applyCollectionAi"
[CVIEW]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:605> "ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:605-645 — suggestion display"
[ENVEX]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/.env.example:1> "ecommerce-backend/backend/.env.example:1-48 — backend configuration template"
[EVENT]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/events/domainEventBus.js:29> "ecommerce-backend/backend/services/events/domainEventBus.js:29-51 — publish"
[EXTRAS]: <C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/ProductExtras.jsx:10> "packages/storefront-renderer/presentation/ProductExtras.jsx:10-30 — normalizeSellingPoints"
[GC]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/growthController.js:666> "ecommerce-backend/backend/controllers/growthController.js:666-743 — generateAdCopy"
[GDATA]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/growthController.js:24> "ecommerce-backend/backend/controllers/growthController.js:24-138 — getRangeStart / cities / search terms"
[GGEN]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/adInsightAIService.js:742> "ecommerce-backend/backend/services/adInsightAIService.js:742-812 — generateAdInsight"
[GOUT]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/adInsightAIService.js:584> "ecommerce-backend/backend/services/adInsightAIService.js:584-637 — cleanAdInsightResponse"
[GP]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/adInsightAIService.js:665> "ecommerce-backend/backend/services/adInsightAIService.js:665-740 — buildGeminiPrompt / callGemini"
[GR]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/routes/growthRoutes.js:19> "ecommerce-backend/backend/routes/growthRoutes.js:19-41 — growth guards / route"
[GUI]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx:227> "ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx:227-274 — detail / generation / copy"
[ID]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/utils/aiRequestId.js:1> "ecommerce-admin/src/utils/aiRequestId.js:1-9 — createAiRequestId / aiRequestHeaders"
[LEDGER]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/AiGenerationRequest.js:3> "ecommerce-backend/backend/models/AiGenerationRequest.js:3-49 — request schema and indexes"
[LEG]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/productController.js:180> "ecommerce-backend/backend/controllers/productController.js:180-238 — generateDescription"
[PB]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/components/products/ProductAiAssistant.jsx:475> "ecommerce-admin/src/components/products/ProductAiAssistant.jsx:475-513 — generation buttons"
[PC]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/productController.js:248> "ecommerce-backend/backend/controllers/productController.js:248-361 — generateProductContent"
[PCALL]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/products/productContentAiService.js:685> "ecommerce-backend/backend/services/products/productContentAiService.js:685-756 — getGeminiTimeoutMs / callGemini"
[PCTX]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/products/productContentAiService.js:141> "ecommerce-backend/backend/services/products/productContentAiService.js:141-209 — normalizeRequestedSections / buildContext"
[PGEN]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/products/productContentAiService.js:759> "ecommerce-backend/backend/services/products/productContentAiService.js:759-883 — quality predicate / generation / meta"
[PIMAGE]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/products/productContentAiService.js:580> "ecommerce-backend/backend/services/products/productContentAiService.js:580-683 — fileToGeminiPart / fetchImageUrlPart / buildImagePart"
[PM]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/Product.js:93> "ecommerce-backend/backend/models/Product.js:93-153 — product content schema"
[PNOTES]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx:1059> "ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx:1059-1070 — extra notes field helper text"
[POL]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/ai/aiGenerationPolicyService.js:13> "ecommerce-backend/backend/services/ai/aiGenerationPolicyService.js:13-151 — begin / complete / fail / replay"
[POUT]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/products/productContentAiService.js:259> "ecommerce-backend/backend/services/products/productContentAiService.js:259-367 — normalization / cleanProductContentSuggestion"
[PR]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/routes/adminRoutes.js:832> "ecommerce-backend/backend/routes/adminRoutes.js:832-854 — product AI routes"
[PUI]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/components/products/ProductAiAssistant.jsx:330> "ecommerce-admin/src/components/products/ProductAiAssistant.jsx:330-465 — generate / applySections"
[SC]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/storeBuilderController.js:269> "ecommerce-backend/backend/controllers/storeBuilderController.js:269-376 — suggestStoreSeo"
[SGEN]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeSeoAiService.js:224> "ecommerce-backend/backend/services/storeSeoAiService.js:224-290 — generateStoreSeoSuggestion"
[SNORM]: <C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/index.cjs:373> "packages/storefront-theme/index.cjs:373-390 — SEO suggestion normalization"
[SP]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeSeoAiService.js:176> "ecommerce-backend/backend/services/storeSeoAiService.js:176-222 — buildPrompt / callGemini"
[SPANEL]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/Seo/SeoAiPanel.jsx:1> "ecommerce-admin/src/pages/dashboard/Seo/SeoAiPanel.jsx:1-43 — SeoAiPanel"
[SRL]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/routes/storeBuilderRoutes.js:48> "ecommerce-backend/backend/routes/storeBuilderRoutes.js:48-57 — storeBuilderAiLimiter"
[SS]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeSeoAiService.js:66> "ecommerce-backend/backend/services/storeSeoAiService.js:66-174 — normalizeAlternative / buildSafeContext"
[SSOURCE]: <C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/homepage-seo.cjs:201> "packages/storefront-theme/homepage-seo.cjs:201-216 — findAcceptedAiSource / resolveTextField"
[SUI]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/Seo/hooks/useHomepageSeo.js:277> "ecommerce-admin/src/pages/dashboard/Seo/hooks/useHomepageSeo.js:277-313 — requestAiSuggestions / applyAiSuggestion"
[THERO]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/seo-rendering.test.js:651> "ecommerce-backend/backend/tests/seo-rendering.test.js:651-660 — hero source assertion"
[TLINK]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/seo-rendering.test.js:884> "ecommerce-backend/backend/tests/seo-rendering.test.js:884-900 — related product source assertion"
[TP]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/product-content-ai.test.js:1> "ecommerce-backend/backend/tests/product-content-ai.test.js:1-297 — product helpers and contracts"
[TSEO]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/seo-rendering.test.js:51> "ecommerce-backend/backend/tests/seo-rendering.test.js:51-80 — SEO source assertions"
[UPLOAD]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/routes/adminRoutes.js:300> "ecommerce-backend/backend/routes/adminRoutes.js:300-337 — productAiImageUpload / productAiLimiter"
[USAGE]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/billing/planUsageService.js:1> "ecommerce-backend/backend/services/billing/planUsageService.js:1-94 — weekly quota reservation / settlement"
[WORKER]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/workers/index.js:71> "ecommerce-backend/backend/workers/index.js:71-83 — handlers"

- **APKG**: [ecommerce-admin/package.json:6-37 — Admin scripts and dependencies][APKG]
- **CC**: [ecommerce-backend/backend/controllers/collectionController.js:186-278 — suggestCollectionAi][CC]
- **CM**: [ecommerce-backend/backend/models/Collection.js:4-54 — collectionSchema][CM]
- **CONFIG**: [ecommerce-backend/backend/controllers/superAdminOperationsController.js:686-698 — configuration flags][CONFIG]
- **CP**: [ecommerce-backend/backend/services/collections/collectionAiService.js:142-269 — prompt / provider / generation][CP]
- **CR**: [ecommerce-backend/backend/routes/collectionRoutes.js:19-46 — collection guards and route][CR]
- **CS**: [ecommerce-backend/backend/services/collections/collectionAiService.js:16-141 — schema / normalization / fallback / parsing][CS]
- **CSAVE**: [ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:264-289 — saveCollection][CSAVE]
- **CUI**: [ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:440-494 — generateCollectionAi / applyCollectionAi][CUI]
- **CVIEW**: [ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:605-645 — suggestion display][CVIEW]
- **ENVEX**: [ecommerce-backend/backend/.env.example:1-48 — backend configuration template][ENVEX]
- **EVENT**: [ecommerce-backend/backend/services/events/domainEventBus.js:29-51 — publish][EVENT]
- **EXTRAS**: [packages/storefront-renderer/presentation/ProductExtras.jsx:10-30 — normalizeSellingPoints][EXTRAS]
- **GC**: [ecommerce-backend/backend/controllers/growthController.js:666-743 — generateAdCopy][GC]
- **GDATA**: [ecommerce-backend/backend/controllers/growthController.js:24-138 — getRangeStart / cities / search terms][GDATA]
- **GGEN**: [ecommerce-backend/backend/services/adInsightAIService.js:742-812 — generateAdInsight][GGEN]
- **GOUT**: [ecommerce-backend/backend/services/adInsightAIService.js:584-637 — cleanAdInsightResponse][GOUT]
- **GP**: [ecommerce-backend/backend/services/adInsightAIService.js:665-740 — buildGeminiPrompt / callGemini][GP]
- **GR**: [ecommerce-backend/backend/routes/growthRoutes.js:19-41 — growth guards / route][GR]
- **GUI**: [ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx:227-274 — detail / generation / copy][GUI]
- **ID**: [ecommerce-admin/src/utils/aiRequestId.js:1-9 — createAiRequestId / aiRequestHeaders][ID]
- **LEDGER**: [ecommerce-backend/backend/models/AiGenerationRequest.js:3-49 — request schema and indexes][LEDGER]
- **LEG**: [ecommerce-backend/backend/controllers/productController.js:180-238 — generateDescription][LEG]
- **PB**: [ecommerce-admin/src/components/products/ProductAiAssistant.jsx:475-513 — generation buttons][PB]
- **PC**: [ecommerce-backend/backend/controllers/productController.js:248-361 — generateProductContent][PC]
- **PCALL**: [ecommerce-backend/backend/services/products/productContentAiService.js:685-756 — getGeminiTimeoutMs / callGemini][PCALL]
- **PCTX**: [ecommerce-backend/backend/services/products/productContentAiService.js:141-209 — normalizeRequestedSections / buildContext][PCTX]
- **PGEN**: [ecommerce-backend/backend/services/products/productContentAiService.js:759-883 — quality predicate / generation / meta][PGEN]
- **PIMAGE**: [ecommerce-backend/backend/services/products/productContentAiService.js:580-683 — fileToGeminiPart / fetchImageUrlPart / buildImagePart][PIMAGE]
- **PM**: [ecommerce-backend/backend/models/Product.js:93-153 — product content schema][PM]
- **PNOTES**: [ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx:1059-1070 — extra notes field helper text][PNOTES]
- **POL**: [ecommerce-backend/backend/services/ai/aiGenerationPolicyService.js:13-151 — begin / complete / fail / replay][POL]
- **POUT**: [ecommerce-backend/backend/services/products/productContentAiService.js:259-367 — normalization / cleanProductContentSuggestion][POUT]
- **PR**: [ecommerce-backend/backend/routes/adminRoutes.js:832-854 — product AI routes][PR]
- **PUI**: [ecommerce-admin/src/components/products/ProductAiAssistant.jsx:330-465 — generate / applySections][PUI]
- **SC**: [ecommerce-backend/backend/controllers/storeBuilderController.js:269-376 — suggestStoreSeo][SC]
- **SGEN**: [ecommerce-backend/backend/services/storeSeoAiService.js:224-290 — generateStoreSeoSuggestion][SGEN]
- **SNORM**: [packages/storefront-theme/index.cjs:373-390 — SEO suggestion normalization][SNORM]
- **SP**: [ecommerce-backend/backend/services/storeSeoAiService.js:176-222 — buildPrompt / callGemini][SP]
- **SPANEL**: [ecommerce-admin/src/pages/dashboard/Seo/SeoAiPanel.jsx:1-43 — SeoAiPanel][SPANEL]
- **SRL**: [ecommerce-backend/backend/routes/storeBuilderRoutes.js:48-57 — storeBuilderAiLimiter][SRL]
- **SS**: [ecommerce-backend/backend/services/storeSeoAiService.js:66-174 — normalizeAlternative / buildSafeContext][SS]
- **SSOURCE**: [packages/storefront-theme/homepage-seo.cjs:201-216 — findAcceptedAiSource / resolveTextField][SSOURCE]
- **SUI**: [ecommerce-admin/src/pages/dashboard/Seo/hooks/useHomepageSeo.js:277-313 — requestAiSuggestions / applyAiSuggestion][SUI]
- **THERO**: [ecommerce-backend/backend/tests/seo-rendering.test.js:651-660 — hero source assertion][THERO]
- **TLINK**: [ecommerce-backend/backend/tests/seo-rendering.test.js:884-900 — related product source assertion][TLINK]
- **TP**: [ecommerce-backend/backend/tests/product-content-ai.test.js:1-297 — product helpers and contracts][TP]
- **TSEO**: [ecommerce-backend/backend/tests/seo-rendering.test.js:51-80 — SEO source assertions][TSEO]
- **UPLOAD**: [ecommerce-backend/backend/routes/adminRoutes.js:300-337 — productAiImageUpload / productAiLimiter][UPLOAD]
- **USAGE**: [ecommerce-backend/backend/services/billing/planUsageService.js:1-94 — weekly quota reservation / settlement][USAGE]
- **WORKER**: [ecommerce-backend/backend/workers/index.js:71-83 — handlers][WORKER]
