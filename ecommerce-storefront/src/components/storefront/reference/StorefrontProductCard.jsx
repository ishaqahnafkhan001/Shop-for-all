/* eslint-disable @next/next/no-img-element */
"use client";

import { memo, useEffect, useState } from "react";
import { Heart, ShoppingBag, Star } from "lucide-react";

import {
    buttonShapeClasses,
    cardRadiusClasses,
    cardShadowClasses,
    formatPrice,
    getCardImageAlt,
    getImageUrl,
    getPrice,
    imageAspectClasses,
    imageRadiusClasses,
    LinkSlot,
    optimizeCloudinaryImage,
    priceSizeClasses,
    titleSizeClasses,
} from "./referenceCore";

export const ProductCard = memo(function ProductCard({ product, index, storewideDiscount, productCard, onProductAdd, LinkComponent }) {
    const activeDiscount = product.discount > 0 ? product.discount : (product.pricing?.discount > 0 ? product.pricing.discount : (storewideDiscount || 0));
    const hasDiscount = activeDiscount > 0;
    const stock = product.stock ?? product.totalStock ?? 0;
    const price = getPrice(product);
    const originalPrice = product.sellingPrice || product.pricing?.sellingPrice || price;
    const rating = Number(product.averageRating || 0);
    const showRating = productCard?.showRating !== false && rating > 0;
    const showReviews = productCard?.showReviews !== false && Number(product.numReviews || 0) > 0;
    const imageUrl = getImageUrl(product);
    const [imageFailed, setImageFailed] = useState(false);
    const cardRadiusClass = cardRadiusClasses[productCard?.borderRadius || "Rounded"] || cardRadiusClasses.Rounded;
    const imageRadiusClass = imageRadiusClasses[productCard?.imageRadius || "Rounded"] || imageRadiusClasses.Rounded;
    const shadowClass = cardShadowClasses[productCard?.shadow || "Soft"] || cardShadowClasses.Soft;
    const aspectClass = imageAspectClasses[productCard?.aspectRatio || "Square"] || imageAspectClasses.Square;
    const titleSizeClass = titleSizeClasses[productCard?.titleSize || "Medium"] || titleSizeClasses.Medium;
    const priceSizeClass = priceSizeClasses[productCard?.priceSize || "Medium"] || priceSizeClasses.Medium;
    const buttonShapeClass = buttonShapeClasses[productCard?.buttonShape || "Pill"] || buttonShapeClasses.Pill;
    const buttonColor = productCard?.buttonColor || "var(--sf-accent)";
    const priceColor = productCard?.priceColor || "var(--sf-price-color, #0f172a)";
    const imageFitClass = productCard?.imageFit === "Contain" ? "object-contain" : "object-cover";
    const imagePaddingClass = productCard?.imageFit === "Contain" ? "p-3" : "";
    const buttonStyle = productCard?.buttonStyle || "Solid";
    const buttonInlineStyle = buttonStyle === "Solid"
        ? { backgroundColor: buttonColor, color: "#ffffff", borderColor: buttonColor }
        : { color: buttonColor, borderColor: buttonStyle === "Ghost" ? "transparent" : buttonColor, backgroundColor: buttonStyle === "Ghost" ? "transparent" : "#ffffff" };
    const stockText = stock > 0 ? `${stock} in stock` : "Out of stock";
    const sku = product.sku || product.variants?.[0]?.sku || (product._id ? `ID ${String(product._id).slice(-6)}` : "");

    useEffect(() => {
        setImageFailed(false);
    }, [imageUrl]);

    const handleAdd = (event) => {
        event.preventDefault();
        event.stopPropagation();
        onProductAdd(product);
    };

    return (
        <article
            className={`group relative flex min-h-full min-w-0 flex-col overflow-hidden border transition duration-300 hover:-translate-y-1 hover:border-[var(--sf-card-hover-border)] ${cardRadiusClass} ${shadowClass}`}
            style={{
                animationDelay: `${(index % 8) * 35}ms`,
                backgroundColor: "var(--sf-card-background)",
                borderColor: "var(--sf-card-border)",
            }}
        >
            <LinkSlot LinkComponent={LinkComponent} href={`/products/${product.slug || product._id}`} className="absolute inset-0 z-10" aria-label={`View ${product.title}`} />
            <div className={`relative overflow-hidden bg-slate-100 ${aspectClass} ${imageRadiusClass === "rounded-none" ? "" : "m-1.5 mb-0 sm:m-3 sm:mb-0"} ${imageRadiusClass}`}>
                {imageUrl && !imageFailed ? (
                    <img
                        src={optimizeCloudinaryImage(imageUrl, { width: 560 })}
                        alt={getCardImageAlt(product)}
                        width="560"
                        height="560"
                        onError={() => setImageFailed(true)}
                        className={`h-full w-full ${imageFitClass} ${imagePaddingClass} transition-transform duration-500 ${productCard?.hoverZoom === false ? "" : "group-hover:scale-105"}`}
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300">
                        <ShoppingBag size={34} />
                    </div>
                )}
                {productCard?.showWishlist !== false && (
                    <button type="button" aria-label={`Save ${product.title} to wishlist`} className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-slate-500 shadow-sm backdrop-blur transition hover:text-[var(--sf-accent)] sm:right-3 sm:top-3 sm:h-9 sm:w-9">
                        <Heart size={14} className="sm:h-4 sm:w-4" />
                    </button>
                )}
                {hasDiscount && productCard?.showDiscountBadge !== false && (
                    <span className="absolute left-2 top-2 z-20 rounded-full bg-[var(--sf-sale-badge-bg)] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-[var(--sf-sale-badge-text)] sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[10px]">
                        {activeDiscount}% off
                    </span>
                )}
            </div>
            <div className="flex flex-1 flex-col p-2.5 pt-2 sm:p-4">
                {showRating && (
                    <div className="mb-1.5 flex min-w-0 items-center justify-between gap-1 text-[10px] font-bold sm:mb-2 sm:text-xs">
                        <span className="flex shrink-0 items-center gap-0.5 text-[var(--sf-rating-color)]">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    size={11}
                                    fill={star <= Math.round(rating) ? "currentColor" : "none"}
                                    className={star <= Math.round(rating) ? "" : "text-slate-300"}
                                />
                            ))}
                        </span>
                        <span className="min-w-0 truncate text-slate-400">{rating.toFixed(1)}{showReviews ? ` (${product.numReviews})` : ""}</span>
                    </div>
                )}
                <h3 className={`line-clamp-2 leading-snug text-slate-950 ${titleSizeClass}`} style={{ fontWeight: productCard?.titleWeight || 800 }}>{product.title}</h3>
                {productCard?.showCategory !== false && product.category && (
                    <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-slate-500 sm:text-xs">{product.category}</p>
                )}
                {(productCard?.showStock !== false || productCard?.showSku) && (
                    <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-bold text-slate-500 sm:text-[11px]">
                        {productCard?.showStock !== false && (
                            <p className={`max-w-full truncate rounded-full px-2 py-1 ${stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
                                {stockText}
                            </p>
                        )}
                        {productCard?.showSku && sku && <p className="hidden max-w-full truncate rounded-full bg-slate-50 px-2 py-1 text-slate-400 sm:block">SKU: {sku}</p>}
                    </div>
                )}
                <div className="mt-auto flex flex-col gap-2.5 pt-3 sm:flex-row sm:items-end sm:justify-between sm:gap-3 sm:pt-4">
                    <div className="min-w-0">
                        <p className={`${priceSizeClass} font-black`} style={{ color: priceColor }}>{formatPrice(price)}</p>
                        {hasDiscount && originalPrice > price && (
                            <p className="text-[11px] font-semibold text-slate-400 line-through sm:text-xs">{formatPrice(originalPrice)}</p>
                        )}
                    </div>
                    {productCard?.showQuickBuy !== false && (
                        <button
                            type="button"
                            disabled={stock <= 0}
                            onClick={handleAdd}
                            aria-label={`${stock > 0 ? "Add" : "Unavailable"} ${product.title} to cart`}
                            className={`relative z-20 inline-flex h-10 w-full items-center justify-center whitespace-nowrap border px-3 text-[11px] font-black shadow-sm transition hover:-translate-y-0.5 disabled:bg-slate-300 disabled:text-white sm:h-9 sm:w-auto sm:min-w-[96px] sm:px-4 sm:text-xs ${buttonShapeClass}`}
                            style={stock <= 0 ? undefined : buttonInlineStyle}
                        >
                            Add to Cart
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
});
