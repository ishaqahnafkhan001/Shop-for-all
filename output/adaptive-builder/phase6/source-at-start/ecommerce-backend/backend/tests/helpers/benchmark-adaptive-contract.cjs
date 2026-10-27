'use strict';

// Opt-in local benchmark; only synthetic pure calls, no persistence or transports.
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const a = require('@scaleup/storefront-theme/adaptive');
const legacy = require('@scaleup/storefront-theme');
const existingSnapshots = require('../fixtures/atelier-legacy/contracts.json')
    .concat(require('../fixtures/adaptive-builder/baseline-manifest.json').capture.atelierSnapshot);
const { sizedFixture } = require('../fixtures/adaptive-builder/contract-fixtures.cjs');
function measure(callback, iterations) {
    for (let i = 0; i < 20; i++) callback();
    const timings = [];
    for (let i = 0; i < iterations; i++) { const start = performance.now(); callback(); timings.push(performance.now() - start); }
    timings.sort((left, right) => left - right);
    return { iterations, medianMs: timings[Math.floor(timings.length / 2)], p95Ms: timings[Math.floor(timings.length * 0.95)] };
}
const validation = [
    { label: 'small', nodes: 14 }, { label: 'medium', nodes: 80 }, { label: 'near-node-limit', nodes: 200 }, { label: 'near-byte-limit', nodes: 200 },
].map(({ label, nodes }) => {
    const document = sizedFixture(nodes);
    if (label === 'near-byte-limit') for (const template of Object.values(document.templates)) for (const node of Object.values(template.nodes)) {
        if (node.type === 'content.text') node.content.text = 'Synthetic long merchant content. '.repeat(33);
    }
    const before = JSON.stringify(document);
    const complete = { ...legacy.FALLBACK_THEME, version: 5, siteBuilder: document };
    assert.equal(a.validatePageTemplates(document).valid, true);
    assert.equal(a.validateCompleteThemeBudget(complete).valid, true);
    const existingThemeBudgetChecks = label === 'near-byte-limit' ? existingSnapshots.map(snapshot => {
        const candidate = { ...snapshot.rawPublishedSnapshot, version: 5, siteBuilder: document };
        const result = a.validateCompleteThemeBudget(candidate);
        assert.equal(result.valid, true, snapshot.id + ' whole-theme budget');
        return { id: snapshot.id, bytes: result.bytes };
    }) : undefined;
    const timing = measure(() => assert.equal(a.validatePageTemplates(document).valid, true), 100);
    assert.equal(JSON.stringify(document), before);
    return { label, nodes, templates: Object.keys(document.templates).length, graphBytes: Buffer.byteLength(before), completeThemeBytes: Buffer.byteLength(JSON.stringify(complete)),
        ...(existingThemeBudgetChecks ? { existingThemeBudgetChecks } : {}), ...timing };
});
const layers = { page: { base: { fontSize: { unit: 'px', value: 16 } }, desktop: { color: { hex: '#111827' } } },
    preset: { base: { fontWeight: 400 } }, node: { base: { paddingBlockStart: { unit: 'px', value: 0 }, visible: false }, tablet: { fontSize: { unit: 'px', value: 20 } } },
    part: { base: { textAlign: 'start' } } };
const resolution = measure(() => {
    for (const tier of ['base', 'tablet', 'desktop']) assert.equal(a.resolveResponsiveStyles(layers, tier).valid, true);
}, 1000);
console.log(JSON.stringify({ runtime: process.version, kind: 'Local synthetic microbenchmark, not production latency or a test threshold', validation,
    resolution: { callsPerIteration: 3, ...resolution } }, null, 2));
