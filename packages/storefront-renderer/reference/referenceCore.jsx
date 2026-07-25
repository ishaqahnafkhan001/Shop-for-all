"use client";

import { ChevronDown } from "lucide-react";

import { getThemeCssVars } from "@scaleup/storefront-theme";

const getImageUrlFromValue = (value) => {
    if (typeof value === "string") return value;
    if (!value || typeof value !== "object") return "";
    return value.secure_url || value.url || value.src || value.imageUrl || "";
};

const getProductImageAlt = ({ product, image } = {}) => {
    if (image && typeof image === "object" && image.alt) return String(image.alt).trim();
    return String(product?.imageAltText || product?.title || "Product image").trim() || "Product image";
};

export const REFERENCE_SAMPLE_PRODUCTS = [];
export const REFERENCE_SAMPLE_CATEGORIES = [];

export const productGridGapClasses = {
    Compact: "gap-2.5 min-[430px]:gap-3.5 sm:gap-4",
    Comfortable: "gap-3 min-[430px]:gap-4 lg:gap-5",
    Spacious: "gap-4 sm:gap-5 lg:gap-6",
    Editorial: "gap-4 sm:gap-5 lg:gap-6",
};

export const tabletGridClasses = {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
};

export const desktopGridClasses = {
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-3 xl:grid-cols-4",
    5: "lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
};

export const plainGridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
};

export const cardRadiusClasses = {
    Soft: "rounded-xl",
    Rounded: "rounded-[1.35rem]",
    Square: "rounded-none",
};

export const imageRadiusClasses = {
    Soft: "rounded-xl",
    Rounded: "rounded-[1.15rem]",
    Square: "rounded-none",
};

export const cardShadowClasses = {
    None: "shadow-none hover:shadow-none",
    Soft: "shadow-sm hover:shadow-xl hover:shadow-slate-200/70",
    Elevated: "shadow-lg shadow-slate-200/70 hover:shadow-2xl hover:shadow-slate-300/70",
};

export const imageAspectClasses = {
    Square: "aspect-square",
    Portrait: "aspect-[3/4]",
    Landscape: "aspect-[4/3]",
};

export const titleSizeClasses = {
    Small: "text-xs sm:text-sm",
    Medium: "text-sm sm:text-base",
    Large: "text-base sm:text-lg",
};

export const priceSizeClasses = {
    Small: "text-sm sm:text-base",
    Medium: "text-base sm:text-lg",
    Large: "text-lg sm:text-xl md:text-2xl",
};

export const buttonShapeClasses = {
    Soft: "rounded-lg",
    Rounded: "rounded-xl",
    Pill: "rounded-full",
    Square: "rounded-none",
};

export const categoryGridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
};

export const categoryDesktopGridClasses = {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
};

export const noop = () => {};

export const formatPrice = (value) => {
    const number = Number(value || 0);
    return `৳ ${number.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
};

export const getImageUrl = (product) => getImageUrlFromValue(product?.coverMediaId) || getImageUrlFromValue(product?.imageUrl) || getImageUrlFromValue(product?.images?.[0]) || "";
export const getCardImageAlt = (product) => getProductImageAlt({ product, image: product?.coverMediaId || product?.images?.[0] });

export const optimizeCloudinaryImage = (src = "", { width = 900, quality = "auto:eco", crop = "limit" } = {}) => {
    if (!src || typeof src !== "string" || src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) return src;

    try {
        const url = new URL(src);
        const uploadSegment = "/image/upload/";
        if (url.hostname !== "res.cloudinary.com" || !url.pathname.includes(uploadSegment)) return src;

        const [prefix, suffix] = url.pathname.split(uploadSegment);
        const transformation = `f_auto,q_${quality},c_${crop},w_${width}`;
        url.pathname = `${prefix}${uploadSegment}${transformation}/${suffix}`;
        return url.toString();
    } catch {
        return src;
    }
};

export const getResponsiveImageSrcSet = (src = "", widths = [], options = {}) => {
    if (!src || !Array.isArray(widths)) return "";

    return [...new Set(widths)]
        .map(Number)
        .filter(width => Number.isFinite(width) && width > 0)
        .sort((left, right) => left - right)
        .map(width => `${optimizeCloudinaryImage(src, { ...options, width })} ${width}w`)
        .join(", ");
};

export const getPrice = (product) => product?.finalPrice || product?.sellingPrice || product?.pricing?.sellingPrice || product?.price || 0;
export const normalizeImageList = (...lists) => [...new Set(lists.flat().filter(Boolean).map(String))];
export const getSectionDisplayLabel = (section) => section?.settings?.visualLabel || section?.title || section?.type || "Section";

export const normalizeHeroSlide = (slide = {}, index = 0, hero = {}) => ({
    id: slide.id || `hero-slide-${index + 1}`,
    enabled: slide.enabled !== false,
    desktopImage: slide.desktopImage || slide.imageUrl || (index === 0 ? hero.imageUrl : "") || "",
    mobileImage: slide.mobileImage || "",
    title: slide.title ?? (index === 0 ? hero.title : "") ?? "",
    subtitle: slide.subtitle ?? (index === 0 ? hero.subtitle : "") ?? "",
    badgeText: slide.badgeText ?? (index === 0 ? hero.badgeText : "") ?? "",
    discountText: slide.discountText ?? "",
    primaryCtaText: slide.primaryCtaText !== undefined
        ? slide.primaryCtaText
        : ((index === 0 ? hero.ctaLabel : "") || "Shop Now"),
    primaryCtaLink: slide.primaryCtaLink !== undefined
        ? slide.primaryCtaLink
        : ((index === 0 ? hero.ctaUrl : "") || "#products"),
    secondaryCtaText: slide.secondaryCtaText ?? "Explore Collection",
    secondaryCtaLink: slide.secondaryCtaLink !== undefined ? slide.secondaryCtaLink : "#products",
    desktopFocalPoint: {
        x: Math.min(100, Math.max(0, Number(slide.desktopFocalPoint?.x) || 50)),
        y: Math.min(100, Math.max(0, Number(slide.desktopFocalPoint?.y) || 50)),
    },
    mobileFocalPoint: {
        x: Math.min(100, Math.max(0, Number(slide.mobileFocalPoint?.x) || 50)),
        y: Math.min(100, Math.max(0, Number(slide.mobileFocalPoint?.y) || 50)),
    },
});

const hasRenderableHeroSlide = (slide = {}) => Boolean(
    slide.desktopImage ||
    slide.mobileImage ||
    slide.title ||
    slide.subtitle ||
    slide.badgeText ||
    slide.discountText
);

export const getHeroSlides = (hero = {}) => {
    const sourceSlides = Array.isArray(hero.bannerSlides) ? hero.bannerSlides : [];
    const slides = sourceSlides.length
        ? sourceSlides.map((slide, index) => normalizeHeroSlide(slide, index, hero))
        : [normalizeHeroSlide({}, 0, hero)];
    const seen = new Set();
    const enabledSlides = slides.filter((slide) => {
        if (slide.enabled === false || !hasRenderableHeroSlide(slide)) return false;
        const key = [slide.desktopImage, slide.mobileImage, slide.title, slide.subtitle, slide.badgeText, slide.discountText].join("|");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    return enabledSlides.length ? enabledSlides : [slides[0] || normalizeHeroSlide({}, 0, hero)];
};

export const getReferenceThemeStyle = (themeCandidate = {}) => {
    const cssTheme = getThemeCssVars(themeCandidate);
    const groups = cssTheme.colorGroups || {};
    const brand = groups.brand || {};
    const header = groups.header || {};
    const hero = groups.hero || {};
    const productCard = groups.productCard || {};
    const allProducts = groups.allProducts || {};
    const sections = groups.sections || {};
    const footer = groups.footer || {};
    const checkout = groups.checkout || {};
    const storefrontForeground = brand.secondary || cssTheme.foreground;

    return {
        "--sf-background": cssTheme.background,
        "--sf-foreground": storefrontForeground,
        "--sf-accent": brand.accent || cssTheme.accent,
        "--sf-accent-hover": brand.hover || cssTheme.accentHover,
        "--sf-accent-soft": brand.soft || cssTheme.accentSoft,
        "--sf-accent-bg": brand.soft || cssTheme.accentBg,
        "--sf-primary-button-bg": cssTheme.primaryButtonBg,
        "--sf-primary-button-text": cssTheme.primaryButtonText,
        "--sf-primary-button-hover-bg": cssTheme.primaryButtonHoverBg,
        "--sf-navbar-background": header.background || cssTheme.navbarBackground,
        "--sf-navbar-text": header.text || cssTheme.navbarText,
        "--sf-navbar-muted-text": header.mutedText || cssTheme.navbarText,
        "--sf-navbar-hover": header.hover || cssTheme.navbarHover,
        "--sf-header-icon": header.icon || cssTheme.navbarText,
        "--sf-header-border": header.border || cssTheme.cardBorder,
        "--sf-header-cart-badge-bg": header.cartBadgeBackground || brand.primary || cssTheme.accent,
        "--sf-header-cart-badge-text": header.cartBadgeText || "#ffffff",
        "--sf-hero-background": hero.background || "#020617",
        "--sf-hero-title": hero.title || "#ffffff",
        "--sf-hero-subtitle": hero.subtitle || "#e2e8f0",
        "--sf-hero-overlay": hero.overlay || "#020617",
        "--sf-hero-primary-button-bg": hero.primaryButtonBackground || "#ffffff",
        "--sf-hero-primary-button-text": hero.primaryButtonText || "#0f172a",
        "--sf-hero-secondary-button-bg": hero.secondaryButtonBackground || "#ffffff",
        "--sf-hero-secondary-button-text": hero.secondaryButtonText || "#0f172a",
        "--sf-card-background": productCard.background || cssTheme.cardBackground,
        "--sf-card-border": productCard.border || cssTheme.cardBorder,
        "--sf-card-hover-border": cssTheme.cardHoverBorder,
        "--sf-product-card-background": productCard.background || cssTheme.cardBackground,
        "--sf-product-card-border": productCard.border || cssTheme.cardBorder,
        "--sf-product-card-shadow": productCard.shadow || cssTheme.cardBorder,
        "--sf-product-card-title": productCard.title || storefrontForeground,
        "--sf-product-card-category": productCard.category || cssTheme.footerText,
        "--sf-product-card-price": productCard.price || cssTheme.priceColor,
        "--sf-product-card-compare-at-price": productCard.compareAtPrice || "#94a3b8",
        "--sf-product-card-sale-badge-bg": productCard.saleBadgeBackground || cssTheme.saleBadgeBg,
        "--sf-product-card-sale-badge-text": productCard.saleBadgeText || cssTheme.saleBadgeText,
        "--sf-product-card-rating-star": productCard.ratingStar || cssTheme.ratingColor,
        "--sf-product-card-rating-text": productCard.ratingText || "#94a3b8",
        "--sf-product-card-wishlist-icon": productCard.wishlistIcon || "#64748b",
        "--sf-product-card-wishlist-active": productCard.wishlistActive || "#e11d48",
        "--sf-product-card-add-to-cart-bg": productCard.addToCartBackground || brand.primary || cssTheme.accent,
        "--sf-product-card-add-to-cart-text": productCard.addToCartText || "#ffffff",
        "--sf-product-card-buy-now-bg": productCard.buyNowBackground || "#0f172a",
        "--sf-product-card-buy-now-text": productCard.buyNowText || "#ffffff",
        "--sf-product-card-out-of-stock-bg": productCard.outOfStockBackground || "#fff1f2",
        "--sf-product-card-out-of-stock-text": productCard.outOfStockText || "#e11d48",
        "--sf-product-card-stock-bg": productCard.stockBackground || "#ecfdf5",
        "--sf-product-card-stock-text": productCard.stockText || "#047857",
        "--sf-sale-badge-bg": productCard.saleBadgeBackground || cssTheme.saleBadgeBg,
        "--sf-sale-badge-text": productCard.saleBadgeText || cssTheme.saleBadgeText,
        "--sf-price-color": productCard.price || cssTheme.priceColor,
        "--sf-rating-color": productCard.ratingStar || cssTheme.ratingColor,
        "--sf-all-products-background": allProducts.background || cssTheme.background,
        "--sf-all-products-title": allProducts.title || storefrontForeground,
        "--sf-all-products-subtitle": allProducts.subtitle || cssTheme.footerText,
        "--sf-all-products-filter-bg": allProducts.filterBackground || "#ffffff",
        "--sf-all-products-filter-text": allProducts.filterText || "#475569",
        "--sf-all-products-dropdown-bg": allProducts.dropdownBackground || "#ffffff",
        "--sf-all-products-pagination-bg": allProducts.paginationBackground || "#ffffff",
        "--sf-all-products-pagination-text": allProducts.paginationText || "#475569",
        "--sf-all-products-pagination-active-bg": allProducts.paginationActiveBackground || brand.primary || cssTheme.accent,
        "--sf-all-products-pagination-active-text": allProducts.paginationActiveText || "#ffffff",
        "--sf-section-background": sections.background || "#ffffff",
        "--sf-section-title": sections.title || storefrontForeground,
        "--sf-section-subtitle": sections.subtitle || cssTheme.footerText,
        "--sf-section-banner-overlay": sections.bannerOverlay || "#020617",
        "--sf-section-banner-text": sections.bannerText || "#ffffff",
        "--sf-section-faq-bg": sections.faqBackground || "#f8fafc",
        "--sf-section-faq-text": sections.faqText || "#475569",
        "--sf-section-testimonial-bg": sections.testimonialBackground || "#f8fafc",
        "--sf-section-testimonial-text": sections.testimonialText || "#475569",
        "--sf-section-trust-icon": sections.trustIcon || brand.primary || cssTheme.accent,
        "--sf-section-trust-text": sections.trustText || "#475569",
        "--sf-footer-background": footer.background || cssTheme.footerBackground,
        "--sf-footer-heading": footer.heading || cssTheme.footerLink,
        "--sf-footer-text": footer.text || cssTheme.footerText,
        "--sf-footer-link": footer.link || cssTheme.footerLink,
        "--sf-footer-link-hover": footer.linkHover || brand.primary || cssTheme.accent,
        "--sf-footer-border": footer.border || cssTheme.cardBorder,
        "--sf-footer-powered-by": footer.poweredBy || "#94a3b8",
        "--sf-checkout-background": checkout.background || "#f8fafc",
        "--sf-checkout-card-background": checkout.cardBackground || "#ffffff",
        "--sf-checkout-text": checkout.text || "#0f172a",
        "--sf-checkout-button-background": checkout.buttonBackground || "#0f172a",
        "--sf-checkout-button-text": checkout.buttonText || "#ffffff",
        "--sf-checkout-accent": checkout.accent || brand.primary || cssTheme.accent,
        "--sf-checkout-input-background": checkout.inputBackground || "#ffffff",
        "--sf-checkout-input-border": checkout.inputBorder || "#cbd5e1",
        "--sf-checkout-input-focus": checkout.inputFocus || brand.primary || cssTheme.accent,
        "--sf-checkout-error": checkout.error || "#dc2626",
        "--sf-checkout-success": checkout.success || "#047857",
        fontFamily: cssTheme.fontFamily,
        color: storefrontForeground,
        backgroundColor: cssTheme.background,
    };
};

export const DefaultLink = ({ href, children, className, onClick, prefetch, ...props }) => {
    void prefetch;
    return <a href={href} className={className} onClick={onClick} {...props}>{children}</a>;
};

export const LinkSlot = ({ LinkComponent = DefaultLink, href, children, className, onClick, ...props }) => (
    <LinkComponent href={href} className={className} onClick={onClick} {...props}>{children}</LinkComponent>
);

export const containerClass = "mx-auto w-full max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 2xl:px-10";
export const isPreviewMobile = (device) => device === "mobile" || device === "smallMobile";
export const isPreviewNarrow = (device) => isPreviewMobile(device) || device === "tablet";

export const EditorSelectionFrame = ({ editor, id, label, locked = false, children }) => {
    if (!editor || !id) return children;

    const selected = editor.selectedId === id;
    const handleSelect = () => editor.onSelect?.(id);
    const handleKeyDown = (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        handleSelect();
    };

    return (
        <div
            className="group/builder-section relative min-w-0"
            data-builder-section={id}
            role="button"
            tabIndex={0}
            aria-label={`Edit ${label || id}`}
            onClick={handleSelect}
            onKeyDown={handleKeyDown}
        >
            <div
                className={`pointer-events-none absolute inset-0 z-[70] rounded-[1.5rem] transition ${
                    selected
                        ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-white"
                        : "opacity-0 ring-2 ring-indigo-300 ring-offset-2 ring-offset-white group-hover/builder-section:opacity-100"
                }`}
            >
                <span
                    className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-black shadow-sm ${
                        selected ? "bg-indigo-600 text-white" : "bg-white text-indigo-700"
                    }`}
                >
                    {label}{locked ? " · Locked layout" : ""}
                </span>
            </div>
            {selected && editor.renderToolbar?.(id, { label, locked })}
            {children}
        </div>
    );
};

export const FooterAccordionIcon = ChevronDown;
