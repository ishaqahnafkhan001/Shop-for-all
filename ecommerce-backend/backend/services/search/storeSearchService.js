const Shop = require('../../models/Shop');
const {
    expandSearchSynonyms,
    normalizeSearchText
} = require('@scaleup/storefront-theme');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Fuzzy matching is deliberately bounded and only runs after MongoDB returns a
// small prefix-filtered candidate set. This avoids full-dataset edit-distance
// work in the API process while still handling ordinary brand-name typos.
const boundedEditDistance = (left = '', right = '', maxDistance = 2) => {
    const a = normalizeSearchText(left).slice(0, 80);
    const b = normalizeSearchText(right).slice(0, 80);
    if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;

    let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let row = 1; row <= a.length; row += 1) {
        const current = [row];
        let rowMinimum = row;
        for (let column = 1; column <= b.length; column += 1) {
            const substitutionCost = a[row - 1] === b[column - 1] ? 0 : 1;
            const value = Math.min(
                previous[column] + 1,
                current[column - 1] + 1,
                previous[column - 1] + substitutionCost
            );
            current.push(value);
            rowMinimum = Math.min(rowMinimum, value);
        }
        if (rowMinimum > maxDistance) return maxDistance + 1;
        previous = current;
    }
    return previous[b.length];
};

const rankStoreSearchResult = (shop = {}, query = '') => {
    const normalizedQuery = normalizeSearchText(query);
    const official = shop.searchNameNormalized || normalizeSearchText(shop.shopName);
    const aliases = (shop.searchAliasesNormalized || shop.searchAliases || []).map(normalizeSearchText);
    const variants = expandSearchSynonyms(normalizedQuery);

    if (official === normalizedQuery) return 500;
    if (aliases.includes(normalizedQuery)) return 400;
    if (official.startsWith(normalizedQuery)) return 300;
    if (aliases.some(alias => alias.startsWith(normalizedQuery))) return 200;
    if (variants.some(variant => official === variant || aliases.includes(variant))) return 100;

    const maxDistance = normalizedQuery.length >= 8 ? 2 : 1;
    const officialDistance = boundedEditDistance(official, normalizedQuery, maxDistance);
    if (officialDistance <= maxDistance) return 60 - officialDistance;
    const closestAliasDistance = aliases.reduce(
        (closest, alias) => Math.min(closest, boundedEditDistance(alias, normalizedQuery, maxDistance)),
        maxDistance + 1
    );
    if (closestAliasDistance <= maxDistance) return 50 - closestAliasDistance;
    return 0;
};

const buildStoreSearchQuery = (query = '') => {
    const normalized = normalizeSearchText(query).slice(0, 80);
    const variants = expandSearchSynonyms(normalized).slice(0, 12);
    const expressions = variants.map(value => new RegExp(`^${escapeRegex(value)}`, 'i'));
    const firstToken = normalized.split(' ')[0] || '';
    const fuzzyPrefix = firstToken.length >= 2
        ? new RegExp(`^${escapeRegex(firstToken.slice(0, Math.min(3, firstToken.length)))}`, 'i')
        : null;
    const candidateExpressions = fuzzyPrefix ? [...expressions, fuzzyPrefix] : expressions;
    return {
        normalized,
        query: {
            isActive: true,
            approvalStatus: 'Approved',
            'verification.status': 'approved',
            'verification.phoneVerified': true,
            'theme.seo.searchEngineVisibility': { $ne: false },
            $or: [
                { searchNameNormalized: { $in: candidateExpressions } },
                { searchAliasesNormalized: { $in: candidateExpressions } },
                { shopName: { $in: candidateExpressions } }
            ]
        }
    };
};

const searchPublicStores = async ({ query, limit = 10 } = {}) => {
    const built = buildStoreSearchQuery(query);
    if (built.normalized.length < 2) return [];
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 20);
    const candidates = await Shop.find(built.query)
        .select('shopName subdomain theme.logoUrl theme.seo.siteName customDomain.domain customDomain.status customDomain.ownershipVerified customDomain.routingVerified customDomain.manuallyVerifiedRouting searchAliases +searchAliasesNormalized +searchNameNormalized')
        .limit(50)
        .lean();

    return candidates
        .map(shop => ({ shop, rank: rankStoreSearchResult(shop, built.normalized) }))
        .filter(item => item.rank > 0)
        .sort((a, b) => b.rank - a.rank || String(a.shop.shopName).localeCompare(String(b.shop.shopName)))
        .slice(0, safeLimit)
        .map(({ shop }) => ({
            id: shop._id,
            shopName: shop.shopName,
            siteName: shop.theme?.seo?.siteName || shop.shopName,
            subdomain: shop.subdomain,
            logoUrl: shop.theme?.logoUrl || '',
            customDomain: shop.customDomain || null
        }));
};

module.exports = {
    searchPublicStores,
    buildStoreSearchQuery,
    rankStoreSearchResult,
    __test: { escapeRegex, boundedEditDistance }
};
