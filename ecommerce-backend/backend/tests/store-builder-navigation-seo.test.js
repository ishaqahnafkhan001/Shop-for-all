const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const backendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(backendRoot, '..', '..');
const readBackend = (file) => fs.readFileSync(path.join(backendRoot, file), 'utf8');
const readRepo = (file) => fs.readFileSync(path.join(repoRoot, file), 'utf8');

test('vendor dashboard navigation is registry-driven, grouped, and account scoped', () => {
    const registry = readRepo('ecommerce-admin/src/config/dashboardNavigation.jsx');
    const sidebar = readRepo('ecommerce-admin/src/components/dashboard/Sidebar.jsx');

    assert.match(registry, /vendorNavigationGroups/);
    assert.match(registry, /id:\s*'commerce'/);
    assert.match(registry, /id:\s*'marketing'/);
    assert.match(registry, /id:\s*'storefront'/);
    assert.match(registry, /id:\s*'business'/);
    assert.match(registry, /id:\s*'security-support'/);
    assert.match(registry, /path:\s*'\/dashboard\/seo'/);
    assert.match(registry, /permission:\s*'storeBuilder'/);
    assert.match(registry, /ownerOnly:\s*true/);
    assert.match(registry, /vendor-nav:\$\{VENDOR_NAVIGATION_VERSION\}:\$\{userId\}:\$\{role\}/);
    assert.match(sidebar, /filterVendorNavigation/);
    assert.match(sidebar, /aria-expanded/);
    assert.match(sidebar, /visibleExpandedGroups/);
    assert.match(sidebar, /localStorage\.setItem\(storageKey/);
});

test('store builder shell separates navigation, preview, inspector, issues, and history', () => {
    const page = readRepo('ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx');
    const sidebar = readRepo('ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderSidebar.jsx');
    const header = readRepo('ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderHeader.jsx');
    const drawer = readRepo('ecommerce-admin/src/pages/dashboard/StoreBuilder/shell/BuilderDrawer.jsx');
    const inspector = readRepo('ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderEditorPanel.jsx');

    assert.match(page, /StoreBuilderShell/);
    assert.match(sidebar, /Store layout/);
    assert.match(sidebar, /Brand and design/);
    assert.match(sidebar, /Store experience/);
    assert.match(sidebar, /Connections/);
    assert.doesNotMatch(sidebar, /Theme settings/);
    assert.match(sidebar, /getSectionSelectionId/);
    assert.match(sidebar, /Move section up/);
    assert.match(sidebar, /Duplicate section/);
    assert.match(page, /onSelectElement=\{selectEditorTarget\}|selectEditorTarget=\{selectEditorTarget\}/);
    assert.match(header, /Issues \{validationCount \|\| 0\}/);
    assert.match(header, /Version history/);
    assert.match(header, /\['structure', 'Store'\]/);
    assert.match(header, /\['preview', 'Preview'\]/);
    assert.match(header, /\['edit', 'Settings'\]/);
    assert.match(inspector, /2xl:static/);
    assert.match(drawer, /aria-modal="true"/);
    assert.match(drawer, /event\.key === 'Escape'/);
    assert.match(drawer, /returnFocusRef\.current/);
});

test('dynamic Store Builder sections use stable ids for selection and duplication', () => {
    const page = readRepo('ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx');
    const constants = readRepo('ecommerce-admin/src/pages/dashboard/StoreBuilder/storeBuilderConstants.jsx');
    const renderer = readRepo('packages/storefront-renderer/reference/StorefrontSectionRenderer.jsx');

    assert.match(constants, /getSectionSelectionId/);
    assert.match(constants, /target\.startsWith\('section:'\)/);
    assert.match(page, /createBuilderSectionId/);
    assert.match(page, /setActiveElement\(`section:\$\{duplicateId\}`\)/);
    assert.match(renderer, /`section:\$\{stableSectionId\}`/);
});

test('store builder polish keeps editing contextual and preview controls focused', () => {
    const page = readRepo('ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx');
    const sidebar = readRepo('ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderSidebar.jsx');
    const previewPanel = readRepo('ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPreviewPanel.jsx');
    const preview = readRepo('ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx');
    const heroEditor = readRepo('ecommerce-admin/src/pages/dashboard/StoreBuilder/editors/HeroEditor.jsx');
    const sectionsEditor = readRepo('ecommerce-admin/src/pages/dashboard/StoreBuilder/editors/DynamicSectionsEditor.jsx');

    assert.match(sidebar, /Find Store Builder settings/);
    assert.doesNotMatch(sidebar, /navigationMode/);
    assert.match(previewPanel, /DeviceSwitcher/);
    assert.match(previewPanel, /option value="fit">Fit/);
    assert.match(preview, /ResizeObserver/);
    assert.match(preview, /previewZoom === 'fit'/);
    assert.match(heroEditor, /selectedSlideId/);
    assert.match(heroEditor, /Advanced image positioning/);
    assert.match(sectionsEditor, /Section library/);
    assert.match(sectionsEditor, /getSectionIndexFromSelection/);
    assert.doesNotMatch(page, /builderNavigationMode/);
});

test('Homepage SEO routes reuse Store Builder permission, feature, and suspension guards', () => {
    const routes = readBackend('routes/storeBuilderRoutes.js');
    for (const route of [
        '/admin/seo/bootstrap',
        '/admin/seo/draft',
        '/admin/seo/publish'
    ]) assert.match(routes, new RegExp(route.replaceAll('/', '\\/')));
    assert.match(routes, /'\/admin\/seo\/draft'[\s\S]*requirePermission\('storeBuilder'\)[\s\S]*requireShopFeature\('storeBuilder'\)[\s\S]*blockVerificationSuspendedShop/);
    assert.match(routes, /'\/admin\/seo\/publish'[\s\S]*requirePermission\('storeBuilder'\)[\s\S]*requireShopFeature\('storeBuilder'\)[\s\S]*blockVerificationSuspendedShop/);
});

test('Homepage SEO draft and revision records include aliases and shared revision protection', () => {
    const draft = readBackend('models/StoreBuilderDraft.js');
    const revision = readBackend('models/StoreBuilderRevision.js');
    const service = readBackend('services/storeBuilder/storeBuilderSeoService.js');
    const publishService = readBackend('services/storeBuilder/storeBuilderService.js');

    assert.match(draft, /searchAliases:\s*\{ type: \[String\]/);
    assert.match(draft, /basedOnRevision/);
    assert.match(revision, /searchAliases:\s*\{ type: \[String\]/);
    assert.match(revision, /homepage-seo/);
    assert.match(service, /theme:\s*\{ \.\.\.\(shop\.theme \|\| \{\}\), seo: seo \|\| \{\} \}/);
    assert.match(service, /changeScope:\s*'homepage-seo'/);
    assert.match(service, /draftCleanupScope:\s*'seo'/);
    assert.match(publishService, /buildRevisionFilter\(shopId, expected\)/);
    assert.match(publishService, /code = 'THEME_CONFLICT'/);
    assert.match(publishService, /logAudit\([\s\S]*session,[\s\S]*strict:\s*true/);
});

test('standalone Homepage SEO page is deep-linkable and preserves local drafts on conflict', () => {
    const app = readRepo('ecommerce-admin/src/App.jsx');
    const page = readRepo('ecommerce-admin/src/pages/dashboard/Seo/HomepageSeoPage.jsx');
    const hook = readRepo('ecommerce-admin/src/pages/dashboard/Seo/hooks/useHomepageSeo.js');
    const storeBuilderBootstrap = readRepo('ecommerce-admin/src/pages/dashboard/StoreBuilder/hooks/useStoreBuilderBootstrap.js');

    assert.match(app, /path="seo"/);
    assert.match(page, /Search Appearance/);
    assert.match(page, /Search Identity/);
    assert.match(page, /Social Sharing/);
    assert.match(page, /Indexing/);
    assert.match(page, /AI Assistant/);
    assert.match(page, /SEO Health/);
    assert.match(page, /useSearchParams/);
    assert.match(page, /searchParams\.get\('field'\)/);
    assert.match(hook, /\/store-builder\/admin\/seo\/bootstrap/);
    assert.match(hook, /\/store-builder\/admin\/seo\/draft/);
    assert.match(hook, /\/store-builder\/admin\/seo\/publish/);
    assert.match(hook, /payload\.code === 'THEME_CONFLICT'/);
    assert.match(hook, /requestError\.response\?\.status !== 404/);
    assert.match(hook, /buildLegacySeoBootstrap/);
    assert.match(hook, /bootstrap\?\.compatibilityMode/);
    assert.match(page, /Compatibility mode/);
    assert.match(storeBuilderBootstrap, /API\.get\('\/store-builder\/admin'\)/);
    assert.match(page, /Your local SEO draft has been preserved/);
});
