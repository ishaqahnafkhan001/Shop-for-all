import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx");const useMemo = __vite__cjsImport1_react["useMemo"];const _jsxDEV = __vite__cjsImport10_react_jsxDevRuntime["jsxDEV"]; const _Fragment = __vite__cjsImport10_react_jsxDevRuntime["Fragment"];import { CheckoutBrandingBanner, CheckoutTrustBadges } from "/node_modules/@scaleup/storefront-renderer/presentation/CheckoutSections.jsx";
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=d5ed7809";
import { StorefrontPreviewFrame } from "/src/pages/dashboard/StoreBuilder/StorefrontPreviewFrame.jsx";
import { PreviewCommercePage } from "/src/pages/dashboard/StoreBuilder/PreviewCommercePages.jsx?t=1792472548943";
import { normalizeProduct } from "/node_modules/.vite/deps/@scaleup_storefront-renderer_product-data.js?v=d5ed7809";
import { PresentationRuntime, NativeImage } from "/node_modules/@scaleup/storefront-renderer/presentation/Runtime.jsx";
import { STOREFRONT_VIEWPORTS } from "/node_modules/.vite/deps/@scaleup_storefront-renderer_viewports.js?v=d5ed7809";
import { Eye, EyeOff, Lock, Pencil } from "/node_modules/.vite/deps/lucide-react.js?v=d5ed7809";
import { ReferenceStorefrontFooter, ReferenceStorefrontHeader, ReferenceStorefrontHome, getReferenceThemeStyle } from "/node_modules/@scaleup/storefront-renderer/index.jsx";
import { getStorefrontPresentationVariant, resolveEffectiveTheme } from "/node_modules/.vite/deps/@scaleup_storefront-theme.js?v=d5ed7809";
var _jsxFileName = "C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx";
import __vite__cjsImport10_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=d5ed7809";
var _s = $RefreshSig$();
const getSectionLabel = (section = {}) => section.settings?.visualLabel || section.title || section.type || "Section";
const getCategoryName = (category) => typeof category === "string" ? category.trim() : String(category?.name || category?.title || category?.label || category?.slug || "").trim();
const PreviewLink = ({ href, children, className, ...props }) => {
	const anchorProps = { ...props };
	delete anchorProps.prefetch;
	return /* @__PURE__ */ _jsxDEV("a", {
		href: href || "#",
		className,
		...anchorProps,
		onClick: (event) => {
			anchorProps.onClick?.(event);
			event.preventDefault();
		},
		children
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 28,
		columnNumber: 9
	}, this);
};
_c = PreviewLink;
const PreviewSectionToolbar = ({ id, label, locked, section, sectionIndex, onSelectElement, onToggleSectionVisibility }) => {
	const isDynamicSection = (id?.startsWith("section:") || id?.startsWith("section-")) && Number.isInteger(sectionIndex) && sectionIndex >= 0;
	const isVisible = section?.isEnabled !== false;
	const stop = (event) => {
		event.preventDefault();
		event.stopPropagation();
	};
	const handleAction = (event, action) => {
		stop(event);
		action?.();
	};
	const buttonClass = "inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40";
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "absolute right-3 top-3 z-[90] flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-xl shadow-slate-950/15 backdrop-blur",
		onMouseDown: stop,
		onClick: stop,
		children: [
			/* @__PURE__ */ _jsxDEV("span", {
				className: "max-w-[160px] truncate rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-black text-white",
				children: label || "Section"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 61,
				columnNumber: 13
			}, this),
			locked && /* @__PURE__ */ _jsxDEV("span", {
				className: "inline-flex h-8 items-center gap-1 rounded-lg bg-amber-50 px-2 text-[11px] font-black text-amber-800",
				children: [/* @__PURE__ */ _jsxDEV(Lock, { size: 12 }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 66,
					columnNumber: 21
				}, this), "Locked layout"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 65,
				columnNumber: 17
			}, this),
			/* @__PURE__ */ _jsxDEV("button", {
				type: "button",
				className: buttonClass,
				onClick: (event) => handleAction(event, () => onSelectElement?.(id)),
				"aria-label": `Edit ${label || "section"}`,
				children: [/* @__PURE__ */ _jsxDEV(Pencil, { size: 13 }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 71,
					columnNumber: 17
				}, this), "Edit"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 70,
				columnNumber: 13
			}, this),
			isDynamicSection && /* @__PURE__ */ _jsxDEV(_Fragment, { children: /* @__PURE__ */ _jsxDEV("button", {
				type: "button",
				className: buttonClass,
				onClick: (event) => handleAction(event, () => onToggleSectionVisibility?.(sectionIndex, !isVisible)),
				"aria-label": `${isVisible ? "Hide" : "Show"} ${label || "section"}`,
				children: [isVisible ? /* @__PURE__ */ _jsxDEV(EyeOff, { size: 13 }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 77,
					columnNumber: 38
				}, this) : /* @__PURE__ */ _jsxDEV(Eye, { size: 13 }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 77,
					columnNumber: 61
				}, this), isVisible ? "Hide" : "Show"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 76,
				columnNumber: 21
			}, this) }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 75,
				columnNumber: 17
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 56,
		columnNumber: 9
	}, this);
};
_c2 = PreviewSectionToolbar;
export const createPreviewEditor = ({ theme, activeElement, onSelectElement, onToggleSectionVisibility }) => {
	if (!onSelectElement) return null;
	// Resolve commands against the draft, before plan filtering and sorting.
	const sections = theme?.homepageSections || [];
	return {
		selectedId: activeElement,
		onSelect: onSelectElement,
		renderToolbar: (id, meta = {}) => {
			const sectionIndex = id?.startsWith("section:") ? sections.findIndex((section) => String(section?.id || section?._id) === id.slice("section:".length)) : id?.startsWith("section-") ? Number(id.replace("section-", "")) : -1;
			const section = sectionIndex >= 0 ? sections[sectionIndex] : null;
			return /* @__PURE__ */ _jsxDEV(PreviewSectionToolbar, {
				id,
				label: section ? getSectionLabel(section) : meta.label,
				locked: Boolean(meta.locked),
				section,
				sectionIndex,
				onSelectElement,
				onToggleSectionVisibility
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 101,
				columnNumber: 17
			}, this);
		}
	};
};
export const CheckoutBrandingPreview = ({ theme, shopName }) => {
	const resolved = resolveEffectiveTheme(theme, { shopName });
	return /* @__PURE__ */ _jsxDEV("div", {
		className: "sf-presentation",
		"data-sf-presentation": getStorefrontPresentationVariant(resolved) === "atelier-editorial" ? "atelier-editorial" : undefined,
		style: getReferenceThemeStyle(resolved),
		children: [/* @__PURE__ */ _jsxDEV(CheckoutBrandingBanner, { checkoutBranding: resolved.checkoutBranding }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 117,
			columnNumber: 210
		}, this), /* @__PURE__ */ _jsxDEV(CheckoutTrustBadges, {}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 117,
			columnNumber: 281
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 117,
		columnNumber: 12
	}, this);
};
_c3 = CheckoutBrandingPreview;
export const StorefrontPreviewContent = ({ theme, planAccess, branding, storewideDiscount, shopName, trustedBadge, shopVerification, cartCount = 3, previewPage = "home", availableProducts = [], previewCatalog, availableCategories = [], availableReviews = [], activeElement, onSelectElement, onToggleSectionVisibility }) => {
	_s();
	const normalizedTheme = resolveEffectiveTheme(theme || {}, {
		planAccess,
		branding,
		shopName
	});
	const products = availableProducts.map(normalizeProduct).filter(Boolean);
	const catalogProducts = previewCatalog?.products ? previewCatalog.products.map(normalizeProduct).filter(Boolean) : products;
	const previewCategories = availableCategories.length ? availableCategories : [...new Set(products.map((product) => product.category).filter(Boolean))];
	const categoryNames = [...new Set(previewCategories.map(getCategoryName).filter(Boolean))];
	const categoryDetails = previewCategories.filter((category) => category && typeof category === "object");
	const previewSectionProducts = useMemo(() => {
		const productMap = new Map(products.map((product) => [String(product._id), product]));
		Object.entries(previewCatalog?.productsById || {}).forEach(([id, product]) => productMap.set(id, normalizeProduct(product)));
		// Fresh picker results take precedence over the opening snapshot. A null
		// public card means the product is no longer eligible for storefront use.
		products.forEach((product) => {
			if (!Object.hasOwn(product, "previewCard")) return;
			if (product.previewCard) productMap.set(String(product._id), normalizeProduct(product.previewCard));
			else productMap.delete(String(product._id));
		});
		return (normalizedTheme.homepageSections || []).reduce((acc, section) => {
			if (![
				"FeaturedProducts",
				"Collection",
				"CollectionShowcase"
			].includes(section.type)) return acc;
			const sectionId = section.id || section._id;
			const productIds = section.settings?.productIds || section.settings?.source?.productIds || section.source?.productIds || [];
			if (!sectionId || !Array.isArray(productIds) || productIds.length === 0) return acc;
			acc[sectionId] = productIds.map((id) => productMap.get(String(id))).filter(Boolean);
			return acc;
		}, {});
	}, [
		products,
		previewCatalog,
		normalizedTheme.homepageSections
	]);
	const previewSectionReviews = useMemo(() => {
		const reviewMap = new Map(availableReviews.map((review) => [String(review._id), review]));
		return (normalizedTheme.homepageSections || []).reduce((acc, section) => {
			if (section.type !== "Reviews") return acc;
			const sectionId = section.id || section._id;
			const reviewIds = section.settings?.reviewIds || [];
			if (!sectionId || !Array.isArray(reviewIds) || reviewIds.length === 0) return acc;
			acc[sectionId] = reviewIds.map((id) => reviewMap.get(String(id))).filter(Boolean);
			return acc;
		}, {});
	}, [availableReviews, normalizedTheme.homepageSections]);
	const editor = useMemo(() => createPreviewEditor({
		theme,
		activeElement,
		onSelectElement,
		onToggleSectionVisibility
	}), [
		activeElement,
		theme?.homepageSections,
		onSelectElement,
		onToggleSectionVisibility
	]);
	const renderPreviewPage = () => {
		if (previewPage !== "home") return /* @__PURE__ */ _jsxDEV(PreviewCommercePage, {
			page: previewPage,
			theme: normalizedTheme,
			shopName,
			products,
			reviews: availableReviews
		}, `${previewPage}-${products[0]?._id || "empty"}`, false, {
			fileName: _jsxFileName,
			lineNumber: 179,
			columnNumber: 44
		}, this);
		return /* @__PURE__ */ _jsxDEV(ReferenceStorefrontHome, {
			theme: normalizedTheme,
			shopName: shopName || "Store preview",
			subdomain: "preview",
			cartCount,
			storewideDiscount,
			products: catalogProducts,
			categories: categoryNames,
			categoryDetails,
			sectionProducts: previewSectionProducts,
			sectionReviews: previewSectionReviews,
			pagination: previewCatalog?.pagination || {
				page: 1,
				pages: 1
			},
			filters: {
				category: "All",
				sort: "newest",
				page: 1
			},
			priceInput: {
				min: "",
				max: ""
			},
			catalogSearch: "",
			onProductBuyNow: () => {},
			preview: true,
			previewDevice: undefined,
			editor,
			LinkComponent: PreviewLink
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 182,
			columnNumber: 13
		}, this);
	};
	return /* @__PURE__ */ _jsxDEV(PresentationRuntime, {
		value: {
			Link: PreviewLink,
			Image: NativeImage
		},
		children: /* @__PURE__ */ _jsxDEV("div", {
			className: "sf-presentation",
			style: {
				...getReferenceThemeStyle(normalizedTheme),
				minHeight: "100vh"
			},
			"data-sf-presentation": getStorefrontPresentationVariant(normalizedTheme) === "atelier-editorial" ? "atelier-editorial" : undefined,
			children: [
				/* @__PURE__ */ _jsxDEV(ReferenceStorefrontHeader, {
					theme: normalizedTheme,
					shopName: shopName || "Store preview",
					subdomain: "preview",
					cartCount,
					trustedBadge,
					shopVerification,
					editor,
					LinkComponent: PreviewLink
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 208,
					columnNumber: 13
				}, this),
				renderPreviewPage(),
				/* @__PURE__ */ _jsxDEV(ReferenceStorefrontFooter, {
					theme: normalizedTheme,
					shopName: shopName || "Store preview",
					subdomain: "preview",
					cartCount,
					shopVerification,
					editor,
					LinkComponent: PreviewLink
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 210,
					columnNumber: 13
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 207,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 206,
		columnNumber: 12
	}, this);
};
_s(StorefrontPreviewContent, "i5RjHG6+MyP70tW8CgtTJPyTowE=");
_c4 = StorefrontPreviewContent;
export function StorefrontPreview({ device = "desktop", previewZoom = "fit", thumbnail = false, ...props }) {
	const viewport = STOREFRONT_VIEWPORTS[device] || STOREFRONT_VIEWPORTS.desktop;
	return /* @__PURE__ */ _jsxDEV("div", {
		"data-preview-device": device,
		className: thumbnail ? "" : "rounded-lg border border-slate-200 bg-slate-100 p-3",
		children: /* @__PURE__ */ _jsxDEV(StorefrontPreviewFrame, {
			width: viewport.width,
			height: thumbnail ? 740 : viewport.height,
			title: `${props.shopName || "Store"} ${props.previewPage || "home"} preview`,
			zoom: previewZoom,
			thumbnail,
			children: /* @__PURE__ */ _jsxDEV(StorefrontPreviewContent, {
				...props,
				device
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 220,
				columnNumber: 13
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 218,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 217,
		columnNumber: 12
	}, this);
}
_c5 = StorefrontPreview;
var _c, _c2, _c3, _c4, _c5;
$RefreshReg$(_c, "PreviewLink");
$RefreshReg$(_c2, "PreviewSectionToolbar");
$RefreshReg$(_c3, "CheckoutBrandingPreview");
$RefreshReg$(_c4, "StorefrontPreviewContent");
$RefreshReg$(_c5, "StorefrontPreview");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
import * as __vite_react_currentExports from "/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx?t=1792472740071";
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }

  const currentExports = __vite_react_currentExports;
  queueMicrotask(() => {
    RefreshRuntime.registerExportsForReactRefresh("C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) { return RefreshRuntime.register(type, "C:/Users/user/WebstormProjects/Shop-for-all/ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx" + ' ' + id); }
function $RefreshSig$() { return RefreshRuntime.createSignatureFunctionForTransform(); }

//# sourceMappingURL=data:application/json;base64,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QUNqRSx3QkFBQyx3QkFBRDtHQUF3QixPQUFPLFNBQVM7R0FBTyxRQUFRLFlBQVksTUFBTSxTQUFTO0dBQzlFLE9BQU8sR0FBRyxNQUFNLFlBQVksUUFBUSxHQUFHLE1BQU0sZUFBZSxPQUFPO0dBQVcsTUFBTTtHQUF3QjthQUM1Ryx3QkFBQywwQkFBRDtJQUEwQixHQUFJO0lBQWU7R0FBUzs7Ozs7RUFDbEM7Ozs7O0NBQ3ZCOzs7OztBQUNUIiwibmFtZXMiOltdLCJzb3VyY2VzIjpbIlN0b3JlZnJvbnRQcmV2aWV3LmpzeCJdLCJ2ZXJzaW9uIjozLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDaGVja291dEJyYW5kaW5nQmFubmVyLCBDaGVja291dFRydXN0QmFkZ2VzIH0gZnJvbSAnQHNjYWxldXAvc3RvcmVmcm9udC1yZW5kZXJlci9wcmVzZW50YXRpb24vQ2hlY2tvdXRTZWN0aW9ucyc7XHJcbmltcG9ydCB7IHVzZU1lbW8gfSBmcm9tICdyZWFjdCc7XHJcbmltcG9ydCB7IFN0b3JlZnJvbnRQcmV2aWV3RnJhbWUgfSBmcm9tICcuL1N0b3JlZnJvbnRQcmV2aWV3RnJhbWUuanN4JztcclxuaW1wb3J0IHsgUHJldmlld0NvbW1lcmNlUGFnZSB9IGZyb20gJy4vUHJldmlld0NvbW1lcmNlUGFnZXMuanN4JztcclxuaW1wb3J0IHsgbm9ybWFsaXplUHJvZHVjdCB9IGZyb20gJ0BzY2FsZXVwL3N0b3JlZnJvbnQtcmVuZGVyZXIvcHJvZHVjdC1kYXRhJztcclxuaW1wb3J0IHsgUHJlc2VudGF0aW9uUnVudGltZSwgTmF0aXZlSW1hZ2UgfSBmcm9tICdAc2NhbGV1cC9zdG9yZWZyb250LXJlbmRlcmVyL3ByZXNlbnRhdGlvbi9SdW50aW1lJztcclxuaW1wb3J0IHsgU1RPUkVGUk9OVF9WSUVXUE9SVFMgfSBmcm9tICdAc2NhbGV1cC9zdG9yZWZyb250LXJlbmRlcmVyL3ZpZXdwb3J0cyc7XHJcbmltcG9ydCB7IEV5ZSwgRXllT2ZmLCBMb2NrLCBQZW5jaWwgfSBmcm9tICdsdWNpZGUtcmVhY3QnO1xyXG5pbXBvcnQge1xyXG4gICAgUmVmZXJlbmNlU3RvcmVmcm9udEZvb3RlcixcclxuICAgIFJlZmVyZW5jZVN0b3JlZnJvbnRIZWFkZXIsXHJcbiAgICBSZWZlcmVuY2VTdG9yZWZyb250SG9tZSxcclxuICAgIGdldFJlZmVyZW5jZVRoZW1lU3R5bGVcclxufSBmcm9tICdAc2NhbGV1cC9zdG9yZWZyb250LXJlbmRlcmVyJztcclxuaW1wb3J0IHsgZ2V0U3RvcmVmcm9udFByZXNlbnRhdGlvblZhcmlhbnQsIHJlc29sdmVFZmZlY3RpdmVUaGVtZSB9IGZyb20gJ0BzY2FsZXVwL3N0b3JlZnJvbnQtdGhlbWUnO1xyXG5cclxuY29uc3QgZ2V0U2VjdGlvbkxhYmVsID0gKHNlY3Rpb24gPSB7fSkgPT4gc2VjdGlvbi5zZXR0aW5ncz8udmlzdWFsTGFiZWwgfHwgc2VjdGlvbi50aXRsZSB8fCBzZWN0aW9uLnR5cGUgfHwgJ1NlY3Rpb24nO1xyXG5jb25zdCBnZXRDYXRlZ29yeU5hbWUgPSAoY2F0ZWdvcnkpID0+IChcclxuICAgIHR5cGVvZiBjYXRlZ29yeSA9PT0gJ3N0cmluZydcclxuICAgICAgICA/IGNhdGVnb3J5LnRyaW0oKVxyXG4gICAgICAgIDogU3RyaW5nKGNhdGVnb3J5Py5uYW1lIHx8IGNhdGVnb3J5Py50aXRsZSB8fCBjYXRlZ29yeT8ubGFiZWwgfHwgY2F0ZWdvcnk/LnNsdWcgfHwgJycpLnRyaW0oKVxyXG4pO1xyXG5cclxuY29uc3QgUHJldmlld0xpbmsgPSAoeyBocmVmLCBjaGlsZHJlbiwgY2xhc3NOYW1lLCAuLi5wcm9wcyB9KSA9PiB7XHJcbiAgICBjb25zdCBhbmNob3JQcm9wcyA9IHsgLi4ucHJvcHMgfTtcclxuICAgIGRlbGV0ZSBhbmNob3JQcm9wcy5wcmVmZXRjaDtcclxuICAgIHJldHVybiAoXHJcbiAgICAgICAgPGEgaHJlZj17aHJlZiB8fCAnIyd9IGNsYXNzTmFtZT17Y2xhc3NOYW1lfSB7Li4uYW5jaG9yUHJvcHN9IG9uQ2xpY2s9e2V2ZW50ID0+IHsgYW5jaG9yUHJvcHMub25DbGljaz8uKGV2ZW50KTsgZXZlbnQucHJldmVudERlZmF1bHQoKTsgfX0+XHJcbiAgICAgICAgICAgIHtjaGlsZHJlbn1cclxuICAgICAgICA8L2E+XHJcbiAgICApO1xyXG59O1xyXG5cclxuY29uc3QgUHJldmlld1NlY3Rpb25Ub29sYmFyID0gKHtcclxuICAgIGlkLFxyXG4gICAgbGFiZWwsXHJcbiAgICBsb2NrZWQsXHJcbiAgICBzZWN0aW9uLFxyXG4gICAgc2VjdGlvbkluZGV4LFxyXG4gICAgb25TZWxlY3RFbGVtZW50LFxyXG4gICAgb25Ub2dnbGVTZWN0aW9uVmlzaWJpbGl0eVxyXG59KSA9PiB7XHJcbiAgICBjb25zdCBpc0R5bmFtaWNTZWN0aW9uID0gKGlkPy5zdGFydHNXaXRoKCdzZWN0aW9uOicpIHx8IGlkPy5zdGFydHNXaXRoKCdzZWN0aW9uLScpKSAmJiBOdW1iZXIuaXNJbnRlZ2VyKHNlY3Rpb25JbmRleCkgJiYgc2VjdGlvbkluZGV4ID49IDA7XHJcbiAgICBjb25zdCBpc1Zpc2libGUgPSBzZWN0aW9uPy5pc0VuYWJsZWQgIT09IGZhbHNlO1xyXG4gICAgY29uc3Qgc3RvcCA9IChldmVudCkgPT4ge1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICB9O1xyXG4gICAgY29uc3QgaGFuZGxlQWN0aW9uID0gKGV2ZW50LCBhY3Rpb24pID0+IHtcclxuICAgICAgICBzdG9wKGV2ZW50KTtcclxuICAgICAgICBhY3Rpb24/LigpO1xyXG4gICAgfTtcclxuICAgIGNvbnN0IGJ1dHRvbkNsYXNzID0gJ2lubGluZS1mbGV4IG1pbi1oLTExIGl0ZW1zLWNlbnRlciBnYXAtMS41IHJvdW5kZWQtbGcgYm9yZGVyIGJvcmRlci1zbGF0ZS0yMDAgYmctd2hpdGUgcHgtMi41IHRleHQteHMgZm9udC1ibGFjayB0ZXh0LXNsYXRlLTcwMCBzaGFkb3ctc20gdHJhbnNpdGlvbiBob3Zlcjpib3JkZXItaW5kaWdvLTIwMCBob3ZlcjpiZy1pbmRpZ28tNTAgaG92ZXI6dGV4dC1pbmRpZ28tNzAwIGRpc2FibGVkOmN1cnNvci1ub3QtYWxsb3dlZCBkaXNhYmxlZDpvcGFjaXR5LTQwJztcclxuXHJcbiAgICByZXR1cm4gKFxyXG4gICAgICAgIDxkaXZcclxuICAgICAgICAgICAgY2xhc3NOYW1lPVwiYWJzb2x1dGUgcmlnaHQtMyB0b3AtMyB6LVs5MF0gZmxleCBtYXgtdy1bY2FsYygxMDAlLTEuNXJlbSldIGZsZXgtd3JhcCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSByb3VuZGVkLXhsIGJvcmRlciBib3JkZXItc2xhdGUtMjAwIGJnLXdoaXRlLzk1IHAtMS41IHNoYWRvdy14bCBzaGFkb3ctc2xhdGUtOTUwLzE1IGJhY2tkcm9wLWJsdXJcIlxyXG4gICAgICAgICAgICBvbk1vdXNlRG93bj17c3RvcH1cclxuICAgICAgICAgICAgb25DbGljaz17c3RvcH1cclxuICAgICAgICA+XHJcbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cIm1heC13LVsxNjBweF0gdHJ1bmNhdGUgcm91bmRlZC1sZyBiZy1zbGF0ZS05NTAgcHgtMi41IHB5LTEuNSB0ZXh0LXhzIGZvbnQtYmxhY2sgdGV4dC13aGl0ZVwiPlxyXG4gICAgICAgICAgICAgICAge2xhYmVsIHx8ICdTZWN0aW9uJ31cclxuICAgICAgICAgICAgPC9zcGFuPlxyXG4gICAgICAgICAgICB7bG9ja2VkICYmIChcclxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImlubGluZS1mbGV4IGgtOCBpdGVtcy1jZW50ZXIgZ2FwLTEgcm91bmRlZC1sZyBiZy1hbWJlci01MCBweC0yIHRleHQtWzExcHhdIGZvbnQtYmxhY2sgdGV4dC1hbWJlci04MDBcIj5cclxuICAgICAgICAgICAgICAgICAgICA8TG9jayBzaXplPXsxMn0gLz5cclxuICAgICAgICAgICAgICAgICAgICBMb2NrZWQgbGF5b3V0XHJcbiAgICAgICAgICAgICAgICA8L3NwYW4+XHJcbiAgICAgICAgICAgICl9XHJcbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17YnV0dG9uQ2xhc3N9IG9uQ2xpY2s9e2V2ZW50ID0+IGhhbmRsZUFjdGlvbihldmVudCwgKCkgPT4gb25TZWxlY3RFbGVtZW50Py4oaWQpKX0gYXJpYS1sYWJlbD17YEVkaXQgJHtsYWJlbCB8fCAnc2VjdGlvbid9YH0+XHJcbiAgICAgICAgICAgICAgICA8UGVuY2lsIHNpemU9ezEzfSAvPlxyXG4gICAgICAgICAgICAgICAgRWRpdFxyXG4gICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAge2lzRHluYW1pY1NlY3Rpb24gJiYgKFxyXG4gICAgICAgICAgICAgICAgPD5cclxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e2J1dHRvbkNsYXNzfSBvbkNsaWNrPXtldmVudCA9PiBoYW5kbGVBY3Rpb24oZXZlbnQsICgpID0+IG9uVG9nZ2xlU2VjdGlvblZpc2liaWxpdHk/LihzZWN0aW9uSW5kZXgsICFpc1Zpc2libGUpKX0gYXJpYS1sYWJlbD17YCR7aXNWaXNpYmxlID8gJ0hpZGUnIDogJ1Nob3cnfSAke2xhYmVsIHx8ICdzZWN0aW9uJ31gfT5cclxuICAgICAgICAgICAgICAgICAgICAgICAge2lzVmlzaWJsZSA/IDxFeWVPZmYgc2l6ZT17MTN9IC8+IDogPEV5ZSBzaXplPXsxM30gLz59XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHtpc1Zpc2libGUgPyAnSGlkZScgOiAnU2hvdyd9XHJcbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICAgICAgICA8Lz5cclxuICAgICAgICAgICAgKX1cclxuICAgICAgICA8L2Rpdj5cclxuICAgICk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgY3JlYXRlUHJldmlld0VkaXRvciA9ICh7IHRoZW1lLCBhY3RpdmVFbGVtZW50LCBvblNlbGVjdEVsZW1lbnQsIG9uVG9nZ2xlU2VjdGlvblZpc2liaWxpdHkgfSkgPT4ge1xyXG4gICAgaWYgKCFvblNlbGVjdEVsZW1lbnQpIHJldHVybiBudWxsO1xyXG4gICAgLy8gUmVzb2x2ZSBjb21tYW5kcyBhZ2FpbnN0IHRoZSBkcmFmdCwgYmVmb3JlIHBsYW4gZmlsdGVyaW5nIGFuZCBzb3J0aW5nLlxyXG4gICAgY29uc3Qgc2VjdGlvbnMgPSB0aGVtZT8uaG9tZXBhZ2VTZWN0aW9ucyB8fCBbXTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHNlbGVjdGVkSWQ6IGFjdGl2ZUVsZW1lbnQsXHJcbiAgICAgICAgb25TZWxlY3Q6IG9uU2VsZWN0RWxlbWVudCxcclxuICAgICAgICByZW5kZXJUb29sYmFyOiAoaWQsIG1ldGEgPSB7fSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBzZWN0aW9uSW5kZXggPSBpZD8uc3RhcnRzV2l0aCgnc2VjdGlvbjonKVxyXG4gICAgICAgICAgICAgICAgPyBzZWN0aW9ucy5maW5kSW5kZXgoc2VjdGlvbiA9PiBTdHJpbmcoc2VjdGlvbj8uaWQgfHwgc2VjdGlvbj8uX2lkKSA9PT0gaWQuc2xpY2UoJ3NlY3Rpb246Jy5sZW5ndGgpKVxyXG4gICAgICAgICAgICAgICAgOiAoaWQ/LnN0YXJ0c1dpdGgoJ3NlY3Rpb24tJykgPyBOdW1iZXIoaWQucmVwbGFjZSgnc2VjdGlvbi0nLCAnJykpIDogLTEpO1xyXG4gICAgICAgICAgICBjb25zdCBzZWN0aW9uID0gc2VjdGlvbkluZGV4ID49IDAgPyBzZWN0aW9uc1tzZWN0aW9uSW5kZXhdIDogbnVsbDtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiAoXHJcbiAgICAgICAgICAgICAgICA8UHJldmlld1NlY3Rpb25Ub29sYmFyXHJcbiAgICAgICAgICAgICAgICAgICAgaWQ9e2lkfVxyXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsPXtzZWN0aW9uID8gZ2V0U2VjdGlvbkxhYmVsKHNlY3Rpb24pIDogbWV0YS5sYWJlbH1cclxuICAgICAgICAgICAgICAgICAgICBsb2NrZWQ9e0Jvb2xlYW4obWV0YS5sb2NrZWQpfVxyXG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb249e3NlY3Rpb259XHJcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbkluZGV4PXtzZWN0aW9uSW5kZXh9XHJcbiAgICAgICAgICAgICAgICAgICAgb25TZWxlY3RFbGVtZW50PXtvblNlbGVjdEVsZW1lbnR9XHJcbiAgICAgICAgICAgICAgICAgICAgb25Ub2dnbGVTZWN0aW9uVmlzaWJpbGl0eT17b25Ub2dnbGVTZWN0aW9uVmlzaWJpbGl0eX1cclxuICAgICAgICAgICAgICAgIC8+XHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBDaGVja291dEJyYW5kaW5nUHJldmlldyA9ICh7IHRoZW1lLCBzaG9wTmFtZSB9KSA9PiB7XHJcbiAgICBjb25zdCByZXNvbHZlZCA9IHJlc29sdmVFZmZlY3RpdmVUaGVtZSh0aGVtZSwgeyBzaG9wTmFtZSB9KTtcclxuICAgIHJldHVybiA8ZGl2IGNsYXNzTmFtZT1cInNmLXByZXNlbnRhdGlvblwiIGRhdGEtc2YtcHJlc2VudGF0aW9uPXtnZXRTdG9yZWZyb250UHJlc2VudGF0aW9uVmFyaWFudChyZXNvbHZlZCkgPT09ICdhdGVsaWVyLWVkaXRvcmlhbCcgPyAnYXRlbGllci1lZGl0b3JpYWwnIDogdW5kZWZpbmVkfSBzdHlsZT17Z2V0UmVmZXJlbmNlVGhlbWVTdHlsZShyZXNvbHZlZCl9PjxDaGVja291dEJyYW5kaW5nQmFubmVyIGNoZWNrb3V0QnJhbmRpbmc9e3Jlc29sdmVkLmNoZWNrb3V0QnJhbmRpbmd9IC8+PENoZWNrb3V0VHJ1c3RCYWRnZXMgLz48L2Rpdj47XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgU3RvcmVmcm9udFByZXZpZXdDb250ZW50ID0gKHtcclxuICAgIHRoZW1lLFxyXG4gICAgcGxhbkFjY2VzcyxcclxuICAgIGJyYW5kaW5nLFxyXG4gICAgc3RvcmV3aWRlRGlzY291bnQsXHJcbiAgICBzaG9wTmFtZSxcclxuICAgIHRydXN0ZWRCYWRnZSxcclxuICAgIHNob3BWZXJpZmljYXRpb24sXHJcbiAgICBjYXJ0Q291bnQgPSAzLFxyXG4gICAgcHJldmlld1BhZ2UgPSAnaG9tZScsXHJcbiAgICBhdmFpbGFibGVQcm9kdWN0cyA9IFtdLFxyXG4gICAgcHJldmlld0NhdGFsb2csXHJcbiAgICBhdmFpbGFibGVDYXRlZ29yaWVzID0gW10sXHJcbiAgICBhdmFpbGFibGVSZXZpZXdzID0gW10sXHJcbiAgICBhY3RpdmVFbGVtZW50LFxyXG4gICAgb25TZWxlY3RFbGVtZW50LFxyXG4gICAgb25Ub2dnbGVTZWN0aW9uVmlzaWJpbGl0eVxyXG59KSA9PiB7XHJcbiAgICBjb25zdCBub3JtYWxpemVkVGhlbWUgPSByZXNvbHZlRWZmZWN0aXZlVGhlbWUodGhlbWUgfHwge30sIHsgcGxhbkFjY2VzcywgYnJhbmRpbmcsIHNob3BOYW1lIH0pO1xyXG4gICAgY29uc3QgcHJvZHVjdHMgPSBhdmFpbGFibGVQcm9kdWN0cy5tYXAobm9ybWFsaXplUHJvZHVjdCkuZmlsdGVyKEJvb2xlYW4pO1xyXG4gICAgY29uc3QgY2F0YWxvZ1Byb2R1Y3RzID0gcHJldmlld0NhdGFsb2c/LnByb2R1Y3RzID8gcHJldmlld0NhdGFsb2cucHJvZHVjdHMubWFwKG5vcm1hbGl6ZVByb2R1Y3QpLmZpbHRlcihCb29sZWFuKSA6IHByb2R1Y3RzO1xyXG4gICAgY29uc3QgcHJldmlld0NhdGVnb3JpZXMgPSBhdmFpbGFibGVDYXRlZ29yaWVzLmxlbmd0aFxyXG4gICAgICAgID8gYXZhaWxhYmxlQ2F0ZWdvcmllc1xyXG4gICAgICAgIDogWy4uLm5ldyBTZXQocHJvZHVjdHMubWFwKHByb2R1Y3QgPT4gcHJvZHVjdC5jYXRlZ29yeSkuZmlsdGVyKEJvb2xlYW4pKV07XHJcbiAgICBjb25zdCBjYXRlZ29yeU5hbWVzID0gWy4uLm5ldyBTZXQocHJldmlld0NhdGVnb3JpZXMubWFwKGdldENhdGVnb3J5TmFtZSkuZmlsdGVyKEJvb2xlYW4pKV07XHJcbiAgICBjb25zdCBjYXRlZ29yeURldGFpbHMgPSBwcmV2aWV3Q2F0ZWdvcmllcy5maWx0ZXIoY2F0ZWdvcnkgPT4gY2F0ZWdvcnkgJiYgdHlwZW9mIGNhdGVnb3J5ID09PSAnb2JqZWN0Jyk7XHJcbiAgICBjb25zdCBwcmV2aWV3U2VjdGlvblByb2R1Y3RzID0gdXNlTWVtbygoKSA9PiB7XHJcbiAgICAgICAgY29uc3QgcHJvZHVjdE1hcCA9IG5ldyBNYXAocHJvZHVjdHMubWFwKHByb2R1Y3QgPT4gW1N0cmluZyhwcm9kdWN0Ll9pZCksIHByb2R1Y3RdKSk7XHJcbiAgICAgICAgT2JqZWN0LmVudHJpZXMocHJldmlld0NhdGFsb2c/LnByb2R1Y3RzQnlJZCB8fCB7fSkuZm9yRWFjaCgoW2lkLCBwcm9kdWN0XSkgPT4gcHJvZHVjdE1hcC5zZXQoaWQsIG5vcm1hbGl6ZVByb2R1Y3QocHJvZHVjdCkpKTtcclxuICAgICAgICAvLyBGcmVzaCBwaWNrZXIgcmVzdWx0cyB0YWtlIHByZWNlZGVuY2Ugb3ZlciB0aGUgb3BlbmluZyBzbmFwc2hvdC4gQSBudWxsXHJcbiAgICAgICAgLy8gcHVibGljIGNhcmQgbWVhbnMgdGhlIHByb2R1Y3QgaXMgbm8gbG9uZ2VyIGVsaWdpYmxlIGZvciBzdG9yZWZyb250IHVzZS5cclxuICAgICAgICBwcm9kdWN0cy5mb3JFYWNoKHByb2R1Y3QgPT4ge1xyXG4gICAgICAgICAgICBpZiAoIU9iamVjdC5oYXNPd24ocHJvZHVjdCwgJ3ByZXZpZXdDYXJkJykpIHJldHVybjtcclxuICAgICAgICAgICAgaWYgKHByb2R1Y3QucHJldmlld0NhcmQpIHByb2R1Y3RNYXAuc2V0KFN0cmluZyhwcm9kdWN0Ll9pZCksIG5vcm1hbGl6ZVByb2R1Y3QocHJvZHVjdC5wcmV2aWV3Q2FyZCkpO1xyXG4gICAgICAgICAgICBlbHNlIHByb2R1Y3RNYXAuZGVsZXRlKFN0cmluZyhwcm9kdWN0Ll9pZCkpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiAobm9ybWFsaXplZFRoZW1lLmhvbWVwYWdlU2VjdGlvbnMgfHwgW10pLnJlZHVjZSgoYWNjLCBzZWN0aW9uKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICghWydGZWF0dXJlZFByb2R1Y3RzJywgJ0NvbGxlY3Rpb24nLCAnQ29sbGVjdGlvblNob3djYXNlJ10uaW5jbHVkZXMoc2VjdGlvbi50eXBlKSkgcmV0dXJuIGFjYztcclxuICAgICAgICAgICAgY29uc3Qgc2VjdGlvbklkID0gc2VjdGlvbi5pZCB8fCBzZWN0aW9uLl9pZDtcclxuICAgICAgICAgICAgY29uc3QgcHJvZHVjdElkcyA9IHNlY3Rpb24uc2V0dGluZ3M/LnByb2R1Y3RJZHMgfHwgc2VjdGlvbi5zZXR0aW5ncz8uc291cmNlPy5wcm9kdWN0SWRzIHx8IHNlY3Rpb24uc291cmNlPy5wcm9kdWN0SWRzIHx8IFtdO1xyXG4gICAgICAgICAgICBpZiAoIXNlY3Rpb25JZCB8fCAhQXJyYXkuaXNBcnJheShwcm9kdWN0SWRzKSB8fCBwcm9kdWN0SWRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGFjYztcclxuICAgICAgICAgICAgYWNjW3NlY3Rpb25JZF0gPSBwcm9kdWN0SWRzLm1hcChpZCA9PiBwcm9kdWN0TWFwLmdldChTdHJpbmcoaWQpKSkuZmlsdGVyKEJvb2xlYW4pO1xyXG4gICAgICAgICAgICByZXR1cm4gYWNjO1xyXG4gICAgICAgIH0sIHt9KTtcclxuICAgIH0sIFtwcm9kdWN0cywgcHJldmlld0NhdGFsb2csIG5vcm1hbGl6ZWRUaGVtZS5ob21lcGFnZVNlY3Rpb25zXSk7XHJcbiAgICBjb25zdCBwcmV2aWV3U2VjdGlvblJldmlld3MgPSB1c2VNZW1vKCgpID0+IHtcclxuICAgICAgICBjb25zdCByZXZpZXdNYXAgPSBuZXcgTWFwKGF2YWlsYWJsZVJldmlld3MubWFwKHJldmlldyA9PiBbU3RyaW5nKHJldmlldy5faWQpLCByZXZpZXddKSk7XHJcbiAgICAgICAgcmV0dXJuIChub3JtYWxpemVkVGhlbWUuaG9tZXBhZ2VTZWN0aW9ucyB8fCBbXSkucmVkdWNlKChhY2MsIHNlY3Rpb24pID0+IHtcclxuICAgICAgICAgICAgaWYgKHNlY3Rpb24udHlwZSAhPT0gJ1Jldmlld3MnKSByZXR1cm4gYWNjO1xyXG4gICAgICAgICAgICBjb25zdCBzZWN0aW9uSWQgPSBzZWN0aW9uLmlkIHx8IHNlY3Rpb24uX2lkO1xyXG4gICAgICAgICAgICBjb25zdCByZXZpZXdJZHMgPSBzZWN0aW9uLnNldHRpbmdzPy5yZXZpZXdJZHMgfHwgW107XHJcbiAgICAgICAgICAgIGlmICghc2VjdGlvbklkIHx8ICFBcnJheS5pc0FycmF5KHJldmlld0lkcykgfHwgcmV2aWV3SWRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGFjYztcclxuICAgICAgICAgICAgYWNjW3NlY3Rpb25JZF0gPSByZXZpZXdJZHMubWFwKGlkID0+IHJldmlld01hcC5nZXQoU3RyaW5nKGlkKSkpLmZpbHRlcihCb29sZWFuKTtcclxuICAgICAgICAgICAgcmV0dXJuIGFjYztcclxuICAgICAgICB9LCB7fSk7XHJcbiAgICB9LCBbYXZhaWxhYmxlUmV2aWV3cywgbm9ybWFsaXplZFRoZW1lLmhvbWVwYWdlU2VjdGlvbnNdKTtcclxuICAgIGNvbnN0IGVkaXRvciA9IHVzZU1lbW8oKCkgPT4gY3JlYXRlUHJldmlld0VkaXRvcih7IHRoZW1lLCBhY3RpdmVFbGVtZW50LCBvblNlbGVjdEVsZW1lbnQsIG9uVG9nZ2xlU2VjdGlvblZpc2liaWxpdHkgfSksXHJcbiAgICAgICAgW2FjdGl2ZUVsZW1lbnQsIHRoZW1lPy5ob21lcGFnZVNlY3Rpb25zLCBvblNlbGVjdEVsZW1lbnQsIG9uVG9nZ2xlU2VjdGlvblZpc2liaWxpdHldKTtcclxuICAgIGNvbnN0IHJlbmRlclByZXZpZXdQYWdlID0gKCkgPT4ge1xyXG4gICAgICAgIGlmIChwcmV2aWV3UGFnZSAhPT0gJ2hvbWUnKSByZXR1cm4gPFByZXZpZXdDb21tZXJjZVBhZ2Uga2V5PXtgJHtwcmV2aWV3UGFnZX0tJHtwcm9kdWN0c1swXT8uX2lkIHx8ICdlbXB0eSd9YH0gcGFnZT17cHJldmlld1BhZ2V9IHRoZW1lPXtub3JtYWxpemVkVGhlbWV9IHNob3BOYW1lPXtzaG9wTmFtZX0gcHJvZHVjdHM9e3Byb2R1Y3RzfSByZXZpZXdzPXthdmFpbGFibGVSZXZpZXdzfSAvPjtcclxuXHJcbiAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgPFJlZmVyZW5jZVN0b3JlZnJvbnRIb21lXHJcbiAgICAgICAgICAgICAgICB0aGVtZT17bm9ybWFsaXplZFRoZW1lfVxyXG4gICAgICAgICAgICAgICAgc2hvcE5hbWU9e3Nob3BOYW1lIHx8ICdTdG9yZSBwcmV2aWV3J31cclxuICAgICAgICAgICAgICAgIHN1YmRvbWFpbj1cInByZXZpZXdcIlxyXG4gICAgICAgICAgICAgICAgY2FydENvdW50PXtjYXJ0Q291bnR9XHJcbiAgICAgICAgICAgICAgICBzdG9yZXdpZGVEaXNjb3VudD17c3RvcmV3aWRlRGlzY291bnR9XHJcbiAgICAgICAgICAgICAgICBwcm9kdWN0cz17Y2F0YWxvZ1Byb2R1Y3RzfVxyXG4gICAgICAgICAgICAgICAgY2F0ZWdvcmllcz17Y2F0ZWdvcnlOYW1lc31cclxuICAgICAgICAgICAgICAgIGNhdGVnb3J5RGV0YWlscz17Y2F0ZWdvcnlEZXRhaWxzfVxyXG4gICAgICAgICAgICAgICAgc2VjdGlvblByb2R1Y3RzPXtwcmV2aWV3U2VjdGlvblByb2R1Y3RzfVxyXG4gICAgICAgICAgICAgICAgc2VjdGlvblJldmlld3M9e3ByZXZpZXdTZWN0aW9uUmV2aWV3c31cclxuICAgICAgICAgICAgICAgIHBhZ2luYXRpb249e3ByZXZpZXdDYXRhbG9nPy5wYWdpbmF0aW9uIHx8IHsgcGFnZTogMSwgcGFnZXM6IDEgfX1cclxuICAgICAgICAgICAgICAgIGZpbHRlcnM9e3sgY2F0ZWdvcnk6ICdBbGwnLCBzb3J0OiAnbmV3ZXN0JywgcGFnZTogMSB9fVxyXG4gICAgICAgICAgICAgICAgcHJpY2VJbnB1dD17eyBtaW46ICcnLCBtYXg6ICcnIH19XHJcbiAgICAgICAgICAgICAgICBjYXRhbG9nU2VhcmNoPVwiXCJcclxuICAgICAgICAgICAgICAgIG9uUHJvZHVjdEJ1eU5vdz17KCkgPT4ge319XHJcbiAgICAgICAgICAgICAgICBwcmV2aWV3XHJcbiAgICAgICAgICAgICAgICBwcmV2aWV3RGV2aWNlPXt1bmRlZmluZWR9XHJcbiAgICAgICAgICAgICAgICBlZGl0b3I9e2VkaXRvcn1cclxuICAgICAgICAgICAgICAgIExpbmtDb21wb25lbnQ9e1ByZXZpZXdMaW5rfVxyXG4gICAgICAgICAgICAvPlxyXG4gICAgICAgICk7XHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiA8UHJlc2VudGF0aW9uUnVudGltZSB2YWx1ZT17eyBMaW5rOiBQcmV2aWV3TGluaywgSW1hZ2U6IE5hdGl2ZUltYWdlIH19PlxyXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic2YtcHJlc2VudGF0aW9uXCIgc3R5bGU9e3sgLi4uZ2V0UmVmZXJlbmNlVGhlbWVTdHlsZShub3JtYWxpemVkVGhlbWUpLCBtaW5IZWlnaHQ6ICcxMDB2aCcgfX0gZGF0YS1zZi1wcmVzZW50YXRpb249e2dldFN0b3JlZnJvbnRQcmVzZW50YXRpb25WYXJpYW50KG5vcm1hbGl6ZWRUaGVtZSkgPT09ICdhdGVsaWVyLWVkaXRvcmlhbCcgPyAnYXRlbGllci1lZGl0b3JpYWwnIDogdW5kZWZpbmVkfT5cclxuICAgICAgICAgICAgPFJlZmVyZW5jZVN0b3JlZnJvbnRIZWFkZXIgdGhlbWU9e25vcm1hbGl6ZWRUaGVtZX0gc2hvcE5hbWU9e3Nob3BOYW1lIHx8ICdTdG9yZSBwcmV2aWV3J30gc3ViZG9tYWluPVwicHJldmlld1wiIGNhcnRDb3VudD17Y2FydENvdW50fSB0cnVzdGVkQmFkZ2U9e3RydXN0ZWRCYWRnZX0gc2hvcFZlcmlmaWNhdGlvbj17c2hvcFZlcmlmaWNhdGlvbn0gZWRpdG9yPXtlZGl0b3J9IExpbmtDb21wb25lbnQ9e1ByZXZpZXdMaW5rfSAvPlxyXG4gICAgICAgICAgICB7cmVuZGVyUHJldmlld1BhZ2UoKX1cclxuICAgICAgICAgICAgPFJlZmVyZW5jZVN0b3JlZnJvbnRGb290ZXIgdGhlbWU9e25vcm1hbGl6ZWRUaGVtZX0gc2hvcE5hbWU9e3Nob3BOYW1lIHx8ICdTdG9yZSBwcmV2aWV3J30gc3ViZG9tYWluPVwicHJldmlld1wiIGNhcnRDb3VudD17Y2FydENvdW50fSBzaG9wVmVyaWZpY2F0aW9uPXtzaG9wVmVyaWZpY2F0aW9ufSBlZGl0b3I9e2VkaXRvcn0gTGlua0NvbXBvbmVudD17UHJldmlld0xpbmt9IC8+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICA8L1ByZXNlbnRhdGlvblJ1bnRpbWU+O1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIFN0b3JlZnJvbnRQcmV2aWV3KHsgZGV2aWNlID0gJ2Rlc2t0b3AnLCBwcmV2aWV3Wm9vbSA9ICdmaXQnLCB0aHVtYm5haWwgPSBmYWxzZSwgLi4ucHJvcHMgfSkge1xyXG4gICAgY29uc3Qgdmlld3BvcnQgPSBTVE9SRUZST05UX1ZJRVdQT1JUU1tkZXZpY2VdIHx8IFNUT1JFRlJPTlRfVklFV1BPUlRTLmRlc2t0b3A7XHJcbiAgICByZXR1cm4gPGRpdiBkYXRhLXByZXZpZXctZGV2aWNlPXtkZXZpY2V9IGNsYXNzTmFtZT17dGh1bWJuYWlsID8gJycgOiAncm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXNsYXRlLTIwMCBiZy1zbGF0ZS0xMDAgcC0zJ30+XHJcbiAgICAgICAgPFN0b3JlZnJvbnRQcmV2aWV3RnJhbWUgd2lkdGg9e3ZpZXdwb3J0LndpZHRofSBoZWlnaHQ9e3RodW1ibmFpbCA/IDc0MCA6IHZpZXdwb3J0LmhlaWdodH1cclxuICAgICAgICAgICAgdGl0bGU9e2Ake3Byb3BzLnNob3BOYW1lIHx8ICdTdG9yZSd9ICR7cHJvcHMucHJldmlld1BhZ2UgfHwgJ2hvbWUnfSBwcmV2aWV3YH0gem9vbT17cHJldmlld1pvb219IHRodW1ibmFpbD17dGh1bWJuYWlsfT5cclxuICAgICAgICAgICAgPFN0b3JlZnJvbnRQcmV2aWV3Q29udGVudCB7Li4ucHJvcHN9IGRldmljZT17ZGV2aWNlfSAvPlxyXG4gICAgICAgIDwvU3RvcmVmcm9udFByZXZpZXdGcmFtZT5cclxuICAgIDwvZGl2PjtcclxufVxyXG4iXX0=