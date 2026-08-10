const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    // 🏢 SaaS TENANT ISOLATION
    shop_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, required: true },
    // Existing reviews remain public. These fields provide one shared eligibility
    // contract for future hide/delete workflows without introducing moderation.
    isVisible: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true }
}, { timestamps: true });

// 🔍 FAST QUERYING & UNIQUE CONSTRAINTS
reviewSchema.index({ shop_id: 1, product_id: 1, createdAt: -1 });
reviewSchema.index({ shop_id: 1, product_id: 1, user_id: 1 }, { unique: true });
reviewSchema.index({ shop_id: 1, product_id: 1, isDeleted: 1, isVisible: 1, createdAt: -1 });

reviewSchema.statics.getEligibilityQuery = function () {
    return { isDeleted: { $ne: true }, isVisible: { $ne: false } };
};

// 🧠 AUTO-CALCULATE RATINGS
reviewSchema.statics.calculateAverageRating = async function (shopId, productId) {
    const stats = await this.aggregate([
        { $match: { shop_id: shopId, product_id: productId, ...this.getEligibilityQuery() } },
        {
            $group: {
                _id: '$product_id',
                averageRating: { $avg: '$rating' },
                numOfReviews: { $sum: 1 }
            }
        }
    ]);

    try {
        await mongoose.model('Product').findOneAndUpdate(
            { _id: productId, shop_id: shopId },
            {
                $set: {
                    averageRating: stats.length > 0 ? Math.round(stats[0].averageRating * 10) / 10 : 0,
                    numReviews: stats.length > 0 ? stats[0].numOfReviews : 0
                }
            }
        );
    } catch (error) {
        console.error('Error calculating average rating:', error);
    }
};

module.exports = mongoose.model('Review', reviewSchema);
