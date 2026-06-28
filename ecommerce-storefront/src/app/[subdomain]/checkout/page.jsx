"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import { toast } from "react-hot-toast";

import API from "@/api/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useStorefrontTheme } from "@/components/storefront/StorefrontThemeProvider";
import { trackStorefrontEvent } from "@/utils/analyticsTracker";

import {
    CheckoutDetailsColumn,
    CheckoutEmptyCartState,
    CheckoutMobileStickyBar,
    CheckoutOrderSummary,
    CheckoutPageShell,
    CheckoutSuccessState,
} from "./components/CheckoutSections";
import { useCheckoutCartProducts } from "./hooks/useCheckoutCartProducts";
import { useCheckoutCoupon } from "./hooks/useCheckoutCoupon";
import { useCheckoutFormState } from "./hooks/useCheckoutFormState";
import { useCheckoutPhoneOtp } from "./hooks/useCheckoutPhoneOtp";
import { useCheckoutTotals } from "./hooks/useCheckoutTotals";

export default function CheckoutPage({ params }) {
    const { subdomain } = React.use(params);
    const {
        cartItems,
        cartTotal,
        clearCart,
        updateQuantity,
        removeFromCart,
    } = useCart();
    const { user } = useAuth();
    const { theme } = useStorefrontTheme();

    const checkoutTrackedRef = useRef("");
    const customerId = user?.role === "Customer" ? (user._id || user.id) : null;
    const policies = useMemo(() => theme.policies || {}, [theme.policies]);
    const visiblePolicies = useMemo(() => (
        [
            ["refund", "Refund policy"],
            ["shipping", "Shipping policy"],
            ["privacy", "Privacy policy"],
            ["terms", "Terms of service"],
        ].filter(([key]) => Boolean(policies[key]?.trim()))
    ), [policies]);
    const checkoutBranding = useMemo(() => theme.checkoutBranding || {}, [theme.checkoutBranding]);

    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [orderId, setOrderId] = useState(null);
    const [policyAccepted, setPolicyAccepted] = useState(false);

    const { formData, handleInputChange } = useCheckoutFormState();
    const productsDetails = useCheckoutCartProducts({ cartItems, subdomain });
    const {
        promotionCode,
        setPromotionCode,
        promotionPreview,
        promotionMessage,
        handleApplyPromotion,
    } = useCheckoutCoupon({
        cartItems,
        customerEmail: formData.email,
        subdomain,
        subtotal: cartTotal,
    });
    const {
        isDhaka,
        shippingCost,
        subtotal,
        promotionDiscount,
        finalShippingCost,
        totalAmount,
    } = useCheckoutTotals({
        cartTotal,
        city: formData.city,
        promotionPreview,
    });

    useEffect(() => {
        if (cartItems.length === 0) return;

        const checkoutKey = cartItems
            .map((item) => `${item._id}:${item.variantId || item.selectedVariant?._id || "default"}:${item.quantity}`)
            .join("|");

        if (checkoutTrackedRef.current === checkoutKey) return;
        checkoutTrackedRef.current = checkoutKey;

        cartItems.forEach((item) => {
            const unitPrice = item.cartPrice || item.finalPrice || item.sellingPrice || 0;
            trackStorefrontEvent({
                subdomain,
                eventType: "begin_checkout",
                customer_id: customerId,
                product_id: item._id,
                variant_id: item.variantId || item.selectedVariant?._id,
                value: unitPrice * item.quantity,
                metadata: {
                    productTitle: item.title,
                    quantity: item.quantity,
                },
            });
        });
    }, [cartItems, customerId, subdomain]);

    const resolveCartVariantId = (item) => {
        if (item.variantId || item.selectedVariant?._id) {
            return item.variantId || item.selectedVariant._id;
        }

        const product = productsDetails[item._id];

        return product?.variants?.find((variant) => variant.isActive !== false && variant.status !== "archived")?._id
            || product?.variants?.[0]?._id;
    };

    const buildCheckoutItems = () => cartItems.map((item) => {
        const selectedVariantId = resolveCartVariantId(item);

        if (!selectedVariantId) {
            throw new Error(`No variant found for ${item.title}`);
        }

        return {
            productId: item._id,
            variantId: selectedVariantId,
            quantity: item.quantity,
        };
    });

    const checkoutResetKey = useMemo(() => (
        [
            formData.phone,
            formData.city,
            cartItems.map((item) => `${item._id}:${item.variantId || item.selectedVariant?._id || "default"}:${item.quantity}`).join("|"),
        ].join("::")
    ), [cartItems, formData.city, formData.phone]);

    const phoneOtp = useCheckoutPhoneOtp({ subdomain, resetKey: checkoutResetKey });

    const sendPhoneOtp = () => {
        try {
            phoneOtp.sendOtp({
                phone: formData.phone,
                items: buildCheckoutItems(),
            });
        } catch (error) {
            toast.error(error.message || "Complete your cart before phone verification");
        }
    };

    const verifyPhoneOtp = () => {
        try {
            phoneOtp.verifyOtp({
                phone: formData.phone,
                items: buildCheckoutItems(),
            });
        } catch (error) {
            toast.error(error.message || "Complete your cart before phone verification");
        }
    };

    const handlePlaceOrder = async (event) => {
        event.preventDefault();

        if (cartItems.length === 0) {
            toast.error("Your cart is empty");
            return;
        }

        if (!policyAccepted) {
            toast.error("Please accept the store policies before placing your order");
            return;
        }

        if (!phoneOtp.verified) {
            toast.error("Please verify your phone number before placing the order");
            return;
        }

        setLoading(true);

        try {
            let savedOrderData;

            if (user?.role === "Customer") {
                const secureItems = buildCheckoutItems();
                const securePayload = {
                    items: secureItems,
                    shipping: {
                        zone: isDhaka
                            ? "Inside Dhaka"
                            : "Outside Dhaka",
                        address: {
                            fullName: formData.fullName,
                            phone: formData.phone,
                            addressLine: formData.address,
                            city: formData.city,
                        },
                    },
                    payment: {
                        method: "COD",
                    },
                    promotionCode: promotionPreview?.code || promotionCode,
                    source: "storefront",
                    consent: {
                        checkoutPolicyAccepted: true,
                        version: "checkout_policy_v1",
                    },
                    checkoutSessionId: phoneOtp.checkoutSessionId,
                    phoneVerificationToken: phoneOtp.phoneVerificationToken,
                };

                const response = await API.post(
                    `/storefront/${subdomain}/orders`,
                    securePayload
                );

                savedOrderData = {
                    _id: response.data.orderId,
                };
            } else {
                const secureItems = buildCheckoutItems();
                const guestPayload = {
                    subdomain,
                    customer: {
                        fullName: formData.fullName,
                        email: formData.email,
                        phone: formData.phone,
                    },
                    shippingAddress: `${formData.address}, ${formData.city}`,
                    shippingZone: isDhaka
                        ? "Inside Dhaka"
                        : "Outside Dhaka",
                    items: cartItems.map((item, index) => ({
                        product: item._id,
                        variantId: secureItems[index]?.variantId,
                        quantity: item.quantity,
                        price:
                            item.cartPrice ||
                            item.finalPrice ||
                            item.sellingPrice,
                    })),
                    shippingCost,
                    totalAmount,
                    promotionCode: promotionPreview?.code || promotionCode,
                    source: "storefront",
                    consent: {
                        checkoutPolicyAccepted: true,
                        version: "checkout_policy_v1",
                    },
                    checkoutSessionId: phoneOtp.checkoutSessionId,
                    phoneVerificationToken: phoneOtp.phoneVerificationToken,
                };

                const response = await API.post(
                    "/public/orders",
                    guestPayload
                );

                savedOrderData = {
                    _id: response.data.orderId || response.data.order?._id || response.data._id,
                };
            }

            cartItems.forEach((item) => {
                const unitPrice =
                    item.cartPrice ||
                    item.finalPrice ||
                    item.sellingPrice ||
                    0;

                trackStorefrontEvent({
                    subdomain,
                    eventType: "order_placed",
                    customer_id: customerId,
                    product_id: item._id,
                    variant_id: item.variantId || item.selectedVariant?._id,
                    order_id: savedOrderData._id,
                    value: unitPrice * item.quantity,
                    metadata: {
                        productTitle: item.title,
                        quantity: item.quantity,
                        orderTotal: totalAmount,
                        paymentMethod: "COD",
                    },
                });
            });

            setOrderId(savedOrderData._id);
            setIsSuccess(true);
            sessionStorage.removeItem("shopforall_pending_promo");
            clearCart();
            toast.success("Order placed successfully");
        } catch (error) {
            console.error("Checkout order placement failed:", error);

            toast.error(
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message ||
                "Failed to place order"
            );
        } finally {
            setLoading(false);
        }
    };

    if (isSuccess) {
        return <CheckoutSuccessState orderId={orderId} />;
    }

    if (cartItems.length === 0) {
        return <CheckoutEmptyCartState />;
    }

    return (
        <CheckoutPageShell
            checkoutBranding={checkoutBranding}
            onSubmit={handlePlaceOrder}
            mobileStickyBar={(
                <CheckoutMobileStickyBar
                    loading={loading}
                    phoneVerified={phoneOtp.verified}
                    policyAccepted={policyAccepted}
                    totalAmount={totalAmount}
                />
            )}
        >
            <CheckoutDetailsColumn
                formData={formData}
                isDhaka={isDhaka}
                onInputChange={handleInputChange}
                phoneOtp={{
                    maskedPhone: phoneOtp.maskedPhone,
                    onSendOtp: sendPhoneOtp,
                    onVerifyOtp: verifyPhoneOtp,
                    otp: phoneOtp.otp,
                    sending: phoneOtp.sending,
                    setOtp: phoneOtp.setOtp,
                    verified: phoneOtp.verified,
                    verifying: phoneOtp.verifying,
                }}
            />

            <CheckoutOrderSummary
                cartItems={cartItems}
                checkoutBranding={checkoutBranding}
                finalShippingCost={finalShippingCost}
                loading={loading}
                onApplyPromotion={handleApplyPromotion}
                policies={policies}
                policyAccepted={policyAccepted}
                productsDetails={productsDetails}
                promotionCode={promotionCode}
                promotionDiscount={promotionDiscount}
                promotionMessage={promotionMessage}
                phoneVerified={phoneOtp.verified}
                removeFromCart={removeFromCart}
                setPolicyAccepted={setPolicyAccepted}
                setPromotionCode={setPromotionCode}
                subtotal={subtotal}
                totalAmount={totalAmount}
                updateQuantity={updateQuantity}
                visiblePolicies={visiblePolicies}
            />
        </CheckoutPageShell>
    );
}
