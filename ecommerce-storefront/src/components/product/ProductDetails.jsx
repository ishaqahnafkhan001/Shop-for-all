"use client";
import React, { useCallback, lazy, Suspense, useState } from 'react';
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

// Below-the-fold sections are lazily loaded — they're not needed for LCP
const ReviewSection   = lazy(() => import('./ReviewSection'));
const RelatedProducts = lazy(() => import('./RelatedProducts'));

/* ─── Loading skeleton ───────────────────────────────────────── */
function PageSpinner() {
    return (
        <div className="flex h-[70vh] items-center justify-center bg-gray-50/50">
            <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-gray-200" />
                <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-4 border-[var(--sf-accent)] border-t-transparent animate-spin" />
            </div>
        </div>
    );
}

/* ─── Page component ─────────────────────────────────────────── */
export default function ProductDetails({ params }) {
    const { subdomain, id } = React.use(params);
    const { addToCart }     = useCart();
    const { user }          = useAuth();
    const router            = useRouter();
    const isLoggedIn        = !!user;
    const [quantity, setQuantity] = useState(1);

    const {
        product, relatedProducts, reviews,
        loading, error,
        selectedAttributes, availableAttributes, currentVariant,
        displayStock, baseOriginalPrice, displayDiscount, displayFinalPrice,
        handleAttributeSelect, refreshProductStats,
    } = useProductData(subdomain, id);

    /* Stable cart handlers — won't cause child re-renders */
    const handleAddToCart = useCallback(() => {
        addToCart({
            ...product,
            selectedVariant: currentVariant,
            variantId: currentVariant?._id,
            sku: currentVariant?.sku,
            finalPrice: displayFinalPrice,
            cartPrice: displayFinalPrice,
            imageUrl: currentVariant?.image || product.images?.[0]
        }, quantity);
    }, [addToCart, product, currentVariant, displayFinalPrice, quantity]);

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
            <div className="flex flex-col items-center justify-center h-[70vh] space-y-6 bg-gray-50/30">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                    <ShoppingCart size={40} className="text-gray-300" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900">Product Not Found</h2>
                <Link href="/" className="inline-flex items-center px-6 py-3 bg-[var(--sf-accent)] text-white font-medium rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all">
                    <ArrowLeft size={18} className="mr-2" /> Back to Shop
                </Link>
            </div>
        );
    }

    const maxQuantity = Math.max(Number(displayStock) || 0, 1);
    const decreaseQuantity = () => setQuantity(prev => Math.max(1, prev - 1));
    const increaseQuantity = () => setQuantity(prev => Math.min(maxQuantity, prev + 1));

    return (
        <div className="sf-page pb-28 lg:pb-0">
            <div className="sf-shell-wide py-8 sm:py-10">

                {/* Back link */}
                <Link href="/" className="mb-6 inline-flex items-center text-sm font-bold text-slate-500 transition-colors hover:text-[var(--sf-accent)] group">
                    <div className="mr-3 rounded-full bg-white p-2 shadow-sm transition-colors group-hover:bg-[var(--sf-accent)] group-hover:text-white">
                        <ArrowLeft size={16} />
                    </div>
                    Continue Shopping
                </Link>

                {/* ── ABOVE THE FOLD: images + product details ── */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
                    <ProductImageGallery
                        images={currentVariant?.image ? [currentVariant.image, ...product.images.filter(image => image !== currentVariant.image)] : product.images}
                        category={product.category}
                        displayDiscount={displayDiscount}
                    />

                    <div className="sf-panel flex flex-col justify-start p-6 sm:p-8">
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

                        <VariantSelector
                            availableAttributes={availableAttributes}
                            selectedAttributes={selectedAttributes}
                            variants={product.variants}
                            onSelect={handleVariantSelect}
                        />

                        {displayStock > 0 && (
                            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
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
                </div>

                {/* ── BELOW THE FOLD: features, specs, notes ── */}
                <div className="mt-12 grid gap-8 border-t border-slate-200 pt-10 lg:grid-cols-[1fr_0.42fr]">
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
                    <div className="mx-auto flex max-w-xl items-center gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-black text-slate-950">{product.title}</p>
                            <p className="text-base font-black text-[var(--sf-accent)]">৳ {displayFinalPrice}</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleAddToCart}
                            className="sf-btn sf-btn-primary min-h-0 rounded-full px-5 py-3 text-sm"
                        >
                            <ShoppingCart size={17} />
                            Add
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
