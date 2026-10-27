"use client";
import { useCallback, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useCart }    from '@/context/CartContext';
import { useAuth }    from '@/context/AuthContext';
import { useRouter }  from 'next/navigation';
import Link           from 'next/link';
import { ArrowLeft, ShoppingCart } from 'lucide-react';

import { useProductData }    from '@/hooks/useProductData';
import { trackStorefrontEvent } from '@/utils/analyticsTracker';
import { getImageUrlFromValue } from '@/lib/seo';

// Below-the-fold sections are lazily loaded — they're not needed for LCP
const ReviewSection   = lazy(() => import('./ReviewSection'));
const RelatedProducts = lazy(() => import('./RelatedProducts'));

import { getStorefrontPresentationVariant } from '@scaleup/storefront-theme';
import { useStorefrontTheme } from '@/components/storefront/StorefrontThemeProvider';
import { ProductDetailsView } from '@scaleup/storefront-renderer/presentation/ProductDetailsView';
import StorefrontPresentationRuntime from '@/components/storefront/StorefrontPresentationRuntime';

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
    const { theme } = useStorefrontTheme();
    const presentationVariant = getStorefrontPresentationVariant(theme);
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
            imageUrl: currentVariant?.image || getImageUrlFromValue(product.coverMediaId || product.imageUrl || product.images?.[0])
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

    return <StorefrontPresentationRuntime><ProductDetailsView
        presentationVariant={presentationVariant} product={product} currentVariant={currentVariant} displayStock={displayStock}
        baseOriginalPrice={baseOriginalPrice} displayDiscount={displayDiscount} displayFinalPrice={displayFinalPrice}
        availableAttributes={availableAttributes} selectedAttributes={selectedAttributes} handleVariantSelect={handleVariantSelect}
        quantity={quantity} setQuantity={setQuantity} handleAddToCart={handleAddToCart} handleBuyNow={handleBuyNow}
        relatedContent={<Suspense fallback={null}><RelatedProducts subdomain={subdomain} products={relatedProducts} presentationVariant={presentationVariant} productCard={{ ...theme.productCard, colors: theme.colors?.productCard }} /></Suspense>} reviewContent={<Suspense fallback={<div className="mt-24 h-64 rounded-3xl bg-gray-50 animate-pulse" />}><ReviewSection presentationVariant={presentationVariant} subdomain={subdomain} id={id} isLoggedIn={isLoggedIn} reviews={reviews} onReviewSuccess={refreshProductStats} /></Suspense>}
    /></StorefrontPresentationRuntime>;
}
