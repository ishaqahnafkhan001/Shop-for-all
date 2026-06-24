"use client";
import { useCallback, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useCart }    from '@/context/CartContext';
import { useAuth }    from '@/context/AuthContext';
import { useRouter }  from 'next/navigation';
import Link           from 'next/link';
import { ArrowLeft, Minus, Plus, ShoppingCart } from 'lucide-react';

import { useProductData }    from '@/hooks/useProductData';
import ProductImageGallery   from './ProductImageGallery';
import ProductInfo           from './ProductInfo';
import VariantSelector       from './VariantSelector';
import ActionButtons         from './ActionButtons';
import { ProductFeatures, ProductSpecifications, ExpertNotes } from './ProductExtras';
import { trackStorefrontEvent } from '@/utils/analyticsTracker';
import { getImageUrlFromValue } from '@/lib/seo';

// Below-the-fold sections are lazily loaded — they're not needed for LCP
const ReviewSection   = lazy(() => import('./ReviewSection'));
const RelatedProducts = lazy(() => import('./RelatedProducts'));

/* ─── Loading skeleton ───────────────────────────────────────── */
function PageSpinner() {
    return (
        <div className="sf-page">
            <div className="sf-shell-wide py-8 sm:py-10">
                <div className="mb-6 h-10 w-44 animate-pulse rounded-full bg-white" />
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.82fr)]">
                    <div className="aspect-[4/5] animate-pulse rounded-[2rem] border border-slate-200 bg-white shadow-sm sm:aspect-[5/4] lg:aspect-square" />
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                        <div className="h-5 w-40 animate-pulse rounded-full bg-slate-100" />
                        <div className="mt-5 h-20 animate-pulse rounded-3xl bg-slate-100" />
                        <div className="mt-5 h-28 animate-pulse rounded-3xl bg-slate-100" />
                        <div className="mt-5 h-52 animate-pulse rounded-3xl bg-slate-100" />
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Page component ─────────────────────────────────────────── */
export default function ProductDetails({ subdomain, id, initialProduct = null }) {
    const { addToCart }     = useCart();
    const { user }          = useAuth();
    const router            = useRouter();
    const isLoggedIn        = !!user;
    const [quantity, setQuantity] = useState(1);
    const trackedProductRef = useRef(null);

    const {
        product, relatedProducts, reviews,
        loading, error,
        selectedAttributes, availableAttributes, currentVariant,
        displayStock, baseOriginalPrice, displayDiscount, displayFinalPrice,
        handleAttributeSelect, refreshProductStats,
    } = useProductData(subdomain, id, initialProduct);
    const customerId = user?.role === 'Customer' ? (user._id || user.id) : null;

    useEffect(() => {
        if (!product?._id || trackedProductRef.current === product._id) return;

        trackedProductRef.current = product._id;
        trackStorefrontEvent({
            subdomain,
            eventType: 'product_view',
            customer_id: customerId,
            product_id: product._id,
            variant_id: currentVariant?._id,
            value: displayFinalPrice || product.finalPrice || product.sellingPrice || 0,
            metadata: {
                productTitle: product.title,
                category: product.category
            }
        });
    }, [customerId, currentVariant?._id, displayFinalPrice, product, subdomain]);

    /* Stable cart handlers — won't cause child re-renders */
    const handleAddToCart = useCallback(() => {
        addToCart({
            ...product,
            selectedVariant: currentVariant,
            variantId: currentVariant?._id,
            sku: currentVariant?.sku,
            finalPrice: displayFinalPrice,
            cartPrice: displayFinalPrice,
            imageUrl: currentVariant?.image || getImageUrlFromValue(product.images?.[0])
        }, quantity);

        trackStorefrontEvent({
            subdomain,
            eventType: 'add_to_cart',
            customer_id: customerId,
            product_id: product._id,
            variant_id: currentVariant?._id,
            value: displayFinalPrice || product.finalPrice || product.sellingPrice || 0,
            metadata: {
                productTitle: product.title,
                category: product.category,
                quantity,
                location: 'product_detail'
            }
        });
    }, [addToCart, customerId, product, currentVariant, displayFinalPrice, quantity, subdomain]);

    const handleBuyNow = useCallback(() => {
        handleAddToCart();
        router.push('/checkout');
    }, [handleAddToCart, router]);

    const handleVariantSelect = useCallback((name, value) => {
        setQuantity(1);
        handleAttributeSelect(name, value);
    }, [handleAttributeSelect]);

    /* ── Guards ── */
    if (loading) return <PageSpinner />;

    if (error || !product) {
        return (
            <div className="sf-page flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white shadow-sm">
                    <ShoppingCart size={40} className="text-slate-300" />
                </div>
                <h2 className="text-3xl font-black text-slate-950">Product not found</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    This product may be unavailable or the link may have changed. Return to the store to keep shopping.
                </p>
                <Link href="/" className="sf-btn sf-btn-primary mt-8 px-6">
                    <ArrowLeft size={18} /> Back to shop
                </Link>
            </div>
        );
    }

    const maxQuantity = Math.max(Number(displayStock) || 0, 1);
    const decreaseQuantity = () => setQuantity(prev => Math.max(1, prev - 1));
    const increaseQuantity = () => setQuantity(prev => Math.min(maxQuantity, prev + 1));
    const productImages = Array.isArray(product.images) ? product.images : [];
    const galleryImages = currentVariant?.image
        ? [currentVariant.image, ...productImages.filter(image => image !== currentVariant.image)]
        : productImages;

    return (
        <div className="sf-page pb-32 lg:pb-0">
            <div className="sf-shell-wide py-5 sm:py-8 lg:py-10">
                <Link href="/" className="mb-6 inline-flex items-center text-sm font-bold text-slate-500 transition-colors hover:text-[var(--sf-accent)] group">
                    <div className="mr-3 rounded-full bg-white p-2 shadow-sm transition-colors group-hover:bg-[var(--sf-accent)] group-hover:text-white">
                        <ArrowLeft size={16} />
                    </div>
                    Continue Shopping
                </Link>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.82fr)] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.72fr)]">
                    <ProductImageGallery
                        images={galleryImages}
                        category={product.category}
                        displayDiscount={displayDiscount}
                        productTitle={product.title}
                        imageAltText={product.imageAltText}
                    />

                    <aside className="lg:sticky lg:top-28">
                    <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-6 lg:rounded-[2.25rem] lg:p-7">
                        <ProductInfo
                            title={product.title}
                            averageRating={product.averageRating}
                            numReviews={product.numReviews}
                            currentVariant={currentVariant}
                            baseOriginalPrice={baseOriginalPrice}
                            displayFinalPrice={displayFinalPrice}
                            displayDiscount={displayDiscount}
                            description={product.description}
                        />

                        <div className="my-6 h-px bg-slate-200" />

                        <VariantSelector
                            availableAttributes={availableAttributes}
                            selectedAttributes={selectedAttributes}
                            variants={product.variants}
                            onSelect={handleVariantSelect}
                        />

                        {displayStock > 0 && (
                            <div className="my-5 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                                <div>
                                    <p className="text-sm font-black text-slate-950">Quantity</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">Choose how many units to add.</p>
                                </div>
                                <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <button
                                        type="button"
                                        onClick={decreaseQuantity}
                                        disabled={quantity <= 1}
                                        className="flex h-11 w-11 items-center justify-center text-slate-500 transition hover:bg-slate-100 disabled:opacity-35"
                                        aria-label="Decrease quantity"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <span className="flex h-11 w-12 items-center justify-center border-x border-slate-200 text-sm font-black text-slate-950">
                                        {quantity}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={increaseQuantity}
                                        disabled={quantity >= maxQuantity}
                                        className="flex h-11 w-11 items-center justify-center text-slate-500 transition hover:bg-slate-100 disabled:opacity-35"
                                        aria-label="Increase quantity"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <ActionButtons
                            displayStock={displayStock}
                            onAddToCart={handleAddToCart}
                            onBuyNow={handleBuyNow}
                        />
                    </div>
                    </aside>
                </div>

                <div className="mt-12 grid gap-6 border-t border-slate-200 pt-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
                    <div className="space-y-8">
                        <ProductFeatures    features={product.features} />
                        <ProductSpecifications specifications={product.specifications} />
                    </div>
                    <ExpertNotes comments={product.comments} />
                </div>

                {/* ── LAZY: reviews + related products ── */}
                <Suspense fallback={<div className="mt-24 h-64 rounded-3xl bg-gray-50 animate-pulse" />}>
                    <ReviewSection
                        subdomain={subdomain}
                        id={id}
                        isLoggedIn={isLoggedIn}
                        reviews={reviews}
                        onReviewSuccess={refreshProductStats}
                    />
                </Suspense>

                <Suspense fallback={null}>
                    <RelatedProducts subdomain={subdomain} products={relatedProducts} />
                </Suspense>
            </div>

            {displayStock > 0 && (
                <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
                    <div className="mx-auto grid max-w-xl gap-2 min-[390px]:grid-cols-[minmax(0,1fr)_auto] min-[390px]:items-center min-[390px]:gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-black text-slate-950">{product.title}</p>
                            <p className="text-base font-black text-[var(--sf-accent)]">৳ {displayFinalPrice}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 min-[390px]:flex">
                            <button
                                type="button"
                                onClick={handleAddToCart}
                                aria-label={`Add ${product.title} to cart`}
                                className="sf-btn sf-btn-secondary min-h-0 rounded-full px-4 py-3 text-sm"
                            >
                                <ShoppingCart size={17} />
                                <span>Add</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleBuyNow}
                                aria-label={`Buy ${product.title} now`}
                                className="sf-btn sf-btn-primary min-h-0 rounded-full px-4 py-3 text-sm"
                            >
                                Buy now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
