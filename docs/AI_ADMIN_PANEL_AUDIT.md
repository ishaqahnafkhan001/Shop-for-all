# ScaleUp Admin Panel AI audit

Audit date: 2026-10-10, Asia/Dhaka. Read-only investigation of the current working tree, including existing uncommitted work. No application, package, environment or database changes were made for this audit. No live or paid AI requests were made.

## Executive summary

Four Admin workflows use Gemini: product content, collection suggestions, homepage SEO and Growth Center ad planning. A fifth inventory entry is a deprecated description API that reuses the product service and has no discovered Admin caller. All four UI-to-API paths are connected in inspected code. Each has important implementation gaps; none has been certified functional in the running deployment. No confirmed Critical vulnerability or confirmed cross-tenant leak was found in these generation paths. [PR] [CR] [SR] [GR] [LEG]

The highest priorities are the shared quota lifecycle and provider timeouts. A reservation can survive a database failure or process exit. Finalization can deduct a unit and then fail to record completion; subsequent cleanup is not tied to that request's reservation and can release another concurrent reservation. Local timeouts do not cancel the underlying provider request. These are evidenced failure paths; their production frequency is unverified. [POL] [USAGE] [LEDGER] [PCALL] [CP] [SP] [GP]

Output validation is uneven: product quality checks focus on selling points; collection parsing accepts incomplete objects; SEO/ad normalizers synthesize missing fields while reporting provider provenance. Homepage SEO loses fallback provenance on acceptance, and Growth ad generation omits the selected analytics range. [PGEN] [CS] [CP] [SGEN] [GOUT] [SUI] [SNORM] [GUI] [GDATA]

The audit executed 61 selected existing checks: 57 passed and four failed. All four failures are source assertions that inspect files now delegating to shared renderer/media code. That explains the assertions; it does not certify browser behavior. Logs: [AI checks](../output/ai-admin-tests.log), [security checks](../output/ai-admin-security-tests.log).

## Scope, method and evidence levels

The search covered Admin source, connected backend controllers/routes/services/models/configuration/workers, shared packages and relevant storefront consumers. Discovery searched AI/LLM/provider names, SDK imports, generation methods, local/OpenAI-compatible endpoints, embeddings, recommendations, prompts and quota terms. Dependencies, builds, lockfiles and secret files were excluded from broad searches. Environment inspection separately exposed only key names/presence and the non-secret model identifier. Existing reports were checked against current code.

**Verified** means directly established in code or a named safe test. **Partially verified** means some stages are confirmed without full runtime execution. **Unverified** covers live credentials/model availability/deployment/indexes and end-to-end behavior. **Contradicted** identifies a claim inconsistent with code. Scores below are provisional code assessments, not provider quality benchmarks or launch approval.

No integration suite, migration, application startup or worker startup was run. Controlled runtime checks remain future verification because this audit prohibits paid requests and real database writes.

## Verified repository architecture

The repository contains separate npm applications and local file package dependencies rather than a single root npm workspace. Admin declares React 19.2.5, Vite ^8.0.10, Tailwind ^4.2.4 and Axios ^1.15.2. Backend is CommonJS Node/Express ^5.2.1, Mongoose ^9.5.0, Multer ^2.1.1, express-rate-limit ^8.3.2 and Google SDK ^0.24.1. Storefront declares Next ^16.2.10 and React 19.2.4. These are manifest declarations, not a reproduced installation. Audit host: Node v24.12.0, npm 11.7.0. [APKG] [BPKG] [NPKG]

| Area | Entry points and responsibility |
|---|---|
| ecommerce-admin | src/main.jsx mounts App; App.jsx routes products/add, products/edit/:id, catalog-tools, seo and growth; api/api.js handles cookie/CSRF requests. |
| ecommerce-backend/backend | app.js registers /api/admin, /api/admin/collections, /api/admin/growth and /api/store-builder. Controllers orchestrate generation; feature services construct prompts and call Gemini. |
| Shared policy | services/ai/aiGenerationPolicyService.js owns request IDs, reservations, replay, result ledger and completion/failure. |
| Mongo persistence | AiGenerationRequest, PlanUsage, Shop, Product and Collection; StoreBuilderDraft/StoreBuilderRevision support SEO save/publish. |
| Shared packages | packages/storefront-theme resolves/normalizes SEO; packages/storefront-renderer presents customer-facing product content. |
| Workers | workers/index.js handles notification/courier/badge/email/product/stock/registration/support jobs; no registered AI-generation handler. |
| Tests | Product content, ad helpers, SEO hardening/rendering and security contracts; separate integration suites. |

Evidence: [AR] [API] [APP] [POL] [LEDGER] [UM] [PM] [CM] [SPERSIST] [SPUBLISH] [WORKER]. Backend .env.example and .env.test.example exist; no Admin .env.example was found. The backend template omits the AI configuration keys described below. [ENVEX]

## Inventory and implementation status

| ID | Workflow | Inspection classification | Runtime evidence |
|---|---|---|---|
| AI-001 | Product content helper | Implemented with important gaps | Helpers/contracts tested; provider and full save flow unverified |
| AI-002 | Collection suggestions | Implemented with important gaps | Route/UI contracts tested; provider/persistence unverified |
| AI-003 | Homepage SEO assistant | Implemented with important gaps | Shared resolver/context tested; provider/browser autosave/publish unverified |
| AI-004 | Growth ad planning | Implemented with important gaps | Targeting/cleanup tested; provider/analytics queries unverified |
| AI-005 | Deprecated description API | Duplicate compatibility endpoint; no discovered Admin caller | Route/controller traced; no live invocation |

Exclusive counts: 4 implemented with important gaps, 1 duplicate compatibility entry, 0 UI-only/mocked implementations, 0 confirmed disconnected implementations, 0 certified fully functional. All five have unverified live runtime behavior; this is a separate evidence axis. See [complete inventory](AI_FEATURE_INVENTORY.md).

No implemented chatbot, LM Studio/Ollama/OpenAI-compatible service, embedding/vector search, image generation or background AI generation was found in searched application source. Image understanding is a modality of AI-001. Growth recommendations use classifyProduct rules; badge analysis uses thresholds/negative keywords. These are not LLM inference implementations. [GRULE] [BADGE] [WORKER]

## AI-001 — Product content helper

### User workflow and frontend

VendorAdmin and VendorStaff with products permission and aiProductCreation can request content. AddProduct/EditProduct mount the same ProductAiAssistant. It sends current unsaved form data; generation neither fetches a Product by ID nor saves the form. It supports all sections together or a subset: SEO, description, selling points, specifications, extra notes and image alt. [PR] [ADD] [EDIT] [PUI] [PB]

Flow: Add/Edit form → ProductAiAssistant.generate → buildRequestData(FormData) → Axios → preview state → applySections → editable form → ordinary product save. State tracks loading, active section, image use/source and suggestion; generation buttons disable while loading and require a title. Errors appear as toasts. Application is explicit; selling points can append or replace, while other chosen fields replace existing form values. Users can dismiss, edit and regenerate. [PUI] [PB]

Request fields: title, category, JSON tags, sellingPrice, JSON variants, existingDescription, existingSeoTitle/Description, JSON features/specifications/comments, languageHint=auto and JSON requestedSections. Cover image is a File under image or string under imageUrl. The client uses cookies/CSRF and x-ai-request-id, with no configured Axios timeout or automatic retry. Each click creates a fresh ID; no persistent retry operation ID is retained. [PUI] [ADD] [EDIT] [API] [ID]

### Backend, provider and prompts

POST /api/admin/products/ai/content-suggest runs auth, vendor roles, products permission, aiProductCreation, billing/verification suspension checks, rate limiting and memory upload. The controller requires a trimmed title, reserves quota, calls the service and finalizes ledger/usage. It returns content, image diagnostics, fallback/meta and usage. Generation does not write Product content. [PR] [UPLOAD] [PC] [POL]

Context is allowlisted and bounded; buying/cost prices are excluded. Requested sections default to all six when absent or wholly invalid. Variants normalize into relevant attributes/context. No AI request-level Joi/Zod schema precedes title.trim; wrong-type title reaches generic failure handling instead of a field-specific 400. [PCTX] [PC]

GoogleGenerativeAI.getGenerativeModel uses env/default model, temperature 0.25, topP 0.8, JSON MIME/schema and token ceiling default 2400. Local timeout defaults 30 seconds text/45 seconds image; configured values clamp to 15/30-second minimum and 60-second maximum. Calls are non-streaming. Provider token/cost metadata is not persisted. [PCALL] [LEDGER]

Prompt product.content v2.0.0 targets Bangladeshi merchants, preserves Bangla/English/mixed tone, requests SEO/description/benefit/specification/note/alt output and forbids unsupported materials, dimensions, medical benefits, warranties, certification/authenticity. Merchant JSON is untrusted. Images are primary visible evidence; without an image visual claims are prohibited. These are user-content instructions, without a separate system-role boundary. JSON.stringify(context).slice(0,4200) can truncate later fields or a JSON value. [PPROMPT]

JPEG/PNG/WebP uploads become base64 inlineData. Multer allows one file up to 5 MiB and trusts MIME; no signature validation was found here. Remote HTTPS URLs must match configured trusted hosts or cloudinary.com subdomains; redirects fail and fetch aborts after five seconds. Inaccessible/disallowed/oversized remote images become text-only. The response body is buffered before actual-size rejection when Content-Length is absent/inaccurate. Host trust does not establish tenant asset ownership. [UPLOAD] [PIMAGE]

### Output, retry, persistence and failures

JSON extraction supports code fences/surrounding text and trailing-comma repair. Cleanup strips HTML/control text, selected unsafe claims and weak benefits, bounds fields and accepts aliases. whyBuy becomes sellingPoints; extraNotes maps to comments; imageAlt maps to imageAltText. Explicit Apply changes the form; ordinary save persists Product fields. Storefront consumers render escaped React text. [POUT] [PUI] [ADD] [PM] [PSAVE] [EXTRAS] [INFO]

Malformed output or fewer than two useful selling points when requested triggers one stricter model call. Unusable output then falls back to deterministic context; insufficient context may fail. Initial provider transport/auth/rate/model failures do not use that fallback. Description-only/SEO-only requests allow an empty parsed object through the selling-point-only predicate and can return blank requested content as provider success. This is an application validation gap; no live schema-violating Gemini response was observed. [PGEN] [PFALL]

VisualEvidence/confidence shown in preview is not retained in ordinary saved product rows; the ephemeral request result retains richer detail until TTL expiry. [PUI] [PM] [LEDGER]

Missing title/file errors return 400. Missing key returns 503 configured=false. Quota returns 403; in-progress duplicate 409; completed duplicate replays. Provider/parse/insufficient-context failures generally use HTTP 200 success=false with safe codes/messages, which the UI checks. Remote-image failure is text-only. Database finalization risks are F-001/F-002. [PC] [UPLOAD] [POL]

**Illustrative values only, not captured traffic.** This JSON map represents multipart text fields; actual image is binary when uploaded.

```json
{"title":"Canvas Travel Bag","category":"Bags","sellingPrice":"1200","tags":"[\"travel\"]","variants":"[]","existingDescription":"Two zip pockets","features":"[]","specifications":"[{\"title\":\"Pockets\",\"value\":\"2\"}]","comments":"[]","languageHint":"auto","requestedSections":"[\"description\",\"imageAlt\"]","imageUrl":"https://res.cloudinary.com/example/image/upload/bag.jpg"}
```

Abbreviated illustrative response:

```json
{"success":true,"usedImage":true,"imageSource":"existing_product_image","fallback":false,"data":{"seoTitle":"Canvas Travel Bag","seoDescription":"Review this bag and its product details.","description":"A travel bag with two zip pockets.","sellingPoints":[],"specifications":[],"extraNotes":[],"imageAlt":"Travel bag with two zip pockets","imageAnalysis":{},"confidenceNotes":[]},"meta":{"source":"provider","promptId":"product.content","promptVersion":"2.0.0"},"usage":{"used":1,"limit":10,"remaining":9,"unlimited":false,"resetsAt":"2026-10-11T00:00:00.000Z"}}
```

Title/price/category enter bounded prompt context; image bytes enter separate inlineData. Explicit Apply sets form description/alt; save maps to Product.description/imageAltText. The response illustrates field structure, not verified output quality. [PCTX] [PIMAGE] [PUI] [PM]

## AI-002 — Collection suggestions

### Workflow and permissions

Catalog Tools hosts the editor. Staff need catalogTools and collectionsAi; backend checks bulkProductTools and aiProductCreation. The button disables while loading, but has no collectionsAi/AI-feature visibility gate in this component. Server guards remain enforced. UI requires title or selected products. [AR] [CR] [CVIEW] [CUI]

Flow: selected rows + collection form → generateCollectionAi → POST /api/admin/collections/ai/suggest → suggestion state → applyCollectionAi → editor → saveCollection → CRUD. Request includes title/description/seo/productIds. Explicit application overwrites selected name/description/slug/SEO; fields remain editable. Generation does not create records. [CUI] [CSAVE]

Controller cleans/limits ObjectIds, loads shop identity and up to 30 tenant-owned non-deleted products. Only title/category/tags enter prompt; selected description/SEO are discarded. Optional shopType/language/targetCustomer are supported by the API but omitted by this UI. Invalid/cross-tenant IDs add no product context. Server does not enforce the UI's minimum context rule. [CC]

### Provider, outputs and persistence

Parameters: Google SDK, env/default model, temperature 0.25, topP 0.8, 900 tokens, JSON schema and 15-second local timeout. No transport retry, streaming, alternate model/provider, tokens or cancellation. catalog.collection v2.0.0 requests name/description/SEO/slug/keywords/suggestedRules, rejects private/instructional input and unsupported claims, preserves source language and slices serialized context at 5000 characters. [CS] [CP]

A parseable object normalizes with name/SEO fallbacks and ASCII-or-encoded slug, and reports provider success even with empty description. Only parsing/normalization exceptions yield deterministic fallback. Initial provider failures return logical failure; missing key 503; provider failure generally HTTP 200 success=false. [CS] [CP] [CC]

Name maps to Collection.title; description/slug/SEO persist only on explicit save. Schema contains tenant/productIds/image/isActive/SEO and CRUD scopes product association updates. Keywords are displayed but neither applied nor saved. suggestedRules are returned but not rendered/applied; schema has no rules field. AI does not choose additional product IDs, create images, categorize products or execute membership rules. [CUI] [CVIEW] [CSAVE] [CM] [CPERSIST]

**Illustrative request/response only:**

```json
{"title":"Travel Essentials","description":"","seo":{"title":"","description":""},"productIds":["507f1f77bcf86cd799439011"]}
```

```json
{"success":true,"fallback":false,"data":{"name":"Travel Essentials","description":"Browse selected travel items and compare details.","seoTitle":"Travel Essentials | Example Store","seoDescription":"Browse selected travel essentials from Example Store.","slug":"travel-essentials","keywords":["travel"],"suggestedRules":["Include products in Bags"]},"meta":{"source":"provider","promptId":"catalog.collection","promptVersion":"2.0.0"}}
```

The ObjectId is illustrative syntax; tenant-filtered products inform content. Keywords/rules remain advisory/unused; shared quota/replay/failure paths apply. [CC] [CP] [CUI] [POL]

## AI-003 — Homepage SEO assistant

### Workflow, draft and publication

Homepage SEO's AI tab renders SeoAiPanel through useHomepageSeo. Vendor roles need storeBuilder permission and storeBuilder/homepageSeo features. AI limiter: 12 requests per 15 minutes, using default IP keying. POST /api/store-builder/admin/seo/ai-suggest receives currentTheme.seo plus language/spelling. It returns three alternatives, explanations/topics/length status, recommendations, input snapshot/hash, fallback and metadata. UI has loading/error states and Apply title/description/both; suggestions render as React text and never auto-publish. [AR] [SR] [SRL] [SUI] [SPANEL]

Controller loads the authenticated tenant's shop, overlays current theme data, and queries up to 20 public products through buildPublicProductQuery plus 10 active collection names before reservation. It writes an audit event with alternative count/hash/fallback. Public products must be Published, active and not deleted. [SC] [PUBLIC]

Apply writes chosen fields and alternatives/hash/snapshot/acceptance markers to draftSeo.aiSuggestion. Autosave persists StoreBuilderDraft after 1200 ms through ordinary SEO draft APIs; compatibility mode keeps local draft until publish. Explicit publish delegates to Store Builder revision/conflict controls and stores Shop.theme.seo. Generation is separate from publishing. [SUI] [SAUTO] [SPUB] [SPERSIST] [SPUBLISH]

### Prompt, provider, normalization and provenance

seo.homepage v2.0.0 uses official store name, hero/navigation, public products/categories/collections/topics, current SEO and language/spelling/tone. It forbids rankings/guarantees/keyword stuffing and delimits untrusted store data. Defaults: en-BD, british, clear ecommerce. Parameters: temperature 0.45, topP 0.85, 1800 tokens, JSON schema, 15-second local timeout. No transport retry, streaming, cancellation or token capture. [SS] [SP]

Missing key fails. Unparseable or fewer-than-three alternatives cause deterministic alternatives; provider transport failures return 502. Normalization preserves official name, truncates fields, cleans topics and assesses length. Three empty objects can be filled with templates while retaining provider source. [SS] [SGEN] [SC]

The UI provides no explicit fallback badge and discards source/fallback/prompt/model when accepting content. Shared theme normalization also excludes these fields. The resolver labels accepted matching text source=ai even when it originated in deterministic fallback. This is a verified provenance mismatch; it does not establish poor content quality. [SPANEL] [SUI] [SNORM] [SSOURCE]

**Illustrative request/abbreviated response; not captured traffic:**

```json
{"currentTheme":{"seo":{"title":"Example Store","language":"en-BD"}},"language":"en-BD","spellingPreference":"british"}
```

```json
{"success":true,"data":{"title":"Example Store - Bags","description":"Browse bags from Example Store.","alternatives":[{"id":"option-1","title":"Example Store - Bags","description":"Browse bags from Example Store."},{"id":"option-2","title":"Example Store | Shop Bags","description":"Explore current bags and collections."},{"id":"option-3","title":"Example Store - Browse Our Store","description":"Discover products online."}],"recommendations":[],"generatedFromHash":"illustrative-hash","inputSnapshot":{},"fallback":true,"meta":{"source":"deterministic_fallback","promptId":"seo.homepage","promptVersion":"2.0.0","model":null}}}
```

Actual alternatives include further normalized fields. Apply stores acceptedOptionId/acceptedFields/acceptedAt; autosave writes draft theme SEO, publish writes live theme SEO. Regeneration/selection remain explicit. No SEO-generation queue exists in the inspected worker map. [SGEN] [SUI] [SPERSIST] [SPUBLISH] [WORKER]

## AI-004 — Growth Center ad planning

### Workflow, context and persistence

Vendor roles with growthCenter permission/feature and aiAdGenerator generate planning copy for a selected product. UI fetches product detail with selected analytics range, then POSTs productId/language/campaignType=general to /api/admin/growth/generate-ad-copy. It tracks loading, displays results, allows clipboard copying and labels deterministic fallback. No ad platform publishing or campaign-record creation occurs in this workflow. [AR] [GR] [GUI] [GVIEW] [GC]

Controller validates ObjectId, finds Product by ID+tenant+not-deleted and concurrently calculates tenant metrics, product buyer cities, relevant shop search terms and shop identity. Missing product returns 404. Shared policy reserves quota and persists generation result/usage; Product/Collection remain untouched. [GC] [POL]

Privacy controls exclude raw orders, require city/search aggregate cohort size default/minimum 3, calculate metrics in the application, and intersect output locations with supplied history. Search queries remain free text: occurrence grouping plus product-word relevance does not redact identifying text. City names also come from address free text. This is a potential disclosure risk needing controlled fixtures; no real private query was captured. [GDATA] [GCTX] [GOUT]

The controller permits draft/inactive products, while prompt/fallback wording claims published product details. Planning for drafts may be intentional, but the public-only claim is contradicted. UI also omits range from generation, so generation defaults to 30 days even when displayed detail metrics use another range. [GC] [GGEN] [GUI] [GDATA]

### Provider, prompt and failure behavior

growth.ad_planning v2.0.0 is text-only: product title/category/brand/description/public price/tags/attributes, shop identity/currency, aggregate metrics/cities/search terms, language/campaign type. It requests ad copy/headline/description/CTA/customer/age/interests/locations/angle/reason/improvements and forbids private data/unsupported commerce claims. It does not use private social network data or send an image. [GCTX] [GP]

Parameters: temperature 0.35, topP 0.9, 900 tokens, JSON schema and default 7000 ms local timeout. Cleanup removes unsupported commerce claims, adjusts category interests, allowlists CTA, limits text/arrays and derives confidence/evidence from metrics. Age range is only truncated, not numeric-interval validated. Successful parsing may fill missing fields with rules and still report provider provenance. [GP] [GOUT]

Missing key/auth/rate/timeout/model/parse failures all return deterministic fallback, including configured/source/errorCode/limitations. Quota reservation happens before that decision, so exhausted quota can block a path that would ultimately be free. Provider success consumes a unit; fallback releases it. No live authenticated fallback request was tested. [GGEN] [GC] [POL]

**Illustrative request/abbreviated response; not captured traffic:**

```json
{"productId":"507f1f77bcf86cd799439011","language":"en","campaignType":"general"}
```

```json
{"success":true,"data":{"primaryText":"Explore this travel bag and compare its listed details.","headline":"Canvas Travel Bag","description":"Planning copy based on product information.","callToAction":"Shop Now","targetedCustomer":"People interested in bags","targetedAgeRange":"18-45","suggestedInterests":["Travel accessories"],"suggestedLocationFocus":[],"adAngle":"Travel bag discovery","audienceReason":"Based on category and activity.","improvementSuggestions":["Review missing details."],"evidenceRefs":["product.performance_label"],"confidence":"low","limitations":["There is not enough activity for a high-confidence recommendation."],"meta":{"source":"deterministic_fallback","fallback":true,"configured":false,"model":null,"promptId":"growth.ad_planning","promptVersion":"2.0.0"}}}
```

Values illustrate fields only; actual evidence/confidence/defaults are service-calculated, and demographic correctness is not established. Result remains in UI and ledger; Copy writes clipboard. [GOUT] [GGEN] [GUI] [LEDGER]

## AI-005 — Deprecated product description API

POST /api/admin/generate-description uses product permission/plan/suspension/limiter checks, reserves legacy.product_description and calls the product service with title/category/requestedSections=[description]. It returns description/fallback/meta/usage plus Deprecation/Sunset headers. No Admin caller was found. Its comment instead claims /api/admin/products/generate-description; the registered route is authoritative. This is a compatibility endpoint, not another provider. [PR] [LEG]

It receives neither image nor rich form context and has no preview UI. It shares provider settings, description quality gap and quota failures. Title is checked for truthiness rather than trimmed content. This controller saves no Product; an external caller would have to save it later. [LEG] [PGEN]

**Illustrative API-only exchange:**

```json
{"title":"Canvas Travel Bag","category":"Bags"}
```

```json
{"success":true,"description":"A travel bag for everyday items.","fallback":false,"meta":{"source":"provider","promptId":"product.content","promptVersion":"2.0.0"}}
```

## Provider configuration and shared architecture

| Setting | Observed behavior |
|---|---|
| GEMINI_API_KEY | Backend services only. Local backend .env has a nonempty setting; health/auth untested. |
| GEMINI_MODEL | All services use it or default gemini-2.5-flash. Inspected local .env specifies gemini-3.5-flash-lite; its provider availability/access is unverified. [MODEL] |
| GEMINI_TIMEOUT_MS | Product clamps/validates; other services pass raw Number() to setTimeout. |
| GEMINI_PRODUCT_AI_MAX_OUTPUT_TOKENS | Product only, default 2400; bounded numeric config validation absent. |
| TRUSTED_PRODUCT_IMAGE_HOSTS | Additional product URL hosts; Cloudinary subdomains also accepted. |
| AI_AGGREGATE_PRIVACY_THRESHOLD | Growth cohort default/minimum 3; malformed numeric config not explicitly validated. |

Source: [PCALL] [PIMAGE] [CP] [SP] [GP] [GDATA]. Local config inspection redacted key values. Configured flags show presence rather than live health. [CONFIG] Backend template documents none of these keys. [ENVEX]

Provider calls live in four feature services. Shared infrastructure includes auth/feature gates, request IDs, Mongo ledger and weekly quota. Stable prompt IDs/versions exist, but provider setup, timeout racing, parsing, sanitation and errors are duplicated. No common provider adapter, strict shared response validator, alternate provider/model fallback or local endpoint was found. Deterministic fallback is application code. Prompts/parameters are code constants. [PCALL] [CP] [SP] [GP] [POL]

Admin declares the Google SDK without a discovered source import/call. This is unused dependency surface, not confirmed browser-key exposure. A new feature can reuse policy, but currently copies transport/parser/error handling. Consolidation should preserve feature schemas/prompts and endpoint contracts. [APKG] [POL]

The installed SDK builds HTTPS calls to generativelanguage.googleapis.com/v1beta/models/{model}:generateContent using its default base URL/API version; these services do not override endpoint/provider. This endpoint construction is statically verified, not contacted in this audit. [SDK]

## Security, multi-tenancy and edge cases

JWT/session/account/user/membership/shop status are checked server-side. Staff permission lookup uses membership+tenant with legacy fallback. Active tenant derives from validated authentication, not posted shopId; an already-resolved tenant is checked against token/membership. Product/collection/SEO/Growth context and ledger/usage writes are scoped. No direct cross-tenant generation read was found; two-tenant HTTP attempts remain unperformed. [AUTH] [PERM] [GATE] [PC] [CC] [SC] [GC] [POL]

Cookie requests use CSRF; app JSON limit is 1 MiB. Feature/global rate limits exist. Product/collection/SEO limiters use default IP keying and in-process storage; Growth keys tenant+actor. No explicit distributed store is configured for these limiters. Redis elsewhere does not make the AI ledger/quota Redis-backed: quota uses Mongo PlanUsage. Multipart file size limits do not establish an equivalent global JSON-size cap for multipart fields. [APP] [API] [UPLOAD] [CR] [SRL] [GR] [USAGE]

Prompt delimiting and allowlisted context reduce injection exposure but cannot guarantee factual output. Image-based prompt injection remains unverified. The inspected outputs render escaped React text, with explicit human application, rather than generated HTML execution. No confirmed generated-content XSS was found here; this is not a repo-wide security certification. [PPROMPT] [CP] [SP] [GP] [PUI] [SPANEL] [EXTRAS] [INFO]

| Edge case | Observed handling / limit |
|---|---|
| Missing input | Product title required; collection UI minimum not mirrored server-side; SEO accepts sparse shop context; Growth requires valid tenant product ID. [PC] [CC] [GC] |
| Missing/invalid image | Upload rejects MIME/size; remote failure becomes text-only; other workflows do not send images. [UPLOAD] [PIMAGE] [GP] |
| Provider auth/rate/model error | Product mapped logical errors; collection logical failure; SEO 502; Growth fallback. [PC] [CC] [SC] [GGEN] |
| Timeout | Promise.race ends local wait without cancelling SDK generation; product may make a quality retry. [PCALL] [CP] [SP] [GP] [PGEN] |
| Malformed/partial output | Product retry/fallback, collection parse fallback, SEO count/parse fallback, Growth catch fallback; required-field validation remains weak. [PGEN] [CP] [SGEN] [GOUT] |
| Quota exhaustion | 403 before provider/fallback; reported remaining excludes pending reservations. [USAGE] [POL] |
| Repeated requests | Supplied stable ID replays completed or rejects in-progress/failed; UI generates fresh IDs; no request payload hash. [ID] [POL] |
| Tenant/staff mismatch | Auth/permission/feature guards reject; referenced products are tenant-filtered. [AUTH] [PERM] [GATE] [CC] [GC] |
| DB/process failure | Settlement is non-atomic and reservations lack ownership/recovery; release failure can interrupt controller error mapping. [POL] [USAGE] [WORKER] |
| Form change during generation | No generation context/version or cancellation check before setting/applying returned suggestions; a controlled UI race test is needed. [PUI] [CUI] [SUI] [GUI] |

The AddProduct extra-notes help mentions internal product context, while Product.comments is customer-facing and buildContext sends those comments to Gemini. This ambiguity can encourage submission of private merchant notes; no actual private note was observed. Clarify the public-content contract before relying on prompt wording to prevent disclosure. [PNOTES] [PM] [PCTX]

## Usage, cost and persistence

All entries share PlanUsage.metric=aiProductCreations and limits.aiProductCreationsPerWeek. Weeks start Sunday 00:00 UTC. Seed plan limits are 0/10/50/unlimited, but effective values come from stored resolved plans/overrides, not necessarily those defaults. Ledger has tenant/actor/feature/request/status/result/error/provenance/latency and 24-hour TTL. Schema indexes were inspected; deployed indexes were not. [USAGE] [UM] [PLAN] [PLANACCESS] [LEDGER]

Provider success consumes one application unit; failure/fallback releases it, even when a provider response preceded fallback. Product retry can make two provider calls for one unit. No token counts/provider billing usage/model prices/monetary cost are recorded. Actor attribution is ephemeral, not a staff budget. No monthly AI credit balance was found. [POL] [PGEN] [LEDGER]

Reliable costing needs per-attempt model/modality/token usage/retries/timeouts and applicable pricing, with retained tenant/feature aggregates. No monetary estimate is invented. Repair idempotent recoverable settlement first; token metering is separate. [PCALL] [CP] [SP] [GP] [POL]

Generation automatically writes ephemeral ledger output. Durable content requires product/collection save or SEO draft/publish; Growth has no campaign-save path. Replay omits usage because stored result is passed before usage is added to HTTP response. [PC] [CC] [SC] [GC] [POL]

Subscription usage exposes this weekly metric through billing and a legacy auth shape. Usage warnings calculate thresholds, deduplicate warning records and emit quota events; they also use completed usage rather than pending reservations. This supports entitlement UI/notifications, not provider token/cost reporting. [BILLUSAGE] [WARN]

## Provisional quality scores

All numeric scores are provisional 1–10 code assessments. No live provider/browser/database workflow was run. Each cell gives its reason and evidence; AI-005 has no discovered frontend to score.

| Dimension | AI-001 Product | AI-002 Collection | AI-003 SEO | AI-004 Growth | AI-005 Legacy |
|---|---|---|---|---|---|
| Frontend | 8: shared preview/explicit apply [PUI] | 7: connected editor, unused rules [CUI] [CVIEW] | 7: draft/publish, fallback unlabeled [SUI] [SPANEL] | 7: copy/guard, range omitted [GUI] | Unavailable: no caller [LEG] |
| Backend | 6: service/policy, settlement gaps [PC] [POL] | 6: tenant service, copied transport [CC] [CP] | 6: public context, policy gaps [SC] [POL] | 6: aggregates, policy gaps [GC] [POL] | 5: shared but redundant [LEG] |
| Prompt | 8: image/factual/language bounds [PPROMPT] | 7: guardrails, truncation [CP] | 8: official identity/options [SP] | 8: relevance/privacy/facts [GP] | 6: reduced context [LEG] [PPROMPT] |
| Input validation | 6: bounded, type/file gaps [PC] [UPLOAD] | 5: IDs/bounds, no minimum [CC] | 7: bounded public fields [SS] | 7: IDs/cohorts, PII residual [GC] [GDATA] | 4: truthy title only [LEG] |
| Output reliability | 6: benefit quality only [POUT] [PGEN] | 5: weak required fields [CS] | 6: count/identity, synthesized fields [SGEN] | 6: grounding, weak age/shape [GOUT] | 4: empty description may pass [PGEN] |
| Errors | 7: safe mappings, HTTP200 failures [PC] | 6: friendly/logical failures [CC] | 7: 502/503/fallback [SC] | 7: labeled fallback, outage becomes success [GGEN] | 6: older generic contract [LEG] |
| Security | 7: key/RBAC, remote buffering [PR] [PIMAGE] | 8: RBAC/text/tenant [CR] [CUI] | 8: public/RBAC/text [SR] [SC] | 7: cohorts, free-text privacy [GR] [GDATA] | 7: same guards [PR] |
| Tenant isolation | 8: auth/scoped ledger [AUTH] [POL] | 8: scoped context/CRUD [CC] [CPERSIST] | 8: scoped catalog/draft [SC] [SPERSIST] | 8: product/aggregate scopes [GC] [GDATA] | 8: scoped policy [LEG] [POL] |
| Cost control | 5: quota, retries/no tokens/abort [USAGE] [PGEN] | 5: quota/ceiling, no abort/tokens [CP] | 5: quota/ceiling, no abort/tokens [SP] | 5: quota/ceiling, no abort/tokens [GP] | 4: blank success charging [POL] [PGEN] |
| Tests | 6: helpers/contracts, stale test [TP] | 4: source contracts only [TSEC] | 6: context/resolver, no publish E2E [TS] | 6: rules/cleanup, no provider E2E [TG] | 3: route contracts [PR] |
| Maintainability | 6: shared UI, copied transport [PUI] [PCALL] | 6: separate service/unused fields [CP] | 6: shared resolver/provenance loss [SNORM] | 6: large rules/copied transport [GOUT] [GP] | 4: deprecation/comment drift [LEG] |
| Production readiness | 5: quota/output/runtime gaps [POL] [PGEN] | 5: context/output gaps [CC] [CP] | 5: provenance/quota gaps [SUI] [POL] | 5: range/privacy/quota gaps [GUI] [POL] | 4: no caller/validation debt [LEG] |

## Tests, observability and priorities

Four inspected test files ran 52 checks: product 9/10, ad 9/9, SEO hardening 8/8, SEO rendering 22/25. Selected security contracts ran 9/9. Total 57/61 pass. The repeat to capture truncated errors is not additional coverage. [TP] [TG] [TS] [TSEO] [THERO] [TLINK] [TSEC]

Failed assertions: product compatibility reads a storefront ProductExtras shim instead of the shared implementation; SEO imageAltText expectation reads a module now delegating to shared media; hero source expectation and RelatedProducts slug assertion similarly lag renderer consolidation. Current shared ProductExtras includes the expected aliases. These failures need behavioral tests rather than treating regex presence as runtime proof. [TP] [EXTRAS] [TSEO] [THERO] [TLINK]

Covered: prompt identity/privacy, helper cleanup/category defaults, schema index definitions and route/UI contracts. Missing: dedicated collection/SEO transport failure mocks, AI ledger fault/concurrency recovery and browser generation/apply/save. Production telemetry records request/result/source/prompt/model/latency, product image diagnostics, Growth fallback codes and SEO counts/hash; not provider attempts/tokens/cost or semantic quality. [TS] [TP] [TG] [LEDGER] [PC] [SC] [GGEN]

Recommended order, with files/dependencies/tests in [findings](AI_AUDIT_FINDINGS.md):

1. Repair request-owned quota settlement/recovery (F-001/F-002), then validate actual indexes in disposable Mongo.
2. Cancel provider work on timeout and validate numeric configuration (F-003/F-013).
3. Validate requested output and preserve truthful provenance (F-004/F-005).
4. Bound remote image buffering/verify files and redact analytics text (F-006/F-011/F-016).
5. Align Growth range, collection output and quota/replay UI (F-007–F-010).
6. Replace stale source assertions; add mocked HTTP/provider/fault tests (F-012).
7. Consolidate transport/errors, document env and address SDK/legacy debt compatibly (F-013–F-015/F-017).

No proposed fix was implemented. Diagrams in [architecture report](AI_ARCHITECTURE_AND_DATA_FLOW.md) depict current code, not a second AI system.

## Verification limitations

Live Gemini key validity/model availability/output quality/costs, running-process environment, deployment secret injection, production indexes/data and browser flows remain unverified. Local .env presence does not establish deployed settings. No real customer records/request prompts/images/secrets were captured. The audit does not certify production functionality or 10/10 readiness.

## Source evidence index

References resolve to inspected current source. The range is displayed here; each link opens its first line. Verified on 2026-10-10.

[ADD]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx:459> "ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx:459-522 — submit payload and assistant mount"
[API]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/api/api.js:9> "ecommerce-admin/src/api/api.js:9-77 — API and CSRF interceptors"
[APKG]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/package.json:6> "ecommerce-admin/package.json:6-37 — Admin scripts and dependencies"
[APP]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/app.js:99> "ecommerce-backend/backend/app.js:99-174 — middleware and route registration"
[AR]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/App.jsx:168> "ecommerce-admin/src/App.jsx:168-181 — Admin route elements"
[AUTH]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/middlewares/auth.js:20> "ecommerce-backend/backend/middlewares/auth.js:20-140 — attachUserFromToken"
[BADGE]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/badges/badgeAnalysisService.js:12> "ecommerce-backend/backend/services/badges/badgeAnalysisService.js:12-50 — negative keywords / scoreSnapshot"
[BILLUSAGE]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/billing/subscriptionUsageService.js:6> "ecommerce-backend/backend/services/billing/subscriptionUsageService.js:6-65 — getSubscriptionUsage / toLegacyUsageShape"
[BPKG]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/package.json:20> "ecommerce-backend/backend/package.json:20-60 — backend scripts and dependencies"
[CC]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/collectionController.js:186> "ecommerce-backend/backend/controllers/collectionController.js:186-278 — suggestCollectionAi"
[CM]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/Collection.js:4> "ecommerce-backend/backend/models/Collection.js:4-54 — collectionSchema"
[CONFIG]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/superAdminOperationsController.js:686> "ecommerce-backend/backend/controllers/superAdminOperationsController.js:686-698 — configuration flags"
[CP]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/collections/collectionAiService.js:142> "ecommerce-backend/backend/services/collections/collectionAiService.js:142-269 — prompt / provider / generation"
[CPERSIST]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/collectionController.js:387> "ecommerce-backend/backend/controllers/collectionController.js:387-482 — createCollection / updateCollection"
[CR]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/routes/collectionRoutes.js:19> "ecommerce-backend/backend/routes/collectionRoutes.js:19-46 — collection guards and route"
[CS]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/collections/collectionAiService.js:16> "ecommerce-backend/backend/services/collections/collectionAiService.js:16-141 — schema / normalization / fallback / parsing"
[CSAVE]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:264> "ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:264-289 — saveCollection"
[CUI]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:440> "ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:440-494 — generateCollectionAi / applyCollectionAi"
[CVIEW]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:605> "ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:605-645 — suggestion display"
[EDIT]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/products/EditProduct.jsx:637> "ecommerce-admin/src/pages/dashboard/products/EditProduct.jsx:637-735 — save / assistant mount"
[ENVEX]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/.env.example:1> "ecommerce-backend/backend/.env.example:1-48 — backend configuration template"
[EXTRAS]: <C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/ProductExtras.jsx:10> "packages/storefront-renderer/presentation/ProductExtras.jsx:10-30 — normalizeSellingPoints"
[GATE]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/middlewares/featureGate.js:27> "ecommerce-backend/backend/middlewares/featureGate.js:27-72 — requireShopFeature"
[GC]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/growthController.js:666> "ecommerce-backend/backend/controllers/growthController.js:666-743 — generateAdCopy"
[GCTX]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/adInsightAIService.js:432> "ecommerce-backend/backend/services/adInsightAIService.js:432-478 — sanitizeProductContext / metrics / shop"
[GDATA]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/growthController.js:24> "ecommerce-backend/backend/controllers/growthController.js:24-138 — getRangeStart / cities / search terms"
[GGEN]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/adInsightAIService.js:742> "ecommerce-backend/backend/services/adInsightAIService.js:742-812 — generateAdInsight"
[GOUT]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/adInsightAIService.js:584> "ecommerce-backend/backend/services/adInsightAIService.js:584-637 — cleanAdInsightResponse"
[GP]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/adInsightAIService.js:665> "ecommerce-backend/backend/services/adInsightAIService.js:665-740 — buildGeminiPrompt / callGemini"
[GR]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/routes/growthRoutes.js:19> "ecommerce-backend/backend/routes/growthRoutes.js:19-41 — growth guards / route"
[GRULE]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/growthController.js:141> "ecommerce-backend/backend/controllers/growthController.js:141-210 — classifyProduct"
[GUI]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx:227> "ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx:227-274 — detail / generation / copy"
[GVIEW]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx:464> "ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx:464-497 — generation / fallback display"
[ID]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/utils/aiRequestId.js:1> "ecommerce-admin/src/utils/aiRequestId.js:1-9 — createAiRequestId / aiRequestHeaders"
[INFO]: <C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/ProductInfo.jsx:85> "packages/storefront-renderer/presentation/ProductInfo.jsx:85-100 — description text rendering"
[LEDGER]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/AiGenerationRequest.js:3> "ecommerce-backend/backend/models/AiGenerationRequest.js:3-49 — request schema and indexes"
[LEG]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/productController.js:180> "ecommerce-backend/backend/controllers/productController.js:180-238 — generateDescription"
[MODEL]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/.env:7> "ecommerce-backend/backend/.env:7-7 — GEMINI_MODEL; only non-secret model value reported"
[NPKG]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/package.json:5> "ecommerce-storefront/package.json:5-28 — storefront scripts and dependencies"
[PB]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/components/products/ProductAiAssistant.jsx:475> "ecommerce-admin/src/components/products/ProductAiAssistant.jsx:475-513 — generation buttons"
[PC]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/productController.js:248> "ecommerce-backend/backend/controllers/productController.js:248-361 — generateProductContent"
[PCALL]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/products/productContentAiService.js:685> "ecommerce-backend/backend/services/products/productContentAiService.js:685-756 — getGeminiTimeoutMs / callGemini"
[PCTX]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/products/productContentAiService.js:141> "ecommerce-backend/backend/services/products/productContentAiService.js:141-209 — normalizeRequestedSections / buildContext"
[PERM]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/middlewares/permission.js:4> "ecommerce-backend/backend/middlewares/permission.js:4-54 — requirePermission"
[PFALL]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/products/productContentAiService.js:400> "ecommerce-backend/backend/services/products/productContentAiService.js:400-523 — buildFallbackSuggestion"
[PGEN]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/products/productContentAiService.js:759> "ecommerce-backend/backend/services/products/productContentAiService.js:759-883 — quality predicate / generation / meta"
[PIMAGE]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/products/productContentAiService.js:580> "ecommerce-backend/backend/services/products/productContentAiService.js:580-683 — fileToGeminiPart / fetchImageUrlPart / buildImagePart"
[PLAN]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/config/subscriptionPlans.js:48> "ecommerce-backend/backend/config/subscriptionPlans.js:48-205 — default plan limits and features"
[PLANACCESS]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/billing/planAccessService.js:80> "ecommerce-backend/backend/services/billing/planAccessService.js:80-111 — effective plan context"
[PM]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/Product.js:93> "ecommerce-backend/backend/models/Product.js:93-153 — product content schema"
[PNOTES]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx:1059> "ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx:1059-1070 — extra notes field helper text"
[POL]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/ai/aiGenerationPolicyService.js:13> "ecommerce-backend/backend/services/ai/aiGenerationPolicyService.js:13-151 — begin / complete / fail / replay"
[POUT]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/products/productContentAiService.js:259> "ecommerce-backend/backend/services/products/productContentAiService.js:259-367 — normalization / cleanProductContentSuggestion"
[PPROMPT]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/products/productContentAiService.js:525> "ecommerce-backend/backend/services/products/productContentAiService.js:525-578 — buildPrompt"
[PR]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/routes/adminRoutes.js:832> "ecommerce-backend/backend/routes/adminRoutes.js:832-854 — product AI routes"
[PSAVE]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/productController.js:870> "ecommerce-backend/backend/controllers/productController.js:870-887 — update allowlist"
[PUBLIC]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/products/publicProductQueryService.js:1> "ecommerce-backend/backend/services/products/publicProductQueryService.js:1-11 — buildPublicProductQuery"
[PUI]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/components/products/ProductAiAssistant.jsx:330> "ecommerce-admin/src/components/products/ProductAiAssistant.jsx:330-465 — generate / applySections"
[SAUTO]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/Seo/hooks/useHomepageSeo.js:147> "ecommerce-admin/src/pages/dashboard/Seo/hooks/useHomepageSeo.js:147-180 — saveDraft / autosave effect"
[SC]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/storeBuilderController.js:269> "ecommerce-backend/backend/controllers/storeBuilderController.js:269-376 — suggestStoreSeo"
[SDK]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/node_modules/@google/generative-ai/dist/index.js:307> "ecommerce-backend/backend/node_modules/@google/generative-ai/dist/index.js:307-365 — SDK RequestUrl / HTTP request construction"
[SGEN]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeSeoAiService.js:224> "ecommerce-backend/backend/services/storeSeoAiService.js:224-290 — generateStoreSeoSuggestion"
[SNORM]: <C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/index.cjs:373> "packages/storefront-theme/index.cjs:373-390 — SEO suggestion normalization"
[SP]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeSeoAiService.js:176> "ecommerce-backend/backend/services/storeSeoAiService.js:176-222 — buildPrompt / callGemini"
[SPANEL]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/Seo/SeoAiPanel.jsx:1> "ecommerce-admin/src/pages/dashboard/Seo/SeoAiPanel.jsx:1-43 — SeoAiPanel"
[SPERSIST]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/storeBuilderSeoService.js:138> "ecommerce-backend/backend/services/storeBuilder/storeBuilderSeoService.js:138-190 — saveStoreBuilderSeoDraft"
[SPUB]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/Seo/hooks/useHomepageSeo.js:194> "ecommerce-admin/src/pages/dashboard/Seo/hooks/useHomepageSeo.js:194-257 — publish"
[SPUBLISH]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/storeBuilderSeoService.js:231> "ecommerce-backend/backend/services/storeBuilder/storeBuilderSeoService.js:231-257 — publishStoreBuilderSeo"
[SR]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/routes/storeBuilderRoutes.js:121> "ecommerce-backend/backend/routes/storeBuilderRoutes.js:121-130 — SEO AI route"
[SRL]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/routes/storeBuilderRoutes.js:48> "ecommerce-backend/backend/routes/storeBuilderRoutes.js:48-57 — storeBuilderAiLimiter"
[SS]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeSeoAiService.js:66> "ecommerce-backend/backend/services/storeSeoAiService.js:66-174 — normalizeAlternative / buildSafeContext"
[SSOURCE]: <C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/homepage-seo.cjs:201> "packages/storefront-theme/homepage-seo.cjs:201-216 — findAcceptedAiSource / resolveTextField"
[SUI]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/Seo/hooks/useHomepageSeo.js:277> "ecommerce-admin/src/pages/dashboard/Seo/hooks/useHomepageSeo.js:277-313 — requestAiSuggestions / applyAiSuggestion"
[TG]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/ad-insight-ai.test.js:1> "ecommerce-backend/backend/tests/ad-insight-ai.test.js:1-233 — ad helper tests"
[THERO]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/seo-rendering.test.js:651> "ecommerce-backend/backend/tests/seo-rendering.test.js:651-660 — hero source assertion"
[TLINK]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/seo-rendering.test.js:884> "ecommerce-backend/backend/tests/seo-rendering.test.js:884-900 — related product source assertion"
[TP]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/product-content-ai.test.js:1> "ecommerce-backend/backend/tests/product-content-ai.test.js:1-297 — product helpers and contracts"
[TS]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/seo-ai-production-hardening.test.js:23> "ecommerce-backend/backend/tests/seo-ai-production-hardening.test.js:23-50 — prompt identities and schema indexes"
[TSEC]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/security-hardening.test.js:285> "ecommerce-backend/backend/tests/security-hardening.test.js:285-304 — collection source contract"
[TSEO]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/seo-rendering.test.js:51> "ecommerce-backend/backend/tests/seo-rendering.test.js:51-80 — SEO source assertions"
[UM]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/PlanUsage.js:3> "ecommerce-backend/backend/models/PlanUsage.js:3-27 — usage schema and unique index"
[UPLOAD]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/routes/adminRoutes.js:300> "ecommerce-backend/backend/routes/adminRoutes.js:300-337 — productAiImageUpload / productAiLimiter"
[USAGE]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/billing/planUsageService.js:1> "ecommerce-backend/backend/services/billing/planUsageService.js:1-94 — weekly quota reservation / settlement"
[WARN]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/billing/subscriptionWarningService.js:16> "ecommerce-backend/backend/services/billing/subscriptionWarningService.js:16-89 — getCurrentUsageWarnings / evaluateUsageWarnings"
[WORKER]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/workers/index.js:71> "ecommerce-backend/backend/workers/index.js:71-83 — handlers"

- **ADD**: [ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx:459-522 — submit payload and assistant mount][ADD]
- **API**: [ecommerce-admin/src/api/api.js:9-77 — API and CSRF interceptors][API]
- **APKG**: [ecommerce-admin/package.json:6-37 — Admin scripts and dependencies][APKG]
- **APP**: [ecommerce-backend/backend/app.js:99-174 — middleware and route registration][APP]
- **AR**: [ecommerce-admin/src/App.jsx:168-181 — Admin route elements][AR]
- **AUTH**: [ecommerce-backend/backend/middlewares/auth.js:20-140 — attachUserFromToken][AUTH]
- **BADGE**: [ecommerce-backend/backend/services/badges/badgeAnalysisService.js:12-50 — negative keywords / scoreSnapshot][BADGE]
- **BILLUSAGE**: [ecommerce-backend/backend/services/billing/subscriptionUsageService.js:6-65 — getSubscriptionUsage / toLegacyUsageShape][BILLUSAGE]
- **BPKG**: [ecommerce-backend/backend/package.json:20-60 — backend scripts and dependencies][BPKG]
- **CC**: [ecommerce-backend/backend/controllers/collectionController.js:186-278 — suggestCollectionAi][CC]
- **CM**: [ecommerce-backend/backend/models/Collection.js:4-54 — collectionSchema][CM]
- **CONFIG**: [ecommerce-backend/backend/controllers/superAdminOperationsController.js:686-698 — configuration flags][CONFIG]
- **CP**: [ecommerce-backend/backend/services/collections/collectionAiService.js:142-269 — prompt / provider / generation][CP]
- **CPERSIST**: [ecommerce-backend/backend/controllers/collectionController.js:387-482 — createCollection / updateCollection][CPERSIST]
- **CR**: [ecommerce-backend/backend/routes/collectionRoutes.js:19-46 — collection guards and route][CR]
- **CS**: [ecommerce-backend/backend/services/collections/collectionAiService.js:16-141 — schema / normalization / fallback / parsing][CS]
- **CSAVE**: [ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:264-289 — saveCollection][CSAVE]
- **CUI**: [ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:440-494 — generateCollectionAi / applyCollectionAi][CUI]
- **CVIEW**: [ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:605-645 — suggestion display][CVIEW]
- **EDIT**: [ecommerce-admin/src/pages/dashboard/products/EditProduct.jsx:637-735 — save / assistant mount][EDIT]
- **ENVEX**: [ecommerce-backend/backend/.env.example:1-48 — backend configuration template][ENVEX]
- **EXTRAS**: [packages/storefront-renderer/presentation/ProductExtras.jsx:10-30 — normalizeSellingPoints][EXTRAS]
- **GATE**: [ecommerce-backend/backend/middlewares/featureGate.js:27-72 — requireShopFeature][GATE]
- **GC**: [ecommerce-backend/backend/controllers/growthController.js:666-743 — generateAdCopy][GC]
- **GCTX**: [ecommerce-backend/backend/services/adInsightAIService.js:432-478 — sanitizeProductContext / metrics / shop][GCTX]
- **GDATA**: [ecommerce-backend/backend/controllers/growthController.js:24-138 — getRangeStart / cities / search terms][GDATA]
- **GGEN**: [ecommerce-backend/backend/services/adInsightAIService.js:742-812 — generateAdInsight][GGEN]
- **GOUT**: [ecommerce-backend/backend/services/adInsightAIService.js:584-637 — cleanAdInsightResponse][GOUT]
- **GP**: [ecommerce-backend/backend/services/adInsightAIService.js:665-740 — buildGeminiPrompt / callGemini][GP]
- **GR**: [ecommerce-backend/backend/routes/growthRoutes.js:19-41 — growth guards / route][GR]
- **GRULE**: [ecommerce-backend/backend/controllers/growthController.js:141-210 — classifyProduct][GRULE]
- **GUI**: [ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx:227-274 — detail / generation / copy][GUI]
- **GVIEW**: [ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx:464-497 — generation / fallback display][GVIEW]
- **ID**: [ecommerce-admin/src/utils/aiRequestId.js:1-9 — createAiRequestId / aiRequestHeaders][ID]
- **INFO**: [packages/storefront-renderer/presentation/ProductInfo.jsx:85-100 — description text rendering][INFO]
- **LEDGER**: [ecommerce-backend/backend/models/AiGenerationRequest.js:3-49 — request schema and indexes][LEDGER]
- **LEG**: [ecommerce-backend/backend/controllers/productController.js:180-238 — generateDescription][LEG]
- **MODEL**: [ecommerce-backend/backend/.env:7-7 — GEMINI_MODEL; only non-secret model value reported][MODEL]
- **NPKG**: [ecommerce-storefront/package.json:5-28 — storefront scripts and dependencies][NPKG]
- **PB**: [ecommerce-admin/src/components/products/ProductAiAssistant.jsx:475-513 — generation buttons][PB]
- **PC**: [ecommerce-backend/backend/controllers/productController.js:248-361 — generateProductContent][PC]
- **PCALL**: [ecommerce-backend/backend/services/products/productContentAiService.js:685-756 — getGeminiTimeoutMs / callGemini][PCALL]
- **PCTX**: [ecommerce-backend/backend/services/products/productContentAiService.js:141-209 — normalizeRequestedSections / buildContext][PCTX]
- **PERM**: [ecommerce-backend/backend/middlewares/permission.js:4-54 — requirePermission][PERM]
- **PFALL**: [ecommerce-backend/backend/services/products/productContentAiService.js:400-523 — buildFallbackSuggestion][PFALL]
- **PGEN**: [ecommerce-backend/backend/services/products/productContentAiService.js:759-883 — quality predicate / generation / meta][PGEN]
- **PIMAGE**: [ecommerce-backend/backend/services/products/productContentAiService.js:580-683 — fileToGeminiPart / fetchImageUrlPart / buildImagePart][PIMAGE]
- **PLAN**: [ecommerce-backend/backend/config/subscriptionPlans.js:48-205 — default plan limits and features][PLAN]
- **PLANACCESS**: [ecommerce-backend/backend/services/billing/planAccessService.js:80-111 — effective plan context][PLANACCESS]
- **PM**: [ecommerce-backend/backend/models/Product.js:93-153 — product content schema][PM]
- **PNOTES**: [ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx:1059-1070 — extra notes field helper text][PNOTES]
- **POL**: [ecommerce-backend/backend/services/ai/aiGenerationPolicyService.js:13-151 — begin / complete / fail / replay][POL]
- **POUT**: [ecommerce-backend/backend/services/products/productContentAiService.js:259-367 — normalization / cleanProductContentSuggestion][POUT]
- **PPROMPT**: [ecommerce-backend/backend/services/products/productContentAiService.js:525-578 — buildPrompt][PPROMPT]
- **PR**: [ecommerce-backend/backend/routes/adminRoutes.js:832-854 — product AI routes][PR]
- **PSAVE**: [ecommerce-backend/backend/controllers/productController.js:870-887 — update allowlist][PSAVE]
- **PUBLIC**: [ecommerce-backend/backend/services/products/publicProductQueryService.js:1-11 — buildPublicProductQuery][PUBLIC]
- **PUI**: [ecommerce-admin/src/components/products/ProductAiAssistant.jsx:330-465 — generate / applySections][PUI]
- **SAUTO**: [ecommerce-admin/src/pages/dashboard/Seo/hooks/useHomepageSeo.js:147-180 — saveDraft / autosave effect][SAUTO]
- **SC**: [ecommerce-backend/backend/controllers/storeBuilderController.js:269-376 — suggestStoreSeo][SC]
- **SDK**: [ecommerce-backend/backend/node_modules/@google/generative-ai/dist/index.js:307-365 — SDK RequestUrl / HTTP request construction][SDK]
- **SGEN**: [ecommerce-backend/backend/services/storeSeoAiService.js:224-290 — generateStoreSeoSuggestion][SGEN]
- **SNORM**: [packages/storefront-theme/index.cjs:373-390 — SEO suggestion normalization][SNORM]
- **SP**: [ecommerce-backend/backend/services/storeSeoAiService.js:176-222 — buildPrompt / callGemini][SP]
- **SPANEL**: [ecommerce-admin/src/pages/dashboard/Seo/SeoAiPanel.jsx:1-43 — SeoAiPanel][SPANEL]
- **SPERSIST**: [ecommerce-backend/backend/services/storeBuilder/storeBuilderSeoService.js:138-190 — saveStoreBuilderSeoDraft][SPERSIST]
- **SPUB**: [ecommerce-admin/src/pages/dashboard/Seo/hooks/useHomepageSeo.js:194-257 — publish][SPUB]
- **SPUBLISH**: [ecommerce-backend/backend/services/storeBuilder/storeBuilderSeoService.js:231-257 — publishStoreBuilderSeo][SPUBLISH]
- **SR**: [ecommerce-backend/backend/routes/storeBuilderRoutes.js:121-130 — SEO AI route][SR]
- **SRL**: [ecommerce-backend/backend/routes/storeBuilderRoutes.js:48-57 — storeBuilderAiLimiter][SRL]
- **SS**: [ecommerce-backend/backend/services/storeSeoAiService.js:66-174 — normalizeAlternative / buildSafeContext][SS]
- **SSOURCE**: [packages/storefront-theme/homepage-seo.cjs:201-216 — findAcceptedAiSource / resolveTextField][SSOURCE]
- **SUI**: [ecommerce-admin/src/pages/dashboard/Seo/hooks/useHomepageSeo.js:277-313 — requestAiSuggestions / applyAiSuggestion][SUI]
- **TG**: [ecommerce-backend/backend/tests/ad-insight-ai.test.js:1-233 — ad helper tests][TG]
- **THERO**: [ecommerce-backend/backend/tests/seo-rendering.test.js:651-660 — hero source assertion][THERO]
- **TLINK**: [ecommerce-backend/backend/tests/seo-rendering.test.js:884-900 — related product source assertion][TLINK]
- **TP**: [ecommerce-backend/backend/tests/product-content-ai.test.js:1-297 — product helpers and contracts][TP]
- **TS**: [ecommerce-backend/backend/tests/seo-ai-production-hardening.test.js:23-50 — prompt identities and schema indexes][TS]
- **TSEC**: [ecommerce-backend/backend/tests/security-hardening.test.js:285-304 — collection source contract][TSEC]
- **TSEO**: [ecommerce-backend/backend/tests/seo-rendering.test.js:51-80 — SEO source assertions][TSEO]
- **UM**: [ecommerce-backend/backend/models/PlanUsage.js:3-27 — usage schema and unique index][UM]
- **UPLOAD**: [ecommerce-backend/backend/routes/adminRoutes.js:300-337 — productAiImageUpload / productAiLimiter][UPLOAD]
- **USAGE**: [ecommerce-backend/backend/services/billing/planUsageService.js:1-94 — weekly quota reservation / settlement][USAGE]
- **WARN**: [ecommerce-backend/backend/services/billing/subscriptionWarningService.js:16-89 — getCurrentUsageWarnings / evaluateUsageWarnings][WARN]
- **WORKER**: [ecommerce-backend/backend/workers/index.js:71-83 — handlers][WORKER]
