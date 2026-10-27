'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const git = 'C:/Program Files/Git/cmd/git.exe';
const names = new Set(execFileSync(git, ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: root }).toString().split('\0').filter(Boolean));
function walk(dir) { for (const item of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, item.name); if (item.isDirectory()) walk(full); else names.add(path.relative(root, full).replaceAll('\\', '/')); } }
for (const phase of ['phase0', 'phase1', 'phase2', 'phase3']) walk(path.join(root, 'output/adaptive-builder', phase));
const files = Object.fromEntries([...names].filter(name => !name.startsWith('output/adaptive-builder/phase4/') && fs.existsSync(path.join(root, name)))
    .map(name => [name, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex')]));
const target = path.join(__dirname, 'task-start.json');
if (fs.existsSync(target)) throw new Error('Preserve existing Phase 4 start record.');
fs.writeFileSync(target, JSON.stringify({ at: new Date().toISOString(), revision: execFileSync(git, ['rev-parse', 'HEAD'], { cwd: root }).toString().trim(),
    status: execFileSync(git, ['status', '--short'], { cwd: root }).toString(), files }, null, 2));
let fixture = fs.readFileSync(path.join(root, 'ecommerce-backend/backend/tests/helpers/adaptive-browser.cjs'), 'utf8');
fixture = fixture.replace("require('./adaptive-renderer.cjs')", `require(${JSON.stringify(path.join(root, 'ecommerce-backend/backend/tests/helpers/adaptive-renderer.cjs'))})`)
    .replace("path.join(__dirname, '../fixtures/adaptive-builder/browser-fixture.jsx')", "path.join(root, 'ecommerce-backend/backend/tests/fixtures/adaptive-builder/browser-fixture.jsx')")
    .replace('output/adaptive-builder/phase3/remediation/browser', 'output/adaptive-builder/phase4/prerequisite/browser');
fs.writeFileSync(path.join(__dirname, 'prerequisite-server.cjs'), fixture);
console.log({ files: Object.keys(files).length, revision: 'recorded', sourceChanges: 0 });
