"use client";

import { memo, useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";

import {
    desktopGridClasses,
    EditorSelectionFrame,
    getContentGapClass,
    getSectionDisplayLabel,
    getSectionLayout,
    headingStyle,
    isPreviewMobile,
    LinkSlot,
    plainGridClasses,
    productGridGapClasses,
    resolveFeaturedProductColumns,
    resolveGridSpacing,
    tabletGridClasses,
} from "./referenceCore";
import { ProductCard } from "./StorefrontProductCard";
import {
    BannerVariantSection,
    BrandStoryVariantSection,
    CategoryVariantSection,
    CollectionVariantSection,
    ReviewsVariantSection,
    TextualVariantSection,
} from "./StorefrontSectionVariants";

export const HomepageSection = memo(function HomepageSection({
    section,
    sectionIndex,
    categories,
    sectionProducts,
    sectionReviews,
    catalogProducts,
    storewideDiscount,
    productCard,
    sectionColors = {},
    layout,
    onProductAdd,
    onProductBuyNow,
    onWishlistToggle,
    isProductWishlisted,
    LinkComponent,
    previewDevice,
    editor,
}) {
    const mobileSettings = section.mobileSettings || {};
    const desktopSettings = section.desktopSettings || {};
    const [activeImage, setActiveImage] = useState(0);
    const mobileVisible = mobileSettings.isVisible !== false;
    const desktopVisible = desktopSettings.isVisible !== false;
    const responsiveVisibilityClass = previewDevice
        ? ((isPreviewMobile(previewDevice) ? mobileVisible : desktopVisible) ? "" : "hidden")
        : (!mobileVisible && !desktopVisible
            ? "hidden"
            : !mobileVisible
                ? "hidden md:block"
                : !desktopVisible
                    ? "block md:hidden"
                    : "");
    const stableSectionId = section.id || section._id;
    const editorId = stableSectionId ? `section:${stableSectionId}` : `section-${Number.isFinite(sectionIndex) ? sectionIndex : section.type}`;
    const editorLabel = getSectionDisplayLabel(section);
    const sectionLayout = getSectionLayout(layout);
    const contentGapClass = getContentGapClass(section.settings?.spacing, layout?.contentSpacing, layout?.productGap);
    const frame = (content) => <EditorSelectionFrame editor={editor} id={editorId} label={editorLabel}>{content}</EditorSelectionFrame>;

    if (section.type === "FeaturedProducts") {
        const columns = resolveFeaturedProductColumns(section, layout);
        const products = sectionProducts?.[stableSectionId] || catalogProducts.slice(0, Math.max(4, columns.desktop));
        const mobileGridClass = columns.mobile === 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2";
        const liveGridClass = `${mobileGridClass} ${tabletGridClasses[columns.tablet]} ${desktopGridClasses[columns.desktop]}`;
        const featuredGridClass = previewDevice
            ? (isPreviewMobile(previewDevice) ? plainGridClasses[columns.mobile] : previewDevice === "tablet" ? plainGridClasses[columns.tablet] : plainGridClasses[columns.desktop])
            : liveGridClass;
        const featuredSpacing = resolveGridSpacing(section.settings?.spacing, layout?.productGap, layout?.contentSpacing);
        if (!products.length) return null;
        return frame(
            <section className={`${responsiveVisibilityClass} ${sectionLayout.className}`} style={sectionLayout.style}>
                <div className="mb-4 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                        <h2 className="text-xl font-black tracking-tight sm:text-3xl" style={{ ...headingStyle, color: sectionColors.title || "var(--sf-section-title)" }}>{section.title || "Featured Products"}</h2>
                        <p className="mt-1 text-xs font-semibold sm:text-sm" style={{ color: sectionColors.subtitle || "var(--sf-section-subtitle)" }}>Handpicked products from this store</p>
                    </div>
                    <LinkSlot LinkComponent={LinkComponent} href="#products" className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:border-[var(--sf-accent-soft)] hover:text-[var(--sf-accent)] sm:inline-flex">View all</LinkSlot>
                </div>
                <div className={`grid ${featuredGridClass} ${productGridGapClasses[featuredSpacing]} ${products.length === 1 ? "mx-auto w-full max-w-[20rem] sm:mx-0 sm:max-w-none" : ""}`}>
                    {products.slice(0, Math.max(4, columns.desktop)).map((product, index) => (
                        <ProductCard key={product._id} product={product} index={index} storewideDiscount={storewideDiscount} productCard={productCard} onProductAdd={onProductAdd} onProductBuyNow={onProductBuyNow} onWishlistToggle={onWishlistToggle} isWishlisted={isProductWishlisted} LinkComponent={LinkComponent} previewDevice={previewDevice} />
                    ))}
                </div>
            </section>
        );
    }

    if (section.type === "Banner") return frame(
        <BannerVariantSection section={section} activeImage={activeImage} setActiveImage={setActiveImage} responsiveClass={responsiveVisibilityClass} sectionLayout={sectionLayout} colors={sectionColors} LinkComponent={LinkComponent} />
    );

    if (section.type === "Reviews") return frame(
        <ReviewsVariantSection section={section} reviews={sectionReviews?.[stableSectionId] || []} responsiveClass={responsiveVisibilityClass} sectionLayout={sectionLayout} contentGapClass={contentGapClass} colors={sectionColors} />
    );

    if (section.type === "CategoryList") return frame(
        <CategoryVariantSection section={section} categories={categories} catalogProducts={catalogProducts} previewDevice={previewDevice} responsiveClass={responsiveVisibilityClass} sectionLayout={sectionLayout} contentGapClass={contentGapClass} colors={sectionColors} LinkComponent={LinkComponent} />
    );

    if (["Collection", "CollectionShowcase"].includes(section.type)) {
        const selectedIds = section.settings?.productIds || section.settings?.source?.productIds || [];
        const products = sectionProducts?.[stableSectionId]
            || catalogProducts.filter(product => selectedIds.map(String).includes(String(product._id)));
        return frame(
            <CollectionVariantSection section={section} products={products} previewDevice={previewDevice} responsiveClass={responsiveVisibilityClass} sectionLayout={sectionLayout} contentGapClass={contentGapClass} colors={sectionColors} productCard={productCard} storewideDiscount={storewideDiscount} onProductAdd={onProductAdd} onProductBuyNow={onProductBuyNow} onWishlistToggle={onWishlistToggle} isProductWishlisted={isProductWishlisted} LinkComponent={LinkComponent} />
        );
    }

    if (section.type === "FAQ") {
        const lines = String(section.settings?.text || "").split(/\n+/).map(line => line.trim()).filter(Boolean);
        const questions = [];
        lines.forEach((line) => {
            if (/^q(?:uestion)?\s*:/i.test(line)) questions.push({ question: line.replace(/^q(?:uestion)?\s*:\s*/i, ""), answer: "" });
            else if (/^a(?:nswer)?\s*:/i.test(line) && questions.length) questions[questions.length - 1].answer = line.replace(/^a(?:nswer)?\s*:\s*/i, "");
            else if (questions.length) questions[questions.length - 1].answer = [questions[questions.length - 1].answer, line].filter(Boolean).join(" ");
        });
        if (!questions.length && lines.length) questions.push({ question: section.title || "Common question", answer: lines.join(" ") });
        if (!questions.length) return null;
        return frame(
            <section className={`${responsiveVisibilityClass} ${sectionLayout.className} rounded-[1.5rem] border border-slate-200 p-5 shadow-sm sm:p-7`} style={{ ...sectionLayout.style, backgroundColor: sectionColors.background || "var(--sf-section-background)" }}>
                <h2 className="text-xl font-black sm:text-3xl" style={{ ...headingStyle, color: sectionColors.title || "var(--sf-section-title)" }}>{section.title || "Frequently asked questions"}</h2>
                <div className={`mt-5 grid ${contentGapClass}`}>
                    {questions.map((item, index) => (
                        <details key={`${item.question}-${index}`} className="group rounded-2xl p-4" style={{ backgroundColor: sectionColors.faqBackground || "var(--sf-section-faq-bg)" }} open={Boolean(previewDevice && index === 0)}>
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black sm:text-base" style={{ color: sectionColors.faqText || "var(--sf-section-faq-text)" }}>{item.question}<ChevronDown size={17} className="shrink-0 transition group-open:rotate-180" /></summary>
                            {item.answer && <p className="mt-3 text-sm leading-6 opacity-80" style={{ color: sectionColors.faqText || "var(--sf-section-faq-text)" }}>{item.answer}</p>}
                        </details>
                    ))}
                </div>
            </section>
        );
    }

    if (section.type === "TrustBadges") {
        const badges = String(section.settings?.text || "").split(/\n|·|,/).map(item => item.trim()).filter(Boolean).slice(0, 8);
        if (!badges.length) return null;
        return frame(
            <section className={`${responsiveVisibilityClass} ${sectionLayout.className}`} style={sectionLayout.style}>
                <h2 className="text-center text-xl font-black sm:text-3xl" style={{ ...headingStyle, color: sectionColors.title || "var(--sf-section-title)" }}>{section.title || "Why shop with us"}</h2>
                <div className={`mt-5 grid grid-cols-1 ${contentGapClass} sm:grid-cols-2 lg:grid-cols-4`}>
                    {badges.map((badge, index) => <div key={`${badge}-${index}`} className="flex min-h-24 items-center gap-3 rounded-2xl border border-slate-200 p-4 shadow-sm" style={{ backgroundColor: sectionColors.background || "var(--sf-section-background)", color: sectionColors.trustText || "var(--sf-section-trust-text)" }}><span className="rounded-full bg-[var(--sf-accent-bg)] p-2.5" style={{ color: sectionColors.trustIcon || "var(--sf-section-trust-icon)" }}><ShieldCheck size={20} /></span><span className="text-sm font-black leading-5">{badge}</span></div>)}
                </div>
            </section>
        );
    }

    if (section.type === "BrandStory") return frame(
        <BrandStoryVariantSection section={section} responsiveClass={responsiveVisibilityClass} sectionLayout={sectionLayout} contentGapClass={contentGapClass} colors={sectionColors} />
    );

    if (["Newsletter", "PromoBlock", "TextBlock", "BrandShowcase"].includes(section.type)) return frame(
        <TextualVariantSection section={section} responsiveClass={responsiveVisibilityClass} sectionLayout={sectionLayout} colors={sectionColors} />
    );

    return null;
});
