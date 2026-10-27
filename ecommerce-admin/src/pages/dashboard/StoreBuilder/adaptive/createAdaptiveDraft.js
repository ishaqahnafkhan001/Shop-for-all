import { createPageTemplate, createPageTemplateDocument, PAGE_KINDS } from '@scaleup/storefront-theme/adaptive';
import { normalizeStoredTheme } from '@scaleup/storefront-theme/storage';

// Explicit opt-in only. Keep the legacy fields for branding and rollback;
// this starter is a new layout, not a lossless conversion of legacy sections.
export function createAdaptiveDraft(theme) {
    const current = normalizeStoredTheme(theme);
    if (current.version === 5) return current;
    const siteBuilder = createPageTemplateDocument();
    for (const kind of PAGE_KINDS) {
        const id = `store_${kind}`;
        siteBuilder.templates[id] = createPageTemplate(id, kind);
        (['header', 'footer'].includes(kind) ? siteBuilder.globals : siteBuilder.defaultTemplates)[kind] = id;
    }
    const home = siteBuilder.templates.store_home;
    home.nodes.home_title = { type: 'content.text', content: { kind: 'heading', text: 'Explore our collection' } };
    home.nodes.home_products = { type: 'catalog.products', source: { kind: 'catalog', limit: 12 } };
    home.rootOrder = ['home_title', 'home_products'];
    return normalizeStoredTheme({ ...current, version: 5, siteBuilder });
}
