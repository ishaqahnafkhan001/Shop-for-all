'use strict';

const { assertStoreBuilderUpdateAllowed, mergeThemePatch, normalizeTheme } = require('@scaleup/storefront-theme');
const { getShopPlanAccess } = require('../billing/planAccessService');

const ATELIER_ID = 'atelier-editorial';
const json = value => JSON.parse(JSON.stringify(value || {}));
const reserved = theme => theme?.presentationVariant === ATELIER_ID
    || String(theme?.preset?.id || '').trim().toLowerCase() === ATELIER_ID;
const identity = theme => {
    const preset = theme?.preset;
    const timestamp = preset?.appliedAt == null ? NaN : Date.parse(preset.appliedAt);
    return JSON.stringify([theme?.presentationVariant || null, preset?.id || null,
        Number(preset?.version) || null, Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null]);
};
const configuredList = name => new Set(String(process.env[name] || '').split(',').map(value => value.trim()).filter(Boolean));

// Called only with server-derived access. No tenant IDs or rollout settings are
// returned to the browser. General eligibility is deliberately empty by default.
const getThemeAvailability = ({ shop, planAccess }) => {
    const mode = process.env.ATELIER_EDITORIAL_ROLLOUT || 'off';
    const access = planAccess?.storeBuilderAccess;
    const allowlisted = mode === 'allowlist' && /^[a-f0-9]{24}$/i.test(String(shop?._id || ''))
        && configuredList('ATELIER_EDITORIAL_TEST_SHOP_IDS').has(String(shop._id));
    const approvedPlan = mode === 'on' && Boolean(planAccess?.planKey)
        && configuredList('ATELIER_EDITORIAL_APPROVED_PLAN_KEYS').has(planAccess.planKey);
    const available = ['full', 'limited'].includes(access) && (allowlisted || approvedPlan);
    return { [ATELIER_ID]: {
        available,
        application: access === 'full' ? 'complete' : 'appearance-only',
        developmentOnly: mode === 'allowlist',
        reason: available ? '' : 'Atelier Editorial is not available for this store.'
    } };
};

const reject = () => {
    const error = new Error('Atelier Editorial is not available for this store.');
    error.statusCode = 403;
    error.code = 'THEME_NOT_AVAILABLE';
    throw error;
};

const assertThemeAvailability = async ({ shop, rawTheme, targetTheme, changeScope }) => {
    const current = json(shop?.theme);
    const raw = json(rawTheme);
    const target = json(targetTheme);
    if (!reserved(raw) && !reserved(target)) {
        // SEO endpoints must never remove a protected presentation identity.
        if (changeScope === 'homepage-seo' && reserved(current) && identity(current) !== identity(target)) reject();
        return;
    }
    if (changeScope === 'homepage-seo' && identity(current) !== identity(target)) reject();

    // Check the raw patch merged against trusted persisted state as well as the
    // actual normalized snapshot. Omitted fields cannot conceal an adoption.
    const merged = normalizeTheme(mergeThemePatch(current, raw));
    if (reserved(current) && identity(current) === identity(target)
        && (!reserved(raw) || identity(current) === identity(merged))) return;

    for (const snapshot of [raw, target]) {
        if (String(snapshot.preset?.id || '').trim().toLowerCase() === ATELIER_ID
            && Number(snapshot.preset?.version) !== 1) reject();
    }

    // Fetch policy here, never from a request or optional caller-supplied plan.
    const planAccess = await getShopPlanAccess(shop._id);
    const availability = getThemeAvailability({ shop, planAccess })[ATELIER_ID];
    if (!availability.available) reject();
    // Retain existing limited-plan structural boundaries, including direct
    // service and SEO callers. Appearance-only application cannot set the marker.
    if (planAccess.storeBuilderAccess !== 'full'
        && (target.presentationVariant || null) !== (current.presentationVariant || null)) reject();
    assertStoreBuilderUpdateAllowed({ currentTheme: current, incomingTheme: target,
        planAccess, completeSnapshot: true });
};

module.exports = { getThemeAvailability, assertThemeAvailability };
