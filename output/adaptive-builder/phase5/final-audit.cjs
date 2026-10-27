'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const git = 'C:/Program Files/Git/cmd/git.exe';
const initial = JSON.parse(fs.readFileSync(path.join(__dirname, 'task-start.json')));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const existingChanges = [], missing = [];
for (const [file, before] of Object.entries(initial.files)) {
    if (!fs.existsSync(path.join(root, file))) missing.push(file);
    else if (hash(file) !== before) existingChanges.push(file);
}
const names = [...new Set(execFileSync(git, ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: root }).toString().split('\0').filter(Boolean))];
const added = names.filter(file => !(file in initial.files) && !file.startsWith('output/') && fs.existsSync(path.join(root, file)));
const changed = [...existingChanges, ...added].sort();
const sourceHashes = Object.fromEntries(changed.map(file => [file, hash(file)]));
const protectedFailures = existingChanges.filter(file => /^output\/adaptive-builder\/phase[0-4]\//.test(file) || /prebuilt\.cjs|baseline-manifest\.json/.test(file));
const whitespaceFailures = changed.filter(file => /\.(?:[cm]?js|jsx|css|md)$/.test(file)).flatMap(file => fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/).flatMap((line, i) => /[ \t]+$/.test(line) ? [`${file}:${i + 1}`] : []));
const report = { revision: execFileSync(git, ['rev-parse', 'HEAD'], { cwd: root }).toString().trim(), initialRevision: initial.revision,
    initialFileCount: Object.keys(initial.files).length, existingChanges, added, missing, protectedFailures, whitespaceFailures,
    frozenManifestSha256: hash('ecommerce-backend/backend/tests/fixtures/adaptive-builder/baseline-manifest.json'), sourceHashes };
const priorTracker = fs.readFileSync(path.join(root, 'track.md'), 'utf8').split('<!-- TRACK_BEFORE_PHASE5 -->\n\n')[1];
report.priorTrackerPreserved = priorTracker !== undefined && crypto.createHash('sha256').update(priorTracker).digest('hex') === initial.files['track.md'];
fs.writeFileSync(path.join(__dirname, 'integrity.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(__dirname, 'changed-files.txt'), changed.join('\n') + '\n');
const artifacts = {};
const walk = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) walk(file); else if (entry.name !== 'artifact-sha256.json') artifacts[path.relative(__dirname, file).replaceAll('\\', '/')] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); } };
walk(__dirname);
fs.writeFileSync(path.join(__dirname, 'artifact-sha256.json'), JSON.stringify(artifacts, null, 2));
console.log(JSON.stringify({ existingChanges, added, missing, protectedFailures, whitespaceFailures, revisionUnchanged: report.revision === initial.revision }));
if (missing.length || protectedFailures.length || whitespaceFailures.length || report.revision !== initial.revision || !report.priorTrackerPreserved) process.exitCode = 1;
