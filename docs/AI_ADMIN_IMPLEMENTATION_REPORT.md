# AI Admin implementation — Phases 1–5

Date: 2026-10-12. Status: implementation and local AI verification completed; release gates remain open.

Reference: `docs/AI_ADMIN_PLATFORM_SECOND_STAGE_REVIEW.md`, the five original audits, and the user's implementation attachment. The separately named `(2)` review copy was not available. This is an implementation record, not a new architecture proposal. Existing unrelated theme, catalog and dashboard work is preserved. No deployment, customer database migration, environment-secret change or paid provider request was performed.

## Implemented

| Recommendation | Implementation |
| --- | --- |
| R01 | Request-owned quota receipts in the existing Mongo usage/ledger architecture; immutable quota week, fence/deadline, durable outcomes, idempotent settlement, acknowledgement, delayed pruning, terminal-only TTL and stale recovery. |
| R02 | One narrow OpenAI Responses adapter; actual SDK AbortSignal, total deadline, remaining-budget checks, bounded Product quality repair, safe errors and separate attempt metadata. Provider migration verified on 2026-10-12; see the follow-up section below. |
| R03 | Feature-specific acceptance before synthesis. Empty/invalid results cannot become chargeable successful Product output. SEO per-field origins survive Apply, normalization, revisions, publish and the shared resolver; edits invalidate attribution. |
| R04 | Bounded structured public context; private notes excluded, public note semantics explicit. Growth emits approved topics and canonical regions with aggregate thresholds, excluding raw search/customer-like strings. |
| R05 | Exact HTTPS image hosts plus tenant ownership, redirect/credential/port rejection, streamed byte limits, signature/type checks, bounded Sharp decode/re-encode, pixel/resource limits and safe text-only fallback. |
| R06 | Canonical operation input and separate resolved-context hashes; Unicode normalization, image digest, entity/version, preferences and frozen Growth interval. Same-ID retry/replay and incompatible-input conflict. |
| R07 | Shared editor operation lifecycle, local cancellation, late-response rejection, explicit comparison/Apply and field-scoped Undo. Accepted provider, fallback, mixed, manual and unknown legacy origins remain distinct. |
| R08 | Growth range and exact from/to interval shared by metrics and generated advice; truthful activity sufficiency; shared used/pending/available/limit/unlimited/reset usage. Collection product references must belong to the authenticated tenant. |
| R09 | Provider, configuration, privacy, image, acceptance, provenance, frontend state, HTTP and real Mongo fault/tenant tests. Obsolete AI source-label assertions replaced with behavior/registered-handler checks. Partial browser evidence exists; remaining browser gates are explicitly open. |
| R10 | Attempt IDs/epochs, model/modality/timing/status, nullable token usage; no inferred provider cost. Restricted health distinguishes configuration/cutover, recent responses, accepted generation, failures, stale operations and telemetry failure. |
| R11 | Contextual permission/plan/pending/exhaustion/service feedback. Additional billing/verification guards; merchant errors do not instruct users to edit environment variables. Unused Admin provider SDK removed; backend SDK and legacy route retained. |
| R12 | Existing Product SEO/readiness checks feed one deterministic improvement list. Select issues, generate selected sections/individual SEO fields, compare/edit, Apply and Undo. Price, stock, publication status and transactional settings are outside the apply allowlist. |
| R13 | Small private, versioned, tenant-owned brand-voice preferences in Store Branding; all four generators use the same effective snapshot. English, Bangla, Banglish and mixed text preserved; no old content/slug rewrite. |
| R14 | Opt-in saved Product scalar suggestions, compare against current saved entity version, reapply to form, Undo, enum feedback and delete. A saved event is confirmed only after the normal Product save commits. Separate bounded history; no prompt/image archive. |
| R15 | Editable Growth campaign drafts: save/reload, optimistic version checks, duplicate, archive/delete, copy, explicit selected-field regeneration and Apply/Undo. Historical evidence and per-field origins retained; stale evidence/current Product facts shown. |

## Important architectural changes

- Retains the feature-oriented monolith, existing authentication/RBAC/plan gates, Mongo accounting and worker. Redis is not an authority for AI quota ownership.
- The transport handles provider concerns; feature services own prompts, safe context, schema, acceptance, grounding and fallback. No generic agent framework or second backend.
- Merchant history is separate from the short-lived operational ledger. Product history stores only description, SEO title/description and image ALT. Campaign drafts are separate planning content.
- Generation updates no Product, Collection, published SEO or commerce fields by itself. Domain Save/Publish remains authoritative; campaign drafts cannot publish ads or spend money.

## Files/modules changed

- Backend foundation: `config/ai.js`, `models/PlanUsage.js`, `models/AiGenerationRequest.js`, `services/billing/planUsageService.js`, `services/ai/aiGenerationPolicyService.js`, `aiAccountingRecoveryService.js`, `openaiProviderAdapter.js`, `aiOperationIdentity.js`, `aiHttpErrors.js`, `workers/index.js`.
- Feature boundaries: Product image/content services, Collection AI/controller, Growth context/controller/service, SEO AI/controller and Store Builder SEO persistence; shared `packages/storefront-theme/homepage-seo.cjs` exports/defaults.
- Merchant persistence: `AiContentHistory`, `AiCampaignDraft`, private `Shop.aiPreferences`; `aiContentStorage`, `aiContentHistoryService`, `aiCampaignDraftService`, `aiEntityService`, `aiPreferencesService`, `aiHealthService`; protected controllers/routes.
- Admin: shared operation/Undo/access/source helpers, existing Product/Collection/SEO/Growth editors, Product suggestion editor/history, campaign draft editor, Store Branding preferences. Normal Add/Edit Product save integration preserved.
- Operations/tests: two additive migration scripts, cutover runbook, focused behavioral suites, HTTP/accounting integration suites, synthetic UI fixture and progress record.
- Dependencies: backend `sharp@0.35.5` provides bounded image decoding and metadata-stripping re-encoding. Backend `openai@7.32.0` replaces `@google/generative-ai`. Removed unused Admin provider SDK; no frontend provider dependency or key.

## Database/schema changes

Additive only: request receipts and recovery/identity/attempt fields, optional private preferences, two new bounded merchant-content collections and indexes. Tenant/slot uniqueness enforces each 50-item cap under concurrent standalone Mongo writes. History uniqueness prevents repeated saves of one operation; TTL plus read-time expiry provides retention. Preferences and campaign edits use version checks.

Accounting rollout requires quiescing every old writer. `AI_ACCOUNTING_VERSION` defaults to `0`, so new admissions fail closed until the reviewed version-2 cutover. Source implementation does not establish that a running deployment has been configured. Follow `docs/operations/ai-accounting-cutover.md`; the migration scripts require an explicitly supplied target and default to dry run. No production migration was run.

## Compatibility preserved

Existing API routes, feature/plan names, shared weekly allowance, normal domain saves, SEO draft/revision/publish flow and legacy description generation remain. Usage compatibility aliases remain. `suggestedRules` remains an empty deprecated response alias; no dynamic rule engine added. Existing stored content, slugs and unproven legacy origins are not rewritten. New individual SEO fields are additive; legacy `seo` requests still generate both fields.

## Tests executed

Commands below describe the five-phase baseline before the OpenAI migration. Logs are under `output/`. Updated provider-migration results are in the follow-up section below.

### Focused backend — 50/50 passed

Working directory: `ecommerce-backend/backend`.

```powershell
node --test tests/ai-accounting.test.js tests/ai-provider-adapter.test.js tests/ai-acceptance-provenance.test.js tests/ai-images.test.js tests/ai-growth-context.test.js tests/ai-preferences.test.js tests/product-content-ai.test.js tests/ad-insight-ai.test.js tests/seo-ai-production-hardening.test.js
```

Log: `output/ai-final-focused.log`.

### Mongo/HTTP — 17/17 on each topology

Working directory: repository root.

```powershell
node output/run-ai-accounting-tests.cjs
```

Disposable loopback MongoDB 7.0.14 standalone and single-node replica set; all provider responses mocked. The test-only portable runtime lives under `output/ai-test-runtime` because Docker's daemon was unavailable. The launcher runs `node --test --test-concurrency=1 tests/integration/ai-accounting.integration.test.js tests/integration/ai-http.integration.test.js` for each topology. Log: `output/ai-final-topology.log`. Mongo teardown can emit ECONNRESET after successful tests; this is recorded separately from the passing tests. An existing duplicate AnalyticsEvent index warning is also present.

### Admin behavior — 6/6 passed

Working directory: `ecommerce-admin`.

```powershell
node --test tests/ai-operation.test.mjs tests/ai-merchant-workflows.test.mjs
```

Log: `output/ai-final-admin-tests.log`.

### Build and focused lint — passed

Working directory: `ecommerce-admin`.

```powershell
npm run build
npx eslint src/hooks/useAiOperation.js src/hooks/useAiUndo.js src/components/ai src/components/products/ProductAiAssistant.jsx src/components/products/ProductSuggestionEditor.jsx src/utils/aiAccess.js src/utils/aiOperationState.js src/utils/applyProductContentSuggestion.js src/utils/applyCampaignSuggestion.js src/utils/aiSourceLabel.js
```

Logs: `output/ai-final-admin-build.log`, `output/ai-final-lint.log`. This is focused lint, not a claim that the entire repository's lint gate passes. Root `git diff --check` passed; Git emits line-ending warnings in existing Windows working files.

### Broader backend regression — 457 passed, 5 failed (462 total)

Working directory: `ecommerce-backend/backend`; command: `npm test`. Log: `output/ai-final-backend-tests.log`.

Remaining failures are source-text assertions for existing UI changes outside the final AI repairs. They are not suppressed or marked skipped:

1. `catalog-category-collection-management.test.js`: expects “Choose product photo”; current dialog says “Choose a product photo”.
2. `security-hardening.test.js`, stock mutation case: expects “Stock changes are handled from Inventory”; current copy says stock quantity is managed from Inventory.
3. `seo-rendering.test.js`, Store Builder UX case: expects “Brand and design”; current heading uses “Brand & design”.
4. `store-builder-navigation-seo.test.js`, dashboard navigation: expects the old `visibleExpandedGroups` local symbol.
5. Same file, Builder shell: expects “Brand and design”.

These must be reconciled with their UI changes before claiming a green repository-wide release gate. The three failures caused by AI route/access changes were repaired with registered-handler/access behavior checks; guards were not weakened. The prior replica-set Product save test used PUT against a PATCH route; corrected and passed through the actual Product transaction.

## Security/reliability verification

- Concurrent A/B quota ownership; repeated settlement and recovery; all major write-boundary faults; original-week settlement; expired fencing and terminal-only TTL. Unlimited plans still obey concurrency limits.
- Tenant A cannot replay/reference Tenant B's operations, products, collections, assets, history or drafts. Staff permission changes are rechecked on history/draft actions. Auth, CSRF, revoked sessions, suspended billing, pending/exhausted allowance and disabled plans reject before provider work.
- Real HTTP SEO generation/Apply/draft reload/publish/revision/shared-resolution flow. Product history does not report saved before the normal Product transaction; commerce fields cannot be restored through history.
- Concurrent 56 draft creates admit exactly 50; the other six reject without leaking to another tenant. Index migration defaults to dry run, is idempotent, and missing required indexes prevent writes.
- Image byte/MIME/signature/decode/redirect/time/ownership cases; canonical privacy-safe Growth context and exact interval; concise Bangla and all four language preference snapshots.
- Late/stale generation, retry identity, selective Apply and Undo preserve manual edits. Final review restored a missing Product preview import, separated individual SEO fields, fixed local campaign attribution, used newer returned Product facts, guarded history review on navigation, and prevented old responses from overwriting current usage.

## Runtime verification still required

1. **Browser acceptance:** earlier synthetic Product generate/compare/selective Apply/Undo/save and Collection Apply/save were exercised, along with lost-response retry and stale/unmount behavior. The full SEO and Growth browser flows were not completed. Subsequent browser access was rejected by the tool security policy; no alternate browser/workaround was used. Latest completeness, brand voice, history and campaign-draft screens still require real browser QA.
2. **Authenticated deployment flows:** run complete Product, Collection, SEO autosave/reload/publish and Growth draft workflows in the target environment, on desktop/mobile, with two tenants and revoked staff permissions. Recheck dialogs, focus/keyboard access, busy states, error/fallback/source/usage messages and field editing.
3. **Provider pilot:** verify the configured model/key, actual supported image hosts/assets, cancellation/timeout behavior, and merchant-reviewed English/Bangla/Banglish/mixed quality. Local abort does not prove remote provider processing or billing stopped.
4. **Operations:** approve/run quiesced accounting cutover and additive content indexes; verify workers, recovery backlog, index availability, TTL cleanup, operator health and representative production latency/load. Standalone accounting tests do not make existing transaction-based Product saves work on standalone Mongo.
5. **Repository gate:** reconcile the five unrelated source-text regression assertions. No full production-ready claim is made.

## Deferred intentionally

R16 bulk AI generation, dynamic Collection rules, autonomous commerce, ad-platform publishing/spend, RAG/vector storage, generic agents, multiple-provider infrastructure, another queue/backend/database, customer profiling and permanent prompt archives. Merchant history beyond saved Product scalar suggestions is intentionally not generalized; campaign planning already has its own durable drafts.

## Remaining product decisions

- Approve the mixed-output charging policy: full Growth planning currently releases its app reservation; accepted selected text-only regeneration consumes one unit. Provider billing remains separate/unknown where unreported.
- Confirm the 50-item limits, 30-day Product history and 90-day campaign retention, and shared access through existing Products/Growth staff permissions.
- Confirm language/brand-voice defaults and quality acceptance using merchant examples. No need for a new architecture decision before these operational/business checks.

## OpenAI migration follow-up — 2026-10-12

All four generators, Product image input and the legacy description endpoint now use the same OpenAI Responses adapter. Default model is configurable `gpt-4.1-mini`; strict JSON schemas use closed objects and nullable optional fields. Refused, incomplete and empty provider responses cannot pass as accepted output. SDK retries are disabled, response storage is disabled (`store: false`), and transport errors stay sanitized. Existing feature validation, quota, tenant boundaries and explicit Apply/Save behavior remain in place.

Local backend `.env` and `.env.example` use `OPENAI_*` settings; no legacy provider fallback remains. The existing OpenAI key was preserved when found during verification, never printed, and successfully accessed `gpt-4.1-mini` through a read-only model retrieval. No live generation or customer database changes were performed. Local `AI_ACCOUNTING_VERSION=0` still prevents AI admissions until the documented cutover. Restart API and worker processes after configuration/dependency deployment.

New attempt/provenance fields identify OpenAI; historical records without provider attribution remain legacy. Operator health counts current-provider activity only, so old Gemini responses do not imply a working OpenAI connection. Prompt versions and operation identity advance to contract 4. Old operation IDs can conflict after upgrade; drain pending work before deployment and begin an explicit new generation when needed. Saved merchant content is not rewritten.

Verification on the migrated working tree:

- Focused backend: **55/55 passed**, using the focused command above (`output/openai-focused.log`). Tests cover actual installed SDK request format, abort, image input, strict schemas, missing credentials, refusal/incomplete responses and no automatic retries.
- Mongo/HTTP: **18/18 standalone and 18/18 replica set**, using the topology launcher above (`output/openai-topology.log`). Includes legacy description/replay, provider attribution and health isolation, plus all five routes' access/quota guards. Provider generation is mocked.
- Broader backend: **462 passed, 5 failed / 467 total** (`output/openai-backend-tests.log`). The same five baseline UI source-text failures listed above remain; no new failures.
- `npm ls openai @google/generative-ai` confirms only `openai@7.32.0` in the backend. Runtime/config/dependency searches found no active Gemini integration. Historical audits and deliberate legacy-compatibility test fixtures retain their original names.
- `git diff --check` passed (`output/openai-diff-check.log`). No frontend files changed in this provider migration, so the earlier Admin build/behavior results were not rerun as new evidence.

Setup, compatibility and restart instructions: [OpenAI provider configuration](operations/openai-ai-provider.md). The previously listed browser, accounting deployment and real generation quality gates remain open.
