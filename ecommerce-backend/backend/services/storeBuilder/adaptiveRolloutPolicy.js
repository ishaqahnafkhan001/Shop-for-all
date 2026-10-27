'use strict';
const { createHash } = require('node:crypto');
// Merchant editing is paused pending further product work. Environment flags
// cannot lift this hold; published rendering remains independently controlled.
const ADAPTIVE_EDITOR_RELEASE_HOLD = true;

// Process configuration is an operator control, never a request/merchant field.
// An approval reference records authorization; it is not a password or API key.
const readAdaptiveRollout = (env = process.env) => {
    const mode = env.ADAPTIVE_BUILDER_ROLLOUT || 'off';
    const approval = env.ADAPTIVE_BUILDER_APPROVAL || '';
    const rawIds = env.ADAPTIVE_BUILDER_SHOP_IDS || '';
    const ids = rawIds ? rawIds.split(',').map(value => value.trim().toLowerCase()) : [];
    const valid = ['off', 'pilot', 'all'].includes(mode)
        && (!rawIds || (ids.length <= 100 && ids.every(id => /^[a-f0-9]{24}$/.test(id))))
        && ['off', 'on', undefined].includes(env.ADAPTIVE_BUILDER_WRITES)
        && ['off', 'on', undefined].includes(env.ADAPTIVE_BUILDER_RENDERING);
    const approved = /^[a-zA-Z0-9][a-zA-Z0-9._/-]{7,79}$/.test(approval);
    const enabled = valid && approved && mode !== 'off' && (mode !== 'pilot' || ids.length > 0);
    const writes = !ADAPTIVE_EDITOR_RELEASE_HOLD && enabled && env.ADAPTIVE_BUILDER_WRITES === 'on';
    const rendering = enabled && env.ADAPTIVE_BUILDER_RENDERING === 'on';
    const fingerprint = createHash('sha256').update(JSON.stringify({ mode, approved, valid, ids: [...new Set(ids)].sort(), writes, rendering })).digest('hex').slice(0, 20);
    return { mode: valid ? mode : 'off', valid, approved, tenantCount: new Set(ids).size, enabled, writes, rendering, fingerprint,
        allows: shopId => enabled && (mode === 'all' || ids.includes(String(shopId).toLowerCase())) };
};
const getAdaptiveAvailability = ({ shopId, planAccess } = {}) => {
    const policy = readAdaptiveRollout();
    const eligible = ['full', 'limited'].includes(planAccess?.storeBuilderAccess) && planAccess.isOperational === true && planAccess.shopOperational === true && planAccess.features?.storeBuilder === true;
    const allowed = eligible && policy.allows(shopId);
    return { available: Boolean(allowed && policy.writes), rendering: Boolean(allowed && policy.rendering), enabled: policy.enabled,
        reason: !policy.enabled ? 'ADAPTIVE_ENTITLEMENT_NOT_APPROVED' : !eligible ? 'ADAPTIVE_ACCESS_REQUIRED'
            : !policy.allows(shopId) ? 'ADAPTIVE_TENANT_NOT_APPROVED' : !policy.writes ? 'ADAPTIVE_WRITES_DISABLED' : null };
};
module.exports = { readAdaptiveRollout, getAdaptiveAvailability, ADAPTIVE_EDITOR_RELEASE_HOLD };
