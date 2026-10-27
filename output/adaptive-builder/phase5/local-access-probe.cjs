'use strict';
const fs = require('node:fs');
async function main() {
    const ui = await fetch('http://127.0.0.1:5185/dashboard/adaptive-builder-preview');
    const moduleResponse = await fetch('http://127.0.0.1:5185/src/pages/dashboard/StoreBuilder/adaptive/AdaptiveStoreEditor.jsx');
    const api = 'http://127.0.0.1:4008/api';
    const login = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:5185' },
        body: JSON.stringify({ email: 'vendor-a@launch.example.com', password: 'LaunchPass@123' }) });
    const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    const response = await fetch(`${api}/store-builder/admin/development-preview`, { headers: { cookie } });
    const body = await response.json();
    const legacy = await fetch(`${api}/store-builder/admin/bootstrap`, { headers: { cookie } });
    const data = await legacy.json();
    const result = { at: new Date().toISOString(), uiUrl: ui.url, uiHttpStatus: ui.status, editorModuleTransformStatus: moduleResponse.status,
        syntheticPasswordLoginStatus: login.status, grantStatus: response.status, grantScope: body.grant?.scope, publication: body.grant?.publication,
        normalBuilderStatus: legacy.status, normalAdoptionAvailable: data.bootstrap?.adaptiveAvailability?.available,
        browserVerification: 'BLOCKED: CUA reports Local browser use is disabled in Work settings. HTTP/auth/module-transform checks do not prove interactive access or hydration.',
        actual200PercentZoom: 'BLOCKED: no approved browser surface available.' };
    fs.writeFileSync(`${__dirname}/local-access.json`, JSON.stringify(result, null, 2)); console.log(result);
    if ([ui.status, moduleResponse.status, login.status, response.status, legacy.status].some(status => status !== 200) || body.grant?.publication !== false || data.bootstrap?.adaptiveAvailability?.available !== false) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
