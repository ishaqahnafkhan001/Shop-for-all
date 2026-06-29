import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ChevronDown,
    ChevronUp,
    Copy,
    CreditCard,
    FileText,
    Globe,
    GripVertical,
    LayoutTemplate,
    Link as LinkIcon,
    Lock,
    Palette,
    Plus,
    RefreshCw,
    ShoppingBag,
    Search,
    Smartphone,
    Trash2,
    Unlock,
    Upload,
    X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../../api/api';
import {
    BuilderButton,
    BuilderCard,
    BuilderInput,
    BuilderSelect,
    BuilderTextarea,
    BuilderToggle,
    FieldShell,
    inputClass
} from './builderUi.jsx';
import { StoreBuilderHeader } from './StoreBuilderHeader.jsx';
import { CheckoutBrandingPreview } from './StorefrontPreview.jsx';
import { StoreBuilderSidebar } from './StoreBuilderSidebar.jsx';
import { StoreBuilderEditorPanel } from './StoreBuilderEditorPanel.jsx';
import { StoreBuilderPreviewPanel } from './StoreBuilderPreviewPanel.jsx';
import {
    POLICY_LABELS,
    getDefaultPolicyText
} from '../../../../../ecommerce-storefront/src/lib/defaultPolicies.js';
import { AdminLoadingState } from '../../../components/ui/AdminState.jsx';
import { SeoHealthCard, SeoLengthHint, SeoSnippetPreview } from '../../../components/seo/SeoPreview.jsx';
import { buildStoreSeoPreview, scoreStoreSeo } from '../../../utils/seoHealth.js';
import {
    previewPages,
    usePreviewMode
} from './hooks/usePreviewMode.js';
import { useStoreBuilderDirtyState } from './hooks/useStoreBuilderDirtyState.js';
import {
    HERO_SLIDE_LIMIT,
    HISTORY_LIMIT,
    colorFields,
    colorGroups,
    fixedPreviewElements,
    groupElementMap,
    inlineSectionPresets,
    isHomepageSectionLocked,
    resolveEditorComponent,
    settingsGroups
} from './storeBuilderConstants.jsx';
import {
    createHeroSlide,
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

const CUSTOM_DOMAIN_DNS_TARGET = import.meta.env.VITE_CUSTOM_DOMAIN_DNS_TARGET || import.meta.env.NEXT_PUBLIC_CUSTOM_DOMAIN_DNS_TARGET || '';
const footerSocialFields = [
    { key: 'facebookUrl', label: 'Facebook URL', placeholder: 'https://facebook.com/your-store' },
    { key: 'instagramUrl', label: 'Instagram URL', placeholder: 'https://instagram.com/your-store' },
    { key: 'twitterUrl', label: 'X / Twitter URL', placeholder: 'https://x.com/your-store' },
    { key: 'youtubeUrl', label: 'YouTube URL', placeholder: 'https://youtube.com/@your-store' },
    { key: 'tiktokUrl', label: 'TikTok URL', placeholder: 'https://tiktok.com/@your-store' }
];

const getDomainRecordHint = (domain = '') => {
    const cleanDomain = String(domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').split(/[/?#]/)[0];
    const labels = cleanDomain.split('.').filter(Boolean);
    if (!cleanDomain || labels.length < 2) return null;

    if (labels.length > 2) {
        return {
            type: 'CNAME',
            host: labels.slice(0, -2).join('.'),
            target: CUSTOM_DOMAIN_DNS_TARGET
        };
    }

    return {
        type: 'ALIAS / ANAME',
        host: '@',
        target: CUSTOM_DOMAIN_DNS_TARGET
    };
};

const isCustomDomainConnected = (customDomain = {}) => (
    customDomain?.status === 'Verified' &&
    Boolean(customDomain?.domain) &&
    customDomain?.ownershipVerified === true &&
    (customDomain?.routingVerified === true || customDomain?.manuallyVerifiedRouting === true)
);

const getDomainConnectionLabels = (customDomain = {}, dnsTarget = '') => {
    const ownershipVerified = customDomain?.ownershipVerified === true;
    const routingConnected = customDomain?.routingVerified === true || customDomain?.manuallyVerifiedRouting === true;
    const rawStatus = customDomain?.status || 'NotConfigured';
    const displayStatus = rawStatus === 'Verified' && !routingConnected
        ? (ownershipVerified || customDomain?.lastDnsCheckStatus === 'verified' ? 'RoutingPending' : 'PendingVerification')
        : rawStatus;
    const routingLabel = routingConnected
        ? (customDomain?.manuallyVerifiedRouting ? 'Manually approved' : 'Connected')
        : (dnsTarget ? 'Not connected' : 'Not configured');

    return {
        displayStatus,
        ownershipLabel: ownershipVerified ? 'Verified' : 'Not verified',
        routingLabel,
        browserReady: routingConnected ? 'Ready' : 'Not ready'
    };
};

const StoreBuilderPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingThemeImage, setUploadingThemeImage] = useState(false);
    const [checkingDomain, setCheckingDomain] = useState(false);
    const [shopName, setShopName] = useState('');
    const [shopSubdomain, setShopSubdomain] = useState('');
    const [theme, setTheme] = useState(defaultTheme);
    const [availableProducts, setAvailableProducts] = useState([]);
    const [productOptions, setProductOptions] = useState([]);
    const [productCategories, setProductCategories] = useState([]);
    const [productPicker, setProductPicker] = useState({ search: '', category: 'All', page: 1, pages: 1, loading: false });
    const [availableReviews, setAvailableReviews] = useState([]);
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
    const historyModeRef = useRef('record');
    const lastHistorySnapshotRef = useRef('');

    const {
        currentSnapshot,
        hasUnsavedChanges,
        publishedVersionLabel
    } = useStoreBuilderDirtyState({
        theme,
        customDomain,
        storewideDiscount,
        initialSnapshot
    });
    const canUndo = editorHistory.past.length > 0;
    const canRedo = editorHistory.future.length > 0;
    const selectedLabel = useMemo(() => {
        const selectionTheme = { homepageSections: theme.homepageSections, navigation: theme.navigation };
        return resolveEditorComponent(activeElement, selectionTheme)?.label || settingsGroups.find(item => item.id === activeGroup)?.label || 'Store element';
    }, [activeElement, activeGroup, theme.homepageSections, theme.navigation]);
    const selectedIsLockedLayout = useMemo(() => {
        if (fixedPreviewElements.has(activeElement)) return true;
        if (!activeElement?.startsWith('section-')) return false;
        const sectionIndex = Number(activeElement.replace('section-', ''));
        return isHomepageSectionLocked(theme.homepageSections?.[sectionIndex]);
    }, [activeElement, theme.homepageSections]);
    const storeSeoPreview = useMemo(() => buildStoreSeoPreview({
        theme,
        shopName,
        subdomain: shopSubdomain,
        domain: isCustomDomainConnected(customDomain) ? customDomain.domain : ''
    }), [customDomain, shopName, shopSubdomain, theme]);
    const storeSeoSignals = useMemo(() => {
        const productsWithAltText = availableProducts.filter(product => String(product.imageAltText || '').trim()).length;
        const collectionIds = new Set(
            availableProducts
                .flatMap(product => Array.isArray(product.collections) ? product.collections : [])
                .map(String)
                .filter(Boolean)
        );

        return {
            collectionCount: collectionIds.size,
            imageAltCoverage: availableProducts.length ? Math.round((productsWithAltText / availableProducts.length) * 100) : 0
        };
    }, [availableProducts]);
    const storeSeoHealth = useMemo(() => scoreStoreSeo({
        theme,
        shopName,
        productCount: availableProducts.length,
        customDomain,
        collectionCount: storeSeoSignals.collectionCount,
        imageAltCoverage: storeSeoSignals.imageAltCoverage
    }), [availableProducts.length, customDomain, shopName, storeSeoSignals, theme]);

    const selectEditorTarget = (target) => {
        if (!target) return;
        const selection = resolveEditorComponent(target, theme);
        setActiveElement(target);
        if (selection?.group) setActiveGroup(selection.group);
        setMobileWorkspace('edit');
    };

    const selectSettingsGroup = (groupId) => {
        setActiveGroup(groupId);
        setActiveElement(groupElementMap[groupId] || groupId);
        setMobileWorkspace('edit');
    };

    const copyDomainValue = async (value, label = 'Value') => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            toast.success(`${label} copied`);
        } catch {
            toast.error('Could not copy value');
        }
    };

    const validation = useMemo(() => {
        const colorErrors = colorFields
            .filter(field => !isHexColor(theme.colors?.[field.key]))
            .map(field => `${field.label} must be a valid hex color.`);
        const discountNumber = Number(storewideDiscount);
        const discountErrors = Number.isNaN(discountNumber) || discountNumber < 0 || discountNumber > 100
            ? ['Storewide discount must be between 0 and 100.']
            : [];
        const navErrors = (theme.navigation || [])
            .filter(item => item?.url && !item?.label)
            .map(() => 'Navigation links with a URL need a label.');
        const navChildErrors = (theme.navigation || [])
            .flatMap(item => item?.children || [])
            .filter(item => item?.url && !item?.label)
            .map(() => 'Nested navigation links with a URL need a label.');
        const productColorErrors = [
            ['Product card price color', theme.productCard?.priceColor || theme.colors?.priceColor],
            ['Product card button color', theme.productCard?.buttonColor || theme.colors?.primaryButtonBg]
        ]
            .filter(([, value]) => value && !isHexColor(value))
            .map(([label]) => `${label} must be a valid hex color.`);

        return [...colorErrors, ...discountErrors, ...navErrors, ...navChildErrors, ...productColorErrors];
    }, [theme.colors, theme.navigation, theme.productCard, storewideDiscount]);

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
        const fetchSettings = async () => {
            try {
                const [{ data }, productsResponse] = await Promise.all([
                    API.get('/store-builder/admin'),
                    API.get('/admin/products', { params: { limit: 10, status: 'Published' } }).catch(() => ({ data: { data: [], categories: [], pagination: { page: 1, pages: 1 } } }))
                ]);
                const shop = data.data || {};
                const nextTheme = mergeTheme(defaultTheme, shop.theme || {});
                const nextDomain = shop.customDomain || { domain: '' };
                const nextDiscount = shop.storewideDiscount || 0;
                const selectedReviewIds = [
                    ...new Set((nextTheme.homepageSections || [])
                        .flatMap(section => section.type === 'Reviews' ? (section.settings?.reviewIds || []) : [])
                        .filter(Boolean)
                        .map(String))
                ];
                const [reviewsResponse, selectedReviewsResponse] = await Promise.all([
                    API.get('/store-builder/admin/reviews', { params: { page: 1, limit: 10, rating: 5 } }).catch(() => ({ data: { data: [], pagination: { page: 1, pages: 1 } } })),
                    selectedReviewIds.length
                        ? API.get('/store-builder/admin/reviews', { params: { ids: selectedReviewIds.join(','), limit: selectedReviewIds.length, rating: 5 } }).catch(() => ({ data: { data: [] } }))
                        : Promise.resolve({ data: { data: [] } })
                ]);
                const initialProducts = productsResponse.data?.data || [];
                const initialReviews = [...(reviewsResponse.data?.data || []), ...(selectedReviewsResponse.data?.data || [])];
                setShopName(shop.shopName || '');
                setShopSubdomain(shop.subdomain || '');
                setTheme(nextTheme);
                setAvailableProducts(initialProducts);
                setProductOptions(initialProducts);
                setProductCategories(productsResponse.data?.categories || []);
                setProductPicker(prev => ({
                    ...prev,
                    page: productsResponse.data?.pagination?.page || 1,
                    pages: productsResponse.data?.pagination?.pages || 1,
                    loading: false
                }));
                setAvailableReviews(Array.from(new Map(initialReviews.map(review => [String(review._id), review])).values()));
                setReviewPicker(prev => ({
                    ...prev,
                    page: reviewsResponse.data?.pagination?.page || 1,
                    pages: reviewsResponse.data?.pagination?.pages || 1,
                    loading: false
                }));
                setCustomDomain(nextDomain);
                setStorewideDiscount(nextDiscount);
                setLastSavedAt(shop.updatedAt || shop.themeUpdatedAt || '');
                setLastPublishedAt(shop.updatedAt || shop.themeUpdatedAt || '');
                const loadedSnapshot = stableStringify({ theme: nextTheme, customDomain: nextDomain, storewideDiscount: Number(nextDiscount) || 0 });
                setInitialSnapshot(loadedSnapshot);
                lastHistorySnapshotRef.current = loadedSnapshot;
                setEditorHistory({ past: [], future: [] });
            } catch {
                toast.error('Failed to load store builder');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

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

        if (lastHistorySnapshotRef.current === currentSnapshot) return;

        const previousSnapshot = lastHistorySnapshotRef.current;
        lastHistorySnapshotRef.current = currentSnapshot;
        setEditorHistory(prev => ({
            past: [...prev.past, previousSnapshot].slice(-HISTORY_LIMIT),
            future: []
        }));
    }, [currentSnapshot, loading]);

    const setColor = (key, value) => {
        setTheme(prev => ({
            ...prev,
            colors: { ...prev.colors, [key]: value }
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
        updateBannerImages(index, key, getBannerImages(section || {}, key).filter((_, i) => i !== imageIndex));
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
        setTheme(prev => {
            const sections = [...(prev.homepageSections || [])];
            const source = sections[index];
            if (!source || isHomepageSectionLocked(source)) return prev;
            sections.splice(index + 1, 0, {
                ...source,
                _id: undefined,
                id: `${source.type || 'section'}-${Date.now()}`,
                title: `${source.title || source.type} copy`,
                settings: { ...(source.settings || {}) },
                mobileSettings: { ...(source.mobileSettings || {}) },
                source: { ...(source.source || {}) },
                sortOrder: index + 1
            });
            return { ...prev, homepageSections: normalizeSectionOrder(sections) };
        });
    };

    const removeHomepageSection = (index) => {
        setTheme(prev => ({
            ...prev,
            homepageSections: normalizeSectionOrder((prev.homepageSections || []).filter((section, i) => i !== index || isHomepageSectionLocked(section)))
        }));
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
        setTheme(prev => {
            const sections = [...(prev.homepageSections || [])];
            const safePreset = preset || inlineSectionPresets[2];
            const targetIndex = insertIndex === null
                ? sections.length
                : Math.max(0, Math.min(Number(insertIndex) || 0, sections.length));

            sections.splice(targetIndex, 0, {
                id: `${safePreset.type || 'section'}-${Date.now()}`,
                type: safePreset.type || 'FeaturedProducts',
                title: safePreset.title || safePreset.label || 'New section',
                isEnabled: true,
                sortOrder: targetIndex,
                settings: { ...(safePreset.settings || {}) },
                mobileSettings: { ...(safePreset.mobileSettings || {}) },
                source: { ...(safePreset.source || {}) }
            });

            return { ...prev, homepageSections: normalizeSectionOrder(sections) };
        });
        setActiveGroup('sections');
        setActiveElement(`section-${insertIndex ?? theme.homepageSections?.length ?? 0}`);
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
        setTheme(mergeTheme(defaultTheme, parsed.theme || {}));
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
        if (!initialSnapshot || !hasUnsavedChanges) return;
        if (applyBuilderSnapshot(initialSnapshot)) {
            toast.success('Draft restored to the last published version.');
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

            if (target === 'checkout') {
                setThemeGroup('checkoutBranding', 'logoUrl', url);
            } else {
                setTheme(prev => ({ ...prev, logoUrl: url }));
            }
            toast.success('Logo uploaded');
        } catch (err) {
            toast.error(err.response?.data?.error || err.message || 'Failed to upload logo');
        } finally {
            setUploadingLogo(false);
            event.target.value = '';
        }
    };

    const handleThemeImageUpload = async (event, onUploaded) => {
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
            onUploaded(url);
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
            const uploadedUrls = [];
            for (const file of uploadFiles) {
                const formData = new FormData();
                formData.append('image', file);
                const { data } = await API.post('/store-builder/admin/image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                const url = data.data?.url;
                if (url) uploadedUrls.push(url);
            }
            updateBannerImages(sectionIndex, key, [...currentImages, ...uploadedUrls]);
            if (uploadedUrls.length > 0) toast.success(`${uploadedUrls.length} banner image${uploadedUrls.length === 1 ? '' : 's'} uploaded`);
        } catch (err) {
            toast.error(err.response?.data?.error || err.message || 'Failed to upload banner images');
        } finally {
            setUploadingThemeImage(false);
            event.target.value = '';
        }
    };

    const handleSave = async () => {
        if (validation.length > 0) {
            toast.error(validation[0]);
            return;
        }

        setSaving(true);
        try {
            const payload = {
                theme,
                customDomain,
                storewideDiscount: Math.max(0, Math.min(100, Number(storewideDiscount) || 0))
            };
            const { data } = await API.patch('/store-builder/admin', payload);
            const savedShop = data.data || {};
            const nextTheme = savedShop.theme ? mergeTheme(defaultTheme, savedShop.theme) : theme;
            const nextDomain = savedShop.customDomain || customDomain;
            const nextDiscount = Number(savedShop.storewideDiscount ?? payload.storewideDiscount) || 0;
            setTheme(nextTheme);
            setCustomDomain(nextDomain);
            setStorewideDiscount(nextDiscount);
            const publishedSnapshot = stableStringify({ theme: nextTheme, customDomain: nextDomain, storewideDiscount: nextDiscount });
            const publishedAt = new Date().toISOString();
            setInitialSnapshot(publishedSnapshot);
            setLastSavedAt(publishedAt);
            setLastPublishedAt(publishedAt);
            lastHistorySnapshotRef.current = publishedSnapshot;
            setEditorHistory({ past: [], future: [] });
            toast.success('Store design published. Refresh your storefront to see the latest changes.');
        } catch (err) {
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
            const nextSnapshot = stableStringify({ theme, customDomain: nextDomain, storewideDiscount: Number(storewideDiscount) || 0 });
            setInitialSnapshot(nextSnapshot);
            lastHistorySnapshotRef.current = nextSnapshot;
            toast.success(data.data?.message || 'Domain verification checked');
        } catch (err) {
            const nextData = err.response?.data?.data;
            if (nextData) {
                const nextDomain = { ...customDomain, ...nextData };
                setCustomDomain(nextDomain);
                const nextSnapshot = stableStringify({ theme, customDomain: nextDomain, storewideDiscount: Number(storewideDiscount) || 0 });
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
        switch (activeGroup) {
            case 'brand':
                return (
                    <BuilderCard title="Brand" description="Set the core identity customers see in your storefront header." icon={Palette}>
                        <BuilderInput
                            label="Logo URL"
                            value={theme.logoUrl || ''}
                            onChange={e => setTheme(prev => ({ ...prev, logoUrl: e.target.value }))}
                            placeholder="https://..."
                            help="Paste a public image URL or upload a logo file."
                        />
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500">
                            <Upload size={16} />
                            {uploadingLogo ? 'Uploading...' : 'Upload storefront logo'}
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                disabled={uploadingLogo}
                                onChange={event => handleLogoUpload(event, 'storefront')}
                            />
                        </label>
                        <BuilderSelect
                            label="Logo position"
                            value={theme.header?.logoPosition || 'Left'}
                            onChange={e => setThemeGroup('header', 'logoPosition', e.target.value)}
                            help="Choose where your brand appears in the storefront header. Mobile keeps a compact readable layout."
                        >
                            <option>Left</option><option>Center</option><option>Right</option>
                        </BuilderSelect>
                    </BuilderCard>
                );
            case 'colors':
                return (
                    <BuilderCard title="Colors" description="Use a small set of consistent colors so the store feels intentional." icon={Palette}>
                        {colorGroups.map(group => (
                            <div key={group.title} className="rounded-lg border border-slate-200 p-3">
                                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">{group.title}</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {group.fields.map(field => (
                                        <FieldShell
                                            key={field.key}
                                            label={field.label}
                                            help={field.help}
                                            error={!isHexColor(theme.colors?.[field.key]) ? 'Enter a valid hex color, for example #0f766e.' : ''}
                                        >
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={isHexColor(theme.colors?.[field.key]) ? theme.colors[field.key] : '#000000'}
                                                    onChange={e => setColor(field.key, e.target.value)}
                                                    className="h-10 w-12 rounded-lg border border-slate-200 bg-white"
                                                />
                                                <input
                                                    value={theme.colors?.[field.key] || ''}
                                                    onChange={e => setColor(field.key, e.target.value)}
                                                    className={inputClass}
                                                />
                                            </div>
                                        </FieldShell>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </BuilderCard>
                );
            case 'typography':
                return (
                    <BuilderCard title="Typography" description="Choose readable fonts and heading weight for a polished storefront." icon={LayoutTemplate}>
                        <BuilderSelect label="Heading font" value={theme.typography?.headingFont || 'Inter'} onChange={e => setThemeGroup('typography', 'headingFont', e.target.value)} help="Used for hero, product section headings, and important titles.">
                            <option>Inter</option><option>Arial</option><option>Georgia</option><option>Roboto</option>
                        </BuilderSelect>
                        <BuilderSelect label="Body font" value={theme.typography?.bodyFont || 'Inter'} onChange={e => setThemeGroup('typography', 'bodyFont', e.target.value)} help="Used for product names, descriptions, filters, and checkout text.">
                            <option>Inter</option><option>Arial</option><option>Georgia</option><option>Roboto</option>
                        </BuilderSelect>
                        <BuilderSelect label="Heading weight" value={theme.typography?.headingWeight || '800'} onChange={e => setThemeGroup('typography', 'headingWeight', e.target.value)}>
                            <option value="600">Semi bold</option><option value="700">Bold</option><option value="800">Extra bold</option><option value="900">Black</option>
                        </BuilderSelect>
                    </BuilderCard>
                );
            case 'layout':
                return (
                    <BuilderCard title="Layout" description="Control page width, section rhythm, and product grid density." icon={LayoutTemplate}>
                        <BuilderSelect label="Container width" value={theme.layout?.containerWidth || theme.layout?.maxWidth || 'Wide'} onChange={e => {
                            setThemeGroup('layout', 'containerWidth', e.target.value);
                            setThemeGroup('layout', 'maxWidth', e.target.value === 'Full Width' ? 'Full' : e.target.value === 'Narrow' ? 'Contained' : 'Wide');
                        }} help="Controls the main storefront content width. Full Width uses the whole screen.">
                            <option>Narrow</option><option>Standard</option><option>Wide</option><option>Full Width</option>
                        </BuilderSelect>
                        <BuilderSelect label="Content spacing" value={theme.layout?.contentSpacing || theme.layout?.sectionSpacing || 'Comfortable'} onChange={e => {
                            setThemeGroup('layout', 'contentSpacing', e.target.value);
                            setThemeGroup('layout', 'sectionSpacing', e.target.value);
                        }} help="Sets the vertical rhythm between major sections.">
                            <option>Compact</option><option>Comfortable</option><option>Spacious</option>
                        </BuilderSelect>
                        <BuilderSelect label="Section width" value={theme.layout?.sectionWidth || 'Full Width'} onChange={e => setThemeGroup('layout', 'sectionWidth', e.target.value)} help="Prepared for per-section width control and applied to preview rhythm.">
                            <option>Narrow</option><option>Standard</option><option>Wide</option><option>Full Width</option>
                        </BuilderSelect>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <BuilderInput label="Top padding" type="number" min="0" max="160" value={theme.layout?.sectionPaddingTop ?? 40} onChange={e => setThemeGroup('layout', 'sectionPaddingTop', Number(e.target.value))} help="Default section top padding in pixels." />
                            <BuilderInput label="Bottom padding" type="number" min="0" max="160" value={theme.layout?.sectionPaddingBottom ?? 40} onChange={e => setThemeGroup('layout', 'sectionPaddingBottom', Number(e.target.value))} help="Default section bottom padding in pixels." />
                            <BuilderInput label="Top margin" type="number" min="0" max="160" value={theme.layout?.sectionMarginTop ?? 0} onChange={e => setThemeGroup('layout', 'sectionMarginTop', Number(e.target.value))} />
                            <BuilderInput label="Bottom margin" type="number" min="0" max="160" value={theme.layout?.sectionMarginBottom ?? 40} onChange={e => setThemeGroup('layout', 'sectionMarginBottom', Number(e.target.value))} />
                        </div>
                        <BuilderSelect label="Desktop product columns" value={theme.layout?.productColumnsDesktop || 3} onChange={e => setThemeGroup('layout', 'productColumnsDesktop', Number(e.target.value))}>
                            <option value={2}>2 columns</option><option value={3}>3 columns</option><option value={4}>4 columns</option><option value={5}>5 columns</option>
                        </BuilderSelect>
                        <BuilderSelect label="Mobile product columns" value={theme.layout?.productColumnsMobile || 2} onChange={e => setThemeGroup('layout', 'productColumnsMobile', Number(e.target.value))}>
                            <option value={1}>1 column</option><option value={2}>2 columns</option>
                        </BuilderSelect>
                        <BuilderSelect label="Product gap" value={theme.layout?.productGap || theme.productGridStyle || 'Comfortable'} onChange={e => {
                            setThemeGroup('layout', 'productGap', e.target.value);
                            setTheme(prev => ({ ...prev, productGridStyle: e.target.value }));
                        }}>
                            <option>Compact</option><option>Comfortable</option><option>Spacious</option><option>Editorial</option>
                        </BuilderSelect>
                        <BuilderSelect label="Card alignment" value={theme.layout?.cardAlignment || 'Left'} onChange={e => setThemeGroup('layout', 'cardAlignment', e.target.value)} help="Aligns product card text and controls.">
                            <option>Left</option><option>Center</option><option>Right</option>
                        </BuilderSelect>
                    </BuilderCard>
                );
            case 'navigation':
                return (
                    <BuilderCard
                        title="Header and navigation"
                        description="Keep navigation short so customers can find the important pages quickly."
                        icon={LinkIcon}
                        actions={(
                            <div className="flex flex-wrap gap-2">
                                <BuilderButton type="button" variant="secondary" onClick={addNavigation}><Plus size={16} /> Add link</BuilderButton>
                                <BuilderButton type="button" variant="secondary" onClick={addNavigationDropdown}><Plus size={16} /> Add dropdown</BuilderButton>
                            </div>
                        )}
                    >
                        {(theme.navigation || []).map((item, index) => (
                            <div key={index} className="rounded-lg border border-slate-200 p-3">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                                        <GripVertical size={15} />
                                        Link {index + 1}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button type="button" onClick={() => moveNavigation(index, -1)} disabled={index === 0} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30" title="Move link up">
                                            <ChevronUp size={16} />
                                        </button>
                                        <button type="button" onClick={() => moveNavigation(index, 1)} disabled={index === (theme.navigation || []).length - 1} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30" title="Move link down">
                                            <ChevronDown size={16} />
                                        </button>
                                        <button type="button" onClick={() => removeNavigation(index)} className="rounded-md p-2 text-red-500 hover:bg-red-50" title="Delete link">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <BuilderInput
                                        label="Label"
                                        value={item.label || ''}
                                        onChange={e => updateNavigation(index, 'label', e.target.value)}
                                        placeholder="Shop"
                                        error={item.url && !item.label ? 'Add a label for this link.' : ''}
                                    />
                                    <BuilderInput
                                        label="URL"
                                        value={item.url || ''}
                                        onChange={e => updateNavigation(index, 'url', e.target.value)}
                                        placeholder="/products"
                                        help="Use an internal path like /track or a full external URL."
                                    />
                                    <BuilderToggle
                                        label="Mega menu ready"
                                        help="Stores menu intent for future category-rich dropdowns. Current storefront keeps it as a clean nested menu."
                                        checked={Boolean(item.megaMenu)}
                                        onChange={() => updateNavigation(index, 'megaMenu', !item.megaMenu)}
                                    />
                                </div>
                                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Nested menu links</p>
                                            <p className="text-xs text-slate-500">Prepared for dropdown and mega menu expansion.</p>
                                        </div>
                                        <BuilderButton type="button" variant="subtle" onClick={() => addNavigationChild(index)}><Plus size={14} /> Add sub link</BuilderButton>
                                    </div>
                                    {(item.children || []).length === 0 ? (
                                        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-500">No sub links yet.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {(item.children || []).map((child, childIndex) => (
                                                <div key={childIndex} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
                                                    <input
                                                        value={child.label || ''}
                                                        onChange={e => updateNavigationChild(index, childIndex, 'label', e.target.value)}
                                                        placeholder="Sub label"
                                                        className={inputClass}
                                                        aria-label="Sub menu label"
                                                    />
                                                    <input
                                                        value={child.url || ''}
                                                        onChange={e => updateNavigationChild(index, childIndex, 'url', e.target.value)}
                                                        placeholder="/collection"
                                                        className={inputClass}
                                                        aria-label="Sub menu URL"
                                                    />
                                                    <button type="button" onClick={() => removeNavigationChild(index, childIndex)} className="rounded-lg border border-red-200 px-3 text-red-600 hover:bg-red-50" title="Delete sub link">
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </BuilderCard>
                );
            case 'hero': {
                const heroSlides = getBuilderHeroSlides(theme.hero);
                return (
                    <BuilderCard
                        title="Hero carousel"
                        description="Each slide uses the uploaded image as the full banner background in preview and storefront."
                        icon={LayoutTemplate}
                        actions={<BuilderButton type="button" variant="secondary" onClick={addHeroSlide} disabled={heroSlides.length >= HERO_SLIDE_LIMIT}><Plus size={16} /> Add slide</BuilderButton>}
                    >
                        <BuilderSelect label="Hero height" value={theme.hero?.height || 'Medium'} onChange={e => setThemeGroup('hero', 'height', e.target.value)}>
                            <option>Compact</option><option>Medium</option><option>Tall</option>
                        </BuilderSelect>
                        <div className="space-y-4">
                            {heroSlides.map((slide, index) => (
                                <div key={slide.id || index} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="text-sm font-black text-slate-950">Slide {index + 1}</p>
                                            <p className="mt-1 text-xs text-slate-500">Desktop image fills the whole banner. Mobile image is optional.</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
                                                <input
                                                    type="checkbox"
                                                    checked={slide.enabled !== false}
                                                    onChange={e => updateHeroSlide(index, 'enabled', e.target.checked)}
                                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                                                />
                                                Enabled
                                            </label>
                                            <button type="button" onClick={() => moveHeroSlide(index, -1)} disabled={index === 0} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30" title="Move slide up">
                                                <ChevronUp size={15} />
                                            </button>
                                            <button type="button" onClick={() => moveHeroSlide(index, 1)} disabled={index === heroSlides.length - 1} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30" title="Move slide down">
                                                <ChevronDown size={15} />
                                            </button>
                                            <button type="button" onClick={() => removeHeroSlide(index)} className="rounded-lg border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50" title="Delete slide">
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {[
                                            { key: 'desktopImage', label: 'Desktop image', help: 'Wide image for laptop, desktop, and large screens.' },
                                            { key: 'mobileImage', label: 'Mobile image', help: 'Optional. If empty, desktop image is used on phones.' }
                                        ].map(({ key, label, help }) => (
                                            <div key={key} className="rounded-lg border border-slate-200 bg-white p-3">
                                                <BuilderInput
                                                    label={label}
                                                    value={slide[key] || ''}
                                                    onChange={e => updateHeroSlide(index, key, e.target.value)}
                                                    placeholder="https://..."
                                                    help={help}
                                                />
                                                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500">
                                                    <Upload size={14} />
                                                    {uploadingThemeImage ? 'Uploading...' : 'Upload image'}
                                                    <input
                                                        type="file"
                                                        accept="image/png,image/jpeg,image/webp"
                                                        className="hidden"
                                                        disabled={uploadingThemeImage}
                                                        onChange={event => handleThemeImageUpload(event, url => updateHeroSlide(index, key, url))}
                                                    />
                                                </label>
                                                {slide[key] && (
                                                    <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                                                        <img src={slide[key]} alt="" className="h-24 w-full object-cover" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <BuilderInput label="Headline" value={slide.title || ''} onChange={e => updateHeroSlide(index, 'title', e.target.value)} placeholder="Discover your favorite products" />
                                        <BuilderInput label="Badge text" value={slide.badgeText || ''} onChange={e => updateHeroSlide(index, 'badgeText', e.target.value)} placeholder="Limited time offer" />
                                        <BuilderInput label="Offer text" value={slide.discountText || ''} onChange={e => updateHeroSlide(index, 'discountText', e.target.value)} placeholder="14% OFF SITEWIDE" />
                                        <BuilderInput label="Subtitle" value={slide.subtitle || ''} onChange={e => updateHeroSlide(index, 'subtitle', e.target.value)} placeholder="Fresh styles, premium picks, and exclusive deals." />
                                        <BuilderInput label="Primary button text" value={slide.primaryCtaText || ''} onChange={e => updateHeroSlide(index, 'primaryCtaText', e.target.value)} placeholder="Shop Now" />
                                        <BuilderInput label="Primary button link" value={slide.primaryCtaLink || ''} onChange={e => updateHeroSlide(index, 'primaryCtaLink', e.target.value)} placeholder="#products" />
                                        <BuilderInput label="Secondary button text" value={slide.secondaryCtaText || ''} onChange={e => updateHeroSlide(index, 'secondaryCtaText', e.target.value)} placeholder="Explore Collection" />
                                        <BuilderInput label="Secondary button link" value={slide.secondaryCtaLink || ''} onChange={e => updateHeroSlide(index, 'secondaryCtaLink', e.target.value)} placeholder="#products" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </BuilderCard>
                );
            }
            case 'seo':
                return (
                    <div className="space-y-4">
                        <BuilderCard title="Homepage SEO" description="Control how your store homepage appears in Google and social shares." icon={Search}>
                            <BuilderInput
                                label="Homepage SEO title"
                                value={theme.seo?.title || ''}
                                onChange={e => setThemeGroup('seo', 'title', e.target.value)}
                                placeholder={`${shopName || 'Your Store'} - Online Store`}
                                help="Recommended length: 50-70 characters. If empty, the hero title or store name is used."
                            />
                            <SeoLengthHint value={theme.seo?.title || ''} min={50} max={70} label="SEO title" />
                            <BuilderTextarea
                                label="Homepage SEO description"
                                value={theme.seo?.description || ''}
                                onChange={e => setThemeGroup('seo', 'description', e.target.value)}
                                placeholder={`Shop products from ${shopName || 'this store'}.`}
                                help="Recommended length: 120-160 characters. This can appear under your Google result."
                            />
                            <SeoLengthHint value={theme.seo?.description || ''} min={120} max={160} label="SEO description" />
                            <BuilderInput
                                label="Default social share image"
                                value={theme.seo?.socialImage || ''}
                                onChange={e => setThemeGroup('seo', 'socialImage', e.target.value)}
                                placeholder="https://..."
                                help="Used when your homepage is shared and no product image is available."
                            />
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500">
                                <Upload size={16} />
                                {uploadingThemeImage ? 'Uploading...' : 'Upload social image'}
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    disabled={uploadingThemeImage}
                                    onChange={event => handleThemeImageUpload(event, url => setThemeGroup('seo', 'socialImage', url))}
                                />
                            </label>
                            {theme.seo?.socialImage && (
                                <div className="overflow-hidden rounded-xl border border-slate-200">
                                    <img src={theme.seo.socialImage} alt="" className="h-32 w-full object-cover" />
                                </div>
                            )}
                            <BuilderInput
                                label="Facebook page URL"
                                value={theme.seo?.facebookUrl || ''}
                                onChange={e => setThemeGroup('seo', 'facebookUrl', e.target.value)}
                                placeholder="https://facebook.com/your-page"
                                help="Helps shoppers and search engines connect your store with your social presence."
                            />
                            <BuilderInput
                                label="Google Search Console verification code"
                                value={theme.seo?.googleSiteVerification || ''}
                                onChange={e => setThemeGroup('seo', 'googleSiteVerification', e.target.value)}
                                placeholder="abc123"
                                help="Paste only the content value from Google's meta tag. If you paste the full tag, the backend stores only the safe verification code."
                            />
                            <BuilderToggle
                                label="Allow search engines to index this store"
                                help="Turn this off only if you want Google and other search engines to avoid showing this storefront."
                                checked={theme.seo?.searchEngineVisibility !== false}
                                onChange={e => setThemeGroup('seo', 'searchEngineVisibility', e.target.checked)}
                            />
                        </BuilderCard>
                        <SeoSnippetPreview {...storeSeoPreview} />
                        <SeoHealthCard
                            title="Store SEO score"
                            score={storeSeoHealth.score}
                            tasks={storeSeoHealth.tasks}
                            description={`Your store SEO score is ${storeSeoHealth.score}/100. Improve the missing items to help shoppers find and trust your store.`}
                        />
                    </div>
                );
            case 'products':
                return (
                    <div className="space-y-4">
                    <BuilderCard title="All Products" description="This fixed storefront section always appears after flexible homepage sections." icon={ShoppingBag}>
                        <BuilderToggle label="Show All Products section" help="Keep this on unless the store is temporarily not selling products." checked={theme.allProducts?.isEnabled !== false} onChange={() => setThemeGroup('allProducts', 'isEnabled', theme.allProducts?.isEnabled === false)} />
                        <BuilderInput label="Section title" value={theme.allProducts?.title || ''} onChange={e => setThemeGroup('allProducts', 'title', e.target.value)} placeholder="Shop products" />
                        <BuilderInput label="Section subtitle" value={theme.allProducts?.subtitle || ''} onChange={e => setThemeGroup('allProducts', 'subtitle', e.target.value)} placeholder="Optional helper text above the product catalog" />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <BuilderSelect label="Products per row on desktop" value={theme.allProducts?.desktopColumns || theme.layout?.productColumnsDesktop || 3} onChange={e => {
                                setThemeGroup('allProducts', 'desktopColumns', Number(e.target.value));
                                setThemeGroup('layout', 'productColumnsDesktop', Number(e.target.value));
                            }}>
                                <option value={2}>2 columns</option><option value={3}>3 columns</option><option value={4}>4 columns</option><option value={5}>5 columns</option>
                            </BuilderSelect>
                            <BuilderSelect label="Products per row on tablet" value={theme.allProducts?.tabletColumns || 2} onChange={e => setThemeGroup('allProducts', 'tabletColumns', Number(e.target.value))}>
                                <option value={1}>1 column</option><option value={2}>2 columns</option><option value={3}>3 columns</option><option value={4}>4 columns</option>
                            </BuilderSelect>
                            <BuilderSelect label="Products per row on phone" value={theme.allProducts?.mobileColumns || theme.layout?.productColumnsMobile || 2} onChange={e => {
                                setThemeGroup('allProducts', 'mobileColumns', Number(e.target.value));
                                setThemeGroup('layout', 'productColumnsMobile', Number(e.target.value));
                            }}>
                                <option value={1}>1 column</option><option value={2}>2 columns</option>
                            </BuilderSelect>
                        </div>
                        <BuilderSelect label="Section spacing" value={theme.allProducts?.spacing || theme.layout?.contentSpacing || 'Comfortable'} onChange={e => setThemeGroup('allProducts', 'spacing', e.target.value)}>
                            <option>Compact</option><option>Comfortable</option><option>Spacious</option>
                        </BuilderSelect>
                    </BuilderCard>
                    <BuilderCard title="Product cards" description="Control how products appear in grids across desktop and mobile." icon={ShoppingBag}>
                        <BuilderSelect label="Product card style" value={theme.productCard?.style || 'Modern'} onChange={e => setThemeGroup('productCard', 'style', e.target.value)} help="Minimal is quieter, Modern is balanced, Premium adds stronger depth.">
                            <option>Minimal</option><option>Modern</option><option>Premium</option>
                        </BuilderSelect>
                        <BuilderSelect label="Product image fit" value={theme.productCard?.imageFit || 'Contain'} onChange={e => setThemeGroup('productCard', 'imageFit', e.target.value)} help="Contain keeps the whole product visible. Cover fills the image area.">
                            <option>Contain</option><option>Cover</option>
                        </BuilderSelect>
                        <BuilderSelect label="Image aspect ratio" value={theme.productCard?.aspectRatio || 'Square'} onChange={e => setThemeGroup('productCard', 'aspectRatio', e.target.value)}>
                            <option>Square</option><option>Portrait</option><option>Landscape</option>
                        </BuilderSelect>
                        <BuilderSelect label="Product card corner roundness" value={theme.productCard?.borderRadius || 'Rounded'} onChange={e => setThemeGroup('productCard', 'borderRadius', e.target.value)}>
                            <option>Soft</option><option>Rounded</option><option>Square</option>
                        </BuilderSelect>
                        <BuilderSelect label="Image corners" value={theme.productCard?.imageRadius || 'Rounded'} onChange={e => setThemeGroup('productCard', 'imageRadius', e.target.value)}>
                            <option>Soft</option><option>Rounded</option><option>Square</option>
                        </BuilderSelect>
                        <BuilderSelect label="Shadow" value={theme.productCard?.shadow || 'Soft'} onChange={e => setThemeGroup('productCard', 'shadow', e.target.value)}>
                            <option>None</option><option>Soft</option><option>Elevated</option>
                        </BuilderSelect>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <BuilderSelect label="Title size" value={theme.productCard?.titleSize || 'Medium'} onChange={e => setThemeGroup('productCard', 'titleSize', e.target.value)}>
                                <option>Small</option><option>Medium</option><option>Large</option>
                            </BuilderSelect>
                            <BuilderSelect label="Title weight" value={theme.productCard?.titleWeight || '800'} onChange={e => setThemeGroup('productCard', 'titleWeight', e.target.value)}>
                                <option value="600">Semi bold</option><option value="700">Bold</option><option value="800">Extra bold</option><option value="900">Black</option>
                            </BuilderSelect>
                            <BuilderSelect label="Price size" value={theme.productCard?.priceSize || 'Medium'} onChange={e => setThemeGroup('productCard', 'priceSize', e.target.value)}>
                                <option>Small</option><option>Medium</option><option>Large</option>
                            </BuilderSelect>
                            <FieldShell
                                label="Price color"
                                help="Overrides the global price color for product cards."
                                error={!isHexColor(theme.productCard?.priceColor || theme.colors?.priceColor) ? 'Enter a valid hex color.' : ''}
                            >
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={isHexColor(theme.productCard?.priceColor || theme.colors?.priceColor) ? (theme.productCard?.priceColor || theme.colors?.priceColor) : '#0f172a'}
                                        onChange={e => setThemeGroup('productCard', 'priceColor', e.target.value)}
                                        className="h-10 w-12 rounded-lg border border-slate-200 bg-white"
                                    />
                                    <input
                                        value={theme.productCard?.priceColor || theme.colors?.priceColor || ''}
                                        onChange={e => setThemeGroup('productCard', 'priceColor', e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                            </FieldShell>
                        </div>
                        <BuilderToggle label="Show category" help="Shows the product category above the product name." checked={theme.productCard?.showCategory !== false} onChange={() => toggleThemeGroup('productCard', 'showCategory')} />
                        <BuilderToggle label="Show rating" help="Shows star rating when a product has reviews." checked={theme.productCard?.showRating !== false} onChange={() => toggleThemeGroup('productCard', 'showRating')} />
                        <BuilderToggle label="Show reviews" help="Shows review count when available." checked={theme.productCard?.showReviews !== false} onChange={() => toggleThemeGroup('productCard', 'showReviews')} />
                        <BuilderToggle label="Show stock" help="Shows stock availability under the price." checked={theme.productCard?.showStock !== false} onChange={() => toggleThemeGroup('productCard', 'showStock')} />
                        <BuilderToggle label="Show SKU" help="Shows SKU or product ID shortcut for product-heavy stores." checked={Boolean(theme.productCard?.showSku)} onChange={() => toggleThemeGroup('productCard', 'showSku')} />
                        <BuilderToggle label="Show discount badge" help="Shows sale percentage badges on product images." checked={theme.productCard?.showDiscountBadge !== false} onChange={() => toggleThemeGroup('productCard', 'showDiscountBadge')} />
                        <BuilderToggle label="Show quick buy" help="Adds add-to-cart and buy-now buttons in product cards." checked={theme.productCard?.showQuickBuy !== false} onChange={() => toggleThemeGroup('productCard', 'showQuickBuy')} />
                        <BuilderToggle label="Show wishlist button" help="Shows a wishlist-ready heart button. Wishlist storage can be added later." checked={Boolean(theme.productCard?.showWishlist)} onChange={() => toggleThemeGroup('productCard', 'showWishlist')} />
                        <BuilderToggle label="Hover image zoom" help="Gently zooms product images on desktop hover." checked={theme.productCard?.hoverZoom !== false} onChange={() => toggleThemeGroup('productCard', 'hoverZoom')} />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <BuilderSelect label="Button style" value={theme.productCard?.buttonStyle || 'Solid'} onChange={e => setThemeGroup('productCard', 'buttonStyle', e.target.value)}>
                                <option>Solid</option><option>Outline</option><option>Ghost</option>
                            </BuilderSelect>
                            <BuilderSelect label="Add-to-cart button shape" value={theme.productCard?.buttonShape || 'Rounded'} onChange={e => setThemeGroup('productCard', 'buttonShape', e.target.value)}>
                                <option>Soft</option><option>Rounded</option><option>Pill</option><option>Square</option>
                            </BuilderSelect>
                            <FieldShell label="Button color" help="Used by quick-buy buttons on product cards." error={!isHexColor(theme.productCard?.buttonColor || theme.colors?.primaryButtonBg) ? 'Enter a valid hex color.' : ''}>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={isHexColor(theme.productCard?.buttonColor || theme.colors?.primaryButtonBg) ? (theme.productCard?.buttonColor || theme.colors?.primaryButtonBg) : '#0f766e'}
                                        onChange={e => setThemeGroup('productCard', 'buttonColor', e.target.value)}
                                        className="h-10 w-12 rounded-lg border border-slate-200 bg-white"
                                    />
                                    <input
                                        value={theme.productCard?.buttonColor || theme.colors?.primaryButtonBg || ''}
                                        onChange={e => setThemeGroup('productCard', 'buttonColor', e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                            </FieldShell>
                        </div>
                    </BuilderCard>
                    </div>
                );
            case 'sections':
                return (
                    <BuilderCard
                        title="Homepage sections"
                        description="Navbar, Hero, All Products, and Footer are fixed. Add flexible sections between Hero and All Products."
                        icon={LayoutTemplate}
                        actions={<BuilderButton type="button" variant="secondary" onClick={() => addHomepageSection()}><Plus size={16} /> Add section</BuilderButton>}
                    >
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Homepage order</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-700">
                                        Fixed sections stay in place. Flexible sections render between Hero and All Products.
                                    </p>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-800">
                                    <Lock size={12} /> Locked frame
                                </span>
                            </div>
                            <div className="mt-3 grid gap-2 text-xs font-bold text-slate-600">
                                {[
                                    { label: 'Navbar', note: 'Fixed header', locked: true },
                                    { label: 'Hero Banner', note: 'Fixed opening section', locked: true },
                                    { label: 'Flexible content area', note: 'Add, duplicate, hide, reorder, and edit sections here', locked: false },
                                    { label: 'All Products', note: 'Fixed catalog section', locked: true },
                                    { label: 'Footer', note: 'Fixed closing section', locked: true }
                                ].map(item => (
                                    <div
                                        key={item.label}
                                        className={`flex flex-col gap-1 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between ${
                                            item.locked
                                                ? 'border-slate-200 bg-white'
                                                : 'border-indigo-200 bg-indigo-50 text-indigo-800'
                                        }`}
                                    >
                                        <span className="inline-flex items-center gap-2">
                                            {item.locked ? <Lock size={13} className="text-amber-600" /> : <LayoutTemplate size={13} />}
                                            {item.label}
                                        </span>
                                        <span className="text-[11px] font-semibold opacity-75">{item.note}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="mb-3">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Add flexible section</p>
                                <p className="mt-1 text-sm text-slate-500">Choose a starter layout. You can edit, hide, duplicate, or reorder it after adding.</p>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {inlineSectionPresets.map(preset => (
                                    <button
                                        key={preset.templateId}
                                        type="button"
                                        onClick={() => addHomepageSection(preset)}
                                        className="group grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
                                    >
                                        <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                                            <span className="grid h-full w-full grid-cols-2 gap-1">
                                                {[0, 1, 2, 3].map(item => (
                                                    <span
                                                        key={item}
                                                        className={`rounded-md ${
                                                            preset.thumbnail === 'image'
                                                                ? 'bg-teal-100'
                                                                : preset.thumbnail === 'strip'
                                                                    ? 'col-span-2 bg-indigo-100'
                                                                    : preset.thumbnail === 'quotes'
                                                                        ? 'bg-amber-100'
                                                                        : 'bg-slate-100'
                                                        }`}
                                                    />
                                                ))}
                                            </span>
                                        </span>
                                        <span className="min-w-0">
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-black text-slate-900 group-hover:text-indigo-800">{preset.label}</span>
                                                <Plus size={15} className="shrink-0 text-slate-400 group-hover:text-indigo-600" />
                                            </span>
                                            <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{preset.description}</span>
                                            <span className="mt-2 block text-[11px] font-bold uppercase tracking-wide text-slate-400">{preset.useCase}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        {(theme.homepageSections || []).length === 0 && (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                                No flexible homepage sections yet. Add a banner, featured products, reviews, or promotional content block.
                            </div>
                        )}
                        {(theme.homepageSections || []).map((section, index) => {
                            const locked = isHomepageSectionLocked(section);
                            const previousLocked = isHomepageSectionLocked((theme.homepageSections || [])[index - 1]);
                            const nextLocked = isHomepageSectionLocked((theme.homepageSections || [])[index + 1]);
                            const selectedProductIds = section.settings?.productIds || section.settings?.source?.productIds || [];
                            const selectedProducts = selectedProductIds
                                .map(productId => availableProducts.find(product => String(product._id) === String(productId)))
                                .filter(Boolean);
                            const selectedReviewIds = section.settings?.reviewIds || [];
                            const selectedReviews = selectedReviewIds
                                .map(reviewId => availableReviews.find(review => String(review._id) === String(reviewId)))
                                .filter(Boolean);
                            const availableCategoryOptions = productCategories.length
                                ? productCategories
                                : [...new Set(availableProducts.map(product => product.category).filter(Boolean))];
                            const isSelectedSection = activeElement === `section-${index}`;

                            return (
                            <div
                                key={section.id || section._id || index}
                                className={`rounded-lg border p-3 transition ${
                                    isSelectedSection
                                        ? 'border-indigo-300 bg-indigo-50/60 ring-2 ring-indigo-100'
                                        : locked
                                            ? 'border-amber-200 bg-amber-50/40'
                                            : 'border-slate-200 bg-white'
                                }`}
                            >
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-slate-900">{section.title || section.type}</p>
                                            {isSelectedSection && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800">
                                                    Editing
                                                </span>
                                            )}
                                            {locked && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                                                    <Lock size={12} /> Locked
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            {locked ? 'Fixed section settings are protected.' : `${section.type} inside the flexible content area.`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button type="button" onClick={() => selectEditorTarget(`section-${index}`)} className="rounded-md px-2 py-2 text-xs font-black text-indigo-600 hover:bg-indigo-100" title="Edit section">
                                            Edit
                                        </button>
                                        <button type="button" onClick={() => moveHomepageSection(index, -1)} disabled={locked || previousLocked || index === 0} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30" title="Move section up">
                                            <ChevronUp size={16} />
                                        </button>
                                        <button type="button" onClick={() => moveHomepageSection(index, 1)} disabled={locked || nextLocked || index === (theme.homepageSections || []).length - 1} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30" title="Move section down">
                                            <ChevronDown size={16} />
                                        </button>
                                        <button type="button" onClick={() => duplicateHomepageSection(index)} disabled={locked} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30" title="Duplicate section">
                                            <Copy size={16} />
                                        </button>
                                        <button type="button" onClick={() => toggleHomepageSectionLock(index)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" title={locked ? 'Unlock section' : 'Lock section'}>
                                            {locked ? <Unlock size={16} /> : <Lock size={16} />}
                                        </button>
                                        <button type="button" onClick={() => removeHomepageSection(index)} disabled={locked} className="rounded-md p-2 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30" title="Remove section">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <BuilderSelect label="Section type" value={section.type || 'FeaturedProducts'} onChange={e => updateHomepageSection(index, 'type', e.target.value)} disabled={locked}>
                                        <option value="FeaturedProducts">Featured Products</option>
                                        <option value="Banner">Banner</option>
                                        <option value="Reviews">Customer Reviews</option>
                                        <option value="TextBlock">Promotional Content</option>
                                        <option value="Newsletter">Newsletter</option>
                                        <option value="CategoryList">Category List</option>
                                        <option value="FAQ">FAQ</option>
                                        <option value="TrustBadges">Trust Badges</option>
                                        <option value="BrandStory">Brand Story</option>
                                    </BuilderSelect>
                                    <BuilderInput label="Section title" value={section.title || ''} onChange={e => updateHomepageSection(index, 'title', e.target.value)} disabled={locked} />
                                </div>
                                {section.type === 'Banner' && (
                                    <div className="mt-3 grid grid-cols-1 gap-3">
                                        {[
                                            { key: 'desktopImages', label: 'Desktop images', help: 'Wide campaign images for laptop and desktop shoppers.' },
                                            { key: 'mobileImages', label: 'Mobile images', help: 'Vertical or square campaign images for phones.' }
                                        ].map(({ key, label, help }) => {
                                            const images = getBannerImages(section, key);
                                            return (
                                                <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900">{label}</p>
                                                            <p className="text-xs text-slate-500">{help} Maximum 5 images.</p>
                                                        </div>
                                                        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100">
                                                            <Upload size={14} />
                                                            {uploadingThemeImage ? 'Uploading...' : 'Upload'}
                                                            <input
                                                                type="file"
                                                                multiple
                                                                accept="image/png,image/jpeg,image/webp"
                                                                className="hidden"
                                                                disabled={locked || uploadingThemeImage || images.length >= 5}
                                                                onChange={event => handleBannerImagesUpload(event, index, key)}
                                                            />
                                                        </label>
                                                    </div>
                                                    {images.length === 0 ? (
                                                        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500">No images added yet.</p>
                                                    ) : (
                                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                                            {images.map((image, imageIndex) => (
                                                                <div key={image} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                                                    <img src={image} alt="" className="h-24 w-full object-cover" />
                                                                    <div className="flex items-center justify-between gap-1 p-2">
                                                                        <button type="button" onClick={() => moveBannerImage(index, key, imageIndex, -1)} disabled={locked || imageIndex === 0} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                                                                            <ChevronUp size={14} />
                                                                        </button>
                                                                        <button type="button" onClick={() => moveBannerImage(index, key, imageIndex, 1)} disabled={locked || imageIndex === images.length - 1} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                                                                            <ChevronDown size={14} />
                                                                        </button>
                                                                        <button type="button" onClick={() => removeBannerImage(index, key, imageIndex)} disabled={locked} className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-30">
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <BuilderInput
                                                        label="Paste image URL"
                                                        defaultValue=""
                                                        onBlur={e => {
                                                            addBannerImageUrl(index, key, e.currentTarget.value);
                                                            e.currentTarget.value = '';
                                                        }}
                                                        disabled={locked || images.length >= 5}
                                                        placeholder="https://..."
                                                        help="Optional. Upload is recommended for reliable image delivery."
                                                    />
                                                </div>
                                            );
                                        })}
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <BuilderInput label="Banner headline" value={section.settings?.title || ''} onChange={e => updateHomepageSectionSetting(index, 'title', e.target.value)} disabled={locked} />
                                            <BuilderInput label="Subtitle" value={section.settings?.subtitle || ''} onChange={e => updateHomepageSectionSetting(index, 'subtitle', e.target.value)} disabled={locked} />
                                            <BuilderInput label="Button text" value={section.settings?.buttonText || ''} onChange={e => updateHomepageSectionSetting(index, 'buttonText', e.target.value)} disabled={locked} />
                                            <BuilderInput label="Button link" value={section.settings?.buttonLink || ''} onChange={e => updateHomepageSectionSetting(index, 'buttonLink', e.target.value)} disabled={locked} />
                                        </div>
                                    </div>
                                )}
                                {section.type === 'FeaturedProducts' && (
                                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">Manual product selection</p>
                                                <p className="mt-1 text-xs text-slate-500">Collection and automatic rule sources can use this same source structure later.</p>
                                            </div>
                                            <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-500">
                                                {selectedProductIds.length} selected
                                            </span>
                                        </div>
                                        {selectedProducts.length > 0 && (
                                            <div className="mb-3 flex flex-wrap gap-2">
                                                {selectedProducts.map(product => (
                                                    <span key={product._id} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                                                        {product.title}
                                                        <button type="button" onClick={() => updateFeaturedProductsSelection(index, product._id, false)} disabled={locked} className="text-red-500 disabled:opacity-40">
                                                            <X size={12} />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_160px_auto]">
                                            <label className="relative">
                                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    value={productPicker.search}
                                                    onChange={e => setProductPicker(prev => ({ ...prev, search: e.target.value }))}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            loadProductOptions({ page: 1, search: productPicker.search, category: productPicker.category });
                                                        }
                                                    }}
                                                    className={`${inputClass} pl-9`}
                                                    placeholder="Search products"
                                                    disabled={locked}
                                                />
                                            </label>
                                            <select
                                                value={productPicker.category}
                                                onChange={e => {
                                                    const category = e.target.value;
                                                    setProductPicker(prev => ({ ...prev, category }));
                                                    loadProductOptions({ page: 1, search: productPicker.search, category });
                                                }}
                                                className={inputClass}
                                                disabled={locked}
                                            >
                                                <option value="All">All categories</option>
                                                {availableCategoryOptions.map(category => (
                                                    <option key={category} value={category}>{category}</option>
                                                ))}
                                            </select>
                                            <BuilderButton type="button" variant="secondary" onClick={() => loadProductOptions({ page: 1, search: productPicker.search, category: productPicker.category })} disabled={locked || productPicker.loading}>
                                                {productPicker.loading ? 'Searching...' : 'Search'}
                                            </BuilderButton>
                                        </div>
                                        <div className="max-h-56 space-y-2 overflow-y-auto">
                                            {productOptions.length === 0 ? (
                                                <p className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500">No published products available yet.</p>
                                            ) : productOptions.map(product => {
                                                const productId = product._id;
                                                const selected = selectedProductIds.map(String).includes(String(productId));
                                                return (
                                                    <label key={productId} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm">
                                                        <span className="min-w-0">
                                                            <span className="block truncate font-semibold text-slate-800">{product.title}</span>
                                                            <span className="text-xs text-slate-500">{product.category || 'No category'} · ৳ {product.pricing?.sellingPrice || 0}</span>
                                                        </span>
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            disabled={locked}
                                                            onChange={e => updateFeaturedProductsSelection(index, productId, e.target.checked)}
                                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        {productPicker.page < productPicker.pages && (
                                            <BuilderButton
                                                type="button"
                                                variant="secondary"
                                                className="mt-3 w-full"
                                                onClick={() => loadProductOptions({ page: productPicker.page + 1, append: true, search: productPicker.search, category: productPicker.category })}
                                                disabled={locked || productPicker.loading}
                                            >
                                                {productPicker.loading ? 'Loading...' : 'Load more products'}
                                            </BuilderButton>
                                        )}
                                    </div>
                                )}
                                {section.type === 'Reviews' && (
                                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">Real 5-star testimonials</p>
                                                <p className="mt-1 text-xs text-slate-500">Select real customer reviews by Review ID. Only 10 reviews load at a time.</p>
                                            </div>
                                            <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-500">
                                                {selectedReviewIds.length} selected
                                            </span>
                                        </div>
                                        <BuilderSelect
                                            label="Review source"
                                            value={section.settings?.mode || (selectedReviewIds.length ? 'selectedReviews' : 'text')}
                                            onChange={e => updateHomepageSectionSetting(index, 'mode', e.target.value)}
                                            disabled={locked}
                                            help="Use real reviews when available, or a manual testimonial as fallback."
                                        >
                                            <option value="selectedReviews">Selected 5-star reviews</option>
                                            <option value="text">Manual testimonial text</option>
                                        </BuilderSelect>
                                        {selectedReviews.length > 0 && (
                                            <div className="my-3 space-y-2">
                                                {selectedReviews.map(review => (
                                                    <div key={review._id} className="rounded-lg bg-white p-3 text-sm shadow-sm">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="font-black text-slate-900">{review.name}</p>
                                                                <p className="text-xs font-bold text-amber-500">★★★★★ <span className="text-slate-400">Review ID {String(review._id).slice(-8)}</span></p>
                                                                <p className="mt-1 truncate text-xs text-slate-500">{review.product?.title || 'Product review'}</p>
                                                            </div>
                                                            <button type="button" onClick={() => updateReviewSelection(index, review._id, false)} disabled={locked} className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-40">
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{review.comment}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                                            <label className="relative">
                                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    value={reviewPicker.search}
                                                    onChange={e => setReviewPicker(prev => ({ ...prev, search: e.target.value }))}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            loadReviewOptions({ page: 1, search: reviewPicker.search });
                                                        }
                                                    }}
                                                    className={`${inputClass} pl-9`}
                                                    placeholder="Search reviewer, product, or comment"
                                                    disabled={locked}
                                                />
                                            </label>
                                            <BuilderButton type="button" variant="secondary" onClick={() => loadReviewOptions({ page: 1, search: reviewPicker.search })} disabled={locked || reviewPicker.loading}>
                                                {reviewPicker.loading ? 'Searching...' : 'Search'}
                                            </BuilderButton>
                                        </div>
                                        <div className="max-h-64 space-y-2 overflow-y-auto">
                                            {availableReviews.length === 0 ? (
                                                <p className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500">No 5-star reviews found yet.</p>
                                            ) : availableReviews.map(review => {
                                                const selected = selectedReviewIds.map(String).includes(String(review._id));
                                                return (
                                                    <label key={review._id} className="flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm">
                                                        <span className="min-w-0">
                                                            <span className="block truncate font-semibold text-slate-800">{review.name}</span>
                                                            <span className="block text-xs font-bold text-amber-500">★★★★★ <span className="text-slate-400">Review ID {String(review._id).slice(-8)}</span></span>
                                                            <span className="block truncate text-xs text-slate-500">{review.product?.title || 'Product review'}</span>
                                                            <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-600">{review.comment}</span>
                                                        </span>
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            disabled={locked}
                                                            onChange={e => updateReviewSelection(index, review._id, e.target.checked)}
                                                            className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        {reviewPicker.page < reviewPicker.pages && (
                                            <BuilderButton
                                                type="button"
                                                variant="secondary"
                                                className="mt-3 w-full"
                                                onClick={() => loadReviewOptions({ page: reviewPicker.page + 1, append: true, search: reviewPicker.search })}
                                                disabled={locked || reviewPicker.loading}
                                            >
                                                {reviewPicker.loading ? 'Loading...' : 'Load more 10 reviews'}
                                            </BuilderButton>
                                        )}
                                        <div className="mt-3">
                                            <BuilderTextarea
                                                label="Manual fallback text"
                                                value={section.settings?.text || ''}
                                                onChange={e => updateHomepageSectionSetting(index, 'text', e.target.value)}
                                                disabled={locked}
                                                help="Used when no real review is selected, or when you choose manual testimonial text."
                                            />
                                        </div>
                                    </div>
                                )}
                                {section.type === 'CategoryList' && (
                                    <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
                                        <BuilderInput
                                            label="Max categories"
                                            type="number"
                                            min="1"
                                            max="24"
                                            value={section.settings?.maxCategories || 10}
                                            onChange={e => updateHomepageSectionSetting(index, 'maxCategories', Math.min(Math.max(Number(e.target.value) || 1, 1), 24))}
                                            disabled={locked}
                                            help="Limits how many category links appear."
                                        />
                                        <BuilderSelect
                                            label="Desktop columns"
                                            value={section.settings?.columns || 4}
                                            onChange={e => updateHomepageSectionSetting(index, 'columns', Number(e.target.value))}
                                            disabled={locked}
                                        >
                                            <option value={1}>1 column</option>
                                            <option value={2}>2 columns</option>
                                            <option value={3}>3 columns</option>
                                            <option value={4}>4 columns</option>
                                        </BuilderSelect>
                                        <BuilderSelect
                                            label="Mobile columns"
                                            value={section.mobileSettings?.columns || 2}
                                            onChange={e => updateHomepageSectionMobileSetting(index, 'columns', Number(e.target.value))}
                                            disabled={locked}
                                        >
                                            <option value={1}>1 column</option>
                                            <option value={2}>2 columns</option>
                                        </BuilderSelect>
                                    </div>
                                )}
                                {['TextBlock', 'Newsletter', 'FAQ', 'TrustBadges', 'BrandStory'].includes(section.type) && (
                                    <div className="mt-3">
                                        <BuilderTextarea
                                            label="Section text"
                                            value={section.settings?.text || ''}
                                            onChange={e => updateHomepageSectionSetting(index, 'text', e.target.value)}
                                            disabled={locked}
                                            help="Shown below the section title on the storefront."
                                        />
                                    </div>
                                )}
                                <div className="mt-3">
                                    <BuilderToggle label="Visible on storefront" checked={section.isEnabled !== false} onChange={() => updateHomepageSection(index, 'isEnabled', section.isEnabled === false)} disabled={locked} />
                                </div>
                                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <BuilderToggle label="Visible on mobile" checked={section.mobileSettings?.isVisible !== false} onChange={() => updateHomepageSectionMobileSetting(index, 'isVisible', section.mobileSettings?.isVisible === false)} disabled={locked} />
                                    {['FeaturedProducts', 'CategoryList'].includes(section.type) && (
                                        <BuilderSelect label="Mobile columns" value={section.mobileSettings?.columns || 2} onChange={e => updateHomepageSectionMobileSetting(index, 'columns', Number(e.target.value))} disabled={locked}>
                                            <option value={1}>1 column</option>
                                            <option value={2}>2 columns</option>
                                        </BuilderSelect>
                                    )}
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                    {locked
                                        ? 'This section is protected from accidental edits. Unlock it before changing content, visibility, order, or deletion.'
                                        : `Sort order: ${index + 1}. Move controls update the saved sort order used by the storefront.`}
                                </p>
                            </div>
                            );
                        })}
                    </BuilderCard>
                );
            case 'checkout':
                return (
                    <BuilderCard title="Checkout" description="Build trust at the moment customers place an order." icon={CreditCard}>
                        <BuilderInput label="Checkout logo URL" value={theme.checkoutBranding?.logoUrl || ''} onChange={e => setThemeGroup('checkoutBranding', 'logoUrl', e.target.value)} placeholder="https://..." />
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500">
                            <Upload size={16} />
                            {uploadingLogo ? 'Uploading...' : 'Upload checkout logo'}
                            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingLogo} onChange={event => handleLogoUpload(event, 'checkout')} />
                        </label>
                        <BuilderInput label="Checkout banner text" value={theme.checkoutBranding?.bannerText || ''} onChange={e => setThemeGroup('checkoutBranding', 'bannerText', e.target.value)} placeholder="Free returns for 7 days" />
                        <BuilderInput label="Trust message" value={theme.checkoutBranding?.trustMessage || ''} onChange={e => setThemeGroup('checkoutBranding', 'trustMessage', e.target.value)} placeholder="Secure checkout" />
                        <BuilderSelect label="Button style" value={theme.checkoutBranding?.buttonStyle || 'Rounded'} onChange={e => setThemeGroup('checkoutBranding', 'buttonStyle', e.target.value)}>
                            <option>Solid</option><option>Rounded</option><option>Pill</option>
                        </BuilderSelect>
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                            <div className="flex items-start gap-3">
                                <span className="rounded-lg bg-white p-2 text-slate-600 shadow-sm">
                                    <CreditCard size={18} />
                                </span>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Additional Payment Methods Coming Soon</p>
                                    <p className="mt-1 text-sm leading-5 text-slate-500">
                                        The theme now stores a scalable payment settings object for Stripe, SSLCommerz, bKash, Nagad, Rocket, and PayPal without changing the current checkout flow.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {['stripe', 'sslcommerz', 'bkash', 'nagad', 'rocket', 'paypal'].map(provider => (
                                    <label key={provider} className="flex cursor-not-allowed items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold capitalize text-slate-500">
                                        {provider}
                                        <input type="checkbox" checked={Boolean(theme.paymentSettings?.providers?.[provider])} readOnly disabled className="h-4 w-4 rounded border-slate-300" />
                                    </label>
                                ))}
                            </div>
                        </div>
                        <CheckoutBrandingPreview theme={theme} shopName={shopName} />
                    </BuilderCard>
                );
            case 'mobile':
                return (
                    <BuilderCard title="Mobile" description="Tune storefront controls for small screens." icon={Smartphone}>
                        <BuilderToggle label="Sticky checkout button" help="Keeps checkout easy to reach on cart and checkout flows." checked={Boolean(theme.mobile?.stickyCheckoutButton)} onChange={() => toggleThemeGroup('mobile', 'stickyCheckoutButton')} />
                        <BuilderToggle label="Compact header" help="Reduces header height on mobile." checked={Boolean(theme.mobile?.compactHeader)} onChange={() => toggleThemeGroup('mobile', 'compactHeader')} />
                        <BuilderToggle label="Bottom navigation" help="Shows a mobile bottom bar with key actions." checked={Boolean(theme.mobile?.showBottomNavigation)} onChange={() => toggleThemeGroup('mobile', 'showBottomNavigation')} />
                    </BuilderCard>
                );
            case 'footer':
                return (
                    <BuilderCard
                        title="Footer"
                        description="Build a polished footer with store story, support links, contact, and social profiles."
                        icon={FileText}
                    >
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                            <p className="mb-3 text-sm font-black text-slate-950">Brand story</p>
                            <BuilderTextarea
                                label="Short footer description"
                                value={theme.footer?.text || ''}
                                onChange={e => updateFooter('text', e.target.value)}
                                placeholder="Elegant accessories and jewellery selected for everyday and occasion wear."
                                help="Shown beside your logo in the footer. Keep it short, warm, and customer-facing."
                            />
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                            <p className="mb-3 text-sm font-black text-slate-950">Contact and social links</p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <BuilderInput
                                    label="Contact link text"
                                    value={theme.footer?.contactLabel || ''}
                                    onChange={e => updateFooter('contactLabel', e.target.value)}
                                    placeholder="Contact store"
                                />
                                <BuilderInput
                                    label="Contact email"
                                    type="email"
                                    value={theme.footer?.contactEmail || ''}
                                    onChange={e => updateFooter('contactEmail', e.target.value)}
                                    placeholder="support@yourstore.com"
                                    help="Creates a mail link in the support column."
                                />
                                {footerSocialFields.map(field => (
                                    <BuilderInput
                                        key={field.key}
                                        label={field.label}
                                        value={theme.footer?.[field.key] || ''}
                                        onChange={e => updateFooter(field.key, e.target.value)}
                                        placeholder={field.placeholder}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-black text-slate-950">Extra support links</p>
                                    <p className="text-xs text-slate-500">Policy links are added automatically. Add custom pages, collections, or help links here.</p>
                                </div>
                                <BuilderButton type="button" variant="secondary" onClick={addFooterLink} className="text-xs">
                                    <Plus size={14} /> Add link
                                </BuilderButton>
                            </div>
                        {(theme.footer?.links || []).length === 0 && (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                                No custom support links yet. Your policy links still appear automatically.
                            </div>
                        )}
                        {(theme.footer?.links || []).map((item, index) => (
                            <div key={index} className="rounded-lg border border-slate-200 p-3">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Link {index + 1}</p>
                                    <BuilderButton type="button" variant="subtle" onClick={() => removeFooterLink(index)} className="text-xs text-red-600">
                                        <Trash2 size={14} /> Remove
                                    </BuilderButton>
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <BuilderInput
                                        label="Label"
                                        value={item.label || ''}
                                        onChange={e => updateFooterLink(index, 'label', e.target.value)}
                                        placeholder="Refund policy"
                                    />
                                    <BuilderInput
                                        label="URL"
                                        value={item.url || ''}
                                        onChange={e => updateFooterLink(index, 'url', e.target.value)}
                                        placeholder="/policy/refund"
                                    />
                                </div>
                            </div>
                        ))}
                        </div>
                    </BuilderCard>
                );
            case 'policies':
                return (
                    <BuilderCard title="Policies" description="Default policy templates are editable. Keep them accurate for your own store before publishing." icon={FileText}>
                        {['refund', 'shipping', 'privacy', 'terms'].map(key => (
                            <div key={key} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-black text-slate-950">{POLICY_LABELS[key]}</p>
                                        <p className="text-xs text-slate-500">Shown on policy pages and checkout.</p>
                                    </div>
                                    <BuilderButton type="button" variant="secondary" onClick={() => resetPolicyToDefault(key)} className="text-xs">
                                        Reset template
                                    </BuilderButton>
                                </div>
                                <BuilderTextarea
                                    label={`${POLICY_LABELS[key]} body`}
                                    value={theme.policies?.[key] || getDefaultPolicyText(key, { storeName: shopName || 'this store' })}
                                    onChange={e => updatePolicy(key, e.target.value)}
                                    help="Customers can read this before and during checkout. This is a basic template, not legal advice."
                                />
                            </div>
                        ))}
                    </BuilderCard>
                );
            case 'domain': {
                const domainRecord = getDomainRecordHint(customDomain.domain || '');
                const expectedTxtValue = customDomain.expectedTxtValue || (customDomain.verificationToken ? `scaleup-verification=${customDomain.verificationToken}` : '');
                const dnsTarget = customDomain.dnsTarget || CUSTOM_DOMAIN_DNS_TARGET;
                const connectionLabels = getDomainConnectionLabels(customDomain, dnsTarget);
                const canCheckDomain = Boolean(customDomain.domain) && !hasUnsavedChanges && !checkingDomain;
                return (
                    <BuilderCard title="Domain" description="Use this after your domain DNS points to the platform." icon={Globe}>
                        <BuilderInput label="Custom domain" value={customDomain.domain || ''} onChange={e => setCustomDomain(prev => ({ ...prev, domain: e.target.value }))} placeholder="www.example.com" help="Customers can use this instead of the default subdomain after Super Admin verification." />
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                            <div className="flex items-center justify-between gap-3">
                                <span>Status</span>
                                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-900 ring-1 ring-slate-200">{connectionLabels.displayStatus}</span>
                            </div>
                            <div className="mt-2 grid gap-1 text-xs text-slate-500">
                                <span>Ownership: {connectionLabels.ownershipLabel}</span>
                                <span>Routing: {connectionLabels.routingLabel}</span>
                                <span>Browser access: {connectionLabels.browserReady}</span>
                                <span>Last checked: {customDomain.lastCheckedAt ? new Date(customDomain.lastCheckedAt).toLocaleString() : 'Not checked yet'}</span>
                                <span>DNS result: {customDomain.lastDnsCheckStatus || 'Not checked'}</span>
                            </div>
                            {customDomain.lastDnsCheckError && (
                                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 ring-1 ring-amber-100">
                                    {customDomain.lastDnsCheckError}
                                </p>
                            )}
                            {customDomain.adminNote && (
                                <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs leading-5 text-slate-600 ring-1 ring-slate-200">
                                    Admin note: {customDomain.adminNote}
                                </p>
                            )}
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                            <div className="font-bold text-slate-950">DNS instructions</div>
                            {customDomain.domain && expectedTxtValue ? (
                                <div className="mt-3 space-y-2">
                                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                                        <div className="mb-2 font-bold text-slate-800">Step 1: Add TXT record to prove ownership</div>
                                        <div className="grid gap-2 sm:grid-cols-3">
                                            <span><strong>Type</strong><br />TXT</span>
                                            <span><strong>Name</strong><br />_scaleup</span>
                                            <span className="min-w-0"><strong>Value</strong><br /><span className="break-all">{expectedTxtValue}</span></span>
                                        </div>
                                        <p className="mt-2 text-slate-500">This only proves that you own the domain. It does not connect the domain to your storefront.</p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <BuilderButton variant="secondary" className="px-2 py-1 text-xs" onClick={() => copyDomainValue('_scaleup', 'TXT host')}><Copy size={13} /> Copy host</BuilderButton>
                                            <BuilderButton variant="secondary" className="px-2 py-1 text-xs" onClick={() => copyDomainValue(expectedTxtValue, 'TXT value')}><Copy size={13} /> Copy value</BuilderButton>
                                        </div>
                                    </div>
                                    {dnsTarget && domainRecord ? (
                                        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                                            <div className="mb-2 font-bold text-slate-800">Step 2: Point your domain to Scaleup</div>
                                            <div className="grid gap-2 sm:grid-cols-3">
                                                <span><strong>Type</strong><br />{domainRecord.type}</span>
                                                <span><strong>Name</strong><br />{domainRecord.host}</span>
                                                <span className="min-w-0"><strong>Target</strong><br /><span className="break-all">{dnsTarget}</span></span>
                                            </div>
                                            <p className="mt-2 text-slate-500">
                                                This routing record is required before customers can open your storefront on this domain.
                                            </p>
                                            {domainRecord.host === '@' && (
                                                <p className="mt-2 rounded-md bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200">
                                                    Root domains often need ALIAS/ANAME or hosting support. If your DNS provider does not support this, contact support.
                                                </p>
                                            )}
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <BuilderButton variant="secondary" className="px-2 py-1 text-xs" onClick={() => copyDomainValue(domainRecord.host, 'DNS host')}><Copy size={13} /> Copy host</BuilderButton>
                                                <BuilderButton variant="secondary" className="px-2 py-1 text-xs" onClick={() => copyDomainValue(dnsTarget, 'DNS target')}><Copy size={13} /> Copy target</BuilderButton>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 ring-1 ring-amber-100">
                                            Contact support to connect your domain. DNS target is not configured yet.
                                        </p>
                                    )}
                                    <p className="text-xs leading-5 text-slate-500">After updating DNS, click Check verification. DNS changes may take a few minutes to several hours.</p>
                                    <BuilderButton onClick={handleCheckCustomDomain} disabled={!canCheckDomain} className="w-full">
                                        <RefreshCw size={15} className={checkingDomain ? 'animate-spin' : ''} />
                                        {checkingDomain ? 'Checking DNS...' : 'Check verification'}
                                    </BuilderButton>
                                    {hasUnsavedChanges && (
                                        <p className="text-xs leading-5 text-slate-500">Publish your latest domain changes before checking DNS.</p>
                                    )}
                                </div>
                            ) : (
                                <p className="mt-2 text-xs leading-5 text-slate-500">
                                    Add and publish a custom domain first. We will generate a TXT verification value after the domain is saved.
                                </p>
                            )}
                        </div>
                    </BuilderCard>
                );
            }
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

    return (
        <div className="min-h-full bg-slate-50">
            <StoreBuilderHeader
                hasUnsavedChanges={hasUnsavedChanges}
                statusLabel={hasUnsavedChanges ? 'Unsaved changes' : 'Published'}
                lastSavedLabel={formatBuilderDate(lastSavedAt) || 'Current session'}
                lastPublishedLabel={formatBuilderDate(lastPublishedAt) || publishedVersionLabel}
                device={device}
                onDeviceChange={setDevice}
                canUndo={canUndo}
                canRedo={canRedo}
                saving={saving}
                validationCount={validation.length}
                onUndo={undoBuilderChange}
                onRedo={redoBuilderChange}
                onResetStyling={resetStyling}
                onRestorePublished={restorePublishedVersion}
                onSave={handleSave}
                mobileWorkspace={mobileWorkspace}
                onWorkspaceChange={setMobileWorkspace}
            />

            <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 p-4 xl:grid-cols-[360px_minmax(0,1fr)]">
                <StoreBuilderSidebar
                    mobileWorkspace={mobileWorkspace}
                    activeElement={activeElement}
                    activeGroup={activeGroup}
                    selectEditorTarget={selectEditorTarget}
                    selectSettingsGroup={selectSettingsGroup}
                    hasUnsavedChanges={hasUnsavedChanges}
                    publishedVersionLabel={publishedVersionLabel}
                    restorePublishedVersion={restorePublishedVersion}
                    handleSave={handleSave}
                    saving={saving}
                    validation={validation}
                />

                <main className={`${mobileWorkspace === 'structure' ? 'hidden' : 'grid'} grid-cols-1 gap-4 xl:grid 2xl:grid-cols-[420px_minmax(0,1fr)]`}>
                    <StoreBuilderEditorPanel
                        mobileWorkspace={mobileWorkspace}
                        selectedLabel={selectedLabel}
                        selectedIsLockedLayout={selectedIsLockedLayout}
                        setMobileWorkspace={setMobileWorkspace}
                    >
                        {renderPanel()}
                    </StoreBuilderEditorPanel>
                    <StoreBuilderPreviewPanel
                        mobileWorkspace={mobileWorkspace}
                        setMobileWorkspace={setMobileWorkspace}
                        previewPages={previewPages}
                        previewPage={previewPage}
                        setPreviewPage={setPreviewPage}
                        device={device}
                        theme={theme}
                        storewideDiscount={storewideDiscount}
                        shopName={shopName}
                        availableProducts={availableProducts}
                        productCategories={productCategories}
                        availableReviews={availableReviews}
                        activeElement={activeElement}
                        selectEditorTarget={selectEditorTarget}
                        moveHomepageSection={moveHomepageSection}
                        duplicateHomepageSection={duplicateHomepageSection}
                        toggleHomepageSectionVisibility={toggleHomepageSectionVisibility}
                        removeHomepageSection={removeHomepageSection}
                    />
                </main>
            </div>
        </div>
    );
};

export default StoreBuilderPage;
