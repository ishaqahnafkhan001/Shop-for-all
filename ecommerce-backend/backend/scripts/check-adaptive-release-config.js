'use strict';
// Read-only configuration check. No database connection or merchant enablement.
require('dotenv').config({ quiet: true });
const { readAdaptiveRollout, ADAPTIVE_EDITOR_RELEASE_HOLD } = require('../services/storeBuilder/adaptiveRolloutPolicy');
const policy = readAdaptiveRollout();
console.log(JSON.stringify({ configuration: policy.valid ? 'PASS' : 'FAIL', mode: policy.mode, enabled: policy.enabled,
    approvalPresent: policy.approved, pilotTenantCount: policy.tenantCount, writes: policy.writes, rendering: policy.rendering,
    editorReleaseHold: ADAPTIVE_EDITOR_RELEASE_HOLD,
    policyFingerprint: policy.fingerprint, productionAuthorization: 'NOT VERIFIED',
    requirements: ['All instances must use identical policy', 'Reader-first deployment', 'MongoDB transactions and indexes', 'Explicit tenant and product approval', 'Browser/accessibility acceptance'],
}, null, 2));
if (!policy.valid) process.exitCode = 1;
