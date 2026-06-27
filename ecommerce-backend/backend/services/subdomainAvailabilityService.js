const Shop = require('../models/Shop');

const RESERVED_SUBDOMAINS = new Set([
    'www',
    'admin',
    'api',
    'app',
    'dashboard',
    'super-admin',
    'support',
    'help',
    'blog',
    'pricing',
    'login',
    'signup',
    'register',
    'auth',
    'checkout',
    'cart',
    'account',
    'track',
    'store',
    'stores',
    'scaleup',
    'scaleup-codes'
]);

const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

const normalizeSubdomainInput = (value = '') => String(value || '').trim().toLowerCase();

const validateSubdomain = (value = '') => {
    const normalizedSubdomain = normalizeSubdomainInput(value);

    if (!normalizedSubdomain) {
        return {
            valid: false,
            code: 'INVALID_SUBDOMAIN',
            message: 'Store URL is required.',
            normalizedSubdomain
        };
    }

    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(normalizedSubdomain) || /[/?#.:@]/.test(normalizedSubdomain)) {
        return {
            valid: false,
            code: 'INVALID_SUBDOMAIN',
            message: 'Enter only the store URL name, not a full website address.',
            normalizedSubdomain
        };
    }

    if (normalizedSubdomain.length < 3 || normalizedSubdomain.length > 40) {
        return {
            valid: false,
            code: 'INVALID_SUBDOMAIN',
            message: 'Store URL must be 3-40 characters.',
            normalizedSubdomain
        };
    }

    if (!SUBDOMAIN_PATTERN.test(normalizedSubdomain)) {
        return {
            valid: false,
            code: 'INVALID_SUBDOMAIN',
            message: 'Use only lowercase letters, numbers, and hyphens. Start and end with a letter or number.',
            normalizedSubdomain
        };
    }

    if (normalizedSubdomain.includes('--')) {
        return {
            valid: false,
            code: 'INVALID_SUBDOMAIN',
            message: 'Store URL cannot contain consecutive hyphens.',
            normalizedSubdomain
        };
    }

    if (RESERVED_SUBDOMAINS.has(normalizedSubdomain)) {
        return {
            valid: false,
            code: 'RESERVED_SUBDOMAIN',
            message: 'This store URL is reserved. Please choose another one.',
            normalizedSubdomain
        };
    }

    return {
        valid: true,
        normalizedSubdomain
    };
};

const buildSuggestionCandidates = (base = '') => {
    const cleanBase = normalizeSubdomainInput(base)
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 30);
    const root = cleanBase.length >= 3 ? cleanBase : 'store';
    const compact = root.replace(/-/g, '');

    return [
        `${root}bd`,
        `shop${compact}`,
        `${compact}store`,
        `${root}online`,
        `${root}${new Date().getFullYear()}`
    ]
        .map(item => item.slice(0, 40).replace(/^-+|-+$/g, ''))
        .filter((item, index, items) => items.indexOf(item) === index);
};

const getAvailableSubdomainSuggestions = async (base = '', limit = 5) => {
    const suggestions = [];
    for (const candidate of buildSuggestionCandidates(base)) {
        const validation = validateSubdomain(candidate);
        if (!validation.valid) continue;
        const exists = await Shop.exists({ subdomain: validation.normalizedSubdomain });
        if (!exists) suggestions.push(validation.normalizedSubdomain);
        if (suggestions.length >= limit) break;
    }
    return suggestions;
};

const checkSubdomainAvailability = async (value = '') => {
    const validation = validateSubdomain(value);
    if (!validation.valid) {
        return {
            ...validation,
            available: false,
            suggestions: []
        };
    }

    const exists = await Shop.exists({ subdomain: validation.normalizedSubdomain });
    if (exists) {
        return {
            success: true,
            available: false,
            normalizedSubdomain: validation.normalizedSubdomain,
            message: 'This store URL is already taken.',
            suggestions: await getAvailableSubdomainSuggestions(validation.normalizedSubdomain)
        };
    }

    return {
        success: true,
        available: true,
        normalizedSubdomain: validation.normalizedSubdomain,
        message: 'This store URL is available.',
        suggestions: []
    };
};

module.exports = {
    RESERVED_SUBDOMAINS,
    SUBDOMAIN_PATTERN,
    normalizeSubdomainInput,
    validateSubdomain,
    buildSuggestionCandidates,
    getAvailableSubdomainSuggestions,
    checkSubdomainAvailability
};
