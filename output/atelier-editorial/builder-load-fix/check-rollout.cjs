const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '../../..');
const backend = path.join(root, 'ecommerce-backend/backend');
const requireBackend = createRequire(path.join(backend, 'package.json'));
requireBackend('dotenv').config({ path: path.join(backend, '.env'), quiet: true });
const { PLAN_ORDER, PLAN_DEFINITIONS } = requireBackend('./config/subscriptionPlans');
const { getThemeAvailability } = requireBackend('./services/storeBuilder/themeAvailabilityService');
(async () => {
  assert.equal(process.env.ATELIER_EDITORIAL_ROLLOUT, 'on');
  const { getAvailableGalleryThemes } = await import(pathToFileURL(path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder/themes/themeAvailability.js')));
  const results = [];
  for (const planKey of PLAN_ORDER) {
    const storeBuilderAccess = PLAN_DEFINITIONS[planKey].storeBuilderAccess;
    for (const shopId of ['100000000000000000000001', '100000000000000000000002']) {
      const policy = getThemeAvailability({ shop: { _id: shopId }, planAccess: { planKey, storeBuilderAccess } });
      const atelier = policy['atelier-editorial'];
      const expected = ['limited', 'full'].includes(storeBuilderAccess);
      assert.equal(atelier.available, expected);
      assert.equal(atelier.developmentOnly, false);
      assert.equal(getAvailableGalleryThemes(policy).length, expected ? 10 : 9);
    }
    results.push({ planKey, access: storeBuilderAccess, atelierAvailable: storeBuilderAccess !== 'none', galleryThemes: storeBuilderAccess === 'none' ? 9 : 10, application: storeBuilderAccess === 'full' ? 'complete' : 'appearance-only' });
  }
  console.log(JSON.stringify({ mode: 'on', twoIndependentSyntheticTenantsChecked: true, results }, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
