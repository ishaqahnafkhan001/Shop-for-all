import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { rolldown } from 'rolldown';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const filename = fileURLToPath(new URL('../report-visuals-test.cjs', import.meta.url));
const bundle = await rolldown({
    input: fileURLToPath(new URL('../src/components/dashboard/ReportVisuals.jsx', import.meta.url)),
    platform: 'node',
    external: id => ['react', 'react/jsx-runtime', 'lucide-react'].includes(id),
    plugins: [{ name: 'omit-styles', load: id => id.endsWith('.css') ? { code: '', moduleType: 'js' } : null }],
});
const { output } = await bundle.generate({ format: 'cjs' });
await bundle.close();
const compiled = new Module(filename);
compiled.paths = Module._nodeModulePaths(path.dirname(filename));
compiled._compile(output.find(item => item.type === 'chunk' && item.isEntry).code, filename);
const { RankedBars, DistributionRing, ReportHeader, InventoryMovementChart } = compiled.exports;
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));

test('negative financial values extend left of zero and retain their numeric labels', () => {
    const html = render(RankedBars, { signed: true, unit: 'BDT', items: [{ label: 'Gross', value: 100 }, { label: 'Refunds', value: -150 }, { label: 'Net', value: -50 }] });
    assert.match(html, /-150 BDT/);
    assert.match(html, /width:50%;left:0%/);
    assert.match(html, /-50 BDT/);
    assert.doesNotMatch(html, /width:-/);
});

test('empty and zero-only reports show no fabricated chart segments', () => {
    for (const Component of [RankedBars, DistributionRing]) {
        for (const items of [[], [{ label: 'No orders', value: 0 }]]) {
            const html = render(Component, { items });
            assert.match(html, /No recorded/);
            assert.doesNotMatch(html, /<svg|report-bar-track/);
        }
    }
});

test('distribution percentages and segment coverage match recorded counts', () => {
    const html = render(DistributionRing, { items: [{ label: 'Online', value: 3 }, { label: 'POS', value: 1 }], label: 'Orders' });
    assert.match(html, />4<\/strong>/);
    assert.match(html, /75.0%/);
    assert.match(html, /25.0%/);
    assert.match(html, /stroke-dasharray="75 25"/);
    assert.match(html, /stroke-dashoffset="-75"/);
});

test('rankings preserve search details and safely escape customer text', () => {
    const html = render(RankedBars, { items: [{ label: '<script>search</script>', value: 25, detail: '4 zero-result searches' }] });
    assert.match(html, /4 zero-result searches/);
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script>/);
});

test('header renders static content without a 3D control or canvas', () => {
    const html = render(ReportHeader, { eyebrow: 'Store pulse', title: 'Overview', description: 'Recorded metrics' });
    assert.match(html, /<h1>Overview<\/h1>/);
    assert.doesNotMatch(html, /<canvas|Enable 3D/);
});


test('inventory charts show negative stock-out log values as units removed', () => {
    const html = render(InventoryMovementChart, { data: [{ date: '2026-10-23', stockIn: 10, stockOut: -5 }] });
    assert.match(html, /10 in · 5 out/);
    assert.match(html, /width:50%/);
    assert.doesNotMatch(html, /width:-/);
});
