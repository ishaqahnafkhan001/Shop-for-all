/* eslint-disable @next/next/no-img-element */
import { ArrowUpRight, Heart, ShoppingBag, Star } from 'lucide-react';
import { formatPrice, getCardImageAlt, getResponsiveImageSrcSet, LinkSlot, optimizeCloudinaryImage } from '../reference/referenceCore';

// Values and action callbacks are prepared by ProductCard, never recalculated here.
export function AtelierProductCard({ product, index = 0, config, model, LinkComponent }) {
    const { price, originalPrice, activeDiscount, hasDiscount, stockText, isOutOfStock, rating, reviewCount, showRating, showReviews, sku, wishlisted, imageUrl, imageFailed, onImageError, handleAdd, handleBuyNow, handleWishlist, canBuyNow, cardColors, aspectClass, imageRadiusClass, cardAlignment, buttonInlineStyle, buttonShapeClass, titleSizeClass, priceSizeClass } = model;
    return <article className={`atelier-product-card ${cardAlignment.textClass} ${model.cardRadiusClass} ${model.shadowClass}`} style={{ '--atelier-card-field': ['var(--sf-atelier-peach)', 'var(--sf-atelier-mint)', 'var(--sf-atelier-lilac)', 'var(--sf-atelier-sage)'][index % 4], backgroundColor: cardColors.background, color: cardColors.title }}>
        <LinkSlot LinkComponent={LinkComponent} href={`/products/${product.slug || product._id}`} className={`atelier-product-media ${aspectClass} ${imageRadiusClass}`} aria-label={`View ${product.title}`}>
            {imageUrl && !imageFailed ? <img src={optimizeCloudinaryImage(imageUrl, { width: 640 })} srcSet={getResponsiveImageSrcSet(imageUrl, [180, 280, 360, 640])} sizes="(max-width: 767px) 46vw, (max-width: 1023px) 30vw, 24vw" alt={getCardImageAlt(product)} width="640" height="690" loading="lazy" decoding="async" onError={onImageError} style={{ objectFit: config?.imageFit === 'Contain' ? 'contain' : 'cover' }} className={config?.hoverZoom === false ? '' : 'atelier-zoom'} /> : <ShoppingBag size={36} aria-hidden="true" />}
            {hasDiscount && config?.showDiscountBadge !== false && <span className="atelier-sale-badge" style={{ background: cardColors.saleBadgeBackground, color: cardColors.saleBadgeText }}>{activeDiscount}% off</span>}
        </LinkSlot>
        <h3 className={titleSizeClass} style={{ fontWeight: config?.titleWeight || 700 }}><LinkSlot LinkComponent={LinkComponent} href={`/products/${product.slug || product._id}`}>{product.title}</LinkSlot></h3>
        <div className={`atelier-price-row ${cardAlignment.flexClass}`}><p className={priceSizeClass} style={{ color: cardColors.price }}>{formatPrice(price)}</p>{hasDiscount && originalPrice > price && <del style={{ color: cardColors.compareAtPrice }}>{formatPrice(originalPrice)}</del>}</div>
        {(showRating || showReviews) && <p className="atelier-card-meta" style={{ color: cardColors.ratingText }}>{showRating && <span style={{ color: cardColors.ratingStar }}><Star size={13} fill="currentColor" />{rating.toFixed(1)}</span>}{showReviews && <span>({reviewCount} reviews)</span>}</p>}
        {config?.showCategory !== false && product.category && <p className="atelier-card-meta" style={{ color: cardColors.category }}>{product.category}</p>}
        {config?.showStock !== false && <p className="atelier-card-meta" style={{ color: isOutOfStock ? cardColors.outOfStockText : cardColors.stockText }}>{stockText}</p>}
        {config?.showSku && sku && <p className="atelier-card-meta">SKU: {sku}</p>}
        <div className={`atelier-card-actions ${cardAlignment.flexClass}`}>
            {config?.showWishlist !== false && <button type="button" onClick={handleWishlist} aria-pressed={wishlisted} aria-label={`${wishlisted ? 'Remove' : 'Save'} ${product.title} ${wishlisted ? 'from' : 'to'} wishlist`} style={{ color: wishlisted ? cardColors.wishlistActive : cardColors.wishlistIcon }}><Heart size={18} fill={wishlisted ? 'currentColor' : 'none'} /></button>}
            {config?.showQuickBuy !== false && <>
                <button type="button" className={buttonShapeClass} style={buttonInlineStyle} onClick={handleAdd} disabled={isOutOfStock} aria-label={`${isOutOfStock ? 'Unavailable' : 'Add'} ${product.title} to cart`}>{isOutOfStock ? 'Unavailable' : '+ Bag'}</button>
                {canBuyNow && <button type="button" className={buttonShapeClass} style={{ backgroundColor: cardColors.buyNowBackground, color: cardColors.buyNowText }} onClick={handleBuyNow} disabled={isOutOfStock} aria-label={`${isOutOfStock ? 'Unavailable' : 'Buy'} ${product.title} now`}>Buy now<ArrowUpRight size={14} /></button>}
            </>}
        </div>
    </article>;
}
