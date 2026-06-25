const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
    POLICY_TYPES,
    buildDefaultPolicies,
    fillMissingPolicyDefaults,
    getDefaultPolicyText
} = require('../services/policies/defaultPolicyTemplates');

const root = path.resolve(__dirname, '..');
const repoRoot = path.resolve(__dirname, '../../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readRepo = (file) => fs.readFileSync(path.join(repoRoot, file), 'utf8');

test('default policy templates cover refund, shipping, privacy, and terms', () => {
    assert.deepEqual(POLICY_TYPES, ['refund', 'shipping', 'privacy', 'terms']);

    const policies = buildDefaultPolicies({ storeName: 'Byte Shop' });
    for (const type of POLICY_TYPES) {
        assert.equal(typeof policies[type], 'string');
        assert.ok(policies[type].length > 120);
        assert.equal(policies[type].includes('{{STORE_NAME}}'), false);
        assert.ok(policies[type].includes('Byte Shop') || type === 'privacy');
    }

    assert.match(getDefaultPolicyText('refund', { storeName: 'Byte Shop' }), /within 24 hours/);
    assert.match(getDefaultPolicyText('shipping', { storeName: 'Byte Shop' }), /1-3 business days/);
    assert.match(getDefaultPolicyText('privacy', { storeName: 'Byte Shop' }), /do not sell customer personal information/i);
    assert.match(getDefaultPolicyText('terms', { storeName: 'Byte Shop' }), /placing an order/);
});

test('policy default fill only adds missing or empty policies', () => {
    const result = fillMissingPolicyDefaults({
        refund: 'Vendor edited refund policy',
        shipping: '',
        privacy: '   ',
        terms: 'Vendor terms'
    }, { storeName: 'Vendor Store' });

    assert.equal(result.policies.refund, 'Vendor edited refund policy');
    assert.equal(result.policies.terms, 'Vendor terms');
    assert.ok(result.policies.shipping.includes('Vendor Store'));
    assert.ok(result.policies.privacy.includes('Vendor Store'));
    assert.deepEqual(result.added.sort(), ['privacy', 'shipping']);
    assert.deepEqual(result.skipped.sort(), ['refund', 'terms']);
});

test('new shop registration seeds editable default policies', () => {
    const authController = read('controllers/authController.js');

    assert.match(authController, /buildDefaultPolicies/);
    assert.match(authController, /theme:\s*\{[\s\S]*policies:\s*buildDefaultPolicies\(\{\s*storeName:\s*shopName\s*\}\)/);
});

test('store builder and public storefront responses apply missing policy defaults without changing shape', () => {
    const storeBuilderController = read('controllers/storeBuilderController.js');
    const storeController = read('controllers/storeController.js');

    assert.match(storeBuilderController, /fillMissingPolicyDefaults/);
    assert.match(storeBuilderController, /'theme\.policies':\s*policyDefaults\.policies/);
    assert.match(storeController, /applyDefaultPoliciesToShopPayload/);
    assert.match(storeController, /fillMissingPolicyDefaults\(shop\.theme\?\.policies/);
});

test('policy backfill script supports dry-run and does not overwrite edited policies', () => {
    const script = read('scripts/backfillDefaultPolicies.js');
    const packageJson = read('package.json');

    assert.match(script, /--dry-run/);
    assert.match(script, /fillMissingPolicyDefaults/);
    assert.match(script, /theme\.policies/);
    assert.match(script, /shop\.save\(\)/);
    assert.match(packageJson, /"backfill:policies":\s*"node scripts\/backfillDefaultPolicies\.js"/);
});

test('storefront policy pages use default fallback content and reject invalid policy types', () => {
    const policyIndexPage = readRepo('ecommerce-storefront/src/app/[subdomain]/policies/page.jsx');
    const policyPage = readRepo('ecommerce-storefront/src/app/[subdomain]/policies/[type]/page.jsx');
    const policyClient = readRepo('ecommerce-storefront/src/app/[subdomain]/policies/[type]/PolicyPageClient.jsx');
    const defaultPolicies = readRepo('ecommerce-storefront/src/lib/defaultPolicies.js');
    const theme = readRepo('ecommerce-storefront/src/lib/theme.js');

    assert.match(defaultPolicies, /DEFAULT_POLICY_TEMPLATES/);
    assert.match(defaultPolicies, /getPolicyContent/);
    assert.match(theme, /mergePolicies/);
    assert.match(theme, /ensurePolicyNavigationLink/);
    assert.match(theme, /label:\s*'Policies'/);
    assert.match(theme, /url:\s*'\/policies'/);
    assert.match(policyIndexPage, /export async function generateMetadata/);
    assert.match(policyIndexPage, /POLICY_TYPES\.map/);
    assert.match(policyIndexPage, /href=\{`\/policies\/\$\{type\}`\}/);
    assert.match(policyPage, /notFound\(\)/);
    assert.match(policyPage, /getDefaultedPolicyContent/);
    assert.match(policyClient, /getPolicyContent/);
    assert.doesNotMatch(policyClient, /not been configured/);
});
