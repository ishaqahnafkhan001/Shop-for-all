const PLATFORM_ROOT_DOMAIN = 'scaleup.codes';
const RESERVED_PLATFORM_HOSTS = new Set([
    PLATFORM_ROOT_DOMAIN,
    `www.${PLATFORM_ROOT_DOMAIN}`,
    `shop.${PLATFORM_ROOT_DOMAIN}`,
    `admin.${PLATFORM_ROOT_DOMAIN}`,
    `api.${PLATFORM_ROOT_DOMAIN}`
]);
const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'admin', 'shop', 'scaleup']);

const trimDots = (value = '') => String(value || '').replace(/^\.+|\.+$/g, '');

const stripProtocolAndPath = (value = '') => {
    let clean = String(value || '').trim().toLowerCase();
    clean = clean.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
    clean = clean.split(/[/?#]/)[0] || '';
    return trimDots(clean.replace(/\/+$/g, ''));
};

const stripPort = (hostname = '') => {
    const clean = String(hostname || '').trim().toLowerCase();
    if (!clean) return '';
    if (clean.startsWith('[') || clean.includes(']')) return clean;
    if ((clean.match(/:/g) || []).length > 1) return clean;
    return clean.split(':')[0];
};

const getHostnameFromHostHeader = (host = '') => {
    const withoutProtocol = stripProtocolAndPath(host);
    return stripPort(withoutProtocol);
};

const normalizeCustomDomain = (input = '') => {
    const value = typeof input === 'object' && input !== null ? input.domain : input;
    return getHostnameFromHostHeader(value);
};

const isIpv4Address = (hostname = '') => {
    const parts = String(hostname || '').split('.');
    return parts.length === 4 && parts.every(part => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
};

const isIpAddress = (hostname = '') => isIpv4Address(hostname) || String(hostname || '').includes(':');

const isLocalhostDomain = (hostname = '') => {
    const clean = normalizeCustomDomain(hostname);
    return clean === 'localhost' ||
        clean.endsWith('.localhost') ||
        clean === '127.0.0.1' ||
        clean === '0.0.0.0' ||
        clean === '::1';
};

const isPlatformDomain = (hostname = '') => {
    const clean = normalizeCustomDomain(hostname);
    return RESERVED_PLATFORM_HOSTS.has(clean) || clean.endsWith(`.${PLATFORM_ROOT_DOMAIN}`);
};

const hasAsciiOnly = (value = '') => /^[\x00-\x7F]+$/.test(String(value || ''));

const isValidHostname = (hostname = '') => {
    const clean = normalizeCustomDomain(hostname);
    if (!clean || clean.length > 253) return false;
    if (!hasAsciiOnly(clean)) return false;
    if (clean.includes('@') || clean.includes('*') || clean.includes('_')) return false;
    if (clean.includes('..')) return false;
    if (!clean.includes('.')) return false;
    if (isIpAddress(clean) || isLocalhostDomain(clean)) return false;

    return clean.split('.').every(label => (
        label.length >= 1 &&
        label.length <= 63 &&
        /^[a-z0-9-]+$/.test(label) &&
        !label.startsWith('-') &&
        !label.endsWith('-')
    ));
};

const isValidCustomDomain = (hostname = '') => {
    const clean = normalizeCustomDomain(hostname);
    return isValidHostname(clean) && !isPlatformDomain(clean);
};

const getPlatformSubdomainFromHostname = (hostname = '') => {
    const clean = getHostnameFromHostHeader(hostname);

    if (clean.endsWith('.localhost')) {
        const localSubdomain = clean.slice(0, -'.localhost'.length);
        return localSubdomain && !localSubdomain.includes('.') && localSubdomain !== 'localhost'
            ? localSubdomain
            : '';
    }

    if (clean.endsWith(`.${PLATFORM_ROOT_DOMAIN}`)) {
        const subdomain = clean.slice(0, -`.${PLATFORM_ROOT_DOMAIN}`.length);
        return subdomain && !subdomain.includes('.') && !RESERVED_SUBDOMAINS.has(subdomain)
            ? subdomain
            : '';
    }

    return '';
};

const isPlatformRootHost = (hostname = '') => {
    const clean = getHostnameFromHostHeader(hostname);
    return RESERVED_PLATFORM_HOSTS.has(clean) || clean === 'localhost' || clean === '127.0.0.1';
};

const isCustomDomainFullyVerified = (customDomain = {}) => (
    customDomain?.status === 'Verified' &&
    Boolean(normalizeCustomDomain(customDomain?.domain)) &&
    customDomain?.ownershipVerified === true &&
    (
        customDomain?.routingVerified === true ||
        customDomain?.manuallyVerifiedRouting === true
    )
);

const buildVerifiedCustomDomainQuery = (domain) => ({
    'customDomain.domain': normalizeCustomDomain(domain),
    'customDomain.status': 'Verified',
    'customDomain.ownershipVerified': true,
    $or: [
        { 'customDomain.routingVerified': true },
        { 'customDomain.manuallyVerifiedRouting': true }
    ]
});

module.exports = {
    PLATFORM_ROOT_DOMAIN,
    RESERVED_PLATFORM_HOSTS,
    normalizeCustomDomain,
    isValidCustomDomain,
    isValidHostname,
    isPlatformDomain,
    isLocalhostDomain,
    isIpAddress,
    getHostnameFromHostHeader,
    getPlatformSubdomainFromHostname,
    isPlatformRootHost,
    isCustomDomainFullyVerified,
    buildVerifiedCustomDomainQuery
};
