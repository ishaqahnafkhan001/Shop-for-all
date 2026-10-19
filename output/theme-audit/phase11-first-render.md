# Phase 11 — Storefront provider and first render

Date: 2026-10-10, Asia/Dhaka.

Status: implementation and isolated automated checks finished. Full live acceptance
remains open. This report does not certify browser hydration, production tenant
isolation, authenticated publication, or visual absence of flashes.

## Root causes found

| Severity | Location / function | Cause and effect |
| --- | --- | --- |
| High | `ecommerce-storefront/src/components/storefront/StorefrontThemeProvider.jsx`, provider | Initial settings were null. Server HTML and first client render used defaults, then a client fetch or child effect replaced them with published settings. |
| High | Same provider, loadTheme catch | A failed secondary-page request reset settings to null, replacing a previously valid published design with defaults. |
| High | `ecommerce-storefront/src/app/[subdomain]/StorefrontHomeClient.jsx` | Homepage resolved its own bootstrap theme and pushed shop settings into the provider in an effect. Header/footer and page content could initially render different themes. |
| Medium | CategoryPageClient / CollectionPageClient | Each resolved its page-level shop theme independently of the shell provider, permitting mixed revisions within a page. |
| Medium | Tenant layout | No published settings were loaded on the server for the shell, including direct product/cart/checkout/policy URLs. |
| Medium | Homepage and useShopData | Hook state only consumed initialData on mount. A refreshed server revision could leave old homepage data mounted. |

The primary defect was lifecycle ownership: published theme authority lived in
asynchronous client updates. The shared resolver already existed and did not need
replacement.

## Implemented flow

1. Tenant layout obtains the route tenant and request host.
2. `getPublishedStorefrontSettings` calls the existing public `/storefront/:tenant/info`
   endpoint with `fresh: true`, which selects `cache: 'no-store'` in the server helper.
3. Backend tenant/domain middleware and the existing public controller determine
   access, published theme, plan restrictions, branding and public verification.
4. The server uses the existing theme facade to resolve the returned theme.
5. The layout passes these serializable settings into StorefrontThemeProvider.
6. The provider uses that prop directly for context and the existing shared CSS
   style generator. There is no state initialized from defaults and no client theme request.
7. Home, category and collection now use the same provider as header, footer, cart,
   checkout and policy presentation. Product presentation already uses its CSS scope.

React `cache` memoization is scoped to the server render request and takes primitive
tenant/host arguments. The homepage's server data and metadata reuse that loader,
overriding the bootstrap shop snapshot with the authoritative settings. Product and
promotion data still come from the existing bootstrap endpoint.

## Files and behavior changes

- `ecommerce-storefront/src/lib/storefrontPublishedSettings.js`: public server loader,
  request memoization, response identity check and existing resolver reuse.
- `ecommerce-storefront/src/app/[subdomain]/layout.jsx`: await settings before rendering
  the tenant shell; key the subtree by host and route tenant.
- `ecommerce-storefront/src/components/storefront/StorefrontThemeProvider.jsx`: remove
  theme fetch/effects/state and hydrateThemeSettings; use resolved settings props.
  Missing tenant settings throw; the outer platform provider can still use defaults.
- `ecommerce-storefront/src/app/[subdomain]/page.jsx`: share published settings with
  layout and key HomeClient by tenant/revision. A changed revision remounts homepage
  state, including filters and popup state; cart state stays above this boundary.
- `ecommerce-storefront/src/app/[subdomain]/StorefrontHomeClient.jsx`: consume context;
  bootstrap/product refreshes can no longer overwrite the shell theme.
- `ecommerce-storefront/src/app/[subdomain]/categories/[slug]/CategoryPageClient.jsx`
  and `collections/[slug]/CollectionPageClient.jsx`: consume context rather than
  separately resolving page shop themes.
- `ecommerce-storefront/src/proxy.js`: forward the original public path/query in an
  overwritten request header for layout-level plan redirects after tenant rewriting.
  Existing rewrite destinations are unchanged.

Missing/locked stores follow notFound. A transient failure or malformed settings
response renders a neutral unavailable/reload screen without tenant children.
Custom-domain inactive-plan responses use the existing validated platform redirect
helper and retain the requested public path/query. No arbitrary redirect host is accepted.

## Verification

- **174 focused tests passed**, zero failures: `phase11-tests.txt`.
- **Storefront production build passed**: `phase11-storefront-build.txt`.
- **git diff --check passed**: `phase11-diff-check.txt`; existing CRLF conversion
  warnings are informational.
- New suite: `ecommerce-backend/backend/tests/storefront-first-render.test.js`.
  Eight checks cover nine-preset initial markup and JSON prop serialization,
  successive tenant/revision server renders, required tenant snapshots, fresh public
  requests and host forwarding, actual tenant-layout wiring, failure handling,
  backend access decisions and spoofed path-header replacement.
- Existing control-wiring tests render both real catalog clients beneath the actual
  provider with a deliberately conflicting page-level theme. All nine presets pass.

Tests execute real provider, loader, layout, proxy and theme/renderer modules. Network
responses, Next header/navigation/response APIs and layout infrastructure are replaced
with test doubles. Layout shell probes verify shared context; these are not full browser
renders of Navbar/Footer. Separate SSR renders after serialization are evidence of
deterministic input/output, not execution of React hydrateRoot or a mounted router refresh.
The initial focused run exposed a wrong preset-helper argument in the new test harness;
it was corrected before the successful final suite.

## Navigation, publication and limits

- Direct loads/hard reloads obtain a fresh public server snapshot before tenant UI.
- New settings props are used directly; there is no effect needed to synchronize a
  useState copy and no late provider request that can restore an older theme.
- Ordinary same-tenant navigation retains Next's mounted layout snapshot, keeping
  theme consumers consistent. It does not discover a newly published revision by itself.
- A server refresh supplies new provider props. Changed homepage revision keys consume
  fresh initial data. This behavior still requires a real browser acceptance run.
- Publication notifications, router-cache invalidation, cross-tab updates and backend
  multi-process cache behavior remain Phase 12 work.
- The info request is now on the server critical path. Backend failure prevents a
  branded shell from rendering; it previously rendered defaults while fetching.
- Bootstrap data and public settings are separate backend reads. A publish occurring
  between them can yield different section-product data versus theme revisions. Atomic
  revision consistency/retry belongs in the publication/cache work and remains open.
- Other routes' SEO/info requests retain their existing loaders. This phase consolidates
  presentation context; it does not claim every backend read is an atomic snapshot.
- No Phase 11 browser run was performed. The previously recorded browser-policy block
  was not bypassed. No live Mongo publication or production custom-domain check occurred.

## Remaining acceptance

Run direct URLs, hard refresh, same-tenant navigation, router refresh after publication,
theme switching, tenant switching and custom-domain access in an allowed browser against
an authorized test environment. Check hydration warnings, initial visual state and actual
revision propagation. Repeat with a failed settings request and verify recovery by reload.

Phase 10 contrast and zero-price commerce findings, Phase 9 final visual checks, and
earlier authenticated publication gates remain recorded in their reports. No stored theme,
schema version, preset palette, database, deployment or Git commit was changed in Phase 11.
