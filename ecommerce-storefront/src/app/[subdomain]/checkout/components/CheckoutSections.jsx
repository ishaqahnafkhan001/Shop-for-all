"use client";

import Image from "next/image";
import Link from "next/link";

import {
    ArrowLeft,
    CheckCircle,
    CreditCard,
    FileText,
    Loader2,
    Lock,
    Mail,
    MapPin,
    Minus,
    Package,
    Phone,
    Plus,
    ShieldCheck,
    Trash2,
    Truck,
    User,
} from "lucide-react";

import { shouldUseUnoptimizedImage } from "@/lib/imageDomains";

export function CheckoutSuccessState({ orderId }) {
    return (
        <div className="sf-page flex min-h-screen items-center justify-center px-4">
            <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-slate-200/70 sm:p-10">
                <CheckCircle
                    size={90}
                    className="mx-auto mb-6 text-emerald-500"
                />

                <h1 className="mb-3 text-4xl font-black text-slate-950">
                    Order Confirmed
                </h1>

                <p className="leading-relaxed text-slate-600">
                    Thank you for your purchase.
                </p>

                <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-slate-500">
                        ORDER ID FOR TRACKING
                    </p>

                    <p className="text-2xl font-black tracking-wider text-[var(--sf-accent)]">
                        #
                        {orderId
                            ?.slice(-6)
                            ?.toUpperCase()}
                    </p>
                    <p className="mt-2 break-all text-xs text-slate-500">
                        Full ID: {orderId}
                    </p>
                    <p className="mt-3 text-xs text-slate-500">
                        Use the short ID and your delivery phone number on the Track Order page.
                    </p>
                </div>

                <Link
                    href="/"
                    className="sf-btn sf-btn-primary mt-8 px-8"
                >
                    Continue Shopping
                </Link>
            </div>
        </div>
    );
}

export function CheckoutEmptyCartState() {
    return (
        <div className="sf-page flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
            <Package
                size={80}
                className="mb-6 text-slate-300"
            />

            <h2 className="mb-3 text-3xl font-black text-slate-950">
                Your cart is empty
            </h2>

            <p className="mb-8 text-slate-500">
                Add some products first
            </p>

            <Link
                href="/"
                className="sf-btn sf-btn-primary px-7"
            >
                Continue Shopping
            </Link>
        </div>
    );
}

function CheckoutBrandingBanner({ checkoutBranding }) {
    if (!checkoutBranding.logoUrl && !checkoutBranding.bannerText) {
        return null;
    }

    return (
        <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-sm">
            {checkoutBranding.logoUrl && (
                <Image
                    src={checkoutBranding.logoUrl}
                    alt=""
                    width={180}
                    height={48}
                    unoptimized={shouldUseUnoptimizedImage(checkoutBranding.logoUrl)}
                    className="mx-auto mb-3 h-12 w-auto object-contain"
                />
            )}
            {checkoutBranding.bannerText && (
                <p className="text-sm font-bold text-slate-700">{checkoutBranding.bannerText}</p>
            )}
        </div>
    );
}

function CheckoutHeader() {
    return (
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <Link
                    href="/cart"
                    className="mb-4 inline-flex items-center text-sm font-bold text-slate-500 transition hover:text-[var(--sf-accent)]"
                >
                    <ArrowLeft
                        size={16}
                        className="mr-2"
                    />
                    Back to Cart
                </Link>
                <p className="sf-kicker">Checkout</p>
                <h1 className="sf-heading mt-1 text-3xl sm:text-4xl">Complete your order</h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                    Confirm delivery details, review your items, and place the order securely.
                </p>
            </div>
            <CheckoutTrustBadges />
        </div>
    );
}

export function CheckoutTrustBadges() {
    return (
        <div className="grid gap-2 text-xs font-bold text-slate-600 sm:grid-cols-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
                <Lock size={14} className="text-emerald-600" /> Secure
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
                <CreditCard size={14} className="text-[var(--sf-accent)]" /> COD
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
                <Truck size={14} className="text-sky-600" /> Delivery
            </span>
        </div>
    );
}

export function CheckoutPageShell({ checkoutBranding, children, mobileStickyBar, onSubmit }) {
    return (
        <div className="sf-page pb-28 lg:pb-0">
            <div className="sf-shell-wide py-8 sm:py-10">
                <CheckoutBrandingBanner checkoutBranding={checkoutBranding} />
                <CheckoutHeader />

                <form
                    onSubmit={onSubmit}
                    className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_450px]"
                >
                    {children}
                    {mobileStickyBar}
                </form>
            </div>
        </div>
    );
}

export function CheckoutCustomerInfo({ formData, onInputChange }) {
    return (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="mb-6 text-2xl font-black text-slate-950">
                Customer Information
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                    <label htmlFor="checkout-full-name" className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                        <User size={16} />
                        Full Name
                    </label>

                    <input
                        id="checkout-full-name"
                        required
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={onInputChange}
                        placeholder="Enter your full name"
                        className="sf-field"
                    />
                </div>

                <div>
                    <label htmlFor="checkout-email" className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                        <Mail size={16} />
                        Email
                    </label>

                    <input
                        id="checkout-email"
                        required
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={onInputChange}
                        placeholder="example@gmail.com"
                        className="sf-field"
                    />
                </div>

                <div>
                    <label htmlFor="checkout-phone" className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                        <Phone size={16} />
                        Phone Number
                    </label>

                    <input
                        id="checkout-phone"
                        required
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={onInputChange}
                        placeholder="+8801XXXXXXXXX"
                        className="sf-field"
                    />
                </div>

                <div className="md:col-span-2">
                    <label htmlFor="checkout-address" className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                        <MapPin size={16} />
                        Full Address
                    </label>

                    <textarea
                        id="checkout-address"
                        required
                        rows={4}
                        name="address"
                        value={formData.address}
                        onChange={onInputChange}
                        placeholder="House, road, area, thana"
                        className="sf-field resize-none"
                    />
                </div>

                <div className="md:col-span-2">
                    <label htmlFor="checkout-city" className="mb-2 block text-sm font-bold text-slate-700">
                        City / District
                    </label>

                    <input
                        id="checkout-city"
                        required
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={onInputChange}
                        placeholder="Dhaka"
                        className="sf-field"
                    />
                </div>
            </div>
        </div>
    );
}

export function CheckoutDeliveryChargeNotice() {
    return (
        <div className="flex gap-5 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white to-cyan-50/50 p-6 shadow-sm">
            <Truck
                size={32}
                className="mt-1 text-[var(--sf-accent)]"
            />

            <div>
                <h3 className="mb-1 text-lg font-black text-slate-950">
                    Delivery Charge
                </h3>

                <p className="text-sm font-semibold text-slate-600">
                    Inside Dhaka → ৳ 80
                </p>

                <p className="text-sm font-semibold text-slate-600">
                    Outside Dhaka → ৳ 120
                </p>
            </div>
        </div>
    );
}

export function CheckoutDeliveryMethod({ isDhaka }) {
    return (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="mb-5 text-2xl font-black text-slate-950">
                Delivery Method
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
                <div className={`rounded-2xl border p-4 ${isDhaka ? "border-[var(--sf-accent)] bg-[var(--sf-accent-bg)]" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-black text-slate-950">Inside Dhaka</span>
                        <span className="text-sm font-black text-[var(--sf-accent)]">৳ 80</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-500">Same-city delivery estimate.</p>
                </div>
                <div className={`rounded-2xl border p-4 ${!isDhaka ? "border-[var(--sf-accent)] bg-[var(--sf-accent-bg)]" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-black text-slate-950">Outside Dhaka</span>
                        <span className="text-sm font-black text-[var(--sf-accent)]">৳ 120</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-500">Nationwide delivery estimate.</p>
                </div>
            </div>
        </div>
    );
}

export function CheckoutPaymentMethod() {
    return (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="mb-5 text-2xl font-black text-slate-950">
                Payment Method
            </h2>
            <div className="rounded-2xl border border-[var(--sf-accent)] bg-[var(--sf-accent-bg)] p-4">
                <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--sf-accent)] shadow-sm">
                        <CreditCard size={19} />
                    </span>
                    <div>
                        <p className="text-sm font-black text-slate-950">Cash on Delivery</p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                            Pay securely when your order arrives. Online payment providers can be enabled later from the platform.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function CheckoutDetailsColumn({ formData, isDhaka, onInputChange }) {
    return (
        <div className="space-y-7">
            <CheckoutCustomerInfo
                formData={formData}
                onInputChange={onInputChange}
            />
            <CheckoutDeliveryChargeNotice />
            <CheckoutDeliveryMethod isDhaka={isDhaka} />
            <CheckoutPaymentMethod />
        </div>
    );
}

function CheckoutCouponBox({
    onApplyPromotion,
    promotionCode,
    promotionMessage,
    setPromotionCode,
}) {
    return (
        <div className="mb-6">
            <label htmlFor="checkout-coupon-code" className="mb-2 block text-sm font-bold text-slate-700">
                Coupon Code
            </label>
            <div className="flex gap-2">
                <input
                    id="checkout-coupon-code"
                    type="text"
                    value={promotionCode}
                    onChange={(event) => setPromotionCode(event.target.value.toUpperCase())}
                    placeholder="SAVE10"
                    aria-describedby={promotionMessage ? "checkout-coupon-feedback" : undefined}
                    className="sf-field min-w-0 flex-1 uppercase"
                />
                <button
                    type="button"
                    onClick={onApplyPromotion}
                    className="sf-btn sf-btn-primary min-h-0 px-4 py-3"
                >
                    Apply
                </button>
            </div>
            {promotionMessage && (
                <p id="checkout-coupon-feedback" className={`mt-2 rounded-xl px-3 py-2 text-xs font-bold ${
                    promotionMessage.type === "error"
                        ? "bg-red-50 text-red-700"
                        : promotionMessage.type === "success"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-50 text-slate-600"
                }`}>
                    {promotionMessage.text}
                </p>
            )}
        </div>
    );
}

function CheckoutPolicyConsent({ policyAccepted, setPolicyAccepted }) {
    return (
        <label className={`mt-6 flex items-start gap-3 rounded-2xl border p-4 text-sm font-semibold transition ${
            policyAccepted
                ? "border-[var(--sf-accent)] bg-[var(--sf-accent-bg)] text-slate-700"
                : "border-slate-200 bg-slate-50 text-slate-600"
        }`}>
            <input
                id="checkout-policy-consent"
                type="checkbox"
                checked={policyAccepted}
                onChange={(event) => setPolicyAccepted(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--sf-accent)] focus:ring-[var(--sf-accent)]"
            />
            <span>
                I agree to this store&apos;s policies before placing my order.
                <span className="mt-1 block text-xs font-medium text-slate-500">
                    Review the policy sections below. This confirms you understand delivery, refund, and privacy terms.
                </span>
            </span>
        </label>
    );
}

function CheckoutPolicies({ policies, visiblePolicies }) {
    if (visiblePolicies.length === 0) {
        return null;
    }

    return (
        <div className="mt-6 border-t border-slate-200 pt-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950">
                <FileText size={16} className="text-[var(--sf-accent)]" />
                Store Policies
            </div>
            <div className="space-y-2">
                {visiblePolicies.map(([key, label]) => (
                    <details key={key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <summary className="cursor-pointer text-sm font-bold text-slate-800">
                            {label}
                        </summary>
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                            {policies[key]}
                        </p>
                    </details>
                ))}
            </div>
        </div>
    );
}

function CheckoutOrderItem({
    item,
    product,
    removeFromCart,
    updateQuantity,
}) {
    const imageUrl = item.imageUrl || product?.thumbnail || product?.images?.[0] || "";

    return (
        <div
            key={item.cartItemId || item._id}
            className="rounded-3xl border border-slate-200 p-5"
        >
            <div className="flex gap-4">
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={item.title}
                        width={96}
                        height={96}
                        unoptimized={shouldUseUnoptimizedImage(imageUrl)}
                        className="h-20 w-20 rounded-2xl border border-slate-200 object-cover sm:h-24 sm:w-24"
                    />
                ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-300 sm:h-24 sm:w-24">
                        <Package size={28} />
                    </div>
                )}

                <div className="flex-1">
                    <h3 className="line-clamp-2 font-black text-slate-950">
                        {item.title}
                    </h3>

                    {product?.shortDescription && (
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                            {product.shortDescription}
                        </p>
                    )}

                    <div className="flex items-center justify-between mt-5">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    updateQuantity(
                                        item.cartItemId || item._id,
                                        item.quantity - 1
                                    )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100"
                            >
                                <Minus size={16} />
                            </button>

                            <div className="w-10 text-center font-black text-slate-950">
                                {item.quantity}
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    updateQuantity(
                                        item.cartItemId || item._id,
                                        item.quantity + 1
                                    )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100"
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        <div className="text-right">
                            <p className="text-lg font-black text-slate-950">
                                ৳
                                {(item.finalPrice ||
                                        item.sellingPrice) *
                                    item.quantity}
                            </p>

                            <p className="text-xs text-slate-400">
                                ৳
                                {item.finalPrice ||
                                    item.sellingPrice}
                                each
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            removeFromCart(
                                item.cartItemId || item._id
                            )
                        }
                        className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-600"
                    >
                        <Trash2 size={14} />
                        Remove
                    </button>
                </div>
            </div>
        </div>
    );
}

export function CheckoutOrderSummary({
    cartItems,
    checkoutBranding,
    finalShippingCost,
    loading,
    onApplyPromotion,
    policies,
    policyAccepted,
    productsDetails,
    promotionCode,
    promotionDiscount,
    promotionMessage,
    removeFromCart,
    setPolicyAccepted,
    setPromotionCode,
    subtotal,
    totalAmount,
    updateQuantity,
    visiblePolicies,
}) {
    return (
        <div>
            <div className="sticky top-28 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
                <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-teal-50/70 p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="sf-kicker">Review</p>
                            <h2 className="mt-1 text-2xl font-black text-slate-950">
                                Order Summary
                            </h2>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[var(--sf-accent)] shadow-sm">
                            {cartItems.length} item{cartItems.length === 1 ? "" : "s"}
                        </span>
                    </div>
                </div>

                <div className="max-h-[460px] space-y-5 overflow-y-auto p-6 sm:p-7">
                    {cartItems.map((item) => (
                        <CheckoutOrderItem
                            key={item.cartItemId || item._id}
                            item={item}
                            product={productsDetails[item._id]}
                            removeFromCart={removeFromCart}
                            updateQuantity={updateQuantity}
                        />
                    ))}
                </div>

                <div className="border-t border-slate-200 p-6 sm:p-7">
                    <CheckoutCouponBox
                        onApplyPromotion={onApplyPromotion}
                        promotionCode={promotionCode}
                        promotionMessage={promotionMessage}
                        setPromotionCode={setPromotionCode}
                    />

                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">
                                Subtotal
                            </span>

                            <span className="font-bold text-slate-950">
                                ৳ {subtotal}
                            </span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-500">
                                Delivery Charge
                            </span>

                            <span className="font-bold text-slate-950">
                                ৳ {finalShippingCost}
                            </span>
                        </div>

                        {promotionDiscount > 0 && (
                            <div className="flex justify-between text-green-700">
                                <span>
                                    Coupon Discount
                                </span>

                                <span className="font-bold">
                                    - ৳ {promotionDiscount}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-dashed border-slate-200 pt-5">
                        <span className="text-xl font-black text-slate-950">
                            Total
                        </span>

                        <span className="text-3xl font-black text-slate-950">
                            ৳ {totalAmount}
                        </span>
                    </div>

                    <CheckoutPolicyConsent
                        policyAccepted={policyAccepted}
                        setPolicyAccepted={setPolicyAccepted}
                    />

                    <button
                        type="submit"
                        disabled={loading || !policyAccepted}
                        className="sf-btn sf-btn-primary mt-7 w-full py-5 text-lg disabled:opacity-50"
                        style={{ borderRadius: "var(--sf-checkout-radius)" }}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Processing order
                            </>
                        ) : (
                            <>
                                <Lock size={18} />
                                Place Order
                            </>
                        )}
                    </button>

                    <div className="mt-5 grid gap-3 text-sm font-semibold text-slate-600">
                        <p className="flex items-center justify-center gap-2">
                            <ShieldCheck
                                size={16}
                                className="text-emerald-500"
                            />
                            {checkoutBranding.trustMessage || "Secure Checkout"}
                        </p>
                        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-emerald-800">
                            Cash on delivery order. You pay when the product arrives.
                        </p>
                    </div>

                    <CheckoutPolicies
                        policies={policies}
                        visiblePolicies={visiblePolicies}
                    />
                </div>
            </div>
        </div>
    );
}

export function CheckoutMobileStickyBar({ loading, policyAccepted, totalAmount }) {
    return (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-xl items-center gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Pay on delivery</p>
                    <p className="text-xl font-black text-slate-950">৳ {totalAmount}</p>
                </div>
                <button
                    type="submit"
                    disabled={loading || !policyAccepted}
                    className="sf-btn sf-btn-primary min-h-0 rounded-full px-5 py-3 text-sm disabled:opacity-50"
                >
                    {loading ? <Loader2 size={17} className="animate-spin" /> : <Lock size={16} />}
                    Place order
                </button>
            </div>
        </div>
    );
}
