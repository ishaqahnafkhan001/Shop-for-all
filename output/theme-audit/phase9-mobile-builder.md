# Phase 9 - Mobile Store Builder UX

## Status

Implementation finished; final visual recheck remains open. The Admin build and
156 existing focused regression tests pass. Browser interaction checks completed
before the continuation, but browser security policy rejected reconnecting to the
local fixture afterward. No alternate browser or policy workaround was attempted.

## Changes

- Compact mobile header keeps Undo, Redo, Publish and More visible. Themes and
  Issues remain accessible in More; publish-blocking issues have a direct action.
- Existing Store / Preview / Settings navigation now identifies the current view,
  associates buttons with panels, focuses the selected panel and scrolls it below
  the measured sticky header. The inspector adds Back to Store.
- Preview pages use a compact dropdown below the desktop Builder breakpoint.
  The existing desktop page buttons remain available. Phones initially preview
  the 320px storefront; choosing another device remains explicit and is not reset
  when the browser resizes.
- Builder buttons have at least 44px touch targets on smaller screens. Text
  fields, selects and textareas have 16px text and a 44px minimum height.
  These styles are scoped to the Builder, outside the preview iframe.
- Issues/history drawers become bottom sheets on phones and retain their side
  panel on larger screens. They use safe-area padding, preserve focus through
  parent renders, trap Tab, close on Escape and restore trigger focus.
- Drawer scroll locking covers both body scrolling and the dashboard's nested
  scroll container. Overflow styles are restored on close.
- More supports arrow-key/Home/End navigation and Escape. Preview selection
  toolbar buttons now have 44px minimum heights.
- A scoped body minimum-width correction addresses a 15px overflow found at a
  320px Windows viewport with a scrollbar. Its final browser recheck is pending.

## Architecture and files

Theme data, validation, history, autosave, plan checks and publishing remain in the
existing StoreBuilderPage and service flow. The new `useMobileWorkspace` hook is
view navigation only. No alternate mobile theme model, schema or command system.

All application changes are under `ecommerce-admin`:

- `src/pages/dashboard/StoreBuilder/StoreBuilderHeader.jsx`
- `StoreBuilderSidebar.jsx`, `StoreBuilderEditorPanel.jsx`, `StoreBuilderPreviewPanel.jsx`
- `StoreBuilderPage.jsx`, `StorefrontPreview.jsx`
- `hooks/useMobileWorkspace.js`, `hooks/usePreviewMode.js`
- `shell/StoreBuilderShell.jsx`, `shell/BuilderDrawer.jsx`
- `src/index.css`
- `tests/fixtures/builder-mobile.html` and `builder-mobile.jsx`

## Verification evidence

- `phase9-tests.txt`: 156 passed, zero failed/skipped. Existing theme control,
  normalization, compatibility and isolated publication regressions remain green.
- `phase9-admin-build.txt`: production build passed after the final source changes.
- `phase9-diff-check.txt`: whitespace check passed, with line-ending notices only.
- Synthetic browser fixture used actual Header, Sidebar, Inspector, PreviewPanel,
  Drawer, mobile navigation hook, preview-mode hook, Typography/Mobile editors,
  theme edit helper and shared storefront renderer.
- At 390px: select Typography from Store, select Georgia, switch to Preview.
  The preview heading computed font was Georgia and the status became Unpublished
  changes. Selecting Edit Hero Banner in the iframe opened the hero inspector.
- More opened with focus on Choose a theme. Version history opened the shared
  drawer. At 390x844 it measured bottom 844px, height 251px and top corner radius
  16px. Body scrolling was locked.
- A drawer action triggered a parent render without stealing focus. Tab from the
  last action wrapped to Close. Escape removed the dialog, restored the previous
  body overflow and returned focus to More Store Builder actions.

Measured before the final minimum-width fix:

| Viewport | Workspaces | Minimum visible Builder button height | Focus and placement | Horizontal overflow |
| --- | --- | --- | --- | --- |
| 320px | Store, Settings, Preview | 44px | Correct panel; below sticky header | 15px on scrolling views; cause fixed, recheck pending |
| 390px | Store, Settings, Preview | 44px | Correct panel; below sticky header | None |
| 768px | Store, Settings, Preview | 44px | Correct panel; below sticky header | None |
| 1180px | Store, Settings, Preview | 44px | Correct panel; below sticky header | None |

## Remaining checks and limits

The browser reconnect was rejected by browser security policy for the local
fixture URL. Therefore no final screenshot was saved, and the final 320px fix and
nested dashboard scroll lock have not been rechecked in a browser. Recheck these
in the authenticated Builder, including a real mobile keyboard and safe areas.

Fixture publication/history callbacks are explicitly stubs. It verifies UI
routing, not real undo history, authentication, database publication, asset uploads
or tenant isolation. Actual publishing and history handlers were not replaced.
The earlier authenticated database acceptance gate remains open. No database write,
deployment, commit or additional agent was used. Temporary viewport sizing was reset.

## Next

Close the two visual checks when browser access is available. Next implementation
phase: Phase 10, audit all nine themes across presentation, customization, data,
responsive layouts and storefront routes, with the outstanding live gates explicit.
