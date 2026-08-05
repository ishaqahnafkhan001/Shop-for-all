# Prebuilt Storefront Themes

## Architecture

Prebuilt themes are immutable, code-defined presentation presets. They do not provide a second storefront renderer and they are not stored as a separate published document.

The catalog is exported from:

```text
@scaleup/storefront-theme/prebuilt
```

The normal runtime theme contract remains exported from:

```text
@scaleup/storefront-theme
```

The admin Store Builder imports the prebuilt catalog only when the theme gallery opens. The live storefront imports only the normal theme contract and the shared storefront renderer. It therefore receives a resolved `Shop.theme` and does not bundle preset definitions or gallery thumbnails.

## Included Themes

1. Modern General
2. Minimal General
3. Modern Fashion
4. Editorial Fashion
5. Luxury Jewellery
6. Minimal Jewellery
7. Soft Beauty
8. Modern Electronics
9. Fresh Grocery

Every entry has a stable lowercase ID, integer version, name, description, industry, style, tags, thumbnail key, presentation configuration, and homepage section blueprint.

## Apply Flow

```text
Open theme gallery
→ filter or search local metadata
→ inspect lightweight thumbnail
→ optionally mount one real shared-renderer preview
→ confirm Use theme
→ resolve preset against the current merchant draft
→ update local Store Builder draft
→ normal undo/redo and autosave
→ merchant reviews changes
→ normal revisioned Publish flow
```

Applying a theme never calls the publish endpoint. The resolved theme records optional provenance:

```js
preset: {
  id: "modern-fashion",
  version: 2,
  appliedAt: "2026-08-05T00:00:00.000Z"
}
```

Old themes without `preset` remain valid and normalize to `preset: null`.

## Version 2 Capability Matrix

The version 2 catalog is curated from the shared renderer's schema-backed structural variants. The matrix is documentation, not a second runtime registry; `prebuilt.cjs` remains authoritative.

| Theme | Header | Hero | Category | Story | Collection | Reviews | Newsletter / Promo | Grid and card |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Modern General | Standard | Split | Cards | - | Grid | Cards | Boxed / strip | 4-column Modern |
| Minimal General | Minimal | Minimal | Cards | Standard | - | - | Minimal newsletter | 3-column Minimal |
| Modern Fashion | Centered | Full bleed | Image grid | Image right | Grid | Quote | Full-width / overlay banner | 4-column Premium portrait |
| Editorial Fashion | Minimal | Editorial | Editorial | Editorial | Mosaic | Minimal | Minimal newsletter | 3-column Minimal portrait |
| Luxury Jewellery | Centered | Centered | Image grid | Full width | Spacious | Quote | Boxed newsletter | 3-column Premium |
| Minimal Jewellery | Minimal | Minimal | Circles | Standard | - | Minimal | - | 3-column Minimal |
| Soft Beauty | Centered | Split | Circles | Image right | - | Cards | Boxed / split banner | 3-column Modern portrait |
| Modern Electronics | Standard | Split | Cards | - | Grid | - | Strip promo | 4-column compact Modern |
| Fresh Grocery | Standard | Centered | Circles | - | Spacious | - | Full-width / split promo | 4-column compact Modern |

Sections that require merchant-authored content remain disabled when that content is absent. A blueprint slot does not authorize the resolver to invent a campaign, review, story, trust statement, FAQ, or newsletter message.

## Structural Signatures

Color is intentionally not the only differentiator. The paired presets diverge through composition and density:

- Modern General uses a split hero and four-column balanced flow; Minimal General uses a minimal hero, three-column grid, and more whitespace.
- Modern Fashion uses a centered header, full-bleed campaign, image grid, and quote reviews; Editorial Fashion uses a minimal header, editorial hero/story, and mosaic collection.
- Luxury Jewellery opens with a spacious collection and centered hero; Minimal Jewellery opens directly into products after a minimal hero and uses circular discovery.
- Modern Electronics uses technical category cards, grid collections, and a strip promotion; Fresh Grocery uses circular aisles, a centered hero, spacious collections, and a split promotion.
- Modern Fashion remains image-led and portrait-dense, while Luxury Jewellery is narrower, centered, and collection-led.

These signatures are tested without color values so a palette change cannot collapse the themes back into the same effective layout.

## Content Preservation

The resolver changes presentation and composition only. It explicitly carries forward merchant-owned content:

- logo and browser icon
- hero images, slide IDs, copy, badges, and CTA links
- navigation labels, destinations, nesting, and order
- footer copy, contact details, social links, and custom links
- policies
- Homepage SEO and social metadata
- payment settings and checkout copy
- product selections and section-authored content
- All Products title, subtitle, and visibility
- migration state

For an existing compatible section, the resolver preserves the section ID and content while applying only presentation settings. Existing unmatched sections are appended instead of deleted. New content-dependent sections such as reviews, brand story, FAQ, trust badges, promotions, and newsletter are created disabled so a preset cannot invent merchant claims or content. Newly created section IDs come from the Store Builder ID factory and are checked for uniqueness.

## Plan Safety

The resolver accepts backend-provided `planAccess`.

- `full`: applies the complete preset, including layout and homepage section composition.
- `limited`: applies allowed presentation controls but preserves `layout`, `productGridStyle`, `homepageSections`, and `migrations` exactly.
- `none`: rejects preset application.

The backend remains authoritative. Draft autosave and publish both execute `assertStoreBuilderUpdateAllowed`, so a client cannot write restricted layout or section changes through the draft API.

## Updating A Theme

1. Edit the theme in `packages/storefront-theme/prebuilt.cjs`.
2. Increment that theme's `version` whenever its resolved output changes materially.
3. Keep its existing `id`; IDs are stable persisted references.
4. Use only values supported by the shared theme schema and renderer.
5. Do not add tenant URLs, product IDs, testimonials, policies, or marketing claims.
6. Update the matching lightweight thumbnail in `ecommerce-admin/src/assets/theme-previews` if its visual identity changes.
7. Run the registry tests and all application verification commands.

Gallery thumbnails use a 480×300 (8:5) local structural SVG canvas. Each version 2 thumbnail mirrors its preset's real header, hero, category treatment, and product density, stays below 25 KB, and loads lazily. Future photographic raster artwork should use optimized WebP or AVIF at card resolution rather than a full-page screenshot.

Previously published stores do not change when a catalog definition changes. A catalog update affects a merchant only when they explicitly apply the newer preset version.

## Adding A Theme

1. Add one `defineTheme` entry with unique metadata and a valid presentation configuration.
2. Build its homepage blueprint from existing `SECTION_REGISTRY` types.
3. Add a local thumbnail and map it in `ThemeGallery.jsx`.
4. Update the expected catalog count and name list in `store-builder-prebuilt-themes.test.js`.
5. Confirm the resolver preserves merchant content and produces unique section IDs.
6. Confirm limited-plan output passes the backend Store Builder policy.

Do not add a new storefront component solely for a theme. Renderer changes must be shared, schema-backed improvements that work for custom themes and every preset.

## Verification

The focused tests cover:

- catalog uniqueness, immutability, and validation
- all nine theme definitions
- deterministic resolution
- shared theme normalization and validation
- merchant content and product selection preservation
- unique section IDs
- limited-plan field preservation
- unavailable-plan and unknown-theme errors
- Mongoose round-trip of preset metadata
- draft and publish capability enforcement

The admin production build also demonstrates the import boundary: the catalog is emitted as a lazy `prebuilt` chunk, separate from the Store Builder route and absent from the live storefront package.
