# Admin AI feature inventory — 2026-10-10

This inventory separates implementation classification from runtime evidence. Five entries comprise four Admin workflows and one duplicate compatibility API. **Partially verified** applies to all five full workflows: source traces exist, but no live provider/browser/database generation was run. Helper/source tests do not establish deployment health.

## Master inventory

| ID / feature | Admin location, trigger, purpose | Frontend entry | Endpoint (POST) | Backend controller → service | Provider / model | Output | Persistence | Classification / evidence |
|---|---|---|---|---|---|---|---|---|
| AI-001 Product content helper | products/add and products/edit/:id; Generate all or section buttons; draft marketing/product text | ProductAiAssistant, mounted in AddProduct/EditProduct | /api/admin/products/ai/content-suggest | productController.generateProductContent → products/productContentAiService.generateProductContentSuggestion | Google Gemini SDK; GEMINI_MODEL or gemini-2.5-flash | SEO title/description, description, sellingPoints, specifications, extraNotes, imageAlt, imageAnalysis/confidenceNotes | Request result/usage automatically; explicit Apply + product save persists Product fields | Implemented with important gaps; partial runtime verification [AR] [PUI] [ADD] [EDIT] [PR] [PC] [PGEN] [PM] |
| AI-002 Collection suggestions | catalog-tools collection form; Generate with AI; prepare grouping copy | CatalogTools.generateCollectionAi/applyCollectionAi | /api/admin/collections/ai/suggest | collectionController.suggestCollectionAi → collections/collectionAiService.generateCollectionSuggestion | Same provider/model selection | name, description, SEO, slug, keywords, suggestedRules | Request result/usage automatically; Apply + save persists Collection title/description/slug/SEO; keywords/rules not persisted | Implemented with important gaps; partial runtime verification [AR] [CUI] [CR] [CC] [CP] [CM] [CSAVE] |
| AI-003 Homepage SEO assistant | seo → AI assistant tab; Generate 3 alternatives; draft homepage search copy | SeoAiPanel + useHomepageSeo.requestAiSuggestions/applyAiSuggestion | /api/store-builder/admin/seo/ai-suggest | storeBuilderController.suggestStoreSeo → storeSeoAiService.generateStoreSeoSuggestion | Same provider/model selection | 3 alternatives, title/description/topics, explanations/length status, recommendations, snapshot/hash, meta | Ledger/usage automatically; Apply triggers normal draft autosave, explicit publish updates Shop.theme.seo and revision history | Implemented with important gaps; partial runtime verification [AR] [SPANEL] [SUI] [SR] [SC] [SGEN] [SPERSIST] [SPUBLISH] |
| AI-004 Growth ad planning | growth product detail; generate/copy ad text; planning suggestions | GrowthCenter.generateAdCopy/copyAdText | /api/admin/growth/generate-ad-copy | growthController.generateAdCopy → adInsightAIService.generateAdInsight | Same provider/model selection | primaryText/headline/description/CTA, customer/age/interests/location, angle/reason/improvements, computed evidence/confidence/limits | UI state/clipboard plus ledger/usage; no campaign creation or ad publishing | Implemented with important gaps; partial runtime verification [AR] [GUI] [GR] [GC] [GOUT] [GGEN] |
| AI-005 Deprecated product description | No discovered Admin caller; compatibility endpoint generates description | None found | /api/admin/generate-description | productController.generateDescription → same product service, requestedSections=[description] | Same provider/model selection | description/fallback/meta/usage; deprecation headers | Ledger/usage only; external caller must save Product separately | Duplicate compatibility code, unused by inspected Admin; full runtime unverified [PR] [LEG] [PGEN] |

Inspected local backend .env specifies **gemini-3.5-flash-lite**, with a nonempty backend key setting; credentials are redacted. [MODEL] All four services can use that env model. Whether the running deployment uses it or the provider supports/accesses it remains unverified. Configured flags report presence only. [PCALL] [CP] [SP] [GP] [CONFIG]

## Inputs, roles and defaults

| Entry | Inputs and context | Required / default behavior | Access |
|---|---|---|---|
| AI-001 | Unsaved title/category/tags/public price/variants/current description/SEO/features/specifications/comments; optional cover File/URL | Server trimmed title required; absent/invalid section list becomes all sections; language auto; invalid remote image becomes text-only | VendorAdmin or VendorStaff + products + aiProductCreation, suspension checks [PR] [PCTX] [PUI] [PIMAGE] |
| AI-002 | Collection title/description/SEO and selected IDs; tenant product title/category/tags; shop identity/type; optional API language/targetCustomer | UI requires title or selected products; server lacks equivalent minimum; ID context capped at 30 queried products; language auto | Vendor roles + catalogTools + collectionsAi + bulkProductTools + aiProductCreation [CR] [CC] [CUI] |
| AI-003 | Unsaved SEO overlay and saved hero/navigation; tenant public products/active collection names; official store identity | en-BD, british spelling, clear ecommerce tone; up to 20 products and 10 collections | Vendor roles + storeBuilder permission + storeBuilder/homepageSeo features [SR] [SC] [SS] |
| AI-004 | Tenant product and shop; calculated activity metrics/city/search aggregates; language/campaign type | Valid product ObjectId; API range defaults 30 days; UI sends general campaign; cohorts default/minimum 3 | Vendor roles + growthCenter permission/feature + aiAdGenerator [GR] [GC] [GDATA] [GUI] |
| AI-005 | title/category only | Truthy title required; description section only | Same product route guard chain [PR] [LEG] |

## Negative results and excluded lookalikes

The searched implementation contains no additional chatbot, local model server, embedding/vector integration, alternate provider, image generation service or AI queue handler. These are bounded search conclusions, not a guarantee about private repositories or unavailable deployment code.

| Candidate | Actual observed behavior | Inventory treatment |
|---|---|---|
| Product image analysis | Optional Gemini inline image in product text generation | Included in AI-001 [PIMAGE] [PGEN] |
| Growth recommendations | classifyProduct threshold/rate rules | Excluded as deterministic analytics [GRULE] |
| Badge analysis jobs | Eligibility scoring and negative-review keywords | Excluded as rules [BADGE] [WORKER] |
| AI request ledger / weekly quota | Infrastructure shared by all entries | Not double-counted as a user feature [POL] [USAGE] |
| Frontend Google SDK dependency | Manifest dependency; no source import/use found | Unused dependency finding, not an AI feature [APKG] |

## Count definitions

Exclusive implementation counts: 4 implemented with important gaps; 1 duplicate compatibility API; 0 UI-only/mocked; 0 confirmed disconnected; 0 certified fully functional. The legacy entry has no discovered UI caller, but remains a registered API, so it is not proven dead for external clients.

Runtime evidence: all 5 full workflows remain partially verified; live provider/deployment stages are unverified. No counts here claim live success.

Details: [product](AI_ADMIN_PANEL_AUDIT.md#ai-001--product-content-helper), [collection](AI_ADMIN_PANEL_AUDIT.md#ai-002--collection-suggestions), [SEO](AI_ADMIN_PANEL_AUDIT.md#ai-003--homepage-seo-assistant), [Growth](AI_ADMIN_PANEL_AUDIT.md#ai-004--growth-center-ad-planning), [legacy](AI_ADMIN_PANEL_AUDIT.md#ai-005--deprecated-product-description-api).

## Source evidence index

References resolve to inspected current source. The range is displayed here; each link opens its first line. Verified on 2026-10-10.

[ADD]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx:459> "ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx:459-522 — submit payload and assistant mount"
[APKG]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/package.json:6> "ecommerce-admin/package.json:6-37 — Admin scripts and dependencies"
[AR]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/App.jsx:168> "ecommerce-admin/src/App.jsx:168-181 — Admin route elements"
[BADGE]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/badges/badgeAnalysisService.js:12> "ecommerce-backend/backend/services/badges/badgeAnalysisService.js:12-50 — negative keywords / scoreSnapshot"
[CC]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/collectionController.js:186> "ecommerce-backend/backend/controllers/collectionController.js:186-278 — suggestCollectionAi"
[CM]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/Collection.js:4> "ecommerce-backend/backend/models/Collection.js:4-54 — collectionSchema"
[CONFIG]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/superAdminOperationsController.js:686> "ecommerce-backend/backend/controllers/superAdminOperationsController.js:686-698 — configuration flags"
[CP]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/collections/collectionAiService.js:142> "ecommerce-backend/backend/services/collections/collectionAiService.js:142-269 — prompt / provider / generation"
[CR]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/routes/collectionRoutes.js:19> "ecommerce-backend/backend/routes/collectionRoutes.js:19-46 — collection guards and route"
[CSAVE]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:264> "ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:264-289 — saveCollection"
[CUI]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:440> "ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:440-494 — generateCollectionAi / applyCollectionAi"
[EDIT]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/products/EditProduct.jsx:637> "ecommerce-admin/src/pages/dashboard/products/EditProduct.jsx:637-735 — save / assistant mount"
[GC]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/growthController.js:666> "ecommerce-backend/backend/controllers/growthController.js:666-743 — generateAdCopy"
[GDATA]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/growthController.js:24> "ecommerce-backend/backend/controllers/growthController.js:24-138 — getRangeStart / cities / search terms"
[GGEN]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/adInsightAIService.js:742> "ecommerce-backend/backend/services/adInsightAIService.js:742-812 — generateAdInsight"
[GOUT]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/adInsightAIService.js:584> "ecommerce-backend/backend/services/adInsightAIService.js:584-637 — cleanAdInsightResponse"
[GP]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/adInsightAIService.js:665> "ecommerce-backend/backend/services/adInsightAIService.js:665-740 — buildGeminiPrompt / callGemini"
[GR]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/routes/growthRoutes.js:19> "ecommerce-backend/backend/routes/growthRoutes.js:19-41 — growth guards / route"
[GRULE]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/growthController.js:141> "ecommerce-backend/backend/controllers/growthController.js:141-210 — classifyProduct"
[GUI]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx:227> "ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx:227-274 — detail / generation / copy"
[LEG]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/productController.js:180> "ecommerce-backend/backend/controllers/productController.js:180-238 — generateDescription"
[MODEL]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/.env:7> "ecommerce-backend/backend/.env:7-7 — GEMINI_MODEL; only non-secret model value reported"
[PC]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/productController.js:248> "ecommerce-backend/backend/controllers/productController.js:248-361 — generateProductContent"
[PCALL]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/products/productContentAiService.js:685> "ecommerce-backend/backend/services/products/productContentAiService.js:685-756 — getGeminiTimeoutMs / callGemini"
[PCTX]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/products/productContentAiService.js:141> "ecommerce-backend/backend/services/products/productContentAiService.js:141-209 — normalizeRequestedSections / buildContext"
[PGEN]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/products/productContentAiService.js:759> "ecommerce-backend/backend/services/products/productContentAiService.js:759-883 — quality predicate / generation / meta"
[PIMAGE]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/products/productContentAiService.js:580> "ecommerce-backend/backend/services/products/productContentAiService.js:580-683 — fileToGeminiPart / fetchImageUrlPart / buildImagePart"
[PM]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/models/Product.js:93> "ecommerce-backend/backend/models/Product.js:93-153 — product content schema"
[POL]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/ai/aiGenerationPolicyService.js:13> "ecommerce-backend/backend/services/ai/aiGenerationPolicyService.js:13-151 — begin / complete / fail / replay"
[PR]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/routes/adminRoutes.js:832> "ecommerce-backend/backend/routes/adminRoutes.js:832-854 — product AI routes"
[PUI]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/components/products/ProductAiAssistant.jsx:330> "ecommerce-admin/src/components/products/ProductAiAssistant.jsx:330-465 — generate / applySections"
[SC]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/controllers/storeBuilderController.js:269> "ecommerce-backend/backend/controllers/storeBuilderController.js:269-376 — suggestStoreSeo"
[SGEN]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeSeoAiService.js:224> "ecommerce-backend/backend/services/storeSeoAiService.js:224-290 — generateStoreSeoSuggestion"
[SP]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeSeoAiService.js:176> "ecommerce-backend/backend/services/storeSeoAiService.js:176-222 — buildPrompt / callGemini"
[SPANEL]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/Seo/SeoAiPanel.jsx:1> "ecommerce-admin/src/pages/dashboard/Seo/SeoAiPanel.jsx:1-43 — SeoAiPanel"
[SPERSIST]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/storeBuilderSeoService.js:138> "ecommerce-backend/backend/services/storeBuilder/storeBuilderSeoService.js:138-190 — saveStoreBuilderSeoDraft"
[SPUBLISH]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeBuilder/storeBuilderSeoService.js:231> "ecommerce-backend/backend/services/storeBuilder/storeBuilderSeoService.js:231-257 — publishStoreBuilderSeo"
[SR]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/routes/storeBuilderRoutes.js:121> "ecommerce-backend/backend/routes/storeBuilderRoutes.js:121-130 — SEO AI route"
[SS]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/storeSeoAiService.js:66> "ecommerce-backend/backend/services/storeSeoAiService.js:66-174 — normalizeAlternative / buildSafeContext"
[SUI]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/Seo/hooks/useHomepageSeo.js:277> "ecommerce-admin/src/pages/dashboard/Seo/hooks/useHomepageSeo.js:277-313 — requestAiSuggestions / applyAiSuggestion"
[USAGE]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/services/billing/planUsageService.js:1> "ecommerce-backend/backend/services/billing/planUsageService.js:1-94 — weekly quota reservation / settlement"
[WORKER]: <C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-backend/backend/workers/index.js:71> "ecommerce-backend/backend/workers/index.js:71-83 — handlers"

- **ADD**: [ecommerce-admin/src/pages/dashboard/products/AddProduct.jsx:459-522 — submit payload and assistant mount][ADD]
- **APKG**: [ecommerce-admin/package.json:6-37 — Admin scripts and dependencies][APKG]
- **AR**: [ecommerce-admin/src/App.jsx:168-181 — Admin route elements][AR]
- **BADGE**: [ecommerce-backend/backend/services/badges/badgeAnalysisService.js:12-50 — negative keywords / scoreSnapshot][BADGE]
- **CC**: [ecommerce-backend/backend/controllers/collectionController.js:186-278 — suggestCollectionAi][CC]
- **CM**: [ecommerce-backend/backend/models/Collection.js:4-54 — collectionSchema][CM]
- **CONFIG**: [ecommerce-backend/backend/controllers/superAdminOperationsController.js:686-698 — configuration flags][CONFIG]
- **CP**: [ecommerce-backend/backend/services/collections/collectionAiService.js:142-269 — prompt / provider / generation][CP]
- **CR**: [ecommerce-backend/backend/routes/collectionRoutes.js:19-46 — collection guards and route][CR]
- **CSAVE**: [ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:264-289 — saveCollection][CSAVE]
- **CUI**: [ecommerce-admin/src/pages/dashboard/CatalogTools.jsx:440-494 — generateCollectionAi / applyCollectionAi][CUI]
- **EDIT**: [ecommerce-admin/src/pages/dashboard/products/EditProduct.jsx:637-735 — save / assistant mount][EDIT]
- **GC**: [ecommerce-backend/backend/controllers/growthController.js:666-743 — generateAdCopy][GC]
- **GDATA**: [ecommerce-backend/backend/controllers/growthController.js:24-138 — getRangeStart / cities / search terms][GDATA]
- **GGEN**: [ecommerce-backend/backend/services/adInsightAIService.js:742-812 — generateAdInsight][GGEN]
- **GOUT**: [ecommerce-backend/backend/services/adInsightAIService.js:584-637 — cleanAdInsightResponse][GOUT]
- **GP**: [ecommerce-backend/backend/services/adInsightAIService.js:665-740 — buildGeminiPrompt / callGemini][GP]
- **GR**: [ecommerce-backend/backend/routes/growthRoutes.js:19-41 — growth guards / route][GR]
- **GRULE**: [ecommerce-backend/backend/controllers/growthController.js:141-210 — classifyProduct][GRULE]
- **GUI**: [ecommerce-admin/src/pages/dashboard/GrowthCenter.jsx:227-274 — detail / generation / copy][GUI]
- **LEG**: [ecommerce-backend/backend/controllers/productController.js:180-238 — generateDescription][LEG]
- **MODEL**: [ecommerce-backend/backend/.env:7-7 — GEMINI_MODEL; only non-secret model value reported][MODEL]
- **PC**: [ecommerce-backend/backend/controllers/productController.js:248-361 — generateProductContent][PC]
- **PCALL**: [ecommerce-backend/backend/services/products/productContentAiService.js:685-756 — getGeminiTimeoutMs / callGemini][PCALL]
- **PCTX**: [ecommerce-backend/backend/services/products/productContentAiService.js:141-209 — normalizeRequestedSections / buildContext][PCTX]
- **PGEN**: [ecommerce-backend/backend/services/products/productContentAiService.js:759-883 — quality predicate / generation / meta][PGEN]
- **PIMAGE**: [ecommerce-backend/backend/services/products/productContentAiService.js:580-683 — fileToGeminiPart / fetchImageUrlPart / buildImagePart][PIMAGE]
- **PM**: [ecommerce-backend/backend/models/Product.js:93-153 — product content schema][PM]
- **POL**: [ecommerce-backend/backend/services/ai/aiGenerationPolicyService.js:13-151 — begin / complete / fail / replay][POL]
- **PR**: [ecommerce-backend/backend/routes/adminRoutes.js:832-854 — product AI routes][PR]
- **PUI**: [ecommerce-admin/src/components/products/ProductAiAssistant.jsx:330-465 — generate / applySections][PUI]
- **SC**: [ecommerce-backend/backend/controllers/storeBuilderController.js:269-376 — suggestStoreSeo][SC]
- **SGEN**: [ecommerce-backend/backend/services/storeSeoAiService.js:224-290 — generateStoreSeoSuggestion][SGEN]
- **SP**: [ecommerce-backend/backend/services/storeSeoAiService.js:176-222 — buildPrompt / callGemini][SP]
- **SPANEL**: [ecommerce-admin/src/pages/dashboard/Seo/SeoAiPanel.jsx:1-43 — SeoAiPanel][SPANEL]
- **SPERSIST**: [ecommerce-backend/backend/services/storeBuilder/storeBuilderSeoService.js:138-190 — saveStoreBuilderSeoDraft][SPERSIST]
- **SPUBLISH**: [ecommerce-backend/backend/services/storeBuilder/storeBuilderSeoService.js:231-257 — publishStoreBuilderSeo][SPUBLISH]
- **SR**: [ecommerce-backend/backend/routes/storeBuilderRoutes.js:121-130 — SEO AI route][SR]
- **SS**: [ecommerce-backend/backend/services/storeSeoAiService.js:66-174 — normalizeAlternative / buildSafeContext][SS]
- **SUI**: [ecommerce-admin/src/pages/dashboard/Seo/hooks/useHomepageSeo.js:277-313 — requestAiSuggestions / applyAiSuggestion][SUI]
- **USAGE**: [ecommerce-backend/backend/services/billing/planUsageService.js:1-94 — weekly quota reservation / settlement][USAGE]
- **WORKER**: [ecommerce-backend/backend/workers/index.js:71-83 — handlers][WORKER]
