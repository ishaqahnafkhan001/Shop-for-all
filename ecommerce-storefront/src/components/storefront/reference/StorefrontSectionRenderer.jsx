/* eslint-disable @next/next/no-img-element */
"use client";

import { memo, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

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
    layout,
    onProductAdd,
    LinkComponent,
    previewDevice,
    editor,
}) {
    const mobileSettings = section.mobileSettings || {};
    const [activeImage, setActiveImage] = useState(0);
    const mobileVisibilityClass = mobileSettings.isVisible === false
        ? (isPreviewMobile(previewDevice) ? "hidden" : previewDevice ? "" : "hidden md:block")
        : "";
    const editorId = Number.isFinite(sectionIndex) ? `section-${sectionIndex}` : `section-${section.id || section._id || section.type}`;
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
                <section className={`${mobileVisibilityClass} mt-8 md:mt-12`}>
                    <div className="mb-4 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                            <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-3xl">{section.title || "Featured Products"}</h2>
                            <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">Handpicked products from this store</p>
                        </div>
                        <LinkSlot LinkComponent={LinkComponent} href="#products" className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:border-[var(--sf-accent-soft)] hover:text-[var(--sf-accent)] sm:inline-flex">
                            View all
                        </LinkSlot>
                    </div>
                    <div className={`grid ${featuredGridClass} ${productGridGapClasses[layout?.productGap || "Comfortable"]}`}>
                        {products.slice(0, 4).map((product, index) => (
                            <ProductCard
                                key={product._id}
                                product={product}
                                index={index}
                                storewideDiscount={storewideDiscount}
                                productCard={productCard}
                                onProductAdd={onProductAdd}
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
                <section className={`${mobileVisibilityClass} mt-8 md:mt-12`}>
                    <LinkSlot LinkComponent={LinkComponent} href={section.settings?.buttonLink || "#products"} className="group relative block min-h-[220px] overflow-hidden rounded-[1.5rem] bg-slate-950 shadow-sm sm:min-h-[280px] sm:rounded-[1.75rem] lg:min-h-[320px]">
                        {mobileImageUrl && mobileImageUrl !== imageUrl && (
                            <img
                                src={optimizeCloudinaryImage(mobileImageUrl, { width: 760, crop: "fill" })}
                                alt=""
                                width="760"
                                height="520"
                                loading="lazy"
                                decoding="async"
                                className="absolute inset-0 h-full w-full object-cover md:hidden"
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
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/78 via-slate-950/36 to-transparent" />
                        <div className="relative z-10 flex min-h-[220px] max-w-2xl flex-col justify-end p-5 text-white sm:min-h-[280px] sm:p-8 lg:min-h-[320px] lg:p-10">
                            <h2 className="text-2xl font-black leading-tight sm:text-4xl lg:text-5xl">{section.settings?.title || section.title || "Promotional banner"}</h2>
                            {section.settings?.subtitle && <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">{section.settings.subtitle}</p>}
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
                <section className={`${mobileVisibilityClass} mt-8 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 md:mt-12 md:rounded-[1.75rem] md:p-7`}>
                    <h2 className="text-xl font-black text-slate-950 sm:text-3xl">{section.title || "Customer Reviews"}</h2>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {reviews.length > 0 ? reviews.map((review) => (
                            <div key={review._id} className="rounded-2xl bg-slate-50 p-4">
                                <div className="flex text-amber-400">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={13} fill="currentColor" />)}</div>
                                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">“{review.comment}”</p>
                                <div className="mt-4 border-t border-slate-200 pt-3">
                                    <p className="text-sm font-black text-slate-950">{review.name}</p>
                                    {review.product?.title && <p className="text-xs font-semibold text-slate-500">{review.product.title}</p>}
                                    <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Review ID {String(review._id).slice(-8)}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="rounded-2xl bg-slate-50 p-4 md:col-span-3">
                                <div className="flex text-amber-400">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={13} fill="currentColor" />)}</div>
                                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{reviewText}</p>
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
                <section className={`${mobileVisibilityClass} mt-8 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 md:mt-12 md:rounded-[1.75rem]`}>
                    <h2 className="text-xl font-black text-slate-950 sm:text-2xl">{section.title || "Shop by category"}</h2>
                    <div className={`mt-4 grid gap-2 ${categoryGridClass}`}>
                        {visibleCategories.map((category) => (
                            <LinkSlot key={category} LinkComponent={LinkComponent} href={`/?category=${encodeURIComponent(category)}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 transition hover:border-[var(--sf-accent)] hover:bg-[var(--sf-accent-bg)]">
                                {category}
                            </LinkSlot>
                        ))}
                    </div>
                </section>
            </EditorSelectionFrame>
        );
    }

    return (
        <EditorSelectionFrame editor={editor} id={editorId} label={editorLabel}>
            <section className={`${mobileVisibilityClass} mt-8 rounded-[1.5rem] border border-slate-200 bg-white p-5 text-center shadow-sm md:mt-12 md:rounded-[1.75rem] sm:p-10`}>
                <h2 className="text-xl font-black text-slate-950 sm:text-3xl">{section.title || "Store update"}</h2>
                {section.settings?.text && <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">{section.settings.text}</p>}
            </section>
        </EditorSelectionFrame>
    );
});
