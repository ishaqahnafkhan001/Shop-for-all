/* eslint-disable @next/next/no-img-element */
"use client";

import { memo, useState } from "react";
import { BadgeCheck, ChevronDown, ChevronLeft, ChevronRight, ShieldCheck, Sparkles, Star } from "lucide-react";

import {
    categoryDesktopGridClasses,
    categoryGridClasses,
    EditorSelectionFrame,
    getSectionDisplayLabel,
    isPreviewMobile,
    LinkSlot,
    normalizeImageList,
    optimizeCloudinaryImage,
    productGridGapClasses,
} from "./referenceCore";
import { ProductCard } from "./StorefrontProductCard";

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
    const editorId = stableSectionId
        ? `section:${stableSectionId}`
        : `section-${Number.isFinite(sectionIndex) ? sectionIndex : section.type}`;
    const editorLabel = getSectionDisplayLabel(section);

    if (section.type === "FeaturedProducts") {
        const products = sectionProducts?.[section.id || section._id] || catalogProducts.slice(0, 4);
        const mobileGridClass = Number(mobileSettings.columns) === 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2";
        const featuredGridClass = previewDevice
            ? (isPreviewMobile(previewDevice) ? mobileGridClass : `${mobileGridClass} md:grid-cols-3 lg:grid-cols-4`)
            : `${mobileGridClass} md:grid-cols-3 lg:grid-cols-4`;
        if (products.length === 0) return null;
        return (
            <EditorSelectionFrame editor={editor} id={editorId} label={editorLabel}>
                <section className={`${responsiveVisibilityClass} mt-8 md:mt-12`}>
                    <div className="mb-4 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                            <h2 className="text-xl font-black tracking-tight sm:text-3xl" style={{ color: sectionColors.title || "var(--sf-section-title)" }}>{section.title || "Featured Products"}</h2>
                            <p className="mt-1 text-xs font-semibold sm:text-sm" style={{ color: sectionColors.subtitle || "var(--sf-section-subtitle)" }}>Handpicked products from this store</p>
                        </div>
                        <LinkSlot LinkComponent={LinkComponent} href="#products" className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:border-[var(--sf-accent-soft)] hover:text-[var(--sf-accent)] sm:inline-flex">
                            View all
                        </LinkSlot>
                    </div>
                    <div className={`grid ${featuredGridClass} ${productGridGapClasses[layout?.productGap || "Comfortable"]} ${products.length === 1 ? "mx-auto w-full max-w-[20rem] sm:mx-0 sm:max-w-none" : ""}`}>
                        {products.slice(0, 4).map((product, index) => (
                            <ProductCard
                                key={product._id}
                                product={product}
                                index={index}
                                storewideDiscount={storewideDiscount}
                                productCard={productCard}
                                onProductAdd={onProductAdd}
                                onProductBuyNow={onProductBuyNow}
                                onWishlistToggle={onWishlistToggle}
                                isWishlisted={isProductWishlisted}
                                LinkComponent={LinkComponent}
                            />
                        ))}
                    </div>
                </section>
            </EditorSelectionFrame>
        );
    }

    if (section.type === "Banner") {
        const desktopImages = normalizeImageList(section.settings?.desktopImages || [], section.settings?.desktopImage, section.settings?.image);
        const mobileImages = normalizeImageList(section.settings?.mobileImages || [], section.settings?.mobileImage, mobileSettings.image);
        const images = desktopImages.length ? desktopImages : mobileImages;
        const mobileDisplayImages = mobileImages.length ? mobileImages : images;
        const imageIndex = images.length ? activeImage % images.length : 0;
        const mobileImageIndex = mobileDisplayImages.length ? activeImage % mobileDisplayImages.length : 0;
        const imageUrl = images[imageIndex] || "";
        const mobileImageUrl = mobileDisplayImages[mobileImageIndex] || imageUrl;
        return (
            <EditorSelectionFrame editor={editor} id={editorId} label={editorLabel}>
                <section className={`${responsiveVisibilityClass} mt-8 md:mt-12`}>
                    <LinkSlot LinkComponent={LinkComponent} href={section.settings?.buttonLink || "#products"} className="group relative block min-h-[220px] overflow-hidden rounded-[1.5rem] shadow-sm sm:min-h-[280px] sm:rounded-[1.75rem] lg:min-h-[320px]" style={{ backgroundColor: sectionColors.bannerOverlay || "var(--sf-section-banner-overlay)" }}>
                        {mobileImageUrl && mobileImageUrl !== imageUrl && (
                            <img
                                src={optimizeCloudinaryImage(mobileImageUrl, { width: 760, crop: "fill" })}
                                alt=""
                                width="760"
                                height="520"
                                loading="lazy"
                                decoding="async"
                                className="absolute inset-0 h-full w-full object-cover md:hidden"
                                style={{ objectPosition: `${mobileSettings.focalPoint?.x ?? section.settings?.focalPoint?.x ?? 50}% ${mobileSettings.focalPoint?.y ?? section.settings?.focalPoint?.y ?? 50}%` }}
                            />
                        )}
                        {imageUrl && (
                            <img
                                src={optimizeCloudinaryImage(imageUrl, { width: 1600, crop: "fill" })}
                                alt=""
                                width="1600"
                                height="700"
                                loading="lazy"
                                decoding="async"
                                className={`${mobileImageUrl && mobileImageUrl !== imageUrl ? "hidden md:block" : ""} absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105`}
                                style={{ objectPosition: `${section.settings?.focalPoint?.x ?? 50}% ${section.settings?.focalPoint?.y ?? 50}%` }}
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/78 via-slate-950/36 to-transparent" />
                        <div className="relative z-10 flex min-h-[220px] max-w-2xl flex-col justify-end p-5 sm:min-h-[280px] sm:p-8 lg:min-h-[320px] lg:p-10" style={{ color: sectionColors.bannerText || "var(--sf-section-banner-text)" }}>
                            <h2 className="text-2xl font-black leading-tight sm:text-4xl lg:text-5xl">{section.settings?.title || section.title || "Promotional banner"}</h2>
                            {section.settings?.subtitle && <p className="mt-3 max-w-xl text-sm leading-6 opacity-80 sm:text-base">{section.settings.subtitle}</p>}
                            {section.settings?.buttonText && <span className="mt-5 inline-flex w-fit rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950">{section.settings.buttonText}</span>}
                        </div>
                        {images.length > 1 && (
                            <div className="absolute bottom-5 right-5 z-20 flex items-center gap-2" onClick={(event) => event.preventDefault()}>
                                <button type="button" onClick={() => setActiveImage((prev) => (prev - 1 + images.length) % images.length)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-950 shadow-sm" aria-label="Previous banner image">
                                    <ChevronLeft size={16} />
                                </button>
                                <div className="flex gap-1.5">
                                    {images.map((_, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => setActiveImage(index)}
                                            className={`h-2 rounded-full transition ${index === imageIndex ? "w-6 bg-white" : "w-2 bg-white/50"}`}
                                            aria-label={`Show banner ${index + 1}`}
                                        />
                                    ))}
                                </div>
                                <button type="button" onClick={() => setActiveImage((prev) => (prev + 1) % images.length)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-950 shadow-sm" aria-label="Next banner image">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </LinkSlot>
                </section>
            </EditorSelectionFrame>
        );
    }

    if (section.type === "Reviews") {
        const reviewText = section.settings?.text?.trim();
        const reviews = sectionReviews?.[section.id || section._id] || [];
        if (!reviewText && reviews.length === 0) return null;
        return (
            <EditorSelectionFrame editor={editor} id={editorId} label={editorLabel}>
                <section className={`${responsiveVisibilityClass} mt-8 rounded-[1.5rem] border border-slate-200 p-4 shadow-sm sm:p-6 md:mt-12 md:rounded-[1.75rem] md:p-7`} style={{ backgroundColor: sectionColors.background || "var(--sf-section-background)" }}>
                    <h2 className="text-xl font-black sm:text-3xl" style={{ color: sectionColors.title || "var(--sf-section-title)" }}>{section.title || "Customer Reviews"}</h2>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {reviews.length > 0 ? reviews.map((review) => (
                            <div key={review._id} className="rounded-2xl p-4" style={{ backgroundColor: sectionColors.testimonialBackground || "var(--sf-section-testimonial-bg)" }}>
                                <div className="flex text-amber-400">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={13} fill="currentColor" />)}</div>
                                <p className="mt-3 text-sm font-semibold leading-6" style={{ color: sectionColors.testimonialText || "var(--sf-section-testimonial-text)" }}>“{review.comment}”</p>
                                <div className="mt-4 border-t border-slate-200 pt-3">
                                    <p className="text-sm font-black text-slate-950">{review.name}</p>
                                    {review.product?.title && <p className="text-xs font-semibold text-slate-500">{review.product.title}</p>}
                                    <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Review ID {String(review._id).slice(-8)}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="rounded-2xl p-4 md:col-span-3" style={{ backgroundColor: sectionColors.testimonialBackground || "var(--sf-section-testimonial-bg)" }}>
                                <div className="flex text-amber-400">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={13} fill="currentColor" />)}</div>
                                <p className="mt-3 text-sm font-semibold leading-6" style={{ color: sectionColors.testimonialText || "var(--sf-section-testimonial-text)" }}>{reviewText}</p>
                            </div>
                        )}
                    </div>
                </section>
            </EditorSelectionFrame>
        );
    }

    if (section.type === "CategoryList") {
        const maxCategories = Math.min(Math.max(Number(section.settings?.maxCategories) || 10, 1), 24);
        const visibleCategories = (categories || []).slice(0, maxCategories);
        const mobileColumns = Math.min(Math.max(Number(mobileSettings.columns) || 2, 1), 4);
        const desktopColumns = Math.min(Math.max(Number(section.settings?.columns) || 4, 1), 4);
        const categoryGridClass = previewDevice
            ? (isPreviewMobile(previewDevice) ? categoryGridClasses[mobileColumns] : categoryGridClasses[desktopColumns])
            : `${categoryGridClasses[mobileColumns]} ${categoryDesktopGridClasses[desktopColumns]}`;
        if (visibleCategories.length === 0) return null;
        return (
            <EditorSelectionFrame editor={editor} id={editorId} label={editorLabel}>
                <section className={`${responsiveVisibilityClass} mt-8 rounded-[1.5rem] border border-slate-200 p-4 shadow-sm sm:p-6 md:mt-12 md:rounded-[1.75rem]`} style={{ backgroundColor: sectionColors.background || "var(--sf-section-background)" }}>
                    <h2 className="text-xl font-black sm:text-2xl" style={{ color: sectionColors.title || "var(--sf-section-title)" }}>{section.title || "Shop by category"}</h2>
                    <div className={`mt-4 grid gap-2 ${categoryGridClass}`}>
                        {visibleCategories.map((category) => (
                            <LinkSlot key={category} LinkComponent={LinkComponent} href={`/categories/${encodeURIComponent(category)}`} prefetch={false} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 transition hover:border-[var(--sf-accent)] hover:bg-[var(--sf-accent-bg)]">
                                {category}
                            </LinkSlot>
                        ))}
                    </div>
                </section>
            </EditorSelectionFrame>
        );
    }

    if (section.type === "FAQ") {
        const lines = String(section.settings?.text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
        const questions = [];
        lines.forEach((line) => {
            if (/^q(?:uestion)?\s*:/i.test(line)) {
                questions.push({ question: line.replace(/^q(?:uestion)?\s*:\s*/i, ""), answer: "" });
            } else if (/^a(?:nswer)?\s*:/i.test(line) && questions.length) {
                questions[questions.length - 1].answer = line.replace(/^a(?:nswer)?\s*:\s*/i, "");
            } else if (questions.length) {
                questions[questions.length - 1].answer = [questions[questions.length - 1].answer, line].filter(Boolean).join(" ");
            }
        });
        if (!questions.length && lines.length) questions.push({ question: section.title || "Common question", answer: lines.join(" ") });
        return (
            <EditorSelectionFrame editor={editor} id={editorId} label={editorLabel}>
                <section className={`${responsiveVisibilityClass} mt-8 rounded-[1.5rem] border border-slate-200 p-5 shadow-sm sm:p-7 md:mt-12`} style={{ backgroundColor: sectionColors.background || "var(--sf-section-background)" }}>
                    <h2 className="text-xl font-black sm:text-3xl" style={{ color: sectionColors.title || "var(--sf-section-title)" }}>{section.title || "Frequently asked questions"}</h2>
                    <div className="mt-5 space-y-3">
                        {questions.map((item, index) => (
                            <details key={`${item.question}-${index}`} className="group rounded-2xl p-4" style={{ backgroundColor: sectionColors.faqBackground || "var(--sf-section-faq-bg)" }} open={Boolean(previewDevice && index === 0)}>
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black sm:text-base" style={{ color: sectionColors.faqText || "var(--sf-section-faq-text)" }}>
                                    {item.question}<ChevronDown size={17} className="shrink-0 transition group-open:rotate-180" />
                                </summary>
                                {item.answer && <p className="mt-3 text-sm leading-6 opacity-80" style={{ color: sectionColors.faqText || "var(--sf-section-faq-text)" }}>{item.answer}</p>}
                            </details>
                        ))}
                    </div>
                </section>
            </EditorSelectionFrame>
        );
    }

    if (section.type === "TrustBadges") {
        const badges = String(section.settings?.text || "Secure checkout · Fast delivery · Easy support")
            .split(/\n|·|,/).map((item) => item.trim()).filter(Boolean).slice(0, 8);
        return (
            <EditorSelectionFrame editor={editor} id={editorId} label={editorLabel}>
                <section className={`${responsiveVisibilityClass} mt-8 md:mt-12`}>
                    <h2 className="text-center text-xl font-black sm:text-3xl" style={{ color: sectionColors.title || "var(--sf-section-title)" }}>{section.title || "Why shop with us"}</h2>
                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {badges.map((badge, index) => (
                            <div key={`${badge}-${index}`} className="flex min-h-24 items-center gap-3 rounded-2xl border border-slate-200 p-4 shadow-sm" style={{ backgroundColor: sectionColors.background || "var(--sf-section-background)", color: sectionColors.trustText || "var(--sf-section-trust-text)" }}>
                                <span className="rounded-full bg-[var(--sf-accent-bg)] p-2.5" style={{ color: sectionColors.trustIcon || "var(--sf-section-trust-icon)" }}><ShieldCheck size={20} /></span>
                                <span className="text-sm font-black leading-5">{badge}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </EditorSelectionFrame>
        );
    }

    if (section.type === "BrandStory") {
        return (
            <EditorSelectionFrame editor={editor} id={editorId} label={editorLabel}>
                <section className={`${responsiveVisibilityClass} mt-8 overflow-hidden rounded-[1.5rem] border border-slate-200 shadow-sm md:mt-12 md:rounded-[1.75rem]`} style={{ backgroundColor: sectionColors.background || "var(--sf-section-background)" }}>
                    <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--sf-accent-bg)] text-[var(--sf-accent)]"><Sparkles size={28} /></div>
                        <div>
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[var(--sf-accent)]"><BadgeCheck size={15} /> Our store</div>
                            <h2 className="mt-2 text-2xl font-black sm:text-3xl" style={{ color: sectionColors.title || "var(--sf-section-title)" }}>{section.title || "Our story"}</h2>
                            {section.settings?.text && <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-7 sm:text-base" style={{ color: sectionColors.subtitle || "var(--sf-section-subtitle)" }}>{section.settings.text}</p>}
                        </div>
                    </div>
                </section>
            </EditorSelectionFrame>
        );
    }

    return (
        <EditorSelectionFrame editor={editor} id={editorId} label={editorLabel}>
            <section className={`${responsiveVisibilityClass} mt-8 rounded-[1.5rem] border border-slate-200 p-5 text-center shadow-sm md:mt-12 md:rounded-[1.75rem] sm:p-10`} style={{ backgroundColor: sectionColors.background || "var(--sf-section-background)" }}>
                <h2 className="text-xl font-black sm:text-3xl" style={{ color: sectionColors.title || "var(--sf-section-title)" }}>{section.title || "Store update"}</h2>
                {section.settings?.text && <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 sm:text-base" style={{ color: sectionColors.subtitle || "var(--sf-section-subtitle)" }}>{section.settings.text}</p>}
            </section>
        </EditorSelectionFrame>
    );
});
