import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
    evaluateHomepageSeo,
    resolveHomepageSeo
} from '@scaleup/storefront-theme';
import API from '../../../../api/api.js';
import { aiRequestHeaders } from '../../../../utils/aiRequestId.js';

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

const snapshot = (seo, aliases) => JSON.stringify(stableValue({ seo: seo || {}, aliases: aliases || [] }));
const cleanAliases = (value) => (Array.isArray(value) ? value : String(value || '').split(/[\n,]/))
    .map(alias => String(alias || '').trim())
    .filter(Boolean)
    .slice(0, 8);

const buildLegacySeoBootstrap = (response) => {
    const responseData = response?.data || {};
    const source = responseData.bootstrap || responseData.data || {};
    const shop = source.shop || source;
    const theme = shop.theme || source.theme || {};
    const customDomain = shop.customDomain || {};
    const verifiedDomain = customDomain.status === 'Verified' ? String(customDomain.domain || '').trim() : '';
    const subdomain = String(shop.subdomain || '').trim();
    const canonical = verifiedDomain
        ? `https://${verifiedDomain}/`
        : (subdomain ? `https://${subdomain}.scaleup.codes/` : '');

    return {
        compatibilityMode: true,
        published: {
            seo: theme.seo || {},
            searchAliases: shop.searchAliases || source.searchAliases || []
        },
        draft: null,
        themeRevision: Number(shop.themeRevision || source.publication?.revision || 0),
        lastPublishedAt: shop.lastPublishedAt || source.publication?.lastPublishedAt || null,
        resolvedSeo: null,
        previewContext: null,
        health: null,
        capabilities: responseData.planAccess?.capabilityMetadata || source.planAccess?.capabilityMetadata || {},
        domain: {
            subdomain,
            customDomain,
            canonical,
            sitemap: canonical ? `${canonical.replace(/\/$/, '')}/sitemap.xml` : '',
            robots: canonical ? `${canonical.replace(/\/$/, '')}/robots.txt` : ''
        },
        shop: {
            shopName: shop.shopName || '',
            subdomain
        },
        seoStats: source.seoStats || {},
        socialAsset: null,
        legacyTheme: theme
    };
};

export function useHomepageSeo() {
    const [bootstrap, setBootstrap] = useState(null);
    const [savedSeo, setSavedSeo] = useState({});
    const [draftSeo, setDraftSeo] = useState({});
    const [savedAliases, setSavedAliases] = useState([]);
    const [draftAliases, setDraftAliases] = useState([]);
    const [themeRevision, setThemeRevision] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [draftStatus, setDraftStatus] = useState('idle');
    const [publishing, setPublishing] = useState(false);
    const [conflict, setConflict] = useState(null);
    const [aiState, setAiState] = useState({ loading: false, data: null, error: '' });
    const [uploading, setUploading] = useState(false);
    const autosaveTimer = useRef(null);
    const saveRequest = useRef(null);

    const hydrate = useCallback((payload) => {
        const data = payload?.data || payload;
        const publishedSeo = data?.published?.seo || {};
        const publishedAliases = data?.published?.searchAliases || [];
        const activeSeo = data?.draft?.seo || publishedSeo;
        const activeAliases = data?.draft?.searchAliases || publishedAliases;
        setBootstrap(data);
        setSavedSeo(publishedSeo);
        setSavedAliases(publishedAliases);
        setDraftSeo(activeSeo);
        setDraftAliases(activeAliases);
        setThemeRevision(Number(data?.themeRevision || 0));
        setConflict(data?.draft?.stale ? {
            latestRevision: Number(data?.themeRevision || 0),
            message: 'This draft was based on an older published storefront revision.'
        } : null);
        setDraftStatus(data?.draft ? 'saved' : 'idle');
    }, []);

    const load = useCallback(async ({ preserveDraft = false } = {}) => {
        setLoading(true);
        setError('');
        try {
            let data;
            try {
                const response = await API.get('/store-builder/admin/seo/bootstrap');
                data = response.data?.data;
            } catch (requestError) {
                if (requestError.response?.status !== 404) throw requestError;
                const fallbackResponse = await API.get('/store-builder/admin');
                data = buildLegacySeoBootstrap(fallbackResponse);
            }
            if (preserveDraft) {
                setBootstrap(data);
                setThemeRevision(Number(data?.themeRevision || 0));
                setSavedSeo(data?.published?.seo || {});
                setSavedAliases(data?.published?.searchAliases || []);
            } else {
                hydrate(data);
            }
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Homepage SEO could not be loaded.');
        } finally {
            setLoading(false);
        }
    }, [hydrate]);

    useEffect(() => {
        const timer = window.setTimeout(() => load(), 0);
        return () => {
            window.clearTimeout(timer);
            window.clearTimeout(autosaveTimer.current);
            saveRequest.current?.abort?.();
        };
    }, [load]);

    const isDirty = useMemo(
        () => snapshot(draftSeo, draftAliases) !== snapshot(savedSeo, savedAliases),
        [draftAliases, draftSeo, savedAliases, savedSeo]
    );

    const saveDraft = useCallback(async ({ quiet = false } = {}) => {
        if (!isDirty) return null;
        if (bootstrap?.compatibilityMode) {
            setDraftStatus('local');
            if (!quiet) toast.success('SEO changes are kept locally until you publish');
            return { seo: draftSeo, searchAliases: cleanAliases(draftAliases), localOnly: true };
        }
        saveRequest.current?.abort?.();
        const controller = new AbortController();
        saveRequest.current = controller;
        setDraftStatus('saving');
        try {
            const response = await API.put('/store-builder/admin/seo/draft', {
                seo: draftSeo,
                searchAliases: cleanAliases(draftAliases),
                basedOnRevision: themeRevision
            }, { signal: controller.signal });
            setDraftStatus(response.data?.data?.stale ? 'conflict' : 'saved');
            if (!quiet) toast.success('SEO draft saved');
            return response.data?.data;
        } catch (requestError) {
            if (requestError.code === 'ERR_CANCELED') return null;
            setDraftStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'failed');
            if (!quiet) toast.error(requestError.response?.data?.error || 'SEO draft could not be saved.');
            return null;
        }
    }, [bootstrap?.compatibilityMode, draftAliases, draftSeo, isDirty, themeRevision]);

    useEffect(() => {
        window.clearTimeout(autosaveTimer.current);
        if (!isDirty || publishing || conflict) return undefined;
        autosaveTimer.current = window.setTimeout(() => saveDraft({ quiet: true }), 1200);
        return () => window.clearTimeout(autosaveTimer.current);
    }, [conflict, draftAliases, draftSeo, isDirty, publishing, saveDraft]);

    useEffect(() => {
        const warn = (event) => {
            if (!isDirty) return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [isDirty]);

    const updateSeo = useCallback((key, value) => {
        setDraftSeo(previous => ({ ...previous, [key]: value }));
    }, []);

    const publish = useCallback(async () => {
        setPublishing(true);
        setConflict(null);
        try {
            let data;
            if (bootstrap?.compatibilityMode) {
                const response = await API.patch('/store-builder/admin', {
                    theme: {
                        ...(bootstrap.legacyTheme || {}),
                        seo: draftSeo
                    },
                    searchAliases: cleanAliases(draftAliases),
                    expectedRevision: themeRevision
                });
                const savedShop = response.data?.data || {};
                data = {
                    seo: savedShop.theme?.seo || draftSeo,
                    searchAliases: savedShop.searchAliases || cleanAliases(draftAliases),
                    themeRevision: Number(savedShop.themeRevision || themeRevision),
                    lastPublishedAt: savedShop.lastPublishedAt || new Date().toISOString()
                };
            } else {
                const response = await API.post('/store-builder/admin/seo/publish', {
                    seo: draftSeo,
                    searchAliases: cleanAliases(draftAliases),
                    expectedRevision: themeRevision
                });
                data = response.data?.data || {};
            }
            setSavedSeo(data.seo || {});
            setDraftSeo(data.seo || {});
            setSavedAliases(data.searchAliases || []);
            setDraftAliases(data.searchAliases || []);
            setThemeRevision(Number(data.themeRevision || themeRevision));
            setBootstrap(previous => previous ? {
                ...previous,
                published: { seo: data.seo || {}, searchAliases: data.searchAliases || [] },
                draft: null,
                themeRevision: Number(data.themeRevision || themeRevision),
                lastPublishedAt: data.lastPublishedAt || previous.lastPublishedAt
            } : previous);
            setDraftStatus('idle');
            toast.success('Homepage SEO published');
            await load();
            return true;
        } catch (requestError) {
            const payload = requestError.response?.data || {};
            if (payload.code === 'THEME_CONFLICT' || requestError.response?.status === 409) {
                setConflict({
                    latestRevision: payload.latestRevision,
                    lastPublishedAt: payload.lastPublishedAt,
                    message: payload.message || 'Another session published storefront changes.'
                });
                setDraftStatus('conflict');
            } else {
                toast.error(payload.error || 'Homepage SEO could not be published.');
            }
            return false;
        } finally {
            setPublishing(false);
        }
    }, [bootstrap?.compatibilityMode, bootstrap?.legacyTheme, draftAliases, draftSeo, load, themeRevision]);

    const discardDraft = useCallback(async () => {
        if (!bootstrap?.compatibilityMode) {
            await API.delete('/store-builder/admin/seo/draft');
        }
        setDraftSeo(savedSeo);
        setDraftAliases(savedAliases);
        setConflict(null);
        setDraftStatus('idle');
        toast.success('SEO draft discarded');
    }, [bootstrap?.compatibilityMode, savedAliases, savedSeo]);

    const rebaseDraftOnLatest = useCallback(async () => {
        await load({ preserveDraft: true });
        setConflict(null);
        setDraftStatus('idle');
        toast.success('Latest revision loaded. Your local SEO draft is still here for review.');
    }, [load]);

    const requestAiSuggestions = useCallback(async () => {
        setAiState({ loading: true, data: null, error: '' });
        try {
            const response = await API.post('/store-builder/admin/seo/ai-suggest', {
                currentTheme: { seo: draftSeo },
                language: draftSeo.language || 'en-BD',
                spellingPreference: draftSeo.spellingPreference || 'british'
            }, { headers: aiRequestHeaders('seo.homepage') });
            setAiState({ loading: false, data: response.data?.data || response.data, error: '' });
        } catch (requestError) {
            setAiState({
                loading: false,
                data: null,
                error: requestError.response?.data?.error || 'AI SEO suggestions are unavailable right now.'
            });
        }
    }, [draftSeo]);

    const applyAiSuggestion = useCallback((suggestion, fields = ['title', 'description']) => {
        if (!suggestion) return;
        setDraftSeo(previous => ({
            ...previous,
            ...fields.reduce((updates, field) => {
                if (suggestion[field]) updates[field] = suggestion[field];
                return updates;
            }, {}),
            aiSuggestion: {
                alternatives: aiState.data?.alternatives || [],
                generatedAt: aiState.data?.generatedAt || new Date().toISOString(),
                generatedFromHash: aiState.data?.generatedFromHash || '',
                inputSnapshot: aiState.data?.inputSnapshot || null,
                acceptedOptionId: suggestion.id || '',
                acceptedFields: fields,
                acceptedAt: new Date().toISOString()
            }
        }));
    }, [aiState.data]);

    const removeSocialImage = useCallback(() => {
        setDraftSeo(previous => ({
            ...previous,
            socialImage: '',
            socialImageAssetId: null,
            socialImageWidth: null,
            socialImageHeight: null,
            socialImageMimeType: '',
            socialImageAlt: ''
        }));
    }, []);

    const uploadSocialImage = useCallback(async (file) => {
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('target', 'seo.socialImage');
            const response = await API.post('/store-builder/admin/image', formData);
            const asset = response.data?.data || {};
            setDraftSeo(previous => ({
                ...previous,
                socialImage: asset.url || '',
                socialImageAssetId: asset.assetId || null,
                socialImageWidth: asset.width || null,
                socialImageHeight: asset.height || null,
                socialImageMimeType: asset.mimeType || ''
            }));
        } catch (requestError) {
            toast.error(requestError.response?.data?.error || 'Social image upload failed.');
        } finally {
            setUploading(false);
        }
    }, []);

    const resolvedSeo = useMemo(() => {
        if (!bootstrap) return null;
        const canonical = bootstrap.resolvedSeo?.canonical || bootstrap.domain?.canonical;
        const previewContext = bootstrap.previewContext || {};
        const indexingContext = previewContext.indexing || {};
        const legacyIndexable = bootstrap.resolvedSeo?.robots?.follow !== false;
        return resolveHomepageSeo({
            ...previewContext,
            seo: draftSeo,
            shopIdentity: {
                ...(previewContext.shopIdentity || {}),
                shopName: bootstrap.shop?.shopName,
                displayName: bootstrap.shop?.shopName,
                subdomain: bootstrap.shop?.subdomain,
                searchAliases: draftAliases,
                primaryCategory: draftSeo.primaryCategory,
                language: draftSeo.language || 'en-BD'
            },
            domain: {
                ...(previewContext.domain || {}),
                canonicalUrl: canonical
            },
            indexing: {
                ...indexingContext,
                vendorVisible: draftSeo.searchEngineVisibility !== false,
                shopPublished: indexingContext.shopPublished ?? legacyIndexable,
                platformAllowed: indexingContext.platformAllowed ?? legacyIndexable,
                environmentAllowsIndexing: indexingContext.environmentAllowsIndexing ?? legacyIndexable
            }
        });
    }, [bootstrap, draftAliases, draftSeo]);

    const health = useMemo(() => resolvedSeo ? evaluateHomepageSeo(resolvedSeo, {
        productCount: bootstrap?.seoStats?.products?.total || 0,
        collectionCount: bootstrap?.seoStats?.collections?.total || 0,
        imageAltCoverage: bootstrap?.seoStats?.imageAltCoverage || 0,
        googleSiteVerification: draftSeo.googleSiteVerification,
        customDomainConnected: bootstrap?.domain?.customDomain?.status === 'Verified',
        h1: bootstrap?.previewContext?.storefrontContent?.heroTitle || '',
        internalLinkCount: bootstrap?.previewContext?.storefrontContent?.internalLinkCount || 0
    }) : bootstrap?.health, [bootstrap, draftSeo.googleSiteVerification, resolvedSeo]);

    return {
        bootstrap,
        savedSeo,
        draftSeo,
        draftAliases,
        setDraftAliases,
        themeRevision,
        loading,
        error,
        isDirty,
        draftStatus,
        publishing,
        conflict,
        aiState,
        uploading,
        resolvedSeo,
        health,
        updateSeo,
        saveDraft,
        publish,
        discardDraft,
        rebaseDraftOnLatest,
        load,
        requestAiSuggestions,
        applyAiSuggestion,
        uploadSocialImage,
        removeSocialImage
    };
}
