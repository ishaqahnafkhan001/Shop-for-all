'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..'), git = 'C:/Program Files/Git/cmd/git.exe';
const target = path.join(__dirname, 'task-start.json');
if (fs.existsSync(target)) throw new Error('Preserve the original Phase 6 start record.');
const names = new Set(execFileSync(git, ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: root }).toString().split('\0').filter(Boolean));
function walk(dir) { for (const item of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, item.name); if (item.isDirectory()) walk(file); else names.add(path.relative(root, file).replaceAll('\\', '/')); } }
for (let phase = 0; phase <= 5; phase++) walk(path.join(root, 'output/adaptive-builder/phase' + phase));
const protectedOutput = file => file.startsWith('output/adaptive-builder/phase6/') || file.startsWith('output/adaptive-builder/phase7/');
const files = Object.fromEntries([...names].filter(file => !protectedOutput(file) && fs.existsSync(path.join(root, file)))
    .map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
fs.writeFileSync(target, JSON.stringify({ at: new Date().toISOString(), revision: execFileSync(git, ['rev-parse', 'HEAD'], { cwd: root }).toString().trim(),
    status: execFileSync(git, ['status', '--short'], { cwd: root }).toString(), files }, null, 2));
// Preserve reviewable originals only for the scoped code/doc areas. No .env,
// database contents, secrets, dependency directories or production media.
const scoped = /^(packages\/storefront-(?:theme|renderer)\/|ecommerce-admin\/src\/(?:App.jsx|pages\/dashboard\/StoreBuilder)|ecommerce-backend\/backend\/(?:services\/storeBuilder\/|services\/billing\/storeBuilderPlanService.js|controllers\/(?:storeBuilderController|storeController|publicController).js|tests\/|models\/storeBuilderThemeContract.js)|ecommerce-storefront\/src\/(?:app\/\[subdomain\]\/|components\/storefront\/|components\/product\/ProductDetails.jsx|lib\/storefront)|track.md$)/;
let copied = 0;
for (const file of Object.keys(files).filter(file => scoped.test(file) && /\.(?:[cm]?js|jsx|json|css|md)$/.test(file))) {
    const copy = path.join(__dirname, 'source-at-start', file); fs.mkdirSync(path.dirname(copy), { recursive: true }); fs.copyFileSync(path.join(root, file), copy); copied++;
}
console.log({ revision: JSON.parse(fs.readFileSync(target)).revision, hashed: Object.keys(files).length, scopedOriginals: copied });
