// Explicit inactive entry: never re-export from the legacy renderer root.
// Only PageTemplateRenderer owns the client boundary; plan/style APIs are pure.
export { PageTemplateRenderer } from './PageTemplateRenderer.jsx';
export { resolveAdaptivePage, ADAPTIVE_RENDERED_PAGES, ADAPTIVE_RENDER_CAPABILITIES } from './pagePlan.js';
export { compileAdaptiveStyles } from './styleCompiler.js';
