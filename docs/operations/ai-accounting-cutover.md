# AI accounting version 2 cutover

Source implementation does not authorize a customer database migration or deployment.
Default `AI_ACCOUNTING_VERSION=0` disables new admissions with a support-facing error.

The current provider is OpenAI. Configure the backend using [OpenAI provider configuration](openai-ai-provider.md); setting a valid API key does not replace the accounting cutover below.

1. Back up the database and record current weekly `used`/`reserved`, active requests and indexes. Pause all five AI entry points at ingress, drain provider calls, and stop every old API/worker writer. An old binary cannot understand the new protocol: rolling mixed versions is unsafe.
2. Set `AI_MIGRATION_MONGO_URI` explicitly in the operator shell. Run `node scripts/migrate-ai-accounting.js` for the read-only inventory. It does not load `.env` or run unrelated database initialization.
3. Resolve any reported legacy active requests or nonzero reservations through a reviewed support adjustment. Missing/expired ledgers cannot prove provider completion. The script refuses to guess owners, refund reservations or change used units. Preserve the snapshot and approved adjustment records.
4. With writers still stopped, run `node scripts/migrate-ai-accounting.js --apply --writers-quiesced`. Repeated runs are idempotent. It versions only zero-reservation legacy windows and creates the declared indexes; saved merchant content and completed legacy replay payloads are unchanged.
5. Deploy only the new API and worker binaries, set `AI_ACCOUNTING_VERSION=2` in both, verify indexes and bounded recovery, then reopen ingress. Test replay, quota and separate tenants against an approved fixture store before merchant traffic.

Rollback: disable admissions, drain new calls and run recovery until every v2 receipt is settled and pruned. Preserve v2 ledger/receipt evidence. Prefer rolling forward with admissions disabled. Do not start the old aggregate writer against outstanding v2 receipts or simply remove schema fields. Restoring a coordinated backup requires a separately approved operational plan.

## Protocol

The quota row owns bounded receipts identified by the server ledger ObjectId and immutable UTC week. Admission and settlement are single-document atomic operations, valid on standalone and replica-set MongoDB. Durable result/failure decisions precede settlement; only the corresponding receipt can change a counter. Expired receipt fencing plus conditional ledger decisions prevent a late runner from replacing recovery's decision. Recovery never calls a provider.

Settled receipts remain admission tombstones until the original deadline. Mongo `$$NOW` closes admission before pruning, preventing a delayed reserve write from recreating a finished reservation. TTL is assigned only after ledger accounting acknowledgement and receipt pruning. Recovery runs every ten seconds in the existing worker and in bounded batches on admission. A failed/recovered operation releases its app unit; remote provider activity/charges may still be unknown. Same-ID replay is supported through terminal retention (24 hours by default); retries beyond retention may start new work.

Limits apply to unlimited plans too: two concurrent reservations and 128 retained receipts per weekly window by default. Persistent recovery failures eventually block admission. Monitor pending/stale records; do not manually decrement aggregate counters while requests remain outstanding.

No paid provider calls, customer database migration or deployment was performed to verify this source.

## Merchant content and preferences rollout (Phases 4–5)

These are additional steps for the same deployment. Do not enable new content writes before verifying the required indexes.

1. Review the bounded storage defaults: 50 saved Product suggestions per tenant retained for 30 days, and 50 campaign drafts per tenant retained for 90 days after the last save. Product history is opt-in and stores only generated description, SEO title/description and image ALT text. Existing Products and Growth permissions control shared staff access. Confirm these policies before release.
2. Against the explicitly reviewed target, run `node scripts/migrate-ai-content-indexes.js`. This defaults to a read-only plan, uses `AI_MIGRATION_MONGO_URI`, and does not read `.env`.
3. Run `node scripts/migrate-ai-content-indexes.js --apply` only in the approved deployment window. It creates additive indexes on `AiContentHistory` and `AiCampaignDraft`; repeated application is idempotent. It never drops indexes or rewrites merchant content. Unique tenant/slot indexes enforce storage limits during concurrent saves; history also requires a unique tenant/feature/operation index. TTL indexes perform eventual cleanup, while reads immediately exclude expired rows. The API fails closed on new content writes if the required indexes are absent.
4. No preference data backfill is necessary. `Shop.aiPreferences` is private by default, optional, bounded and versioned. Stores without preferences retain automatic language selection. New Bangla-only Collection names can create stable Unicode-derived slugs; existing saved slugs are not rewritten.
5. Confirm the API and existing worker use the same validated AI configuration. Review `.env.example` and `config/ai.js`. Required operational choices include the provider key/model, accounting version, logical deadline, tenant concurrency, retention and exact trusted image hosts. A configured provider key does not prove provider connectivity. Never paste keys into a merchant browser or support transcript.
6. On an approved fixture store, verify all four generation workflows, same-ID retries, staff revocation, Product history compare/Apply/Undo/save, campaign draft CRUD and selected-field regeneration, and unchanged commerce values. Exercise English, Bangla, Banglish and mixed-language wording with merchant review. Verify the operator-only health view observes accepted generation, failures, stale operations and nullable provider usage.

Rollback for merchant features: disable their API entry points/UI, retain the collections and private preferences, and roll forward. Deleting content or indexes is not part of rollback. Accounting rollback still requires the full drain/recovery procedure above. Do not restore the aggregate quota writer while v2 operations remain.

### Charging policy implemented pending product decision

Wholly accepted provider output consumes one shared weekly application unit. Fallbacks and mixed output release their reservation. Full Growth planning output is mixed because the application adds deterministic advice; selected Growth text-only regeneration is provider output when all requested fields are accepted. This means full planning and partial regeneration currently have different application-unit behavior. Provider token usage and actual billing are independent and may be unknown. Approve or change this policy before release; no provider price or zero-cost assertion is inferred.

### Local verification and remaining release gates

See `docs/AI_ADMIN_IMPLEMENTATION_REPORT.md` for exact commands, results and unresolved checks. Local integration used disposable standalone and single-node replica-set MongoDB, with mocked provider responses. Production topology, real provider quality, the full browser acceptance matrix, and production deployment remain unverified.
