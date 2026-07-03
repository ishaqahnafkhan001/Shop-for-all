/* eslint-disable @next/next/no-img-element */
"use client";

import { memo, useEffect, useState } from "react";
import { Heart, ShoppingBag, Zap, Star } from "lucide-react";

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

export const ProductCard = memo(function ProductCard({
    product,
    index,
    storewideDiscount,
    productCard,
    onProductAdd,
    onProductBuyNow,
    onWishlistToggle,
    isWishlisted,
    LinkComponent,
}) {
    const activeDiscount = product.discount > 0 ? product.discount : (product.pricing?.discount > 0 ? product.pricing.discount : (storewideDiscount || 0));
    const hasDiscount = activeDiscount > 0;
    const stock = product.stock ?? product.totalStock ?? 0;
    const price = getPrice(product);
    const originalPrice = product.sellingPrice || product.pricing?.sellingPrice || price;
    const rating = Number(product.averageRating || 0);
    const showRatingRow = productCard?.showRating !== false;
    const showRating = showRatingRow && rating > 0;
    const showReviews = productCard?.showReviews !== false && Number(product.numReviews || 0) > 0;
    const wishlisted = typeof isWishlisted === "function" ? isWishlisted(product) : Boolean(isWishlisted);
    const imageUrl = getImageUrl(product);
    const [imageFailed, setImageFailed] = useState(false);
    const cardRadiusClass = cardRadiusClasses[productCard?.borderRadius || "Rounded"] || cardRadiusClasses.Rounded;
    const imageRadiusClass = imageRadiusClasses[productCard?.imageRadius || "Rounded"] || imageRadiusClasses.Rounded;
    const shadowClass = cardShadowClasses[productCard?.shadow || "Soft"] || cardShadowClasses.Soft;
    const aspectClass = imageAspectClasses[productCard?.aspectRatio || "Square"] || imageAspectClasses.Square;
    const titleSizeClass = titleSizeClasses[productCard?.titleSize || "Medium"] || titleSizeClasses.Medium;
    const priceSizeClass = priceSizeClasses[productCard?.priceSize || "Medium"] || priceSizeClasses.Medium;
    const buttonShapeClass = buttonShapeClasses[productCard?.buttonShape || "Pill"] || buttonShapeClasses.Pill;
    const productCardColors = productCard?.colors || {};
    const cardColors = {
        background: productCardColors.background || "var(--sf-product-card-background)",
        border: productCardColors.border || "var(--sf-product-card-border)",
        title: productCardColors.title || "var(--sf-product-card-title)",
        category: productCardColors.category || "var(--sf-product-card-category)",
        price: productCardColors.price || "var(--sf-product-card-price)",
        compareAtPrice: productCardColors.compareAtPrice || "var(--sf-product-card-compare-at-price)",
        saleBadgeBackground: productCardColors.saleBadgeBackground || "var(--sf-product-card-sale-badge-bg)",
        saleBadgeText: productCardColors.saleBadgeText || "var(--sf-product-card-sale-badge-text)",
        ratingStar: productCardColors.ratingStar || "var(--sf-product-card-rating-star)",
        ratingText: productCardColors.ratingText || "var(--sf-product-card-rating-text)",
        wishlistIcon: productCardColors.wishlistIcon || "var(--sf-product-card-wishlist-icon)",
        wishlistActive: productCardColors.wishlistActive || "var(--sf-product-card-wishlist-active)",
        addToCartBackground: productCardColors.addToCartBackground || "var(--sf-product-card-add-to-cart-bg)",
        addToCartText: productCardColors.addToCartText || "var(--sf-product-card-add-to-cart-text)",
        buyNowBackground: productCardColors.buyNowBackground || "var(--sf-product-card-buy-now-bg)",
        buyNowText: productCardColors.buyNowText || "var(--sf-product-card-buy-now-text)",
        outOfStockBackground: productCardColors.outOfStockBackground || "var(--sf-product-card-out-of-stock-bg)",
        outOfStockText: productCardColors.outOfStockText || "var(--sf-product-card-out-of-stock-text)",
        stockBackground: productCardColors.stockBackground || "var(--sf-product-card-stock-bg)",
        stockText: productCardColors.stockText || "var(--sf-product-card-stock-text)",
    };
    const imageFitClass = productCard?.imageFit === "Contain" ? "object-contain" : "object-cover";
    const imagePaddingClass = productCard?.imageFit === "Contain" ? "p-3" : "";
    const buttonStyle = productCard?.buttonStyle || "Solid";
    const buttonInlineStyle = buttonStyle === "Solid"
        ? { backgroundColor: cardColors.addToCartBackground, color: cardColors.addToCartText, borderColor: cardColors.addToCartBackground }
        : { color: cardColors.addToCartBackground, borderColor: buttonStyle === "Ghost" ? "transparent" : cardColors.addToCartBackground, backgroundColor: buttonStyle === "Ghost" ? "transparent" : "#ffffff" };
    const stockText = stock > 0 ? `${stock} in stock` : "Out of stock";
    const sku = product.sku || product.variants?.[0]?.sku || (product._id ? `ID ${String(product._id).slice(-6)}` : "");
    const isOutOfStock = stock <= 0;
    const imageFrameSpacing = imageRadiusClass === "rounded-none" ? "" : "m-2.5 mb-0 sm:m-3 sm:mb-0";

    useEffect(() => {
        setImageFailed(false);
    }, [imageUrl]);

    const handleAdd = (event) => {
        event.preventDefault();
        event.stopPropagation();
        onProductAdd(product);
    };

    const handleBuyNow = (event) => {
        event.preventDefault();
        event.stopPropagation();
        onProductBuyNow?.(product);
    };

    const handleWishlist = (event) => {
        event.preventDefault();
        event.stopPropagation();
        onWishlistToggle?.(product);
    };

    return (
        <article
            className={`group relative flex min-h-full min-w-0 flex-col overflow-hidden border transition duration-300 ease-out hover:-translate-y-1 hover:border-[var(--sf-card-hover-border)] ${cardRadiusClass} ${shadowClass}`}
            style={{
                animationDelay: `${(index % 8) * 35}ms`,
                backgroundColor: cardColors.background,
                borderColor: cardColors.border,
            }}
        >
            <LinkSlot LinkComponent={LinkComponent} href={`/products/${product.slug || product._id}`} className="absolute inset-0 z-10" aria-label={`View ${product.title}`} />
            <div className={`relative overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 ring-1 ring-slate-900/5 ${aspectClass} ${imageFrameSpacing} ${imageRadiusClass}`}>
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
                    <button
                        type="button"
                        onClick={handleWishlist}
                        aria-pressed={wishlisted}
                        aria-label={`${wishlisted ? "Remove" : "Save"} ${product.title} ${wishlisted ? "from" : "to"} wishlist`}
                        className="absolute right-2 top-2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur transition hover:scale-105 sm:right-3 sm:top-3 sm:h-11 sm:w-11"
                        style={{ color: wishlisted ? cardColors.wishlistActive : cardColors.wishlistIcon }}
                    >
                        <Heart size={16} fill={wishlisted ? "currentColor" : "none"} className="sm:h-[18px] sm:w-[18px]" />
                    </button>
                )}
                {hasDiscount && productCard?.showDiscountBadge !== false && (
                    <span className="absolute left-2 top-2 z-20 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide shadow-sm sm:left-3 sm:top-3 sm:px-2.5 sm:text-[10px]" style={{ backgroundColor: cardColors.saleBadgeBackground, color: cardColors.saleBadgeText }}>
                        {activeDiscount}% off
                    </span>
                )}
            </div>
            <div className="flex flex-1 flex-col p-3 pt-2.5 sm:p-4 sm:pt-3">
                {showRatingRow && (
                    <div className="mb-2 flex min-w-0 items-center justify-between gap-1 text-[10px] font-bold leading-none sm:text-xs">
                        {showRating ? (
                            <>
                                <span className="flex shrink-0 items-center gap-0.5" style={{ color: cardColors.ratingStar }}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            size={11}
                                            fill={star <= Math.round(rating) ? "currentColor" : "none"}
                                            className={star <= Math.round(rating) ? "" : "text-slate-300"}
                                        />
                                    ))}
                                </span>
                                <span className="min-w-0 truncate" style={{ color: cardColors.ratingText }}>{rating.toFixed(1)}{showReviews ? ` (${product.numReviews})` : ""}</span>
                            </>
                        ) : (
                            <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-slate-50 px-1.5 py-1 ring-1 ring-slate-900/5" style={{ color: cardColors.ratingText }}>
                                <Star size={11} />
                                <span className="truncate">No reviews yet</span>
                            </span>
                        )}
                    </div>
                )}
                <h3 className={`line-clamp-2 min-h-[2.25em] leading-snug ${titleSizeClass}`} style={{ fontWeight: productCard?.titleWeight || 800, color: cardColors.title }}>{product.title}</h3>
                {productCard?.showCategory !== false && product.category && (
                    <p className="mt-1 line-clamp-1 text-[11px] font-semibold capitalize sm:text-xs" style={{ color: cardColors.category }}>{product.category}</p>
                )}
                {(productCard?.showStock !== false || productCard?.showSku) && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-500 sm:text-[11px]">
                        {productCard?.showStock !== false && (
                            <p
                                className="max-w-full truncate rounded-full px-2.5 py-1.5 leading-none"
                                style={{
                                    backgroundColor: stock > 0 ? cardColors.stockBackground : cardColors.outOfStockBackground,
                                    color: stock > 0 ? cardColors.stockText : cardColors.outOfStockText,
                                }}
                            >
                                {stockText}
                            </p>
                        )}
                        {productCard?.showSku && sku && <p className="hidden max-w-full truncate rounded-full bg-slate-50 px-2 py-1 text-slate-400 sm:block">SKU: {sku}</p>}
                    </div>
                )}
                <div className="mt-auto flex flex-col gap-3 pt-4">
                    <div className="min-w-0">
                        <p className={`${priceSizeClass} font-black`} style={{ color: cardColors.price }}>{formatPrice(price)}</p>
                        {hasDiscount && originalPrice > price && (
                            <p className="text-[11px] font-semibold line-through sm:text-xs" style={{ color: cardColors.compareAtPrice }}>{formatPrice(originalPrice)}</p>
                        )}
                    </div>
                    {productCard?.showQuickBuy !== false && (
                        <div className="relative z-20 grid w-full grid-cols-2 gap-2">
                            <button
                                type="button"
                                disabled={isOutOfStock}
                                onClick={handleAdd}
                                aria-label={`${stock > 0 ? "Add" : "Unavailable"} ${product.title} to cart`}
                                className={`inline-flex h-10 w-full min-w-0 items-center justify-center gap-1 whitespace-nowrap border px-1.5 text-[11px] font-black shadow-sm transition hover:-translate-y-0.5 disabled:bg-slate-300 disabled:text-white min-[430px]:h-11 min-[430px]:px-2 min-[430px]:text-xs sm:h-11 sm:px-3 sm:text-sm ${buttonShapeClass}`}
                                style={isOutOfStock
                                    ? { backgroundColor: cardColors.outOfStockBackground, borderColor: cardColors.outOfStockBackground, color: cardColors.outOfStockText }
                                    : buttonInlineStyle}
                            >
                                <ShoppingBag size={14} className="hidden shrink-0 sm:block" />
                                <span className="truncate">{isOutOfStock ? "Unavailable" : "Add"}</span>
                            </button>
                            {onProductBuyNow && (
                                <button
                                    type="button"
                                    disabled={isOutOfStock}
                                    onClick={handleBuyNow}
                                    aria-label={`${stock > 0 ? "Buy" : "Unavailable"} ${product.title} now`}
                                    className={`inline-flex h-10 w-full min-w-0 items-center justify-center gap-1 whitespace-nowrap border px-1.5 text-[11px] font-black shadow-sm transition hover:-translate-y-0.5 disabled:border-slate-300 disabled:bg-slate-300 min-[430px]:h-11 min-[430px]:px-2 min-[430px]:text-xs sm:h-11 sm:px-3 sm:text-sm ${buttonShapeClass}`}
                                    style={isOutOfStock
                                        ? { backgroundColor: cardColors.outOfStockBackground, borderColor: cardColors.outOfStockBackground, color: cardColors.outOfStockText }
                                        : { backgroundColor: cardColors.buyNowBackground, borderColor: cardColors.buyNowBackground, color: cardColors.buyNowText }}
                                >
                                    <Zap size={14} className="hidden shrink-0 sm:block" />
                                    <span className="truncate max-[379px]:hidden">Buy Now</span>
                                    <span className="hidden truncate max-[379px]:inline">Buy</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
});
