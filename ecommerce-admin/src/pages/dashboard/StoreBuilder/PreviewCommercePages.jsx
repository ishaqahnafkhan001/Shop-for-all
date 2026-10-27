import { useState } from 'react';
import { getStorefrontPresentationVariant } from '@scaleup/storefront-theme';
import { ProductDetailsView } from '@scaleup/storefront-renderer/presentation/ProductDetailsView';
import RelatedProducts from '@scaleup/storefront-renderer/presentation/RelatedProducts';
import ReviewSection from '@scaleup/storefront-renderer/presentation/ReviewSection';
import { CartView } from '@scaleup/storefront-renderer/presentation/CartView';
import { PolicyView } from '@scaleup/storefront-renderer/presentation/PolicyView';
import { CheckoutPageShell, CheckoutDetailsColumn, CheckoutOrderSummary, CheckoutMobileStickyBar, CheckoutEmptyCartState } from '@scaleup/storefront-renderer/presentation/CheckoutSections';
import { getInitialAttributes, getProductPresentation } from '@scaleup/storefront-renderer/product-data';
import { getDefaultPolicyText, POLICY_LABELS } from '../../../utils/storeBuilderPolicies.js';

const noop = () => {};
// This adapter supplies example commerce state only. Layout and field markup are
// the exact live views; no API, payment, review submission, or cart persistence.
export function PreviewCommercePage({ page, theme, products, shopName, reviews = [] }) {
    const [quantity, setQuantity] = useState(1);
    const [selectedAttributes, setSelectedAttributes] = useState(() => getInitialAttributes(products[0]));
    const product = products[0];
    const presentationVariant = getStorefrontPresentationVariant(theme);
    if (page === 'policy') return <PolicyView presentationVariant={presentationVariant} label={POLICY_LABELS.refund} content={theme.policies?.refund || getDefaultPolicyText('refund', { storeName: shopName })} />;
    if (page === 'product') {
        if (!product) return <div className="sf-page sf-shell py-12">Add a product to preview its detail page.</div>;
        return <ProductDetailsView presentationVariant={presentationVariant} product={product} {...getProductPresentation(product, selectedAttributes)}
            quantity={quantity} setQuantity={setQuantity} selectedAttributes={selectedAttributes}
            handleVariantSelect={(key, value) => { setQuantity(1); setSelectedAttributes(previous => ({ ...previous, [key]: value })); }}
            handleAddToCart={noop} handleBuyNow={noop}
            relatedContent={<RelatedProducts subdomain="preview" products={products.slice(1, 6)} presentationVariant={presentationVariant} productCard={{ ...theme.productCard, colors: theme.colors?.productCard }} />}
            reviewContent={<ReviewSection presentationVariant={presentationVariant} subdomain="preview" reviews={reviews.filter(review => String(review.product_id || review.product) === String(product._id))} isLoggedIn={false} />} />;
    }
    const cartItems = products.slice(0, 2).map(item => ({ ...item, quantity: 1, cartItemId: String(item._id) }));
    const subtotal = cartItems.reduce((total, item) => total + Number(item.finalPrice ?? item.sellingPrice ?? 0), 0);
    if (page === 'cart') return <CartView cartItems={cartItems} subtotal={subtotal} shipping={null}
        total={subtotal} totalSavings={cartItems.reduce((total, item) => total + Math.max(0, Number(item.pricing?.sellingPrice ?? item.sellingPrice ?? 0) - Number(item.finalPrice ?? 0)), 0)}
        getCartImageUrl={item => item.imageUrl || item.images?.[0] || ''} removeFromCart={noop} updateQuantity={noop}
        promoCode="" setPromoCode={noop} handleApplyPromo={noop} recommendations={[]} recommendationsLoading={false}
        productActions={{}} themedProductCard={theme.productCard} />;
    if (!cartItems.length) return <CheckoutEmptyCartState />;
    const policies = theme.policies || {};
    const visiblePolicies = Object.entries(POLICY_LABELS).filter(([key]) => policies[key]?.trim());
    return <CheckoutPageShell checkoutBranding={theme.checkoutBranding} onSubmit={event => event.preventDefault()}
        mobileStickyBar={<CheckoutMobileStickyBar loading={false} phoneVerified={false} policyAccepted={false} totalAmount={null} />}>
        <CheckoutDetailsColumn formData={{ fullName: '', email: '', phone: '', address: '', city: '', notes: '' }} delivery={null} onInputChange={noop} />
        <CheckoutOrderSummary cartItems={cartItems} checkoutBranding={theme.checkoutBranding} finalShippingCost={null} loading={false}
            onApplyPromotion={noop} policies={policies} policyAccepted={false} productsDetails={Object.fromEntries(products.map(item => [item._id, item]))}
            promotionCode="" promotionDiscount={0} promotionMessage={null} phoneVerified={false} removeFromCart={noop}
            setPolicyAccepted={noop} setPromotionCode={noop} subtotal={subtotal} totalAmount={null} updateQuantity={noop} visiblePolicies={visiblePolicies} />
    </CheckoutPageShell>;
}
