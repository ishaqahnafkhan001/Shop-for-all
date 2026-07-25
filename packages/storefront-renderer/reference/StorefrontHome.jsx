"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { getEnabledHomepageSections, normalizeTheme } from "@scaleup/storefront-theme";
import {
    containerClass,
    DefaultLink,
    EditorSelectionFrame,
    getHeroSlides,
    getReferenceThemeStyle,
    getResponsiveImageSrcSet,
    isPreviewMobile,
    isPreviewNarrow,
    LinkSlot,
    noop,
    normalizeHeroSlide,
    optimizeCloudinaryImage,
} from "./referenceCore";
import { StorefrontAllProducts } from "./StorefrontAllProducts";
import { HomepageSection } from "./StorefrontSectionRenderer";

export function ReferenceStorefrontHome({
    theme: themeCandidate,
    shopName = "",
    products = [],
    categories = [],
    sectionProducts = {},
    sectionReviews = {},
    storewideDiscount = 0,
    loading = false,
    pagination = { page: 1, pages: 1 },
    filters = { category: "All", sort: "newest", page: 1 },
    priceInput = { min: "", max: "" },
    catalogSearch = "",
    mobileFiltersOpen = false,
    onCatalogSearchChange = noop,
    onSortChange = noop,
    onFilterOpen = noop,
    onFilterClose = noop,
    onCategoryChange = noop,
    onMinPriceChange = noop,
    onMaxPriceChange = noop,
    onPriceApply = noop,
    onClearFilters = noop,
    onRatingChange = noop,
    onPageChange = noop,
    onProductAdd = noop,
    onProductBuyNow,
    onWishlistToggle,
    isProductWishlisted,
    LinkComponent = DefaultLink,
    previewDevice,
    editor,
}) {
    const theme = normalizeTheme(themeCandidate);
    const hero = theme.hero || {};
    const heroSlides = getHeroSlides(hero);
    const [activeHeroIndex, setActiveHeroIndex] = useState(0);
    const [heroPaused, setHeroPaused] = useState(false);
    const activeHeroSlide = heroSlides[activeHeroIndex % heroSlides.length] || normalizeHeroSlide({}, 0, hero);
    const activeHeroImage = activeHeroSlide.desktopImage || activeHeroSlide.mobileImage;
    const activeMobileHeroImage = activeHeroSlide.mobileImage || activeHeroImage;
    const hasMultipleHeroSlides = heroSlides.length > 1;
    const heroOfferText = activeHeroSlide.discountText || (storewideDiscount > 0 ? `${storewideDiscount}% OFF SITEWIDE` : "");
    const layout = theme.layout || {};
    const productCard = {
        ...(theme.productCard || {}),
        colors: theme.colors?.productCard || {},
    };
    const sectionColors = theme.colors?.sections || {};
    const allProducts = theme.allProducts || {};
    const enabledSections = getEnabledHomepageSections(theme);
    const catalogProducts = products || [];
    const forcedMobilePreview = isPreviewMobile(previewDevice);
    const forcedNarrowPreview = isPreviewNarrow(previewDevice);
    const heroDesktopPosition = `${activeHeroSlide.desktopFocalPoint?.x ?? 50}% ${activeHeroSlide.desktopFocalPoint?.y ?? 50}%`;
    const heroMobilePosition = `${activeHeroSlide.mobileFocalPoint?.x ?? 50}% ${activeHeroSlide.mobileFocalPoint?.y ?? 50}%`;
    const mobileHeroSrcSet = getResponsiveImageSrcSet(activeMobileHeroImage, [420, 640, 760], { crop: "fill" });
    const desktopHeroSrcSet = getResponsiveImageSrcSet(activeHeroImage, [960, 1280, 1600, 1920], { crop: "fill" });
    const liveHeroHeightClass = hero.height === "Compact"
        ? "min-h-[318px] min-[390px]:min-h-[332px] sm:min-h-[460px] lg:min-h-[500px]"
        : hero.height === "Tall"
            ? "min-h-[370px] min-[390px]:min-h-[390px] sm:min-h-[600px] lg:min-h-[680px]"
            : "min-h-[338px] min-[390px]:min-h-[360px] sm:min-h-[520px] lg:min-h-[580px]";
    const previewHeroHeightClass = hero.height === "Compact"
        ? (previewDevice === "smallMobile" ? "min-h-[318px]" : forcedMobilePreview ? "min-h-[332px]" : previewDevice === "tablet" ? "min-h-[460px]" : "min-h-[500px]")
        : hero.height === "Tall"
            ? (previewDevice === "smallMobile" ? "min-h-[370px]" : forcedMobilePreview ? "min-h-[390px]" : previewDevice === "tablet" ? "min-h-[600px]" : "min-h-[680px]")
            : (previewDevice === "smallMobile" ? "min-h-[338px]" : forcedMobilePreview ? "min-h-[360px]" : previewDevice === "tablet" ? "min-h-[520px]" : "min-h-[580px]");
    const configuredHeroHeightClass = previewDevice ? previewHeroHeightClass : liveHeroHeightClass;
    const heroHeightClass = activeHeroImage
        ? configuredHeroHeightClass
        : (previewDevice
            ? (forcedMobilePreview ? "min-h-[210px]" : "min-h-[260px]")
            : "min-h-[210px] sm:min-h-[260px]");
    const heroFrameClass = previewDevice
        ? (forcedMobilePreview ? "rounded-[1.25rem] shadow-xl shadow-slate-300/50" : "rounded-[2rem] shadow-2xl shadow-slate-300/60")
        : "rounded-[1.25rem] shadow-xl shadow-slate-300/50 sm:rounded-[2rem] sm:shadow-2xl sm:shadow-slate-300/60";
    const heroContentClass = previewDevice
        ? (forcedMobilePreview ? "justify-end p-4" : previewDevice === "tablet" ? "justify-between p-8" : "justify-between p-12")
        : "justify-end p-4 max-[360px]:p-3.5 sm:justify-between sm:p-8 lg:p-12";
    const heroActionsClass = previewDevice
        ? (forcedMobilePreview ? "flex flex-col items-stretch gap-2.5" : "flex flex-row flex-wrap items-center gap-3")
        : "flex max-w-3xl flex-col items-stretch gap-2.5 min-[480px]:flex-row min-[480px]:flex-wrap min-[480px]:items-center sm:gap-3";
    const heroClass = `relative isolate overflow-hidden ${activeHeroImage ? "text-white" : "border border-slate-200 bg-slate-50 text-slate-950"} ${heroFrameClass} ${heroHeightClass}`;
    const heroTitleClass = previewDevice
        ? `max-w-4xl font-black leading-[1.02] tracking-tight text-white drop-shadow-sm ${forcedMobilePreview ? "text-[1.85rem] max-[360px]:text-[1.65rem]" : previewDevice === "tablet" ? "text-5xl" : "text-7xl"}`
        : "max-w-4xl text-[1.85rem] font-black leading-[1.02] tracking-tight text-white drop-shadow-sm max-[360px]:text-[1.65rem] sm:text-5xl sm:leading-[0.98] md:text-6xl lg:text-7xl";

    useEffect(() => {
        if (!hasMultipleHeroSlides || heroPaused) return undefined;

        const timer = window.setInterval(() => {
            setActiveHeroIndex((prev) => (prev + 1) % heroSlides.length);
        }, 5000);

        return () => window.clearInterval(timer);
    }, [hasMultipleHeroSlides, heroPaused, heroSlides.length]);

    return (
        <div className="min-w-0 overflow-x-hidden bg-white" style={getReferenceThemeStyle(theme)}>
            <div className={`${containerClass} py-3.5 sm:py-8`}>
                {hero.hidden ? (
                    <h1 className="sr-only">{shopName || activeHeroSlide.title || hero.title || "Online store"}</h1>
                ) : (
                <EditorSelectionFrame editor={editor} id="hero" label="Hero Banner" locked>
                    <section
                        className={heroClass}
                        onMouseEnter={() => setHeroPaused(true)}
                        onMouseLeave={() => setHeroPaused(false)}
                        onFocus={() => setHeroPaused(true)}
                        onBlur={() => setHeroPaused(false)}
                        style={{ backgroundColor: activeHeroImage ? "var(--sf-hero-background)" : "#f8fafc" }}
                    >
                        {activeHeroImage ? (
                            <picture>
                                {activeMobileHeroImage && (
                                    <source
                                        media="(max-width: 640px)"
                                        srcSet={mobileHeroSrcSet}
                                        sizes="calc(100vw - 24px)"
                                    />
                                )}
                                <img
                                    src={optimizeCloudinaryImage(forcedMobilePreview ? activeMobileHeroImage : activeHeroImage, { width: forcedMobilePreview ? 760 : 1600, crop: "fill" })}
                                    srcSet={forcedMobilePreview ? mobileHeroSrcSet : desktopHeroSrcSet}
                                    sizes={forcedMobilePreview ? "760px" : "(max-width: 1536px) calc(100vw - 24px), 1472px"}
                                    alt={activeHeroSlide.title || hero.title || "Store banner"}
                                    width="1920"
                                    height="720"
                                    loading="eager"
                                    fetchPriority="high"
                                    decoding="async"
                                    className={`absolute inset-0 h-full w-full object-cover ${previewDevice ? "" : "[object-position:var(--hero-mobile-position)] md:[object-position:var(--hero-desktop-position)]"}`}
                                    style={previewDevice
                                        ? { objectPosition: forcedMobilePreview ? heroMobilePosition : heroDesktopPosition }
                                        : { "--hero-mobile-position": heroMobilePosition, "--hero-desktop-position": heroDesktopPosition }}
                                />
                            </picture>
                        ) : (
                            <div className="absolute inset-0 bg-slate-50" />
                        )}
                        {hasMultipleHeroSlides && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setActiveHeroIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
                                    className="absolute left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white shadow-lg backdrop-blur transition hover:bg-white/25 md:flex"
                                    aria-label="Previous banner slide"
                                >
                                    <ChevronLeft size={19} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveHeroIndex((prev) => (prev + 1) % heroSlides.length)}
                                    className="absolute right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white shadow-lg backdrop-blur transition hover:bg-white/25 md:flex"
                                    aria-label="Next banner slide"
                                >
                                    <ChevronRight size={19} />
                                </button>
                            </>
                        )}
                        <div className={`relative z-10 flex ${heroHeightClass} ${heroContentClass} flex-col`}>
                            <div className={`max-w-4xl ${previewDevice ? (forcedMobilePreview ? "pb-1" : "pt-4") : "pb-1 sm:pb-0 sm:pt-4 lg:pt-6"}`}>
                                {activeHeroSlide.badgeText && (
                                    <p className="inline-flex max-w-full rounded-full border border-teal-200/25 bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-teal-100 shadow-lg shadow-teal-950/20 backdrop-blur sm:px-3 sm:py-1.5 sm:text-xs sm:tracking-[0.22em]">
                                        {activeHeroSlide.badgeText}
                                    </p>
                                )}
                                <h1
                                    className={`${heroTitleClass} mt-3 sm:mt-5 ${activeHeroImage ? "" : "!text-slate-950 !drop-shadow-none"}`}
                                    style={{ color: activeHeroImage ? "var(--sf-hero-title)" : "#0f172a" }}
                                >
                                    {activeHeroSlide.title || hero.title || shopName || "Online store"}
                                </h1>
                                {heroOfferText && (
                                    <p className="mt-2.5 inline-flex w-fit rounded-2xl border border-white/15 bg-slate-950/45 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-teal-100 shadow-xl backdrop-blur sm:mt-5 sm:px-4 sm:py-3 sm:text-base">
                                        {heroOfferText}
                                    </p>
                                )}
                                {(activeHeroSlide.subtitle || hero.subtitle) && (
                                    <p className="mt-2.5 line-clamp-2 max-w-2xl text-sm font-semibold leading-5 sm:mt-5 sm:line-clamp-none sm:text-base sm:leading-7 md:text-lg" style={{ color: activeHeroImage ? "var(--sf-hero-subtitle)" : "#475569" }}>
                                        {activeHeroSlide.subtitle || hero.subtitle}
                                    </p>
                                )}
                            </div>
                            <div className={previewDevice ? (forcedMobilePreview ? "mt-4 space-y-3" : "mt-8 space-y-4") : "mt-4 space-y-3 sm:mt-8 sm:space-y-4"}>
                                <div className={heroActionsClass}>
                                    {activeHeroSlide.primaryCtaText && activeHeroSlide.primaryCtaLink && (
                                    <LinkSlot LinkComponent={LinkComponent} href={activeHeroSlide.primaryCtaLink} prefetch={false} className="inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 text-sm font-black shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 sm:min-h-12 sm:px-6 sm:py-3" style={{ backgroundColor: activeHeroImage ? "var(--sf-hero-primary-button-bg)" : "var(--sf-primary-button-bg)", color: activeHeroImage ? "var(--sf-hero-primary-button-text)" : "var(--sf-primary-button-text)" }}>
                                        {activeHeroSlide.primaryCtaText || "Shop Now"}
                                        <ChevronRight size={16} className="ml-1" />
                                    </LinkSlot>
                                    )}
                                    {activeHeroSlide.secondaryCtaText && (
                                        <LinkSlot LinkComponent={LinkComponent} href={activeHeroSlide.secondaryCtaLink || "#products"} prefetch={false} className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 px-4 py-2.5 text-sm font-black shadow-lg shadow-slate-950/10 backdrop-blur transition hover:-translate-y-0.5 sm:min-h-12 sm:px-6 sm:py-3" style={{ backgroundColor: "var(--sf-hero-secondary-button-bg)", color: "var(--sf-hero-secondary-button-text)" }}>
                                            {activeHeroSlide.secondaryCtaText}
                                            <ChevronRight size={16} className="ml-1" />
                                        </LinkSlot>
                                    )}
                                </div>
                                {hasMultipleHeroSlides && (
                                    <div className="flex gap-2 min-[380px]:justify-start">
                                        {heroSlides.map((slide, index) => (
                                            <button
                                                key={slide.id || index}
                                                type="button"
                                                onClick={() => setActiveHeroIndex(index)}
                                                className={`h-2 rounded-full transition ${index === activeHeroIndex % heroSlides.length ? "w-9 bg-white" : "w-2.5 bg-white/45 hover:bg-white/70"}`}
                                                aria-label={`Show banner slide ${index + 1}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </EditorSelectionFrame>
                )}

                {enabledSections.map((section, index) => (
                    <HomepageSection
                        key={section.id || section._id || `${section.type}-${index}`}
                        section={section}
                        sectionIndex={index}
                        categories={categories}
                        sectionProducts={sectionProducts}
                        sectionReviews={sectionReviews}
                        catalogProducts={catalogProducts}
                        storewideDiscount={storewideDiscount}
                        productCard={productCard}
                        sectionColors={sectionColors}
                        layout={layout}
                        onProductAdd={onProductAdd}
                        onProductBuyNow={onProductBuyNow}
                        onWishlistToggle={onWishlistToggle}
                        isProductWishlisted={isProductWishlisted}
                        LinkComponent={LinkComponent}
                        previewDevice={previewDevice}
                        editor={editor}
                    />
                ))}
            </div>

            <StorefrontAllProducts
                allProducts={allProducts}
                catalogProducts={catalogProducts}
                catalogSearch={catalogSearch}
                categories={categories}
                filters={filters}
                forcedMobilePreview={forcedMobilePreview}
                forcedNarrowPreview={forcedNarrowPreview}
                layout={layout}
                loading={loading}
                mobileFiltersOpen={mobileFiltersOpen}
                onCatalogSearchChange={onCatalogSearchChange}
                onCategoryChange={onCategoryChange}
                onClearFilters={onClearFilters}
                onFilterClose={onFilterClose}
                onFilterOpen={onFilterOpen}
                onMaxPriceChange={onMaxPriceChange}
                onMinPriceChange={onMinPriceChange}
                onPageChange={onPageChange}
                onPriceApply={onPriceApply}
                onProductAdd={onProductAdd}
                onProductBuyNow={onProductBuyNow}
                onWishlistToggle={onWishlistToggle}
                isProductWishlisted={isProductWishlisted}
                onRatingChange={onRatingChange}
                onSortChange={onSortChange}
                pagination={pagination}
                previewDevice={previewDevice}
                priceInput={priceInput}
                productCard={productCard}
                storewideDiscount={storewideDiscount}
                editor={editor}
                LinkComponent={LinkComponent}
                theme={theme}
            />
        </div>
    );
}
