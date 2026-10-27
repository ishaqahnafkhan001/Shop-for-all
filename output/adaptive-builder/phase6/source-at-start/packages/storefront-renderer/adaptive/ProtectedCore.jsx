"use client";
import { ProductDetailsView } from '../presentation/ProductDetailsView.jsx';
import { ReferenceStorefrontHeader } from '../reference/StorefrontHeader.jsx';
import { ReferenceStorefrontFooter } from '../reference/StorefrontFooter.jsx';
import { Link } from '../presentation/Runtime.jsx';
import { CategoryView, CategoryFilters } from '../presentation/CategoryView.jsx';
import { CollectionView } from '../presentation/CollectionView.jsx';
import { CartView } from '../presentation/CartView.jsx';
import AuthView from '../presentation/AccountAuthView.jsx';
import CustomerDashboard from '../presentation/AccountDashboardView.jsx';
import { AccountSecurityView } from '../presentation/AccountSecurityView.jsx';
import { TrackingView } from '../presentation/TrackingView.jsx';
import { PolicyIndexView } from '../presentation/PolicyIndexView.jsx';
import { PolicyView } from '../presentation/PolicyView.jsx';
import { CheckoutPageShell, CheckoutDetailsColumn, CheckoutOrderSummary, CheckoutOtpModal,
    CheckoutMarketingConsent, CheckoutMobileStickyBar, CheckoutSuccessState, CheckoutEmptyCartState } from '../presentation/CheckoutSections.jsx';

// These props come exclusively from the trusted route/state adapter. The
// merchant graph has no data/action path into this boundary. No controllers or
// API-owning hooks are imported here.
export function ProtectedCore({ pageKind, data = {}, actions = {} }) {
    if (pageKind === 'header' || pageKind === 'footer') {
        const View = pageKind === 'header' ? ReferenceStorefrontHeader : ReferenceStorefrontFooter;
        return <View adaptiveParts theme={data.theme} shopName={data.shopName} subdomain={data.subdomain}
            cartCount={data.cartCount || 0} LinkComponent={Link} preview={data.preview === true} onSearch={actions.search}
            trustedBadge={data.trustedBadge} shopVerification={data.shopVerification} />;
    }
    if (pageKind === 'product') {
        if (data.state === 'loading') return <p role="status">Loading product…</p>;
        if (data.state === 'missing' || !data.product) return <p role="status">Product unavailable</p>;
        return <>
            {data.error && <p data-ab-part="error" role="alert">{data.error}</p>}
            <ProductDetailsView adaptiveParts product={data.product} currentVariant={data.currentVariant}
                displayStock={data.displayStock} baseOriginalPrice={data.baseOriginalPrice}
                displayDiscount={data.displayDiscount} displayFinalPrice={data.displayFinalPrice}
                availableAttributes={data.availableAttributes} selectedAttributes={data.selectedAttributes}
                quantity={data.quantity} setQuantity={actions.setQuantity} handleVariantSelect={actions.selectVariant}
                handleAddToCart={actions.addToCart} handleBuyNow={actions.buyNow}
                presentationVariant={data.presentationVariant} />
        </>;
    }
    if (['category', 'collection'].includes(pageKind)) {
        if (data.state === 'loading') return <p role="status">Loading products…</p>;
        if (data.state === 'missing') return <p role="status" data-ab-part="error">Catalog unavailable</p>;
        const View = pageKind === 'category' ? CategoryView : CollectionView;
        return <View {...data} {...actions} adaptiveParts filterContent={pageKind === 'category'
            ? <CategoryFilters {...data} {...actions} adaptiveParts /> : undefined} />;
    }
    if (pageKind === 'cart') return <>
        {data.state === 'refreshing' && <p role="status">Refreshing cart…</p>}
        {data.error && <p role="alert" data-ab-part="error">{data.error}</p>}
        <CartView {...data} {...actions} adaptiveParts />
    </>;
    if (pageKind === 'account') {
        if (data.state === 'loading') return <p role="status">Loading account…</p>;
        return <>{data.error && <p role="alert" data-ab-part="error">{data.error}</p>}
            {data.authenticated === true && data.user
                ? <CustomerDashboard key={data.initialTab} {...data} {...actions} adaptiveParts
                    SecurityComponent={() => <AccountSecurityView {...data} {...actions} adaptiveParts />} />
                : <AuthView {...data} {...actions} adaptiveParts />}
        </>;
    }
    if (pageKind === 'track') {
        // A supplied order alone is not an access grant. The route adapter must
        // explicitly confirm its existing phone/OTP access check first.
        const verified = data.accessVerified === true;
        return <>{data.error && <p role="alert" data-ab-part="error">{data.error}</p>}
            <TrackingView {...data} {...actions} adaptiveParts order={verified ? data.order : null}
                orderItems={verified ? data.orderItems : []} address={verified ? data.address : null}
                orderAccessToken={verified ? data.orderAccessToken : null} />
        </>;
    }
    if (pageKind === 'policiesIndex') return <PolicyIndexView {...data} adaptiveParts />;
    if (pageKind === 'policy') return data.state === 'notFound' ? <p role="status">Policy unavailable</p>
        : <PolicyView {...data} adaptiveParts />;
    if (pageKind === 'checkout') {
        if (data.state === 'success') return <CheckoutSuccessState adaptiveParts orderId={data.orderId} />;
        if (data.state === 'empty') return <CheckoutEmptyCartState adaptiveParts />;
        if (!data.formData || !Array.isArray(data.cartItems)) return <p role="alert">Checkout data unavailable. Please reload before ordering.</p>;
        return <>
            <CheckoutPageShell adaptiveParts checkoutBranding={data.checkoutBranding} onSubmit={actions.submit}
                mobileStickyBar={<CheckoutMobileStickyBar adaptiveParts loading={data.loading} phoneVerified={data.phoneVerified}
                    policyAccepted={data.policyAccepted} totalAmount={data.totalAmount} />}>
                <div data-ab-region="details">
                    {data.error && <p data-ab-part="error" role="alert">{data.error}</p>}
                    <CheckoutDetailsColumn adaptiveParts formData={data.formData} onInputChange={actions.input}
                        isDhaka={data.isDhaka} presentationVariant={data.presentationVariant} />
                </div>
                <CheckoutMarketingConsent adaptiveParts checked={data.marketingEmailOptIn} onChange={actions.marketingConsent} />
                <div data-ab-region="summary">
                    <CheckoutOrderSummary adaptiveParts presentationVariant={data.presentationVariant} cartItems={data.cartItems}
                        checkoutBranding={data.checkoutBranding} finalShippingCost={data.finalShippingCost}
                        loading={data.loading} policies={data.policies} policyAccepted={data.policyAccepted}
                        productsDetails={data.productsDetails} promotionCode={data.promotionCode}
                        promotionDiscount={data.promotionDiscount} promotionMessage={data.promotionMessage}
                        phoneVerified={data.phoneVerified} subtotal={data.subtotal} totalAmount={data.totalAmount}
                        visiblePolicies={data.visiblePolicies} onApplyPromotion={actions.applyPromotion}
                        removeFromCart={actions.removeFromCart} setPolicyAccepted={actions.policyConsent}
                        setPromotionCode={actions.promotionCode} updateQuantity={actions.updateQuantity} />
                </div>
            </CheckoutPageShell>
            <CheckoutOtpModal adaptiveParts presentationVariant={data.presentationVariant} open={data.otp.open}
                error={data.otp.error} message={data.otp.message} cooldownSeconds={data.otp.cooldownSeconds}
                expired={data.otp.expired} maskedPhone={data.otp.maskedPhone} otp={data.otp.value}
                sending={data.otp.sending} state={data.otp.state} verifying={data.otp.verifying}
                onResendCode={actions.resendOtp} onCancel={actions.cancelOtp} onSendCode={actions.sendOtp}
                onVerifyCode={actions.verifyOtp} setOtp={actions.otp} />
        </>;
    }
    return null;
}
