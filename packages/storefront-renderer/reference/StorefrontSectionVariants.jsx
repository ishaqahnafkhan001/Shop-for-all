/* eslint-disable @next/next/no-img-element */
"use client";

import { BadgeCheck, ChevronLeft, ChevronRight, Mail, Sparkles, Star } from "lucide-react";

import {
    categoryDesktopGridClasses,
    categoryGridClasses,
    getImageUrl,
    headingStyle,
    isPreviewMobile,
    LinkSlot,
    normalizeCategoryIdentity,
    normalizeImageList,
    optimizeCloudinaryImage,
} from "./referenceCore";
import { ProductCard } from "./StorefrontProductCard";

const SectionHeading = ({ title, subtitle, colors, centered = false }) => (
    <div className={centered ? "text-center" : ""}>
        <h2 className="text-xl font-black sm:text-3xl" style={{ ...headingStyle, color: colors.title || "var(--sf-section-title)" }}>{title}</h2>
        {subtitle && <p className={`mt-2 text-sm font-semibold ${centered ? "mx-auto max-w-2xl" : ""}`} style={{ color: colors.subtitle || "var(--sf-section-subtitle)" }}>{subtitle}</p>}
    </div>
);

const ReviewStars = ({ rating }) => {
    const normalizedRating = Math.min(Math.max(Number(rating) || 0, 0), 5);
    if (normalizedRating <= 0) return null;
    return (
        <div className="flex text-amber-400" aria-label={`${normalizedRating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} size={13} fill={star <= Math.round(normalizedRating) ? "currentColor" : "none"} className={star <= Math.round(normalizedRating) ? "" : "text-slate-300"} />
            ))}
        </div>
    );
};

const getCategoryModel = (category, index, products = []) => {
    const name = typeof category === "string" ? category : (category?.name || category?.title || category?.label || "");
    const slug = typeof category === "object" && category?.slug ? category.slug : name;
    const representativeProduct = products.find((product) => String(product?.category || "").toLowerCase() === String(name).toLowerCase());
    return {
        id: typeof category === "object" ? (category?._id || category?.id || slug || index) : `${name}-${index}`,
        name,
        href: `/categories/${encodeURIComponent(slug)}`,
        image: (typeof category === "object"
            ? (category?.coverImage?.url || category?.image || getImageUrl(category))
            : "") || getImageUrl(representativeProduct),
        productCount: typeof category === "object" && Number.isFinite(Number(category?.productCount))
            ? Math.max(Number(category.productCount), 0)
            : null,
    };
};

const getUniqueCategoryModels = (categories = [], products = [], limit = 24) => {
    const modelsByIdentity = new Map();

    categories.forEach((category, index) => {
        const model = getCategoryModel(category, index, products);
        const identity = normalizeCategoryIdentity(model.name);
        if (!identity) return;

        const current = modelsByIdentity.get(identity);
        if (!current) {
            modelsByIdentity.set(identity, model);
            return;
        }

        modelsByIdentity.set(identity, {
            ...current,
            image: current.image || model.image,
            productCount: Math.max(Number(current.productCount) || 0, Number(model.productCount) || 0) || null,
        });
    });

    return [...modelsByIdentity.values()].slice(0, limit);
};

const CategoryCount = ({ count, onImage = false }) => {
    if (!Number.isFinite(count) || count <= 0) return null;
    return (
        <span className={`text-[11px] font-bold ${onImage ? "text-white/80" : "text-slate-500"}`}>
            {count} product{count === 1 ? "" : "s"}
        </span>
    );
};

export function CategoryVariantSection({ section, categories, catalogProducts, previewDevice, responsiveClass, sectionLayout, contentGapClass, colors, LinkComponent }) {
    const settings = section.settings || {};
    const variant = settings.variant || "cards";
    const maxCategories = Math.min(Math.max(Number(settings.maxCategories) || 10, 1), 24);
    const items = getUniqueCategoryModels(categories, catalogProducts, maxCategories);
    const mobileColumns = Math.min(Math.max(Number(section.mobileSettings?.columns) || 2, 1), 4);
    const desktopColumns = Math.min(Math.max(Number(settings.columns) || 4, 1), 4);
    const categoryGridClass = previewDevice
        ? (isPreviewMobile(previewDevice) ? categoryGridClasses[mobileColumns] : categoryGridClasses[desktopColumns])
        : `${categoryGridClasses[mobileColumns]} ${categoryDesktopGridClasses[desktopColumns]}`;
    if (!items.length) return null;

    const shellClass = `${responsiveClass} ${sectionLayout.className} rounded-[1.5rem] border border-slate-200 p-4 shadow-sm sm:p-6 md:rounded-[1.75rem]`;
    const shellStyle = { ...sectionLayout.style, backgroundColor: colors.background || "var(--sf-section-background)" };

    if (variant === "circles") {
        return (
            <section data-section-variant={variant} className={`${responsiveClass} ${sectionLayout.className}`} style={sectionLayout.style}>
                <SectionHeading title={section.title || "Shop by category"} colors={colors} centered />
                <div className={`mt-6 grid ${contentGapClass} ${categoryGridClass}`}>
                    {items.map((item) => (
                        <LinkSlot key={item.id} LinkComponent={LinkComponent} href={item.href} prefetch={false} className="group flex min-w-0 flex-col items-center text-center">
                            <span className="flex aspect-square w-full max-w-36 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-[var(--sf-accent-bg)] text-2xl font-black text-[var(--sf-accent)] shadow-sm transition group-hover:-translate-y-1 group-hover:border-[var(--sf-accent)]">
                                {item.image ? <img src={optimizeCloudinaryImage(item.image, { width: 360, crop: "fill" })} alt={`${item.name} category`} width="360" height="360" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : item.name.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="mt-3 max-w-full truncate text-sm font-black text-slate-700 group-hover:text-[var(--sf-accent)]">{item.name}</span>
                            <CategoryCount count={item.productCount} />
                        </LinkSlot>
                    ))}
                </div>
            </section>
        );
    }

    if (variant === "imageGrid" || variant === "editorial") {
        const editorial = variant === "editorial" && items.length >= 3;
        return (
            <section data-section-variant={variant} className={`${responsiveClass} ${sectionLayout.className}`} style={sectionLayout.style}>
                <SectionHeading title={section.title || "Shop by category"} subtitle={editorial ? "Explore the collections that define this store" : ""} colors={colors} />
                <div className={`mt-5 grid ${contentGapClass} ${editorial ? "grid-cols-2 lg:grid-cols-4" : categoryGridClass}`}>
                    {items.map((item, index) => (
                        <LinkSlot key={item.id} LinkComponent={LinkComponent} href={item.href} prefetch={false} className={`group relative min-h-40 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 ${editorial && index === 0 ? "col-span-2 row-span-2 min-h-80" : ""}`}>
                            {item.image ? <img src={optimizeCloudinaryImage(item.image, { width: editorial && index === 0 ? 900 : 520, crop: "fill" })} alt={`${item.name} category`} width="900" height="680" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <span className="absolute inset-0 flex items-center justify-center bg-[var(--sf-accent-bg)] text-4xl font-black text-[var(--sf-accent)]">{item.name.slice(0, 1).toUpperCase()}</span>}
                            <span className="absolute inset-x-0 bottom-0 flex flex-col bg-gradient-to-t from-slate-950/92 via-slate-950/62 to-transparent px-4 pb-4 pt-16 text-sm font-black text-white">
                                <span>{item.name}</span>
                                <CategoryCount count={item.productCount} onImage />
                            </span>
                        </LinkSlot>
                    ))}
                </div>
            </section>
        );
    }

    return (
        <section data-section-variant="cards" className={shellClass} style={shellStyle}>
            <SectionHeading title={section.title || "Shop by category"} colors={colors} />
            <div className={`mt-4 grid ${contentGapClass} ${categoryGridClass}`}>
                {items.map((item) => (
                    <LinkSlot key={item.id} LinkComponent={LinkComponent} href={item.href} prefetch={false} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-600 transition hover:border-[var(--sf-accent)] hover:bg-[var(--sf-accent-bg)]">
                        {item.image && (
                            <img src={optimizeCloudinaryImage(item.image, { width: 120, crop: "fill" })} alt={`${item.name} category`} width="48" height="48" loading="lazy" decoding="async" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                        )}
                        <span className="min-w-0">
                            <span className="block truncate">{item.name}</span>
                            <CategoryCount count={item.productCount} />
                        </span>
                    </LinkSlot>
                ))}
            </div>
        </section>
    );
}

export function ReviewsVariantSection({ section, reviews, responsiveClass, sectionLayout, contentGapClass, colors }) {
    const variant = section.settings?.variant || "cards";
    const reviewText = section.settings?.text?.trim();
    const items = reviews.length ? reviews : (reviewText ? [{ _id: "manual", comment: reviewText, name: "" }] : []);
    if (!items.length) return null;
    const title = section.title || "Customer Reviews";

    if (variant === "quote") {
        return (
            <section data-section-variant={variant} className={`${responsiveClass} ${sectionLayout.className} py-4 text-center sm:py-8`} style={sectionLayout.style}>
                <SectionHeading title={title} colors={colors} centered />
                <div className={`mx-auto mt-6 grid max-w-4xl ${contentGapClass}`}>
                    {items.map((review) => (
                        <blockquote key={review._id} className="text-xl font-semibold leading-relaxed sm:text-3xl" style={{ ...headingStyle, color: colors.testimonialText || "var(--sf-section-testimonial-text)" }}>
                            “{review.comment}”
                            {review.name && <footer className="mt-4 font-sans text-xs font-black uppercase tracking-widest text-slate-500">{review.name}{review.product?.title ? ` · ${review.product.title}` : ""}</footer>}
                        </blockquote>
                    ))}
                </div>
            </section>
        );
    }

    if (variant === "minimal") {
        return (
            <section data-section-variant={variant} className={`${responsiveClass} ${sectionLayout.className}`} style={sectionLayout.style}>
                <SectionHeading title={title} colors={colors} />
                <div className={`mt-5 divide-y divide-slate-200 border-y border-slate-200 ${contentGapClass}`}>
                    {items.map((review) => (
                        <div key={review._id} className="grid gap-3 py-5 sm:grid-cols-[140px_minmax(0,1fr)]">
                            <div><ReviewStars rating={review.rating} />{review.name && <p className="mt-2 text-sm font-black text-slate-900">{review.name}</p>}</div>
                            <p className="text-sm font-semibold leading-7" style={{ color: colors.testimonialText || "var(--sf-section-testimonial-text)" }}>{review.comment}</p>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    return (
        <section data-section-variant="cards" className={`${responsiveClass} ${sectionLayout.className} rounded-[1.5rem] border border-slate-200 p-4 shadow-sm sm:p-6 md:rounded-[1.75rem] md:p-7`} style={{ ...sectionLayout.style, backgroundColor: colors.background || "var(--sf-section-background)" }}>
            <SectionHeading title={title} colors={colors} />
            <div className={`mt-5 grid ${contentGapClass} sm:grid-cols-2 lg:grid-cols-3`}>
                {items.map((review) => (
                    <div key={review._id} className="rounded-2xl p-4" style={{ backgroundColor: colors.testimonialBackground || "var(--sf-section-testimonial-bg)" }}>
                        <ReviewStars rating={review.rating} />
                        <p className="mt-3 text-sm font-semibold leading-6" style={{ color: colors.testimonialText || "var(--sf-section-testimonial-text)" }}>“{review.comment}”</p>
                        {(review.name || review.product?.title) && <div className="mt-4 border-t border-slate-200 pt-3"><p className="text-sm font-black text-slate-950">{review.name}</p>{review.product?.title && <p className="text-xs font-semibold text-slate-500">{review.product.title}</p>}</div>}
                    </div>
                ))}
            </div>
        </section>
    );
}

const StoryCopy = ({ section, colors }) => (
    <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[var(--sf-accent)]"><BadgeCheck size={15} /> Our store</div>
        <h2 className="mt-2 text-2xl font-black sm:text-3xl" style={{ ...headingStyle, color: colors.title || "var(--sf-section-title)" }}>{section.title || "Our story"}</h2>
        {section.settings?.text && <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-7 sm:text-base" style={{ color: colors.subtitle || "var(--sf-section-subtitle)" }}>{section.settings.text}</p>}
    </div>
);

export function BrandStoryVariantSection({ section, responsiveClass, sectionLayout, contentGapClass, colors }) {
    const variant = section.settings?.variant || "standard";
    const image = section.settings?.imageUrl || section.settings?.image || section.settings?.desktopImage || "";
    const focalPoint = section.settings?.focalPoint || { x: 50, y: 50 };
    const baseStyle = { ...sectionLayout.style, backgroundColor: colors.background || "var(--sf-section-background)" };
    if (variant === "standard" || !image) {
        return (
            <section data-section-variant={variant} className={`${responsiveClass} ${sectionLayout.className} overflow-hidden rounded-[1.5rem] border border-slate-200 shadow-sm md:rounded-[1.75rem]`} style={baseStyle}>
                <div className={`grid ${contentGapClass} p-6 sm:p-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center`}>
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--sf-accent-bg)] text-[var(--sf-accent)]"><Sparkles size={28} /></div>
                    <StoryCopy section={section} colors={colors} />
                </div>
            </section>
        );
    }

    if (variant === "fullWidth") {
        return (
            <section data-section-variant={variant} className={`${responsiveClass} ${sectionLayout.className} relative min-h-[360px] overflow-hidden rounded-[1.5rem] sm:min-h-[460px] md:rounded-[1.75rem]`} style={sectionLayout.style}>
                <img src={optimizeCloudinaryImage(image, { width: 1600, crop: "fill" })} alt="" width="1600" height="900" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${focalPoint.x}% ${focalPoint.y}%` }} />
                <div className="absolute inset-0 bg-slate-950/55" aria-hidden="true" />
                <div className="relative z-10 flex min-h-[360px] items-end p-6 text-white sm:min-h-[460px] sm:p-10 [&_*]:!text-white"><StoryCopy section={section} colors={colors} /></div>
            </section>
        );
    }

    const imageRight = variant === "imageRight";
    const editorial = variant === "editorial";
    return (
        <section data-section-variant={variant} className={`${responsiveClass} ${sectionLayout.className} overflow-hidden rounded-[1.5rem] border border-slate-200 shadow-sm md:rounded-[1.75rem]`} style={baseStyle}>
            <div className={`grid lg:grid-cols-2 ${editorial ? "lg:grid-cols-[1.25fr_0.75fr]" : ""}`}>
                <div className={`relative min-h-64 bg-slate-100 ${imageRight ? "lg:order-2" : ""}`}><img src={optimizeCloudinaryImage(image, { width: 1000, crop: "fill" })} alt="" width="1000" height="800" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${focalPoint.x}% ${focalPoint.y}%` }} /></div>
                <div className={`flex items-center p-6 sm:p-8 lg:p-12 ${imageRight ? "lg:order-1" : ""} ${editorial ? "lg:-ml-10 lg:my-10 lg:relative lg:z-10 lg:rounded-l-[1.75rem] lg:bg-white lg:shadow-xl" : ""}`}><StoryCopy section={section} colors={colors} /></div>
            </div>
        </section>
    );
}

export function CollectionVariantSection({ section, products, responsiveClass, sectionLayout, contentGapClass, colors, productCard, storewideDiscount, onProductAdd, onProductBuyNow, onWishlistToggle, isProductWishlisted, LinkComponent }) {
    const variant = section.settings?.variant || "grid";
    if (!products.length) return null;
    const mosaic = variant === "mosaic" && products.length >= 3;
    const gridClass = mosaic ? "grid-cols-2 lg:grid-cols-4" : variant === "spacious" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 lg:grid-cols-3";
    return (
        <section data-section-variant={mosaic ? "mosaic" : variant === "mosaic" ? "grid" : variant} className={`${responsiveClass} ${sectionLayout.className}`} style={sectionLayout.style}>
            <SectionHeading title={section.title || "Collection"} subtitle={variant === "spacious" ? "A considered edit from this store" : ""} colors={colors} />
            <div className={`mt-5 grid ${contentGapClass} ${gridClass}`}>
                {products.slice(0, variant === "spacious" ? 6 : 8).map((product, index) => (
                    <div key={product._id} className={mosaic && index === 0 ? "col-span-2 lg:row-span-2" : ""}>
                        <ProductCard product={product} index={index} storewideDiscount={storewideDiscount} productCard={productCard} onProductAdd={onProductAdd} onProductBuyNow={onProductBuyNow} onWishlistToggle={onWishlistToggle} isWishlisted={isProductWishlisted} LinkComponent={LinkComponent} />
                    </div>
                ))}
            </div>
        </section>
    );
}

export function TextualVariantSection({ section, responsiveClass, sectionLayout, colors }) {
    const variant = section.settings?.variant || "boxed";
    const isNewsletter = section.type === "Newsletter";
    const isPromo = section.type === "PromoBlock";
    const title = section.title || (isNewsletter ? "Store updates" : isPromo ? "Store promotion" : "Store update");
    const text = section.settings?.text;
    if (variant === "minimal") {
        return <section data-section-variant={variant} className={`${responsiveClass} ${sectionLayout.className} border-y border-slate-200 py-6 text-center`} style={sectionLayout.style}><SectionHeading title={title} subtitle={text} colors={colors} centered /></section>;
    }
    if (variant === "fullWidth" || variant === "strip") {
        return <section data-section-variant={variant} className={`${responsiveClass} ${sectionLayout.className} flex flex-col items-center justify-between gap-4 rounded-xl bg-[var(--sf-accent-bg)] px-5 py-6 text-center sm:flex-row sm:text-left`} style={sectionLayout.style}><div className="min-w-0"><SectionHeading title={title} subtitle={text} colors={colors} /></div>{isNewsletter && <Mail className="shrink-0 text-[var(--sf-accent)]" size={28} aria-hidden="true" />}</section>;
    }
    if (variant === "split") {
        return <section data-section-variant={variant} className={`${responsiveClass} ${sectionLayout.className} grid gap-5 rounded-[1.5rem] border border-slate-200 p-6 shadow-sm sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center`} style={{ ...sectionLayout.style, backgroundColor: colors.background || "var(--sf-section-background)" }}><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--sf-accent-bg)] text-[var(--sf-accent)]"><Sparkles size={24} /></span><SectionHeading title={title} subtitle={text} colors={colors} /></section>;
    }
    return <section data-section-variant="boxed" className={`${responsiveClass} ${sectionLayout.className} rounded-[1.5rem] border border-slate-200 p-5 text-center shadow-sm sm:p-10 md:rounded-[1.75rem]`} style={{ ...sectionLayout.style, backgroundColor: colors.background || "var(--sf-section-background)" }}><SectionHeading title={title} subtitle={text} colors={colors} centered /></section>;
}

export function BannerVariantSection({ section, activeImage, setActiveImage, responsiveClass, sectionLayout, colors, LinkComponent }) {
    const settings = section.settings || {};
    const mobileSettings = section.mobileSettings || {};
    const variant = settings.variant || "overlay";
    const desktopImages = normalizeImageList(settings.desktopImages || [], settings.desktopImage, settings.image);
    const mobileImages = normalizeImageList(settings.mobileImages || [], settings.mobileImage, mobileSettings.image);
    const images = desktopImages.length ? desktopImages : mobileImages;
    const mobileDisplayImages = mobileImages.length ? mobileImages : images;
    const imageIndex = images.length ? activeImage % images.length : 0;
    const imageUrl = images[imageIndex] || "";
    const mobileImageUrl = mobileDisplayImages.length ? mobileDisplayImages[activeImage % mobileDisplayImages.length] : imageUrl;
    const media = (
        <div className="relative min-h-[220px] overflow-hidden bg-slate-100 sm:min-h-[280px] lg:min-h-[320px]">
            {mobileImageUrl && mobileImageUrl !== imageUrl && <img src={optimizeCloudinaryImage(mobileImageUrl, { width: 760, crop: "fill" })} alt="" width="760" height="520" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover md:hidden" style={{ objectPosition: `${mobileSettings.focalPoint?.x ?? settings.focalPoint?.x ?? 50}% ${mobileSettings.focalPoint?.y ?? settings.focalPoint?.y ?? 50}%` }} />}
            {imageUrl && <img src={optimizeCloudinaryImage(imageUrl, { width: 1600, crop: "fill" })} alt="" width="1600" height="700" loading="lazy" decoding="async" className={`${mobileImageUrl && mobileImageUrl !== imageUrl ? "hidden md:block" : ""} absolute inset-0 h-full w-full object-cover`} style={{ objectPosition: `${settings.focalPoint?.x ?? 50}% ${settings.focalPoint?.y ?? 50}%` }} />}
            {images.length > 1 && <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2" onClick={event => event.preventDefault()}><button type="button" onClick={() => setActiveImage(previous => (previous - 1 + images.length) % images.length)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-950 shadow-sm" aria-label="Previous banner image"><ChevronLeft size={16} /></button><button type="button" onClick={() => setActiveImage(previous => (previous + 1) % images.length)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-950 shadow-sm" aria-label="Next banner image"><ChevronRight size={16} /></button></div>}
        </div>
    );
    const buttonClass = variant === "minimal"
        ? "bg-slate-950 text-white"
        : "bg-white text-slate-950";
    const copy = <div><h2 className="text-2xl font-black leading-tight sm:text-4xl" style={headingStyle}>{settings.title || section.title || "Promotional banner"}</h2>{settings.subtitle && <p className="mt-3 max-w-xl text-sm leading-6 opacity-80 sm:text-base">{settings.subtitle}</p>}{settings.buttonText && <span className={`mt-5 inline-flex w-fit rounded-full px-5 py-3 text-sm font-black ${buttonClass}`}>{settings.buttonText}</span>}</div>;

    if (variant === "split") return <section data-section-variant={variant} className={`${responsiveClass} ${sectionLayout.className}`} style={sectionLayout.style}><LinkSlot LinkComponent={LinkComponent} href={settings.buttonLink || "#products"} className="grid overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950 text-white shadow-sm lg:grid-cols-2"><div className="flex items-center p-6 sm:p-8 lg:p-10">{copy}</div>{media}</LinkSlot></section>;
    if (variant === "minimal") return <section data-section-variant={variant} className={`${responsiveClass} ${sectionLayout.className}`} style={sectionLayout.style}><LinkSlot LinkComponent={LinkComponent} href={settings.buttonLink || "#products"} className="grid items-center gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[minmax(0,1fr)_220px]"><div className="text-slate-950">{copy}</div><div className="overflow-hidden rounded-xl [&>div]:!min-h-32">{media}</div></LinkSlot></section>;
    return <section data-section-variant="overlay" className={`${responsiveClass} ${sectionLayout.className}`} style={sectionLayout.style}><LinkSlot LinkComponent={LinkComponent} href={settings.buttonLink || "#products"} className="group relative block min-h-[220px] overflow-hidden rounded-[1.5rem] shadow-sm sm:min-h-[280px] sm:rounded-[1.75rem] lg:min-h-[320px]" style={{ backgroundColor: colors.bannerOverlay || "var(--sf-section-banner-overlay)" }}><div className="absolute inset-0">{media}</div><div className="absolute inset-0 bg-gradient-to-r from-slate-950/78 via-slate-950/36 to-transparent" /><div className="relative z-10 flex min-h-[220px] max-w-2xl flex-col justify-end p-5 text-white sm:min-h-[280px] sm:p-8 lg:min-h-[320px] lg:p-10" style={{ color: colors.bannerText || "var(--sf-section-banner-text)" }}>{copy}</div></LinkSlot></section>;
}
