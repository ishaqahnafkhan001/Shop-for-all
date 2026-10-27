# Inactive adaptive page contract — version 1

This entry is a **pure, opt-in contract** for Phase 1. Import it from
`@scaleup/storefront-theme/adaptive` (CJS or ESM). The existing root and prebuilt
entries do not import it. It is not a renderer, persistence format migration,
permission service or live theme feature. `THEME_SCHEMA_VERSION` remains **4**.

## Public surface

| Export | Responsibility |
|---|---|
| `PAGE_KINDS`, `PAGE_TEMPLATES`, `BLOCK_REGISTRY`, `SOURCE_BINDINGS` | Deeply frozen, code-owned page/blueprint, block, slot, operation, source and part capabilities. |
| `createPageTemplateDocument()` | Empty inactive document with its own `version: 1`. |
| `createPageTemplate(templateId, pageKind)` | Versioned blueprint skeleton; adds the required reserved core and current-resource binding. Throws `TypeError` for invalid factory arguments. |
| `validatePageTemplates(document, colorTokens?)` | Strict JSON/structure/content/style validation, without mutation or I/O. |
| `validateCompleteThemeBudget(candidate)` | **JSON shape/UTF-8 size check only** for the proposed whole-theme budget. Does not validate/accept a persisted v5 theme or normalize it. |
| `validateResponsiveStyles(styles, capability?)` | Typed style validation. Component capabilities must come from trusted code; merchant JSON cannot provide them. |
| `resolveResponsiveStyles(layers, tier, capability?)` | Resolve typed overrides at one explicit tier; no browser globals, CSS generation or DOM. |
| `tierForWidth(width)` | Pure breakpoint selection; finite, nonnegative CSS pixel width required. |
| `applyPageTemplateCommand(document, command, colorTokens?)` | Immutable command with complete before/after validation. Failure never returns a partially changed document. |

Validators return `{ valid, errors }`; successful graph validation also includes
`bytes` and node/template counts. Each issue is `{ path: (string | number)[], code,
message }`. Errors are bounded to 100. Commands additionally return `value` and
`insertedIds` only on success. No API logs input or resolves tenant-owned data.

## Shape and identity

```js
const contract = require('@scaleup/storefront-theme/adaptive');
const document = contract.createPageTemplateDocument();
document.templates.tpl_product = contract.createPageTemplate('tpl_product', 'product');
document.defaultTemplates.product = 'tpl_product';
const result = contract.validatePageTemplates(document);
```

Top-level keys: `version`, `defaultTemplates`, `globals`, `templates`,
`savedSections`, `stylePresets`. These maps are required, assignments are optional.
Default page kinds are exactly `home`, `product`, `category`, `collection`, `cart`,
`checkout`, `account`, `track`, `policiesIndex`, `policy`. Globals are `header` and
`footer`. One assignment per kind; no route expressions or per-product overrides.

A template has `pageKind`, registered `blueprintId`, `rootOrder`, `nodes`, and
optional responsive page `styles`. Node keys are stable IDs, with fields `type`,
registered `content`/`source`, `slots`, `styles`, `partStyles`, `stylePresetId` only.
Ordering exists only in roots and slot lists. Every node has one owner, is reachable,
and belongs to one tree. No cycles, cross-tree children or synchronized section links.

IDs start with an ASCII letter, then letters/digits/underscore/hyphen: node IDs up to
64 characters; template/library IDs up to 48. Node IDs are unique across all
templates and saved sections. Core IDs are `core_<templateId>`, reserved to trusted
blueprints. `__proto__`, `prototype`, `constructor`, operator/dot/control keys,
accessors, sparse arrays, non-finite numbers and non-JSON values are rejected.
Validation operates on parsed JSON; duplicate lexical object keys already discarded
by a JSON parser cannot be recovered by this API.

## Blocks and protected behavior

Optional types: `content.section`, `layout.stack`, `layout.columns`, `content.text`,
`content.image`, `content.link`, `catalog.products`, `catalog.categories`.
Catalog source blocks map to existing `FeaturedProducts`/`CategoryList` concepts;
this phase does not replicate their rendering or promise support for every legacy
section variant. Other legacy sections continue to use their existing registry.

A section is a root with a `body` slot (1–12 children). Its group can be a stack
(1–12 leaves) or columns (2–4 leaves). Groups cannot contain other groups. Maximum
depth is section → group → leaf. Registered page and parent-slot restrictions apply
at every level. Checkout excludes media, columns and catalog blocks; surrounding
content is limited to two roots after its core. Header/footer also allow at most two
optional roots after their protected core.

Every non-home blueprint requires its exact singleton `<pageKind>.core` at root
index zero. It cannot be moved, removed, copied, nested, retyped or replaced by HTML.
It accepts no merchant content and no merchant children. Product/category/collection/
policy source is the fixed current-route binding; cart, checkout, account and tracking
have no submitted data-source lookup. Global navigation, identity and policy access
belong to their atomic protected cores.

Manifest runtime-state lists document the code-owned boundaries, such as variant
requirements, empty carts, OTP, unverified tracking, cancellation/return eligibility,
and role-specific account views. They do not create merchant predicates, change
commerce conditions or execute controllers. Future adapters must preserve the
existing state machines, required fields, callbacks and API authority.

Text is bounded plain text (6000 characters; labels 120; image alt 240; library names
80). No HTML, expressions or event attributes. Image content uses an asset ID, never
a remote fetch URL. Finite sources are current product/category/collection/policy,
1–24 manual product IDs, bounded catalog (1–24) and categories (1–12). No customer,
order, session, endpoint, query-language or programmable binding.

Link destinations are typed `storePath`, `https`, `email`, `phone`. Protocol-relative,
script/data schemes, controls, backslashes, credentials and ambiguous/malformed
percent escapes are rejected, including repeated encoding. Checkout links are
store-relative only. Safe navigation is not proof that an external site is trusted.

## Responsive styles

`base` is mobile-first; `tablet` starts at 768 CSS pixels; `desktop` starts at 1024.
Existing theme breakpoints remain untouched. Shapes and bounds are exported through
`STYLE_PROPERTIES`; each block/part further narrows the allowed property list.

- Colors: `{ token: <existing flat semantic name> }` or `{ hex: '#123456' }`.
- Fonts: existing approved Inter, Arial, Georgia, Roboto, DM Sans; no font URLs.
- Sizes/spacing: `{ unit: 'px', value: number }`. Typography 12–96 px; line-height
  1.1–2.5; weight 100–900 in steps of 100; letter spacing −1–4 px. Box spacing
  0–160 px, gap 0–80, borders 0–8, radius 0–64. No negative margins.
- Width/max-width: typed 25–100 percent or 160–1920 px, on approved decorative blocks.
  Media height 64–1200 px; integer aspect-ratio sides 1–32 with ratio 0.25–4.
- Layout: registered stack/columns, 1–4 columns, finite alignment, gap, explicit
  `stackOnMobile`. No arbitrary display, positions, z-index, clipping, transforms,
  opacity, pointer-events, selectors, classes, expressions, CSS strings or `url()`.
- Visibility: explicit boolean on optional decoration only. Functional cores/parts
  and pages cannot use visibility, fixed dimensions or column controls.
- Functional text is narrowed to 14–48 px, weight ≥400, line-height ≥1.25,
  letter-spacing 0–2, padding ≤48 px. Required errors/labels/price expose only text
  properties, never box/hiding controls.

Resolve `base → tablet → desktop` **within** each layer, then specificity:
`defaults → inherited page text → preset → node → part`. More-specific node base
values win over less-specific page desktop values. Only approved text properties
inherit to children. Padding, margins, borders, dimensions, background and visibility
are not automatically copied down. Zero/false are explicit; null is invalid.
Reset deletes an override and prunes empty tier/part maps; it does not set null or
overwrite content. Call the resolver for each tier to prepare a future SSR plan;
it does not generate CSS or choose a component tree.

Functional contrast checks compare resolved core/part foreground/background at all
tiers, including token/hex combinations and a default `foreground`/`background` pair.
For isolated tests the effective token map defaults to existing fallback colors.
Future integration **must pass the complete effective tenant token map** as the
second validator/third command argument, obtained from trusted theme resolution.
It cannot come from unvalidated merchant claims. Invalid/incomplete token maps fail.
Token values can change contrast, so revalidate after theme-color changes. These
checks do not prove computed layout, focus visibility, downloaded fonts, contrast
against media or final accessibility; renderer and browser acceptance remain required.

## Commands, reusable copies and presets

Every command has `kind`, `templateId` and its exact declared fields:

| Kind | Fields |
|---|---|
| `add` | `fragment: { rootId, nodes }`, `placement` |
| `remove` | `nodeId` |
| `copy` | `nodeId`, optional `sourceTemplateId`, `placement` |
| `move` | `nodeId`, `placement` (within target template) |
| `content` / `source` | `nodeId`, replacement `content` / `source` record |
| `setStyle` | optional `nodeId` (otherwise page), optional `partId`, `tier`, `property`, `value` |
| `resetStyle` | optional `nodeId`, optional `partId`, `tier`, optional `property` (otherwise entire tier) |
| `resetSectionStyles` | `nodeId`; resets subtree styles, parts and preset references only |
| `insertSaved` | `savedSectionId`, `placement` |
| `applyPreset` | `nodeId`, compatible `presetId` |
| `saveSection` | `nodeId`, fresh `savedSectionId`, bounded `name`; copies an optional subtree into the library |
| `renameSaved` / `deleteSaved` | `savedSectionId`, `name` for rename; inserted copies remain independent |
| `savePreset` / `deletePreset` | `nodeId`, fresh `presetId`, `name` for creation; deletion rejects remaining references |
| `resetPageStyles` | No additional fields; removes only the target template's page overrides |

Placement is `{ index }` at a root or `{ parentId, slot, index }` in a registered
slot. Move indices refer to the destination list **after** detaching the source.
Complete resulting-tree validation rejects forbidden moves, empty required slots
and any attempt to displace a functional core.

Add takes fresh caller-supplied IDs. Copy/saved insertion generates deterministic
unused `node_N` IDs across the document and remaps every child reference. These IDs
are design identities, never authorization tokens. Other IDs/content remain stable.
Cross-template and saved insertion are allowed only when the complete destination
graph is compatible; original/library records remain unchanged.

Saved records have `name`, `pageKind`, `rootOrder` (one root), `nodes`; they cannot
contain protected cores. Presets have `name`, nonempty `blockTypes`, optional
`styles` and `partStyles`; every declared target must support all their properties.
Presets cannot reference presets. Unused templates, saved records and presets are
validated too; dormant invalid configuration cannot wait for activation.

## Limits and future boundaries

12 templates, 50 nodes per tree, 200 nodes across templates + saved sections,
depth 3, 20 saved sections, 20 presets, and 256 KiB serialized UTF-8. Additional JSON
guards: depth 16, 2000 properties per object/array and 20000 values. Oversize input is
rejected without truncation. The graph check applies its budget to the inactive
document; future callers must additionally call the whole-theme budget check so
legacy fields also count. No current v4 limit is changed.

Tenant ownership/public eligibility of asset/product IDs, staff/plan permissions,
adoption gates, v5 reader-first deployment, old-client write fencing, Mongoose
round trips, transactions, revision/media recovery, public projection, rendering and
UI are **Phase 2 or later work**. A successful pure validation proves none of these.
No production path accepts this isolated document in Phase 1.

## Phase 3 remediation: inactive rendering capabilities

The isolated version-1 page document remains inactive. Existing v4 normalization,
theme definitions, persistence gates and commerce controllers are unchanged.
The explicit renderer entry exports `ADAPTIVE_RENDER_CAPABILITIES`, derived from
this registry. Future inspectors must check this map before offering controls:
`home`, `product`, `checkout`, `header` and `footer` have inactive presentation
adapters. The other seven families retain contracts but fail with `PAGE_ADAPTER`
when resolved. Phase 4 editor scope is `home`, `header` and `footer`; rendering
capability is not an editing permission or adoption grant.

Product and checkout version-1 blueprints require their singleton protected core
at root index **0**. Optional content follows it. `surroundingContent` declares
`beforeCore: false, afterCore: true`; it does not enable moving a core. A future
requirement for content above commerce needs a separately reviewed blueprint,
validation and acceptance change. No new arbitrary slot or ordering exception
exists in the renderer or editor commands.

Additive typed controls in this inactive format:

| Control | Permitted target / bound |
|---|---|
| `maxWidth` on a page | Outer container only: 320–1920 px or exactly 100%; clamped to containing width. Never copied into nodes/cores/parts. |
| `minHeight` | Optional `content.section` only: 0–600 px. No fixed functional height. |
| `objectFit` | `content.image` only: `contain` or `cover`. Media corner radius follows its own wrapper. |

All prior style allowlists/ranges remain. No arbitrary CSS, selectors, classes,
URLs, hiding or functional fixed sizes are accepted. Core surface overrides target
one wrapper; typography uses scoped semantic variables to overcome trusted inline
styles while preserving explicit, more-specific part settings. Padding, borders,
radius and dimensions are never copied from a page/node into child parts.

Protected paint resolves actual code-owned surface contexts at every tier.
Checkout labels/headings/inputs/buttons/errors are validated against both main and
summary contexts; input/button text requires 4.5:1 contrast, and control fill or
visible border requires 3:1 against its parent. Zero-width borders cannot satisfy
that test. Default control paint comes from trusted effective tokens. Changing
only a part paints that part's safe backing, rather than unrelated core content.
Untouched core interiors keep their existing appearance; the adaptive-only default
checkout error ink is darkened for its existing feedback backgrounds. Palette
changes never modify prices, stock, totals, consent or OTP behavior.

This is not a claim that pure validation proves final accessibility. Real browser
contrast/layout/focus checks, actual zoom, supported assistive technology and
future route integration still require acceptance evidence.

## Phase 4 inactive editor boundary

The contextual editor reuses whole-theme state, draft queue, revision fences and
history. Production availability remains false and the backend rejects adaptive
mutation. A v5 document without an explicit server availability grant opens
read-only; v4 editing does not convert documents.

Header/footer adapters reuse the existing presentation components and opt-in
semantic markers. Container queries keep their edited containers responsive.
Non-adaptive output omits these markers and retains its original styles. Required
navigation, identity and policy access remain code-owned. Unsupported structural
controls are explained in the inspector rather than represented as working inputs.

Saved sections copy with fresh IDs; deleting a definition preserves inserted
copies. Preset application affects one compatible node, and explicit overrides
remain stronger. Library deletion checks both template and saved references.
Page resets preserve all nodes; section resets preserve content and sources.

Link-kind switching waits for a valid merchant-supplied destination. Unknown
recovery formats remain intact until explicit discard; server autosave is
independent of local recovery. Positive integration fixtures mock the existing
approval boundary in process only, on verified disposable MongoDB infrastructure.

See `output/adaptive-builder/phase4/README.md` for verification and acceptance
limits. Actual 200% browser zoom remains an outstanding prerequisite.
