# Adaptive Store Builder guide

Availability is controlled by your platform administrator. This guide describes implemented editing, not a promise of general availability. The local demonstration uses synthetic examples and browser-local drafts; its **Local draft only** button cannot publish.

## Edit a page

1. Open Store Builder. If an approved v5 design is editable, choose a page or global header/footer from **Page or global region**.
2. Select a row in **Page structure**, or click an element in the preview. The inspector shows the selected component and, where supported, a semantic part such as title, price, gallery or button.
3. Use **Quick Edit** for common settings, **Design Mode** for additional approved appearance settings, or **Advanced Mode** for the full supported controls and reusable designs.
4. Edit content or appearance. Unavailable controls are omitted; protected cores explain why removal, hiding, duplication and movement are locked. Changes update the shared preview immediately when valid.

Use Mobile, Tablet and Desktop to choose the design tier. Base values apply to mobile and inherit upward unless tablet/desktop overrides exist. The inspector identifies inherited versus explicit values. Reset a property to remove its override, reset a tier, or reset section styles/preset. A more-specific component override remains stronger than page settings.

## Sections and reuse

- Add only compatible registered blocks into offered slots. Layout presets create ordinary compatible content.
- Optional blocks can be duplicated, reordered, moved into compatible slots, hidden or removed. Required functional cores remain first and cannot be removed; blueprint v1 does not support content before them.
- In Advanced Mode, save a named section copy and insert it independently. Later edits to an inserted copy do not synchronize back to the saved definition or other copies.
- Create/apply bounded style presets. Explicit overrides take precedence; reset an override to inherit a preset. Used presets cannot be deleted until references are removed.
- Use Undo/Redo for supported in-session changes. Navigation between page families retains the same whole-site draft.

## Drafts, publication and recovery

Read the saved/published status and revision number. Draft autosave does not itself publish. Refresh can recover supported drafts; unknown/newer recovery formats are preserved for review rather than silently replaced. Local development drafts are scoped to the synthetic identity and browser; restarting a fixture may create a different identity.

In an authorized merchant environment, review validation issues and preview every affected page before publishing. Publication uses the existing revision/concurrency checks. If another session changes the draft or published design, reload and review instead of forcing a stale write. Authorized v5 draft discard requires the current draft token; old clients cannot erase it.

Use revision history to inspect and restore an eligible compatible revision; restoration creates a new published revision. Plan/permission restrictions or operator write kills can make a design read-only. Stored designs and retained media remain preserved. Do not replace a v5 design with an older client or clear unknown fields manually.

## Commerce safety

Presentation settings cannot change server prices, inventory, cart authority, required checkout/consent fields, OTP rules, authentication, tracking access, cancellation or return eligibility. Required controls cannot be hidden. Arbitrary HTML, JavaScript, CSS, selectors and programmable data lookups are unsupported. Images and catalog selections must belong to your store and satisfy public eligibility rules.

The current preview offers finite synthetic states, not live customer/order editing. Vendor/reset subviews retain existing application behavior; not every conditional subview exposes every semantic-part control. Existing theme compositions and required navigation/policy access remain code-owned.
