'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '../../..');
const admin = createRequire(path.join(root, 'ecommerce-admin/package.json'));
async function main() {
    const { ESLint } = admin('eslint');
    const rules = admin('@eslint/js').configs.recommended.rules;
    const globals = admin('globals').node;
    const files = ['adaptive.cjs', 'adaptive.mjs', 'adaptiveData.cjs', 'pageTemplates.cjs', 'pageTemplateValidation.cjs', 'responsiveStyles.cjs', 'pageTemplateCommands.cjs']
        .map(file => 'packages/storefront-theme/' + file).concat([
            'ecommerce-backend/backend/tests/adaptive-page-contract.test.js',
            'ecommerce-backend/backend/tests/fixtures/adaptive-builder/contract-fixtures.cjs',
            'ecommerce-backend/backend/tests/helpers/benchmark-adaptive-contract.cjs',
        ]);
    const lint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: [
        { files: ['**/*.cjs', '**/*.js'], languageOptions: { sourceType: 'commonjs', globals }, rules },
        { files: ['**/*.mjs'], languageOptions: { sourceType: 'module', globals }, rules },
    ] });
    const reports = await lint.lintFiles(files);
    const errors = reports.reduce((sum, report) => sum + report.errorCount, 0);
    const warnings = reports.reduce((sum, report) => sum + report.warningCount, 0);
    fs.writeFileSync(path.join(__dirname, 'focused-lint.log'), (await lint.loadFormatter('stylish')).format(reports) || 'PASS: all new JavaScript modules/tests lint clean.\n');
    assert.equal(errors, 0, 'See focused-lint.log');
    assert.equal(warnings, 0, 'See focused-lint.log');
    const { rolldown } = await import(pathToFileURL(admin.resolve('rolldown')).href);
    const bundle = await rolldown({ input: path.join(root, 'packages/storefront-theme/adaptive.mjs'), platform: 'browser' });
    let code;
    try {
        const { output } = await bundle.generate({ format: 'es', codeSplitting: false });
        assert.equal(output.length, 1); code = output[0].code;
        assert.equal(output[0].imports.length, 0, 'No external runtime dependency');
    } finally { await bundle.close(); }
    const exported = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
    const document = exported.createPageTemplateDocument();
    document.templates.tpl_checkout = exported.createPageTemplate('tpl_checkout', 'checkout');
    document.defaultTemplates.checkout = 'tpl_checkout';
    assert.equal(exported.validatePageTemplates(document).valid, true);
    assert.equal(exported.resolveResponsiveStyles({ node: { base: { visible: false } } }, 'mobile').valid, false);
    const summary = { lint: { files: reports.length, errors, warnings }, browserBundle: {
        bytes: Buffer.byteLength(code), externalImports: 0, syntaxAndPureSmoke: 'PASS',
        limitation: 'Browser-target bundle imported in Node; not a DOM/browser interaction test.',
    } };
    fs.writeFileSync(path.join(__dirname, 'tooling-results.json'), JSON.stringify(summary, null, 2) + '\n');
    console.log(summary);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
