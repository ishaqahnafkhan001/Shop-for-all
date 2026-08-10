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
    getResponsiveImageSrcSet,
    imageAspectClasses,
    imageRadiusClasses,
    isPreviewMobile,
    LinkSlot,
    optimizeCloudinaryImage,
    priceSizeClasses,
    resolveCardAlignment,
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
    previewDevice,
}) {
    const price = getPrice(product);
    const originalPrice = product.compareAtPrice || product.pricing?.compareAtPrice || product.sellingPrice || product.pricing?.sellingPrice || price;
    void storewideDiscount;
    const activeDiscount = originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;
    const hasDiscount = activeDiscount > 0;
    const stock = product.stock ?? product.totalStock ?? 0;
    const rating = Number(product.averageRating || 0);
    const reviewCount = Math.max(Number(product.numReviews || 0), 0);
    const showReviews = productCard?.showReviews !== false && reviewCount > 0;
    const showRating = productCard?.showRating !== false && showReviews && rating > 0;
    const wishlisted = typeof isWishlisted === "function" ? isWishlisted(product) : Boolean(isWishlisted);
    const imageUrl = getImageUrl(product);
    const [imageFailed, setImageFailed] = useState(false);
    const cardRadiusClass = cardRadiusClasses[productCard?.borderRadius || "Rounded"] || cardRadiusClasses.Rounded;
    const imageRadiusClass = imageRadiusClasses[productCard?.imageRadius || "Rounded"] || imageRadiusClasses.Rounded;
    const shadowClass = cardShadowClasses[productCard?.shadow || "Soft"] || cardShadowClasses.Soft;
    const aspectClass = imageAspectClasses[productCard?.aspectRatio || "Square"] || imageAspectClasses.Square;
    const forceMobilePreview = isPreviewMobile(previewDevice);
    const titleSize = productCard?.titleSize || "Medium";
    const priceSize = productCard?.priceSize || "Medium";
    const titleSizeClass = forceMobilePreview
        ? ({ Small: "text-xs", Medium: "text-sm", Large: "text-base" }[titleSize] || "text-sm")
        : (titleSizeClasses[titleSize] || titleSizeClasses.Medium);
    const priceSizeClass = forceMobilePreview
        ? ({ Small: "text-sm", Medium: "text-base", Large: "text-lg" }[priceSize] || "text-base")
        : (priceSizeClasses[priceSize] || priceSizeClasses.Medium);
    const buttonShapeClass = buttonShapeClasses[productCard?.buttonShape || "Pill"] || buttonShapeClasses.Pill;
    const cardAlignment = resolveCardAlignment(productCard?.cardAlignment);
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
    const imageFrameSpacing = imageRadiusClass === "rounded-none"
        ? ""
        : forceMobilePreview ? "m-2.5 mb-0" : "m-2.5 mb-0 sm:m-3 sm:mb-0";
    const cardContentClass = forceMobilePreview ? "p-3 pt-2.5" : "p-3 pt-2.5 sm:p-4 sm:pt-3";
    const wishlistClass = forceMobilePreview
        ? "right-2 top-2 h-10 w-10"
        : "right-2 top-2 h-10 w-10 sm:right-3 sm:top-3 sm:h-11 sm:w-11";
    const quickBuyButtonClass = forceMobilePreview
        ? "h-11 px-1.5 text-[11px]"
        : "h-11 px-1.5 text-[11px] min-[430px]:px-2 min-[430px]:text-xs sm:px-3 sm:text-sm";

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
            <LinkSlot LinkComponent={LinkComponent} href={`/products/${product.slug || product._id}`} prefetch={false} className="absolute inset-0 z-10" aria-label={`View ${product.title}`} />
            <div className={`relative overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 ring-1 ring-slate-900/5 ${aspectClass} ${imageFrameSpacing} ${imageRadiusClass}`}>
                {imageUrl && !imageFailed ? (
                    <img
                        src={optimizeCloudinaryImage(imageUrl, { width: 560 })}
                        srcSet={getResponsiveImageSrcSet(imageUrl, [180, 280, 360, 560])}
                        sizes="(max-width: 639px) calc((100vw - 44px) / 2), (max-width: 1023px) 30vw, (max-width: 1535px) 22vw, 280px"
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
                        className={`absolute z-20 flex items-center justify-center rounded-full bg-white/95 shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur transition hover:scale-105 ${wishlistClass}`}
                        style={{ color: wishlisted ? cardColors.wishlistActive : cardColors.wishlistIcon }}
                    >
                        <Heart size={16} fill={wishlisted ? "currentColor" : "none"} className="sm:h-[18px] sm:w-[18px]" />
                    </button>
                )}
                {hasDiscount && productCard?.showDiscountBadge !== false && (
                    <span
                        className="absolute left-2 top-2 z-20 rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase text-white shadow-lg shadow-slate-950/20 ring-1 ring-white/40 sm:left-3 sm:top-3 sm:px-3 sm:text-[11px]"
                        style={{
                            backgroundColor: cardColors.saleBadgeBackground,
                            backgroundImage: "linear-gradient(rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.3))",
                        }}
                    >
                        {activeDiscount}% off
                    </span>
                )}
            </div>
            <div className={`flex flex-1 flex-col ${cardContentClass} ${cardAlignment.textClass}`}>
                <h3 className={`line-clamp-2 min-h-[2.25em] leading-snug ${titleSizeClass}`} style={{ fontWeight: productCard?.titleWeight || 800, color: cardColors.title }}>{product.title}</h3>
                <div className="mt-2 min-w-0">
                    <p className={`${priceSizeClass} font-black`} style={{ color: cardColors.price }}>{formatPrice(price)}</p>
                    {hasDiscount && originalPrice > price && (
                        <p className="text-[11px] font-semibold line-through sm:text-xs" style={{ color: cardColors.compareAtPrice }}>{formatPrice(originalPrice)}</p>
                    )}
                </div>
                {showRating && (
                    <div className={`mt-2 flex min-w-0 items-center gap-1 text-[10px] font-bold leading-none sm:text-xs ${cardAlignment.flexClass}`}>
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
                        <span className="min-w-0 truncate" style={{ color: cardColors.ratingText }}>{rating.toFixed(1)} ({reviewCount})</span>
                    </div>
                )}
                {productCard?.showCategory !== false && product.category && (
                    <p className="mt-1 line-clamp-1 text-[11px] font-semibold capitalize sm:text-xs" style={{ color: cardColors.category }}>{product.category}</p>
                )}
                {(productCard?.showStock !== false || productCard?.showSku) && (
                    <div className={`mt-2.5 flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-500 sm:text-[11px] ${cardAlignment.flexClass}`}>
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
                    {productCard?.showQuickBuy !== false && (
                        <div className="relative z-20 grid w-full grid-cols-2 gap-2">
                            <button
                                type="button"
                                disabled={isOutOfStock}
                                onClick={handleAdd}
                                aria-label={`${stock > 0 ? "Add" : "Unavailable"} ${product.title} to cart`}
                                className={`inline-flex w-full min-w-0 items-center justify-center gap-1 whitespace-nowrap border font-black transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)] disabled:bg-slate-300 disabled:text-white ${quickBuyButtonClass} ${buttonShapeClass}`}
                                style={isOutOfStock
                                    ? { backgroundColor: cardColors.outOfStockBackground, borderColor: cardColors.outOfStockBackground, color: cardColors.outOfStockText }
                                    : buttonInlineStyle}
                            >
                                {!forceMobilePreview && <ShoppingBag size={14} className="hidden shrink-0 sm:block" />}
                                <span className="truncate">{isOutOfStock ? "Unavailable" : "Add"}</span>
                            </button>
                            {onProductBuyNow && (
                                <button
                                    type="button"
                                    disabled={isOutOfStock}
                                    onClick={handleBuyNow}
                                    aria-label={`${stock > 0 ? "Buy" : "Unavailable"} ${product.title} now`}
                                    className={`inline-flex w-full min-w-0 items-center justify-center gap-1 whitespace-nowrap border font-black shadow-md shadow-slate-950/15 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)] disabled:border-slate-300 disabled:bg-slate-300 ${quickBuyButtonClass} ${buttonShapeClass}`}
                                    style={isOutOfStock
                                        ? { backgroundColor: cardColors.outOfStockBackground, borderColor: cardColors.outOfStockBackground, color: cardColors.outOfStockText }
                                        : { backgroundColor: cardColors.buyNowBackground, borderColor: cardColors.buyNowBackground, color: cardColors.buyNowText }}
                                >
                                    {!forceMobilePreview && <Zap size={14} className="hidden shrink-0 sm:block" />}
                                    {forceMobilePreview ? (
                                        <span className="truncate">Buy</span>
                                    ) : (
                                        <>
                                            <span className="hidden truncate min-[480px]:inline">Buy Now</span>
                                            <span className="truncate min-[480px]:hidden">Buy</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
});
