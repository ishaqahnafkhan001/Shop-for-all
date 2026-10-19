const Subscription = require('../../models/Subscription');
const { hasFeature } = require('../shops/featureAccessService');

const getPublicTrustedBadge = async (shop) => {
    if (!shop || shop.badgeStatus !== 'active') return null;
    if (shop.isActive === false || shop.approvalStatus !== 'Approved') return null;
    if (shop.verification?.status !== 'approved' || !shop.verification?.phoneVerified) return null;
    if (shop.badgeExpiresAt && new Date(shop.badgeExpiresAt) <= new Date()) return null;
    if (shop.badgeRevokedAt) return null;
    if (!(await hasFeature(shop._id, 'trustSystem'))) return null;

    const subscription = await Subscription.findOne({ shopId: shop._id, status: 'active' })
        .select('_id status')
        .lean();
    if (!subscription) return null;

    return {
        active: true,
        type: shop.badgeType || 'trusted_seller',
        label: shop.badgeType === 'verified_seller' ? 'Verified Seller' : 'ScaleUp Trusted',
        tooltip: 'Verified by ScaleUp based on identity verification, sales history, store age, and customer review quality.',
        approvedAt: shop.badgeApprovedAt || null
    };
};

module.exports = { getPublicTrustedBadge };
