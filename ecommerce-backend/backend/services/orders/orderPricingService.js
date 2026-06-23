const Promotion = require('../../models/Promotion');
const { evaluatePromotion } = require('../promotionService');

const getShippingCostForZone = (zone) => (zone === 'Inside Dhaka' ? 80 : 130);

const buildOrderLineItem = ({ product, variant, item }) => {
    const basePrice = variant.pricing?.price ?? variant.priceOverride ?? product.pricing.sellingPrice;
    const discount = product.pricing.discount || 0;
    const unitPrice = Math.round(basePrice - (basePrice * discount / 100));
    const totalItemPrice = unitPrice * item.quantity;
    const buyingPrice = variant.pricing?.costPrice ?? product.pricing.buyingPrice;

    return {
        subtotal: totalItemPrice,
        promotionItem: {
            productId: product._id,
            category: product.category,
            collections: product.collections,
            quantity: item.quantity,
            price: unitPrice,
            total: totalItemPrice
        },
        orderItem: {
            productId: product._id,
            variantId: variant._id,
            title: product.title,
            sku: variant.sku,
            attributes: variant.attributes,
            quantity: item.quantity,
            price: unitPrice,
            buyingPrice,
            total: totalItemPrice
        }
    };
};

const applyPromotionToTotals = async ({
    shopId,
    code,
    subtotal,
    items,
    customerId,
    shippingCost,
    session
}) => {
    if (!code) {
        return {
            discountAmount: 0,
            shippingCost,
            promotionSnapshot: {}
        };
    }

    const promotionResult = await evaluatePromotion({
        shopId,
        code,
        subtotal,
        items,
        customerId,
        session
    });

    if (!promotionResult.valid) {
        throw new Error(promotionResult.error || 'Coupon is not valid');
    }

    const discountAmount = promotionResult.discountAmount;
    return {
        discountAmount,
        shippingCost: promotionResult.freeShipping ? 0 : shippingCost,
        promotionSnapshot: {
            code: promotionResult.promotion.code,
            type: promotionResult.promotion.type,
            discountAmount,
            freeShipping: promotionResult.freeShipping
        }
    };
};

const incrementPromotionUsage = async ({ shopId, promotionSnapshot, session }) => {
    if (!promotionSnapshot?.code) return;

    await Promotion.updateOne(
        { shop_id: shopId, code: promotionSnapshot.code },
        { $inc: { usageCount: 1 } }
    ).session(session);
};

module.exports = {
    getShippingCostForZone,
    buildOrderLineItem,
    applyPromotionToTotals,
    incrementPromotionUsage
};
