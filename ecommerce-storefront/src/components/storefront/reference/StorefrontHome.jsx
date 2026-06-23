"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { getEnabledHomepageSections, normalizeTheme } from "../../../lib/theme";
import {
    containerClass,
    DefaultLink,
    EditorSelectionFrame,
    getHeroSlides,
    getReferenceThemeStyle,
    isPreviewMobile,
    isPreviewNarrow,
    LinkSlot,
    noop,
    normalizeHeroSlide,
    optimizeCloudinaryImage,
    serviceCards,
} from "./referenceCore";
import { StorefrontAllProducts } from "./StorefrontAllProducts";
import { HomepageSection } from "./StorefrontSectionRenderer";

export function ReferenceStorefrontHome({
    theme: themeCandidate,
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
    LinkComponent = DefaultLink,
    previewDevice,
    editor,
}) {
    const theme = normalizeTheme(themeCandidate);
    const hero = theme.hero || {};
    const heroSlides = getHeroSlides(hero);
    const [activeHeroIndex, setActiveHeroIndex] = useState(0);
    const activeHeroSlide = heroSlides[activeHeroIndex % heroSlides.length] || normalizeHeroSlide({}, 0, hero);
    const activeHeroImage = activeHeroSlide.desktopImage || activeHeroSlide.mobileImage;
    const activeMobileHeroImage = activeHeroSlide.mobileImage || activeHeroImage;
    const hasMultipleHeroSlides = heroSlides.length > 1;
    const heroOfferText = activeHeroSlide.discountText || (storewideDiscount > 0 ? `${storewideDiscount}% OFF SITEWIDE` : "");
    const layout = theme.layout || {};
    const productCard = theme.productCard || {};
    const allProducts = theme.allProducts || {};
    const enabledSections = getEnabledHomepageSections(theme);
    const catalogProducts = products || [];
    const forcedMobilePreview = isPreviewMobile(previewDevice);
    const forcedNarrowPreview = isPreviewNarrow(previewDevice);
    const heroHeightClass = hero.height === "Compact"
        ? "min-h-[350px] sm:min-h-[460px] lg:min-h-[500px]"
        : hero.height === "Tall"
            ? "min-h-[430px] sm:min-h-[600px] lg:min-h-[680px]"
            : "min-h-[390px] sm:min-h-[520px] lg:min-h-[580px]";
    const heroClass = `relative isolate overflow-hidden rounded-[1.25rem] bg-slate-950 text-white shadow-xl shadow-slate-300/50 sm:rounded-[2rem] sm:shadow-2xl sm:shadow-slate-300/60 ${heroHeightClass}`;
    const heroTitleClass = previewDevice
        ? `max-w-4xl font-black leading-[0.95] tracking-tight text-white drop-shadow-sm ${forcedMobilePreview ? "text-[2rem] max-[360px]:text-[1.75rem]" : previewDevice === "tablet" ? "text-5xl" : "text-7xl"}`
        : "max-w-4xl text-[2rem] font-black leading-[0.95] tracking-tight text-white drop-shadow-sm max-[360px]:text-[1.75rem] sm:text-5xl md:text-6xl lg:text-7xl";
    const heroBenefitsClass = previewDevice
        ? (forcedMobilePreview
            ? "flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "grid grid-cols-3 gap-3")
        : "flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:snap-none sm:grid-cols-3 sm:gap-3 lg:max-w-5xl";
    const heroBenefitCardClass = forcedMobilePreview
        ? "min-w-[132px]"
        : "min-w-[132px] sm:min-w-0";

    return (
        <div className="min-w-0 overflow-x-hidden bg-white" style={getReferenceThemeStyle(theme)}>
            <div className={`${containerClass} py-3.5 sm:py-8`}>
                <EditorSelectionFrame editor={editor} id="hero" label="Hero Banner" locked>
                    <section className={heroClass}>
                        {activeHeroImage ? (
                            <picture>
                                {activeMobileHeroImage && activeMobileHeroImage !== activeHeroImage && (
                                    <source media="(max-width: 640px)" srcSet={optimizeCloudinaryImage(activeMobileHeroImage, { width: 760, crop: "fill" })} />
                                )}
                                <img
                                    src={optimizeCloudinaryImage(activeHeroImage, { width: 1920, crop: "fill" })}
                                    alt={activeHeroSlide.title || hero.title || "Store banner"}
                                    width="1920"
                                    height="720"
                                    loading="eager"
                                    fetchPriority="high"
                                    decoding="async"
                                    className="absolute inset-0 h-full w-full object-cover"
                                />
                            </picture>
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900" />
                        )}
                        <div className="absolute inset-0 hidden bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-slate-950/20 sm:block" />
                        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/92 via-slate-950/76 to-slate-950/54 sm:hidden" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(20,184,166,.26),transparent_34%)]" />
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/82 via-slate-950/38 to-transparent" />
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
                        <div className={`relative z-10 flex ${heroHeightClass} flex-col justify-between p-4 max-[360px]:p-3.5 sm:p-8 lg:p-12`}>
                            <div className="max-w-4xl sm:pt-4 lg:pt-6">
                                {(activeHeroSlide.badgeText || "Limited time offer") && (
                                    <p className="inline-flex rounded-full border border-teal-200/25 bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-teal-100 shadow-lg shadow-teal-950/20 backdrop-blur sm:px-3 sm:py-1.5 sm:text-xs sm:tracking-[0.22em]">
                                        {activeHeroSlide.badgeText || "Limited time offer"}
                                    </p>
                                )}
                                <h1 className={`${heroTitleClass} mt-3.5 sm:mt-5`}>
                                    {activeHeroSlide.title || hero.title || "Discover Your Favorite Products"}
                                </h1>
                                {heroOfferText && (
                                    <p className="mt-3 inline-flex w-fit rounded-2xl border border-white/15 bg-slate-950/45 px-3 py-2 text-xs font-black uppercase tracking-wide text-teal-100 shadow-xl backdrop-blur sm:mt-5 sm:px-4 sm:py-3 sm:text-base">
                                        {heroOfferText}
                                    </p>
                                )}
                                {(activeHeroSlide.subtitle || hero.subtitle) && (
                                    <p className="mt-3 line-clamp-2 max-w-2xl text-sm font-semibold leading-6 text-white/78 sm:mt-5 sm:line-clamp-none sm:text-base sm:leading-7 md:text-lg">
                                        {activeHeroSlide.subtitle || hero.subtitle}
                                    </p>
                                )}
                                <div className="mt-5 flex flex-col gap-2.5 min-[380px]:flex-row min-[380px]:flex-wrap sm:mt-7 sm:gap-3">
                                    <LinkSlot LinkComponent={LinkComponent} href={activeHeroSlide.primaryCtaLink || "#products"} className="inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-teal-50 sm:min-h-12 sm:px-6 sm:py-3">
                                        {activeHeroSlide.primaryCtaText || "Shop Now"}
                                        <ChevronRight size={16} className="ml-1" />
                                    </LinkSlot>
                                    {activeHeroSlide.secondaryCtaText && (
                                        <LinkSlot LinkComponent={LinkComponent} href={activeHeroSlide.secondaryCtaLink || "#products"} className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-slate-950/10 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15 sm:min-h-12 sm:px-6 sm:py-3">
                                            {activeHeroSlide.secondaryCtaText}
                                            <ChevronRight size={16} className="ml-1" />
                                        </LinkSlot>
                                    )}
                                </div>
                            </div>
                            <div className="mt-5 space-y-3 sm:mt-8 sm:space-y-5">
                                <div className={heroBenefitsClass}>
                                    {serviceCards.map(({ icon: Icon, title, text }) => (
                                        <div key={title} className={`${heroBenefitCardClass} snap-start rounded-2xl border border-white/12 bg-white/10 p-2.5 shadow-lg shadow-slate-950/10 backdrop-blur-md sm:p-4`}>
                                            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-300/16 text-teal-100 sm:h-10 sm:w-10 sm:rounded-2xl">
                                                    <Icon size={16} className="sm:h-[18px] sm:w-[18px]" />
                                                </span>
                                                <div className="min-w-0">
                                                    <h3 className="truncate text-xs font-black text-white sm:text-sm">{title}</h3>
                                                    <p className="mt-0.5 line-clamp-1 text-[10px] font-semibold leading-4 text-white/66 sm:line-clamp-2 sm:text-xs">{text}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {hasMultipleHeroSlides && (
                                    <div className="flex justify-center gap-2">
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
                        layout={layout}
                        onProductAdd={onProductAdd}
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
