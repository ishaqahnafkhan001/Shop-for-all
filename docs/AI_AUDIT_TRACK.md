# Admin AI audit tracker — 2026-10-10

**Status: audit and five reports complete.** Runtime/deployment checks listed below remain unperformed and are not prerequisites for this read-only report delivery.

Scope: Admin UI and connected API, AI services/prompts/configuration, auth/permissions/tenant boundaries, generated-content persistence, workers, usage/quotas, tests and shared storefront consumers. Audited the existing working tree without modifying application code, dependencies, environment files or database data. No paid/live generation, installation, commit or push.

## Completed phases

| Phase | Status | Delivered evidence |
|---|---|---|
| 1 Repository discovery | Complete | Separate applications/packages, entry points, manifests, config templates, workers and tests mapped |
| 2 Feature inventory | Complete | 4 Admin workflows and 1 legacy compatibility API; excluded rule-based lookalikes |
| 3 Feature traces | Complete | UI→guards→context→quota→provider→normalization→UI→ordinary persistence; prompts/parameters/errors inspected |
| 4 Cross-feature assessment | Complete | Shared policy versus duplicated provider wrappers, tenant checks, costs, telemetry, faults and provisional ratings |
| 5 Safe verification | Complete within read-only scope | 61 selected checks: 57 pass, 4 stale source assertions fail; route/payload/consumer cross-checks |
| 6 Documentation/review | Complete | Five reports; source paths/ranges, links, JSON examples, findings/counts and Mermaid blocks checked |

## Features and findings

AI-001 product content; AI-002 collection suggestions; AI-003 homepage SEO; AI-004 Growth ad planning; AI-005 duplicate deprecated description API. Four connected UI implementations have important gaps. The registered legacy endpoint has no discovered Admin caller; external use is unknown. No feature was certified fully functional in deployment.

17 findings: 0 Critical, 3 High, 12 Medium, 2 Low. Conditional code faults are distinguished from potential vulnerabilities. No confirmed cross-tenant generation leak was found. High priorities: orphaned quota, non-idempotent settlement/result ordering, timeout without provider cancellation.

## Tests actually executed

Working directory: ecommerce-backend/backend. Inspected scripts/tests first. No app/worker startup, migration or integration suite was executed.

```powershell
node --test tests/product-content-ai.test.js tests/ad-insight-ai.test.js tests/seo-ai-production-hardening.test.js tests/seo-rendering.test.js
node --test --test-reporter=spec tests/product-content-ai.test.js tests/ad-insight-ai.test.js tests/seo-ai-production-hardening.test.js tests/seo-rendering.test.js
node --test --test-reporter=spec --test-name-pattern='AI|growth center|csrf|security middleware|upload pipeline|shop feature flags' tests/security-hardening.test.js
```

The second command repeated the first group solely to capture initially truncated error output; it does not add coverage. Four-file group: 52 tests, 48 pass/4 fail. Selected security group: 9/9 pass. Failed source assertions: ProductExtras aliases, SEO imageAltText, hero source expression and RelatedProducts slug expression. These files now delegate to shared implementations; failures do not establish broken browser behavior. Node emitted module-type inference warnings for imported storefront JS. These warnings are recorded, without changing package settings.

Logs: [AI checks](../output/ai-admin-tests.log), [security checks](../output/ai-admin-security-tests.log). Search records: output/ai-admin-search.txt and output/ai-provider-search.txt. Source evidence metadata: output/ai-audit-evidence.json. No customer/provider traffic was captured.

## Known limitations and findings awaiting runtime verification

- Live provider health, local model availability, actual deployment model/key/environment inheritance and paid generation quality were not tested.
- Real Mongo unique/TTL indexes, fault injection/concurrent settlement, crash recovery and migration state were not inspected in deployment (F-001/F-002/F-009).
- Late provider cancellation/cost behavior needs a mocked slow transport before a controlled provider check (F-003).
- Browser generation/apply/ordinary save/SEO publish, pending-form races and multi-tenant/staff denial require disposable fixtures and browser tests.
- Analytics PII and image signature/ownership findings are potential risks; no actual disclosure or private asset access was observed (F-011/F-016).
- No monetary cost estimate is possible from current persisted counters; tokens/pricing/attempt data are absent.
- Search conclusions concern accessible repository application source; private services/repositories are outside scope.

## Remaining work

Required audit/document work: none. The controlled runtime verification above is an explicitly identified follow-up, not a claim that these checks already passed. Fixes remain proposed; no application remediation was performed.

## Final completion checklist

- [x] Repository and connected apps mapped.
- [x] Admin/backend searched beyond product generation.
- [x] Every discovered generation entry inventoried; lookalikes explained.
- [x] Every entry traced with exact current source evidence.
- [x] Prompts/models/configuration/input/output/persistence reviewed.
- [x] Tenant/security/errors/usage/cost/tests assessed.
- [x] Defects and conditional/potential risks distinguished.
- [x] 12 quality dimensions per entry scored provisionally or marked unavailable.
- [x] Illustrative request/response examples labeled.
- [x] Current architecture/product/collection/quota diagrams produced.
- [x] All five reports written and references/examples/counts reviewed.
- [x] Untested runtime/deployment checks disclosed.
- [x] Audit preserved application/configuration/database/dependency state.

## Inspected source index

The reports cite these files with line ranges and symbols. Dependency source is included only for protocol construction; local .env inspection disclosed key presence and the non-secret model only.

- [ecommerce-admin/package.json](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/package.json>)
- [ecommerce-admin/src/App.jsx](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/App.jsx>)
- [ecommerce-admin/src/api/api.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/api/api.js>)
- [ecommerce-admin/src/components/products/ProductAiAssistant.jsx](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/components/products/ProductAiAssistant.jsx>)
- [ecommerce-admin/src/pages/dashboard/CatalogTools.jsx](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/CatalogTools.jsx>)
- [ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx>)
- [ecommerce-admin/src/pages/dashboard/Seo/SeoAiPanel.jsx](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/Seo/SeoAiPanel.jsx>)
- [ecommerce-admin/src/pages/dashboard/Seo/hooks/useHomepageSeo.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/Seo/hooks/useHomepageSeo.js>)
- [ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx>)
- [ecommerce-admin/src/pages/dashboard/products/EditProduct.jsx](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/products/EditProduct.jsx>)
- [ecommerce-admin/src/utils/aiRequestId.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/utils/aiRequestId.js>)
- [ecommerce-backend/backend/.env](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/.env>)
- [ecommerce-backend/backend/.env.example](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/.env.example>)
- [ecommerce-backend/backend/app.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/app.js>)
- [ecommerce-backend/backend/config/subscriptionFeatures.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/config/subscriptionFeatures.js>)
- [ecommerce-backend/backend/config/subscriptionPlans.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/config/subscriptionPlans.js>)
- [ecommerce-backend/backend/controllers/collectionController.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/collectionController.js>)
- [ecommerce-backend/backend/controllers/growthController.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/growthController.js>)
- [ecommerce-backend/backend/controllers/productController.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/productController.js>)
- [ecommerce-backend/backend/controllers/storeBuilderController.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/storeBuilderController.js>)
- [ecommerce-backend/backend/controllers/superAdminOperationsController.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/superAdminOperationsController.js>)
- [ecommerce-backend/backend/middlewares/auth.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/middlewares/auth.js>)
- [ecommerce-backend/backend/middlewares/featureGate.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/middlewares/featureGate.js>)
- [ecommerce-backend/backend/middlewares/permission.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/middlewares/permission.js>)
- [ecommerce-backend/backend/models/AiGenerationRequest.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/AiGenerationRequest.js>)
- [ecommerce-backend/backend/models/Collection.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/Collection.js>)
- [ecommerce-backend/backend/models/PlanUsage.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/PlanUsage.js>)
- [ecommerce-backend/backend/models/Product.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/Product.js>)
- [ecommerce-backend/backend/models/Shop.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/Shop.js>)
- [ecommerce-backend/backend/node_modules/@google/generative-ai/dist/index.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/node_modules/@google/generative-ai/dist/index.js>)
- [ecommerce-backend/backend/package.json](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/package.json>)
- [ecommerce-backend/backend/routes/adminRoutes.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/routes/adminRoutes.js>)
- [ecommerce-backend/backend/routes/collectionRoutes.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/routes/collectionRoutes.js>)
- [ecommerce-backend/backend/routes/growthRoutes.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/routes/growthRoutes.js>)
- [ecommerce-backend/backend/routes/storeBuilderRoutes.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/routes/storeBuilderRoutes.js>)
- [ecommerce-backend/backend/services/adInsightAIService.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/adInsightAIService.js>)
- [ecommerce-backend/backend/services/ai/aiGenerationPolicyService.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/ai/aiGenerationPolicyService.js>)
- [ecommerce-backend/backend/services/badges/badgeAnalysisService.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/badges/badgeAnalysisService.js>)
- [ecommerce-backend/backend/services/billing/planAccessService.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/billing/planAccessService.js>)
- [ecommerce-backend/backend/services/billing/planUsageService.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/billing/planUsageService.js>)
- [ecommerce-backend/backend/services/billing/subscriptionUsageService.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/billing/subscriptionUsageService.js>)
- [ecommerce-backend/backend/services/billing/subscriptionWarningService.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/billing/subscriptionWarningService.js>)
- [ecommerce-backend/backend/services/collections/collectionAiService.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/collections/collectionAiService.js>)
- [ecommerce-backend/backend/services/events/domainEventBus.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/events/domainEventBus.js>)
- [ecommerce-backend/backend/services/products/productContentAiService.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/products/productContentAiService.js>)
- [ecommerce-backend/backend/services/products/publicProductQueryService.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/products/publicProductQueryService.js>)
- [ecommerce-backend/backend/services/storeBuilder/storeBuilderSeoService.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/storeBuilderSeoService.js>)
- [ecommerce-backend/backend/services/storeSeoAiService.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeSeoAiService.js>)
- [ecommerce-backend/backend/tests/ad-insight-ai.test.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/ad-insight-ai.test.js>)
- [ecommerce-backend/backend/tests/product-content-ai.test.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/product-content-ai.test.js>)
- [ecommerce-backend/backend/tests/security-hardening.test.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/security-hardening.test.js>)
- [ecommerce-backend/backend/tests/seo-ai-production-hardening.test.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/seo-ai-production-hardening.test.js>)
- [ecommerce-backend/backend/tests/seo-rendering.test.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/tests/seo-rendering.test.js>)
- [ecommerce-backend/backend/workers/index.js](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/workers/index.js>)
- [ecommerce-storefront/package.json](<C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-storefront/package.json>)
- [packages/storefront-renderer/presentation/ProductExtras.jsx](<C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/ProductExtras.jsx>)
- [packages/storefront-renderer/presentation/ProductInfo.jsx](<C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-renderer/presentation/ProductInfo.jsx>)
- [packages/storefront-theme/homepage-seo.cjs](<C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/homepage-seo.cjs>)
- [packages/storefront-theme/index.cjs](<C:/Users/user/WebstormProjects/Shop-for-all/packages/storefront-theme/index.cjs>)

## Historical progress checkpoints

The entries below record earlier stages, not current completion status.

## Discovery and inventory checkpoint

Discovery and inventory completed: four Admin workflows and one deprecated API were found. Provider calls resolve to four backend Gemini services. Broad searches found no implemented local AI, chatbot, embeddings or alternate provider.

Generation paths, permissions, tenant-scoped context, draft/application behavior and the shared request/weekly usage ledger have been traced. Cross-feature failure and persistence assessment is in progress.

Selected existing tests have been inspected: they use pure helpers, schema inspection and source contracts. No application startup, database connection or live provider call is required. Verification results are pending.

## Trace, comparison and verification checkpoint

Completed authorization/tenant checks, payload transformations, prompt/model settings, image handling, ordinary save/publish persistence and worker classification. Confirmed shared policy fault paths, incomplete application output validation, SEO provenance loss, date-range omission and stale source assertions.

Executed four inspected existing test files: 52 tests, 48 pass, 4 fail. Repeated once with a file reporter because initial failure output was truncated. The four failures assert implementation text in storefront files that now delegate to shared modules. Ran nine selected security source-contract checks: 9 pass. Total final selected checks: 61, 57 pass, 4 fail.

Logs: output/ai-admin-tests.log and output/ai-admin-security-tests.log. Neither run starts the app or workers, loads dotenv, connects a database, or calls a configured provider. Live Gemini health, browser flows, production indexes and database failure recovery remain unverified.

Report writing and evidence review are now in progress.
