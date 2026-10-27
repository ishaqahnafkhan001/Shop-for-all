"use client";
import { getCartItemPrice } from '../normalizeProduct.js';

import { useAtelierDialog } from '../atelier/useAtelierDialog.js';
import { Image, Link } from "./Runtime.jsx";
import SafeProductImage from "./SafeProductImage.jsx";

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
    X,
} from "lucide-react";

import { shouldUseUnoptimizedImage } from "../imageDomains.js";

export function CheckoutSuccessState({ orderId }) {
    return (
        <div className="sf-checkout-page sf-page flex min-h-screen items-center justify-center px-4">
            <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] p-8 text-center shadow-2xl shadow-slate-200/70 sm:p-10">
                <CheckCircle
                    size={90}
                    className="mx-auto mb-6 text-[var(--sf-checkout-success)]"
                />

                <h1 className="mb-3 text-4xl font-black text-[var(--sf-checkout-text)]">
                    Order Confirmed
                </h1>

                <p className="leading-relaxed text-slate-600">
                    Thank you for your purchase.
                </p>

                <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-slate-500">
                        ORDER ID FOR TRACKING
                    </p>

                    <p className="text-2xl font-black tracking-wider text-[var(--sf-checkout-accent)]">
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
        <div className="sf-checkout-page sf-page flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
            <Package
                size={80}
                className="mb-6 text-slate-300"
            />

            <h2 className="mb-3 text-3xl font-black text-[var(--sf-checkout-text)]">
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

export function CheckoutBrandingBanner({ checkoutBranding }) {
    if (!checkoutBranding.logoUrl && !checkoutBranding.bannerText) {
        return null;
    }

    return (
        <div className="mb-8 rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] p-6 text-center shadow-sm">
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
                    className="mb-4 inline-flex items-center text-sm font-bold text-slate-500 transition hover:text-[var(--sf-checkout-accent)]"
                >
                    <ArrowLeft
                        size={16}
                        className="mr-2"
                    />
                    Back to Cart
                </Link>
                <p className="sf-kicker">Checkout</p>
                <h1 className="sf-heading mt-1 text-3xl sm:text-4xl" style={{ color: 'var(--sf-checkout-text)' }}>Complete your order</h1>
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
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--sf-checkout-card-background)] px-3 py-2 shadow-sm">
                <Lock size={14} className="text-[var(--sf-checkout-success)]" /> Secure
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--sf-checkout-card-background)] px-3 py-2 shadow-sm">
                <CreditCard size={14} className="text-[var(--sf-checkout-accent)]" /> COD
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--sf-checkout-card-background)] px-3 py-2 shadow-sm">
                <Truck size={14} className="text-sky-600" /> Delivery
            </span>
        </div>
    );
}

export function CheckoutPageShell({ checkoutBranding, children, mobileStickyBar, onSubmit }) {
    return (
        <div className="sf-checkout-page sf-page sf-mobile-action-page">
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

export function CheckoutCustomerInfo({ formData, onInputChange, districts = [] }) {
    return (
        <div className="rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] p-6 shadow-sm sm:p-8">
            <h2 className="mb-6 text-2xl font-black text-[var(--sf-checkout-text)]">
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
                        Delivery district
                    </label>

                    <select
                        id="checkout-city"
                        required
                        name="city"
                        value={formData.city}
                        onChange={onInputChange}
                        className="sf-field"
                    >
                        <option value="">Select delivery district</option>
                        {districts.map(district => <option key={district}>{district}</option>)}
                    </select>
                </div>
            </div>
        </div>
    );
}

export function CheckoutDeliveryChargeNotice({ settings }) {
    return <div className="rounded-3xl border border-slate-200 p-6">
        <h3 className="font-bold">Delivery charges</h3>
        {settings ? <><p>Inside {settings.baseArea} district: ৳ {settings.insideCharge}</p><p>Outside {settings.baseArea} district: ৳ {settings.outsideCharge}</p></> : <p>Select your district to review delivery charges.</p>}
    </div>;
}

export function CheckoutDeliveryMethod({ delivery }) {
    return <div className="rounded-3xl border border-slate-200 p-6" aria-live="polite">
        <h3 className="font-bold">Your delivery charge</h3>
        {delivery?.error ? <p role="alert">{delivery.error} <button type="button" onClick={delivery.refresh} className="underline">Retry</button></p>
            : delivery?.quote ? <p>{delivery.quote.zone}: ৳ {delivery.quote.originalCharge}</p>
                : <p>Select a district and wait for the delivery charge before ordering.</p>}
    </div>;
}

export function CheckoutPaymentMethod({ presentationVariant } = {}) {
    return (
        <div className="rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] p-6 shadow-sm sm:p-8">
            <h2 className="mb-5 text-2xl font-black text-[var(--sf-checkout-text)]">
                Payment Method
            </h2>
            <div className="rounded-2xl border border-[var(--sf-checkout-accent)] bg-[var(--sf-accent-bg)] p-4">
                <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--sf-checkout-card-background)] text-[var(--sf-checkout-accent)] shadow-sm">
                        <CreditCard size={19} />
                    </span>
                    <div>
                        <p className="text-sm font-black text-[var(--sf-checkout-text)]">Cash on Delivery</p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                            {presentationVariant === 'atelier-editorial' ? 'Pay when your order arrives.' : 'Pay securely when your order arrives. Online payment providers can be enabled later from the platform.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function CheckoutPhoneOtpBox({
    maskedPhone,
    onSendOtp,
    onVerifyOtp,
    otp,
    sending,
    setOtp,
    verified,
    verifying,
}) {
    return (
        <div className="rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[var(--sf-checkout-success)]">
                    <ShieldCheck size={20} />
                </span>
                <div>
                    <h2 className="text-2xl font-black text-[var(--sf-checkout-text)]">Verify delivery phone</h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                        We send a 6-digit code before placing the order. Stock is reserved only after verification.
                    </p>
                </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                    type="button"
                    onClick={onSendOtp}
                    disabled={sending || verified}
                    className="sf-btn sf-btn-secondary min-h-0 justify-center px-5 py-3 text-sm disabled:opacity-50"
                >
                    {sending ? <Loader2 size={17} className="animate-spin" /> : <Phone size={17} />}
                    {verified ? "Phone verified" : "Send OTP"}
                </button>
                <div className="flex min-w-0 flex-1 gap-2">
                    <input
                        value={otp}
                        onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        inputMode="numeric"
                        maxLength={6}
                        disabled={verified}
                        className="sf-field min-w-0 flex-1"
                        aria-label="Phone verification code"
                    />
                    <button
                        type="button"
                        onClick={onVerifyOtp}
                        disabled={verifying || verified || otp.length !== 6}
                        className="sf-btn sf-btn-primary min-h-0 px-5 py-3 text-sm disabled:opacity-50"
                    >
                        {verifying ? <Loader2 size={17} className="animate-spin" /> : "Verify"}
                    </button>
                </div>
            </div>

            <p className={`mt-3 rounded-2xl px-4 py-3 text-xs font-bold ${
                verified ? "bg-emerald-50 text-[var(--sf-checkout-success)]" : "bg-slate-50 text-slate-500"
            }`}>
                {verified
                    ? `Verified ${maskedPhone || "delivery phone"}.`
                    : maskedPhone
                        ? `Code sent to ${maskedPhone}.`
                        : "Enter your phone above, then send a verification code."}
            </p>
        </div>
    );
}

export function CheckoutMarketingConsent({ checked, onChange }) {
    return (
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1" />
            <span>Send me a confirmation email to subscribe to this store&apos;s offers and product updates. Optional; unsubscribe anytime.</span>
        </label>
    );
}

export function CheckoutDetailsColumn({ formData, isDhaka, onInputChange, presentationVariant }) {
    return (
        <div data-atelier-part={presentationVariant === 'atelier-editorial' ? 'checkout-fields' : undefined} className="space-y-7">
            <CheckoutCustomerInfo
                formData={formData}
                onInputChange={onInputChange}
                districts={delivery?.settings?.districts || []}
            />
            <CheckoutDeliveryChargeNotice settings={delivery?.settings} />
            <CheckoutDeliveryMethod delivery={delivery} />
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
                        ? "bg-red-50 text-[var(--sf-checkout-error)]"
                        : promotionMessage.type === "success"
                            ? "bg-emerald-50 text-[var(--sf-checkout-success)]"
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
                ? "border-[var(--sf-checkout-accent)] bg-[var(--sf-accent-bg)] text-slate-700"
                : "border-slate-200 bg-slate-50 text-slate-600"
        }`}>
            <input
                id="checkout-policy-consent"
                type="checkbox"
                checked={policyAccepted}
                onChange={(event) => setPolicyAccepted(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--sf-checkout-accent)] focus:ring-[var(--sf-checkout-accent)]"
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
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-[var(--sf-checkout-text)]">
                <FileText size={16} className="text-[var(--sf-checkout-accent)]" />
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
    presentationVariant,
    item,
    product,
    removeFromCart,
    updateQuantity,
}) {
    const imageUrl = item.imageUrl || product?.thumbnail || product?.images?.[0] || "";

    return (
        <div
            key={item.cartItemId || item._id}
            data-atelier-part={presentationVariant === 'atelier-editorial' ? 'checkout-item' : undefined}
            className="rounded-3xl border border-slate-200 p-5"
        >
            <div className="flex gap-4">
                <SafeProductImage
                    src={imageUrl}
                    alt={item.title}
                    width={96}
                    height={96}
                    className="h-20 w-20 rounded-2xl border border-slate-200 object-cover sm:h-24 sm:w-24"
                    fallbackClassName="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-300 sm:h-24 sm:w-24"
                    iconClassName="h-7 w-7"
                />

                <div className="flex-1">
                    <h3 className="line-clamp-2 font-black text-[var(--sf-checkout-text)]">
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
                                aria-label={presentationVariant === 'atelier-editorial' ? 'Decrease quantity for ' + item.title : undefined}
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

                            <div className="w-10 text-center font-black text-[var(--sf-checkout-text)]">
                                {item.quantity}
                            </div>

                            <button
                                type="button"
                                aria-label={presentationVariant === 'atelier-editorial' ? 'Increase quantity for ' + item.title : undefined}
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
                            <p className="text-lg font-black text-[var(--sf-checkout-text)]">
                                ৳
                                {getCartItemPrice(item) * item.quantity}
                            </p>

                            <p className="text-xs text-slate-400">
                                ৳
                                {getCartItemPrice(item)}
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
                        className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--sf-checkout-error)] hover:text-[var(--sf-checkout-error)]"
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
    presentationVariant,
    cartItems,
    checkoutBranding,
    finalShippingCost,
    deliveryReady = true,
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
    phoneVerified,
    subtotal,
    totalAmount,
    updateQuantity,
    visiblePolicies,
}) {
    return (
        <div>
            <div data-atelier-part={presentationVariant === 'atelier-editorial' ? 'checkout-summary' : undefined} className="sticky top-28 overflow-hidden rounded-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] shadow-xl shadow-slate-200/70">
                <div className="border-b border-slate-200 bg-[var(--sf-checkout-card-background)] p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="sf-kicker">Review</p>
                            <h2 className="mt-1 text-2xl font-black text-[var(--sf-checkout-text)]">
                                Order Summary
                            </h2>
                        </div>
                        <span className="rounded-full bg-[var(--sf-checkout-card-background)] px-3 py-1.5 text-xs font-black text-[var(--sf-checkout-accent)] shadow-sm">
                            {cartItems.length} item{cartItems.length === 1 ? "" : "s"}
                        </span>
                    </div>
                </div>

                <div className="max-h-[460px] space-y-5 overflow-y-auto p-6 sm:p-7">
                    {cartItems.map((item) => (
                        <CheckoutOrderItem
                            presentationVariant={presentationVariant}
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

                            <span className="font-bold text-[var(--sf-checkout-text)]">
                                ৳ {subtotal}
                            </span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-500">
                                Delivery Charge
                            </span>

                            <span className="font-bold text-[var(--sf-checkout-text)]">
                                {finalShippingCost == null ? "Select district" : `৳ ${finalShippingCost}`}
                            </span>
                        </div>

                        {promotionDiscount > 0 && (
                            <div className="flex justify-between text-[var(--sf-checkout-success)]">
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
                        <span className="text-xl font-black text-[var(--sf-checkout-text)]">
                            Total
                        </span>

                        <span className="text-3xl font-black text-[var(--sf-checkout-text)]">
                            {totalAmount == null ? "Awaiting delivery charge" : `৳ ${totalAmount}`}
                        </span>
                    </div>

                    <CheckoutPolicyConsent
                        policyAccepted={policyAccepted}
                        setPolicyAccepted={setPolicyAccepted}
                    />

                    <button
                        type="submit"
                        disabled={loading || !policyAccepted || !deliveryReady}
                        className="sf-btn sf-checkout-submit mt-7 w-full py-5 text-lg disabled:opacity-50"
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
                                {phoneVerified ? "Place Order" : "Place Order"}
                            </>
                        )}
                    </button>

                    <div className="mt-5 grid gap-3 text-sm font-semibold text-slate-600">
                        <p className="flex items-center justify-center gap-2">
                            <ShieldCheck
                                size={16}
                                className="text-[var(--sf-checkout-success)]"
                            />
                            {checkoutBranding.trustMessage || "Secure Checkout"}
                        </p>
                        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-[var(--sf-checkout-success)]">
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

export function CheckoutMobileStickyBar({ loading, phoneVerified, policyAccepted, totalAmount, deliveryReady = true }) {
    return (
        <div className="sf-mobile-action-bar fixed inset-x-0 z-40 border-t border-slate-200 bg-[var(--sf-checkout-card-background)] p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-xl items-center gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Pay on delivery</p>
                    <p className="text-xl font-black text-[var(--sf-checkout-text)]">{totalAmount == null ? "Awaiting delivery charge" : `৳ ${totalAmount}`}</p>
                </div>
                <button
                    type="submit"
                    disabled={loading || !policyAccepted || !deliveryReady}
                    className="sf-btn min-h-0 px-5 py-3 text-sm disabled:opacity-50"
                    style={{ borderRadius: 'var(--sf-checkout-radius)', backgroundColor: 'var(--sf-checkout-button-background)', color: 'var(--sf-checkout-button-text)' }}
                >
                    {loading ? <Loader2 size={17} className="animate-spin" /> : <Lock size={16} />}
                    {phoneVerified ? "Place order" : "Place order"}
                </button>
            </div>
        </div>
    );
}

// Keep the original modal callable without React hooks; only Atelier needs focus management.
function AtelierCheckoutDialog({ open, onClose, busy, render }) {
    const dialogRef = useAtelierDialog({ enabled: true, open, onClose, busy });
    return render(dialogRef);
}

export function CheckoutOtpModal({
    presentationVariant,
    error,
    message,
    cooldownSeconds = 0,
    expired = false,
    onResendCode,
    maskedPhone,
    onCancel,
    onSendCode,
    onVerifyCode,
    open,
    otp,
    sending,
    setOtp,
    state,
    verifying,
}) {
    const atelier = presentationVariant === 'atelier-editorial';
    const isBusy = sending || verifying || state === "placing_order";
    if (!open) return null;
    const isOtpInput = state === "otp_input" || state === "verifying" || state === "error";
    const handleSubmit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (isBusy) return;
        if (isOtpInput) {
            if (otp.length === 6 && !expired) onVerifyCode();
            return;
        }
        if (cooldownSeconds === 0) onSendCode();
    };

    const renderModal = (dialogRef) => (
        <div ref={dialogRef} aria-busy={atelier && isBusy ? true : undefined} data-atelier-dialog={atelier ? "checkout-otp" : undefined} className="fixed inset-0 z-[120] flex items-end bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="checkout-otp-title">
            <form onSubmit={handleSubmit} className="w-full overflow-hidden rounded-t-[2rem] border border-slate-200 bg-[var(--sf-checkout-card-background)] shadow-2xl shadow-slate-950/20 sm:max-w-md sm:rounded-[2rem]">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[var(--sf-checkout-success)]">
                            <ShieldCheck size={20} />
                        </span>
                        <div>
                            <h2 id="checkout-otp-title" className="text-xl font-black text-[var(--sf-checkout-text)]">
                                Verify your phone number
                            </h2>
                            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                                We need to verify your delivery phone before placing this order.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isBusy}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-[var(--sf-checkout-text)] disabled:opacity-50"
                        aria-label="Close phone verification"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-5 p-5 sm:p-6">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600">
                        {isOtpInput ? (
                            <>Enter the 6-digit code sent to <span className="font-black text-[var(--sf-checkout-text)]">{maskedPhone || "your phone"}</span>.</>
                        ) : state === "placing_order" ? (
                            <>Phone verified. Placing your order securely now.</>
                        ) : (
                            <>Send a verification code to <span className="font-black text-[var(--sf-checkout-text)]">{maskedPhone || "your phone number"}</span> to place your order.</>
                        )}
                    </div>

                    {isOtpInput && (
                        <div>
                            <label htmlFor="checkout-modal-otp" className="mb-2 block text-sm font-bold text-slate-700">
                                Verification code
                            </label>
                            <input
                                id="checkout-modal-otp"
                                autoFocus={atelier || undefined}
                                aria-invalid={atelier && error ? true : undefined}
                                aria-describedby={atelier && error ? "checkout-otp-error" : undefined}
                                value={otp}
                                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="000000"
                                inputMode="numeric"
                                enterKeyHint="done"
                                autoComplete="one-time-code"
                                pattern="[0-9]*"
                                maxLength={6}
                                disabled={isBusy}
                                className="sf-field text-center text-lg font-black tracking-[0.35em]"
                            />
                        </div>
                    )}

                    {onResendCode && (
                        <div className="space-y-2 text-sm">
                            {message && <p role="status" className="text-[var(--sf-checkout-success)]">{message}</p>}
                            {expired && <p role="status" className="text-[var(--sf-checkout-error)]">Verification code expired. Request a new code.</p>}
                            {isOtpInput ? (
                                <button type="button" onClick={onResendCode}
                                    disabled={isBusy || cooldownSeconds > 0}
                                    className="sf-btn sf-btn-secondary min-h-11 w-full py-3 disabled:opacity-50">
                                    {sending ? "Sending code…" : cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : "Resend code"}
                                </button>
                            ) : cooldownSeconds > 0 && <p>Request another code in {cooldownSeconds}s.</p>}
                        </div>
                    )}

                    {error && (
                        <p id={atelier ? "checkout-otp-error" : undefined} role={atelier ? "alert" : undefined} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-[var(--sf-checkout-error)]">
                            {error}
                        </p>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isBusy}
                            className="sf-btn sf-btn-secondary justify-center py-3 disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        {!isOtpInput ? (
                            <button
                                type="submit"
                                disabled={isBusy || cooldownSeconds > 0}
                                className="sf-btn sf-btn-primary justify-center py-3 disabled:opacity-50"
                            >
                                {sending ? <Loader2 size={17} className="animate-spin" /> : <Phone size={17} />}
                                Send Code
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={isBusy || otp.length !== 6 || expired}
                                className="sf-btn sf-btn-primary justify-center py-3 disabled:opacity-50"
                            >
                                {verifying || state === "placing_order" ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
                                {state === "placing_order" ? "Placing order" : "Verify & place order"}
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
    return atelier
        ? <AtelierCheckoutDialog open={open} onClose={onCancel} busy={isBusy} render={renderModal}/>
        : renderModal();
}
