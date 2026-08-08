/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
    EditorSelectionFrame,
    getHeroSlides,
    getResponsiveImageSrcSet,
    headingStyle,
    isPreviewMobile,
    LinkSlot,
    normalizeHeroSlide,
    optimizeCloudinaryImage,
    resolveHeroOverlayOpacity,
} from "./referenceCore";

const HeroMedia = ({ model, cover = true, eager = true, className = "" }) => {
    const {
        activeHeroImage,
        activeHeroSlide,
        activeMobileHeroImage,
        desktopHeroSrcSet,
        forcedMobilePreview,
        heroDesktopPosition,
        heroMobilePosition,
        mobileHeroSrcSet,
        previewDevice,
    } = model;

    if (!activeHeroImage) return <div className={`bg-slate-100 ${className}`} aria-hidden="true" />;

    return (
        <picture className={className}>
            {activeMobileHeroImage && (
                <source media="(max-width: 640px)" srcSet={mobileHeroSrcSet} sizes="calc(100vw - 24px)" />
            )}
            <img
                src={optimizeCloudinaryImage(forcedMobilePreview ? activeMobileHeroImage : activeHeroImage, { width: forcedMobilePreview ? 760 : 1600, crop: cover ? "fill" : "fit" })}
                srcSet={forcedMobilePreview ? mobileHeroSrcSet : desktopHeroSrcSet}
                sizes={forcedMobilePreview ? "760px" : "(max-width: 1536px) calc(100vw - 24px), 1472px"}
                alt={activeHeroSlide.title || "Store banner"}
                width="1920"
                height="900"
                loading={eager ? "eager" : "lazy"}
                fetchPriority={eager ? "high" : undefined}
                decoding="async"
                onError={(event) => { event.currentTarget.style.visibility = "hidden"; }}
                className={`${cover ? "h-full w-full object-cover" : "h-full w-full object-contain"} ${previewDevice ? "" : "[object-position:var(--hero-mobile-position)] md:[object-position:var(--hero-desktop-position)]"} ${className}`}
                style={previewDevice
                    ? { objectPosition: forcedMobilePreview ? heroMobilePosition : heroDesktopPosition }
                    : { "--hero-mobile-position": heroMobilePosition, "--hero-desktop-position": heroDesktopPosition }}
            />
        </picture>
    );
};

const HeroButtons = ({ model, LinkComponent, onDark = false, align = "start" }) => {
    const { activeHeroSlide } = model;
    if (!activeHeroSlide.primaryCtaText && !activeHeroSlide.secondaryCtaText) return null;
    const responsiveLayout = model.forcedMobilePreview
        ? ""
        : `min-[480px]:flex-row min-[480px]:flex-wrap ${align === "center" ? "min-[480px]:justify-center" : ""}`;

    return (
        <div className={`flex flex-col gap-2.5 ${responsiveLayout}`}>
            {activeHeroSlide.primaryCtaText && activeHeroSlide.primaryCtaLink && (
                <LinkSlot
                    LinkComponent={LinkComponent}
                    href={activeHeroSlide.primaryCtaLink}
                    prefetch={false}
                    className="inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-sm font-black shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:min-h-12 sm:px-6 sm:py-3"
                    style={{ backgroundColor: onDark ? "var(--sf-hero-primary-button-bg)" : "var(--sf-primary-button-bg)", color: onDark ? "var(--sf-hero-primary-button-text)" : "var(--sf-primary-button-text)" }}
                >
                    {activeHeroSlide.primaryCtaText}<ChevronRight size={16} className="ml-1" />
                </LinkSlot>
            )}
            {activeHeroSlide.secondaryCtaText && (
                <LinkSlot
                    LinkComponent={LinkComponent}
                    href={activeHeroSlide.secondaryCtaLink || "#products"}
                    prefetch={false}
                    className={`inline-flex min-h-11 items-center justify-center rounded-full border px-5 py-2.5 text-sm font-black shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:min-h-12 sm:px-6 sm:py-3 ${onDark ? "border-white/45 backdrop-blur" : "border-slate-300 bg-white"}`}
                    style={{ backgroundColor: onDark ? "var(--sf-hero-secondary-button-bg)" : undefined, color: onDark ? "var(--sf-hero-secondary-button-text)" : "var(--sf-foreground)" }}
                >
                    {activeHeroSlide.secondaryCtaText}<ChevronRight size={16} className="ml-1" />
                </LinkSlot>
            )}
        </div>
    );
};

const HeroCopy = ({ model, align = "left", onDark = false, compact = false }) => {
    const { activeHeroSlide, hero, heroOfferText, shopName } = model;
    const centered = align === "center";
    const forcedTabletPreview = model.previewDevice === "tablet";
    const headingSize = model.forcedMobilePreview
        ? (compact ? "text-3xl" : "text-[1.9rem]")
        : forcedTabletPreview
            ? (compact ? "text-5xl" : "text-6xl")
        : (compact ? "text-3xl sm:text-5xl" : "text-[1.9rem] sm:text-5xl md:text-6xl lg:text-7xl");
    const subtitleSize = model.forcedMobilePreview
        ? "text-sm leading-6"
        : forcedTabletPreview
            ? "text-lg leading-7"
        : "text-sm leading-6 sm:text-base sm:leading-7 md:text-lg";
    return (
        <div className={`${centered ? "mx-auto text-center" : ""} min-w-0 max-w-4xl`}>
            {activeHeroSlide.badgeText && (
                <p className={`inline-flex max-w-full rounded-full border px-3.5 py-2 text-[10px] font-black uppercase shadow-sm ${onDark ? "border-white/45 bg-slate-950/55 text-white backdrop-blur" : "border-slate-200 bg-white text-[var(--sf-accent)]"}`}>
                    {activeHeroSlide.badgeText}
                </p>
            )}
            <h1
                className={`${headingSize} ${activeHeroSlide.badgeText ? "mt-4" : ""} max-w-full break-words font-black leading-[1.02] tracking-tight`}
                style={{
                    ...headingStyle,
                    color: onDark ? "var(--sf-hero-title)" : "var(--sf-foreground)",
                    textShadow: onDark ? "0 2px 20px rgba(2, 6, 23, 0.35)" : undefined,
                }}
            >
                {activeHeroSlide.title || hero.title || shopName || "Online store"}
            </h1>
            {heroOfferText && (
                <p className={`mt-4 inline-flex w-fit rounded-full px-3 py-2 text-[11px] font-black uppercase ${onDark ? "border border-white/30 bg-slate-950/55 text-white backdrop-blur" : "bg-[var(--sf-accent-bg)] text-[var(--sf-accent)]"}`}>
                    {heroOfferText}
                </p>
            )}
            {(activeHeroSlide.subtitle || hero.subtitle) && (
                <p
                    className={`${centered ? "mx-auto" : ""} mt-4 max-w-2xl ${subtitleSize} font-semibold`}
                    style={{
                        color: onDark ? "var(--sf-hero-subtitle)" : "#475569",
                        textShadow: onDark ? "0 1px 14px rgba(2, 6, 23, 0.4)" : undefined,
                    }}
                >
                    {activeHeroSlide.subtitle || hero.subtitle}
                </p>
            )}
        </div>
    );
};

const HeroDots = ({ model, onSelect, align = "start", onDark = false }) => {
    if (!model.hasMultipleHeroSlides) return null;
    return (
        <div className={`flex gap-2 ${align === "center" ? "justify-center" : ""}`} aria-label="Banner slides">
            {model.heroSlides.map((slide, index) => (
                <button
                    key={slide.id || index}
                    type="button"
                    onClick={() => onSelect(index)}
                    className={`h-2 rounded-full transition ${index === model.activeHeroIndex % model.heroSlides.length ? `w-9 ${onDark ? "bg-white" : "bg-[var(--sf-accent)]"}` : `w-2.5 ${onDark ? "bg-white/45 hover:bg-white/70" : "bg-slate-300 hover:bg-slate-400"}`}`}
                    aria-label={`Show banner slide ${index + 1}`}
                />
            ))}
        </div>
    );
};

const HeroArrows = ({ model, onPrevious, onNext, onDark = false }) => {
    if (!model.hasMultipleHeroSlides) return null;
    const buttonClass = `absolute top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border shadow-lg transition md:flex ${onDark ? "border-white/20 bg-white/15 text-white backdrop-blur hover:bg-white/25" : "border-slate-200 bg-white/95 text-slate-800 hover:bg-white"}`;
    return (
        <>
            <button type="button" onClick={onPrevious} className={`${buttonClass} left-3`} aria-label="Previous banner slide"><ChevronLeft size={19} /></button>
            <button type="button" onClick={onNext} className={`${buttonClass} right-3`} aria-label="Next banner slide"><ChevronRight size={19} /></button>
        </>
    );
};

const FullBleedHero = ({ model, LinkComponent, centered = false }) => {
    const { activeHeroImage, forcedMobilePreview, heroHeightClass, heroOverlayOpacity, previewDevice } = model;
    const forcedTabletPreview = previewDevice === "tablet";
    const contentPadding = forcedMobilePreview ? "p-4" : forcedTabletPreview ? "p-8" : "p-4 sm:p-8 lg:p-12";
    const frameClass = previewDevice
        ? (forcedMobilePreview ? "rounded-[1.25rem] shadow-xl shadow-slate-300/50" : "rounded-[2rem] shadow-2xl shadow-slate-300/60")
        : "rounded-[1.25rem] shadow-xl shadow-slate-300/50 sm:rounded-[2rem] sm:shadow-2xl sm:shadow-slate-300/60";
    const scrimStrength = Math.min(Math.max(Number(heroOverlayOpacity) || 0, 0.24), 0.78);
    const scrimMidpoint = Math.max(scrimStrength * 0.58, 0.16);
    const centeredScrim = `radial-gradient(ellipse at center, rgba(2, 6, 23, ${scrimStrength}) 0%, rgba(2, 6, 23, ${scrimMidpoint}) 46%, rgba(2, 6, 23, 0.06) 82%)`;
    const mobileScrim = `linear-gradient(to top, rgba(2, 6, 23, ${scrimStrength}) 0%, rgba(2, 6, 23, ${scrimMidpoint}) 58%, rgba(2, 6, 23, 0.04) 100%)`;
    const desktopScrim = `linear-gradient(90deg, rgba(2, 6, 23, ${scrimStrength}) 0%, rgba(2, 6, 23, ${scrimMidpoint}) 48%, rgba(2, 6, 23, 0.04) 84%)`;
    return (
        <section data-hero-composition={centered ? "centered" : "fullBleed"} className={`relative isolate overflow-hidden ${frameClass} ${heroHeightClass} ${activeHeroImage ? "text-white" : "border border-slate-200 bg-slate-50"}`} style={{ backgroundColor: activeHeroImage ? "var(--sf-hero-background)" : "#f8fafc" }}>
            <HeroMedia model={model} className="absolute inset-0 h-full w-full" />
            {activeHeroImage && (
                <>
                    <div className="pointer-events-none absolute inset-0" style={{ backgroundColor: "var(--sf-hero-overlay)", opacity: heroOverlayOpacity * 0.12 }} aria-hidden="true" />
                    {centered ? (
                        <div className="pointer-events-none absolute inset-0" style={{ background: centeredScrim }} aria-hidden="true" />
                    ) : forcedMobilePreview ? (
                        <div className="pointer-events-none absolute inset-0" style={{ background: mobileScrim }} aria-hidden="true" />
                    ) : previewDevice ? (
                        <div className="pointer-events-none absolute inset-0" style={{ background: desktopScrim }} aria-hidden="true" />
                    ) : (
                        <>
                            <div className="pointer-events-none absolute inset-0 sm:hidden" style={{ background: mobileScrim }} aria-hidden="true" />
                            <div className="pointer-events-none absolute inset-0 hidden sm:block" style={{ background: desktopScrim }} aria-hidden="true" />
                        </>
                    )}
                </>
            )}
            <HeroArrows model={model} onPrevious={model.onPrevious} onNext={model.onNext} onDark={activeHeroImage} />
            <div className={`relative z-10 flex ${heroHeightClass} min-w-0 flex-col ${contentPadding} ${centered ? "items-center justify-center text-center" : forcedMobilePreview ? "justify-end" : "justify-end sm:justify-between"}`}>
                <HeroCopy model={model} align={centered ? "center" : "left"} onDark={Boolean(activeHeroImage)} />
                <div className={`${centered ? "items-center" : ""} mt-6 flex flex-col gap-4 sm:mt-8`}>
                    <HeroButtons model={model} LinkComponent={LinkComponent} onDark={Boolean(activeHeroImage)} align={centered ? "center" : "start"} />
                    <HeroDots model={model} onSelect={model.onSelect} align={centered ? "center" : "start"} onDark={Boolean(activeHeroImage)} />
                </div>
            </div>
        </section>
    );
};

const PanelHero = ({ model, LinkComponent, variant }) => {
    const { activeHeroImage, forcedMobilePreview, previewDevice } = model;
    const forcedTabletPreview = previewDevice === "tablet";
    const forcedNarrowPreview = forcedMobilePreview || forcedTabletPreview;
    const isEditorial = variant === "editorial";
    const isMinimal = variant === "minimal";
    const desktopGrid = isEditorial ? "grid-cols-[1.25fr_0.75fr]" : isMinimal ? "grid-cols-[0.9fr_1.1fr]" : "grid-cols-2";
    const liveGrid = isEditorial ? "grid-cols-1 lg:grid-cols-[1.25fr_0.75fr]" : isMinimal ? "grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]" : "grid-cols-1 lg:grid-cols-2";
    const gridClass = previewDevice
        ? (forcedNarrowPreview ? "grid-cols-1" : desktopGrid)
        : liveGrid;
    const mediaOrder = isEditorial ? "order-1" : "order-2";
    const contentOrder = isEditorial ? "order-2" : "order-1";
    const editorialDesktopFrame = isEditorial && !forcedNarrowPreview
        ? "lg:-ml-8 lg:my-12 lg:relative lg:z-10 lg:rounded-l-[2rem] lg:bg-white lg:shadow-xl"
        : "";
    const contentPadding = forcedMobilePreview ? "p-5" : forcedTabletPreview ? "p-8" : "p-5 sm:p-8 lg:p-12";
    const emptyMediaVisibility = !activeHeroImage
        ? (forcedMobilePreview ? "hidden" : "hidden sm:block")
        : "";
    return (
        <section data-hero-composition={variant} className={`grid overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60 sm:rounded-[2rem] ${gridClass}`}>
            <div className={`${contentOrder} ${contentPadding} ${editorialDesktopFrame} min-w-0 flex min-h-[260px] flex-col justify-center`}>
                <HeroCopy model={model} compact={isMinimal || isEditorial} />
                <div className="mt-6 flex flex-col gap-4">
                    <HeroButtons model={model} LinkComponent={LinkComponent} />
                    <HeroDots model={model} onSelect={model.onSelect} />
                </div>
            </div>
            <div className={`${mediaOrder} relative min-h-[280px] overflow-hidden bg-slate-100 ${emptyMediaVisibility} ${isMinimal ? (forcedMobilePreview ? "m-4 rounded-2xl" : forcedTabletPreview ? "m-6 rounded-2xl" : "m-4 rounded-2xl sm:m-6") : ""} ${previewDevice && forcedNarrowPreview ? "order-2" : ""}`}>
                <HeroMedia model={model} eager className="absolute inset-0 h-full w-full" />
                <HeroArrows model={model} onPrevious={model.onPrevious} onNext={model.onNext} />
            </div>
        </section>
    );
};

export function StorefrontHero({ theme, shopName, storewideDiscount = 0, LinkComponent, previewDevice, editor }) {
    const hero = theme.hero || {};
    const heroSlides = getHeroSlides(hero);
    const [activeHeroIndex, setActiveHeroIndex] = useState(0);
    const [heroPaused, setHeroPaused] = useState(false);
    const activeHeroSlide = heroSlides[activeHeroIndex % heroSlides.length] || normalizeHeroSlide({}, 0, hero);
    const activeHeroImage = activeHeroSlide.desktopImage || activeHeroSlide.mobileImage;
    const activeMobileHeroImage = activeHeroSlide.mobileImage || activeHeroImage;
    const hasMultipleHeroSlides = heroSlides.length > 1;
    const forcedMobilePreview = isPreviewMobile(previewDevice);
    void storewideDiscount;
    const heroOfferText = activeHeroSlide.discountText || "";
    const heroDesktopPosition = `${activeHeroSlide.desktopFocalPoint?.x ?? 50}% ${activeHeroSlide.desktopFocalPoint?.y ?? 50}%`;
    const heroMobilePosition = `${activeHeroSlide.mobileFocalPoint?.x ?? 50}% ${activeHeroSlide.mobileFocalPoint?.y ?? 50}%`;
    const liveHeight = hero.height === "Compact" ? "min-h-[318px] sm:min-h-[460px] lg:min-h-[500px]" : hero.height === "Tall" ? "min-h-[370px] sm:min-h-[600px] lg:min-h-[680px]" : "min-h-[338px] sm:min-h-[520px] lg:min-h-[580px]";
    const previewHeight = hero.height === "Compact" ? (forcedMobilePreview ? "min-h-[318px]" : "min-h-[500px]") : hero.height === "Tall" ? (forcedMobilePreview ? "min-h-[370px]" : "min-h-[680px]") : (forcedMobilePreview ? "min-h-[338px]" : "min-h-[580px]");
    const heroHeightClass = activeHeroImage ? (previewDevice ? previewHeight : liveHeight) : "min-h-[210px] sm:min-h-[260px]";
    const previous = () => setActiveHeroIndex((current) => (current - 1 + heroSlides.length) % heroSlides.length);
    const next = () => setActiveHeroIndex((current) => (current + 1) % heroSlides.length);

    useEffect(() => {
        if (activeHeroIndex < heroSlides.length) return;
        setActiveHeroIndex(0);
    }, [activeHeroIndex, heroSlides.length]);

    useEffect(() => {
        if (!hasMultipleHeroSlides || heroPaused) return undefined;
        const timer = window.setInterval(() => setActiveHeroIndex((current) => (current + 1) % heroSlides.length), 5000);
        return () => window.clearInterval(timer);
    }, [hasMultipleHeroSlides, heroPaused, heroSlides.length]);

    const model = {
        activeHeroImage,
        activeHeroIndex,
        activeHeroSlide,
        activeMobileHeroImage,
        desktopHeroSrcSet: getResponsiveImageSrcSet(activeHeroImage, [960, 1280, 1600, 1920], { crop: "fill" }),
        forcedMobilePreview,
        hasMultipleHeroSlides,
        hero,
        heroDesktopPosition,
        heroHeightClass,
        heroMobilePosition,
        heroOfferText,
        heroOverlayOpacity: resolveHeroOverlayOpacity(hero.overlayOpacity) / 100,
        heroSlides,
        mobileHeroSrcSet: getResponsiveImageSrcSet(activeMobileHeroImage, [420, 640, 760], { crop: "fill" }),
        onNext: next,
        onPrevious: previous,
        onSelect: setActiveHeroIndex,
        previewDevice,
        shopName,
    };
    const variant = hero.variant || "fullBleed";

    if (hero.hidden) return <h1 className="sr-only">{shopName || activeHeroSlide.title || hero.title || "Online store"}</h1>;

    return (
        <EditorSelectionFrame editor={editor} id="hero" label="Hero Banner" locked>
            <div
                data-structural-variant={variant}
                onMouseEnter={() => setHeroPaused(true)}
                onMouseLeave={() => setHeroPaused(false)}
                onFocusCapture={() => setHeroPaused(true)}
                onBlurCapture={() => setHeroPaused(false)}
            >
                {variant === "centered" ? <FullBleedHero model={model} LinkComponent={LinkComponent} centered />
                    : variant === "fullBleed" ? <FullBleedHero model={model} LinkComponent={LinkComponent} />
                        : <PanelHero model={model} LinkComponent={LinkComponent} variant={variant} />}
            </div>
        </EditorSelectionFrame>
    );
}

export default StorefrontHero;
