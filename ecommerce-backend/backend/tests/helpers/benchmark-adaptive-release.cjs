'use strict';
const fs = require('node:fs'), path = require('node:path');
const { performance } = require('node:perf_hooks');
const { loadAdaptiveEditor } = require('./adaptive-editor.cjs');
const { sizedFixture } = require('../fixtures/adaptive-builder/contract-fixtures.cjs');
const { normalizeStoredTheme } = require('@scaleup/storefront-theme/storage');
async function main() {
    const h = await loadAdaptiveEditor(), bootstrap = h.ui.createPreviewBootstrap(), results = [];
    const measure = (fn, count = 30) => { const values = []; for (let i = 0; i < count; i++) { const start = performance.now(); fn(); values.push(performance.now() - start); } values.sort((a, b) => a - b); return { medianMs: values[Math.floor(count / 2)], p95Ms: values[Math.floor(count * .95)] }; };
    for (const count of [14, 80, 200]) {
        const theme = normalizeStoredTheme({ version: 5, siteBuilder: sizedFixture(count) }), tokens = h.ui.editorTokens(theme);
        const snapshot = h.ui.stableStringify({ theme, searchAliases: [], customDomain: {}, storewideDiscount: 0 });
        const resolve = kind => { const result = h.ui.resolveAdaptivePage({ siteBuilder: theme.siteBuilder, pageKind: kind, colorTokens: tokens }); if (!result.valid) throw new Error(JSON.stringify(result.errors)); return result.value; };
        const productPlan = resolve('product'), data = { core: h.ui.createPreviewCore('product', 'normal', { theme, shop: bootstrap.shop }) };
        const edit = () => { const result = h.ui.applyAdaptiveEdit(theme, { kind: 'setStyle', templateId: 'tpl_product', nodeId: 'core_tpl_product', partId: 'title', tier: 'desktop', property: 'fontSize', value: { unit: 'px', value: 28 } }); if (!result.valid) throw new Error(JSON.stringify(result.errors)); };
        results.push({ count, snapshotUtf8Bytes: Buffer.byteLength(snapshot), max30HistoryStringsUtf16Bytes: snapshot.length * 2 * 30,
            serialization: measure(() => h.ui.stableStringify({ theme, searchAliases: [], customDomain: {}, storewideDiscount: 0 })),
            validatedInspectorEdit: measure(edit), resolveAll12Pages: measure(() => Object.keys(h.ui.PREVIEW_SCENARIOS).forEach(resolve), 10),
            styleCompilation: measure(() => h.ui.compileAdaptiveStyles(productPlan, 'ab_1234')),
            productSsrPreview: measure(() => h.render(h.React.createElement(h.ui.PageTemplateRenderer, { plan: productPlan, pageKind: 'product', data, actions: h.ui.PREVIEW_ACTIONS }))) });
    }
    const report = { environment: 'Local Node synthetic repeated operations. Pure Node timings only; browser observations are recorded separately. These are not Web Vitals.',
        history: 'Retained 30 past JSON strings only; excludes current/future snapshots and object/React/browser overhead.', results };
    fs.writeFileSync(path.resolve(__dirname, '../../../../output/adaptive-builder/phase6/performance.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
