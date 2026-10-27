'use strict';
if (process.env.SFA_ISOLATED_ACCEPTANCE !== 'c085454b' || process.env.NODE_ENV !== 'test') throw new Error('Isolated diagnostics only.');
const fs = require('node:fs');
const path = require('node:path');
const backend = path.resolve(__dirname, '../../../ecommerce-backend/backend');
const { createRequire } = require('node:module');
const load = createRequire(path.join(backend, 'package.json'));
const { createLaunchSafetyContext } = load('./tests/helpers/launchSafetyHarness');
const contract = load('@scaleup/storefront-theme');
const { normalizeThemeForShop } = load('./services/storeBuilder/storeBuilderService');
async function main() {
    const cleanup = [];
    const ctx = await createLaunchSafetyContext({ after: callback => cleanup.push(callback) });
    try {
        const shop = ctx.data.shops.shopA;
        const result = {};
        try { contract.normalizeTheme({ ...shop.theme }); result.rawMongooseSpread = 'unexpected success'; }
        catch (error) { result.rawMongooseSpread = { name: error.name, message: error.message, enumerableKeys: Object.keys({ ...shop.theme }) }; }
        result.plainMongooseVersion = contract.normalizeTheme(JSON.parse(JSON.stringify(shop.theme))).version;
        const current = await load('./models/Shop').findById(shop._id).lean();
        const patch = { typography: { headingFont: 'Arial', bodyFont: 'Inter', headingWeight: '700' } };
        const normalized = await normalizeThemeForShop(patch, current);
        const access = { storeBuilderAccess: 'limited' };
        contract.assertStoreBuilderUpdateAllowed({ currentTheme: current.theme, incomingTheme: patch, planAccess: access });
        try { contract.assertStoreBuilderUpdateAllowed({ currentTheme: current.theme, incomingTheme: normalized, planAccess: access, completeSnapshot: true }); }
        catch (error) { result.limitedFinalCandidate = { code: error.code, capability: error.capability, message: error.message }; }
        const before = contract.normalizeTheme(current.theme), after = contract.normalizeTheme(normalized);
        result.changedRestrictedFields = ['layout', 'productGridStyle', 'homepageSections'].filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
        result.homepageSectionIds = { before: before.homepageSections.map(section => section.id), after: after.homepageSections.map(section => section.id) };
        result.note = 'Diagnostic of existing failures only. No legacy assertions or production plan rules changed.';
        fs.writeFileSync(path.join(__dirname, 'legacy-boundary-diagnosis.json'), JSON.stringify(result, null, 2));
        console.log(result);
    } finally { for (const close of cleanup.reverse()) await close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
