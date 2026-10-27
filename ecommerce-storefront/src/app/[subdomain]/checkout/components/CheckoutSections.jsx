"use client";
import * as Views from '@scaleup/storefront-renderer/presentation/CheckoutSections';
import StorefrontPresentationRuntime from '@/components/storefront/StorefrontPresentationRuntime';
const Region = ({ active, name, children }) => active ? <div data-ab-region={name}>{children}</div> : children;
export function CheckoutSuccessState(props) { return <StorefrontPresentationRuntime><Views.CheckoutSuccessState {...props} /></StorefrontPresentationRuntime>; }
export function CheckoutEmptyCartState(props) { return <StorefrontPresentationRuntime><Views.CheckoutEmptyCartState {...props} /></StorefrontPresentationRuntime>; }
export function CheckoutTrustBadges(props) { return <StorefrontPresentationRuntime><Views.CheckoutTrustBadges {...props} /></StorefrontPresentationRuntime>; }
export function CheckoutPageShell(props) { return <StorefrontPresentationRuntime><Views.CheckoutPageShell {...props} /></StorefrontPresentationRuntime>; }
export function CheckoutCustomerInfo(props) { return <StorefrontPresentationRuntime><Views.CheckoutCustomerInfo {...props} /></StorefrontPresentationRuntime>; }
export function CheckoutDeliveryChargeNotice(props) { return <StorefrontPresentationRuntime><Views.CheckoutDeliveryChargeNotice {...props} /></StorefrontPresentationRuntime>; }
export function CheckoutDeliveryMethod(props) { return <StorefrontPresentationRuntime><Views.CheckoutDeliveryMethod {...props} /></StorefrontPresentationRuntime>; }
export function CheckoutPaymentMethod(props) { return <StorefrontPresentationRuntime><Views.CheckoutPaymentMethod {...props} /></StorefrontPresentationRuntime>; }
export function CheckoutPhoneOtpBox(props) { return <StorefrontPresentationRuntime><Views.CheckoutPhoneOtpBox {...props} /></StorefrontPresentationRuntime>; }
export function CheckoutDetailsColumn(props) { return <StorefrontPresentationRuntime><Region active={props.adaptiveParts} name="details"><Views.CheckoutDetailsColumn {...props} /></Region></StorefrontPresentationRuntime>; }
export function CheckoutOrderSummary(props) { return <StorefrontPresentationRuntime><Region active={props.adaptiveParts} name="summary"><Views.CheckoutOrderSummary {...props} /></Region></StorefrontPresentationRuntime>; }
export function CheckoutMobileStickyBar(props) { return <StorefrontPresentationRuntime><Views.CheckoutMobileStickyBar {...props} /></StorefrontPresentationRuntime>; }
export function CheckoutOtpModal(props) { return <StorefrontPresentationRuntime><Views.CheckoutOtpModal {...props} /></StorefrontPresentationRuntime>; }

export function CheckoutMarketingConsent(props) { return <Views.CheckoutMarketingConsent {...props} />; }
