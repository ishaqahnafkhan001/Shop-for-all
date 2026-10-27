'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const admin = createRequire(path.join(root, 'ecommerce-admin/package.json'));
async function main() {
    const { ESLint } = admin('eslint');
    const rules = admin('@eslint/js').configs.recommended.rules;
    const globals = admin('globals').node;
    const initial = JSON.parse(fs.readFileSync(path.join(__dirname, 'task-start.json'))).files;
    const git = 'C:/Program Files/Git/cmd/git.exe';
    const candidates = execFileSync(git, ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: root }).toString().split('\0');
    const crypto = require('node:crypto');
    const files = [...new Set(candidates)].filter(file => /\.(cjs|mjs|js)$/.test(file) && !file.startsWith('output/')
        && fs.existsSync(path.join(root, file)) && crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') !== initial[file]);
    const lint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: [
        { files: ['**/*.cjs', '**/*.js'], languageOptions: { sourceType: 'commonjs', globals }, rules },
        { files: ['**/*.mjs'], languageOptions: { sourceType: 'module', globals }, rules },
    ] });
    const reports = await lint.lintFiles(files);
    fs.writeFileSync(path.join(__dirname, 'focused-lint.log'), (await lint.loadFormatter('stylish')).format(reports) || 'PASS\n');
    let inherited = 0;
    for (const report of reports) {
        const file = path.relative(root, report.filePath).replaceAll('\\', '/');
        let previous;
        try { previous = execFileSync(git, ['show', `HEAD:${file}`], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] }).toString(); }
        catch { continue; }
        const [baseline] = await lint.lintText(previous, { filePath: report.filePath });
        const counts = new Map();
        const key = message => `${message.ruleId}:${message.message}`;
        for (const message of baseline.messages) counts.set(key(message), (counts.get(key(message)) || 0) + 1);
        for (const message of report.messages) if (counts.get(key(message))) { inherited++; counts.set(key(message), counts.get(key(message)) - 1); }
    }
    const summary = { lint: { files: reports.length, errors: reports.reduce((n, r) => n + r.errorCount, 0), warnings: reports.reduce((n, r) => n + r.warningCount, 0), preExisting: inherited } };
    summary.lint.introduced = summary.lint.errors + summary.lint.warnings - inherited;
    const { rolldown } = await import(pathToFileURL(admin.resolve('rolldown')).href);
    const bundle = await rolldown({ input: path.join(root, 'packages/storefront-theme/storage.mjs'), platform: 'browser' });
    try {
        const { output } = await bundle.generate({ format: 'es', codeSplitting: false });
        assert.equal(output.length, 1); assert.equal(output[0].imports.length, 0);
        const exported = await import('data:text/javascript;base64,' + Buffer.from(output[0].code).toString('base64'));
        assert.equal(exported.READABLE_THEME_VERSION, 5);
        assert.equal(exported.normalizeStoredTheme({}).version, 4);
        summary.bundle = { bytes: Buffer.byteLength(output[0].code), externalImports: 0, nodeBrowserTargetSmoke: 'PASS' };
    } finally { await bundle.close(); }
    fs.writeFileSync(path.join(__dirname, 'tooling-results.json'), JSON.stringify(summary, null, 2));
    console.log(summary);
    assert.equal(summary.lint.introduced, 0, 'See focused-lint.log');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
