const Review = require('../../models/Review');

const eligibleReviewQuery = () => Review.getEligibilityQuery();

const createEligibleReview = async payload => {
    const review = await Review.create({
        ...payload,
        isVisible: true,
        isDeleted: false
    });
    await Review.calculateAverageRating(review.shop_id, review.product_id);
    return review;
};

const listEligibleReviews = async ({ shopId, productId, page = 1, limit = 10 }) => (
    Review.find({
        shop_id: shopId,
        product_id: productId,
        ...eligibleReviewQuery()
    })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
);

const setReviewVisibility = async ({ shopId, reviewId, isVisible }) => {
    const review = await Review.findOneAndUpdate(
        { _id: reviewId, shop_id: shopId, isDeleted: { $ne: true } },
        { $set: { isVisible: Boolean(isVisible) } },
        { new: true }
    );
    if (review) await Review.calculateAverageRating(review.shop_id, review.product_id);
    return review;
};

const softDeleteReview = async ({ shopId, reviewId }) => {
    const review = await Review.findOneAndUpdate(
        { _id: reviewId, shop_id: shopId, isDeleted: { $ne: true } },
        { $set: { isDeleted: true, isVisible: false } },
        { new: true }
    );
    if (review) await Review.calculateAverageRating(review.shop_id, review.product_id);
    return review;
};

module.exports = {
    eligibleReviewQuery,
    createEligibleReview,
    listEligibleReviews,
    setReviewVisibility,
    softDeleteReview
};
