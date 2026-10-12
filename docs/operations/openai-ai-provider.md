# OpenAI provider configuration

The backend uses one OpenAI Responses adapter for Product content (including supported image input), Collections, Homepage SEO, Growth ad copy and the legacy `/api/admin/generate-description` route. All calls remain server-side; Admin and Storefront have no provider SDK or API key.

## Environment

Set these in `ecommerce-backend/backend/.env` for local development, and in the deployment environment for API/worker processes:

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-6-luna
OPENAI_MAX_OUTPUT_TOKENS=2400
OPENAI_PRODUCT_AI_MAX_OUTPUT_TOKENS=2400
OPENAI_TIMEOUT_MS=45000
```

Supply a real OpenAI API key privately. The checked-in example stays empty. `GEMINI_*` values are no longer read and cannot supply fallback credentials. Never use `VITE_*` or `NEXT_PUBLIC_*` variables for this key. Do not paste credentials into logs, screenshots or issue reports.

The default `gpt-6-luna` is used for the existing short content workload. It supports image input, Responses and structured output; see [official model documentation](https://developers.openai.com/api/docs/models/gpt-6-luna). The adapter requests `reasoning.effort: none` for Luna to preserve the previous non-reasoning behavior within the current output cap. Other configured GPT models retain their existing request behavior. The configured model name is not an account-access guarantee.

The overall generation deadline remains `AI_OPERATION_TIMEOUT_MS=60000`; the attempt timeout is capped by its remaining time. Product output limits are also capped by the global output limit. Existing Collection/Growth/SEO feature limits remain. Application quota, provider token billing and model access are separate checks.

## Install and activate

1. Use Node.js 22 or newer and run `npm ci` inside `ecommerce-backend/backend`. The lockfile pins `openai@7.32.0`; the Google provider SDK has been removed.
2. Set OpenAI variables on the backend and keep API/worker configuration consistent. A model-access check only establishes that the key can retrieve that model; it does not establish generation quota, output quality or image behavior.
3. For this working tree, `AI_ACCOUNTING_VERSION=0` remains intentional. Complete the reviewed [accounting cutover](ai-accounting-cutover.md) before setting `AI_ACCOUNTING_VERSION=2`. The key alone will not enable new AI operations. Merchant history/draft writes also require the existing content indexes in that runbook.
4. Drain active requests before replacing old binaries, then restart all API and worker instances. Configuration is cached per process; editing `.env` cannot update a running process by itself. Deployments using platform environment settings must update those settings separately from local `.env`.
5. On an approved fixture store, verify Product text/image, Collection, SEO and Growth generation, same-operation retry, tenant boundaries and quota settlement. Review language quality and fallback messages before enabling merchant traffic.

No accounting/database migration is required solely for the optional provider-attribution fields. The earlier accounting protocol migration still applies if the environment has not completed it.

## Behavior and compatibility

- Existing HTTP routes and response payloads are preserved. Feature services retain their validation, fallback, privacy, grounding and explicit Apply/Save behavior.
- Requests use strict JSON schema with optional fields represented by `null`; refusals, incomplete output and empty output cannot be accepted as successful provider content. See [official structured-output documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).
- `store: false` disables Responses application storage. It is not a claim that all provider retention is disabled. Client debug logging and automatic transport retries are disabled. Product still permits its bounded content-quality repair attempt within the operation deadline.
- Product images are validated/re-encoded by the existing image service and passed as inline image input. Existing host and tenant-ownership restrictions remain.
- New prompt/operation contracts are version 4. A pre-migration operation ID can return `AI_REQUEST_INPUT_CONFLICT`; review its prior outcome and start a new generation explicitly. Do not automatically resubmit it under a new ID.
- New attempt and saved-result provenance identify `openai`. Existing saved content remains unchanged; unknown legacy attribution is not relabeled. Health response/token counts use current-provider attempts, while stale-operation recovery includes all providers.

## Verification recorded on 2026-10-12

- Backend local key configured and read-only retrieval of `gpt-4.1-mini` succeeded. No key value was logged, and no live generation was performed.
- Local accounting remains version `0`; application generation is still gated.
- Focused tests: 55/55. Real disposable Mongo/HTTP tests with mocked generation: 18/18 on each of standalone and replica-set topologies.
- Broad backend tests: 462/467 passed; five pre-existing UI assertion failures remain. See [implementation report](../AI_ADMIN_IMPLEMENTATION_REPORT.md) for commands, logs and release limitations.

## GPT-6 Luna verification on 2026-10-13

- Local `.env`, the checked-in example and the backend fallback now select `gpt-6-luna`. The installed SDK sends `reasoning.effort: none` for Luna and omits sampling controls.
- The configured local key retrieved `gpt-6-luna` and completed a synthetic strict-JSON Responses request with `store: false`; no merchant data was used. Focused backend tests passed (27/27).
- Local `AI_ACCOUNTING_VERSION=0` still blocks application AI admissions. Update the deployment model setting in both API and worker environments, follow the accounting cutover runbook when ready, and restart those processes before expecting merchant-facing generation.
