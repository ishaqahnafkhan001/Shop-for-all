# SEO and AI Production Hardening

This release hardens storefront indexing, sitemap generation, redirects, review eligibility, and all current vendor-facing Gemini workflows without changing tenant or subscription boundaries.

## AI request policy

All product, collection, Growth Center, and Homepage SEO generation routes use one durable request policy. Clients send a stable `x-ai-request-id`; the backend stores a tenant- and feature-scoped request record, reserves weekly usage atomically, and prevents duplicate provider calls.

Provider success consumes the existing `aiProductCreationsPerWeek` allowance. A deterministic fallback releases the reservation because it did not consume a successful provider generation. The response reports `meta.source`, `meta.fallback`, `meta.promptId`, `meta.promptVersion`, model provenance, safe limitations, and evidence where applicable.

Current prompt contracts:

| Feature | Prompt ID | Version |
| --- | --- | --- |
| Product content | `product.content` | `2.0.0` |
| Collection content | `catalog.collection` | `2.0.0` |
| Growth ad planning | `growth.ad_planning` | `2.0.0` |
| Homepage SEO | `seo.homepage` | `2.0.0` |

The legacy product-description endpoint remains available but delegates to the modern product content workflow and emits deprecation headers. AI prompts use public product/store context and aggregate application-calculated metrics only. Customer identities, addresses, order notes, internal cost fields, and credentials are outside the AI data boundary.

Homepage SEO remains dependent on Store Builder because the canonical subscription registry currently defines `homepageSeo.dependsOn = ['storeBuilder']`. This hardening pass does not change commercial entitlements.

## Storefront indexing

One indexability resolver now controls robots metadata, canonical eligibility, sitemap inclusion, and JSON-LD output. Missing public resources return real `404` responses. Preview and non-production environments default to `noindex`.

The sitemap endpoint is an index:

- `/sitemap.xml`
- `/sitemaps/core.xml`
- `/sitemaps/products-N.xml`

Product chunks contain at most 1,000 URLs. XML values are escaped, out-of-range chunks return `404`, and backend failures return `503` instead of an empty successful sitemap.

Product, collection, and category slug changes retain up to ten tenant-scoped historical slugs. Old public URLs resolve through a permanent redirect. Existing historical slugs cannot be reconstructed safely, so redirect history begins when this release records the next slug change.

Metadata fetches bypass stale server cache for canonical resources. Store Builder publication also retries cache invalidation with bounded backoff. No global cache purge is required.

## Reviews and structured data

Review eligibility is centralized as `isDeleted != true` and `isVisible != false`. Existing reviews therefore remain visible after migration, while hidden or deleted reviews are excluded from lists, rating aggregates, badges, and product structured data.

Product JSON-LD uses authoritative public product values, eligible ratings, scheduled sale validity, and the public seller identity. Shipping, returns, and product-condition claims are intentionally omitted until authoritative public fields exist for them.

## Growth privacy

Growth AI receives only aggregate location labels that meet the privacy threshold. Configure `GROWTH_AI_MIN_COHORT_SIZE`; the default is `3`. When the threshold is not met, location targeting is omitted and the response reports the limitation.

## Environment variables

Configure these on the backend without exposing their values:

- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional)
- `GEMINI_TIMEOUT_MS` (optional)
- `GROWTH_AI_MIN_COHORT_SIZE` (optional, defaults to `3`)

Canonical storefront host configuration continues to use the repository's existing platform-domain environment variables.

## Migration

From `ecommerce-backend/backend`:

```bash
npm run migrate:seo-ai-hardening
npm run migrate:seo-ai-hardening -- --apply
```

The default command is read-only and reports affected review documents. `--apply` backfills only missing review visibility flags and creates the new indexes. It preserves explicit visibility values and does not infer unavailable slug history.

Rollback is application-first: deploy the prior code while retaining the additive fields and collections. The review flags, slug redirects, and AI request records are backward-compatible and do not need destructive rollback. If storage cleanup is later required, perform it only after the rollback deployment is stable and backed up.

## Monitoring

Monitor safe structured logs for provider fallback codes, cache invalidation retry exhaustion, sitemap `503` responses, and migration failures. Never log prompts containing merchant content, provider payloads, credentials, or customer data.
