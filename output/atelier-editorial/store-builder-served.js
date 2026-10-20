import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx");import.meta.env = {"BASE_URL": "/", "DEV": true, "MODE": "development", "PROD": false, "SSR": false, "VITE_API_DOMAIN": "localhost:3000", "VITE_API_URL": "http://localhost:4000/api"};const lazy = __vite__cjsImport0_react["lazy"]; const Suspense = __vite__cjsImport0_react["Suspense"]; const useEffect = __vite__cjsImport0_react["useEffect"]; const useMemo = __vite__cjsImport0_react["useMemo"]; const useRef = __vite__cjsImport0_react["useRef"]; const useState = __vite__cjsImport0_react["useState"];const _jsxDEV = __vite__cjsImport24_react_jsxDevRuntime["jsxDEV"];import __vite__cjsImport0_react from "/node_modules/.vite/deps/react.js?v=d5ed7809";
import { contrastRatio, getThemeCapabilities, getThemeEditorRestriction, extractThemeAssetUrls, suggestAccessibleForeground, summarizeThemeChanges, validateTheme } from "/node_modules/.vite/deps/@scaleup_storefront-theme.js?v=d5ed7809";
import { Lock, X } from "/node_modules/.vite/deps/lucide-react.js?v=d5ed7809";
import { toast } from "/node_modules/.vite/deps/react-hot-toast.js?v=d5ed7809";
import API from "/src/api/api.js";
import { BuilderButton } from "/src/pages/dashboard/StoreBuilder/builderUi.jsx";
import { StoreBuilderHeader } from "/src/pages/dashboard/StoreBuilder/StoreBuilderHeader.jsx";
import { StoreBuilderSidebar } from "/src/pages/dashboard/StoreBuilder/StoreBuilderSidebar.jsx";
import { StoreBuilderEditorPanel } from "/src/pages/dashboard/StoreBuilder/StoreBuilderEditorPanel.jsx";
import { StoreBuilderShell } from "/src/pages/dashboard/StoreBuilder/shell/StoreBuilderShell.jsx";
import { IssuesDrawer } from "/src/pages/dashboard/StoreBuilder/shell/IssuesDrawer.jsx";
import { HistoryDrawer } from "/src/pages/dashboard/StoreBuilder/shell/HistoryDrawer.jsx";
import { POLICY_LABELS, getDefaultPolicyText } from "/src/utils/storeBuilderPolicies.js";
import { AdminErrorState, AdminLoadingState } from "/src/components/ui/AdminState.jsx";
import { scoreStoreSeo } from "/src/utils/seoHealth.js";
import { previewPages, usePreviewMode } from "/src/pages/dashboard/StoreBuilder/hooks/usePreviewMode.js";
import { useStoreBuilderDirtyState } from "/src/pages/dashboard/StoreBuilder/hooks/useStoreBuilderDirtyState.js";
import { useMobileWorkspace } from "/src/pages/dashboard/StoreBuilder/hooks/useMobileWorkspace.js";
import { useStoreBuilderBootstrap } from "/src/pages/dashboard/StoreBuilder/hooks/useStoreBuilderBootstrap.js";
import { useAutosaveRecovery } from "/src/pages/dashboard/StoreBuilder/hooks/useAutosaveRecovery.js";
import { useThemeMedia } from "/src/pages/dashboard/StoreBuilder/hooks/useThemeMedia.js";
import { HERO_SLIDE_LIMIT, HISTORY_LIMIT, colorFields, fixedPreviewElements, getSectionIndexFromSelection, getSectionSelectionId, groupElementMap, inlineSectionPresets, isHomepageSectionLocked, resolveEditorComponent, settingsGroups } from "/src/pages/dashboard/StoreBuilder/storeBuilderConstants.jsx";
import { createHeroSlide, createBuilderSectionId, defaultTheme, formatBuilderDate, getBuilderHeroSlides, isHexColor, loadBuilderTheme, normalizeHeroSlideForBuilder, normalizeHomepageSections, safeParseSnapshot, stableStringify, syncHeroLegacyFields, updateBuilderThemeSetting } from "/src/pages/dashboard/StoreBuilder/storeBuilderThemeUtils.js";
import { applyCompatibleColorUpdates, applyColorPalette, buildBrandColorSet, colorSectionGroups, getColorPathValue, mergeColorUpdates, nestedColorFields, setColorPathValue } from "/src/pages/dashboard/StoreBuilder/storeBuilderColorConfig.js";
var _jsxFileName = "C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx";
import __vite__cjsImport24_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=d5ed7809";
var _s = $RefreshSig$();
const StoreBuilderPreviewPanel = lazy(_c = () => import("/src/pages/dashboard/StoreBuilder/StoreBuilderPreviewPanel.jsx?t=1792472740071").then((module) => ({ default: module.StoreBuilderPreviewPanel })));
_c2 = StoreBuilderPreviewPanel;
const ColorEditor = lazy(_c3 = () => import("/src/pages/dashboard/StoreBuilder/editors/ColorEditor.jsx").then((module) => ({ default: module.ColorEditor })));
_c4 = ColorEditor;
const DynamicSectionsEditor = lazy(_c5 = () => import("/src/pages/dashboard/StoreBuilder/editors/DynamicSectionsEditor.jsx").then((module) => ({ default: module.DynamicSectionsEditor })));
_c6 = DynamicSectionsEditor;
const BrandEditor = lazy(_c7 = () => import("/src/pages/dashboard/StoreBuilder/editors/BasicEditors.jsx").then((module) => ({ default: module.BrandEditor })));
_c8 = BrandEditor;
const TypographyEditor = lazy(_c9 = () => import("/src/pages/dashboard/StoreBuilder/editors/BasicEditors.jsx").then((module) => ({ default: module.TypographyEditor })));
_c10 = TypographyEditor;
const LayoutEditor = lazy(_c11 = () => import("/src/pages/dashboard/StoreBuilder/editors/BasicEditors.jsx").then((module) => ({ default: module.LayoutEditor })));
_c12 = LayoutEditor;
const SeoStatusEditor = lazy(_c13 = () => import("/src/pages/dashboard/StoreBuilder/editors/BasicEditors.jsx").then((module) => ({ default: module.SeoStatusEditor })));
_c14 = SeoStatusEditor;
const MobileEditor = lazy(_c15 = () => import("/src/pages/dashboard/StoreBuilder/editors/BasicEditors.jsx").then((module) => ({ default: module.MobileEditor })));
_c16 = MobileEditor;
const PoliciesEditor = lazy(_c17 = () => import("/src/pages/dashboard/StoreBuilder/editors/BasicEditors.jsx").then((module) => ({ default: module.PoliciesEditor })));
_c18 = PoliciesEditor;
const CheckoutEditor = lazy(_c19 = () => import("/src/pages/dashboard/StoreBuilder/editors/CheckoutEditor.jsx").then((module) => ({ default: module.CheckoutEditor })));
_c20 = CheckoutEditor;
const FooterEditor = lazy(_c21 = () => import("/src/pages/dashboard/StoreBuilder/editors/FooterEditor.jsx").then((module) => ({ default: module.FooterEditor })));
_c22 = FooterEditor;
const NavigationEditor = lazy(_c23 = () => import("/src/pages/dashboard/StoreBuilder/editors/NavigationEditor.jsx").then((module) => ({ default: module.NavigationEditor })));
_c24 = NavigationEditor;
const HeroEditor = lazy(_c25 = () => import("/src/pages/dashboard/StoreBuilder/editors/HeroEditor.jsx").then((module) => ({ default: module.HeroEditor })));
_c26 = HeroEditor;
const ProductCardsEditor = lazy(_c27 = () => import("/src/pages/dashboard/StoreBuilder/editors/ProductCardsEditor.jsx").then((module) => ({ default: module.ProductCardsEditor })));
_c28 = ProductCardsEditor;
const ThemeGallery = lazy(_c29 = () => import("/src/pages/dashboard/StoreBuilder/themes/ThemeGallery.jsx?t=1792473005258"));
_c30 = ThemeGallery;
const isCustomDomainConnected = (customDomain = {}) => customDomain?.status === "Verified" && Boolean(customDomain?.domain) && customDomain?.ownershipVerified === true && (customDomain?.routingVerified === true || customDomain?.manuallyVerifiedRouting === true);
const DEFAULT_PLAN_ACCESS = {
	planKey: "starter",
	storeBuilderAccess: "limited",
	storeBuilderCapabilities: {},
	features: {}
};
const StoreBuilderPage = () => {
	_s();
	const { loading, data: bootstrap, error: bootstrapError, reload: reloadBootstrap } = useStoreBuilderBootstrap();
	const [saving, setSaving] = useState(false);
	const [uploadingLogo, setUploadingLogo] = useState(false);
	const [uploadingThemeImage, setUploadingThemeImage] = useState(false);
	const [shopName, setShopName] = useState("");
	const [shopSubdomain, setShopSubdomain] = useState("");
	const [planAccess, setPlanAccess] = useState(DEFAULT_PLAN_ACCESS);
	const [theme, setTheme] = useState(defaultTheme);
	const [savedTheme, setSavedTheme] = useState(defaultTheme);
	const [searchAliases, setSearchAliases] = useState([]);
	const [hydratedShopKey, setHydratedShopKey] = useState("");
	const [availableProducts, setAvailableProducts] = useState([]);
	const [productOptions, setProductOptions] = useState([]);
	const [productCategories, setProductCategories] = useState([]);
	const [productCategoryDetails, setProductCategoryDetails] = useState([]);
	const [productPicker, setProductPicker] = useState({
		search: "",
		category: "All",
		page: 1,
		pages: 1,
		loading: false
	});
	const [availableReviews, setAvailableReviews] = useState([]);
	const [seoStats, setSeoStats] = useState(null);
	const [reviewPicker, setReviewPicker] = useState({
		search: "",
		page: 1,
		pages: 1,
		loading: false
	});
	const [customDomain, setCustomDomain] = useState({ domain: "" });
	const [storewideDiscount, setStorewideDiscount] = useState(0);
	const [activeGroup, setActiveGroup] = useState("brand");
	const [activeElement, setActiveElement] = useState("logo");
	const { device, setDevice, previewPage, setPreviewPage } = usePreviewMode();
	const [mobileWorkspace, setMobileWorkspace] = useMobileWorkspace();
	const [initialSnapshot, setInitialSnapshot] = useState("");
	const [editorHistory, setEditorHistory] = useState({
		past: [],
		future: []
	});
	const [lastSavedAt, setLastSavedAt] = useState("");
	const [lastPublishedAt, setLastPublishedAt] = useState("");
	const [themeRevision, setThemeRevision] = useState(0);
	const [revisions, setRevisions] = useState([]);
	const [recoveryDraft, setRecoveryDraft] = useState(null);
	const [themeConflict, setThemeConflict] = useState(null);
	const [publishReviewOpen, setPublishReviewOpen] = useState(false);
	const [issuesOpen, setIssuesOpen] = useState(false);
	const [historyOpen, setHistoryOpen] = useState(false);
	const [themeGalleryOpen, setThemeGalleryOpen] = useState(false);
	const [inspectorOpen, setInspectorOpen] = useState(true);
	const [advancedColorsOpen, setAdvancedColorsOpen] = useState(false);
	const [colorMode, setColorMode] = useState("quick");
	const [colorSearch, setColorSearch] = useState("");
	const [openColorSection, setOpenColorSection] = useState("productCard");
	const historyModeRef = useRef("record");
	const lastHistorySnapshotRef = useRef("");
	const dirtyRef = useRef(false);
	const { rememberTemporaryAsset, discardTemporaryAsset, clearTemporaryAssets } = useThemeMedia({ theme });
	const { currentSnapshot, hasUnsavedChanges, publishedVersionLabel } = useStoreBuilderDirtyState({
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
		basedOnRevision: themeRevision,
		initialDraftVersion: bootstrap?.draft?.updatedAt ?? null
	});
	useEffect(() => {
		dirtyRef.current = hasUnsavedChanges;
	}, [hasUnsavedChanges]);
	useEffect(() => {
		let checking = false;
		let active = true;
		const refreshSeoStatus = async () => {
			if (checking) return;
			checking = true;
			try {
				const response = await API.get("/store-builder/admin/seo/bootstrap");
				if (!active) return;
				const seoBootstrap = response.data?.data;
				if (seoBootstrap?.seoStats) setSeoStats(seoBootstrap.seoStats);
				const latestRevision = Number(seoBootstrap?.themeRevision || 0);
				if (latestRevision <= themeRevision) return;
				if (dirtyRef.current) {
					setThemeConflict({
						latestRevision,
						lastPublishedAt: seoBootstrap?.lastPublishedAt,
						message: "Homepage SEO or storefront settings were published in another session."
					});
					return;
				}
				setHydratedShopKey("");
				await reloadBootstrap({ keepCurrent: true });
			} catch {} finally {
				checking = false;
			}
		};
		window.addEventListener("focus", refreshSeoStatus);
		return () => {
			active = false;
			window.removeEventListener("focus", refreshSeoStatus);
		};
	}, [reloadBootstrap, themeRevision]);
	useEffect(() => {
		const local = autosave.localRecovery;
		if (!local?.snapshot || recoveryDraft || Number(local.basedOnRevision || 0) !== themeRevision) return;
		if (local.snapshot !== initialSnapshot) {
			const timer = window.setTimeout(() => setRecoveryDraft({
				...local,
				source: "local"
			}), 0);
			return () => window.clearTimeout(timer);
		}
		return undefined;
	}, [
		autosave.localRecovery,
		initialSnapshot,
		recoveryDraft,
		themeRevision
	]);
	const selectedLabel = useMemo(() => {
		const selectionTheme = {
			homepageSections: theme.homepageSections,
			navigation: theme.navigation
		};
		return resolveEditorComponent(activeElement, selectionTheme)?.label || settingsGroups.find((item) => item.id === activeGroup)?.label || "Store element";
	}, [
		activeElement,
		activeGroup,
		theme
	]);
	const selectedIsLockedLayout = useMemo(() => {
		if (fixedPreviewElements.has(activeElement)) return true;
		if (!activeElement?.startsWith("section-") && !activeElement?.startsWith("section:")) return false;
		const sectionIndex = getSectionIndexFromSelection(activeElement, theme);
		return isHomepageSectionLocked(theme.homepageSections?.[sectionIndex]);
	}, [activeElement, theme]);
	const themeCapabilities = useMemo(() => getThemeCapabilities(theme, planAccess), [theme, planAccess]);
	const selectedPlanRestriction = useMemo(() => getThemeEditorRestriction(activeGroup, {
		theme,
		planAccess,
		sectionIndex: getSectionIndexFromSelection(activeElement, theme)
	}), [
		activeElement,
		activeGroup,
		planAccess,
		theme
	]);
	const storeSeoSignals = useMemo(() => {
		if (seoStats) {
			return {
				productCount: Number(seoStats.products?.total || 0),
				collectionCount: Number(seoStats.collections?.total || 0),
				imageAltCoverage: Number(seoStats.imageAltCoverage || 0)
			};
		}
		const productsWithAltText = availableProducts.filter((product) => String(product.imageAltText || "").trim()).length;
		const collectionIds = new Set(availableProducts.flatMap((product) => Array.isArray(product.collections) ? product.collections : []).map(String).filter(Boolean));
		return {
			productCount: availableProducts.length,
			collectionCount: collectionIds.size,
			imageAltCoverage: availableProducts.length ? Math.round(productsWithAltText / availableProducts.length * 100) : 0
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
	}), [
		customDomain,
		searchAliases,
		shopName,
		storeSeoSignals,
		theme
	]);
	const publishChangeSummary = useMemo(() => summarizeThemeChanges(savedTheme, theme), [savedTheme, theme]);
	const liveStoreUrl = useMemo(() => {
		if (isCustomDomainConnected(customDomain)) return `https://${customDomain.domain}`;
		if (!shopSubdomain) return "";
		const configuredBase = String(import.meta.env.VITE_API_DOMAIN || "localhost:3000").replace(/^https?:\/\//, "").replace(/^www\./, "");
		return `${configuredBase.includes("localhost") ? "http" : "https"}://${shopSubdomain}.${configuredBase}`;
	}, [customDomain, shopSubdomain]);
	const selectEditorTarget = (target) => {
		if (!target) return;
		const selection = resolveEditorComponent(target, theme);
		setActiveElement(target);
		if (selection?.group) setActiveGroup(selection.group);
		setInspectorOpen(true);
		setMobileWorkspace("edit");
	};
	const selectSettingsGroup = (groupId) => {
		setActiveGroup(groupId);
		setActiveElement(groupElementMap[groupId] || groupId);
		setInspectorOpen(true);
		setMobileWorkspace("edit");
	};
	const applyPrebuiltTheme = async (preset) => {
		try {
			if (preset.id === "atelier-editorial" && bootstrap?.themeAvailability?.["atelier-editorial"]?.available !== true) {
				throw new Error("Atelier Editorial is not available for this store.");
			}
			const { resolvePrebuiltTheme } = await import("/node_modules/.vite/deps/@scaleup_storefront-theme_prebuilt.js?v=d5ed7809");
			const resolvedTheme = resolvePrebuiltTheme({
				currentTheme: theme,
				presetId: preset.id,
				planAccess,
				createSectionId: createBuilderSectionId
			});
			setTheme(resolvedTheme);
			toast.success(`${preset.name} applied to your draft. Review it before publishing.`);
			return true;
		} catch (error) {
			toast.error(error?.message || "Could not apply this storefront theme.");
			return false;
		}
	};
	const validationDetails = useMemo(() => {
		const colorErrors = colorFields.filter((field) => !isHexColor(theme.colors?.[field.key])).map((field) => ({
			path: `colors.${field.key}`,
			message: `${field.label} must be a valid hex color.`,
			group: "colors"
		}));
		const nestedColorErrors = nestedColorFields.filter((field) => {
			const value = getColorPathValue(theme.colors, field.path);
			return value && !isHexColor(value);
		}).map((field) => ({
			path: `colors.${field.path}`,
			message: `${field.label} must be a valid hex color.`,
			group: "colors"
		}));
		const discountNumber = Number(storewideDiscount);
		const discountErrors = Number.isNaN(discountNumber) || discountNumber < 0 || discountNumber > 100 ? [{
			path: "storewideDiscount",
			message: "Storewide discount must be between 0 and 100.",
			group: "checkout"
		}] : [];
		const navErrors = (theme.navigation || []).filter((item) => item?.url && !item?.label).map((_, index) => ({
			path: `navigation.${index}.label`,
			message: "Navigation links with a URL need a label.",
			group: "navigation"
		}));
		const navChildErrors = (theme.navigation || []).flatMap((item) => item?.children || []).filter((item) => item?.url && !item?.label).map((_, index) => ({
			path: `navigation.children.${index}.label`,
			message: "Nested navigation links with a URL need a label.",
			group: "navigation"
		}));
		const productColorErrors = [["Product card price color", theme.productCard?.priceColor || theme.colors?.priceColor], ["Product card button color", theme.productCard?.buttonColor || theme.colors?.primaryButtonBg]].filter(([, value]) => value && !isHexColor(value)).map(([label], index) => ({
			path: index === 0 ? "productCard.priceColor" : "productCard.buttonColor",
			message: `${label} must be a valid hex color.`,
			group: "products"
		}));
		const contractErrors = validateTheme(theme).errors.map((error) => ({
			...error,
			group: error.path?.startsWith("seo.") ? "seo" : error.path?.startsWith("homepageSections.") ? "sections" : error.path?.startsWith("navigation.") ? "navigation" : "brand"
		}));
		return [
			...contractErrors,
			...colorErrors,
			...nestedColorErrors,
			...discountErrors,
			...navErrors,
			...navChildErrors,
			...productColorErrors
		];
	}, [theme, storewideDiscount]);
	const validation = useMemo(() => validationDetails.map((error) => error.message), [validationDetails]);
	const mergeProductCache = (products = []) => {
		setAvailableProducts((prev) => {
			const map = new Map(prev.map((product) => [String(product._id), product]));
			products.forEach((product) => {
				if (product?._id) map.set(String(product._id), {
					...map.get(String(product._id)),
					...product
				});
			});
			return Array.from(map.values());
		});
	};
	const loadProductOptions = async ({ page = 1, append = false, search = productPicker.search, category = productPicker.category } = {}) => {
		setProductPicker((prev) => ({
			...prev,
			loading: true
		}));
		try {
			const { data } = await API.get("/admin/products", { params: {
				limit: 10,
				page,
				status: "Published",
				storefrontPreview: "true",
				...search ? { search } : {},
				...category && category !== "All" ? { category } : {}
			} });
			const products = data.data || [];
			setProductOptions((prev) => append ? [...prev, ...products.filter((product) => !prev.some((item) => item._id === product._id))] : products);
			const previewCards = new Map((data.previewProducts || []).map((product) => [String(product._id), product]));
			mergeProductCache(products.map((product) => ({
				...product,
				...Array.isArray(data.previewProducts) ? { previewCard: previewCards.get(String(product._id)) || null } : {}
			})));
			// Keep public categories from bootstrap; the private picker response
			// can contain categories belonging only to unpublished products.
			setProductPicker((prev) => ({
				...prev,
				search,
				category,
				page: data.pagination?.page || page,
				pages: data.pagination?.pages || 1,
				loading: false
			}));
		} catch {
			setProductPicker((prev) => ({
				...prev,
				loading: false
			}));
			toast.error("Failed to load products for selection");
		}
	};
	const loadReviewOptions = async ({ page = 1, append = false, search = reviewPicker.search, ids = "" } = {}) => {
		setReviewPicker((prev) => ({
			...prev,
			loading: true
		}));
		try {
			const { data } = await API.get("/store-builder/admin/reviews", { params: {
				page,
				limit: 10,
				rating: 5,
				...search ? { search } : {},
				...ids ? { ids } : {}
			} });
			const reviews = data.data || [];
			setAvailableReviews((prev) => {
				const selectedIds = new Set((theme.homepageSections || []).flatMap((section) => section.type === "Reviews" ? section.settings?.reviewIds || [] : []).map(String));
				const selectedExisting = prev.filter((review) => selectedIds.has(String(review._id)));
				if (ids) {
					const map = new Map(prev.map((review) => [String(review._id), review]));
					reviews.forEach((review) => map.set(String(review._id), review));
					return Array.from(map.values());
				}
				if (!append) {
					const map = new Map(selectedExisting.map((review) => [String(review._id), review]));
					reviews.forEach((review) => map.set(String(review._id), review));
					return Array.from(map.values());
				}
				const map = new Map(prev.map((review) => [String(review._id), review]));
				reviews.forEach((review) => map.set(String(review._id), review));
				return Array.from(map.values());
			});
			setReviewPicker((prev) => ({
				...prev,
				search,
				page: data.pagination?.page || page,
				pages: data.pagination?.pages || 1,
				loading: false
			}));
		} catch {
			setReviewPicker((prev) => ({
				...prev,
				loading: false
			}));
			toast.error("Failed to load reviews");
		}
	};
	useEffect(() => {
		if (!bootstrap?.shop) return;
		const shop = bootstrap.shop;
		const shopKey = String(shop._id || shop.id || shop.subdomain || "");
		const nextRevision = Number(bootstrap.publication?.revision ?? shop.themeRevision ?? 0);
		const sameShop = hydratedShopKey && hydratedShopKey === shopKey;
		if (sameShop && dirtyRef.current) return;
		const nextTheme = loadBuilderTheme(shop.theme || {});
		const nextSearchAliases = Array.isArray(shop.searchAliases) ? shop.searchAliases : [];
		const nextDomain = shop.customDomain || { domain: "" };
		const nextDiscount = Number(shop.storewideDiscount) || 0;
		const initialProducts = bootstrap.products || [];
		const initialReviews = bootstrap.reviews || [];
		setShopName(shop.shopName || "");
		setShopSubdomain(shop.subdomain || "");
		setPlanAccess(bootstrap.planAccess || shop.planAccess || DEFAULT_PLAN_ACCESS);
		setHydratedShopKey(shopKey);
		setSavedTheme(nextTheme);
		setTheme(nextTheme);
		setSearchAliases(nextSearchAliases);
		setAvailableProducts(initialProducts);
		setProductOptions(initialProducts.slice(0, 10));
		setProductCategories(bootstrap.categories || []);
		setProductCategoryDetails(bootstrap.categoryDetails || []);
		setAvailableReviews(initialReviews);
		setSeoStats(bootstrap.seoStats || null);
		setCustomDomain(nextDomain);
		setStorewideDiscount(nextDiscount);
		setThemeRevision(nextRevision);
		setRevisions(bootstrap.revisions || []);
		setLastSavedAt(shop.lastPublishedAt || shop.updatedAt || "");
		setLastPublishedAt(bootstrap.publication?.lastPublishedAt || shop.lastPublishedAt || "");
		const loadedSnapshot = stableStringify({
			theme: nextTheme,
			searchAliases: nextSearchAliases,
			customDomain: nextDomain,
			storewideDiscount: nextDiscount
		});
		setInitialSnapshot(loadedSnapshot);
		lastHistorySnapshotRef.current = loadedSnapshot;
		setEditorHistory({
			past: [],
			future: []
		});
		const serverDraft = bootstrap.draft;
		autosave.resetVersion(serverDraft?.updatedAt ?? null);
		if (serverDraft?.theme && !serverDraft.stale) {
			const draftSnapshot = stableStringify({
				theme: loadBuilderTheme(serverDraft.theme),
				searchAliases: serverDraft.searchAliases || nextSearchAliases,
				customDomain: serverDraft.customDomain || nextDomain,
				storewideDiscount: Number(serverDraft.storewideDiscount) || 0
			});
			if (draftSnapshot !== loadedSnapshot) {
				window.setTimeout(() => setRecoveryDraft({
					...serverDraft,
					snapshot: draftSnapshot,
					source: "server"
				}), 0);
			}
		}
	}, [bootstrap, hydratedShopKey]);
	useEffect(() => {
		const handleBeforeUnload = (event) => {
			if (!hasUnsavedChanges) return;
			event.preventDefault();
			event.returnValue = "";
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [hasUnsavedChanges]);
	useEffect(() => {
		if (loading) return;
		if (!lastHistorySnapshotRef.current) {
			lastHistorySnapshotRef.current = currentSnapshot;
			return;
		}
		if (historyModeRef.current === "skip") {
			historyModeRef.current = "record";
			lastHistorySnapshotRef.current = currentSnapshot;
			return;
		}
		if (lastHistorySnapshotRef.current === currentSnapshot) return undefined;
		const timer = window.setTimeout(() => {
			const previousSnapshot = lastHistorySnapshotRef.current;
			if (!previousSnapshot || previousSnapshot === currentSnapshot) return;
			lastHistorySnapshotRef.current = currentSnapshot;
			setEditorHistory((prev) => ({
				past: [...prev.past, previousSnapshot].slice(-HISTORY_LIMIT),
				future: []
			}));
		}, 550);
		return () => window.clearTimeout(timer);
	}, [currentSnapshot, loading]);
	const setColor = (key, value) => {
		setTheme((prev) => ({
			...prev,
			colors: applyCompatibleColorUpdates(prev.colors || {}, { [key]: value })
		}));
	};
	const setColorPath = (path, value) => {
		setTheme((prev) => ({
			...prev,
			colors: setColorPathValue(prev.colors || {}, path, value)
		}));
	};
	const applyColorSet = (colors = {}, label = "Palette") => {
		setTheme((prev) => ({
			...prev,
			colors: applyColorPalette(prev.colors || {}, colors)
		}));
		toast.success(`${label} applied`);
	};
	const applyBrandColor = () => {
		const brandColor = theme.colors?.brand?.primary || theme.colors?.accent || defaultTheme.colors.accent;
		if (!isHexColor(brandColor)) {
			toast.error("Choose a valid main brand color first.");
			return;
		}
		applyColorSet(buildBrandColorSet(brandColor), "Brand color");
	};
	const resetColorPalette = () => {
		setTheme((prev) => ({
			...prev,
			colors: { ...defaultTheme.colors },
			productCard: {
				...prev.productCard || {},
				priceColor: defaultTheme.productCard?.priceColor,
				buttonColor: defaultTheme.productCard?.buttonColor
			}
		}));
		toast.success("Default color palette restored");
	};
	const resetColorGroup = (groupId) => {
		const defaultGroup = defaultTheme.colors?.[groupId];
		if (!defaultGroup || typeof defaultGroup !== "object") return;
		setTheme((prev) => ({
			...prev,
			colors: applyCompatibleColorUpdates(prev.colors || {}, { [groupId]: { ...defaultGroup } })
		}));
		toast.success(`${colorSectionGroups.find((group) => group.id === groupId)?.title || "Section"} colors reset`);
	};
	const getThemeColor = (path, fallback = "#000000") => getColorPathValue(theme.colors, path) || getColorPathValue(defaultTheme.colors, path) || theme.colors?.[path] || defaultTheme.colors?.[path] || fallback;
	const getContrastWarning = (field) => {
		if (!field.contrastWith) return "";
		const foreground = getThemeColor(field.path);
		const background = getThemeColor(field.contrastWith);
		const ratio = contrastRatio(foreground, background);
		if (ratio === null || ratio >= 4.5) return "";
		const suggestion = suggestAccessibleForeground(foreground, background, 4.5);
		return `Low contrast with ${field.contrastWith.replace(".", " ")} (${ratio.toFixed(2)}:1). Suggested text color: ${suggestion}.`;
	};
	const setMainBrandColor = (value) => {
		setTheme((prev) => ({
			...prev,
			colors: isHexColor(value) ? applyCompatibleColorUpdates(prev.colors || {}, buildBrandColorSet(value)) : mergeColorUpdates(prev.colors || {}, {
				accent: value,
				brand: {
					...prev.colors?.brand || {},
					primary: value,
					accent: value
				}
			})
		}));
	};
	const setThemeGroup = (group, key, value) => {
		setTheme((prev) => updateBuilderThemeSetting(prev, group, key, value));
	};
	const updateHeroSlides = (updater) => {
		setTheme((prev) => {
			const currentSlides = getBuilderHeroSlides(prev.hero);
			const nextSlides = updater(currentSlides).map((slide, index) => normalizeHeroSlideForBuilder(slide, index, prev.hero)).slice(0, HERO_SLIDE_LIMIT);
			const safeSlides = nextSlides.length > 0 ? nextSlides : [createHeroSlide({ id: `hero-slide-${Date.now()}` })];
			return {
				...prev,
				hero: syncHeroLegacyFields(prev.hero, safeSlides)
			};
		});
	};
	const updateHeroSlide = (index, key, value) => {
		updateHeroSlides((slides) => slides.map((slide, i) => i === index ? {
			...slide,
			[key]: value
		} : slide));
	};
	const addHeroSlide = () => {
		const currentCount = getBuilderHeroSlides(theme.hero).length;
		if (currentCount >= HERO_SLIDE_LIMIT) {
			toast.error(`You can add up to ${HERO_SLIDE_LIMIT} hero slides.`);
			return;
		}
		updateHeroSlides((slides) => [...slides, createHeroSlide({
			id: `hero-slide-${Date.now()}`,
			title: "New seasonal offer"
		})]);
	};
	const removeHeroSlide = (index) => {
		const slide = getBuilderHeroSlides(theme.hero)[index];
		[slide?.desktopImage, slide?.mobileImage].filter(Boolean).forEach((url) => discardTemporaryAsset(url));
		updateHeroSlides((slides) => slides.filter((_, i) => i !== index));
	};
	const moveHeroSlide = (index, direction) => {
		updateHeroSlides((slides) => {
			const nextSlides = [...slides];
			const targetIndex = index + direction;
			if (targetIndex < 0 || targetIndex >= nextSlides.length) return nextSlides;
			[nextSlides[index], nextSlides[targetIndex]] = [nextSlides[targetIndex], nextSlides[index]];
			return nextSlides;
		});
	};
	const toggleThemeGroup = (group, key) => {
		setTheme((prev) => ({
			...prev,
			[group]: {
				...prev[group] || {},
				[key]: !prev[group]?.[key]
			}
		}));
	};
	const updateHomepageSection = (index, field, value) => {
		if (["type", "sortOrder"].includes(field) && !themeCapabilities.sectionStructure.editable) return;
		if (!themeCapabilities.sections[theme.homepageSections?.[index]?.type]?.editable) return;
		setTheme((prev) => ({
			...prev,
			homepageSections: (prev.homepageSections || []).map((section, i) => i === index && !isHomepageSectionLocked(section) ? {
				...section,
				[field]: value
			} : section)
		}));
	};
	const updateHomepageSectionSetting = (index, key, value) => {
		if (!themeCapabilities.sections[theme.homepageSections?.[index]?.type]?.editable) return;
		setTheme((prev) => ({
			...prev,
			homepageSections: (prev.homepageSections || []).map((section, i) => i === index && (!isHomepageSectionLocked(section) || key === "isLocked") ? {
				...section,
				settings: {
					...section.settings || {},
					[key]: value
				}
			} : section)
		}));
	};
	const updateHomepageSectionMobileSetting = (index, key, value) => {
		if (!themeCapabilities.sections[theme.homepageSections?.[index]?.type]?.editable) return;
		setTheme((prev) => ({
			...prev,
			homepageSections: (prev.homepageSections || []).map((section, i) => i === index && !isHomepageSectionLocked(section) ? {
				...section,
				mobileSettings: {
					...section.mobileSettings || {},
					[key]: value
				}
			} : section)
		}));
	};
	const updateHomepageSectionDesktopSetting = (index, key, value) => {
		if (!themeCapabilities.sections[theme.homepageSections?.[index]?.type]?.editable) return;
		setTheme((prev) => ({
			...prev,
			homepageSections: (prev.homepageSections || []).map((section, i) => i === index && !isHomepageSectionLocked(section) ? {
				...section,
				desktopSettings: {
					...section.desktopSettings || {},
					[key]: value
				}
			} : section)
		}));
	};
	const updateFeaturedProductsSelection = (index, productId, checked) => {
		setTheme((prev) => ({
			...prev,
			homepageSections: (prev.homepageSections || []).map((section, i) => {
				if (i !== index || isHomepageSectionLocked(section)) return section;
				const currentIds = section.settings?.productIds || section.settings?.source?.productIds || [];
				const nextIds = checked ? [...new Set([...currentIds, productId])] : currentIds.filter((id) => id !== productId);
				return {
					...section,
					settings: {
						...section.settings || {},
						productIds: nextIds,
						source: {
							type: "manual",
							productIds: nextIds
						}
					},
					source: {
						type: "manual",
						productIds: nextIds
					}
				};
			})
		}));
	};
	const updateReviewSelection = (index, reviewId, checked) => {
		setTheme((prev) => ({
			...prev,
			homepageSections: (prev.homepageSections || []).map((section, i) => {
				if (i !== index || isHomepageSectionLocked(section)) return section;
				const currentIds = section.settings?.reviewIds || [];
				const nextIds = checked ? [...new Set([...currentIds, reviewId])] : currentIds.filter((id) => id !== reviewId);
				return {
					...section,
					settings: {
						...section.settings || {},
						mode: nextIds.length > 0 ? "selectedReviews" : "text",
						reviewIds: nextIds
					}
				};
			})
		}));
	};
	const getBannerImages = (section, key) => {
		const fallbackKey = key === "desktopImages" ? "desktopImage" : "mobileImage";
		return [...new Set([...Array.isArray(section.settings?.[key]) ? section.settings[key] : [], section.settings?.[fallbackKey]].filter(Boolean))].slice(0, 5);
	};
	const updateBannerImages = (index, key, images) => {
		const fallbackKey = key === "desktopImages" ? "desktopImage" : "mobileImage";
		const nextImages = [...new Set((images || []).filter(Boolean).map(String))].slice(0, 5);
		setTheme((prev) => ({
			...prev,
			homepageSections: (prev.homepageSections || []).map((section, i) => i === index && !isHomepageSectionLocked(section) ? {
				...section,
				settings: {
					...section.settings || {},
					[key]: nextImages,
					[fallbackKey]: nextImages[0] || ""
				},
				mobileSettings: key === "mobileImages" ? {
					...section.mobileSettings || {},
					image: nextImages[0] || ""
				} : section.mobileSettings
			} : section)
		}));
	};
	const addBannerImageUrl = (index, key, url) => {
		if (!url) return;
		const section = theme.homepageSections?.[index];
		const currentImages = getBannerImages(section || {}, key);
		if (currentImages.length >= 5) {
			toast.error("You can add up to 5 images.");
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
	const normalizeSectionOrder = (sections) => normalizeHomepageSections(sections).map((section, index) => ({
		...section,
		sortOrder: index
	}));
	const moveHomepageSection = (index, direction) => {
		if (!themeCapabilities.sectionStructure.editable) return;
		setTheme((prev) => {
			const sections = [...prev.homepageSections || []];
			const targetIndex = index + direction;
			if (targetIndex < 0 || targetIndex >= sections.length) return prev;
			if (isHomepageSectionLocked(sections[index]) || isHomepageSectionLocked(sections[targetIndex])) return prev;
			[sections[index], sections[targetIndex]] = [sections[targetIndex], sections[index]];
			return {
				...prev,
				homepageSections: normalizeSectionOrder(sections)
			};
		});
	};
	const duplicateHomepageSection = (index) => {
		if (!themeCapabilities.sectionStructure.editable) return;
		const duplicateId = createBuilderSectionId(theme.homepageSections?.[index]?.type);
		setTheme((prev) => {
			const sections = [...prev.homepageSections || []];
			const source = sections[index];
			if (!source || isHomepageSectionLocked(source)) return prev;
			sections.splice(index + 1, 0, {
				...source,
				_id: undefined,
				id: duplicateId,
				title: `${source.title || source.type} copy`,
				settings: { ...source.settings || {} },
				desktopSettings: { ...source.desktopSettings || {} },
				mobileSettings: { ...source.mobileSettings || {} },
				source: { ...source.source || {} },
				sortOrder: index + 1
			});
			return {
				...prev,
				homepageSections: normalizeSectionOrder(sections)
			};
		});
		setActiveElement(`section:${duplicateId}`);
		setActiveGroup("sections");
	};
	const removeHomepageSection = (index) => {
		if (!themeCapabilities.sectionStructure.editable) return;
		const section = theme.homepageSections?.[index];
		if (section && !isHomepageSectionLocked(section)) {
			extractThemeAssetUrls({ homepageSections: [section] }).forEach((url) => discardTemporaryAsset(url));
		}
		setTheme((prev) => ({
			...prev,
			homepageSections: normalizeSectionOrder((prev.homepageSections || []).filter((section, i) => i !== index || isHomepageSectionLocked(section)))
		}));
		if (getSectionIndexFromSelection(activeElement, theme) === index) {
			setActiveElement("sections");
			setActiveGroup("sections");
		}
	};
	const toggleHomepageSectionVisibility = (index, isEnabled) => {
		updateHomepageSection(index, "isEnabled", isEnabled);
	};
	const toggleHomepageSectionLock = (index) => {
		if (!themeCapabilities.sections[theme.homepageSections?.[index]?.type]?.editable) return;
		setTheme((prev) => ({
			...prev,
			homepageSections: (prev.homepageSections || []).map((section, i) => i === index ? {
				...section,
				settings: {
					...section.settings || {},
					isLocked: !isHomepageSectionLocked(section)
				}
			} : section)
		}));
	};
	const addHomepageSection = (preset = inlineSectionPresets[2], insertIndex = null) => {
		if (!themeCapabilities.sectionStructure.editable) return;
		const safePreset = preset || inlineSectionPresets[2];
		const sectionId = createBuilderSectionId(safePreset.type);
		setTheme((prev) => {
			const sections = [...prev.homepageSections || []];
			const targetIndex = insertIndex === null ? sections.length : Math.max(0, Math.min(Number(insertIndex) || 0, sections.length));
			sections.splice(targetIndex, 0, {
				id: sectionId,
				type: safePreset.type || "FeaturedProducts",
				title: safePreset.title || safePreset.label || "New section",
				isEnabled: true,
				sortOrder: targetIndex,
				settings: { ...safePreset.settings || {} },
				desktopSettings: { ...safePreset.desktopSettings || {} },
				mobileSettings: { ...safePreset.mobileSettings || {} },
				source: { ...safePreset.source || {} }
			});
			return {
				...prev,
				homepageSections: normalizeSectionOrder(sections)
			};
		});
		setActiveGroup("sections");
		setActiveElement(`section:${sectionId}`);
		setMobileWorkspace("preview");
	};
	const updateNavigation = (index, field, value) => {
		setTheme((prev) => ({
			...prev,
			navigation: (prev.navigation || []).map((item, i) => i === index ? {
				...item,
				[field]: value
			} : item)
		}));
	};
	const normalizeNavigationOrder = (items) => items.map((item, index) => ({
		...item,
		sortOrder: index
	}));
	const addNavigation = () => {
		setTheme((prev) => ({
			...prev,
			navigation: normalizeNavigationOrder([...prev.navigation || [], {
				label: "New link",
				url: "/",
				isExternal: false,
				sortOrder: prev.navigation?.length || 0,
				children: [],
				megaMenu: false
			}])
		}));
	};
	const addNavigationDropdown = () => {
		setTheme((prev) => ({
			...prev,
			navigation: normalizeNavigationOrder([...prev.navigation || [], {
				label: "New dropdown",
				url: "#",
				isExternal: false,
				sortOrder: prev.navigation?.length || 0,
				megaMenu: true,
				children: [{
					label: "Sub link",
					url: "/",
					isExternal: false,
					sortOrder: 0
				}]
			}])
		}));
	};
	const removeNavigation = (index) => {
		setTheme((prev) => ({
			...prev,
			navigation: normalizeNavigationOrder((prev.navigation || []).filter((_, i) => i !== index))
		}));
	};
	const moveNavigation = (index, direction) => {
		setTheme((prev) => {
			const links = [...prev.navigation || []];
			const targetIndex = index + direction;
			if (targetIndex < 0 || targetIndex >= links.length) return prev;
			[links[index], links[targetIndex]] = [links[targetIndex], links[index]];
			return {
				...prev,
				navigation: normalizeNavigationOrder(links)
			};
		});
	};
	const addNavigationChild = (index) => {
		setTheme((prev) => ({
			...prev,
			navigation: (prev.navigation || []).map((item, i) => i === index ? {
				...item,
				children: [...item.children || [], {
					label: "Sub link",
					url: "/",
					isExternal: false,
					sortOrder: item.children?.length || 0
				}]
			} : item)
		}));
	};
	const updateNavigationChild = (index, childIndex, field, value) => {
		setTheme((prev) => ({
			...prev,
			navigation: (prev.navigation || []).map((item, i) => i === index ? {
				...item,
				children: (item.children || []).map((child, c) => c === childIndex ? {
					...child,
					[field]: value
				} : child)
			} : item)
		}));
	};
	const removeNavigationChild = (index, childIndex) => {
		setTheme((prev) => ({
			...prev,
			navigation: (prev.navigation || []).map((item, i) => i === index ? {
				...item,
				children: (item.children || []).filter((_, c) => c !== childIndex).map((child, c) => ({
					...child,
					sortOrder: c
				}))
			} : item)
		}));
	};
	const updatePolicy = (key, value) => {
		setTheme((prev) => ({
			...prev,
			policies: {
				...prev.policies,
				[key]: value
			}
		}));
	};
	const resetPolicyToDefault = (key) => {
		const confirmed = window.confirm(`Reset ${POLICY_LABELS[key] || "this policy"} to the default template? This will replace the current text in the editor.`);
		if (!confirmed) return;
		updatePolicy(key, getDefaultPolicyText(key, { storeName: shopName || "this store" }));
	};
	const updateFooter = (key, value) => {
		setTheme((prev) => ({
			...prev,
			footer: {
				...prev.footer || {},
				[key]: value
			}
		}));
	};
	const updateFooterLink = (index, field, value) => {
		setTheme((prev) => ({
			...prev,
			footer: {
				...prev.footer || {},
				links: (prev.footer?.links || []).map((item, i) => i === index ? {
					...item,
					[field]: value
				} : item)
			}
		}));
	};
	const addFooterLink = () => {
		setTheme((prev) => ({
			...prev,
			footer: {
				...prev.footer || {},
				links: [...prev.footer?.links || [], {
					label: "New link",
					url: "/",
					isExternal: false,
					sortOrder: prev.footer?.links?.length || 0
				}]
			}
		}));
	};
	const removeFooterLink = (index) => {
		setTheme((prev) => ({
			...prev,
			footer: {
				...prev.footer || {},
				links: (prev.footer?.links || []).filter((_, i) => i !== index).map((item, i) => ({
					...item,
					sortOrder: i
				}))
			}
		}));
	};
	const resetStyling = () => {
		setTheme((prev) => loadBuilderTheme({
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
				logoUrl: prev.checkoutBranding?.logoUrl || "",
				bannerText: prev.checkoutBranding?.bannerText || "",
				trustMessage: prev.checkoutBranding?.trustMessage || defaultTheme.checkoutBranding.trustMessage
			},
			paymentSettings: prev.paymentSettings
		}));
		setStorewideDiscount(0);
		toast.success("Default styling restored. Save changes to publish it.");
	};
	const applyBuilderSnapshot = (snapshot) => {
		const parsed = safeParseSnapshot(snapshot);
		if (!parsed) return false;
		historyModeRef.current = "skip";
		const nextTheme = loadBuilderTheme(parsed.theme || {});
		setTheme(nextTheme);
		setSearchAliases(Array.isArray(parsed.searchAliases) ? parsed.searchAliases : []);
		setCustomDomain(parsed.customDomain || { domain: "" });
		setStorewideDiscount(Number(parsed.storewideDiscount) || 0);
		return true;
	};
	const undoBuilderChange = () => {
		if (!canUndo) return;
		const previousSnapshot = editorHistory.past[editorHistory.past.length - 1];
		if (!applyBuilderSnapshot(previousSnapshot)) return;
		setEditorHistory((prev) => ({
			past: prev.past.slice(0, -1),
			future: [currentSnapshot, ...prev.future].slice(0, HISTORY_LIMIT)
		}));
	};
	const redoBuilderChange = () => {
		if (!canRedo) return;
		const nextSnapshot = editorHistory.future[0];
		if (!applyBuilderSnapshot(nextSnapshot)) return;
		setEditorHistory((prev) => ({
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
			toast.success("Draft restored to the last published version.");
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
			toast.success("Recovered Store Builder draft. Review it before publishing.");
		}
	};
	const discardRecoveryVersion = async () => {
		try {
			await autosave.clearRecovery();
			setRecoveryDraft(null);
			toast.success("Recovered draft discarded.");
		} catch (error) {
			toast.error(error.response?.data?.error || "Could not discard the draft.");
		}
	};
	const saveDraftNow = async () => {
		if (!hasUnsavedChanges || saving) return;
		try {
			const saved = await autosave.saveNow();
			if (!saved) return;
			setLastSavedAt(new Date().toISOString());
			toast.success("Draft saved. Your live store is unchanged.");
		} catch (err) {
			toast.error(err.response?.data?.error || "Draft could not be saved. Keep this page open and retry.");
		}
	};
	const reloadPublishedVersion = async () => {
		if (hasUnsavedChanges && !window.confirm("Discard your unsaved Store Builder draft and reload the published version?")) return;
		try {
			await autosave.clearRecovery();
		} catch (error) {
			if (error.response?.status !== 409) {
				toast.error(error.response?.data?.error || "Could not discard the draft.");
				return;
			}
			// A newer shared draft belongs to the other session. Reload without deleting it.
			await autosave.clearRecovery({ clearServer: false });
		}
		setRecoveryDraft(null);
		setThemeConflict(null);
		clearTemporaryAssets();
		setHydratedShopKey("");
		try {
			await reloadBootstrap();
			toast.success("Published Store Builder settings reloaded.");
		} catch {
			toast.error("Could not reload the published Store Builder settings.");
		}
	};
	const focusValidationError = (error) => {
		setIssuesOpen(false);
		const sectionMatch = String(error?.path || "").match(/^homepageSections\.(\d+)/);
		if (sectionMatch) {
			const sectionIndex = Number(sectionMatch[1]);
			selectEditorTarget(getSectionSelectionId(theme.homepageSections?.[sectionIndex], sectionIndex));
		} else selectSettingsGroup(error?.group || "brand");
		window.setTimeout(() => {
			const escapedPath = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(String(error?.path || "")) : "";
			const control = escapedPath && document.querySelector(`[data-field-path="${escapedPath}"]`) || document.querySelector("[data-store-builder-editor] input:not([type=\"hidden\"]), [data-store-builder-editor] textarea, [data-store-builder-editor] select");
			control?.focus();
			control?.scrollIntoView({
				behavior: "smooth",
				block: "center"
			});
			control?.classList.add("ring-2", "ring-amber-400");
			window.setTimeout(() => control?.classList.remove("ring-2", "ring-amber-400"), 1200);
		}, 80);
	};
	const previewRevision = async (revisionId) => {
		if (hasUnsavedChanges && !window.confirm("Replace the current draft with this historical revision for preview?")) return;
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
			toast.error(err.response?.data?.error || "Could not load this revision.");
		}
	};
	const restoreRevision = async (revisionId) => {
		if (saving) return;
		if (!window.confirm("Publish this historical revision as a new storefront revision?")) return;
		setSaving(true);
		try {
			await autosave.pause();
			const { data } = await API.post(`/store-builder/admin/revisions/${revisionId}/restore`, {
				expectedRevision: themeRevision,
				expectedShopId: hydratedShopKey
			});
			const savedShop = data.data;
			const nextTheme = loadBuilderTheme(savedShop.theme || {});
			const nextSearchAliases = Array.isArray(savedShop.searchAliases) ? savedShop.searchAliases : [];
			const nextDomain = savedShop.customDomain || { domain: "" };
			const nextDiscount = Number(savedShop.storewideDiscount) || 0;
			const snapshot = stableStringify({
				theme: nextTheme,
				searchAliases: nextSearchAliases,
				customDomain: nextDomain,
				storewideDiscount: nextDiscount
			});
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
			setEditorHistory({
				past: [],
				future: []
			});
			await autosave.clearRecovery({ clearServer: false });
			const refreshed = await reloadBootstrap({ keepCurrent: true }).catch(() => null);
			if (refreshed?.revisions) setRevisions(refreshed.revisions);
			toast.success("Historical revision restored and published as a new revision.");
		} catch (err) {
			if (err.response?.status === 409) {
				setThemeConflict(err.response.data);
				toast.error("A newer revision exists. Your draft was not overwritten.");
			} else {
				toast.error(err.response?.data?.error || "Could not restore this revision.");
			}
		} finally {
			autosave.resume();
			setSaving(false);
		}
	};
	const handleLogoUpload = async (event, target = "storefront") => {
		const file = event.target.files?.[0];
		if (!file) return;
		const formData = new FormData();
		formData.append("logo", file);
		formData.append("target", target);
		setUploadingLogo(true);
		try {
			const { data } = await API.post("/store-builder/admin/logo", formData, { headers: { "Content-Type": "multipart/form-data" } });
			const url = data.data?.url;
			if (!url) throw new Error("Upload did not return a logo URL");
			rememberTemporaryAsset(data.data);
			if (target === "checkout") {
				discardTemporaryAsset(theme.checkoutBranding?.logoUrl);
				setThemeGroup("checkoutBranding", "logoUrl", url);
			} else if (target === "favicon") {
				discardTemporaryAsset(theme.faviconUrl);
				setTheme((prev) => ({
					...prev,
					faviconUrl: url
				}));
			} else {
				discardTemporaryAsset(theme.logoUrl);
				setTheme((prev) => ({
					...prev,
					logoUrl: url
				}));
			}
			toast.success(target === "favicon" ? "Browser icon uploaded" : "Logo uploaded");
		} catch (err) {
			toast.error(err.response?.data?.error || err.message || "Failed to upload logo");
		} finally {
			setUploadingLogo(false);
			event.target.value = "";
		}
	};
	const handleThemeImageUpload = async (event, onUploaded, previousUrl = "") => {
		const file = event.target.files?.[0];
		if (!file) return;
		const formData = new FormData();
		formData.append("image", file);
		setUploadingThemeImage(true);
		try {
			const { data } = await API.post("/store-builder/admin/image", formData, { headers: { "Content-Type": "multipart/form-data" } });
			const url = data.data?.url;
			if (!url) throw new Error("Upload did not return an image URL");
			rememberTemporaryAsset(data.data);
			if (previousUrl && previousUrl !== url) discardTemporaryAsset(previousUrl);
			onUploaded(url, data.data || {});
			toast.success("Image uploaded");
		} catch (err) {
			toast.error(err.response?.data?.error || err.message || "Failed to upload image");
		} finally {
			setUploadingThemeImage(false);
			event.target.value = "";
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
			toast.error("You can add up to 5 images.");
			event.target.value = "";
			return;
		}
		if (files.length > availableSlots) {
			toast.error(`Only ${availableSlots} more image${availableSlots === 1 ? "" : "s"} can be added.`);
		}
		setUploadingThemeImage(true);
		try {
			const results = await Promise.allSettled(uploadFiles.map(async (file) => {
				const formData = new FormData();
				formData.append("image", file);
				const { data } = await API.post("/store-builder/admin/image", formData, { headers: { "Content-Type": "multipart/form-data" } });
				if (!data.data?.url) throw new Error("Upload did not return an image URL");
				return data.data;
			}));
			const uploadedAssets = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
			uploadedAssets.forEach(rememberTemporaryAsset);
			const uploadedUrls = uploadedAssets.map((asset) => asset.url);
			const failedCount = results.length - uploadedUrls.length;
			updateBannerImages(sectionIndex, key, [...currentImages, ...uploadedUrls]);
			if (uploadedUrls.length > 0) toast.success(`${uploadedUrls.length} banner image${uploadedUrls.length === 1 ? "" : "s"} uploaded`);
			if (failedCount > 0) toast.error(`${failedCount} image upload${failedCount === 1 ? "" : "s"} failed. Successful uploads were kept in this draft.`);
		} catch (err) {
			toast.error(err.response?.data?.error || err.message || "Failed to upload banner images");
		} finally {
			setUploadingThemeImage(false);
			event.target.value = "";
		}
	};
	const handleSave = () => {
		if (validation.length > 0) {
			toast.error(validation[0]);
			return;
		}
		if (!hasUnsavedChanges) {
			toast("There are no unpublished Store Builder changes.");
			return;
		}
		setPublishReviewOpen(true);
	};
	const publishChanges = async () => {
		if (saving) return;
		setSaving(true);
		try {
			const payload = {
				theme,
				searchAliases,
				storewideDiscount: Math.max(0, Math.min(100, Number(storewideDiscount) || 0)),
				expectedRevision: themeRevision,
				expectedShopId: hydratedShopKey
			};
			await autosave.pause();
			const { data } = await API.patch("/store-builder/admin", payload);
			const savedShop = data.data || {};
			const hasSavedTheme = savedShop.theme && Object.keys(savedShop.theme).length > 0;
			const nextTheme = hasSavedTheme ? loadBuilderTheme(savedShop.theme) : theme;
			const nextSearchAliases = Array.isArray(savedShop.searchAliases) ? savedShop.searchAliases : searchAliases;
			const nextDomain = savedShop.customDomain || customDomain;
			const nextDiscount = Number(savedShop.storewideDiscount ?? payload.storewideDiscount) || 0;
			const nextShopKey = String(savedShop._id || savedShop.id || savedShop.subdomain || hydratedShopKey || "");
			setSavedTheme(nextTheme);
			if (savedShop.planAccess) setPlanAccess(savedShop.planAccess);
			setHydratedShopKey(nextShopKey);
			setTheme(nextTheme);
			setSearchAliases(nextSearchAliases);
			setCustomDomain(nextDomain);
			setStorewideDiscount(nextDiscount);
			const publishedSnapshot = stableStringify({
				theme: nextTheme,
				searchAliases: nextSearchAliases,
				customDomain: nextDomain,
				storewideDiscount: nextDiscount
			});
			const publishedAt = savedShop.lastPublishedAt || new Date().toISOString();
			const nextRevision = Number(savedShop.themeRevision ?? themeRevision + 1);
			setInitialSnapshot(publishedSnapshot);
			setLastSavedAt(publishedAt);
			setLastPublishedAt(publishedAt);
			setThemeRevision(nextRevision);
			setRevisions((prev) => [{
				_id: `revision-${nextRevision}`,
				revision: nextRevision,
				source: "publish",
				changeSummary: savedShop.changeSummary || publishChangeSummary,
				createdAt: publishedAt
			}, ...prev.filter((item) => Number(item.revision) !== nextRevision)].slice(0, 10));
			lastHistorySnapshotRef.current = publishedSnapshot;
			setEditorHistory({
				past: [],
				future: []
			});
			setPublishReviewOpen(false);
			setThemeConflict(null);
			clearTemporaryAssets();
			await autosave.clearRecovery({ clearServer: false });
			if (!hasSavedTheme) {
				toast("Store design published, but the server did not return the full theme. Keeping your current preview visible.");
			} else {
				toast.success("Store design published. Your preview is up to date.");
			}
		} catch (err) {
			if (err.response?.status === 409 && err.response?.data?.code === "THEME_CONFLICT") {
				setThemeConflict({
					latestRevision: err.response.data.latestRevision,
					lastPublishedAt: err.response.data.lastPublishedAt,
					message: err.response.data.error || err.response.data.message
				});
				setPublishReviewOpen(false);
				toast.error("A newer storefront version was published. Your draft is still safe.");
				return;
			}
			toast.error(err.response?.data?.error || "Failed to save store builder");
		} finally {
			autosave.resume();
			setSaving(false);
		}
	};
	useEffect(() => {
		const handleShortcuts = (event) => {
			if (saving) return;
			const target = event.target;
			const isEditable = target?.isContentEditable || [
				"INPUT",
				"TEXTAREA",
				"SELECT"
			].includes(target?.tagName);
			const commandKey = event.metaKey || event.ctrlKey;
			if (!commandKey) return;
			const key = event.key.toLowerCase();
			if (!isEditable && key === "z" && !event.shiftKey) {
				event.preventDefault();
				undoBuilderChange();
			}
			if (!isEditable && (key === "z" && event.shiftKey || key === "y")) {
				event.preventDefault();
				redoBuilderChange();
			}
			if (key === "s") {
				event.preventDefault();
				if (!saving && validation.length === 0) handleSave();
			}
		};
		window.addEventListener("keydown", handleShortcuts);
		return () => window.removeEventListener("keydown", handleShortcuts);
	});
	const renderPanel = () => {
		if (selectedPlanRestriction) {
			return /* @__PURE__ */ _jsxDEV("div", {
				className: "rounded-lg border border-blue-200 bg-blue-50 p-5",
				children: /* @__PURE__ */ _jsxDEV("div", {
					className: "flex items-start gap-3",
					children: [/* @__PURE__ */ _jsxDEV(Lock, { className: "mt-0.5 h-5 w-5 text-blue-700" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1540,
						columnNumber: 25
					}, this), /* @__PURE__ */ _jsxDEV("div", { children: [
						/* @__PURE__ */ _jsxDEV("h3", {
							className: "font-black text-slate-950",
							children: "Available with Growth"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1542,
							columnNumber: 29
						}, this),
						/* @__PURE__ */ _jsxDEV("p", {
							className: "mt-1 text-sm leading-6 text-slate-600",
							children: selectedPlanRestriction
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1543,
							columnNumber: 29
						}, this),
						/* @__PURE__ */ _jsxDEV("a", {
							href: "/dashboard/billing",
							className: "mt-3 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700",
							children: "View plans"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1544,
							columnNumber: 29
						}, this)
					] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1541,
						columnNumber: 25
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1539,
					columnNumber: 21
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1538,
				columnNumber: 17
			}, this);
		}
		switch (activeGroup) {
			case "brand": return /* @__PURE__ */ _jsxDEV(Suspense, {
				fallback: /* @__PURE__ */ _jsxDEV("div", { className: "h-72 animate-pulse rounded-lg border border-slate-200 bg-slate-100" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1555,
					columnNumber: 41
				}, this),
				children: /* @__PURE__ */ _jsxDEV(BrandEditor, {
					theme,
					setTheme,
					uploadingLogo,
					onLogoUpload: handleLogoUpload
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1556,
					columnNumber: 25
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1555,
				columnNumber: 21
			}, this);
			case "colors": return /* @__PURE__ */ _jsxDEV(ColorEditor, {
				planAccess,
				theme,
				colorMode,
				setColorMode,
				colorSearch,
				setColorSearch,
				openColorSection,
				setOpenColorSection,
				advancedColorsOpen,
				setAdvancedColorsOpen,
				getThemeColor,
				getContrastWarning,
				setColorPath,
				setMainBrandColor,
				applyBrandColor,
				resetColorPalette,
				applyColorSet,
				resetColorGroup,
				setColor
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1561,
				columnNumber: 21
			}, this);
			case "typography": return /* @__PURE__ */ _jsxDEV(TypographyEditor, {
				theme,
				setThemeGroup
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1585,
				columnNumber: 21
			}, this);
			case "layout": return /* @__PURE__ */ _jsxDEV(LayoutEditor, {
				theme,
				setTheme,
				setThemeGroup,
				capabilities: themeCapabilities
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1589,
				columnNumber: 21
			}, this);
			case "navigation": return /* @__PURE__ */ _jsxDEV(NavigationEditor, {
				theme,
				setTheme,
				uploadingLogo,
				onLogoUpload: handleLogoUpload,
				addNavigation,
				addNavigationDropdown,
				moveNavigation,
				removeNavigation,
				updateNavigation,
				addNavigationChild,
				updateNavigationChild,
				removeNavigationChild,
				capabilities: themeCapabilities
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1593,
				columnNumber: 21
			}, this);
			case "hero": return /* @__PURE__ */ _jsxDEV(HeroEditor, {
				theme,
				uploadingThemeImage,
				setThemeGroup,
				addHeroSlide,
				updateHeroSlide,
				moveHeroSlide,
				removeHeroSlide,
				handleThemeImageUpload,
				capabilities: themeCapabilities
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1611,
				columnNumber: 21
			}, this);
			case "seo": return /* @__PURE__ */ _jsxDEV(SeoStatusEditor, { health: storeSeoHealth }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1625,
				columnNumber: 21
			}, this);
			case "products": return /* @__PURE__ */ _jsxDEV(ProductCardsEditor, {
				theme,
				setThemeGroup,
				toggleThemeGroup
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1629,
				columnNumber: 21
			}, this);
			case "sections": return /* @__PURE__ */ _jsxDEV(DynamicSectionsEditor, {
				theme,
				activeElement,
				availableProducts,
				productOptions,
				availableReviews,
				productCategories,
				productPicker,
				setProductPicker,
				reviewPicker,
				setReviewPicker,
				uploadingThemeImage,
				handleThemeImageUpload,
				addHomepageSection,
				toggleHomepageSectionLock,
				updateHomepageSection,
				getBannerImages,
				handleBannerImagesUpload,
				removeBannerImage,
				moveBannerImage,
				addBannerImageUrl,
				updateHomepageSectionSetting,
				updateHomepageSectionDesktopSetting,
				updateHomepageSectionMobileSetting,
				loadProductOptions,
				updateFeaturedProductsSelection,
				loadReviewOptions,
				updateReviewSelection,
				capabilities: themeCapabilities
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1637,
				columnNumber: 21
			}, this);
			case "checkout": return /* @__PURE__ */ _jsxDEV(CheckoutEditor, {
				theme,
				shopName,
				uploadingLogo,
				onLogoUpload: handleLogoUpload,
				setThemeGroup
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1670,
				columnNumber: 21
			}, this);
			case "mobile": return /* @__PURE__ */ _jsxDEV(MobileEditor, {
				planAccess,
				theme,
				setThemeGroup,
				toggleThemeGroup
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1674,
				columnNumber: 21
			}, this);
			case "footer": return /* @__PURE__ */ _jsxDEV(FooterEditor, {
				theme,
				updateFooter,
				addFooterLink,
				removeFooterLink,
				updateFooterLink
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1678,
				columnNumber: 21
			}, this);
			case "policies": return /* @__PURE__ */ _jsxDEV(PoliciesEditor, {
				theme,
				shopName,
				updatePolicy,
				resetPolicyToDefault
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1682,
				columnNumber: 21
			}, this);
			default: return null;
		}
	};
	if (loading) {
		return /* @__PURE__ */ _jsxDEV("div", {
			className: "p-6",
			children: /* @__PURE__ */ _jsxDEV(AdminLoadingState, {
				title: "Loading store builder",
				description: "We are preparing your theme settings, products, reviews, sections, and live preview."
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1692,
				columnNumber: 17
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1691,
			columnNumber: 13
		}, this);
	}
	if (bootstrapError && !bootstrap?.shop) {
		return /* @__PURE__ */ _jsxDEV("div", {
			className: "p-6",
			children: /* @__PURE__ */ _jsxDEV(AdminErrorState, {
				title: "Store Builder could not load",
				description: bootstrapError,
				onRetry: () => reloadBootstrap().catch(() => {})
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1703,
				columnNumber: 17
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 1702,
			columnNumber: 13
		}, this);
	}
	return /* @__PURE__ */ _jsxDEV(StoreBuilderShell, {
		busy: saving,
		children: [
			/* @__PURE__ */ _jsxDEV(StoreBuilderHeader, {
				hasUnsavedChanges,
				statusLabel: hasUnsavedChanges ? "Unsaved changes" : "Published",
				lastSavedLabel: formatBuilderDate(lastSavedAt) || "Current session",
				lastPublishedLabel: formatBuilderDate(lastPublishedAt) || publishedVersionLabel,
				canUndo,
				canRedo,
				saving,
				validationCount: validation.length,
				onUndo: undoBuilderChange,
				onRedo: redoBuilderChange,
				onResetStyling: resetStyling,
				onRestorePublished: restorePublishedVersion,
				onSaveDraft: saveDraftNow,
				onReload: reloadPublishedVersion,
				onSave: handleSave,
				onOpenIssues: () => setIssuesOpen(true),
				onOpenHistory: () => setHistoryOpen(true),
				onOpenThemes: () => setThemeGalleryOpen(true),
				liveStoreUrl,
				autosaveStatus: autosave.status,
				revision: themeRevision,
				conflict: themeConflict,
				mobileWorkspace,
				onWorkspaceChange: setMobileWorkspace
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1714,
				columnNumber: 13
			}, this),
			recoveryDraft && /* @__PURE__ */ _jsxDEV("div", {
				className: "mx-auto max-w-[1600px] px-4 pt-4",
				children: /* @__PURE__ */ _jsxDEV("div", {
					className: "flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between",
					children: [/* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("p", {
						className: "text-sm font-black text-blue-950",
						children: "Unpublished draft found"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1745,
						columnNumber: 29
					}, this), /* @__PURE__ */ _jsxDEV("p", {
						className: "mt-1 text-xs leading-5 text-blue-800",
						children: [
							"A ",
							recoveryDraft.source === "server" ? "server" : "local",
							" recovery copy from ",
							formatBuilderDate(recoveryDraft.updatedAt || recoveryDraft.savedAt) || "an earlier session",
							" is available. Your live store is unchanged."
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1746,
						columnNumber: 29
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1744,
						columnNumber: 25
					}, this), /* @__PURE__ */ _jsxDEV("div", {
						className: "flex shrink-0 gap-2",
						children: [/* @__PURE__ */ _jsxDEV(BuilderButton, {
							type: "button",
							variant: "secondary",
							onClick: discardRecoveryVersion,
							children: "Discard"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1751,
							columnNumber: 29
						}, this), /* @__PURE__ */ _jsxDEV(BuilderButton, {
							type: "button",
							onClick: restoreRecoveryVersion,
							children: "Restore draft"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1752,
							columnNumber: 29
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1750,
						columnNumber: 25
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1743,
					columnNumber: 21
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1742,
				columnNumber: 17
			}, this),
			themeConflict && /* @__PURE__ */ _jsxDEV("div", {
				className: "mx-auto max-w-[1600px] px-4 pt-4",
				children: /* @__PURE__ */ _jsxDEV("div", {
					className: "flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between",
					children: [/* @__PURE__ */ _jsxDEV("div", { children: [/* @__PURE__ */ _jsxDEV("p", {
						className: "text-sm font-black text-amber-950",
						children: "A newer storefront revision exists"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1762,
						columnNumber: 29
					}, this), /* @__PURE__ */ _jsxDEV("p", {
						className: "mt-1 text-xs leading-5 text-amber-800",
						children: [
							"Revision ",
							themeConflict.latestRevision,
							" was published elsewhere. Your draft is safe; reload only when you are ready to discard or reconcile it."
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1763,
						columnNumber: 29
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1761,
						columnNumber: 25
					}, this), /* @__PURE__ */ _jsxDEV("div", {
						className: "flex shrink-0 gap-2",
						children: [/* @__PURE__ */ _jsxDEV(BuilderButton, {
							type: "button",
							variant: "secondary",
							onClick: () => setThemeConflict(null),
							children: "Keep editing"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1768,
							columnNumber: 29
						}, this), /* @__PURE__ */ _jsxDEV(BuilderButton, {
							type: "button",
							onClick: reloadPublishedVersion,
							children: "Discard and reload"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1769,
							columnNumber: 29
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 1767,
						columnNumber: 25
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1760,
					columnNumber: 21
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1759,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ _jsxDEV("div", {
				className: `mx-auto grid max-w-[1800px] grid-cols-1 gap-4 p-4 xl:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(520px,1fr)_380px] ${inspectorOpen ? "xl:pr-[396px] 2xl:pr-4" : ""}`,
				children: [/* @__PURE__ */ _jsxDEV(StoreBuilderSidebar, {
					mobileWorkspace,
					activeElement,
					activeGroup,
					selectEditorTarget,
					selectSettingsGroup,
					validation: validationDetails,
					planAccess,
					theme,
					seoHealth: storeSeoHealth,
					onMoveSection: moveHomepageSection,
					onDuplicateSection: duplicateHomepageSection,
					onToggleSectionVisibility: toggleHomepageSectionVisibility,
					onRemoveSection: removeHomepageSection
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1778,
					columnNumber: 17
				}, this), /* @__PURE__ */ _jsxDEV("main", {
					className: "contents",
					children: [/* @__PURE__ */ _jsxDEV(Suspense, {
						fallback: /* @__PURE__ */ _jsxDEV("section", {
							className: `${mobileWorkspace === "preview" ? "block" : "hidden"} order-1 min-h-[640px] animate-pulse rounded-lg border border-slate-200 bg-slate-100 xl:block 2xl:order-2`,
							"aria-label": "Loading storefront preview"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1795,
							columnNumber: 41
						}, this),
						children: /* @__PURE__ */ _jsxDEV(StoreBuilderPreviewPanel, {
							previewCatalog: bootstrap?.previewCatalog,
							trustedBadge: bootstrap?.shop?.trustedBadge,
							shopVerification: bootstrap?.shop?.shopVerification,
							planAccess,
							branding: bootstrap?.shop?.previewBranding,
							mobileWorkspace,
							setMobileWorkspace,
							previewPages,
							previewPage,
							setPreviewPage,
							device,
							setDevice,
							theme,
							storewideDiscount,
							shopName,
							availableProducts,
							productCategories,
							productCategoryDetails,
							availableReviews,
							activeElement,
							selectEditorTarget,
							toggleHomepageSectionVisibility
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1796,
							columnNumber: 25
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1795,
						columnNumber: 21
					}, this), /* @__PURE__ */ _jsxDEV(StoreBuilderEditorPanel, {
						mobileWorkspace,
						inspectorOpen,
						selectedLabel,
						selectedIsLockedLayout,
						planRestriction: selectedPlanRestriction,
						setMobileWorkspace,
						onCloseInspector: () => setInspectorOpen(false),
						children: /* @__PURE__ */ _jsxDEV(Suspense, {
							fallback: /* @__PURE__ */ _jsxDEV("div", {
								className: "h-72 animate-pulse rounded-lg bg-slate-100",
								"aria-label": "Loading editor settings"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1830,
								columnNumber: 45
							}, this),
							children: renderPanel()
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 1830,
							columnNumber: 25
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1821,
						columnNumber: 21
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1794,
					columnNumber: 17
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 1775,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ _jsxDEV(IssuesDrawer, {
				open: issuesOpen,
				issues: validationDetails,
				onClose: () => setIssuesOpen(false),
				onSelectIssue: focusValidationError
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1837,
				columnNumber: 13
			}, this),
			/* @__PURE__ */ _jsxDEV(HistoryDrawer, {
				open: historyOpen,
				revisions,
				busy: saving,
				onClose: () => setHistoryOpen(false),
				onPreview: (revisionId) => {
					setHistoryOpen(false);
					previewRevision(revisionId);
				},
				onRestore: (revisionId) => {
					setHistoryOpen(false);
					restoreRevision(revisionId);
				}
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1843,
				columnNumber: 13
			}, this),
			themeGalleryOpen && /* @__PURE__ */ _jsxDEV(Suspense, {
				fallback: /* @__PURE__ */ _jsxDEV("div", {
					className: "fixed inset-0 z-[95] flex items-center justify-center bg-slate-100",
					role: "status",
					children: /* @__PURE__ */ _jsxDEV("div", {
						className: "rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 shadow-lg",
						children: "Loading themes…"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 1859,
						columnNumber: 135
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1859,
					columnNumber: 37
				}, this),
				children: /* @__PURE__ */ _jsxDEV(ThemeGallery, {
					themeAvailability: bootstrap?.themeAvailability,
					previewCatalog: bootstrap?.previewCatalog,
					branding: bootstrap?.shop?.previewBranding,
					storewideDiscount,
					trustedBadge: bootstrap?.shop?.trustedBadge,
					shopVerification: bootstrap?.shop?.shopVerification,
					open: themeGalleryOpen,
					onClose: () => setThemeGalleryOpen(false),
					currentTheme: theme,
					planAccess,
					shopName,
					products: availableProducts,
					categories: productCategoryDetails.length ? productCategoryDetails : productCategories,
					reviews: availableReviews,
					onApply: applyPrebuiltTheme
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 1860,
					columnNumber: 21
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1859,
				columnNumber: 17
			}, this),
			publishReviewOpen && /* @__PURE__ */ _jsxDEV("div", {
				className: "fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4",
				role: "presentation",
				onMouseDown: (event) => {
					if (event.target === event.currentTarget && !saving) setPublishReviewOpen(false);
				},
				children: /* @__PURE__ */ _jsxDEV("section", {
					role: "dialog",
					"aria-modal": "true",
					"aria-labelledby": "publish-store-title",
					className: "max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-xl sm:p-6",
					children: [
						/* @__PURE__ */ _jsxDEV("div", {
							className: "flex items-start justify-between gap-4",
							children: [/* @__PURE__ */ _jsxDEV("div", { children: [
								/* @__PURE__ */ _jsxDEV("p", {
									className: "text-xs font-black uppercase tracking-wide text-indigo-600",
									children: ["Revision ", themeRevision + 1]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 1887,
									columnNumber: 33
								}, this),
								/* @__PURE__ */ _jsxDEV("h2", {
									id: "publish-store-title",
									className: "mt-1 text-xl font-black text-slate-950",
									children: "Publish storefront changes?"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1888,
									columnNumber: 33
								}, this),
								/* @__PURE__ */ _jsxDEV("p", {
									className: "mt-2 text-sm leading-6 text-slate-600",
									children: "These draft changes will become visible on your live store. Temporary media used by the draft will be promoted only after this publish succeeds."
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1889,
									columnNumber: 33
								}, this)
							] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 1886,
								columnNumber: 29
							}, this), /* @__PURE__ */ _jsxDEV("button", {
								type: "button",
								"aria-label": "Close publish review",
								onClick: () => setPublishReviewOpen(false),
								disabled: saving,
								className: "rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500",
								children: /* @__PURE__ */ _jsxDEV(X, { size: 20 }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 1892,
									columnNumber: 33
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1891,
								columnNumber: 29
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1885,
							columnNumber: 25
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							className: "mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4",
							children: [/* @__PURE__ */ _jsxDEV("p", {
								className: "text-xs font-black uppercase tracking-wide text-slate-500",
								children: "Change summary"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1896,
								columnNumber: 29
							}, this), publishChangeSummary.length > 0 ? /* @__PURE__ */ _jsxDEV("ul", {
								className: "mt-3 space-y-2 text-sm font-semibold text-slate-700",
								children: publishChangeSummary.map((change) => /* @__PURE__ */ _jsxDEV("li", {
									className: "flex gap-2",
									children: [/* @__PURE__ */ _jsxDEV("span", {
										className: "text-indigo-600",
										children: "•"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 1899,
										columnNumber: 141
									}, this), /* @__PURE__ */ _jsxDEV("span", { children: [
										/* @__PURE__ */ _jsxDEV("strong", { children: [change.area, ":"] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 1899,
											columnNumber: 189
										}, this),
										" ",
										change.message
									] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 1899,
										columnNumber: 183
									}, this)]
								}, `${change.area}-${change.message}`, true, {
									fileName: _jsxFileName,
									lineNumber: 1899,
									columnNumber: 73
								}, this))
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1898,
								columnNumber: 33
							}, this) : /* @__PURE__ */ _jsxDEV("p", {
								className: "mt-2 text-sm text-slate-500",
								children: "The draft differs from the published snapshot."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1902,
								columnNumber: 33
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1895,
							columnNumber: 25
						}, this),
						/* @__PURE__ */ _jsxDEV("div", {
							className: "mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
							children: [/* @__PURE__ */ _jsxDEV(BuilderButton, {
								type: "button",
								variant: "secondary",
								onClick: () => setPublishReviewOpen(false),
								disabled: saving,
								children: "Continue editing"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1906,
								columnNumber: 29
							}, this), /* @__PURE__ */ _jsxDEV(BuilderButton, {
								type: "button",
								onClick: publishChanges,
								disabled: saving,
								children: saving ? "Publishing..." : "Publish to live store"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1907,
								columnNumber: 29
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1905,
							columnNumber: 25
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 1884,
					columnNumber: 21
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 1881,
				columnNumber: 17
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 1713,
		columnNumber: 9
	}, this);
};
_s(StoreBuilderPage, "u+ZNW40tJTRnYfE9/Ub3eplR3go=", false, function() {
	return [
		useStoreBuilderBootstrap,
		usePreviewMode,
		useMobileWorkspace,
		useThemeMedia,
		useStoreBuilderDirtyState,
		useAutosaveRecovery
	];
});
_c31 = StoreBuilderPage;
export default StoreBuilderPage;
var _c, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c10, _c11, _c12, _c13, _c14, _c15, _c16, _c17, _c18, _c19, _c20, _c21, _c22, _c23, _c24, _c25, _c26, _c27, _c28, _c29, _c30, _c31;
$RefreshReg$(_c, "StoreBuilderPreviewPanel$lazy");
$RefreshReg$(_c2, "StoreBuilderPreviewPanel");
$RefreshReg$(_c3, "ColorEditor$lazy");
$RefreshReg$(_c4, "ColorEditor");
$RefreshReg$(_c5, "DynamicSectionsEditor$lazy");
$RefreshReg$(_c6, "DynamicSectionsEditor");
$RefreshReg$(_c7, "BrandEditor$lazy");
$RefreshReg$(_c8, "BrandEditor");
$RefreshReg$(_c9, "TypographyEditor$lazy");
$RefreshReg$(_c10, "TypographyEditor");
$RefreshReg$(_c11, "LayoutEditor$lazy");
$RefreshReg$(_c12, "LayoutEditor");
$RefreshReg$(_c13, "SeoStatusEditor$lazy");
$RefreshReg$(_c14, "SeoStatusEditor");
$RefreshReg$(_c15, "MobileEditor$lazy");
$RefreshReg$(_c16, "MobileEditor");
$RefreshReg$(_c17, "PoliciesEditor$lazy");
$RefreshReg$(_c18, "PoliciesEditor");
$RefreshReg$(_c19, "CheckoutEditor$lazy");
$RefreshReg$(_c20, "CheckoutEditor");
$RefreshReg$(_c21, "FooterEditor$lazy");
$RefreshReg$(_c22, "FooterEditor");
$RefreshReg$(_c23, "NavigationEditor$lazy");
$RefreshReg$(_c24, "NavigationEditor");
$RefreshReg$(_c25, "HeroEditor$lazy");
$RefreshReg$(_c26, "HeroEditor");
$RefreshReg$(_c27, "ProductCardsEditor$lazy");
$RefreshReg$(_c28, "ProductCardsEditor");
$RefreshReg$(_c29, "ThemeGallery$lazy");
$RefreshReg$(_c30, "ThemeGallery");
$RefreshReg$(_c31, "StoreBuilderPage");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
import * as __vite_react_currentExports from "/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx?t=1792473005258";
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }

  const currentExports = __vite_react_currentExports;
  queueMicrotask(() => {
    RefreshRuntime.registerExportsForReactRefresh("C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) { return RefreshRuntime.register(type, "C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StoreBuilderPage.jsx" + ' ' + id); }
function $RefreshSig$() { return RefreshRuntime.createSignatureFunctionForTransform(); }

//# sourceMappingURL=data:application/json;base64,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SSxDQUFDO09BQ3BOOzs7O2tCQUVKLHdCQUFDLEtBQUQ7UUFBRyxXQUFVO2tCQUE4QjtPQUFpRDs7OztlQUUvRjs7Ozs7O01BQ0wsd0JBQUMsT0FBRDtPQUFLLFdBQVU7aUJBQWYsQ0FDSSx3QkFBQyxlQUFEO1FBQWUsTUFBSztRQUFTLFNBQVE7UUFBWSxlQUFlLHFCQUFxQixLQUFLO1FBQUcsVUFBVTtrQkFBUTtPQUErQjs7OztpQkFDOUksd0JBQUMsZUFBRDtRQUFlLE1BQUs7UUFBUyxTQUFTO1FBQWdCLFVBQVU7a0JBQzNELFNBQVMsa0JBQWtCO09BQ2pCOzs7O2VBQ2Q7Ozs7OztLQUNBOzs7Ozs7R0FDUjs7Ozs7RUFFTTs7Ozs7O0FBRTNCOzs7Ozs7Ozs7Ozs7QUFFQSxlQUFlIiwibmFtZXMiOltdLCJzb3VyY2VzIjpbIlN0b3JlQnVpbGRlclBhZ2UuanN4Il0sInZlcnNpb24iOjMsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGxhenksIFN1c3BlbnNlLCB1c2VFZmZlY3QsIHVzZU1lbW8sIHVzZVJlZiwgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCc7XHJcbmltcG9ydCB7XHJcbiAgICBjb250cmFzdFJhdGlvLFxyXG4gICAgZ2V0VGhlbWVDYXBhYmlsaXRpZXMsXHJcbiAgICBnZXRUaGVtZUVkaXRvclJlc3RyaWN0aW9uLFxyXG4gICAgZXh0cmFjdFRoZW1lQXNzZXRVcmxzLFxyXG4gICAgc3VnZ2VzdEFjY2Vzc2libGVGb3JlZ3JvdW5kLFxyXG4gICAgc3VtbWFyaXplVGhlbWVDaGFuZ2VzLFxyXG4gICAgdmFsaWRhdGVUaGVtZVxyXG59IGZyb20gJ0BzY2FsZXVwL3N0b3JlZnJvbnQtdGhlbWUnO1xyXG5pbXBvcnQge1xyXG4gICAgTG9jayxcclxuICAgIFhcclxufSBmcm9tICdsdWNpZGUtcmVhY3QnO1xyXG5pbXBvcnQgeyB0b2FzdCB9IGZyb20gJ3JlYWN0LWhvdC10b2FzdCc7XHJcbmltcG9ydCBBUEkgZnJvbSAnLi4vLi4vLi4vYXBpL2FwaSc7XHJcbmltcG9ydCB7IEJ1aWxkZXJCdXR0b24gfSBmcm9tICcuL2J1aWxkZXJVaS5qc3gnO1xyXG5pbXBvcnQgeyBTdG9yZUJ1aWxkZXJIZWFkZXIgfSBmcm9tICcuL1N0b3JlQnVpbGRlckhlYWRlci5qc3gnO1xyXG5pbXBvcnQgeyBTdG9yZUJ1aWxkZXJTaWRlYmFyIH0gZnJvbSAnLi9TdG9yZUJ1aWxkZXJTaWRlYmFyLmpzeCc7XHJcbmltcG9ydCB7IFN0b3JlQnVpbGRlckVkaXRvclBhbmVsIH0gZnJvbSAnLi9TdG9yZUJ1aWxkZXJFZGl0b3JQYW5lbC5qc3gnO1xyXG5pbXBvcnQgeyBTdG9yZUJ1aWxkZXJTaGVsbCB9IGZyb20gJy4vc2hlbGwvU3RvcmVCdWlsZGVyU2hlbGwuanN4JztcclxuaW1wb3J0IHsgSXNzdWVzRHJhd2VyIH0gZnJvbSAnLi9zaGVsbC9Jc3N1ZXNEcmF3ZXIuanN4JztcclxuaW1wb3J0IHsgSGlzdG9yeURyYXdlciB9IGZyb20gJy4vc2hlbGwvSGlzdG9yeURyYXdlci5qc3gnO1xyXG5pbXBvcnQge1xyXG4gICAgUE9MSUNZX0xBQkVMUyxcclxuICAgIGdldERlZmF1bHRQb2xpY3lUZXh0XHJcbn0gZnJvbSAnLi4vLi4vLi4vdXRpbHMvc3RvcmVCdWlsZGVyUG9saWNpZXMuanMnO1xyXG5pbXBvcnQgeyBBZG1pbkVycm9yU3RhdGUsIEFkbWluTG9hZGluZ1N0YXRlIH0gZnJvbSAnLi4vLi4vLi4vY29tcG9uZW50cy91aS9BZG1pblN0YXRlLmpzeCc7XHJcbmltcG9ydCB7IHNjb3JlU3RvcmVTZW8gfSBmcm9tICcuLi8uLi8uLi91dGlscy9zZW9IZWFsdGguanMnO1xyXG5pbXBvcnQge1xyXG4gICAgcHJldmlld1BhZ2VzLFxyXG4gICAgdXNlUHJldmlld01vZGVcclxufSBmcm9tICcuL2hvb2tzL3VzZVByZXZpZXdNb2RlLmpzJztcclxuaW1wb3J0IHsgdXNlU3RvcmVCdWlsZGVyRGlydHlTdGF0ZSB9IGZyb20gJy4vaG9va3MvdXNlU3RvcmVCdWlsZGVyRGlydHlTdGF0ZS5qcyc7XHJcbmltcG9ydCB7IHVzZU1vYmlsZVdvcmtzcGFjZSB9IGZyb20gJy4vaG9va3MvdXNlTW9iaWxlV29ya3NwYWNlLmpzJztcclxuaW1wb3J0IHsgdXNlU3RvcmVCdWlsZGVyQm9vdHN0cmFwIH0gZnJvbSAnLi9ob29rcy91c2VTdG9yZUJ1aWxkZXJCb290c3RyYXAuanMnO1xyXG5pbXBvcnQgeyB1c2VBdXRvc2F2ZVJlY292ZXJ5IH0gZnJvbSAnLi9ob29rcy91c2VBdXRvc2F2ZVJlY292ZXJ5LmpzJztcclxuaW1wb3J0IHsgdXNlVGhlbWVNZWRpYSB9IGZyb20gJy4vaG9va3MvdXNlVGhlbWVNZWRpYS5qcyc7XHJcbmltcG9ydCB7XHJcbiAgICBIRVJPX1NMSURFX0xJTUlULFxyXG4gICAgSElTVE9SWV9MSU1JVCxcclxuICAgIGNvbG9yRmllbGRzLFxyXG4gICAgZml4ZWRQcmV2aWV3RWxlbWVudHMsXHJcbiAgICBnZXRTZWN0aW9uSW5kZXhGcm9tU2VsZWN0aW9uLFxyXG4gICAgZ2V0U2VjdGlvblNlbGVjdGlvbklkLFxyXG4gICAgZ3JvdXBFbGVtZW50TWFwLFxyXG4gICAgaW5saW5lU2VjdGlvblByZXNldHMsXHJcbiAgICBpc0hvbWVwYWdlU2VjdGlvbkxvY2tlZCxcclxuICAgIHJlc29sdmVFZGl0b3JDb21wb25lbnQsXHJcbiAgICBzZXR0aW5nc0dyb3Vwc1xyXG59IGZyb20gJy4vc3RvcmVCdWlsZGVyQ29uc3RhbnRzLmpzeCc7XHJcbmltcG9ydCB7XHJcbiAgICBjcmVhdGVIZXJvU2xpZGUsXHJcbiAgICBjcmVhdGVCdWlsZGVyU2VjdGlvbklkLFxyXG4gICAgZGVmYXVsdFRoZW1lLFxyXG4gICAgZm9ybWF0QnVpbGRlckRhdGUsXHJcbiAgICBnZXRCdWlsZGVySGVyb1NsaWRlcyxcclxuICAgIGlzSGV4Q29sb3IsXHJcbiAgICBsb2FkQnVpbGRlclRoZW1lLFxyXG4gICAgbm9ybWFsaXplSGVyb1NsaWRlRm9yQnVpbGRlcixcclxuICAgIG5vcm1hbGl6ZUhvbWVwYWdlU2VjdGlvbnMsXHJcbiAgICBzYWZlUGFyc2VTbmFwc2hvdCxcclxuICAgIHN0YWJsZVN0cmluZ2lmeSxcclxuICAgIHN5bmNIZXJvTGVnYWN5RmllbGRzLFxyXG4gICAgdXBkYXRlQnVpbGRlclRoZW1lU2V0dGluZ1xyXG59IGZyb20gJy4vc3RvcmVCdWlsZGVyVGhlbWVVdGlscy5qcyc7XHJcbmltcG9ydCB7XHJcbiAgICBhcHBseUNvbXBhdGlibGVDb2xvclVwZGF0ZXMsXHJcbiAgICBhcHBseUNvbG9yUGFsZXR0ZSxcclxuICAgIGJ1aWxkQnJhbmRDb2xvclNldCxcclxuICAgIGNvbG9yU2VjdGlvbkdyb3VwcyxcclxuICAgIGdldENvbG9yUGF0aFZhbHVlLFxyXG4gICAgbWVyZ2VDb2xvclVwZGF0ZXMsXHJcbiAgICBuZXN0ZWRDb2xvckZpZWxkcyxcclxuICAgIHNldENvbG9yUGF0aFZhbHVlXHJcbn0gZnJvbSAnLi9zdG9yZUJ1aWxkZXJDb2xvckNvbmZpZy5qcyc7XHJcblxyXG5jb25zdCBTdG9yZUJ1aWxkZXJQcmV2aWV3UGFuZWwgPSBsYXp5KCgpID0+IGltcG9ydCgnLi9TdG9yZUJ1aWxkZXJQcmV2aWV3UGFuZWwuanN4JykudGhlbihtb2R1bGUgPT4gKHsgZGVmYXVsdDogbW9kdWxlLlN0b3JlQnVpbGRlclByZXZpZXdQYW5lbCB9KSkpO1xyXG5jb25zdCBDb2xvckVkaXRvciA9IGxhenkoKCkgPT4gaW1wb3J0KCcuL2VkaXRvcnMvQ29sb3JFZGl0b3IuanN4JykudGhlbihtb2R1bGUgPT4gKHsgZGVmYXVsdDogbW9kdWxlLkNvbG9yRWRpdG9yIH0pKSk7XHJcbmNvbnN0IER5bmFtaWNTZWN0aW9uc0VkaXRvciA9IGxhenkoKCkgPT4gaW1wb3J0KCcuL2VkaXRvcnMvRHluYW1pY1NlY3Rpb25zRWRpdG9yLmpzeCcpLnRoZW4obW9kdWxlID0+ICh7IGRlZmF1bHQ6IG1vZHVsZS5EeW5hbWljU2VjdGlvbnNFZGl0b3IgfSkpKTtcclxuY29uc3QgQnJhbmRFZGl0b3IgPSBsYXp5KCgpID0+IGltcG9ydCgnLi9lZGl0b3JzL0Jhc2ljRWRpdG9ycy5qc3gnKS50aGVuKG1vZHVsZSA9PiAoeyBkZWZhdWx0OiBtb2R1bGUuQnJhbmRFZGl0b3IgfSkpKTtcclxuY29uc3QgVHlwb2dyYXBoeUVkaXRvciA9IGxhenkoKCkgPT4gaW1wb3J0KCcuL2VkaXRvcnMvQmFzaWNFZGl0b3JzLmpzeCcpLnRoZW4obW9kdWxlID0+ICh7IGRlZmF1bHQ6IG1vZHVsZS5UeXBvZ3JhcGh5RWRpdG9yIH0pKSk7XHJcbmNvbnN0IExheW91dEVkaXRvciA9IGxhenkoKCkgPT4gaW1wb3J0KCcuL2VkaXRvcnMvQmFzaWNFZGl0b3JzLmpzeCcpLnRoZW4obW9kdWxlID0+ICh7IGRlZmF1bHQ6IG1vZHVsZS5MYXlvdXRFZGl0b3IgfSkpKTtcclxuY29uc3QgU2VvU3RhdHVzRWRpdG9yID0gbGF6eSgoKSA9PiBpbXBvcnQoJy4vZWRpdG9ycy9CYXNpY0VkaXRvcnMuanN4JykudGhlbihtb2R1bGUgPT4gKHsgZGVmYXVsdDogbW9kdWxlLlNlb1N0YXR1c0VkaXRvciB9KSkpO1xyXG5jb25zdCBNb2JpbGVFZGl0b3IgPSBsYXp5KCgpID0+IGltcG9ydCgnLi9lZGl0b3JzL0Jhc2ljRWRpdG9ycy5qc3gnKS50aGVuKG1vZHVsZSA9PiAoeyBkZWZhdWx0OiBtb2R1bGUuTW9iaWxlRWRpdG9yIH0pKSk7XHJcbmNvbnN0IFBvbGljaWVzRWRpdG9yID0gbGF6eSgoKSA9PiBpbXBvcnQoJy4vZWRpdG9ycy9CYXNpY0VkaXRvcnMuanN4JykudGhlbihtb2R1bGUgPT4gKHsgZGVmYXVsdDogbW9kdWxlLlBvbGljaWVzRWRpdG9yIH0pKSk7XHJcbmNvbnN0IENoZWNrb3V0RWRpdG9yID0gbGF6eSgoKSA9PiBpbXBvcnQoJy4vZWRpdG9ycy9DaGVja291dEVkaXRvci5qc3gnKS50aGVuKG1vZHVsZSA9PiAoeyBkZWZhdWx0OiBtb2R1bGUuQ2hlY2tvdXRFZGl0b3IgfSkpKTtcclxuY29uc3QgRm9vdGVyRWRpdG9yID0gbGF6eSgoKSA9PiBpbXBvcnQoJy4vZWRpdG9ycy9Gb290ZXJFZGl0b3IuanN4JykudGhlbihtb2R1bGUgPT4gKHsgZGVmYXVsdDogbW9kdWxlLkZvb3RlckVkaXRvciB9KSkpO1xyXG5jb25zdCBOYXZpZ2F0aW9uRWRpdG9yID0gbGF6eSgoKSA9PiBpbXBvcnQoJy4vZWRpdG9ycy9OYXZpZ2F0aW9uRWRpdG9yLmpzeCcpLnRoZW4obW9kdWxlID0+ICh7IGRlZmF1bHQ6IG1vZHVsZS5OYXZpZ2F0aW9uRWRpdG9yIH0pKSk7XHJcbmNvbnN0IEhlcm9FZGl0b3IgPSBsYXp5KCgpID0+IGltcG9ydCgnLi9lZGl0b3JzL0hlcm9FZGl0b3IuanN4JykudGhlbihtb2R1bGUgPT4gKHsgZGVmYXVsdDogbW9kdWxlLkhlcm9FZGl0b3IgfSkpKTtcclxuY29uc3QgUHJvZHVjdENhcmRzRWRpdG9yID0gbGF6eSgoKSA9PiBpbXBvcnQoJy4vZWRpdG9ycy9Qcm9kdWN0Q2FyZHNFZGl0b3IuanN4JykudGhlbihtb2R1bGUgPT4gKHsgZGVmYXVsdDogbW9kdWxlLlByb2R1Y3RDYXJkc0VkaXRvciB9KSkpO1xyXG5jb25zdCBUaGVtZUdhbGxlcnkgPSBsYXp5KCgpID0+IGltcG9ydCgnLi90aGVtZXMvVGhlbWVHYWxsZXJ5LmpzeCcpKTtcclxuXHJcbmNvbnN0IGlzQ3VzdG9tRG9tYWluQ29ubmVjdGVkID0gKGN1c3RvbURvbWFpbiA9IHt9KSA9PiAoXHJcbiAgICBjdXN0b21Eb21haW4/LnN0YXR1cyA9PT0gJ1ZlcmlmaWVkJyAmJlxyXG4gICAgQm9vbGVhbihjdXN0b21Eb21haW4/LmRvbWFpbikgJiZcclxuICAgIGN1c3RvbURvbWFpbj8ub3duZXJzaGlwVmVyaWZpZWQgPT09IHRydWUgJiZcclxuICAgIChjdXN0b21Eb21haW4/LnJvdXRpbmdWZXJpZmllZCA9PT0gdHJ1ZSB8fCBjdXN0b21Eb21haW4/Lm1hbnVhbGx5VmVyaWZpZWRSb3V0aW5nID09PSB0cnVlKVxyXG4pO1xyXG5cclxuY29uc3QgREVGQVVMVF9QTEFOX0FDQ0VTUyA9IHtcclxuICAgIHBsYW5LZXk6ICdzdGFydGVyJyxcclxuICAgIHN0b3JlQnVpbGRlckFjY2VzczogJ2xpbWl0ZWQnLFxyXG4gICAgc3RvcmVCdWlsZGVyQ2FwYWJpbGl0aWVzOiB7fSxcclxuICAgIGZlYXR1cmVzOiB7fVxyXG59O1xyXG5cclxuY29uc3QgU3RvcmVCdWlsZGVyUGFnZSA9ICgpID0+IHtcclxuICAgIGNvbnN0IHsgbG9hZGluZywgZGF0YTogYm9vdHN0cmFwLCBlcnJvcjogYm9vdHN0cmFwRXJyb3IsIHJlbG9hZDogcmVsb2FkQm9vdHN0cmFwIH0gPSB1c2VTdG9yZUJ1aWxkZXJCb290c3RyYXAoKTtcclxuICAgIGNvbnN0IFtzYXZpbmcsIHNldFNhdmluZ10gPSB1c2VTdGF0ZShmYWxzZSk7XHJcbiAgICBjb25zdCBbdXBsb2FkaW5nTG9nbywgc2V0VXBsb2FkaW5nTG9nb10gPSB1c2VTdGF0ZShmYWxzZSk7XHJcbiAgICBjb25zdCBbdXBsb2FkaW5nVGhlbWVJbWFnZSwgc2V0VXBsb2FkaW5nVGhlbWVJbWFnZV0gPSB1c2VTdGF0ZShmYWxzZSk7XHJcbiAgICBjb25zdCBbc2hvcE5hbWUsIHNldFNob3BOYW1lXSA9IHVzZVN0YXRlKCcnKTtcclxuICAgIGNvbnN0IFtzaG9wU3ViZG9tYWluLCBzZXRTaG9wU3ViZG9tYWluXSA9IHVzZVN0YXRlKCcnKTtcclxuICAgIGNvbnN0IFtwbGFuQWNjZXNzLCBzZXRQbGFuQWNjZXNzXSA9IHVzZVN0YXRlKERFRkFVTFRfUExBTl9BQ0NFU1MpO1xyXG4gICAgY29uc3QgW3RoZW1lLCBzZXRUaGVtZV0gPSB1c2VTdGF0ZShkZWZhdWx0VGhlbWUpO1xyXG4gICAgY29uc3QgW3NhdmVkVGhlbWUsIHNldFNhdmVkVGhlbWVdID0gdXNlU3RhdGUoZGVmYXVsdFRoZW1lKTtcclxuICAgIGNvbnN0IFtzZWFyY2hBbGlhc2VzLCBzZXRTZWFyY2hBbGlhc2VzXSA9IHVzZVN0YXRlKFtdKTtcclxuICAgIGNvbnN0IFtoeWRyYXRlZFNob3BLZXksIHNldEh5ZHJhdGVkU2hvcEtleV0gPSB1c2VTdGF0ZSgnJyk7XHJcbiAgICBjb25zdCBbYXZhaWxhYmxlUHJvZHVjdHMsIHNldEF2YWlsYWJsZVByb2R1Y3RzXSA9IHVzZVN0YXRlKFtdKTtcclxuICAgIGNvbnN0IFtwcm9kdWN0T3B0aW9ucywgc2V0UHJvZHVjdE9wdGlvbnNdID0gdXNlU3RhdGUoW10pO1xyXG4gICAgY29uc3QgW3Byb2R1Y3RDYXRlZ29yaWVzLCBzZXRQcm9kdWN0Q2F0ZWdvcmllc10gPSB1c2VTdGF0ZShbXSk7XHJcbiAgICBjb25zdCBbcHJvZHVjdENhdGVnb3J5RGV0YWlscywgc2V0UHJvZHVjdENhdGVnb3J5RGV0YWlsc10gPSB1c2VTdGF0ZShbXSk7XHJcbiAgICBjb25zdCBbcHJvZHVjdFBpY2tlciwgc2V0UHJvZHVjdFBpY2tlcl0gPSB1c2VTdGF0ZSh7IHNlYXJjaDogJycsIGNhdGVnb3J5OiAnQWxsJywgcGFnZTogMSwgcGFnZXM6IDEsIGxvYWRpbmc6IGZhbHNlIH0pO1xyXG4gICAgY29uc3QgW2F2YWlsYWJsZVJldmlld3MsIHNldEF2YWlsYWJsZVJldmlld3NdID0gdXNlU3RhdGUoW10pO1xyXG4gICAgY29uc3QgW3Nlb1N0YXRzLCBzZXRTZW9TdGF0c10gPSB1c2VTdGF0ZShudWxsKTtcclxuICAgIGNvbnN0IFtyZXZpZXdQaWNrZXIsIHNldFJldmlld1BpY2tlcl0gPSB1c2VTdGF0ZSh7IHNlYXJjaDogJycsIHBhZ2U6IDEsIHBhZ2VzOiAxLCBsb2FkaW5nOiBmYWxzZSB9KTtcclxuICAgIGNvbnN0IFtjdXN0b21Eb21haW4sIHNldEN1c3RvbURvbWFpbl0gPSB1c2VTdGF0ZSh7IGRvbWFpbjogJycgfSk7XHJcbiAgICBjb25zdCBbc3RvcmV3aWRlRGlzY291bnQsIHNldFN0b3Jld2lkZURpc2NvdW50XSA9IHVzZVN0YXRlKDApO1xyXG4gICAgY29uc3QgW2FjdGl2ZUdyb3VwLCBzZXRBY3RpdmVHcm91cF0gPSB1c2VTdGF0ZSgnYnJhbmQnKTtcclxuICAgIGNvbnN0IFthY3RpdmVFbGVtZW50LCBzZXRBY3RpdmVFbGVtZW50XSA9IHVzZVN0YXRlKCdsb2dvJyk7XHJcbiAgICBjb25zdCB7IGRldmljZSwgc2V0RGV2aWNlLCBwcmV2aWV3UGFnZSwgc2V0UHJldmlld1BhZ2UgfSA9IHVzZVByZXZpZXdNb2RlKCk7XHJcbiAgICBjb25zdCBbbW9iaWxlV29ya3NwYWNlLCBzZXRNb2JpbGVXb3Jrc3BhY2VdID0gdXNlTW9iaWxlV29ya3NwYWNlKCk7XHJcbiAgICBjb25zdCBbaW5pdGlhbFNuYXBzaG90LCBzZXRJbml0aWFsU25hcHNob3RdID0gdXNlU3RhdGUoJycpO1xyXG4gICAgY29uc3QgW2VkaXRvckhpc3RvcnksIHNldEVkaXRvckhpc3RvcnldID0gdXNlU3RhdGUoeyBwYXN0OiBbXSwgZnV0dXJlOiBbXSB9KTtcclxuICAgIGNvbnN0IFtsYXN0U2F2ZWRBdCwgc2V0TGFzdFNhdmVkQXRdID0gdXNlU3RhdGUoJycpO1xyXG4gICAgY29uc3QgW2xhc3RQdWJsaXNoZWRBdCwgc2V0TGFzdFB1Ymxpc2hlZEF0XSA9IHVzZVN0YXRlKCcnKTtcclxuICAgIGNvbnN0IFt0aGVtZVJldmlzaW9uLCBzZXRUaGVtZVJldmlzaW9uXSA9IHVzZVN0YXRlKDApO1xyXG4gICAgY29uc3QgW3JldmlzaW9ucywgc2V0UmV2aXNpb25zXSA9IHVzZVN0YXRlKFtdKTtcclxuICAgIGNvbnN0IFtyZWNvdmVyeURyYWZ0LCBzZXRSZWNvdmVyeURyYWZ0XSA9IHVzZVN0YXRlKG51bGwpO1xyXG4gICAgY29uc3QgW3RoZW1lQ29uZmxpY3QsIHNldFRoZW1lQ29uZmxpY3RdID0gdXNlU3RhdGUobnVsbCk7XHJcbiAgICBjb25zdCBbcHVibGlzaFJldmlld09wZW4sIHNldFB1Ymxpc2hSZXZpZXdPcGVuXSA9IHVzZVN0YXRlKGZhbHNlKTtcclxuICAgIGNvbnN0IFtpc3N1ZXNPcGVuLCBzZXRJc3N1ZXNPcGVuXSA9IHVzZVN0YXRlKGZhbHNlKTtcclxuICAgIGNvbnN0IFtoaXN0b3J5T3Blbiwgc2V0SGlzdG9yeU9wZW5dID0gdXNlU3RhdGUoZmFsc2UpO1xyXG4gICAgY29uc3QgW3RoZW1lR2FsbGVyeU9wZW4sIHNldFRoZW1lR2FsbGVyeU9wZW5dID0gdXNlU3RhdGUoZmFsc2UpO1xyXG4gICAgY29uc3QgW2luc3BlY3Rvck9wZW4sIHNldEluc3BlY3Rvck9wZW5dID0gdXNlU3RhdGUodHJ1ZSk7XHJcbiAgICBjb25zdCBbYWR2YW5jZWRDb2xvcnNPcGVuLCBzZXRBZHZhbmNlZENvbG9yc09wZW5dID0gdXNlU3RhdGUoZmFsc2UpO1xyXG4gICAgY29uc3QgW2NvbG9yTW9kZSwgc2V0Q29sb3JNb2RlXSA9IHVzZVN0YXRlKCdxdWljaycpO1xyXG4gICAgY29uc3QgW2NvbG9yU2VhcmNoLCBzZXRDb2xvclNlYXJjaF0gPSB1c2VTdGF0ZSgnJyk7XHJcbiAgICBjb25zdCBbb3BlbkNvbG9yU2VjdGlvbiwgc2V0T3BlbkNvbG9yU2VjdGlvbl0gPSB1c2VTdGF0ZSgncHJvZHVjdENhcmQnKTtcclxuICAgIGNvbnN0IGhpc3RvcnlNb2RlUmVmID0gdXNlUmVmKCdyZWNvcmQnKTtcclxuICAgIGNvbnN0IGxhc3RIaXN0b3J5U25hcHNob3RSZWYgPSB1c2VSZWYoJycpO1xyXG4gICAgY29uc3QgZGlydHlSZWYgPSB1c2VSZWYoZmFsc2UpO1xyXG4gICAgY29uc3Qge1xyXG4gICAgICAgIHJlbWVtYmVyVGVtcG9yYXJ5QXNzZXQsXHJcbiAgICAgICAgZGlzY2FyZFRlbXBvcmFyeUFzc2V0LFxyXG4gICAgICAgIGNsZWFyVGVtcG9yYXJ5QXNzZXRzXHJcbiAgICB9ID0gdXNlVGhlbWVNZWRpYSh7IHRoZW1lIH0pO1xyXG5cclxuICAgIGNvbnN0IHtcclxuICAgICAgICBjdXJyZW50U25hcHNob3QsXHJcbiAgICAgICAgaGFzVW5zYXZlZENoYW5nZXMsXHJcbiAgICAgICAgcHVibGlzaGVkVmVyc2lvbkxhYmVsXHJcbiAgICB9ID0gdXNlU3RvcmVCdWlsZGVyRGlydHlTdGF0ZSh7XHJcbiAgICAgICAgdGhlbWUsXHJcbiAgICAgICAgc2VhcmNoQWxpYXNlcyxcclxuICAgICAgICBjdXN0b21Eb21haW4sXHJcbiAgICAgICAgc3RvcmV3aWRlRGlzY291bnQsXHJcbiAgICAgICAgaW5pdGlhbFNuYXBzaG90XHJcbiAgICB9KTtcclxuICAgIGNvbnN0IGNhblVuZG8gPSBlZGl0b3JIaXN0b3J5LnBhc3QubGVuZ3RoID4gMDtcclxuICAgIGNvbnN0IGNhblJlZG8gPSBlZGl0b3JIaXN0b3J5LmZ1dHVyZS5sZW5ndGggPiAwO1xyXG4gICAgY29uc3QgYXV0b3NhdmUgPSB1c2VBdXRvc2F2ZVJlY292ZXJ5KHtcclxuICAgICAgICBzaG9wS2V5OiBoeWRyYXRlZFNob3BLZXksXHJcbiAgICAgICAgZW5hYmxlZDogaGFzVW5zYXZlZENoYW5nZXMgJiYgIXNhdmluZyxcclxuICAgICAgICBjdXJyZW50U25hcHNob3QsXHJcbiAgICAgICAgdGhlbWUsXHJcbiAgICAgICAgc2VhcmNoQWxpYXNlcyxcclxuICAgICAgICBjdXN0b21Eb21haW4sXHJcbiAgICAgICAgc3RvcmV3aWRlRGlzY291bnQsXHJcbiAgICAgICAgYmFzZWRPblJldmlzaW9uOiB0aGVtZVJldmlzaW9uLFxyXG4gICAgICAgIGluaXRpYWxEcmFmdFZlcnNpb246IGJvb3RzdHJhcD8uZHJhZnQ/LnVwZGF0ZWRBdCA/PyBudWxsXHJcbiAgICB9KTtcclxuICAgIHVzZUVmZmVjdCgoKSA9PiB7XHJcbiAgICAgICAgZGlydHlSZWYuY3VycmVudCA9IGhhc1Vuc2F2ZWRDaGFuZ2VzO1xyXG4gICAgfSwgW2hhc1Vuc2F2ZWRDaGFuZ2VzXSk7XHJcblxyXG4gICAgdXNlRWZmZWN0KCgpID0+IHtcclxuICAgICAgICBsZXQgY2hlY2tpbmcgPSBmYWxzZTtcclxuICAgICAgICBsZXQgYWN0aXZlID0gdHJ1ZTtcclxuICAgICAgICBjb25zdCByZWZyZXNoU2VvU3RhdHVzID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoY2hlY2tpbmcpIHJldHVybjtcclxuICAgICAgICAgICAgY2hlY2tpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBBUEkuZ2V0KCcvc3RvcmUtYnVpbGRlci9hZG1pbi9zZW8vYm9vdHN0cmFwJyk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWFjdGl2ZSkgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2VvQm9vdHN0cmFwID0gcmVzcG9uc2UuZGF0YT8uZGF0YTtcclxuICAgICAgICAgICAgICAgIGlmIChzZW9Cb290c3RyYXA/LnNlb1N0YXRzKSBzZXRTZW9TdGF0cyhzZW9Cb290c3RyYXAuc2VvU3RhdHMpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbGF0ZXN0UmV2aXNpb24gPSBOdW1iZXIoc2VvQm9vdHN0cmFwPy50aGVtZVJldmlzaW9uIHx8IDApO1xyXG4gICAgICAgICAgICAgICAgaWYgKGxhdGVzdFJldmlzaW9uIDw9IHRoZW1lUmV2aXNpb24pIHJldHVybjtcclxuICAgICAgICAgICAgICAgIGlmIChkaXJ0eVJlZi5jdXJyZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VGhlbWVDb25mbGljdCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhdGVzdFJldmlzaW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0UHVibGlzaGVkQXQ6IHNlb0Jvb3RzdHJhcD8ubGFzdFB1Ymxpc2hlZEF0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnSG9tZXBhZ2UgU0VPIG9yIHN0b3JlZnJvbnQgc2V0dGluZ3Mgd2VyZSBwdWJsaXNoZWQgaW4gYW5vdGhlciBzZXNzaW9uLidcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBzZXRIeWRyYXRlZFNob3BLZXkoJycpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgcmVsb2FkQm9vdHN0cmFwKHsga2VlcEN1cnJlbnQ6IHRydWUgfSk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAgICAgLy8gS2VlcCB0aGUgY3VycmVudCBlZGl0b3Igc3RhdGUgd2hlbiB0aGUgYmFja2dyb3VuZCBzdGF0dXMgY2hlY2sgZmFpbHMuXHJcbiAgICAgICAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgICAgICAgICBjaGVja2luZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCByZWZyZXNoU2VvU3RhdHVzKTtcclxuICAgICAgICByZXR1cm4gKCkgPT4geyBhY3RpdmUgPSBmYWxzZTsgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgcmVmcmVzaFNlb1N0YXR1cyk7IH07XHJcbiAgICB9LCBbcmVsb2FkQm9vdHN0cmFwLCB0aGVtZVJldmlzaW9uXSk7XHJcblxyXG4gICAgdXNlRWZmZWN0KCgpID0+IHtcclxuICAgICAgICBjb25zdCBsb2NhbCA9IGF1dG9zYXZlLmxvY2FsUmVjb3Zlcnk7XHJcbiAgICAgICAgaWYgKCFsb2NhbD8uc25hcHNob3QgfHwgcmVjb3ZlcnlEcmFmdCB8fCBOdW1iZXIobG9jYWwuYmFzZWRPblJldmlzaW9uIHx8IDApICE9PSB0aGVtZVJldmlzaW9uKSByZXR1cm47XHJcbiAgICAgICAgaWYgKGxvY2FsLnNuYXBzaG90ICE9PSBpbml0aWFsU25hcHNob3QpIHtcclxuICAgICAgICAgICAgY29uc3QgdGltZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiBzZXRSZWNvdmVyeURyYWZ0KHsgLi4ubG9jYWwsIHNvdXJjZTogJ2xvY2FsJyB9KSwgMCk7XHJcbiAgICAgICAgICAgIHJldHVybiAoKSA9PiB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH0sIFthdXRvc2F2ZS5sb2NhbFJlY292ZXJ5LCBpbml0aWFsU25hcHNob3QsIHJlY292ZXJ5RHJhZnQsIHRoZW1lUmV2aXNpb25dKTtcclxuXHJcbiAgICBjb25zdCBzZWxlY3RlZExhYmVsID0gdXNlTWVtbygoKSA9PiB7XHJcbiAgICAgICAgY29uc3Qgc2VsZWN0aW9uVGhlbWUgPSB7IGhvbWVwYWdlU2VjdGlvbnM6IHRoZW1lLmhvbWVwYWdlU2VjdGlvbnMsIG5hdmlnYXRpb246IHRoZW1lLm5hdmlnYXRpb24gfTtcclxuICAgICAgICByZXR1cm4gcmVzb2x2ZUVkaXRvckNvbXBvbmVudChhY3RpdmVFbGVtZW50LCBzZWxlY3Rpb25UaGVtZSk/LmxhYmVsIHx8IHNldHRpbmdzR3JvdXBzLmZpbmQoaXRlbSA9PiBpdGVtLmlkID09PSBhY3RpdmVHcm91cCk/LmxhYmVsIHx8ICdTdG9yZSBlbGVtZW50JztcclxuICAgIH0sIFthY3RpdmVFbGVtZW50LCBhY3RpdmVHcm91cCwgdGhlbWVdKTtcclxuICAgIGNvbnN0IHNlbGVjdGVkSXNMb2NrZWRMYXlvdXQgPSB1c2VNZW1vKCgpID0+IHtcclxuICAgICAgICBpZiAoZml4ZWRQcmV2aWV3RWxlbWVudHMuaGFzKGFjdGl2ZUVsZW1lbnQpKSByZXR1cm4gdHJ1ZTtcclxuICAgICAgICBpZiAoIWFjdGl2ZUVsZW1lbnQ/LnN0YXJ0c1dpdGgoJ3NlY3Rpb24tJykgJiYgIWFjdGl2ZUVsZW1lbnQ/LnN0YXJ0c1dpdGgoJ3NlY3Rpb246JykpIHJldHVybiBmYWxzZTtcclxuICAgICAgICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXhGcm9tU2VsZWN0aW9uKGFjdGl2ZUVsZW1lbnQsIHRoZW1lKTtcclxuICAgICAgICByZXR1cm4gaXNIb21lcGFnZVNlY3Rpb25Mb2NrZWQodGhlbWUuaG9tZXBhZ2VTZWN0aW9ucz8uW3NlY3Rpb25JbmRleF0pO1xyXG4gICAgfSwgW2FjdGl2ZUVsZW1lbnQsIHRoZW1lXSk7XHJcbiAgICBjb25zdCB0aGVtZUNhcGFiaWxpdGllcyA9IHVzZU1lbW8oKCkgPT4gZ2V0VGhlbWVDYXBhYmlsaXRpZXModGhlbWUsIHBsYW5BY2Nlc3MpLCBbdGhlbWUsIHBsYW5BY2Nlc3NdKTtcclxuICAgIGNvbnN0IHNlbGVjdGVkUGxhblJlc3RyaWN0aW9uID0gdXNlTWVtbygoKSA9PiBnZXRUaGVtZUVkaXRvclJlc3RyaWN0aW9uKGFjdGl2ZUdyb3VwLCB7XHJcbiAgICAgICAgdGhlbWUsIHBsYW5BY2Nlc3MsIHNlY3Rpb25JbmRleDogZ2V0U2VjdGlvbkluZGV4RnJvbVNlbGVjdGlvbihhY3RpdmVFbGVtZW50LCB0aGVtZSksXHJcbiAgICB9KSwgW2FjdGl2ZUVsZW1lbnQsIGFjdGl2ZUdyb3VwLCBwbGFuQWNjZXNzLCB0aGVtZV0pO1xyXG4gICAgY29uc3Qgc3RvcmVTZW9TaWduYWxzID0gdXNlTWVtbygoKSA9PiB7XHJcbiAgICAgICAgaWYgKHNlb1N0YXRzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBwcm9kdWN0Q291bnQ6IE51bWJlcihzZW9TdGF0cy5wcm9kdWN0cz8udG90YWwgfHwgMCksXHJcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uQ291bnQ6IE51bWJlcihzZW9TdGF0cy5jb2xsZWN0aW9ucz8udG90YWwgfHwgMCksXHJcbiAgICAgICAgICAgICAgICBpbWFnZUFsdENvdmVyYWdlOiBOdW1iZXIoc2VvU3RhdHMuaW1hZ2VBbHRDb3ZlcmFnZSB8fCAwKVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBwcm9kdWN0c1dpdGhBbHRUZXh0ID0gYXZhaWxhYmxlUHJvZHVjdHMuZmlsdGVyKHByb2R1Y3QgPT4gU3RyaW5nKHByb2R1Y3QuaW1hZ2VBbHRUZXh0IHx8ICcnKS50cmltKCkpLmxlbmd0aDtcclxuICAgICAgICBjb25zdCBjb2xsZWN0aW9uSWRzID0gbmV3IFNldChcclxuICAgICAgICAgICAgYXZhaWxhYmxlUHJvZHVjdHNcclxuICAgICAgICAgICAgICAgIC5mbGF0TWFwKHByb2R1Y3QgPT4gQXJyYXkuaXNBcnJheShwcm9kdWN0LmNvbGxlY3Rpb25zKSA/IHByb2R1Y3QuY29sbGVjdGlvbnMgOiBbXSlcclxuICAgICAgICAgICAgICAgIC5tYXAoU3RyaW5nKVxyXG4gICAgICAgICAgICAgICAgLmZpbHRlcihCb29sZWFuKVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHByb2R1Y3RDb3VudDogYXZhaWxhYmxlUHJvZHVjdHMubGVuZ3RoLFxyXG4gICAgICAgICAgICBjb2xsZWN0aW9uQ291bnQ6IGNvbGxlY3Rpb25JZHMuc2l6ZSxcclxuICAgICAgICAgICAgaW1hZ2VBbHRDb3ZlcmFnZTogYXZhaWxhYmxlUHJvZHVjdHMubGVuZ3RoID8gTWF0aC5yb3VuZCgocHJvZHVjdHNXaXRoQWx0VGV4dCAvIGF2YWlsYWJsZVByb2R1Y3RzLmxlbmd0aCkgKiAxMDApIDogMFxyXG4gICAgICAgIH07XHJcbiAgICB9LCBbYXZhaWxhYmxlUHJvZHVjdHMsIHNlb1N0YXRzXSk7XHJcbiAgICBjb25zdCBzdG9yZVNlb0hlYWx0aCA9IHVzZU1lbW8oKCkgPT4gc2NvcmVTdG9yZVNlbyh7XHJcbiAgICAgICAgdGhlbWUsXHJcbiAgICAgICAgc2hvcE5hbWUsXHJcbiAgICAgICAgc2VhcmNoQWxpYXNlcyxcclxuICAgICAgICBwcm9kdWN0Q291bnQ6IHN0b3JlU2VvU2lnbmFscy5wcm9kdWN0Q291bnQsXHJcbiAgICAgICAgY3VzdG9tRG9tYWluLFxyXG4gICAgICAgIGNvbGxlY3Rpb25Db3VudDogc3RvcmVTZW9TaWduYWxzLmNvbGxlY3Rpb25Db3VudCxcclxuICAgICAgICBpbWFnZUFsdENvdmVyYWdlOiBzdG9yZVNlb1NpZ25hbHMuaW1hZ2VBbHRDb3ZlcmFnZVxyXG4gICAgfSksIFtjdXN0b21Eb21haW4sIHNlYXJjaEFsaWFzZXMsIHNob3BOYW1lLCBzdG9yZVNlb1NpZ25hbHMsIHRoZW1lXSk7XHJcbiAgICBjb25zdCBwdWJsaXNoQ2hhbmdlU3VtbWFyeSA9IHVzZU1lbW8oXHJcbiAgICAgICAgKCkgPT4gc3VtbWFyaXplVGhlbWVDaGFuZ2VzKHNhdmVkVGhlbWUsIHRoZW1lKSxcclxuICAgICAgICBbc2F2ZWRUaGVtZSwgdGhlbWVdXHJcbiAgICApO1xyXG4gICAgY29uc3QgbGl2ZVN0b3JlVXJsID0gdXNlTWVtbygoKSA9PiB7XHJcbiAgICAgICAgaWYgKGlzQ3VzdG9tRG9tYWluQ29ubmVjdGVkKGN1c3RvbURvbWFpbikpIHJldHVybiBgaHR0cHM6Ly8ke2N1c3RvbURvbWFpbi5kb21haW59YDtcclxuICAgICAgICBpZiAoIXNob3BTdWJkb21haW4pIHJldHVybiAnJztcclxuICAgICAgICBjb25zdCBjb25maWd1cmVkQmFzZSA9IFN0cmluZyhpbXBvcnQubWV0YS5lbnYuVklURV9BUElfRE9NQUlOIHx8ICdsb2NhbGhvc3Q6MzAwMCcpLnJlcGxhY2UoL15odHRwcz86XFwvXFwvLywgJycpLnJlcGxhY2UoL153d3dcXC4vLCAnJyk7XHJcbiAgICAgICAgcmV0dXJuIGAke2NvbmZpZ3VyZWRCYXNlLmluY2x1ZGVzKCdsb2NhbGhvc3QnKSA/ICdodHRwJyA6ICdodHRwcyd9Oi8vJHtzaG9wU3ViZG9tYWlufS4ke2NvbmZpZ3VyZWRCYXNlfWA7XHJcbiAgICB9LCBbY3VzdG9tRG9tYWluLCBzaG9wU3ViZG9tYWluXSk7XHJcblxyXG4gICAgY29uc3Qgc2VsZWN0RWRpdG9yVGFyZ2V0ID0gKHRhcmdldCkgPT4ge1xyXG4gICAgICAgIGlmICghdGFyZ2V0KSByZXR1cm47XHJcbiAgICAgICAgY29uc3Qgc2VsZWN0aW9uID0gcmVzb2x2ZUVkaXRvckNvbXBvbmVudCh0YXJnZXQsIHRoZW1lKTtcclxuICAgICAgICBzZXRBY3RpdmVFbGVtZW50KHRhcmdldCk7XHJcbiAgICAgICAgaWYgKHNlbGVjdGlvbj8uZ3JvdXApIHNldEFjdGl2ZUdyb3VwKHNlbGVjdGlvbi5ncm91cCk7XHJcbiAgICAgICAgc2V0SW5zcGVjdG9yT3Blbih0cnVlKTtcclxuICAgICAgICBzZXRNb2JpbGVXb3Jrc3BhY2UoJ2VkaXQnKTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3Qgc2VsZWN0U2V0dGluZ3NHcm91cCA9IChncm91cElkKSA9PiB7XHJcbiAgICAgICAgc2V0QWN0aXZlR3JvdXAoZ3JvdXBJZCk7XHJcbiAgICAgICAgc2V0QWN0aXZlRWxlbWVudChncm91cEVsZW1lbnRNYXBbZ3JvdXBJZF0gfHwgZ3JvdXBJZCk7XHJcbiAgICAgICAgc2V0SW5zcGVjdG9yT3Blbih0cnVlKTtcclxuICAgICAgICBzZXRNb2JpbGVXb3Jrc3BhY2UoJ2VkaXQnKTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgYXBwbHlQcmVidWlsdFRoZW1lID0gYXN5bmMgKHByZXNldCkgPT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChwcmVzZXQuaWQgPT09ICdhdGVsaWVyLWVkaXRvcmlhbCcgJiYgYm9vdHN0cmFwPy50aGVtZUF2YWlsYWJpbGl0eT8uWydhdGVsaWVyLWVkaXRvcmlhbCddPy5hdmFpbGFibGUgIT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQXRlbGllciBFZGl0b3JpYWwgaXMgbm90IGF2YWlsYWJsZSBmb3IgdGhpcyBzdG9yZS4nKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCB7IHJlc29sdmVQcmVidWlsdFRoZW1lIH0gPSBhd2FpdCBpbXBvcnQoJ0BzY2FsZXVwL3N0b3JlZnJvbnQtdGhlbWUvcHJlYnVpbHQnKTtcclxuICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRUaGVtZSA9IHJlc29sdmVQcmVidWlsdFRoZW1lKHtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRUaGVtZTogdGhlbWUsXHJcbiAgICAgICAgICAgICAgICBwcmVzZXRJZDogcHJlc2V0LmlkLFxyXG4gICAgICAgICAgICAgICAgcGxhbkFjY2VzcyxcclxuICAgICAgICAgICAgICAgIGNyZWF0ZVNlY3Rpb25JZDogY3JlYXRlQnVpbGRlclNlY3Rpb25JZFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgc2V0VGhlbWUocmVzb2x2ZWRUaGVtZSk7XHJcbiAgICAgICAgICAgIHRvYXN0LnN1Y2Nlc3MoYCR7cHJlc2V0Lm5hbWV9IGFwcGxpZWQgdG8geW91ciBkcmFmdC4gUmV2aWV3IGl0IGJlZm9yZSBwdWJsaXNoaW5nLmApO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICB0b2FzdC5lcnJvcihlcnJvcj8ubWVzc2FnZSB8fCAnQ291bGQgbm90IGFwcGx5IHRoaXMgc3RvcmVmcm9udCB0aGVtZS4nKTtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgdmFsaWRhdGlvbkRldGFpbHMgPSB1c2VNZW1vKCgpID0+IHtcclxuICAgICAgICBjb25zdCBjb2xvckVycm9ycyA9IGNvbG9yRmllbGRzXHJcbiAgICAgICAgICAgIC5maWx0ZXIoZmllbGQgPT4gIWlzSGV4Q29sb3IodGhlbWUuY29sb3JzPy5bZmllbGQua2V5XSkpXHJcbiAgICAgICAgICAgIC5tYXAoZmllbGQgPT4gKHsgcGF0aDogYGNvbG9ycy4ke2ZpZWxkLmtleX1gLCBtZXNzYWdlOiBgJHtmaWVsZC5sYWJlbH0gbXVzdCBiZSBhIHZhbGlkIGhleCBjb2xvci5gLCBncm91cDogJ2NvbG9ycycgfSkpO1xyXG4gICAgICAgIGNvbnN0IG5lc3RlZENvbG9yRXJyb3JzID0gbmVzdGVkQ29sb3JGaWVsZHNcclxuICAgICAgICAgICAgLmZpbHRlcihmaWVsZCA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGdldENvbG9yUGF0aFZhbHVlKHRoZW1lLmNvbG9ycywgZmllbGQucGF0aCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgJiYgIWlzSGV4Q29sb3IodmFsdWUpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAubWFwKGZpZWxkID0+ICh7IHBhdGg6IGBjb2xvcnMuJHtmaWVsZC5wYXRofWAsIG1lc3NhZ2U6IGAke2ZpZWxkLmxhYmVsfSBtdXN0IGJlIGEgdmFsaWQgaGV4IGNvbG9yLmAsIGdyb3VwOiAnY29sb3JzJyB9KSk7XHJcbiAgICAgICAgY29uc3QgZGlzY291bnROdW1iZXIgPSBOdW1iZXIoc3RvcmV3aWRlRGlzY291bnQpO1xyXG4gICAgICAgIGNvbnN0IGRpc2NvdW50RXJyb3JzID0gTnVtYmVyLmlzTmFOKGRpc2NvdW50TnVtYmVyKSB8fCBkaXNjb3VudE51bWJlciA8IDAgfHwgZGlzY291bnROdW1iZXIgPiAxMDBcclxuICAgICAgICAgICAgPyBbeyBwYXRoOiAnc3RvcmV3aWRlRGlzY291bnQnLCBtZXNzYWdlOiAnU3RvcmV3aWRlIGRpc2NvdW50IG11c3QgYmUgYmV0d2VlbiAwIGFuZCAxMDAuJywgZ3JvdXA6ICdjaGVja291dCcgfV1cclxuICAgICAgICAgICAgOiBbXTtcclxuICAgICAgICBjb25zdCBuYXZFcnJvcnMgPSAodGhlbWUubmF2aWdhdGlvbiB8fCBbXSlcclxuICAgICAgICAgICAgLmZpbHRlcihpdGVtID0+IGl0ZW0/LnVybCAmJiAhaXRlbT8ubGFiZWwpXHJcbiAgICAgICAgICAgIC5tYXAoKF8sIGluZGV4KSA9PiAoeyBwYXRoOiBgbmF2aWdhdGlvbi4ke2luZGV4fS5sYWJlbGAsIG1lc3NhZ2U6ICdOYXZpZ2F0aW9uIGxpbmtzIHdpdGggYSBVUkwgbmVlZCBhIGxhYmVsLicsIGdyb3VwOiAnbmF2aWdhdGlvbicgfSkpO1xyXG4gICAgICAgIGNvbnN0IG5hdkNoaWxkRXJyb3JzID0gKHRoZW1lLm5hdmlnYXRpb24gfHwgW10pXHJcbiAgICAgICAgICAgIC5mbGF0TWFwKGl0ZW0gPT4gaXRlbT8uY2hpbGRyZW4gfHwgW10pXHJcbiAgICAgICAgICAgIC5maWx0ZXIoaXRlbSA9PiBpdGVtPy51cmwgJiYgIWl0ZW0/LmxhYmVsKVxyXG4gICAgICAgICAgICAubWFwKChfLCBpbmRleCkgPT4gKHsgcGF0aDogYG5hdmlnYXRpb24uY2hpbGRyZW4uJHtpbmRleH0ubGFiZWxgLCBtZXNzYWdlOiAnTmVzdGVkIG5hdmlnYXRpb24gbGlua3Mgd2l0aCBhIFVSTCBuZWVkIGEgbGFiZWwuJywgZ3JvdXA6ICduYXZpZ2F0aW9uJyB9KSk7XHJcbiAgICAgICAgY29uc3QgcHJvZHVjdENvbG9yRXJyb3JzID0gW1xyXG4gICAgICAgICAgICBbJ1Byb2R1Y3QgY2FyZCBwcmljZSBjb2xvcicsIHRoZW1lLnByb2R1Y3RDYXJkPy5wcmljZUNvbG9yIHx8IHRoZW1lLmNvbG9ycz8ucHJpY2VDb2xvcl0sXHJcbiAgICAgICAgICAgIFsnUHJvZHVjdCBjYXJkIGJ1dHRvbiBjb2xvcicsIHRoZW1lLnByb2R1Y3RDYXJkPy5idXR0b25Db2xvciB8fCB0aGVtZS5jb2xvcnM/LnByaW1hcnlCdXR0b25CZ11cclxuICAgICAgICBdXHJcbiAgICAgICAgICAgIC5maWx0ZXIoKFssIHZhbHVlXSkgPT4gdmFsdWUgJiYgIWlzSGV4Q29sb3IodmFsdWUpKVxyXG4gICAgICAgICAgICAubWFwKChbbGFiZWxdLCBpbmRleCkgPT4gKHsgcGF0aDogaW5kZXggPT09IDAgPyAncHJvZHVjdENhcmQucHJpY2VDb2xvcicgOiAncHJvZHVjdENhcmQuYnV0dG9uQ29sb3InLCBtZXNzYWdlOiBgJHtsYWJlbH0gbXVzdCBiZSBhIHZhbGlkIGhleCBjb2xvci5gLCBncm91cDogJ3Byb2R1Y3RzJyB9KSk7XHJcbiAgICAgICAgY29uc3QgY29udHJhY3RFcnJvcnMgPSB2YWxpZGF0ZVRoZW1lKHRoZW1lKS5lcnJvcnMubWFwKGVycm9yID0+ICh7XHJcbiAgICAgICAgICAgIC4uLmVycm9yLFxyXG4gICAgICAgICAgICBncm91cDogZXJyb3IucGF0aD8uc3RhcnRzV2l0aCgnc2VvLicpXHJcbiAgICAgICAgICAgICAgICA/ICdzZW8nXHJcbiAgICAgICAgICAgICAgICA6IGVycm9yLnBhdGg/LnN0YXJ0c1dpdGgoJ2hvbWVwYWdlU2VjdGlvbnMuJylcclxuICAgICAgICAgICAgICAgICAgICA/ICdzZWN0aW9ucydcclxuICAgICAgICAgICAgICAgICAgICA6IGVycm9yLnBhdGg/LnN0YXJ0c1dpdGgoJ25hdmlnYXRpb24uJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgPyAnbmF2aWdhdGlvbidcclxuICAgICAgICAgICAgICAgICAgICAgICAgOiAnYnJhbmQnXHJcbiAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICByZXR1cm4gWy4uLmNvbnRyYWN0RXJyb3JzLCAuLi5jb2xvckVycm9ycywgLi4ubmVzdGVkQ29sb3JFcnJvcnMsIC4uLmRpc2NvdW50RXJyb3JzLCAuLi5uYXZFcnJvcnMsIC4uLm5hdkNoaWxkRXJyb3JzLCAuLi5wcm9kdWN0Q29sb3JFcnJvcnNdO1xyXG4gICAgfSwgW3RoZW1lLCBzdG9yZXdpZGVEaXNjb3VudF0pO1xyXG4gICAgY29uc3QgdmFsaWRhdGlvbiA9IHVzZU1lbW8oKCkgPT4gdmFsaWRhdGlvbkRldGFpbHMubWFwKGVycm9yID0+IGVycm9yLm1lc3NhZ2UpLCBbdmFsaWRhdGlvbkRldGFpbHNdKTtcclxuXHJcbiAgICBjb25zdCBtZXJnZVByb2R1Y3RDYWNoZSA9IChwcm9kdWN0cyA9IFtdKSA9PiB7XHJcbiAgICAgICAgc2V0QXZhaWxhYmxlUHJvZHVjdHMocHJldiA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IG1hcCA9IG5ldyBNYXAocHJldi5tYXAocHJvZHVjdCA9PiBbU3RyaW5nKHByb2R1Y3QuX2lkKSwgcHJvZHVjdF0pKTtcclxuICAgICAgICAgICAgcHJvZHVjdHMuZm9yRWFjaChwcm9kdWN0ID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChwcm9kdWN0Py5faWQpIG1hcC5zZXQoU3RyaW5nKHByb2R1Y3QuX2lkKSwgeyAuLi5tYXAuZ2V0KFN0cmluZyhwcm9kdWN0Ll9pZCkpLCAuLi5wcm9kdWN0IH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIEFycmF5LmZyb20obWFwLnZhbHVlcygpKTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgbG9hZFByb2R1Y3RPcHRpb25zID0gYXN5bmMgKHsgcGFnZSA9IDEsIGFwcGVuZCA9IGZhbHNlLCBzZWFyY2ggPSBwcm9kdWN0UGlja2VyLnNlYXJjaCwgY2F0ZWdvcnkgPSBwcm9kdWN0UGlja2VyLmNhdGVnb3J5IH0gPSB7fSkgPT4ge1xyXG4gICAgICAgIHNldFByb2R1Y3RQaWNrZXIocHJldiA9PiAoeyAuLi5wcmV2LCBsb2FkaW5nOiB0cnVlIH0pKTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCB7IGRhdGEgfSA9IGF3YWl0IEFQSS5nZXQoJy9hZG1pbi9wcm9kdWN0cycsIHtcclxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xyXG4gICAgICAgICAgICAgICAgICAgIGxpbWl0OiAxMCxcclxuICAgICAgICAgICAgICAgICAgICBwYWdlLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXR1czogJ1B1Ymxpc2hlZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgc3RvcmVmcm9udFByZXZpZXc6ICd0cnVlJyxcclxuICAgICAgICAgICAgICAgICAgICAuLi4oc2VhcmNoID8geyBzZWFyY2ggfSA6IHt9KSxcclxuICAgICAgICAgICAgICAgICAgICAuLi4oY2F0ZWdvcnkgJiYgY2F0ZWdvcnkgIT09ICdBbGwnID8geyBjYXRlZ29yeSB9IDoge30pXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBjb25zdCBwcm9kdWN0cyA9IGRhdGEuZGF0YSB8fCBbXTtcclxuICAgICAgICAgICAgc2V0UHJvZHVjdE9wdGlvbnMocHJldiA9PiBhcHBlbmQgPyBbLi4ucHJldiwgLi4ucHJvZHVjdHMuZmlsdGVyKHByb2R1Y3QgPT4gIXByZXYuc29tZShpdGVtID0+IGl0ZW0uX2lkID09PSBwcm9kdWN0Ll9pZCkpXSA6IHByb2R1Y3RzKTtcclxuICAgICAgICAgICAgY29uc3QgcHJldmlld0NhcmRzID0gbmV3IE1hcCgoZGF0YS5wcmV2aWV3UHJvZHVjdHMgfHwgW10pLm1hcChwcm9kdWN0ID0+IFtTdHJpbmcocHJvZHVjdC5faWQpLCBwcm9kdWN0XSkpO1xyXG4gICAgICAgICAgICBtZXJnZVByb2R1Y3RDYWNoZShwcm9kdWN0cy5tYXAocHJvZHVjdCA9PiAoeyAuLi5wcm9kdWN0LFxyXG4gICAgICAgICAgICAgICAgLi4uKEFycmF5LmlzQXJyYXkoZGF0YS5wcmV2aWV3UHJvZHVjdHMpID8geyBwcmV2aWV3Q2FyZDogcHJldmlld0NhcmRzLmdldChTdHJpbmcocHJvZHVjdC5faWQpKSB8fCBudWxsIH0gOiB7fSlcclxuICAgICAgICAgICAgfSkpKTtcclxuICAgICAgICAgICAgLy8gS2VlcCBwdWJsaWMgY2F0ZWdvcmllcyBmcm9tIGJvb3RzdHJhcDsgdGhlIHByaXZhdGUgcGlja2VyIHJlc3BvbnNlXHJcbiAgICAgICAgICAgIC8vIGNhbiBjb250YWluIGNhdGVnb3JpZXMgYmVsb25naW5nIG9ubHkgdG8gdW5wdWJsaXNoZWQgcHJvZHVjdHMuXHJcbiAgICAgICAgICAgIHNldFByb2R1Y3RQaWNrZXIocHJldiA9PiAoe1xyXG4gICAgICAgICAgICAgICAgLi4ucHJldixcclxuICAgICAgICAgICAgICAgIHNlYXJjaCxcclxuICAgICAgICAgICAgICAgIGNhdGVnb3J5LFxyXG4gICAgICAgICAgICAgICAgcGFnZTogZGF0YS5wYWdpbmF0aW9uPy5wYWdlIHx8IHBhZ2UsXHJcbiAgICAgICAgICAgICAgICBwYWdlczogZGF0YS5wYWdpbmF0aW9uPy5wYWdlcyB8fCAxLFxyXG4gICAgICAgICAgICAgICAgbG9hZGluZzogZmFsc2VcclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICBzZXRQcm9kdWN0UGlja2VyKHByZXYgPT4gKHsgLi4ucHJldiwgbG9hZGluZzogZmFsc2UgfSkpO1xyXG4gICAgICAgICAgICB0b2FzdC5lcnJvcignRmFpbGVkIHRvIGxvYWQgcHJvZHVjdHMgZm9yIHNlbGVjdGlvbicpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgbG9hZFJldmlld09wdGlvbnMgPSBhc3luYyAoeyBwYWdlID0gMSwgYXBwZW5kID0gZmFsc2UsIHNlYXJjaCA9IHJldmlld1BpY2tlci5zZWFyY2gsIGlkcyA9ICcnIH0gPSB7fSkgPT4ge1xyXG4gICAgICAgIHNldFJldmlld1BpY2tlcihwcmV2ID0+ICh7IC4uLnByZXYsIGxvYWRpbmc6IHRydWUgfSkpO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgZGF0YSB9ID0gYXdhaXQgQVBJLmdldCgnL3N0b3JlLWJ1aWxkZXIvYWRtaW4vcmV2aWV3cycsIHtcclxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xyXG4gICAgICAgICAgICAgICAgICAgIHBhZ2UsXHJcbiAgICAgICAgICAgICAgICAgICAgbGltaXQ6IDEwLFxyXG4gICAgICAgICAgICAgICAgICAgIHJhdGluZzogNSxcclxuICAgICAgICAgICAgICAgICAgICAuLi4oc2VhcmNoID8geyBzZWFyY2ggfSA6IHt9KSxcclxuICAgICAgICAgICAgICAgICAgICAuLi4oaWRzID8geyBpZHMgfSA6IHt9KVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgY29uc3QgcmV2aWV3cyA9IGRhdGEuZGF0YSB8fCBbXTtcclxuICAgICAgICAgICAgc2V0QXZhaWxhYmxlUmV2aWV3cyhwcmV2ID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkSWRzID0gbmV3IFNldCgodGhlbWUuaG9tZXBhZ2VTZWN0aW9ucyB8fCBbXSlcclxuICAgICAgICAgICAgICAgICAgICAuZmxhdE1hcChzZWN0aW9uID0+IHNlY3Rpb24udHlwZSA9PT0gJ1Jldmlld3MnID8gKHNlY3Rpb24uc2V0dGluZ3M/LnJldmlld0lkcyB8fCBbXSkgOiBbXSlcclxuICAgICAgICAgICAgICAgICAgICAubWFwKFN0cmluZykpO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRFeGlzdGluZyA9IHByZXYuZmlsdGVyKHJldmlldyA9PiBzZWxlY3RlZElkcy5oYXMoU3RyaW5nKHJldmlldy5faWQpKSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoaWRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWFwID0gbmV3IE1hcChwcmV2Lm1hcChyZXZpZXcgPT4gW1N0cmluZyhyZXZpZXcuX2lkKSwgcmV2aWV3XSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldmlld3MuZm9yRWFjaChyZXZpZXcgPT4gbWFwLnNldChTdHJpbmcocmV2aWV3Ll9pZCksIHJldmlldykpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBBcnJheS5mcm9tKG1hcC52YWx1ZXMoKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoIWFwcGVuZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hcCA9IG5ldyBNYXAoc2VsZWN0ZWRFeGlzdGluZy5tYXAocmV2aWV3ID0+IFtTdHJpbmcocmV2aWV3Ll9pZCksIHJldmlld10pKTtcclxuICAgICAgICAgICAgICAgICAgICByZXZpZXdzLmZvckVhY2gocmV2aWV3ID0+IG1hcC5zZXQoU3RyaW5nKHJldmlldy5faWQpLCByZXZpZXcpKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gQXJyYXkuZnJvbShtYXAudmFsdWVzKCkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY29uc3QgbWFwID0gbmV3IE1hcChwcmV2Lm1hcChyZXZpZXcgPT4gW1N0cmluZyhyZXZpZXcuX2lkKSwgcmV2aWV3XSkpO1xyXG4gICAgICAgICAgICAgICAgcmV2aWV3cy5mb3JFYWNoKHJldmlldyA9PiBtYXAuc2V0KFN0cmluZyhyZXZpZXcuX2lkKSwgcmV2aWV3KSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gQXJyYXkuZnJvbShtYXAudmFsdWVzKCkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgc2V0UmV2aWV3UGlja2VyKHByZXYgPT4gKHtcclxuICAgICAgICAgICAgICAgIC4uLnByZXYsXHJcbiAgICAgICAgICAgICAgICBzZWFyY2gsXHJcbiAgICAgICAgICAgICAgICBwYWdlOiBkYXRhLnBhZ2luYXRpb24/LnBhZ2UgfHwgcGFnZSxcclxuICAgICAgICAgICAgICAgIHBhZ2VzOiBkYXRhLnBhZ2luYXRpb24/LnBhZ2VzIHx8IDEsXHJcbiAgICAgICAgICAgICAgICBsb2FkaW5nOiBmYWxzZVxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgIHNldFJldmlld1BpY2tlcihwcmV2ID0+ICh7IC4uLnByZXYsIGxvYWRpbmc6IGZhbHNlIH0pKTtcclxuICAgICAgICAgICAgdG9hc3QuZXJyb3IoJ0ZhaWxlZCB0byBsb2FkIHJldmlld3MnKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHVzZUVmZmVjdCgoKSA9PiB7XHJcbiAgICAgICAgaWYgKCFib290c3RyYXA/LnNob3ApIHJldHVybjtcclxuICAgICAgICBjb25zdCBzaG9wID0gYm9vdHN0cmFwLnNob3A7XHJcbiAgICAgICAgY29uc3Qgc2hvcEtleSA9IFN0cmluZyhzaG9wLl9pZCB8fCBzaG9wLmlkIHx8IHNob3Auc3ViZG9tYWluIHx8ICcnKTtcclxuICAgICAgICBjb25zdCBuZXh0UmV2aXNpb24gPSBOdW1iZXIoYm9vdHN0cmFwLnB1YmxpY2F0aW9uPy5yZXZpc2lvbiA/PyBzaG9wLnRoZW1lUmV2aXNpb24gPz8gMCk7XHJcbiAgICAgICAgY29uc3Qgc2FtZVNob3AgPSBoeWRyYXRlZFNob3BLZXkgJiYgaHlkcmF0ZWRTaG9wS2V5ID09PSBzaG9wS2V5O1xyXG5cclxuICAgICAgICBpZiAoc2FtZVNob3AgJiYgZGlydHlSZWYuY3VycmVudCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBjb25zdCBuZXh0VGhlbWUgPSBsb2FkQnVpbGRlclRoZW1lKHNob3AudGhlbWUgfHwge30pO1xyXG4gICAgICAgIGNvbnN0IG5leHRTZWFyY2hBbGlhc2VzID0gQXJyYXkuaXNBcnJheShzaG9wLnNlYXJjaEFsaWFzZXMpID8gc2hvcC5zZWFyY2hBbGlhc2VzIDogW107XHJcbiAgICAgICAgY29uc3QgbmV4dERvbWFpbiA9IHNob3AuY3VzdG9tRG9tYWluIHx8IHsgZG9tYWluOiAnJyB9O1xyXG4gICAgICAgIGNvbnN0IG5leHREaXNjb3VudCA9IE51bWJlcihzaG9wLnN0b3Jld2lkZURpc2NvdW50KSB8fCAwO1xyXG4gICAgICAgIGNvbnN0IGluaXRpYWxQcm9kdWN0cyA9IGJvb3RzdHJhcC5wcm9kdWN0cyB8fCBbXTtcclxuICAgICAgICBjb25zdCBpbml0aWFsUmV2aWV3cyA9IGJvb3RzdHJhcC5yZXZpZXdzIHx8IFtdO1xyXG4gICAgICAgIHNldFNob3BOYW1lKHNob3Auc2hvcE5hbWUgfHwgJycpO1xyXG4gICAgICAgIHNldFNob3BTdWJkb21haW4oc2hvcC5zdWJkb21haW4gfHwgJycpO1xyXG4gICAgICAgIHNldFBsYW5BY2Nlc3MoYm9vdHN0cmFwLnBsYW5BY2Nlc3MgfHwgc2hvcC5wbGFuQWNjZXNzIHx8IERFRkFVTFRfUExBTl9BQ0NFU1MpO1xyXG4gICAgICAgIHNldEh5ZHJhdGVkU2hvcEtleShzaG9wS2V5KTtcclxuICAgICAgICBzZXRTYXZlZFRoZW1lKG5leHRUaGVtZSk7XHJcbiAgICAgICAgc2V0VGhlbWUobmV4dFRoZW1lKTtcclxuICAgICAgICBzZXRTZWFyY2hBbGlhc2VzKG5leHRTZWFyY2hBbGlhc2VzKTtcclxuICAgICAgICBzZXRBdmFpbGFibGVQcm9kdWN0cyhpbml0aWFsUHJvZHVjdHMpO1xyXG4gICAgICAgIHNldFByb2R1Y3RPcHRpb25zKGluaXRpYWxQcm9kdWN0cy5zbGljZSgwLCAxMCkpO1xyXG4gICAgICAgIHNldFByb2R1Y3RDYXRlZ29yaWVzKGJvb3RzdHJhcC5jYXRlZ29yaWVzIHx8IFtdKTtcclxuICAgICAgICBzZXRQcm9kdWN0Q2F0ZWdvcnlEZXRhaWxzKGJvb3RzdHJhcC5jYXRlZ29yeURldGFpbHMgfHwgW10pO1xyXG4gICAgICAgIHNldEF2YWlsYWJsZVJldmlld3MoaW5pdGlhbFJldmlld3MpO1xyXG4gICAgICAgIHNldFNlb1N0YXRzKGJvb3RzdHJhcC5zZW9TdGF0cyB8fCBudWxsKTtcclxuICAgICAgICBzZXRDdXN0b21Eb21haW4obmV4dERvbWFpbik7XHJcbiAgICAgICAgc2V0U3RvcmV3aWRlRGlzY291bnQobmV4dERpc2NvdW50KTtcclxuICAgICAgICBzZXRUaGVtZVJldmlzaW9uKG5leHRSZXZpc2lvbik7XHJcbiAgICAgICAgc2V0UmV2aXNpb25zKGJvb3RzdHJhcC5yZXZpc2lvbnMgfHwgW10pO1xyXG4gICAgICAgIHNldExhc3RTYXZlZEF0KHNob3AubGFzdFB1Ymxpc2hlZEF0IHx8IHNob3AudXBkYXRlZEF0IHx8ICcnKTtcclxuICAgICAgICBzZXRMYXN0UHVibGlzaGVkQXQoYm9vdHN0cmFwLnB1YmxpY2F0aW9uPy5sYXN0UHVibGlzaGVkQXQgfHwgc2hvcC5sYXN0UHVibGlzaGVkQXQgfHwgJycpO1xyXG4gICAgICAgIGNvbnN0IGxvYWRlZFNuYXBzaG90ID0gc3RhYmxlU3RyaW5naWZ5KHsgdGhlbWU6IG5leHRUaGVtZSwgc2VhcmNoQWxpYXNlczogbmV4dFNlYXJjaEFsaWFzZXMsIGN1c3RvbURvbWFpbjogbmV4dERvbWFpbiwgc3RvcmV3aWRlRGlzY291bnQ6IG5leHREaXNjb3VudCB9KTtcclxuICAgICAgICBzZXRJbml0aWFsU25hcHNob3QobG9hZGVkU25hcHNob3QpO1xyXG4gICAgICAgIGxhc3RIaXN0b3J5U25hcHNob3RSZWYuY3VycmVudCA9IGxvYWRlZFNuYXBzaG90O1xyXG4gICAgICAgIHNldEVkaXRvckhpc3RvcnkoeyBwYXN0OiBbXSwgZnV0dXJlOiBbXSB9KTtcclxuXHJcbiAgICAgICAgY29uc3Qgc2VydmVyRHJhZnQgPSBib290c3RyYXAuZHJhZnQ7XHJcbiAgICAgICAgYXV0b3NhdmUucmVzZXRWZXJzaW9uKHNlcnZlckRyYWZ0Py51cGRhdGVkQXQgPz8gbnVsbCk7XHJcbiAgICAgICAgaWYgKHNlcnZlckRyYWZ0Py50aGVtZSAmJiAhc2VydmVyRHJhZnQuc3RhbGUpIHtcclxuICAgICAgICAgICAgY29uc3QgZHJhZnRTbmFwc2hvdCA9IHN0YWJsZVN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICB0aGVtZTogbG9hZEJ1aWxkZXJUaGVtZShzZXJ2ZXJEcmFmdC50aGVtZSksXHJcbiAgICAgICAgICAgICAgICBzZWFyY2hBbGlhc2VzOiBzZXJ2ZXJEcmFmdC5zZWFyY2hBbGlhc2VzIHx8IG5leHRTZWFyY2hBbGlhc2VzLFxyXG4gICAgICAgICAgICAgICAgY3VzdG9tRG9tYWluOiBzZXJ2ZXJEcmFmdC5jdXN0b21Eb21haW4gfHwgbmV4dERvbWFpbixcclxuICAgICAgICAgICAgICAgIHN0b3Jld2lkZURpc2NvdW50OiBOdW1iZXIoc2VydmVyRHJhZnQuc3RvcmV3aWRlRGlzY291bnQpIHx8IDBcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGlmIChkcmFmdFNuYXBzaG90ICE9PSBsb2FkZWRTbmFwc2hvdCkge1xyXG4gICAgICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoKCkgPT4gc2V0UmVjb3ZlcnlEcmFmdCh7IC4uLnNlcnZlckRyYWZ0LCBzbmFwc2hvdDogZHJhZnRTbmFwc2hvdCwgc291cmNlOiAnc2VydmVyJyB9KSwgMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9LCBbYm9vdHN0cmFwLCBoeWRyYXRlZFNob3BLZXldKTtcclxuXHJcbiAgICB1c2VFZmZlY3QoKCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGhhbmRsZUJlZm9yZVVubG9hZCA9IChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoIWhhc1Vuc2F2ZWRDaGFuZ2VzKSByZXR1cm47XHJcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIGV2ZW50LnJldHVyblZhbHVlID0gJyc7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2JlZm9yZXVubG9hZCcsIGhhbmRsZUJlZm9yZVVubG9hZCk7XHJcbiAgICAgICAgcmV0dXJuICgpID0+IHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdiZWZvcmV1bmxvYWQnLCBoYW5kbGVCZWZvcmVVbmxvYWQpO1xyXG4gICAgfSwgW2hhc1Vuc2F2ZWRDaGFuZ2VzXSk7XHJcblxyXG4gICAgdXNlRWZmZWN0KCgpID0+IHtcclxuICAgICAgICBpZiAobG9hZGluZykgcmV0dXJuO1xyXG5cclxuICAgICAgICBpZiAoIWxhc3RIaXN0b3J5U25hcHNob3RSZWYuY3VycmVudCkge1xyXG4gICAgICAgICAgICBsYXN0SGlzdG9yeVNuYXBzaG90UmVmLmN1cnJlbnQgPSBjdXJyZW50U25hcHNob3Q7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChoaXN0b3J5TW9kZVJlZi5jdXJyZW50ID09PSAnc2tpcCcpIHtcclxuICAgICAgICAgICAgaGlzdG9yeU1vZGVSZWYuY3VycmVudCA9ICdyZWNvcmQnO1xyXG4gICAgICAgICAgICBsYXN0SGlzdG9yeVNuYXBzaG90UmVmLmN1cnJlbnQgPSBjdXJyZW50U25hcHNob3Q7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChsYXN0SGlzdG9yeVNuYXBzaG90UmVmLmN1cnJlbnQgPT09IGN1cnJlbnRTbmFwc2hvdCkgcmV0dXJuIHVuZGVmaW5lZDtcclxuXHJcbiAgICAgICAgY29uc3QgdGltZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHByZXZpb3VzU25hcHNob3QgPSBsYXN0SGlzdG9yeVNuYXBzaG90UmVmLmN1cnJlbnQ7XHJcbiAgICAgICAgICAgIGlmICghcHJldmlvdXNTbmFwc2hvdCB8fCBwcmV2aW91c1NuYXBzaG90ID09PSBjdXJyZW50U25hcHNob3QpIHJldHVybjtcclxuICAgICAgICAgICAgbGFzdEhpc3RvcnlTbmFwc2hvdFJlZi5jdXJyZW50ID0gY3VycmVudFNuYXBzaG90O1xyXG4gICAgICAgICAgICBzZXRFZGl0b3JIaXN0b3J5KHByZXYgPT4gKHtcclxuICAgICAgICAgICAgICAgIHBhc3Q6IFsuLi5wcmV2LnBhc3QsIHByZXZpb3VzU25hcHNob3RdLnNsaWNlKC1ISVNUT1JZX0xJTUlUKSxcclxuICAgICAgICAgICAgICAgIGZ1dHVyZTogW11cclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgIH0sIDU1MCk7XHJcblxyXG4gICAgICAgIHJldHVybiAoKSA9PiB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVyKTtcclxuICAgIH0sIFtjdXJyZW50U25hcHNob3QsIGxvYWRpbmddKTtcclxuXHJcbiAgICBjb25zdCBzZXRDb2xvciA9IChrZXksIHZhbHVlKSA9PiB7XHJcbiAgICAgICAgc2V0VGhlbWUocHJldiA9PiAoe1xyXG4gICAgICAgICAgICAuLi5wcmV2LFxyXG4gICAgICAgICAgICBjb2xvcnM6IGFwcGx5Q29tcGF0aWJsZUNvbG9yVXBkYXRlcyhwcmV2LmNvbG9ycyB8fCB7fSwgeyBba2V5XTogdmFsdWUgfSlcclxuICAgICAgICB9KSk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IHNldENvbG9yUGF0aCA9IChwYXRoLCB2YWx1ZSkgPT4ge1xyXG4gICAgICAgIHNldFRoZW1lKHByZXYgPT4gKHtcclxuICAgICAgICAgICAgLi4ucHJldixcclxuICAgICAgICAgICAgY29sb3JzOiBzZXRDb2xvclBhdGhWYWx1ZShwcmV2LmNvbG9ycyB8fCB7fSwgcGF0aCwgdmFsdWUpXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBhcHBseUNvbG9yU2V0ID0gKGNvbG9ycyA9IHt9LCBsYWJlbCA9ICdQYWxldHRlJykgPT4ge1xyXG4gICAgICAgIHNldFRoZW1lKHByZXYgPT4gKHtcclxuICAgICAgICAgICAgLi4ucHJldixcclxuICAgICAgICAgICAgY29sb3JzOiBhcHBseUNvbG9yUGFsZXR0ZShwcmV2LmNvbG9ycyB8fCB7fSwgY29sb3JzKVxyXG4gICAgICAgIH0pKTtcclxuICAgICAgICB0b2FzdC5zdWNjZXNzKGAke2xhYmVsfSBhcHBsaWVkYCk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IGFwcGx5QnJhbmRDb2xvciA9ICgpID0+IHtcclxuICAgICAgICBjb25zdCBicmFuZENvbG9yID0gdGhlbWUuY29sb3JzPy5icmFuZD8ucHJpbWFyeSB8fCB0aGVtZS5jb2xvcnM/LmFjY2VudCB8fCBkZWZhdWx0VGhlbWUuY29sb3JzLmFjY2VudDtcclxuICAgICAgICBpZiAoIWlzSGV4Q29sb3IoYnJhbmRDb2xvcikpIHtcclxuICAgICAgICAgICAgdG9hc3QuZXJyb3IoJ0Nob29zZSBhIHZhbGlkIG1haW4gYnJhbmQgY29sb3IgZmlyc3QuJyk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgYXBwbHlDb2xvclNldChidWlsZEJyYW5kQ29sb3JTZXQoYnJhbmRDb2xvciksICdCcmFuZCBjb2xvcicpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCByZXNldENvbG9yUGFsZXR0ZSA9ICgpID0+IHtcclxuICAgICAgICBzZXRUaGVtZShwcmV2ID0+ICh7XHJcbiAgICAgICAgICAgIC4uLnByZXYsXHJcbiAgICAgICAgICAgIGNvbG9yczogeyAuLi5kZWZhdWx0VGhlbWUuY29sb3JzIH0sXHJcbiAgICAgICAgICAgIHByb2R1Y3RDYXJkOiB7XHJcbiAgICAgICAgICAgICAgICAuLi4ocHJldi5wcm9kdWN0Q2FyZCB8fCB7fSksXHJcbiAgICAgICAgICAgICAgICBwcmljZUNvbG9yOiBkZWZhdWx0VGhlbWUucHJvZHVjdENhcmQ/LnByaWNlQ29sb3IsXHJcbiAgICAgICAgICAgICAgICBidXR0b25Db2xvcjogZGVmYXVsdFRoZW1lLnByb2R1Y3RDYXJkPy5idXR0b25Db2xvclxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSkpO1xyXG4gICAgICAgIHRvYXN0LnN1Y2Nlc3MoJ0RlZmF1bHQgY29sb3IgcGFsZXR0ZSByZXN0b3JlZCcpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCByZXNldENvbG9yR3JvdXAgPSAoZ3JvdXBJZCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGRlZmF1bHRHcm91cCA9IGRlZmF1bHRUaGVtZS5jb2xvcnM/Lltncm91cElkXTtcclxuICAgICAgICBpZiAoIWRlZmF1bHRHcm91cCB8fCB0eXBlb2YgZGVmYXVsdEdyb3VwICE9PSAnb2JqZWN0JykgcmV0dXJuO1xyXG4gICAgICAgIHNldFRoZW1lKHByZXYgPT4gKHtcclxuICAgICAgICAgICAgLi4ucHJldixcclxuICAgICAgICAgICAgY29sb3JzOiBhcHBseUNvbXBhdGlibGVDb2xvclVwZGF0ZXMocHJldi5jb2xvcnMgfHwge30sIHsgW2dyb3VwSWRdOiB7IC4uLmRlZmF1bHRHcm91cCB9IH0pXHJcbiAgICAgICAgfSkpO1xyXG4gICAgICAgIHRvYXN0LnN1Y2Nlc3MoYCR7Y29sb3JTZWN0aW9uR3JvdXBzLmZpbmQoZ3JvdXAgPT4gZ3JvdXAuaWQgPT09IGdyb3VwSWQpPy50aXRsZSB8fCAnU2VjdGlvbid9IGNvbG9ycyByZXNldGApO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBnZXRUaGVtZUNvbG9yID0gKHBhdGgsIGZhbGxiYWNrID0gJyMwMDAwMDAnKSA9PiAoXHJcbiAgICAgICAgZ2V0Q29sb3JQYXRoVmFsdWUodGhlbWUuY29sb3JzLCBwYXRoKSB8fFxyXG4gICAgICAgIGdldENvbG9yUGF0aFZhbHVlKGRlZmF1bHRUaGVtZS5jb2xvcnMsIHBhdGgpIHx8XHJcbiAgICAgICAgdGhlbWUuY29sb3JzPy5bcGF0aF0gfHxcclxuICAgICAgICBkZWZhdWx0VGhlbWUuY29sb3JzPy5bcGF0aF0gfHxcclxuICAgICAgICBmYWxsYmFja1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBnZXRDb250cmFzdFdhcm5pbmcgPSAoZmllbGQpID0+IHtcclxuICAgICAgICBpZiAoIWZpZWxkLmNvbnRyYXN0V2l0aCkgcmV0dXJuICcnO1xyXG4gICAgICAgIGNvbnN0IGZvcmVncm91bmQgPSBnZXRUaGVtZUNvbG9yKGZpZWxkLnBhdGgpO1xyXG4gICAgICAgIGNvbnN0IGJhY2tncm91bmQgPSBnZXRUaGVtZUNvbG9yKGZpZWxkLmNvbnRyYXN0V2l0aCk7XHJcbiAgICAgICAgY29uc3QgcmF0aW8gPSBjb250cmFzdFJhdGlvKGZvcmVncm91bmQsIGJhY2tncm91bmQpO1xyXG4gICAgICAgIGlmIChyYXRpbyA9PT0gbnVsbCB8fCByYXRpbyA+PSA0LjUpIHJldHVybiAnJztcclxuICAgICAgICBjb25zdCBzdWdnZXN0aW9uID0gc3VnZ2VzdEFjY2Vzc2libGVGb3JlZ3JvdW5kKGZvcmVncm91bmQsIGJhY2tncm91bmQsIDQuNSk7XHJcbiAgICAgICAgcmV0dXJuIGBMb3cgY29udHJhc3Qgd2l0aCAke2ZpZWxkLmNvbnRyYXN0V2l0aC5yZXBsYWNlKCcuJywgJyAnKX0gKCR7cmF0aW8udG9GaXhlZCgyKX06MSkuIFN1Z2dlc3RlZCB0ZXh0IGNvbG9yOiAke3N1Z2dlc3Rpb259LmA7XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IHNldE1haW5CcmFuZENvbG9yID0gKHZhbHVlKSA9PiB7XHJcbiAgICAgICAgc2V0VGhlbWUocHJldiA9PiAoe1xyXG4gICAgICAgICAgICAuLi5wcmV2LFxyXG4gICAgICAgICAgICBjb2xvcnM6IGlzSGV4Q29sb3IodmFsdWUpXHJcbiAgICAgICAgICAgICAgICA/IGFwcGx5Q29tcGF0aWJsZUNvbG9yVXBkYXRlcyhwcmV2LmNvbG9ycyB8fCB7fSwgYnVpbGRCcmFuZENvbG9yU2V0KHZhbHVlKSlcclxuICAgICAgICAgICAgICAgIDogbWVyZ2VDb2xvclVwZGF0ZXMocHJldi5jb2xvcnMgfHwge30sIHtcclxuICAgICAgICAgICAgICAgICAgICBhY2NlbnQ6IHZhbHVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGJyYW5kOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLihwcmV2LmNvbG9ycz8uYnJhbmQgfHwge30pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmltYXJ5OiB2YWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWNjZW50OiB2YWx1ZVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBzZXRUaGVtZUdyb3VwID0gKGdyb3VwLCBrZXksIHZhbHVlKSA9PiB7XHJcbiAgICAgICAgc2V0VGhlbWUocHJldiA9PiB1cGRhdGVCdWlsZGVyVGhlbWVTZXR0aW5nKHByZXYsIGdyb3VwLCBrZXksIHZhbHVlKSk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IHVwZGF0ZUhlcm9TbGlkZXMgPSAodXBkYXRlcikgPT4ge1xyXG4gICAgICAgIHNldFRoZW1lKHByZXYgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50U2xpZGVzID0gZ2V0QnVpbGRlckhlcm9TbGlkZXMocHJldi5oZXJvKTtcclxuICAgICAgICAgICAgY29uc3QgbmV4dFNsaWRlcyA9IHVwZGF0ZXIoY3VycmVudFNsaWRlcylcclxuICAgICAgICAgICAgICAgIC5tYXAoKHNsaWRlLCBpbmRleCkgPT4gbm9ybWFsaXplSGVyb1NsaWRlRm9yQnVpbGRlcihzbGlkZSwgaW5kZXgsIHByZXYuaGVybykpXHJcbiAgICAgICAgICAgICAgICAuc2xpY2UoMCwgSEVST19TTElERV9MSU1JVCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNhZmVTbGlkZXMgPSBuZXh0U2xpZGVzLmxlbmd0aCA+IDAgPyBuZXh0U2xpZGVzIDogW2NyZWF0ZUhlcm9TbGlkZSh7IGlkOiBgaGVyby1zbGlkZS0ke0RhdGUubm93KCl9YCB9KV07XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgLi4ucHJldixcclxuICAgICAgICAgICAgICAgIGhlcm86IHN5bmNIZXJvTGVnYWN5RmllbGRzKHByZXYuaGVybywgc2FmZVNsaWRlcylcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgdXBkYXRlSGVyb1NsaWRlID0gKGluZGV4LCBrZXksIHZhbHVlKSA9PiB7XHJcbiAgICAgICAgdXBkYXRlSGVyb1NsaWRlcyhzbGlkZXMgPT4gc2xpZGVzLm1hcCgoc2xpZGUsIGkpID0+IChcclxuICAgICAgICAgICAgaSA9PT0gaW5kZXggPyB7IC4uLnNsaWRlLCBba2V5XTogdmFsdWUgfSA6IHNsaWRlXHJcbiAgICAgICAgKSkpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBhZGRIZXJvU2xpZGUgPSAoKSA9PiB7XHJcbiAgICAgICAgY29uc3QgY3VycmVudENvdW50ID0gZ2V0QnVpbGRlckhlcm9TbGlkZXModGhlbWUuaGVybykubGVuZ3RoO1xyXG4gICAgICAgIGlmIChjdXJyZW50Q291bnQgPj0gSEVST19TTElERV9MSU1JVCkge1xyXG4gICAgICAgICAgICB0b2FzdC5lcnJvcihgWW91IGNhbiBhZGQgdXAgdG8gJHtIRVJPX1NMSURFX0xJTUlUfSBoZXJvIHNsaWRlcy5gKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXBkYXRlSGVyb1NsaWRlcyhzbGlkZXMgPT4gW1xyXG4gICAgICAgICAgICAuLi5zbGlkZXMsXHJcbiAgICAgICAgICAgIGNyZWF0ZUhlcm9TbGlkZSh7XHJcbiAgICAgICAgICAgICAgICBpZDogYGhlcm8tc2xpZGUtJHtEYXRlLm5vdygpfWAsXHJcbiAgICAgICAgICAgICAgICB0aXRsZTogJ05ldyBzZWFzb25hbCBvZmZlcidcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICBdKTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgcmVtb3ZlSGVyb1NsaWRlID0gKGluZGV4KSA9PiB7XHJcbiAgICAgICAgY29uc3Qgc2xpZGUgPSBnZXRCdWlsZGVySGVyb1NsaWRlcyh0aGVtZS5oZXJvKVtpbmRleF07XHJcbiAgICAgICAgW3NsaWRlPy5kZXNrdG9wSW1hZ2UsIHNsaWRlPy5tb2JpbGVJbWFnZV0uZmlsdGVyKEJvb2xlYW4pLmZvckVhY2godXJsID0+IGRpc2NhcmRUZW1wb3JhcnlBc3NldCh1cmwpKTtcclxuICAgICAgICB1cGRhdGVIZXJvU2xpZGVzKHNsaWRlcyA9PiBzbGlkZXMuZmlsdGVyKChfLCBpKSA9PiBpICE9PSBpbmRleCkpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBtb3ZlSGVyb1NsaWRlID0gKGluZGV4LCBkaXJlY3Rpb24pID0+IHtcclxuICAgICAgICB1cGRhdGVIZXJvU2xpZGVzKHNsaWRlcyA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5leHRTbGlkZXMgPSBbLi4uc2xpZGVzXTtcclxuICAgICAgICAgICAgY29uc3QgdGFyZ2V0SW5kZXggPSBpbmRleCArIGRpcmVjdGlvbjtcclxuICAgICAgICAgICAgaWYgKHRhcmdldEluZGV4IDwgMCB8fCB0YXJnZXRJbmRleCA+PSBuZXh0U2xpZGVzLmxlbmd0aCkgcmV0dXJuIG5leHRTbGlkZXM7XHJcbiAgICAgICAgICAgIFtuZXh0U2xpZGVzW2luZGV4XSwgbmV4dFNsaWRlc1t0YXJnZXRJbmRleF1dID0gW25leHRTbGlkZXNbdGFyZ2V0SW5kZXhdLCBuZXh0U2xpZGVzW2luZGV4XV07XHJcbiAgICAgICAgICAgIHJldHVybiBuZXh0U2xpZGVzO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCB0b2dnbGVUaGVtZUdyb3VwID0gKGdyb3VwLCBrZXkpID0+IHtcclxuICAgICAgICBzZXRUaGVtZShwcmV2ID0+ICh7XHJcbiAgICAgICAgICAgIC4uLnByZXYsXHJcbiAgICAgICAgICAgIFtncm91cF06IHsgLi4uKHByZXZbZ3JvdXBdIHx8IHt9KSwgW2tleV06ICFwcmV2W2dyb3VwXT8uW2tleV0gfVxyXG4gICAgICAgIH0pKTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgdXBkYXRlSG9tZXBhZ2VTZWN0aW9uID0gKGluZGV4LCBmaWVsZCwgdmFsdWUpID0+IHtcclxuICAgICAgICBpZiAoWyd0eXBlJywgJ3NvcnRPcmRlciddLmluY2x1ZGVzKGZpZWxkKSAmJiAhdGhlbWVDYXBhYmlsaXRpZXMuc2VjdGlvblN0cnVjdHVyZS5lZGl0YWJsZSkgcmV0dXJuO1xyXG4gICAgICAgIGlmICghdGhlbWVDYXBhYmlsaXRpZXMuc2VjdGlvbnNbdGhlbWUuaG9tZXBhZ2VTZWN0aW9ucz8uW2luZGV4XT8udHlwZV0/LmVkaXRhYmxlKSByZXR1cm47XHJcbiAgICAgICAgc2V0VGhlbWUocHJldiA9PiAoe1xyXG4gICAgICAgICAgICAuLi5wcmV2LFxyXG4gICAgICAgICAgICBob21lcGFnZVNlY3Rpb25zOiAocHJldi5ob21lcGFnZVNlY3Rpb25zIHx8IFtdKS5tYXAoKHNlY3Rpb24sIGkpID0+IChcclxuICAgICAgICAgICAgICAgIGkgPT09IGluZGV4ICYmICFpc0hvbWVwYWdlU2VjdGlvbkxvY2tlZChzZWN0aW9uKSA/IHsgLi4uc2VjdGlvbiwgW2ZpZWxkXTogdmFsdWUgfSA6IHNlY3Rpb25cclxuICAgICAgICAgICAgKSlcclxuICAgICAgICB9KSk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IHVwZGF0ZUhvbWVwYWdlU2VjdGlvblNldHRpbmcgPSAoaW5kZXgsIGtleSwgdmFsdWUpID0+IHtcclxuICAgICAgICBpZiAoIXRoZW1lQ2FwYWJpbGl0aWVzLnNlY3Rpb25zW3RoZW1lLmhvbWVwYWdlU2VjdGlvbnM/LltpbmRleF0/LnR5cGVdPy5lZGl0YWJsZSkgcmV0dXJuO1xyXG4gICAgICAgIHNldFRoZW1lKHByZXYgPT4gKHtcclxuICAgICAgICAgICAgLi4ucHJldixcclxuICAgICAgICAgICAgaG9tZXBhZ2VTZWN0aW9uczogKHByZXYuaG9tZXBhZ2VTZWN0aW9ucyB8fCBbXSkubWFwKChzZWN0aW9uLCBpKSA9PiAoXHJcbiAgICAgICAgICAgICAgICBpID09PSBpbmRleCAmJiAoIWlzSG9tZXBhZ2VTZWN0aW9uTG9ja2VkKHNlY3Rpb24pIHx8IGtleSA9PT0gJ2lzTG9ja2VkJylcclxuICAgICAgICAgICAgICAgICAgICA/IHsgLi4uc2VjdGlvbiwgc2V0dGluZ3M6IHsgLi4uKHNlY3Rpb24uc2V0dGluZ3MgfHwge30pLCBba2V5XTogdmFsdWUgfSB9XHJcbiAgICAgICAgICAgICAgICAgICAgOiBzZWN0aW9uXHJcbiAgICAgICAgICAgICkpXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCB1cGRhdGVIb21lcGFnZVNlY3Rpb25Nb2JpbGVTZXR0aW5nID0gKGluZGV4LCBrZXksIHZhbHVlKSA9PiB7XHJcbiAgICAgICAgaWYgKCF0aGVtZUNhcGFiaWxpdGllcy5zZWN0aW9uc1t0aGVtZS5ob21lcGFnZVNlY3Rpb25zPy5baW5kZXhdPy50eXBlXT8uZWRpdGFibGUpIHJldHVybjtcclxuICAgICAgICBzZXRUaGVtZShwcmV2ID0+ICh7XHJcbiAgICAgICAgICAgIC4uLnByZXYsXHJcbiAgICAgICAgICAgIGhvbWVwYWdlU2VjdGlvbnM6IChwcmV2LmhvbWVwYWdlU2VjdGlvbnMgfHwgW10pLm1hcCgoc2VjdGlvbiwgaSkgPT4gKFxyXG4gICAgICAgICAgICAgICAgaSA9PT0gaW5kZXggJiYgIWlzSG9tZXBhZ2VTZWN0aW9uTG9ja2VkKHNlY3Rpb24pXHJcbiAgICAgICAgICAgICAgICAgICAgPyB7IC4uLnNlY3Rpb24sIG1vYmlsZVNldHRpbmdzOiB7IC4uLihzZWN0aW9uLm1vYmlsZVNldHRpbmdzIHx8IHt9KSwgW2tleV06IHZhbHVlIH0gfVxyXG4gICAgICAgICAgICAgICAgICAgIDogc2VjdGlvblxyXG4gICAgICAgICAgICApKVxyXG4gICAgICAgIH0pKTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgdXBkYXRlSG9tZXBhZ2VTZWN0aW9uRGVza3RvcFNldHRpbmcgPSAoaW5kZXgsIGtleSwgdmFsdWUpID0+IHtcclxuICAgICAgICBpZiAoIXRoZW1lQ2FwYWJpbGl0aWVzLnNlY3Rpb25zW3RoZW1lLmhvbWVwYWdlU2VjdGlvbnM/LltpbmRleF0/LnR5cGVdPy5lZGl0YWJsZSkgcmV0dXJuO1xyXG4gICAgICAgIHNldFRoZW1lKHByZXYgPT4gKHtcclxuICAgICAgICAgICAgLi4ucHJldixcclxuICAgICAgICAgICAgaG9tZXBhZ2VTZWN0aW9uczogKHByZXYuaG9tZXBhZ2VTZWN0aW9ucyB8fCBbXSkubWFwKChzZWN0aW9uLCBpKSA9PiAoXHJcbiAgICAgICAgICAgICAgICBpID09PSBpbmRleCAmJiAhaXNIb21lcGFnZVNlY3Rpb25Mb2NrZWQoc2VjdGlvbilcclxuICAgICAgICAgICAgICAgICAgICA/IHsgLi4uc2VjdGlvbiwgZGVza3RvcFNldHRpbmdzOiB7IC4uLihzZWN0aW9uLmRlc2t0b3BTZXR0aW5ncyB8fCB7fSksIFtrZXldOiB2YWx1ZSB9IH1cclxuICAgICAgICAgICAgICAgICAgICA6IHNlY3Rpb25cclxuICAgICAgICAgICAgKSlcclxuICAgICAgICB9KSk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IHVwZGF0ZUZlYXR1cmVkUHJvZHVjdHNTZWxlY3Rpb24gPSAoaW5kZXgsIHByb2R1Y3RJZCwgY2hlY2tlZCkgPT4ge1xyXG4gICAgICAgIHNldFRoZW1lKHByZXYgPT4gKHtcclxuICAgICAgICAgICAgLi4ucHJldixcclxuICAgICAgICAgICAgaG9tZXBhZ2VTZWN0aW9uczogKHByZXYuaG9tZXBhZ2VTZWN0aW9ucyB8fCBbXSkubWFwKChzZWN0aW9uLCBpKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaSAhPT0gaW5kZXggfHwgaXNIb21lcGFnZVNlY3Rpb25Mb2NrZWQoc2VjdGlvbikpIHJldHVybiBzZWN0aW9uO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudElkcyA9IHNlY3Rpb24uc2V0dGluZ3M/LnByb2R1Y3RJZHMgfHwgc2VjdGlvbi5zZXR0aW5ncz8uc291cmNlPy5wcm9kdWN0SWRzIHx8IFtdO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbmV4dElkcyA9IGNoZWNrZWRcclxuICAgICAgICAgICAgICAgICAgICA/IFsuLi5uZXcgU2V0KFsuLi5jdXJyZW50SWRzLCBwcm9kdWN0SWRdKV1cclxuICAgICAgICAgICAgICAgICAgICA6IGN1cnJlbnRJZHMuZmlsdGVyKGlkID0+IGlkICE9PSBwcm9kdWN0SWQpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLi4uc2VjdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAuLi4oc2VjdGlvbi5zZXR0aW5ncyB8fCB7fSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2R1Y3RJZHM6IG5leHRJZHMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTogeyB0eXBlOiAnbWFudWFsJywgcHJvZHVjdElkczogbmV4dElkcyB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IHsgdHlwZTogJ21hbnVhbCcsIHByb2R1Y3RJZHM6IG5leHRJZHMgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KSk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IHVwZGF0ZVJldmlld1NlbGVjdGlvbiA9IChpbmRleCwgcmV2aWV3SWQsIGNoZWNrZWQpID0+IHtcclxuICAgICAgICBzZXRUaGVtZShwcmV2ID0+ICh7XHJcbiAgICAgICAgICAgIC4uLnByZXYsXHJcbiAgICAgICAgICAgIGhvbWVwYWdlU2VjdGlvbnM6IChwcmV2LmhvbWVwYWdlU2VjdGlvbnMgfHwgW10pLm1hcCgoc2VjdGlvbiwgaSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGkgIT09IGluZGV4IHx8IGlzSG9tZXBhZ2VTZWN0aW9uTG9ja2VkKHNlY3Rpb24pKSByZXR1cm4gc2VjdGlvbjtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRJZHMgPSBzZWN0aW9uLnNldHRpbmdzPy5yZXZpZXdJZHMgfHwgW107XHJcbiAgICAgICAgICAgICAgICBjb25zdCBuZXh0SWRzID0gY2hlY2tlZFxyXG4gICAgICAgICAgICAgICAgICAgID8gWy4uLm5ldyBTZXQoWy4uLmN1cnJlbnRJZHMsIHJldmlld0lkXSldXHJcbiAgICAgICAgICAgICAgICAgICAgOiBjdXJyZW50SWRzLmZpbHRlcihpZCA9PiBpZCAhPT0gcmV2aWV3SWQpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLi4uc2VjdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBzZXR0aW5nczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAuLi4oc2VjdGlvbi5zZXR0aW5ncyB8fCB7fSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZGU6IG5leHRJZHMubGVuZ3RoID4gMCA/ICdzZWxlY3RlZFJldmlld3MnIDogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXZpZXdJZHM6IG5leHRJZHNcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pKTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgZ2V0QmFubmVySW1hZ2VzID0gKHNlY3Rpb24sIGtleSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGZhbGxiYWNrS2V5ID0ga2V5ID09PSAnZGVza3RvcEltYWdlcycgPyAnZGVza3RvcEltYWdlJyA6ICdtb2JpbGVJbWFnZSc7XHJcbiAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAgLi4ubmV3IFNldChbXHJcbiAgICAgICAgICAgICAgICAuLi4oQXJyYXkuaXNBcnJheShzZWN0aW9uLnNldHRpbmdzPy5ba2V5XSkgPyBzZWN0aW9uLnNldHRpbmdzW2tleV0gOiBbXSksXHJcbiAgICAgICAgICAgICAgICBzZWN0aW9uLnNldHRpbmdzPy5bZmFsbGJhY2tLZXldXHJcbiAgICAgICAgICAgIF0uZmlsdGVyKEJvb2xlYW4pKVxyXG4gICAgICAgIF0uc2xpY2UoMCwgNSk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IHVwZGF0ZUJhbm5lckltYWdlcyA9IChpbmRleCwga2V5LCBpbWFnZXMpID0+IHtcclxuICAgICAgICBjb25zdCBmYWxsYmFja0tleSA9IGtleSA9PT0gJ2Rlc2t0b3BJbWFnZXMnID8gJ2Rlc2t0b3BJbWFnZScgOiAnbW9iaWxlSW1hZ2UnO1xyXG4gICAgICAgIGNvbnN0IG5leHRJbWFnZXMgPSBbLi4ubmV3IFNldCgoaW1hZ2VzIHx8IFtdKS5maWx0ZXIoQm9vbGVhbikubWFwKFN0cmluZykpXS5zbGljZSgwLCA1KTtcclxuICAgICAgICBzZXRUaGVtZShwcmV2ID0+ICh7XHJcbiAgICAgICAgICAgIC4uLnByZXYsXHJcbiAgICAgICAgICAgIGhvbWVwYWdlU2VjdGlvbnM6IChwcmV2LmhvbWVwYWdlU2VjdGlvbnMgfHwgW10pLm1hcCgoc2VjdGlvbiwgaSkgPT4gKFxyXG4gICAgICAgICAgICAgICAgaSA9PT0gaW5kZXggJiYgIWlzSG9tZXBhZ2VTZWN0aW9uTG9ja2VkKHNlY3Rpb24pXHJcbiAgICAgICAgICAgICAgICAgICAgPyB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLnNlY3Rpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldHRpbmdzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi4oc2VjdGlvbi5zZXR0aW5ncyB8fCB7fSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBba2V5XTogbmV4dEltYWdlcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtmYWxsYmFja0tleV06IG5leHRJbWFnZXNbMF0gfHwgJydcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW9iaWxlU2V0dGluZ3M6IGtleSA9PT0gJ21vYmlsZUltYWdlcydcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgID8geyAuLi4oc2VjdGlvbi5tb2JpbGVTZXR0aW5ncyB8fCB7fSksIGltYWdlOiBuZXh0SW1hZ2VzWzBdIHx8ICcnIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogc2VjdGlvbi5tb2JpbGVTZXR0aW5nc1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICA6IHNlY3Rpb25cclxuICAgICAgICAgICAgKSlcclxuICAgICAgICB9KSk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IGFkZEJhbm5lckltYWdlVXJsID0gKGluZGV4LCBrZXksIHVybCkgPT4ge1xyXG4gICAgICAgIGlmICghdXJsKSByZXR1cm47XHJcbiAgICAgICAgY29uc3Qgc2VjdGlvbiA9IHRoZW1lLmhvbWVwYWdlU2VjdGlvbnM/LltpbmRleF07XHJcbiAgICAgICAgY29uc3QgY3VycmVudEltYWdlcyA9IGdldEJhbm5lckltYWdlcyhzZWN0aW9uIHx8IHt9LCBrZXkpO1xyXG4gICAgICAgIGlmIChjdXJyZW50SW1hZ2VzLmxlbmd0aCA+PSA1KSB7XHJcbiAgICAgICAgICAgIHRvYXN0LmVycm9yKCdZb3UgY2FuIGFkZCB1cCB0byA1IGltYWdlcy4nKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB1cGRhdGVCYW5uZXJJbWFnZXMoaW5kZXgsIGtleSwgWy4uLmN1cnJlbnRJbWFnZXMsIHVybF0pO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCByZW1vdmVCYW5uZXJJbWFnZSA9IChpbmRleCwga2V5LCBpbWFnZUluZGV4KSA9PiB7XHJcbiAgICAgICAgY29uc3Qgc2VjdGlvbiA9IHRoZW1lLmhvbWVwYWdlU2VjdGlvbnM/LltpbmRleF07XHJcbiAgICAgICAgY29uc3QgaW1hZ2VzID0gZ2V0QmFubmVySW1hZ2VzKHNlY3Rpb24gfHwge30sIGtleSk7XHJcbiAgICAgICAgZGlzY2FyZFRlbXBvcmFyeUFzc2V0KGltYWdlc1tpbWFnZUluZGV4XSk7XHJcbiAgICAgICAgdXBkYXRlQmFubmVySW1hZ2VzKGluZGV4LCBrZXksIGltYWdlcy5maWx0ZXIoKF8sIGkpID0+IGkgIT09IGltYWdlSW5kZXgpKTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgbW92ZUJhbm5lckltYWdlID0gKGluZGV4LCBrZXksIGltYWdlSW5kZXgsIGRpcmVjdGlvbikgPT4ge1xyXG4gICAgICAgIGNvbnN0IHNlY3Rpb24gPSB0aGVtZS5ob21lcGFnZVNlY3Rpb25zPy5baW5kZXhdO1xyXG4gICAgICAgIGNvbnN0IGltYWdlcyA9IGdldEJhbm5lckltYWdlcyhzZWN0aW9uIHx8IHt9LCBrZXkpO1xyXG4gICAgICAgIGNvbnN0IHRhcmdldEluZGV4ID0gaW1hZ2VJbmRleCArIGRpcmVjdGlvbjtcclxuICAgICAgICBpZiAodGFyZ2V0SW5kZXggPCAwIHx8IHRhcmdldEluZGV4ID49IGltYWdlcy5sZW5ndGgpIHJldHVybjtcclxuICAgICAgICBbaW1hZ2VzW2ltYWdlSW5kZXhdLCBpbWFnZXNbdGFyZ2V0SW5kZXhdXSA9IFtpbWFnZXNbdGFyZ2V0SW5kZXhdLCBpbWFnZXNbaW1hZ2VJbmRleF1dO1xyXG4gICAgICAgIHVwZGF0ZUJhbm5lckltYWdlcyhpbmRleCwga2V5LCBpbWFnZXMpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBub3JtYWxpemVTZWN0aW9uT3JkZXIgPSAoc2VjdGlvbnMpID0+IG5vcm1hbGl6ZUhvbWVwYWdlU2VjdGlvbnMoc2VjdGlvbnMpLm1hcCgoc2VjdGlvbiwgaW5kZXgpID0+ICh7IC4uLnNlY3Rpb24sIHNvcnRPcmRlcjogaW5kZXggfSkpO1xyXG5cclxuICAgIGNvbnN0IG1vdmVIb21lcGFnZVNlY3Rpb24gPSAoaW5kZXgsIGRpcmVjdGlvbikgPT4ge1xyXG4gICAgICAgIGlmICghdGhlbWVDYXBhYmlsaXRpZXMuc2VjdGlvblN0cnVjdHVyZS5lZGl0YWJsZSkgcmV0dXJuO1xyXG4gICAgICAgIHNldFRoZW1lKHByZXYgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBzZWN0aW9ucyA9IFsuLi4ocHJldi5ob21lcGFnZVNlY3Rpb25zIHx8IFtdKV07XHJcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldEluZGV4ID0gaW5kZXggKyBkaXJlY3Rpb247XHJcbiAgICAgICAgICAgIGlmICh0YXJnZXRJbmRleCA8IDAgfHwgdGFyZ2V0SW5kZXggPj0gc2VjdGlvbnMubGVuZ3RoKSByZXR1cm4gcHJldjtcclxuICAgICAgICAgICAgaWYgKGlzSG9tZXBhZ2VTZWN0aW9uTG9ja2VkKHNlY3Rpb25zW2luZGV4XSkgfHwgaXNIb21lcGFnZVNlY3Rpb25Mb2NrZWQoc2VjdGlvbnNbdGFyZ2V0SW5kZXhdKSkgcmV0dXJuIHByZXY7XHJcbiAgICAgICAgICAgIFtzZWN0aW9uc1tpbmRleF0sIHNlY3Rpb25zW3RhcmdldEluZGV4XV0gPSBbc2VjdGlvbnNbdGFyZ2V0SW5kZXhdLCBzZWN0aW9uc1tpbmRleF1dO1xyXG4gICAgICAgICAgICByZXR1cm4geyAuLi5wcmV2LCBob21lcGFnZVNlY3Rpb25zOiBub3JtYWxpemVTZWN0aW9uT3JkZXIoc2VjdGlvbnMpIH07XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IGR1cGxpY2F0ZUhvbWVwYWdlU2VjdGlvbiA9IChpbmRleCkgPT4ge1xyXG4gICAgICAgIGlmICghdGhlbWVDYXBhYmlsaXRpZXMuc2VjdGlvblN0cnVjdHVyZS5lZGl0YWJsZSkgcmV0dXJuO1xyXG4gICAgICAgIGNvbnN0IGR1cGxpY2F0ZUlkID0gY3JlYXRlQnVpbGRlclNlY3Rpb25JZCh0aGVtZS5ob21lcGFnZVNlY3Rpb25zPy5baW5kZXhdPy50eXBlKTtcclxuICAgICAgICBzZXRUaGVtZShwcmV2ID0+IHtcclxuICAgICAgICAgICAgY29uc3Qgc2VjdGlvbnMgPSBbLi4uKHByZXYuaG9tZXBhZ2VTZWN0aW9ucyB8fCBbXSldO1xyXG4gICAgICAgICAgICBjb25zdCBzb3VyY2UgPSBzZWN0aW9uc1tpbmRleF07XHJcbiAgICAgICAgICAgIGlmICghc291cmNlIHx8IGlzSG9tZXBhZ2VTZWN0aW9uTG9ja2VkKHNvdXJjZSkpIHJldHVybiBwcmV2O1xyXG4gICAgICAgICAgICBzZWN0aW9ucy5zcGxpY2UoaW5kZXggKyAxLCAwLCB7XHJcbiAgICAgICAgICAgICAgICAuLi5zb3VyY2UsXHJcbiAgICAgICAgICAgICAgICBfaWQ6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgIGlkOiBkdXBsaWNhdGVJZCxcclxuICAgICAgICAgICAgICAgIHRpdGxlOiBgJHtzb3VyY2UudGl0bGUgfHwgc291cmNlLnR5cGV9IGNvcHlgLFxyXG4gICAgICAgICAgICAgICAgc2V0dGluZ3M6IHsgLi4uKHNvdXJjZS5zZXR0aW5ncyB8fCB7fSkgfSxcclxuICAgICAgICAgICAgICAgIGRlc2t0b3BTZXR0aW5nczogeyAuLi4oc291cmNlLmRlc2t0b3BTZXR0aW5ncyB8fCB7fSkgfSxcclxuICAgICAgICAgICAgICAgIG1vYmlsZVNldHRpbmdzOiB7IC4uLihzb3VyY2UubW9iaWxlU2V0dGluZ3MgfHwge30pIH0sXHJcbiAgICAgICAgICAgICAgICBzb3VyY2U6IHsgLi4uKHNvdXJjZS5zb3VyY2UgfHwge30pIH0sXHJcbiAgICAgICAgICAgICAgICBzb3J0T3JkZXI6IGluZGV4ICsgMVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgLi4ucHJldiwgaG9tZXBhZ2VTZWN0aW9uczogbm9ybWFsaXplU2VjdGlvbk9yZGVyKHNlY3Rpb25zKSB9O1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHNldEFjdGl2ZUVsZW1lbnQoYHNlY3Rpb246JHtkdXBsaWNhdGVJZH1gKTtcclxuICAgICAgICBzZXRBY3RpdmVHcm91cCgnc2VjdGlvbnMnKTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgcmVtb3ZlSG9tZXBhZ2VTZWN0aW9uID0gKGluZGV4KSA9PiB7XHJcbiAgICAgICAgaWYgKCF0aGVtZUNhcGFiaWxpdGllcy5zZWN0aW9uU3RydWN0dXJlLmVkaXRhYmxlKSByZXR1cm47XHJcbiAgICAgICAgY29uc3Qgc2VjdGlvbiA9IHRoZW1lLmhvbWVwYWdlU2VjdGlvbnM/LltpbmRleF07XHJcbiAgICAgICAgaWYgKHNlY3Rpb24gJiYgIWlzSG9tZXBhZ2VTZWN0aW9uTG9ja2VkKHNlY3Rpb24pKSB7XHJcbiAgICAgICAgICAgIGV4dHJhY3RUaGVtZUFzc2V0VXJscyh7IGhvbWVwYWdlU2VjdGlvbnM6IFtzZWN0aW9uXSB9KS5mb3JFYWNoKHVybCA9PiBkaXNjYXJkVGVtcG9yYXJ5QXNzZXQodXJsKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNldFRoZW1lKHByZXYgPT4gKHtcclxuICAgICAgICAgICAgLi4ucHJldixcclxuICAgICAgICAgICAgaG9tZXBhZ2VTZWN0aW9uczogbm9ybWFsaXplU2VjdGlvbk9yZGVyKChwcmV2LmhvbWVwYWdlU2VjdGlvbnMgfHwgW10pLmZpbHRlcigoc2VjdGlvbiwgaSkgPT4gaSAhPT0gaW5kZXggfHwgaXNIb21lcGFnZVNlY3Rpb25Mb2NrZWQoc2VjdGlvbikpKVxyXG4gICAgICAgIH0pKTtcclxuICAgICAgICBpZiAoZ2V0U2VjdGlvbkluZGV4RnJvbVNlbGVjdGlvbihhY3RpdmVFbGVtZW50LCB0aGVtZSkgPT09IGluZGV4KSB7XHJcbiAgICAgICAgICAgIHNldEFjdGl2ZUVsZW1lbnQoJ3NlY3Rpb25zJyk7XHJcbiAgICAgICAgICAgIHNldEFjdGl2ZUdyb3VwKCdzZWN0aW9ucycpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgdG9nZ2xlSG9tZXBhZ2VTZWN0aW9uVmlzaWJpbGl0eSA9IChpbmRleCwgaXNFbmFibGVkKSA9PiB7XHJcbiAgICAgICAgdXBkYXRlSG9tZXBhZ2VTZWN0aW9uKGluZGV4LCAnaXNFbmFibGVkJywgaXNFbmFibGVkKTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgdG9nZ2xlSG9tZXBhZ2VTZWN0aW9uTG9jayA9IChpbmRleCkgPT4ge1xyXG4gICAgICAgIGlmICghdGhlbWVDYXBhYmlsaXRpZXMuc2VjdGlvbnNbdGhlbWUuaG9tZXBhZ2VTZWN0aW9ucz8uW2luZGV4XT8udHlwZV0/LmVkaXRhYmxlKSByZXR1cm47XHJcbiAgICAgICAgc2V0VGhlbWUocHJldiA9PiAoe1xyXG4gICAgICAgICAgICAuLi5wcmV2LFxyXG4gICAgICAgICAgICBob21lcGFnZVNlY3Rpb25zOiAocHJldi5ob21lcGFnZVNlY3Rpb25zIHx8IFtdKS5tYXAoKHNlY3Rpb24sIGkpID0+IChcclxuICAgICAgICAgICAgICAgIGkgPT09IGluZGV4XHJcbiAgICAgICAgICAgICAgICAgICAgPyB7IC4uLnNlY3Rpb24sIHNldHRpbmdzOiB7IC4uLihzZWN0aW9uLnNldHRpbmdzIHx8IHt9KSwgaXNMb2NrZWQ6ICFpc0hvbWVwYWdlU2VjdGlvbkxvY2tlZChzZWN0aW9uKSB9IH1cclxuICAgICAgICAgICAgICAgICAgICA6IHNlY3Rpb25cclxuICAgICAgICAgICAgKSlcclxuICAgICAgICB9KSk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IGFkZEhvbWVwYWdlU2VjdGlvbiA9IChwcmVzZXQgPSBpbmxpbmVTZWN0aW9uUHJlc2V0c1syXSwgaW5zZXJ0SW5kZXggPSBudWxsKSA9PiB7XHJcbiAgICAgICAgaWYgKCF0aGVtZUNhcGFiaWxpdGllcy5zZWN0aW9uU3RydWN0dXJlLmVkaXRhYmxlKSByZXR1cm47XHJcbiAgICAgICAgY29uc3Qgc2FmZVByZXNldCA9IHByZXNldCB8fCBpbmxpbmVTZWN0aW9uUHJlc2V0c1syXTtcclxuICAgICAgICBjb25zdCBzZWN0aW9uSWQgPSBjcmVhdGVCdWlsZGVyU2VjdGlvbklkKHNhZmVQcmVzZXQudHlwZSk7XHJcbiAgICAgICAgc2V0VGhlbWUocHJldiA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNlY3Rpb25zID0gWy4uLihwcmV2LmhvbWVwYWdlU2VjdGlvbnMgfHwgW10pXTtcclxuICAgICAgICAgICAgY29uc3QgdGFyZ2V0SW5kZXggPSBpbnNlcnRJbmRleCA9PT0gbnVsbFxyXG4gICAgICAgICAgICAgICAgPyBzZWN0aW9ucy5sZW5ndGhcclxuICAgICAgICAgICAgICAgIDogTWF0aC5tYXgoMCwgTWF0aC5taW4oTnVtYmVyKGluc2VydEluZGV4KSB8fCAwLCBzZWN0aW9ucy5sZW5ndGgpKTtcclxuXHJcbiAgICAgICAgICAgIHNlY3Rpb25zLnNwbGljZSh0YXJnZXRJbmRleCwgMCwge1xyXG4gICAgICAgICAgICAgICAgaWQ6IHNlY3Rpb25JZCxcclxuICAgICAgICAgICAgICAgIHR5cGU6IHNhZmVQcmVzZXQudHlwZSB8fCAnRmVhdHVyZWRQcm9kdWN0cycsXHJcbiAgICAgICAgICAgICAgICB0aXRsZTogc2FmZVByZXNldC50aXRsZSB8fCBzYWZlUHJlc2V0LmxhYmVsIHx8ICdOZXcgc2VjdGlvbicsXHJcbiAgICAgICAgICAgICAgICBpc0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBzb3J0T3JkZXI6IHRhcmdldEluZGV4LFxyXG4gICAgICAgICAgICAgICAgc2V0dGluZ3M6IHsgLi4uKHNhZmVQcmVzZXQuc2V0dGluZ3MgfHwge30pIH0sXHJcbiAgICAgICAgICAgICAgICBkZXNrdG9wU2V0dGluZ3M6IHsgLi4uKHNhZmVQcmVzZXQuZGVza3RvcFNldHRpbmdzIHx8IHt9KSB9LFxyXG4gICAgICAgICAgICAgICAgbW9iaWxlU2V0dGluZ3M6IHsgLi4uKHNhZmVQcmVzZXQubW9iaWxlU2V0dGluZ3MgfHwge30pIH0sXHJcbiAgICAgICAgICAgICAgICBzb3VyY2U6IHsgLi4uKHNhZmVQcmVzZXQuc291cmNlIHx8IHt9KSB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHsgLi4ucHJldiwgaG9tZXBhZ2VTZWN0aW9uczogbm9ybWFsaXplU2VjdGlvbk9yZGVyKHNlY3Rpb25zKSB9O1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHNldEFjdGl2ZUdyb3VwKCdzZWN0aW9ucycpO1xyXG4gICAgICAgIHNldEFjdGl2ZUVsZW1lbnQoYHNlY3Rpb246JHtzZWN0aW9uSWR9YCk7XHJcbiAgICAgICAgc2V0TW9iaWxlV29ya3NwYWNlKCdwcmV2aWV3Jyk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IHVwZGF0ZU5hdmlnYXRpb24gPSAoaW5kZXgsIGZpZWxkLCB2YWx1ZSkgPT4ge1xyXG4gICAgICAgIHNldFRoZW1lKHByZXYgPT4gKHtcclxuICAgICAgICAgICAgLi4ucHJldixcclxuICAgICAgICAgICAgbmF2aWdhdGlvbjogKHByZXYubmF2aWdhdGlvbiB8fCBbXSkubWFwKChpdGVtLCBpKSA9PiAoXHJcbiAgICAgICAgICAgICAgICBpID09PSBpbmRleCA/IHsgLi4uaXRlbSwgW2ZpZWxkXTogdmFsdWUgfSA6IGl0ZW1cclxuICAgICAgICAgICAgKSlcclxuICAgICAgICB9KSk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IG5vcm1hbGl6ZU5hdmlnYXRpb25PcmRlciA9IChpdGVtcykgPT4gaXRlbXMubWFwKChpdGVtLCBpbmRleCkgPT4gKHsgLi4uaXRlbSwgc29ydE9yZGVyOiBpbmRleCB9KSk7XHJcblxyXG4gICAgY29uc3QgYWRkTmF2aWdhdGlvbiA9ICgpID0+IHtcclxuICAgICAgICBzZXRUaGVtZShwcmV2ID0+ICh7XHJcbiAgICAgICAgICAgIC4uLnByZXYsXHJcbiAgICAgICAgICAgIG5hdmlnYXRpb246IG5vcm1hbGl6ZU5hdmlnYXRpb25PcmRlcihbXHJcbiAgICAgICAgICAgICAgICAuLi4ocHJldi5uYXZpZ2F0aW9uIHx8IFtdKSxcclxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdOZXcgbGluaycsIHVybDogJy8nLCBpc0V4dGVybmFsOiBmYWxzZSwgc29ydE9yZGVyOiBwcmV2Lm5hdmlnYXRpb24/Lmxlbmd0aCB8fCAwLCBjaGlsZHJlbjogW10sIG1lZ2FNZW51OiBmYWxzZSB9XHJcbiAgICAgICAgICAgIF0pXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBhZGROYXZpZ2F0aW9uRHJvcGRvd24gPSAoKSA9PiB7XHJcbiAgICAgICAgc2V0VGhlbWUocHJldiA9PiAoe1xyXG4gICAgICAgICAgICAuLi5wcmV2LFxyXG4gICAgICAgICAgICBuYXZpZ2F0aW9uOiBub3JtYWxpemVOYXZpZ2F0aW9uT3JkZXIoW1xyXG4gICAgICAgICAgICAgICAgLi4uKHByZXYubmF2aWdhdGlvbiB8fCBbXSksXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICdOZXcgZHJvcGRvd24nLFxyXG4gICAgICAgICAgICAgICAgICAgIHVybDogJyMnLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzRXh0ZXJuYWw6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHNvcnRPcmRlcjogcHJldi5uYXZpZ2F0aW9uPy5sZW5ndGggfHwgMCxcclxuICAgICAgICAgICAgICAgICAgICBtZWdhTWVudTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IGxhYmVsOiAnU3ViIGxpbmsnLCB1cmw6ICcvJywgaXNFeHRlcm5hbDogZmFsc2UsIHNvcnRPcmRlcjogMCB9XHJcbiAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdKVxyXG4gICAgICAgIH0pKTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgcmVtb3ZlTmF2aWdhdGlvbiA9IChpbmRleCkgPT4ge1xyXG4gICAgICAgIHNldFRoZW1lKHByZXYgPT4gKHtcclxuICAgICAgICAgICAgLi4ucHJldixcclxuICAgICAgICAgICAgbmF2aWdhdGlvbjogbm9ybWFsaXplTmF2aWdhdGlvbk9yZGVyKChwcmV2Lm5hdmlnYXRpb24gfHwgW10pLmZpbHRlcigoXywgaSkgPT4gaSAhPT0gaW5kZXgpKVxyXG4gICAgICAgIH0pKTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgbW92ZU5hdmlnYXRpb24gPSAoaW5kZXgsIGRpcmVjdGlvbikgPT4ge1xyXG4gICAgICAgIHNldFRoZW1lKHByZXYgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBsaW5rcyA9IFsuLi4ocHJldi5uYXZpZ2F0aW9uIHx8IFtdKV07XHJcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldEluZGV4ID0gaW5kZXggKyBkaXJlY3Rpb247XHJcbiAgICAgICAgICAgIGlmICh0YXJnZXRJbmRleCA8IDAgfHwgdGFyZ2V0SW5kZXggPj0gbGlua3MubGVuZ3RoKSByZXR1cm4gcHJldjtcclxuICAgICAgICAgICAgW2xpbmtzW2luZGV4XSwgbGlua3NbdGFyZ2V0SW5kZXhdXSA9IFtsaW5rc1t0YXJnZXRJbmRleF0sIGxpbmtzW2luZGV4XV07XHJcbiAgICAgICAgICAgIHJldHVybiB7IC4uLnByZXYsIG5hdmlnYXRpb246IG5vcm1hbGl6ZU5hdmlnYXRpb25PcmRlcihsaW5rcykgfTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgYWRkTmF2aWdhdGlvbkNoaWxkID0gKGluZGV4KSA9PiB7XHJcbiAgICAgICAgc2V0VGhlbWUocHJldiA9PiAoe1xyXG4gICAgICAgICAgICAuLi5wcmV2LFxyXG4gICAgICAgICAgICBuYXZpZ2F0aW9uOiAocHJldi5uYXZpZ2F0aW9uIHx8IFtdKS5tYXAoKGl0ZW0sIGkpID0+IChcclxuICAgICAgICAgICAgICAgIGkgPT09IGluZGV4XHJcbiAgICAgICAgICAgICAgICAgICAgPyB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLml0ZW0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi4oaXRlbS5jaGlsZHJlbiB8fCBbXSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGxhYmVsOiAnU3ViIGxpbmsnLCB1cmw6ICcvJywgaXNFeHRlcm5hbDogZmFsc2UsIHNvcnRPcmRlcjogaXRlbS5jaGlsZHJlbj8ubGVuZ3RoIHx8IDAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIDogaXRlbVxyXG4gICAgICAgICAgICApKVxyXG4gICAgICAgIH0pKTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgdXBkYXRlTmF2aWdhdGlvbkNoaWxkID0gKGluZGV4LCBjaGlsZEluZGV4LCBmaWVsZCwgdmFsdWUpID0+IHtcclxuICAgICAgICBzZXRUaGVtZShwcmV2ID0+ICh7XHJcbiAgICAgICAgICAgIC4uLnByZXYsXHJcbiAgICAgICAgICAgIG5hdmlnYXRpb246IChwcmV2Lm5hdmlnYXRpb24gfHwgW10pLm1hcCgoaXRlbSwgaSkgPT4gKFxyXG4gICAgICAgICAgICAgICAgaSA9PT0gaW5kZXhcclxuICAgICAgICAgICAgICAgICAgICA/IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLi4uaXRlbSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IChpdGVtLmNoaWxkcmVuIHx8IFtdKS5tYXAoKGNoaWxkLCBjKSA9PiAoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjID09PSBjaGlsZEluZGV4ID8geyAuLi5jaGlsZCwgW2ZpZWxkXTogdmFsdWUgfSA6IGNoaWxkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICkpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIDogaXRlbVxyXG4gICAgICAgICAgICApKVxyXG4gICAgICAgIH0pKTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgcmVtb3ZlTmF2aWdhdGlvbkNoaWxkID0gKGluZGV4LCBjaGlsZEluZGV4KSA9PiB7XHJcbiAgICAgICAgc2V0VGhlbWUocHJldiA9PiAoe1xyXG4gICAgICAgICAgICAuLi5wcmV2LFxyXG4gICAgICAgICAgICBuYXZpZ2F0aW9uOiAocHJldi5uYXZpZ2F0aW9uIHx8IFtdKS5tYXAoKGl0ZW0sIGkpID0+IChcclxuICAgICAgICAgICAgICAgIGkgPT09IGluZGV4XHJcbiAgICAgICAgICAgICAgICAgICAgPyB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLml0ZW0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiAoaXRlbS5jaGlsZHJlbiB8fCBbXSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoKF8sIGMpID0+IGMgIT09IGNoaWxkSW5kZXgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKChjaGlsZCwgYykgPT4gKHsgLi4uY2hpbGQsIHNvcnRPcmRlcjogYyB9KSlcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgOiBpdGVtXHJcbiAgICAgICAgICAgICkpXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCB1cGRhdGVQb2xpY3kgPSAoa2V5LCB2YWx1ZSkgPT4ge1xyXG4gICAgICAgIHNldFRoZW1lKHByZXYgPT4gKHtcclxuICAgICAgICAgICAgLi4ucHJldixcclxuICAgICAgICAgICAgcG9saWNpZXM6IHsgLi4ucHJldi5wb2xpY2llcywgW2tleV06IHZhbHVlIH1cclxuICAgICAgICB9KSk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IHJlc2V0UG9saWN5VG9EZWZhdWx0ID0gKGtleSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGNvbmZpcm1lZCA9IHdpbmRvdy5jb25maXJtKGBSZXNldCAke1BPTElDWV9MQUJFTFNba2V5XSB8fCAndGhpcyBwb2xpY3knfSB0byB0aGUgZGVmYXVsdCB0ZW1wbGF0ZT8gVGhpcyB3aWxsIHJlcGxhY2UgdGhlIGN1cnJlbnQgdGV4dCBpbiB0aGUgZWRpdG9yLmApO1xyXG4gICAgICAgIGlmICghY29uZmlybWVkKSByZXR1cm47XHJcbiAgICAgICAgdXBkYXRlUG9saWN5KGtleSwgZ2V0RGVmYXVsdFBvbGljeVRleHQoa2V5LCB7IHN0b3JlTmFtZTogc2hvcE5hbWUgfHwgJ3RoaXMgc3RvcmUnIH0pKTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgdXBkYXRlRm9vdGVyID0gKGtleSwgdmFsdWUpID0+IHtcclxuICAgICAgICBzZXRUaGVtZShwcmV2ID0+ICh7XHJcbiAgICAgICAgICAgIC4uLnByZXYsXHJcbiAgICAgICAgICAgIGZvb3RlcjogeyAuLi4ocHJldi5mb290ZXIgfHwge30pLCBba2V5XTogdmFsdWUgfVxyXG4gICAgICAgIH0pKTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgdXBkYXRlRm9vdGVyTGluayA9IChpbmRleCwgZmllbGQsIHZhbHVlKSA9PiB7XHJcbiAgICAgICAgc2V0VGhlbWUocHJldiA9PiAoe1xyXG4gICAgICAgICAgICAuLi5wcmV2LFxyXG4gICAgICAgICAgICBmb290ZXI6IHtcclxuICAgICAgICAgICAgICAgIC4uLihwcmV2LmZvb3RlciB8fCB7fSksXHJcbiAgICAgICAgICAgICAgICBsaW5rczogKHByZXYuZm9vdGVyPy5saW5rcyB8fCBbXSkubWFwKChpdGVtLCBpKSA9PiAoXHJcbiAgICAgICAgICAgICAgICAgICAgaSA9PT0gaW5kZXggPyB7IC4uLml0ZW0sIFtmaWVsZF06IHZhbHVlIH0gOiBpdGVtXHJcbiAgICAgICAgICAgICAgICApKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSkpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBhZGRGb290ZXJMaW5rID0gKCkgPT4ge1xyXG4gICAgICAgIHNldFRoZW1lKHByZXYgPT4gKHtcclxuICAgICAgICAgICAgLi4ucHJldixcclxuICAgICAgICAgICAgZm9vdGVyOiB7XHJcbiAgICAgICAgICAgICAgICAuLi4ocHJldi5mb290ZXIgfHwge30pLFxyXG4gICAgICAgICAgICAgICAgbGlua3M6IFtcclxuICAgICAgICAgICAgICAgICAgICAuLi4ocHJldi5mb290ZXI/LmxpbmtzIHx8IFtdKSxcclxuICAgICAgICAgICAgICAgICAgICB7IGxhYmVsOiAnTmV3IGxpbmsnLCB1cmw6ICcvJywgaXNFeHRlcm5hbDogZmFsc2UsIHNvcnRPcmRlcjogcHJldi5mb290ZXI/LmxpbmtzPy5sZW5ndGggfHwgMCB9XHJcbiAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KSk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IHJlbW92ZUZvb3RlckxpbmsgPSAoaW5kZXgpID0+IHtcclxuICAgICAgICBzZXRUaGVtZShwcmV2ID0+ICh7XHJcbiAgICAgICAgICAgIC4uLnByZXYsXHJcbiAgICAgICAgICAgIGZvb3Rlcjoge1xyXG4gICAgICAgICAgICAgICAgLi4uKHByZXYuZm9vdGVyIHx8IHt9KSxcclxuICAgICAgICAgICAgICAgIGxpbmtzOiAocHJldi5mb290ZXI/LmxpbmtzIHx8IFtdKVxyXG4gICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoKF8sIGkpID0+IGkgIT09IGluZGV4KVxyXG4gICAgICAgICAgICAgICAgICAgIC5tYXAoKGl0ZW0sIGkpID0+ICh7IC4uLml0ZW0sIHNvcnRPcmRlcjogaSB9KSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pKTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgcmVzZXRTdHlsaW5nID0gKCkgPT4ge1xyXG4gICAgICAgIHNldFRoZW1lKHByZXYgPT4gbG9hZEJ1aWxkZXJUaGVtZSh7XHJcbiAgICAgICAgICAgIGxvZ29Vcmw6IHByZXYubG9nb1VybCxcclxuICAgICAgICAgICAgZmF2aWNvblVybDogcHJldi5mYXZpY29uVXJsLFxyXG4gICAgICAgICAgICBoZXJvOiBwcmV2Lmhlcm8sXHJcbiAgICAgICAgICAgIG5hdmlnYXRpb246IHByZXYubmF2aWdhdGlvbixcclxuICAgICAgICAgICAgZm9vdGVyOiBwcmV2LmZvb3RlcixcclxuICAgICAgICAgICAgcG9saWNpZXM6IHByZXYucG9saWNpZXMsXHJcbiAgICAgICAgICAgIGFsbFByb2R1Y3RzOiBwcmV2LmFsbFByb2R1Y3RzLFxyXG4gICAgICAgICAgICBob21lcGFnZVNlY3Rpb25zOiBwcmV2LmhvbWVwYWdlU2VjdGlvbnMsXHJcbiAgICAgICAgICAgIGNoZWNrb3V0QnJhbmRpbmc6IHtcclxuICAgICAgICAgICAgICAgIC4uLmRlZmF1bHRUaGVtZS5jaGVja291dEJyYW5kaW5nLFxyXG4gICAgICAgICAgICAgICAgbG9nb1VybDogcHJldi5jaGVja291dEJyYW5kaW5nPy5sb2dvVXJsIHx8ICcnLFxyXG4gICAgICAgICAgICAgICAgYmFubmVyVGV4dDogcHJldi5jaGVja291dEJyYW5kaW5nPy5iYW5uZXJUZXh0IHx8ICcnLFxyXG4gICAgICAgICAgICAgICAgdHJ1c3RNZXNzYWdlOiBwcmV2LmNoZWNrb3V0QnJhbmRpbmc/LnRydXN0TWVzc2FnZSB8fCBkZWZhdWx0VGhlbWUuY2hlY2tvdXRCcmFuZGluZy50cnVzdE1lc3NhZ2VcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgcGF5bWVudFNldHRpbmdzOiBwcmV2LnBheW1lbnRTZXR0aW5nc1xyXG4gICAgICAgIH0pKTtcclxuICAgICAgICBzZXRTdG9yZXdpZGVEaXNjb3VudCgwKTtcclxuICAgICAgICB0b2FzdC5zdWNjZXNzKCdEZWZhdWx0IHN0eWxpbmcgcmVzdG9yZWQuIFNhdmUgY2hhbmdlcyB0byBwdWJsaXNoIGl0LicpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBhcHBseUJ1aWxkZXJTbmFwc2hvdCA9IChzbmFwc2hvdCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHBhcnNlZCA9IHNhZmVQYXJzZVNuYXBzaG90KHNuYXBzaG90KTtcclxuICAgICAgICBpZiAoIXBhcnNlZCkgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgICAgICBoaXN0b3J5TW9kZVJlZi5jdXJyZW50ID0gJ3NraXAnO1xyXG4gICAgICAgIGNvbnN0IG5leHRUaGVtZSA9IGxvYWRCdWlsZGVyVGhlbWUocGFyc2VkLnRoZW1lIHx8IHt9KTtcclxuICAgICAgICBzZXRUaGVtZShuZXh0VGhlbWUpO1xyXG4gICAgICAgIHNldFNlYXJjaEFsaWFzZXMoQXJyYXkuaXNBcnJheShwYXJzZWQuc2VhcmNoQWxpYXNlcykgPyBwYXJzZWQuc2VhcmNoQWxpYXNlcyA6IFtdKTtcclxuICAgICAgICBzZXRDdXN0b21Eb21haW4ocGFyc2VkLmN1c3RvbURvbWFpbiB8fCB7IGRvbWFpbjogJycgfSk7XHJcbiAgICAgICAgc2V0U3RvcmV3aWRlRGlzY291bnQoTnVtYmVyKHBhcnNlZC5zdG9yZXdpZGVEaXNjb3VudCkgfHwgMCk7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IHVuZG9CdWlsZGVyQ2hhbmdlID0gKCkgPT4ge1xyXG4gICAgICAgIGlmICghY2FuVW5kbykgcmV0dXJuO1xyXG4gICAgICAgIGNvbnN0IHByZXZpb3VzU25hcHNob3QgPSBlZGl0b3JIaXN0b3J5LnBhc3RbZWRpdG9ySGlzdG9yeS5wYXN0Lmxlbmd0aCAtIDFdO1xyXG4gICAgICAgIGlmICghYXBwbHlCdWlsZGVyU25hcHNob3QocHJldmlvdXNTbmFwc2hvdCkpIHJldHVybjtcclxuXHJcbiAgICAgICAgc2V0RWRpdG9ySGlzdG9yeShwcmV2ID0+ICh7XHJcbiAgICAgICAgICAgIHBhc3Q6IHByZXYucGFzdC5zbGljZSgwLCAtMSksXHJcbiAgICAgICAgICAgIGZ1dHVyZTogW2N1cnJlbnRTbmFwc2hvdCwgLi4ucHJldi5mdXR1cmVdLnNsaWNlKDAsIEhJU1RPUllfTElNSVQpXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCByZWRvQnVpbGRlckNoYW5nZSA9ICgpID0+IHtcclxuICAgICAgICBpZiAoIWNhblJlZG8pIHJldHVybjtcclxuICAgICAgICBjb25zdCBuZXh0U25hcHNob3QgPSBlZGl0b3JIaXN0b3J5LmZ1dHVyZVswXTtcclxuICAgICAgICBpZiAoIWFwcGx5QnVpbGRlclNuYXBzaG90KG5leHRTbmFwc2hvdCkpIHJldHVybjtcclxuXHJcbiAgICAgICAgc2V0RWRpdG9ySGlzdG9yeShwcmV2ID0+ICh7XHJcbiAgICAgICAgICAgIHBhc3Q6IFsuLi5wcmV2LnBhc3QsIGN1cnJlbnRTbmFwc2hvdF0uc2xpY2UoLUhJU1RPUllfTElNSVQpLFxyXG4gICAgICAgICAgICBmdXR1cmU6IHByZXYuZnV0dXJlLnNsaWNlKDEpXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCByZXN0b3JlUHVibGlzaGVkVmVyc2lvbiA9ICgpID0+IHtcclxuICAgICAgICBpZiAoIWhhc1Vuc2F2ZWRDaGFuZ2VzKSByZXR1cm47XHJcbiAgICAgICAgY29uc3Qgc25hcHNob3QgPSBpbml0aWFsU25hcHNob3QgfHwgc3RhYmxlU3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgdGhlbWU6IHNhdmVkVGhlbWUsXHJcbiAgICAgICAgICAgIHNlYXJjaEFsaWFzZXMsXHJcbiAgICAgICAgICAgIGN1c3RvbURvbWFpbixcclxuICAgICAgICAgICAgc3RvcmV3aWRlRGlzY291bnQ6IE51bWJlcihzdG9yZXdpZGVEaXNjb3VudCkgfHwgMFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGlmIChhcHBseUJ1aWxkZXJTbmFwc2hvdChzbmFwc2hvdCkpIHtcclxuICAgICAgICAgICAgdG9hc3Quc3VjY2VzcygnRHJhZnQgcmVzdG9yZWQgdG8gdGhlIGxhc3QgcHVibGlzaGVkIHZlcnNpb24uJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCByZXN0b3JlUmVjb3ZlcnlWZXJzaW9uID0gKCkgPT4ge1xyXG4gICAgICAgIGlmICghcmVjb3ZlcnlEcmFmdCkgcmV0dXJuO1xyXG4gICAgICAgIGNvbnN0IHNuYXBzaG90ID0gcmVjb3ZlcnlEcmFmdC5zbmFwc2hvdCB8fCBzdGFibGVTdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICB0aGVtZTogcmVjb3ZlcnlEcmFmdC50aGVtZSxcclxuICAgICAgICAgICAgc2VhcmNoQWxpYXNlczogcmVjb3ZlcnlEcmFmdC5zZWFyY2hBbGlhc2VzIHx8IHNlYXJjaEFsaWFzZXMsXHJcbiAgICAgICAgICAgIGN1c3RvbURvbWFpbjogcmVjb3ZlcnlEcmFmdC5jdXN0b21Eb21haW4gfHwgY3VzdG9tRG9tYWluLFxyXG4gICAgICAgICAgICBzdG9yZXdpZGVEaXNjb3VudDogTnVtYmVyKHJlY292ZXJ5RHJhZnQuc3RvcmV3aWRlRGlzY291bnQpIHx8IDBcclxuICAgICAgICB9KTtcclxuICAgICAgICBpZiAoYXBwbHlCdWlsZGVyU25hcHNob3Qoc25hcHNob3QpKSB7XHJcbiAgICAgICAgICAgIHNldFJlY292ZXJ5RHJhZnQobnVsbCk7XHJcbiAgICAgICAgICAgIHRvYXN0LnN1Y2Nlc3MoJ1JlY292ZXJlZCBTdG9yZSBCdWlsZGVyIGRyYWZ0LiBSZXZpZXcgaXQgYmVmb3JlIHB1Ymxpc2hpbmcuJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBkaXNjYXJkUmVjb3ZlcnlWZXJzaW9uID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IGF1dG9zYXZlLmNsZWFyUmVjb3ZlcnkoKTtcclxuICAgICAgICAgICAgc2V0UmVjb3ZlcnlEcmFmdChudWxsKTtcclxuICAgICAgICAgICAgdG9hc3Quc3VjY2VzcygnUmVjb3ZlcmVkIGRyYWZ0IGRpc2NhcmRlZC4nKTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikgeyB0b2FzdC5lcnJvcihlcnJvci5yZXNwb25zZT8uZGF0YT8uZXJyb3IgfHwgJ0NvdWxkIG5vdCBkaXNjYXJkIHRoZSBkcmFmdC4nKTsgfVxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBzYXZlRHJhZnROb3cgPSBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgaWYgKCFoYXNVbnNhdmVkQ2hhbmdlcyB8fCBzYXZpbmcpIHJldHVybjtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBzYXZlZCA9IGF3YWl0IGF1dG9zYXZlLnNhdmVOb3coKTtcclxuICAgICAgICAgICAgaWYgKCFzYXZlZCkgcmV0dXJuO1xyXG4gICAgICAgICAgICBzZXRMYXN0U2F2ZWRBdChuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICB0b2FzdC5zdWNjZXNzKCdEcmFmdCBzYXZlZC4gWW91ciBsaXZlIHN0b3JlIGlzIHVuY2hhbmdlZC4nKTtcclxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgdG9hc3QuZXJyb3IoZXJyLnJlc3BvbnNlPy5kYXRhPy5lcnJvciB8fCAnRHJhZnQgY291bGQgbm90IGJlIHNhdmVkLiBLZWVwIHRoaXMgcGFnZSBvcGVuIGFuZCByZXRyeS4nKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IHJlbG9hZFB1Ymxpc2hlZFZlcnNpb24gPSBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgaWYgKGhhc1Vuc2F2ZWRDaGFuZ2VzICYmICF3aW5kb3cuY29uZmlybSgnRGlzY2FyZCB5b3VyIHVuc2F2ZWQgU3RvcmUgQnVpbGRlciBkcmFmdCBhbmQgcmVsb2FkIHRoZSBwdWJsaXNoZWQgdmVyc2lvbj8nKSkgcmV0dXJuO1xyXG4gICAgICAgIHRyeSB7IGF3YWl0IGF1dG9zYXZlLmNsZWFyUmVjb3ZlcnkoKTsgfVxyXG4gICAgICAgIGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBpZiAoZXJyb3IucmVzcG9uc2U/LnN0YXR1cyAhPT0gNDA5KSB7XHJcbiAgICAgICAgICAgICAgICB0b2FzdC5lcnJvcihlcnJvci5yZXNwb25zZT8uZGF0YT8uZXJyb3IgfHwgJ0NvdWxkIG5vdCBkaXNjYXJkIHRoZSBkcmFmdC4nKTsgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIEEgbmV3ZXIgc2hhcmVkIGRyYWZ0IGJlbG9uZ3MgdG8gdGhlIG90aGVyIHNlc3Npb24uIFJlbG9hZCB3aXRob3V0IGRlbGV0aW5nIGl0LlxyXG4gICAgICAgICAgICBhd2FpdCBhdXRvc2F2ZS5jbGVhclJlY292ZXJ5KHsgY2xlYXJTZXJ2ZXI6IGZhbHNlIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzZXRSZWNvdmVyeURyYWZ0KG51bGwpO1xyXG4gICAgICAgIHNldFRoZW1lQ29uZmxpY3QobnVsbCk7XHJcbiAgICAgICAgY2xlYXJUZW1wb3JhcnlBc3NldHMoKTtcclxuICAgICAgICBzZXRIeWRyYXRlZFNob3BLZXkoJycpO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IHJlbG9hZEJvb3RzdHJhcCgpO1xyXG4gICAgICAgICAgICB0b2FzdC5zdWNjZXNzKCdQdWJsaXNoZWQgU3RvcmUgQnVpbGRlciBzZXR0aW5ncyByZWxvYWRlZC4nKTtcclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgdG9hc3QuZXJyb3IoJ0NvdWxkIG5vdCByZWxvYWQgdGhlIHB1Ymxpc2hlZCBTdG9yZSBCdWlsZGVyIHNldHRpbmdzLicpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgZm9jdXNWYWxpZGF0aW9uRXJyb3IgPSAoZXJyb3IpID0+IHtcclxuICAgICAgICBzZXRJc3N1ZXNPcGVuKGZhbHNlKTtcclxuICAgICAgICBjb25zdCBzZWN0aW9uTWF0Y2ggPSBTdHJpbmcoZXJyb3I/LnBhdGggfHwgJycpLm1hdGNoKC9eaG9tZXBhZ2VTZWN0aW9uc1xcLihcXGQrKS8pO1xyXG4gICAgICAgIGlmIChzZWN0aW9uTWF0Y2gpIHtcclxuICAgICAgICAgICAgY29uc3Qgc2VjdGlvbkluZGV4ID0gTnVtYmVyKHNlY3Rpb25NYXRjaFsxXSk7XHJcbiAgICAgICAgICAgIHNlbGVjdEVkaXRvclRhcmdldChnZXRTZWN0aW9uU2VsZWN0aW9uSWQodGhlbWUuaG9tZXBhZ2VTZWN0aW9ucz8uW3NlY3Rpb25JbmRleF0sIHNlY3Rpb25JbmRleCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHNlbGVjdFNldHRpbmdzR3JvdXAoZXJyb3I/Lmdyb3VwIHx8ICdicmFuZCcpO1xyXG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgZXNjYXBlZFBhdGggPSB0eXBlb2YgQ1NTICE9PSAndW5kZWZpbmVkJyAmJiBDU1MuZXNjYXBlID8gQ1NTLmVzY2FwZShTdHJpbmcoZXJyb3I/LnBhdGggfHwgJycpKSA6ICcnO1xyXG4gICAgICAgICAgICBjb25zdCBjb250cm9sID0gKGVzY2FwZWRQYXRoICYmIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLWZpZWxkLXBhdGg9XCIke2VzY2FwZWRQYXRofVwiXWApKSB8fCBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1zdG9yZS1idWlsZGVyLWVkaXRvcl0gaW5wdXQ6bm90KFt0eXBlPVwiaGlkZGVuXCJdKSwgW2RhdGEtc3RvcmUtYnVpbGRlci1lZGl0b3JdIHRleHRhcmVhLCBbZGF0YS1zdG9yZS1idWlsZGVyLWVkaXRvcl0gc2VsZWN0Jyk7XHJcbiAgICAgICAgICAgIGNvbnRyb2w/LmZvY3VzKCk7XHJcbiAgICAgICAgICAgIGNvbnRyb2w/LnNjcm9sbEludG9WaWV3KHsgYmVoYXZpb3I6ICdzbW9vdGgnLCBibG9jazogJ2NlbnRlcicgfSk7XHJcbiAgICAgICAgICAgIGNvbnRyb2w/LmNsYXNzTGlzdC5hZGQoJ3JpbmctMicsICdyaW5nLWFtYmVyLTQwMCcpO1xyXG4gICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiBjb250cm9sPy5jbGFzc0xpc3QucmVtb3ZlKCdyaW5nLTInLCAncmluZy1hbWJlci00MDAnKSwgMTIwMCk7XHJcbiAgICAgICAgfSwgODApO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBwcmV2aWV3UmV2aXNpb24gPSBhc3luYyAocmV2aXNpb25JZCkgPT4ge1xyXG4gICAgICAgIGlmIChoYXNVbnNhdmVkQ2hhbmdlcyAmJiAhd2luZG93LmNvbmZpcm0oJ1JlcGxhY2UgdGhlIGN1cnJlbnQgZHJhZnQgd2l0aCB0aGlzIGhpc3RvcmljYWwgcmV2aXNpb24gZm9yIHByZXZpZXc/JykpIHJldHVybjtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCB7IGRhdGEgfSA9IGF3YWl0IEFQSS5nZXQoYC9zdG9yZS1idWlsZGVyL2FkbWluL3JldmlzaW9ucy8ke3JldmlzaW9uSWR9YCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHJldmlzaW9uID0gZGF0YS5kYXRhO1xyXG4gICAgICAgICAgICBhcHBseUJ1aWxkZXJTbmFwc2hvdChzdGFibGVTdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgdGhlbWU6IHJldmlzaW9uLnRoZW1lLFxyXG4gICAgICAgICAgICAgICAgc2VhcmNoQWxpYXNlczogcmV2aXNpb24uc2VhcmNoQWxpYXNlcyB8fCBbXSxcclxuICAgICAgICAgICAgICAgIGN1c3RvbURvbWFpbjogcmV2aXNpb24uY3VzdG9tRG9tYWluLFxyXG4gICAgICAgICAgICAgICAgc3RvcmV3aWRlRGlzY291bnQ6IHJldmlzaW9uLnN0b3Jld2lkZURpc2NvdW50XHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgdG9hc3Quc3VjY2VzcyhgUmV2aXNpb24gJHtyZXZpc2lvbi5yZXZpc2lvbn0gbG9hZGVkIGFzIGFuIHVucHVibGlzaGVkIGRyYWZ0LmApO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICB0b2FzdC5lcnJvcihlcnIucmVzcG9uc2U/LmRhdGE/LmVycm9yIHx8ICdDb3VsZCBub3QgbG9hZCB0aGlzIHJldmlzaW9uLicpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgcmVzdG9yZVJldmlzaW9uID0gYXN5bmMgKHJldmlzaW9uSWQpID0+IHtcclxuICAgICAgICBpZiAoc2F2aW5nKSByZXR1cm47XHJcbiAgICAgICAgaWYgKCF3aW5kb3cuY29uZmlybSgnUHVibGlzaCB0aGlzIGhpc3RvcmljYWwgcmV2aXNpb24gYXMgYSBuZXcgc3RvcmVmcm9udCByZXZpc2lvbj8nKSkgcmV0dXJuO1xyXG4gICAgICAgIHNldFNhdmluZyh0cnVlKTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBhdXRvc2F2ZS5wYXVzZSgpO1xyXG4gICAgICAgICAgICBjb25zdCB7IGRhdGEgfSA9IGF3YWl0IEFQSS5wb3N0KGAvc3RvcmUtYnVpbGRlci9hZG1pbi9yZXZpc2lvbnMvJHtyZXZpc2lvbklkfS9yZXN0b3JlYCwgeyBleHBlY3RlZFJldmlzaW9uOiB0aGVtZVJldmlzaW9uLCBleHBlY3RlZFNob3BJZDogaHlkcmF0ZWRTaG9wS2V5IH0pO1xyXG4gICAgICAgICAgICBjb25zdCBzYXZlZFNob3AgPSBkYXRhLmRhdGE7XHJcbiAgICAgICAgICAgIGNvbnN0IG5leHRUaGVtZSA9IGxvYWRCdWlsZGVyVGhlbWUoc2F2ZWRTaG9wLnRoZW1lIHx8IHt9KTtcclxuICAgICAgICAgICAgY29uc3QgbmV4dFNlYXJjaEFsaWFzZXMgPSBBcnJheS5pc0FycmF5KHNhdmVkU2hvcC5zZWFyY2hBbGlhc2VzKSA/IHNhdmVkU2hvcC5zZWFyY2hBbGlhc2VzIDogW107XHJcbiAgICAgICAgICAgIGNvbnN0IG5leHREb21haW4gPSBzYXZlZFNob3AuY3VzdG9tRG9tYWluIHx8IHsgZG9tYWluOiAnJyB9O1xyXG4gICAgICAgICAgICBjb25zdCBuZXh0RGlzY291bnQgPSBOdW1iZXIoc2F2ZWRTaG9wLnN0b3Jld2lkZURpc2NvdW50KSB8fCAwO1xyXG4gICAgICAgICAgICBjb25zdCBzbmFwc2hvdCA9IHN0YWJsZVN0cmluZ2lmeSh7IHRoZW1lOiBuZXh0VGhlbWUsIHNlYXJjaEFsaWFzZXM6IG5leHRTZWFyY2hBbGlhc2VzLCBjdXN0b21Eb21haW46IG5leHREb21haW4sIHN0b3Jld2lkZURpc2NvdW50OiBuZXh0RGlzY291bnQgfSk7XHJcbiAgICAgICAgICAgIHNldFNhdmVkVGhlbWUobmV4dFRoZW1lKTtcclxuICAgICAgICAgICAgc2V0VGhlbWUobmV4dFRoZW1lKTtcclxuICAgICAgICAgICAgc2V0U2VhcmNoQWxpYXNlcyhuZXh0U2VhcmNoQWxpYXNlcyk7XHJcbiAgICAgICAgICAgIHNldEN1c3RvbURvbWFpbihuZXh0RG9tYWluKTtcclxuICAgICAgICAgICAgc2V0U3RvcmV3aWRlRGlzY291bnQobmV4dERpc2NvdW50KTtcclxuICAgICAgICAgICAgc2V0VGhlbWVSZXZpc2lvbihOdW1iZXIoc2F2ZWRTaG9wLnRoZW1lUmV2aXNpb24gfHwgdGhlbWVSZXZpc2lvbiArIDEpKTtcclxuICAgICAgICAgICAgc2V0SW5pdGlhbFNuYXBzaG90KHNuYXBzaG90KTtcclxuICAgICAgICAgICAgc2V0TGFzdFB1Ymxpc2hlZEF0KHNhdmVkU2hvcC5sYXN0UHVibGlzaGVkQXQgfHwgbmV3IERhdGUoKS50b0lTT1N0cmluZygpKTtcclxuICAgICAgICAgICAgY2xlYXJUZW1wb3JhcnlBc3NldHMoKTtcclxuICAgICAgICAgICAgbGFzdEhpc3RvcnlTbmFwc2hvdFJlZi5jdXJyZW50ID0gc25hcHNob3Q7XHJcbiAgICAgICAgICAgIHNldEVkaXRvckhpc3RvcnkoeyBwYXN0OiBbXSwgZnV0dXJlOiBbXSB9KTtcclxuICAgICAgICAgICAgYXdhaXQgYXV0b3NhdmUuY2xlYXJSZWNvdmVyeSh7IGNsZWFyU2VydmVyOiBmYWxzZSB9KTtcclxuICAgICAgICAgICAgY29uc3QgcmVmcmVzaGVkID0gYXdhaXQgcmVsb2FkQm9vdHN0cmFwKHsga2VlcEN1cnJlbnQ6IHRydWUgfSkuY2F0Y2goKCkgPT4gbnVsbCk7XHJcbiAgICAgICAgICAgIGlmIChyZWZyZXNoZWQ/LnJldmlzaW9ucykgc2V0UmV2aXNpb25zKHJlZnJlc2hlZC5yZXZpc2lvbnMpO1xyXG4gICAgICAgICAgICB0b2FzdC5zdWNjZXNzKCdIaXN0b3JpY2FsIHJldmlzaW9uIHJlc3RvcmVkIGFuZCBwdWJsaXNoZWQgYXMgYSBuZXcgcmV2aXNpb24uJyk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIGlmIChlcnIucmVzcG9uc2U/LnN0YXR1cyA9PT0gNDA5KSB7XHJcbiAgICAgICAgICAgICAgICBzZXRUaGVtZUNvbmZsaWN0KGVyci5yZXNwb25zZS5kYXRhKTtcclxuICAgICAgICAgICAgICAgIHRvYXN0LmVycm9yKCdBIG5ld2VyIHJldmlzaW9uIGV4aXN0cy4gWW91ciBkcmFmdCB3YXMgbm90IG92ZXJ3cml0dGVuLicpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdG9hc3QuZXJyb3IoZXJyLnJlc3BvbnNlPy5kYXRhPy5lcnJvciB8fCAnQ291bGQgbm90IHJlc3RvcmUgdGhpcyByZXZpc2lvbi4nKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgICAgIGF1dG9zYXZlLnJlc3VtZSgpO1xyXG4gICAgICAgICAgICBzZXRTYXZpbmcoZmFsc2UpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgaGFuZGxlTG9nb1VwbG9hZCA9IGFzeW5jIChldmVudCwgdGFyZ2V0ID0gJ3N0b3JlZnJvbnQnKSA9PiB7XHJcbiAgICAgICAgY29uc3QgZmlsZSA9IGV2ZW50LnRhcmdldC5maWxlcz8uWzBdO1xyXG4gICAgICAgIGlmICghZmlsZSkgcmV0dXJuO1xyXG5cclxuICAgICAgICBjb25zdCBmb3JtRGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xyXG4gICAgICAgIGZvcm1EYXRhLmFwcGVuZCgnbG9nbycsIGZpbGUpO1xyXG4gICAgICAgIGZvcm1EYXRhLmFwcGVuZCgndGFyZ2V0JywgdGFyZ2V0KTtcclxuICAgICAgICBzZXRVcGxvYWRpbmdMb2dvKHRydWUpO1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCB7IGRhdGEgfSA9IGF3YWl0IEFQSS5wb3N0KCcvc3RvcmUtYnVpbGRlci9hZG1pbi9sb2dvJywgZm9ybURhdGEsIHtcclxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdtdWx0aXBhcnQvZm9ybS1kYXRhJyB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBjb25zdCB1cmwgPSBkYXRhLmRhdGE/LnVybDtcclxuICAgICAgICAgICAgaWYgKCF1cmwpIHRocm93IG5ldyBFcnJvcignVXBsb2FkIGRpZCBub3QgcmV0dXJuIGEgbG9nbyBVUkwnKTtcclxuICAgICAgICAgICAgcmVtZW1iZXJUZW1wb3JhcnlBc3NldChkYXRhLmRhdGEpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRhcmdldCA9PT0gJ2NoZWNrb3V0Jykge1xyXG4gICAgICAgICAgICAgICAgZGlzY2FyZFRlbXBvcmFyeUFzc2V0KHRoZW1lLmNoZWNrb3V0QnJhbmRpbmc/LmxvZ29VcmwpO1xyXG4gICAgICAgICAgICAgICAgc2V0VGhlbWVHcm91cCgnY2hlY2tvdXRCcmFuZGluZycsICdsb2dvVXJsJywgdXJsKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0YXJnZXQgPT09ICdmYXZpY29uJykge1xyXG4gICAgICAgICAgICAgICAgZGlzY2FyZFRlbXBvcmFyeUFzc2V0KHRoZW1lLmZhdmljb25VcmwpO1xyXG4gICAgICAgICAgICAgICAgc2V0VGhlbWUocHJldiA9PiAoeyAuLi5wcmV2LCBmYXZpY29uVXJsOiB1cmwgfSkpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZGlzY2FyZFRlbXBvcmFyeUFzc2V0KHRoZW1lLmxvZ29VcmwpO1xyXG4gICAgICAgICAgICAgICAgc2V0VGhlbWUocHJldiA9PiAoeyAuLi5wcmV2LCBsb2dvVXJsOiB1cmwgfSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRvYXN0LnN1Y2Nlc3ModGFyZ2V0ID09PSAnZmF2aWNvbicgPyAnQnJvd3NlciBpY29uIHVwbG9hZGVkJyA6ICdMb2dvIHVwbG9hZGVkJyk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIHRvYXN0LmVycm9yKGVyci5yZXNwb25zZT8uZGF0YT8uZXJyb3IgfHwgZXJyLm1lc3NhZ2UgfHwgJ0ZhaWxlZCB0byB1cGxvYWQgbG9nbycpO1xyXG4gICAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgICAgIHNldFVwbG9hZGluZ0xvZ28oZmFsc2UpO1xyXG4gICAgICAgICAgICBldmVudC50YXJnZXQudmFsdWUgPSAnJztcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IGhhbmRsZVRoZW1lSW1hZ2VVcGxvYWQgPSBhc3luYyAoZXZlbnQsIG9uVXBsb2FkZWQsIHByZXZpb3VzVXJsID0gJycpID0+IHtcclxuICAgICAgICBjb25zdCBmaWxlID0gZXZlbnQudGFyZ2V0LmZpbGVzPy5bMF07XHJcbiAgICAgICAgaWYgKCFmaWxlKSByZXR1cm47XHJcblxyXG4gICAgICAgIGNvbnN0IGZvcm1EYXRhID0gbmV3IEZvcm1EYXRhKCk7XHJcbiAgICAgICAgZm9ybURhdGEuYXBwZW5kKCdpbWFnZScsIGZpbGUpO1xyXG4gICAgICAgIHNldFVwbG9hZGluZ1RoZW1lSW1hZ2UodHJ1ZSk7XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgZGF0YSB9ID0gYXdhaXQgQVBJLnBvc3QoJy9zdG9yZS1idWlsZGVyL2FkbWluL2ltYWdlJywgZm9ybURhdGEsIHtcclxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdtdWx0aXBhcnQvZm9ybS1kYXRhJyB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBjb25zdCB1cmwgPSBkYXRhLmRhdGE/LnVybDtcclxuICAgICAgICAgICAgaWYgKCF1cmwpIHRocm93IG5ldyBFcnJvcignVXBsb2FkIGRpZCBub3QgcmV0dXJuIGFuIGltYWdlIFVSTCcpO1xyXG4gICAgICAgICAgICByZW1lbWJlclRlbXBvcmFyeUFzc2V0KGRhdGEuZGF0YSk7XHJcbiAgICAgICAgICAgIGlmIChwcmV2aW91c1VybCAmJiBwcmV2aW91c1VybCAhPT0gdXJsKSBkaXNjYXJkVGVtcG9yYXJ5QXNzZXQocHJldmlvdXNVcmwpO1xyXG4gICAgICAgICAgICBvblVwbG9hZGVkKHVybCwgZGF0YS5kYXRhIHx8IHt9KTtcclxuICAgICAgICAgICAgdG9hc3Quc3VjY2VzcygnSW1hZ2UgdXBsb2FkZWQnKTtcclxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgdG9hc3QuZXJyb3IoZXJyLnJlc3BvbnNlPy5kYXRhPy5lcnJvciB8fCBlcnIubWVzc2FnZSB8fCAnRmFpbGVkIHRvIHVwbG9hZCBpbWFnZScpO1xyXG4gICAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgICAgIHNldFVwbG9hZGluZ1RoZW1lSW1hZ2UoZmFsc2UpO1xyXG4gICAgICAgICAgICBldmVudC50YXJnZXQudmFsdWUgPSAnJztcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IGhhbmRsZUJhbm5lckltYWdlc1VwbG9hZCA9IGFzeW5jIChldmVudCwgc2VjdGlvbkluZGV4LCBrZXkpID0+IHtcclxuICAgICAgICBjb25zdCBmaWxlcyA9IEFycmF5LmZyb20oZXZlbnQudGFyZ2V0LmZpbGVzIHx8IFtdKTtcclxuICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID09PSAwKSByZXR1cm47XHJcblxyXG4gICAgICAgIGNvbnN0IHNlY3Rpb24gPSB0aGVtZS5ob21lcGFnZVNlY3Rpb25zPy5bc2VjdGlvbkluZGV4XTtcclxuICAgICAgICBjb25zdCBjdXJyZW50SW1hZ2VzID0gZ2V0QmFubmVySW1hZ2VzKHNlY3Rpb24gfHwge30sIGtleSk7XHJcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlU2xvdHMgPSBNYXRoLm1heCgwLCA1IC0gY3VycmVudEltYWdlcy5sZW5ndGgpO1xyXG4gICAgICAgIGNvbnN0IHVwbG9hZEZpbGVzID0gZmlsZXMuc2xpY2UoMCwgYXZhaWxhYmxlU2xvdHMpO1xyXG5cclxuICAgICAgICBpZiAoYXZhaWxhYmxlU2xvdHMgPT09IDApIHtcclxuICAgICAgICAgICAgdG9hc3QuZXJyb3IoJ1lvdSBjYW4gYWRkIHVwIHRvIDUgaW1hZ2VzLicpO1xyXG4gICAgICAgICAgICBldmVudC50YXJnZXQudmFsdWUgPSAnJztcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID4gYXZhaWxhYmxlU2xvdHMpIHtcclxuICAgICAgICAgICAgdG9hc3QuZXJyb3IoYE9ubHkgJHthdmFpbGFibGVTbG90c30gbW9yZSBpbWFnZSR7YXZhaWxhYmxlU2xvdHMgPT09IDEgPyAnJyA6ICdzJ30gY2FuIGJlIGFkZGVkLmApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0VXBsb2FkaW5nVGhlbWVJbWFnZSh0cnVlKTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgUHJvbWlzZS5hbGxTZXR0bGVkKHVwbG9hZEZpbGVzLm1hcChhc3luYyBmaWxlID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1EYXRhID0gbmV3IEZvcm1EYXRhKCk7XHJcbiAgICAgICAgICAgICAgICBmb3JtRGF0YS5hcHBlbmQoJ2ltYWdlJywgZmlsZSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB7IGRhdGEgfSA9IGF3YWl0IEFQSS5wb3N0KCcvc3RvcmUtYnVpbGRlci9hZG1pbi9pbWFnZScsIGZvcm1EYXRhLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ211bHRpcGFydC9mb3JtLWRhdGEnIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFkYXRhLmRhdGE/LnVybCkgdGhyb3cgbmV3IEVycm9yKCdVcGxvYWQgZGlkIG5vdCByZXR1cm4gYW4gaW1hZ2UgVVJMJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS5kYXRhO1xyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHVwbG9hZGVkQXNzZXRzID0gcmVzdWx0cy5maWx0ZXIocmVzdWx0ID0+IHJlc3VsdC5zdGF0dXMgPT09ICdmdWxmaWxsZWQnKS5tYXAocmVzdWx0ID0+IHJlc3VsdC52YWx1ZSk7XHJcbiAgICAgICAgICAgIHVwbG9hZGVkQXNzZXRzLmZvckVhY2gocmVtZW1iZXJUZW1wb3JhcnlBc3NldCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHVwbG9hZGVkVXJscyA9IHVwbG9hZGVkQXNzZXRzLm1hcChhc3NldCA9PiBhc3NldC51cmwpO1xyXG4gICAgICAgICAgICBjb25zdCBmYWlsZWRDb3VudCA9IHJlc3VsdHMubGVuZ3RoIC0gdXBsb2FkZWRVcmxzLmxlbmd0aDtcclxuICAgICAgICAgICAgdXBkYXRlQmFubmVySW1hZ2VzKHNlY3Rpb25JbmRleCwga2V5LCBbLi4uY3VycmVudEltYWdlcywgLi4udXBsb2FkZWRVcmxzXSk7XHJcbiAgICAgICAgICAgIGlmICh1cGxvYWRlZFVybHMubGVuZ3RoID4gMCkgdG9hc3Quc3VjY2VzcyhgJHt1cGxvYWRlZFVybHMubGVuZ3RofSBiYW5uZXIgaW1hZ2Uke3VwbG9hZGVkVXJscy5sZW5ndGggPT09IDEgPyAnJyA6ICdzJ30gdXBsb2FkZWRgKTtcclxuICAgICAgICAgICAgaWYgKGZhaWxlZENvdW50ID4gMCkgdG9hc3QuZXJyb3IoYCR7ZmFpbGVkQ291bnR9IGltYWdlIHVwbG9hZCR7ZmFpbGVkQ291bnQgPT09IDEgPyAnJyA6ICdzJ30gZmFpbGVkLiBTdWNjZXNzZnVsIHVwbG9hZHMgd2VyZSBrZXB0IGluIHRoaXMgZHJhZnQuYCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIHRvYXN0LmVycm9yKGVyci5yZXNwb25zZT8uZGF0YT8uZXJyb3IgfHwgZXJyLm1lc3NhZ2UgfHwgJ0ZhaWxlZCB0byB1cGxvYWQgYmFubmVyIGltYWdlcycpO1xyXG4gICAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgICAgIHNldFVwbG9hZGluZ1RoZW1lSW1hZ2UoZmFsc2UpO1xyXG4gICAgICAgICAgICBldmVudC50YXJnZXQudmFsdWUgPSAnJztcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IGhhbmRsZVNhdmUgPSAoKSA9PiB7XHJcbiAgICAgICAgaWYgKHZhbGlkYXRpb24ubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICB0b2FzdC5lcnJvcih2YWxpZGF0aW9uWzBdKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIWhhc1Vuc2F2ZWRDaGFuZ2VzKSB7XHJcbiAgICAgICAgICAgIHRvYXN0KCdUaGVyZSBhcmUgbm8gdW5wdWJsaXNoZWQgU3RvcmUgQnVpbGRlciBjaGFuZ2VzLicpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNldFB1Ymxpc2hSZXZpZXdPcGVuKHRydWUpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBwdWJsaXNoQ2hhbmdlcyA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICBpZiAoc2F2aW5nKSByZXR1cm47XHJcbiAgICAgICAgc2V0U2F2aW5nKHRydWUpO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHBheWxvYWQgPSB7XHJcbiAgICAgICAgICAgICAgICB0aGVtZSxcclxuICAgICAgICAgICAgICAgIHNlYXJjaEFsaWFzZXMsXHJcbiAgICAgICAgICAgICAgICBzdG9yZXdpZGVEaXNjb3VudDogTWF0aC5tYXgoMCwgTWF0aC5taW4oMTAwLCBOdW1iZXIoc3RvcmV3aWRlRGlzY291bnQpIHx8IDApKSxcclxuICAgICAgICAgICAgICAgIGV4cGVjdGVkUmV2aXNpb246IHRoZW1lUmV2aXNpb24sXHJcbiAgICAgICAgICAgICAgICBleHBlY3RlZFNob3BJZDogaHlkcmF0ZWRTaG9wS2V5XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGF3YWl0IGF1dG9zYXZlLnBhdXNlKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgZGF0YSB9ID0gYXdhaXQgQVBJLnBhdGNoKCcvc3RvcmUtYnVpbGRlci9hZG1pbicsIHBheWxvYWQpO1xyXG4gICAgICAgICAgICBjb25zdCBzYXZlZFNob3AgPSBkYXRhLmRhdGEgfHwge307XHJcbiAgICAgICAgICAgIGNvbnN0IGhhc1NhdmVkVGhlbWUgPSBzYXZlZFNob3AudGhlbWUgJiYgT2JqZWN0LmtleXMoc2F2ZWRTaG9wLnRoZW1lKS5sZW5ndGggPiAwO1xyXG4gICAgICAgICAgICBjb25zdCBuZXh0VGhlbWUgPSBoYXNTYXZlZFRoZW1lID8gbG9hZEJ1aWxkZXJUaGVtZShzYXZlZFNob3AudGhlbWUpIDogdGhlbWU7XHJcbiAgICAgICAgICAgIGNvbnN0IG5leHRTZWFyY2hBbGlhc2VzID0gQXJyYXkuaXNBcnJheShzYXZlZFNob3Auc2VhcmNoQWxpYXNlcykgPyBzYXZlZFNob3Auc2VhcmNoQWxpYXNlcyA6IHNlYXJjaEFsaWFzZXM7XHJcbiAgICAgICAgICAgIGNvbnN0IG5leHREb21haW4gPSBzYXZlZFNob3AuY3VzdG9tRG9tYWluIHx8IGN1c3RvbURvbWFpbjtcclxuICAgICAgICAgICAgY29uc3QgbmV4dERpc2NvdW50ID0gTnVtYmVyKHNhdmVkU2hvcC5zdG9yZXdpZGVEaXNjb3VudCA/PyBwYXlsb2FkLnN0b3Jld2lkZURpc2NvdW50KSB8fCAwO1xyXG4gICAgICAgICAgICBjb25zdCBuZXh0U2hvcEtleSA9IFN0cmluZyhzYXZlZFNob3AuX2lkIHx8IHNhdmVkU2hvcC5pZCB8fCBzYXZlZFNob3Auc3ViZG9tYWluIHx8IGh5ZHJhdGVkU2hvcEtleSB8fCAnJyk7XHJcbiAgICAgICAgICAgIHNldFNhdmVkVGhlbWUobmV4dFRoZW1lKTtcclxuICAgICAgICAgICAgaWYgKHNhdmVkU2hvcC5wbGFuQWNjZXNzKSBzZXRQbGFuQWNjZXNzKHNhdmVkU2hvcC5wbGFuQWNjZXNzKTtcclxuICAgICAgICAgICAgc2V0SHlkcmF0ZWRTaG9wS2V5KG5leHRTaG9wS2V5KTtcclxuICAgICAgICAgICAgc2V0VGhlbWUobmV4dFRoZW1lKTtcclxuICAgICAgICAgICAgc2V0U2VhcmNoQWxpYXNlcyhuZXh0U2VhcmNoQWxpYXNlcyk7XHJcbiAgICAgICAgICAgIHNldEN1c3RvbURvbWFpbihuZXh0RG9tYWluKTtcclxuICAgICAgICAgICAgc2V0U3RvcmV3aWRlRGlzY291bnQobmV4dERpc2NvdW50KTtcclxuICAgICAgICAgICAgY29uc3QgcHVibGlzaGVkU25hcHNob3QgPSBzdGFibGVTdHJpbmdpZnkoeyB0aGVtZTogbmV4dFRoZW1lLCBzZWFyY2hBbGlhc2VzOiBuZXh0U2VhcmNoQWxpYXNlcywgY3VzdG9tRG9tYWluOiBuZXh0RG9tYWluLCBzdG9yZXdpZGVEaXNjb3VudDogbmV4dERpc2NvdW50IH0pO1xyXG4gICAgICAgICAgICBjb25zdCBwdWJsaXNoZWRBdCA9IHNhdmVkU2hvcC5sYXN0UHVibGlzaGVkQXQgfHwgbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xyXG4gICAgICAgICAgICBjb25zdCBuZXh0UmV2aXNpb24gPSBOdW1iZXIoc2F2ZWRTaG9wLnRoZW1lUmV2aXNpb24gPz8gdGhlbWVSZXZpc2lvbiArIDEpO1xyXG4gICAgICAgICAgICBzZXRJbml0aWFsU25hcHNob3QocHVibGlzaGVkU25hcHNob3QpO1xyXG4gICAgICAgICAgICBzZXRMYXN0U2F2ZWRBdChwdWJsaXNoZWRBdCk7XHJcbiAgICAgICAgICAgIHNldExhc3RQdWJsaXNoZWRBdChwdWJsaXNoZWRBdCk7XHJcbiAgICAgICAgICAgIHNldFRoZW1lUmV2aXNpb24obmV4dFJldmlzaW9uKTtcclxuICAgICAgICAgICAgc2V0UmV2aXNpb25zKHByZXYgPT4gW3tcclxuICAgICAgICAgICAgICAgIF9pZDogYHJldmlzaW9uLSR7bmV4dFJldmlzaW9ufWAsXHJcbiAgICAgICAgICAgICAgICByZXZpc2lvbjogbmV4dFJldmlzaW9uLFxyXG4gICAgICAgICAgICAgICAgc291cmNlOiAncHVibGlzaCcsXHJcbiAgICAgICAgICAgICAgICBjaGFuZ2VTdW1tYXJ5OiBzYXZlZFNob3AuY2hhbmdlU3VtbWFyeSB8fCBwdWJsaXNoQ2hhbmdlU3VtbWFyeSxcclxuICAgICAgICAgICAgICAgIGNyZWF0ZWRBdDogcHVibGlzaGVkQXRcclxuICAgICAgICAgICAgfSwgLi4ucHJldi5maWx0ZXIoaXRlbSA9PiBOdW1iZXIoaXRlbS5yZXZpc2lvbikgIT09IG5leHRSZXZpc2lvbildLnNsaWNlKDAsIDEwKSk7XHJcbiAgICAgICAgICAgIGxhc3RIaXN0b3J5U25hcHNob3RSZWYuY3VycmVudCA9IHB1Ymxpc2hlZFNuYXBzaG90O1xyXG4gICAgICAgICAgICBzZXRFZGl0b3JIaXN0b3J5KHsgcGFzdDogW10sIGZ1dHVyZTogW10gfSk7XHJcbiAgICAgICAgICAgIHNldFB1Ymxpc2hSZXZpZXdPcGVuKGZhbHNlKTtcclxuICAgICAgICAgICAgc2V0VGhlbWVDb25mbGljdChudWxsKTtcclxuICAgICAgICAgICAgY2xlYXJUZW1wb3JhcnlBc3NldHMoKTtcclxuICAgICAgICAgICAgYXdhaXQgYXV0b3NhdmUuY2xlYXJSZWNvdmVyeSh7IGNsZWFyU2VydmVyOiBmYWxzZSB9KTtcclxuICAgICAgICAgICAgaWYgKCFoYXNTYXZlZFRoZW1lKSB7XHJcbiAgICAgICAgICAgICAgICB0b2FzdCgnU3RvcmUgZGVzaWduIHB1Ymxpc2hlZCwgYnV0IHRoZSBzZXJ2ZXIgZGlkIG5vdCByZXR1cm4gdGhlIGZ1bGwgdGhlbWUuIEtlZXBpbmcgeW91ciBjdXJyZW50IHByZXZpZXcgdmlzaWJsZS4nKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRvYXN0LnN1Y2Nlc3MoJ1N0b3JlIGRlc2lnbiBwdWJsaXNoZWQuIFlvdXIgcHJldmlldyBpcyB1cCB0byBkYXRlLicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIGlmIChlcnIucmVzcG9uc2U/LnN0YXR1cyA9PT0gNDA5ICYmIGVyci5yZXNwb25zZT8uZGF0YT8uY29kZSA9PT0gJ1RIRU1FX0NPTkZMSUNUJykge1xyXG4gICAgICAgICAgICAgICAgc2V0VGhlbWVDb25mbGljdCh7XHJcbiAgICAgICAgICAgICAgICAgICAgbGF0ZXN0UmV2aXNpb246IGVyci5yZXNwb25zZS5kYXRhLmxhdGVzdFJldmlzaW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIGxhc3RQdWJsaXNoZWRBdDogZXJyLnJlc3BvbnNlLmRhdGEubGFzdFB1Ymxpc2hlZEF0LFxyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGVyci5yZXNwb25zZS5kYXRhLmVycm9yIHx8IGVyci5yZXNwb25zZS5kYXRhLm1lc3NhZ2VcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgc2V0UHVibGlzaFJldmlld09wZW4oZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgdG9hc3QuZXJyb3IoJ0EgbmV3ZXIgc3RvcmVmcm9udCB2ZXJzaW9uIHdhcyBwdWJsaXNoZWQuIFlvdXIgZHJhZnQgaXMgc3RpbGwgc2FmZS4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0b2FzdC5lcnJvcihlcnIucmVzcG9uc2U/LmRhdGE/LmVycm9yIHx8ICdGYWlsZWQgdG8gc2F2ZSBzdG9yZSBidWlsZGVyJyk7XHJcbiAgICAgICAgfSBmaW5hbGx5IHtcclxuICAgICAgICAgICAgYXV0b3NhdmUucmVzdW1lKCk7XHJcbiAgICAgICAgICAgIHNldFNhdmluZyhmYWxzZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICB1c2VFZmZlY3QoKCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGhhbmRsZVNob3J0Y3V0cyA9IChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoc2F2aW5nKSByZXR1cm47XHJcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGV2ZW50LnRhcmdldDtcclxuICAgICAgICAgICAgY29uc3QgaXNFZGl0YWJsZSA9IHRhcmdldD8uaXNDb250ZW50RWRpdGFibGUgfHwgWydJTlBVVCcsICdURVhUQVJFQScsICdTRUxFQ1QnXS5pbmNsdWRlcyh0YXJnZXQ/LnRhZ05hbWUpO1xyXG4gICAgICAgICAgICBjb25zdCBjb21tYW5kS2V5ID0gZXZlbnQubWV0YUtleSB8fCBldmVudC5jdHJsS2V5O1xyXG4gICAgICAgICAgICBpZiAoIWNvbW1hbmRLZXkpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGV2ZW50LmtleS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICBpZiAoIWlzRWRpdGFibGUgJiYga2V5ID09PSAneicgJiYgIWV2ZW50LnNoaWZ0S2V5KSB7XHJcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgdW5kb0J1aWxkZXJDaGFuZ2UoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFpc0VkaXRhYmxlICYmICgoa2V5ID09PSAneicgJiYgZXZlbnQuc2hpZnRLZXkpIHx8IGtleSA9PT0gJ3knKSkge1xyXG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgIHJlZG9CdWlsZGVyQ2hhbmdlKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChrZXkgPT09ICdzJykge1xyXG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgIGlmICghc2F2aW5nICYmIHZhbGlkYXRpb24ubGVuZ3RoID09PSAwKSBoYW5kbGVTYXZlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsZVNob3J0Y3V0cyk7XHJcbiAgICAgICAgcmV0dXJuICgpID0+IHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXlkb3duJywgaGFuZGxlU2hvcnRjdXRzKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlbmRlclBhbmVsID0gKCkgPT4ge1xyXG4gICAgICAgIGlmIChzZWxlY3RlZFBsYW5SZXN0cmljdGlvbikge1xyXG4gICAgICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3VuZGVkLWxnIGJvcmRlciBib3JkZXItYmx1ZS0yMDAgYmctYmx1ZS01MCBwLTVcIj5cclxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtc3RhcnQgZ2FwLTNcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPExvY2sgY2xhc3NOYW1lPVwibXQtMC41IGgtNSB3LTUgdGV4dC1ibHVlLTcwMFwiIC8+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwiZm9udC1ibGFjayB0ZXh0LXNsYXRlLTk1MFwiPkF2YWlsYWJsZSB3aXRoIEdyb3d0aDwvaDM+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0xIHRleHQtc20gbGVhZGluZy02IHRleHQtc2xhdGUtNjAwXCI+e3NlbGVjdGVkUGxhblJlc3RyaWN0aW9ufTwvcD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIvZGFzaGJvYXJkL2JpbGxpbmdcIiBjbGFzc05hbWU9XCJtdC0zIGlubGluZS1mbGV4IHJvdW5kZWQtbGcgYmctYmx1ZS02MDAgcHgtNCBweS0yIHRleHQtc20gZm9udC1ibGFjayB0ZXh0LXdoaXRlIGhvdmVyOmJnLWJsdWUtNzAwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVmlldyBwbGFuc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzd2l0Y2ggKGFjdGl2ZUdyb3VwKSB7XHJcbiAgICAgICAgICAgIGNhc2UgJ2JyYW5kJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgICAgICAgICAgPFN1c3BlbnNlIGZhbGxiYWNrPXs8ZGl2IGNsYXNzTmFtZT1cImgtNzIgYW5pbWF0ZS1wdWxzZSByb3VuZGVkLWxnIGJvcmRlciBib3JkZXItc2xhdGUtMjAwIGJnLXNsYXRlLTEwMFwiIC8+fT5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPEJyYW5kRWRpdG9yIHRoZW1lPXt0aGVtZX0gc2V0VGhlbWU9e3NldFRoZW1lfSB1cGxvYWRpbmdMb2dvPXt1cGxvYWRpbmdMb2dvfSBvbkxvZ29VcGxvYWQ9e2hhbmRsZUxvZ29VcGxvYWR9IC8+XHJcbiAgICAgICAgICAgICAgICAgICAgPC9TdXNwZW5zZT5cclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2NvbG9ycyc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICAgICAgICAgIDxDb2xvckVkaXRvclxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFuQWNjZXNzPXtwbGFuQWNjZXNzfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGVtZT17dGhlbWV9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yTW9kZT17Y29sb3JNb2RlfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRDb2xvck1vZGU9e3NldENvbG9yTW9kZX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgY29sb3JTZWFyY2g9e2NvbG9yU2VhcmNofVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRDb2xvclNlYXJjaD17c2V0Q29sb3JTZWFyY2h9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5Db2xvclNlY3Rpb249e29wZW5Db2xvclNlY3Rpb259XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldE9wZW5Db2xvclNlY3Rpb249e3NldE9wZW5Db2xvclNlY3Rpb259XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkdmFuY2VkQ29sb3JzT3Blbj17YWR2YW5jZWRDb2xvcnNPcGVufVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRBZHZhbmNlZENvbG9yc09wZW49e3NldEFkdmFuY2VkQ29sb3JzT3Blbn1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0VGhlbWVDb2xvcj17Z2V0VGhlbWVDb2xvcn1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0Q29udHJhc3RXYXJuaW5nPXtnZXRDb250cmFzdFdhcm5pbmd9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldENvbG9yUGF0aD17c2V0Q29sb3JQYXRofVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRNYWluQnJhbmRDb2xvcj17c2V0TWFpbkJyYW5kQ29sb3J9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcGx5QnJhbmRDb2xvcj17YXBwbHlCcmFuZENvbG9yfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNldENvbG9yUGFsZXR0ZT17cmVzZXRDb2xvclBhbGV0dGV9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcGx5Q29sb3JTZXQ9e2FwcGx5Q29sb3JTZXR9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc2V0Q29sb3JHcm91cD17cmVzZXRDb2xvckdyb3VwfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRDb2xvcj17c2V0Q29sb3J9XHJcbiAgICAgICAgICAgICAgICAgICAgLz5cclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3R5cG9ncmFwaHknOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgICAgICAgICA8VHlwb2dyYXBoeUVkaXRvciB0aGVtZT17dGhlbWV9IHNldFRoZW1lR3JvdXA9e3NldFRoZW1lR3JvdXB9IC8+XHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBjYXNlICdsYXlvdXQnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgICAgICAgICA8TGF5b3V0RWRpdG9yIHRoZW1lPXt0aGVtZX0gc2V0VGhlbWU9e3NldFRoZW1lfSBzZXRUaGVtZUdyb3VwPXtzZXRUaGVtZUdyb3VwfSBjYXBhYmlsaXRpZXM9e3RoZW1lQ2FwYWJpbGl0aWVzfSAvPlxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgY2FzZSAnbmF2aWdhdGlvbic6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICAgICAgICAgIDxOYXZpZ2F0aW9uRWRpdG9yXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoZW1lPXt0aGVtZX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGhlbWU9e3NldFRoZW1lfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cGxvYWRpbmdMb2dvPXt1cGxvYWRpbmdMb2dvfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkxvZ29VcGxvYWQ9e2hhbmRsZUxvZ29VcGxvYWR9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZE5hdmlnYXRpb249e2FkZE5hdmlnYXRpb259XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZE5hdmlnYXRpb25Ecm9wZG93bj17YWRkTmF2aWdhdGlvbkRyb3Bkb3dufVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb3ZlTmF2aWdhdGlvbj17bW92ZU5hdmlnYXRpb259XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZU5hdmlnYXRpb249e3JlbW92ZU5hdmlnYXRpb259XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZU5hdmlnYXRpb249e3VwZGF0ZU5hdmlnYXRpb259XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZE5hdmlnYXRpb25DaGlsZD17YWRkTmF2aWdhdGlvbkNoaWxkfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVOYXZpZ2F0aW9uQ2hpbGQ9e3VwZGF0ZU5hdmlnYXRpb25DaGlsZH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlTmF2aWdhdGlvbkNoaWxkPXtyZW1vdmVOYXZpZ2F0aW9uQ2hpbGR9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcGFiaWxpdGllcz17dGhlbWVDYXBhYmlsaXRpZXN9XHJcbiAgICAgICAgICAgICAgICAgICAgLz5cclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2hlcm8nOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgICAgICAgICA8SGVyb0VkaXRvclxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGVtZT17dGhlbWV9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwbG9hZGluZ1RoZW1lSW1hZ2U9e3VwbG9hZGluZ1RoZW1lSW1hZ2V9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRoZW1lR3JvdXA9e3NldFRoZW1lR3JvdXB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZEhlcm9TbGlkZT17YWRkSGVyb1NsaWRlfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVIZXJvU2xpZGU9e3VwZGF0ZUhlcm9TbGlkZX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgbW92ZUhlcm9TbGlkZT17bW92ZUhlcm9TbGlkZX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlSGVyb1NsaWRlPXtyZW1vdmVIZXJvU2xpZGV9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZVRoZW1lSW1hZ2VVcGxvYWQ9e2hhbmRsZVRoZW1lSW1hZ2VVcGxvYWR9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcGFiaWxpdGllcz17dGhlbWVDYXBhYmlsaXRpZXN9XHJcbiAgICAgICAgICAgICAgICAgICAgLz5cclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3Nlbyc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICAgICAgICAgIDxTZW9TdGF0dXNFZGl0b3IgaGVhbHRoPXtzdG9yZVNlb0hlYWx0aH0gLz5cclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3Byb2R1Y3RzJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgICAgICAgICAgPFByb2R1Y3RDYXJkc0VkaXRvclxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGVtZT17dGhlbWV9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRoZW1lR3JvdXA9e3NldFRoZW1lR3JvdXB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvZ2dsZVRoZW1lR3JvdXA9e3RvZ2dsZVRoZW1lR3JvdXB9XHJcbiAgICAgICAgICAgICAgICAgICAgLz5cclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3NlY3Rpb25zJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgICAgICAgICAgPER5bmFtaWNTZWN0aW9uc0VkaXRvclxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGVtZT17dGhlbWV9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUVsZW1lbnQ9e2FjdGl2ZUVsZW1lbnR9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVByb2R1Y3RzPXthdmFpbGFibGVQcm9kdWN0c31cclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvZHVjdE9wdGlvbnM9e3Byb2R1Y3RPcHRpb25zfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVSZXZpZXdzPXthdmFpbGFibGVSZXZpZXdzfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9kdWN0Q2F0ZWdvcmllcz17cHJvZHVjdENhdGVnb3JpZXN9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2R1Y3RQaWNrZXI9e3Byb2R1Y3RQaWNrZXJ9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFByb2R1Y3RQaWNrZXI9e3NldFByb2R1Y3RQaWNrZXJ9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldmlld1BpY2tlcj17cmV2aWV3UGlja2VyfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRSZXZpZXdQaWNrZXI9e3NldFJldmlld1BpY2tlcn1cclxuICAgICAgICAgICAgICAgICAgICAgICAgdXBsb2FkaW5nVGhlbWVJbWFnZT17dXBsb2FkaW5nVGhlbWVJbWFnZX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlVGhlbWVJbWFnZVVwbG9hZD17aGFuZGxlVGhlbWVJbWFnZVVwbG9hZH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYWRkSG9tZXBhZ2VTZWN0aW9uPXthZGRIb21lcGFnZVNlY3Rpb259XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvZ2dsZUhvbWVwYWdlU2VjdGlvbkxvY2s9e3RvZ2dsZUhvbWVwYWdlU2VjdGlvbkxvY2t9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZUhvbWVwYWdlU2VjdGlvbj17dXBkYXRlSG9tZXBhZ2VTZWN0aW9ufVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBnZXRCYW5uZXJJbWFnZXM9e2dldEJhbm5lckltYWdlc31cclxuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlQmFubmVySW1hZ2VzVXBsb2FkPXtoYW5kbGVCYW5uZXJJbWFnZXNVcGxvYWR9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZUJhbm5lckltYWdlPXtyZW1vdmVCYW5uZXJJbWFnZX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgbW92ZUJhbm5lckltYWdlPXttb3ZlQmFubmVySW1hZ2V9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZEJhbm5lckltYWdlVXJsPXthZGRCYW5uZXJJbWFnZVVybH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlSG9tZXBhZ2VTZWN0aW9uU2V0dGluZz17dXBkYXRlSG9tZXBhZ2VTZWN0aW9uU2V0dGluZ31cclxuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlSG9tZXBhZ2VTZWN0aW9uRGVza3RvcFNldHRpbmc9e3VwZGF0ZUhvbWVwYWdlU2VjdGlvbkRlc2t0b3BTZXR0aW5nfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVIb21lcGFnZVNlY3Rpb25Nb2JpbGVTZXR0aW5nPXt1cGRhdGVIb21lcGFnZVNlY3Rpb25Nb2JpbGVTZXR0aW5nfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2FkUHJvZHVjdE9wdGlvbnM9e2xvYWRQcm9kdWN0T3B0aW9uc31cclxuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlRmVhdHVyZWRQcm9kdWN0c1NlbGVjdGlvbj17dXBkYXRlRmVhdHVyZWRQcm9kdWN0c1NlbGVjdGlvbn1cclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9hZFJldmlld09wdGlvbnM9e2xvYWRSZXZpZXdPcHRpb25zfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVSZXZpZXdTZWxlY3Rpb249e3VwZGF0ZVJldmlld1NlbGVjdGlvbn1cclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FwYWJpbGl0aWVzPXt0aGVtZUNhcGFiaWxpdGllc31cclxuICAgICAgICAgICAgICAgICAgICAvPlxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgY2FzZSAnY2hlY2tvdXQnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgICAgICAgICA8Q2hlY2tvdXRFZGl0b3IgdGhlbWU9e3RoZW1lfSBzaG9wTmFtZT17c2hvcE5hbWV9IHVwbG9hZGluZ0xvZ289e3VwbG9hZGluZ0xvZ299IG9uTG9nb1VwbG9hZD17aGFuZGxlTG9nb1VwbG9hZH0gc2V0VGhlbWVHcm91cD17c2V0VGhlbWVHcm91cH0gLz5cclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGNhc2UgJ21vYmlsZSc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgICAgICAgICAgICAgIDxNb2JpbGVFZGl0b3IgcGxhbkFjY2Vzcz17cGxhbkFjY2Vzc30gdGhlbWU9e3RoZW1lfSBzZXRUaGVtZUdyb3VwPXtzZXRUaGVtZUdyb3VwfSB0b2dnbGVUaGVtZUdyb3VwPXt0b2dnbGVUaGVtZUdyb3VwfSAvPlxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgY2FzZSAnZm9vdGVyJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgICAgICAgICAgPEZvb3RlckVkaXRvciB0aGVtZT17dGhlbWV9IHVwZGF0ZUZvb3Rlcj17dXBkYXRlRm9vdGVyfSBhZGRGb290ZXJMaW5rPXthZGRGb290ZXJMaW5rfSByZW1vdmVGb290ZXJMaW5rPXtyZW1vdmVGb290ZXJMaW5rfSB1cGRhdGVGb290ZXJMaW5rPXt1cGRhdGVGb290ZXJMaW5rfSAvPlxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgY2FzZSAncG9saWNpZXMnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgICAgICAgICA8UG9saWNpZXNFZGl0b3IgdGhlbWU9e3RoZW1lfSBzaG9wTmFtZT17c2hvcE5hbWV9IHVwZGF0ZVBvbGljeT17dXBkYXRlUG9saWN5fSByZXNldFBvbGljeVRvRGVmYXVsdD17cmVzZXRQb2xpY3lUb0RlZmF1bHR9IC8+XHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBpZiAobG9hZGluZykge1xyXG4gICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicC02XCI+XHJcbiAgICAgICAgICAgICAgICA8QWRtaW5Mb2FkaW5nU3RhdGVcclxuICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIkxvYWRpbmcgc3RvcmUgYnVpbGRlclwiXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb249XCJXZSBhcmUgcHJlcGFyaW5nIHlvdXIgdGhlbWUgc2V0dGluZ3MsIHByb2R1Y3RzLCByZXZpZXdzLCBzZWN0aW9ucywgYW5kIGxpdmUgcHJldmlldy5cIlxyXG4gICAgICAgICAgICAgICAgLz5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoYm9vdHN0cmFwRXJyb3IgJiYgIWJvb3RzdHJhcD8uc2hvcCkge1xyXG4gICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicC02XCI+XHJcbiAgICAgICAgICAgICAgICA8QWRtaW5FcnJvclN0YXRlXHJcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCJTdG9yZSBCdWlsZGVyIGNvdWxkIG5vdCBsb2FkXCJcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbj17Ym9vdHN0cmFwRXJyb3J9XHJcbiAgICAgICAgICAgICAgICAgICAgb25SZXRyeT17KCkgPT4gcmVsb2FkQm9vdHN0cmFwKCkuY2F0Y2goKCkgPT4ge30pfVxyXG4gICAgICAgICAgICAgICAgLz5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gKFxyXG4gICAgICAgIDxTdG9yZUJ1aWxkZXJTaGVsbCBidXN5PXtzYXZpbmd9PlxyXG4gICAgICAgICAgICA8U3RvcmVCdWlsZGVySGVhZGVyXHJcbiAgICAgICAgICAgICAgICBoYXNVbnNhdmVkQ2hhbmdlcz17aGFzVW5zYXZlZENoYW5nZXN9XHJcbiAgICAgICAgICAgICAgICBzdGF0dXNMYWJlbD17aGFzVW5zYXZlZENoYW5nZXMgPyAnVW5zYXZlZCBjaGFuZ2VzJyA6ICdQdWJsaXNoZWQnfVxyXG4gICAgICAgICAgICAgICAgbGFzdFNhdmVkTGFiZWw9e2Zvcm1hdEJ1aWxkZXJEYXRlKGxhc3RTYXZlZEF0KSB8fCAnQ3VycmVudCBzZXNzaW9uJ31cclxuICAgICAgICAgICAgICAgIGxhc3RQdWJsaXNoZWRMYWJlbD17Zm9ybWF0QnVpbGRlckRhdGUobGFzdFB1Ymxpc2hlZEF0KSB8fCBwdWJsaXNoZWRWZXJzaW9uTGFiZWx9XHJcbiAgICAgICAgICAgICAgICBjYW5VbmRvPXtjYW5VbmRvfVxyXG4gICAgICAgICAgICAgICAgY2FuUmVkbz17Y2FuUmVkb31cclxuICAgICAgICAgICAgICAgIHNhdmluZz17c2F2aW5nfVxyXG4gICAgICAgICAgICAgICAgdmFsaWRhdGlvbkNvdW50PXt2YWxpZGF0aW9uLmxlbmd0aH1cclxuICAgICAgICAgICAgICAgIG9uVW5kbz17dW5kb0J1aWxkZXJDaGFuZ2V9XHJcbiAgICAgICAgICAgICAgICBvblJlZG89e3JlZG9CdWlsZGVyQ2hhbmdlfVxyXG4gICAgICAgICAgICAgICAgb25SZXNldFN0eWxpbmc9e3Jlc2V0U3R5bGluZ31cclxuICAgICAgICAgICAgICAgIG9uUmVzdG9yZVB1Ymxpc2hlZD17cmVzdG9yZVB1Ymxpc2hlZFZlcnNpb259XHJcbiAgICAgICAgICAgICAgICBvblNhdmVEcmFmdD17c2F2ZURyYWZ0Tm93fVxyXG4gICAgICAgICAgICAgICAgb25SZWxvYWQ9e3JlbG9hZFB1Ymxpc2hlZFZlcnNpb259XHJcbiAgICAgICAgICAgICAgICBvblNhdmU9e2hhbmRsZVNhdmV9XHJcbiAgICAgICAgICAgICAgICBvbk9wZW5Jc3N1ZXM9eygpID0+IHNldElzc3Vlc09wZW4odHJ1ZSl9XHJcbiAgICAgICAgICAgICAgICBvbk9wZW5IaXN0b3J5PXsoKSA9PiBzZXRIaXN0b3J5T3Blbih0cnVlKX1cclxuICAgICAgICAgICAgICAgIG9uT3BlblRoZW1lcz17KCkgPT4gc2V0VGhlbWVHYWxsZXJ5T3Blbih0cnVlKX1cclxuICAgICAgICAgICAgICAgIGxpdmVTdG9yZVVybD17bGl2ZVN0b3JlVXJsfVxyXG4gICAgICAgICAgICAgICAgYXV0b3NhdmVTdGF0dXM9e2F1dG9zYXZlLnN0YXR1c31cclxuICAgICAgICAgICAgICAgIHJldmlzaW9uPXt0aGVtZVJldmlzaW9ufVxyXG4gICAgICAgICAgICAgICAgY29uZmxpY3Q9e3RoZW1lQ29uZmxpY3R9XHJcbiAgICAgICAgICAgICAgICBtb2JpbGVXb3Jrc3BhY2U9e21vYmlsZVdvcmtzcGFjZX1cclxuICAgICAgICAgICAgICAgIG9uV29ya3NwYWNlQ2hhbmdlPXtzZXRNb2JpbGVXb3Jrc3BhY2V9XHJcbiAgICAgICAgICAgIC8+XHJcblxyXG4gICAgICAgICAgICB7cmVjb3ZlcnlEcmFmdCAmJiAoXHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm14LWF1dG8gbWF4LXctWzE2MDBweF0gcHgtNCBwdC00XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0zIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1ibHVlLTIwMCBiZy1ibHVlLTUwIHAtNCBzbTpmbGV4LXJvdyBzbTppdGVtcy1jZW50ZXIgc206anVzdGlmeS1iZXR3ZWVuXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtYmxhY2sgdGV4dC1ibHVlLTk1MFwiPlVucHVibGlzaGVkIGRyYWZ0IGZvdW5kPC9wPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMSB0ZXh0LXhzIGxlYWRpbmctNSB0ZXh0LWJsdWUtODAwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQSB7cmVjb3ZlcnlEcmFmdC5zb3VyY2UgPT09ICdzZXJ2ZXInID8gJ3NlcnZlcicgOiAnbG9jYWwnfSByZWNvdmVyeSBjb3B5IGZyb20ge2Zvcm1hdEJ1aWxkZXJEYXRlKHJlY292ZXJ5RHJhZnQudXBkYXRlZEF0IHx8IHJlY292ZXJ5RHJhZnQuc2F2ZWRBdCkgfHwgJ2FuIGVhcmxpZXIgc2Vzc2lvbid9IGlzIGF2YWlsYWJsZS4gWW91ciBsaXZlIHN0b3JlIGlzIHVuY2hhbmdlZC5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvcD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBzaHJpbmstMCBnYXAtMlwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPEJ1aWxkZXJCdXR0b24gdHlwZT1cImJ1dHRvblwiIHZhcmlhbnQ9XCJzZWNvbmRhcnlcIiBvbkNsaWNrPXtkaXNjYXJkUmVjb3ZlcnlWZXJzaW9ufT5EaXNjYXJkPC9CdWlsZGVyQnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPEJ1aWxkZXJCdXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e3Jlc3RvcmVSZWNvdmVyeVZlcnNpb259PlJlc3RvcmUgZHJhZnQ8L0J1aWxkZXJCdXR0b24+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICl9XHJcblxyXG4gICAgICAgICAgICB7dGhlbWVDb25mbGljdCAmJiAoXHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm14LWF1dG8gbWF4LXctWzE2MDBweF0gcHgtNCBwdC00XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0zIHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1hbWJlci0zMDAgYmctYW1iZXItNTAgcC00IHNtOmZsZXgtcm93IHNtOml0ZW1zLWNlbnRlciBzbTpqdXN0aWZ5LWJldHdlZW5cIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtc20gZm9udC1ibGFjayB0ZXh0LWFtYmVyLTk1MFwiPkEgbmV3ZXIgc3RvcmVmcm9udCByZXZpc2lvbiBleGlzdHM8L3A+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJtdC0xIHRleHQteHMgbGVhZGluZy01IHRleHQtYW1iZXItODAwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgUmV2aXNpb24ge3RoZW1lQ29uZmxpY3QubGF0ZXN0UmV2aXNpb259IHdhcyBwdWJsaXNoZWQgZWxzZXdoZXJlLiBZb3VyIGRyYWZ0IGlzIHNhZmU7IHJlbG9hZCBvbmx5IHdoZW4geW91IGFyZSByZWFkeSB0byBkaXNjYXJkIG9yIHJlY29uY2lsZSBpdC5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvcD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBzaHJpbmstMCBnYXAtMlwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPEJ1aWxkZXJCdXR0b24gdHlwZT1cImJ1dHRvblwiIHZhcmlhbnQ9XCJzZWNvbmRhcnlcIiBvbkNsaWNrPXsoKSA9PiBzZXRUaGVtZUNvbmZsaWN0KG51bGwpfT5LZWVwIGVkaXRpbmc8L0J1aWxkZXJCdXR0b24+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8QnVpbGRlckJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17cmVsb2FkUHVibGlzaGVkVmVyc2lvbn0+RGlzY2FyZCBhbmQgcmVsb2FkPC9CdWlsZGVyQnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICApfVxyXG5cclxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BteC1hdXRvIGdyaWQgbWF4LXctWzE4MDBweF0gZ3JpZC1jb2xzLTEgZ2FwLTQgcC00IHhsOmdyaWQtY29scy1bMjgwcHhfbWlubWF4KDAsMWZyKV0gMnhsOmdyaWQtY29scy1bMjgwcHhfbWlubWF4KDUyMHB4LDFmcilfMzgwcHhdICR7XHJcbiAgICAgICAgICAgICAgICBpbnNwZWN0b3JPcGVuID8gJ3hsOnByLVszOTZweF0gMnhsOnByLTQnIDogJydcclxuICAgICAgICAgICAgfWB9PlxyXG4gICAgICAgICAgICAgICAgPFN0b3JlQnVpbGRlclNpZGViYXJcclxuICAgICAgICAgICAgICAgICAgICBtb2JpbGVXb3Jrc3BhY2U9e21vYmlsZVdvcmtzcGFjZX1cclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmVFbGVtZW50PXthY3RpdmVFbGVtZW50fVxyXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZUdyb3VwPXthY3RpdmVHcm91cH1cclxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RFZGl0b3JUYXJnZXQ9e3NlbGVjdEVkaXRvclRhcmdldH1cclxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RTZXR0aW5nc0dyb3VwPXtzZWxlY3RTZXR0aW5nc0dyb3VwfVxyXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb249e3ZhbGlkYXRpb25EZXRhaWxzfVxyXG4gICAgICAgICAgICAgICAgICAgIHBsYW5BY2Nlc3M9e3BsYW5BY2Nlc3N9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhlbWU9e3RoZW1lfVxyXG4gICAgICAgICAgICAgICAgICAgIHNlb0hlYWx0aD17c3RvcmVTZW9IZWFsdGh9XHJcbiAgICAgICAgICAgICAgICAgICAgb25Nb3ZlU2VjdGlvbj17bW92ZUhvbWVwYWdlU2VjdGlvbn1cclxuICAgICAgICAgICAgICAgICAgICBvbkR1cGxpY2F0ZVNlY3Rpb249e2R1cGxpY2F0ZUhvbWVwYWdlU2VjdGlvbn1cclxuICAgICAgICAgICAgICAgICAgICBvblRvZ2dsZVNlY3Rpb25WaXNpYmlsaXR5PXt0b2dnbGVIb21lcGFnZVNlY3Rpb25WaXNpYmlsaXR5fVxyXG4gICAgICAgICAgICAgICAgICAgIG9uUmVtb3ZlU2VjdGlvbj17cmVtb3ZlSG9tZXBhZ2VTZWN0aW9ufVxyXG4gICAgICAgICAgICAgICAgLz5cclxuXHJcbiAgICAgICAgICAgICAgICA8bWFpbiBjbGFzc05hbWU9XCJjb250ZW50c1wiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxTdXNwZW5zZSBmYWxsYmFjaz17PHNlY3Rpb24gY2xhc3NOYW1lPXtgJHttb2JpbGVXb3Jrc3BhY2UgPT09ICdwcmV2aWV3JyA/ICdibG9jaycgOiAnaGlkZGVuJ30gb3JkZXItMSBtaW4taC1bNjQwcHhdIGFuaW1hdGUtcHVsc2Ugcm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXNsYXRlLTIwMCBiZy1zbGF0ZS0xMDAgeGw6YmxvY2sgMnhsOm9yZGVyLTJgfSBhcmlhLWxhYmVsPVwiTG9hZGluZyBzdG9yZWZyb250IHByZXZpZXdcIiAvPn0+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxTdG9yZUJ1aWxkZXJQcmV2aWV3UGFuZWxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXZpZXdDYXRhbG9nPXtib290c3RyYXA/LnByZXZpZXdDYXRhbG9nfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ1c3RlZEJhZGdlPXtib290c3RyYXA/LnNob3A/LnRydXN0ZWRCYWRnZX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNob3BWZXJpZmljYXRpb249e2Jvb3RzdHJhcD8uc2hvcD8uc2hvcFZlcmlmaWNhdGlvbn1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYW5BY2Nlc3M9e3BsYW5BY2Nlc3N9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmFuZGluZz17Ym9vdHN0cmFwPy5zaG9wPy5wcmV2aWV3QnJhbmRpbmd9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2JpbGVXb3Jrc3BhY2U9e21vYmlsZVdvcmtzcGFjZX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldE1vYmlsZVdvcmtzcGFjZT17c2V0TW9iaWxlV29ya3NwYWNlfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJldmlld1BhZ2VzPXtwcmV2aWV3UGFnZXN9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2aWV3UGFnZT17cHJldmlld1BhZ2V9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRQcmV2aWV3UGFnZT17c2V0UHJldmlld1BhZ2V9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXZpY2U9e2RldmljZX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldERldmljZT17c2V0RGV2aWNlfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlbWU9e3RoZW1lfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmV3aWRlRGlzY291bnQ9e3N0b3Jld2lkZURpc2NvdW50fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hvcE5hbWU9e3Nob3BOYW1lfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlUHJvZHVjdHM9e2F2YWlsYWJsZVByb2R1Y3RzfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvZHVjdENhdGVnb3JpZXM9e3Byb2R1Y3RDYXRlZ29yaWVzfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvZHVjdENhdGVnb3J5RGV0YWlscz17cHJvZHVjdENhdGVnb3J5RGV0YWlsc31cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVJldmlld3M9e2F2YWlsYWJsZVJldmlld3N9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVFbGVtZW50PXthY3RpdmVFbGVtZW50fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0RWRpdG9yVGFyZ2V0PXtzZWxlY3RFZGl0b3JUYXJnZXR9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVIb21lcGFnZVNlY3Rpb25WaXNpYmlsaXR5PXt0b2dnbGVIb21lcGFnZVNlY3Rpb25WaXNpYmlsaXR5fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvPlxyXG4gICAgICAgICAgICAgICAgICAgIDwvU3VzcGVuc2U+XHJcbiAgICAgICAgICAgICAgICAgICAgPFN0b3JlQnVpbGRlckVkaXRvclBhbmVsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vYmlsZVdvcmtzcGFjZT17bW9iaWxlV29ya3NwYWNlfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnNwZWN0b3JPcGVuPXtpbnNwZWN0b3JPcGVufVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZExhYmVsPXtzZWxlY3RlZExhYmVsfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZElzTG9ja2VkTGF5b3V0PXtzZWxlY3RlZElzTG9ja2VkTGF5b3V0fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFuUmVzdHJpY3Rpb249e3NlbGVjdGVkUGxhblJlc3RyaWN0aW9ufVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRNb2JpbGVXb3Jrc3BhY2U9e3NldE1vYmlsZVdvcmtzcGFjZX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbG9zZUluc3BlY3Rvcj17KCkgPT4gc2V0SW5zcGVjdG9yT3BlbihmYWxzZSl9XHJcbiAgICAgICAgICAgICAgICAgICAgPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8U3VzcGVuc2UgZmFsbGJhY2s9ezxkaXYgY2xhc3NOYW1lPVwiaC03MiBhbmltYXRlLXB1bHNlIHJvdW5kZWQtbGcgYmctc2xhdGUtMTAwXCIgYXJpYS1sYWJlbD1cIkxvYWRpbmcgZWRpdG9yIHNldHRpbmdzXCIgLz59PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge3JlbmRlclBhbmVsKCl9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvU3VzcGVuc2U+XHJcbiAgICAgICAgICAgICAgICAgICAgPC9TdG9yZUJ1aWxkZXJFZGl0b3JQYW5lbD5cclxuICAgICAgICAgICAgICAgIDwvbWFpbj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcblxyXG4gICAgICAgICAgICA8SXNzdWVzRHJhd2VyXHJcbiAgICAgICAgICAgICAgICBvcGVuPXtpc3N1ZXNPcGVufVxyXG4gICAgICAgICAgICAgICAgaXNzdWVzPXt2YWxpZGF0aW9uRGV0YWlsc31cclxuICAgICAgICAgICAgICAgIG9uQ2xvc2U9eygpID0+IHNldElzc3Vlc09wZW4oZmFsc2UpfVxyXG4gICAgICAgICAgICAgICAgb25TZWxlY3RJc3N1ZT17Zm9jdXNWYWxpZGF0aW9uRXJyb3J9XHJcbiAgICAgICAgICAgIC8+XHJcbiAgICAgICAgICAgIDxIaXN0b3J5RHJhd2VyXHJcbiAgICAgICAgICAgICAgICBvcGVuPXtoaXN0b3J5T3Blbn1cclxuICAgICAgICAgICAgICAgIHJldmlzaW9ucz17cmV2aXNpb25zfVxyXG4gICAgICAgICAgICAgICAgYnVzeT17c2F2aW5nfVxyXG4gICAgICAgICAgICAgICAgb25DbG9zZT17KCkgPT4gc2V0SGlzdG9yeU9wZW4oZmFsc2UpfVxyXG4gICAgICAgICAgICAgICAgb25QcmV2aWV3PXtyZXZpc2lvbklkID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBzZXRIaXN0b3J5T3BlbihmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJldmlld1JldmlzaW9uKHJldmlzaW9uSWQpO1xyXG4gICAgICAgICAgICAgICAgfX1cclxuICAgICAgICAgICAgICAgIG9uUmVzdG9yZT17cmV2aXNpb25JZCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0SGlzdG9yeU9wZW4oZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3RvcmVSZXZpc2lvbihyZXZpc2lvbklkKTtcclxuICAgICAgICAgICAgICAgIH19XHJcbiAgICAgICAgICAgIC8+XHJcblxyXG4gICAgICAgICAgICB7dGhlbWVHYWxsZXJ5T3BlbiAmJiAoXHJcbiAgICAgICAgICAgICAgICA8U3VzcGVuc2UgZmFsbGJhY2s9ezxkaXYgY2xhc3NOYW1lPVwiZml4ZWQgaW5zZXQtMCB6LVs5NV0gZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgYmctc2xhdGUtMTAwXCIgcm9sZT1cInN0YXR1c1wiPjxkaXYgY2xhc3NOYW1lPVwicm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXNsYXRlLTIwMCBiZy13aGl0ZSBweC01IHB5LTQgdGV4dC1zbSBmb250LWJsYWNrIHRleHQtc2xhdGUtNzAwIHNoYWRvdy1sZ1wiPkxvYWRpbmcgdGhlbWVz4oCmPC9kaXY+PC9kaXY+fT5cclxuICAgICAgICAgICAgICAgICAgICA8VGhlbWVHYWxsZXJ5XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoZW1lQXZhaWxhYmlsaXR5PXtib290c3RyYXA/LnRoZW1lQXZhaWxhYmlsaXR5fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmV2aWV3Q2F0YWxvZz17Ym9vdHN0cmFwPy5wcmV2aWV3Q2F0YWxvZ31cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJhbmRpbmc9e2Jvb3RzdHJhcD8uc2hvcD8ucHJldmlld0JyYW5kaW5nfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdG9yZXdpZGVEaXNjb3VudD17c3RvcmV3aWRlRGlzY291bnR9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRydXN0ZWRCYWRnZT17Ym9vdHN0cmFwPy5zaG9wPy50cnVzdGVkQmFkZ2V9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3BWZXJpZmljYXRpb249e2Jvb3RzdHJhcD8uc2hvcD8uc2hvcFZlcmlmaWNhdGlvbn1cclxuICAgICAgICAgICAgICAgICAgICAgICAgb3Blbj17dGhlbWVHYWxsZXJ5T3Blbn1cclxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbG9zZT17KCkgPT4gc2V0VGhlbWVHYWxsZXJ5T3BlbihmYWxzZSl9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRUaGVtZT17dGhlbWV9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYW5BY2Nlc3M9e3BsYW5BY2Nlc3N9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3BOYW1lPXtzaG9wTmFtZX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvZHVjdHM9e2F2YWlsYWJsZVByb2R1Y3RzfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yaWVzPXtwcm9kdWN0Q2F0ZWdvcnlEZXRhaWxzLmxlbmd0aCA/IHByb2R1Y3RDYXRlZ29yeURldGFpbHMgOiBwcm9kdWN0Q2F0ZWdvcmllc31cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV2aWV3cz17YXZhaWxhYmxlUmV2aWV3c31cclxuICAgICAgICAgICAgICAgICAgICAgICAgb25BcHBseT17YXBwbHlQcmVidWlsdFRoZW1lfVxyXG4gICAgICAgICAgICAgICAgICAgIC8+XHJcbiAgICAgICAgICAgICAgICA8L1N1c3BlbnNlPlxyXG4gICAgICAgICAgICApfVxyXG5cclxuICAgICAgICAgICAge3B1Ymxpc2hSZXZpZXdPcGVuICYmIChcclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZml4ZWQgaW5zZXQtMCB6LVs4MF0gZmxleCBpdGVtcy1lbmQganVzdGlmeS1jZW50ZXIgYmctc2xhdGUtOTUwLzUwIHAtMCBzbTppdGVtcy1jZW50ZXIgc206cC00XCIgcm9sZT1cInByZXNlbnRhdGlvblwiIG9uTW91c2VEb3duPXtldmVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50LnRhcmdldCA9PT0gZXZlbnQuY3VycmVudFRhcmdldCAmJiAhc2F2aW5nKSBzZXRQdWJsaXNoUmV2aWV3T3BlbihmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICB9fT5cclxuICAgICAgICAgICAgICAgICAgICA8c2VjdGlvbiByb2xlPVwiZGlhbG9nXCIgYXJpYS1tb2RhbD1cInRydWVcIiBhcmlhLWxhYmVsbGVkYnk9XCJwdWJsaXNoLXN0b3JlLXRpdGxlXCIgY2xhc3NOYW1lPVwibWF4LWgtWzkydmhdIHctZnVsbCBvdmVyZmxvdy15LWF1dG8gcm91bmRlZC10LTJ4bCBiZy13aGl0ZSBwLTUgc2hhZG93LTJ4bCBzbTptYXgtdy1sZyBzbTpyb3VuZGVkLXhsIHNtOnAtNlwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtc3RhcnQganVzdGlmeS1iZXR3ZWVuIGdhcC00XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteHMgZm9udC1ibGFjayB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZSB0ZXh0LWluZGlnby02MDBcIj5SZXZpc2lvbiB7dGhlbWVSZXZpc2lvbiArIDF9PC9wPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxoMiBpZD1cInB1Ymxpc2gtc3RvcmUtdGl0bGVcIiBjbGFzc05hbWU9XCJtdC0xIHRleHQteGwgZm9udC1ibGFjayB0ZXh0LXNsYXRlLTk1MFwiPlB1Ymxpc2ggc3RvcmVmcm9udCBjaGFuZ2VzPzwvaDI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMiB0ZXh0LXNtIGxlYWRpbmctNiB0ZXh0LXNsYXRlLTYwMFwiPlRoZXNlIGRyYWZ0IGNoYW5nZXMgd2lsbCBiZWNvbWUgdmlzaWJsZSBvbiB5b3VyIGxpdmUgc3RvcmUuIFRlbXBvcmFyeSBtZWRpYSB1c2VkIGJ5IHRoZSBkcmFmdCB3aWxsIGJlIHByb21vdGVkIG9ubHkgYWZ0ZXIgdGhpcyBwdWJsaXNoIHN1Y2NlZWRzLjwvcD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgYXJpYS1sYWJlbD1cIkNsb3NlIHB1Ymxpc2ggcmV2aWV3XCIgb25DbGljaz17KCkgPT4gc2V0UHVibGlzaFJldmlld09wZW4oZmFsc2UpfSBkaXNhYmxlZD17c2F2aW5nfSBjbGFzc05hbWU9XCJyb3VuZGVkLWxnIHAtMiB0ZXh0LXNsYXRlLTUwMCBob3ZlcjpiZy1zbGF0ZS0xMDAgZm9jdXM6b3V0bGluZS1ub25lIGZvY3VzOnJpbmctMiBmb2N1czpyaW5nLWluZGlnby01MDBcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8WCBzaXplPXsyMH0gLz5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC01IHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS0yMDAgYmctc2xhdGUtNTAgcC00XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGUgdGV4dC1zbGF0ZS01MDBcIj5DaGFuZ2Ugc3VtbWFyeTwvcD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtwdWJsaXNoQ2hhbmdlU3VtbWFyeS5sZW5ndGggPiAwID8gKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx1bCBjbGFzc05hbWU9XCJtdC0zIHNwYWNlLXktMiB0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdGV4dC1zbGF0ZS03MDBcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3B1Ymxpc2hDaGFuZ2VTdW1tYXJ5Lm1hcChjaGFuZ2UgPT4gPGxpIGtleT17YCR7Y2hhbmdlLmFyZWF9LSR7Y2hhbmdlLm1lc3NhZ2V9YH0gY2xhc3NOYW1lPVwiZmxleCBnYXAtMlwiPjxzcGFuIGNsYXNzTmFtZT1cInRleHQtaW5kaWdvLTYwMFwiPuKAojwvc3Bhbj48c3Bhbj48c3Ryb25nPntjaGFuZ2UuYXJlYX06PC9zdHJvbmc+IHtjaGFuZ2UubWVzc2FnZX08L3NwYW4+PC9saT4pfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvdWw+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApIDogKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cIm10LTIgdGV4dC1zbSB0ZXh0LXNsYXRlLTUwMFwiPlRoZSBkcmFmdCBkaWZmZXJzIGZyb20gdGhlIHB1Ymxpc2hlZCBzbmFwc2hvdC48L3A+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC01IGZsZXggZmxleC1jb2wtcmV2ZXJzZSBnYXAtMiBzbTpmbGV4LXJvdyBzbTpqdXN0aWZ5LWVuZFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPEJ1aWxkZXJCdXR0b24gdHlwZT1cImJ1dHRvblwiIHZhcmlhbnQ9XCJzZWNvbmRhcnlcIiBvbkNsaWNrPXsoKSA9PiBzZXRQdWJsaXNoUmV2aWV3T3BlbihmYWxzZSl9IGRpc2FibGVkPXtzYXZpbmd9PkNvbnRpbnVlIGVkaXRpbmc8L0J1aWxkZXJCdXR0b24+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8QnVpbGRlckJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17cHVibGlzaENoYW5nZXN9IGRpc2FibGVkPXtzYXZpbmd9PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtzYXZpbmcgPyAnUHVibGlzaGluZy4uLicgOiAnUHVibGlzaCB0byBsaXZlIHN0b3JlJ31cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvQnVpbGRlckJ1dHRvbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgPC9zZWN0aW9uPlxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICl9XHJcbiAgICAgICAgPC9TdG9yZUJ1aWxkZXJTaGVsbD5cclxuICAgICk7XHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCBTdG9yZUJ1aWxkZXJQYWdlO1xyXG4iXX0=