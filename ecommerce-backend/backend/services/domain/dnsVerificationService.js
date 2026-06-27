const crypto = require('crypto');
const dns = require('dns').promises;

const { normalizeCustomDomain } = require('../../utils/domainUtils');

const DEFAULT_VERIFICATION_METHOD = 'TXT';
const VERIFICATION_PREFIX = 'scaleup-verification=';

const getConfiguredDnsTarget = () => normalizeDnsTarget(process.env.CUSTOM_DOMAIN_DNS_TARGET || '');

const normalizeDnsTarget = (target = '') => normalizeCustomDomain(String(target || '').replace(/\.+$/g, ''));

const buildVerificationToken = (shopId, domain) => {
    const seed = `${shopId || 'shop'}:${normalizeCustomDomain(domain)}:${Date.now()}:${crypto.randomBytes(16).toString('hex')}`;
    return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32);
};

const buildExpectedTxtValue = (token = '') => `${VERIFICATION_PREFIX}${String(token || '').trim()}`;

const buildCustomDomainVerificationFields = (shopId, domain) => {
    const verificationToken = buildVerificationToken(shopId, domain);
    return {
        verificationToken,
        verificationMethod: DEFAULT_VERIFICATION_METHOD,
        dnsTarget: getConfiguredDnsTarget(),
        expectedTxtValue: buildExpectedTxtValue(verificationToken),
        ownershipVerified: false,
        routingVerified: false,
        manuallyVerifiedRouting: false,
        lastDnsCheckStatus: 'not_checked',
        lastDnsCheckError: '',
        lastOwnershipCheckStatus: 'not_checked',
        lastRoutingCheckStatus: 'not_checked',
        lastDnsRecords: { txt: [], cname: [], a: [] }
    };
};

const flattenTxtRecords = (records = []) => records
    .map(record => Array.isArray(record) ? record.join('') : String(record || ''))
    .map(record => record.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);

const normalizeCnameRecords = (records = []) => records
    .map(record => normalizeDnsTarget(record))
    .filter(Boolean);

const isSubdomainHost = (domain = '') => normalizeCustomDomain(domain).split('.').filter(Boolean).length > 2;
const isIpv4Target = (target = '') => {
    const parts = String(target || '').trim().split('.');
    return parts.length === 4 && parts.every(part => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
};

const summarizeDnsError = (error) => {
    const code = error?.code || '';
    if (['ENOTFOUND', 'ENODATA', 'ENODOMAIN', 'NOTFOUND'].includes(code)) {
        return 'DNS record was not found yet. DNS changes may take time to appear.';
    }
    if (['ETIMEOUT', 'ESERVFAIL', 'ECONNREFUSED'].includes(code)) {
        return 'DNS lookup timed out or the DNS provider did not respond. Please try again later.';
    }
    return 'DNS verification failed. Please check the DNS record and try again.';
};

const safeResolve = async (resolver, method, hostname) => {
    try {
        const records = await resolver[method](hostname);
        return { records: Array.isArray(records) ? records : [], error: null };
    } catch (error) {
        return { records: [], error };
    }
};

const checkTxtVerification = async (domain, expectedValue, resolver = dns) => {
    const cleanDomain = normalizeCustomDomain(domain);
    const expected = String(expectedValue || '').trim();
    const hosts = [cleanDomain, `_scaleup.${cleanDomain}`].filter(Boolean);
    const results = await Promise.all(hosts.map(host => safeResolve(resolver, 'resolveTxt', host)));
    const records = flattenTxtRecords(results.flatMap(result => result.records));
    const verified = Boolean(expected) && records.includes(expected);
    const firstError = results.find(result => result.error)?.error || null;

    return {
        verified,
        records,
        error: verified ? '' : summarizeDnsError(firstError)
    };
};

const checkCnameTarget = async (domain, expectedTarget, resolver = dns) => {
    const target = normalizeDnsTarget(expectedTarget);
    if (!target) {
        return {
            checked: false,
            verified: false,
            records: [],
            error: 'DNS target is not configured for the platform yet.'
        };
    }

    const result = await safeResolve(resolver, 'resolveCname', normalizeCustomDomain(domain));
    const records = normalizeCnameRecords(result.records);
    const verified = records.includes(target);

    return {
        checked: true,
        verified,
        records,
        error: verified ? '' : summarizeDnsError(result.error)
    };
};

const getARecords = async (domain, resolver = dns) => {
    const result = await safeResolve(resolver, 'resolve4', normalizeCustomDomain(domain));
    return result.records.map(record => String(record || '')).filter(Boolean);
};

const checkARecordTarget = async (domain, expectedTarget, resolver = dns) => {
    const target = String(expectedTarget || '').trim();
    if (!isIpv4Target(target)) {
        return {
            checked: false,
            verified: false,
            records: [],
            error: 'Root domain routing requires hosting/DNS setup and Super Admin review.'
        };
    }

    const records = await getARecords(domain, resolver);
    const verified = records.includes(target);
    return {
        checked: true,
        verified,
        records,
        error: verified ? '' : 'Ownership is verified, but the root domain is not pointed to the required platform IP yet.'
    };
};

const checkRoutingTarget = async (domain, expectedTarget, resolver = dns) => {
    const cleanDomain = normalizeCustomDomain(domain);
    const target = normalizeDnsTarget(expectedTarget);
    if (!target) {
        return {
            checked: false,
            verified: false,
            records: { cname: [], a: [] },
            code: 'DNS_TARGET_MISSING',
            status: 'dns_target_missing',
            message: 'Ownership verified, but DNS routing target is not configured. Contact support to connect this domain.',
            error: 'DNS target is not configured for the platform yet.'
        };
    }

    const cname = await checkCnameTarget(cleanDomain, target, resolver);
    const a = await getARecords(cleanDomain, resolver);
    if (cname.verified) {
        return {
            checked: true,
            verified: true,
            records: { cname: cname.records, a },
            code: 'ROUTING_VERIFIED',
            status: 'routing_verified',
            message: 'Domain routing is connected.',
            error: ''
        };
    }

    if (!isSubdomainHost(cleanDomain)) {
        const aCheck = await checkARecordTarget(cleanDomain, target, resolver);
        if (aCheck.verified) {
            return {
                checked: true,
                verified: true,
                records: { cname: cname.records, a: aCheck.records },
                code: 'ROUTING_VERIFIED',
                status: 'routing_verified',
                message: 'Domain routing is connected.',
                error: ''
            };
        }

        return {
            checked: aCheck.checked,
            verified: false,
            records: { cname: cname.records, a: aCheck.records.length ? aCheck.records : a },
            code: aCheck.checked ? 'A_MISMATCH' : 'APEX_ROUTING_MANUAL',
            status: aCheck.checked ? 'routing_pending' : 'apex_routing_manual',
            message: aCheck.checked
                ? 'Ownership verified, but the root domain is not pointed to Scaleup yet.'
                : 'Ownership verified. Root domain routing requires hosting/DNS setup and Super Admin review.',
            error: aCheck.error || cname.error
        };
    }

    return {
        checked: true,
        verified: false,
        records: { cname: cname.records, a },
        code: 'CNAME_MISMATCH',
        status: 'routing_pending',
        message: 'Ownership verified, but the domain is not pointed to Scaleup yet.',
        error: cname.error
    };
};

const checkDomainDns = async (domain, customDomainConfig = {}, resolver = dns) => {
    const cleanDomain = normalizeCustomDomain(domain);
    const expectedTxtValue = customDomainConfig.expectedTxtValue ||
        buildExpectedTxtValue(customDomainConfig.verificationToken);
    const dnsTarget = normalizeDnsTarget(customDomainConfig.dnsTarget || getConfiguredDnsTarget());
    const txt = await checkTxtVerification(cleanDomain, expectedTxtValue, resolver);

    let records = {
        txt: txt.records,
        cname: [],
        a: []
    };

    if (!txt.verified) {
        return {
            verified: false,
            ownershipVerified: false,
            routingVerified: false,
            routingRequired: true,
            code: 'TXT_MISSING',
            status: 'txt_missing',
            message: 'TXT ownership record was not found yet.',
            error: txt.error,
            records,
            expectedTxtValue,
            dnsTarget
        };
    }

    const routing = await checkRoutingTarget(cleanDomain, dnsTarget, resolver);
    records = {
        txt: txt.records,
        cname: routing.records?.cname || [],
        a: routing.records?.a || []
    };

    if (!routing.verified) {
        return {
            verified: false,
            ownershipVerified: true,
            routingVerified: false,
            routingRequired: true,
            routingCheckSupported: routing.checked,
            code: routing.code,
            status: routing.status,
            message: routing.message,
            error: routing.error,
            records,
            expectedTxtValue,
            dnsTarget
        };
    }

    return {
        verified: true,
        ownershipVerified: true,
        routingVerified: true,
        routingRequired: true,
        routingCheckSupported: routing.checked,
        code: 'VERIFIED',
        status: 'verified',
        message: 'Domain verification successful.',
        error: '',
        records,
        expectedTxtValue,
        dnsTarget
    };
};

module.exports = {
    DEFAULT_VERIFICATION_METHOD,
    VERIFICATION_PREFIX,
    getConfiguredDnsTarget,
    normalizeDnsTarget,
    buildVerificationToken,
    buildExpectedTxtValue,
    buildCustomDomainVerificationFields,
    flattenTxtRecords,
    checkTxtVerification,
    checkCnameTarget,
    checkARecordTarget,
    checkRoutingTarget,
    checkDomainDns,
    summarizeDnsError,
    isSubdomainHost,
    isIpv4Target
};
