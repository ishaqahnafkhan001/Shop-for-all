'use strict';
const { performance } = require('node:perf_hooks');
const { loadAdaptiveRenderer } = require('./adaptive-renderer.cjs');
const { sizedFixture } = require('../fixtures/adaptive-builder/contract-fixtures.cjs');
const { renderDocument, pageData, fixtureActions, tokens } = require('../fixtures/adaptive-builder/render-fixtures.cjs');
const stats = samples => { const sorted = [...samples].sort((x, y) => x - y); return { medianMs: sorted[Math.floor(sorted.length / 2)], p95Ms: sorted[Math.floor(sorted.length * 0.95)] }; };
async function main() {
    const h = await loadAdaptiveRenderer();
    const cases = [['small', sizedFixture(14)], ['representative', renderDocument()], ['near-node-limit', sizedFixture(200)]];
    const results = [];
    for (const [name, document] of cases) {
        const resolve = () => h.ui.resolveAdaptivePage({ siteBuilder: document, pageKind: 'home', colorTokens: tokens });
        for (let n = 0; n < 20; n++) resolve();
        const resolution = [], rendering = [];
        const before = process.memoryUsage().heapUsed;
        let plan, html;
        for (let n = 0; n < 100; n++) {
            const start = performance.now(), result = resolve();
            resolution.push(performance.now() - start);
            if (!result.valid) throw new Error(JSON.stringify(result.errors));
            plan = result.value;
        }
        for (let n = 0; n < 100; n++) {
            const start = performance.now();
            html = h.render(h.React.createElement(h.ui.PageTemplateRenderer, { plan, pageKind: 'home', data: pageData('home'), actions: fixtureActions() }));
            rendering.push(performance.now() - start);
        }
        const css = h.ui.compileAdaptiveStyles(plan, 'ab_1234');
        results.push({ name, documentNodes: Object.values(document.templates).reduce((sum, template) => sum + Object.keys(template.nodes).length, 0),
            activePageNodes: Object.keys(plan.nodes).length, documentBytes: Buffer.byteLength(JSON.stringify(document)),
            resolution: stats(resolution), ssrIncludingCss: stats(rendering), markupBytes: Buffer.byteLength(html), cssBytes: Buffer.byteLength(css),
            observedHeapDeltaBytes: process.memoryUsage().heapUsed - before });
    }
    console.log(JSON.stringify({ node: process.version, platform: process.platform, arch: process.arch, warmups: 20, samples: 100,
        heapNote: 'Unforced GC; delta is observational, not retained allocation or peak memory.', results }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
