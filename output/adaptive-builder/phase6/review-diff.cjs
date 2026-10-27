'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const initial = JSON.parse(fs.readFileSync(path.join(__dirname, 'task-start.json')));
const manifest = fs.readFileSync(path.join(__dirname, 'changed-files.txt'), 'utf8').trim().split('\n').filter(file => file !== 'track.md');
const git = 'C:/Program Files/Git/cmd/git.exe';
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const unresolved = [], diffs = [];
for (const file of manifest) {
    const saved = path.join(__dirname, 'source-at-start', file);
    let before;
    if (!(file in initial.files)) before = Buffer.alloc(0);
    else if (fs.existsSync(saved)) before = fs.readFileSync(saved);
    else {
        const result = spawnSync(git, ['show', `HEAD:${file}`], { cwd: root, maxBuffer: 10 * 1024 * 1024 });
        const workingCrlf = Buffer.from(result.stdout.toString('utf8').replace(/\r?\n/g, '\r\n'));
        if (result.status === 0 && digest(result.stdout) === initial.files[file]) before = result.stdout;
        else if (result.status === 0 && digest(workingCrlf) === initial.files[file]) before = workingCrlf;
        else {
            // These two files had mixed line endings and were not copied by the
            // scoped start snapshot. Reverse only this task's known edits, and
            // accept reconstruction only when its full hash matches the start.
            let candidate = fs.readFileSync(path.join(root, file), 'utf8');
            let changedLine;
            if (file.endsWith('/account/CustomerTabs.jsx')) {
                candidate = candidate.replace('SecurityTab({ presentationVariant, adaptiveParts = false }', 'SecurityTab({ presentationVariant }')
                    .replace('AccountSecurityView {...{ adaptiveParts, ', 'AccountSecurityView {...{ ');
                changedLine = /(^.*(?:function SecurityTab|AccountSecurityView \{\.\.\.\{).*?)(\r?\n)/gm;
            } else if (file.endsWith('/proxy.js')) {
                candidate = candidate.replace(/    const rewriteTenant = tenant => \{[\s\S]*?    \};\r?\n/, '')
                    .replaceAll('return rewriteTenant(subdomain);', 'return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}`, req.url), options);')
                    .replace('return rewriteTenant(hostname);', 'return NextResponse.rewrite(new URL(`/${hostname}${url.pathname}`, req.url), options);');
                changedLine = /(^.*return NextResponse\.rewrite.*?)(\r?\n)/gm;
            }
            if (changedLine) {
                const count = [...candidate.matchAll(changedLine)].length;
                for (let mask = 0; mask < (1 << count); mask++) {
                    let index = 0;
                    const value = Buffer.from(candidate.replace(changedLine, (_, line) => line + ((mask & (1 << index++)) ? '\r\n' : '\n')));
                    if (digest(value) === initial.files[file]) { before = value; break; }
                }
            }
            if (!before) { unresolved.push(file); continue; }
        }
    }
    const baseline = path.join(__dirname, 'diff-before.tmp');
    fs.writeFileSync(baseline, before);
    const result = spawnSync(git, ['diff', '--no-index', '--no-ext-diff', '--', baseline, path.join(root, file)], { cwd: root, maxBuffer: 10 * 1024 * 1024 });
    diffs.push(`\n# ${file}\n${result.stdout}`);
    fs.unlinkSync(baseline);
}
fs.writeFileSync(path.join(__dirname, 'source-diff.txt'), diffs.join('\n'));
console.log(JSON.stringify({ compared: diffs.length, unresolved }));
if (unresolved.length) process.exitCode = 1;
