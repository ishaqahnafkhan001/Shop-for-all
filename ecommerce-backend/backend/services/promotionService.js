const Promotion = require('../models/Promotion');
const User = require('../models/User');
const Order = require('../models/Order');

const normalizeCode = (code) => {
    return String(code || '').trim().toUpperCase();
};

const isPromotionActive = (promotion) => {
    const now = new Date();

    if (!promotion) {
        return {
            active: false,
            reason: 'Coupon does not exist'
        };
    }

    if (!promotion.isActive) {
        return {
            active: false,
            reason: 'Coupon is inactive'
        };
    }

    if (promotion.startsAt && new Date(promotion.startsAt) > now) {
        return {
            active: false,
            reason: 'Coupon has not started yet'
        };
    }

    if (promotion.expiresAt && new Date(promotion.expiresAt) < now) {
        return {
            active: false,
            reason: 'Coupon has expired'
        };
    }

    if (
        promotion.usageLimit !== null &&
        promotion.usageLimit !== undefined &&
        promotion.usageCount >= promotion.usageLimit
    ) {
        return {
            active: false,
            reason: 'Coupon usage limit reached'
        };
    }

    return {
        active: true,
        reason: null
    };
};

const itemMatchesPromotion = (item, promotion) => {
    const appliesTo = promotion.appliesTo || {};
    const scope = appliesTo.scope || 'ALL';

    if (scope === 'ALL') {
        return true;
    }

    if (scope === 'PRODUCTS') {
        return (appliesTo.productIds || []).some(id => {
            return id.toString() === item.productId?.toString();
        });
    }

    if (scope === 'CATEGORIES') {
        return (appliesTo.categories || []).some(category => {
            return String(category).trim().toLowerCase() === String(item.category || '').trim().toLowerCase();
        });
    }

    if (scope === 'COLLECTIONS') {
        const itemCollections = item.collections || [];

        return (appliesTo.collectionIds || []).some(id => {
            return itemCollections.some(collectionId => {
                return collectionId.toString() === id.toString();
            });
        });
    }

    return false;
};

const countPreviousCustomerUses = async ({
                                             shopId,
                                             customerId,
                                             customerEmail,
                                             code,
                                             session
                                         }) => {
    let customer = customerId;

    if (!customer && customerEmail) {
        const user = await User.findOne({
            email: String(customerEmail).trim().toLowerCase(),
            shop_id: shopId
        })
            .select('_id')
            .session(session || null)
            .lean();

        customer = user?._id;
    }

    if (!customer) {
        return 0;
    }

    return Order.countDocuments({
        shop_id: shopId,
        customer,
        'promotion.code': normalizeCode(code)
    }).session(session || null);
};

exports.evaluatePromotion = async ({
                                       shopId,
                                       code,
                                       subtotal,
                                       items = [],
                                       customerId,
                                       customerEmail,
                                       session
                                   }) => {
    const cleanCode = normalizeCode(code);

    if (!cleanCode) {
        return {
            valid: false,
            error: 'Coupon code is required',
            discountAmount: 0,
            freeShipping: false
        };
    }

    const numericSubtotal = Number(subtotal);

    if (!Number.isFinite(numericSubtotal) || numericSubtotal < 0) {
        return {
            valid: false,
            error: 'Invalid subtotal',
            discountAmount: 0,
            freeShipping: false
        };
    }

    const promotion = await Promotion.findOne({
        shop_id: shopId,
        code: cleanCode
    }).session(session || null);

    const activeCheck = isPromotionActive(promotion);
    console.log('PROMOTION DEBUG:', {
        shopId,
        code: cleanCode,
        found: Boolean(promotion),
        promotionShop: promotion?.shop_id,
        promotionCode: promotion?.code,
        isActive: promotion?.isActive,
        startsAt: promotion?.startsAt,
        expiresAt: promotion?.expiresAt,
        usageLimit: promotion?.usageLimit,
        usageCount: promotion?.usageCount,
        now: new Date()
    });
    
    if (!activeCheck.active) {
        return {
            valid: false,
            error: activeCheck.reason || 'Coupon is invalid or expired',
            discountAmount: 0,
            freeShipping: false
        };
    }

    if (numericSubtotal < (Number(promotion.minSubtotal) || 0)) {
        return {
            valid: false,
            error: `Minimum subtotal is ${promotion.minSubtotal}`,
            discountAmount: 0,
            freeShipping: false
        };
    }

    const previousUses = await countPreviousCustomerUses({
        shopId,
        customerId,
        customerEmail,
        code: promotion.code,
        session
    });

    if (
        promotion.perCustomerLimit &&
        previousUses >= promotion.perCustomerLimit
    ) {
        return {
            valid: false,
            error: 'Coupon usage limit reached for this customer',
            discountAmount: 0,
            freeShipping: false
        };
    }

    if (promotion.type === 'FIRST_ORDER' && previousUses > 0) {
        return {
            valid: false,
            error: 'First order coupon can only be used once',
            discountAmount: 0,
            freeShipping: false
        };
    }

    const eligibleItems = items.filter(item => itemMatchesPromotion(item, promotion));

    const eligibleSubtotal = eligibleItems.reduce((sum, item) => {
        return sum + (Number(item.total) || 0);
    }, 0);

    if (promotion.appliesTo?.scope !== 'ALL' && eligibleSubtotal <= 0) {
        return {
            valid: false,
            error: 'Coupon is not applicable to these products',
            discountAmount: 0,
            freeShipping: false
        };
    }

    let discountAmount = 0;
    let freeShipping = false;

    if (promotion.type === 'PERCENTAGE' || promotion.type === 'FIRST_ORDER') {
        const percentage = Number(promotion.value) || 0;
        discountAmount = Math.round(eligibleSubtotal * (percentage / 100));
    }

    else if (promotion.type === 'FIXED_AMOUNT') {
        const value = Number(promotion.value) || 0;
        discountAmount = Math.min(value, eligibleSubtotal || numericSubtotal);
    }

    else if (promotion.type === 'FREE_SHIPPING') {
        freeShipping = true;
    }

    else if (promotion.type === 'BUY_X_GET_Y') {
        const buyQuantity = Number(promotion.buyXGetY?.buyQuantity) || 0;
        const getQuantity = Number(promotion.buyXGetY?.getQuantity) || 0;
        const percent = Number(promotion.buyXGetY?.getDiscountPercent) || 100;

        const totalQty = eligibleItems.reduce((sum, item) => {
            return sum + (Number(item.quantity) || 0);
        }, 0);

        if (
            buyQuantity > 0 &&
            getQuantity > 0 &&
            totalQty >= buyQuantity + getQuantity
        ) {
            const cheapestUnitPrice = eligibleItems.reduce((min, item) => {
                const quantity = Number(item.quantity) || 1;
                const unit = Number(item.price) || ((Number(item.total) || 0) / quantity);

                if (min === null || unit < min) {
                    return unit;
                }

                return min;
            }, null);

            discountAmount = Math.round(
                (cheapestUnitPrice || 0) *
                getQuantity *
                (percent / 100)
            );
        }
    }

    discountAmount = Math.max(
        0,
        Math.min(discountAmount, numericSubtotal)
    );

    return {
        valid: true,
        promotion,
        discountAmount,
        freeShipping
    };
};