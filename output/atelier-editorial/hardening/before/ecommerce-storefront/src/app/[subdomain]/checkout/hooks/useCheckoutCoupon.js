"use client";

import { useEffect, useState } from "react";

import { toast } from "react-hot-toast";

import API from "@/api/api";

export function useCheckoutCoupon({ cartItems, customerEmail, subdomain, subtotal }) {
    const [promotionCode, setPromotionCode] = useState("");
    const [promotionPreview, setPromotionPreview] = useState(null);
    const [promotionMessage, setPromotionMessage] = useState(null);

    useEffect(() => {
        const pendingCode = sessionStorage.getItem("shopforall_pending_promo");

        if (pendingCode) {
            queueMicrotask(() => {
                setPromotionCode(pendingCode);
                setPromotionMessage({
                    type: "info",
                    text: "Coupon copied from cart. Apply it to validate before placing your order.",
                });
            });
        }
    }, []);

    const handleApplyPromotion = async () => {
        if (!promotionCode.trim()) {
            toast.error("Enter a coupon code");
            return;
        }

        try {
            const { data } = await API.post(
                `/promotions/storefront/${subdomain}/validate`,
                {
                    code: promotionCode,
                    subtotal,
                    customerEmail,
                    items: cartItems.map((item) => {
                        const unitPrice = item.cartPrice || item.finalPrice || item.sellingPrice || 0;

                        return {
                            productId: item._id,
                            category: item.category,
                            collections: item.collections || [],
                            quantity: item.quantity,
                            price: unitPrice,
                            total: unitPrice * item.quantity,
                        };
                    }),
                }
            );

            setPromotionPreview(data.data);
            setPromotionMessage({
                type: "success",
                text: data.data?.freeShipping
                    ? "Coupon applied with free shipping."
                    : "Coupon applied successfully.",
            });
            toast.success("Coupon applied");
        } catch (error) {
            setPromotionPreview(null);
            setPromotionMessage({
                type: "error",
                text: error.response?.data?.error || "Coupon is not valid for this order.",
            });
            toast.error(error.response?.data?.error || "Coupon is not valid");
        }
    };

    return {
        promotionCode,
        setPromotionCode,
        promotionPreview,
        promotionMessage,
        handleApplyPromotion,
    };
}
