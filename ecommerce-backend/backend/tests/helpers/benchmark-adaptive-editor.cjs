'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { loadAdaptiveEditor } = require('./adaptive-editor.cjs');
const { sizedFixture } = require('../fixtures/adaptive-builder/contract-fixtures.cjs');
const { normalizeStoredTheme } = require('@scaleup/storefront-theme/storage');
const { tokens } = require('../fixtures/adaptive-builder/editor-fixtures.cjs');
async function main() {
    const h = await loadAdaptiveEditor(), results = [];
    const measure = (fn, iterations = 100) => { const values = []; for (let n = 0; n < iterations; n++) { const start = performance.now(); fn(); values.push(performance.now() - start); } values.sort((a, b) => a - b); return { medianMs: values[Math.floor(values.length / 2)], p95Ms: values[Math.floor(values.length * .95)] }; };
    for (const count of [14, 80, 200]) {
        const theme = normalizeStoredTheme({ version: 5, siteBuilder: sizedFixture(count) });
        const document = theme.siteBuilder, tree = document.templates.tpl_home;
        const nodeId = Object.keys(tree.nodes).find(id => tree.nodes[id].type === 'content.text');
        const snapshot = { theme, searchAliases: [], customDomain: {}, storewideDiscount: 0 };
        const serialized = h.ui.stableStringify(snapshot);
        const plan = h.ui.resolveAdaptivePage({ siteBuilder: document, pageKind: 'home', colorTokens: tokens }).value;
        const edit = () => { const result = h.ui.applyAdaptiveEdit(theme, { kind: 'setStyle', templateId: 'tpl_home', nodeId, tier: 'desktop', property: 'fontSize', value: { unit: 'px', value: 28 } }); if (!result.valid) throw new Error(JSON.stringify(result.errors)); };
        edit();
        results.push({ count, homeNodes: Object.keys(tree.nodes).length, snapshotUtf8Bytes: Buffer.byteLength(serialized),
            max30HistoryStringsUtf16Bytes: serialized.length * 2 * 30,
            selection: measure(() => h.ui.validateSelection(document, { templateId: 'tpl_home', nodeId, partId: null, viewport: 'desktop' })),
            tree: measure(() => h.ui.flattenTree(tree)), serialization: measure(() => h.ui.stableStringify(snapshot)), validatedEdit: measure(edit),
            resolution: measure(() => h.ui.resolveAdaptivePage({ siteBuilder: document, pageKind: 'home', colorTokens: tokens })),
            ssrPreview: measure(() => h.render(h.React.createElement(h.ui.PageTemplateRenderer, { plan, pageKind: 'home' })), 20) });
    }
    const report = { environment: 'Local Node, warm repeated operations; browser timings recorded separately.', history: '30 past snapshots, not measured browser heap; reports retained string data only, excluding current/future/object overhead.', results };
    fs.writeFileSync(path.resolve(__dirname, '../../../../output/adaptive-builder/phase4/editor-performance.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
