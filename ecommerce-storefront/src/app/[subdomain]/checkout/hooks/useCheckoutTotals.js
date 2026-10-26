"use client";

import { useMemo } from "react";

export function useCheckoutTotals({ cartTotal, quote, promotionPreview }) {
    return useMemo(() => {
        const shippingCost = quote?.originalCharge ?? null;
        const subtotal = cartTotal;
        const promotionDiscount = promotionPreview?.discountAmount || 0;
        const finalShippingCost = quote ? (promotionPreview?.freeShipping ? 0 : shippingCost) : null;
        const totalAmount = quote ? Math.max(0, subtotal - promotionDiscount) + finalShippingCost : null;

        return {
            shippingCost,
            subtotal,
            promotionDiscount,
            finalShippingCost,
            totalAmount,
        };
    }, [cartTotal, quote, promotionPreview]);
}
