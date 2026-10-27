"use client";
import { getCartItemPrice, getCartItemOriginalPrice } from '../normalizeProduct.js';
import { CheckCircle, Headphones, Minus, Plus, ShieldCheck, ShoppingBag, Tag, Trash2, Truck } from 'lucide-react';
import { Link } from './Runtime.jsx';
import SafeProductImage from './SafeProductImage.jsx';
import { ProductCard } from '../reference/StorefrontProductCard.jsx';
export function CartView({ adaptiveParts = false, cartItems, removeFromCart, updateQuantity, subtotal, shipping, totalSavings,
    total, getCartImageUrl, promoCode, setPromoCode, promoFeedback, handleApplyPromo,
    recommendationsLoading, recommendations, themedProductCard, productActions, presentationVariant }) {
    const atelier = presentationVariant === 'atelier-editorial';
    // EMPTY STATE
    if (cartItems.length === 0) {
        return (
            <div className={atelier ? "sf-page atelier-cart flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center" : "sf-page flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center"}>
                <div data-ab-surface={adaptiveParts ? '' : undefined} className="mb-6 rounded-[2rem] bg-white p-6 shadow-sm">
                    <ShoppingBag size={56} className="text-slate-300" />
                </div>
                <h2 className="mb-2 text-3xl font-black text-slate-950">Your cart is empty</h2>
                <p className="mb-8 max-w-md text-sm leading-6 text-slate-500">
                    Add products to compare options, review totals, and complete checkout securely.
                </p>
                <Link
                    href="/"
                    className="sf-btn sf-btn-primary px-8"
                >
                    Continue Shopping
                </Link>
            </div>
        );
    }

    return (
        <div className={atelier ? "sf-page sf-mobile-action-page atelier-cart" : "sf-page sf-mobile-action-page"}>
        <div className="sf-shell-wide py-8 sm:py-10">
            <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-center">
                <div>
                    <p className="sf-kicker">Cart</p>
                    <h1 data-ab-part={adaptiveParts ? 'heading' : undefined} className="sf-heading text-3xl">Your Cart ({cartItems.length})</h1>
                    <p className="mt-2 max-w-xl text-sm font-semibold text-slate-500">
                        Review quantities, delivery estimate, and checkout securely when you are ready.
                    </p>
                </div>
                </div>
                <div className="grid gap-2 text-xs font-bold text-slate-600 sm:grid-cols-3">
                    <span data-ab-surface={adaptiveParts ? '' : undefined} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm"><ShieldCheck size={14} className="text-emerald-600" /> Secure</span>
                    <span data-ab-surface={adaptiveParts ? '' : undefined} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm"><Truck size={14} className="text-[var(--sf-accent)]" /> Delivery</span>
                    <span data-ab-surface={adaptiveParts ? '' : undefined} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm"><Headphones size={14} className="text-sky-600" /> Support</span>
                </div>
            </div>

            <div data-ab-part={adaptiveParts ? 'layout' : undefined} data-ab-layout={adaptiveParts ? 'cart' : undefined} data-atelier-part={atelier ? "cart-layout" : undefined} className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
                {/* Left Side: Items */}
                <div className="space-y-4">
                    {cartItems.map((item) => (
                        <div data-ab-surface={adaptiveParts ? '' : undefined} data-ab-part={adaptiveParts ? 'items' : undefined} data-atelier-part={atelier ? "cart-item" : undefined} key={item.cartItemId || item._id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg hover:shadow-indigo-100/60 sm:p-6">
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                                <div className="flex w-full min-w-0 flex-1 items-start gap-4 sm:gap-5">
                                    {/* Product Image */}
                                    <div data-ab-part={adaptiveParts ? 'image' : undefined} data-ab-surface={adaptiveParts ? '' : undefined} data-atelier-part={atelier ? "cart-image" : undefined} className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50 sm:h-28 sm:w-28">
                                        <SafeProductImage
                                            src={getCartImageUrl(item)}
                                            alt={item.title}
                                            fill
                                            sizes="(max-width: 640px) 100vw, 112px"
                                            className="object-cover"
                                            fallbackClassName="flex h-full w-full items-center justify-center text-slate-300"
                                            iconClassName="h-6 w-6"
                                        />
                                    </div>

                                    {/* Product Details */}
                                    <div className="flex min-w-0 flex-1 flex-col">

                                        {/* Category & SKU */}
                                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                            {item.category && (
                                                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--sf-accent)]">
                                                    {item.category}
                                                </span>
                                            )}
                                            {(item.sku || item.selectedVariant?.sku) && (
                                                <span data-ab-surface={adaptiveParts ? '' : undefined} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                                                    SKU: {item.selectedVariant?.sku || item.sku}
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="mb-1 line-clamp-1 text-lg font-black text-slate-950" title={item.title}>
                                            {item.title}
                                        </h3>

                                        {/* Description Snippet */}
                                        {(item.shortDescription || item.description) && (
                                            <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                                                {item.shortDescription || item.description}
                                            </p>
                                        )}

                                        {/* RENDER VARIANTS (JSX Safe) */}
                                        {item.selectedVariant && item.selectedVariant.attributes && (
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {item.selectedVariant.attributes.map((attr, idx) => (
                                                    <span data-ab-surface={adaptiveParts ? '' : undefined} key={idx} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                                                        <span className="mr-1 text-slate-400">{attr.name}:</span>
                                                        {attr.value}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Pricing */}
                                        <div className="mt-auto flex items-center gap-2">
                                            <p className="text-lg font-black text-slate-950">
                                                ৳ {getCartItemPrice(item)}
                                            </p>
                                            {item.pricing?.discount > 0 && getCartItemOriginalPrice(item) > getCartItemPrice(item) && (
                                                <p className="text-sm text-slate-400 line-through">
                                                    ৳ {getCartItemOriginalPrice(item)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div data-atelier-part={atelier ? "cart-controls" : undefined} className="flex w-full items-center justify-between gap-4 border-t border-slate-100 pt-4 sm:w-auto sm:justify-end sm:border-t-0 sm:pt-0">
                                    <div className="flex flex-col items-center sm:items-end">
                                        <div data-ab-surface={adaptiveParts ? '' : undefined} className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
                                            <button data-ab-surface={adaptiveParts ? '' : undefined}
                                                type="button"
                                                onClick={() => updateQuantity(item.cartItemId || item._id, item.quantity - 1)}
                                                disabled={item.quantity <= 1}
                                                aria-label={`Decrease quantity for ${item.title}`}
                                                className="p-2.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-950 disabled:opacity-30 disabled:hover:bg-transparent"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span data-ab-surface={adaptiveParts ? '' : undefined} className="w-10 bg-white py-2 text-center text-sm font-black">
                                                {item.quantity}
                                            </span>
                                            <button data-ab-surface={adaptiveParts ? '' : undefined}
                                                type="button"
                                                onClick={() => updateQuantity(item.cartItemId || item._id, item.quantity + 1)}
                                                disabled={item.quantity >= (item.selectedVariant?.stock || item.stock || 99)}
                                                aria-label={`Increase quantity for ${item.title}`}
                                                className="p-2.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-950 disabled:opacity-30 disabled:hover:bg-transparent"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                        {/* Stock Alert logic */}
                                        {item.quantity >= (item.selectedVariant?.stock || item.stock) && (
                                            <span className="text-[10px] text-orange-600 mt-1 font-bold flex items-center">
                                                Limit reached
                                            </span>
                                        )}
                                    </div>

                                    <button data-ab-surface={adaptiveParts ? '' : undefined}
                                        type="button"
                                        onClick={() => removeFromCart(item.cartItemId || item._id)}
                                        className="rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                        title="Remove item"
                                        aria-label={`Remove ${item.title} from cart`}
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Side: Summary */}
                <div>
                    <div data-ab-surface={adaptiveParts ? '' : undefined} data-ab-part={adaptiveParts ? 'totals' : undefined} data-atelier-part={atelier ? "cart-summary" : undefined} className="sticky top-28 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-lg shadow-slate-200/70">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <p className="sf-kicker">Summary</p>
                                <h2 className="text-xl font-black text-slate-950">Order Summary</h2>
                            </div>
                            <span className="rounded-full bg-[var(--sf-accent-bg)] px-3 py-1 text-xs font-black text-[var(--sf-accent)]">
                                {cartItems.length} item{cartItems.length === 1 ? '' : 's'}
                            </span>
                        </div>

                        <div className="mb-6 space-y-3 text-sm">
                            <div className="flex justify-between text-slate-600">
                                <span>Subtotal</span>
                                <span className="font-bold text-slate-950">৳ {subtotal}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>Estimated delivery</span>
                                <span className="font-bold text-slate-950">৳ {shipping}</span>
                            </div>

                            {totalSavings > 0 && (
                                <div data-ab-surface={adaptiveParts ? '' : undefined} className="flex justify-between rounded-2xl border border-emerald-200/60 bg-emerald-50 p-3 font-black text-emerald-700">
                                    <span>Total Savings</span>
                                    <span>- ৳ {totalSavings}</span>
                                </div>
                            )}
                        </div>

                        <div data-ab-surface={adaptiveParts ? '' : undefined} className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <label htmlFor="cart-promo-code" className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                                <Tag size={14} />
                                Promo code
                            </label>
                            <div className="flex gap-2">
                                <input
                                    id="cart-promo-code"
                                    type="text"
                                    value={promoCode}
                                    onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                                    placeholder="SAVE10"
                                    aria-describedby={promoFeedback ? 'cart-promo-feedback' : undefined}
                                    className="sf-field min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm uppercase"
                                />
                                <button data-ab-surface={adaptiveParts ? '' : undefined} type="button" onClick={handleApplyPromo} className="rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800">
                                    Apply
                                </button>
                            </div>
                            {promoFeedback && (
                                <p id="cart-promo-feedback" className={`mt-2 text-xs font-bold ${promoFeedback.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>
                                    {promoFeedback.text}
                                </p>
                            )}
                        </div>

                        <div className="mb-6 flex items-center justify-between border-t border-slate-200 pt-5">
                            <span className="text-lg font-black text-slate-950">Total</span>
                            <span className="text-3xl font-black text-slate-950">৳ {total}</span>
                        </div>

                        <Link data-ab-part={adaptiveParts ? 'primaryButton' : undefined} href="/checkout" className="sf-btn sf-btn-primary w-full">
                            Proceed to Checkout
                        </Link>

                        <Link href="/" className="mt-4 flex justify-center text-sm font-black text-slate-500 transition hover:text-[var(--sf-accent)]">
                            Continue Shopping
                        </Link>

                        <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
                            <div data-ab-surface={adaptiveParts ? '' : undefined} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-600">
                                <ShieldCheck size={18} className="flex-shrink-0 text-emerald-600" />
                                <span>Secure checkout and order confirmation</span>
                            </div>
                            <div data-ab-surface={adaptiveParts ? '' : undefined} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-600">
                                <Truck size={18} className="flex-shrink-0 text-[var(--sf-accent)]" />
                                <span>Fast & secure delivery</span>
                            </div>
                            <div data-ab-surface={adaptiveParts ? '' : undefined} className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                                <CheckCircle size={18} className="flex-shrink-0 text-emerald-600" />
                                <span>Cash on delivery available at checkout</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {(recommendationsLoading || recommendations.length > 0) && (
                <section data-ab-surface={adaptiveParts ? '' : undefined} data-atelier-part={atelier ? "cart-recommendations" : undefined} className="mt-8 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:mt-10 sm:rounded-[2rem] sm:p-7">
                    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="sf-kicker">Recommended</p>
                            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">You may also like</h2>
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Similar products from this store, excluding what is already in your cart.
                            </p>
                        </div>
                        <Link href="/#products" className="text-sm font-black text-[var(--sf-accent)]">
                            Browse all
                        </Link>
                    </div>

                    {recommendationsLoading ? (
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div data-ab-surface={adaptiveParts ? '' : undefined} key={index} className="h-72 animate-pulse rounded-[1.5rem] bg-slate-100" />
                            ))}
                        </div>
                    ) : (
                        <div className={`grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 ${recommendations.length === 1 ? "mx-auto w-full max-w-[20rem] sm:mx-0 sm:max-w-none" : ""}`}>
                            {recommendations.map((product, index) => (
                                <ProductCard adaptiveParts={adaptiveParts}
                                    key={product._id}
                                    presentationVariant={presentationVariant}
                                    product={product}
                                    index={index}
                                    storewideDiscount={0}
                                    productCard={themedProductCard}
                                    onProductAdd={(item) => productActions.addProductToCart(item, { location: 'cart_recommendations' })}
                                    onProductBuyNow={(item) => productActions.buyNow(item, { location: 'cart_recommendations' })}
                                    onWishlistToggle={productActions.toggleWishlist}
                                    isWishlisted={productActions.isWishlisted}
                                    LinkComponent={Link}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
        {productActions.variantPicker}

        <div data-ab-surface={adaptiveParts ? '' : undefined} className="sf-mobile-action-bar fixed inset-x-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-xl items-center gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{cartItems.length} item{cartItems.length === 1 ? '' : 's'} total</p>
                    <p className="text-xl font-black text-slate-950">৳ {total}</p>
                </div>
                <Link href="/checkout" className="sf-btn sf-btn-primary min-h-0 rounded-full px-6 py-3 text-sm">
                    Checkout
                </Link>
            </div>
        </div>
        </div>
    );
}
