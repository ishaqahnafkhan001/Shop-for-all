'use strict';
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const responsibility = file => {
    if (file === 'track.md') return 'Phase 5 status, evidence, limitations and stop condition.';
    if (file.endsWith('App.jsx') || file.endsWith('/StoreBuilder.jsx')) return 'DEV-only preview entry within existing authentication, permission and feature routes.';
    if (file.endsWith('developmentPreviewAccess.js') || file.endsWith('storeBuilderRoutes.js')) return 'Read-only local-development authorization grant; unchanged adoption policy.';
    if (file.includes('DevelopmentStoreBuilderPage')) return 'Authorized synthetic transport wrapper around the actual StoreBuilderPage.';
    if (file.includes('developmentTransport')) return 'Scoped browser-local draft transport, CAS, format preservation and blocked network mutations.';
    if (file.includes('previewState') || file.endsWith('.svg')) return 'Code-owned synthetic data/state/no-op ports or local preview image.';
    if (file.includes('AdaptiveStoreEditor')) return 'Twelve page groups, state selector, shared preview data, safe page/part selection.';
    if (file.includes('AdaptiveInspector')) return 'Registry-driven contextual parts, responsive controls and explicit protected-core limitations.';
    if (file.includes('adaptiveEditorState')) return 'All registered editor regions and labels; existing immutable command/selection primitives.';
    if (file.includes('/tests/')) {
        if (file.includes('development-server')) return 'Verified disposable fixture server using real auth and mocked external transports.';
        if (file.includes('benchmark')) return 'Synthetic whole-site validation/serialization/render benchmark; no browser claims.';
        if (file.includes('integration/adaptive-full-site')) return 'Real isolated auth/tenant/plan/default-deny grant and multi-page draft/CAS integration tests.';
        if (file.endsWith('adaptive-full-site.test.js')) return '116 synthetic full-site rendering/state/core/command/privacy/parity/recovery checks.';
        if (file.includes('/helpers/adaptive-editor')) return 'Existing isolated renderer harness exports for new previews/transport/adapters.';
        return 'Preserved functional assertions follow moved presentation modules, injected default API or newly supported page adapters.';
    }
    if (file.includes('/StoreBuilder/hooks/')) return 'Optional injected API/recovery scope; default existing production transport and queue remain.';
    if (file.endsWith('StoreBuilderHeader.jsx')) return 'Disabled publication action and local-only label for the synthetic workspace.';
    if (file.endsWith('StoreBuilderPage.jsx')) return 'Reuse existing state/history/autosave with injected preview transport and publication/upload barriers.';
    if (file.includes('ecommerce-storefront/')) return 'Delegate existing presentation JSX to shared pure views; retain route/controller/hook/business ownership.';
    if (file.endsWith('ProtectedCore.jsx')) return 'Trusted all-page presentation adapters; verified access required for private account/tracking state.';
    if (file.endsWith('pagePlan.js')) return 'Advertise twelve implemented adapters; resolve trusted per-part capabilities.';
    if (file.endsWith('corePalette.js')) return 'Code-owned semantic paint/contrast contexts for remaining page families.';
    if (file.endsWith('styleCompiler.js')) return 'Scoped typed media/grid/layout declarations, responsive protected layouts and typography.';
    if (file.includes('storefront-theme/')) return 'Additive protected semantic parts and trusted media/grid capabilities; unchanged structural invariants/limits.';
    if (file.endsWith('package.json')) return 'Export pure shared policy-data module; no dependency or version change.';
    if (file.endsWith('policyData.js')) return 'Shared existing policy labels and saved/default plain-text content selection.';
    if (/Account|CategoryView|CollectionView|TrackingView|PolicyIndexView/.test(file)) return 'Moved existing pure view JSX plus opt-in semantic markers; no API-owning controller.';
    return 'Opt-in registered semantic parts/forwarding for existing shared presentation; legacy markup unchanged.';
};
const files = fs.readFileSync(path.join(__dirname, 'changed-files.txt'), 'utf8').trim().split('\n');
fs.writeFileSync(path.join(__dirname, 'changed-file-responsibilities.md'), '# Exact Phase 5 changed files\n\nPaths relative to `C:/Users/user/WebstormProjects/Shop-for-all`. Evidence/build artifacts are separately enumerated in `artifact-sha256.json`.\n\n| Path | Responsibility |\n|---|---|\n' + files.map(file => `| [${file}](${root.replaceAll('\\', '/')}/${file}) | ${responsibility(file)} |`).join('\n') + '\n');
