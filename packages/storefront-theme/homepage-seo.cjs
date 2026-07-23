'use strict';

const TITLE_MAX = 70;
const DESCRIPTION_MAX = 170;
const DEFAULT_PLATFORM_DOMAIN = 'scaleup.codes';

const cleanSeoText = (value = '', maxLength = 500) => String(value || '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const truncateSeoText = (value = '', maxLength = 160) => {
    const text = cleanSeoText(value, maxLength + 80);
    if (text.length <= maxLength) return text;
    const clipped = text.slice(0, maxLength - 1).trim();
    const lastSpace = clipped.lastIndexOf(' ');
    return `${(lastSpace > Math.floor(maxLength * 0.55) ? clipped.slice(0, lastSpace) : clipped).trim()}…`;
};

const normalizeSearchText = (value = '') => cleanSeoText(value, 120)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const SPELLING_GROUPS = Object.freeze([
    ['jewellery', 'jewelry', 'jewelery', 'jewellry'],
    ['colour', 'color'],
    ['personalised', 'personalized'],
    ['centre', 'center']
]);

const SPELLING_CANONICAL = SPELLING_GROUPS.reduce((map, group) => {
    group.forEach(value => map.set(value, group[0]));
    return map;
}, new Map());

const canonicalizeSearchTokens = (value = '') => normalizeSearchText(value)
    .split(' ')
    .filter(Boolean)
    .map(token => SPELLING_CANONICAL.get(token) || token);

const expandSearchSynonyms = (value = '') => {
    const normalized = normalizeSearchText(value);
    if (!normalized) return [];
    const tokens = normalized.split(' ');
    const variants = new Set([normalized]);
    tokens.forEach((token, index) => {
        const canonical = SPELLING_CANONICAL.get(token);
        const group = SPELLING_GROUPS.find(items => items[0] === canonical);
        (group || []).forEach(replacement => {
            const next = [...tokens];
            next[index] = replacement;
            variants.add(next.join(' '));
        });
    });
    return [...variants].slice(0, 12);
};

const areBrandAliasesRelated = (officialName = '', alias = '') => {
    const officialTokens = new Set(canonicalizeSearchTokens(officialName));
    const aliasTokens = canonicalizeSearchTokens(alias);
    if (!officialTokens.size || !aliasTokens.length) return false;
    return aliasTokens.some(token => officialTokens.has(token));
};

const normalizeSearchAliases = ({ aliases = [], officialName = '', maxAliases = 8 } = {}) => {
    const source = Array.isArray(aliases) ? aliases : String(aliases || '').split(/[\n,]/);
    const cleanAliases = [];
    const normalizedAliases = [];
    const errors = [];
    const seen = new Set();
    const officialNormalized = normalizeSearchText(officialName);

    source.slice(0, Math.max(maxAliases * 2, maxAliases)).forEach((rawAlias, index) => {
        const alias = cleanSeoText(rawAlias, 60);
        const normalized = normalizeSearchText(alias);
        if (!alias || !normalized || normalized === officialNormalized || seen.has(normalized)) return;

        let message = '';
        if (/https?:\/\/|www\.|@[^\s]+\.|\.(?:com|net|org|bd)\b/i.test(alias)) message = 'Search aliases cannot contain URLs or email addresses.';
        else if (/\+?\d[\d\s().-]{7,}/.test(alias)) message = 'Search aliases cannot contain phone numbers.';
        else if ((alias.match(/[^\p{L}\p{N}\s'.&-]/gu) || []).length > 2) message = 'Search aliases contain too much punctuation.';
        else if (normalized.split(' ').length > 6) message = 'Search aliases must be short brand-name variants, not keyword phrases.';
        else if (!areBrandAliasesRelated(officialName, alias)) message = 'Search aliases must be genuine spelling variants of the official store name.';

        if (message) {
            errors.push({ index, alias, code: 'SEARCH_ALIAS_NOT_ALLOWED', message });
            return;
        }

        seen.add(normalized);
        cleanAliases.push(alias);
        normalizedAliases.push(normalized);
    });

    if (cleanAliases.length > maxAliases) {
        errors.push({ code: 'INVALID_SEARCH_ALIAS', message: `Add no more than ${maxAliases} search aliases.` });
    }

    return {
        aliases: cleanAliases.slice(0, maxAliases),
        normalized: normalizedAliases.slice(0, maxAliases),
        errors
    };
};

const stableValue = (value) => {
    if (Array.isArray(value)) return value.map(stableValue);
    if (value && typeof value === 'object') {
        return Object.keys(value).sort().reduce((output, key) => {
            output[key] = stableValue(value[key]);
            return output;
        }, {});
    }
    return value;
};

const hashText = (value = '') => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
};

const buildSeoInputSnapshot = ({ shopIdentity = {}, storefrontContent = {}, catalogSummary = {}, commerce = {} } = {}) => ({
    officialName: cleanSeoText(shopIdentity.displayName || shopIdentity.shopName || shopIdentity.name, 80),
    heroTitle: cleanSeoText(storefrontContent.heroTitle, 140),
    heroDescription: cleanSeoText(storefrontContent.heroDescription, 280),
    primaryCategory: cleanSeoText(shopIdentity.primaryCategory || catalogSummary.primaryCategory, 80),
    collections: [...new Set((catalogSummary.collections || []).map(value => cleanSeoText(value?.title || value, 80)).filter(Boolean))].sort(),
    categories: [...new Set((catalogSummary.categories || []).map(value => cleanSeoText(value?.name || value, 80)).filter(Boolean))].sort(),
    sellingProposition: cleanSeoText(storefrontContent.sellingProposition, 200),
    serviceArea: cleanSeoText(shopIdentity.serviceArea, 100),
    language: cleanSeoText(shopIdentity.language || 'en-BD', 20),
    currency: cleanSeoText(commerce.currency || shopIdentity.currency || 'BDT', 10),
    topics: [...new Set((catalogSummary.topics || []).map(value => normalizeSearchText(value)).filter(Boolean))].sort()
});

const computeSeoInputHash = (context = {}) => hashText(JSON.stringify(stableValue(buildSeoInputSnapshot(context))));

const normalizeHost = (value = '') => String(value || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .split(/[/?#]/)[0]
    .replace(/\.+$/, '')
    .toLowerCase();

const isVerifiedCustomDomain = (customDomain = {}) => customDomain?.status === 'Verified'
    && Boolean(normalizeHost(customDomain.domain))
    && customDomain.ownershipVerified === true
    && (customDomain.routingVerified === true || customDomain.manuallyVerifiedRouting === true);

const resolveCanonicalOrigin = ({ canonicalUrl = '', customDomain = {}, subdomain = '', platformDomain = DEFAULT_PLATFORM_DOMAIN } = {}) => {
    if (canonicalUrl) {
        try {
            const url = new URL(canonicalUrl);
            return `${url.protocol === 'http:' && /localhost|127\.0\.0\.1/i.test(url.hostname) ? 'http:' : 'https:'}//${url.host}`;
        } catch {
            // Fall through to stored tenant identity.
        }
    }
    if (isVerifiedCustomDomain(customDomain)) return `https://${normalizeHost(customDomain.domain)}`;
    const cleanSubdomain = normalizeSearchText(subdomain).replace(/\s+/g, '-');
    const cleanPlatformDomain = normalizeHost(platformDomain) || DEFAULT_PLATFORM_DOMAIN;
    return cleanSubdomain ? `https://${cleanSubdomain}.${cleanPlatformDomain}` : `https://${cleanPlatformDomain}`;
};

const normalizeSocialImage = (seo = {}, fallbackImage = {}) => {
    const source = seo.socialImage && typeof seo.socialImage === 'object'
        ? seo.socialImage
        : {
            url: seo.socialImage || '',
            assetId: seo.socialImageAssetId || null,
            alt: seo.socialImageAlt || '',
            width: seo.socialImageWidth || null,
            height: seo.socialImageHeight || null,
            type: seo.socialImageMimeType || ''
        };
    const fallback = typeof fallbackImage === 'string' ? { url: fallbackImage } : (fallbackImage || {});
    const selected = cleanSeoText(source.url, 1000) ? source : fallback;
    const url = cleanSeoText(selected.url, 1000);
    if (!url) return null;
    return {
        url,
        assetId: selected.assetId || null,
        alt: cleanSeoText(selected.alt, 160),
        width: Number(selected.width) > 0 ? Number(selected.width) : undefined,
        height: Number(selected.height) > 0 ? Number(selected.height) : undefined,
        type: cleanSeoText(selected.type || selected.mimeType, 80) || undefined
    };
};

const findAcceptedAiSource = (seo = {}, field, value) => {
    const suggestion = seo.aiSuggestion || {};
    const acceptedFields = Array.isArray(suggestion.acceptedFields) ? suggestion.acceptedFields : [];
    if (!suggestion.acceptedAt || !acceptedFields.includes(field)) return false;
    const acceptedOption = (suggestion.alternatives || []).find(option => String(option?.id) === String(suggestion.acceptedOptionId));
    return cleanSeoText(acceptedOption?.[field], field === 'title' ? TITLE_MAX : DESCRIPTION_MAX) === value;
};

const resolveTextField = ({ seo = {}, field, generated = '', fallback = '' }) => {
    const max = ['title', 'socialTitle'].includes(field) ? TITLE_MAX : DESCRIPTION_MAX;
    const manual = truncateSeoText(seo[field], max);
    if (manual) return { value: manual, source: findAcceptedAiSource(seo, field, manual) ? 'ai' : 'manual' };
    const generatedValue = truncateSeoText(generated, max);
    if (generatedValue) return { value: generatedValue, source: 'generated' };
    const fallbackValue = truncateSeoText(fallback, max);
    return { value: fallbackValue, source: fallbackValue ? 'fallback' : 'missing' };
};

const compactObject = (value) => JSON.parse(JSON.stringify(value));

const resolveHomepageSeo = ({
    seo = {},
    shopIdentity = {},
    storefrontContent = {},
    catalogSummary = {},
    domain = {},
    indexing = {},
    socialProfiles = {},
    commerce = {},
    publicContact = {},
    platform = {}
} = {}) => {
    const officialName = cleanSeoText(shopIdentity.displayName || shopIdentity.shopName || shopIdentity.name, 80);
    const canonicalOrigin = resolveCanonicalOrigin({
        canonicalUrl: domain.canonicalUrl,
        customDomain: domain.customDomain,
        subdomain: shopIdentity.subdomain,
        platformDomain: platform.domain
    });
    const canonical = `${canonicalOrigin.replace(/\/$/, '')}/`;
    const domainFallbackName = normalizeHost(domain.customDomain?.domain || `${shopIdentity.subdomain || ''}.${platform.domain || DEFAULT_PLATFORM_DOMAIN}`);
    const siteName = truncateSeoText(seo.siteName || officialName || domainFallbackName || 'Store', 80);
    const siteNameSource = seo.siteName ? 'manual' : (officialName ? 'generated' : 'fallback');
    const primaryCategory = cleanSeoText(shopIdentity.primaryCategory || catalogSummary.primaryCategory || catalogSummary.categories?.[0]?.name || catalogSummary.categories?.[0], 80);
    const titleCategory = primaryCategory && !normalizeSearchText(siteName).includes(normalizeSearchText(primaryCategory))
        ? primaryCategory
        : '';
    const generatedTitle = `${siteName}${titleCategory ? ` - ${titleCategory}` : ' - Online Store'}`;
    const generatedDescription = primaryCategory
        ? `Shop ${primaryCategory.toLowerCase()} from ${officialName || siteName}. Browse public collections, new arrivals, and available products online.`
        : `Shop products from ${officialName || siteName}. Browse public collections, new arrivals, and available products online.`;
    const title = resolveTextField({ seo, field: 'title', generated: generatedTitle, fallback: storefrontContent.heroTitle || siteName });
    const description = resolveTextField({ seo, field: 'description', generated: generatedDescription, fallback: storefrontContent.heroDescription });
    const socialTitle = resolveTextField({ seo, field: 'socialTitle', generated: title.value, fallback: title.value });
    const socialDescription = resolveTextField({ seo, field: 'socialDescription', generated: description.value, fallback: description.value });
    const socialImage = normalizeSocialImage(seo, storefrontContent.fallbackSocialImage);
    const configuredSocialImageUrl = typeof seo.socialImage === 'object' ? seo.socialImage?.url : seo.socialImage;
    const socialImageSource = configuredSocialImageUrl ? 'manual' : (socialImage ? 'fallback' : 'missing');
    const vendorVisible = seo.searchEngineVisibility !== false && indexing.vendorVisible !== false;
    const platformIndexable = indexing.shopPublished !== false
        && indexing.platformAllowed !== false
        && indexing.environmentAllowsIndexing !== false;
    const indexable = vendorVisible && platformIndexable;
    const follow = platformIndexable;
    const approvedAliases = (shopIdentity.searchAliases || []).map(value => cleanSeoText(value, 60)).filter(Boolean).slice(0, 5);
    const websiteAlternateNames = [...new Set([
        ...(officialName && officialName !== siteName ? [officialName] : []),
        ...approvedAliases
    ])].filter(value => value !== siteName).slice(0, 5);
    const storeAlternateNames = [...new Set([
        ...(siteName && siteName !== officialName ? [siteName] : []),
        ...approvedAliases
    ])].filter(value => value !== officialName).slice(0, 5);
    const sameAs = [...new Set(Object.values(socialProfiles || {})
        .map(value => cleanSeoText(value, 500))
        .filter(value => /^https:\/\//i.test(value)))].slice(0, 10);
    const inputContext = { shopIdentity, storefrontContent, catalogSummary: { ...catalogSummary, topics: seo.topics || seo.keywords || [] }, commerce };
    const currentInputHash = computeSeoInputHash(inputContext);
    const generatedFromHash = cleanSeoText(seo.aiSuggestion?.generatedFromHash, 100);
    const previousSnapshot = seo.aiSuggestion?.inputSnapshot || null;
    const currentSnapshot = buildSeoInputSnapshot(inputContext);
    const changedAreas = previousSnapshot
        ? Object.keys(currentSnapshot).filter(key => JSON.stringify(stableValue(currentSnapshot[key])) !== JSON.stringify(stableValue(previousSnapshot[key])))
        : [];
    const freshnessStatus = !generatedFromHash
        ? 'never-generated'
        : (generatedFromHash === currentInputHash ? 'fresh' : 'possibly-outdated');
    const logo = cleanSeoText(storefrontContent.logoUrl, 1000) || undefined;
    const contactPoint = cleanSeoText(publicContact.email, 160) || cleanSeoText(publicContact.phone, 40)
        ? {
            '@type': 'ContactPoint',
            ...(cleanSeoText(publicContact.email, 160) ? { email: cleanSeoText(publicContact.email, 160) } : {}),
            ...(cleanSeoText(publicContact.phone, 40) ? { telephone: cleanSeoText(publicContact.phone, 40) } : {}),
            contactType: 'customer service'
        }
        : undefined;
    const websiteJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${canonicalOrigin}/#website`,
        name: siteName,
        ...(websiteAlternateNames.length ? { alternateName: websiteAlternateNames } : {}),
        url: canonical,
        description: description.value,
        publisher: { '@id': `${canonicalOrigin}/#store` },
        ...(indexing.searchUrlTemplate ? {
            potentialAction: {
                '@type': 'SearchAction',
                target: { '@type': 'EntryPoint', urlTemplate: indexing.searchUrlTemplate },
                'query-input': 'required name=search_term_string'
            }
        } : {})
    };
    const storeJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'OnlineStore',
        '@id': `${canonicalOrigin}/#store`,
        name: officialName || siteName,
        ...(storeAlternateNames.length ? { alternateName: storeAlternateNames } : {}),
        url: canonical,
        description: description.value,
        mainEntityOfPage: { '@id': `${canonicalOrigin}/#website` },
        ...(logo ? { logo } : {}),
        ...(socialImage?.url ? { image: socialImage.url } : {}),
        ...(sameAs.length ? { sameAs } : {}),
        ...(contactPoint ? { contactPoint } : {}),
        ...(cleanSeoText(commerce.currency, 10) ? { currenciesAccepted: cleanSeoText(commerce.currency, 10) } : {}),
        ...(cleanSeoText(shopIdentity.serviceArea, 100) ? { areaServed: cleanSeoText(shopIdentity.serviceArea, 100) } : {})
    };

    return compactObject({
        siteName,
        title: title.value,
        description: description.value,
        canonical,
        robots: { index: indexable, follow, nocache: !indexable },
        socialImage,
        openGraph: {
            title: socialTitle.value,
            description: socialDescription.value,
            url: canonical,
            siteName,
            images: socialImage ? [socialImage] : []
        },
        twitter: {
            card: socialImage ? 'summary_large_image' : 'summary',
            title: socialTitle.value,
            description: socialDescription.value,
            images: socialImage ? [socialImage.url] : []
        },
        websiteJsonLd,
        storeJsonLd,
        source: {
            siteName: siteNameSource,
            title: title.source,
            description: description.source,
            socialTitle: socialTitle.source,
            socialDescription: socialDescription.source,
            socialImage: socialImageSource
        },
        freshness: { status: freshnessStatus, generatedFromHash, currentInputHash, changedAreas }
    });
};

const buildNextHomepageMetadata = (resolvedSeo = {}, { icons, googleSiteVerification = '' } = {}) => {
    const metadata = {
        title: { absolute: resolvedSeo.title || 'Online Store' },
        description: resolvedSeo.description || '',
        alternates: { canonical: resolvedSeo.canonical },
        robots: {
            ...(resolvedSeo.robots || { index: false, follow: false }),
            googleBot: {
                index: Boolean(resolvedSeo.robots?.index),
                follow: Boolean(resolvedSeo.robots?.follow)
            }
        },
        openGraph: { type: 'website', ...(resolvedSeo.openGraph || {}) },
        twitter: resolvedSeo.twitter || {}
    };
    if (icons) metadata.icons = icons;
    if (googleSiteVerification) metadata.verification = { google: cleanSeoText(googleSiteVerification, 200).replace(/[<>"'`\s]/g, '') };
    return metadata;
};

const buildSeoPreviewModel = (resolvedSeo = {}) => ({
    siteName: resolvedSeo.siteName || '',
    title: resolvedSeo.title || '',
    description: resolvedSeo.description || '',
    url: resolvedSeo.canonical || '',
    canonical: resolvedSeo.canonical || '',
    robots: resolvedSeo.robots || { index: false, follow: false },
    socialImage: resolvedSeo.socialImage || null,
    openGraph: resolvedSeo.openGraph || {},
    twitter: resolvedSeo.twitter || {},
    source: resolvedSeo.source || {},
    freshness: resolvedSeo.freshness || {}
});

const isGenericTitle = (value = '') => /^(?:home|online store|welcome|shop now)$/i.test(cleanSeoText(value));
const weakAltText = (value = '') => /^(?:image|photo|product|img[_-]?\d+)$/i.test(cleanSeoText(value));
const statusForResolvedSource = (source = '', valid = true) => {
    if (!valid) return 'invalid';
    if (source === 'generated') return 'generated';
    if (source === 'fallback') return 'fallback';
    if (source === 'missing') return 'missing';
    return 'complete';
};

const evaluateHomepageSeo = (resolvedSeo = {}, context = {}) => {
    const sourceScore = { manual: 1, ai: 0.9, generated: 0.75, fallback: 0.45, missing: 0 };
    const checks = [];
    const add = (check) => checks.push({ fieldPath: '', severity: 'medium', weight: 5, ...check });
    const titleLength = cleanSeoText(resolvedSeo.title).length;
    const descriptionLength = cleanSeoText(resolvedSeo.description).length;
    const image = resolvedSeo.socialImage;
    const imageRatio = image?.width && image?.height ? image.width / image.height : null;
    const titleQuality = Boolean(resolvedSeo.title) && !isGenericTitle(resolvedSeo.title);
    const descriptionQuality = descriptionLength >= 80 && normalizeSearchText(resolvedSeo.description) !== normalizeSearchText(resolvedSeo.title);
    const h1 = cleanSeoText(context.h1, 140);
    const titleTokens = new Set(normalizeSearchText(resolvedSeo.title).split(' ').filter(token => token.length > 2));
    const h1Relevant = Boolean(h1) && normalizeSearchText(h1).split(' ').some(token => titleTokens.has(token));
    const supportedImageType = !image?.type || /^(?:image\/jpeg|image\/png|image\/webp|image\/gif)$/i.test(image.type);
    const imageLargeEnough = !image?.width || !image?.height || (image.width >= 600 && image.height >= 315);

    add({ id: 'site-name', group: 'content', status: statusForResolvedSource(resolvedSeo.source?.siteName), source: resolvedSeo.source?.siteName, weight: 8, fieldPath: 'seo.siteName', message: resolvedSeo.source?.siteName === 'manual' ? 'Google site name is explicitly configured.' : 'The official store name is being used as a generated site name.' });
    add({ id: 'homepage-title', group: 'content', status: statusForResolvedSource(resolvedSeo.source?.title, titleQuality), source: resolvedSeo.source?.title, severity: 'high', weight: 14, fieldPath: 'seo.title', message: titleQuality ? `Homepage title uses a ${resolvedSeo.source?.title || 'resolved'} value.` : 'Add a specific homepage title instead of a generic label.' });
    add({ id: 'title-length', group: 'content', status: titleLength >= 30 && titleLength <= TITLE_MAX ? 'complete' : 'warning', source: resolvedSeo.source?.title, weight: 6, fieldPath: 'seo.title', message: `Homepage title is ${titleLength} characters. Length guidance is an estimate, not a fixed Google limit.` });
    add({ id: 'homepage-description', group: 'content', status: descriptionQuality ? statusForResolvedSource(resolvedSeo.source?.description) : 'warning', source: resolvedSeo.source?.description, severity: 'high', weight: 12, fieldPath: 'seo.description', message: descriptionQuality ? `Homepage description uses a ${resolvedSeo.source?.description || 'resolved'} value.` : 'Write a useful description that explains what shoppers can find.' });
    add({ id: 'description-length', group: 'content', status: descriptionLength >= 100 && descriptionLength <= DESCRIPTION_MAX ? 'complete' : 'warning', source: resolvedSeo.source?.description, weight: 6, fieldPath: 'seo.description', message: `Meta description is ${descriptionLength} characters.` });
    add({ id: 'indexability', group: 'indexing', status: resolvedSeo.robots?.index ? 'complete' : 'blocked', source: 'platform', severity: 'high', weight: 16, fieldPath: 'seo.searchEngineVisibility', message: resolvedSeo.robots?.index ? 'The homepage is currently indexable.' : 'The homepage is currently noindex because of store or platform visibility rules.' });
    add({ id: 'canonical', group: 'technical', status: /^https:\/\//i.test(resolvedSeo.canonical || '') ? 'complete' : 'invalid', source: 'platform', severity: 'high', weight: 10, fieldPath: 'canonical', message: /^https:\/\//i.test(resolvedSeo.canonical || '') ? 'Canonical URL uses an authoritative HTTPS origin.' : 'Canonical URL is missing or invalid.' });
    add({ id: 'social-image', group: 'social', status: image?.url ? (resolvedSeo.source?.socialImage === 'manual' ? 'complete' : 'fallback') : 'missing', source: resolvedSeo.source?.socialImage, weight: 9, fieldPath: 'seo.socialImage', message: image?.url ? 'A social sharing image is available.' : 'Upload a social sharing image.' });
    add({ id: 'social-image-alt', group: 'social', status: image?.alt && !weakAltText(image.alt) ? 'complete' : 'warning', source: resolvedSeo.source?.socialImage, weight: 4, fieldPath: 'seo.socialImageAlt', message: image?.alt && !weakAltText(image.alt) ? 'Social image alt text is useful.' : 'Add descriptive social image alt text.' });
    add({ id: 'social-image-ratio', group: 'social', status: !imageRatio ? 'warning' : (Math.abs(imageRatio - (1200 / 630)) <= 0.2 ? 'complete' : 'warning'), source: resolvedSeo.source?.socialImage, weight: 4, fieldPath: 'seo.socialImage', message: !imageRatio ? 'Image dimensions are unavailable.' : `Social image ratio is ${imageRatio.toFixed(2)}:1; approximately 1.91:1 is recommended.` });
    add({ id: 'social-image-format', group: 'social', status: !image?.url ? 'missing' : (supportedImageType && imageLargeEnough ? 'complete' : 'warning'), source: resolvedSeo.source?.socialImage, weight: 3, fieldPath: 'seo.socialImage', message: !image?.url ? 'Upload a social image before checking its format.' : (!supportedImageType ? 'Use JPEG, PNG, WebP, or GIF for social sharing.' : (!imageLargeEnough ? 'Use a larger social image for clearer sharing previews.' : 'Social image format and available dimensions are usable.')) });
    add({ id: 'structured-data', group: 'structuredData', status: resolvedSeo.websiteJsonLd?.name && resolvedSeo.storeJsonLd?.name ? 'complete' : 'missing', source: 'platform', weight: 8, fieldPath: 'structuredData', message: 'WebSite and OnlineStore structured data use resolved public store identity.' });
    add({ id: 'public-h1', group: 'content', status: h1 ? (h1Relevant ? 'complete' : 'warning') : 'missing', source: 'content', weight: 6, fieldPath: 'hero.title', message: !h1 ? 'Add a visible homepage heading.' : (h1Relevant ? 'The homepage heading is relevant to the resolved title.' : 'Align the homepage heading more closely with the SEO title.') });
    add({ id: 'active-collections', group: 'content', status: Number(context.collectionCount || 0) > 0 ? 'complete' : 'warning', source: 'catalog', weight: 5, fieldPath: 'collections', message: Number(context.collectionCount || 0) > 0 ? 'Public collection pages support internal discovery.' : 'Add at least one active public collection.' });
    add({ id: 'internal-links', group: 'technical', status: Number(context.internalLinkCount || 0) >= 3 ? 'complete' : 'warning', source: 'content', weight: 4, fieldPath: 'navigation', message: Number(context.internalLinkCount || 0) >= 3 ? 'Homepage navigation provides useful internal links.' : 'Add useful links to products, collections, policies, or account pages.' });
    add({ id: 'image-alt-coverage', group: 'content', status: Number(context.imageAltCoverage || 0) >= 60 ? 'complete' : 'warning', source: 'catalog', weight: 5, fieldPath: 'products.imageAltText', message: `${Number(context.imageAltCoverage || 0)}% of products have image alt text.` });
    add({ id: 'google-verification', group: 'technical', status: context.googleSiteVerification ? 'complete' : 'warning', source: 'manual', weight: 3, fieldPath: 'seo.googleSiteVerification', message: context.googleSiteVerification ? 'Google verification code is configured.' : 'Google Search Console verification is not configured.' });
    add({ id: 'preferred-domain', group: 'technical', status: context.customDomainConnected ? 'complete' : 'generated', source: context.customDomainConnected ? 'manual' : 'platform', weight: 3, fieldPath: 'domain', message: context.customDomainConnected ? 'A verified custom domain is used as the canonical origin.' : 'The verified platform subdomain is used as the canonical origin.' });
    add({ id: 'social-profiles', group: 'structuredData', status: resolvedSeo.storeJsonLd?.sameAs?.length ? 'complete' : 'warning', source: 'manual', weight: 3, fieldPath: 'footer.social', message: resolvedSeo.storeJsonLd?.sameAs?.length ? 'Public social profiles are connected to store structured data.' : 'Add a public social profile when available.' });
    add({ id: 'sitemap', group: 'indexing', status: /^https:\/\//i.test(resolvedSeo.canonical || '') ? 'complete' : 'invalid', source: 'platform', weight: 4, fieldPath: 'sitemap', message: `Sitemap should use ${String(resolvedSeo.canonical || '').replace(/\/$/, '')}/sitemap.xml.` });
    add({ id: 'metadata-freshness', group: 'technical', status: resolvedSeo.freshness?.status === 'fresh' ? 'complete' : (resolvedSeo.freshness?.status === 'possibly-outdated' ? 'warning' : 'generated'), source: 'platform', weight: 4, fieldPath: 'seo.aiSuggestion', message: resolvedSeo.freshness?.status === 'possibly-outdated' ? `SEO suggestions may be outdated${resolvedSeo.freshness.changedAreas?.length ? ` because ${resolvedSeo.freshness.changedAreas.join(', ')} changed` : ''}.` : 'SEO freshness has been evaluated.' });

    const groups = ['content', 'technical', 'social', 'structuredData', 'indexing'].reduce((output, group) => {
        const groupChecks = checks.filter(check => check.group === group);
        const total = groupChecks.reduce((sum, check) => sum + check.weight, 0) || 1;
        output[group] = Math.round(groupChecks.reduce((sum, check) => {
            const stateFactor = check.status === 'complete' ? (sourceScore[check.source] ?? 1)
                : check.status === 'generated' ? 0.75
                    : check.status === 'fallback' ? 0.45
                        : 0;
            return sum + (check.weight * stateFactor);
        }, 0) / total * 100);
        return output;
    }, {});
    const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0) || 1;
    let score = Math.round(checks.reduce((sum, check) => {
        const stateFactor = check.status === 'complete' ? (sourceScore[check.source] ?? 1)
            : check.status === 'generated' ? 0.75
                : check.status === 'fallback' ? 0.45
                    : 0;
        return sum + (check.weight * stateFactor);
    }, 0) / totalWeight * 100);
    if (!resolvedSeo.robots?.index) score = Math.min(score, 69);
    const status = !resolvedSeo.robots?.index ? 'blocked' : score >= 85 ? 'optimized' : score >= 60 ? 'needs-improvement' : 'poor';

    return {
        score,
        status,
        indexable: Boolean(resolvedSeo.robots?.index),
        groups,
        checks,
        tasks: checks.map(check => ({
            label: check.message,
            done: check.status === 'complete',
            status: check.status,
            source: check.source,
            action: ['complete', 'generated'].includes(check.status) ? '' : check.message,
            fieldPath: check.fieldPath
        })),
        missing: checks.filter(check => !['complete', 'generated'].includes(check.status))
    };
};

module.exports = {
    TITLE_MAX,
    DESCRIPTION_MAX,
    SPELLING_GROUPS,
    cleanSeoText,
    truncateSeoText,
    normalizeSearchText,
    expandSearchSynonyms,
    areBrandAliasesRelated,
    normalizeSearchAliases,
    buildSeoInputSnapshot,
    computeSeoInputHash,
    isVerifiedCustomDomain,
    resolveCanonicalOrigin,
    resolveHomepageSeo,
    buildNextHomepageMetadata,
    buildSeoPreviewModel,
    evaluateHomepageSeo
};
