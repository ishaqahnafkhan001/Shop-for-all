from pathlib import Path
import json,re
ROOT=Path(r'C:\Users\user\WebstormProjects\Shop-for-all')
entries='''APP|ecommerce-backend/backend/app.js|99|174|middleware and route registration
AUTH|ecommerce-backend/backend/middlewares/auth.js|20|140|attachUserFromToken
PERM|ecommerce-backend/backend/middlewares/permission.js|4|58|requirePermission
GATE|ecommerce-backend/backend/middlewares/featureGate.js|27|72|requireShopFeature
API|ecommerce-admin/src/api/api.js|9|77|API and CSRF interceptors
ID|ecommerce-admin/src/utils/aiRequestId.js|1|9|createAiRequestId / aiRequestHeaders
AR|ecommerce-admin/src/App.jsx|168|181|Admin route elements
PR|ecommerce-backend/backend/routes/adminRoutes.js|832|854|product AI routes
UPLOAD|ecommerce-backend/backend/routes/adminRoutes.js|300|337|productAiImageUpload / productAiLimiter
PC|ecommerce-backend/backend/controllers/productController.js|248|361|generateProductContent
LEG|ecommerce-backend/backend/controllers/productController.js|180|238|generateDescription
PUI|ecommerce-admin/src/components/products/ProductAiAssistant.jsx|330|465|generate / applySections
PB|ecommerce-admin/src/components/products/ProductAiAssistant.jsx|475|513|generation buttons
ADD|ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx|459|522|submit payload and assistant mount
EDIT|ecommerce-admin/src/pages/dashboard/products/EditProduct.jsx|637|735|save / assistant mount
PCTX|ecommerce-backend/backend/services/products/productContentAiService.js|141|209|normalizeRequestedSections / buildContext
POUT|ecommerce-backend/backend/services/products/productContentAiService.js|259|367|normalization / cleanProductContentSuggestion
PFALL|ecommerce-backend/backend/services/products/productContentAiService.js|400|523|buildFallbackSuggestion
PPROMPT|ecommerce-backend/backend/services/products/productContentAiService.js|525|578|buildPrompt
PIMAGE|ecommerce-backend/backend/services/products/productContentAiService.js|580|683|fileToGeminiPart / fetchImageUrlPart / buildImagePart
PCALL|ecommerce-backend/backend/services/products/productContentAiService.js|685|756|getGeminiTimeoutMs / callGemini
PGEN|ecommerce-backend/backend/services/products/productContentAiService.js|759|883|quality predicate / generation / meta
CR|ecommerce-backend/backend/routes/collectionRoutes.js|19|46|collection guards and route
CC|ecommerce-backend/backend/controllers/collectionController.js|186|278|suggestCollectionAi
CS|ecommerce-backend/backend/services/collections/collectionAiService.js|16|141|schema / normalization / fallback / parsing
CP|ecommerce-backend/backend/services/collections/collectionAiService.js|142|269|prompt / provider / generation
CUI|ecommerce-admin/src/pages/dashboard/CatalogTools.jsx|440|494|generateCollectionAi / applyCollectionAi
CSAVE|ecommerce-admin/src/pages/dashboard/CatalogTools.jsx|264|289|saveCollection
CVIEW|ecommerce-admin/src/pages/dashboard/CatalogTools.jsx|605|645|suggestion display
CM|ecommerce-backend/backend/models/Collection.js|4|54|collectionSchema
CPERSIST|ecommerce-backend/backend/controllers/collectionController.js|387|482|createCollection / updateCollection
SR|ecommerce-backend/backend/routes/storeBuilderRoutes.js|121|130|SEO AI route
SRL|ecommerce-backend/backend/routes/storeBuilderRoutes.js|48|57|storeBuilderAiLimiter
SC|ecommerce-backend/backend/controllers/storeBuilderController.js|269|376|suggestStoreSeo
SS|ecommerce-backend/backend/services/storeSeoAiService.js|66|174|normalizeAlternative / buildSafeContext
SP|ecommerce-backend/backend/services/storeSeoAiService.js|176|222|buildPrompt / callGemini
SGEN|ecommerce-backend/backend/services/storeSeoAiService.js|224|290|generateStoreSeoSuggestion
SUI|ecommerce-admin/src/pages/dashboard/Seo/hooks/useHomepageSeo.js|277|313|requestAiSuggestions / applyAiSuggestion
SAUTO|ecommerce-admin/src/pages/dashboard/Seo/hooks/useHomepageSeo.js|147|180|saveDraft / autosave effect
SPUB|ecommerce-admin/src/pages/dashboard/Seo/hooks/useHomepageSeo.js|194|257|publish
SPANEL|ecommerce-admin/src/pages/dashboard/Seo/SeoAiPanel.jsx|1|44|SeoAiPanel
SPERSIST|ecommerce-backend/backend/services/storeBuilder/storeBuilderSeoService.js|138|190|saveStoreBuilderSeoDraft
SPUBLISH|ecommerce-backend/backend/services/storeBuilder/storeBuilderSeoService.js|231|257|publishStoreBuilderSeo
SNORM|packages/storefront-theme/index.cjs|373|390|SEO suggestion normalization
SSOURCE|packages/storefront-theme/homepage-seo.cjs|201|216|findAcceptedAiSource / resolveTextField
GR|ecommerce-backend/backend/routes/growthRoutes.js|19|41|growth guards / route
GC|ecommerce-backend/backend/controllers/growthController.js|666|749|generateAdCopy
GDATA|ecommerce-backend/backend/controllers/growthController.js|24|138|getRangeStart / cities / search terms
GRULE|ecommerce-backend/backend/controllers/growthController.js|141|210|classifyProduct
GCTX|ecommerce-backend/backend/services/adInsightAIService.js|432|478|sanitizeProductContext / metrics / shop
GOUT|ecommerce-backend/backend/services/adInsightAIService.js|584|637|cleanAdInsightResponse
GP|ecommerce-backend/backend/services/adInsightAIService.js|665|740|buildGeminiPrompt / callGemini
GGEN|ecommerce-backend/backend/services/adInsightAIService.js|742|812|generateAdInsight
GUI|ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx|227|274|detail / generation / copy
GVIEW|ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx|464|497|generation / fallback display
POL|ecommerce-backend/backend/services/ai/aiGenerationPolicyService.js|13|151|begin / complete / fail / replay
USAGE|ecommerce-backend/backend/services/billing/planUsageService.js|1|94|weekly quota reservation / settlement
LEDGER|ecommerce-backend/backend/models/AiGenerationRequest.js|3|54|request schema and indexes
UM|ecommerce-backend/backend/models/PlanUsage.js|3|27|usage schema and unique index
PM|ecommerce-backend/backend/models/Product.js|93|153|product content schema
PSAVE|ecommerce-backend/backend/controllers/productController.js|870|887|update allowlist
SHOP|ecommerce-backend/backend/models/Shop.js|593|604|theme.seo schema
PUBLIC|ecommerce-backend/backend/services/products/publicProductQueryService.js|1|11|buildPublicProductQuery
EXTRAS|packages/storefront-renderer/presentation/ProductExtras.jsx|10|30|normalizeSellingPoints
INFO|packages/storefront-renderer/presentation/ProductInfo.jsx|85|100|description text rendering
PLAN|ecommerce-backend/backend/config/subscriptionPlans.js|48|205|default plan limits and features
PLANACCESS|ecommerce-backend/backend/services/billing/planAccessService.js|80|111|effective plan context
FEATURES|ecommerce-backend/backend/config/subscriptionFeatures.js|105|117|AI feature definitions
EVENT|ecommerce-backend/backend/services/events/domainEventBus.js|29|51|publish
WORKER|ecommerce-backend/backend/workers/index.js|71|83|handlers
BADGE|ecommerce-backend/backend/services/badges/badgeAnalysisService.js|12|50|negative keywords / scoreSnapshot
TP|ecommerce-backend/backend/tests/product-content-ai.test.js|1|301|product helpers and contracts
TG|ecommerce-backend/backend/tests/ad-insight-ai.test.js|1|170|ad helper tests
TS|ecommerce-backend/backend/tests/seo-ai-production-hardening.test.js|23|50|prompt identities and schema indexes
TSEC|ecommerce-backend/backend/tests/security-hardening.test.js|285|304|collection source contract
TSEO|ecommerce-backend/backend/tests/seo-rendering.test.js|51|80|SEO source assertions
THERO|ecommerce-backend/backend/tests/seo-rendering.test.js|651|660|hero source assertion
TLINK|ecommerce-backend/backend/tests/seo-rendering.test.js|884|903|related product source assertion
ENVEX|ecommerce-backend/backend/.env.example|1|48|backend configuration template
CONFIG|ecommerce-backend/backend/controllers/superAdminOperationsController.js|686|698|configuration flags
BPKG|ecommerce-backend/backend/package.json|20|70|backend scripts and dependencies
APKG|ecommerce-admin/package.json|6|42|Admin scripts and dependencies
NPKG|ecommerce-storefront/package.json|5|33|storefront scripts and dependencies'''
E={}
for row in entries.splitlines():
    key,p,a,b,symbol=row.split('|'); a=int(a); b=int(b)
    lines=(ROOT/p).read_text(encoding='utf-8-sig').splitlines()
    b=min(b,len(lines))
    if a<1 or a>b: raise ValueError(f'{key} range')
    E[key]=(p,a,b,symbol)
(ROOT/'output/ai-audit-evidence.json').write_text(json.dumps(E,indent=2),encoding='utf-8')

