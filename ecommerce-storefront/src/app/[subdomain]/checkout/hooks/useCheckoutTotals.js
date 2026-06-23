"use client";

import { useMemo } from "react";

export function useCheckoutTotals({ cartTotal, city, promotionPreview }) {
    return useMemo(() => {
        const isDhaka = city
            ?.trim()
            ?.toLowerCase()
            ?.includes("dhaka");

        const shippingCost = isDhaka ? 80 : 120;
        const subtotal = cartTotal;
        const promotionDiscount = promotionPreview?.discountAmount || 0;
        const finalShippingCost = promotionPreview?.freeShipping ? 0 : shippingCost;
        const totalAmount = Math.max(0, subtotal - promotionDiscount) + finalShippingCost;

        return {
            isDhaka,
            shippingCost,
            subtotal,
            promotionDiscount,
            finalShippingCost,
            totalAmount,
        };
    }, [cartTotal, city, promotionPreview]);
}
