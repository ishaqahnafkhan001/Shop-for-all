const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
    normalizeCustomDomain,
    isValidCustomDomain,
    isPlatformDomain,
    getHostnameFromHostHeader,
    getPlatformSubdomainFromHostname,
    isPlatformRootHost
} = require('../utils/domainUtils');
const {
    buildCustomDomainVerificationFields,
    buildExpectedTxtValue,
    checkTxtVerification,
    checkCnameTarget,
    checkRoutingTarget,
    checkDomainDns
} = require('../services/domain/dnsVerificationService');

const root = path.resolve(__dirname, '..');
const projectRoot = path.resolve(__dirname, '../../..');
const readBackend = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readProject = (file) => fs.readFileSync(path.join(projectRoot, file), 'utf8');

test('custom domain utilities normalize and validate hostnames safely', () => {
    assert.equal(normalizeCustomDomain(' https://WWW.Example.com/products/a?x=1#top '), 'www.example.com');
    assert.equal(normalizeCustomDomain('shop.example.com:443'), 'shop.example.com');
    assert.equal(getHostnameFromHostHeader('byte101.localhost:3000'), 'byte101.localhost');
    assert.equal(getPlatformSubdomainFromHostname('byte101.scaleup.codes'), 'byte101');
    assert.equal(getPlatformSubdomainFromHostname('byte101.localhost:3000'), 'byte101');

    assert.equal(isValidCustomDomain('mybrand.com'), true);
    assert.equal(isValidCustomDomain('www.mybrand.com'), true);
    assert.equal(isValidCustomDomain('shop.mybrand.com'), true);
    assert.equal(isValidCustomDomain('localhost'), false);
    assert.equal(isValidCustomDomain('127.0.0.1'), false);
    assert.equal(isValidCustomDomain('bad_domain.com'), false);
    assert.equal(isValidCustomDomain('উদাহরণ.com'), false);

    assert.equal(isPlatformDomain('scaleup.codes'), true);
    assert.equal(isPlatformDomain('www.scaleup.codes'), true);
    assert.equal(isPlatformDomain('byte101.scaleup.codes'), true);
    assert.equal(isValidCustomDomain('byte101.scaleup.codes'), false);
    assert.equal(isPlatformRootHost('scaleup.codes'), true);
});

test('backend custom-domain routing and persistence guards are wired', () => {
    const tenant = readBackend('middlewares/tenant.js');
    const storeBuilder = readBackend('controllers/storeBuilderController.js');
    const customDomainController = readBackend('controllers/customDomainController.js');
    const dnsService = readBackend('services/domain/dnsVerificationService.js');
    const superAdmin = readBackend('controllers/superAdminController.js');
    const storeBuilderRoutes = readBackend('routes/storeBuilderRoutes.js');
    const superAdminRoutes = readBackend('routes/superAdminRoutes.js');
    const auth = readBackend('controllers/authController.js');
    const analytics = readBackend('controllers/analyticsEventController.js');
    const shop = readBackend('models/Shop.js');
    const domainUtils = readBackend('utils/domainUtils.js');
    const storefrontServer = readProject('ecommerce-storefront/src/lib/storefrontServer.js');
    const storefrontApi = readProject('ecommerce-storefront/src/api/api.js');

    assert.match(tenant, /buildVerifiedCustomDomainQuery\(customDomain\)/);
    assert.match(tenant, /customDomainFromHost/);
    assert.match(tenant, /buildVerifiedCustomDomainQuery\(customDomainFromHost\)/);
    assert.match(domainUtils, /'customDomain\.status': 'Verified'/);
    assert.match(domainUtils, /'customDomain\.ownershipVerified': true/);
    assert.match(domainUtils, /'customDomain\.routingVerified': true/);
    assert.match(domainUtils, /'customDomain\.manuallyVerifiedRouting': true/);
    assert.match(tenant, /req\.tenantType = tenantType/);

    assert.match(storeBuilder, /normalizeCustomDomain\(customDomain\)/);
    assert.match(storeBuilder, /'customDomain\.status'] = 'PendingVerification'/);
    assert.match(storeBuilder, /buildCustomDomainVerificationFields\(req\.tenantId, normalizedDomain\)/);
    assert.match(storeBuilder, /This domain is already connected to another shop/);
    assert.match(storeBuilder, /Platform domains cannot be used as store custom domains/);
    assert.match(storeBuilderRoutes, /router\.post\(\s*'\/admin\/custom-domain\/check'/);

    assert.match(superAdmin, /status === 'Verified'/);
    assert.match(superAdmin, /OwnershipVerified/);
    assert.match(superAdmin, /RoutingPending/);
    assert.match(superAdmin, /manualRoutingVerification/);
    assert.match(superAdmin, /assertCustomDomainAvailable\(existingDomain, shop\._id\)/);
    assert.match(superAdmin, /customDomainWarnings/);
    assert.match(superAdminRoutes, /router\.post\('\/domains\/:shopId\/check-dns',\s*checkSuperAdminCustomDomainDns\)/);
    assert.match(customDomainController, /checkVendorCustomDomainDns/);
    assert.match(customDomainController, /checkSuperAdminCustomDomainDns/);
    assert.match(customDomainController, /Shop\.findById\(req\.tenantId\)/);
    assert.match(customDomainController, /checkDomainDns\(domain, shop\.customDomain/);
    assert.match(customDomainController, /DNS_CHECK_COOLDOWN/);
    assert.match(dnsService, /dns'\)\.promises/);
    assert.match(dnsService, /resolveTxt/);
    assert.match(dnsService, /resolveCname/);

    assert.match(auth, /findShopByTenantIdentifier/);
    assert.match(auth, /buildVerifiedCustomDomainQuery\(cleanIdentifier\)/);
    assert.match(analytics, /buildVerifiedCustomDomainQuery\(subdomain\)/);
    assert.match(shop, /shopSchema\.index\(\{ 'customDomain\.domain': 1 \}, \{[\s\S]*unique: true/);
    assert.match(shop, /OwnershipVerified/);
    assert.match(shop, /RoutingPending/);
    assert.match(shop, /ownershipVerified/);
    assert.match(shop, /routingVerified/);
    assert.match(shop, /manuallyVerifiedRouting/);
    assert.match(shop, /verificationToken/);
    assert.match(shop, /expectedTxtValue/);
    assert.match(shop, /lastDnsRecords/);
    assert.match(storefrontServer, /'x-storefront-host'/);
    assert.match(storefrontServer, /storefrontHost/);
    assert.match(storefrontServer, /cache = 'no-store'/);
    assert.match(storefrontApi, /window\.location\.hostname/);
    assert.match(storefrontApi, /\['x-storefront-host'\]/);
});

test('custom-domain DNS verification helpers build and validate TXT/CNAME records', async () => {
    const fields = buildCustomDomainVerificationFields('64f000000000000000000001', 'www.mybrand.com');
    assert.equal(fields.verificationMethod, 'TXT');
    assert.match(fields.verificationToken, /^[a-f0-9]{32}$/);
    assert.equal(fields.expectedTxtValue, buildExpectedTxtValue(fields.verificationToken));

    const expected = buildExpectedTxtValue('abc123');
    const resolver = {
        resolveTxt: async (host) => {
            if (host === '_scaleup.www.mybrand.com') return [[expected]];
            throw Object.assign(new Error('not found'), { code: 'ENODATA' });
        },
        resolveCname: async () => ['shops.scaleup.codes.'],
        resolve4: async () => ['203.0.113.10']
    };

    const txt = await checkTxtVerification('www.mybrand.com', expected, resolver);
    assert.equal(txt.verified, true);
    assert.deepEqual(txt.records, [expected]);

    const cname = await checkCnameTarget('www.mybrand.com', 'shops.scaleup.codes', resolver);
    assert.equal(cname.verified, true);
    assert.deepEqual(cname.records, ['shops.scaleup.codes']);

    const routing = await checkRoutingTarget('www.mybrand.com', 'shops.scaleup.codes', resolver);
    assert.equal(routing.verified, true);
    assert.equal(routing.code, 'ROUTING_VERIFIED');

    const full = await checkDomainDns('www.mybrand.com', {
        verificationToken: 'abc123',
        expectedTxtValue: expected,
        dnsTarget: 'shops.scaleup.codes'
    }, resolver);
    assert.equal(full.verified, true);
    assert.equal(full.ownershipVerified, true);
    assert.equal(full.routingVerified, true);
});

test('custom-domain DNS verification separates ownership from routing readiness', async () => {
    const missingTxtResolver = {
        resolveTxt: async () => {
            throw Object.assign(new Error('not found'), { code: 'ENODATA' });
        },
        resolveCname: async () => ['shops.scaleup.codes.'],
        resolve4: async () => []
    };
    const missingTxt = await checkDomainDns('www.mybrand.com', {
        verificationToken: 'abc123',
        expectedTxtValue: buildExpectedTxtValue('abc123'),
        dnsTarget: 'shops.scaleup.codes'
    }, missingTxtResolver);
    assert.equal(missingTxt.verified, false);
    assert.equal(missingTxt.code, 'TXT_MISSING');
    assert.equal(missingTxt.ownershipVerified, false);

    const wrongCnameResolver = {
        resolveTxt: async () => [[buildExpectedTxtValue('abc123')]],
        resolveCname: async () => ['wrong.example.com.'],
        resolve4: async () => []
    };
    const wrongCname = await checkDomainDns('www.mybrand.com', {
        verificationToken: 'abc123',
        expectedTxtValue: buildExpectedTxtValue('abc123'),
        dnsTarget: 'shops.scaleup.codes'
    }, wrongCnameResolver);
    assert.equal(wrongCname.verified, false);
    assert.equal(wrongCname.ownershipVerified, true);
    assert.equal(wrongCname.routingVerified, false);
    assert.equal(wrongCname.code, 'CNAME_MISMATCH');

    const previousDnsTarget = process.env.CUSTOM_DOMAIN_DNS_TARGET;
    delete process.env.CUSTOM_DOMAIN_DNS_TARGET;
    try {
        const noTarget = await checkDomainDns('www.mybrand.com', {
            verificationToken: 'abc123',
            expectedTxtValue: buildExpectedTxtValue('abc123'),
            dnsTarget: ''
        }, wrongCnameResolver);
        assert.equal(noTarget.verified, false);
        assert.equal(noTarget.ownershipVerified, true);
        assert.equal(noTarget.routingVerified, false);
        assert.equal(noTarget.code, 'DNS_TARGET_MISSING');
    } finally {
        if (previousDnsTarget === undefined) delete process.env.CUSTOM_DOMAIN_DNS_TARGET;
        else process.env.CUSTOM_DOMAIN_DNS_TARGET = previousDnsTarget;
    }

    const apexHostTarget = await checkDomainDns('mybrand.com', {
        verificationToken: 'abc123',
        expectedTxtValue: buildExpectedTxtValue('abc123'),
        dnsTarget: 'shops.scaleup.codes'
    }, wrongCnameResolver);
    assert.equal(apexHostTarget.verified, false);
    assert.equal(apexHostTarget.ownershipVerified, true);
    assert.equal(apexHostTarget.routingVerified, false);
    assert.equal(apexHostTarget.code, 'APEX_ROUTING_MANUAL');
});

test('storefront middleware and API proxy preserve custom-domain host context', () => {
    const middleware = readProject('ecommerce-storefront/src/middleware.js');
    const proxy = readProject('ecommerce-storefront/src/app/api/[...path]/route.js');
    const authContext = readProject('ecommerce-storefront/src/context/AuthContext.js');
    const seo = readProject('ecommerce-storefront/src/lib/seo.js');
    const homepage = readProject('ecommerce-storefront/src/app/[subdomain]/page.jsx');

    assert.match(middleware, /RESERVED_HOSTS/);
    assert.match(middleware, /hostname\.endsWith\(`\.\$\{PLATFORM_DOMAIN\}`\)/);
    assert.match(middleware, /return NextResponse\.rewrite\(new URL\(`\/\$\{hostname\}\$\{url\.pathname\}`/);
    assert.match(proxy, /headers\.set\('x-storefront-host', hostname\)/);
    assert.match(homepage, /storefrontHost:\s*host/);
    assert.match(authContext, /return reservedHosts\.includes\(hostname\) \? '' : hostname/);
    assert.match(seo, /isCustomDomainFullyVerified/);
    assert.match(seo, /customDomain\?\.ownershipVerified === true/);
    assert.match(seo, /customDomain\?\.routingVerified === true/);
    assert.match(seo, /customDomain\?\.manuallyVerifiedRouting === true/);
});
