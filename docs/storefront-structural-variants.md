# Storefront Structural Variants

The storefront uses one shared renderer for Store Builder preview and live shops. Prebuilt themes provide normalized configuration; renderer code never branches on preset IDs.

## Contract

Theme schema version 4 adds these structural fields:

| Field | Default | Allowed values |
| --- | --- | --- |
| `header.variant` | `standard` | `standard`, `minimal`, `centered` |
| `hero.variant` | `fullBleed` | `fullBleed`, `split`, `centered`, `editorial`, `minimal` |
| Banner `settings.variant` | `overlay` | `overlay`, `split`, `minimal` |
| CategoryList `settings.variant` | `cards` | `cards`, `imageGrid`, `circles`, `editorial` |
| BrandStory `settings.variant` | `standard` | `standard`, `imageLeft`, `imageRight`, `fullWidth`, `editorial` |
| Collection and CollectionShowcase `settings.variant` | `grid` | `grid`, `spacious`, `mosaic` |
| Reviews `settings.variant` | `cards` | `cards`, `quote`, `minimal` |
| Newsletter `settings.variant` | `boxed` | `boxed`, `fullWidth`, `minimal` |
| PromoBlock `settings.variant` | `boxed` | `boxed`, `strip`, `split` |

Missing and unknown values normalize to the listed defaults. Validation still reports unsupported values on direct payloads so callers receive actionable feedback before normalization.

## Compatibility And Fallbacks

- Defaults reproduce the pre-Phase-3 structures, so existing shops do not change when deployed.
- All hero variants use the same normalized slide model. One slide is static; multiple slides auto-advance every five seconds, pause on hover/focus, and retain arrows/dots.
- Hero text, CTA links, desktop/mobile images, focal points, and legacy first-slide fields remain available in every composition.
- Missing hero or story images produce a text-led fallback instead of a broken image.
- Circular category cards fall back to an initial when no real image exists.
- Mosaic collections require at least three products and otherwise render the standard grid.
- Reviews remain tied to real review data; variants never create testimonials.
- Newsletter variants remain presentation-only until a genuine subscription action is connected.

## Store Builder And Plans

Header, hero, and supported dynamic-section selectors appear in the existing editors. They are editable only when `storeBuilderAccess` is `full`. Limited plans may continue editing their permitted content fields, but the backend rejects structural changes with the `advancedDesign` capability response. Plans without Store Builder remain excluded by the existing route and feature checks.

## Rendering Rules

- Preview and live storefront both render through `@scaleup/storefront-renderer`.
- Only the active variant is mounted; no hidden alternate trees or additional layout dependencies are loaded.
- Current typography, spacing, width, color, image optimization, mobile visibility, and product-card tokens remain authoritative.
- Mobile variants use compact shared fallbacks, accessible controls, semantic headings, and touch-friendly navigation.
