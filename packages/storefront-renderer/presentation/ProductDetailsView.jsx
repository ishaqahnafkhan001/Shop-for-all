"use client";
import { ArrowLeft, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Link } from './Runtime.jsx';
import ProductImageGallery from './ProductImageGallery.jsx';
import ProductInfo from './ProductInfo.jsx';
import VariantSelector from './VariantSelector.jsx';
import ActionButtons from './ActionButtons.jsx';
import { ProductInformationTabs } from './ProductExtras.jsx';
export function ProductDetailsView({ product, currentVariant, displayStock, baseOriginalPrice,
    displayDiscount, displayFinalPrice, availableAttributes, selectedAttributes, handleVariantSelect,
    quantity, setQuantity, handleAddToCart, handleBuyNow, relatedContent, reviewContent, presentationVariant, adaptiveParts = false }) {
    const atelier = presentationVariant === 'atelier-editorial';
    const maxQuantity = Math.max(Number(displayStock) || 0, 1);
    const decreaseQuantity = () => setQuantity(prev => Math.max(1, prev - 1));
    const increaseQuantity = () => setQuantity(prev => Math.min(maxQuantity, prev + 1));
    const productImages = Array.isArray(product.images) ? product.images : [];
    const galleryImages = currentVariant?.image
        ? [currentVariant.image, ...productImages.filter(image => image !== currentVariant.image)]
        : productImages;

    return (
        <div className={atelier ? "sf-page sf-mobile-action-page atelier-product" : "sf-page sf-mobile-action-page"}>
            <div className="sf-shell-wide py-5 sm:py-8 lg:py-10">
                <Link href="/" className="mb-6 inline-flex items-center text-sm font-bold text-slate-500 transition-colors hover:text-[var(--sf-accent)] group">
                    <div data-ab-surface={adaptiveParts ? '' : undefined} className="mr-3 rounded-full bg-white p-2 shadow-sm transition-colors group-hover:bg-[var(--sf-accent)] group-hover:text-white">
                        <ArrowLeft size={16} />
                    </div>
                    Continue Shopping
                </Link>

                <div data-ab-part={adaptiveParts ? 'layout' : undefined} data-ab-layout={adaptiveParts ? 'product' : undefined} data-atelier-part={atelier ? "product-grid" : undefined} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.82fr)] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.72fr)]">
                    <ProductImageGallery
                        adaptiveParts={adaptiveParts}
                        presentationVariant={presentationVariant}
                        images={galleryImages}
                        category={product.category}
                        displayDiscount={displayDiscount}
                        productTitle={product.title}
                        imageAltText={product.imageAltText}
                    />

                    <aside className="lg:sticky lg:top-28">
                    <div data-ab-part={adaptiveParts ? 'information' : undefined} data-ab-surface={adaptiveParts ? '' : undefined} data-atelier-part={atelier ? "purchase-panel" : undefined} className="rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-6 lg:rounded-[2.25rem] lg:p-7">
                        <ProductInfo
                            adaptiveParts={adaptiveParts}
                            presentationVariant={presentationVariant}
                            title={product.title}
                            averageRating={product.averageRating}
                            numReviews={product.numReviews}
                            currentVariant={currentVariant}
                            baseOriginalPrice={baseOriginalPrice}
                            displayFinalPrice={displayFinalPrice}
                            displayDiscount={displayDiscount}
                            description={product.description}
                        />

                        <div data-ab-surface={adaptiveParts ? '' : undefined} className="my-6 h-px bg-slate-200" />

                        <VariantSelector
                            adaptiveParts={adaptiveParts}
                            presentationVariant={presentationVariant}
                            availableAttributes={availableAttributes}
                            selectedAttributes={selectedAttributes}
                            variants={product.variants}
                            onSelect={handleVariantSelect}
                        />

                        {displayStock > 0 && (
                            <div data-ab-surface={adaptiveParts ? '' : undefined} data-ab-part={adaptiveParts ? 'quantity' : undefined} data-atelier-part={atelier ? "quantity" : undefined} className="my-5 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                                <div>
                                    <p className="text-sm font-black text-slate-950">Quantity</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">Choose how many units to add.</p>
                                </div>
                                <div data-ab-surface={adaptiveParts ? '' : undefined} className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <button data-ab-surface={adaptiveParts ? '' : undefined}
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
                                    <button data-ab-surface={adaptiveParts ? '' : undefined}
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
                            adaptiveParts={adaptiveParts}
                            presentationVariant={presentationVariant}
                            displayStock={displayStock}
                            onAddToCart={handleAddToCart}
                            onBuyNow={handleBuyNow}
                        />
                    </div>
                    </aside>
                </div>

                <div className="mt-12 border-t border-slate-200 pt-8">
                    <ProductInformationTabs adaptiveParts={adaptiveParts}
                        presentationVariant={presentationVariant}
                        features={product.features}
                        specifications={product.specifications}
                        comments={product.comments}
                    />
                </div>

                {relatedContent}
                {reviewContent}
            </div>

            {displayStock > 0 && (
                <div data-ab-surface={adaptiveParts ? '' : undefined} className="sf-mobile-action-bar fixed inset-x-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
                    <div className="mx-auto grid max-w-xl gap-2 min-[390px]:grid-cols-[minmax(0,1fr)_auto] min-[390px]:items-center min-[390px]:gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-black text-slate-950">{product.title}</p>
                            <p className="text-base font-black text-[var(--sf-accent)]">৳ {displayFinalPrice}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 min-[390px]:flex">
                            <button
                                type="button"
                                onClick={handleAddToCart}
                                data-ab-part={adaptiveParts ? 'primaryButton' : undefined}
                                aria-label={`Add ${product.title} to cart`}
                                className="sf-btn sf-btn-secondary min-h-0 rounded-full px-4 py-3 text-sm"
                            >
                                <ShoppingCart size={17} />
                                <span>Add</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleBuyNow}
                                data-ab-part={adaptiveParts ? 'secondaryButton' : undefined}
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
