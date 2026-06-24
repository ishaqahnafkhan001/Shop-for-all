"use client";

import { ChevronDown, Headphones, ShieldCheck, Truck } from "lucide-react";

import { getImageUrlFromValue, getProductImageAlt } from "../../../lib/seo";
import { getThemeCssVars } from "../../../lib/theme";

export const REFERENCE_SAMPLE_PRODUCTS = [];
export const REFERENCE_SAMPLE_CATEGORIES = [];

export const serviceCards = [
    { icon: Truck, title: "Quick Shipping", text: "Fast fulfillment with live delivery updates" },
    { icon: Headphones, title: "24/7 Support", text: "Friendly help whenever customers need it" },
    { icon: ShieldCheck, title: "Secure Payment", text: "Encrypted checkout and trusted payments" },
];

export const productGridGapClasses = {
    Compact: "gap-3 sm:gap-4",
    Comfortable: "gap-3 sm:gap-4 lg:gap-5",
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

export const getImageUrl = (product) => getImageUrlFromValue(product?.imageUrl) || getImageUrlFromValue(product?.images?.[0]) || "";
export const getCardImageAlt = (product) => getProductImageAlt({ product, image: product?.images?.[0] });

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
    primaryCtaText: slide.primaryCtaText || (index === 0 ? hero.ctaLabel : "") || "Shop Now",
    primaryCtaLink: slide.primaryCtaLink || (index === 0 ? hero.ctaUrl : "") || "#products",
    secondaryCtaText: slide.secondaryCtaText ?? "Explore Collection",
    secondaryCtaLink: slide.secondaryCtaLink || "#products",
});

export const getHeroSlides = (hero = {}) => {
    const sourceSlides = Array.isArray(hero.bannerSlides) ? hero.bannerSlides : [];
    const slides = sourceSlides.length
        ? sourceSlides.map((slide, index) => normalizeHeroSlide(slide, index, hero))
        : [normalizeHeroSlide({}, 0, hero)];
    const enabledSlides = slides.filter((slide) => slide.enabled !== false);
    return enabledSlides.length ? enabledSlides : [slides[0] || normalizeHeroSlide({}, 0, hero)];
};

export const getReferenceThemeStyle = (themeCandidate = {}) => {
    const cssTheme = getThemeCssVars(themeCandidate);
    return {
        "--sf-accent": cssTheme.accent,
        "--sf-accent-hover": cssTheme.accentHover,
        "--sf-accent-soft": cssTheme.accentSoft,
        "--sf-accent-bg": cssTheme.accentBg,
        "--sf-primary-button-bg": cssTheme.primaryButtonBg,
        "--sf-primary-button-text": cssTheme.primaryButtonText,
        "--sf-primary-button-hover-bg": cssTheme.primaryButtonHoverBg,
        "--sf-navbar-background": cssTheme.navbarBackground,
        "--sf-navbar-text": cssTheme.navbarText,
        "--sf-navbar-hover": cssTheme.navbarHover,
        "--sf-card-background": cssTheme.cardBackground,
        "--sf-card-border": cssTheme.cardBorder,
        "--sf-card-hover-border": cssTheme.cardHoverBorder,
        "--sf-sale-badge-bg": cssTheme.saleBadgeBg,
        "--sf-sale-badge-text": cssTheme.saleBadgeText,
        "--sf-price-color": cssTheme.priceColor,
        "--sf-rating-color": cssTheme.ratingColor,
        "--sf-footer-background": cssTheme.footerBackground,
        "--sf-footer-text": cssTheme.footerText,
        "--sf-footer-link": cssTheme.footerLink,
        fontFamily: cssTheme.fontFamily,
        color: cssTheme.foreground,
        backgroundColor: cssTheme.background,
    };
};

export const DefaultLink = ({ href, children, className, onClick, ...props }) => (
    <a href={href} className={className} onClick={onClick} {...props}>{children}</a>
);

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
