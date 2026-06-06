const Promotion = require('../models/Promotion');
const { evaluatePromotion } = require('../services/promotionService');
const Shop = require('../models/Shop');
// const { evaluatePromotion } = require('../services/promotionService');
exports.getPromotions = async (req, res) => {
    try {
        const promotions = await Promotion.find({
            shop_id: req.tenantId
        }).sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: promotions });
    } catch (err) {
        console.error('Get promotions error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch promotions' });
    }
};

exports.createPromotion = async (req, res) => {
    try {
        const promotion = await Promotion.create({
            ...req.body,
            code: req.body.code?.toUpperCase(),
            shop_id: req.tenantId
        });

        res.status(201).json({ success: true, data: promotion });
    } catch (err) {
        console.error('Create promotion error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to create promotion' });
    }
};

exports.updatePromotion = async (req, res) => {
    try {
        const payload = {
            ...req.body,
            ...(req.body.code && { code: req.body.code.toUpperCase() })
        };

        const promotion = await Promotion.findOneAndUpdate(
            { _id: req.params.id, shop_id: req.tenantId },
            payload,
            { new: true, runValidators: true }
        );

        if (!promotion) return res.status(404).json({ success: false, error: 'Promotion not found' });

        res.status(200).json({ success: true, data: promotion });
    } catch (err) {
        console.error('Update promotion error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to update promotion' });
    }
};

exports.deletePromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findOneAndDelete({
            _id: req.params.id,
            shop_id: req.tenantId
        });

        if (!promotion) return res.status(404).json({ success: false, error: 'Promotion not found' });

        res.status(200).json({ success: true, message: 'Promotion deleted' });
    } catch (err) {
        console.error('Delete promotion error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete promotion' });
    }
};



exports.validatePromotion = async (req, res) => {
    try {
        const { subdomain } = req.params;

        const {
            code,
            subtotal,
            items = [],
            customerEmail
        } = req.body;

        if (!code || !String(code).trim()) {
            return res.status(400).json({
                success: false,
                error: 'Coupon code is required'
            });
        }

        const numericSubtotal = Number(subtotal || 0);

        if (!Number.isFinite(numericSubtotal) || numericSubtotal < 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid subtotal'
            });
        }

        let shopId = req.tenantId;

        /**
         * Storefront route:
         * /promotions/storefront/:subdomain/validate
         */
        if (!shopId && subdomain) {
            const shop = await Shop.findOne({
                subdomain
            }).select('_id subdomain');

            if (!shop) {
                return res.status(404).json({
                    success: false,
                    error: 'Shop not found'
                });
            }

            shopId = shop._id;
        }

        if (!shopId) {
            return res.status(400).json({
                success: false,
                error: 'Shop ID is missing'
            });
        }

        const result = await evaluatePromotion({
            shopId,
            code,
            subtotal: numericSubtotal,
            items,
            customerEmail
        });

        if (!result.valid) {
            return res.status(400).json({
                success: false,
                error: result.error || 'Coupon is not valid'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Coupon applied successfully',
            data: {
                code: result.promotion.code,
                type: result.promotion.type,
                discountAmount: result.discountAmount,
                freeShipping: result.freeShipping
            }
        });

    } catch (err) {
        console.error('Validate promotion error:', err);

        return res.status(500).json({
            success: false,
            error: err.message || 'Failed to validate coupon'
        });
    }
};