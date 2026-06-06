"use client";
import React, { useCallback, lazy, Suspense } from 'react';
import { useCart }    from '@/context/CartContext';
import { useAuth }    from '@/context/AuthContext';
import { useRouter }  from 'next/navigation';
import Link           from 'next/link';
import { ArrowLeft, ShoppingCart } from 'lucide-react';

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
        });
    }, [addToCart, product, currentVariant, displayFinalPrice]);

    const handleBuyNow = useCallback(() => {
        handleAddToCart();
        router.push('/checkout');
    }, [handleAddToCart, router]);

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

    return (
        <div className="relative overflow-hidden bg-white">
            {/* Decorative blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-[var(--sf-accent)]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-gradient-to-bl from-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="container mx-auto px-4 py-12 max-w-7xl relative z-10">

                {/* Back link */}
                <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-[var(--sf-accent)] mb-8 transition-colors group">
                    <div className="bg-gray-100 p-2 rounded-full mr-3 group-hover:bg-[var(--sf-accent)] group-hover:text-white transition-colors">
                        <ArrowLeft size={16} />
                    </div>
                    Continue Shopping
                </Link>

                {/* ── ABOVE THE FOLD: images + product details ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
                    <ProductImageGallery
                        images={currentVariant?.image ? [currentVariant.image, ...product.images.filter(image => image !== currentVariant.image)] : product.images}
                        category={product.category}
                        displayDiscount={displayDiscount}
                    />

                    <div className="flex flex-col justify-start py-2">
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
                            onSelect={handleAttributeSelect}
                        />

                        <ActionButtons
                            displayStock={displayStock}
                            onAddToCart={handleAddToCart}
                            onBuyNow={handleBuyNow}
                        />
                    </div>
                </div>

                {/* ── BELOW THE FOLD: features, specs, notes ── */}
                <div className="mt-24 flex flex-col lg:flex-row gap-12 lg:gap-20 pt-16 border-t border-gray-100">
                    <div className="flex-1 space-y-20">
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
        </div>
    );
}
