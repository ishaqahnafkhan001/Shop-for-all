'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const admin = createRequire(path.join(root, 'ecommerce-admin/package.json'));
const storefront = createRequire(path.join(root, 'ecommerce-storefront/package.json'));
const { loadAdaptiveRenderer } = require(path.join(root, 'ecommerce-backend/backend/tests/helpers/adaptive-renderer.cjs'));
async function main() {
    const { ESLint } = admin('eslint');
    const globals = admin('globals');
    const react = storefront('eslint-plugin-react');
    const initial = JSON.parse(fs.readFileSync(path.join(__dirname, 'task-start.json'))).files;
    const git = 'C:/Program Files/Git/cmd/git.exe';
    const files = [...new Set(execFileSync(git, ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: root }).toString().split('\0'))]
        .filter(file => /\.(cjs|mjs|js|jsx)$/.test(file) && !file.startsWith('output/') && fs.existsSync(path.join(root, file))
            && crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') !== initial[file]);
    const lint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: [{ files: ['**/*.{js,jsx,cjs,mjs}'],
        languageOptions: { sourceType: 'module', globals: { ...globals.browser, ...globals.node }, parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins: { react, '@next/next': storefront('@next/eslint-plugin-next') }, rules: { ...admin('@eslint/js').configs.recommended.rules, '@next/next/no-img-element': 'warn', 'react/jsx-uses-react': 'error', 'react/jsx-uses-vars': 'error' } }] });
    const reports = await lint.lintFiles(files);
    fs.writeFileSync(path.join(__dirname, 'focused-lint.log'), (await lint.loadFormatter('stylish')).format(reports) || 'PASS\n');
    const summary = { lint: { files: files.length, errors: reports.reduce((n, report) => n + report.errorCount, 0), warnings: reports.reduce((n, report) => n + report.warningCount, 0) } };
    // Report pre-existing diagnostics in touched source-inspection tests without
    // deleting their assertions or suppressing lint rules.
    const existingDiagnostics = [], introducedDiagnostics = [], originalSourceChecks = {};
    for (const report of reports.filter(report => report.messages.length)) {
        const relative = path.relative(root, report.filePath).replaceAll('\\', '/');
        let original = '';
        try { const saved = path.join(__dirname, 'source-at-start', relative); if (fs.existsSync(saved)) original = fs.readFileSync(saved, 'utf8'); else original = execFileSync(git, ['show', `${JSON.parse(fs.readFileSync(path.join(__dirname, 'task-start.json'))).revision}:${relative}`], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch { /* New source has no baseline. */ }
        originalSourceChecks[relative] = Boolean(original) && [original, original.replace(/\r?\n/g, '\r\n')]
            .some(value => crypto.createHash('sha256').update(value).digest('hex') === initial[relative]);
        const old = original ? (await lint.lintText(original, { filePath: report.filePath }))[0].messages : [];
        for (const message of report.messages) {
            const position = old.findIndex(previous => previous.ruleId === message.ruleId && previous.message === message.message);
            const item = { file: relative, rule: message.ruleId, message: message.message, line: message.line };
            if (position >= 0) { old.splice(position, 1); existingDiagnostics.push(item); } else introducedDiagnostics.push(item);
        }
    }
    summary.lint.preExisting = existingDiagnostics.length; summary.lint.introduced = introducedDiagnostics.length;
    fs.writeFileSync(path.join(__dirname, 'lint-delta.json'), JSON.stringify({ originalSourceChecks, existingDiagnostics, introducedDiagnostics }, null, 2));
    const { rolldown } = await import(pathToFileURL(admin.resolve('rolldown')));
    const bundle = await rolldown({ input: path.join(root, 'packages/storefront-renderer/adaptive/index.jsx'), platform: 'browser',
        external: ['react', 'react/jsx-runtime', 'react-dom', 'lucide-react'],
        plugins: [{ name: 'workspace-theme', resolveId(id) {
            if (id === '@scaleup/storefront-theme/adaptive') return path.join(root, 'packages/storefront-theme/adaptive.mjs');
            if (id === '@scaleup/storefront-theme') return path.join(root, 'packages/storefront-theme/index.mjs');
            return null;
        } }] });
    try {
        const { output } = await bundle.generate({ format: 'es', codeSplitting: false });
        fs.writeFileSync(path.join(__dirname, 'renderer-browser-entry.mjs'), output[0].code);
        summary.bundle = { browserEntryBytes: Buffer.byteLength(output[0].code), externalImports: output[0].imports,
            note: 'Explicit dynamically loaded entry for approved v5 pages only; dependencies external.' };
    } finally { await bundle.close(); }
    const cjs = await loadAdaptiveRenderer(), esm = await loadAdaptiveRenderer('es');
    fs.writeFileSync(path.join(__dirname, 'renderer-node-entry.mjs'), esm.code);
    execFileSync(process.execPath, ['--check', path.join(__dirname, 'renderer-node-entry.mjs')]);
    const esmUi = await import(pathToFileURL(path.join(__dirname, 'renderer-node-entry.mjs')).href);
    const fixtures = require(path.join(root, 'ecommerce-backend/backend/tests/fixtures/adaptive-builder/render-fixtures.cjs'));
    const { remediationDocument } = require(path.join(root, 'ecommerce-backend/backend/tests/fixtures/adaptive-builder/remediation-fixtures.cjs'));
    const contract = require(path.join(root, 'packages/storefront-theme/adaptive.cjs'));
    const allPages = require(path.join(root, 'ecommerce-backend/backend/tests/fixtures/adaptive-builder/contract-fixtures.cjs')).fixture();
    const parityCases = contract.PAGE_KINDS.map(pageKind => ({ pageKind, siteBuilder: allPages }));
    for (const mode of ['light', 'dark', 'custom', 'edge']) for (const pageKind of ['product', 'checkout']) parityCases.push({ pageKind, siteBuilder: remediationDocument(mode) });
    for (const entry of parityCases) {
        const input = { ...entry, colorTokens: fixtures.tokens };
        const cjsPlan = cjs.ui.resolveAdaptivePage(input).value, esmPlan = esmUi.resolveAdaptivePage(input).value;
        require('node:assert/strict').deepEqual(esmPlan, cjsPlan);
        require('node:assert/strict').equal(esmUi.compileAdaptiveStyles(esmPlan, 'ab_1234'), cjs.ui.compileAdaptiveStyles(cjsPlan, 'ab_1234'));
    }
    require('node:assert/strict').deepEqual(esmUi.ADAPTIVE_RENDER_CAPABILITIES, cjs.ui.ADAPTIVE_RENDER_CAPABILITIES);
    summary.moduleChecks = { cjsSsrLoad: typeof cjs.ui.PageTemplateRenderer === 'function', esmSyntax: 'PASS', esmCjsPlanAndCssParity: `PASS (${parityCases.length} page/palette cases and capabilities)` };
    fs.writeFileSync(path.join(__dirname, 'tooling-results.json'), JSON.stringify(summary, null, 2));
    console.log(summary);
    if (summary.lint.errors || summary.lint.warnings) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
