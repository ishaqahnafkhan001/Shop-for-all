import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { extractThemeAssetUrls, summarizeThemeChanges, validateTheme } from '@scaleup/storefront-theme';
import {
    Lock,
    X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../../api/api';
import { BuilderButton } from './builderUi.jsx';
import { StoreBuilderHeader } from './StoreBuilderHeader.jsx';
import { StoreBuilderSidebar } from './StoreBuilderSidebar.jsx';
import { StoreBuilderEditorPanel } from './StoreBuilderEditorPanel.jsx';
import { StoreBuilderShell } from './shell/StoreBuilderShell.jsx';
import { IssuesDrawer } from './shell/IssuesDrawer.jsx';
import { HistoryDrawer } from './shell/HistoryDrawer.jsx';
import {
    POLICY_LABELS,
    getDefaultPolicyText
} from '../../../utils/storeBuilderPolicies.js';
import { AdminErrorState, AdminLoadingState } from '../../../components/ui/AdminState.jsx';
import { scoreStoreSeo } from '../../../utils/seoHealth.js';
import {
    previewPages,
    usePreviewMode
} from './hooks/usePreviewMode.js';
import { useStoreBuilderDirtyState } from './hooks/useStoreBuilderDirtyState.js';
import { useStoreBuilderBootstrap } from './hooks/useStoreBuilderBootstrap.js';
import { useAutosaveRecovery } from './hooks/useAutosaveRecovery.js';
import { useThemeMedia } from './hooks/useThemeMedia.js';
import {
    HERO_SLIDE_LIMIT,
    HISTORY_LIMIT,
    colorFields,
    fixedPreviewElements,
    getSectionIndexFromSelection,
    getSectionSelectionId,
    groupElementMap,
    inlineSectionPresets,
    isHomepageSectionLocked,
    resolveEditorComponent,
    settingsGroups
} from './storeBuilderConstants.jsx';
import {
    createHeroSlide,
    createBuilderSectionId,
    defaultTheme,
    formatBuilderDate,
    getBuilderHeroSlides,
    isHexColor,
    mergeTheme,
    normalizeHeroSlideForBuilder,
    normalizeHomepageSections,
    safeParseSnapshot,
    stableStringify,
    syncHeroLegacyFields
} from './storeBuilderThemeUtils.js';
import {
    buildBrandColorSet,
    colorSectionGroups,
    contrastRatio,
    getColorPathValue,
    mergeColorUpdates,
    nestedColorFields,
    setColorPathValue
} from './storeBuilderColorConfig.js';

const StoreBuilderPreviewPanel = lazy(() => import('./StoreBuilderPreviewPanel.jsx').then(module => ({ default: module.StoreBuilderPreviewPanel })));
const ColorEditor = lazy(() => import('./editors/ColorEditor.jsx').then(module => ({ default: module.ColorEditor })));
const DynamicSectionsEditor = lazy(() => import('./editors/DynamicSectionsEditor.jsx').then(module => ({ default: module.DynamicSectionsEditor })));
const DomainEditor = lazy(() => import('./editors/DomainEditor.jsx').then(module => ({ default: module.DomainEditor })));
const BrandEditor = lazy(() => import('./editors/BasicEditors.jsx').then(module => ({ default: module.BrandEditor })));
const TypographyEditor = lazy(() => import('./editors/BasicEditors.jsx').then(module => ({ default: module.TypographyEditor })));
const LayoutEditor = lazy(() => import('./editors/BasicEditors.jsx').then(module => ({ default: module.LayoutEditor })));
const SeoStatusEditor = lazy(() => import('./editors/BasicEditors.jsx').then(module => ({ default: module.SeoStatusEditor })));
const MobileEditor = lazy(() => import('./editors/BasicEditors.jsx').then(module => ({ default: module.MobileEditor })));
const PoliciesEditor = lazy(() => import('./editors/BasicEditors.jsx').then(module => ({ default: module.PoliciesEditor })));
const CheckoutEditor = lazy(() => import('./editors/CheckoutEditor.jsx').then(module => ({ default: module.CheckoutEditor })));
const FooterEditor = lazy(() => import('./editors/FooterEditor.jsx').then(module => ({ default: module.FooterEditor })));
const NavigationEditor = lazy(() => import('./editors/NavigationEditor.jsx').then(module => ({ default: module.NavigationEditor })));
const HeroEditor = lazy(() => import('./editors/HeroEditor.jsx').then(module => ({ default: module.HeroEditor })));
const ProductCardsEditor = lazy(() => import('./editors/ProductCardsEditor.jsx').then(module => ({ default: module.ProductCardsEditor })));

const isCustomDomainConnected = (customDomain = {}) => (
    customDomain?.status === 'Verified' &&
    Boolean(customDomain?.domain) &&
    customDomain?.ownershipVerified === true &&
    (customDomain?.routingVerified === true || customDomain?.manuallyVerifiedRouting === true)
);

const DEFAULT_PLAN_ACCESS = {
    planKey: 'starter',
    storeBuilderAccess: 'limited',
    storeBuilderCapabilities: {},
    features: {}
};

const StoreBuilderPage = () => {
    const { loading, data: bootstrap, error: bootstrapError, reload: reloadBootstrap } = useStoreBuilderBootstrap();
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingThemeImage, setUploadingThemeImage] = useState(false);
    const [checkingDomain, setCheckingDomain] = useState(false);
    const [shopName, setShopName] = useState('');
    const [shopSubdomain, setShopSubdomain] = useState('');
    const [planAccess, setPlanAccess] = useState(DEFAULT_PLAN_ACCESS);
    const [theme, setTheme] = useState(defaultTheme);
    const [savedTheme, setSavedTheme] = useState(defaultTheme);
    const [searchAliases, setSearchAliases] = useState([]);
    const [hydratedShopKey, setHydratedShopKey] = useState('');
    const [availableProducts, setAvailableProducts] = useState([]);
    const [productOptions, setProductOptions] = useState([]);
    const [productCategories, setProductCategories] = useState([]);
    const [productPicker, setProductPicker] = useState({ search: '', category: 'All', page: 1, pages: 1, loading: false });
    const [availableReviews, setAvailableReviews] = useState([]);
    const [seoStats, setSeoStats] = useState(null);
    const [reviewPicker, setReviewPicker] = useState({ search: '', page: 1, pages: 1, loading: false });
    const [customDomain, setCustomDomain] = useState({ domain: '' });
    const [storewideDiscount, setStorewideDiscount] = useState(0);
    const [activeGroup, setActiveGroup] = useState('brand');
    const [activeElement, setActiveElement] = useState('logo');
    const { device, setDevice, previewPage, setPreviewPage } = usePreviewMode();
    const [mobileWorkspace, setMobileWorkspace] = useState('structure');
    const [initialSnapshot, setInitialSnapshot] = useState('');
    const [editorHistory, setEditorHistory] = useState({ past: [], future: [] });
    const [lastSavedAt, setLastSavedAt] = useState('');
    const [lastPublishedAt, setLastPublishedAt] = useState('');
    const [themeRevision, setThemeRevision] = useState(0);
    const [revisions, setRevisions] = useState([]);
    const [recoveryDraft, setRecoveryDraft] = useState(null);
    const [themeConflict, setThemeConflict] = useState(null);
    const [publishReviewOpen, setPublishReviewOpen] = useState(false);
    const [issuesOpen, setIssuesOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [inspectorOpen, setInspectorOpen] = useState(true);
    const [advancedColorsOpen, setAdvancedColorsOpen] = useState(false);
    const [colorMode, setColorMode] = useState('quick');
    const [colorSearch, setColorSearch] = useState('');
    const [openColorSection, setOpenColorSection] = useState('productCard');
    const historyModeRef = useRef('record');
    const lastHistorySnapshotRef = useRef('');
    const dirtyRef = useRef(false);
    const {
        rememberTemporaryAsset,
        discardTemporaryAsset,
        clearTemporaryAssets
    } = useThemeMedia({ theme });

    const {
        currentSnapshot,
        hasUnsavedChanges,
        publishedVersionLabel
    } = useStoreBuilderDirtyState({
        theme,
        searchAliases,
        customDomain,
        storewideDiscount,
        initialSnapshot
    });
    const canUndo = editorHistory.past.length > 0;
    const canRedo = editorHistory.future.length > 0;
    const autosave = useAutosaveRecovery({
        shopKey: hydratedShopKey,
        enabled: hasUnsavedChanges && !saving,
        currentSnapshot,
        theme,
        searchAliases,
        customDomain,
        storewideDiscount,
        basedOnRevision: themeRevision
    });
    useEffect(() => {
        dirtyRef.current = hasUnsavedChanges;
    }, [hasUnsavedChanges]);

    useEffect(() => {
        let checking = false;
        const refreshSeoStatus = async () => {
            if (checking) return;
            checking = true;
            try {
                const response = await API.get('/store-builder/admin/seo/bootstrap');
                const seoBootstrap = response.data?.data;
                if (seoBootstrap?.seoStats) setSeoStats(seoBootstrap.seoStats);
                const latestRevision = Number(seoBootstrap?.themeRevision || 0);
                if (latestRevision <= themeRevision) return;
                if (dirtyRef.current) {
                    setThemeConflict({
                        latestRevision,
                        lastPublishedAt: seoBootstrap?.lastPublishedAt,
                        message: 'Homepage SEO or storefront settings were published in another session.'
                    });
                    return;
                }
                setHydratedShopKey('');
                await reloadBootstrap({ keepCurrent: true });
            } catch {
                // Keep the current editor state when the background status check fails.
            } finally {
                checking = false;
            }
        };
        window.addEventListener('focus', refreshSeoStatus);
        return () => window.removeEventListener('focus', refreshSeoStatus);
    }, [reloadBootstrap, themeRevision]);

    useEffect(() => {
        const local = autosave.localRecovery;
        if (!local?.snapshot || recoveryDraft || Number(local.basedOnRevision || 0) !== themeRevision) return;
        if (local.snapshot !== initialSnapshot) {
            const timer = window.setTimeout(() => setRecoveryDraft({ ...local, source: 'local' }), 0);
            return () => window.clearTimeout(timer);
        }
        return undefined;
    }, [autosave.localRecovery, initialSnapshot, recoveryDraft, themeRevision]);

    const selectedLabel = useMemo(() => {
        const selectionTheme = { homepageSections: theme.homepageSections, navigation: theme.navigation };
        return resolveEditorComponent(activeElement, selectionTheme)?.label || settingsGroups.find(item => item.id === activeGroup)?.label || 'Store element';
    }, [activeElement, activeGroup, theme]);
    const selectedIsLockedLayout = useMemo(() => {
        if (fixedPreviewElements.has(activeElement)) return true;
        if (!activeElement?.startsWith('section-') && !activeElement?.startsWith('section:')) return false;
        const sectionIndex = getSectionIndexFromSelection(activeElement, theme);
        return isHomepageSectionLocked(theme.homepageSections?.[sectionIndex]);
    }, [activeElement, theme]);
    const selectedPlanRestriction = useMemo(() => {
        if (planAccess.storeBuilderAccess === 'full') return '';
        if (activeGroup === 'domain' && planAccess.features?.customDomain === false) {
            return planAccess.capabilityMetadata?.customDomain?.label || 'Custom domains are not included in your current plan.';
        }
        if (['layout', 'mobile'].includes(activeGroup)) {
            return planAccess.capabilityMetadata?.advancedDesign?.label || 'Advanced design controls are not included in your current plan.';
        }
        if (activeGroup !== 'sections') return '';
        if (activeElement?.startsWith('section-') || activeElement?.startsWith('section:')) {
            const index = getSectionIndexFromSelection(activeElement, theme);
            if (theme.homepageSections?.[index]?.type === 'FeaturedProducts') return '';
        }
        return planAccess.capabilityMetadata?.sections?.label || 'Advanced homepage sections are not included in your current plan.';
    }, [activeElement, activeGroup, planAccess, theme]);
    const storeSeoSignals = useMemo(() => {
        if (seoStats) {
            return {
                productCount: Number(seoStats.products?.total || 0),
                collectionCount: Number(seoStats.collections?.total || 0),
                imageAltCoverage: Number(seoStats.imageAltCoverage || 0)
            };
        }
        const productsWithAltText = availableProducts.filter(product => String(product.imageAltText || '').trim()).length;
        const collectionIds = new Set(
            availableProducts
                .flatMap(product => Array.isArray(product.collections) ? product.collections : [])
                .map(String)
                .filter(Boolean)
        );

        return {
            productCount: availableProducts.length,
            collectionCount: collectionIds.size,
            imageAltCoverage: availableProducts.length ? Math.round((productsWithAltText / availableProducts.length) * 100) : 0
        };
    }, [availableProducts, seoStats]);
    const storeSeoHealth = useMemo(() => scoreStoreSeo({
        theme,
        shopName,
        searchAliases,
        productCount: storeSeoSignals.productCount,
        customDomain,
        collectionCount: storeSeoSignals.collectionCount,
        imageAltCoverage: storeSeoSignals.imageAltCoverage
    }), [customDomain, searchAliases, shopName, storeSeoSignals, theme]);
    const publishChangeSummary = useMemo(
        () => summarizeThemeChanges(savedTheme, theme),
        [savedTheme, theme]
    );
    const liveStoreUrl = useMemo(() => {
        if (isCustomDomainConnected(customDomain)) return `https://${customDomain.domain}`;
        if (!shopSubdomain) return '';
        const configuredBase = String(import.meta.env.VITE_API_DOMAIN || 'localhost:3000').replace(/^https?:\/\//, '').replace(/^www\./, '');
        return `${configuredBase.includes('localhost') ? 'http' : 'https'}://${shopSubdomain}.${configuredBase}`;
    }, [customDomain, shopSubdomain]);

    const selectEditorTarget = (target) => {
        if (!target) return;
        const selection = resolveEditorComponent(target, theme);
        setActiveElement(target);
        if (selection?.group) setActiveGroup(selection.group);
        setInspectorOpen(true);
        setMobileWorkspace('edit');
    };

    const selectSettingsGroup = (groupId) => {
        setActiveGroup(groupId);
        setActiveElement(groupElementMap[groupId] || groupId);
        setInspectorOpen(true);
        setMobileWorkspace('edit');
    };

    const validationDetails = useMemo(() => {
        const colorErrors = colorFields
            .filter(field => !isHexColor(theme.colors?.[field.key]))
            .map(field => ({ path: `colors.${field.key}`, message: `${field.label} must be a valid hex color.`, group: 'colors' }));
        const nestedColorErrors = nestedColorFields
            .filter(field => {
                const value = getColorPathValue(theme.colors, field.path);
                return value && !isHexColor(value);
            })
            .map(field => ({ path: `colors.${field.path}`, message: `${field.label} must be a valid hex color.`, group: 'colors' }));
        const discountNumber = Number(storewideDiscount);
        const discountErrors = Number.isNaN(discountNumber) || discountNumber < 0 || discountNumber > 100
            ? [{ path: 'storewideDiscount', message: 'Storewide discount must be between 0 and 100.', group: 'checkout' }]
            : [];
        const navErrors = (theme.navigation || [])
            .filter(item => item?.url && !item?.label)
            .map((_, index) => ({ path: `navigation.${index}.label`, message: 'Navigation links with a URL need a label.', group: 'navigation' }));
        const navChildErrors = (theme.navigation || [])
            .flatMap(item => item?.children || [])
            .filter(item => item?.url && !item?.label)
            .map((_, index) => ({ path: `navigation.children.${index}.label`, message: 'Nested navigation links with a URL need a label.', group: 'navigation' }));
        const productColorErrors = [
            ['Product card price color', theme.productCard?.priceColor || theme.colors?.priceColor],
            ['Product card button color', theme.productCard?.buttonColor || theme.colors?.primaryButtonBg]
        ]
            .filter(([, value]) => value && !isHexColor(value))
            .map(([label], index) => ({ path: index === 0 ? 'productCard.priceColor' : 'productCard.buttonColor', message: `${label} must be a valid hex color.`, group: 'products' }));
        const contractErrors = validateTheme(theme).errors.map(error => ({
            ...error,
            group: error.path?.startsWith('seo.')
                ? 'seo'
                : error.path?.startsWith('homepageSections.')
                    ? 'sections'
                    : error.path?.startsWith('navigation.')
                        ? 'navigation'
                        : 'brand'
        }));

        return [...contractErrors, ...colorErrors, ...nestedColorErrors, ...discountErrors, ...navErrors, ...navChildErrors, ...productColorErrors];
    }, [theme, storewideDiscount]);
    const validation = useMemo(() => validationDetails.map(error => error.message), [validationDetails]);

    const mergeProductCache = (products = []) => {
        setAvailableProducts(prev => {
            const map = new Map(prev.map(product => [String(product._id), product]));
            products.forEach(product => {
                if (product?._id) map.set(String(product._id), product);
            });
            return Array.from(map.values());
        });
    };

    const loadProductOptions = async ({ page = 1, append = false, search = productPicker.search, category = productPicker.category } = {}) => {
        setProductPicker(prev => ({ ...prev, loading: true }));
        try {
            const { data } = await API.get('/admin/products', {
                params: {
                    limit: 10,
                    page,
                    status: 'Published',
                    ...(search ? { search } : {}),
                    ...(category && category !== 'All' ? { category } : {})
                }
            });
            const products = data.data || [];
            setProductOptions(prev => append ? [...prev, ...products.filter(product => !prev.some(item => item._id === product._id))] : products);
            mergeProductCache(products);
            setProductCategories(data.categories || []);
            setProductPicker(prev => ({
                ...prev,
                search,
                category,
                page: data.pagination?.page || page,
                pages: data.pagination?.pages || 1,
                loading: false
            }));
        } catch {
            setProductPicker(prev => ({ ...prev, loading: false }));
            toast.error('Failed to load products for selection');
        }
    };

    const loadReviewOptions = async ({ page = 1, append = false, search = reviewPicker.search, ids = '' } = {}) => {
        setReviewPicker(prev => ({ ...prev, loading: true }));
        try {
            const { data } = await API.get('/store-builder/admin/reviews', {
                params: {
                    page,
                    limit: 10,
                    rating: 5,
                    ...(search ? { search } : {}),
                    ...(ids ? { ids } : {})
                }
            });
            const reviews = data.data || [];
            setAvailableReviews(prev => {
                const selectedIds = new Set((theme.homepageSections || [])
                    .flatMap(section => section.type === 'Reviews' ? (section.settings?.reviewIds || []) : [])
                    .map(String));
                const selectedExisting = prev.filter(review => selectedIds.has(String(review._id)));
                if (ids) {
                    const map = new Map(prev.map(review => [String(review._id), review]));
                    reviews.forEach(review => map.set(String(review._id), review));
                    return Array.from(map.values());
                }
                if (!append) {
                    const map = new Map(selectedExisting.map(review => [String(review._id), review]));
                    reviews.forEach(review => map.set(String(review._id), review));
                    return Array.from(map.values());
                }
                const map = new Map(prev.map(review => [String(review._id), review]));
                reviews.forEach(review => map.set(String(review._id), review));
                return Array.from(map.values());
            });
            setReviewPicker(prev => ({
                ...prev,
                search,
                page: data.pagination?.page || page,
                pages: data.pagination?.pages || 1,
                loading: false
            }));
        } catch {
            setReviewPicker(prev => ({ ...prev, loading: false }));
            toast.error('Failed to load reviews');
        }
    };

    useEffect(() => {
        if (!bootstrap?.shop) return;
        const shop = bootstrap.shop;
        const shopKey = String(shop._id || shop.id || shop.subdomain || '');
        const nextRevision = Number(bootstrap.publication?.revision ?? shop.themeRevision ?? 0);
        const sameShop = hydratedShopKey && hydratedShopKey === shopKey;

        if (sameShop && dirtyRef.current) return;

        const nextTheme = mergeTheme(defaultTheme, shop.theme || {});
        const nextSearchAliases = Array.isArray(shop.searchAliases) ? shop.searchAliases : [];
        const nextDomain = shop.customDomain || { domain: '' };
        const nextDiscount = Number(shop.storewideDiscount) || 0;
        const initialProducts = bootstrap.products || [];
        const initialReviews = bootstrap.reviews || [];
        setShopName(shop.shopName || '');
        setShopSubdomain(shop.subdomain || '');
        setPlanAccess(bootstrap.planAccess || shop.planAccess || DEFAULT_PLAN_ACCESS);
        setHydratedShopKey(shopKey);
        setSavedTheme(nextTheme);
        setTheme(nextTheme);
        setSearchAliases(nextSearchAliases);
        setAvailableProducts(initialProducts);
        setProductOptions(initialProducts.slice(0, 10));
        setProductCategories(bootstrap.categories || []);
        setAvailableReviews(initialReviews);
        setSeoStats(bootstrap.seoStats || null);
        setCustomDomain(nextDomain);
        setStorewideDiscount(nextDiscount);
        setThemeRevision(nextRevision);
        setRevisions(bootstrap.revisions || []);
        setLastSavedAt(shop.lastPublishedAt || shop.updatedAt || '');
        setLastPublishedAt(bootstrap.publication?.lastPublishedAt || shop.lastPublishedAt || '');
        const loadedSnapshot = stableStringify({ theme: nextTheme, searchAliases: nextSearchAliases, customDomain: nextDomain, storewideDiscount: nextDiscount });
        setInitialSnapshot(loadedSnapshot);
        lastHistorySnapshotRef.current = loadedSnapshot;
        setEditorHistory({ past: [], future: [] });

        const serverDraft = bootstrap.draft;
        if (serverDraft?.theme && !serverDraft.stale) {
            const draftSnapshot = stableStringify({
                theme: mergeTheme(defaultTheme, serverDraft.theme),
                searchAliases: serverDraft.searchAliases || nextSearchAliases,
                customDomain: serverDraft.customDomain || nextDomain,
                storewideDiscount: Number(serverDraft.storewideDiscount) || 0
            });
            if (draftSnapshot !== loadedSnapshot) {
                window.setTimeout(() => setRecoveryDraft({ ...serverDraft, snapshot: draftSnapshot, source: 'server' }), 0);
            }
        }
    }, [bootstrap, hydratedShopKey]);

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (!hasUnsavedChanges) return;
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    useEffect(() => {
        if (loading) return;

        if (!lastHistorySnapshotRef.current) {
            lastHistorySnapshotRef.current = currentSnapshot;
            return;
        }

        if (historyModeRef.current === 'skip') {
            historyModeRef.current = 'record';
            lastHistorySnapshotRef.current = currentSnapshot;
            return;
        }

        if (lastHistorySnapshotRef.current === currentSnapshot) return undefined;

        const timer = window.setTimeout(() => {
            const previousSnapshot = lastHistorySnapshotRef.current;
            if (!previousSnapshot || previousSnapshot === currentSnapshot) return;
            lastHistorySnapshotRef.current = currentSnapshot;
            setEditorHistory(prev => ({
                past: [...prev.past, previousSnapshot].slice(-HISTORY_LIMIT),
                future: []
            }));
        }, 550);

        return () => window.clearTimeout(timer);
    }, [currentSnapshot, loading]);

    const setColor = (key, value) => {
        setTheme(prev => ({
            ...prev,
            colors: { ...prev.colors, [key]: value }
        }));
    };

    const setColorPath = (path, value) => {
        setTheme(prev => ({
            ...prev,
            colors: setColorPathValue(prev.colors || {}, path, value)
        }));
    };

    const applyColorSet = (colors = {}, label = 'Palette') => {
        setTheme(prev => ({
            ...prev,
            colors: mergeColorUpdates(
                prev.colors || {},
                colors?.accent ? mergeColorUpdates(buildBrandColorSet(colors.accent), colors) : colors
            )
        }));
        toast.success(`${label} applied`);
    };

    const applyBrandColor = () => {
        const brandColor = theme.colors?.accent || defaultTheme.colors.accent;
        if (!isHexColor(brandColor)) {
            toast.error('Choose a valid main brand color first.');
            return;
        }
        applyColorSet(buildBrandColorSet(brandColor), 'Brand color');
    };

    const resetColorPalette = () => {
        setTheme(prev => ({
            ...prev,
            colors: { ...defaultTheme.colors },
            productCard: {
                ...(prev.productCard || {}),
                priceColor: defaultTheme.productCard?.priceColor,
                buttonColor: defaultTheme.productCard?.buttonColor
            }
        }));
        toast.success('Default color palette restored');
    };

    const resetColorGroup = (groupId) => {
        const defaultGroup = defaultTheme.colors?.[groupId];
        if (!defaultGroup || typeof defaultGroup !== 'object') return;
        setTheme(prev => ({
            ...prev,
            colors: {
                ...(prev.colors || {}),
                [groupId]: { ...defaultGroup }
            }
        }));
        toast.success(`${colorSectionGroups.find(group => group.id === groupId)?.title || 'Section'} colors reset`);
    };

    const getThemeColor = (path, fallback = '#000000') => (
        getColorPathValue(theme.colors, path) ||
        getColorPathValue(defaultTheme.colors, path) ||
        theme.colors?.[path] ||
        defaultTheme.colors?.[path] ||
        fallback
    );

    const getContrastWarning = (field) => {
        if (!field.contrastWith) return '';
        const foreground = getThemeColor(field.path);
        const background = getThemeColor(field.contrastWith);
        const ratio = contrastRatio(foreground, background);
        if (ratio === null || ratio >= 4.5) return '';
        return `Low contrast with ${field.contrastWith.replace('.', ' ')}. Try a darker or lighter color.`;
    };

    const setMainBrandColor = (value) => {
        setTheme(prev => ({
            ...prev,
            colors: mergeColorUpdates(prev.colors || {}, {
                accent: value,
                brand: {
                    ...(prev.colors?.brand || {}),
                    primary: value,
                    accent: value
                }
            })
        }));
    };

    const setThemeGroup = (group, key, value) => {
        setTheme(prev => ({
            ...prev,
            [group]: { ...(prev[group] || {}), [key]: value }
        }));
    };

    const updateHeroSlides = (updater) => {
        setTheme(prev => {
            const currentSlides = getBuilderHeroSlides(prev.hero);
            const nextSlides = updater(currentSlides)
                .map((slide, index) => normalizeHeroSlideForBuilder(slide, index, prev.hero))
                .slice(0, HERO_SLIDE_LIMIT);
            const safeSlides = nextSlides.length > 0 ? nextSlides : [createHeroSlide({ id: `hero-slide-${Date.now()}` })];

            return {
                ...prev,
                hero: syncHeroLegacyFields(prev.hero, safeSlides)
            };
        });
    };

    const updateHeroSlide = (index, key, value) => {
        updateHeroSlides(slides => slides.map((slide, i) => (
            i === index ? { ...slide, [key]: value } : slide
        )));
    };

    const addHeroSlide = () => {
        const currentCount = getBuilderHeroSlides(theme.hero).length;
        if (currentCount >= HERO_SLIDE_LIMIT) {
            toast.error(`You can add up to ${HERO_SLIDE_LIMIT} hero slides.`);
            return;
        }

        updateHeroSlides(slides => [
            ...slides,
            createHeroSlide({
                id: `hero-slide-${Date.now()}`,
                title: 'New seasonal offer'
            })
        ]);
    };

    const removeHeroSlide = (index) => {
        const slide = getBuilderHeroSlides(theme.hero)[index];
        [slide?.desktopImage, slide?.mobileImage].filter(Boolean).forEach(url => discardTemporaryAsset(url));
        updateHeroSlides(slides => slides.filter((_, i) => i !== index));
    };

    const moveHeroSlide = (index, direction) => {
        updateHeroSlides(slides => {
            const nextSlides = [...slides];
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= nextSlides.length) return nextSlides;
            [nextSlides[index], nextSlides[targetIndex]] = [nextSlides[targetIndex], nextSlides[index]];
            return nextSlides;
        });
    };

    const toggleThemeGroup = (group, key) => {
        setTheme(prev => ({
            ...prev,
            [group]: { ...(prev[group] || {}), [key]: !prev[group]?.[key] }
        }));
    };

    const updateHomepageSection = (index, field, value) => {
        setTheme(prev => ({
            ...prev,
            homepageSections: (prev.homepageSections || []).map((section, i) => (
                i === index && !isHomepageSectionLocked(section) ? { ...section, [field]: value } : section
            ))
        }));
    };

    const updateHomepageSectionSetting = (index, key, value) => {
        setTheme(prev => ({
            ...prev,
            homepageSections: (prev.homepageSections || []).map((section, i) => (
                i === index && (!isHomepageSectionLocked(section) || key === 'isLocked')
                    ? { ...section, settings: { ...(section.settings || {}), [key]: value } }
                    : section
            ))
        }));
    };

    const updateHomepageSectionMobileSetting = (index, key, value) => {
        setTheme(prev => ({
            ...prev,
            homepageSections: (prev.homepageSections || []).map((section, i) => (
                i === index && !isHomepageSectionLocked(section)
                    ? { ...section, mobileSettings: { ...(section.mobileSettings || {}), [key]: value } }
                    : section
            ))
        }));
    };

    const updateHomepageSectionDesktopSetting = (index, key, value) => {
        setTheme(prev => ({
            ...prev,
            homepageSections: (prev.homepageSections || []).map((section, i) => (
                i === index && !isHomepageSectionLocked(section)
                    ? { ...section, desktopSettings: { ...(section.desktopSettings || {}), [key]: value } }
                    : section
            ))
        }));
    };

    const updateFeaturedProductsSelection = (index, productId, checked) => {
        setTheme(prev => ({
            ...prev,
            homepageSections: (prev.homepageSections || []).map((section, i) => {
                if (i !== index || isHomepageSectionLocked(section)) return section;
                const currentIds = section.settings?.productIds || section.settings?.source?.productIds || [];
                const nextIds = checked
                    ? [...new Set([...currentIds, productId])]
                    : currentIds.filter(id => id !== productId);

                return {
                    ...section,
                    settings: {
                        ...(section.settings || {}),
                        productIds: nextIds,
                        source: { type: 'manual', productIds: nextIds }
                    },
                    source: { type: 'manual', productIds: nextIds }
                };
            })
        }));
    };

    const updateReviewSelection = (index, reviewId, checked) => {
        setTheme(prev => ({
            ...prev,
            homepageSections: (prev.homepageSections || []).map((section, i) => {
                if (i !== index || isHomepageSectionLocked(section)) return section;
                const currentIds = section.settings?.reviewIds || [];
                const nextIds = checked
                    ? [...new Set([...currentIds, reviewId])]
                    : currentIds.filter(id => id !== reviewId);

                return {
                    ...section,
                    settings: {
                        ...(section.settings || {}),
                        mode: nextIds.length > 0 ? 'selectedReviews' : 'text',
                        reviewIds: nextIds
                    }
                };
            })
        }));
    };

    const getBannerImages = (section, key) => {
        const fallbackKey = key === 'desktopImages' ? 'desktopImage' : 'mobileImage';
        return [
            ...new Set([
                ...(Array.isArray(section.settings?.[key]) ? section.settings[key] : []),
                section.settings?.[fallbackKey]
            ].filter(Boolean))
        ].slice(0, 5);
    };

    const updateBannerImages = (index, key, images) => {
        const fallbackKey = key === 'desktopImages' ? 'desktopImage' : 'mobileImage';
        const nextImages = [...new Set((images || []).filter(Boolean).map(String))].slice(0, 5);
        setTheme(prev => ({
            ...prev,
            homepageSections: (prev.homepageSections || []).map((section, i) => (
                i === index && !isHomepageSectionLocked(section)
                    ? {
                        ...section,
                        settings: {
                            ...(section.settings || {}),
                            [key]: nextImages,
                            [fallbackKey]: nextImages[0] || ''
                        },
                        mobileSettings: key === 'mobileImages'
                            ? { ...(section.mobileSettings || {}), image: nextImages[0] || '' }
                            : section.mobileSettings
                    }
                    : section
            ))
        }));
    };

    const addBannerImageUrl = (index, key, url) => {
        if (!url) return;
        const section = theme.homepageSections?.[index];
        const currentImages = getBannerImages(section || {}, key);
        if (currentImages.length >= 5) {
            toast.error('You can add up to 5 images.');
            return;
        }
        updateBannerImages(index, key, [...currentImages, url]);
    };

    const removeBannerImage = (index, key, imageIndex) => {
        const section = theme.homepageSections?.[index];
        const images = getBannerImages(section || {}, key);
        discardTemporaryAsset(images[imageIndex]);
        updateBannerImages(index, key, images.filter((_, i) => i !== imageIndex));
    };

    const moveBannerImage = (index, key, imageIndex, direction) => {
        const section = theme.homepageSections?.[index];
        const images = getBannerImages(section || {}, key);
        const targetIndex = imageIndex + direction;
        if (targetIndex < 0 || targetIndex >= images.length) return;
        [images[imageIndex], images[targetIndex]] = [images[targetIndex], images[imageIndex]];
        updateBannerImages(index, key, images);
    };

    const normalizeSectionOrder = (sections) => normalizeHomepageSections(sections).map((section, index) => ({ ...section, sortOrder: index }));

    const moveHomepageSection = (index, direction) => {
        setTheme(prev => {
            const sections = [...(prev.homepageSections || [])];
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= sections.length) return prev;
            if (isHomepageSectionLocked(sections[index]) || isHomepageSectionLocked(sections[targetIndex])) return prev;
            [sections[index], sections[targetIndex]] = [sections[targetIndex], sections[index]];
            return { ...prev, homepageSections: normalizeSectionOrder(sections) };
        });
    };

    const duplicateHomepageSection = (index) => {
        const duplicateId = createBuilderSectionId(theme.homepageSections?.[index]?.type);
        setTheme(prev => {
            const sections = [...(prev.homepageSections || [])];
            const source = sections[index];
            if (!source || isHomepageSectionLocked(source)) return prev;
            sections.splice(index + 1, 0, {
                ...source,
                _id: undefined,
                id: duplicateId,
                title: `${source.title || source.type} copy`,
                settings: { ...(source.settings || {}) },
                desktopSettings: { ...(source.desktopSettings || {}) },
                mobileSettings: { ...(source.mobileSettings || {}) },
                source: { ...(source.source || {}) },
                sortOrder: index + 1
            });
            return { ...prev, homepageSections: normalizeSectionOrder(sections) };
        });
        setActiveElement(`section:${duplicateId}`);
        setActiveGroup('sections');
    };

    const removeHomepageSection = (index) => {
        const section = theme.homepageSections?.[index];
        if (section && !isHomepageSectionLocked(section)) {
            extractThemeAssetUrls({ homepageSections: [section] }).forEach(url => discardTemporaryAsset(url));
        }
        setTheme(prev => ({
            ...prev,
            homepageSections: normalizeSectionOrder((prev.homepageSections || []).filter((section, i) => i !== index || isHomepageSectionLocked(section)))
        }));
        if (getSectionIndexFromSelection(activeElement, theme) === index) {
            setActiveElement('sections');
            setActiveGroup('sections');
        }
    };

    const toggleHomepageSectionVisibility = (index, isEnabled) => {
        updateHomepageSection(index, 'isEnabled', isEnabled);
    };

    const toggleHomepageSectionLock = (index) => {
        setTheme(prev => ({
            ...prev,
            homepageSections: (prev.homepageSections || []).map((section, i) => (
                i === index
                    ? { ...section, settings: { ...(section.settings || {}), isLocked: !isHomepageSectionLocked(section) } }
                    : section
            ))
        }));
    };

    const addHomepageSection = (preset = inlineSectionPresets[2], insertIndex = null) => {
        const safePreset = preset || inlineSectionPresets[2];
        const sectionId = createBuilderSectionId(safePreset.type);
        setTheme(prev => {
            const sections = [...(prev.homepageSections || [])];
            const targetIndex = insertIndex === null
                ? sections.length
                : Math.max(0, Math.min(Number(insertIndex) || 0, sections.length));

            sections.splice(targetIndex, 0, {
                id: sectionId,
                type: safePreset.type || 'FeaturedProducts',
                title: safePreset.title || safePreset.label || 'New section',
                isEnabled: true,
                sortOrder: targetIndex,
                settings: { ...(safePreset.settings || {}) },
                desktopSettings: { ...(safePreset.desktopSettings || {}) },
                mobileSettings: { ...(safePreset.mobileSettings || {}) },
                source: { ...(safePreset.source || {}) }
            });

            return { ...prev, homepageSections: normalizeSectionOrder(sections) };
        });
        setActiveGroup('sections');
        setActiveElement(`section:${sectionId}`);
        setMobileWorkspace('preview');
    };

    const updateNavigation = (index, field, value) => {
        setTheme(prev => ({
            ...prev,
            navigation: (prev.navigation || []).map((item, i) => (
                i === index ? { ...item, [field]: value } : item
            ))
        }));
    };

    const normalizeNavigationOrder = (items) => items.map((item, index) => ({ ...item, sortOrder: index }));

    const addNavigation = () => {
        setTheme(prev => ({
            ...prev,
            navigation: normalizeNavigationOrder([
                ...(prev.navigation || []),
                { label: 'New link', url: '/', isExternal: false, sortOrder: prev.navigation?.length || 0, children: [], megaMenu: false }
            ])
        }));
    };

    const addNavigationDropdown = () => {
        setTheme(prev => ({
            ...prev,
            navigation: normalizeNavigationOrder([
                ...(prev.navigation || []),
                {
                    label: 'New dropdown',
                    url: '#',
                    isExternal: false,
                    sortOrder: prev.navigation?.length || 0,
                    megaMenu: true,
                    children: [
                        { label: 'Sub link', url: '/', isExternal: false, sortOrder: 0 }
                    ]
                }
            ])
        }));
    };

    const removeNavigation = (index) => {
        setTheme(prev => ({
            ...prev,
            navigation: normalizeNavigationOrder((prev.navigation || []).filter((_, i) => i !== index))
        }));
    };

    const moveNavigation = (index, direction) => {
        setTheme(prev => {
            const links = [...(prev.navigation || [])];
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= links.length) return prev;
            [links[index], links[targetIndex]] = [links[targetIndex], links[index]];
            return { ...prev, navigation: normalizeNavigationOrder(links) };
        });
    };

    const addNavigationChild = (index) => {
        setTheme(prev => ({
            ...prev,
            navigation: (prev.navigation || []).map((item, i) => (
                i === index
                    ? {
                        ...item,
                        children: [
                            ...(item.children || []),
                            { label: 'Sub link', url: '/', isExternal: false, sortOrder: item.children?.length || 0 }
                        ]
                    }
                    : item
            ))
        }));
    };

    const updateNavigationChild = (index, childIndex, field, value) => {
        setTheme(prev => ({
            ...prev,
            navigation: (prev.navigation || []).map((item, i) => (
                i === index
                    ? {
                        ...item,
                        children: (item.children || []).map((child, c) => (
                            c === childIndex ? { ...child, [field]: value } : child
                        ))
                    }
                    : item
            ))
        }));
    };

    const removeNavigationChild = (index, childIndex) => {
        setTheme(prev => ({
            ...prev,
            navigation: (prev.navigation || []).map((item, i) => (
                i === index
                    ? {
                        ...item,
                        children: (item.children || [])
                            .filter((_, c) => c !== childIndex)
                            .map((child, c) => ({ ...child, sortOrder: c }))
                    }
                    : item
            ))
        }));
    };

    const updatePolicy = (key, value) => {
        setTheme(prev => ({
            ...prev,
            policies: { ...prev.policies, [key]: value }
        }));
    };

    const resetPolicyToDefault = (key) => {
        const confirmed = window.confirm(`Reset ${POLICY_LABELS[key] || 'this policy'} to the default template? This will replace the current text in the editor.`);
        if (!confirmed) return;
        updatePolicy(key, getDefaultPolicyText(key, { storeName: shopName || 'this store' }));
    };

    const updateFooter = (key, value) => {
        setTheme(prev => ({
            ...prev,
            footer: { ...(prev.footer || {}), [key]: value }
        }));
    };

    const updateFooterLink = (index, field, value) => {
        setTheme(prev => ({
            ...prev,
            footer: {
                ...(prev.footer || {}),
                links: (prev.footer?.links || []).map((item, i) => (
                    i === index ? { ...item, [field]: value } : item
                ))
            }
        }));
    };

    const addFooterLink = () => {
        setTheme(prev => ({
            ...prev,
            footer: {
                ...(prev.footer || {}),
                links: [
                    ...(prev.footer?.links || []),
                    { label: 'New link', url: '/', isExternal: false, sortOrder: prev.footer?.links?.length || 0 }
                ]
            }
        }));
    };

    const removeFooterLink = (index) => {
        setTheme(prev => ({
            ...prev,
            footer: {
                ...(prev.footer || {}),
                links: (prev.footer?.links || [])
                    .filter((_, i) => i !== index)
                    .map((item, i) => ({ ...item, sortOrder: i }))
            }
        }));
    };

    const resetStyling = () => {
        setTheme(prev => mergeTheme(defaultTheme, {
            logoUrl: prev.logoUrl,
            faviconUrl: prev.faviconUrl,
            hero: prev.hero,
            navigation: prev.navigation,
            footer: prev.footer,
            policies: prev.policies,
            allProducts: prev.allProducts,
            homepageSections: prev.homepageSections,
            checkoutBranding: {
                ...defaultTheme.checkoutBranding,
                logoUrl: prev.checkoutBranding?.logoUrl || '',
                bannerText: prev.checkoutBranding?.bannerText || '',
                trustMessage: prev.checkoutBranding?.trustMessage || defaultTheme.checkoutBranding.trustMessage
            },
            paymentSettings: prev.paymentSettings
        }));
        setStorewideDiscount(0);
        toast.success('Default styling restored. Save changes to publish it.');
    };

    const applyBuilderSnapshot = (snapshot) => {
        const parsed = safeParseSnapshot(snapshot);
        if (!parsed) return false;

        historyModeRef.current = 'skip';
        const nextTheme = mergeTheme(defaultTheme, parsed.theme || {});
        setTheme(nextTheme);
        setSearchAliases(Array.isArray(parsed.searchAliases) ? parsed.searchAliases : []);
        setCustomDomain(parsed.customDomain || { domain: '' });
        setStorewideDiscount(Number(parsed.storewideDiscount) || 0);
        return true;
    };

    const undoBuilderChange = () => {
        if (!canUndo) return;
        const previousSnapshot = editorHistory.past[editorHistory.past.length - 1];
        if (!applyBuilderSnapshot(previousSnapshot)) return;

        setEditorHistory(prev => ({
            past: prev.past.slice(0, -1),
            future: [currentSnapshot, ...prev.future].slice(0, HISTORY_LIMIT)
        }));
    };

    const redoBuilderChange = () => {
        if (!canRedo) return;
        const nextSnapshot = editorHistory.future[0];
        if (!applyBuilderSnapshot(nextSnapshot)) return;

        setEditorHistory(prev => ({
            past: [...prev.past, currentSnapshot].slice(-HISTORY_LIMIT),
            future: prev.future.slice(1)
        }));
    };

    const restorePublishedVersion = () => {
        if (!hasUnsavedChanges) return;
        const snapshot = initialSnapshot || stableStringify({
            theme: savedTheme,
            searchAliases,
            customDomain,
            storewideDiscount: Number(storewideDiscount) || 0
        });
        if (applyBuilderSnapshot(snapshot)) {
            toast.success('Draft restored to the last published version.');
        }
    };

    const restoreRecoveryVersion = () => {
        if (!recoveryDraft) return;
        const snapshot = recoveryDraft.snapshot || stableStringify({
            theme: recoveryDraft.theme,
            searchAliases: recoveryDraft.searchAliases || searchAliases,
            customDomain: recoveryDraft.customDomain || customDomain,
            storewideDiscount: Number(recoveryDraft.storewideDiscount) || 0
        });
        if (applyBuilderSnapshot(snapshot)) {
            setRecoveryDraft(null);
            toast.success('Recovered Store Builder draft. Review it before publishing.');
        }
    };

    const discardRecoveryVersion = async () => {
        setRecoveryDraft(null);
        await autosave.clearRecovery();
        toast.success('Recovered draft discarded.');
    };

    const saveDraftNow = async () => {
        if (!hasUnsavedChanges || saving) return;
        try {
            await API.put('/store-builder/admin/draft', {
                theme,
                searchAliases,
                customDomain,
                storewideDiscount,
                basedOnRevision: themeRevision
            });
            setLastSavedAt(new Date().toISOString());
            toast.success('Draft saved. Your live store is unchanged.');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Draft could not be saved. A local recovery copy is still kept.');
        }
    };

    const reloadPublishedVersion = async () => {
        if (hasUnsavedChanges && !window.confirm('Discard your unsaved Store Builder draft and reload the published version?')) return;
        await autosave.clearRecovery();
        setRecoveryDraft(null);
        setThemeConflict(null);
        clearTemporaryAssets();
        setHydratedShopKey('');
        try {
            await reloadBootstrap();
            toast.success('Published Store Builder settings reloaded.');
        } catch {
            toast.error('Could not reload the published Store Builder settings.');
        }
    };

    const focusValidationError = (error) => {
        setIssuesOpen(false);
        const sectionMatch = String(error?.path || '').match(/^homepageSections\.(\d+)/);
        if (sectionMatch) {
            const sectionIndex = Number(sectionMatch[1]);
            selectEditorTarget(getSectionSelectionId(theme.homepageSections?.[sectionIndex], sectionIndex));
        }
        else selectSettingsGroup(error?.group || 'brand');
        window.setTimeout(() => {
            const escapedPath = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(String(error?.path || '')) : '';
            const control = (escapedPath && document.querySelector(`[data-field-path="${escapedPath}"]`)) || document.querySelector('[data-store-builder-editor] input:not([type="hidden"]), [data-store-builder-editor] textarea, [data-store-builder-editor] select');
            control?.focus();
            control?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            control?.classList.add('ring-2', 'ring-amber-400');
            window.setTimeout(() => control?.classList.remove('ring-2', 'ring-amber-400'), 1200);
        }, 80);
    };

    const previewRevision = async (revisionId) => {
        if (hasUnsavedChanges && !window.confirm('Replace the current draft with this historical revision for preview?')) return;
        try {
            const { data } = await API.get(`/store-builder/admin/revisions/${revisionId}`);
            const revision = data.data;
            applyBuilderSnapshot(stableStringify({
                theme: revision.theme,
                searchAliases: revision.searchAliases || [],
                customDomain: revision.customDomain,
                storewideDiscount: revision.storewideDiscount
            }));
            toast.success(`Revision ${revision.revision} loaded as an unpublished draft.`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not load this revision.');
        }
    };

    const restoreRevision = async (revisionId) => {
        if (!window.confirm('Publish this historical revision as a new storefront revision?')) return;
        setSaving(true);
        try {
            const { data } = await API.post(`/store-builder/admin/revisions/${revisionId}/restore`, { expectedRevision: themeRevision });
            const savedShop = data.data;
            const nextTheme = mergeTheme(defaultTheme, savedShop.theme || {});
            const nextSearchAliases = Array.isArray(savedShop.searchAliases) ? savedShop.searchAliases : [];
            const nextDomain = savedShop.customDomain || { domain: '' };
            const nextDiscount = Number(savedShop.storewideDiscount) || 0;
            const snapshot = stableStringify({ theme: nextTheme, searchAliases: nextSearchAliases, customDomain: nextDomain, storewideDiscount: nextDiscount });
            setSavedTheme(nextTheme);
            setTheme(nextTheme);
            setSearchAliases(nextSearchAliases);
            setCustomDomain(nextDomain);
            setStorewideDiscount(nextDiscount);
            setThemeRevision(Number(savedShop.themeRevision || themeRevision + 1));
            setInitialSnapshot(snapshot);
            setLastPublishedAt(savedShop.lastPublishedAt || new Date().toISOString());
            clearTemporaryAssets();
            lastHistorySnapshotRef.current = snapshot;
            setEditorHistory({ past: [], future: [] });
            await autosave.clearRecovery();
            const refreshed = await reloadBootstrap({ keepCurrent: true }).catch(() => null);
            if (refreshed?.revisions) setRevisions(refreshed.revisions);
            toast.success('Historical revision restored and published as a new revision.');
        } catch (err) {
            if (err.response?.status === 409) {
                setThemeConflict(err.response.data);
                toast.error('A newer revision exists. Your draft was not overwritten.');
            } else {
                toast.error(err.response?.data?.error || 'Could not restore this revision.');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (event, target = 'storefront') => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('logo', file);
        formData.append('target', target);
        setUploadingLogo(true);

        try {
            const { data } = await API.post('/store-builder/admin/logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const url = data.data?.url;
            if (!url) throw new Error('Upload did not return a logo URL');
            rememberTemporaryAsset(data.data);

            if (target === 'checkout') {
                discardTemporaryAsset(theme.checkoutBranding?.logoUrl);
                setThemeGroup('checkoutBranding', 'logoUrl', url);
            } else if (target === 'favicon') {
                discardTemporaryAsset(theme.faviconUrl);
                setTheme(prev => ({ ...prev, faviconUrl: url }));
            } else {
                discardTemporaryAsset(theme.logoUrl);
                setTheme(prev => ({ ...prev, logoUrl: url }));
            }
            toast.success(target === 'favicon' ? 'Browser icon uploaded' : 'Logo uploaded');
        } catch (err) {
            toast.error(err.response?.data?.error || err.message || 'Failed to upload logo');
        } finally {
            setUploadingLogo(false);
            event.target.value = '';
        }
    };

    const handleThemeImageUpload = async (event, onUploaded, previousUrl = '') => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);
        setUploadingThemeImage(true);

        try {
            const { data } = await API.post('/store-builder/admin/image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const url = data.data?.url;
            if (!url) throw new Error('Upload did not return an image URL');
            rememberTemporaryAsset(data.data);
            if (previousUrl && previousUrl !== url) discardTemporaryAsset(previousUrl);
            onUploaded(url, data.data || {});
            toast.success('Image uploaded');
        } catch (err) {
            toast.error(err.response?.data?.error || err.message || 'Failed to upload image');
        } finally {
            setUploadingThemeImage(false);
            event.target.value = '';
        }
    };

    const handleBannerImagesUpload = async (event, sectionIndex, key) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        const section = theme.homepageSections?.[sectionIndex];
        const currentImages = getBannerImages(section || {}, key);
        const availableSlots = Math.max(0, 5 - currentImages.length);
        const uploadFiles = files.slice(0, availableSlots);

        if (availableSlots === 0) {
            toast.error('You can add up to 5 images.');
            event.target.value = '';
            return;
        }
        if (files.length > availableSlots) {
            toast.error(`Only ${availableSlots} more image${availableSlots === 1 ? '' : 's'} can be added.`);
        }

        setUploadingThemeImage(true);
        try {
            const results = await Promise.allSettled(uploadFiles.map(async file => {
                const formData = new FormData();
                formData.append('image', file);
                const { data } = await API.post('/store-builder/admin/image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (!data.data?.url) throw new Error('Upload did not return an image URL');
                return data.data;
            }));
            const uploadedAssets = results.filter(result => result.status === 'fulfilled').map(result => result.value);
            uploadedAssets.forEach(rememberTemporaryAsset);
            const uploadedUrls = uploadedAssets.map(asset => asset.url);
            const failedCount = results.length - uploadedUrls.length;
            updateBannerImages(sectionIndex, key, [...currentImages, ...uploadedUrls]);
            if (uploadedUrls.length > 0) toast.success(`${uploadedUrls.length} banner image${uploadedUrls.length === 1 ? '' : 's'} uploaded`);
            if (failedCount > 0) toast.error(`${failedCount} image upload${failedCount === 1 ? '' : 's'} failed. Successful uploads were kept in this draft.`);
        } catch (err) {
            toast.error(err.response?.data?.error || err.message || 'Failed to upload banner images');
        } finally {
            setUploadingThemeImage(false);
            event.target.value = '';
        }
    };

    const handleSave = () => {
        if (validation.length > 0) {
            toast.error(validation[0]);
            return;
        }
        if (!hasUnsavedChanges) {
            toast('There are no unpublished Store Builder changes.');
            return;
        }
        setPublishReviewOpen(true);
    };

    const publishChanges = async () => {
        setSaving(true);
        try {
            const payload = {
                theme,
                searchAliases,
                customDomain,
                storewideDiscount: Math.max(0, Math.min(100, Number(storewideDiscount) || 0)),
                expectedRevision: themeRevision
            };
            const { data } = await API.patch('/store-builder/admin', payload);
            const savedShop = data.data || {};
            const hasSavedTheme = savedShop.theme && Object.keys(savedShop.theme).length > 0;
            const nextTheme = hasSavedTheme ? mergeTheme(defaultTheme, savedShop.theme) : theme;
            const nextSearchAliases = Array.isArray(savedShop.searchAliases) ? savedShop.searchAliases : searchAliases;
            const nextDomain = savedShop.customDomain || customDomain;
            const nextDiscount = Number(savedShop.storewideDiscount ?? payload.storewideDiscount) || 0;
            const nextShopKey = String(savedShop._id || savedShop.id || savedShop.subdomain || hydratedShopKey || '');
            setSavedTheme(nextTheme);
            if (savedShop.planAccess) setPlanAccess(savedShop.planAccess);
            setHydratedShopKey(nextShopKey);
            setTheme(nextTheme);
            setSearchAliases(nextSearchAliases);
            setCustomDomain(nextDomain);
            setStorewideDiscount(nextDiscount);
            const publishedSnapshot = stableStringify({ theme: nextTheme, searchAliases: nextSearchAliases, customDomain: nextDomain, storewideDiscount: nextDiscount });
            const publishedAt = savedShop.lastPublishedAt || new Date().toISOString();
            const nextRevision = Number(savedShop.themeRevision ?? themeRevision + 1);
            setInitialSnapshot(publishedSnapshot);
            setLastSavedAt(publishedAt);
            setLastPublishedAt(publishedAt);
            setThemeRevision(nextRevision);
            setRevisions(prev => [{
                _id: `revision-${nextRevision}`,
                revision: nextRevision,
                source: 'publish',
                changeSummary: savedShop.changeSummary || publishChangeSummary,
                createdAt: publishedAt
            }, ...prev.filter(item => Number(item.revision) !== nextRevision)].slice(0, 10));
            lastHistorySnapshotRef.current = publishedSnapshot;
            setEditorHistory({ past: [], future: [] });
            setPublishReviewOpen(false);
            setThemeConflict(null);
            clearTemporaryAssets();
            await autosave.clearRecovery();
            if (!hasSavedTheme) {
                toast('Store design published, but the server did not return the full theme. Keeping your current preview visible.');
            } else {
                toast.success('Store design published. Your preview is up to date.');
            }
        } catch (err) {
            if (err.response?.status === 409 && err.response?.data?.code === 'THEME_CONFLICT') {
                setThemeConflict({
                    latestRevision: err.response.data.latestRevision,
                    lastPublishedAt: err.response.data.lastPublishedAt,
                    message: err.response.data.error || err.response.data.message
                });
                setPublishReviewOpen(false);
                toast.error('A newer storefront version was published. Your draft is still safe.');
                return;
            }
            toast.error(err.response?.data?.error || 'Failed to save store builder');
        } finally {
            setSaving(false);
        }
    };

    const handleCheckCustomDomain = async () => {
        if (!customDomain?.domain) {
            toast.error('Add and publish a custom domain first.');
            return;
        }
        if (hasUnsavedChanges) {
            toast.error('Publish your latest domain changes before checking DNS.');
            return;
        }

        setCheckingDomain(true);
        try {
            const { data } = await API.post('/store-builder/admin/custom-domain/check');
            const nextDomain = { ...customDomain, ...(data.data || {}) };
            setCustomDomain(nextDomain);
            const nextSnapshot = stableStringify({ theme, searchAliases, customDomain: nextDomain, storewideDiscount: Number(storewideDiscount) || 0 });
            setInitialSnapshot(nextSnapshot);
            lastHistorySnapshotRef.current = nextSnapshot;
            toast.success(data.data?.message || 'Domain verification checked');
        } catch (err) {
            const nextData = err.response?.data?.data;
            if (nextData) {
                const nextDomain = { ...customDomain, ...nextData };
                setCustomDomain(nextDomain);
                const nextSnapshot = stableStringify({ theme, searchAliases, customDomain: nextDomain, storewideDiscount: Number(storewideDiscount) || 0 });
                setInitialSnapshot(nextSnapshot);
                lastHistorySnapshotRef.current = nextSnapshot;
            }
            toast.error(err.response?.data?.message || err.response?.data?.error || 'Domain verification failed');
        } finally {
            setCheckingDomain(false);
        }
    };

    useEffect(() => {
        const handleShortcuts = (event) => {
            const target = event.target;
            const isEditable = target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName);
            const commandKey = event.metaKey || event.ctrlKey;
            if (!commandKey) return;

            const key = event.key.toLowerCase();
            if (!isEditable && key === 'z' && !event.shiftKey) {
                event.preventDefault();
                undoBuilderChange();
            }

            if (!isEditable && ((key === 'z' && event.shiftKey) || key === 'y')) {
                event.preventDefault();
                redoBuilderChange();
            }

            if (key === 's') {
                event.preventDefault();
                if (!saving && validation.length === 0) handleSave();
            }
        };

        window.addEventListener('keydown', handleShortcuts);
        return () => window.removeEventListener('keydown', handleShortcuts);
    });

    const renderPanel = () => {
        if (selectedPlanRestriction) {
            return (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
                    <div className="flex items-start gap-3">
                        <Lock className="mt-0.5 h-5 w-5 text-blue-700" />
                        <div>
                            <h3 className="font-black text-slate-950">Available with Growth</h3>
                            <p className="mt-1 text-sm leading-6 text-slate-600">{selectedPlanRestriction}</p>
                            <a href="/dashboard/billing" className="mt-3 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700">
                                View plans
                            </a>
                        </div>
                    </div>
                </div>
            );
        }
        switch (activeGroup) {
            case 'brand':
                return (
                    <Suspense fallback={<div className="h-72 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />}>
                        <BrandEditor theme={theme} setTheme={setTheme} uploadingLogo={uploadingLogo} onLogoUpload={handleLogoUpload} />
                    </Suspense>
                );
            case 'colors':
                return (
                    <ColorEditor
                        planAccess={planAccess}
                        theme={theme}
                        colorMode={colorMode}
                        setColorMode={setColorMode}
                        colorSearch={colorSearch}
                        setColorSearch={setColorSearch}
                        openColorSection={openColorSection}
                        setOpenColorSection={setOpenColorSection}
                        advancedColorsOpen={advancedColorsOpen}
                        setAdvancedColorsOpen={setAdvancedColorsOpen}
                        getThemeColor={getThemeColor}
                        getContrastWarning={getContrastWarning}
                        setColorPath={setColorPath}
                        setMainBrandColor={setMainBrandColor}
                        applyBrandColor={applyBrandColor}
                        resetColorPalette={resetColorPalette}
                        applyColorSet={applyColorSet}
                        resetColorGroup={resetColorGroup}
                        setColor={setColor}
                    />
                );
            case 'typography':
                return (
                    <TypographyEditor theme={theme} setThemeGroup={setThemeGroup} />
                );
            case 'layout':
                return (
                    <LayoutEditor theme={theme} setTheme={setTheme} setThemeGroup={setThemeGroup} />
                );
            case 'navigation':
                return (
                    <NavigationEditor
                        theme={theme}
                        setTheme={setTheme}
                        uploadingLogo={uploadingLogo}
                        onLogoUpload={handleLogoUpload}
                        addNavigation={addNavigation}
                        addNavigationDropdown={addNavigationDropdown}
                        moveNavigation={moveNavigation}
                        removeNavigation={removeNavigation}
                        updateNavigation={updateNavigation}
                        addNavigationChild={addNavigationChild}
                        updateNavigationChild={updateNavigationChild}
                        removeNavigationChild={removeNavigationChild}
                    />
                );
            case 'hero':
                return (
                    <HeroEditor
                        theme={theme}
                        uploadingThemeImage={uploadingThemeImage}
                        setThemeGroup={setThemeGroup}
                        addHeroSlide={addHeroSlide}
                        updateHeroSlide={updateHeroSlide}
                        moveHeroSlide={moveHeroSlide}
                        removeHeroSlide={removeHeroSlide}
                        handleThemeImageUpload={handleThemeImageUpload}
                    />
                );
            case 'seo':
                return (
                    <SeoStatusEditor health={storeSeoHealth} />
                );
            case 'products':
                return (
                    <ProductCardsEditor
                        theme={theme}
                        setThemeGroup={setThemeGroup}
                        toggleThemeGroup={toggleThemeGroup}
                    />
                );
            case 'sections':
                return (
                    <DynamicSectionsEditor
                        theme={theme}
                        activeElement={activeElement}
                        availableProducts={availableProducts}
                        productOptions={productOptions}
                        availableReviews={availableReviews}
                        productCategories={productCategories}
                        productPicker={productPicker}
                        setProductPicker={setProductPicker}
                        reviewPicker={reviewPicker}
                        setReviewPicker={setReviewPicker}
                        uploadingThemeImage={uploadingThemeImage}
                        addHomepageSection={addHomepageSection}
                        toggleHomepageSectionLock={toggleHomepageSectionLock}
                        updateHomepageSection={updateHomepageSection}
                        getBannerImages={getBannerImages}
                        handleBannerImagesUpload={handleBannerImagesUpload}
                        removeBannerImage={removeBannerImage}
                        moveBannerImage={moveBannerImage}
                        addBannerImageUrl={addBannerImageUrl}
                        updateHomepageSectionSetting={updateHomepageSectionSetting}
                        updateHomepageSectionDesktopSetting={updateHomepageSectionDesktopSetting}
                        updateHomepageSectionMobileSetting={updateHomepageSectionMobileSetting}
                        loadProductOptions={loadProductOptions}
                        updateFeaturedProductsSelection={updateFeaturedProductsSelection}
                        loadReviewOptions={loadReviewOptions}
                        updateReviewSelection={updateReviewSelection}
                    />
                );
            case 'checkout':
                return (
                    <CheckoutEditor theme={theme} shopName={shopName} uploadingLogo={uploadingLogo} onLogoUpload={handleLogoUpload} setThemeGroup={setThemeGroup} />
                );
            case 'mobile':
                return (
                    <MobileEditor theme={theme} toggleThemeGroup={toggleThemeGroup} />
                );
            case 'footer':
                return (
                    <FooterEditor theme={theme} updateFooter={updateFooter} addFooterLink={addFooterLink} removeFooterLink={removeFooterLink} updateFooterLink={updateFooterLink} />
                );
            case 'policies':
                return (
                    <PoliciesEditor theme={theme} shopName={shopName} updatePolicy={updatePolicy} resetPolicyToDefault={resetPolicyToDefault} />
                );
            case 'domain':
                return (
                    <Suspense fallback={<div className="h-72 animate-pulse rounded-lg border border-slate-200 bg-slate-100" aria-label="Loading domain editor" />}>
                        <DomainEditor
                            customDomain={customDomain}
                            setCustomDomain={setCustomDomain}
                            hasUnsavedChanges={hasUnsavedChanges}
                            checkingDomain={checkingDomain}
                            onCheckDomain={handleCheckCustomDomain}
                        />
                    </Suspense>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <AdminLoadingState
                    title="Loading store builder"
                    description="We are preparing your theme settings, products, reviews, sections, and live preview."
                />
            </div>
        );
    }

    if (bootstrapError && !bootstrap?.shop) {
        return (
            <div className="p-6">
                <AdminErrorState
                    title="Store Builder could not load"
                    description={bootstrapError}
                    onRetry={() => reloadBootstrap().catch(() => {})}
                />
            </div>
        );
    }

    return (
        <StoreBuilderShell>
            <StoreBuilderHeader
                hasUnsavedChanges={hasUnsavedChanges}
                statusLabel={hasUnsavedChanges ? 'Unsaved changes' : 'Published'}
                lastSavedLabel={formatBuilderDate(lastSavedAt) || 'Current session'}
                lastPublishedLabel={formatBuilderDate(lastPublishedAt) || publishedVersionLabel}
                canUndo={canUndo}
                canRedo={canRedo}
                saving={saving}
                validationCount={validation.length}
                onUndo={undoBuilderChange}
                onRedo={redoBuilderChange}
                onResetStyling={resetStyling}
                onRestorePublished={restorePublishedVersion}
                onSaveDraft={saveDraftNow}
                onReload={reloadPublishedVersion}
                onSave={handleSave}
                onOpenIssues={() => setIssuesOpen(true)}
                onOpenHistory={() => setHistoryOpen(true)}
                liveStoreUrl={liveStoreUrl}
                autosaveStatus={autosave.status}
                revision={themeRevision}
                conflict={themeConflict}
                mobileWorkspace={mobileWorkspace}
                onWorkspaceChange={setMobileWorkspace}
            />

            {recoveryDraft && (
                <div className="mx-auto max-w-[1600px] px-4 pt-4">
                    <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-black text-blue-950">Unpublished draft found</p>
                            <p className="mt-1 text-xs leading-5 text-blue-800">
                                A {recoveryDraft.source === 'server' ? 'server' : 'local'} recovery copy from {formatBuilderDate(recoveryDraft.updatedAt || recoveryDraft.savedAt) || 'an earlier session'} is available. Your live store is unchanged.
                            </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                            <BuilderButton type="button" variant="secondary" onClick={discardRecoveryVersion}>Discard</BuilderButton>
                            <BuilderButton type="button" onClick={restoreRecoveryVersion}>Restore draft</BuilderButton>
                        </div>
                    </div>
                </div>
            )}

            {themeConflict && (
                <div className="mx-auto max-w-[1600px] px-4 pt-4">
                    <div className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-black text-amber-950">A newer storefront revision exists</p>
                            <p className="mt-1 text-xs leading-5 text-amber-800">
                                Revision {themeConflict.latestRevision} was published elsewhere. Your draft is safe; reload only when you are ready to discard or reconcile it.
                            </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                            <BuilderButton type="button" variant="secondary" onClick={() => setThemeConflict(null)}>Keep editing</BuilderButton>
                            <BuilderButton type="button" onClick={reloadPublishedVersion}>Discard and reload</BuilderButton>
                        </div>
                    </div>
                </div>
            )}

            <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-4 p-4 xl:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(520px,1fr)_380px]">
                <StoreBuilderSidebar
                    mobileWorkspace={mobileWorkspace}
                    activeElement={activeElement}
                    activeGroup={activeGroup}
                    selectEditorTarget={selectEditorTarget}
                    selectSettingsGroup={selectSettingsGroup}
                    validation={validationDetails}
                    planAccess={planAccess}
                    theme={theme}
                    seoHealth={storeSeoHealth}
                    onMoveSection={moveHomepageSection}
                    onDuplicateSection={duplicateHomepageSection}
                    onToggleSectionVisibility={toggleHomepageSectionVisibility}
                    onRemoveSection={removeHomepageSection}
                />

                <main className="contents">
                    <Suspense fallback={<section className={`${mobileWorkspace === 'preview' ? 'block' : 'hidden'} order-1 min-h-[640px] animate-pulse rounded-lg border border-slate-200 bg-slate-100 xl:block 2xl:order-2`} aria-label="Loading storefront preview" />}>
                        <StoreBuilderPreviewPanel
                            mobileWorkspace={mobileWorkspace}
                            setMobileWorkspace={setMobileWorkspace}
                            previewPages={previewPages}
                            previewPage={previewPage}
                            setPreviewPage={setPreviewPage}
                            device={device}
                            setDevice={setDevice}
                            theme={theme}
                            storewideDiscount={storewideDiscount}
                            shopName={shopName}
                            availableProducts={availableProducts}
                            productCategories={productCategories}
                            availableReviews={availableReviews}
                            activeElement={activeElement}
                            selectEditorTarget={selectEditorTarget}
                            toggleHomepageSectionVisibility={toggleHomepageSectionVisibility}
                        />
                    </Suspense>
                    <StoreBuilderEditorPanel
                        mobileWorkspace={mobileWorkspace}
                        inspectorOpen={inspectorOpen}
                        selectedLabel={selectedLabel}
                        selectedIsLockedLayout={selectedIsLockedLayout}
                        planRestriction={selectedPlanRestriction}
                        setMobileWorkspace={setMobileWorkspace}
                        onCloseInspector={() => setInspectorOpen(false)}
                    >
                        <Suspense fallback={<div className="h-72 animate-pulse rounded-lg bg-slate-100" aria-label="Loading editor settings" />}>
                            {renderPanel()}
                        </Suspense>
                    </StoreBuilderEditorPanel>
                </main>
            </div>

            <IssuesDrawer
                open={issuesOpen}
                issues={validationDetails}
                onClose={() => setIssuesOpen(false)}
                onSelectIssue={focusValidationError}
            />
            <HistoryDrawer
                open={historyOpen}
                revisions={revisions}
                busy={saving}
                onClose={() => setHistoryOpen(false)}
                onPreview={revisionId => {
                    setHistoryOpen(false);
                    previewRevision(revisionId);
                }}
                onRestore={revisionId => {
                    setHistoryOpen(false);
                    restoreRevision(revisionId);
                }}
            />

            {publishReviewOpen && (
                <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={event => {
                    if (event.target === event.currentTarget && !saving) setPublishReviewOpen(false);
                }}>
                    <section role="dialog" aria-modal="true" aria-labelledby="publish-store-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-xl sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-wide text-indigo-600">Revision {themeRevision + 1}</p>
                                <h2 id="publish-store-title" className="mt-1 text-xl font-black text-slate-950">Publish storefront changes?</h2>
                                <p className="mt-2 text-sm leading-6 text-slate-600">These draft changes will become visible on your live store. Temporary media used by the draft will be promoted only after this publish succeeds.</p>
                            </div>
                            <button type="button" aria-label="Close publish review" onClick={() => setPublishReviewOpen(false)} disabled={saving} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Change summary</p>
                            {publishChangeSummary.length > 0 ? (
                                <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
                                    {publishChangeSummary.map(change => <li key={`${change.area}-${change.message}`} className="flex gap-2"><span className="text-indigo-600">•</span><span><strong>{change.area}:</strong> {change.message}</span></li>)}
                                </ul>
                            ) : (
                                <p className="mt-2 text-sm text-slate-500">The draft differs from the published snapshot.</p>
                            )}
                        </div>
                        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <BuilderButton type="button" variant="secondary" onClick={() => setPublishReviewOpen(false)} disabled={saving}>Continue editing</BuilderButton>
                            <BuilderButton type="button" onClick={publishChanges} disabled={saving}>
                                {saving ? 'Publishing...' : 'Publish to live store'}
                            </BuilderButton>
                        </div>
                    </section>
                </div>
            )}
        </StoreBuilderShell>
    );
};

export default StoreBuilderPage;
